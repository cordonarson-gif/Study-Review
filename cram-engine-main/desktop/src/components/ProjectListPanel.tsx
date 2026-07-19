/**
 * ProjectListPanel — 历史项目管理面板
 * 功能：项目搜索、排序切换、统计预览、打开/重命名/删除
 * 纯展示组件，状态和回调由父组件 App.tsx 传入
 */

import { useMemo, useState } from 'react';
import { getProjectModeDisplay } from '../lib/projectDisplay';
import type { ProjectMeta, ProjectSortKey } from '../lib/types';
import { useT } from '../i18n';

type Props = {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  summaries: Record<string, { questionCount: number; knowledgeBaseCount: number; progressPercent: number }>;
  onOpen: (projectId: string) => void;
  onRename: (project: ProjectMeta) => void;
  onDelete: (project: ProjectMeta) => void;
};

const sortLabelKeys: Record<ProjectSortKey, string> = {
  lastOpened: 'project.sortLastOpened',
  created: 'project.sortCreated',
  name: 'project.sortName'
};

export default function ProjectListPanel({
  projects,
  activeProjectId,
  summaries,
  onOpen,
  onRename,
  onDelete
}: Props) {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<ProjectSortKey>('lastOpened');

  const filtered = useMemo(() => {
    let list = [...projects];
    const query = search.trim().toLowerCase();

    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.courseName.toLowerCase().includes(query)
      );
    }

    // 排序
    list.sort((a, b) => {
      switch (sortKey) {
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN');
        case 'lastOpened':
        default:
          const la = new Date(a.lastOpenedAt || a.updatedAt).getTime();
          const lb = new Date(b.lastOpenedAt || b.updatedAt).getTime();
          return lb - la;
      }
    });

    return list;
  }, [projects, search, sortKey]);

  return (
    <div className="project-panel">
      <div className="section-title">{t('project.listTitle')}</div>

      {/* 搜索 + 排序 */}
      <div className="project-controls">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('project.searchPlaceholder')}
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as ProjectSortKey)}
        >
          {Object.entries(sortLabelKeys).map(([key, labelKey]) => (
            <option key={key} value={key}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* 项目列表 */}
      {filtered.length ? (
        filtered.map((project) => {
          const summary = summaries[project.id];
          const isActive = activeProjectId === project.id;
          const display = getProjectModeDisplay(project, t);

          return (
            <div
              key={project.id}
              className={`project-card ${isActive ? 'active' : ''}`}
              onClick={() => onOpen(project.id)}
            >
              <div className="project-card-main">
                <span className="project-card-heading">
                  <span className="project-card-badge" title={display.subtitle}>{display.icon}</span>
                  <span className="project-card-name">{project.name}</span>
                </span>
                <span className="project-card-meta">
                  <span>{display.title}</span>
                  <span>{display.subtitle}</span>
                </span>
                {summary && (
                  <span className="project-card-stats">
                    <span title={t('project.questionCount')}>📝 {summary.questionCount}</span>
                    <span title={t('project.knowledgeBaseCount')}>📚 {summary.knowledgeBaseCount}</span>
                    {summary.progressPercent > 0 && (
                      <span title={t('project.progress')}>
                        {summary.progressPercent}%
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div
                className="project-card-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onRename(project)}
                  title={t('common.rename')}
                >
                  ✏️
                </button>
                <button
                  className="danger"
                  onClick={() => onDelete(project)}
                  title={t('common.delete')}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty-project-hint muted">
          {search.trim() ? t('project.noMatch') : t('project.noProjectYet')}
        </div>
      )}
    </div>
  );
}
