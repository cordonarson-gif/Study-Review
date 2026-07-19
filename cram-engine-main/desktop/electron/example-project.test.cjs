const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', 'dist-electron', 'example-project.cjs')
).href;

async function loadExampleProject() {
  return import(moduleUrl);
}

function createDependencies(overrides = {}) {
  const calls = [];
  return {
    calls,
    dependencies: {
      isInitialized: async () => false,
      hasProjectRegistry: async () => false,
      createProject: async (input) => {
        calls.push({ type: 'create', input });
      },
      markInitialized: async () => {
        calls.push({ type: 'mark' });
      },
      ...overrides
    }
  };
}

test('example project seed is usable and contains no credentials or test data', async () => {
  const { createExampleProjectInput } = await loadExampleProject();
  const input = createExampleProjectInput();
  const serialized = JSON.stringify(input);

  assert.equal(input.name, '示例项目：计算机网络基础');
  assert.equal(input.courseName, '计算机网络基础');
  assert.equal(input.provider, 'openai-compatible');
  assert.equal(input.model, 'gpt-4.1');
  assert.ok(input.initialQuestions.length >= 3);
  assert.doesNotMatch(serialized, /api[_-]?key|secret|token|password|sk-[a-z0-9]|test|mock|fixture|测试/i);
});

test('fresh user data creates the example once and then records initialization', async () => {
  const { initializeExampleProject } = await loadExampleProject();
  const { calls, dependencies } = createDependencies();

  const result = await initializeExampleProject(dependencies);

  assert.equal(result, 'created');
  assert.deepEqual(calls.map((call) => call.type), ['create', 'mark']);
});

test('existing users are marked initialized without receiving an example project', async () => {
  const { initializeExampleProject } = await loadExampleProject();
  const { calls, dependencies } = createDependencies({
    hasProjectRegistry: async () => true
  });

  const result = await initializeExampleProject(dependencies);

  assert.equal(result, 'existing-data');
  assert.deepEqual(calls.map((call) => call.type), ['mark']);
});

test('initialized users do not recreate a deleted example project', async () => {
  const { initializeExampleProject } = await loadExampleProject();
  const { calls, dependencies } = createDependencies({
    isInitialized: async () => true
  });

  const result = await initializeExampleProject(dependencies);

  assert.equal(result, 'already-initialized');
  assert.deepEqual(calls, []);
});

test('failed example creation does not write the initialization marker', async () => {
  const { initializeExampleProject } = await loadExampleProject();
  const { calls, dependencies } = createDependencies({
    createProject: async () => {
      calls.push({ type: 'create' });
      throw new Error('disk unavailable');
    }
  });

  await assert.rejects(() => initializeExampleProject(dependencies), /disk unavailable/);
  assert.deepEqual(calls.map((call) => call.type), ['create']);
});
