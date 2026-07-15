import type { ManagedModel, ProviderProfile } from './types';

export type SelectableModel = {
  providerId: string;
  id: string;
  label: string;
};

export function filterProviders<T extends Pick<ProviderProfile, 'id' | 'label' | 'provider' | 'baseUrl'>>(
  providers: T[],
  query: string
): T[];

export function getSelectableModels(
  providers: Array<Pick<ProviderProfile, 'id' | 'enabled'> & { models: ManagedModel[] }>
): SelectableModel[];

export function hideOrShowModel<T extends Pick<ProviderProfile, 'selectedModelId' | 'models'>>(
  profile: T,
  modelId: string,
  enabled: boolean
): T;

export function removeCustomModel<T extends Pick<ProviderProfile, 'selectedModelId' | 'models'>>(
  profile: T,
  modelId: string
): T;

export function addCustomModel<T extends Pick<ProviderProfile, 'selectedModelId' | 'models'>>(
  profile: T,
  modelId: string,
  label?: string
): T;

export function replaceProvider<T extends Pick<ProviderProfile, 'id'>>(
  providers: T[],
  nextProfile: T
): T[];
