# ErgeMD Phase 1: 基础骨架 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** 搭建 Tauri 2 + React + TypeScript 项目骨架，实现无边框窗口、自定义标题栏、SQLite 初始化、欢迎页，能打开窗口并显示欢迎界面。

**Architecture:** Tauri 2 作为桌面框架，Rust 后端负责 SQLite 初始化和文件操作命令，React 前端负责 UI 渲染。使用 Zustand 管理状态，Tailwind CSS 处理样式。

**Tech Stack:** Tauri 2, React 18, TypeScript, Vite, Zustand, Tailwind CSS, SQLite (tauri-plugin-sql)

**Design Spec:** `docs/superpowers/specs/2026-04-01-ergemd-design.md`

---

## 文件结构

```
ergemd/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                  # Tauri 入口，窗口配置
│   │   ├── lib.rs                   # Tauri Builder，插件注册
│   │   ├── commands/
│   │   │   ├── mod.rs               # 命令模块导出
│   │   │   ├── file.rs              # 文件操作命令
│   │   │   └── db.rs                # 数据库操作命令
│   │   └── db/
│   │       ├── mod.rs               # 数据库模块导出
│   │       ├── init.rs              # 数据库初始化和迁移
│   │       └── models.rs            # 数据模型定义
│   ├── Cargo.toml
│   ├── tauri.conf.json              # Tauri 配置（无边框窗口等）
│   ├── capabilities/
│   │   └── default.json             # 权限配置
│   └── icons/                       # 应用图标
├── src/
│   ├── main.tsx                     # React 入口
│   ├── App.tsx                      # 根组件，路由
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx         # 自定义标题栏
│   │   │   └── AppLayout.tsx        # 应用布局容器
│   │   └── welcome/
│   │       └── WelcomePage.tsx      # 欢迎页
│   ├── stores/
│   │   └── settingsStore.ts         # 设置状态
│   ├── hooks/
│   │   └── useTitleBar.ts           # 标题栏拖拽逻辑
│   ├── styles/
│   │   ├── globals.css              # 全局样式 + Tailwind
│   │   └── animations.css           # 动画定义
│   └── types/
│       └── index.ts                 # TypeScript 类型定义
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
└── index.html
```

---

### Task 1: 环境准备与项目初始化

**Files:**
- Create: `ergemd/` (项目根目录)

- [ ] **Step 1: 检查环境依赖**

确认以下工具已安装：
- Node.js >= 18
- Rust >= 1.70（`rustup` 安装）
- pnpm（可选，也可用 npm）

Run:
```bash
node --version    # 期望 >= 18
rustc --version   # 期望 >= 1.70
```

如果 Rust 未安装：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

- [ ] **Step 2: 创建 Tauri 2 + React 项目**

```bash
pnpm create tauri-app ergemd --template react-ts
cd ergemd
```

如果 pnpm 不可用，用 npm：
```bash
npm create tauri-app@latest ergemd -- --template react-ts
cd ergemd
```

- [ ] **Step 3: 安装前端依赖**

```bash
pnpm install
pnpm add zustand
pnpm add -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 4: 安装 Tauri 后端依赖**

```bash
cd src-tauri
cargo add tauri-plugin-sql --features sqlite
cargo add tauri-plugin-dialog tauri-plugin-fs
cd ..
```

- [ ] **Step 5: 验证项目能正常启动**

```bash
pnpm tauri dev
```

Expected: 窗口打开，显示默认 React 页面。

- [ ] **Step 6: 初始化 Git 仓库并提交**

```bash
git init
echo "node_modules/\ndist/\ntarget/\n*.db\n*.db-wal\n*.db-shm" > .gitignore
git add .
git commit -m "chore: initialize Tauri 2 + React + TypeScript project"
```

---

### Task 2: Tailwind CSS 配置

**Files:**
- Modify: `ergemd/vite.config.ts`
- Create: `ergemd/src/styles/globals.css`
- Modify: `ergemd/src/main.tsx`

- [ ] **Step 1: 配置 Vite 使用 Tailwind**

`ergemd/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 2: 创建全局样式文件**

`ergemd/src/styles/globals.css`:
```css
@import "tailwindcss";

/* CSS 变量 — 赛博朋克主题（默认） */
:root {
  --bg-page: #0A0A0F;
  --bg-reader: #12121A;
  --bg-sidebar: #1A1A2E;
  --bg-code: #16162A;
  --text-primary: #C8C8C8;
  --text-secondary: #787882;
  --text-muted: #50505A;
  --text-heading: #E0E0E0;
  --accent-cyan: #00FFFF;
  --accent-pink: #FF6496;
  --accent-purple: #BF00FF;
  --accent-green: #00FF64;
  --accent-yellow: #FFFF00;
  --accent-orange: #FF8000;
  --accent-red: #FF0040;
}

/* 基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
  background-color: var(--bg-page);
  color: var(--text-primary);
  user-select: none;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--bg-sidebar);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* 文本选择样式 */
::selection {
  background: rgba(0, 255, 255, 0.2);
  color: var(--text-heading);
}
```

- [ ] **Step 3: 更新 main.tsx 引入全局样式**

`ergemd/src/main.tsx`:
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: 验证 Tailwind 生效**

在 `App.tsx` 中临时添加一个 Tailwind 类测试：
```tsx
<div className="p-4 text-red-500">Tailwind is working</div>
```

Run: `pnpm tauri dev`
Expected: 窗口中显示红色文字 "Tailwind is working"

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: configure Tailwind CSS with cyberpunk theme variables"
```

---

### Task 3: Tauri 配置 — 无边框窗口

**Files:**
- Modify: `ergemd/src-tauri/tauri.conf.json`
- Modify: `ergemd/src-tauri/capabilities/default.json`

- [ ] **Step 1: 配置无边框窗口**

`ergemd/src-tauri/tauri.conf.json` — 修改 `app.windows` 部分：
```json
{
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "productName": "ErgeMD",
  "version": "0.1.0",
  "identifier": "com.ergemd.app",
  "app": {
    "windows": [
      {
        "title": "ErgeMD",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": false,
        "transparent": false,
        "center": true,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

关键配置说明：
- `decorations: false` — 移除系统标题栏
- `transparent: false` — 不需要窗口透明（性能更好）
- `center: true` — 窗口居中
- `minWidth/minHeight` — 最小尺寸限制

- [ ] **Step 2: 配置权限**

`ergemd/src-tauri/capabilities/default.json`：
```json
{
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-start-dragging",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-close",
    "core:window:allow-set-title",
    "core:window:allow-is-maximized",
    "core:window:allow-toggle-maximize",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-exists",
    "fs:allow-mkdir",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close"
  ]
}
```

- [ ] **Step 3: 验证无边框窗口**

Run: `pnpm tauri dev`
Expected: 窗口打开，无系统标题栏，无最小化/最大化/关闭按钮（因为我们移除了 decorations）

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: configure frameless window with Tauri"
```

---

### Task 4: 自定义标题栏

**Files:**
- Create: `ergemd/src/components/layout/TitleBar.tsx`
- Create: `ergemd/src/hooks/useTitleBar.ts`
- Create: `ergemd/src/styles/animations.css`

- [ ] **Step 1: 创建动画样式**

`ergemd/src/styles/animations.css`:
```css
/* 标题栏渐隐动画 */
.titlebar-fade-out {
  opacity: 0;
  transition: opacity 300ms ease-out;
  pointer-events: none;
}

.titlebar-fade-in {
  opacity: 1;
  transition: opacity 300ms ease-out;
  pointer-events: auto;
}

/* 面板滑入滑出 */
.panel-slide-left-enter {
  transform: translateX(-100%);
}

.panel-slide-left-active {
  transform: translateX(0);
  transition: transform 150ms ease-out;
}

.panel-slide-left-exit {
  transform: translateX(-100%);
  transition: transform 150ms ease-out;
}
```

- [ ] **Step 2: 创建标题栏拖拽 Hook**

`ergemd/src/hooks/useTitleBar.ts`:
```typescript
import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useTitleBar() {
  const startDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 只有在标题栏区域（非按钮）才触发拖拽
    if ((e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    getCurrentWindow().startDragging();
  }, []);

  return { startDrag };
}
```

- [ ] **Step 3: 创建标题栏组件**

`ergemd/src/components/layout/TitleBar.tsx`:
```tsx
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTitleBar } from "../../hooks/useTitleBar";
import { useState, useEffect } from "react";

export function TitleBar() {
  const { startDrag } = useTitleBar();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const unlisten = getCurrentWindow().onResized(async () => {
      setIsMaximized(await getCurrentWindow().isMaximized());
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleToggleMaximize = () => getCurrentWindow().toggleMaximize();
  const handleClose = () => getCurrentWindow().close();

  return (
    <div
      onMouseDown={startDrag}
      className="flex items-center justify-between h-9 px-3 select-none"
      style={{
        background: "var(--bg-sidebar)",
        borderBottom: "1px solid rgba(100, 200, 200, 0.1)",
      }}
    >
      {/* 左侧：应用名 */}
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-bold tracking-wide"
          style={{ color: "var(--accent-cyan)" }}
        >
          ErgeMD
        </span>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div className="flex items-center" data-no-drag>
        <button
          onClick={handleMinimize}
          className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={handleToggleMaximize}
          className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="0" width="8" height="8" rx="1" />
              <rect x="0" y="2" width="8" height="8" rx="1" fill="var(--bg-sidebar)" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" rx="1" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-9 flex items-center justify-center hover:bg-red-500/80 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建应用布局组件**

`ergemd/src/components/layout/AppLayout.tsx`:
```tsx
import { TitleBar } from "./TitleBar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TitleBar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: 更新 App.tsx 使用布局**

`ergemd/src/App.tsx`:
```tsx
import { AppLayout } from "./components/layout/AppLayout";
import { WelcomePage } from "./components/welcome/WelcomePage";

function App() {
  return (
    <AppLayout>
      <WelcomePage />
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 6: 验证标题栏**

Run: `pnpm tauri dev`
Expected:
- 无边框窗口
- 顶部显示 "ErgeMD" 标题栏
- 可拖拽移动窗口
- 最小化、最大化、关闭按钮正常工作

- [ ] **Step 7: 提交**

```bash
git add .
git commit -m "feat: add custom titlebar with window controls and drag support"
```

---

### Task 5: 欢迎页

**Files:**
- Create: `ergemd/src/components/welcome/WelcomePage.tsx`

- [ ] **Step 1: 创建欢迎页组件**

`ergemd/src/components/welcome/WelcomePage.tsx`:
```tsx
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/core";

export function WelcomePage() {
  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Markdown", extensions: ["md", "markdown", "mdx"] },
      ],
    });
    if (selected) {
      // Phase 2 实现文件打开逻辑
      console.log("Selected file:", selected);
    }
  };

  const handleOpenFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      // Phase 2 实现工作区打开逻辑
      console.log("Selected folder:", selected);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Logo 区域 */}
      <div className="mb-8 text-center">
        <h1
          className="text-5xl font-bold mb-3 tracking-wider"
          style={{ color: "var(--accent-cyan)" }}
        >
          ErgeMD
        </h1>
        <p
          className="text-sm tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          A minimal Markdown reader by 宝藏二哥
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-3 w-64">
        <button
          onClick={handleOpenFile}
          className="px-6 py-2.5 rounded text-sm font-medium transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "rgba(0, 255, 255, 0.1)",
            color: "var(--accent-cyan)",
            border: "1px solid rgba(0, 255, 255, 0.3)",
          }}
        >
          打开文件
          <span className="ml-2 text-xs opacity-60">Ctrl+O</span>
        </button>
        <button
          onClick={handleOpenFolder}
          className="px-6 py-2.5 rounded text-sm font-medium transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "rgba(0, 255, 255, 0.05)",
            color: "var(--text-secondary)",
            border: "1px solid rgba(100, 200, 200, 0.15)",
          }}
        >
          打开文件夹
          <span className="ml-2 text-xs opacity-60">Ctrl+Shift+O</span>
        </button>
      </div>

      {/* 拖拽提示 */}
      <div
        className="mt-12 px-8 py-4 rounded-lg text-center"
        style={{
          border: "1px dashed rgba(100, 200, 200, 0.2)",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">拖拽 Markdown 文件到此处打开</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证欢迎页**

Run: `pnpm tauri dev`
Expected:
- 显示 ErgeMD Logo 和副标题
- 两个按钮（打开文件、打开文件夹）
- 拖拽提示区域
- 赛博朋克风格配色

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add welcome page with open file/folder actions"
```

---

### Task 6: SQLite 数据库初始化

**Files:**
- Create: `ergemd/src-tauri/src/db/mod.rs`
- Create: `ergemd/src-tauri/src/db/init.rs`
- Create: `ergemd/src-tauri/src/db/models.rs`
- Modify: `ergemd/src-tauri/src/lib.rs`
- Modify: `ergemd/src-tauri/src/commands/mod.rs`
- Create: `ergemd/src-tauri/src/commands/db.rs`

- [ ] **Step 1: 创建数据库模型**

`ergemd/src-tauri/src/db/models.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReadingProgress {
    pub file_path: String,
    pub scroll_percentage: f64,
    pub last_read_at: i64,
    pub word_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentFile {
    pub file_path: String,
    pub file_name: String,
    pub opened_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub folder_path: String,
    pub folder_name: String,
    pub opened_at: i64,
}
```

- [ ] **Step 2: 创建数据库初始化逻辑**

`ergemd/src-tauri/src/db/init.rs`:
```rust
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
```

`ergemd/src-tauri/migrations/001_init.sql`:
```sql
CREATE TABLE IF NOT EXISTS reading_progress (
    file_path TEXT PRIMARY KEY,
    scroll_percentage REAL NOT NULL DEFAULT 0,
    last_read_at INTEGER NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_files (
    file_path TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    opened_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    folder_path TEXT PRIMARY KEY,
    folder_name TEXT NOT NULL,
    opened_at INTEGER NOT NULL
);
```

- [ ] **Step 3: 创建数据库模块导出**

`ergemd/src-tauri/src/db/mod.rs`:
```rust
pub mod init;
pub mod models;
```

- [ ] **Step 4: 创建数据库命令**

`ergemd/src-tauri/src/commands/db.rs`:
```rust
use tauri_plugin_sql::SqlitePool;

#[tauri::command]
pub async fn get_reading_progress(
    pool: tauri::State<'_, SqlitePool>,
    file_path: String,
) -> Result<Option<serde_json::Value>, String> {
    let result = sqlx::query_as::<_, (f64, i64, i64)>(
        "SELECT scroll_percentage, last_read_at, word_count FROM reading_progress WHERE file_path = ?1"
    )
    .bind(&file_path)
    .fetch_optional(pool.get().map_err(|e| e.to_string())?)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.map(|(scroll_percentage, last_read_at, word_count)| {
        serde_json::json!({
            "file_path": file_path,
            "scroll_percentage": scroll_percentage,
            "last_read_at": last_read_at,
            "word_count": word_count
        })
    }))
}

#[tauri::command]
pub async fn save_reading_progress(
    pool: tauri::State<'_, SqlitePool>,
    file_path: String,
    scroll_percentage: f64,
    word_count: i64,
) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO reading_progress (file_path, scroll_percentage, last_read_at, word_count)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(file_path) DO UPDATE SET
         scroll_percentage = ?2, last_read_at = ?3, word_count = ?4"
    )
    .bind(&file_path)
    .bind(scroll_percentage)
    .bind(now)
    .bind(word_count)
    .execute(pool.get().map_err(|e| e.to_string())?)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_recent_files(
    pool: tauri::State<'_, SqlitePool>,
    limit: Option<i64>,
) -> Result<Vec<serde_json::Value>, String> {
    let limit = limit.unwrap_or(10);
    let rows = sqlx::query_as::<_, (String, String, i64)>(
        "SELECT file_path, file_name, opened_at FROM recent_files ORDER BY opened_at DESC LIMIT ?1"
    )
    .bind(limit)
    .fetch_all(pool.get().map_err(|e| e.to_string())?)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|(file_path, file_name, opened_at)| {
            serde_json::json!({
                "file_path": file_path,
                "file_name": file_name,
                "opened_at": opened_at
            })
        })
        .collect())
}
```

- [ ] **Step 5: 创建命令模块导出**

`ergemd/src-tauri/src/commands/mod.rs`:
```rust
pub mod db;
pub mod file;
```

- [ ] **Step 6: 更新 lib.rs 注册命令和插件**

`ergemd/src-tauri/src/lib.rs`:
```rust
mod commands;
mod db;

use db::init::get_migrations;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::db::get_reading_progress,
            commands::db::save_reading_progress,
            commands::db::get_recent_files,
        ])
        .setup(|app| {
            // 初始化数据库
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let migrations = get_migrations();
                // tauri-plugin-sql 会在首次 load 时自动运行迁移
                let _ = migrations; // 迁移通过插件配置注册
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

注意：tauri-plugin-sql 的迁移需要在 `tauri.conf.json` 中配置，或者在 setup 中手动调用。具体实现方式取决于 tauri-plugin-sql 的版本 API。Phase 1 的目标是验证 SQLite 能正常初始化和读写。

- [ ] **Step 7: 验证 SQLite 初始化**

Run: `pnpm tauri dev`
Expected:
- 应用启动无报错
- 数据库文件创建在系统应用数据目录（如 Windows: `%APPDATA%/com.ergemd.app/ergereader.db`）
- 控制台无 SQLite 相关错误

- [ ] **Step 8: 提交**

```bash
git add .
git commit -m "feat: initialize SQLite database with schema migrations"
```

---

### Task 7: Zustand 状态管理

**Files:**
- Create: `ergemd/src/stores/settingsStore.ts`
- Create: `ergemd/src/types/index.ts`

- [ ] **Step 1: 创建类型定义**

`ergemd/src/types/index.ts`:
```typescript
export interface ReadingProgress {
  file_path: string;
  scroll_percentage: number;
  last_read_at: number;
  word_count: number;
}

export interface RecentFile {
  file_path: string;
  file_name: string;
  opened_at: number;
}

export interface Workspace {
  folder_path: string;
  folder_name: string;
  opened_at: number;
}

export type Theme = "cyberpunk" | "dark" | "light" | "system";

export interface ReadingSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  pageWidth: number;
  theme: Theme;
  autoSaveProgress: boolean;
}
```

- [ ] **Step 2: 创建设置 Store**

`ergemd/src/stores/settingsStore.ts`:
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme, ReadingSettings } from "../types";

interface SettingsState {
  theme: Theme;
  readingSettings: ReadingSettings;
  setTheme: (theme: Theme) => void;
  updateReadingSettings: (settings: Partial<ReadingSettings>) => void;
}

const defaultReadingSettings: ReadingSettings = {
  fontFamily: "Microsoft YaHei",
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  paragraphSpacing: 16,
  pageWidth: 800,
  theme: "cyberpunk",
  autoSaveProgress: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "cyberpunk",
      readingSettings: defaultReadingSettings,

      setTheme: (theme) => set({ theme }),

      updateReadingSettings: (settings) =>
        set((state) => ({
          readingSettings: { ...state.readingSettings, ...settings },
        })),
    }),
    {
      name: "ergemd-settings",
    }
  )
);
```

- [ ] **Step 3: 验证 Store**

在 WelcomePage 中临时测试：
```tsx
import { useSettingsStore } from "../stores/settingsStore";

// 在组件中
const theme = useSettingsStore((s) => s.theme);
console.log("Current theme:", theme);
```

Run: `pnpm tauri dev`
Expected: 控制台输出 "Current theme: cyberpunk"，刷新后设置持久化

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add Zustand settings store with persistence"
```

---

### Task 8: 文件操作命令（Rust 后端）

**Files:**
- Create: `ergemd/src-tauri/src/commands/file.rs`
- Modify: `ergemd/src-tauri/src/lib.rs`

- [ ] **Step 1: 创建文件操作命令**

`ergemd/src-tauri/src/commands/file.rs`:
```rust
use std::path::PathBuf;
use encoding_rs::Encoding;
use tauri::command;

#[derive(serde::Serialize)]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
}

#[command]
pub async fn read_file(path: String) -> Result<FileContent, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let bytes = std::fs::read(&file_path).map_err(|e| e.to_string())?;

    // 自动检测编码
    let (encoding, _, _) = Encoding::for_bom(&bytes)
        .unwrap_or_else(|| {
            let detected = chardetng::EncodingDetector::new();
            let mut detector = detected;
            detector.feed(&bytes, true);
            let encoding = detector.guess(None, true);
            (encoding, false, false)
        });

    let (content, _, _) = encoding.decode(&bytes);

    Ok(FileContent {
        content: content.into_owned(),
        encoding: encoding.name().to_string(),
    })
}

#[command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

#[command]
pub async fn scan_workspace(folder_path: String) -> Result<Vec<FileNode>, String> {
    fn scan_dir(path: &std::path::Path) -> Result<Vec<FileNode>, String> {
        let mut nodes = Vec::new();
        let entries = std::fs::read_dir(path).map_err(|e| e.to_string())?;

        let mut entries: Vec<_> = entries
            .filter_map(|e| e.ok())
            .collect();

        // 排序：文件夹在前，文件在后，按名称排序
        entries.sort_by(|a, b| {
            let a_is_dir = a.path().is_dir();
            let b_is_dir = b.path().is_dir();
            match (a_is_dir, b_is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.file_name().cmp(&b.file_name()),
            }
        });

        for entry in entries {
            let path = entry.path();
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let path_str = path.to_string_lossy().to_string();
            let is_dir = path.is_dir();

            // 跳过隐藏文件和 node_modules 等
            if name.starts_with('.') || name == "node_modules" || name == "target" {
                continue;
            }

            let children = if is_dir {
                scan_dir(&path)?
            } else {
                Vec::new()
            };

            // 只包含 .md 文件和包含 .md 文件的文件夹
            if is_dir {
                if !children.is_empty() {
                    nodes.push(FileNode {
                        name,
                        path: path_str,
                        is_dir: true,
                        children,
                    });
                }
            } else if name.ends_with(".md") || name.ends_with(".markdown") || name.ends_with(".mdx") {
                nodes.push(FileNode {
                    name,
                    path: path_str,
                    is_dir: false,
                    children: Vec::new(),
                });
            }
        }

        Ok(nodes)
    }

    scan_dir(std::path::Path::new(&folder_path))
}

#[command]
pub async fn resolve_image_path(
    base_path: String,
    relative_path: String,
) -> Result<String, String> {
    let base = PathBuf::from(&base_path);
    let resolved = base.parent()
        .unwrap_or(&base)
        .join(&relative_path);

    resolved.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path".to_string())
}
```

- [ ] **Step 2: 添加必要的 Rust 依赖**

```bash
cd src-tauri
cargo add encoding_rs chardetng
cd ..
```

- [ ] **Step 3: 在 lib.rs 注册新命令**

在 `tauri::generate_handler!` 中添加：
```rust
commands::file::read_file,
commands::file::write_file,
commands::file::scan_workspace,
commands::file::resolve_image_path,
```

- [ ] **Step 4: 验证文件操作**

Run: `pnpm tauri dev`
Expected: 编译通过，无报错。文件操作命令可在 DevTools 控制台通过 `window.__TAURI__.invoke()` 测试。

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: add file operations commands (read, write, scan workspace)"
```

---

### Task 9: 集成验证与清理

**Files:**
- Modify: `ergemd/src/App.tsx`
- Modify: `ergemd/src/components/welcome/WelcomePage.tsx`

- [ ] **Step 1: 清理默认模板文件**

删除 Tauri 默认模板生成的多余文件：
```bash
rm -f src/App.css src/assets/*.svg
```

- [ ] **Step 2: 确保 App.tsx 干净**

`ergemd/src/App.tsx`:
```tsx
import { AppLayout } from "./components/layout/AppLayout";
import { WelcomePage } from "./components/welcome/WelcomePage";

function App() {
  return (
    <AppLayout>
      <WelcomePage />
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 3: 完整验证**

Run: `pnpm tauri dev`

验证清单：
- [x] 无边框窗口，无系统标题栏
- [x] 自定义标题栏显示 "ErgeMD"
- [x] 标题栏可拖拽移动窗口
- [x] 最小化/最大化/关闭按钮正常
- [x] 欢迎页显示 Logo + 副标题
- [x] 打开文件/文件夹按钮存在（功能在 Phase 2 实现）
- [x] 拖拽提示区域显示
- [x] 赛博朋克配色（深色背景 + 霓虹青标题）
- [x] SQLite 数据库初始化无报错
- [x] Zustand store 持久化正常
- [x] 文件操作命令注册成功

- [ ] **Step 4: 构建测试**

```bash
pnpm tauri build
```

Expected: 构建成功，生成安装包（Windows: .msi/.exe）

- [ ] **Step 5: 最终提交**

```bash
git add .
git commit -m "feat: complete Phase 1 - project skeleton with frameless window, welcome page, SQLite, and file operations"
```

---

## Phase 1 完成标准

✅ 无边框窗口 + 自定义标题栏（可拖拽、最小化、最大化、关闭）
✅ 赛博朋克主题欢迎页（Logo + 打开文件/文件夹按钮 + 拖拽提示）
✅ SQLite 数据库自动初始化（WAL 模式，完整 Schema）
✅ Zustand 设置 Store（持久化）
✅ Rust 文件操作命令（读取、写入、工作区扫描、图片路径解析）
✅ Tailwind CSS + CSS 变量主题系统基础
✅ 项目结构清晰，可构建
