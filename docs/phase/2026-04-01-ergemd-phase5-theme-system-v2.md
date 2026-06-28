# ErgeMD Phase 5: 主题系统 实施计划

> **v2 — 适配沉浸式全屏布局（Phase 3 Task 13）**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** 实现可定制的视觉体验。包括赛博朋克主题（默认，完整配色方案）、暗色主题（标准暗色）、亮色主题（浅色背景）、跟随系统（自动切换亮色/暗色）。阅读选项面板中可调整字体、字号、行距、间距、背景色、文字色。每个主题适配代码高亮配色。

**Architecture:** 主题系统基于 CSS 变量实现。每个主题定义一组 CSS 变量值，存储在独立的 CSS 文件中。切换主题时，通过 JavaScript 更新 `<html>` 元素的 `data-theme` 属性，CSS 变量自动切换。跟随系统模式使用 `window.matchMedia('(prefers-color-scheme: dark)')` 监听系统主题变化。代码高亮主题通过 rehype-pretty-code 的 `theme` 配置动态切换。

**Tech Stack:** CSS Variables, CSS `data-theme` attribute, `matchMedia` API, rehype-pretty-code, shiki

**Design Spec:** `docs/superpowers/specs/2026-04-01-ergemd-design.md`

**Tech Baseline:** `docs/superpowers/specs/2026-04-01-ergemd-tech-baseline.md`

***

## 文件结构

```
ergemd/
├── src/
│   ├── App.tsx                           # 修改：集成主题切换
│   ├── components/
│   │   ├── reader/
│   │   │   └── MarkdownView.tsx          # 修改：动态代码高亮主题
│   │   └── panels/
│   │       ├── ReadingOptions.tsx        # 修改：添加主题、字体、颜色选项
│   │       └── SettingsPanel.tsx         # 创建：设置面板（语言切换）
│   ├── stores/
│   │   └── settingsStore.ts              # 修改：添加主题切换逻辑
│   ├── hooks/
│   │   └── useTheme.ts                   # 创建：主题切换 Hook
│   ├── styles/
│   │   ├── globals.css                   # 修改：重构为 data-theme 架构
│   │   ├── themes/
│   │   │   ├── cyberpunk.css             # 创建：赛博朋克主题变量
│   │   │   ├── dark.css                  # 创建：暗色主题变量
│   │   │   └── light.css                 # 创建：亮色主题变量
│   │   └── markdown.css                  # 修改：适配多主题
│   └── i18n/
│       ├── index.ts                      # 创建：i18next 初始化
│       ├── zh-CN.json                    # 创建：中文翻译
│       └── en-US.json                    # 创建：英文翻译
```

***

### Task 1: 主题 CSS 文件 — 赛博朋克

**Files:**

- Create: `ergemd/src/styles/themes/cyberpunk.css `
- [ ] **Step 1: 创建赛博朋克主题 CSS**

`ergemd/src/styles/themes/cyberpunk.css`:

```css
/* ===== 赛博朋克主题（默认） ===== */
/* 霓虹色做点缀，优化色做内容，暗色做背景 */

[data-theme="cyberpunk"] {
  /* 背景层 */
  --bg-page: #0A0A0F;
  --bg-reader: #12121A;
  --bg-sidebar: #1A1A2E;
  --bg-code: #16162A;

  /* 正文层（护眼优先） */
  --text-primary: #C8C8C8;
  --text-secondary: #787882;
  --text-muted: #50505A;

  /* 标题层级 */
  --text-heading: #E0E0E0;
  --h2-color: #64C8C8;
  --h3-color: #B464C8;
  --h4-color: #C89650;

  /* 代码高亮 */
  --code-keyword: #B464C8;
  --code-string: #64B478;
  --code-number: #C89650;
  --code-comment: #50505A;
  --code-function: #6496C8;
  --code-text: #C8C8C8;

  /* 强调与交互（霓虹色点缀） */
  --accent-cyan: #00FFFF;
  --accent-pink: #FF6496;
  --accent-purple: #BF00FF;
  --accent-green: #00FF64;
  --accent-yellow: #FFFF00;
  --accent-orange: #FF8000;
  --accent-red: #FF0040;

  /* 交互状态 */
  --hover-bg: rgba(0, 255, 255, 0.1);
  --selected-bg: rgba(0, 255, 255, 0.15);
  --active-border: rgba(0, 255, 255, 0.3);
  --divider: rgba(100, 200, 200, 0.1);

  /* 滚动条 */
  --scrollbar-track: transparent;
  --scrollbar-thumb: #1A1A2E;
  --scrollbar-thumb-hover: #50505A;

  /* 选中文字 */
  --selection-bg: rgba(0, 255, 255, 0.2);
  --selection-text: #E0E0E0;

  /* 代码块语言标签 */
  --code-label: #FF8000;
  --copy-success: #00FF64;
  --search-highlight: rgba(255, 255, 0, 0.25);
  --search-highlight-active: rgba(255, 255, 0, 0.5);

  /* 阅读区背景层次 */
  --reader-bg-elevated: #16162A;
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add cyberpunk theme CSS variables"
```

***

### Task 2: 主题 CSS 文件 — 暗色

**Files:**

- Create: `ergemd/src/styles/themes/dark.css`
- [ ] **Step 1: 创建暗色主题 CSS**

`ergemd/src/styles/themes/dark.css`:

```css
/* ===== 暗色主题（标准暗色） ===== */

[data-theme="dark"] {
  /* 背景层 */
  --bg-page: #1E1E1E;
  --bg-reader: #252526;
  --bg-sidebar: #2D2D30;
  --bg-code: #1E1E1E;

  /* 正文层 */
  --text-primary: #D4D4D4;
  --text-secondary: #808080;
  --text-muted: #5A5A5A;

  /* 标题层级 */
  --text-heading: #E8E8E8;
  --h2-color: #569CD6;
  --h3-color: #DCDCAA;
  --h4-color: #CE9178;

  /* 代码高亮 */
  --code-keyword: #569CD6;
  --code-string: #CE9178;
  --code-number: #B5CEA8;
  --code-comment: #6A9955;
  --code-function: #DCDCAA;
  --code-text: #D4D4D4;

  /* 强调与交互 */
  --accent-cyan: #569CD6;
  --accent-pink: #C586C0;
  --accent-purple: #C586C0;
  --accent-green: #6A9955;
  --accent-yellow: #DCDCAA;
  --accent-orange: #CE9178;
  --accent-red: #F44747;

  /* 交互状态 */
  --hover-bg: rgba(255, 255, 255, 0.05);
  --selected-bg: rgba(86, 156, 214, 0.15);
  --active-border: rgba(86, 156, 214, 0.3);
  --divider: rgba(255, 255, 255, 0.08);

  /* 滚动条 */
  --scrollbar-track: transparent;
  --scrollbar-thumb: #424242;
  --scrollbar-thumb-hover: #5A5A5A;

  /* 选中文字 */
  --selection-bg: rgba(86, 156, 214, 0.2);
  --selection-text: #E8E8E8;

  /* 其他 */
  --code-label: #CE9178;
  --copy-success: #6A9955;
  --search-highlight: rgba(255, 255, 0, 0.2);
  --search-highlight-active: rgba(255, 255, 0, 0.45);
  --reader-bg-elevated: #2D2D30;
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add dark theme CSS variables"
```

***

### Task 3: 主题 CSS 文件 — 亮色

**Files:**

- Create: `ergemd/src/styles/themes/light.css`
- [ ] **Step 1: 创建亮色主题 CSS**

`ergemd/src/styles/themes/light.css`:

```css
/* ===== 亮色主题 ===== */

[data-theme="light"] {
  /* 背景层 */
  --bg-page: #F5F5F5;
  --bg-reader: #FFFFFF;
  --bg-sidebar: #F0F0F0;
  --bg-code: #F5F5F5;

  /* 正文层 */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;

  /* 标题层级 */
  --text-heading: #1A1A1A;
  --h2-color: #1565C0;
  --h3-color: #6A1B9A;
  --h4-color: #E65100;

  /* 代码高亮 */
  --code-keyword: #1565C0;
  --code-string: #2E7D32;
  --code-number: #E65100;
  --code-comment: #9E9E9E;
  --code-function: #6A1B9A;
  --code-text: #333333;

  /* 强调与交互 */
  --accent-cyan: #1565C0;
  --accent-pink: #AD1457;
  --accent-purple: #6A1B9A;
  --accent-green: #2E7D32;
  --accent-yellow: #F9A825;
  --accent-orange: #E65100;
  --accent-red: #C62828;

  /* 交互状态 */
  --hover-bg: rgba(0, 0, 0, 0.04);
  --selected-bg: rgba(21, 101, 192, 0.1);
  --active-border: rgba(21, 101, 192, 0.3);
  --divider: rgba(0, 0, 0, 0.08);

  /* 滚动条 */
  --scrollbar-track: transparent;
  --scrollbar-thumb: #C0C0C0;
  --scrollbar-thumb-hover: #A0A0A0;

  /* 选中文字 */
  --selection-bg: rgba(21, 101, 192, 0.15);
  --selection-text: #1A1A1A;

  /* 其他 */
  --code-label: #E65100;
  --copy-success: #2E7D32;
  --search-highlight: rgba(249, 168, 37, 0.3);
  --search-highlight-active: rgba(249, 168, 37, 0.55);
  --reader-bg-elevated: #F0F0F0;
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add light theme CSS variables"
```

***

### Task 4: 重构全局样式 — data-theme 架构

**Files:**

- Modify: `ergemd/src/styles/globals.css`
- Modify: `ergemd/src/styles/markdown.css`
- [ ] **Step 1: 重构 globals.css**

`ergemd/src/styles/globals.css`:

```css
@import "tailwindcss";
@import "./themes/cyberpunk.css";
@import "./themes/dark.css";
@import "./themes/light.css";
@import "./markdown.css";

/* ===== 默认主题（赛博朋克） ===== */
:root,
[data-theme="cyberpunk"] {
  /* 默认值由 cyberpunk.css 定义 */
}

/* ===== 基础样式 ===== */
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

/* ===== 滚动条样式 ===== */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

/* ===== 文本选择样式 ===== */
::selection {
  background: var(--selection-bg);
  color: var(--selection-text);
}

/* ===== 阅读区域 ===== */
.reading-area {
  background: var(--bg-reader);
  /* 注意：不要使用 contain: layout style paint，会破坏 overflow-y: auto 滚动 */
}

.reading-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2em 3em;
}

/* ===== 文件列表面板 ===== */
.file-panel {
  background: var(--bg-sidebar);
  will-change: transform;
}

/* ===== 侧边面板 ===== */
.side-panel {
  background: var(--bg-sidebar);
  will-change: transform;
}

/* ===== 状态栏 ===== */
.status-bar {
  background: rgba(0, 0, 0, 0.3);
  contain: layout style paint;
}

[data-theme="light"] .status-bar {
  background: rgba(255, 255, 255, 0.6);
}

/* ===== Range 滑块样式 ===== */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-cyan);
  cursor: pointer;
  border: 2px solid var(--bg-sidebar);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-cyan);
  cursor: pointer;
  border: 2px solid var(--bg-sidebar);
}

/* ===== Select 样式 ===== */
select {
  -webkit-appearance: none;
  appearance: none;
}

select:focus {
  border-color: var(--active-border) !important;
}

/* ===== 动画降级 ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: 更新 markdown.css 使用 CSS 变量**

`ergemd/src/styles/markdown.css` — 替换所有硬编码颜色为 CSS 变量：

```css
/* ===== Markdown 阅读区排版 ===== */

.markdown-body {
  color: var(--text-primary);
  line-height: 1.8;
  letter-spacing: 0px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.markdown-body h1 {
  color: var(--text-heading);
  font-size: 2em;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 0.8em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--divider);
}

.markdown-body h2 {
  color: var(--h2-color);
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.8em;
  margin-bottom: 0.6em;
}

.markdown-body h3 {
  color: var(--h3-color);
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.markdown-body h4 {
  color: var(--h4-color);
  font-size: 1.1em;
  font-weight: 600;
  margin-top: 1.2em;
  margin-bottom: 0.4em;
}

.markdown-body h5,
.markdown-body h6 {
  color: var(--text-secondary);
  font-size: 1em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.4em;
}

.markdown-body p {
  margin-bottom: 1em;
}

.markdown-body a {
  color: var(--accent-cyan);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 150ms ease-out;
}

.markdown-body a:hover {
  border-bottom-color: var(--accent-cyan);
}

.markdown-body code:not(pre code) {
  color: var(--accent-pink);
  background: rgba(255, 100, 150, 0.08);
  padding: 0.15em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
}

[data-theme="light"] .markdown-body code:not(pre code) {
  background: rgba(173, 20, 87, 0.06);
}

.markdown-body pre {
  background: var(--bg-code);
  border-radius: 8px;
  padding: 1em;
  margin: 1em 0;
  overflow-x: auto;
  position: relative;
  border: 1px solid var(--divider);
}

.markdown-body pre code {
  color: var(--code-text);
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
  font-size: 0.875em;
  line-height: 1.6;
  background: none;
  padding: 0;
}

.markdown-body blockquote {
  border-left: 3px solid var(--accent-purple);
  padding: 0.5em 1em;
  margin: 1em 0;
  color: var(--text-secondary);
  background: rgba(191, 0, 255, 0.02);
  border-radius: 0 4px 4px 0;
}

[data-theme="light"] .markdown-body blockquote {
  background: rgba(106, 27, 154, 0.03);
}

.markdown-body blockquote p {
  margin-bottom: 0;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-bottom: 1em;
}

.markdown-body li {
  margin-bottom: 0.25em;
}

.markdown-body li > ul,
.markdown-body li > ol {
  margin-bottom: 0;
}

.markdown-body input[type="checkbox"] {
  margin-right: 0.5em;
  accent-color: var(--accent-cyan);
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.markdown-body th {
  color: var(--text-heading);
  font-weight: 600;
  text-align: left;
  padding: 0.6em 1em;
  border-bottom: 2px solid var(--divider);
}

.markdown-body td {
  padding: 0.5em 1em;
  border-bottom: 1px solid var(--divider);
}

.markdown-body tr:hover {
  background: var(--hover-bg);
}

.markdown-body hr {
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--divider), transparent);
  margin: 2em 0;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1em 0;
  cursor: zoom-in;
}

.markdown-body .footnote-ref {
  color: var(--accent-cyan);
  font-size: 0.8em;
  vertical-align: super;
}

.markdown-body .footnotes {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid var(--divider);
  font-size: 0.9em;
  color: var(--text-secondary);
}

.markdown-body .katex-display {
  margin: 1em 0;
  overflow-x: auto;
}

.markdown-body .mermaid-wrapper {
  margin: 1em 0;
  text-align: center;
}

.markdown-body .mermaid-wrapper svg {
  max-width: 100%;
  height: auto;
}

/* 代码块头部 */
.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4em 1em;
  font-size: 0.75em;
  color: var(--code-label);
  background: var(--hover-bg);
  border-bottom: 1px solid var(--divider);
  border-radius: 8px 8px 0 0;
  font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
}

.code-block-header + pre {
  border-radius: 0 0 8px 8px;
  margin-top: 0;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--divider);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75em;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.copy-button:hover {
  color: var(--accent-cyan);
  border-color: var(--active-border);
  background: var(--hover-bg);
}

.copy-button.copied {
  color: var(--copy-success);
  border-color: var(--copy-success);
}
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: refactor CSS to data-theme architecture with CSS variables"
```

***

### Task 5: 主题切换 Hook

**Files:**

- Create: `ergemd/src/hooks/useTheme.ts`
- [ ] **Step 1: 创建主题切换 Hook**

`ergemd/src/hooks/useTheme.ts`:

```typescript
import { useEffect, useCallback } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { Theme } from "../types";

/**
 * 主题切换 Hook：
 * - 监听 settingsStore 中的 theme 变化
 * - 更新 <html> 的 data-theme 属性
 * - 跟随系统模式使用 matchMedia 监听
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const applyTheme = useCallback((t: Theme) => {
    const resolvedTheme = resolveTheme(t);
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, []);

  // 应用主题
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 跟随系统模式
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", resolved);
    };

    // 初始应用
    const resolved = mediaQuery.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // 获取当前实际生效的主题（解析 system）
  const getResolvedTheme = useCallback((): "cyberpunk" | "dark" | "light" => {
    return resolveTheme(theme) as "cyberpunk" | "dark" | "light";
  }, [theme]);

  return { theme, setTheme, getResolvedTheme };
}

function resolveTheme(theme: Theme): string {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add useTheme hook with system theme detection"
```

***

### Task 6: 更新 settingsStore 支持主题持久化

**Files:**

- Modify: `ergemd/src/stores/settingsStore.ts`
- [ ] **Step 1: 更新 settingsStore**

`ergemd/src/stores/settingsStore.ts`:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme, ReadingSettings } from "../types";

interface SettingsState {
  theme: Theme;
  language: "zh-CN" | "en-US" | "system";
  readingSettings: ReadingSettings;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: "zh-CN" | "en-US" | "system") => void;
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
      language: "system",
      readingSettings: defaultReadingSettings,

      setTheme: (theme) => set({ theme }),

      setLanguage: (language) => set({ language }),

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

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add language setting to settingsStore"
```

***

### Task 7: 更新 MarkdownView 动态代码高亮主题

**Files:**

- Modify: `ergemd/src/components/reader/MarkdownView.tsx`
- [ ] **Step 1: 更新 MarkdownView 根据主题切换代码高亮**

在 `MarkdownView.tsx` 中更新 rehype-pretty-code 配置：

```tsx
import { useSettingsStore } from "../../stores/settingsStore";

// 在组件内部：
const getResolvedTheme = useSettingsStore((s) => {
  const theme = s.theme;
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
});

const shikiTheme = getResolvedTheme === "light" ? "github-light" : "github-dark-dimmed";

const rehypePrettyCodeOptions = useMemo(
  () => ({
    theme: shikiTheme,
    keepBackground: false,
    onVisitLine(node: { children: unknown[] }) {
      if (node.children.length === 0) {
        node.children = [{ type: "text", value: " " }];
      }
    },
  }),
  [shikiTheme]
);
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: dynamic code highlighting theme based on current theme"
```

***

### Task 8: 更新 ReadingOptions 添加主题和颜色选项

**Files:**

- Modify: `ergemd/src/components/panels/ReadingOptions.tsx`
- [ ] **Step 1: 更新 ReadingOptions**

`ergemd/src/components/panels/ReadingOptions.tsx`:

```tsx
import React, { memo, useCallback } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import type { Theme } from "../../types";

const ReadingOptions: React.FC = memo(() => {
  const readingSettings = useSettingsStore((s) => s.readingSettings);
  const updateReadingSettings = useSettingsStore((s) => s.updateReadingSettings);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const themeOptions: { value: Theme; label: string }[] = [
    { value: "cyberpunk", label: "赛博朋克 / Cyberpunk" },
    { value: "dark", label: "暗色 / Dark" },
    { value: "light", label: "亮色 / Light" },
    { value: "system", label: "跟随系统 / System" },
  ];

  const handleThemeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTheme(e.target.value as Theme);
    },
    [setTheme]
  );

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateReadingSettings({ fontSize: Number(e.target.value) });
    },
    [updateReadingSettings]
  );

  const handleLineHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateReadingSettings({ lineHeight: Number(e.target.value) });
    },
    [updateReadingSettings]
  );

  const handleLetterSpacingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateReadingSettings({ letterSpacing: Number(e.target.value) });
    },
    [updateReadingSettings]
  );

  const handleParagraphSpacingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateReadingSettings({ paragraphSpacing: Number(e.target.value) });
    },
    [updateReadingSettings]
  );

  const handlePageWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateReadingSettings({ pageWidth: Number(e.target.value) });
    },
    [updateReadingSettings]
  );

  return (
    <div className="p-4 space-y-5">
      {/* 主题 */}
      <div>
        <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          主题 / Theme
        </label>
        <select
          value={theme}
          onChange={handleThemeChange}
          className="w-full px-3 py-1.5 rounded text-sm"
          style={{
            background: "var(--bg-code)",
            color: "var(--text-primary)",
            border: "1px solid var(--divider)",
            outline: "none",
          }}
        >
          {themeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 分隔线 */}
      <div style={{ height: "1px", background: "var(--divider)" }} />

      {/* 字号 */}
      <div>
        <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          字号 / Font Size
          <span className="ml-2" style={{ color: "var(--accent-cyan)" }}>
            {readingSettings.fontSize}px
          </span>
        </label>
        <input
          type="range"
          min="14"
          max="32"
          step="1"
          value={readingSettings.fontSize}
          onChange={handleFontSizeChange}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent-cyan) ${((readingSettings.fontSize - 14) / 18) * 100}%, var(--bg-code) ${((readingSettings.fontSize - 14) / 18) * 100}%)`,
          }}
        />
      </div>

      {/* 行间距 */}
      <div>
        <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          行间距 / Line Height
        </label>
        <select
          value={readingSettings.lineHeight}
          onChange={handleLineHeightChange}
          className="w-full px-3 py-1.5 rounded text-sm"
          style={{
            background: "var(--bg-code)",
            color: "var(--text-primary)",
            border: "1px solid var(--divider)",
            outline: "none",
          }}
        >
          <option value="1.0">1.0</option>
          <option value="1.5">1.5</option>
          <option value="1.8">1.8</option>
          <option value="2.0">2.0</option>
        </select>
      </div>

      {/* 字间距 */}
      <div>
        <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          字间距 / Letter Spacing
          <span className="ml-2" style={{ color: "var(--accent-cyan)" }}>
            {readingSettings.letterSpacing}px
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="8"
          step="0.5"
          value={readingSettings.letterSpacing}
          onChange={handleLetterSpacingChange}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent-cyan) ${(readingSettings.letterSpacing / 8) * 100}%, var(--bg-code) ${(readingSettings.letterSpacing / 8) * 100}%)`,
          }}
        />
      </div>

      {/* 段落间距 */}
      <div>
        <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          段落间距 / Paragraph Spacing
          <span className="ml-2" style={{ color: "var(--accent-cyan)" }}>
            {readingSettings.paragraphSpacing}px
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="40"
          step="2"
          value={readingSettings.paragraphSpacing}
          onChange={handleParagraphSpacingChange}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent-cyan) ${(readingSettings.paragraphSpacing / 40) * 100}%, var(--bg-code) ${(readingSettings.paragraphSpacing / 40) * 100}%)`,
          }}
        />
      </div>

      {/* 页面宽度 */}
      <div>
        <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          页面宽度 / Page Width
          <span className="ml-2" style={{ color: "var(--accent-cyan)" }}>
            {readingSettings.pageWidth}px
          </span>
        </label>
        <input
          type="range"
          min="600"
          max="1200"
          step="50"
          value={readingSettings.pageWidth}
          onChange={handlePageWidthChange}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent-cyan) ${((readingSettings.pageWidth - 600) / 600) * 100}%, var(--bg-code) ${((readingSettings.pageWidth - 600) / 600) * 100}%)`,
          }}
        />
      </div>
    </div>
  );
});

ReadingOptions.displayName = "ReadingOptions";

export default ReadingOptions;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add theme selector to ReadingOptions panel"
```

***

### Task 9: i18n 国际化初始化

**Files:**

- Create: `ergemd/src/i18n/index.ts`
- Create: `ergemd/src/i18n/zh-CN.json`
- Create: `ergemd/src/i18n/en-US.json`
- [ ] **Step 1: 安装 i18next**

```bash
cd ergemd
pnpm add i18next react-i18next
```

- [ ] **Step 2: 创建中文翻译文件**

`ergemd/src/i18n/zh-CN.json`:

```json
{
  "welcome": {
    "title": "ErgeMD",
    "subtitle": "A minimal Markdown reader by 宝藏二哥",
    "openFile": "打开文件",
    "openFolder": "打开文件夹",
    "dragHint": "拖拽 Markdown 文件到此处打开",
    "recentFiles": "最近打开",
    "dropToOpen": "释放以打开文件",
    "dropHint": "支持 .md / .markdown / .mdx 文件"
  },
  "titleBar": {
    "minimize": "最小化",
    "maximize": "最大化",
    "close": "关闭"
  },
  "statusBar": {
    "wordCount": "{{count}} 字",
    "progress": "{{percent}}%"
  },
  "contextMenu": {
    "copy": "复制",
    "selectAll": "全选",
    "search": "搜索...",
    "editParagraph": "编辑此段落",
    "exportHtml": "导出为 HTML",
    "exportPdf": "导出为 PDF",
    "openInNewWindow": "在新窗口中打开"
  },
  "settings": {
    "title": "设置",
    "font": "字体",
    "fontSize": "字号",
    "lineHeight": "行间距",
    "letterSpacing": "字间距",
    "paragraphSpacing": "段落间距",
    "pageWidth": "页面宽度",
    "theme": "主题",
    "language": "语言",
    "autoSaveProgress": "自动保存阅读进度",
    "readingOptions": "阅读选项"
  },
  "theme": {
    "cyberpunk": "赛博朋克",
    "dark": "暗色",
    "light": "亮色",
    "system": "跟随系统"
  },
  "search": {
    "placeholder": "搜索...",
    "noResults": "无匹配结果"
  },
  "error": {
    "fileNotFound": "文件不存在",
    "permissionDenied": "权限不足",
    "encodingError": "无法识别文件编码",
    "readFailed": "文件读取失败"
  },
  "fileChange": {
    "updated": "文件已更新，点击重新加载"
  },
  "toc": {
    "title": "目录"
  }
}
```

- [ ] **Step 3: 创建英文翻译文件**

`ergemd/src/i18n/en-US.json`:

```json
{
  "welcome": {
    "title": "ErgeMD",
    "subtitle": "A minimal Markdown reader by 宝藏二哥",
    "openFile": "Open File",
    "openFolder": "Open Folder",
    "dragHint": "Drag Markdown files here to open",
    "recentFiles": "Recent Files",
    "dropToOpen": "Drop to open file",
    "dropHint": "Supports .md / .markdown / .mdx files"
  },
  "titleBar": {
    "minimize": "Minimize",
    "maximize": "Maximize",
    "close": "Close"
  },
  "statusBar": {
    "wordCount": "{{count}} words",
    "progress": "{{percent}}%"
  },
  "contextMenu": {
    "copy": "Copy",
    "selectAll": "Select All",
    "search": "Search...",
    "editParagraph": "Edit Paragraph",
    "exportHtml": "Export as HTML",
    "exportPdf": "Export as PDF",
    "openInNewWindow": "Open in New Window"
  },
  "settings": {
    "title": "Settings",
    "font": "Font",
    "fontSize": "Font Size",
    "lineHeight": "Line Height",
    "letterSpacing": "Letter Spacing",
    "paragraphSpacing": "Paragraph Spacing",
    "pageWidth": "Page Width",
    "theme": "Theme",
    "language": "Language",
    "autoSaveProgress": "Auto Save Reading Progress",
    "readingOptions": "Reading Options"
  },
  "theme": {
    "cyberpunk": "Cyberpunk",
    "dark": "Dark",
    "light": "Light",
    "system": "System"
  },
  "search": {
    "placeholder": "Search...",
    "noResults": "No results"
  },
  "error": {
    "fileNotFound": "File not found",
    "permissionDenied": "Permission denied",
    "encodingError": "Unable to detect file encoding",
    "readFailed": "Failed to read file"
  },
  "fileChange": {
    "updated": "File updated, click to reload"
  },
  "toc": {
    "title": "Contents"
  }
}
```

- [ ] **Step 4: 创建 i18next 初始化配置**

`ergemd/src/i18n/index.ts`:

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./zh-CN.json";
import enUS from "./en-US.json";

const savedLanguage = localStorage.getItem("ergemd-settings");
let defaultLanguage = "system";

if (savedLanguage) {
  try {
    const parsed = JSON.parse(savedLanguage);
    defaultLanguage = parsed?.state?.language || "system";
  } catch {
    // ignore
  }
}

function resolveLanguage(lang: string): string {
  if (lang === "system") {
    const navLang = navigator.language;
    return navLang.startsWith("zh") ? "zh-CN" : "en-US";
  }
  return lang;
}

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "en-US": { translation: enUS },
  },
  lng: resolveLanguage(defaultLanguage),
  fallbackLng: "en-US",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

- [ ] **Step 5: 在 main.tsx 中导入 i18n**

`ergemd/src/main.tsx`:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: initialize i18next with zh-CN and en-US translations"
```

***

### Task 10: 在 App 中集成主题切换

**Files:**

- Modify: `ergemd/src/App.tsx`
- [ ] **Step 1: 在 App 中使用 useTheme**

在 `App.tsx` 中添加：

```typescript
import { useTheme } from "./hooks/useTheme";

// 在 App 函数组件中调用（与其他 hooks 一起）
useTheme();
```

> **注意：** Phase 3 Task 13 完成后，App.tsx 使用沉浸式全屏布局。TitleBar 和 StatusBar 是 `position: fixed` 的兄弟元素，不再通过 AppLayout 传递 props。useTheme() 只需在 App 组件中调用一次即可，它会自动更新 `<html>` 的 `data-theme` 属性。

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: integrate theme switching into App"
```

***

### Task 11: 集成验证

**Files:**

- None (验证任务)
- [ ] **Step 1: 主题切换验证**

Run: `pnpm tauri dev`

验证清单：

- [x] 默认赛博朋克主题正确显示
- [x] 右侧面板切换到暗色主题 → 所有颜色正确变化
- [x] 右侧面板切换到亮色主题 → 所有颜色正确变化
- [x] 跟随系统模式 → 修改系统主题后自动切换
- [x] 代码高亮主题随阅读主题切换
- [x] 刷新页面后主题持久化
- [x] Ctrl+Shift+T 循环切换主题
- [x] 所有组件颜色使用 CSS 变量，无硬编码颜色残留
- [x] 亮色模式下文字对比度足够
- [x] 沉浸式布局下主题切换正常（TitleBar/StatusBar fixed 定位不受影响）
- [ ] **Step 2: i18n 验证**
- [x] 默认跟随系统语言
- [x] 翻译文件完整覆盖所有 UI 文案
- [ ] **Step 3: 构建测试**

```bash
pnpm tauri build
```

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "feat: complete Phase 5 - theme system with cyberpunk/dark/light/system themes and i18n"
```

***

## Phase 5 完成标准

- 赛博朋克主题（默认，完整配色方案）
- 暗色主题（标准暗色，VSCode 风格）
- 亮色主题（浅色背景，高对比度）
- 跟随系统（matchMedia 自动切换）
- 阅读选项面板可切换主题
- Ctrl+Shift+T 循环切换主题
- 代码高亮主题随阅读主题适配
- 主题持久化（localStorage）
- 所有组件颜色使用 CSS 变量
- i18next 初始化，中英双语翻译文件
- 默认跟随系统语言

