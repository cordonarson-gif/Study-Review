const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const AdmZip = require('adm-zip');

const minerUClientUrl = pathToFileURL(path.join(__dirname, '..', 'dist-electron', 'mineru-client.cjs')).href;

async function loadMinerUClient() {
  return import(minerUClientUrl);
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createFetchSequence(responses, calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    assert.ok(response, `unexpected request: ${url}`);
    return response;
  };
}

function createResultZip(markdown) {
  const zip = new AdmZip();
  zip.addFile('result/full.md', Buffer.from(markdown, 'utf8'));
  return zip.toBuffer();
}

const preciseSettings = {
  mode: 'precise',
  apiKey: 'valid-token',
  baseUrl: 'https://mineru.net'
};

test('MinerU precise mode rejects a blank Token before sending a request', async () => {
  const { parseWithMinerU, MinerUParseError } = await loadMinerUClient();
  let requests = 0;

  await assert.rejects(
    parseWithMinerU('C:/fixtures/questions.pdf', { ...preciseSettings, apiKey: ' ' }, {
      fetch: async () => {
        requests += 1;
        throw new Error('must not run');
      },
      readFile: async () => Buffer.from('pdf'),
      delay: async () => undefined
    }),
    (error) => error instanceof MinerUParseError && error.code === 'authentication' && /Token/.test(error.message)
  );
  assert.equal(requests, 0);
});

test('MinerU precise mode maps HTTP 401 to an authentication error', async () => {
  const { parseWithMinerU, MinerUParseError } = await loadMinerUClient();

  await assert.rejects(
    parseWithMinerU('C:/fixtures/questions.pdf', preciseSettings, {
      fetch: async () => jsonResponse({ message: 'Unauthorized' }, 401),
      readFile: async () => Buffer.from('pdf'),
      delay: async () => undefined
    }),
    (error) => error instanceof MinerUParseError && error.code === 'authentication' && /更新 Token/.test(error.message)
  );
});

test('MinerU precise mode follows batch upload and extracts full.md from the result ZIP', async () => {
  const { parseWithMinerU } = await loadMinerUClient();
  const calls = [];
  const responses = [
    jsonResponse({ code: 0, data: { batch_id: 'batch-1', file_urls: ['https://upload.example/file'] }, msg: 'ok' }),
    new Response('', { status: 200 }),
    jsonResponse({
      code: 0,
      data: {
        batch_id: 'batch-1',
        extract_result: [{ file_name: 'questions.pdf', state: 'done', full_zip_url: 'https://cdn.example/result.zip' }]
      },
      msg: 'ok'
    }),
    new Response(createResultZip('# Parsed questions'), { status: 200 })
  ];

  const text = await parseWithMinerU('C:/fixtures/questions.pdf', preciseSettings, {
    fetch: createFetchSequence(responses, calls),
    readFile: async () => Buffer.from('pdf-bytes'),
    delay: async () => undefined
  });

  assert.equal(text, '# Parsed questions');
  assert.equal(calls[0].url, 'https://mineru.net/api/v4/file-urls/batch');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer valid-token');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    files: [{ name: 'questions.pdf' }],
    model_version: 'vlm'
  });
  assert.equal(calls[1].url, 'https://upload.example/file');
  assert.equal(calls[1].init.method, 'PUT');
  assert.equal(calls[2].url, 'https://mineru.net/api/v4/extract-results/batch/batch-1');
  assert.equal(calls[3].url, 'https://cdn.example/result.zip');
});

test('MinerU Agent mode uses signed upload and downloads markdown without Authorization', async () => {
  const { parseWithMinerU } = await loadMinerUClient();
  const calls = [];
  const responses = [
    jsonResponse({ code: 0, data: { task_id: 'task-1', file_url: 'https://upload.example/agent-file' }, msg: 'ok' }),
    new Response('', { status: 200 }),
    jsonResponse({ code: 0, data: { task_id: 'task-1', state: 'done', markdown_url: 'https://cdn.example/full.md' }, msg: 'ok' }),
    new Response('Agent markdown', { status: 200 })
  ];

  const text = await parseWithMinerU('C:/fixtures/questions.doc', {
    mode: 'agent',
    apiKey: '',
    baseUrl: 'https://mineru.net/'
  }, {
    fetch: createFetchSequence(responses, calls),
    readFile: async () => Buffer.from('doc-bytes'),
    delay: async () => undefined
  });

  assert.equal(text, 'Agent markdown');
  assert.equal(calls[0].url, 'https://mineru.net/api/v1/agent/parse/file');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    file_name: 'questions.doc',
    language: 'ch',
    enable_table: true,
    is_ocr: false,
    enable_formula: true
  });
  assert.equal(calls[2].url, 'https://mineru.net/api/v1/agent/parse/task-1');
  assert.equal(calls[2].init.headers, undefined);
});
