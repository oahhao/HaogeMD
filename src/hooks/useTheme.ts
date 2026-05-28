import { useCallback, useEffect, useLayoutEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { ThemeMode } from "../types";

/**
 * 主题切换 Hook：
 * - 监听 settingsStore 中的 readingSettings.theme 变化
 * - 更新 <html> 的 data-theme 属性
 * - 跟随系统模式使用 matchMedia 监听
 *
 * ⚠️ 注意：本地 settingsStore 的主题存储在 readingSettings.theme 中，
 *    而非顶层 state.theme。
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.readingSettings.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const applyTheme = useCallback((t: ThemeMode) => {
    const resolvedTheme = resolveTheme(t);
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, []);

  // 应用主题
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 跟随系统模式
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", resolved);
    };

    // 初始应用
    const resolved = mediaQuery.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // 获取当前实际生效的主题（解析 system）
  const getResolvedTheme = useCallback((): string => {
    return resolveTheme(theme);
  }, [theme]);

  return { theme, setTheme, getResolvedTheme };
}

function resolveTheme(theme: ThemeMode): string {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}
