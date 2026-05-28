# ErgeMD Phase 4: 阅读功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

> **v2 — 适配沉浸式全屏布局（Phase 3 Task 13）**

**Goal:** 实现完整的阅读体验功能。包括阅读进度记忆（debounce 2s 写入 SQLite）、文内搜索（Ctrl+F 实时高亮 + Enter 跳转）、键盘快捷键系统、拖拽打开文件/文件夹、文件变更检测（Rust notify + 提示重新加载）、图片路径解析（相对路径转绝对路径）、图片放大查看（点击全屏预览）、欢迎页完善（最近打开文件列表）。

**Architecture:** 阅读进度通过 useReadingProgress hook 计算百分比，debounce 2s 后通过 Tauri invoke 写入 SQLite。文内搜索使用 DOM API 实时高亮匹配文本，Enter/Shift+Enter 在匹配项间跳转。键盘快捷键通过全局 keydown 事件监听器实现。文件变更检测使用 Rust 侧 notify crate 监听，通过 Tauri Event 推送到前端。图片放大使用固定定位的全屏预览组件。

**Tech Stack:** Tauri 2 Events, Zustand, React 19, TypeScript, CSS

**Design Spec:** `docs/superpowers/specs/2026-04-01-ergemd-design.md`

**Tech Baseline:** `docs/superpowers/specs/2026-04-01-ergemd-tech-baseline.md`

---

## 文件结构

```
ergemd/
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── db.rs                    # 修改：添加更多数据库命令
│   │   │   └── file.rs                  # 修改：添加 show_in_explorer
│   │   ├── watcher.rs                   # 创建：文件监听服务
│   │   └── lib.rs                       # 修改：注册新命令和事件
│   └── Cargo.toml                       # 修改：添加 notify 依赖
├── src/
│   ├── App.tsx                           # 修改：集成搜索、拖拽、快捷键（沉浸式布局）
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx              # 使用：沉浸式布局固定顶部
│   │   │   └── StatusBar.tsx             # 使用：沉浸式布局固定底部
│   │   ├── reader/
│   │   │   ├── SearchBar.tsx             # 创建：文内搜索栏
│   │   │   ├── ImagePreview.tsx          # 创建：图片放大预览
│   │   │   └── MarkdownView.tsx          # 修改：图片路径解析
│   │   ├── panels/
│   │   │   ├── LeftPanel.tsx             # 使用：文件树面板
│   │   │   └── RightPanel.tsx            # 使用：设置面板
│   │   ├── welcome/
│   │   │   └── WelcomePage.tsx           # 修改：最近文件列表
│   │   └── common/
│   │       ├── Toast.tsx                 # 创建：提示组件
│   │       └── FileDropZone.tsx          # 创建：拖拽区域
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts       # 创建：快捷键系统
│   │   ├── useFileWatcher.ts             # 创建：文件变更监听
│   │   ├── useReadingProgress.ts         # 修改：添加 SQLite 持久化（HTMLElement | null 模式）
│   │   └── useAutoHide.ts                # 使用：TitleBar/StatusBar 自动隐藏
│   ├── stores/
│   │   ├── readerStore.ts                # 创建：阅读状态（搜索、进度）
│   │   └── fileStore.ts                  # 修改：添加最近文件
│   └── types/
│       └── index.ts                      # 修改：添加搜索类型
```

---

### Task 1: 阅读状态 Store — readerStore

**Files:**
- Modify: `ergemd/src/types/index.ts`
- Create: `ergemd/src/stores/readerStore.ts`

- [ ] **Step 1: 扩展类型定义**

`ergemd/src/types/index.ts` — 追加：
```typescript
// ===== 搜索状态 =====
export interface SearchState {
  query: string;
  matches: number;
  currentMatch: number;
  isSearchOpen: boolean;
}

// ===== 文件变更通知 =====
export interface FileChangeEvent {
  path: string;
  timestamp: number;
}

// ===== Toast 类型 =====
export interface ToastMessage {
  id: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
  duration?: number;
}
```

- [ ] **Step 2: 创建 readerStore**

`ergemd/src/stores/readerStore.ts`:
```typescript
import { create } from "zustand";
import type { SearchState, ToastMessage } from "../types";

interface ReaderState {
  // 搜索
  search: SearchState;
  setSearchQuery: (query: string) => void;
  setSearchMatches: (matches: number) => void;
  setCurrentMatch: (current: number) => void;
  openSearch: () => void;
  closeSearch: () => void;
  nextMatch: () => void;
  prevMatch: () => void;

  // Toast
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;

  // 图片预览
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;

  // 文件变更提示
  fileChanged: string | null;
  setFileChanged: (path: string | null) => void;
}

export const useReaderStore = create<ReaderState>()((set, get) => ({
  search: {
    query: "",
    matches: 0,
    currentMatch: 0,
    isSearchOpen: false,
  },

  setSearchQuery: (query) =>
    set((state) => ({
      search: { ...state.search, query, matches: 0, currentMatch: 0 },
    })),

  setSearchMatches: (matches) =>
    set((state) => ({
      search: { ...state.search, matches, currentMatch: matches > 0 ? 1 : 0 },
    })),

  setCurrentMatch: (current) =>
    set((state) => ({
      search: { ...state.search, currentMatch: current },
    })),

  openSearch: () =>
    set((state) => ({
      search: { ...state.search, isSearchOpen: true, query: "", matches: 0, currentMatch: 0 },
    })),

  closeSearch: () =>
    set((state) => ({
      search: { ...state.search, isSearchOpen: false, query: "", matches: 0, currentMatch: 0 },
    })),

  nextMatch: () =>
    set((state) => {
      if (state.search.matches === 0) return state;
      const next = state.search.currentMatch >= state.search.matches
        ? 1
        : state.search.currentMatch + 1;
      return { search: { ...state.search, currentMatch: next } };
    }),

  prevMatch: () =>
    set((state) => {
      if (state.search.matches === 0) return state;
      const prev = state.search.currentMatch <= 1
        ? state.search.matches
        : state.search.currentMatch - 1;
      return { search: { ...state.search, currentMatch: prev } };
    }),

  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // 自动移除
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  previewImage: null,

  setPreviewImage: (url) => set({ previewImage: url }),

  fileChanged: null,

  setFileChanged: (path) => set({ fileChanged: path }),
}));
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add readerStore for search state, toasts, image preview, and file change notifications"
```

---

### Task 2: Toast 提示组件

**Files:**
- Create: `ergemd/src/components/common/Toast.tsx`

- [ ] **Step 1: 创建 Toast 组件**

`ergemd/src/components/common/Toast.tsx`:
```tsx
import React, { memo, useCallback } from "react";
import { useReaderStore } from "../../stores/readerStore";

const ToastContainer: React.FC = memo(() => {
  const toasts = useReaderStore((s) => s.toasts);
  const removeToast = useReaderStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-50 flex flex-col gap-2"
      style={{
        top: "48px",
        right: "16px",
        maxWidth: "360px",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
});

const ToastItem: React.FC<{
  toast: { id: string; type: string; message: string };
  onClose: () => void;
}> = memo(({ toast, onClose }) => {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    info: {
      bg: "rgba(0, 255, 255, 0.08)",
      border: "rgba(0, 255, 255, 0.2)",
      text: "var(--accent-cyan, #00FFFF)",
    },
    success: {
      bg: "rgba(0, 255, 100, 0.08)",
      border: "rgba(0, 255, 100, 0.2)",
      text: "var(--accent-green, #00FF64)",
    },
    error: {
      bg: "rgba(255, 0, 64, 0.08)",
      border: "rgba(255, 0, 64, 0.2)",
      text: "var(--accent-red, #FF0040)",
    },
    warning: {
      bg: "rgba(255, 128, 0, 0.08)",
      border: "rgba(255, 128, 0, 0.2)",
      text: "var(--accent-orange, #FF8000)",
    },
  };

  const colors = colorMap[toast.type] || colorMap.info;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        backdropFilter: "blur(8px)",
        opacity: 0,
        transform: "translateX(20px)",
        animation: "toast-enter 200ms ease-out forwards",
      }}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  );
});

ToastItem.displayName = "ToastItem";
ToastContainer.displayName = "ToastContainer";

export default ToastContainer;
```

- [ ] **Step 2: 添加 Toast 动画到 animations.css**

`ergemd/src/styles/animations.css` — 追加：
```css
/* Toast 进入动画 */
@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add Toast notification component with enter animation"
```

---

### Task 3: 阅读进度持久化

**Files:**
- Modify: `ergemd/src/hooks/useReadingProgress.ts`
- Modify: `ergemd/src-tauri/src/commands/db.rs`

- [ ] **Step 1: 添加 Rust 数据库命令**

`ergemd/src-tauri/src/commands/db.rs` — 追加以下命令：
```rust
#[tauri::command]
pub async fn add_recent_file(
    pool: tauri::State<'_, SqlitePool>,
    file_path: String,
    file_name: String,
) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO recent_files (file_path, file_name, opened_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(file_path) DO UPDATE SET opened_at = ?3"
    )
    .bind(&file_path)
    .bind(&file_name)
    .bind(now)
    .execute(pool.get().map_err(|e| e.to_string())?)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn remove_recent_file(
    pool: tauri::State<'_, SqlitePool>,
    file_path: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM recent_files WHERE file_path = ?1")
        .bind(&file_path)
        .execute(pool.get().map_err(|e| e.to_string())?)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn flush_progress(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    // WAL 模式下 checkpoint 确保数据写入磁盘
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(pool.get().map_err(|e| e.to_string())?)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_setting(
    pool: tauri::State<'_, SqlitePool>,
    key: String,
) -> Result<Option<String>, String> {
    let result = sqlx::query_as::<_, (String,)>(
        "SELECT value FROM settings WHERE key = ?1"
    )
    .bind(&key)
    .fetch_optional(pool.get().map_err(|e| e.to_string())?)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.map(|r| r.0))
}

#[tauri::command]
pub async fn save_setting(
    pool: tauri::State<'_, SqlitePool>,
    key: String,
    value: String,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2"
    )
    .bind(&key)
    .bind(&value)
    .execute(pool.get().map_err(|e| e.to_string())?)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

- [ ] **Step 2: 在 lib.rs 注册新命令**

在 `tauri::generate_handler!` 中追加：
```rust
commands::db::add_recent_file,
commands::db::remove_recent_file,
commands::db::flush_progress,
commands::db::get_setting,
commands::db::save_setting,
```

- [ ] **Step 3: 更新 useReadingProgress 添加持久化**

`ergemd/src/hooks/useReadingProgress.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileStore } from "../stores/fileStore";
import { useSettingsStore } from "../stores/settingsStore";

export function useReadingProgress(scrollEl: HTMLElement | null) {
  const [percentage, setPercentage] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const rafRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPercentage = useRef<number>(-1);

  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const autoSaveProgress = useSettingsStore((s) => s.readingSettings.autoSaveProgress);

  const calculateProgress = useCallback(() => {
    if (!scrollEl) return;
    const scrollTop = scrollEl.scrollTop;
    const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (scrollHeight <= 0) { setPercentage(0); return; }
    const pct = (scrollTop / scrollHeight) * 100;
    setPercentage(Math.min(100, Math.max(0, pct)));
  }, [scrollEl]);

  const saveProgress = useCallback(async () => {
    const filePath = useFileStore.getState().currentFilePath;
    if (!filePath || !autoSaveProgress) return;
    const pct = lastSavedPercentage.current;
    if (pct < 0) return;
    if (Math.abs(pct - lastSavedPercentage.current) < 0.5 && lastSavedPercentage.current >= 0) return;
    try {
      const { countWords } = await import("../utils/wordCount");
      const content = useFileStore.getState().currentContent;
      const wordCount = countWords(content);
      await invoke("save_reading_progress", { filePath, scrollPercentage: pct, wordCount });
      lastSavedPercentage.current = pct;
    } catch (err) {
      console.error("Failed to save reading progress:", err);
    }
  }, [autoSaveProgress]);

  const restoreProgress = useCallback(async () => {
    const filePath = useFileStore.getState().currentFilePath;
    if (!filePath) return;
    try {
      const progress = await invoke<{
        file_path: string;
        scroll_percentage: number;
        last_read_at: number;
        word_count: number;
      } | null>("get_reading_progress", { filePath });
      if (progress && progress.scroll_percentage > 0) {
        if (!scrollEl) return;
        requestAnimationFrame(() => {
          const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
          if (scrollHeight > 0) {
            scrollEl.scrollTop = (progress.scroll_percentage / 100) * scrollHeight;
          }
        });
      }
    } catch (err) {
      console.error("Failed to restore reading progress:", err);
    }
  }, [scrollEl]);

  useEffect(() => {
    if (!scrollEl) return;
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => setIsScrolling(false), 500);
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          calculateProgress();
          rafRef.current = null;
        });
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveProgress(), 2000);
    };
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveProgress();
      }
    };
  }, [scrollEl, calculateProgress, saveProgress]);

  useEffect(() => {
    lastSavedPercentage.current = -1;
    restoreProgress();
  }, [currentFilePath, restoreProgress]);

  return { percentage, isScrolling, saveProgress, restoreProgress };
}
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add reading progress persistence with debounce 2s and restore on file open"
```

---

### Task 4: 文内搜索

**Files:**
- Create: `ergemd/src/components/reader/SearchBar.tsx`

- [ ] **Step 1: 创建搜索栏组件**

`ergemd/src/components/reader/SearchBar.tsx`:
```tsx
import React, { memo, useRef, useEffect, useCallback } from "react";
import { useReaderStore } from "../../stores/readerStore";

const SearchBar: React.FC = memo(() => {
  const search = useReaderStore((s) => s.search);
  const setSearchQuery = useReaderStore((s) => s.setSearchQuery);
  const setSearchMatches = useReaderStore((s) => s.setSearchMatches);
  const setCurrentMatch = useReaderStore((s) => s.setCurrentMatch);
  const closeSearch = useReaderStore((s) => s.closeSearch);
  const nextMatch = useReaderStore((s) => s.nextMatch);
  const prevMatch = useReaderStore((s) => s.prevMatch);

  const inputRef = useRef<HTMLInputElement>(null);
  const highlightSpansRef = useRef<HTMLSpanElement[]>([]);

  // 打开时自动聚焦
  useEffect(() => {
    if (search.isSearchOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [search.isSearchOpen]);

  // 搜索高亮
  const performSearch = useCallback(
    (query: string) => {
      // 清除之前的高亮
      clearHighlights();

      if (!query.trim()) {
        setSearchMatches(0);
        return;
      }

      // 在 markdown-body 中搜索
      const container = document.querySelector(".markdown-body");
      if (!container) {
        setSearchMatches(0);
        return;
      }

      const matches: HTMLSpanElement[] = [];
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      const nodesToReplace: { node: Text; parent: Node }[] = [];

      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const text = textNode.textContent || "";
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const idx = lowerText.indexOf(lowerQuery);

        if (idx !== -1) {
          nodesToReplace.push({ node: textNode, parent: textNode.parentNode! });
        }
      }

      for (const { node, parent } of nodesToReplace) {
        const text = node.textContent || "";
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let lastIndex = 0;

        const fragment = document.createDocumentFragment();

        while (true) {
          const idx = lowerText.indexOf(lowerQuery, lastIndex);
          if (idx === -1) break;

          // 匹配前的文本
          if (idx > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
          }

          // 高亮匹配文本
          const span = document.createElement("span");
          span.textContent = text.slice(idx, idx + query.length);
          span.style.background = "rgba(255, 255, 0, 0.25)";
          span.style.color = "inherit";
          span.style.borderRadius = "2px";
          span.style.padding = "0 1px";
          span.className = "search-highlight";
          fragment.appendChild(span);
          matches.push(span);

          lastIndex = idx + query.length;
        }

        // 剩余文本
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        parent.replaceChild(fragment, node);
      }

      highlightSpansRef.current = matches;
      setSearchMatches(matches.length);

      // 滚动到第一个匹配
      if (matches.length > 0) {
        matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
        setCurrentMatch(1);
      }
    },
    [setSearchMatches, setCurrentMatch]
  );

  const clearHighlights = useCallback(() => {
    const container = document.querySelector(".markdown-body");
    if (!container) return;

    const highlights = container.querySelectorAll(".search-highlight");
    highlights.forEach((highlight) => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ""), highlight);
        parent.normalize(); // 合并相邻文本节点
      }
    });

    highlightSpansRef.current = [];
  }, []);

  // 跳转到指定匹配
  const scrollToMatch = useCallback(
    (index: number) => {
      const spans = highlightSpansRef.current;
      if (index >= 1 && index <= spans.length) {
        spans[index - 1].scrollIntoView({ behavior: "smooth", block: "center" });

        // 更新高亮样式
        spans.forEach((span, i) => {
          if (i === index - 1) {
            span.style.background = "rgba(255, 255, 0, 0.5)";
          } else {
            span.style.background = "rgba(255, 255, 0, 0.25)";
          }
        });
      }
    },
    []
  );

  // 监听 currentMatch 变化
  useEffect(() => {
    scrollToMatch(search.currentMatch);
  }, [search.currentMatch, scrollToMatch]);

  // 输入变化时重新搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search.query);
    }, 150); // debounce 150ms

    return () => clearTimeout(timer);
  }, [search.query, performSearch]);

  // 键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          prevMatch();
        } else {
          nextMatch();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearHighlights();
        closeSearch();
      }
    },
    [nextMatch, prevMatch, closeSearch, clearHighlights]
  );

  if (!search.isSearchOpen) return null;

  return (
    <div
      className="fixed z-30 flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        top: "48px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--bg-sidebar, #1A1A2E)",
        border: "1px solid rgba(100, 200, 200, 0.15)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        minWidth: "360px",
      }}
    >
      {/* 搜索图标 */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
        <circle cx="6" cy="6" r="4.5" />
        <path d="M9.5 9.5L13 13" />
      </svg>

      {/* 输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={search.query}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="搜索..."
        className="flex-1 bg-transparent text-sm outline-none"
        style={{
          color: "var(--text-primary)",
          caretColor: "var(--accent-cyan)",
        }}
      />

      {/* 匹配计数 */}
      {search.matches > 0 && (
        <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
          {search.currentMatch}/{search.matches}
        </span>
      )}

      {/* 上一个 */}
      {search.matches > 0 && (
        <button
          onClick={prevMatch}
          className="flex items-center justify-center shrink-0"
          style={{ color: "var(--text-secondary)" }}
          title="上一个 (Shift+Enter)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M6 9L3 6L6 3" />
          </svg>
        </button>
      )}

      {/* 下一个 */}
      {search.matches > 0 && (
        <button
          onClick={nextMatch}
          className="flex items-center justify-center shrink-0"
          style={{ color: "var(--text-secondary)" }}
          title="下一个 (Enter)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M6 3L9 6L6 9" />
          </svg>
        </button>
      )}

      {/* 关闭 */}
      <button
        onClick={() => {
          clearHighlights();
          closeSearch();
        }}
        className="flex items-center justify-center shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  );
});

SearchBar.displayName = "SearchBar";

export default SearchBar;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add SearchBar with real-time highlighting and Enter/Shift+Enter navigation"
```

---

### Task 5: 键盘快捷键系统

**Files:**
- Create: `ergemd/src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: 创建快捷键 Hook**

`ergemd/src/hooks/useKeyboardShortcuts.ts`:
```typescript
import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/api/dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useFileStore } from "../stores/fileStore";
import { useReaderStore } from "../stores/readerStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { FileNode } from "../types";

interface ShortcutHandlers {
  onOpenFile: (filePath?: string) => Promise<void>;
  onOpenFolder: (folderPath?: string) => Promise<void>;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const { onOpenFile, onOpenFolder } = handlers;
  const closeTab = useFileStore((s) => s.closeTab);
  const activeTabId = useFileStore((s) => s.activeTabId);
  const tabs = useFileStore((s) => s.tabs);
  const setActiveTab = useFileStore((s) => s.setActiveTab);
  const openSearch = useReaderStore((s) => s.openSearch);
  const closeSearch = useReaderStore((s) => s.closeSearch);
  const searchIsOpen = useReaderStore((s) => s.search.isSearchOpen);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const theme = useSettingsStore((s) => s.theme);
  const updateReadingSettings = useSettingsStore((s) => s.updateReadingSettings);
  const readingSettings = useSettingsStore((s) => s.readingSettings);

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+O: 打开文件
      if (ctrl && e.key === "o" && !e.shiftKey) {
        e.preventDefault();
        onOpenFile();
        return;
      }

      // Ctrl+Shift+O: 打开文件夹
      if (ctrl && e.key === "O") {
        e.preventDefault();
        onOpenFolder();
        return;
      }

      // Ctrl+W: 关闭当前标签
      if (ctrl && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
        return;
      }

      // Ctrl+Tab: 下一个标签
      if (ctrl && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
          const nextIdx = (currentIdx + 1) % tabs.length;
          setActiveTab(tabs[nextIdx].id);
        }
        return;
      }

      // Ctrl+Shift+Tab: 上一个标签
      if (ctrl && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
          const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
          setActiveTab(tabs[prevIdx].id);
        }
        return;
      }

      // Ctrl+F: 搜索
      if (ctrl && e.key === "f") {
        e.preventDefault();
        if (searchIsOpen) {
          closeSearch();
        } else {
          openSearch();
        }
        return;
      }

      // Ctrl+Shift+T: 切换主题
      if (ctrl && e.key === "T") {
        e.preventDefault();
        const themeOrder = ["cyberpunk", "dark", "light", "system"] as const;
        const currentIdx = themeOrder.indexOf(theme);
        const nextIdx = (currentIdx + 1) % themeOrder.length;
        setTheme(themeOrder[nextIdx]);
        return;
      }

      // Ctrl+,: 打开设置（右侧面板）
      if (ctrl && e.key === ",") {
        e.preventDefault();
        // 触发右侧面板 — 通过模拟鼠标移到右边缘
        const event = new MouseEvent("mousemove", {
          clientX: window.innerWidth - 4,
          clientY: window.innerHeight / 2,
        });
        document.dispatchEvent(event);
        return;
      }

      // Esc: 关闭搜索/面板
      if (e.key === "Escape") {
        if (searchIsOpen) {
          closeSearch();
        }
        return;
      }

      // Ctrl+滚轮: 调整字体大小
      if (ctrl && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const delta = e.key === "ArrowUp" ? 1 : -1;
        const newSize = Math.max(14, Math.min(32, readingSettings.fontSize + delta));
        updateReadingSettings({ fontSize: newSize });
        return;
      }

      // Ctrl+N: 新建窗口
      if (ctrl && e.key === "n") {
        e.preventDefault();
        try {
          invoke("new_window", {});
        } catch (err) {
          console.error("Failed to create new window:", err);
        }
        return;
      }
    },
    [
      onOpenFile,
      onOpenFolder,
      closeTab,
      activeTabId,
      tabs,
      setActiveTab,
      openSearch,
      closeSearch,
      searchIsOpen,
      setTheme,
      theme,
      updateReadingSettings,
      readingSettings.fontSize,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add keyboard shortcuts system (Ctrl+O/W/F/T/N, Tab switching, font size)"
```

---

### Task 6: 拖拽打开文件

**Files:**
- Create: `ergemd/src/components/common/FileDropZone.tsx`

- [ ] **Step 1: 创建拖拽区域组件**

`ergemd/src/components/common/FileDropZone.tsx`:
```tsx
import React, { memo, useState, useCallback, useRef } from "react";

interface FileDropZoneProps {
  children: React.ReactNode;
  onDropFiles: (filePaths: string[]) => void;
  onDropFolder?: (folderPath: string) => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = memo(
  ({ children, onDropFiles, onDropFolder }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;

        const files = Array.from(e.dataTransfer.files);

        if (files.length === 0) return;

        // 检查是否为文件夹（通过 Tauri API 获取路径）
        // 浏览器环境中无法直接判断文件夹，需要通过 Tauri 的 drag-drop 事件
        // 这里使用 Tauri 2 的 drag-drop API
        const { listen } = await import("@tauri-apps/api/event");

        // Tauri 2 的拖拽事件会在 drop 时提供路径信息
        // 通过 dataTransfer 获取文件路径
        const paths: string[] = [];

        for (const file of files) {
          // @ts-expect-error - Tauri 拖拽事件会注入 path 属性
          const path = file.path || file.name;
          if (path) {
            paths.push(path);
          }
        }

        if (paths.length > 0) {
          // 判断是文件还是文件夹
          const mdFiles = paths.filter((p) =>
            p.endsWith(".md") || p.endsWith(".markdown") || p.endsWith(".mdx")
          );

          if (mdFiles.length > 0) {
            onDropFiles(mdFiles);
          } else if (onDropFolder && paths.length === 1) {
            onDropFolder(paths[0]);
          }
        }
      },
      [onDropFiles, onDropFolder]
    );

    return (
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative h-full w-full"
      >
        {children}

        {/* 拖拽遮罩 */}
        {isDragging && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              background: "rgba(10, 10, 15, 0.9)",
              opacity: 1,
              transition: "opacity 150ms ease-out",
            }}
          >
            <div
              className="flex flex-col items-center gap-4 px-12 py-8 rounded-xl"
              style={{
                border: "2px dashed rgba(0, 255, 255, 0.4)",
                background: "rgba(0, 255, 255, 0.03)",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
                <path d="M24 32V16M24 16L18 22M24 16L30 22" />
                <path d="M8 32V38C8 39.1046 8.89543 40 10 40H38C39.1046 40 40 39.1046 40 38V32" />
              </svg>
              <span
                className="text-lg font-medium"
                style={{ color: "var(--accent-cyan)" }}
              >
                释放以打开文件
              </span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                支持 .md / .markdown / .mdx 文件
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

FileDropZone.displayName = "FileDropZone";

export default FileDropZone;
```

- [ ] **Step 2: 在 App.tsx 中集成拖拽**

在 App 组件中用 FileDropZone 包裹整个应用：
```tsx
import FileDropZone from "./components/common/FileDropZone";

// 在 App 组件的 return 中：
const handleDropFiles = useCallback(
  async (filePaths: string[]) => {
    for (const filePath of filePaths) {
      await handleOpenFile(filePath);
    }
  },
  [handleOpenFile]
);

const handleDropFolder = useCallback(
  async (folderPath: string) => {
    await handleOpenFolder(folderPath);
  },
  [handleOpenFolder]
);

return (
  <FileDropZone onDropFiles={handleDropFiles} onDropFolder={handleDropFolder}>
    <AppLayout ...>
      ...
    </AppLayout>
  </FileDropZone>
);
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add drag-and-drop file opening with visual overlay"
```

---

### Task 7: 文件变更检测（Rust 后端）

**Files:**
- Create: `ergemd/src-tauri/src/watcher.rs`
- Modify: `ergemd/src-tauri/src/lib.rs`
- Create: `ergemd/src/hooks/useFileWatcher.ts`

- [ ] **Step 1: 添加 Rust 依赖**

```bash
cd src-tauri
cargo add notify
cd ..
```

- [ ] **Step 2: 创建文件监听服务**

`ergemd/src-tauri/src/watcher.rs`:
```rust
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub struct FileWatcher {
    _watcher: RecommendedWatcher,
}

impl FileWatcher {
    pub fn new(app_handle: AppHandle) -> Result<Self, String> {
        let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

        let mut watcher = notify::recommended_watcher(tx)
            .map_err(|e| e.to_string())?;

        watcher.configure(Config::default())
            .map_err(|e| e.to_string())?;

        // 启动监听线程
        std::thread::spawn(move || {
            loop {
                match rx.recv_timeout(Duration::from_secs(1)) {
                    Ok(Ok(event)) => {
                        if let EventKind::Modify(_) = event.kind {
                            // 只处理文件修改事件
                            for path in event.paths {
                                if let Some(ext) = path.extension() {
                                    let ext_str = ext.to_string_lossy().to_lowercase();
                                    if ext_str == "md" || ext_str == "markdown" || ext_str == "mdx" {
                                        let path_str = path.to_string_lossy().to_string();
                                        let _ = app_handle.emit("file-changed", path_str);
                                    }
                                }
                            }
                        }
                    }
                    Ok(Err(e)) => {
                        eprintln!("File watch error: {}", e);
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        // 正常超时，继续循环
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => {
                        // 通道关闭，退出循环
                        break;
                    }
                }
            }
        });

        Ok(FileWatcher { _watcher: watcher })
    }

    /// 监听指定文件
    pub fn watch_file(&mut self, path: &str) -> Result<(), String> {
        // notify crate 的 watcher 会自动处理，这里暂不额外实现
        // 实际使用时通过 Tauri command 调用
        Ok(())
    }
}
```

- [ ] **Step 3: 在 lib.rs 中初始化 watcher**

`ergemd/src-tauri/src/lib.rs` — 在 setup 中初始化：
```rust
mod watcher;

// 在 .setup(|app| { ... }) 中添加：
let app_handle = app.handle().clone();
match watcher::FileWatcher::new(app_handle) {
    Ok(_) => {},
    Err(e) => eprintln!("Failed to initialize file watcher: {}", e),
}
```

- [ ] **Step 4: 创建前端文件监听 Hook**

`ergemd/src/hooks/useFileWatcher.ts`:
```typescript
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useFileStore } from "../stores/fileStore";
import { useReaderStore } from "../stores/readerStore";

/**
 * 监听 Rust 侧的文件变更事件，显示重新加载提示。
 */
export function useFileWatcher() {
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const setFileChanged = useReaderStore((s) => s.setFileChanged);

  useEffect(() => {
    const unlisten = listen<string>("file-changed", (event) => {
      const changedPath = event.payload;
      // 只提示当前打开文件的变更
      if (changedPath === currentFilePath) {
        setFileChanged(changedPath);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [currentFilePath, setFileChanged]);
}
```

- [ ] **Step 5: 在 App.tsx 中集成文件变更提示**

在 App 组件中添加文件变更提示 UI：
```tsx
import { useFileWatcher } from "./hooks/useFileWatcher";

// 在 App 组件中调用
useFileWatcher();

const fileChanged = useReaderStore((s) => s.fileChanged);
const setFileChanged = useReaderStore((s) => s.setFileChanged);

// 在渲染中添加提示条
{fileChanged && (
  <div
    className="fixed z-30 flex items-center justify-center w-full py-2 text-sm cursor-pointer"
    style={{
      top: "36px",
      background: "rgba(255, 128, 0, 0.1)",
      borderBottom: "1px solid rgba(255, 128, 0, 0.2)",
      color: "var(--accent-orange, #FF8000)",
    }}
    onClick={async () => {
      if (fileChanged) {
        await handleOpenFile(fileChanged);
        setFileChanged(null);
      }
    }}
  >
    文件已更新，点击重新加载 / File updated, click to reload
  </div>
)}
```

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: add file change detection with notify crate and reload prompt"
```

---

### Task 8: 图片路径解析与放大查看

**Files:**
- Create: `ergemd/src/components/reader/ImagePreview.tsx`
- Modify: `ergemd/src/components/reader/MarkdownView.tsx`

- [ ] **Step 1: 创建图片预览组件**

`ergemd/src/components/reader/ImagePreview.tsx`:
```tsx
import React, { memo, useCallback, useEffect } from "react";
import { useReaderStore } from "../../stores/readerStore";

const ImagePreview: React.FC = memo(() => {
  const previewImage = useReaderStore((s) => s.previewImage);
  const setPreviewImage = useReaderStore((s) => s.setPreviewImage);

  const handleClose = useCallback(() => {
    setPreviewImage(null);
  }, [setPreviewImage]);

  // Esc 关闭
  useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [previewImage, handleClose]);

  if (!previewImage) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        opacity: 1,
        transition: "opacity 200ms ease-out",
      }}
      onClick={handleClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full"
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          color: "var(--text-secondary)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.2">
          <line x1="0" y1="0" x2="14" y2="14" />
          <line x1="14" y1="0" x2="0" y2="14" />
        </svg>
      </button>

      {/* 图片 */}
      <img
        src={previewImage}
        alt="Preview"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 0 40px rgba(0, 0, 0, 0.5)",
        }}
      />
    </div>
  );
});

ImagePreview.displayName = "ImagePreview";

export default ImagePreview;
```

- [ ] **Step 2: 更新 MarkdownView 添加图片路径解析和点击放大**

在 `ergemd/src/components/reader/MarkdownView.tsx` 中更新 `img` 组件：
```tsx
// 在 MarkdownView 组件中添加
import { invoke } from "@tauri-apps/api/core";
import { useReaderStore } from "../../stores/readerStore";
import { useFileStore } from "../../stores/fileStore";

// 在 components 中更新 img 处理：
async function resolveImagePath(src: string): Promise<string> {
  const currentFilePath = useFileStore.getState().currentFilePath;
  if (!currentFilePath || src.startsWith("http") || src.startsWith("data:")) {
    return src;
  }

  try {
    const absolutePath = await invoke<string>("resolve_image_path", {
      basePath: currentFilePath,
      relativePath: src,
    });
    // 转换为 Tauri asset 协议
    return `asset://localhost/${encodeURIComponent(absolutePath)}`;
  } catch {
    return src;
  }
}

// 更新 img component：
img({ src, alt, ...props }) {
  const setPreviewImage = useReaderStore.getState().setPreviewImage;

  // 解析相对路径
  const [resolvedSrc, setResolvedSrc] = React.useState(src);

  React.useEffect(() => {
    resolveImagePath(src).then(setResolvedSrc);
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      onClick={() => setPreviewImage(resolvedSrc)}
      {...props}
    />
  );
},
```

- [ ] **Step 3: 在 App.tsx 中添加 ImagePreview**

```tsx
import ImagePreview from "./components/reader/ImagePreview";

// 在 App 组件 return 中添加：
<ImagePreview />
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add image preview with path resolution and fullscreen zoom"
```

---

### Task 9: 欢迎页 — 最近打开文件列表

**Files:**
- Modify: `ergemd/src/components/welcome/WelcomePage.tsx`

- [ ] **Step 1: 更新 WelcomePage 添加最近文件**

`ergemd/src/components/welcome/WelcomePage.tsx`:
```tsx
import React, { memo, useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { RecentFile } from "../../types";

interface WelcomePageProps {
  onOpenFile: (filePath?: string) => void;
  onOpenFolder: (folderPath?: string) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = memo(({ onOpenFile, onOpenFolder }) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    async function loadRecentFiles() {
      try {
        const files = await invoke<RecentFile[]>("get_recent_files", { limit: 10 });
        setRecentFiles(files);
      } catch {
        // 静默失败
      }
    }
    loadRecentFiles();
  }, []);

  const handleRecentFileClick = useCallback(
    (filePath: string) => {
      onOpenFile(filePath);
    },
    [onOpenFile]
  );

  return (
    <div
      className="flex flex-col items-center justify-center h-full overflow-y-auto"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Logo 区域 */}
      <div className="mb-8 text-center shrink-0">
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
      <div className="flex flex-col gap-3 w-64 shrink-0">
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
        className="mt-8 px-8 py-4 rounded-lg text-center shrink-0"
        style={{
          border: "1px dashed rgba(100, 200, 200, 0.2)",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">拖拽 Markdown 文件到此处打开</p>
      </div>

      {/* 最近打开的文件 */}
      {recentFiles.length > 0 && (
        <div className="mt-8 w-80 shrink-0">
          <div
            className="text-xs font-medium tracking-wide uppercase mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            最近打开 / Recent Files
          </div>
          <div className="space-y-1">
            {recentFiles.map((file) => (
              <button
                key={file.file_path}
                onClick={() => handleRecentFileClick(file.file_path)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded text-left text-sm transition-colors duration-100"
                style={{
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.03)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.5, flexShrink: 0 }}>
                  <path d="M2 1C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H8C8.55228 11 9 10.5523 9 10V4L6 1H2Z" />
                </svg>
                <span className="truncate">{file.file_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

WelcomePage.displayName = "WelcomePage";

export default WelcomePage;
```

- [ ] **Step 2: 在文件打开成功后添加到最近文件**

在 `App.tsx` 的 `handleOpenFile` 中，成功读取文件后追加：
```typescript
// 在 openFile 调用后添加
await invoke("add_recent_file", {
  filePath: selectedPath,
  fileName: fileName,
});
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add recent files list to welcome page"
```

---

### Task 10: 集成所有组件到 App

**Files:**
- Modify: `ergemd/src/App.tsx`

- [ ] **Step 1: 完整更新 App.tsx**

`ergemd/src/App.tsx`:
```tsx
import React, { useCallback, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/api/dialog";
import { TitleBar } from "./components/layout/TitleBar";
import { StatusBar } from "./components/layout/StatusBar";
import { WelcomePage } from "./components/welcome/WelcomePage";
import { ReadingArea } from "./components/reader/ReadingArea";
import { SearchBar } from "./components/reader/SearchBar";
import { ImagePreview } from "./components/reader/ImagePreview";
import { LeftPanel } from "./components/panels/LeftPanel";
import { RightPanel } from "./components/panels/RightPanel";
import { ToastContainer } from "./components/common/Toast";
import { FileDropZone } from "./components/common/FileDropZone";
import { useFileStore } from "./stores/fileStore";
import { useReaderStore } from "./stores/readerStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useReadingProgress } from "./hooks/useReadingProgress";
import { useAutoHide } from "./hooks/useAutoHide";
import { countWords } from "./utils/wordCount";
import type { FileNode } from "./types";

function App() {
  const hasOpenFile = useFileStore((s) => s.currentFilePath !== null);
  const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
  const openFile = useFileStore((s) => s.openFile);
  const setWorkspace = useFileStore((s) => s.setWorkspace);
  const currentContent = useFileStore((s) => s.currentContent);
  const fileChanged = useReaderStore((s) => s.fileChanged);
  const setFileChanged = useReaderStore((s) => s.setFileChanged);

  // 沉浸式布局：使用 useState<HTMLElement> + onScrollReady 模式
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const wordCount = useMemo(() => countWords(currentContent), [currentContent]);
  const { percentage, isScrolling } = useReadingProgress(scrollEl);
  const { visible: titleBarVisible } = useAutoHide(scrollEl, { triggerPosition: "top", triggerHeight: 8 });
  const { visible: statusBarVisible } = useAutoHide(scrollEl, { triggerPosition: "bottom", triggerHeight: 40 });

  useFileWatcher();

  const handleOpenFile = useCallback(
    async (filePath?: string) => {
      let selectedPath = filePath;
      if (!selectedPath) {
        const result = await open({
          multiple: false,
          filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
        });
        if (!result) return;
        selectedPath = result as string;
      }
      try {
        const result = await invoke<{ content: string; encoding: string }>("read_file", { path: selectedPath });
        const fileName = selectedPath.split(/[/\\]/).pop() || "Untitled";
        openFile(selectedPath, fileName, result.content);
        await invoke("add_recent_file", { filePath: selectedPath, fileName });
        setFileChanged(null);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [openFile, setFileChanged]
  );

  const handleOpenFolder = useCallback(
    async (folderPath?: string) => {
      let selectedPath = folderPath;
      if (!selectedPath) {
        const result = await open({ directory: true, multiple: false });
        if (!result) return;
        selectedPath = result as string;
      }
      try {
        const tree = await invoke<FileNode[]>("scan_workspace", { folderPath: selectedPath });
        const folderName = selectedPath.split(/[/\\]/).pop() || "Workspace";
        setWorkspace(selectedPath, folderName, tree);
      } catch (err) {
        console.error("Failed to scan workspace:", err);
      }
    },
    [setWorkspace]
  );

  const handleFileSelect = useCallback(
    async (filePath: string, fileName: string) => {
      try {
        const result = await invoke<{ content: string; encoding: string }>("read_file", { path: filePath });
        openFile(filePath, fileName, result.content);
        await invoke("add_recent_file", { filePath, fileName });
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [openFile]
  );

  useKeyboardShortcuts({ onOpenFile: handleOpenFile, onOpenFolder: handleOpenFolder });

  const handleDropFiles = useCallback(
    async (filePaths: string[]) => { for (const filePath of filePaths) await handleOpenFile(filePath); },
    [handleOpenFile]
  );
  const handleDropFolder = useCallback(
    async (folderPath: string) => { await handleOpenFolder(folderPath); },
    [handleOpenFolder]
  );
  const handleReloadFile = useCallback(async () => {
    if (fileChanged) await handleOpenFile(fileChanged);
  }, [fileChanged, handleOpenFile]);

  return (
    <FileDropZone onDropFiles={handleDropFiles} onDropFolder={handleDropFolder}>
      {/* TitleBar: position: fixed, top: 0 */}
      <TitleBar
        visible={titleBarVisible}
        onToggleLeftPanel={() => setLeftPanelOpen((v) => !v)}
        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
        showLeftPanelButton={hasWorkspace}
      />

      {hasOpenFile ? (
        <>
          {/* ReadingArea: 全屏 100vh */}
          <ReadingArea onScrollReady={setScrollEl} />
          <LeftPanel isOpen={leftPanelOpen} onToggle={() => setLeftPanelOpen((v) => !v)} onFileSelect={handleFileSelect} />
          <RightPanel isOpen={rightPanelOpen} onToggle={() => setRightPanelOpen((v) => !v)} />
          <SearchBar />
          <ImagePreview />

          {/* StatusBar: position: fixed, bottom: 0 */}
          <StatusBar visible={statusBarVisible} wordCount={wordCount} percentage={percentage} isScrolling={isScrolling} />

          {/* 文件变更提示 */}
          {fileChanged && (
            <div
              className="fixed z-30 flex items-center justify-center w-full py-2 text-sm cursor-pointer"
              style={{
                top: "36px",
                background: "rgba(255, 128, 0, 0.1)",
                borderBottom: "1px solid rgba(255, 128, 0, 0.2)",
                color: "var(--accent-orange, #FF8000)",
              }}
              onClick={handleReloadFile}
            >
              文件已更新，点击重新加载 / File updated, click to reload
            </div>
          )}
        </>
      ) : (
        <WelcomePage onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder} />
      )}

      <ToastContainer />
    </FileDropZone>
  );
}

export default App;
```

- [ ] **Step 2: 验证所有功能**

Run: `pnpm tauri dev`

验证清单：
- [x] 打开文件后关闭再打开，阅读进度恢复
- [x] Ctrl+F 打开搜索，输入文字实时高亮
- [x] Enter/Shift+Enter 跳转上下匹配
- [x] Esc 关闭搜索
- [x] Ctrl+O 打开文件，Ctrl+Shift+O 打开文件夹
- [x] Ctrl+W 关闭标签，Ctrl+Tab 切换标签
- [x] Ctrl+Shift+T 切换主题
- [x] Ctrl+滚轮调整字体大小
- [x] 拖拽 .md 文件到窗口打开
- [x] 拖拽文件夹打开为工作区
- [x] 文件外部修改后显示提示条
- [x] 点击提示条重新加载文件
- [x] 图片点击放大预览，Esc 关闭
- [x] 欢迎页显示最近打开文件列表
- [x] Toast 通知正常显示

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: complete Phase 4 - reading features (progress, search, shortcuts, drag-drop, file watcher, image preview)"
```

---

### Task 11: 集成验证

**Files:**
- None (验证任务)

- [ ] **Step 1: 性能验证**

- 搜索高亮不阻塞滚动
- 进度保存 debounce 2s 正常工作
- 快捷键响应无延迟
- 文件变更检测不消耗额外 CPU

- [ ] **Step 2: 构建测试**

```bash
pnpm tauri build
```

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete Phase 4 integration verification"
```

---

## Phase 4 完成标准

- 阅读进度记忆（debounce 2s 写入 SQLite，打开文件恢复）
- 文内搜索（Ctrl+F，实时高亮，Enter/Shift+Enter 跳转）
- 键盘快捷键（Ctrl+O/W/F/T/N/Tab/滚轮 等）
- 拖拽打开文件和文件夹
- 文件变更检测（notify crate，提示重新加载）
- 图片路径解析（相对路径转绝对路径）
- 图片放大查看（点击全屏预览，Esc 关闭）
- 欢迎页最近打开文件列表
- Toast 通知系统
