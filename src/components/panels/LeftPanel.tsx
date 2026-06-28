import { useFileStore } from "@/stores/fileStore";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import FileList from "./FileList";

interface LeftPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onFileSelect: (filePath: string, fileName: string) => void;
}

/**
 * 左侧文件面板：
 * - 通过按钮切换显示/隐藏（非边缘触发）
 * - 使用 position: fixed 覆盖在正文上方，不挤压布局
 * - 面板 zIndex: 40，遮罩层 zIndex: 30
 * - 遮罩层仅在阅读模式下显示（hasOpenFile 时），
 *   欢迎页模式下不显示遮罩，避免挡住背景按钮
 * - 支持拖拽右边缘调整宽度（180px ~ 480px）
 * - role="dialog" + aria-modal + 焦点陷阱
 */
const LeftPanel: React.FC<LeftPanelProps> = memo(
  ({ isOpen, onToggle, onFileSelect }) => {
    const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
    const hasOpenFile = useFileStore((s) => s.currentFilePath !== null);
    const [panelWidth, setPanelWidth] = useState(240);
    const isResizingRef = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const onToggleRef = useRef(onToggle);
    onToggleRef.current = onToggle;

    // 获取面板内所有可聚焦元素
    const getFocusableElements = useCallback((): HTMLElement[] => {
      if (!panelRef.current) return [];
      const selectors = [
        "a[href]",
        "button:not([disabled])",
        '[role="treeitem"]',
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

      // 打开时聚焦面板内第一个可聚焦元素
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

    // 拖拽调整宽度
    const handleResizeMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizingRef.current = true;

        const startX = e.clientX;
        const startWidth = panelWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!isResizingRef.current) return;
          const delta = moveEvent.clientX - startX;
          const newWidth = Math.max(180, Math.min(480, startWidth + delta));
          setPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
          isResizingRef.current = false;
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      },
      [panelWidth],
    );

    if (!hasWorkspace) return null;

    return (
      <>
        {/* 遮罩层 — 仅在阅读模式下显示，避免挡住 WelcomePage 的按钮 */}
        {isOpen && hasOpenFile && (
          <div
            className="fixed inset-0 z-30 transition-opacity duration-150"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              opacity: isOpen ? 1 : 0,
            }}
            onClick={onToggle}
          />
        )}

        {/* 面板 */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="文件列表"
          className="fixed z-40 left-0 flex flex-col"
          style={{
            top: "40px",
            height: "calc(100vh - 80px)",
            width: `${panelWidth}px`,
            background: "var(--bg-sidebar, #1A1A2E)",
            transform: isOpen ? "translateX(0)" : "translateX(-100%)",
            transition: isResizingRef.current
              ? "none"
              : "transform 150ms ease-out",
            willChange: "transform",
            borderRight: "1px solid rgba(100, 200, 200, 0.08)",
          }}
        >
          {/* 文件列表 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <FileList onFileSelect={onFileSelect} />
          </div>

          {/* 拖拽调整宽度的把手 */}
          {isOpen && (
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={handleResizeMouseDown}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-[1]"
            />
          )}
        </div>
      </>
    );
  },
);

LeftPanel.displayName = "LeftPanel";

export default LeftPanel;
