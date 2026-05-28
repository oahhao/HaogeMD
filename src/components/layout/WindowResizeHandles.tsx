import React, { memo, useCallback, useState } from "react";

type ResizeDirection =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface WindowResizeHandlesProps {
  edgeSize?: number;
  debug?: boolean;
}

const RESIZE_CURSORS: Record<ResizeDirection, string> = {
  top: "ns-resize",
  bottom: "ns-resize",
  left: "ew-resize",
  right: "ew-resize",
  "top-left": "nwse-resize",
  "top-right": "nesw-resize",
  "bottom-left": "nesw-resize",
  "bottom-right": "nwse-resize",
};

/**
 * 窗口边缘拉伸热区组件
 *
 * 在窗口四周和角落添加透明的拉伸触发热区。
 * 当 Tauri 的 dragDropEnabled 配置启用时，这些热区可以自动触发窗口拉伸。
 *
 * 使用方式：
 * - 添加到 App.tsx 中，作为最底层的固定定位元素
 * - 确保在其他内容之上
 */
export const WindowResizeHandles: React.FC<WindowResizeHandlesProps> = memo(
  ({ edgeSize = 8, debug = false }) => {
    const [activeDirection, setActiveDirection] =
      useState<ResizeDirection | null>(null);

    const handleMouseEnter = useCallback((direction: ResizeDirection) => {
      setActiveDirection(direction);
      document.body.style.cursor = RESIZE_CURSORS[direction];
    }, []);

    const handleMouseLeave = useCallback(() => {
      setActiveDirection(null);
      document.body.style.cursor = "";
    }, []);

    const handleMouseDown = useCallback(
      (_direction: ResizeDirection, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      [],
    );

    const edgeStyle = (direction: ResizeDirection): React.CSSProperties => {
      const isActive = activeDirection === direction;
      const baseStyle: React.CSSProperties = {
        position: "fixed",
        zIndex: 5,
        transition: "background-color 150ms ease",
      };

      const debugStyle = debug
        ? {
            backgroundColor: isActive
              ? "rgba(255, 0, 0, 0.5)"
              : "rgba(0, 255, 0, 0.3)",
          }
        : { backgroundColor: "transparent" };

      switch (direction) {
        case "top":
          return {
            ...baseStyle,
            ...debugStyle,
            top: 0,
            left: 0,
            right: 0,
            height: `${edgeSize}px`,
            cursor: "ns-resize",
          };
        case "bottom":
          return {
            ...baseStyle,
            ...debugStyle,
            bottom: 0,
            left: 0,
            right: 0,
            height: `${edgeSize}px`,
            cursor: "ns-resize",
          };
        case "left":
          return {
            ...baseStyle,
            ...debugStyle,
            top: 0,
            bottom: 0,
            left: 0,
            width: `${edgeSize}px`,
            cursor: "ew-resize",
          };
        case "right":
          return {
            ...baseStyle,
            ...debugStyle,
            top: 0,
            bottom: 0,
            right: 0,
            width: `${edgeSize}px`,
            cursor: "ew-resize",
          };
        case "top-left":
          return {
            ...baseStyle,
            ...debugStyle,
            top: 0,
            left: 0,
            width: `${edgeSize}px`,
            height: `${edgeSize}px`,
            cursor: "nwse-resize",
          };
        case "top-right":
          return {
            ...baseStyle,
            ...debugStyle,
            top: 0,
            right: 0,
            width: `${edgeSize}px`,
            height: `${edgeSize}px`,
            cursor: "nesw-resize",
          };
        case "bottom-left":
          return {
            ...baseStyle,
            ...debugStyle,
            bottom: 0,
            left: 0,
            width: `${edgeSize}px`,
            height: `${edgeSize}px`,
            cursor: "nesw-resize",
          };
        case "bottom-right":
          return {
            ...baseStyle,
            ...debugStyle,
            bottom: 0,
            right: 0,
            width: `${edgeSize}px`,
            height: `${edgeSize}px`,
            cursor: "nwse-resize",
          };
      }
    };

    return (
      <>
        <div
          style={edgeStyle("top")}
          onMouseEnter={() => handleMouseEnter("top")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("top", e)}
        />
        <div
          style={edgeStyle("bottom")}
          onMouseEnter={() => handleMouseEnter("bottom")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("bottom", e)}
        />
        <div
          style={edgeStyle("left")}
          onMouseEnter={() => handleMouseEnter("left")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("left", e)}
        />
        <div
          style={edgeStyle("right")}
          onMouseEnter={() => handleMouseEnter("right")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("right", e)}
        />
        <div
          style={edgeStyle("top-left")}
          onMouseEnter={() => handleMouseEnter("top-left")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("top-left", e)}
        />
        <div
          style={edgeStyle("top-right")}
          onMouseEnter={() => handleMouseEnter("top-right")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("top-right", e)}
        />
        <div
          style={edgeStyle("bottom-left")}
          onMouseEnter={() => handleMouseEnter("bottom-left")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("bottom-left", e)}
        />
        <div
          style={edgeStyle("bottom-right")}
          onMouseEnter={() => handleMouseEnter("bottom-right")}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => handleMouseDown("bottom-right", e)}
        />
      </>
    );
  },
);

WindowResizeHandles.displayName = "WindowResizeHandles";
