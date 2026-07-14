/**
 * course-generator.cts — 两阶段课程生成管线
 *
 * Phase 1 / OpenMAIC: 将用户输入（文本主题/文档）转化为结构化课程大纲，
 * 再按大纲章节逐一生成对应场景内容（幻灯片/测验/模拟实验/PBL）。
 */

import { readFile } from 'node:fs/promises';
import {
  buildChatRequest,
  parseChatResponse,
  type ProviderId
} from './provider-api.cjs';

// ---- 类型定义（与前端 types.ts / global.d.ts 对齐） ----

export type CourseGenerationInput = {
  sourceType: 'text' | 'pdf' | 'chat';
  topic?: string;
  documentPath?: string;
  options?: {
    totalDuration?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    audience?: string;
    focus?: string;
  };
};

export type CourseMeta = {
  title: string;
  totalDuration: string;
  difficulty: string;
  audience: string;
  objectives: string[];
  createdAt: string;
};

export type SceneType = 'slide-lecture' | 'interactive-quiz' | 'sim-lab' | 'pbl-project';

export type Chapter = {
  id: string;
  title: string;
  duration: string;
  objectives: string[];
  sceneType: SceneType;
  knowledgePoints: string[];
  interactionNodes: number[];
};

export type CourseOutline = {
  meta: CourseMeta;
  chapters: Chapter[];
};

export type SlidePage = {
  index: number;
  title: string;
  bulletPoints: string[];
  imageDescription?: string;
  latexFormulas?: string[];
  voiceScript: string;
  spotlight?: { region: string; duration: number };
  laserPath?: { points: string[]; speed: number };
};

export type SlideLectureScene = {
  sceneType: 'slide-lecture';
  chapterId: string;
  slides: SlidePage[];
};

export type QuizItem = {
  id: string;
  type: 'single-choice' | 'multi-choice' | 'short-answer';
  knowledgePoint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  stem: string;
  options?: { key: string; text: string }[];
  answer: string;
  explanation: string;
  scoringRule?: { keywords?: string[]; dimensionWeights?: Record<string, number> };
};

export type QuizScene = {
  sceneType: 'interactive-quiz';
  chapterId: string;
  questions: QuizItem[];
  feedbackSystem: {
    wrongAnswerRemediation: string;
    knowledgeGapDetection: string;
    reviewPath: string;
  };
};

export type SimLabScene = {
  sceneType: 'sim-lab';
  chapterId: string;
  title: string;
  description: string;
  experimentType: 'physics' | 'algorithm' | 'flowchart' | 'custom';
  htmlCode: string;
  guide: {
    objective: string;
    instructions: string[];
    reflectionQuestions: string[];
    aiNarration: string;
  };
};

export type PBLRole = {
  id: string;
  name: string;
  responsibilities: string[];
  persona: string;
};

export type PBLMilestone = {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  deadline: string;
};

export type PBLScene = {
  sceneType: 'pbl-project';
  chapterId: string;
  title: string;
  background: string;
  finalDeliverables: string[];
  milestones: PBLMilestone[];
  roles: PBLRole[];
  collaborationFlow: {
    phases: { name: string; tasks: string[]; aiInteractions: string[] }[];
    checkpoints: string[];
  };
};

export type CourseScene = SlideLectureScene | QuizScene | SimLabScene | PBLScene;

export type GeneratedCourse = {
  outline: CourseOutline;
  scenes: CourseScene[];
  generatedAt: string;
};

// ---- LLM 调用上下文 ----

type LlmContext = {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

// ---- 工具函数 ----

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'chapter';
}

function extractJsonBlock(text: string): string {
  // 尝试匹配 ```json ... ``` 或直接 JSON
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced?.[1] ?? text).trim();
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(extractJsonBlock(text)) as T;
  } catch {
    return fallback;
  }
}

async function callLlm(context: LlmContext, systemPrompt: string, userPrompt: string): Promise<string> {
  const request = buildChatRequest({
    provider: context.provider,
    baseUrl: context.baseUrl,
    apiKey: context.apiKey,
    model: context.model,
    temperature: context.temperature,
    maxTokens: context.maxTokens,
    systemPrompt,
    userPrompt
  });

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body)
  });

  if (!response.ok) {
    throw new Error(`LLM 请求失败：${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
  };

  return parseChatResponse(context.provider, payload);
}

// ---- 第一阶段：课程大纲生成 ----

function buildOutlineSystemPrompt(): string {
  return `你是一个专业的课程设计师。你的任务是根据用户提供的主题或材料，生成结构化的课程大纲。

输出必须是严格的 JSON 格式，结构如下：
{
  "meta": {
    "title": "课程标题",
    "totalDuration": "总时长（如 30分钟）",
    "difficulty": "beginner | intermediate | advanced",
    "audience": "目标受众描述",
    "objectives": ["学习目标1", "学习目标2"]
  },
  "chapters": [
    {
      "id": "chapter-1",
      "title": "章节标题",
      "duration": "该章节时长（如 10分钟）",
      "objectives": ["本章学习目标"],
      "sceneType": "slide-lecture | interactive-quiz | sim-lab | pbl-project",
      "knowledgePoints": ["知识点1", "知识点2"],
      "interactionNodes": [5, 10]
    }
  ]
}

规则：
1. 按「引入→讲解→练习→总结」规律排序知识点
2. 每个章节指定一个 sceneType：
   - slide-lecture：适合概念讲解、理论介绍
   - interactive-quiz：适合需要即时检测理解的章节
   - sim-lab：适合有可视化需求的原理、算法、流程
   - pbl-project：适合综合应用、项目实战章节
3. interactionNodes 是预设互动节点位置（分钟），留空数组即可
4. 只输出 JSON，不要其他文字`;
}

function buildOutlineUserPrompt(input: CourseGenerationInput): string {
  const lines: string[] = [];

  if (input.sourceType === 'text' && input.topic) {
    lines.push(`主题：${input.topic}`);
  } else if (input.sourceType === 'pdf' && input.documentPath) {
    lines.push(`文档路径：${input.documentPath}`);
    lines.push('（文档内容将通过解析器提取后传入）');
  } else {
    lines.push(`主题：${input.topic || '未指定主题'}`);
  }

  if (input.options) {
    if (input.options.totalDuration) lines.push(`总时长要求：${input.options.totalDuration}`);
    if (input.options.difficulty) lines.push(`难度等级：${input.options.difficulty}`);
    if (input.options.audience) lines.push(`目标受众：${input.options.audience}`);
    if (input.options.focus) lines.push(`侧重方向：${input.options.focus}`);
  }

  return lines.join('\n');
}

/** 模板生成大纲（离线回退方案） */
function generateTemplateOutline(input: CourseGenerationInput): CourseOutline {
  const topic = input.topic || input.documentPath || '未命名课程';
  const now = new Date().toISOString();

  return {
    meta: {
      title: topic,
      totalDuration: input.options?.totalDuration || '30分钟',
      difficulty: input.options?.difficulty || 'beginner',
      audience: input.options?.audience || '大学生',
      objectives: [`掌握${topic}的核心概念`, `能够独立应用${topic}相关知识`, `理解${topic}的底层原理`],
      createdAt: now
    },
    chapters: [
      {
        id: `${slugify(topic)}-intro`,
        title: `认识${topic}`,
        duration: '8分钟',
        objectives: [`了解${topic}的基本概念与背景`],
        sceneType: 'slide-lecture',
        knowledgePoints: [`${topic}定义`, `${topic}应用场景`],
        interactionNodes: []
      },
      {
        id: `${slugify(topic)}-core`,
        title: `${topic}核心原理`,
        duration: '12分钟',
        objectives: [`深入理解${topic}的核心机制`],
        sceneType: 'interactive-quiz',
        knowledgePoints: [`核心概念拆解`, `关键公式/定理`],
        interactionNodes: [5, 10]
      },
      {
        id: `${slugify(topic)}-practice`,
        title: `${topic}实战练习`,
        duration: '10分钟',
        objectives: [`通过练习巩固${topic}知识`],
        sceneType: 'interactive-quiz',
        knowledgePoints: ['常见题型', '解题套路'],
        interactionNodes: [3, 7]
      }
    ]
  };
}

export async function generateCourseOutline(
  input: CourseGenerationInput,
  llm?: LlmContext | null
): Promise<CourseOutline> {
  // 如果提供了 LLM 上下文，尝试 AI 生成
  if (llm?.apiKey && llm?.baseUrl) {
    try {
      const systemPrompt = buildOutlineSystemPrompt();
      const userPrompt = buildOutlineUserPrompt(input);
      const response = await callLlm(llm, systemPrompt, userPrompt);

      const parsed = safeJsonParse<CourseOutline>(response, generateTemplateOutline(input));
      // 补充时间戳
      parsed.meta.createdAt = new Date().toISOString();
      return parsed;
    } catch {
      // LLM 调用失败，回退到模板
    }
  }

  return generateTemplateOutline(input);
}

// ---- 第二阶段：场景内容生成 ----

/** 生成幻灯片授课场景 */
function buildSlideLecturePrompt(chapter: Chapter, courseTitle: string): string {
  return `你是一个专业的课件设计师。请为以下章节生成幻灯片授课内容：

课程：${courseTitle}
章节：${chapter.title}
时长：${chapter.duration}
知识点：${chapter.knowledgePoints.join('、')}

输出 JSON 格式：
{
  "sceneType": "slide-lecture",
  "chapterId": "${chapter.id}",
  "slides": [
    {
      "index": 0,
      "title": "幻灯片标题",
      "bulletPoints": ["要点1", "要点2"],
      "imageDescription": "配图描述（可选）",
      "latexFormulas": ["E=mc^2"],
      "voiceScript": "口语化讲解台词",
      "spotlight": { "region": "重点区域描述", "duration": 10 },
      "laserPath": { "points": ["指示点1", "指示点2"], "speed": 2 }
    }
  ]
}

规则：
1. 生成 3-5 张幻灯片，覆盖所有知识点
2. voiceScript 用口语化中文，标注停顿、重音
3. spotlight 和 laserPath 为可选字段
4. 只输出 JSON`;
}

function generateTemplateSlideLecture(chapter: Chapter, courseTitle: string): SlideLectureScene {
  return {
    sceneType: 'slide-lecture',
    chapterId: chapter.id,
    slides: chapter.knowledgePoints.map((kp, i) => ({
      index: i,
      title: kp,
      bulletPoints: [
        `${kp}的定义与核心概念`,
        `${kp}的关键要点`,
        `${kp}的常见误区与注意事项`
      ],
      voiceScript: `大家好，现在我们来讲${kp}。首先来看${kp}的基本定义... 这里有几个关键点需要特别注意... 好的，${kp}就讲到这里。`,
      spotlight: i === 0 ? { region: kp, duration: 8 } : undefined
    }))
  };
}

async function generateSlideLecture(
  chapter: Chapter,
  courseTitle: string,
  llm?: LlmContext | null
): Promise<SlideLectureScene> {
  if (llm?.apiKey) {
    try {
      const prompt = buildSlideLecturePrompt(chapter, courseTitle);
      const response = await callLlm(llm, '你是课程内容生成专家。', prompt);
      const parsed = safeJsonParse<SlideLectureScene>(response, generateTemplateSlideLecture(chapter, courseTitle));
      parsed.sceneType = 'slide-lecture';
      parsed.chapterId = chapter.id;
      return parsed;
    } catch { /* fallback */ }
  }
  return generateTemplateSlideLecture(chapter, courseTitle);
}

/** 生成互动测验场景 */
function buildQuizPrompt(chapter: Chapter, courseTitle: string): string {
  return `为以下章节生成互动测验：

课程：${courseTitle}
章节：${chapter.title}
知识点：${chapter.knowledgePoints.join('、')}

输出 JSON：
{
  "sceneType": "interactive-quiz",
  "chapterId": "${chapter.id}",
  "questions": [
    {
      "id": "q1",
      "type": "single-choice",
      "knowledgePoint": "对应知识点",
      "difficulty": "easy",
      "stem": "题目题干",
      "options": [{"key":"A","text":"选项"},{"key":"B","text":"选项"}],
      "answer": "A",
      "explanation": "解析说明"
    }
  ],
  "feedbackSystem": {
    "wrongAnswerRemediation": "错题补救策略",
    "knowledgeGapDetection": "知识盲点识别策略",
    "reviewPath": "复习路径推荐"
  }
}

规则：
1. 生成 3-5 道题，覆盖单选、多选、简答
2. 每题关联具体知识点
3. 只输出 JSON`;
}

function generateTemplateQuiz(chapter: Chapter): QuizScene {
  return {
    sceneType: 'interactive-quiz',
    chapterId: chapter.id,
    questions: chapter.knowledgePoints.map((kp, i) => ({
      id: `q-${chapter.id}-${i}`,
      type: i % 3 === 0 ? 'single-choice' as const : i % 3 === 1 ? 'multi-choice' as const : 'short-answer' as const,
      knowledgePoint: kp,
      difficulty: i === 0 ? 'easy' as const : 'medium' as const,
      stem: `关于"${kp}"，以下说法正确的是？`,
      options: i < 2 ? [
        { key: 'A', text: `选项A：与${kp}直接相关` },
        { key: 'B', text: `选项B：与${kp}间接相关` },
        { key: 'C', text: `选项C：与${kp}无关` },
        { key: 'D', text: `选项D：以上都对` }
      ] : undefined,
      answer: i < 2 ? 'A' : '请结合所学知识作答',
      explanation: `${kp}是本章的核心概念，需要重点掌握。`
    })),
    feedbackSystem: {
      wrongAnswerRemediation: '分析错题对应的知识点，重新学习相关章节内容。',
      knowledgeGapDetection: '通过错题分布识别薄弱知识点，重点关注高频错题领域。',
      reviewPath: '建议按错题→知识点回顾→同类题重测的路径复习。'
    }
  };
}

async function generateQuiz(
  chapter: Chapter,
  courseTitle: string,
  llm?: LlmContext | null
): Promise<QuizScene> {
  if (llm?.apiKey) {
    try {
      const prompt = buildQuizPrompt(chapter, courseTitle);
      const response = await callLlm(llm, '你是课程内容生成专家。', prompt);
      const parsed = safeJsonParse<QuizScene>(response, generateTemplateQuiz(chapter));
      parsed.sceneType = 'interactive-quiz';
      parsed.chapterId = chapter.id;
      return parsed;
    } catch { /* fallback */ }
  }
  return generateTemplateQuiz(chapter);
}

/** 生成 HTML 模拟实验 */
function generateTemplateSimLab(chapter: Chapter): SimLabScene {
  const kp = chapter.knowledgePoints[0] || chapter.title;
  return {
    sceneType: 'sim-lab',
    chapterId: chapter.id,
    title: `${chapter.title} - 交互式演示`,
    description: `通过可视化方式理解${kp}的原理和应用。`,
    experimentType: 'flowchart',
    htmlCode: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
  .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  h1 { color: #333; }
  .step { padding: 12px; margin: 8px 0; background: #e8f5e9; border-radius: 8px; cursor: pointer; }
  .step:hover { background: #c8e6c9; }
  .detail { display: none; padding: 8px; color: #555; }
  .detail.show { display: block; }
</style>
</head>
<body>
<div class="container">
  <h1>${chapter.title}</h1>
  <p>点击下方步骤查看详细内容：</p>
  ${chapter.knowledgePoints.map((p, i) => `
  <div class="step" onclick="document.getElementById('d${i}').classList.toggle('show')">
    <strong>步骤 ${i + 1}：${p}</strong>
    <div id="d${i}" class="detail">这是关于「${p}」的详细展开说明。</div>
  </div>`).join('\n')}
</div>
</body>
</html>`,
    guide: {
      objective: `通过交互式演示理解${kp}`,
      instructions: ['点击每个步骤查看详细说明', '跟随引导完成所有步骤', '回答思考题检验理解'],
      reflectionQuestions: [`${kp}的核心原理是什么？`, `如何将${kp}应用到实际问题中？`],
      aiNarration: `现在我们来通过交互式演示理解${kp}。请跟随步骤操作，每个步骤都可以点击展开查看详细内容。`
    }
  };
}

async function generateSimLab(
  chapter: Chapter,
  courseTitle: string,
  llm?: LlmContext | null
): Promise<SimLabScene> {
  if (llm?.apiKey) {
    try {
      const prompt = `为课程"${courseTitle}"的章节"${chapter.title}"生成一个单文件 HTML 交互模拟实验。
知识点：${chapter.knowledgePoints.join('、')}

输出 JSON：
{
  "title": "实验标题",
  "description": "实验描述",
  "experimentType": "flowchart",
  "htmlCode": "完整的单文件HTML代码",
  "guide": {
    "objective": "实验目的",
    "instructions": ["操作指引"],
    "reflectionQuestions": ["思考题"],
    "aiNarration": "AI讲解旁白"
  }
}
只输出 JSON，htmlCode 中不要包含 markdown 代码块标记。`;
      const response = await callLlm(llm, '你是交互实验设计专家。', prompt);
      const parsed = safeJsonParse<Partial<SimLabScene>>(response, {});
      return {
        sceneType: 'sim-lab',
        chapterId: chapter.id,
        title: parsed.title || chapter.title,
        description: parsed.description || '',
        experimentType: parsed.experimentType || 'flowchart',
        htmlCode: parsed.htmlCode || generateTemplateSimLab(chapter).htmlCode,
        guide: parsed.guide || generateTemplateSimLab(chapter).guide
      };
    } catch { /* fallback */ }
  }
  return generateTemplateSimLab(chapter);
}

/** 生成 PBL 项目场景 */
function generateTemplatePBL(chapter: Chapter): PBLScene {
  return {
    sceneType: 'pbl-project',
    chapterId: chapter.id,
    title: `${chapter.title} - 项目实战`,
    background: `在实际场景中综合应用${chapter.knowledgePoints.join('、')}等知识。`,
    finalDeliverables: ['项目报告', '演示文稿', '代码/作品'],
    milestones: [
      {
        id: 'm1',
        title: '项目启动与规划',
        description: '明确项目目标，分配角色，制定计划',
        deliverables: ['项目计划书', '角色分工表'],
        acceptanceCriteria: ['目标明确', '计划可行'],
        deadline: '第1天'
      },
      {
        id: 'm2',
        title: '核心开发/研究',
        description: '按分工推进核心工作',
        deliverables: ['阶段性成果', '进度报告'],
        acceptanceCriteria: ['完成核心功能', '通过初步测试'],
        deadline: '第3天'
      },
      {
        id: 'm3',
        title: '成果展示与评审',
        description: '汇总成果，准备展示',
        deliverables: ['最终交付物', '演示材料'],
        acceptanceCriteria: ['满足需求', '展示清晰'],
        deadline: '第5天'
      }
    ],
    roles: [
      { id: 'r1', name: '项目组长', responsibilities: ['统筹协调', '进度管理', '最终汇报'], persona: '有组织能力，善于沟通' },
      { id: 'r2', name: '技术专家', responsibilities: ['技术方案设计', '核心实现'], persona: '技术扎实，喜欢钻研' },
      { id: 'r3', name: '研究员', responsibilities: ['资料收集', '数据分析', '文档撰写'], persona: '细心严谨，善于总结' }
    ],
    collaborationFlow: {
      phases: [
        { name: '启动阶段', tasks: ['明确目标', '角色分配'], aiInteractions: ['AI教师发布项目背景', 'AI同学提出初步想法'] },
        { name: '执行阶段', tasks: ['分头推进', '中期检查'], aiInteractions: ['AI助教检查进度', 'AI同学协作讨论'] },
        { name: '收尾阶段', tasks: ['成果汇总', '展示评审'], aiInteractions: ['AI教师评审成果', 'AI同学提供反馈'] }
      ],
      checkpoints: ['项目启动确认', '中期进度检查', '最终成果验收']
    }
  };
}

async function generatePBL(
  chapter: Chapter,
  courseTitle: string,
  llm?: LlmContext | null
): Promise<PBLScene> {
  if (llm?.apiKey) {
    try {
      const prompt = `为课程"${courseTitle}"的章节"${chapter.title}"设计一个 PBL 项目制学习方案。
知识点：${chapter.knowledgePoints.join('、')}

输出 JSON 包含 title, background, finalDeliverables, milestones(3个), roles(3个), collaborationFlow。只输出 JSON。`;
      const response = await callLlm(llm, '你是 PBL 教学设计专家。', prompt);
      const parsed = safeJsonParse<Partial<PBLScene>>(response, {});
      const template = generateTemplatePBL(chapter);
      return {
        sceneType: 'pbl-project',
        chapterId: chapter.id,
        title: parsed.title || template.title,
        background: parsed.background || template.background,
        finalDeliverables: parsed.finalDeliverables || template.finalDeliverables,
        milestones: parsed.milestones || template.milestones,
        roles: parsed.roles || template.roles,
        collaborationFlow: parsed.collaborationFlow || template.collaborationFlow
      };
    } catch { /* fallback */ }
  }
  return generateTemplatePBL(chapter);
}

// ---- 对外接口 ----

/** 为单个章节生成场景内容 */
export async function generateChapterScene(
  chapter: Chapter,
  courseTitle: string,
  llm?: LlmContext | null
): Promise<CourseScene> {
  switch (chapter.sceneType) {
    case 'slide-lecture':
      return generateSlideLecture(chapter, courseTitle, llm);
    case 'interactive-quiz':
      return generateQuiz(chapter, courseTitle, llm);
    case 'sim-lab':
      return generateSimLab(chapter, courseTitle, llm);
    case 'pbl-project':
      return generatePBL(chapter, courseTitle, llm);
    default:
      return generateSlideLecture(chapter, courseTitle, llm);
  }
}

/** 为所有章节生成场景内容 */
export async function generateAllScenes(
  outline: CourseOutline,
  llm?: LlmContext | null
): Promise<CourseScene[]> {
  const scenes: CourseScene[] = [];
  for (const chapter of outline.chapters) {
    const scene = await generateChapterScene(chapter, outline.meta.title, llm);
    scenes.push(scene);
  }
  return scenes;
}
