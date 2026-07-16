function normalizeText(value) {
  return (value ?? '').trim();
}

function splitLines(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateWizardProject(wizard) {
  const name = normalizeText(wizard.name);
  const courseName = normalizeText(wizard.courseName);

  if (!name && !courseName) {
    return '请至少填写项目名称或课程名称';
  }

  if (!normalizeText(wizard.model)) {
    return '请先选择项目模型';
  }

  if (!normalizeText(wizard.provider)) {
    return '请先选择模型服务商';
  }

  return null;
}

export function canCreateWizardProject(wizard) {
  return validateWizardProject(wizard) === null;
}

export function getWizardStepError(wizard, step) {
  if (step === 1) {
    return validateWizardProject({
      ...wizard,
      model: normalizeText(wizard.model) || 'placeholder-model',
      provider: normalizeText(wizard.provider) || 'placeholder-provider'
    });
  }

  return null;
}

export function buildWizardProjectPayload(wizard, initialQuestions = []) {
  const name = normalizeText(wizard.name);
  const courseName = normalizeText(wizard.courseName);

  return {
    mode: wizard.mode || 'exam-review',
    modeConfig: wizard.modeConfig && typeof wizard.modeConfig === 'object' ? wizard.modeConfig : {},
    name: name || courseName,
    courseName: courseName || name,
    linkedFolder: normalizeText(wizard.linkedFolder) || undefined,
    examType: wizard.examType,
    textbook: normalizeText(wizard.textbook),
    notes: normalizeText(wizard.notes),
    requirements: normalizeText(wizard.requirements),
    mustKnow: splitLines(wizard.mustKnow ?? ''),
    keyPoints: splitLines(wizard.keyPoints ?? ''),
    provider: normalizeText(wizard.provider),
    model: normalizeText(wizard.model),
    initialQuestions
  };
}
