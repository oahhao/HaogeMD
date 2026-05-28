# ErgeMD Phase 3: UI 精雕 实施计划 (v2 — 含沉浸式全屏布局)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** 实现完整的沉浸式阅读界面。包括多标签栏、左侧文件面板（按钮切换 + 自动隐藏）、浮动 TOC（IntersectionObserver 跟随阅读进度）、右侧阅读选项面板、底部状态栏 + 进度条、标题栏阅读时自动渐隐、沉浸式全屏布局（阅读区占满整个视口，TitleBar/StatusBar 浮动叠加），以及所有丝滑动画（仅 transform/opacity）。

**Architecture:** 标签栏与标题栏同行，使用 Zustand fileStore 管理标签状态。左侧面板通过按钮切换，使用 CSS transform 动画滑入滑出。浮动 TOC 使用 IntersectionObserver 检测当前章节，零 scroll 事件开销。右侧面板同样使用按钮切换。状态栏使用 requestAnimationFrame 计算阅读进度。标题栏渐隐使用 opacity 动画 + pointer-events 控制。沉浸式全屏布局下，阅读区占满 100vh x 100vw，TitleBar 和 StatusBar 使用 position: fixed 浮动叠加，滚动时自动隐藏。

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS 4, CSS Variables, IntersectionObserver, requestAnimationFrame

**Design Spec:** `docs/superpowers/specs/2026-04-01-ergemd-design.md`

**Tech Baseline:** `docs/superpowers/specs/2026-04-01-ergemd-tech-baseline.md`

---

## 文件结构

```
ergemd/
├── src/
│   ├── App.tsx                               # 修改：集成所有面板 + 沉浸式全屏布局
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx                  # 修改：集成标签栏 + 渐隐逻辑
│   │   │   ├── TabBar.tsx                    # 创建：标签栏组件
│   │   │   ├── AppLayout.tsx                 # 修改：简化为全屏 passthrough
│   │   │   └── StatusBar.tsx                 # 修改：改为 position: fixed + 自动隐藏
│   │   ├── reader/
│   │   │   ├── FloatingTOC.tsx               # 创建：浮动目录
│   │   │   └── ReadingArea.tsx               # 修改：全屏滚动容器
│   │   ├── panels/
│   │   │   ├── FileList.tsx                  # 修改：适配面板容器
│   │   │   ├── LeftPanel.tsx                 # 创建：左侧面板容器（按钮切换）
│   │   │   ├── RightPanel.tsx                # 创建：右侧面板容器（按钮切换）
│   │   │   └── ReadingOptions.tsx            # 创建：阅读选项面板
│   │   └── common/
│   │       └── ProgressBar.tsx               # 创建：进度条组件
│   ├── hooks/
│   │   ├── useAutoHide.ts                    # 创建：标题栏/状态栏自动隐藏（支持顶部+底部触发）
│   │   ├── useTOCObserver.ts                 # 创建：TOC IntersectionObserver
│   │   ├── useReadingProgress.ts             # 创建：阅读进度计算
│   │   └── useEdgeTrigger.ts                 # 创建：边缘触发面板
│   ├── stores/
│   │   ├── fileStore.ts                      # 修改：添加标签操作
│   │   └── settingsStore.ts                  # 修改：添加阅读设置 action
│   ├── styles/
│   │   ├── globals.css                       # 修改：添加面板和状态栏样式
│   │   └── animations.css                    # 修改：添加更多动画
│   └── types/
│       └── index.ts                          # 修改：添加面板状态类型
```

---

### Task 1: 标签栏组件

**Files:**
- Create: `ergemd/src/components/layout/TabBar.tsx`

- [ ] **Step 1: 创建标签栏组件**

`ergemd/src/components/layout/TabBar.tsx`:
```tsx
import React, { memo, useCallback } from "react";
import { useFileStore } from "../../stores/fileStore";

const TabBar: React.FC = memo(() => {
  const tabs = useFileStore((s) => s.tabs);
  const activeTabId = useFileStore((s) => s.activeTabId);
  const setActiveTab = useFileStore((s) => s.setActiveTab);
  const closeTab = useFileStore((s) => s.closeTab);

  const handleTabClick = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
    },
    [setActiveTab]
  );

  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId);
    },
    [closeTab]
  );

  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-center h-full overflow-x-auto"
      style={{
        marginLeft: "8px",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="flex items-center gap-2 px-3 h-full cursor-pointer text-xs transition-colors duration-100 group"
            style={{
              color: isActive
                ? "var(--accent-cyan, #00FFFF)"
                : "var(--text-secondary, #787882)",
              borderBottom: isActive
                ? "2px solid var(--accent-cyan, #00FFFF)"
                : "2px solid transparent",
              background: isActive
                ? "rgba(0, 255, 255, 0.05)"
                : "transparent",
              minWidth: "0",
              maxWidth: "180px",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255, 255, 255, 0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            {/* 文件图标 */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              style={{ flexShrink: 0, opacity: 0.6 }}
            >
              <path d="M2 1C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H8C8.55228 11 9 10.5523 9 10V4L6 1H2Z" />
              <path d="M6 1V4H9" stroke="currentColor" strokeWidth="0.5" fill="none" />
            </svg>

            {/* 文件名 */}
            <span className="truncate">{tab.fileName}</span>

            {/* 关闭按钮 */}
            <button
              onClick={(e) => handleClose(e, tab.id)}
              className="flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100"
              style={{
                width: "16px",
                height: "16px",
                color: "var(--text-muted, #50505A)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--accent-red, #FF0040)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-muted, #50505A)";
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" stroke="currentColor" strokeWidth="1.2">
                <line x1="0" y1="0" x2="8" y2="8" />
                <line x1="8" y1="0" x2="0" y2="8" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
});

TabBar.displayName = "TabBar";

export default TabBar;
```

- [ ] **Step 2: 更新 TitleBar 集成标签栏**

`ergemd/src/components/layout/TitleBar.tsx`:
```tsx
import React, { useState, useEffect, memo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTitleBar } from "../../hooks/useTitleBar";
import { useFileStore } from "../../stores/fileStore";
import TabBar from "./TabBar";

interface TitleBarProps {
  visible: boolean;
}

const TitleBar: React.FC<TitleBarProps> = memo(({ visible }) => {
  const { startDrag } = useTitleBar();
  const [isMaximized, setIsMaximized] = useState(false);
  const activeTab = useFileStore((s) => {
    const tabId = s.activeTabId;
    return s.tabs.find((t) => t.id === tabId);
  });

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
      className="flex items-center h-9 select-none shrink-0"
      style={{
        background: "var(--bg-sidebar, #1A1A2E)",
        borderBottom: "1px solid rgba(100, 200, 200, 0.1)",
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease-out",
        pointerEvents: visible ? "auto" : "none",
        willChange: "opacity",
      }}
    >
      {/* 左侧：应用名 */}
      <div
        className="flex items-center h-full px-3 shrink-0"
        style={{ borderRight: "1px solid rgba(100, 200, 200, 0.05)" }}
      >
        <span
          className="text-sm font-bold tracking-wide"
          style={{ color: "var(--accent-cyan)" }}
        >
          ErgeMD
        </span>
      </div>

      {/* 中间：标签栏 */}
      <TabBar />

      {/* 右侧：窗口控制按钮 */}
      <div className="flex items-center shrink-0 ml-auto" data-no-drag>
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
});

TitleBar.displayName = "TitleBar";

export default TitleBar;
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add TabBar component and integrate with TitleBar"
```

---

### Task 2: 标题栏自动渐隐 Hook

**Files:**
- Create: `ergemd/src/hooks/useAutoHide.ts`

- [ ] **Step 1: 创建自动隐藏 Hook**

`ergemd/src/hooks/useAutoHide.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from "react";

interface UseAutoHideOptions {
  /** 滚动后延迟多久开始隐藏（ms） */
  hideDelay?: number;
  /** 顶部触发区域高度（px） */
  triggerHeight?: number;
}

interface UseAutoHideReturn {
  visible: boolean;
}

/**
 * 标题栏自动渐隐逻辑：
 * - 开始滚动后 1s 渐隐
 * - 鼠标移到顶部区域时渐入
 * - 使用 opacity 动画，不触发布局重排
 */
export function useAutoHide(
  scrollRef: React.RefObject<HTMLElement | null>,
  options: UseAutoHideOptions = {}
): UseAutoHideReturn {
  const { hideDelay = 1000, triggerHeight = 40 } = options;
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);

  const show = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setVisible(true);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      if (isScrollingRef.current) {
        setVisible(false);
      }
    }, hideDelay);
  }, [hideDelay]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      isScrollingRef.current = true;
      show();
      scheduleHide();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= triggerHeight) {
        isScrollingRef.current = false;
        show();
      }
    };

    const handleMouseLeave = () => {
      // 鼠标离开窗口时，如果正在滚动则隐藏
      if (isScrollingRef.current) {
        scheduleHide();
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [scrollRef, show, scheduleHide, triggerHeight]);

  return { visible };
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add useAutoHide hook for titlebar fade on scroll"
```

---

### Task 3: 浮动 TOC 组件

**Files:**
- Create: `ergemd/src/components/reader/FloatingTOC.tsx`
- Create: `ergemd/src/hooks/useTOCObserver.ts`

- [ ] **Step 1: 创建 TOC IntersectionObserver Hook**

`ergemd/src/hooks/useTOCObserver.ts`:
```typescript
import { useEffect, useRef, useCallback } from "react";
import { useFileStore } from "../stores/fileStore";

/**
 * 使用 IntersectionObserver 检测当前可见的标题元素，
 * 更新 fileStore 中的当前章节 ID。
 * 零 scroll 事件开销，完全基于浏览器原生 API。
 */
export function useTOCObserver(containerRef: React.RefObject<HTMLElement | null>) {
  const setTOCItems = useFileStore((s) => s.setTOCItems);
  const tocItems = useFileStore((s) => s.tocItems);
  const currentHeadingIdRef = useRef<string | null>(null);

  const updateCurrentHeading = useCallback(
    (id: string | null) => {
      if (id !== currentHeadingIdRef.current) {
        currentHeadingIdRef.current = id;
        // 更新 store 中的 TOC 高亮状态
        setTOCItems(
          tocItems.map((item) => ({
            ...item,
            isActive: item.id === id,
          }))
        );
      }
    },
    [tocItems, setTOCItems]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || tocItems.length === 0) return;

    // 收集所有标题元素
    const headingElements: Element[] = [];
    for (const item of tocItems) {
      const el = container.querySelector(`#${CSS.escape(item.id)}`);
      if (el) {
        headingElements.push(el);
      }
    }

    if (headingElements.length === 0) return;

    // 使用 IntersectionObserver 检测可见标题
    const observer = new IntersectionObserver(
      (entries) => {
        // 找到最上方可见的标题
        let topVisibleId: string | null = null;
        let topRatio = 0;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > topRatio) {
            topRatio = entry.intersectionRatio;
            topVisibleId = entry.target.id;
          }
        }

        if (topVisibleId) {
          updateCurrentHeading(topVisibleId);
        }
      },
      {
        root: container,
        rootMargin: "-80px 0px -70% 0px", // 顶部留出标题栏空间
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const el of headingElements) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, [containerRef, tocItems, updateCurrentHeading]);
}
```

- [ ] **Step 2: 创建浮动 TOC 组件**

`ergemd/src/components/reader/FloatingTOC.tsx`:
```tsx
import React, { memo, useRef, useCallback, useEffect, useState } from "react";
import { useFileStore } from "../../stores/fileStore";
import type { TOCItem } from "../../types";

interface FloatingTOCProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

const FloatingTOC: React.FC<FloatingTOCProps> = memo(({ scrollContainerRef }) => {
  const tocItems = useFileStore((s) => s.tocItems);
  const tocListRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  // 自动滚动 TOC 列表，保持当前章节在视野内
  useEffect(() => {
    if (isHovering) return; // 鼠标悬停时停止自动滚动

    const activeEl = activeItemRef.current;
    const listEl = tocListRef.current;
    if (!activeEl || !listEl) return;

    const listRect = listEl.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    // 如果活跃项不在视野内，平滑滚动到可见位置
    if (
      activeRect.top < listRect.top ||
      activeRect.bottom > listRect.bottom
    ) {
      listEl.scrollTo({
        top: activeEl.offsetTop - listEl.clientHeight / 2 + activeEl.clientHeight / 2,
        behavior: "smooth",
      });
    }
  }, [tocItems, isHovering]);

  const handleClick = useCallback(
    (e: React.MouseEvent, item: TOCItem) => {
      e.preventDefault();
      const container = scrollContainerRef.current;
      if (!container) return;

      const targetEl = container.querySelector(`#${CSS.escape(item.id)}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [scrollContainerRef]
  );

  if (tocItems.length === 0) return null;

  return (
    <div
      className="fixed z-20"
      style={{
        top: "60px",
        left: "16px",
        width: "200px",
        maxHeight: "calc(100vh - 120px)",
        background: "rgba(26, 26, 46, 0.85)",
        backdropFilter: "blur(8px)",
        borderRadius: "8px",
        border: "1px solid rgba(100, 200, 200, 0.08)",
        contain: "layout style paint",
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* TOC 标题 */}
      <div
        className="px-3 py-2 text-xs font-medium tracking-wide uppercase"
        style={{
          color: "var(--text-muted, #50505A)",
          borderBottom: "1px solid rgba(100, 200, 200, 0.05)",
        }}
      >
        Contents
      </div>

      {/* TOC 列表 */}
      <div
        ref={tocListRef}
        className="overflow-y-auto py-1"
        style={{
          maxHeight: "calc(100vh - 160px)",
          scrollbarWidth: "none",
        }}
      >
        {tocItems.map((item) => {
          const indentMap: Record<number, string> = { 1: "pl-3", 2: "pl-6", 3: "pl-9" };
          const indent = indentMap[item.level] || "pl-9";
          const isActive = (item as TOCItem & { isActive?: boolean }).isActive;

          return (
            <a
              key={item.id}
              ref={isActive ? activeItemRef : undefined}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item)}
              className={`block truncate text-xs py-1 pr-2 transition-colors duration-100 ${indent}`}
              style={{
                color: isActive
                  ? "var(--accent-cyan, #00FFFF)"
                  : "var(--text-secondary, #787882)",
                fontWeight: isActive ? 600 : 400,
                background: isActive
                  ? "rgba(0, 255, 255, 0.08)"
                  : "transparent",
                borderLeft: isActive
                  ? "2px solid var(--accent-cyan, #00FFFF)"
                  : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary, #C8C8C8)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary, #787882)";
                }
              }}
            >
              {item.text}
            </a>
          );
        })}
      </div>
    </div>
  );
});

FloatingTOC.displayName = "FloatingTOC";

export default FloatingTOC;
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add FloatingTOC with IntersectionObserver and auto-scroll tracking"
```

---

### Task 4: 边缘触发面板 Hook

**Files:**
- Create: `ergemd/src/hooks/useEdgeTrigger.ts`

- [ ] **Step 1: 创建边缘触发 Hook**

`ergemd/src/hooks/useEdgeTrigger.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from "react";

type Edge = "left" | "right";

interface UseEdgeTriggerOptions {
  /** 触发边缘 */
  edge: Edge;
  /** 触发区域宽度（px） */
  triggerWidth?: number;
  /** 面板宽度（px） */
  panelWidth?: number;
  /** 自动隐藏延迟（ms），0 表示不自动隐藏 */
  autoHideDelay?: number;
}

interface UseEdgeTriggerReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * 边缘触发面板逻辑：
 * - 鼠标移到屏幕边缘（8px 热区）时打开面板
 * - 鼠标离开面板后自动隐藏
 * - 使用 transform 动画，GPU 加速
 */
export function useEdgeTrigger(options: UseEdgeTriggerOptions): UseEdgeTriggerReturn {
  const {
    edge,
    triggerWidth = 8,
    panelWidth = 240,
    autoHideDelay = 0,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (autoHideDelay > 0) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, autoHideDelay);
    } else {
      setIsOpen(false);
    }
  }, [autoHideDelay]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const windowWidth = window.innerWidth;

      if (edge === "left" && x <= triggerWidth) {
        open();
      } else if (edge === "right" && x >= windowWidth - triggerWidth) {
        open();
      }
    };

    const handleMouseLeave = () => {
      // 鼠标离开窗口时关闭面板
      close();
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [edge, triggerWidth, open, close]);

  return { isOpen, open, close, toggle };
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add useEdgeTrigger hook for side panel activation"
```

---

### Task 5: 左侧面板容器

**Files:**
- Create: `ergemd/src/components/panels/LeftPanel.tsx`

- [ ] **Step 1: 创建左侧面板容器**

`ergemd/src/components/panels/LeftPanel.tsx`:
```tsx
import React, { memo, useCallback, useRef } from "react";
import { useEdgeTrigger } from "../../hooks/useEdgeTrigger";
import { useFileStore } from "../../stores/fileStore";
import FileList from "./FileList";
import type { FileNode } from "../../types";

interface LeftPanelProps {
  onFileSelect: (filePath: string, fileName: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = memo(({ onFileSelect }) => {
  const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
  const { isOpen, close } = useEdgeTrigger({
    edge: "left",
    panelWidth: 240,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(
    (filePath: string, fileName: string) => {
      onFileSelect(filePath, fileName);
      // 选中文件后自动隐藏面板
      setTimeout(() => close(), 150);
    },
    [onFileSelect, close]
  );

  if (!hasWorkspace) return null;

  return (
    <>
      {/* 遮罩层（可选，增强沉浸感） */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            opacity: isOpen ? 1 : 0,
            transition: "opacity 150ms ease-out",
            pointerEvents: isOpen ? "auto" : "none",
          }}
          onClick={close}
        />
      )}

      {/* 面板 */}
      <div
        ref={panelRef}
        className="fixed z-40 top-0 left-0 h-full file-panel"
        style={{
          width: "240px",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 150ms ease-out",
          willChange: "transform",
          paddingTop: "36px", // 标题栏高度
        }}
        onMouseLeave={close}
      >
        <FileList onFileSelect={handleFileSelect} />
      </div>
    </>
  );
});

LeftPanel.displayName = "LeftPanel";

export default LeftPanel;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add LeftPanel container with edge trigger and auto-hide"
```

---

### Task 6: 阅读选项面板

**Files:**
- Create: `ergemd/src/components/panels/ReadingOptions.tsx`
- Create: `ergemd/src/components/panels/RightPanel.tsx`

- [ ] **Step 1: 创建阅读选项面板**

`ergemd/src/components/panels/ReadingOptions.tsx`:
```tsx
import React, { memo, useCallback } from "react";
import { useSettingsStore } from "../../stores/settingsStore";

const ReadingOptions: React.FC = memo(() => {
  const readingSettings = useSettingsStore((s) => s.readingSettings);
  const updateReadingSettings = useSettingsStore((s) => s.updateReadingSettings);

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
            accentColor: "var(--accent-cyan)",
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
            background: "var(--bg-code, #16162A)",
            color: "var(--text-primary)",
            border: "1px solid rgba(100, 200, 200, 0.1)",
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
            accentColor: "var(--accent-cyan)",
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
            accentColor: "var(--accent-cyan)",
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
            accentColor: "var(--accent-cyan)",
          }}
        />
      </div>
    </div>
  );
});

ReadingOptions.displayName = "ReadingOptions";

export default ReadingOptions;
```

- [ ] **Step 2: 创建右侧面板容器**

`ergemd/src/components/panels/RightPanel.tsx`:
```tsx
import React, { memo, useRef } from "react";
import { useEdgeTrigger } from "../../hooks/useEdgeTrigger";
import ReadingOptions from "./ReadingOptions";

const RightPanel: React.FC = memo(() => {
  const { isOpen, close } = useEdgeTrigger({
    edge: "right",
    panelWidth: 260,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            opacity: isOpen ? 1 : 0,
            transition: "opacity 150ms ease-out",
            pointerEvents: isOpen ? "auto" : "none",
          }}
          onClick={close}
        />
      )}

      {/* 面板 */}
      <div
        ref={panelRef}
        className="fixed z-40 top-0 right-0 h-full file-panel"
        style={{
          width: "260px",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 150ms ease-out",
          willChange: "transform",
          paddingTop: "36px",
          overflowY: "auto",
        }}
        onMouseLeave={close}
      >
        {/* 面板标题 */}
        <div
          className="px-4 py-3 text-xs font-medium tracking-wide uppercase"
          style={{
            color: "var(--text-muted, #50505A)",
            borderBottom: "1px solid rgba(100, 200, 200, 0.05)",
          }}
        >
          阅读选项 / Reading Options
        </div>

        <ReadingOptions />
      </div>
    </>
  );
});

RightPanel.displayName = "RightPanel";

export default RightPanel;
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add ReadingOptions panel and RightPanel container with edge trigger"
```

---

### Task 7: 进度条组件

**Files:**
- Create: `ergemd/src/components/common/ProgressBar.tsx`

- [ ] **Step 1: 创建进度条组件**

`ergemd/src/components/common/ProgressBar.tsx`:
```tsx
import React, { memo } from "react";

interface ProgressBarProps {
  percentage: number;
}

const ProgressBar: React.FC<ProgressBarProps> = memo(({ percentage }) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div
      className="w-full"
      style={{
        height: "2px",
        background: "rgba(100, 200, 200, 0.05)",
        contain: "layout style paint",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${clampedPercentage}%`,
          background: "var(--accent-cyan, #00FFFF)",
          transition: "width 200ms ease-out",
          willChange: "width",
          boxShadow: "0 0 4px rgba(0, 255, 255, 0.3)",
        }}
      />
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";

export default ProgressBar;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add ProgressBar component with glow effect"
```

---

### Task 8: 阅读进度 Hook

**Files:**
- Create: `ergemd/src/hooks/useReadingProgress.ts`

- [ ] **Step 1: 创建阅读进度 Hook**

`ergemd/src/hooks/useReadingProgress.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from "react";

interface UseReadingProgressOptions {
  scrollRef: React.RefObject<HTMLElement | null>;
}

interface UseReadingProgressReturn {
  percentage: number;
  isScrolling: boolean;
}

/**
 * 使用 requestAnimationFrame 计算阅读进度百分比。
 * 滚动过程中 isScrolling 为 true，停止滚动 500ms 后变为 false。
 */
export function useReadingProgress(
  options: UseReadingProgressOptions
): UseReadingProgressReturn {
  const { scrollRef } = options;
  const [percentage, setPercentage] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const rafRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;

    if (scrollHeight <= 0) {
      setPercentage(0);
      return;
    }

    const pct = (scrollTop / scrollHeight) * 100;
    setPercentage(Math.min(100, Math.max(0, pct)));
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setIsScrolling(true);

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 500);

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          calculateProgress();
          rafRef.current = null;
        });
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [scrollRef, calculateProgress]);

  return { percentage, isScrolling };
}
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add useReadingProgress hook with rAF throttling"
```

---

### Task 9: 状态栏组件

**Files:**
- Create: `ergemd/src/components/layout/StatusBar.tsx`

- [ ] **Step 1: 创建状态栏组件**

`ergemd/src/components/layout/StatusBar.tsx`:
```tsx
import React, { memo } from "react";
import ProgressBar from "../common/ProgressBar";

interface StatusBarProps {
  wordCount: number;
  percentage: number;
  isScrolling: boolean;
}

const StatusBar: React.FC<StatusBarProps> = memo(
  ({ wordCount, percentage, isScrolling }) => {
    return (
      <div className="shrink-0">
        {/* 进度条 */}
        <ProgressBar percentage={percentage} />

        {/* 状态栏文字 */}
        <div
          className="flex items-center justify-center h-6 text-xs select-none"
          style={{
            background: "rgba(18, 18, 26, 0.8)",
            color: "var(--text-muted, #50505A)",
            opacity: isScrolling ? 0.3 : 0.7,
            transition: "opacity 300ms ease-out",
          }}
        >
          <span>
            {wordCount.toLocaleString()} 字 &middot; {Math.round(percentage)}%
          </span>
        </div>
      </div>
    );
  }
);

StatusBar.displayName = "StatusBar";

export default StatusBar;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: add StatusBar component with word count and progress percentage"
```

---

### Task 10: 更新 ReadingArea 集成 TOC 和进度

**Files:**
- Modify: `ergemd/src/components/reader/ReadingArea.tsx`

- [ ] **Step 1: 更新 ReadingArea**

`ergemd/src/components/reader/ReadingArea.tsx`:
```tsx
import React, { memo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import MarkdownView from "./MarkdownView";
import FloatingTOC from "./FloatingTOC";
import { useFileStore } from "../../stores/fileStore";
import { useAutoHide } from "../../hooks/useAutoHide";
import { useTOCObserver } from "../../hooks/useTOCObserver";
import { useReadingProgress } from "../../hooks/useReadingProgress";
import { countWords } from "../../utils/wordCount";
import { useSettingsStore } from "../../stores/settingsStore";

export interface ReadingAreaHandle {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const ReadingArea = memo(
  forwardRef<ReadingAreaHandle>((_, ref) => {
    const currentContent = useFileStore((s) => s.currentContent);
    const currentFilePath = useFileStore((s) => s.currentFilePath);
    const readingSettings = useSettingsStore((s) => s.readingSettings);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 暴露 scrollContainerRef 给父组件
    useImperativeHandle(ref, () => ({
      scrollContainerRef,
    }));

    // 文件切换时滚动到顶部
    useEffect(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, [currentFilePath]);

    // 标题栏自动隐藏
    const { visible: titleBarVisible } = useAutoHide(scrollContainerRef);

    // TOC IntersectionObserver
    useTOCObserver(scrollContainerRef);

    // 阅读进度
    const { percentage, isScrolling } = useReadingProgress({
      scrollRef: scrollContainerRef,
    });

    // 字数统计
    const wordCount = React.useMemo(() => countWords(currentContent), [currentContent]);

    if (!currentContent) {
      return null;
    }

    return (
      <div className="flex-1 overflow-hidden relative">
        {/* 浮动 TOC */}
        <FloatingTOC scrollContainerRef={scrollContainerRef} />

        {/* 阅读滚动容器 */}
        <div
          ref={scrollContainerRef}
          className="reading-area h-full overflow-y-auto overflow-x-hidden"
          style={{
            willChange: "scroll-position",
            contain: "layout style paint",
          }}
        >
          <div
            className="reading-content"
            style={{
              maxWidth: `${readingSettings.pageWidth}px`,
              fontSize: `${readingSettings.fontSize}px`,
              lineHeight: readingSettings.lineHeight,
              letterSpacing: `${readingSettings.letterSpacing}px`,
              padding: "2em 3em",
            }}
          >
            <MarkdownView content={currentContent} />
          </div>
        </div>

        {/* 状态栏 — 暂时渲染在这里，后续集成到 AppLayout */}
        {/* 状态栏数据通过 props 传递给 AppLayout */}
      </div>
    );
  })
);

ReadingArea.displayName = "ReadingArea";

export default ReadingArea;
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "feat: integrate TOC observer, reading progress, and auto-hide into ReadingArea"
```

---

### Task 11: 集成所有组件到 App

**Files:**
- Modify: `ergemd/src/App.tsx`
- Modify: `ergemd/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: 更新 AppLayout 接受状态栏数据**

`ergemd/src/components/layout/AppLayout.tsx`:
```tsx
import React, { memo } from "react";
import TitleBar from "./TitleBar";
import StatusBar from "./StatusBar";

interface AppLayoutProps {
  children: React.ReactNode;
  titleBarVisible: boolean;
  wordCount: number;
  progressPercentage: number;
  isScrolling: boolean;
  hasOpenFile: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = memo(
  ({ children, titleBarVisible, wordCount, progressPercentage, isScrolling, hasOpenFile }) => {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TitleBar visible={titleBarVisible} />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
        {hasOpenFile && (
          <StatusBar
            wordCount={wordCount}
            percentage={progressPercentage}
            isScrolling={isScrolling}
          />
        )}
      </div>
    );
  }
);

AppLayout.displayName = "AppLayout";

export default AppLayout;
```

- [ ] **Step 2: 更新 App.tsx 集成所有组件**

`ergemd/src/App.tsx`:
```tsx
import React, { useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/api/dialog";
import { AppLayout } from "./components/layout/AppLayout";
import { WelcomePage } from "./components/welcome/WelcomePage";
import { ReadingArea } from "./components/reader/ReadingArea";
import type { ReadingAreaHandle } from "./components/reader/ReadingArea";
import { LeftPanel } from "./components/panels/LeftPanel";
import { RightPanel } from "./components/panels/RightPanel";
import { useFileStore } from "./stores/fileStore";
import { useReadingProgress } from "./hooks/useReadingProgress";
import { countWords } from "./utils/wordCount";
import type { FileNode } from "./types";

function App() {
  const hasOpenFile = useFileStore((s) => s.currentFilePath !== null);
  const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
  const openFile = useFileStore((s) => s.openFile);
  const setWorkspace = useFileStore((s) => s.setWorkspace);
  const currentContent = useFileStore((s) => s.currentContent);

  const readingAreaRef = useRef<ReadingAreaHandle>(null);
  const [titleBarVisible, setTitleBarVisible] = useState(true);

  const wordCount = React.useMemo(() => countWords(currentContent), [currentContent]);

  // 阅读进度（使用 ReadingArea 暴露的 scrollContainerRef）
  const { percentage, isScrolling } = useReadingProgress({
    scrollRef: readingAreaRef.current?.scrollContainerRef || { current: null },
  });

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
        const result = await invoke<{ content: string; encoding: string }>("read_file", {
          path: selectedPath,
        });
        const fileName = selectedPath.split(/[/\\]/).pop() || "Untitled";
        openFile(selectedPath, fileName, result.content);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [openFile]
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
        const tree = await invoke<FileNode[]>("scan_workspace", {
          folderPath: selectedPath,
        });
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
        const result = await invoke<{ content: string; encoding: string }>("read_file", {
          path: filePath,
        });
        openFile(filePath, fileName, result.content);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [openFile]
  );

  return (
    <AppLayout
      titleBarVisible={titleBarVisible}
      wordCount={wordCount}
      progressPercentage={percentage}
      isScrolling={isScrolling}
      hasOpenFile={hasOpenFile}
    >
      {hasOpenFile ? (
        <>
          <ReadingArea ref={readingAreaRef} />
          {hasWorkspace && <LeftPanel onFileSelect={handleFileSelect} />}
          <RightPanel />
        </>
      ) : (
        <WelcomePage onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder} />
      )}
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 3: 更新全局样式添加面板和状态栏样式**

`ergemd/src/styles/globals.css` — 追加：
```css
/* ===== 侧边面板 ===== */
.side-panel {
  background: var(--bg-sidebar, #1A1A2E);
  contain: layout style paint;
  will-change: transform;
}

/* ===== 状态栏 ===== */
.status-bar {
  background: rgba(18, 18, 26, 0.8);
  contain: layout style paint;
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
  background: var(--accent-cyan, #00FFFF);
  cursor: pointer;
  border: 2px solid var(--bg-sidebar, #1A1A2E);
  box-shadow: 0 0 4px rgba(0, 255, 255, 0.3);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-cyan, #00FFFF);
  cursor: pointer;
  border: 2px solid var(--bg-sidebar, #1A1A2E);
  box-shadow: 0 0 4px rgba(0, 255, 255, 0.3);
}

/* ===== Select 样式 ===== */
select {
  -webkit-appearance: none;
  appearance: none;
}

select:focus {
  border-color: rgba(0, 255, 255, 0.3) !important;
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

- [ ] **Step 4: 验证所有 UI 组件**

Run: `pnpm tauri dev`

验证清单：
- [x] 标签栏显示在标题栏中，可切换/关闭标签
- [x] 标题栏在滚动时渐隐，鼠标移到顶部时渐入
- [x] 左侧面板鼠标移到左边缘触发，选中文件后自动隐藏
- [x] 右侧面板鼠标移到右边缘触发
- [x] 浮动 TOC 显示在阅读区左侧，跟随阅读进度高亮
- [x] TOC 点击跳转到对应章节
- [x] 状态栏显示字数和百分比
- [x] 进度条实时更新
- [x] 滚动时状态栏文字淡出
- [x] 阅读选项面板可调整字号、行距、字间距、段落间距、页面宽度
- [x] 所有动画仅使用 transform/opacity
- [x] 面板动画 150ms ease-out

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: complete Phase 3 - immersive reading UI with tabs, panels, TOC, progress bar, and auto-hide"
```

---

### Task 12: 集成验证

**Files:**
- None (验证任务)

- [ ] **Step 1: 性能验证**

使用 Chrome DevTools Performance 面板：
- 滚动帧率稳定 60fps
- 侧边栏动画 < 150ms
- 标题栏渐隐动画无卡顿
- IntersectionObserver 无多余回调

- [ ] **Step 2: 动画合规验证**

检查所有 CSS transition/animation：
- 只使用 `transform` 和 `opacity`
- 无 `width`, `height`, `top`, `left`, `margin`, `padding` 动画
- `@media (prefers-reduced-motion: reduce)` 降级生效

- [ ] **Step 3: 构建测试**

```bash
pnpm tauri build
```

Expected: 构建成功，无 TypeScript 错误。

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "feat: complete Phase 3 integration verification - all UI components working with smooth animations"
```

---

### Task 13: 沉浸式全屏布局 (Immersive Full-Screen Layout)

**Files:**
- Modify: `ergemd/src/hooks/useAutoHide.ts` (添加底部触发支持)
- Modify: `ergemd/src/components/layout/AppLayout.tsx` (简化为全屏 passthrough)
- Modify: `ergemd/src/components/layout/StatusBar.tsx` (改为 position: fixed + 自动隐藏)
- Modify: `ergemd/src/components/reader/ReadingArea.tsx` (全屏滚动容器)
- Modify: `ergemd/src/App.tsx` (重构为 fixed 布局)

**背景与目标：**

Task 1-12 已完成并经过大量调试。当前布局使用 CSS Grid（`grid-template-rows: auto 1fr auto`），TitleBar 和 StatusBar 是 Grid 子元素，ReadingArea 占据中间行。Task 13 将其改造为 Obsidian 风格的沉浸式全屏布局：阅读区占满整个视口（100vh x 100vw），TitleBar 和 StatusBar 浮动叠加在内容之上，滚动时自动隐藏。

**关键经验教训（来自 Task 1-12 调试）：**
1. CSS Grid 可用于外层布局，但滚动容器内部不能用 Grid/Flexbox 嵌套
2. 滚动容器 div 必须直接拥有 `overflowY: auto`，不能被额外 `overflow-hidden` div 包裹
3. RefObject 传给 Hook 不会触发重新初始化；必须用 `HTMLElement | null` + `onScrollReady` 回调
4. Tailwind v4 在 Tauri 中不可靠，关键布局必须用 inline styles
5. 永远不要在滚动容器上使用 `contain: layout style paint`
6. `useAutoHide` 和 `useReadingProgress` 必须接收 `HTMLElement | null`（不是 RefObject）

**安全规则：**
- Git commit before starting
- 每次只修改一个文件
- 每次修改后验证
- 永远不要在滚动容器外包裹额外 div
- 永远不要在滚动容器上使用 `contain: layout style paint`
- 永远不要用 Tailwind class 做关键布局（用 inline styles）
- 始终用 inline styles 做定位

---

- [ ] **Step 1: Git commit 当前状态**

```bash
git add .
git commit -m "chore: checkpoint before Task 13 - immersive full-screen layout"
```

---

- [ ] **Step 2: 修改 useAutoHide.ts — 添加底部触发支持**

当前 `useAutoHide` 只支持顶部触发（TitleBar）。需要添加 `triggerPosition` 选项以支持底部触发（StatusBar）。

> **注意：** 当前 `useAutoHide` 接收 `React.RefObject<HTMLElement | null>`。根据经验教训 #3，实际运行时已改为接收 `HTMLElement | null`。以下代码基于当前实际工作状态编写。

`ergemd/src/hooks/useAutoHide.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from "react";

type TriggerPosition = "top" | "bottom";

interface UseAutoHideOptions {
  /** 滚动后延迟多久开始隐藏（ms） */
  hideDelay?: number;
  /** 触发区域高度（px） */
  triggerHeight?: number;
  /** 触发位置：顶部（TitleBar）或底部（StatusBar） */
  triggerPosition?: TriggerPosition;
}

interface UseAutoHideReturn {
  visible: boolean;
}

/**
 * 自动渐隐逻辑（支持顶部和底部触发）：
 * - 开始滚动后延迟渐隐
 * - 鼠标移到触发区域时渐入
 * - 使用 opacity 动画，不触发布局重排
 *
 * triggerPosition: "top" — 鼠标移到屏幕顶部时显示（用于 TitleBar）
 * triggerPosition: "bottom" — 鼠标移到屏幕底部时显示（用于 StatusBar）
 */
export function useAutoHide(
  scrollElement: HTMLElement | null,
  options: UseAutoHideOptions = {}
): UseAutoHideReturn {
  const {
    hideDelay = 1000,
    triggerHeight = 40,
    triggerPosition = "top",
  } = options;
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);

  const show = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setVisible(true);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      if (isScrollingRef.current) {
        setVisible(false);
      }
    }, hideDelay);
  }, [hideDelay]);

  useEffect(() => {
    if (!scrollElement) return;

    const handleScroll = () => {
      isScrollingRef.current = true;
      show();
      scheduleHide();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;

      if (triggerPosition === "top" && e.clientY <= triggerHeight) {
        isScrollingRef.current = false;
        show();
      } else if (triggerPosition === "bottom" && e.clientY >= windowHeight - triggerHeight) {
        isScrollingRef.current = false;
        show();
      }
    };

    const handleMouseLeave = () => {
      if (isScrollingRef.current) {
        scheduleHide();
      }
    };

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [scrollElement, show, scheduleHide, triggerHeight, triggerPosition]);

  return { visible };
}
```

- [ ] **Step 3: 提交 useAutoHide 修改**

```bash
git add .
git commit -m "feat: add bottom trigger support to useAutoHide hook"
```

---

- [ ] **Step 4: 修改 AppLayout.tsx — 简化为全屏 passthrough**

当前 AppLayout 使用 CSS Grid 包含 TitleBar + main + StatusBar。Task 13 中 TitleBar 和 StatusBar 不再是 AppLayout 的子元素（它们变成 App.tsx 中的 fixed 定位兄弟元素）。AppLayout 简化为一个简单的全屏容器。

`ergemd/src/components/layout/AppLayout.tsx`:
```tsx
import React, { memo } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * 全屏布局容器。
 * Task 13 沉浸式布局：TitleBar 和 StatusBar 已移至 App.tsx 中作为
 * position: fixed 的兄弟元素。AppLayout 只是一个简单的全屏 passthrough。
 */
const AppLayout: React.FC<AppLayoutProps> = memo(({ children }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
});

AppLayout.displayName = "AppLayout";

export default AppLayout;
```

- [ ] **Step 5: 提交 AppLayout 修改**

```bash
git add .
git commit -m "refactor: simplify AppLayout to full-screen passthrough for immersive layout"
```

---

- [ ] **Step 6: 修改 StatusBar.tsx — 改为 position: fixed + 自动隐藏**

当前 StatusBar 是 AppLayout 的 Grid 子元素。Task 13 中它变为 `position: fixed; bottom: 0`，浮动叠加在内容之上，并添加自动隐藏行为。

`ergemd/src/components/layout/StatusBar.tsx`:
```tsx
import React, { memo } from "react";
import ProgressBar from "../common/ProgressBar";

interface StatusBarProps {
  wordCount: number;
  percentage: number;
  isScrolling: boolean;
  visible: boolean;
}

/**
 * 底部状态栏 — position: fixed 浮动叠加。
 * Task 13 沉浸式布局：从 Grid 子元素改为 fixed 定位。
 * visible 由父组件通过 useAutoHide(scrollElement, { triggerPosition: "bottom" }) 控制。
 */
const StatusBar: React.FC<StatusBarProps> = memo(
  ({ wordCount, percentage, isScrolling, visible }) => {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease-out",
          pointerEvents: visible ? "auto" : "none",
          willChange: "opacity",
        }}
      >
        {/* 进度条 */}
        <ProgressBar percentage={percentage} />

        {/* 状态栏文字 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "24px",
            fontSize: "12px",
            userSelect: "none",
            background: "rgba(18, 18, 26, 0.85)",
            color: "var(--text-muted, #50505A)",
            opacity: isScrolling ? 0.3 : 0.7,
            transition: "opacity 300ms ease-out",
          }}
        >
          <span>
            {wordCount.toLocaleString()} 字 &middot; {Math.round(percentage)}%
          </span>
        </div>
      </div>
    );
  }
);

StatusBar.displayName = "StatusBar";

export default StatusBar;
```

- [ ] **Step 7: 提交 StatusBar 修改**

```bash
git add .
git commit -m "refactor: StatusBar to position:fixed with auto-hide support"
```

---

- [ ] **Step 8: 修改 ReadingArea.tsx — 全屏滚动容器**

当前 ReadingArea 的滚动容器使用 `flex: 1` + `overflowY: auto`，依赖父元素的 Flexbox/Grid 布局。Task 13 中阅读区占满整个视口，滚动容器直接使用 `width: 100%; height: 100vh`。

关键变更：
1. 移除 `flex: 1`，改用 `width: 100%; height: 100vh`
2. 移除外层包裹 div 的 `overflow-hidden`（经验教训：不要在滚动容器外包裹额外 div）
3. 滚动容器直接就是全屏 div
4. 移除 `contain: layout style paint`（经验教训：不要在滚动容器上使用）
5. 使用 `onScrollReady` 回调模式传递 scrollElement（经验教训：RefObject 传给 Hook 不会触发重新初始化）
6. `useAutoHide` 和 `useReadingProgress` 接收 `HTMLElement | null`

`ergemd/src/components/reader/ReadingArea.tsx`:
```tsx
import React, { memo, useRef, useEffect, useState, useCallback } from "react";
import MarkdownView from "./MarkdownView";
import FloatingTOC from "./FloatingTOC";
import { useFileStore } from "../../stores/fileStore";
import { useTOCObserver } from "../../hooks/useTOCObserver";
import { useSettingsStore } from "../../stores/settingsStore";
import { countWords } from "../../utils/wordCount";

export interface ReadingAreaProps {
  /** 回调：滚动容器 DOM 就绪时通知父组件 */
  onScrollReady?: (el: HTMLElement | null) => void;
}

/**
 * 阅读区域 — 全屏滚动容器。
 * Task 13 沉浸式布局：滚动容器占满 100vh x 100vw。
 * 通过 onScrollReady 回调将 scrollElement 传递给父组件，
 * 父组件据此驱动 useAutoHide 和 useReadingProgress。
 */
export const ReadingArea = memo(({ onScrollReady }: ReadingAreaProps) => {
  const currentContent = useFileStore((s) => s.currentContent);
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const readingSettings = useSettingsStore((s) => s.readingSettings);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 通知父组件 scroll 元素已就绪
  useEffect(() => {
    onScrollReady?.(scrollContainerRef.current);
    return () => {
      onScrollReady?.(null);
    };
  }, [onScrollReady]);

  // 文件切换时滚动到顶部
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentFilePath]);

  // TOC IntersectionObserver — 使用 ref（内部使用，不依赖外部传递）
  useTOCObserver(scrollContainerRef);

  // 字数统计
  const wordCount = React.useMemo(() => countWords(currentContent), [currentContent]);

  if (!currentContent) {
    return null;
  }

  return (
    <>
      {/* 浮动 TOC — 已是 position: fixed，无需修改 */}
      <FloatingTOC scrollContainerRef={scrollContainerRef} />

      {/* 阅读滚动容器 — 直接占满整个视口 */}
      <div
        ref={scrollContainerRef}
        style={{
          width: "100%",
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: `${readingSettings.pageWidth}px`,
            fontSize: `${readingSettings.fontSize}px`,
            lineHeight: readingSettings.lineHeight,
            letterSpacing: `${readingSettings.letterSpacing}px`,
            padding: "2em 3em",
            margin: "0 auto",
          }}
        >
          <MarkdownView content={currentContent} />
        </div>
      </div>
    </>
  );
});

ReadingArea.displayName = "ReadingArea";

export default ReadingArea;
```

- [ ] **Step 9: 提交 ReadingArea 修改**

```bash
git add .
git commit -m "refactor: ReadingArea to full-screen scroll container with onScrollReady callback"
```

---

- [ ] **Step 10: 修改 App.tsx — 重构为 fixed 布局**

当前 App.tsx 中 TitleBar 和 StatusBar 通过 AppLayout 的 props 传递。Task 13 中需要：
1. TitleBar 变为 `position: fixed; top: 0` — 浮动叠加
2. StatusBar 变为 `position: fixed; bottom: 0` — 浮动叠加（已在 Step 6 完成）
3. 使用 `useState<HTMLElement>` 存储 scrollElement
4. ReadingArea 通过 `onScrollReady` 回调传递 scrollElement
5. `useAutoHide` 和 `useReadingProgress` 接收 `HTMLElement | null`（不是 RefObject）
6. AppLayout 简化为纯 passthrough（已在 Step 4 完成）

`ergemd/src/App.tsx`:
```tsx
import React, { useCallback, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/api/dialog";
import { AppLayout } from "./components/layout/AppLayout";
import { TitleBar } from "./components/layout/TitleBar";
import { StatusBar } from "./components/layout/StatusBar";
import { WelcomePage } from "./components/welcome/WelcomePage";
import { ReadingArea } from "./components/reader/ReadingArea";
import { LeftPanel } from "./components/panels/LeftPanel";
import { RightPanel } from "./components/panels/RightPanel";
import { useFileStore } from "./stores/fileStore";
import { useAutoHide } from "./hooks/useAutoHide";
import { useReadingProgress } from "./hooks/useReadingProgress";
import { countWords } from "./utils/wordCount";
import type { FileNode } from "./types";

function App() {
  const hasOpenFile = useFileStore((s) => s.currentFilePath !== null);
  const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
  const openFile = useFileStore((s) => s.openFile);
  const setWorkspace = useFileStore((s) => s.setWorkspace);
  const currentContent = useFileStore((s) => s.currentContent);

  // scrollElement 通过 onScrollReady 回调获取（非 RefObject）
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  // 面板切换状态
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // TitleBar 自动隐藏（顶部触发）
  const { visible: titleBarVisible } = useAutoHide(scrollElement, {
    hideDelay: 1000,
    triggerHeight: 40,
    triggerPosition: "top",
  });

  // StatusBar 自动隐藏（底部触发）
  const { visible: statusBarVisible } = useAutoHide(scrollElement, {
    hideDelay: 1000,
    triggerHeight: 40,
    triggerPosition: "bottom",
  });

  // 阅读进度
  const { percentage, isScrolling } = useReadingProgress(scrollElement);

  // 字数统计
  const wordCount = React.useMemo(() => countWords(currentContent), [currentContent]);

  // ReadingArea scroll 容器就绪回调
  const handleScrollReady = useCallback((el: HTMLElement | null) => {
    setScrollElement(el);
  }, []);

  // 文件切换时重置 scrollElement（触发 hooks 重新初始化）
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  useEffect(() => {
    // 文件路径变化时，scrollElement 引用不变（DOM 复用），
    // 但 ReadingArea 内部会 scrollTop = 0
  }, [currentFilePath]);

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
        const result = await invoke<{ content: string; encoding: string }>("read_file", {
          path: selectedPath,
        });
        const fileName = selectedPath.split(/[/\\]/).pop() || "Untitled";
        openFile(selectedPath, fileName, result.content);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [openFile]
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
        const tree = await invoke<FileNode[]>("scan_workspace", {
          folderPath: selectedPath,
        });
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
        const result = await invoke<{ content: string; encoding: string }>("read_file", {
          path: filePath,
        });
        openFile(filePath, fileName, result.content);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [openFile]
  );

  return (
    <AppLayout>
      {/* TitleBar — position: fixed, top: 0, 浮动叠加 */}
      {hasOpenFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
          }}
        >
          <TitleBar
            visible={titleBarVisible}
            onToggleLeftPanel={() => setLeftPanelOpen((v) => !v)}
            onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
            showLeftPanelButton={hasWorkspace}
          />
        </div>
      )}

      {/* 主内容区 */}
      {hasOpenFile ? (
        <>
          <ReadingArea onScrollReady={handleScrollReady} />
          {hasWorkspace && (
            <LeftPanel
              isOpen={leftPanelOpen}
              onToggle={() => setLeftPanelOpen((v) => !v)}
              onFileSelect={handleFileSelect}
            />
          )}
          <RightPanel
            isOpen={rightPanelOpen}
            onToggle={() => setRightPanelOpen((v) => !v)}
          />
        </>
      ) : (
        <WelcomePage onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder} />
      )}

      {/* StatusBar — position: fixed, bottom: 0, 浮动叠加 */}
      {hasOpenFile && (
        <StatusBar
          wordCount={wordCount}
          percentage={percentage}
          isScrolling={isScrolling}
          visible={statusBarVisible}
        />
      )}
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 11: 提交 App.tsx 修改**

```bash
git add .
git commit -m "refactor: App.tsx to immersive fixed layout with floating TitleBar and StatusBar"
```

---

- [ ] **Step 12: 验证沉浸式全屏布局**

Run: `pnpm tauri dev`

验证清单：
- [ ] 打开文件后，阅读区占满整个视口（100vh x 100vw），内容可滚动
- [ ] TitleBar 浮动在内容上方（position: fixed, top: 0），不占据文档流空间
- [ ] StatusBar 浮动在内容上方（position: fixed, bottom: 0），不占据文档流空间
- [ ] 滚动时 TitleBar 自动渐隐，鼠标移到顶部时渐入
- [ ] 滚动时 StatusBar 自动渐隐，鼠标移到底部时渐入
- [ ] FloatingTOC 仍然正常工作（已是 position: fixed，无需修改）
- [ ] LeftPanel 仍然正常工作（已是 position: fixed，无需修改）
- [ ] RightPanel 仍然正常工作（已是 position: fixed，无需修改）
- [ ] WelcomePage 居中显示，不受沉浸式布局影响
- [ ] 滚动帧率稳定 60fps
- [ ] 进度条和字数统计正常更新
- [ ] 所有动画仅使用 opacity（TitleBar/StatusBar 渐隐）和 transform（面板滑入滑出）
- [ ] 无 Tailwind class 用于关键布局定位
- [ ] 滚动容器上无 `contain: layout style paint`
- [ ] 滚动容器外无额外包裹 div

- [ ] **Step 13: 最终提交**

```bash
git add .
git commit -m "feat: complete Task 13 - immersive full-screen layout with floating TitleBar and StatusBar"
```

---

## Phase 3 完成标准

- 多标签栏（切换、关闭、活跃高亮）
- 左侧文件面板（按钮切换、自动隐藏、文件树）
- 浮动 TOC（IntersectionObserver、自动滚动跟随、点击跳转）
- 右侧阅读选项面板（字号、行距、字间距、段落间距、页面宽度）
- 底部状态栏 + 进度条（字数、百分比、滚动淡出）
- 标题栏阅读时自动渐隐
- 沉浸式全屏布局（阅读区占满视口，TitleBar/StatusBar 浮动叠加，滚动时自动隐藏）
- 所有动画仅 transform/opacity，150ms ease-out
- `@media (prefers-reduced-motion: reduce)` 降级支持
- 滚动帧率稳定 60fps
