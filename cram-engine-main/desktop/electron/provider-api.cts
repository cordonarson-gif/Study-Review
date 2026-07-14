export type ProviderId = 'anthropic' | 'openai-compatible' | 'aliyun';

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
