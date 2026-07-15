export type ProviderId = 'anthropic' | 'openai-compatible' | 'aliyun';

export type ConnectionCheckResult =
  | { ok: true; message: string; status: number }
  | {
      ok: false;
      kind: 'credentials' | 'authentication' | 'endpoint' | 'network' | 'service';
      message: string;
      status?: number;
    };

type ManagedModel = {
  id: string;
  label: string;
  source: 'preset' | 'fetched' | 'custom';
  enabled: boolean;
};

type RequestContext = {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
};

type ChatRequestContext = RequestContext & {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
};

type RequestDescriptor = {
  url: string;
  headers: Record<string, string>;
};

type ChatRequestDescriptor = RequestDescriptor & {
  body: Record<string, unknown>;
};

const anthropicVersion = '2023-06-01';

function trimBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '');
}

function isAnthropicProvider(provider: string): provider is Extract<ProviderId, 'anthropic'> {
  return provider === 'anthropic';
}

function buildHeaders(context: RequestContext): Record<string, string> {
  if (isAnthropicProvider(context.provider)) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': context.apiKey,
      'anthropic-version': anthropicVersion
    };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${context.apiKey}`
  };
}

export function classifyProviderResponse(
  response: Pick<Response, 'ok' | 'status' | 'statusText'>
): ConnectionCheckResult {
  if (response.ok) {
    return { ok: true, message: '连接成功', status: response.status };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      kind: 'authentication',
      message: 'API Key 无效或没有访问权限',
      status: response.status
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      kind: 'endpoint',
      message: 'API 地址或模型列表路径不可用',
      status: response.status
    };
  }

  return {
    ok: false,
    kind: 'service',
    message: `API 服务返回错误（${response.status}）`,
    status: response.status
  };
}

export function classifyProviderError(error: unknown): ConnectionCheckResult {
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
    return { ok: false, kind: 'service', message: '连接超时' };
  }

  return { ok: false, kind: 'network', message: '无法连接到 API 服务' };
}

export function mergeManagedModels(
  existing: ManagedModel[],
  fetched: Array<{ id: string; label?: string }>
): ManagedModel[] {
  const fetchedById = new Map<string, { id: string; label?: string }>();

  for (const fetchedModel of fetched) {
    const id = fetchedModel.id.trim();

    if (!id || fetchedById.has(id)) {
      continue;
    }

    fetchedById.set(id, { id, label: fetchedModel.label });
  }

  const existingIds = new Set<string>();
  const merged: ManagedModel[] = [];

  for (const existingModel of existing) {
    const id = existingModel.id.trim();

    if (!id || existingIds.has(id)) {
      continue;
    }

    existingIds.add(id);
    const fetchedModel = fetchedById.get(id);
    const fetchedLabel = fetchedModel?.label?.trim();

    merged.push({
      ...existingModel,
      id,
      label: existingModel.source === 'fetched' && fetchedLabel ? fetchedLabel : existingModel.label
    });
  }

  for (const fetchedModel of fetchedById.values()) {
    if (existingIds.has(fetchedModel.id)) {
      continue;
    }

    merged.push({
      id: fetchedModel.id,
      label: fetchedModel.label?.trim() || fetchedModel.id,
      source: 'fetched',
      enabled: true
    });
  }

  return merged;
}

export function resolveDefaultProvider() {
  return {
    provider: 'openai-compatible' as const,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1'
  };
}

export function normalizeSettings<T extends { provider: string; baseUrl: string; model: string }>(settings: T): T {
  const defaults = resolveDefaultProvider();

  if (settings.provider === 'anthropic' && trimBaseUrl(settings.baseUrl) === 'https://api.anthropic.com') {
    return {
      ...settings,
      ...defaults
    };
  }

  return settings;
}

export function buildModelsRequest(context: RequestContext): RequestDescriptor {
  const baseUrl = trimBaseUrl(context.baseUrl);

  return {
    url: isAnthropicProvider(context.provider) ? `${baseUrl}/v1/models` : `${baseUrl}/models`,
    headers: buildHeaders(context)
  };
}

export function parseModelsResponse(
  provider: ProviderId,
  payload: { data?: Array<{ id?: string; name?: string; display_name?: string }> }
) {
  if (provider === 'anthropic') {
    return (payload.data ?? [])
      .map((item) => item.id || item.display_name || item.name)
      .filter((item): item is string => Boolean(item));
  }

  return (payload.data ?? [])
    .map((item) => item.id || item.name)
    .filter((item): item is string => Boolean(item));
}

export function buildChatRequest(context: ChatRequestContext): ChatRequestDescriptor {
  const baseUrl = trimBaseUrl(context.baseUrl);
  const headers = buildHeaders(context);

  if (isAnthropicProvider(context.provider)) {
    return {
      url: `${baseUrl}/v1/messages`,
      headers,
      body: {
        model: context.model,
        temperature: context.temperature,
        max_tokens: context.maxTokens,
        system: context.systemPrompt,
        messages: [{ role: 'user', content: context.userPrompt }]
      }
    };
  }

  return {
    url: `${baseUrl}/chat/completions`,
    headers,
    body: {
      model: context.model,
      temperature: context.temperature,
      max_tokens: context.maxTokens,
      messages: [
        { role: 'system', content: context.systemPrompt },
        { role: 'user', content: context.userPrompt }
      ]
    }
  };
}

export function parseChatResponse(
  provider: ProviderId,
  payload: {
    content?: Array<{ type?: string; text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
  }
) {
  if (isAnthropicProvider(provider)) {
    const text = (payload.content ?? [])
      .filter((item) => item.type === 'text' && item.text?.trim())
      .map((item) => item.text!.trim())
      .join('\n\n');

    return text || '模型未返回内容。';
  }

  return payload.choices?.[0]?.message?.content?.trim() || '模型未返回内容。';
}
