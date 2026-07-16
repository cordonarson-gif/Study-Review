import type { ProjectMeta } from './types';
import { getProjectModeTemplate } from './projectModes';

export type ProjectModeDisplay = {
  icon: string;
  shortLabel: string;
  title: string;
  subtitle: string;
};

export function getProjectModeDisplay(project: Pick<ProjectMeta, 'mode' | 'courseName' | 'examType'>): ProjectModeDisplay {
  const template = getProjectModeTemplate(project.mode);
  const courseName = project.courseName.trim();
  const title = template.title;
  const subtitle = template.mode === 'exam-review'
    ? project.examType || '期末复习'
    : title;

  return {
    icon: template.icon,
    shortLabel: template.icon,
    title: courseName || title,
    subtitle
  };
}
