# Stack Forge

> Claude Code 工作流编排引擎。组合社区插件，形成统一的开发工作流。

## 简介

Stack Forge 自动发现你已安装的 Claude Code 插件（Superpowers、feature-dev、code-review 等），生成编排工作流，将它们串联起来自动执行。包含健康检查机制，确保 Provider 在工作流启动前正常工作。

## 快速开始

```bash
# 安装
npm install -g cforge

# 初始化（零配置）
cforge init

# 启动工作流
cforge                    # 默认：feature
cforge feature "添加认证"  # 显式指定
cforge bugfix "修复登录"  # 显式指定
```

## 工作原理

1. `cforge init` 扫描系统中已安装的插件
2. 自动安装缺失的必要 Provider
3. 运行健康检查验证 Provider 是否正常工作
4. 生成编排 Skill + 各阶段 Stage Skill
5. `cforge` 触发编排 Skill
6. 编排 Skill 自动 fork 子 Agent 执行每个阶段
7. 阶段流程：Brainstorm → Spec → Plan → Build → Review → Release
8. **实现阶段**支持并行执行独立任务

## 并行实现

实现阶段自动检测独立任务并并行执行：

```markdown
# tasks.md 示例
- [ ] Task 1: 修改 src/discovery/scanner.ts
- [ ] Task 2: 修改 src/generator/templates.ts
- [ ] Task 3: 修改 src/cli/generate.ts
- [ ] Task 4: 修改 src/discovery/scanner.ts（依赖 Task 1）
```

**自动分组：**
- Task 1, 2, 3 → Batch 1（并行，无文件冲突）
- Task 4 → Batch 2（串行，依赖 Task 1）

**优势：**
- 独立任务执行速度提升 3 倍
- 自动冲突检测
- 每个任务遵循 TDD 工作流
- 结束时运行完整测试套件验证

## 命令

| 命令 | 说明 |
|---------|-------------|
| `cforge init` | 初始化 Stack Forge（零配置） |
| `cforge [workflow] [desc]` | 启动或继续工作流 |
| `cforge status` | 查看当前工作流状态 |
| `cforge healthcheck` | 检查已安装 Provider 的健康状态 |
| `cforge update` | 重新扫描 Provider 并更新配置 |
| `cforge generate` | 重新生成所有配置文件 |
| `cforge validate` | 验证实现是否符合规格要求 |

## 调试模式

设置环境变量启用详细日志：

```bash
CFORGE_LOG_LEVEL=debug cforge <command>
```

## 支持的 Provider

| 能力 | 默认 Provider |
|------------|-----------------|
| 头脑风暴 (Brainstorm) | Superpowers |
| 规格说明 (Specification) | feature-dev |
| 计划 (Planning) | Superpowers |
| 实现 (Implementation) | 内置 |
| 代码审查 (Review) | code-review |
| 发布 (Release) | gstack |
| 记忆 (Memory) | claude-mem |

## 架构

```
cforge CLI
  ├── Provider 发现 (扫描已安装插件)
  ├── 健康检查 (验证 Provider)
  ├── 配置生成器 (生成 Skill、Command、CLAUDE.md)
  ├── Schema 验证 (Zod)
  └── 状态管理 (state.json + 备份恢复)

Claude Code 运行时
  ├── 编排 Skill (状态机 + fork 子 Agent)
  │   └── 阶段 Skills (context: fork 隔离)
  └── Provider 委托
      ├── Superpowers (头脑风暴、计划)
      ├── feature-dev (规格说明)
      ├── code-review (代码审查)
      └── gstack (发布)
```

## 许可证

MIT