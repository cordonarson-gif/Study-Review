import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { MinerUParseError, parseWithMinerU } from './mineru-client.cjs';

export type DocumentTextSource = 'text-local' | 'docx-local' | 'mineru' | 'ocr';
export type DocumentParseErrorCode = 'empty-document' | 'unsupported-format' | 'authentication' | 'network' | 'service';

export type DocumentTextSuccess = {
  ok: true;
  text: string;
  source: DocumentTextSource;
};

export type DocumentTextFailure = {
  ok: false;
  code: DocumentParseErrorCode;
  message: string;
};

export type DocumentTextResult = DocumentTextSuccess | DocumentTextFailure;

export type MinerUDocumentSettings = {
  enabled: boolean;
  preferForUploads: boolean;
  mode: 'precise' | 'agent';
  apiKey: string;
  baseUrl: string;
};

export class DocumentParseError extends Error {
  constructor(
    public readonly code: Exclude<DocumentParseErrorCode, 'empty-document' | 'unsupported-format'>,
    message: string
  ) {
    super(message);
    this.name = 'DocumentParseError';
  }
}

export type DocumentTextDependencies = {
  readTextFile: (filePath: string) => Promise<string>;
  extractDocx: (filePath: string) => Promise<string>;
  parseMinerU: (filePath: string, settings: MinerUDocumentSettings) => Promise<string>;
  parseImageOcr: (filePath: string) => Promise<string>;
};

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff']);
const textExtensions = new Set(['.txt', '.md', '.markdown', '.yaml', '.yml', '.json', '.csv']);

export async function extractDocxText(filePath: string) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.trim();
}

function success(text: string, source: DocumentTextSource): DocumentTextSuccess {
  return { ok: true, text: text.trim(), source };
}

function failure(code: DocumentParseErrorCode, message: string): DocumentTextFailure {
  return { ok: false, code, message };
}

function parseFailure(error: unknown): DocumentTextFailure {
  if (error instanceof DocumentParseError) {
    return failure(error.code, error.message);
  }
  return failure('service', error instanceof Error ? error.message : '文档解析失败');
}

const defaultDependencies: DocumentTextDependencies = {
  readTextFile: (filePath) => readFile(filePath, 'utf8'),
  extractDocx: extractDocxText,
  parseMinerU: async (filePath, settings) => {
    try {
      return await parseWithMinerU(filePath, settings);
    } catch (error) {
      if (error instanceof MinerUParseError) {
        throw new DocumentParseError(error.code, error.message);
      }
      throw error;
    }
  },
  parseImageOcr: async () => {
    throw new DocumentParseError('service', '图片 OCR 服务尚未初始化');
  }
};

export async function extractDocumentText(
  filePath: string,
  mineru: MinerUDocumentSettings,
  overrides: Partial<DocumentTextDependencies> = {}
): Promise<DocumentTextResult> {
  const dependencies = { ...defaultDependencies, ...overrides };
  const extension = path.extname(filePath).toLowerCase();
  const useMinerU = mineru.enabled && mineru.preferForUploads;

  if (textExtensions.has(extension)) {
    const text = (await dependencies.readTextFile(filePath)).trim();
    return text
      ? success(text, 'text-local')
      : failure('empty-document', '文件中没有可导入的文本内容');
  }

  if (extension === '.docx') {
    try {
      const text = (await dependencies.extractDocx(filePath)).trim();
      if (text) return success(text, 'docx-local');
      if (!useMinerU) return failure('empty-document', 'Word 文档中没有可导入的文本内容');
    } catch (error) {
      if (!useMinerU) return failure('service', `Word 文档解析失败：${error instanceof Error ? error.message : '未知错误'}`);
    }

    try {
      const text = (await dependencies.parseMinerU(filePath, mineru)).trim();
      return text
        ? success(text, 'mineru')
        : failure('empty-document', 'MinerU 未从 Word 文档中提取到文本');
    } catch (error) {
      return parseFailure(error);
    }
  }

  if (imageExtensions.has(extension)) {
    if (useMinerU) {
      try {
        const text = (await dependencies.parseMinerU(filePath, mineru)).trim();
        if (text) return success(text, 'mineru');
      } catch {
        // OCR is the local fallback for unavailable remote recognition.
      }
    }

    try {
      const text = (await dependencies.parseImageOcr(filePath)).trim();
      return text && !/^OCR 未识别到可用文本[。.]*$/.test(text)
        ? success(text, 'ocr')
        : failure('empty-document', 'OCR 未识别到可用文本');
    } catch (error) {
      return parseFailure(error);
    }
  }

  if (!useMinerU) {
    return failure('unsupported-format', '该文件需要 MinerU 文档识别，请先在系统设置中启用并配置 MinerU');
  }

  try {
    const text = (await dependencies.parseMinerU(filePath, mineru)).trim();
    return text
      ? success(text, 'mineru')
      : failure('empty-document', 'MinerU 未从文档中提取到文本');
  } catch (error) {
    return parseFailure(error);
  }
}
