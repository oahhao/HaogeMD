import { useEffect, useRef, useState } from "react";
import { useInteractionConfig } from "./useActiveConfig";

interface UseReadingProgressReturn {
  percentage: number;
  isScrolling: boolean;
}

/**
 * 使用 requestAnimationFrame 计算阅读进度百分比。
 * 滚动过程中 isScrolling 为 true，停止滚动后变为 false。
 *
 * setPercentage 节流到 100ms，避免每帧触发 App re-render。
 * cacheScrollPercentage 由 ReadingArea 的 scroll listener 负责，此处不重复。
 */
export function useReadingProgress(
  scrollEl: HTMLElement | null,
  filePath: string | null,
): UseReadingProgressReturn {
  const interactionConfig = useInteractionConfig();
  const [percentage, setPercentage] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const rafRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPctRef = useRef(0);
  const lastSetTimeRef = useRef(0);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (!scrollEl) return;

    // 立即计算一次当前进度（切 Tab 或首次挂载时）
    const computeNow = () => {
      const scrollTop = scrollEl.scrollTop;
      const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (scrollHeight <= 0) {
        pendingPctRef.current = 0;
      } else {
        pendingPctRef.current = Math.min(
          100,
          Math.max(0, (scrollTop / scrollHeight) * 100),
        );
      }
      lastSetTimeRef.current = Date.now();
      setPercentage(pendingPctRef.current);
    };

    // 延迟到下一帧计算，确保 scrollContainer 的 scrollTop 已恢复
    const rafId = requestAnimationFrame(computeNow);

    const handleScroll = () => {
      // C4: 仅在状态变化时调用 setIsScrolling
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsScrolling(true);
      }

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setIsScrolling(false);
      }, interactionConfig.scrollStopDelayMs);

      // C2+C3: rAF 内只算值不 setState，throttle 到 100ms 才 setState
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (!scrollEl) return;
          const scrollTop = scrollEl.scrollTop;
          const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
          if (scrollHeight <= 0) {
            pendingPctRef.current = 0;
          } else {
            pendingPctRef.current = Math.min(
              100,
              Math.max(0, (scrollTop / scrollHeight) * 100),
            );
          }
          const now = Date.now();
          if (now - lastSetTimeRef.current >= 100) {
            lastSetTimeRef.current = now;
            setPercentage(pendingPctRef.current);
          }
        });
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      scrollEl.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [scrollEl, filePath]);

  return { percentage, isScrolling };
}
