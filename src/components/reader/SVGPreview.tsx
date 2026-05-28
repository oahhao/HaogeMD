import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface SVGPreviewProps {
  svgHtml: string;
  onClose: () => void;
}

const SVGPreview: React.FC<SVGPreviewProps> = memo(({ svgHtml, onClose }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const lastContextMenuTime = useRef(0);

  // 滚轮缩放
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => Math.max(0.2, Math.min(5, prev + delta)));
  }, []);

  // 拖拽平移
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      positionStart.current = { ...position };
    },
    [position],
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: positionStart.current.x + dx,
      y: positionStart.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // 双击重置
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const svgElement = container.querySelector("svg");
    if (!svgElement) return;

    calculateAndSetScale(svgElement, container);
  }, []);

  // 计算并设置缩放
  const calculateAndSetScale = useCallback(
    (svgElement: SVGElement, container: HTMLElement) => {
      const containerWidth = container.clientWidth * 0.9;
      const containerHeight = container.clientHeight * 0.9;

      // 获取SVG实际尺寸
      const rect = svgElement.getBoundingClientRect();
      let svgWidth = rect.width;
      let svgHeight = rect.height;

      // 如果渲染尺寸不可用，尝试从属性获取
      if (svgWidth <= 0 || svgHeight <= 0) {
        svgWidth = parseFloat(svgElement.getAttribute("width") || "") || 100;
        svgHeight = parseFloat(svgElement.getAttribute("height") || "") || 100;
      }

      // 如果还是不行，尝试从viewBox获取
      if (svgWidth <= 0 || svgHeight <= 0) {
        const viewBox = svgElement.getAttribute("viewBox");
        if (viewBox) {
          const parts = viewBox.split(/\s+/).map(parseFloat);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            svgWidth = parts[2];
            svgHeight = parts[3];
          }
        }
      }

      // 计算缩放比例：确保图表完全适应视口
      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      const initialScale = Math.min(scaleX, scaleY);

      setScale(Math.min(5, Math.max(0.2, initialScale)));
      setPosition({ x: 0, y: 0 });
    },
    [],
  );

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastContextMenuTime.current = Date.now();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  // 保存 SVG
  const handleSaveSvg = useCallback(async () => {
    try {
      const filePath = await save({
        defaultPath: "chart.svg",
        filters: [{ name: "SVG Image", extensions: ["svg"] }],
      });
      if (!filePath) {
        setShowContextMenu(false);
        return;
      }
      await invoke("write_file", { path: filePath, content: svgHtml });
    } catch (err) {
      console.error("Failed to save SVG:", err);
      alert(t("svg.saveFailed"));
    }
    setShowContextMenu(false);
  }, [svgHtml]);

  // 点击其他地方关闭右键菜单
  const handleClickOutsideContextMenu = useCallback(
    (e: MouseEvent) => {
      if (Date.now() - lastContextMenuTime.current < 200) return;
      const target = e.target as HTMLElement;
      const isInsideMenu = target.closest(".svg-context-menu");
      if (!isInsideMenu && showContextMenu) {
        setShowContextMenu(false);
      }
    },
    [showContextMenu],
  );

  // 自动计算初始缩放比例
  useEffect(() => {
    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) {
        setTimeout(calculateScale, 50);
        return;
      }

      const svgElement = container.querySelector("svg");
      if (!svgElement) {
        setTimeout(calculateScale, 50);
        return;
      }

      calculateAndSetScale(svgElement, container);
    };

    requestAnimationFrame(() => {
      setTimeout(calculateScale, 100);
    });
  }, [svgHtml, calculateAndSetScale]);

  // Esc 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showContextMenu) {
          setShowContextMenu(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutsideContextMenu);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutsideContextMenu);
    };
  }, [onClose, showContextMenu, handleClickOutsideContextMenu]);

  // 绑定/解绑全局事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "var(--overlay-bg)" }}
      onClick={onClose}
    >
      {/* 顶部工具栏 */}
      <div
        className="absolute left-1/2 flex items-center gap-3 px-4 py-2 rounded-lg"
        style={{
          top: "50px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--divider)",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale((s) => Math.max(0.2, s - 0.2))}
          className="hover-btn-icon flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-secondary)",
            fontSize: "16px",
          }}
          aria-label={t("zoom.zoomOut")}
        >
          −
        </button>
        <span
          className="text-xs tabular-nums"
          style={{
            color: "var(--text-muted)",
            minWidth: "40px",
            textAlign: "center",
          }}
        >
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(5, s + 0.2))}
          className="hover-btn-icon flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-secondary)",
            fontSize: "16px",
          }}
          aria-label={t("zoom.zoomIn")}
        >
          +
        </button>
        <button
          onClick={handleDoubleClick}
          className="hover-btn-icon flex items-center justify-center h-7 px-2 rounded border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-muted)",
            fontSize: "11px",
          }}
        >
          {t("zoom.reset")}
        </button>
        <div className="w-px h-5 bg-[var(--divider)]" />
        <button
          onClick={handleSaveSvg}
          className="hover-btn-icon flex items-center justify-center h-7 px-2 rounded border-none cursor-pointer gap-1.5"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-secondary)",
            fontSize: "11px",
          }}
        >
          <span>SVG</span>
        </button>
        <button
          onClick={onClose}
          className="hover-btn-icon flex items-center justify-center w-7 h-7 rounded-full border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-medium)",
            color: "var(--text-secondary)",
          }}
          aria-label={t("zoom.close")}
        >
          ✕
        </button>
      </div>

      {/* SVG 容器 */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ padding: "60px 20px 40px" }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* 使用绝对定位实现精确居中 */}
        <div
          ref={svgWrapperRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ userSelect: "none" }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: svgHtml }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging.current
                ? "none"
                : "transform 0.15s ease-out",
            }}
          />
        </div>
      </div>

      {/* 右键菜单 */}
      {showContextMenu && (
        <div
          className="svg-context-menu fixed z-[60] flex flex-col min-w-[160px] py-2 rounded-lg shadow-xl"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            background: "var(--bg-secondary)",
            border: "1px solid var(--divider)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleSaveSvg}
            className="text-left text-sm border-none cursor-pointer rounded"
            style={{
              background: "transparent",
              color: "var(--text-primary)",
              padding: "10px 16px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg-medium)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {t("svg.saveAs")}
          </button>
        </div>
      )}

      {/* 底部提示 */}
      <div
        className="absolute left-1/2 text-sm rounded"
        style={{
          bottom: "32px",
          background: "var(--bg-secondary)",
          color: "var(--text-muted)",
          border: "1px solid var(--divider)",
          transform: "translateX(-50%)",
          paddingLeft: "10px",
          paddingRight: "10px",
          paddingTop: "6px",
          paddingBottom: "6px",
          opacity: 0.9,
        }}
      >
        {t("svg.hint")}
      </div>
    </div>
  );
});

SVGPreview.displayName = "SVGPreview";

export default SVGPreview;
