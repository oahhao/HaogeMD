---
alwaysApply: false
globs: ["*.rs", "Cargo.toml", "src-tauri/**/*", "*.ts", "*.tsx", "src/**/*"]
description: "当修改 Tauri 2、Rust、TypeScript、React 或前后端 IPC 数据结构时触发"
---

# Tauri 2 + React 跨语言开发约束

> 本规则用于 Tauri 2 + React 项目的跨语言开发，重点约束 Rust 后端、TypeScript/React 前端、Tauri IPC 和跨端数据一致性。

## Rust 侧约束

- 严禁滥用 `unwrap()`、`expect()` 和 panic 处理业务错误
- 可恢复错误必须使用 `Result<T, E>`，可缺省值必须使用 `Option<T>`
- 优先使用 `?` 操作符传播错误
- 错误类型必须能被上层转换为前端可理解的信息
- Tauri Command 必须保持薄层，只做参数接收、状态提取、权限检查和结果返回
- 复杂业务逻辑必须下沉到 Service、Repository 或独立模块
- CPU 密集型任务应使用合适的并发方案，例如 Rayon
- 数据库写入必须避免多线程抢占写锁，必要时通过队列或单写线程汇总
- 耗时任务必须异步执行，并通过 Tauri Event 或状态查询向前端反馈进度
- 不得阻塞 UI 线程或 Tauri 主事件循环

## TypeScript / React 侧约束

- 严禁滥用 `any`
- 对跨端数据、接口返回值、组件 props、hook 返回值必须定义明确类型
- 页面组件不得直接调用底层 API 或 Tauri `invoke`
- 推荐调用链为：页面组件 → business hooks → core hooks → Tauri invoke
- UI 组件保持纯展示职责，不承载业务编排逻辑
- 业务逻辑不得下沉到样式组件或展示组件中
- 长列表必须评估虚拟滚动、分页或懒加载方案
- 修改样式时优先保持现有设计体系一致，不擅自引入新的视觉风格
- 大范围类型报错时，优先定位类型边界问题，不顺手改动业务核心逻辑

## IPC 与跨端数据传输

- Rust 与 TypeScript 之间传输的数据必须有明确结构
- 前后端字段命名映射必须清晰，不得依赖隐式约定
- IPC 单次传输不得超过 1000 条记录
- 大数据列表必须使用分页、游标、无限滚动或分批传输
- IPC 错误必须有稳定结构，前端不得只依赖字符串匹配判断错误类型

## 变量命名一致性

跨语言业务逻辑中的核心变量名必须保持语义一致。

| Rust 后端    | TypeScript 前端 |
| ------------ | --------------- |
| `user_id`    | `userId`        |
| `created_at` | `createdAt`     |
| `updated_at` | `updatedAt`     |
| `is_enabled` | `isEnabled`     |

字段映射必须显式、稳定、可搜索，避免同一概念出现多个命名。

## 修改联动要求

- 修改 Rust 数据结构时，必须检查 TypeScript 类型定义和调用方
- 修改 TypeScript 类型时，必须检查 Rust 返回结构和 Tauri Command
- 修改 Tauri Command 参数或返回值时，必须同步检查前端 invoke 封装
- 修改数据库模型时，必须检查 API 返回结构、前端类型和展示逻辑
- 无法确认联动范围时，必须标注「需人工审查」
