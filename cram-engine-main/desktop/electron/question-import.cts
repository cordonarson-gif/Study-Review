import path from 'node:path';
import { parseQuestionDrafts, type QuestionDraft } from './question-utils.cjs';

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff']);

export async function previewQuestionFiles(
  filePaths: string[],
  extractText: (filePath: string) => Promise<string>
) {
  const drafts: QuestionDraft[] = [];

  for (const filePath of filePaths) {
    const text = await extractText(filePath);
    const source = imageExtensions.has(path.extname(filePath).toLowerCase()) ? 'image' : 'file';
    drafts.push(...parseQuestionDrafts(text, source, path.basename(filePath)));
  }

  return drafts;
}
