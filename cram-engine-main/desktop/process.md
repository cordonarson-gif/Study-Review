# Cram Engine Desktop → OpenMAIC 开发日志

> 基于 goal.md 的功能需求，在原有 Electron 架构上逐步扩展

---

## 开发概览

- **开始时间**: 2026-07-14
- **基础架构**: Electron 36 + Vite 7 + React 19 + TypeScript 5
- **开发模式**: 增量叠加，保留所有现有功能

---

## Phase 1: 两阶段课程生成管线 ✅

### 目标
实现 goal.md 第二章描述的课程生成引擎：
- 第一阶段：结构化课程大纲生成 (AI + 模板回退)
- 第二阶段：分场景内容生成（幻灯片/测验/HTML实验/PBL）

### 新增文件清单

| 文件 | 说明 |
|------|------|
| `electron/course-generator.cts` | 后端课程生成核心模块，含 LLM 调用 + 模板回退 |
| `src/components/CourseWizardPanel.tsx` | 前端课程生成向导（两阶段UI） |
| `src/components/OutlineViewer.tsx` | 课程大纲浏览器（章节导航+场景渲染容器） |
| `src/components/SceneRenderers.tsx` | 场景渲染组件集（SlidePlayer/QuizPlayer/SimLabViewer/PBLViewer） |
| `desktop/process.md` | 本开发日志 |

### 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/lib/types.ts` | 新增课程生成管线相关的全部类型定义 |
| `src/global.d.ts` | 新增课程类型 + cramEngine API 声明 |
| `electron/main.cts` | 导入 course-generator，注册 5 个新 IPC handlers |
| `electron/preload.cts` | 暴露 5 个新 API 方法到渲染进程 |
| `src/app/App.tsx` | 集成课堂视图（viewMode/editorTab/侧边栏/渲染逻辑） |

### 架构设计

```
用户输入主题 → [Stage 1] generateCourseOutline()
  ├─ 有 API Key → LLM 生成结构化 JSON 大纲
  └─ 无 API Key → 模板生成默认大纲
       ↓
大纲预览与编辑（CourseWizardPanel）
  ├─ 可视化章节卡片
  ├─ 场景类型切换 (slide/quiz/sim-lab/pbl)
  └─ 知识点编辑
       ↓
[Stage 2] generateChapterScene() 逐章生成
  ├─ slide-lecture → SlideLectureScene（幻灯片+语音旁白）
  ├─ interactive-quiz → QuizScene（题目+评分+反馈）
  ├─ sim-lab → SimLabScene（单文件HTML+实验引导）
  └─ pbl-project → PBLScene（里程碑+角色+协作流程）
       ↓
保存 course.json → 课堂视图渲染
  ├─ OutlineViewer（左侧章节导航）
  └─ SceneRenderer（右侧场景播放）
```

### IPC 接口

| Channel | 方法 | 说明 |
|---------|------|------|
| `courses:generateOutline` | `generateCourseOutline(input)` | 阶段一：生成大纲 |
| `courses:generateScene` | `generateChapterScene(projectId, chapter)` | 阶段二：单章场景 |
| `courses:generateAllScenes` | `generateAllScenes(projectId, outline)` | 阶段二：批量场景 |
| `courses:load` | `loadGeneratedCourse(projectId)` | 加载已保存课程 |
| `courses:save` | `saveGeneratedCourse(projectId, course)` | 保存课程 |

### 验证结果
- [x] 运行 `npm run typecheck` 通过 — 前端 + Electron 双通道类型检查无错误
- [ ] 运行 `npm run dev` 启动应用测试功能（需用户本地验证）

---

## Phase 2: 多智能体编排系统 ✅

### 目标
实现 goal.md 第三章描述的多智能体系统：
- AI 教师角色（主讲/控场/点评）
- AI 助教角色（答疑/笔记/资料）
- AI 同学角色（3-5名差异化人设）
- LangGraph 风格状态机
- 11 种状态的状态机（idle→discussion→debate→qa 完整流转）
- 智能轮次控制 + 辩论立场自动分配

### 新增文件

| 文件 | 说明 |
|------|------|
| `electron/agent-orchestrator.cts` | 智能体编排核心（526行），状态机 + 发言生成 |
| `src/components/AgentClassroomPanel.tsx` | 多智能体课堂交互面板 |

### 修改文件

| 文件 | 修改 |
|------|------|
| `src/lib/types.ts` | 新增 AgentRole/AgentPersona/AgentSpeech/AgentSession/OrchestratorState 等类型 + 5个预置角色 |
| `src/global.d.ts` | 新增 AgentActionResult 类型 + 3个 API 声明 |
| `electron/main.cts` | 导入 agent-orchestrator + 3个 IPC handlers + session 存储 |
| `electron/preload.cts` | 暴露 3 个智能体 API |
| `src/app/App.tsx` | 新增 `agent` EditorTab + AgentClassroomPanel 集成 |

### 预置角色

| ID | 角色 | 名称 | 活跃度 |
|----|------|------|--------|
| agent-teacher | 👨‍🏫 教师 | 张老师 | high |
| agent-assistant | 🤖 助教 | 小助 | medium |
| agent-student-a | 🧑‍🎓 同学 | 小明 | high |
| agent-student-b | 👩‍🎓 同学 | 小红 | medium |
| agent-student-c | 🧑‍💻 同学 | 小刚 | medium |

### 状态机流转

```
idle
  ├─ start-discussion → discussion-open
  │    ├─ next-turn → discussion-open（轮流发言）
  │    ├─ teacher-nominate → discussion-nominate
  │    └─ teacher-wrapup → discussion-wrapup → idle
  ├─ start-debate → debate-opening
  │    ├─ next-turn → debate-statements（立论陈词）
  │    ├─ next-turn → debate-free（自由辩论）
  │    └─ teacher-wrapup → debate-summary → idle
  └─ student-ask → qa-answering
       └─ next-turn → qa-followup
```

### 验证结果
- [x] `npm run typecheck` 通过，前端+Electron 双通道零错误

---

## Phase 3: 三大交互模式 ✅

### 目标
- 课堂讨论模式 → 思维导图实时生成
- 圆桌辩论模式 → 学生加入阵营 + 辩论比分
- 自由问答模式 → 知识点关键词匹配

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/MindMapViewer.tsx` | 交互式思维导图组件（可折叠/彩色节点） |

### 修改文件

| 文件 | 修改 |
|------|------|
| `src/lib/types.ts` | 新增 MindMapNode / Rebuttal 类型 |
| `src/components/AgentClassroomPanel.tsx` | 重写 v2：集成思维导图、阵营选择、知识点匹配、辩论比分 |

### 增强功能

**讨论模式：**
- 从发言内容自动提取关键点生成思维导图
- 可折叠/展开的彩色树形节点

**辩论模式：**
- 学生选择正/反方阵营（🟢正方 / 🔴反方）
- 实时辩论比分统计
- 学生加入后触发 AI 阵营响应

**问答模式：**
- 关键词匹配显示关联知识点标签
- 教师/助教分工回答

### 验证结果
- [x] `npm run typecheck` 通过，零错误

---

## Phase 4: 多模态课堂前端 ✅

### 目标
- 智能幻灯片播放器（聚光灯/激光笔/逐条展示/自动播放）
- 协作式实时白板（SVG绘图/6种工具/多色/导出）
- 统一动作协议类型定义

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/ClassroomWhiteboard.tsx` | SVG 协作白板（219行），画笔/矩形/圆/箭头/文字 |

### 修改文件

| 文件 | 修改 |
|------|------|
| `src/lib/types.ts` | 新增 ClassroomAction / WhiteboardElement 类型 |
| `src/components/SceneRenderers.tsx` | SlidePlayer 增强：聚光灯遮罩、激光笔动画、逐条展开、自动播放 |
| `src/app/App.tsx` | 导入 ClassroomWhiteboard，新增 `whiteboard` EditorTab |

### 增强效果

**SlidePlayer v2：**
- 🔦 聚光灯：圆形透亮遮罩，引导注意力焦点
- 🖊️ 激光笔：红色发光圆点，自动沿路径循环移动
- 📋 逐条展开：点击逐条显示要点，计数器跟踪进度
- ▶ 自动播放：1.5s 间隔自动推进

**ClassroomWhiteboard：**
- ✏️ 6 种工具：画笔/矩形/圆/箭头/文字/橡皮
- 🎨 6 种颜色选择
- 📥 SVG 导出
- 🤖 AI 逐步绘制动画（autoPlay 模式）

### 验证结果
- [x] `npm run typecheck` 通过，双通道零错误

---

## Phase 5: 互动学习与测评增强 ✅

### 目标
- AI 简答题评分 + 薄弱知识点分析
- 学习分析仪表盘（掌握度/进度/建议）
- PBL 进度追踪 + 交付物检查

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/LearningDashboard.tsx` | 学习分析仪表盘（总览/知识点掌握度/智能建议） |

### 修改文件

| 文件 | 修改 |
|------|------|
| `src/components/SceneRenderers.tsx` | QuizPlayer 增强：AI 简答评分 + 薄弱点标签；PBLViewer 增强：可勾选里程碑 + 进度追踪 Tab |
| `src/app/App.tsx` | 新增 📊 分析 EditorTab + LearningDashboard 集成 |

### 增强功能

**QuizPlayer v2：**
- 🤖 AI 简答题评分：关键词匹配 + 语义重叠度
- ⚠️ 薄弱知识点自动识别 + 复习路径推荐
- 📊 每题详细评分（score 字段）

**LearningDashboard：**
- 📈 4 卡片总览（掌握度/题库量/错题/已练）
- 📌 知识点掌握度条形图（前8个）
- 💡 智能学习建议（根据掌握度生成）

**PBLViewer v2：**
- ☑️ 可勾选里程碑完成状态
- 📊 实时进度百分比
- 📋 新进度 Tab：交付物清单 + 里程碑跟踪

### 验证结果
- [x] `npm run typecheck` 通过，双通道零错误

---

## Phase 6: 内容导出增强 ✅

### 目标
- PPTX 导出（纯 Node.js ZIP+XML，PowerPoint/WPS 兼容）
- 互动 HTML 导出（单文件，内嵌幻灯片/测验/实验）

### 新增文件

| 文件 | 说明 |
|------|------|
| `electron/pptx-exporter.cts` | PPTX 导出模块（312行），纯 Node.js ZIP+XML 实现 |
| `electron/html-exporter.cts` | 互动 HTML 导出（172行），单文件自包含 |

### 修改文件

| 文件 | 修改 |
|------|------|
| `electron/main.cts` | 注册 export:pptx / export:html IPC handlers |
| `electron/preload.cts` | 暴露 exportPptx / exportInteractiveHtml API |
| `src/global.d.ts` | 新增导出 API 声明 |
| `src/app/App.tsx` | 新增 exportPptx() / exportHtml() 函数 + 导出页按钮 |

### 导出格式

| 格式 | 说明 | 兼容性 |
|------|------|--------|
| 📊 PPTX | Office Open XML 标准，含标题/要点/备注 | PowerPoint / WPS |
| 🌐 HTML | 单文件交互页面，左导航+右内容 | 浏览器双击打开 |
| 📝 MD | Markdown 文档（已有） | Obsidian / Typora |
| 📋 JSON | 结构化数据（已有） | 编程处理 |

### 验证结果
- [x] `npm run typecheck` 通过，双通道零错误

---

## Phase 7: 外部集成与部署 ✅

### 目标
- 多 LLM 适配层增强 — 新增 DeepSeek Provider + 模型预置扩展
- API 连接测试功能
- 模型管理优化

### 修改文件

| 文件 | 修改 |
|------|------|
| `src/lib/types.ts` | providerOptions 新增 DeepSeek + 扩展 OpenAI/gpt-4o 模型 |
| `electron/main.cts` | presetModels 同步更新 + 新增 `settings:testConnection` IPC |
| `electron/preload.cts` | 暴露 `testConnection` API |
| `src/global.d.ts` | 新增 `testConnection` 声明 |
| `src/app/App.tsx` | 新增 `testConnection()` 函数 + 设置页 🔗 测试连接按钮 |

### 支持的 Provider

| Provider | 模型 |
|----------|------|
| OpenAI Compatible | gpt-4.1, gpt-4.1-mini, gpt-4o, gpt-4o-mini |
| **DeepSeek** 🆕 | deepseek-chat, deepseek-reasoner |
| Qwen (阿里云) | qwen-plus, qwen-max, qwen2.5-72b-instruct |
| Anthropic / Claude | claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5 |

### 新功能
- 🔗 **连接测试**：在设置页一键验证 API Key 和 Base URL 是否可用

### 验证结果
- [x] `npm run typecheck` 通过，双通道零错误

---

# 🎉 全部 7 阶段开发完成！

*最后更新：2026-07-14*

*全部 7 阶段完成 — 2026-07-14*