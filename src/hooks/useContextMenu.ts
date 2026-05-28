import type { ContextMenuEntry, ContextMenuState } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 右键菜单状态管理 Hook。
 *
 * 职责：
 * - 管理菜单的显示/隐藏、位置、菜单项列表
 * - 全局 click 事件关闭菜单
 * - ESC 键关闭菜单
 * - 菜单位置自动修正（防止超出视口）
 *
 * 不使用 Zustand：右键菜单是临时 UI，不需要全局持久化。
 */
export function useContextMenu() {
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 显示右键菜单
  const show = useCallback(
    (e: React.MouseEvent | MouseEvent, items: ContextMenuEntry[]) => {
      e.preventDefault();
      e.stopPropagation();

      const x = "clientX" in e ? e.clientX : 0;
      const y = "clientY" in e ? e.clientY : 0;

      // 延迟一帧获取菜单尺寸后再修正位置
      // 先设置初始位置，后续在 ContextMenu 组件中通过 useEffect 修正
      setMenuState({ visible: true, x, y, items });
    },
    [],
  );

  // 隐藏右键菜单
  const hide = useCallback(() => {
    setMenuState(null);
  }, []);

  // 全局 click 事件：点击菜单外部关闭
  useEffect(() => {
    if (!menuState?.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState(null);
      }
    };

    // 使用 mousedown 而非 click，响应更快
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuState?.visible]);

  // ESC 键关闭
  useEffect(() => {
    if (!menuState?.visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuState(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuState?.visible]);

  // 位置修正：防止菜单超出视口
  const adjustPosition = useCallback(
    (menuEl: HTMLDivElement) => {
      const rect = menuEl.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;

      let adjustedX = menuState?.x ?? 0;
      let adjustedY = menuState?.y ?? 0;

      // 右侧溢出
      if (rect.right > innerWidth) {
        adjustedX = innerWidth - rect.width - 4;
      }
      // 底部溢出
      if (rect.bottom > innerHeight) {
        adjustedY = innerHeight - rect.height - 4;
      }
      // 左侧溢出（极端情况）
      if (adjustedX < 0) adjustedX = 4;
      // 顶部溢出
      if (adjustedY < 0) adjustedY = 4;

      if (adjustedX !== menuState?.x || adjustedY !== menuState?.y) {
        setMenuState((prev) =>
          prev ? { ...prev, x: adjustedX, y: adjustedY } : null,
        );
      }
    },
    [menuState?.x, menuState?.y],
  );

  return { menuState, menuRef, show, hide, adjustPosition };
}
