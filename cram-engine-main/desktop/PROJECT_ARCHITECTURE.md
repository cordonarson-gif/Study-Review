# Cram Engine Desktop — 项目架构文档

> 期末速成引擎桌面版 · Electron + Vite + React + TypeScript

---

## 一、项目概述

**Cram Engine（期末速成引擎）** 是一个面向大学生的桌面端 AI 学习工具，帮助用户在考前快速拆解、讲授、检题和补漏。核心理念基于六大学习科学原理：认知负荷控制、精细加工、生成效应、检索练习、间隔效应、元认知监控。

技术栈：**Electron 36 + Vite 7 + React 19 + TypeScript 5**

---

## 二、目录结构

```
cram-engine-main/
├── SKILL.md                          # Claude Code Skill 定义（命令行版本）
├── design-spec.md                    # 完整设计规范
├── stages/                           # 四阶段系统指令（Claude Code Skill 用）
│   ├── stage1-deconstruct.md         #   阶段1：拆解知识点树
│   ├── stage2-teach.md               #   阶段2：四步教学讲授
│   ├── stage3-test.md                #   阶段3：检题（四种子模式）
│   └── stage4-remediate.md           #   阶段4：诊断→换讲法→重测→顽固判定
├── configs/
│   └── example.yaml                  # 课程配置模板
├── assets/                           # 架构图、演示脚本等
│   ├── architecture.md
│   ├── demo-script.md
│   ├── readme-header.md
│   └── social-copy.md
│
└── desktop/                          # ★ 桌面应用主体
    ├── electron/                     #   Electron 主进程（后端逻辑）
    │   ├── main.cts                  #     主进程入口：IPC handlers、窗口管理
    │   ├── preload.cts               #     预加载脚本：暴露 cramEngine API
    │   ├── provider-api.cts          #     LLM API 适配层（Anthropic/OpenAI/阿里云）
    │   ├── file-access.cts           #     文件访问安全校验
    │   ├── question-utils.cts        #     题目解析工具（正则提取题干/选项/答案）
    │   ├── tsconfig.json             #     Electron 专用 TS 配置
    │   └── *.test.cjs                #     单元测试
    │
    ├── src/                          #   前端渲染进程（React）
    │   ├── main.tsx                  #     React 入口
    │   ├── index.html                #     HTML 模板
    │   ├── styles.css                #     全局样式入口
    │   ├── global.d.ts               #     window.cramEngine 类型声明
    │   │
    │   ├── app/
    │   │   └── App.tsx               #     主应用组件（路由、状态、布局）
    │   │
    │   ├── components/
    │   │   ├── ProjectListPanel.tsx   #   侧边栏项目列表（搜索/排序/统计）
    │   │   ├── QuestionImportPanel.tsx#   题目录入面板（文本/文件/OCR 三入口）
    │   │   └── PracticePanel.tsx      #   练习面板（分类树/随机/错题模式）
    │   │
    │   ├── lib/
    │   │   ├── types.ts              #     共享类型定义 + 常量
    │   │   ├── utils.ts              #     工具函数（日期、Provider 解析等）
    │   │   ├── fileParser.ts         #     文件解析工具
    │   │   ├── questionClassifier.ts #     题目分类树构建 + 统计
    │   │   ├── practiceSession.js    #     练习会话过滤逻辑
    │   │   ├── richContent.js        #     富文本 HTML 清洗
    │   │   ├── wizardImports.js      #     向导文件导入逻辑
    │   │   └── wizardProject.js      #     向导项目校验与构建
    │   │
    │   └── styles/
    │       ├── base.css              #     CSS 变量 + 全局重置
    │       ├── layout.css            #     Shell 布局（顶栏/侧栏/主区/底栏）
    │       ├── components.css        #     组件样式（卡片/按钮/面板）
    │       ├── forms.css             #     表单元素样式
    │       └── workspace.css         #     工作台三栏布局
    │
    ├── vite.config.ts                #   Vite 配置
    ├── tsconfig.json                 #   前端 TS 配置
    ├── electron-builder.config.ts    #   打包配置
    └── package.json                  #   依赖与脚本
```

---

## 三、系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Electron 应用                               │
│                                                                 │
│  ┌─────────────────────┐    IPC     ┌────────────────────────┐  │
│  │    渲染进程 (React)   │ ◄──────► │    主进程 (Node.js)     │  │
│  │                     │  preload   │                        │  │
│  │  App.tsx            │  bridge    │  main.cts              │  │
│  │  ├─ 首页            │            │  ├─ 项目管理 CRUD       │  │
│  │  ├─ 新建向导        │            │  ├─ 文件导入 + OCR      │  │
│  │  ├─ 工作台          │            │  ├─ AI 聊天 (LLM API)  │  │
│  │  │  ├─ 概览         │            │  ├─ 题目解析 + 存储     │  │
│  │  │  ├─ 练习面板     │            │  ├─ 知识库管理          │  │
│  │  │  ├─ 题目录入     │            │  ├─ 学习资源生成        │  │
│  │  │  ├─ YAML 配置    │            │  ├─ 导出 (MD + JSON)   │  │
│  │  │  └─ 进度追踪     │            │  └─ LaTeX 检测         │  │
│  │  ├─ 导出页          │            │                        │  │
│  │  ├─ 设置页          │            │  provider-api.cts      │  │
│  │  └─ AI 抽屉         │            │  ├─ Anthropic 适配     │  │
│  │                     │            │  ├─ OpenAI 适配        │  │
│  │  window.cramEngine  │            │  └─ 阿里云适配          │  │
│  └─────────────────────┘            │                        │  │
│                                     │  file-access.cts       │  │
│                                     │  └─ 路径安全校验        │  │
│                                     │                        │  │
│                                     │  question-utils.cts    │  │
│                                     │  └─ 题干正则解析        │  │
│                                     └────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              本地文件系统 (AppData/CramEngineDesktop)     │    │
│  │  settings.json          — 全局设置                       │    │
│  │  projects/index.json    — 项目注册表                     │    │
│  │  projects/<id>/         — 各项目独立目录                  │    │
│  │    ├── project.json     — 项目元数据                     │    │
│  │    ├── config.yaml      — 课程配置                       │    │
│  │    ├── progress.md      — 学习进度                       │    │
│  │    ├── uploads/         — 上传素材                       │    │
│  │    ├── questions/       — 题库 (index.json)              │    │
│  │    ├── resources/       — 学习资源 (index.json)          │    │
│  │    ├── knowledge-base/  — 知识库 (entries/*.md)          │    │
│  │    ├── chat/            — 聊天记录 (history.json)        │    │
│  │    └── generated/       — 导出文件                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、前端页面与视图

### 4.1 视图路由（App.tsx 内部状态驱动，无 Router）

| 视图 | `viewMode` | 说明 |
|------|-----------|------|
| **首页** | `home` | Hero 区 + 四阶段介绍卡片 + 最近项目列表 |
| **新建向导** | `wizard` | 三步骤表单（基本信息 → 课程内容 → 题目导入） |
| **工作台** | `workspace` | 三栏布局（素材/知识库 | 内容区 | Agent 聊天） |
| **设置** | `settings` | 模型服务商管理 + 生成参数 + LaTeX |
| **导出** | `export` | 项目摘要 + 导出格式选择 + 导出结果 |

### 4.2 工作台 Tab（`editorTab`）

| Tab | 说明 |
|-----|------|
| **概览** | 课程信息摘要、教材、要求、LaTeX 渲染示例 |
| **练习** | PracticePanel 组件：分类树浏览 / 随机刷题 / 错题重练 |
| **词条** | QuestionImportPanel：文本粘贴 / 文件上传 / 图片 OCR 录入题目 |
| **YAML** | 课程配置编辑器（保存为 config.yaml） |
| **进度** | 学习进度 Markdown 编辑器 + 实时预览 |

### 4.3 UI 布局结构

```
┌──────────────────────────────────────────────────────────┐
│  TopNav：品牌 | 全局搜索 | 阶段筛选 | AI 助手 | 通知     │
├────────┬──────────────────────────────────┬──────────────┤
│ Sidebar│          Main Content            │  AI Drawer   │
│        │                                  │  (可折叠)     │
│ 新建   │  首页 / 向导 / 工作台 / 设置     │              │
│ 导航   │                                  │  对话 Tab    │
│ 项目列 │  工作台内部三栏：                 │  参考资料 Tab │
│ 表     │  左：素材+知识库                  │              │
│        │  中：内容区（5 个 Tab）           │  输入框      │
│ 设置   │  右：Agent 交互面板              │  同步按钮    │
│ 帮助   │                                  │              │
│ 状态   │                                  │              │
├────────┴──────────────────────────────────┴──────────────┤
│  StatusBar：版本 | API 状态 | 模型 | 系统状态 | 文档      │
└──────────────────────────────────────────────────────────┘
```

---

## 五、Electron 主进程 IPC 接口总览

### 5.1 设置与模型

| IPC Channel | 前端调用 | 说明 |
|------------|---------|------|
| `settings:get` | `getSettings()` | 读取全局设置 |
| `settings:save` | `saveSettings(settings)` | 保存全局设置 |
| `settings:fetchModels` | `fetchModels()` | 从 LLM API 拉取可用模型列表 |

### 5.2 项目 CRUD

| IPC Channel | 前端调用 | 说明 |
|------------|---------|------|
| `projects:list` | `listProjects()` | 列出全部项目（按最近打开排序） |
| `projects:create` | `createProject(input)` | 创建项目（初始化目录/配置/进度/题库/聊天） |
| `projects:open` | `openProject(id)` | 打开项目（加载完整 ProjectDetail） |
| `projects:rename` | `renameProject(id, name)` | 重命名 |
| `projects:delete` | `deleteProject(id)` | 删除（含物理文件） |
| `projects:updateModel` | `updateProjectModel(id, model)` | 切换项目模型 |
| `projects:saveConfig` | `saveProjectConfig(id, content)` | 保存 YAML 配置 |
| `projects:saveProgress` | `saveProjectProgress(id, content)` | 保存进度 Markdown |
| `projects:importFiles` | `importProjectFiles(id, paths)` | 导入文件（自动 OCR 图片） |
| `projects:export` | `exportProject(id)` | 导出为 Markdown + JSON |
| `projects:summary` | `getProjectSummary(id)` | 获取统计摘要 |

### 5.3 题目管理

| IPC Channel | 前端调用 | 说明 |
|------------|---------|------|
| `questions:previewText` | `previewQuestionsFromText(text, source, name)` | 从文本正则解析题目 |
| `questions:previewFiles` | `previewQuestionsFromFiles(paths)` | 从文件解析题目 |
| `questions:previewFilesDirect` | `previewQuestionsFromFileContent(paths)` | 从文件直接解析（不存储） |
| `questions:add` | `addQuestions(id, drafts)` | 题目入库 |
| `questions:update` | `updateQuestion(id, question)` | 更新单题（收藏/错题/次数） |

### 5.4 AI 聊天

| IPC Channel | 前端调用 | 说明 |
|------------|---------|------|
| `projects:chat` | `runProjectChat(id, input)` | 调用 LLM API 对话（带课程上下文） |

### 5.5 知识库与资源

| IPC Channel | 前端调用 | 说明 |
|------------|---------|------|
| `knowledgeBase:addEntry` | `addKnowledgeBaseEntry(id, entry)` | 添加知识库条目（生成 Markdown） |
| `knowledgeBase:draftEntry` | `draftKnowledgeBaseEntry(id, source, payload)` | 草拟条目（自动标题/摘要/标签） |
| `resources:get` | `getKnowledgeResources(id, point)` | 按知识点生成 B站/抖音/网页搜索链接 |
| `resources:open` | `openKnowledgeResource(id, resource)` | 打开外部链接 + 标记已读 |

### 5.6 文件系统与工具

| IPC Channel | 前端调用 | 说明 |
|------------|---------|------|
| `dialog:selectProjectFolder` | `selectProjectFolder()` | 选择文件夹对话框 |
| `dialog:selectUploadFiles` | `selectUploadFiles()` | 选择文件对话框（多选） |
| `project:snapshot` | `snapshotProject(id, root)` | 文件树快照 |
| `project:readText` | `readText(pathOrId, filePath?)` | 读取文本文件 |
| `project:saveText` | `saveText(id, path, content)` | 保存文本文件 |
| `latex:check` | `checkLatex()` | 检测 MiKTeX 是否可用 |
| `ocr:batch` | `ocrImages(paths)` | 批量 Tesseract OCR |

---

## 六、LLM 多模型适配

`provider-api.cts` 实现了一套 Provider 抽象层，统一对接三种 LLM API：

| Provider | Base URL | 请求格式 | 认证方式 |
|----------|---------|---------|---------|
| **Anthropic** | `api.anthropic.com` | `POST /v1/messages` | `x-api-key` + `anthropic-version` |
| **OpenAI Compatible** | `api.openai.com/v1` | `POST /chat/completions` | `Authorization: Bearer` |
| **阿里云 (Qwen)** | `dashscope.aliyuncs.com/compatible-mode/v1` | `POST /chat/completions` | `Authorization: Bearer` |

预置模型列表：
- **Anthropic**: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5
- **OpenAI**: gpt-4.1, gpt-4.1-mini
- **阿里云**: qwen-plus, qwen-max, qwen2.5-72b-instruct

支持运行时通过 `fetchModels()` 动态拉取最新模型列表。

---

## 七、核心数据流

### 7.1 项目创建流程

```
用户填写向导 (3步)
    │
    ▼
validateWizardProject() → 校验必填字段
    │
    ▼
previewQuestionsFromText() → 解析初始题目
    │
    ▼
buildWizardProjectPayload() → 构建 CreateProjectInput
    │
    ▼
IPC: projects:create
    │
    ├─ 生成项目 ID 和目录结构
    ├─ 写入 project.json (元数据)
    ├─ 写入 config.yaml (课程配置)
    ├─ 写入 progress.md (初始进度)
    ├─ 写入 questions/index.json (初始题目)
    ├─ 写入 chat/history.json (欢迎消息)
    └─ 更新 projects/index.json (注册表)
```

### 7.2 AI 聊天流程

```
用户输入 → IPC: projects:chat
    │
    ├─ 加载项目详情（课程名/考试类型/教材/上传内容）
    ├─ 加载全局设置（Provider/API Key/Model/Temperature）
    │
    ├─ 有 API Key?
    │   ├─ 否 → 返回配置提示
    │   └─ 是 → 构建 ChatRequest
    │           ├─ Anthropic → POST /v1/messages
    │           └─ 其他     → POST /chat/completions
    │
    ├─ 解析响应 → parseChatResponse()
    ├─ 追加到 chat/history.json
    └─ 返回 { reply, history }
```

### 7.3 题目录入流程

```
文本粘贴 / 文件上传 / 图片 OCR
    │
    ▼
question-utils.cts: parseQuestionDrafts()
    ├─ 正则匹配题干 (stem)
    ├─ 正则匹配选项 A-H (options)
    ├─ 正则匹配答案 (answer)
    └─ 正则匹配解析 (explanation)
    │
    ▼
前端预览修正 (QuestionImportPanel / App.tsx)
    │
    ▼
IPC: questions:add → materializeQuestionDrafts()
    ├─ 生成唯一 ID
    ├─ 设置初始状态 (favorite=false, wrong=false, attempts=0)
    └─ 写入 questions/index.json
```

---

## 八、前端组件树

```
<App>
├── <header.topnav>          — 顶栏（品牌/搜索/阶段筛选/AI/通知）
│
├── <aside.sidebar>
│   ├── 新建项目按钮
│   ├── 导航链接（首页/工作台/导出）
│   ├── <ProjectListPanel>   — 项目列表（搜索/排序/打开/重命名/删除）
│   ├── 设置 + 帮助
│   └── 状态卡片（API/LaTeX）
│
├── <main.main>
│   ├── [home]      Hero + 四阶段卡片 + 最近项目网格
│   ├── [wizard]    三步骤表单 + 步骤指示器 + 进度条
│   ├── [workspace] 三栏布局
│   │   ├── <section.left-rail>    素材上传 + 知识库列表 + 资源拓展
│   │   ├── <section.center-pane>  Tab 切换内容
│   │   │   ├── [overview]  课程概览 + LaTeX 示例
│   │   │   ├── [practice]  <PracticePanel> 分类/随机/错题练习
│   │   │   ├── [import]    <QuestionImportPanel> 多格式录入
│   │   │   ├── [config]    YAML 编辑器
│   │   │   └── [progress]  Markdown 编辑器 + 预览
│   │   └── <section.right-pane>   Agent 聊天面板
│   ├── [settings]  模型服务商 + 生成参数 + LaTeX 设置
│   └── [export]    导出摘要 + 格式选择 + 导出结果
│
├── <aside.ai-drawer>        — 可折叠 AI 抽屉（对话/参考资料/输入）
│
├── <footer.statusbar>       — 底栏（版本/API 状态/系统信息）
├── <button.ai-fab>          — 浮动 AI 按钮（抽屉关闭时显示）
└── <div.toast>              — 全局 Toast 提示
```

---

## 九、关键技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 路由方案 | 状态驱动 (`viewMode`) | 桌面应用无需 URL 路由，状态更轻量 |
| 数据存储 | 本地 JSON/Markdown 文件 | 离线优先，无后端依赖，纯文本易迁移 |
| 通信方式 | Electron IPC (contextBridge) | 安全隔离，渲染进程无 Node 权限 |
| OCR 引擎 | Tesseract.js (chi_sim+eng) | 纯 JS，无需原生依赖 |
| Markdown 渲染 | marked + 自定义 LaTeX 转义 | 轻量，支持 GFM |
| 样式方案 | 纯 CSS (CSS Variables) | 无框架依赖，变量驱动主题一致性 |
| LLM 适配 | Provider 抽象层 | 统一接口支持多模型切换 |
| 文件安全 | 路径白名单 + assertAllowed | 防止渲染进程越权访问文件系统 |

---

## 十、启动与构建命令

```bash
# 开发模式（Vite + Electron + TSC Watch）
npm run dev

# 生产构建 + 打包
npm run build

# 类型检查
npm run typecheck
```

---

*文档生成时间：2026-07-14*
