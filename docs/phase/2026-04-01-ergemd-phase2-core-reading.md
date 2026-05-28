# ErgeMD Phase 2: 核心阅读 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** 实现 Markdown 文件打开、渲染和阅读的核心能力。用户可以打开单个 .md 文件或文件夹工作区，文件列表展示文件树，Markdown 内容完整渲染（GFM + 代码高亮 + KaTeX + Mermaid + 脚注），TOC 自动提取，阅读区居中排版。

**Architecture:** 前端通过 Tauri `invoke` 调用 Rust 后端的 `read_file` / `scan_workspace` 命令获取文件内容和文件树。文件内容缓存在 Zustand `fileStore` 中，避免重复 IPC 调用。Markdown 渲染使用 react-markdown + remark/rehype 插件链，代码高亮使用 rehype-pretty-code (shiki)，数学公式使用 rehype-katex，图表使用 remark-mermaid。TOC 从 Markdown AST 中提取标题层级。

**Tech Stack:** react-markdown, remark-gfm, remark-math, rehype-katex, rehype-pretty-code, shiki, remark-mermaid, react-virtuoso, Zustand

**Design Spec:** `docs/superpowers/specs/2026-04-01-ergemd-design.md`

**Tech Baseline:** `docs/superpowers/specs/2026-04-01-ergemd-tech-baseline.md`

---

## 文件结构

```
ergemd/
├── src/
│   ├── App.tsx                           # 修改：添加路由逻辑
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx             # 修改：条件渲染欢迎页/阅读视图
│   │   ├── reader/
│   │   │   ├── MarkdownView.tsx          # 创建：Markdown 渲染主组件
│   │   │   ├── CodeBlock.tsx             # 创建：代码块（高亮+复制）
│   │   │   ├── MermaidDiagram.tsx        # 创建：Mermaid 图表组件
│   │   │   └── ReadingArea.tsx           # 创建：阅读区域容器
│   │   ├── panels/
│   │   │   └── FileList.tsx              # 创建：文件列表（左侧面板）
│   │   └── welcome/
│   │       └── WelcomePage.tsx           # 修改：接入文件打开逻辑
│   ├── stores/
│   │   ├── settingsStore.ts              # 已有
│   │   └── fileStore.ts                  # 创建：文件状态管理
│   ├── utils/
│   │   ├── toc.ts                        # 创建：TOC 提取工具
│   │   └── wordCount.ts                  # 创建：字数统计工具
│   ├── styles/
│   │   ├── globals.css                   # 修改：添加 Markdown 排版样式
│   │   └── markdown.css                  # 创建：Markdown 内容样式
│   └── types/
│       └── index.ts                      # 修改：添加文件树等类型
├── package.json                          # 修改：添加新依赖
└── index.html                            # 修改：引入 KaTeX CSS
```

---

### Task 1: 安装 Markdown 渲染依赖

**Files:**
- Modify: `ergemd/package.json`

- [ ] **Step 1: 安装前端依赖**

```bash
cd ergemd
pnpm add react-markdown remark-gfm remark-math rehype-katex rehype-pretty-code shiki remark-mermaid react-virtuoso
```

- [ ] **Step 2: 验证依赖安装**

```bash
pnpm list react-markdown remark-gfm remark-math rehype-katex rehype-pretty-code shiki remark-mermaid react-virtuoso
```

Expected: 所有依赖版本号正常显示，无 peer dependency 警告。

- [ ] **Step 3: 引入 KaTeX CSS**

`ergemd/index.html` — 在 `<head>` 中添加：
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: install markdown rendering dependencies (react-markdown, shiki, katex, mermaid)"
```

---

### Task 2: 文件状态管理 — fileStore

**Files:**
- Modify: `ergemd/src/types/index.ts`
- Create: `ergemd/src/stores/fileStore.ts`

- [ ] **Step 1: 扩展类型定义**

`ergemd/src/types/index.ts` — 在已有类型后追加：
```typescript
// ===== 文件树类型 =====
export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[];
}

// ===== 标签页类型 =====
export interface Tab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  isActive: boolean;
}

// ===== TOC 类型 =====
export interface TOCItem {
  id: string;
  text: string;
  level: number;
}

// ===== 文件内容类型 =====
export interface FileContent {
  content: string;
  encoding: string;
}
```

- [ ] **Step 2: 创建 fileStore**

`ergemd/src/stores/fileStore.ts`:
```typescript
import { create } from "zustand";
import type { FileNode, Tab, TOCItem } from "../types";

interface FileState {
  // 当前打开的文件
  tabs: Tab[];
  activeTabId: string | null;

  // 工作区
  workspacePath: string | null;
  workspaceName: string | null;
  fileTree: FileNode[];

  // 当前文件内容（内存缓存）
  currentContent: string;
  currentFilePath: string | null;

  // TOC
  tocItems: TOCItem[];

  // Actions
  openFile: (filePath: string, fileName: string, content: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setWorkspace: (path: string, name: string, tree: FileNode[]) => void;
  clearWorkspace: () => void;
  setCurrentContent: (content: string) => void;
  setTOCItems: (items: TOCItem[]) => void;
  getActiveTab: () => Tab | undefined;
}

export const useFileStore = create<FileState>()((set, get) => ({
  tabs: [],
  activeTabId: null,

  workspacePath: null,
  workspaceName: null,
  fileTree: [],

  currentContent: "",
  currentFilePath: null,

  tocItems: [],

  openFile: (filePath, fileName, content) => {
    const state = get();
    const existingTab = state.tabs.find((t) => t.filePath === filePath);

    if (existingTab) {
      // 已打开，切换到该标签
      set({
        activeTabId: existingTab.id,
        currentContent: content,
        currentFilePath: filePath,
      });
      return;
    }

    // 新建标签
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      filePath,
      fileName,
      content,
      isActive: true,
    };

    set({
      tabs: [...state.tabs.map((t) => ({ ...t, isActive: false })), newTab],
      activeTabId: newTab.id,
      currentContent: content,
      currentFilePath: filePath,
    });
  },

  closeTab: (tabId) => {
    const state = get();
    const idx = state.tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    const newTabs = state.tabs.filter((t) => t.id !== tabId);

    if (state.activeTabId === tabId) {
      // 切换到相邻标签
      const newActiveIdx = Math.min(idx, newTabs.length - 1);
      const newActiveTab = newTabs[newActiveIdx];
      set({
        tabs: newTabs,
        activeTabId: newActiveTab?.id ?? null,
        currentContent: newActiveTab?.content ?? "",
        currentFilePath: newActiveTab?.filePath ?? null,
      });
    } else {
      set({ tabs: newTabs });
    }
  },

  setActiveTab: (tabId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (tab) {
      set({
        activeTabId: tabId,
        currentContent: tab.content,
        currentFilePath: tab.filePath,
      });
    }
  },

  setWorkspace: (path, name, tree) => {
    set({
      workspacePath: path,
      workspaceName: name,
      fileTree: tree,
    });
  },

  clearWorkspace: () => {
    set({
      workspacePath: null,
      workspaceName: null,
      fileTree: [],
    });
  },

  setCurrentContent: (content) => {
    set({ currentContent: content });
  },

  setTOCItems: (items) => {
    set({ tocItems: items });
  },

  getActiveTab: () => {
    const state = get();
    return state.tabs.find((t) => t.id === state.activeTabId);
  },
}));
```

- [ ] **Step 3: 验证 fileStore**

在 DevTools 控制台测试：
```javascript
// 通过 React DevTools 或临时代码验证
window.__FILE_STORE__ = useFileStore.getState();
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add fileStore for file state management (tabs, workspace, content cache)"
```

---

### Task 3: TOC 提取工具

**Files:**
- Create: `ergemd/src/utils/toc.ts`

- [ ] **Step 1: 创建 TOC 提取工具**

`ergemd/src/utils/toc.ts`:
```typescript
import type { TOCItem } from "../types";

/**
 * 从 Markdown 原始文本中提取标题层级，生成 TOC 列表。
 * 只提取 H1-H3，H4 及以下折叠。
 */
export function extractTOC(markdown: string): TOCItem[] {
  const items: TOCItem[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    // ATX 风格标题：# H1, ## H2, ### H3
    const atxMatch = line.match(/^(#{1,3})\s+(.+?)(?:\s+#+)?\s*$/);
    if (atxMatch) {
      const level = atxMatch[1].length;
      const text = atxMatch[2].trim();
      const id = generateHeadingId(text);
      items.push({ id, text, level });
      continue;
    }

    // Setext 风格标题：H1 ===, H2 ---
    const setextMatch = line.match(/^(=+|-+)\s*$/);
    if (setextMatch && items.length === 0 || setextMatch) {
      // 查找上一行非空内容
      const prevLineIdx = lines.indexOf(line) - 1;
      if (prevLineIdx >= 0) {
        const prevLine = lines[prevLineIdx].trim();
        if (prevLine) {
          const level = setextMatch[1][0] === "=" ? 1 : 2;
          if (level <= 3) {
            const id = generateHeadingId(prevLine);
            // 避免重复添加（如果上一行已经被 ATX 匹配）
            const lastItem = items[items.length - 1];
            if (!lastItem || lastItem.text !== prevLine) {
              items.push({ id, text: prevLine, level });
            }
          }
        }
      }
    }
  }

  return items;
}

/**
 * 生成标题 ID，与 react-markdown 的默认行为一致。
 * 转小写，移除特殊字符，空格替换为连字符。
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
    .replace(/[\s]+/g, "-");
}

/**
 * 根据 TOC 项的 level 生成缩进样式。
 */
export function getTOCIndent(level: number): string {
  const indentMap: Record<number, string> = {
    1: "pl-0",
    2: "pl-4",
    3: "pl-8",
  };
  return indentMap[level] || "pl-8";
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add TOC extraction utility (ATX + Setext heading support)"
```

---

### Task 4: 字数统计工具

**Files:**
- Create: `ergemd/src/utils/wordCount.ts`

- [ ] **Step 1: 创建字数统计工具**

`ergemd/src/utils/wordCount.ts`:
```typescript
/**
 * 统计 Markdown 文本的字数。
 * 中文按字符计数，英文按单词计数，代码块和公式不计入。
 */
export function countWords(markdown: string): number {
  // 移除代码块
  let text = markdown.replace(/```[\s\S]*?```/g, "");
  // 移除行内代码
  text = text.replace(/`[^`]+`/g, "");
  // 移除链接语法，保留文字
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // 移除图片语法
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  // 移除 URL
  text = text.replace(/https?:\/\/[^\s)]+/g, "");
  // 移除 KaTeX 行内公式
  text = text.replace(/\$[^$]+\$/g, "");
  // 移除 KaTeX 块级公式
  text = text.replace(/\$\$[\s\S]*?\$\$/g, "");
  // 移除 Markdown 标记符号
  text = text.replace(/[#*_~`>\[\]!|()-]/g, "");
  // 移除多余空白
  text = text.trim();

  if (!text) return 0;

  // 中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;

  // 英文单词数（移除中文字符后统计）
  const withoutChinese = text.replace(/[\u4e00-\u9fff]/g, " ");
  const englishWords = withoutChinese
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return chineseChars + englishWords;
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add word count utility (Chinese chars + English words)"
```

---

### Task 5: Markdown 排版样式

**Files:**
- Create: `ergemd/src/styles/markdown.css`
- Modify: `ergemd/src/styles/globals.css`

- [ ] **Step 1: 创建 Markdown 排版样式**

`ergemd/src/styles/markdown.css`:
```css
/* ===== Markdown 阅读区排版 ===== */

.markdown-body {
  color: var(--text-primary);
  line-height: 1.8;
  letter-spacing: 0px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* 标题 */
.markdown-body h1 {
  color: var(--text-heading, #E0E0E0);
  font-size: 2em;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 0.8em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid rgba(100, 200, 200, 0.1);
}

.markdown-body h2 {
  color: var(--accent-cyan-soft, #64C8C8);
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.8em;
  margin-bottom: 0.6em;
}

.markdown-body h3 {
  color: var(--accent-purple-soft, #B464C8);
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.markdown-body h4 {
  color: var(--accent-orange-soft, #C89650);
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

/* 段落 */
.markdown-body p {
  margin-bottom: 1em;
}

/* 链接 */
.markdown-body a {
  color: var(--accent-cyan, #00FFFF);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 150ms ease-out;
}

.markdown-body a:hover {
  border-bottom-color: var(--accent-cyan, #00FFFF);
}

/* 行内代码 */
.markdown-body code:not(pre code) {
  color: var(--accent-pink, #FF6496);
  background: rgba(255, 100, 150, 0.1);
  padding: 0.15em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
}

/* 代码块 */
.markdown-body pre {
  background: var(--bg-code, #16162A);
  border-radius: 8px;
  padding: 1em;
  margin: 1em 0;
  overflow-x: auto;
  position: relative;
  border: 1px solid rgba(100, 200, 200, 0.05);
}

.markdown-body pre code {
  color: var(--text-primary, #C8C8C8);
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
  font-size: 0.875em;
  line-height: 1.6;
  background: none;
  padding: 0;
}

/* 引用 */
.markdown-body blockquote {
  border-left: 3px solid var(--accent-purple, #BF00FF);
  padding: 0.5em 1em;
  margin: 1em 0;
  color: var(--text-secondary, #787882);
  background: rgba(191, 0, 255, 0.03);
  border-radius: 0 4px 4px 0;
}

.markdown-body blockquote p {
  margin-bottom: 0;
}

/* 列表 */
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

/* 任务列表（GFM） */
.markdown-body input[type="checkbox"] {
  margin-right: 0.5em;
  accent-color: var(--accent-cyan, #00FFFF);
}

/* 表格 */
.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.markdown-body th {
  color: var(--text-heading, #E0E0E0);
  font-weight: 600;
  text-align: left;
  padding: 0.6em 1em;
  border-bottom: 2px solid rgba(100, 200, 200, 0.15);
}

.markdown-body td {
  padding: 0.5em 1em;
  border-bottom: 1px solid rgba(100, 200, 200, 0.05);
}

.markdown-body tr:hover {
  background: rgba(0, 255, 255, 0.02);
}

/* 水平线 */
.markdown-body hr {
  border: none;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(0, 255, 255, 0.2),
    transparent
  );
  margin: 2em 0;
}

/* 图片 */
.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1em 0;
  cursor: zoom-in;
}

/* 脚注 */
.markdown-body .footnote-ref {
  color: var(--accent-cyan, #00FFFF);
  font-size: 0.8em;
  vertical-align: super;
}

.markdown-body .footnotes {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid rgba(100, 200, 200, 0.1);
  font-size: 0.9em;
  color: var(--text-secondary, #787882);
}

/* KaTeX 公式 */
.markdown-body .katex-display {
  margin: 1em 0;
  overflow-x: auto;
}

/* Mermaid 图表 */
.markdown-body .mermaid-wrapper {
  margin: 1em 0;
  text-align: center;
}

.markdown-body .mermaid-wrapper svg {
  max-width: 100%;
  height: auto;
}

/* 代码块语言标签 */
.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4em 1em;
  font-size: 0.75em;
  color: var(--accent-orange, #FF8000);
  background: rgba(255, 128, 0, 0.05);
  border-bottom: 1px solid rgba(100, 200, 200, 0.05);
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
  border: 1px solid rgba(100, 200, 200, 0.15);
  background: transparent;
  color: var(--text-secondary, #787882);
  font-size: 0.75em;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.copy-button:hover {
  color: var(--accent-cyan, #00FFFF);
  border-color: rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.05);
}

.copy-button.copied {
  color: var(--accent-green, #00FF64);
  border-color: rgba(0, 255, 64, 0.3);
}
```

- [ ] **Step 2: 在全局样式中引入 Markdown 样式**

`ergemd/src/styles/globals.css` — 在文件末尾追加：
```css
@import "./markdown.css";

/* ===== 阅读区域 ===== */
.reading-area {
  background: var(--bg-reader, #12121A);
  contain: layout style paint;
}

.reading-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2em 3em;
}

/* 文件列表面板 */
.file-panel {
  background: var(--bg-sidebar, #1A1A2E);
  contain: layout style paint;
  will-change: transform;
}
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add markdown typography styles with cyberpunk theme"
```

---

### Task 6: 代码块组件

**Files:**
- Create: `ergemd/src/components/reader/CodeBlock.tsx`

- [ ] **Step 1: 创建代码块组件**

`ergemd/src/components/reader/CodeBlock.tsx`:
```tsx
import React, { useState, useCallback, memo } from "react";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = memo(({ children, className, language }) => {
  const [copied, setCopied] = useState(false);

  // 从 className 中提取语言（rehype-pretty-code 格式：language-xxx）
  const detectedLanguage = language || className?.replace(/language-/, "") || "";

  const handleCopy = useCallback(async () => {
    const codeElement = document.querySelector(`[data-code-block="${detectedLanguage}"]`);
    const codeText = codeElement?.textContent || "";
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = codeText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [detectedLanguage]);

  return (
    <div className="code-block-wrapper">
      {detectedLanguage && (
        <div className="code-block-header">
          <span>{detectedLanguage}</span>
          <button className={`copy-button ${copied ? "copied" : ""}`} onClick={handleCopy}>
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="4" y="4" width="7" height="7" rx="1" />
                  <path d="M8 4V2.5A1.5 1.5 0 006.5 1h-4A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      )}
      <pre>
        <code className={className} data-code-block={detectedLanguage}>
          {children}
        </code>
      </pre>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

export default CodeBlock;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add CodeBlock component with language label and copy button"
```

---

### Task 7: Mermaid 图表组件

**Files:**
- Create: `ergemd/src/components/reader/MermaidDiagram.tsx`

- [ ] **Step 1: 创建 Mermaid 图表组件**

`ergemd/src/components/reader/MermaidDiagram.tsx`:
```tsx
import React, { useEffect, useRef, useState, memo } from "react";

interface MermaidDiagramProps {
  code: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = memo(({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#1A1A2E",
            primaryTextColor: "#C8C8C8",
            primaryBorderColor: "#00FFFF",
            lineColor: "#64C8C8",
            secondaryColor: "#16162A",
            tertiaryColor: "#0A0A0F",
            fontFamily: "inherit",
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code.trim());

        if (!cancelled) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }

    renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div
        className="mermaid-wrapper"
        style={{
          padding: "1em",
          background: "rgba(255, 0, 64, 0.05)",
          border: "1px solid rgba(255, 0, 64, 0.15)",
          borderRadius: "6px",
          color: "var(--accent-red, #FF0040)",
          fontSize: "0.875em",
        }}
      >
        Failed to render Mermaid diagram
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-wrapper"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

MermaidDiagram.displayName = "MermaidDiagram";

export default MermaidDiagram;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add MermaidDiagram component with dark theme and error handling"
```

---

### Task 8: Markdown 渲染主组件

**Files:**
- Create: `ergemd/src/components/reader/MarkdownView.tsx`

- [ ] **Step 1: 创建 Markdown 渲染组件**

`ergemd/src/components/reader/MarkdownView.tsx`:
```tsx
import React, { useMemo, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import CodeBlock from "./CodeBlock";
import MermaidDiagram from "./MermaidDiagram";
import { extractTOC } from "../../utils/toc";
import { countWords } from "../../utils/wordCount";
import { useFileStore } from "../../stores/fileStore";

interface MarkdownViewProps {
  content: string;
}

const MarkdownView: React.FC<MarkdownViewProps> = memo(({ content }) => {
  const setTOCItems = useFileStore((s) => s.setTOCItems);

  // 提取 TOC 和字数
  const { tocItems, wordCount } = useMemo(() => {
    const toc = extractTOC(content);
    const words = countWords(content);
    return { tocItems: toc, wordCount: words };
  }, [content]);

  // 更新 store 中的 TOC
  React.useEffect(() => {
    setTOCItems(tocItems);
  }, [tocItems, setTOCItems]);

  // rehype-pretty-code 配置
  const rehypePrettyCodeOptions = useMemo(
    () => ({
      theme: "github-dark-dimmed",
      keepBackground: false,
      onVisitLine(node: { children: unknown[] }) {
        // 防止行号节点被高亮覆盖
        if (node.children.length === 0) {
          node.children = [{ type: "text", value: " " }];
        }
      },
    }),
    []
  );

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          [rehypePrettyCode, rehypePrettyCodeOptions],
        ]}
        components={{
          // 代码块
          pre({ children, ...props }) {
            const codeElement = React.Children.toArray(children).find(
              (child) => React.isValidElement(child) && (child.type as string) === "code"
            ) as React.ReactElement<{ className?: string; children?: string }> | undefined;

            const language = codeElement?.props?.className?.replace("language-", "") || "";
            const codeContent = codeElement?.props?.children || "";

            // 检测是否为 Mermaid 代码块
            if (language === "mermaid") {
              return <MermaidDiagram code={String(codeContent)} />;
            }

            return (
              <CodeBlock language={language} className={codeElement?.props?.className}>
                {children}
              </CodeBlock>
            );
          },

          // 图片：添加懒加载
          img({ src, alt, ...props }) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt || ""}
                loading="lazy"
                decoding="async"
                {...props}
              />
            );
          },

          // 表格：包裹滚动容器
          table({ children, ...props }) {
            return (
              <div style={{ overflowX: "auto" }}>
                <table {...props}>{children}</table>
              </div>
            );
          },

          // 标题：添加 id 用于 TOC 锚点跳转
          h1({ children, ...props }) {
            const text = React.Children.toArray(children)
              .map((c) => (typeof c === "string" ? c : ""))
              .join("");
            const id = text
              .toLowerCase()
              .trim()
              .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
              .replace(/[\s]+/g, "-");
            return <h1 id={id} {...props}>{children}</h1>;
          },
          h2({ children, ...props }) {
            const text = React.Children.toArray(children)
              .map((c) => (typeof c === "string" ? c : ""))
              .join("");
            const id = text
              .toLowerCase()
              .trim()
              .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
              .replace(/[\s]+/g, "-");
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3({ children, ...props }) {
            const text = React.Children.toArray(children)
              .map((c) => (typeof c === "string" ? c : ""))
              .join("");
            const id = text
              .toLowerCase()
              .trim()
              .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
              .replace(/[\s]+/g, "-");
            return <h3 id={id} {...props}>{children}</h3>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownView.displayName = "MarkdownView";

export default MarkdownView;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add MarkdownView component with full plugin chain (GFM, KaTeX, Mermaid, shiki)"
```

---

### Task 9: 阅读区域容器

**Files:**
- Create: `ergemd/src/components/reader/ReadingArea.tsx`

- [ ] **Step 1: 创建阅读区域容器**

`ergemd/src/components/reader/ReadingArea.tsx`:
```tsx
import React, { memo, useRef, useEffect } from "react";
import MarkdownView from "./MarkdownView";
import { useFileStore } from "../../stores/fileStore";

const ReadingArea: React.FC = memo(() => {
  const currentContent = useFileStore((s) => s.currentContent);
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 文件切换时滚动到顶部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentFilePath]);

  if (!currentContent) {
    return null;
  }

  return (
    <div
      ref={scrollRef}
      className="reading-area flex-1 overflow-y-auto overflow-x-hidden"
      style={{
        willChange: "scroll-position",
        contain: "layout style paint",
      }}
    >
      <div className="reading-content">
        <MarkdownView content={currentContent} />
      </div>
    </div>
  );
});

ReadingArea.displayName = "ReadingArea";

export default ReadingArea;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add ReadingArea container with scroll reset on file switch"
```

---

### Task 10: 文件列表组件

**Files:**
- Create: `ergemd/src/components/panels/FileList.tsx`

- [ ] **Step 1: 创建文件列表组件**

`ergemd/src/components/panels/FileList.tsx`:
```tsx
import React, { memo, useState, useCallback } from "react";
import { useFileStore } from "../../stores/fileStore";
import type { FileNode } from "../../types";

interface FileListProps {
  onFileSelect: (filePath: string, fileName: string) => void;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  depth: number;
  onSelect: (path: string, name: string) => void;
  activePath: string | null;
}> = memo(({ node, depth, onSelect, activePath }) => {
  const [expanded, setExpanded] = useState(true);
  const isActive = activePath === node.path;

  const handleClick = useCallback(() => {
    if (node.is_dir) {
      setExpanded((prev) => !prev);
    } else {
      onSelect(node.path, node.name);
    }
  }, [node, onSelect]);

  return (
    <div>
      <div
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2 py-1 cursor-pointer text-sm transition-colors duration-100"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          color: isActive ? "var(--accent-cyan, #00FFFF)" : "var(--text-primary, #C8C8C8)",
          background: isActive ? "rgba(0, 255, 255, 0.08)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.03)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {/* 展开/折叠箭头 */}
        {node.is_dir ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 150ms ease-out",
              flexShrink: 0,
            }}
          >
            <path d="M4 2L8 6L4 10" />
          </svg>
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}

        {/* 文件/文件夹图标 */}
        {node.is_dir ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ flexShrink: 0, opacity: 0.6 }}>
            <path d="M1 3C1 2.44772 1.44772 2 2 2H5.58579C5.851 2 6.10536 2.10536 6.29289 2.29289L7.70711 3.70711C7.89464 3.89464 8.149 4 8.41421 4H12C12.5523 4 13 4.44772 13 5V11C13 11.5523 12.5523 12 12 12H2C1.44772 12 1 11.5523 1 11V3Z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ flexShrink: 0, opacity: 0.5 }}>
            <path d="M3 1.5C3 1.22386 3.22386 1 3.5 1H10.5C10.7761 1 11 1.22386 11 1.5V12.5C11 12.7761 10.7761 13 10.5 13H3.5C3.22386 13 3 12.7761 3 12.5V1.5Z" />
            <path d="M5 4H9M5 6.5H9M5 9H7.5" stroke="var(--bg-sidebar, #1A1A2E)" strokeWidth="0.8" />
          </svg>
        )}

        {/* 名称 */}
        <span className="truncate" style={{ fontSize: "0.8125rem" }}>
          {node.name}
        </span>
      </div>

      {/* 子节点 */}
      {node.is_dir && expanded && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  );
});

FileTreeNode.displayName = "FileTreeNode";

const FileList: React.FC<FileListProps> = memo(({ onFileSelect }) => {
  const fileTree = useFileStore((s) => s.fileTree);
  const workspaceName = useFileStore((s) => s.workspaceName);
  const currentFilePath = useFileStore((s) => s.currentFilePath);

  if (fileTree.length === 0) {
    return null;
  }

  return (
    <div
      className="file-panel h-full overflow-y-auto py-2"
      style={{ width: "240px", minWidth: "240px" }}
    >
      {/* 工作区名称 */}
      {workspaceName && (
        <div
          className="px-3 py-2 text-xs font-medium tracking-wide uppercase"
          style={{
            color: "var(--text-muted, #50505A)",
            borderBottom: "1px solid rgba(100, 200, 200, 0.05)",
          }}
        >
          {workspaceName}
        </div>
      )}

      {/* 文件树 */}
      <div className="py-1">
        {fileTree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            onSelect={onFileSelect}
            activePath={currentFilePath}
          />
        ))}
      </div>
    </div>
  );
});

FileList.displayName = "FileList";

export default FileList;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add FileList component with tree view and active state"
```

---

### Task 11: 接入文件打开逻辑 — 更新 App 和 WelcomePage

**Files:**
- Modify: `ergemd/src/App.tsx`
- Modify: `ergemd/src/components/welcome/WelcomePage.tsx`
- Modify: `ergemd/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: 更新 App.tsx — 添加文件打开逻辑**

`ergemd/src/App.tsx`:
```tsx
import React, { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/api/dialog";
import { AppLayout } from "./components/layout/AppLayout";
import { WelcomePage } from "./components/welcome/WelcomePage";
import { ReadingArea } from "./components/reader/ReadingArea";
import { FileList } from "./components/panels/FileList";
import { useFileStore } from "./stores/fileStore";
import type { FileNode } from "./types";

function App() {
  const hasOpenFile = useFileStore((s) => s.currentFilePath !== null);
  const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
  const openFile = useFileStore((s) => s.openFile);
  const setWorkspace = useFileStore((s) => s.setWorkspace);

  const handleOpenFile = useCallback(async (filePath?: string) => {
    let selectedPath = filePath;

    if (!selectedPath) {
      const result = await open({
        multiple: false,
        filters: [
          { name: "Markdown", extensions: ["md", "markdown", "mdx"] },
        ],
      });
      if (!result) return;
      selectedPath = result as string;
    }

    try {
      const result = await invoke<{ content: string; encoding: string }>("read_file", {
        path: selectedPath,
      });
      const fileName = selectedPath.split(/[/\\]/).pop() || "Untitled";
      openFile(selectedPath, fileName, result.content);
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  }, [openFile]);

  const handleOpenFolder = useCallback(async (folderPath?: string) => {
    let selectedPath = folderPath;

    if (!selectedPath) {
      const result = await open({
        directory: true,
        multiple: false,
      });
      if (!result) return;
      selectedPath = result as string;
    }

    try {
      const tree = await invoke<FileNode[]>("scan_workspace", {
        folderPath: selectedPath,
      });
      const folderName = selectedPath.split(/[/\\]/).pop() || "Workspace";
      setWorkspace(selectedPath, folderName, tree);
    } catch (err) {
      console.error("Failed to scan workspace:", err);
    }
  }, [setWorkspace]);

  const handleFileSelect = useCallback(async (filePath: string, fileName: string) => {
    try {
      const result = await invoke<{ content: string; encoding: string }>("read_file", {
        path: filePath,
      });
      openFile(filePath, fileName, result.content);
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  }, [openFile]);

  return (
    <AppLayout>
      {hasOpenFile ? (
        <div className="flex flex-1 overflow-hidden">
          {hasWorkspace && (
            <FileList onFileSelect={handleFileSelect} />
          )}
          <ReadingArea />
        </div>
      ) : (
        <WelcomePage
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
        />
      )}
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 2: 更新 WelcomePage 接受 props**

`ergemd/src/components/welcome/WelcomePage.tsx`:
```tsx
import React, { memo } from "react";

interface WelcomePageProps {
  onOpenFile: (filePath?: string) => void;
  onOpenFolder: (folderPath?: string) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = memo(({ onOpenFile, onOpenFolder }) => {
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
          onClick={() => onOpenFile()}
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
          onClick={() => onOpenFolder()}
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
});

WelcomePage.displayName = "WelcomePage";

export default WelcomePage;
```

- [ ] **Step 3: 更新 AppLayout**

`ergemd/src/components/layout/AppLayout.tsx`:
```tsx
import React, { memo } from "react";
import { TitleBar } from "./TitleBar";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = memo(({ children }) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TitleBar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
});

AppLayout.displayName = "AppLayout";

export default AppLayout;
```

- [ ] **Step 4: 验证文件打开流程**

Run: `pnpm tauri dev`

验证清单：
- 点击欢迎页「打开文件」按钮 → 文件选择对话框 → 选择 .md 文件 → Markdown 渲染显示
- 点击欢迎页「打开文件夹」按钮 → 文件夹选择对话框 → 左侧显示文件树 → 点击文件 → 渲染内容
- 代码块有语言标签和复制按钮
- KaTeX 公式正确渲染
- Mermaid 图表正确渲染
- TOC 数据正确提取（可在 DevTools 中查看 store）

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: integrate file opening flow with Markdown rendering, file tree, and TOC extraction"
```

---

### Task 12: 集成验证

**Files:**
- None (验证任务)

- [ ] **Step 1: 准备测试 Markdown 文件**

创建一个测试文件 `test.md`，包含以下内容：
- 各级标题（H1-H4）
- 代码块（多种语言）
- 行内代码
- 数学公式（行内 + 块级）
- Mermaid 流程图
- 表格
- 引用
- 列表（有序 + 无序 + 任务列表）
- 图片
- 链接
- 脚注

- [ ] **Step 2: 完整功能验证**

Run: `pnpm tauri dev`

验证清单：
- [x] 打开单文件 → Markdown 完整渲染
- [x] 打开文件夹 → 文件树正确显示
- [x] 点击文件树中的文件 → 内容切换
- [x] 代码高亮正确（shiki github-dark-dimmed 主题）
- [x] 代码块有语言标签和复制按钮
- [x] 复制按钮点击后显示 "Copied" 反馈
- [x] KaTeX 行内公式渲染（`$E=mc^2$`）
- [x] KaTeX 块级公式渲染（`$$...$$`）
- [x] Mermaid 图表渲染为 SVG
- [x] 表格支持横向滚动
- [x] 图片懒加载（`loading="lazy"`）
- [x] GFM 任务列表（checkbox）
- [x] 脚注正确渲染
- [x] TOC 数据正确提取（H1-H3）
- [x] 字数统计正确（中文 + 英文）
- [x] 文件切换时滚动位置重置
- [x] 性能：打开文件无明显卡顿

- [ ] **Step 3: 构建测试**

```bash
pnpm tauri build
```

Expected: 构建成功，无 TypeScript 错误。

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "feat: complete Phase 2 - core Markdown reading with GFM, KaTeX, Mermaid, code highlighting, and file tree"
```

---

## Phase 2 完成标准

- Markdown 完整渲染（GFM + 代码高亮 + KaTeX + Mermaid + 脚注）
- 单文件打开和工作区文件夹打开
- 文件树展示，点击切换文件
- TOC 自动提取（H1-H3）
- 字数统计工具
- 代码块带语言标签和复制按钮
- 图片懒加载
- 表格横向滚动
- 文件内容内存缓存（Zustand fileStore）
- 性能：打开文件 < 200ms
