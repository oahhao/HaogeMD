---
name: git-workflow-manager
description: Git 分支管理、提交规范、合并策略指导。确保 Git 操作安全、合规、可追溯。在用户提及 commit/branch/merge/PR 等关键词，或准备执行危险 Git 操作时触发。
---

# Git 工作流管理

## 描述

提供 Git 工作流管理指导，确保分支命名、提交信息、合并策略符合 Conventional Commits 规范，所有危险操作必须获得用户确认。

## 使用场景

### 触发条件

- 用户提及 Git 相关关键词（commit、branch、merge、rebase、PR、push、pull）
- 询问分支命名或提交信息写法
- 遇到 Git 错误需要帮助解决
- 准备执行危险操作（force push、删除分支、reset --hard）
- 完成代码变更准备提交时

### 不适用场景

- 纯代码编写（不涉及 Git 操作）
- 文件内容编辑或格式化
- 项目架构讨论（不涉及版本控制）

## 指令

### 核心原则

1. **安全第一**：所有危险操作必须获得用户明确确认后才执行
2. **可追溯**：每个提交必须有清晰的提交信息，禁止空信息提交
3. **最小干预**：不修改用户未请求的代码或文件

### 分支管理

- 禁止直接在 main 分支开发
- 从最新 main 分支创建功能分支
- 分支命名格式：`<type>/<description>`（type: feature/fix/docs/refactor/test/chore）

### 提交规范

- 遵循 Conventional Commits 格式：`<type>(<scope>): <description>`
- 使用祈使语气，首字母小写，结尾不加句号
- 标题不超过 50 字符
- 破坏性变更必须在提交信息中标注 `BREAKING CHANGE`

### 合并策略

- 优先使用 Squash and merge
- 合并前确保分支同步到最新 main

### 危险操作（必须二次确认）

以下操作必须向用户明确说明影响，获得确认后才执行：

- `git push --force`
- `git branch -D`
- `git reset --hard`
- `git rebase -i`（修改历史）
- 删除未提交的变更

### 执行流程

```
1. 确认当前分支状态（git status / git branch）
2. 根据任务确定操作类型
3. 执行操作前告知用户将要做什么
4. 危险操作：等待用户确认
5. 执行操作
6. 输出操作结果
```

## 示例

### 输入

```
帮我提交这些改动
```

### 输出

```
**操作**：git commit
**分支**：feature/user-login
**变更文件**：3 个

**建议提交信息**：
feat(auth): add JWT token validation

确认提交吗？
```
