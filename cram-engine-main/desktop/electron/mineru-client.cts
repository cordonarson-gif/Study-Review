import { readFile } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';

export type MinerUClientSettings = {
  mode: 'precise' | 'agent';
  apiKey: string;
  baseUrl: string;
};

export type MinerUErrorCode = 'authentication' | 'network' | 'service';

export class MinerUParseError extends Error {
  constructor(public readonly code: MinerUErrorCode, message: string) {
    super(message);
    this.name = 'MinerUParseError';
  }
}

export type MinerUClientDependencies = {
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
  readFile: (filePath: string) => Promise<Buffer>;
  delay: (milliseconds: number) => Promise<void>;
};

const defaultDependencies: MinerUClientDependencies = {
  fetch: (input, init) => fetch(input, init),
  readFile,
  delay: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
};

function apiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '') || 'https://mineru.net';
}

function authenticationError() {
  return new MinerUParseError('authentication', 'MinerU API Token 无效或没有访问权限，请在系统设置中更新 Token');
}

function assertResponse(response: Response, action: string) {
  if (response.status === 401 || response.status === 403) throw authenticationError();
  if (!response.ok) throw new MinerUParseError('service', `${action}失败（HTTP ${response.status}）`);
}

async function responseJson(response: Response, action: string) {
  assertResponse(response, action);
  try {
    const payload = await response.json() as Record<string, any>;
    if (typeof payload.code === 'number' && payload.code !== 0) {
      throw new MinerUParseError('service', `${action}失败：${String(payload.msg || `错误码 ${payload.code}`)}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof MinerUParseError) throw error;
    throw new MinerUParseError('service', `${action}返回了无效数据`);
  }
}

function markdownFromZip(buffer: Buffer) {
  try {
    const archive = new AdmZip(buffer);
    const entry = archive.getEntries().find((candidate) => {
      const name = candidate.entryName.replace(/\\/g, '/').toLowerCase();
      return name === 'full.md' || name.endsWith('/full.md');
    });
    const markdown = entry?.getData().toString('utf8').trim() ?? '';
    if (!markdown) throw new Error('full.md is empty');
    return markdown;
  } catch {
    throw new MinerUParseError('service', 'MinerU 结果压缩包中没有可用的 full.md');
  }
}

function uploadBody(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function parsePrecise(
  filePath: string,
  settings: MinerUClientSettings,
  dependencies: MinerUClientDependencies
) {
  const token = settings.apiKey.trim();
  if (!token) throw new MinerUParseError('authentication', 'MinerU 精准解析需要 API Token，请先在系统设置中填写 Token');

  const baseUrl = apiBaseUrl(settings.baseUrl);
  const fileName = path.basename(filePath);
  const buffer = await dependencies.readFile(filePath);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
  const createResponse = await dependencies.fetch(`${baseUrl}/api/v4/file-urls/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      files: [{ name: fileName }],
      model_version: 'vlm'
    })
  });
  const createPayload = await responseJson(createResponse, 'MinerU 上传地址申请');
  const batchId = String(createPayload.data?.batch_id ?? '').trim();
  const uploadUrl = createPayload.data?.file_urls?.[0];
  if (!batchId || typeof uploadUrl !== 'string' || !uploadUrl) {
    throw new MinerUParseError('service', 'MinerU 未返回可用的批次 ID 或上传地址');
  }

  const uploadResponse = await dependencies.fetch(uploadUrl, { method: 'PUT', body: uploadBody(buffer) });
  assertResponse(uploadResponse, 'MinerU 文件上传');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await dependencies.delay(1500);
    const resultResponse = await dependencies.fetch(`${baseUrl}/api/v4/extract-results/batch/${encodeURIComponent(batchId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const resultPayload = await responseJson(resultResponse, 'MinerU 结果查询');
    const rawResults = resultPayload.data?.extract_result;
    const results = Array.isArray(rawResults) ? rawResults : rawResults ? [rawResults] : [];
    const result = results.find((candidate: Record<string, any>) => candidate.file_name === fileName) ?? results[0];
    if (!result) continue;

    const state = String(result.state ?? '').toLowerCase();
    if (state === 'failed') {
      throw new MinerUParseError('service', `MinerU 解析失败：${String(result.err_msg || '未知原因')}`);
    }
    if (state !== 'done') continue;

    const zipUrl = result.full_zip_url;
    if (typeof zipUrl !== 'string' || !zipUrl) {
      throw new MinerUParseError('service', 'MinerU 已完成解析，但未返回结果压缩包');
    }
    const zipResponse = await dependencies.fetch(zipUrl);
    assertResponse(zipResponse, 'MinerU 结果下载');
    return markdownFromZip(Buffer.from(await zipResponse.arrayBuffer()));
  }

  throw new MinerUParseError('service', 'MinerU 解析超时，请稍后重试');
}

async function parseAgent(
  filePath: string,
  settings: MinerUClientSettings,
  dependencies: MinerUClientDependencies
) {
  const baseUrl = apiBaseUrl(settings.baseUrl);
  const fileName = path.basename(filePath);
  const buffer = await dependencies.readFile(filePath);
  const createResponse = await dependencies.fetch(`${baseUrl}/api/v1/agent/parse/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: fileName,
      language: 'ch',
      enable_table: true,
      is_ocr: false,
      enable_formula: true
    })
  });
  const createPayload = await responseJson(createResponse, 'MinerU Agent 上传地址申请');
  const taskId = String(createPayload.data?.task_id ?? '').trim();
  const uploadUrl = createPayload.data?.file_url;
  if (!taskId || typeof uploadUrl !== 'string' || !uploadUrl) {
    throw new MinerUParseError('service', 'MinerU Agent 未返回可用的任务 ID 或上传地址');
  }

  const uploadResponse = await dependencies.fetch(uploadUrl, { method: 'PUT', body: uploadBody(buffer) });
  assertResponse(uploadResponse, 'MinerU Agent 文件上传');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await dependencies.delay(1500);
    const resultResponse = await dependencies.fetch(`${baseUrl}/api/v1/agent/parse/${encodeURIComponent(taskId)}`);
    const resultPayload = await responseJson(resultResponse, 'MinerU Agent 结果查询');
    const result = resultPayload.data ?? {};
    const state = String(result.state ?? '').toLowerCase();
    if (state === 'failed') {
      throw new MinerUParseError('service', `MinerU Agent 解析失败：${String(result.err_msg || '未知原因')}`);
    }
    if (state !== 'done') continue;

    const markdownUrl = result.markdown_url;
    if (typeof markdownUrl !== 'string' || !markdownUrl) {
      throw new MinerUParseError('service', 'MinerU Agent 已完成解析，但未返回 Markdown 地址');
    }
    const markdownResponse = await dependencies.fetch(markdownUrl);
    assertResponse(markdownResponse, 'MinerU Agent 结果下载');
    const markdown = (await markdownResponse.text()).trim();
    if (!markdown) throw new MinerUParseError('service', 'MinerU Agent 返回了空 Markdown');
    return markdown;
  }

  throw new MinerUParseError('service', 'MinerU Agent 解析超时，请稍后重试');
}

export async function parseWithMinerU(
  filePath: string,
  settings: MinerUClientSettings,
  overrides: Partial<MinerUClientDependencies> = {}
) {
  const dependencies = { ...defaultDependencies, ...overrides };
  try {
    return settings.mode === 'agent'
      ? await parseAgent(filePath, settings, dependencies)
      : await parsePrecise(filePath, settings, dependencies);
  } catch (error) {
    if (error instanceof MinerUParseError) throw error;
    if (error instanceof TypeError) throw new MinerUParseError('network', '无法连接到 MinerU 服务');
    throw new MinerUParseError('service', error instanceof Error ? error.message : 'MinerU 解析失败');
  }
}
