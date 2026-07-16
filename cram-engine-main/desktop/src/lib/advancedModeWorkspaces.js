const SUPPORTED_MODELS = new Set(['linear', 'decay', 'saturation']);
const PARAMETER_SWEEP_FORM_FIELDS = [
  ['start', '起始值'],
  ['end', '结束值'],
  ['steps', '步数'],
  ['coefficient', '系数'],
  ['initialValue', '初始值']
];

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label}必须是有限数字`);
  }
}

export function parseParameterSweepForm(form) {
  const model = String(form?.model ?? '').trim();
  const input = { model };

  for (const [field, label] of PARAMETER_SWEEP_FORM_FIELDS) {
    const rawValue = String(form?.[field] ?? '').trim();
    if (!rawValue) {
      throw new Error(`${field}（${label}）不能为空`);
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      throw new Error(`${field}（${label}）必须是有限数字`);
    }
    input[field] = value;
  }

  return input;
}

export function runParameterSweep({ model, start, end, steps, coefficient, initialValue }) {
  if (!SUPPORTED_MODELS.has(model)) {
    throw new Error('模型类型不受支持');
  }

  assertFiniteNumber(start, '起始值');
  assertFiniteNumber(end, '结束值');
  assertFiniteNumber(steps, '步数');
  assertFiniteNumber(coefficient, '系数');
  assertFiniteNumber(initialValue, '初始值');

  if (!Number.isInteger(steps)) {
    throw new Error('步数必须是整数');
  }
  if (steps < 2 || steps > 50) {
    throw new Error('步数必须在 2 到 50 之间');
  }
  if (start > end) {
    throw new Error('起始值不能大于结束值');
  }
  if (model !== 'linear' && coefficient < 0) {
    throw new Error('衰减和饱和模型的系数不能为负数');
  }

  const interval = (end - start) / (steps - 1);
  const points = Array.from({ length: steps }, (_, index) => {
    const x = index === steps - 1 ? end : start + interval * index;
    const delta = x - start;
    let y;

    if (model === 'linear') {
      y = initialValue + coefficient * x;
    } else if (model === 'decay') {
      y = initialValue * Math.exp(-coefficient * delta);
    } else {
      y = initialValue * -Math.expm1(-coefficient * delta);
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('参数组合产生了非有限结果，请缩小参数范围');
    }
    return { x, y };
  });

  return { points };
}

function sourceId(prefix, item, index, allocatedIds) {
  const rawId = String(item?.id ?? '').trim();
  const base = rawId
    ? `${prefix}:${encodeURIComponent(rawId)}`
    : `${prefix}:index-${index + 1}`;
  let id = base;

  if (allocatedIds.has(id)) {
    id = `${base}:index-${index + 1}`;
  }
  allocatedIds.add(id);
  return id;
}

function createGraphBuilder() {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeIds = new Set();

  return {
    nodes,
    edges,
    addNode(node) {
      if (!nodeIds.has(node.id)) {
        nodeIds.add(node.id);
        nodes.push(node);
      }
    },
    addEdge(source, target, type) {
      const tuple = JSON.stringify([source, target, type]);
      if (source !== target && !edgeIds.has(tuple)) {
        edgeIds.add(tuple);
        const id = `edge:${encodeURIComponent(tuple)}`;
        edges.push({ id, source, target, type });
      }
    }
  };
}

function cleanText(value) {
  return String(value ?? '').trim();
}

export function buildKnowledgeGraph(input = {}) {
  const knowledgeBase = Array.isArray(input?.knowledgeBase) ? input.knowledgeBase : [];
  const questions = Array.isArray(input?.questions) ? input.questions : [];
  const artifacts = Array.isArray(input?.artifacts) ? input.artifacts : [];
  const graph = createGraphBuilder();
  const knowledgeTargets = new Map();
  const allocatedSourceIds = new Set();

  knowledgeBase.forEach((entry, index) => {
    const id = sourceId('knowledge', entry, index, allocatedSourceIds);
    const title = cleanText(entry?.title) || `知识条目 ${index + 1}`;
    graph.addNode({
      id,
      type: 'knowledge',
      label: title,
      description: cleanText(entry?.summary),
      sourceId: cleanText(entry?.id) || undefined
    });
    knowledgeTargets.set(title, id);

    const tags = Array.isArray(entry?.tags) ? entry.tags : [];
    tags.forEach((rawTag) => {
      const tag = cleanText(rawTag);
      if (!tag) return;
      const tagId = `tag:${tag}`;
      graph.addNode({ id: tagId, type: 'tag', label: tag, description: '' });
      graph.addEdge(id, tagId, 'tag');
      if (!knowledgeTargets.has(tag)) knowledgeTargets.set(tag, tagId);
    });
  });

  questions.forEach((question, index) => {
    const id = sourceId('question', question, index, allocatedSourceIds);
    graph.addNode({
      id,
      type: 'question',
      label: cleanText(question?.stem) || `题目 ${index + 1}`,
      description: cleanText(question?.explanation),
      sourceId: cleanText(question?.id) || undefined
    });

    const knowledgePoint = cleanText(question?.knowledgePoint);
    if (!knowledgePoint) return;

    let target = knowledgeTargets.get(knowledgePoint);
    if (!target) {
      target = `knowledge-point:${knowledgePoint}`;
      graph.addNode({
        id: target,
        type: 'knowledge-point',
        label: knowledgePoint,
        description: ''
      });
      knowledgeTargets.set(knowledgePoint, target);
    }
    graph.addEdge(id, target, 'knowledge-point');
  });

  artifacts.forEach((artifact, index) => {
    graph.addNode({
      id: sourceId('artifact', artifact, index, allocatedSourceIds),
      type: 'artifact',
      label: cleanText(artifact?.title) || `成果 ${index + 1}`,
      description: cleanText(artifact?.contentMarkdown),
      sourceId: cleanText(artifact?.id) || undefined
    });
  });

  return { nodes: graph.nodes, edges: graph.edges };
}

export function layoutKnowledgeGraph(graph, width, height) {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges.map((edge) => ({ ...edge })) : [];
  const centerX = safeWidth / 2;
  const centerY = safeHeight / 2;
  const maximumRadius = Math.max(0, Math.min(safeWidth, safeHeight) / 2 - 24);

  const positionedNodes = nodes.map((node, index) => {
    if (index === 0) {
      return { ...node, x: centerX, y: centerY };
    }

    const ring = Math.floor((index - 1) / 8) + 1;
    const firstIndex = (ring - 1) * 8 + 1;
    const count = Math.min(8, nodes.length - firstIndex);
    const offset = index - firstIndex;
    const ringCount = Math.ceil(Math.max(0, nodes.length - 1) / 8);
    const radius = maximumRadius * ring / Math.max(1, ringCount);
    const angle = -Math.PI / 2 + (Math.PI * 2 * offset) / Math.max(1, count);

    return {
      ...node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });

  return { nodes: positionedNodes, edges };
}

export function parseCoursewareSlides(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n');
  const drafts = [];
  let title = '';
  let content = [];
  let hasHeading = false;
  let activeFence = null;

  const flush = (force = false) => {
    const body = content.join('\n').trim();
    if (force || hasHeading || body) {
      drafts.push({ title: title.trim(), content: body });
    }
    title = '';
    content = [];
    hasHeading = false;
  };

  lines.forEach((line) => {
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (activeFence) {
      content.push(line);
      if (
        fence
        && fence[1][0] === activeFence.marker
        && fence[1].length >= activeFence.length
        && !fence[2].trim()
      ) {
        activeFence = null;
      }
      return;
    }
    if (fence) {
      activeFence = { marker: fence[1][0], length: fence[1].length };
      content.push(line);
      return;
    }

    const heading = line.match(/^\s{0,3}#{1,2}[ \t]+(.+?)[ \t]*$/);
    if (heading) {
      flush();
      title = heading[1].replace(/[ \t]+#+[ \t]*$/, '').trim();
      hasHeading = true;
      return;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flush();
      return;
    }

    content.push(line);
  });

  flush(drafts.length === 0);

  return drafts.map((draft, index) => ({
    id: `slide-${index + 1}`,
    title: draft.title || `第 ${index + 1} 页`,
    content: draft.content
  }));
}

export function getPlayableQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions.flatMap((question) => {
    if (!question || typeof question !== 'object') return [];

    const answer = cleanText(question.answer).toUpperCase();
    const options = Array.isArray(question.options)
      ? question.options
        .map((option) => ({
          key: cleanText(option?.key).toUpperCase(),
          text: cleanText(option?.text)
        }))
        .filter((option) => option.key && option.text)
      : [];

    if (options.length < 2 || !options.some((option) => option.key === answer)) {
      return [];
    }

    return [{ ...question, answer, options }];
  });
}
