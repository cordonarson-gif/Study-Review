# Study-Review

基于 Claude Code 的复习学习助手 — 利用 CRAM Engine 进行知识点系统化复习与回顾。

## 项目简介

Study-Review 是一套面向学生的 AI 驱动复习工具集，基于 Claude Code 的 Skills 生态和 CRAM Engine 框架构建。它帮助你：

- 📚 **系统化整理知识点** — 将零散的学习材料转化为结构化的知识体系
- 🧠 **智能复习计划** — 基于遗忘曲线自动安排复习节奏
- 📝 **题库管理** — 创建、管理和练习自定义题库
- 🌐 **多模型支持** — 支持切换不同的 AI 模型进行学习辅助
- 📤 **导出功能** — 支持导出学习资料和复习进度

## 项目结构

```
Study-Review/
├── cram-engine-main/          # CRAM Engine 核心框架
│   ├── SKILL.md               # 技能定义文件
│   ├── design-spec.md         # 设计规范
│   ├── configs/               # 配置文件
│   ├── stages/                # 学习阶段定义
│   ├── progress/              # 学习进度追踪
│   ├── assets/                # 资源文件
│   └── desktop/               # 桌面应用
├── stitch_cram_engine/        # 缝合版 CRAM Engine 组件
│   ├── workbench_cram_engine/         # 工作台 - 英文版
│   ├── workbench_cram_engine_cn/      # 工作台 - 中文版
│   ├── home_cram_engine_cn/           # 首页 - 中文版
│   ├── scholar_s_study/               # 学者学习模式
│   ├── settings_export_cram_engine/   # 导出设置
│   ├── settings_multi_model_management/ # 多模型管理
│   └── ...                            # 其他功能模块
└── .claude/                   # Claude Code 配置
```

## 快速开始

1. 确保已安装 [Claude Code](https://claude.ai/code)
2. 克隆本仓库：
   ```bash
   git clone https://github.com/cordonarson-gif/Study-Review.git
   ```
3. 在 Claude Code 中加载对应的 Skill 即可使用

## 技术栈

- **Claude Code Skills** — 技能系统
- **CRAM Engine** — 复习引擎框架
- **Electron** — 桌面应用（desktop/）
- **YAML** — 配置文件格式

## 许可

详见 [LICENSE](cram-engine-main/LICENSE)
