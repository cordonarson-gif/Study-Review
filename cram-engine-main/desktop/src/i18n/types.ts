export type Locale = 'zh-CN' | 'zh-TW' | 'en';

export type TranslationKeys = {
  common: Record<string, string>;
  nav: Record<string, string>;
  settings: Record<string, string>;
  practice: Record<string, string>;
  import: Record<string, string>;
  wizard: Record<string, string>;
  project: Record<string, string>;
  game: Record<string, string>;
  mode: Record<string, string>;
  app: Record<string, string>;
  home: Record<string, string>;
  workspace: Record<string, string>;
  modes: Record<string, string>;
  modeCatalog: Record<string, string>;
  agent: Record<string, string>;
  delivery: Record<string, string>;
  help: Record<string, string>;
  courseware: Record<string, string>;
  graph: Record<string, string>;
  simulation: Record<string, string>;
  path: Record<string, string>;
  profile: Record<string, string>;
  report: Record<string, string>;
  resources: Record<string, string>;
};

export type FlatTranslationKey = {
  [K in keyof TranslationKeys]: `${K & string}.${keyof TranslationKeys[K] & string}`;
}[keyof TranslationKeys];
