import { useEffect, useRef, useState } from "react";

type TriggerPosition = "top" | "bottom";

interface UseAutoHideOptions {
  /** 触发区域高度（px），默认 36 */
  triggerHeight?: number;
  /** 触发位置 */
  triggerPosition?: TriggerPosition;
}

interface UseAutoHideReturn {
  visible: boolean;
  /** CSS transition 值，由调用方直接应用到 style.transition */
  transition: string;
}

/**
 * 沉浸式自动渐隐：
 * - scrollElement 就绪前：TitleBar 始终可见
 * - scrollElement 就绪后：立即开始渐隐
 * - 鼠标进入触发区域：渐显（300ms）
 * - 鼠标离开触发区域：渐隐（3000ms）
 *
 * 返回 transition 字符串，调用方直接用于 style.transition，
 * 确保 transition 和 opacity 在同一个 style 对象中同步更新。
 */
export function useAutoHide(
  scrollElement: HTMLElement | null,
  options: UseAutoHideOptions = {},
): UseAutoHideReturn {
  const { triggerHeight = 36, triggerPosition = "top" } = options;

  const [visible, setVisible] = useState(true);
  const [transition, setTransition] = useState("opacity 300ms ease-out");
  const isReadyRef = useRef(false);
  // 使用 ref 追踪当前状态，避免每次 mousemove 都触发 setState
  const stateRef = useRef({
    visible: true,
    transition: "opacity 300ms ease-out",
  });

  // scrollElement 就绪后，立即开始渐隐
  useEffect(() => {
    if (scrollElement) {
      isReadyRef.current = true;
      const frameId = requestAnimationFrame(() => {
        stateRef.current = {
          visible: false,
          transition: "opacity 3000ms ease-in-out",
        };
        setTransition("opacity 3000ms ease-in-out");
        setVisible(false);
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [scrollElement]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isReadyRef.current) return;

      const windowHeight = window.innerHeight;
      const inZone =
        triggerPosition === "top"
          ? e.clientY <= triggerHeight
          : e.clientY >= windowHeight - triggerHeight;

      const current = stateRef.current;

      if (inZone && !current.visible) {
        // 进入触发区域 → 渐显
        stateRef.current = {
          visible: true,
          transition: "opacity 300ms ease-out",
        };
        setTransition("opacity 300ms ease-out");
        setVisible(true);
      } else if (!inZone && current.visible) {
        // 离开触发区域 → 渐隐
        stateRef.current = {
          visible: false,
          transition: "opacity 3000ms ease-in-out",
        };
        setTransition("opacity 3000ms ease-in-out");
        setVisible(false);
      }
      // 状态未变化时不调用 setState，避免无意义的 re-render
    };

    const handleMouseLeave = () => {
      if (!isReadyRef.current) return;
      const current = stateRef.current;
      if (current.visible) {
        stateRef.current = {
          visible: false,
          transition: "opacity 3000ms ease-in-out",
        };
        setTransition("opacity 3000ms ease-in-out");
        setVisible(false);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [triggerHeight, triggerPosition]);

  return { visible, transition };
}
