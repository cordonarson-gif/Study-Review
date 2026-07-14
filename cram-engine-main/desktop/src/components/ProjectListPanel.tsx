/**
 * ProjectListPanel — 历史项目管理面板
 * 功能：项目搜索、排序切换、统计预览、打开/重命名/删除
 * 纯展示组件，状态和回调由父组件 App.tsx 传入
 */

import { useMemo, useState } from 'react';
import type { ProjectMeta, ProjectSortKey, ProjectSummary } from '../lib/types';

type Props = {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  summaries: Record<string, { questionCount: number; knowledgeBaseCount: number; progressPercent: number }>;
  onOpen: (projectId: string) => void;
  onRename: (project: ProjectMeta) => void;
  onDelete: (project: ProjectMeta) => void;
};

const sortLabels: Record<ProjectSortKey, string> = {
  lastOpened: '最近打开',
  created: '创建时间',
  name: '名称'
};

export default function ProjectListPanel({
  projects,
  activeProjectId,
  summaries,
  onOpen,
  onRename,
  onDelete
}: Props) {
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
      <div className="section-title">历史项目 / 已创建项目</div>

      {/* 搜索 + 排序 */}
      <div className="project-controls">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索项目..."
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as ProjectSortKey)}
        >
          {Object.entries(sortLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* 项目列表 */}
      {filtered.length ? (
        filtered.map((project) => {
          const summary = summaries[project.id];
          const isActive = activeProjectId === project.id;

          return (
            <div
              key={project.id}
              className={`project-card ${isActive ? 'active' : ''}`}
              onClick={() => onOpen(project.id)}
            >
              <div className="project-card-main">
                <span className="project-card-name">{project.name}</span>
                <span className="project-card-meta">
                  <span>{project.courseName}</span>
                  <span>{project.examType}</span>
                </span>
                {summary && (
                  <span className="project-card-stats">
                    <span title="题目数">📝 {summary.questionCount}</span>
                    <span title="知识库条目">📚 {summary.knowledgeBaseCount}</span>
                    {summary.progressPercent > 0 && (
                      <span title="学习进度">
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
                  title="重命名"
                >
                  ✏️
                </button>
                <button
                  className="danger"
                  onClick={() => onDelete(project)}
                  title="删除"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty-project-hint muted">
          {search.trim() ? '没有匹配的项目' : '还没有项目，先创建一个课程工作区。'}
        </div>
      )}
    </div>
  );
}
