# Stack Forge

> Claude Code 工作流编排引擎。组合社区插件，形成统一的开发工作流。

## 简介

Stack Forge 自动发现你已安装的 Claude Code 插件（Superpowers、OpenSpec、gstack 等），生成编排工作流，将它们串联起来自动执行。

## 快速开始

```bash
# 安装
npm install -g cforge

# 在项目中初始化
cforge init

# 启动工作流
# 在 Claude Code 中执行：
/workflow feature "添加用户认证"
```

## 工作原理

1. `cforge init` 扫描系统中已安装的插件
2. 生成编排 Skill + 各阶段 Stage Skill
3. `/workflow` 触发编排 Skill
4. 编排 Skill 自动 fork 子 Agent 执行每个阶段
5. 阶段流程：Brainstorm → Spec → Plan → Build → Review → Release

## 命令

| 命令 | 说明 |
|---------|-------------|
| `cforge init` | 在当前项目中初始化 Stack Forge |
| `cforge status` | 查看当前工作流状态 |
| `cforge update` | 重新扫描 Provider 并更新配置 |
| `cforge generate` | 重新生成所有配置文件 |

## 支持的 Provider

| 能力 | 默认 Provider |
|------------|-----------------|
| 头脑风暴 (Brainstorm) | Superpowers |
| 规格说明 (Specification) | OpenSpec |
| 计划 (Planning) | Superpowers |
| 实现 (Implementation) | 内置 |
| 代码审查 (Review) | gstack |
| 发布 (Release) | gstack |
| 记忆 (Memory) | claude-mem |

## 架构

```
cforge CLI
  ├── Provider 发现 (扫描已安装插件)
  ├── 配置生成器 (生成 Skill、Command、CLAUDE.md)
  └── 状态管理 (state.json)

Claude Code 运行时
  ├── 编排 Skill (状态机 + fork 子 Agent)
  │   └── 阶段 Skills (context: fork 隔离)
  └── Provider 委托
      ├── Superpowers (头脑风暴、计划)
      ├── OpenSpec (规格说明)
      └── gstack (代码审查、发布)
```

## 许可证

MIT