const examTabs = [
  { id: 'overview', label: '概览', description: '查看当前复习项目状态和快捷入口' },
  { id: 'profile', label: '画像', description: '维护学习画像、薄弱点和复习偏好' },
  { id: 'materials', label: '资料', description: '上传资料并沉淀知识库' },
  { id: 'agents', label: '智能体', description: '查看项目智能体协作链路' },
  { id: 'resources', label: '资源', description: '生成个性化讲义、例题和补弱材料' },
  { id: 'path', label: '路径', description: '规划阶段学习路径' },
  { id: 'practice', label: '刷题', description: '练习、收藏和错题复盘' },
  { id: 'import', label: '导题', description: '从文本、文件和图片识别题目' },
  { id: 'report', label: '报告', description: '生成阶段报告' },
  { id: 'delivery', label: '交付', description: '导出最终交付包' },
  { id: 'config', label: '配置', description: '查看项目配置' },
  { id: 'progress', label: '进度', description: '维护学习进度' }
];

export const projectModeTemplates = [
  {
    mode: 'exam-review',
    title: '期末复习',
    description: '围绕资料、题库、错题、学习路径和阶段报告完成复习闭环。',
    icon: '复',
    recommendedFor: ['期末考试', '课程复习', '错题整理'],
    wizardFields: [
      { key: 'name', label: '项目名称', type: 'text', required: false, placeholder: '例如：数据结构期末复习' },
      { key: 'courseName', label: '课程名称', type: 'text', required: false, placeholder: '例如：数据结构' },
      { key: 'examType', label: '考试类型', type: 'select', required: true, options: ['期末闭卷', '期末开卷', '课程论文', '面试考核'] },
      { key: 'textbook', label: '教材 / 范围', type: 'textarea', required: false },
      { key: 'requirements', label: '复习要求', type: 'textarea', required: false }
    ],
    tabs: examTabs,
    agents: [
      { id: 'ProfileAgent', label: '画像智能体', description: '分析学习画像、薄弱点和偏好' },
      { id: 'ResourceAgent', label: '资源智能体', description: '生成个性化复习资源' },
      { id: 'ReportAgent', label: '报告智能体', description: '生成阶段复盘报告' }
    ],
    deliverables: [
      { id: 'question-bank', label: '题库包', checklist: ['题干完整', '答案完整', '解析完整'] },
      { id: 'wrong-answers', label: '错题包', checklist: ['错因明确', '知识点准确', '复盘建议可执行'] },
      { id: 'review-delivery', label: '复习交付包', checklist: ['资料齐备', '路径齐备', '报告齐备'] }
    ],
    supportedUploads: ['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg']
  },
  {
    mode: 'paper-assistant',
    title: '论文助手',
    description: '从选题、文献、大纲、章节写作到答辩准备的论文工作台。',
    icon: '论',
    recommendedFor: ['毕业论文', '课程论文', '开题报告'],
    wizardFields: [
      { key: 'name', label: '论文题目', type: 'text', required: false },
      { key: 'courseName', label: '学科方向', type: 'text', required: false },
      { key: 'paperType', label: '论文类型', type: 'select', required: true, options: ['开题报告', '课程论文', '本科论文', '硕士论文', '期刊论文'] },
      { key: 'researchObject', label: '研究对象', type: 'textarea', required: false },
      { key: 'formatRequirements', label: '格式要求', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'paper-overview', label: '概览', description: '论文项目状态和下一步建议' },
      { id: 'paper-literature', label: '文献', description: '整理文献线索、综述结构和引用要点' },
      { id: 'paper-outline', label: '大纲', description: '生成和调整论文大纲' },
      { id: 'paper-chapters', label: '章节', description: '分章节生成写作草稿' },
      { id: 'paper-methods', label: '方法', description: '设计研究方法和技术路线' },
      { id: 'paper-innovation', label: '创新点', description: '提炼创新点和对比矩阵' },
      { id: 'paper-format', label: '格式', description: '检查格式和写作规范' },
      { id: 'paper-defense', label: '答辩', description: '生成答辩问题和回答建议' },
      { id: 'delivery', label: '交付', description: '导出论文成果包' }
    ],
    agents: [
      { id: 'PaperAgent', label: '论文智能体', description: '生成论文结构化成果' },
      { id: 'LiteratureAgent', label: '文献智能体', description: '梳理研究脉络和综述框架' }
    ],
    deliverables: [
      { id: 'outline', label: '论文大纲', checklist: ['章节完整', '逻辑清晰', '问题链明确'] },
      { id: 'innovation', label: '创新点矩阵', checklist: ['对比对象明确', '创新表述克制', '证据路径清楚'] },
      { id: 'defense', label: '答辩 Q&A', checklist: ['覆盖背景', '覆盖方法', '覆盖不足与展望'] }
    ],
    supportedUploads: ['pdf', 'docx', 'txt', 'md', 'ris', 'bib']
  },
  {
    mode: 'research-analysis',
    title: '科研数据分析',
    description: '上传数据，生成分析计划、统计摘要、图表说明和研究报告。',
    icon: '研',
    recommendedFor: ['问卷数据', '实验数据', '论文结果分析'],
    wizardFields: [
      { key: 'name', label: '研究主题', type: 'text', required: false },
      { key: 'courseName', label: '学科方向', type: 'text', required: false },
      { key: 'datasetDescription', label: '数据说明', type: 'textarea', required: false },
      { key: 'analysisGoal', label: '分析目标', type: 'textarea', required: false },
      { key: 'expectedOutput', label: '期望产出', type: 'select', required: true, options: ['统计摘要', '图表', '研究报告', '全部'] }
    ],
    tabs: [
      { id: 'research-overview', label: '概览', description: '科研分析项目状态' },
      { id: 'research-dataset', label: '数据集', description: '查看数据说明和字段' },
      { id: 'research-plan', label: '分析计划', description: '生成分析路径和方法选择' },
      { id: 'research-statistics', label: '统计', description: '生成描述统计和统计检验摘要' },
      { id: 'research-charts', label: '图表', description: '规划图表和可视化说明' },
      { id: 'research-findings', label: '发现', description: '解释分析结果和研究发现' },
      { id: 'research-report', label: '报告', description: '生成科研分析报告' },
      { id: 'delivery', label: '交付', description: '导出科研成果包' }
    ],
    agents: [
      { id: 'ResearchAnalysisAgent', label: '科研分析智能体', description: '生成数据分析成果' },
      { id: 'ChartAgent', label: '图表智能体', description: '规划图表与结果表达' }
    ],
    deliverables: [
      { id: 'data-dictionary', label: '数据字典', checklist: ['字段解释清晰', '变量类型明确', '缺失值说明完整'] },
      { id: 'analysis-plan', label: '分析计划', checklist: ['方法匹配目标', '限制说明明确', '检验假设清楚'] },
      { id: 'research-report', label: '研究报告', checklist: ['结论有依据', '图表解释清晰', '局限与后续工作明确'] }
    ],
    supportedUploads: ['csv', 'xlsx', 'xls', 'txt', 'json', 'sav']
  },
  {
    mode: 'teaching-design',
    title: '教学设计 / 教案生成',
    description: '生成教学目标、重难点、课堂活动、评价方案、教案和课件大纲。',
    icon: '教',
    recommendedFor: ['教师备课', '说课稿', '教学比赛'],
    wizardFields: [
      { key: 'name', label: '教学主题', type: 'text', required: false },
      { key: 'courseName', label: '课程名称', type: 'text', required: false },
      { key: 'learnerStage', label: '学段 / 对象', type: 'text', required: false },
      { key: 'lessonDuration', label: '课时', type: 'text', required: false },
      { key: 'teachingGoals', label: '教学目标', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'teaching-overview', label: '概览', description: '教学项目状态' },
      { id: 'teaching-objectives', label: '目标', description: '生成教学目标' },
      { id: 'teaching-key-points', label: '重难点', description: '拆解重点和难点' },
      { id: 'teaching-activities', label: '活动', description: '设计课堂活动和互动流程' },
      { id: 'teaching-assessment', label: '评价', description: '设计评价、作业和量规' },
      { id: 'teaching-lesson-plan', label: '教案', description: '生成标准教案' },
      { id: 'teaching-courseware', label: '课件', description: '生成课件大纲和互动页建议' },
      { id: 'delivery', label: '交付', description: '导出教学成果包' }
    ],
    agents: [
      { id: 'TeachingDesignAgent', label: '教学设计智能体', description: '生成教学设计成果' },
      { id: 'CoursewareAgent', label: '课件智能体', description: '生成课件结构与互动建议' }
    ],
    deliverables: [
      { id: 'objectives', label: '教学目标', checklist: ['目标清晰', '可评价', '适配学情'] },
      { id: 'lesson-plan', label: '教案', checklist: ['流程完整', '活动可执行', '时间分配合理'] },
      { id: 'courseware', label: '课件大纲', checklist: ['层次清晰', '互动明确', '板书与素材建议完整'] }
    ],
    supportedUploads: ['pdf', 'docx', 'pptx', 'txt', 'md', 'png', 'jpg', 'jpeg']
  },
  {
    mode: 'assignment-quiz',
    title: '作业出题批改 / 在线测验',
    description: '生成作业、组卷、评分规则、批改建议、在线测验结构和错题反馈。',
    icon: '测',
    recommendedFor: ['作业设计', '随堂测验', '错题反馈'],
    wizardFields: [
      { key: 'name', label: '测验 / 作业名称', type: 'text', required: false },
      { key: 'courseName', label: '学科', type: 'text', required: false },
      { key: 'knowledgePoints', label: '知识点', type: 'textarea', required: false },
      { key: 'difficulty', label: '难度', type: 'select', required: true, options: ['基础', '中等', '提高', '混合'] },
      { key: 'questionTypes', label: '题型要求', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'assignment-overview', label: '概览', description: '作业测验项目状态' },
      { id: 'assignment-bank', label: '题库', description: '维护题库和题型分布' },
      { id: 'assignment-paper', label: '组卷', description: '生成作业或试卷' },
      { id: 'assignment-online-quiz', label: '测验', description: '生成在线测验结构' },
      { id: 'assignment-grading', label: '批改', description: '生成评分规则和批改建议' },
      { id: 'assignment-wrong-answers', label: '错题', description: '整理错题和错因' },
      { id: 'assignment-feedback', label: '反馈', description: '生成学习反馈' },
      { id: 'delivery', label: '交付', description: '导出作业测验包' }
    ],
    agents: [
      { id: 'AssignmentQuizAgent', label: '作业测验智能体', description: '生成作业和测验成果' },
      { id: 'GradingAgent', label: '批改智能体', description: '生成评分规则和反馈建议' }
    ],
    deliverables: [
      { id: 'assignment-sheet', label: '作业单', checklist: ['题型符合要求', '难度合理', '答案解析齐备'] },
      { id: 'rubric', label: '评分规则', checklist: ['分值明确', '扣分点明确', '示例答案清楚'] },
      { id: 'quiz-structure', label: '在线测验结构', checklist: ['题目可导入', '反馈可复用', '错题标签清楚'] }
    ],
    supportedUploads: ['pdf', 'docx', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg']
  }
];

export const projectModeOptions = projectModeTemplates.map(({ mode, title, description, icon, recommendedFor }) => ({
  mode,
  title,
  description,
  icon,
  recommendedFor
}));

export function getProjectModeTemplate(mode) {
  return projectModeTemplates.find((template) => template.mode === mode) ?? projectModeTemplates[0];
}

export function getWorkspaceTabsForMode(mode) {
  return getProjectModeTemplate(mode).tabs;
}

export function isModeTab(tabId) {
  return !examTabs.some((tab) => tab.id === tabId) || tabId === 'delivery';
}

export function isKnownProjectMode(mode) {
  return projectModeTemplates.some((template) => template.mode === mode);
}
