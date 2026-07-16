const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSourcePath = path.join(__dirname, 'main.cts');
const appSourcePath = path.join(__dirname, '..', 'src', 'app', 'App.tsx');
const typesSourcePath = path.join(__dirname, '..', 'src', 'lib', 'types.ts');
const globalSourcePath = path.join(__dirname, '..', 'src', 'global.d.ts');

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test('delivery package model is declared in renderer and global contracts', () => {
  const types = fs.readFileSync(typesSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');

  for (const source of [types, globalTypes]) {
    assert.match(source, /type DeliveryPackageItemType =/);
    assert.match(source, /type DeliveryPackageItemStatus = 'ready' \| 'needs-review' \| 'missing'/);
    assert.match(source, /type DeliveryPackageItem =/);
    assert.match(source, /type DeliveryPackage =/);
    assert.match(source, /checklist/);
  }
});

test('DeliveryAgent has project-local persistence and export generation', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');

  assert.match(main, /function projectDeliveryPackagePath\(projectId: string\)/);
  assert.match(main, /async function getDeliveryPackage\(projectId: string\)/);
  assert.match(main, /function buildFallbackDeliveryPackage/);
  assert.match(main, /async function generateDeliveryPackage\(projectId: string\)/);
  assert.match(main, /async function saveDeliveryPackage\(projectId: string, deliveryPackage: DeliveryPackage\)/);
  assert.match(main, /async function exportDeliveryPackage\(projectId: string\)/);
});

test('project export produces a portable archive and import restores it as a local project', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const preload = fs.readFileSync(path.join(__dirname, 'preload.cts'), 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');
  const app = fs.readFileSync(appSourcePath, 'utf8');
  const exporter = sourceBetween(main, 'async function exportProject', '\nasync function importProjectArchive');
  const importer = sourceBetween(main, 'async function importProjectArchive', '\nasync function checkLatex');

  assert.match(main, /type ProjectTransferArchive =/);
  assert.match(main, /async function collectProjectArchiveFiles\(projectId: string\)/);
  assert.match(exporter, /exportSchemaVersion: 3/);
  assert.match(exporter, /app: 'cram-engine-desktop'/);
  assert.match(exporter, /files: await collectProjectArchiveFiles\(projectId\)/);
  assert.match(importer, /dialog\.showOpenDialog/);
  assert.match(importer, /importedMeta = normalizeProjectMeta/);
  assert.match(importer, /root: root/);
  assert.match(importer, /knowledgeBasePath: projectKnowledgeBaseDir\(id\)/);
  assert.match(importer, /linkedFolder: ''/);
  assert.match(importer, /rewriteImportedProjectPaths\(id\)/);
  assert.match(importer, /await saveProjects/);
  assert.match(importer, /return openProject\(id\)/);
  assert.match(main, /ipcMain\.handle\('projects:importArchive'/);
  assert.match(preload, /importProjectArchive: \(\) => ipcRenderer\.invoke\('projects:importArchive'\)/);
  assert.match(globalTypes, /importProjectArchive: \(\) => Promise<ProjectDetail \| null>/);
  assert.match(app, /async function importProjectArchive/);
  assert.match(app, /await ce\.importProjectArchive\(\)/);
  assert.match(app, /setActiveProject\(enrichedDetail\)/);
  assert.match(app, /setProjects\(nextProjects\)/);
  assert.match(app, /导入项目/);
});

test('DeliveryAgent includes mode artifacts in delivery generation', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');

  assert.match(main, /modeArtifacts/);
  assert.match(main, /listModeArtifacts\(projectId\)/);
  assert.match(main, /buildModeDeliveryItems/);
  assert.match(main, /mode-artifacts/);
});

test('mode delivery registry mirrors every renderer template deliverable', async () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const { projectModeTemplates } = await import('../src/lib/projectModes.js');
  const registry = sourceBetween(
    main,
    'const modeDeliveryDefinitions: Record<ProjectMode, ModeDeliveryDefinition[]> = {',
    '\n};\n\nfunction selectLatestModeArtifactsByTab'
  );

  assert.equal(projectModeTemplates.length, 16);
  for (const [index, template] of projectModeTemplates.entries()) {
    const marker = `'${template.mode}': [`;
    const nextTemplate = projectModeTemplates[index + 1];
    const modeBlock = nextTemplate
      ? sourceBetween(registry, marker, `'${nextTemplate.mode}': [`)
      : registry.slice(registry.indexOf(marker));

    for (const deliverable of template.deliverables) {
      assert.match(modeBlock, new RegExp(`title: '${deliverable.label}'`));
      for (const checklistEntry of deliverable.checklist) {
        assert.ok(modeBlock.includes(`'${checklistEntry}'`), `${template.mode} is missing checklist entry ${checklistEntry}`);
      }
    }

    if (template.mode !== 'exam-review') {
      assert.ok((modeBlock.match(/\bid: 'delivery-[^']+'/g) ?? []).length >= 3, `${template.mode} needs at least three delivery definitions`);
    }
  }
});

test('non-exam delivery requirements only use reachable artifact-producing template tabs', async () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const app = fs.readFileSync(appSourcePath, 'utf8');
  const { projectModeTemplates } = await import('../src/lib/projectModes.js');
  const registry = sourceBetween(
    main,
    'const modeDeliveryDefinitions: Record<ProjectMode, ModeDeliveryDefinition[]> = {',
    '\n};\n\nfunction selectLatestModeArtifactsByTab'
  );
  const nonArtifactBlock = sourceBetween(
    main,
    'const nonArtifactWorkspaceTabs = new Set<WorkspaceTabId>([',
    '\n]);\n\ntype ModeDeliveryDefinition'
  );
  const nonArtifactTabs = [...nonArtifactBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);

  assert.deepEqual(nonArtifactTabs, [
    'graph-view',
    'game-bank',
    'game-preview',
    'mistakes-import',
    'mistakes-review',
    'mistakes-practice',
    'simulation-run'
  ]);
  assert.doesNotMatch(nonArtifactBlock, /courseware-preview/);
  assert.match(app, /isModeTab\(editorTab\) && !specializedModeTabs\.has\(editorTab\)/);

  for (const [index, template] of projectModeTemplates.entries()) {
    if (template.mode === 'exam-review') continue;
    const marker = `'${template.mode}': [`;
    const nextTemplate = projectModeTemplates[index + 1];
    const modeBlock = nextTemplate
      ? sourceBetween(registry, marker, `'${nextTemplate.mode}': [`)
      : registry.slice(registry.indexOf(marker));
    const templateTabIds = new Set(template.tabs.map((tab) => tab.id));
    const definitionBlocks = [...modeBlock.matchAll(/\{\s*id: 'delivery-[\s\S]*?\n    \}/g)].map((match) => match[0]);

    assert.ok(definitionBlocks.length >= 3, `${template.mode} needs delivery definitions`);
    for (const definitionBlock of definitionBlocks) {
      const tabList = definitionBlock.match(/tabIds: \[([^\]]*)\]/)?.[1] ?? '';
      const tabIds = [...tabList.matchAll(/'([^']+)'/g)].map((tabMatch) => tabMatch[1]);
      assert.ok(tabIds.length > 0 || /evidence:/.test(definitionBlock), `${template.mode} delivery definition needs a tab or evidence`);
      for (const tabId of tabIds) {
        assert.ok(templateTabIds.has(tabId), `${template.mode} references non-template tab ${tabId}`);
        assert.ok(!nonArtifactTabs.includes(tabId), `${template.mode} requires non-artifact tab ${tabId}`);
      }
    }
  }
});

test('mode delivery items use latest current-mode artifacts and require complete reviewed tabs', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const builder = sourceBetween(main, 'function buildModeDeliveryItems', '\nfunction buildFallbackDeliveryPackage');

  assert.match(builder, /modeDeliveryDefinitions\[mode\]/);
  assert.match(builder, /selectLatestModeArtifactsByTab\(mode, definition\.tabIds, modeArtifacts\)/);
  assert.match(builder, /const evidence = definition\.evidence\s*\? assessModeDeliveryEvidence\(project, definition\.evidence\)/);
  assert.match(builder, /type: 'archive'/);
  assert.match(builder, /status: buildModeDeliveryStatus\(definition, matchingArtifacts, evidence\)/);
  assert.match(builder, /sourceIds: uniqueStrings\(\[\s*\.\.\.matchingArtifacts\.map\(\(artifact\) => artifact\.id\),\s*\.\.\.evidence\.sourceIds\s*\]\)/);
  assert.match(builder, /\$\{matchingArtifacts\.length\}\/\$\{definition\.tabIds\.length\}/);
});

test('mode delivery status filters cross-mode history and checks tab, content, and source quality', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const latest = sourceBetween(main, 'function selectLatestModeArtifactsByTab', '\nfunction buildModeDeliveryStatus');
  const status = sourceBetween(main, 'function buildModeDeliveryStatus', '\nfunction buildModeDeliveryItems');

  assert.match(latest, /artifact\.mode !== mode/);
  assert.match(latest, /!tabIds\.includes\(artifact\.tabId\)/);
  assert.match(latest, /new Date\(artifact\.updatedAt\)\.getTime\(\)/);
  assert.match(latest, /new Date\(existing\.updatedAt\)\.getTime\(\)/);
  assert.match(latest, /latestByTab\.set\(artifact\.tabId, artifact\)/);
  assert.match(latest, /tabIds\.flatMap/);

  assert.match(status, /if \(!artifacts\.length && !evidence\.sourceIds\.length\) return 'missing'/);
  assert.match(status, /artifacts\.length !== definition\.tabIds\.length/);
  assert.match(status, /definition\.evidence && evidence\.status !== 'ready'/);
  assert.match(status, /!artifact\.contentMarkdown\.trim\(\)/);
  assert.match(status, /artifact\.source === 'fallback'/);
  assert.match(status, /return 'needs-review'/);
  assert.match(status, /return 'ready'/);
});

test('structured evidence definitions do not alias specialized data to unrelated artifacts', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const registry = sourceBetween(
    main,
    'const modeDeliveryDefinitions: Record<ProjectMode, ModeDeliveryDefinition[]> = {',
    '\n};\n\nfunction selectLatestModeArtifactsByTab'
  );
  const gameBank = sourceBetween(registry, "id: 'delivery-game-question-bank'", '\n    },');
  const gameRules = sourceBetween(registry, "id: 'delivery-game-rules'", '\n    },');
  const mistakeLibrary = sourceBetween(registry, "id: 'delivery-mistake-library'", '\n    },');
  const knowledgeGraph = sourceBetween(registry, "id: 'delivery-knowledge-graph'", '\n    },');

  assert.match(main, /type DeliveryEvidenceKind/);
  assert.match(main, /evidence\?: DeliveryEvidenceKind/);
  assert.match(gameBank, /tabIds: \[\]/);
  assert.match(gameBank, /evidence: 'playable-questions'/);
  assert.doesNotMatch(gameBank, /game-rules/);
  assert.match(gameRules, /tabIds: \['game-rules'\]/);
  assert.doesNotMatch(gameRules, /evidence:/);
  assert.match(mistakeLibrary, /tabIds: \[\]/);
  assert.match(mistakeLibrary, /evidence: 'wrong-questions'/);
  assert.match(knowledgeGraph, /tabIds: \['graph-curation'\]/);
  assert.match(knowledgeGraph, /evidence: 'knowledge-sources'/);
});

test('non-exam fallback contains project sources and mode deliverables without review-only items', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const fallback = sourceBetween(main, 'function buildFallbackDeliveryPackage', '\nasync function generateDeliveryPackage');
  const nonExam = sourceBetween(fallback, "if (mode !== 'exam-review') {", '\n  const practice = summarizePractice');

  assert.match(nonExam, /id: 'delivery-project-sources'/);
  assert.match(nonExam, /\.\.\.project\.uploads\.map\(\(upload\) => upload\.storedPath\)/);
  assert.match(nonExam, /\.\.\.project\.knowledgeBase\.map\(\(entry\) => entry\.id\)/);
  assert.match(nonExam, /\.\.\.buildModeDeliveryItems\(project, modeArtifacts\)/);
  assert.doesNotMatch(nonExam, /type: '(?:resources|reports|question-bank|knowledge-base|learning-path)'/);
  assert.doesNotMatch(nonExam, /delivery-(?:resources|reports|question-bank|knowledge-base|learning-path)/);
  assert.match(nonExam, /modeDeliveryDefinitions\[mode\]/);
});

test('delivery export embeds complete mode artifact Markdown and self-contained JSON', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const renderer = sourceBetween(main, 'function renderDeliveryPackageMarkdown', '\nasync function exportDeliveryPackage');
  const exporter = sourceBetween(main, 'async function exportDeliveryPackage', '\nasync function getProjectAllowedRoot');

  assert.match(renderer, /modeArtifacts: ModeArtifact\[\] = \[\]/);
  assert.match(renderer, /deliveryEvidence: DeliveryEvidencePayload/);
  assert.ok(renderer.includes('## 模式成果正文'));
  assert.ok(renderer.includes('暂无模式成果正文'));
  assert.match(renderer, /`### \$\{artifact\.title\}`/);
  assert.match(renderer, /`- 模式：\$\{artifact\.mode\}`/);
  assert.match(renderer, /`- 页签：\$\{artifact\.tabId\}`/);
  assert.match(renderer, /`- 类型：\$\{artifact\.kind\}`/);
  assert.match(renderer, /`- 来源：\$\{artifact\.source\}`/);
  assert.match(renderer, /artifact\.updatedAt/);
  assert.match(renderer, /artifact\.contentMarkdown/);
  assert.ok(renderer.includes('## 结构化证据正文'));
  assert.ok(renderer.includes('暂无结构化证据正文'));
  assert.match(renderer, /question\.options/);
  assert.match(renderer, /question\.answer/);
  assert.match(renderer, /question\.explanation/);
  assert.match(renderer, /entry\.summary/);
  assert.match(renderer, /entry\.tags/);

  assert.match(exporter, /const allModeArtifacts = await listModeArtifacts\(projectId\)/);
  assert.match(exporter, /const modeArtifacts = selectDeliveryModeArtifacts\(detail, deliveryPackage, allModeArtifacts\)/);
  assert.match(exporter, /const deliveryEvidence = selectDeliveryEvidence\(detail, deliveryPackage\)/);
  assert.match(exporter, /renderDeliveryPackageMarkdown\(detail, deliveryPackage, modeArtifacts, deliveryEvidence\)/);
  assert.match(
    exporter,
    /writeJson\(jsonPath, \{\s*\.\.\.deliveryPackage,\s*exportSchemaVersion: 2,\s*deliveryPackage,\s*modeArtifacts,\s*deliveryEvidence\s*\}\)/
  );
});

test('delivery export selects only referenced current-mode latest artifacts', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const selector = sourceBetween(main, 'function selectDeliveryModeArtifacts', '\nfunction renderDeliveryPackageMarkdown');

  assert.match(selector, /const mode = normalizeProjectMode\(project\.meta\.mode\)/);
  assert.match(selector, /new Set\(deliveryPackage\.items\.flatMap\(\(item\) => item\.sourceIds\)\)/);
  assert.match(selector, /artifact\.mode === mode/);
  assert.match(selector, /referencedIds\.has\(artifact\.id\)/);
  assert.match(selector, /selectLatestModeArtifactsByTab/);
});
