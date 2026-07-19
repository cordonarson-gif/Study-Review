import { useT } from '../../i18n';

export type SettingsCategory = 'services' | 'workspace' | 'document' | 'default' | 'generation' | 'display' | 'language';

type SettingsCategoryNavProps = {
  activeCategory: SettingsCategory;
  onSelectCategory: (category: SettingsCategory) => void;
};

export default function SettingsCategoryNav({ activeCategory, onSelectCategory }: SettingsCategoryNavProps) {
  const { t } = useT();

  const categories: Array<{ id: SettingsCategory; label: string; description: string }> = [
    { id: 'services', label: t('settings.categoryServices'), description: t('settings.categoryServicesDesc') },
    { id: 'workspace', label: t('settings.categoryWorkspace'), description: t('settings.categoryWorkspaceDesc') },
    { id: 'document', label: t('settings.categoryDocument'), description: t('settings.categoryDocumentDesc') },
    { id: 'default', label: t('settings.categoryDefault'), description: t('settings.categoryDefaultDesc') },
    { id: 'generation', label: t('settings.categoryGeneration'), description: t('settings.categoryGenerationDesc') },
    { id: 'display', label: t('settings.categoryDisplay'), description: t('settings.categoryDisplayDesc') },
    { id: 'language', label: t('settings.categoryLanguage'), description: t('settings.categoryLanguageDesc') }
  ];

  return (
    <nav className="settings-category-nav" aria-label={t('settings.ariaLabel')}>
      <div className="settings-column-heading">
        <span>{t('settings.title')}</span>
        <strong>{t('settings.title')}</strong>
      </div>
      <div className="settings-category-list">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={activeCategory === category.id ? 'settings-category active' : 'settings-category'}
            onClick={() => onSelectCategory(category.id)}
          >
            <span>{category.label}</span>
            <small>{category.description}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}
