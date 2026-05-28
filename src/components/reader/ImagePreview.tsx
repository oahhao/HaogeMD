import { useReaderStore } from "@/stores/readerStore";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";

/**
 * 全屏图片预览组件。
 * - role="dialog" + aria-modal="true"
 * - 焦点陷阱：Tab/Shift+Tab 在模态内循环
 * - 打开时聚焦关闭按钮，关闭时恢复焦点
 * - Esc 关闭
 */
const ImagePreview: React.FC = memo(() => {
  const previewImage = useReaderStore((s) => s.previewImage);
  const setPreviewImage = useReaderStore((s) => s.setPreviewImage);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    setPreviewImage(null);
  }, [setPreviewImage]);

  // 获取模态内所有可聚焦元素
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!modalRef.current) return [];
    const selectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(selectors.join(",")),
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // 焦点陷阱 + Esc 关闭
  useEffect(() => {
    if (!previewImage) return;

    // 保存之前的焦点
    previousFocusRef.current = document.activeElement as HTMLElement;

    // 打开时聚焦关闭按钮
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      // 焦点陷阱：Tab / Shift+Tab 循环
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
      // 恢复焦点
      previousFocusRef.current?.focus();
    };
  }, [previewImage, handleClose, getFocusableElements]);

  const [loadError, setLoadError] = useState(false);

  // 重置 loadError 当图片切换时
  useEffect(() => {
    setLoadError(false);
  }, [previewImage]);

  if (!previewImage) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "var(--overlay-bg)",
      }}
      onClick={handleClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 关闭按钮 */}
      <button
        ref={closeButtonRef}
        onClick={handleClose}
        className="hover-btn-icon absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full border-none cursor-pointer p-0"
        style={{
          background: "var(--hover-bg-medium)",
          color: "var(--text-secondary, #787882)",
        }}
        aria-label="关闭预览"
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <line x1="0" y1="0" x2="14" y2="14" />
          <line x1="14" y1="0" x2="0" y2="14" />
        </svg>
      </button>

      {/* 图片 */}
      {loadError ? (
        <div
          className="text-sm"
          style={{ color: "var(--text-muted, #50505A)" }}
        >
          图片加载失败
        </div>
      ) : (
        <img
          src={previewImage}
          alt="预览图片"
          onClick={(e) => e.stopPropagation()}
          onError={() => setLoadError(true)}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          style={{
            boxShadow: "0 0 40px var(--shadow-popup)",
          }}
        />
      )}
    </div>
  );
});

ImagePreview.displayName = "ImagePreview";

export default ImagePreview;
