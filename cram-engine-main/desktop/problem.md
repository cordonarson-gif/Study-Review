# Cram Engine Desktop — 代码审查问题报告

> 审查日期：2026-07-14  
> 审查范围：Electron 主进程 + 渲染进程全栈代码  
> 编译状态：`npm run typecheck` 通过（双通道零错误）

---

## 🔴 严重 (Critical)

### 1. `provider-api.cts` 的 `ProviderId` 类型未包含 `deepseek`

- **文件**: `electron/provider-api.cts:1`
- **问题**: `type ProviderId = 'anthropic' | 'openai-compatible' | 'aliyun'` 未包含 `'deepseek'`
- **影响**: 所有 `as 'anthropic' | 'openai-compatible' | 'aliyun'` 的类型断言在 DeepSeek 被选为 provider 时实际上是不正确的。虽然 DeepSeek 使用 OpenAI 兼容 API 格式所以功能上暂时可用，但语义上类型不安全
- **涉及位置**:
  - `main.cts` `fetchModels()` — 类型断言
  - `main.cts` `runProjectChat()` — 类型断言  
  - `main.cts` `testConnection()` — 类型断言
  - `main.cts` 所有 Phase 1/2 课程生成和多智能体的 LLM 上下文构造处
- **建议修复**: 将 `ProviderId` 扩展为 `'anthropic' | 'openai-compatible' | 'aliyun' | 'deepseek'`
- **状态**: ✅ 已修复 (2026-07-14)

---

### 2. Agent 编排器对 `session.agents` 的现场修改（mutation）

- **文件**: `electron/agent-orchestrator.cts` `executeAction()` 函数
- **问题**: `executeAction()` 直接修改 `session.agents[i].stance`（`a.stance = ...`），这是对传入 session 对象的就地修改
- **影响**: 
  - 由于 session 在 IPC 调用中是通过 `readJson`/`writeJson` 序列化/反序列化的（`main.cts:agents:executeAction`），每次 IPC 调用后 session 被重新保存和加载，所以当前逻辑不会产生 bug
  - 但如果未来在同一次 IPC 调用中多次调用 `executeAction()`，会导致意外状态污染
- **建议修复**: 使用不可变更新模式，复制 `agents` 数组而非直接修改

---

### 3. miss `katex` 依赖声明

- **文件**: `src/app/App.tsx:3` — `import katex from 'katex'`
- **问题**: App.tsx 使用了 `katex.renderToString()` 来渲染 LaTeX 公式，但 `package.json` 的 `dependencies` 中未声明 `katex`
- **影响**: 如果 `node_modules` 中没有 katex（被其他包间接依赖安装），运行时会抛 `MODULE_NOT_FOUND`
- **建议修复**: 在 `package.json` 中添加 `"katex": "^0.16.0"` 依赖，运行 `npm install`
- **状态**: ✅ 已修复 — katex 已存在于 package.json (`^0.17.0`)

---

## 🟡 警告 (Warning)

### 4. PPTX `buildPresentation()` 硬编码 5 张幻灯片

- **文件**: `electron/pptx-exporter.cts` `buildPresentation()` 函数
- **问题**: 
  ```
  ${Array.from({ length: 5 }, (_, i) => `    <p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('\n')}
  ```
  始终生成 5 个 `<p:sldId>`，而实际幻灯片数量可能不同
- **影响**: 当幻灯片数 ≠ 5 时，PowerPoint 可能报"文件需要修复"或丢失幻灯片
- **建议修复**: 将 `length: 5` 改为 `length: slideCount`
- **状态**: ✅ 已修复 — `buildPresentation()` 现在接收 `slideCount` 参数

---

### 5. PPTX ZIP 路径分隔符使用 Windows 特定 `\`

- **文件**: `electron/pptx-exporter.cts` `buildPptxZip()` 中的 `addFile()`
- **问题**: `files.push({ name: name.replace(/\//g, '\\'), ... })` 将所有 `/` 替换为 `\`
- **影响**: ZIP 规范要求路径分隔符为 `/`，使用 `\` 会导致 macOS/Linux 解压时文件夹结构不正确
- **建议修复**: 移除 `replace(/\//g, '\\')`，保持 `/` 作为 ZIP 内路径分隔符
- **状态**: ✅ 已修复 — 已移除路径分隔符替换

---

### 6. 类型定义在 `main.cts` 和 `types.ts` 之间重复

- **文件**: `electron/main.cts` (第37-167行) vs `src/lib/types.ts`
- **问题**: `main.cts` 中有大量与 `types.ts` 重复的类型定义（`ProjectMeta`, `AppSettings`, `AgentSession`, `CourseOutline` 等）
- **影响**: 维护成本高——修改类型需要同步两处；目前 typecheck 通过是因为它们恰好一致，但不保证未来同步
- **建议修复**: `main.cts` 应从 `types.ts` 导入类型，或使用 `global.d.ts` 中的全局类型声明

---

### 7. AI 聊天使用全局 `settings.model` 而非项目专属模型

- **文件**: `electron/main.cts` `runProjectChat()` 
- **问题**: 用户消息的 `model` 字段使用了 `settings.model`（全局设置模型），而不是 `project.meta.model`（项目创建时选择的专属模型）
- **影响**: 聊天历史中记录的模型可能不准确，且聊天实际使用的模型与用户在项目创建向导中选择的不一致
- **建议修复**: `userTurn.model` 应使用 `project.meta.model`
- **状态**: ✅ 已修复 — `runProjectChat()` 中 3 处改为 `project.meta.model`

---

### 8. `global.d.ts` 缺少 `deleteKnowledgeBaseEntry` 声明

- **文件**: `src/global.d.ts` `window.cramEngine` 接口
- **问题**: `preload.cts` 暴露了 `deleteKnowledgeBaseEntry`，`main.cts` 注册了 IPC handler，但 `global.d.ts` 的 `cramEngine` 接口中缺少该方法声明
- **影响**: TypeScript 类型检查对 `window.cramEngine.deleteKnowledgeBaseEntry()` 调用不会报错但也没有类型提示
- **建议修复**: 在 `global.d.ts` 中添加该方法的类型声明
- **状态**: ✅ 已验证 — 声明已存在于 global.d.ts:381

---

## 🔵 建议 (Suggestion)

### 9. `EditorTab` 过多导致 Tab 栏拥塞

- **文件**: `src/app/App.tsx:39` — 9 个 EditorTab 值
- **观察**: 工作台 Tab 栏当前有 9 个选项（概览/练习/词条/YAML/进度/课堂/智能体/白板/分析），在小屏幕上会换行
- **建议**: 可考虑将低频 Tab（白板、分析）放在"更多"下拉菜单中

---

### 10. QuizPlayer 需要答完所有题才能提交

- **文件**: `src/components/SceneRenderers.tsx` QuizPlayer
- **观察**: `allAnswered` 条件（`answeredCount === scene.questions.length`）要求用户答完所有题才能看到提交按钮。对于长测验（>10题），用户可能希望在部分作答后提交
- **建议**: 添加"提前交卷"按钮，或改为答完一定比例（如 80%）即可提交

---

### 11. CourseWizardPanel 场景生成时无错误重试

- **文件**: `src/components/CourseWizardPanel.tsx` `handleGenerateAllScenes()`
- **观察**: 逐章生成时，如果某一章生成失败，`catch` 只是跳过并继续下一章。用户没有机会重试失败章节
- **建议**: 收集失败章节列表，在全部生成完成后提示用户，并提供"重试失败章节"按钮

---

### 12. `localSpeech()` 模拟发言多次调用产生相同内容

- **文件**: `electron/agent-orchestrator.cts` `localSpeech()` 函数
- **观察**: 离线模式下（无 API Key），多次调用 `next-turn` 会逐次生成相同的模拟发言，缺乏轮次间的内容变化
- **建议**: 为本地模拟发言引入轮次索引感知，根据 `turnIndex` 变化发言内容

---

### 13. 大数据量场景缺少分页/虚拟滚动

- **文件**: `src/components/ProjectListPanel.tsx`、`src/app/App.tsx` 知识库列表
- **观察**: 当项目数量 >50 或知识库条目 >200 时，直接渲染全部 DOM 节点会导致卡顿
- **建议**: 对列表组件引入分页或虚拟滚动

---

## ✅ 已验证通过

| 检查项 | 状态 |
|--------|------|
| TypeScript 编译 (`tsc --noEmit`) | ✅ 双通道零错误 |
| IPC handler 注册与 preload 暴露一致性 | ✅ 全部匹配 |
| 导入路径正确性 | ✅ 无循环依赖 |
| CSS 变量完整性 | ✅ 使用 `--color-*` 变量族 |
| 错误边界（try/catch） | ✅ 关键路径均有覆盖 |
| 空状态处理 | ✅ 各组件均有默认值/空状态 |

---

*报告生成：2026-07-14 | 审查工具：手动代码走查*