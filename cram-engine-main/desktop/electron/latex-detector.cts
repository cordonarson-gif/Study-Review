import path from 'node:path';
import { stat } from 'node:fs/promises';

export type LatexDistribution = 'MiKTeX' | 'TinyTeX' | 'TeX Live' | 'LaTeX' | 'missing';

export type LatexCandidate = {
  engine: 'xelatex' | 'pdflatex';
  path: string;
  distribution: Exclude<LatexDistribution, 'missing'>;
};

export type LatexStatus = {
  available: boolean;
  engine: string;
  path: string | null;
  distribution: LatexDistribution;
  message: string;
  installRequired: boolean;
};

type Environment = Record<string, string | undefined>;
type Exists = (candidatePath: string) => Promise<boolean>;

function splitPathList(value: string | undefined) {
  return (value ?? '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function inferDistribution(candidatePath: string): Exclude<LatexDistribution, 'missing'> {
  const normalized = candidatePath.toLowerCase();
  if (normalized.includes('miktex')) return 'MiKTeX';
  if (normalized.includes('tinytex')) return 'TinyTeX';
  if (normalized.includes('texlive')) return 'TeX Live';
  return 'LaTeX';
}

function addCandidate(
  candidates: LatexCandidate[],
  seen: Set<string>,
  directory: string,
  engine: 'xelatex' | 'pdflatex'
) {
  const executable = process.platform === 'win32' ? `${engine}.exe` : engine;
  const candidatePath = path.join(directory, executable);
  const key = candidatePath.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push({
    engine,
    path: candidatePath,
    distribution: inferDistribution(candidatePath)
  });
}

export function buildLatexCandidates(env: Environment = process.env): LatexCandidate[] {
  const seen = new Set<string>();
  const candidates: LatexCandidate[] = [];
  const pathDirs = splitPathList(env.Path ?? env.PATH);
  const commonDirs = [
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64') : '',
    env.ProgramFiles ? path.join(env.ProgramFiles, 'MiKTeX', 'miktex', 'bin', 'x64') : 'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64',
    env['ProgramFiles(x86)'] ? path.join(env['ProgramFiles(x86)'], 'MiKTeX', 'miktex', 'bin', 'x64') : '',
    env.ProgramData ? path.join(env.ProgramData, 'TinyTeX', 'bin', 'windows') : 'C:\\ProgramData\\TinyTeX\\bin\\windows'
  ].filter(Boolean);

  for (const directory of [...pathDirs, ...commonDirs]) {
    addCandidate(candidates, seen, directory, 'xelatex');
    addCandidate(candidates, seen, directory, 'pdflatex');
  }

  return candidates;
}

async function defaultExists(candidatePath: string) {
  try {
    await stat(candidatePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectLatexEnvironment(
  env: Environment = process.env,
  exists: Exists = defaultExists
): Promise<LatexStatus> {
  for (const candidate of buildLatexCandidates(env)) {
    if (await exists(candidate.path)) {
      return {
        available: true,
        engine: candidate.engine,
        path: candidate.path,
        distribution: candidate.distribution,
        message: '配置成功',
        installRequired: false
      };
    }
  }

  return {
    available: false,
    engine: 'missing',
    path: null,
    distribution: 'missing',
    message: '未安装',
    installRequired: true
  };
}
