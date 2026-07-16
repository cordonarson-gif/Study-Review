import { getProjectModeTemplate } from './projectModes.js';

export function getProjectModeDisplay(project) {
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
