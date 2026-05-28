---
alwaysApply: false
description: 
scene: git_message
---
# Git 提交信息规范

## 格式要求

提交信息必须遵循 Conventional Commits 风格。

推荐格式：

```text
<type>(<scope>): <description>
```

当没有明确 scope 时，可以省略：

```text
<type>: <description>
```

## Type 类型

只允许使用以下类型：

- `feat`：新增功能
- `fix`：修复 bug
- `docs`：文档变更
- `style`：代码格式调整，不影响代码行为
- `refactor`：代码重构，既不是新增功能，也不是 bug 修复
- `test`：添加或修改测试
- `chore`：构建流程、依赖、配置或辅助工具变更

## Scope 范围

- scope 可选，不要为了凑格式强行添加
- scope 应使用能表示变更范围的简短英文标识
- 常见示例：`auth`、`ui`、`api`、`core`、`config`、`docs`、`deps`
- 多个 scope 只在确有必要时使用，避免过度复杂

示例：

```text
feat(auth): 添加登录状态校验
fix(ui): 修复侧边栏折叠动画异常
docs(readme): 更新安装说明
```

## Description 描述

- 描述必须简洁说明“做了什么”
- 中文项目优先使用中文描述
- 描述必须以动词开头
- 结尾不加句号
- 标题建议不超过 50 个字符
- 不写模糊描述，例如 `update code`、`fix bug`、`修改`

推荐：

```text
feat: 添加视频下载并发控制
fix(auth): 修复 token 过期后未跳转登录页的问题
docs: 更新 Tauri 开发环境说明
refactor(core): 拆分任务调度逻辑
test(api): 添加用户登录接口测试
chore(deps): 更新 Tauri 相关依赖
```

不推荐：

```text
update code
fix bug
修改
feat: update
chore: some changes
```

## 破坏性变更

如果提交包含破坏性变更，必须在正文中使用 `BREAKING CHANGE:` 明确说明影响范围和迁移方式。

```text
feat(api): 移除旧版用户查询接口

BREAKING CHANGE: getUser 接口已移除，请改用 fetchUser。
```

## 多行提交信息

当单行标题不足以说明变更时，可以使用多行提交信息。

```text
feat(auth): 添加 OAuth2 登录支持

- 添加 Google OAuth provider
- 添加 GitHub OAuth provider
- 更新用户 session 管理
- 添加 token refresh 机制

Closes #123
```

## 生成提交信息时的要求

- 必须根据实际 diff 生成提交信息，不得虚构未发生的变更
- 一个提交信息只描述本次 diff 中的主要变更
- 如果 diff 涉及多个无关变更，应提醒用户拆分提交
- 不得把测试结果、构建结果或 issue 编号写入提交信息，除非 diff 或上下文中明确提供
- 不得生成过于宽泛的描述，例如 `chore: update files`
