import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import ReadingOptions from "./ReadingOptions";

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;
const RESIZE_EDGE_WIDTH = 8;

/**
 * 右侧阅读选项面板：
 * - 通过按钮切换显示/隐藏（非边缘触发）
 * - 使用 position: fixed 覆盖在正文上方，不挤压布局
 * - 从右侧滑入/滑出
 * - role="dialog" + aria-modal + 焦点陷阱
 * - 支持左侧边缘拖拽调整宽度
 */
const RightPanel: React.FC<RightPanelProps> = memo(({ isOpen, onToggle }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // 获取面板内所有可聚焦元素
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!panelRef.current) return [];
    const selectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(selectors.join(",")),
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // 焦点陷阱
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    requestAnimationFrame(() => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onToggleRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, getFocusableElements]);

  // 拖拽调整宽度逻辑
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
  }, []);

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-30 transition-opacity duration-200"
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onToggle}
      />

      {/* 面板 — 从右侧滑入 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="阅读选项"
        className="fixed right-0 z-40 overflow-hidden transition-transform duration-200"
        style={{
          top: "40px",
          height: "calc(100vh - 80px)",
          width: `${panelWidth}px`,
          minWidth: `${MIN_WIDTH}px`,
          maxWidth: `${MAX_WIDTH}px`,
          background: "var(--bg-sidebar, #1A1A2E)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          willChange: "transform",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 左侧拖拽调整边缘 */}
        <div
          className="absolute left-0 top-0 bottom-0 cursor-ew-resize z-10 transition-colors duration-150"
          style={{
            width: `${RESIZE_EDGE_WIDTH}px`,
            background: "transparent",
          }}
          onMouseDown={handleResizeStart}
          onMouseEnter={() => {
            if (!isResizing) {
              document.body.style.cursor = "ew-resize";
            }
          }}
          onMouseLeave={() => {
            if (!isResizing) {
              document.body.style.cursor = "";
            }
          }}
          aria-label="调整面板宽度"
        />

        {/* 面板标题 */}
        <div
          className="px-4 py-3 text-[13px] font-medium tracking-wide uppercase"
          style={{
            color: "var(--text-muted, #50505A)",
            borderBottom: "1px solid rgba(100, 200, 200, 0.05)",
            paddingLeft: `${RESIZE_EDGE_WIDTH + 16}px`,
          }}
        >
          阅读选项
        </div>

        {/* 内容区域 */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            paddingLeft: `${RESIZE_EDGE_WIDTH}px`,
          }}
        >
          <ReadingOptions />
        </div>
      </div>
    </>
  );
});

RightPanel.displayName = "RightPanel";

export default RightPanel;
