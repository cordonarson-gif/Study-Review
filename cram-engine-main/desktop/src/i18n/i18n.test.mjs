import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const i18nDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(i18nDir, '..');
const appPath = join(srcDir, 'app', 'App.tsx');
const settingsPagePath = join(srcDir, 'components', 'settings', 'ProviderSettingsPage.tsx');
const modeSelectorPath = join(srcDir, 'components', 'modes', 'ProjectModeSelector.tsx');
const helpCenterPath = join(srcDir, 'components', 'help', 'HelpCenterPage.tsx');
const projectDisplayPath = join(srcDir, 'lib', 'projectDisplay.ts');
const deliveryPagePath = join(srcDir, 'components', 'delivery', 'DeliveryPackagePage.tsx');
const modeModulePagePath = join(srcDir, 'components', 'modes', 'ModeModulePage.tsx');
const utilsPath = join(srcDir, 'lib', 'utils.ts');
const questionImportPath = join(srcDir, 'components', 'QuestionImportPanel.tsx');
const localeFiles = ['zh-CN.ts', 'zh-TW.ts', 'en.ts'];

test('the default test command includes the internationalization contract suite', async () => {
  const packageJson = JSON.parse(await readFile(join(srcDir, '..', 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['test:i18n'], 'node --test src/i18n/*.test.mjs');
  assert.match(packageJson.scripts.test, /test:i18n/);
});

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}

function collectDictionary(node, prefix = '', output = new Map()) {
  assert.ok(ts.isObjectLiteralExpression(node), `expected object literal at ${prefix || '<root>'}`);
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyName(property.name);
    if (!name) continue;
    const path = prefix ? `${prefix}.${name}` : name;
    if (ts.isObjectLiteralExpression(property.initializer)) {
      collectDictionary(property.initializer, path, output);
    } else if (ts.isStringLiteralLike(property.initializer)) {
      output.set(path, property.initializer.text);
    }
  }
  return output;
}

async function readDictionary(fileName) {
  const sourceText = await readFile(join(i18nDir, fileName), 'utf8');
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let dictionary;
  source.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
        dictionary = collectDictionary(declaration.initializer);
      }
    }
  });
  assert.ok(dictionary, `dictionary object not found in ${fileName}`);
  return dictionary;
}

function placeholders(value) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test('all supported locales expose identical keys and interpolation parameters', async () => {
  const dictionaries = await Promise.all(localeFiles.map(readDictionary));
  const expectedKeys = [...dictionaries[0].keys()].sort();

  for (let index = 1; index < dictionaries.length; index += 1) {
    assert.deepEqual([...dictionaries[index].keys()].sort(), expectedKeys, `${localeFiles[index]} keys differ from zh-CN.ts`);
  }

  for (const key of expectedKeys) {
    const expectedPlaceholders = placeholders(dictionaries[0].get(key));
    for (let index = 1; index < dictionaries.length; index += 1) {
      assert.deepEqual(
        placeholders(dictionaries[index].get(key)),
        expectedPlaceholders,
        `${localeFiles[index]} placeholders differ at ${key}`
      );
    }
  }
});

test('paper and assignment workspaces expose task-specific guidance in every locale', async () => {
  const modePromptKeys = [
    'mode.paperOverviewPrompt',
    'mode.paperLiteraturePrompt',
    'mode.paperOutlinePrompt',
    'mode.paperChaptersPrompt',
    'mode.paperMethodsPrompt',
    'mode.paperInnovationPrompt',
    'mode.paperFormatPrompt',
    'mode.paperDefensePrompt',
    'mode.assignmentOverviewPrompt',
    'mode.assignmentBankPrompt',
    'mode.assignmentPaperPrompt',
    'mode.assignmentOnlineQuizPrompt',
    'mode.assignmentGradingPrompt',
    'mode.assignmentWrongAnswersPrompt',
    'mode.assignmentFeedbackPrompt',
  ];
  const deliveryPromptKeys = [
    'delivery.paperAssistantDesc',
    'delivery.assignmentQuizDesc',
  ];
  const dictionaries = await Promise.all(localeFiles.map(readDictionary));

  for (let localeIndex = 0; localeIndex < dictionaries.length; localeIndex += 1) {
    const dictionary = dictionaries[localeIndex];
    const values = [...modePromptKeys, ...deliveryPromptKeys].map((key) => {
      assert.ok(dictionary.has(key), `${localeFiles[localeIndex]} is missing ${key}`);
      return dictionary.get(key).trim();
    });
    assert.equal(new Set(values).size, values.length, `${localeFiles[localeIndex]} reuses task guidance copy`);
  }

  const [modePage, deliveryPage, app] = await Promise.all([
    readFile(modeModulePagePath, 'utf8'),
    readFile(deliveryPagePath, 'utf8'),
    readFile(appPath, 'utf8'),
  ]);
  for (const tabId of [
    'paper-overview',
    'paper-literature',
    'paper-outline',
    'paper-chapters',
    'paper-methods',
    'paper-innovation',
    'paper-format',
    'paper-defense',
    'assignment-overview',
    'assignment-bank',
    'assignment-paper',
    'assignment-online-quiz',
    'assignment-grading',
    'assignment-wrong-answers',
    'assignment-feedback',
  ]) {
    assert.match(modePage, new RegExp(`'${tabId}': 'mode\\.[A-Za-z]+Prompt'`), `${tabId} has no guidance mapping`);
  }
  assert.match(modePage, /t\(generatePromptKey\)/);
  assert.match(deliveryPage, /'paper-assistant': 'delivery\.paperAssistantDesc'/);
  assert.match(deliveryPage, /'assignment-quiz': 'delivery\.assignmentQuizDesc'/);
  assert.match(deliveryPage, /t\(descriptionKey\)/);
  assert.match(app, /mode=\{activeProject\.meta\.mode\}/);
});

test('App consumes translations inside the provider and restores the saved locale', async () => {
  const source = await readFile(appPath, 'utf8');
  const providerIndex = source.indexOf('<I18nProvider');
  const contentIndex = source.indexOf('<AppContent');

  assert.match(source, /function AppContent\(/);
  assert.ok(providerIndex >= 0 && contentIndex > providerIndex, 'AppContent must render inside I18nProvider');
  assert.match(source, /setLocale\(loadedSettings\.locale\)/);
});

test('locale changes are saved immediately without discarding unrelated settings drafts', async () => {
  const app = await readFile(appPath, 'utf8');
  const settingsPage = await readFile(settingsPagePath, 'utf8');

  assert.match(app, /setLocale\(newLocale\)/);
  assert.match(app, /ce\.saveSettings\(nextSettings\)/);
  assert.match(settingsPage, /function applyLocaleToDraft\(/);
  assert.match(settingsPage, /setBaseline\(\(current\) => applyLocaleToDraft\(current, opt\.value\)\)/);
});

test('missing translations use a controlled readable fallback instead of exposing raw keys', async () => {
  const source = await readFile(join(i18nDir, 'index.tsx'), 'utf8');

  assert.match(source, /const fallback = resolveKey\(translations\['zh-CN'\]/);
  assert.match(source, /return fallback \?\? 'Translation unavailable'/);
  assert.doesNotMatch(source, /return key;/);
});

test('App routes built-in empty-state copy through translation keys', async () => {
  const source = await readFile(appPath, 'utf8');

  assert.match(source, /t\('app\.noProjectDescription'\)/);
  assert.match(source, /t\('app\.importedAwaitingParse'\)/);
  assert.doesNotMatch(source, /暂无项目说明，建议先进入素材页上传资料。/);
  assert.doesNotMatch(source, /已导入，等待解析/);
});

test('project mode registry copy is localized before it reaches renderer surfaces', async () => {
  const [app, selector, help, projectDisplay] = await Promise.all([
    readFile(appPath, 'utf8'),
    readFile(modeSelectorPath, 'utf8'),
    readFile(helpCenterPath, 'utf8'),
    readFile(projectDisplayPath, 'utf8'),
  ]);

  assert.match(app, /localizeProjectModeTemplate/);
  assert.match(selector, /localizeProjectModeTemplates/);
  assert.match(help, /localizeProjectModeTemplates/);
  assert.match(projectDisplay, /localizeProjectModeTemplate/);
});

test('manual delivery defaults are translated without translating saved package data', async () => {
  const source = await readFile(deliveryPagePath, 'utf8');

  assert.match(source, /createManualFallbackPackage\(t\)/);
  assert.match(source, /title: t\('delivery\.defaultTitle'\)/);
  assert.match(source, /value=\{draft\.title\}/);
  assert.match(source, /value=\{draft\.summary\}/);
});

test('the built-in chat greeting is translated while the project name stays a parameter', async () => {
  const [app, utils] = await Promise.all([readFile(appPath, 'utf8'), readFile(utilsPath, 'utf8')]);

  assert.match(utils, /createEmptyChatGreeting\(projectName: string \| undefined, t:/);
  assert.match(utils, /t\('app\.chatGreetingProject', \{ name: projectName \}\)/);
  assert.match(utils, /t\('app\.chatGreetingEmpty'\)/);
  assert.match(app, /createEmptyChatGreeting\(project\?\.meta\.name, t\)/);
  assert.doesNotMatch(utils, /已进入/);
});

test('visible dates use the active locale instead of a fixed Chinese locale', async () => {
  const [app, utils] = await Promise.all([readFile(appPath, 'utf8'), readFile(utilsPath, 'utf8')]);

  assert.match(utils, /formatDate\(iso: string, locale: Locale\)/);
  assert.match(utils, /toLocaleString\(locale\)/);
  assert.match(app, /formatDate\(msg\.createdAt, locale\)/);
  assert.match(app, /formatDate\(turn\.createdAt, locale\)/);
  assert.doesNotMatch(utils, /toLocaleString\('zh-CN'\)/);
});

test('question bank defaults follow locale without replacing a stored custom name', async () => {
  const source = await readFile(questionImportPath, 'utf8');

  assert.match(source, /stored\?\.questionBankName \?\? defaultBankName/);
  assert.match(source, /current === previousDefaultBankName\.current \? defaultBankName : current/);
  assert.match(source, /fallbackName \|\| questionBankName \|\| defaultBankName/);
  assert.doesNotMatch(source, /'本次导入题库'/);
});

test('localized mode labels change while stable option values remain untouched', async () => {
  const [{ projectModeTemplates }, { localizeProjectModeTemplates }, { default: english }] = await Promise.all([
    import('../lib/projectModes.ts'),
    import('./projectModes.ts'),
    import('./en.ts'),
  ]);
  const resolve = (key) => key.split('.').reduce((value, part) => value?.[part], english);
  const t = (key, params = {}) => String(resolve(key)).replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? ''));
  const localized = localizeProjectModeTemplates(projectModeTemplates, t);

  assert.equal(localized.length, 16);
  assert.equal(localized[0].title, 'Final Review');
  assert.doesNotMatch(localized.map((template) => `${template.title} ${template.description}`).join(' '), /\p{Script=Han}/u);
  assert.equal(localized[0].wizardFields[2].options[0], projectModeTemplates[0].wizardFields[2].options[0]);
  assert.equal(localized[0].wizardFields[2].optionLabels[0], 'Closed-book final');
  assert.equal(localized[0].tabs[0].label, 'Overview');
});

async function listTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listTsxFiles(path));
    else if (extname(entry.name) === '.tsx') files.push(path);
  }
  return files;
}

const technicalTextAllowlist = new Set([
  'Cram Engine',
  'Cram Engine Desktop',
  'Cram Engine v1.0',
  'CRAM BOT',
  'API',
  'API Key',
  'Base URL',
  'LaTeX',
  'Markdown',
  'MinerU',
  'MinerU API Key',
]);

function isProductCopy(value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || technicalTextAllowlist.has(normalized)) return false;
  if (/^&[#a-zA-Z0-9]+;$/.test(normalized)) return false;
  if (/^(https?:\/\/|[A-Z0-9_.:/+-]+)$/i.test(normalized)) return false;
  if (/^(API|API Key|Base URL|LaTeX|Markdown|JSON|MinerU(?: API Key)?)(?:[：:]|\s*\([^)]*\))?$/i.test(normalized)) return false;
  return /[\p{L}\p{Script=Han}]/u.test(normalized);
}

function staticText(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  return null;
}

function staticExpressionTexts(node) {
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isConditionalExpression(node)) {
    return [...staticExpressionTexts(node.whenTrue), ...staticExpressionTexts(node.whenFalse)];
  }
  if (ts.isTemplateExpression(node)) {
    return [node.head.text + node.templateSpans.map((span) => span.literal.text).join('')];
  }
  return [];
}

test('renderer product copy is routed through the translation layer', async () => {
  const violations = [];
  const attributeNames = new Set(['placeholder', 'title', 'aria-label']);
  const messageCalls = new Set(['alert', 'confirm', 'showToast', 'setStatus', 'setError', 'setMessage']);

  for (const filePath of await listTsxFiles(srcDir)) {
    const sourceText = await readFile(filePath, 'utf8');
    const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      const values = [];
      if (ts.isJsxText(node)) values.push(node.text);
      if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
        values.push(...staticExpressionTexts(node.expression));
      }
      if (ts.isJsxAttribute(node) && attributeNames.has(node.name.text) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) values.push(node.initializer.text);
        if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          values.push(...staticExpressionTexts(node.initializer.expression));
        }
      }
      if (ts.isCallExpression(node) && node.arguments.length > 0) {
        const callee = ts.isIdentifier(node.expression)
          ? node.expression.text
          : ts.isPropertyAccessExpression(node.expression)
            ? node.expression.name.text
            : '';
        if (messageCalls.has(callee)) values.push(...staticExpressionTexts(node.arguments[0]));
      }
      for (const value of values) {
        if (!isProductCopy(value)) continue;
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        violations.push(`${filePath.slice(srcDir.length + 1)}:${position.line + 1} ${JSON.stringify(value.replace(/\s+/g, ' ').trim())}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  assert.equal(violations.length, 0, `hard-coded renderer copy:\n${violations.join('\n')}`);
});

test('translation calls do not consume arbitrary dynamic data fields', async () => {
  const violations = [];
  for (const filePath of await listTsxFiles(srcDir)) {
    const sourceText = await readFile(filePath, 'utf8');
    const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments[0]) {
        const key = node.arguments[0];
        const isControlled = ts.isStringLiteralLike(key)
          || ts.isTemplateExpression(key)
          || ts.isConditionalExpression(key)
          || (ts.isIdentifier(key) && /key$/i.test(key.text))
          || (ts.isPropertyAccessExpression(key) && /key$/i.test(key.name.text))
          || (ts.isElementAccessExpression(key) && /key/i.test(key.expression.getText(source)))
          || (ts.isBinaryExpression(key) && /key/i.test(key.getText(source)));
        if (!isControlled) {
          const position = source.getLineAndCharacterOfPosition(key.getStart(source));
          violations.push(`${filePath.slice(srcDir.length + 1)}:${position.line + 1} ${key.getText(source)}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  assert.equal(violations.length, 0, `dynamic values passed to t():\n${violations.join('\n')}`);
});
