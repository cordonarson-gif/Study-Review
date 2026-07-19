import type { AppSettings, ProviderOption, ProviderProfile } from './types';
import type { Locale } from '../i18n/types';

export function joinLines(items: string[]) {
  return items.filter(Boolean).map((item) => item.trim()).filter(Boolean).join('\n');
}

export function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type TFn = (key: string, params?: Record<string, string | number>) => string;

export function createEmptyChatGreeting(projectName: string | undefined, t: TFn) {
  return [
    {
      role: 'assistant' as const,
      content: projectName
        ? t('app.chatGreetingProject', { name: projectName })
        : t('app.chatGreetingEmpty'),
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

export function getActiveProviderProfile(settings: Pick<AppSettings, 'activeProviderId' | 'providers'>): ProviderProfile {
  return settings.providers.find((profile) => profile.id === settings.activeProviderId)
    ?? settings.providers.find((profile) => profile.enabled)
    ?? settings.providers[0];
}

export function getProfileModelOptions(profile: ProviderProfile) {
  return profile.models
    .filter((model) => model.enabled)
    .map((model) => ({
      id: model.id,
      label: model.label || model.id,
      provider: profile.id,
      source: model.source
    }));
}

export function formatDate(iso: string, locale: Locale) {
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}
