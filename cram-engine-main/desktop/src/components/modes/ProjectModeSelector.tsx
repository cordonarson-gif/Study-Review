import type { ProjectMode } from '../../lib/types';
import { projectModeTemplates } from '../../lib/projectModes';
import { useT } from '../../i18n';
import { localizeProjectModeTemplates } from '../../i18n/projectModes';

type ProjectModeSelectorProps = {
  selectedMode: ProjectMode;
  onSelect: (mode: ProjectMode) => void;
};

export function ProjectModeSelector({ selectedMode, onSelect }: ProjectModeSelectorProps) {
  const { t } = useT();
  const projectModeOptions = localizeProjectModeTemplates(projectModeTemplates, t);
  return (
    <section className="project-mode-selector" aria-label={t('modes.ariaLabel')}>
      <div className="page-section-header">
        <div>
          <div className="section-title">{t('modes.projectType')}</div>
          <h3>{t('modes.selectWorkflow')}</h3>
          <p className="muted">{t('modes.selectWorkflowDesc')}</p>
        </div>
      </div>
      <div className="project-mode-grid">
        {projectModeOptions.map((option) => (
          <button
            key={option.mode}
            type="button"
            className={option.mode === selectedMode ? 'project-mode-card active' : 'project-mode-card'}
            onClick={() => onSelect(option.mode)}
          >
            <span>{option.icon}</span>
            <strong>{option.title}</strong>
            <small>{option.description}</small>
            <div className="project-mode-chip-row">
              {option.recommendedFor.slice(0, 3).map((item) => <em key={item}>{item}</em>)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
