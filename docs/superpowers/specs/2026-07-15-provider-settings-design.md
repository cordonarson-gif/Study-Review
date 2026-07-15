# Multi-Provider Settings Design

## Goal

Replace the single-provider API settings panel with a Cherry Studio-inspired three-column model-service workspace. Users can persist, select, edit, enable, disable, test, and remove multiple provider profiles, and manage each profile's visible models without breaking existing Cram Engine projects or API calls.

## Scope

The work is limited to Cram Engine Desktop's settings and the model configuration it consumes. It does not copy Cherry Studio source code, visual identity, OAuth flows, cloud synchronization, or unrelated settings modules.

## Current Issues

- `AppSettings` contains only one provider, one endpoint, one key, and one flat model list.
- The existing add-provider dialog changes the active endpoint and key but does not create a provider record.
- Model synchronization invokes the main-process request with persisted settings, so it can use stale credentials when the user has edited unsaved values.
- Model options are not independently enableable or hideable, and the UI gives no connection test feedback before saving.

## Architecture

### Versioned Settings

`settings.json` will use a versioned multi-provider schema. Each provider profile owns its connection fields and model list.

```ts
type ProviderProfile = {
  id: string;
  label: string;
  provider: 'anthropic' | 'openai-compatible' | 'aliyun';
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  isCustom: boolean;
  models: ManagedModel[];
};

type ManagedModel = {
  id: string;
  label: string;
  source: 'preset' | 'fetched' | 'custom';
  enabled: boolean;
};

type AppSettings = {
  version: 2;
  providers: ProviderProfile[];
  activeProviderId: string;
  temperature: number;
  maxTokens: number;
  enableLatexPreview: boolean;
  lastModelSyncAt?: string;
};
```

The main process will migrate legacy settings by creating one enabled profile from the existing `provider`, `baseUrl`, `apiKey`, `model`, and `availableModels` fields. It will retain the existing profile's selected model, API key, endpoint, generation settings, and last-sync timestamp. Missing or invalid data falls back to the existing default provider configuration.

`normalizeSettings` will validate IDs, guarantee a selected active provider, and ensure every enabled provider has a valid selected-model fallback. It will preserve custom models and never write duplicate model IDs within a profile.

### IPC Boundary

The preload bridge will expose profile-aware settings operations:

- `getSettings()` loads normalized, migrated version-2 settings.
- `saveSettings(settings)` validates, normalizes, and writes the full settings document.
- `testProviderConnection(draft)` builds a model-list request from the draft profile and returns either a success summary or a normalized error with HTTP status where available.
- `fetchProviderModels(draft)` builds a request from the draft profile, parses its response, merges newly fetched models without deleting custom models, and returns the updated draft models.

Connection tests and model synchronization receive the draft profile from the renderer. Neither action reads a previously saved credential or endpoint. Chat requests resolve the active enabled provider and that provider's selected enabled model. Existing project metadata remains unchanged; a project retains its recorded model ID even if a user later hides it from future pickers.

### Renderer Components

The monolithic settings markup in `src/app/App.tsx` will be replaced by focused components:

- `ProviderSettingsPage`: owns unsaved settings state, selected settings category, selected provider, and save/discard flow.
- `SettingsCategoryNav`: the left column for Model services, Default model, Generation, and Display preferences.
- `ProviderList`: the searchable middle column for enabled built-ins and custom provider profiles, with an add-provider action.
- `ProviderDetail`: the right column for the selected provider's enabled state, credential visibility, endpoint, connection test, reset action, and result feedback.
- `ModelManager`: lists the selected provider's models, supports synchronization, manual creation, enable/hide, and deletion of custom models.

The page will remain inside the current application shell; no global navigation or workspace behavior changes.

## Interaction Design

### Three-Column Model Service View

The left column provides settings categories with Model services selected by default. The middle column has a provider search field, provider rows with compact status badges, and an add-provider control. The right column uses a tight detail workspace instead of full-width cards:

- Header: provider label, protocol type, enable/disable toggle, and unsaved-state indicator.
- API key: password field, show/hide control, and a `检测连接` action. Results appear directly beneath the field with success, credential, endpoint, or network states.
- Endpoint: editable base URL, provider default reset action, and a derived request endpoint preview.
- Models: count, `获取模型列表`, `手动添加模型`, model enable/hide control, and delete control for custom models. Hidden models remain stored but are excluded from model selectors.
- Footer: `放弃更改` and `保存所有更改` remain explicit; model fetches update the page draft and are persisted only when the user saves.

The Default model category lets users choose a profile and one of its enabled models. Generation retains temperature, maximum token settings, and LaTex preview. Display remains intentionally small in this iteration and only exposes LaTex preview to avoid adding unrelated product settings.

### Provider Lifecycle

Built-in profiles are created from the repository's existing Anthropic, OpenAI-compatible, and Aliyun presets. A user can add a custom profile with a label, protocol type, endpoint, and optional key. Custom profiles are editable and removable. Built-in profiles can be disabled but not removed. Disabling the active profile switches the active provider to the next enabled profile; disabling the final enabled provider is blocked with an inline explanation.

### Model Lifecycle

Model synchronization creates or updates fetched models for the current draft profile and preserves user-added models. Manual addition requires a non-empty unique model ID. Users can hide any model. Removing a custom model removes it from the profile; preset and fetched models are hidden instead so later syncs can restore metadata without silently losing a user preference. If a selected default model becomes hidden or is removed, the first remaining enabled model becomes the fallback.

## Error Handling

- Empty profile label, endpoint, or duplicate profile name produces an inline field message and prevents saving.
- A connection test categorizes missing credentials, invalid endpoint URLs, network failures, HTTP authentication responses, and non-2xx service responses.
- Model synchronization keeps the existing draft list if a request fails and reports the error in the model section.
- Saving uses a visible busy state; failed writes leave the draft intact and surface an actionable error.
- Switching providers never discards the in-memory draft. `放弃更改` reloads the last persisted document after confirmation.

## Compatibility

Existing `settings.json` files migrate at load time and are written in version-2 form only after the next successful save. Existing projects retain their stored provider/model identifiers. Model selectors used by project creation and the workspace receive only enabled models from enabled providers, with a safe default when the current selection is no longer selectable.

## Verification

Automated coverage will include:

- legacy settings migration preserving credentials, endpoint, selected model, and generation preferences;
- provider ID, selected-provider, model deduplication, and selected-model fallback normalization;
- profile-specific model request URLs and authentication headers;
- draft-based connection checks and model synchronization, including error classification;
- custom model insertion, removal, and visibility filtering;
- settings save/load round-trip behavior.

The final validation will run Electron main-process tests, renderer utility tests, TypeScript type checks, a production build, and a local Electron smoke test covering provider add/edit, connection test feedback, model fetch/manual add/hide, save, reload, and selection in project/workspace model pickers.
