import type { ProviderOption } from './types';

export function joinLines(items: string[]) {
  return items.filter(Boolean).map((item) => item.trim()).filter(Boolean).join('\n');
}

export function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createEmptyChatGreeting(projectName?: string) {
  return [
    {
      role: 'assistant' as const,
      content: projectName
        ? `已进入 ${projectName}。你可以上传教材、图片、笔记，或让我把关键结论沉淀到该项目的独立知识库。`
        : '新项目创建后，这里会作为项目专属 Agent 面板，支持上传文件、图片解析和知识沉淀。',
      createdAt: new Date().toISOString()
    }
  ];
}

export function resolveProviderDefaults(providerId: string, options: ProviderOption[]) {
  const provider = options.find((item) => item.id === providerId) ?? options[0];
  return {
    provider: provider.id,
    baseUrl: provider.baseUrl,
    model: provider.models[0]
  };
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}
