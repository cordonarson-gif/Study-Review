import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { Locale, TranslationKeys } from './types';
import zhCN from './zh-CN';
import zhTW from './zh-TW';
import en from './en';

const translations: Record<Locale, TranslationKeys> = { 'zh-CN': zhCN, 'zh-TW': zhTW, en };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key: string) => key,
});

function resolveKey(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const k of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[k];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function I18nProvider({ locale, onLocaleChange, children }: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  children: ReactNode;
}) {
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict = translations[locale] ?? translations['zh-CN'];
    const value = resolveKey(dict as unknown as Record<string, unknown>, key);
    const fallback = resolveKey(translations['zh-CN'] as unknown as Record<string, unknown>, key);
    if (value == null) return fallback ?? 'Translation unavailable';
    return params ? interpolate(value, params) : value;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale: onLocaleChange,
    t,
  }), [locale, onLocaleChange, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}

export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}

export type { Locale, TranslationKeys };
export { translations };
