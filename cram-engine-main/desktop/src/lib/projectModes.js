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
  },
  {
    mode: 'research-innovation',
    title: '科研创新工作台',
    description: '围绕研究前沿、问题缺口、创新假设和证据路线形成可复核的创新方案。',
    icon: '创',
    recommendedFor: ['科研选题', '创新点论证', '项目申报'],
    wizardFields: [
      { key: 'name', label: '研究主题', type: 'text', required: false },
      { key: 'courseName', label: '学科方向', type: 'text', required: false },
      { key: 'researchGap', label: '待解决的问题', type: 'textarea', required: false },
      { key: 'innovationType', label: '创新类型', type: 'select', required: true, options: ['理论创新', '方法创新', '应用创新', '综合创新'] },
      { key: 'evidenceRequirements', label: '证据要求', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'innovation-overview', label: '概览', description: '查看创新研究项目状态' },
      { id: 'innovation-landscape', label: '前沿', description: '梳理研究前沿和竞品格局' },
      { id: 'innovation-problems', label: '问题', description: '提炼研究缺口和关键问题' },
      { id: 'innovation-methods', label: '方法', description: '设计创新方法和验证路线' },
      { id: 'innovation-evidence', label: '证据', description: '建立证据矩阵和反证清单' },
      { id: 'innovation-roadmap', label: '路线图', description: '规划阶段任务和成果节点' },
      { id: 'delivery', label: '交付', description: '导出创新研究成果包' }
    ],
    agents: [
      { id: 'ResearchInnovationAgent', label: '科研创新智能体', description: '协助发现问题缺口并形成可验证的创新路线' }
    ],
    deliverables: [
      { id: 'innovation-landscape', label: '前沿图谱', checklist: ['范围明确', '代表工作齐备', '差异清晰'] },
      { id: 'innovation-matrix', label: '创新矩阵', checklist: ['创新表述克制', '证据可追溯', '风险已标注'] },
      { id: 'innovation-roadmap', label: '验证路线图', checklist: ['步骤可执行', '节点可检查', '备选方案完整'] }
    ],
    supportedUploads: ['pdf', 'docx', 'txt', 'md', 'ris', 'bib', 'csv', 'xlsx']
  },
  {
    mode: 'lab-simulation',
    title: '实验与仿真',
    description: '配置实验模型和参数，运行可重复的模拟并整理结果与实验报告。',
    icon: '验',
    recommendedFor: ['参数扫描', '实验预演', '模型比较'],
    wizardFields: [
      { key: 'name', label: '实验名称', type: 'text', required: false },
      { key: 'courseName', label: '学科 / 实验方向', type: 'text', required: false },
      { key: 'simulationModel', label: '模拟模型', type: 'select', required: true, options: ['线性', '衰减', '饱和'] },
      { key: 'parameterRange', label: '参数范围', type: 'textarea', required: false },
      { key: 'successCriteria', label: '判定标准', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'simulation-overview', label: '概览', description: '查看实验目标和当前状态' },
      { id: 'simulation-model', label: '模型', description: '定义模型、变量和假设' },
      { id: 'simulation-parameters', label: '参数', description: '配置参数范围和采样步骤' },
      { id: 'simulation-run', label: '运行', description: '执行确定性参数扫描' },
      { id: 'simulation-results', label: '结果', description: '比较模拟数据和关键趋势' },
      { id: 'simulation-report', label: '报告', description: '生成实验记录与结论' },
      { id: 'delivery', label: '交付', description: '导出实验仿真成果包' }
    ],
    agents: [
      { id: 'SimulationAgent', label: '实验仿真智能体', description: '辅助配置模型、解释结果并整理报告' }
    ],
    deliverables: [
      { id: 'simulation-protocol', label: '实验方案', checklist: ['变量明确', '参数完整', '假设可检查'] },
      { id: 'simulation-dataset', label: '仿真数据', checklist: ['结果有限', '步骤可重复', '字段有说明'] },
      { id: 'simulation-report', label: '实验报告', checklist: ['图表清晰', '结论有依据', '局限已说明'] }
    ],
    supportedUploads: ['csv', 'xlsx', 'xls', 'json', 'txt', 'md', 'pdf']
  },
  {
    mode: 'virtual-teacher',
    title: '虚拟教师',
    description: '根据学习目标和学生基础组织诊断、讲解、练习与反馈的辅导流程。',
    icon: '师',
    recommendedFor: ['个别辅导', '概念讲解', '学习答疑'],
    wizardFields: [
      { key: 'name', label: '辅导主题', type: 'text', required: false },
      { key: 'courseName', label: '课程名称', type: 'text', required: false },
      { key: 'learnerStage', label: '学习阶段', type: 'text', required: false },
      { key: 'learningGoal', label: '学习目标', type: 'textarea', required: false },
      { key: 'teachingStyle', label: '讲解风格', type: 'select', required: true, options: ['苏格拉底式', '示例驱动', '循序渐进', '重点突破'] }
    ],
    tabs: [
      { id: 'tutor-overview', label: '概览', description: '查看辅导主题和学习状态' },
      { id: 'tutor-diagnosis', label: '诊断', description: '评估已有知识和薄弱环节' },
      { id: 'tutor-dialogue', label: '对话', description: '开展围绕目标的教学对话' },
      { id: 'tutor-explanation', label: '讲解', description: '生成分层概念讲解和示例' },
      { id: 'tutor-practice', label: '练习', description: '安排针对性练习与追问' },
      { id: 'tutor-feedback', label: '反馈', description: '形成学习反馈和后续建议' },
      { id: 'delivery', label: '交付', description: '导出虚拟教师辅导包' }
    ],
    agents: [
      { id: 'VirtualTeacherAgent', label: '虚拟教师智能体', description: '组织诊断、讲解、练习和反馈闭环' }
    ],
    deliverables: [
      { id: 'learner-diagnosis', label: '学习诊断', checklist: ['基础明确', '薄弱点具体', '证据充分'] },
      { id: 'teaching-script', label: '辅导脚本', checklist: ['结构清晰', '示例匹配', '追问可执行'] },
      { id: 'learning-feedback', label: '学习反馈', checklist: ['进步可见', '问题明确', '建议具体'] }
    ],
    supportedUploads: ['pdf', 'docx', 'pptx', 'txt', 'md', 'png', 'jpg', 'jpeg']
  },
  {
    mode: 'student-development',
    title: '学生发展规划',
    description: '结合学生画像、发展目标和成长证据制定阶段计划并持续评估。',
    icon: '育',
    recommendedFor: ['成长规划', '综合素质', '生涯辅导'],
    wizardFields: [
      { key: 'name', label: '规划名称', type: 'text', required: false },
      { key: 'courseName', label: '年级 / 专业', type: 'text', required: false },
      { key: 'developmentStage', label: '发展阶段', type: 'select', required: true, options: ['小学', '初中', '高中', '大学', '继续教育'] },
      { key: 'strengthsAndNeeds', label: '优势与需求', type: 'textarea', required: false },
      { key: 'developmentGoals', label: '发展目标', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'development-overview', label: '概览', description: '查看学生发展项目状态' },
      { id: 'development-profile', label: '画像', description: '整理优势、兴趣和支持需求' },
      { id: 'development-goals', label: '目标', description: '设置可观察的发展目标' },
      { id: 'development-plan', label: '计划', description: '制定阶段行动和支持方案' },
      { id: 'development-portfolio', label: '档案', description: '沉淀作品、活动和成长证据' },
      { id: 'development-assessment', label: '评估', description: '复盘进展并调整计划' },
      { id: 'delivery', label: '交付', description: '导出学生发展档案包' }
    ],
    agents: [
      { id: 'StudentDevelopmentAgent', label: '学生发展智能体', description: '辅助建立目标、计划和成长证据链' }
    ],
    deliverables: [
      { id: 'development-profile', label: '发展画像', checklist: ['信息完整', '优势具体', '需求明确'] },
      { id: 'development-plan', label: '发展计划', checklist: ['目标可观察', '行动可执行', '支持人明确'] },
      { id: 'development-portfolio', label: '成长档案', checklist: ['证据可追溯', '阶段有对比', '反思已记录'] }
    ],
    supportedUploads: ['pdf', 'docx', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg']
  },
  {
    mode: 'interactive-courseware',
    title: '互动课件制作',
    description: '从教学目标和素材出发组织课件结构、页面内容、互动环节与预览交付。',
    icon: '课',
    recommendedFor: ['课堂课件', '微课制作', '互动展示'],
    wizardFields: [
      { key: 'name', label: '课件主题', type: 'text', required: false },
      { key: 'courseName', label: '课程名称', type: 'text', required: false },
      { key: 'learnerStage', label: '授课对象', type: 'text', required: false },
      { key: 'lessonDuration', label: '授课时长', type: 'text', required: false },
      { key: 'interactionGoals', label: '互动目标', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'courseware-overview', label: '概览', description: '查看课件制作进度' },
      { id: 'courseware-outline', label: '大纲', description: '规划页面结构和叙事顺序' },
      { id: 'courseware-content', label: '内容', description: '编辑页面标题和讲解要点' },
      { id: 'courseware-assets', label: '素材', description: '整理图片、数据和引用素材' },
      { id: 'courseware-preview', label: '预览', description: '按页面预览互动课件' },
      { id: 'courseware-publish', label: '发布', description: '检查并准备课件输出' },
      { id: 'delivery', label: '交付', description: '导出互动课件成果包' }
    ],
    agents: [
      { id: 'InteractiveCoursewareAgent', label: '互动课件智能体', description: '辅助组织页面内容、互动节点和演示节奏' }
    ],
    deliverables: [
      { id: 'courseware-outline', label: '课件大纲', checklist: ['结构完整', '节奏合理', '目标一致'] },
      { id: 'courseware-script', label: '页面脚本', checklist: ['标题清晰', '要点简洁', '讲解备注齐备'] },
      { id: 'courseware-package', label: '课件包', checklist: ['素材齐备', '互动可用', '预览已复核'] }
    ],
    supportedUploads: ['pptx', 'pdf', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'svg']
  },
  {
    mode: 'teaching-game',
    title: '教学游戏',
    description: '把知识点和题目组织成有规则、有反馈、可复盘的课堂教学游戏。',
    icon: '游',
    recommendedFor: ['课堂互动', '闯关练习', '知识竞赛'],
    wizardFields: [
      { key: 'name', label: '游戏名称', type: 'text', required: false },
      { key: 'courseName', label: '学科', type: 'text', required: false },
      { key: 'knowledgePoints', label: '知识点', type: 'textarea', required: false },
      { key: 'gameFormat', label: '游戏形式', type: 'select', required: true, options: ['闯关', '抢答', '配对', '挑战赛'] },
      { key: 'difficulty', label: '难度与节奏', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'game-overview', label: '概览', description: '查看教学游戏项目状态' },
      { id: 'game-bank', label: '题库', description: '准备可游玩的题目和选项' },
      { id: 'game-rules', label: '规则', description: '设计回合、计分和反馈规则' },
      { id: 'game-preview', label: '试玩', description: '运行教学游戏并即时反馈' },
      { id: 'game-results', label: '结果', description: '查看得分和题目表现' },
      { id: 'game-feedback', label: '复盘', description: '形成知识点反馈和改进建议' },
      { id: 'delivery', label: '交付', description: '导出教学游戏成果包' }
    ],
    agents: [
      { id: 'TeachingGameAgent', label: '教学游戏智能体', description: '辅助设计题目、规则和即时反馈' }
    ],
    deliverables: [
      { id: 'game-question-bank', label: '游戏题库', checklist: ['题目可用', '选项完整', '答案明确'] },
      { id: 'game-rules', label: '游戏规则', checklist: ['流程清晰', '计分公平', '反馈及时'] },
      { id: 'game-review', label: '游戏复盘', checklist: ['结果已记录', '错题可定位', '建议可执行'] }
    ],
    supportedUploads: ['pdf', 'docx', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg']
  },
  {
    mode: 'knowledge-graph',
    title: '知识图谱',
    description: '从资料、知识条目和题目中提取概念与关系，形成可浏览和校订的知识网络。',
    icon: '图',
    recommendedFor: ['课程知识梳理', '概念关系分析', '题库关联'],
    wizardFields: [
      { key: 'name', label: '图谱主题', type: 'text', required: false },
      { key: 'courseName', label: '课程 / 领域', type: 'text', required: false },
      { key: 'graphScope', label: '图谱范围', type: 'textarea', required: false },
      { key: 'relationTypes', label: '关系类型', type: 'textarea', required: false },
      { key: 'detailLevel', label: '细化程度', type: 'select', required: true, options: ['概览', '章节级', '知识点级', '题目级'] }
    ],
    tabs: [
      { id: 'graph-overview', label: '概览', description: '查看图谱范围和构建状态' },
      { id: 'graph-sources', label: '来源', description: '整理图谱资料和数据来源' },
      { id: 'graph-extract', label: '提取', description: '提取概念、标签和关系' },
      { id: 'graph-view', label: '图谱', description: '浏览知识节点与连接' },
      { id: 'graph-curation', label: '校订', description: '合并、补充和校验图谱内容' },
      { id: 'graph-export', label: '输出', description: '生成图谱摘要和导出结构' },
      { id: 'delivery', label: '交付', description: '导出知识图谱成果包' }
    ],
    agents: [
      { id: 'KnowledgeGraphAgent', label: '知识图谱智能体', description: '辅助提取概念关系并建立证据连接' }
    ],
    deliverables: [
      { id: 'graph-schema', label: '图谱模式', checklist: ['节点类型明确', '关系类型明确', '命名一致'] },
      { id: 'knowledge-graph', label: '知识图谱', checklist: ['节点可追溯', '关系有依据', '孤立点已检查'] },
      { id: 'graph-summary', label: '图谱摘要', checklist: ['核心概念突出', '关系解释清晰', '缺口已标注'] }
    ],
    supportedUploads: ['pdf', 'docx', 'xlsx', 'csv', 'json', 'txt', 'md']
  },
  {
    mode: 'mistake-collection',
    title: '错题集',
    description: '导入错题并按知识点、错因和掌握状态分类，组织复练与阶段复盘。',
    icon: '错',
    recommendedFor: ['错题整理', '专项复练', '考试复盘'],
    wizardFields: [
      { key: 'name', label: '错题集名称', type: 'text', required: false },
      { key: 'courseName', label: '学科 / 课程', type: 'text', required: false },
      { key: 'examType', label: '来源类型', type: 'select', required: true, options: ['日常作业', '单元测验', '期中考试', '期末考试', '其他'] },
      { key: 'knowledgePoints', label: '重点知识点', type: 'textarea', required: false },
      { key: 'reviewGoal', label: '复盘目标', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'mistakes-overview', label: '概览', description: '查看错题数量和复盘状态' },
      { id: 'mistakes-import', label: '导题', description: '从文本、文件和图片导入错题' },
      { id: 'mistakes-classify', label: '分类', description: '标注知识点、错因和难度' },
      { id: 'mistakes-review', label: '复盘', description: '逐题复盘答案、解析和错因' },
      { id: 'mistakes-practice', label: '复练', description: '安排相似题和间隔复练' },
      { id: 'mistakes-report', label: '报告', description: '生成错题趋势和改进报告' },
      { id: 'delivery', label: '交付', description: '导出错题集成果包' }
    ],
    agents: [
      { id: 'MistakeCollectionAgent', label: '错题集智能体', description: '辅助分类错因、安排复练并生成复盘报告' }
    ],
    deliverables: [
      { id: 'mistake-bank', label: '错题库', checklist: ['题干完整', '答案完整', '解析完整'] },
      { id: 'mistake-analysis', label: '错因分析', checklist: ['错因具体', '知识点准确', '掌握状态明确'] },
      { id: 'mistake-review-plan', label: '复练计划', checklist: ['节奏合理', '相似题齐备', '复测标准明确'] }
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
