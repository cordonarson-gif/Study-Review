const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const latexDetectorUrl = pathToFileURL(path.join(__dirname, '..', 'dist-electron', 'latex-detector.cjs')).href;

async function loadLatexDetector() {
  return import(latexDetectorUrl);
}

test('buildLatexCandidates prefers MiKTeX executables discovered from PATH', async () => {
  const detector = await loadLatexDetector();
  const env = {
    Path: [
      'E:\\MiKTeX\\miktex\\bin\\x64',
      'C:\\ProgramData\\TinyTeX\\bin\\windows'
    ].join(';')
  };

  const candidates = detector.buildLatexCandidates(env);

  assert.equal(candidates[0].distribution, 'MiKTeX');
  assert.equal(candidates[0].engine, 'xelatex');
  assert.equal(candidates[0].path, 'E:\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe');
});

test('detectLatexEnvironment reports MiKTeX as configured when an executable exists', async () => {
  const detector = await loadLatexDetector();
  const env = {
    Path: 'E:\\MiKTeX\\miktex\\bin\\x64'
  };

  const status = await detector.detectLatexEnvironment(env, async (candidatePath) => (
    candidatePath === 'E:\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe'
  ));

  assert.deepEqual(status, {
    available: true,
    engine: 'xelatex',
    path: 'E:\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe',
    distribution: 'MiKTeX',
    message: '配置成功',
    installRequired: false
  });
});

test('detectLatexEnvironment requests installation when no LaTeX executable exists', async () => {
  const detector = await loadLatexDetector();

  const status = await detector.detectLatexEnvironment({ Path: '' }, async () => false);

  assert.equal(status.available, false);
  assert.equal(status.distribution, 'missing');
  assert.equal(status.message, '未安装');
  assert.equal(status.installRequired, true);
});
