import type { ProjectMeta } from './types';
import { getProjectModeTemplate } from './projectModes';
import { localizeProjectModeTemplate } from '../i18n/projectModes';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export type ProjectModeDisplay = {
  icon: string;
  shortLabel: string;
  title: string;
  subtitle: string;
};

export function getProjectModeDisplay(project: Pick<ProjectMeta, 'mode' | 'courseName' | 'examType'>, t: TFn): ProjectModeDisplay {
  const template = localizeProjectModeTemplate(getProjectModeTemplate(project.mode), t);
  const courseName = project.courseName.trim();
  const title = template.title;
  const subtitle = template.mode === 'exam-review'
    ? project.examType || t('game.examReview')
    : title;

  return {
    icon: template.icon,
    shortLabel: template.icon,
    title: courseName || title,
    subtitle
  };
}
