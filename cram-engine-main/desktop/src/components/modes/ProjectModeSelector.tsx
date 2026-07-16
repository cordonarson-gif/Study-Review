import type { ProjectMode } from '../../lib/types';
import { projectModeOptions } from '../../lib/projectModes';

type ProjectModeSelectorProps = {
  selectedMode: ProjectMode;
  onSelect: (mode: ProjectMode) => void;
};

const visibleModeText = '期末复习 论文助手 科研数据分析 教学设计 作业出题批改';

export function ProjectModeSelector({ selectedMode, onSelect }: ProjectModeSelectorProps) {
  return (
    <section className="project-mode-selector" aria-label={`项目类型选择：${visibleModeText}`}>
      <div className="page-section-header">
        <div>
          <div className="section-title">项目类型</div>
          <h3>先选工作流，再填写项目资料</h3>
          <p className="muted">不同类型会自动切换向导字段、工作台页面、智能体分工和最终交付物。</p>
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
