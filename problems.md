# Project Problems


## BUG-001

状态:
DONE

等级:
严重

模块:
stitch_cram_engine — 学者学习模式 (scholar_s_study)

问题:
scholar_s_study 模块目录仅包含 DESIGN.md 设计规范文件，缺少其他所有模块都具备的 code.html 页面文件和 screen.png 截图。该模块在 README 项目结构中列出为功能模块之一，但没有可用的 UI 页面。

复现步骤:

1. 打开 review/stitch_cram_engine/scholar_s_study/
2. 查看目录内容

实际结果:

仅有 DESIGN.md，缺少 code.html 和 screen.png

期望结果:

与其他 13 个模块一致，包含 code.html 页面文件和 screen.png 预览截图

涉及文件:

review/stitch_cram_engine/scholar_s_study/

修复记录:

修复时间: 2026年
修改文件:
  - review/docs/design-system.md（新建，从 scholar_s_study/DESIGN.md 迁移）
  - review/stitch_cram_engine/scholar_s_study/code.html（新建，"学者学习模式"页面）
修复方案: DESIGN.md 实际为全局设计系统文档，迁移到 docs/ 目录；在 scholar_s_study 中创建专注学习模式页面（含专注计时、学习队列、AI 建议等）
验证结果: 目录结构与其他模块对齐，页面风格与设计系统一致

---


## BUG-002

状态:
DONE

等级:
严重

模块:
stitch_cram_engine — 设置页面（多模型管理 / 设置与导出）

问题:
settings_export_cram_engine_cn/code.html 和 settings_multi_model_management_cram_engine_cn/code.html 的内容几乎完全相同。两者都包含设置视图（AI 模型选择、连接配置、Temperature 滑块）和导出视图（项目摘要、导出格式选择、最近导出列表）。但根据目录命名，前者应为"设置与导出"页面，后者应为"多模型管理"页面——后者的实际内容与目录名称不符，疑似复制后未替换。

复现步骤:

1. 打开 settings_export_cram_engine_cn/code.html
2. 打开 settings_multi_model_management_cram_engine_cn/code.html
3. 对比两者内容

实际结果:

两个文件结构高度一致，都包含设置+导出两个 section

期望结果:

settings_multi_model_management_cram_engine_cn 应专注于多模型服务商管理（添加/删除服务商、管理模型列表），与 settings_export_cram_engine_cn 有明显差异

涉及文件:

review/stitch_cram_engine/settings_export_cram_engine_cn/code.html
review/stitch_cram_engine/settings_multi_model_management_cram_engine_cn/code.html

修复记录:

修复时间: 2026年
修改文件:
  - review/stitch_cram_engine/settings_multi_model_management_cram_engine_cn/code.html（完全重写）
修复方案: 将 settings_multi_model_management_cram_engine_cn 重写为独立的多模型管理页面，包含：服务商列表（OpenAI/Anthropic/Ollama）、每服务商的模型管理、API 密钥配置、连接测试、全局默认设置
验证结果: 两个页面现在内容完全不同，各司其职

---


## BUG-003

状态:
DONE

等级:
一般

模块:
stitch_cram_engine — HTML 静态页面

问题:
部分 HTML 页面在 head 中重复加载了 Material Symbols 的 Google Fonts CSS，同一资源被请求两次。

复现步骤:

1. 打开 settings_export_cram_engine/code.html 或 workbench_knowledge_structuring_cram_engine_cn/code.html
2. 查看 head 中的 link 标签

实际结果:

同一 Material Symbols CSS 出现两条完全相同的 link 标签

期望结果:

Material Symbols CSS 只加载一次

涉及文件:

review/stitch_cram_engine/settings_export_cram_engine/code.html
review/stitch_cram_engine/workbench_knowledge_structuring_cram_engine_cn/code.html

修复记录:

修复时间: 2026年
修改文件:
  - review/stitch_cram_engine/settings_export_cram_engine/code.html（删除重复 link）
  - review/stitch_cram_engine/workbench_knowledge_structuring_cram_engine_cn/code.html（删除重复 link）
修复方案: 去重——保留第一条 Material Symbols link 标签，删除第二条完全相同的引用
验证结果: 两个文件中 Material Symbols CSS 均只出现一次

---


## BUG-004

状态:
DONE

等级:
一般

模块:
cram-engine-main — SKILL.md 配置创建流程

问题:
SKILL.md 阶段3 出题策略规定"must_know 为空时，全部考点按 key_point 处理"，但未处理 must_know 和 key_points 均为空的情况。用户在配置创建流程的步骤⑤中不输入任何知识点时，引擎会进入阶段1尝试拆解空列表，后续阶段2无内容可讲、阶段3无题可出，行为完全未定义。

复现步骤:

1. 创建课程配置时，在步骤⑤"列出要考的知识点"处不输入任何内容
2. 步骤⑥"哪些是老师反复强调的"回答"没有"
3. 步骤⑦"自己觉得需要重点掌握的"回车跳过
4. 执行 /cram 课程名 start

实际结果:

引擎进入阶段1尝试拆解空知识点列表，后续流程无意义

期望结果:

引擎在配置创建阶段检测到空知识点列表，给出明确提示"至少需要一个知识点才能开始"，要求用户重新输入

涉及文件:

review/cram-engine-main/SKILL.md

修复记录:

修复时间: 2026年
修改文件:
  - review/cram-engine-main/SKILL.md（配置创建流程步骤⑤后增加校验提示）
修复方案: 在步骤⑤之后增加校验规则——如果用户未输入任何知识点就回车跳过，提示"至少需要一个知识点才能开始。请列出要考的知识点，每行一个。"，不允许空列表进入下一步
验证结果: SKILL.md 中已包含空知识点校验指令

---


## BUG-005

状态:
DONE

等级:
一般

模块:
cram-engine-main — SKILL.md 阶段2→阶段3 流转逻辑

问题:
阶段2 规定用户说"跳过"时停止讲授、直接进入阶段3，同时强调"跳过的知识点在阶段3中仍按原有分级策略抽样出题"。但如果用户跳过了大量 key_points 的讲授，这些点用户从未学过却被纳入阶段3出题范围，考试毫无意义。存在"跳过讲授但不跳过考试"的逻辑矛盾。

复现步骤:

1. 课程配置中有 3 个 must_know + 10 个 key_points
2. 阶段2讲完所有 must_know 后，用户说"跳过"剩余 key_points
3. 阶段3对 10 个未学过的 key_points 出题

实际结果:

用户被考到从未学过的知识点

期望结果:

阶段3出题前按进度文件中阶段2的完成状态过滤——只有标记为 [x] 的点才纳入出题范围。跳过的点走独立路径（retry 或阶段4补漏）

涉及文件:

review/cram-engine-main/SKILL.md

修复记录:

修复时间: 2026年
修改文件:
  - review/cram-engine-main/SKILL.md（阶段2 pacing 描述 + 阶段3增加出题前过滤步骤）
修复方案:
  (1) 阶段2 pacing: 将"跳过的知识点在阶段3仍按分级策略出题"改为"跳过的知识点（阶段2未标记 [x] 的点）在阶段3中不纳入出题范围，可通过 /cram retry 或阶段4补漏单独处理"
  (2) 阶段3: 在出题策略之前新增"出题前过滤"步骤——读取进度文件，仅对阶段2中已标记为 [x] 的知识点出题
验证结果: 跳过逻辑不再矛盾，阶段3仅对已讲授知识点出题

---


## BUG-006

状态:
DONE

等级:
一般

模块:
cram-engine-main — SKILL.md retry 命令

问题:
/cram retry 命令规定"结果追加到进度文件，不覆盖原记录"。同一知识点多次 retry 后，进度文件中会出现多条不同状态的记录，resume 时无法确定以哪条为准。

复现步骤:

1. 对同一知识点执行 /cram retry 3 次
2. 查看进度文件

实际结果:

同一知识点出现多条记录（已纠正 / 顽固点 / 顽固点 / 已纠正），resume 时状态混乱

期望结果:

retry 按知识点名称去重，更新而非追加最新状态，同时保留历史记录在折叠区块中

涉及文件:

review/cram-engine-main/SKILL.md

修复记录:

修复时间: 2026年
修改文件:
  - review/cram-engine-main/SKILL.md（命令表中 retry 命令描述）
修复方案: 将 retry 命令描述从"结果追加到进度文件，不覆盖原记录"改为"结果按知识点名称更新进度文件中的对应记录（保留历史在折叠区块中）"
验证结果: 命令表已更新，明确了去重和更新策略

---


## BUG-007

状态:
DONE

等级:
一般

模块:
cram-engine-main — SKILL.md 命令表

问题:
阶段4将二次错误的知识点标记为"顽固点"并建议"明天再攻"，但命令表中没有针对顽固点的批量复习命令。用户只能逐个使用 /cram retry，无法一次性列出并重攻所有顽固点。

复现步骤:

1. 完成阶段4，有 3 个知识点被标记为顽固点
2. 第二天想复习这些顽固点
3. 查看 /cram 可用命令

实际结果:

没有针对顽固点的批量复习命令

期望结果:

应有命令（如 /cram 课程名 stubborn）专门列出所有顽固点并逐个执行微型闭环

涉及文件:

review/cram-engine-main/SKILL.md

修复记录:

修复时间: 2026年
修改文件:
  - review/cram-engine-main/SKILL.md（命令表新增 stubborn 命令）
修复方案: 在命令表中新增 `/cram <课程名> stubborn` 命令——列出所有顽固点，逐个执行微型闭环（重讲→重测→补漏），专门用于第二天集中攻克顽固点
验证结果: 命令表已包含 stubborn 命令

---


## BUG-008

状态:
DONE

等级:
一般

模块:
cram-engine-main — 文档一致性

问题:
SKILL.md 阶段4 规定 must_know 答错额外多出 3 道新题，但 stages/stage4-remediate.md 中额外要求"确保至少两轮全对才算过关"。"两轮全对"的条件在 SKILL.md 中未体现，两份文档的规则描述不一致。

复现步骤:

1. 打开 SKILL.md 阶段4段落
2. 打开 stages/stage4-remediate.md "重测额外规则"段落
3. 对比两者描述

实际结果:

SKILL.md 只说多出3道题，stage4-remediate.md 多了"至少两轮全对"的约束

期望结果:

两份文档对同一规则的描述完全一致

涉及文件:

review/cram-engine-main/SKILL.md
review/cram-engine-main/stages/stage4-remediate.md

修复记录:

修复时间: 2026年
修改文件:
  - review/cram-engine-main/SKILL.md（阶段4 must_know 重测规则）
修复方案: 在 SKILL.md 阶段4 第4条后追加"确保至少两轮全对才算过关"，与 stage4-remediate.md 保持一致
验证结果: 两份文档的重测规则描述现已一致

---


## BUG-009

状态:
DONE

等级:
建议

模块:
stitch_cram_engine — 所有 HTML 页面

问题:
每个 code.html 文件都包含一份几乎完全相同的 Tailwind 主题配置（约 100 行），定义相同的颜色、字体、间距。13 个文件累计约 1300 行重复代码。任何设计 token 的修改需要同步更新所有文件，维护成本极高。

复现步骤:

1. 打开任意两个不同的 code.html 文件
2. 对比 script id="tailwind-config" 块内容

实际结果:

Tailwind 配置几乎完全相同，仅个别文件的颜色排列顺序不同

期望结果:

抽取公共 Tailwind 配置为独立文件（如 shared/theme.js），各页面通过 script src 引用

涉及文件:

review/stitch_cram_engine/*/code.html（全部 13 个文件）

修复记录:

修复时间: 2026年
修改文件:
  - review/stitch_cram_engine/shared/theme.js（新建，包含完整的 Tailwind 配置）
修复方案: 创建共享主题文件 shared/theme.js，包含统一的设计 token（颜色、圆角、间距、字体、字号）。批量迁移 13 个 HTML 页面，将内联 tailwind-config 块替换为 shared/theme.js 引用
迁移完成: 全部 13 个文件已成功替换，设计 token 现在由单一文件管理
验证结果: home_cram_engine_cn/code.html 已验证——引用 shared/theme.js 正确，无旧内联配置残留

---


## BUG-010

状态:
TODO

等级:
建议

模块:
stitch_cram_engine — 所有 HTML 页面

问题:
所有 HTML 页面的样式和图标完全依赖 CDN 外部资源（cdn.tailwindcss.com、fonts.googleapis.com）。在无网络环境下页面将丢失全部样式和图标，完全不可用。对于标注为 Electron 桌面应用的项目，离线可用是基本要求。

复现步骤:

1. 断开网络连接
2. 用浏览器打开任意 code.html 文件

实际结果:

无样式、无图标，所有 Material Symbols 显示为空白，页面无法正常使用

期望结果:

核心 CSS 和字体资源本地化打包，或提供离线回退方案

涉及文件:

review/stitch_cram_engine/*/code.html（全部 13 个文件）

修复记录:

状态标记: 需求问题
说明: CDN 离线回退方案取决于项目的最终构建策略（是否使用 Electron 打包、是否引入 Vite/Webpack 构建系统）。这属于架构决策而非代码缺陷，需产品/架构确认方案后执行。
建议: 待项目确定构建工具链（Vite/Webpack）后，将 Tailwind CSS 和字体通过 npm 本地安装，Material Symbols 使用本地字体文件

---


## BUG-011

状态:
DONE

等级:
建议

模块:
cram-engine-main — 配置文件

问题:
configs/example.yaml 填充了具体课程数据（组织行为学、霍桑实验等），而非带注释的空白模板。想手动创建配置的用户需自行推断哪些是占位符、哪些是示例值。

复现步骤:

1. 打开 configs/example.yaml
2. 尝试理解每个字段的含义和填写方式

实际结果:

看到的是具体示例数据，无字段说明

期望结果:

同时提供 template.yaml（带注释的空白模板）和 example.yaml（完整示例）

涉及文件:

review/cram-engine-main/configs/example.yaml

修复记录:

修复时间: 2026年
修改文件:
  - review/cram-engine-main/configs/template.yaml（新建，带中文注释的空白模板）
修复方案: 创建 template.yaml，包含所有必填字段的中文注释说明、默认 prefrences 值、可选字段的取消注释指引
验证结果: 用户现在有两个参考文件——example.yaml（完整示例）+ template.yaml（空白模板+注释）

---


## BUG-012

状态:
DONE

等级:
建议

模块:
cram-engine-main — 进度文件

问题:
进度文件由 AI 在运行时手写 Markdown 生成，无 schema 定义、无 parser 校验。如果 AI 写入格式异常（如漏了标题标记或任务列表语法错误），resume 时可能导致解析失败或状态误判。

复现步骤:

1. 手动在进度文件中制造格式错误（如 - [x] 前漏了 -）
2. 执行 /cram 课程名 resume

实际结果:

AI 可能误判进度状态，跳过或重复某些知识点

期望结果:

resume 时应先校验进度文件结构（检查必需段落是否存在、任务列表格式是否正确），异常时给出提示

涉及文件:

review/cram-engine-main/SKILL.md

修复记录:

修复时间: 2026年
修改文件:
  - review/cram-engine-main/SKILL.md（新增"恢复时的进度文件校验"章节）
修复方案: 在交互风格章节后新增校验流程——resume 时检查必需段落（状态、阶段1-4、顽固点）是否存在，检查阶段2任务列表格式是否正确，异常时输出具体问题并询问是否自动修复
验证结果: SKILL.md 中已包含完整的 resume 校验步骤

---


## BUG-013

状态:
TODO

等级:
建议

模块:
stitch_cram_engine — 设置页面

问题:
API 密钥输入框使用 type="password" + 切换按钮展示/隐藏，但实际密钥将明文存储在 YAML 配置文件中。UI 原型暗示了密钥在客户端明文存储和传输的模式，存在安全隐患。

复现步骤:

1. 打开设置页面
2. 点击眼睛图标切换密码可见性
3. 检查 YAML 配置文件中的 API 密钥字段

实际结果:

密钥可通过 UI 切换为明文显示，配置文件中为明文存储

期望结果:

API 密钥应使用系统密钥链或加密存储，UI 中不应显示完整密钥

涉及文件:

review/stitch_cram_engine/settings_export_cram_engine_cn/code.html

修复记录:

状态标记: 需求问题
说明: API 密钥的安全存储方案取决于项目的最终运行环境（Electron 桌面应用 vs 纯 Web）。Electron 环境下可使用系统密钥链（Windows Credential Manager / macOS Keychain），纯 Web 环境需服务端代理。当前为 UI 原型阶段，安全方案需产品/架构确认后实施。
建议: Electron 环境使用 keytar 或 electron-store 加密存储；纯 Web 环境密钥仅存储在服务端，前端不展示

---
