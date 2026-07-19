const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { mkdtemp, rm } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const AdmZip = require('adm-zip');

const documentTextUrl = pathToFileURL(path.join(__dirname, '..', 'dist-electron', 'document-text.cjs')).href;

async function loadDocumentText() {
  return import(documentTextUrl);
}

function createDependencies(overrides = {}) {
  return {
    readTextFile: async () => 'local text',
    extractDocx: async () => '1. DOCX 中的题目',
    parseMinerU: async () => 'MinerU text',
    parseImageOcr: async () => 'OCR text',
    ...overrides
  };
}

const disabledMinerU = {
  enabled: false,
  preferForUploads: true,
  mode: 'precise',
  apiKey: '',
  baseUrl: 'https://mineru.net'
};

async function createMinimalDocx(text) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cram-docx-'));
  const filePath = path.join(directory, 'questions.docx');
  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>'
  ));
  zip.addFile('_rels/.rels', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  ));
  zip.addFile('word/document.xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>` +
    '</w:document>'
  ));
  zip.writeZip(filePath);
  return { directory, filePath };
}

test('extractDocxText reads paragraph text from a real DOCX container', async () => {
  const { extractDocxText } = await loadDocumentText();
  const fixture = await createMinimalDocx('第一题：解释操作系统的作用');

  try {
    assert.equal(await extractDocxText(fixture.filePath), '第一题：解释操作系统的作用');
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test('DOCX import prefers local extraction and does not call MinerU', async () => {
  const { extractDocumentText } = await loadDocumentText();
  let minerUCalls = 0;

  const result = await extractDocumentText('C:/fixtures/questions.docx', disabledMinerU, createDependencies({
    parseMinerU: async () => {
      minerUCalls += 1;
      return 'unexpected';
    }
  }));

  assert.deepEqual(result, {
    ok: true,
    text: '1. DOCX 中的题目',
    source: 'docx-local'
  });
  assert.equal(minerUCalls, 0);
});

test('image import falls back to OCR when MinerU authentication fails', async () => {
  const { extractDocumentText, DocumentParseError } = await loadDocumentText();
  const enabledMinerU = { ...disabledMinerU, enabled: true, apiKey: 'expired-token' };

  const result = await extractDocumentText('C:/fixtures/question.png', enabledMinerU, createDependencies({
    parseMinerU: async () => {
      throw new DocumentParseError('authentication', 'MinerU API Token 无效或没有访问权限');
    },
    parseImageOcr: async () => 'OCR recovered question'
  }));

  assert.deepEqual(result, {
    ok: true,
    text: 'OCR recovered question',
    source: 'ocr'
  });
});

test('binary document failure is returned as an error result instead of extracted text', async () => {
  const { extractDocumentText, DocumentParseError } = await loadDocumentText();
  const enabledMinerU = { ...disabledMinerU, enabled: true, apiKey: 'expired-token' };

  const result = await extractDocumentText('C:/fixtures/questions.pdf', enabledMinerU, createDependencies({
    parseMinerU: async () => {
      throw new DocumentParseError('authentication', 'MinerU API Token 无效或没有访问权限，请在系统设置中更新 Token');
    }
  }));

  assert.deepEqual(result, {
    ok: false,
    code: 'authentication',
    message: 'MinerU API Token 无效或没有访问权限，请在系统设置中更新 Token'
  });
  assert.equal('text' in result, false);
});

test('empty local DOCX without MinerU reports an empty document', async () => {
  const { extractDocumentText } = await loadDocumentText();

  const result = await extractDocumentText('C:/fixtures/empty.docx', disabledMinerU, createDependencies({
    extractDocx: async () => '   '
  }));

  assert.deepEqual(result, {
    ok: false,
    code: 'empty-document',
    message: 'Word 文档中没有可导入的文本内容'
  });
});

test('OCR no-text placeholder is returned as an empty-document failure', async () => {
  const { extractDocumentText } = await loadDocumentText();

  const result = await extractDocumentText('C:/fixtures/blank.png', disabledMinerU, createDependencies({
    parseImageOcr: async () => 'OCR 未识别到可用文本。'
  }));

  assert.deepEqual(result, {
    ok: false,
    code: 'empty-document',
    message: 'OCR 未识别到可用文本'
  });
});
