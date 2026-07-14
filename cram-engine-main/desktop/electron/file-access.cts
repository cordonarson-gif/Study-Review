import path from 'node:path';

function normalize(value: string) {
  return path.resolve(value);
}

export function isWithinRoot(root: string, targetPath: string) {
  const normalizedRoot = normalize(root);
  const normalizedTarget = normalize(targetPath);
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}

export function assertAllowedProjectPath(root: string, targetPath: string) {
  if (!isWithinRoot(root, targetPath)) {
    throw new Error(`Path is outside the allowed project root: ${targetPath}`);
  }

  return targetPath;
}
