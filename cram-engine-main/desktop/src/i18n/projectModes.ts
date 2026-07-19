import type { ProjectModeTemplate } from '../lib/types';

type TFn = (key: string, params?: Record<string, string | number>) => string;

function splitList(value: string) {
  return value.split('|').map((item) => item.trim());
}

function splitGroups(value: string) {
  return value.split(';').map(splitList);
}

function translatedItem(items: string[], index: number, fallback: string) {
  return items[index] || fallback;
}

export function localizeProjectModeTemplates(templates: ProjectModeTemplate[], t: TFn): ProjectModeTemplate[] {
  const titles = splitList(t('modeCatalog.titles'));
  const descriptions = splitList(t('modeCatalog.descriptions'));
  const recommendations = splitGroups(t('modeCatalog.recommendations'));
  const fieldLabels = splitGroups(t('modeCatalog.fieldLabels'));
  const selectOptions = splitGroups(t('modeCatalog.selectOptions'));
  const tabLabels = splitGroups(t('modeCatalog.tabLabels'));

  return templates.map((template) => {
    const modeIndex = PROJECT_MODE_ORDER.indexOf(template.mode);
    return localizeTemplate(template, modeIndex, t, {
      titles,
      descriptions,
      recommendations,
      fieldLabels,
      selectOptions,
      tabLabels,
    });
  });
}

function localizeTemplate(
  template: ProjectModeTemplate,
  modeIndex: number,
  t: TFn,
  catalog: {
    titles: string[];
    descriptions: string[];
    recommendations: string[][];
    fieldLabels: string[][];
    selectOptions: string[][];
    tabLabels: string[][];
  },
): ProjectModeTemplate {
    const title = translatedItem(catalog.titles, modeIndex, t('modeCatalog.missing'));
    const localizedFields = catalog.fieldLabels[modeIndex] ?? [];
    const localizedOptions = catalog.selectOptions[modeIndex] ?? [];
    const localizedTabs = catalog.tabLabels[modeIndex] ?? [];

    return {
      ...template,
      title,
      description: translatedItem(catalog.descriptions, modeIndex, t('modeCatalog.missing')),
      recommendedFor: catalog.recommendations[modeIndex]?.filter(Boolean) ?? [],
      wizardFields: template.wizardFields.map((field, fieldIndex) => {
        const label = translatedItem(localizedFields, fieldIndex, t('modeCatalog.missing'));
        return {
          ...field,
          label,
          placeholder: field.placeholder ? t('modeCatalog.fieldPlaceholder', { field: label }) : undefined,
          optionLabels: field.options?.map((option, optionIndex) => (
            translatedItem(localizedOptions, optionIndex, option)
          )),
        };
      }),
      tabs: template.tabs.map((tab, tabIndex) => {
        const label = translatedItem(localizedTabs, tabIndex, t('modeCatalog.missing'));
        return {
          ...tab,
          label,
          description: t('modeCatalog.tabDescription', { tab: label, mode: title }),
        };
      }),
      agents: template.agents.map((agent, index) => ({
        ...agent,
        label: t('modeCatalog.agentItem', { number: index + 1 }),
        description: t('modeCatalog.agentDescription', { mode: title }),
      })),
      deliverables: template.deliverables.map((deliverable, index) => ({
        ...deliverable,
        label: t('modeCatalog.deliverableItem', { number: index + 1 }),
        checklist: deliverable.checklist.map((_entry, checklistIndex) => (
          t('modeCatalog.checklistItem', { number: checklistIndex + 1 })
        )),
      })),
    };
}

export function localizeProjectModeTemplate(template: ProjectModeTemplate, t: TFn): ProjectModeTemplate {
  const modeIndex = templateIndex(template);
  const titles = splitList(t('modeCatalog.titles'));
  const descriptions = splitList(t('modeCatalog.descriptions'));
  const recommendations = splitGroups(t('modeCatalog.recommendations'));
  const fieldLabels = splitGroups(t('modeCatalog.fieldLabels'));
  const selectOptions = splitGroups(t('modeCatalog.selectOptions'));
  const tabLabels = splitGroups(t('modeCatalog.tabLabels'));
  return localizeTemplate(template, modeIndex, t, {
    titles,
    descriptions,
    recommendations,
    fieldLabels,
    selectOptions,
    tabLabels,
  });
}

function templateIndex(template: ProjectModeTemplate) {
  return PROJECT_MODE_ORDER.indexOf(template.mode);
}

const PROJECT_MODE_ORDER: ProjectModeTemplate['mode'][] = [
  'exam-review',
  'paper-assistant',
  'research-analysis',
  'teaching-design',
  'assignment-quiz',
  'research-innovation',
  'lab-simulation',
  'virtual-teacher',
  'student-development',
  'interactive-courseware',
  'teaching-game',
  'knowledge-graph',
  'mistake-collection',
  'modeling-competition',
  'literature-review',
  'academic-formatting',
];
