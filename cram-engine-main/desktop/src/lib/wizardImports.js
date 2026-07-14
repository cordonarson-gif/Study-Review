export function appendWizardValue(currentValue, incomingValue, separator = '\n') {
  const current = currentValue?.trim() ?? '';
  const incoming = incomingValue?.trim() ?? '';

  if (!current) return incoming;
  if (!incoming) return current;
  return `${current}${separator}${incoming}`;
}

export function appendWizardFileList(currentValue, filePaths, separator = '\n') {
  return appendWizardValue(currentValue, (filePaths ?? []).join(separator), separator);
}

export function formatQuestionDraftsForWizard(drafts) {
  return (drafts ?? [])
    .map((draft) => {
      const lines = [
        draft.stem?.trim() ?? '',
        ...((draft.options ?? []).map((option) => `${option.key}. ${option.text}`)),
        draft.answer ? `答案：${draft.answer}` : '',
        draft.explanation ? `解析：${draft.explanation}` : ''
      ].filter(Boolean);

      return lines.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

export function resolveWizardQuestionImportText(drafts, fallbackText = '') {
  const formattedDrafts = formatQuestionDraftsForWizard(drafts);
  return formattedDrafts || fallbackText.trim();
}
