import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ConfigLevel,
  DefaultReaderConfig,
  PresetConfigs,
  ReaderConfig,
} from "../config/readerConfig";
import type { ReadingSettings, ThemeMode } from "../types";

// ===== settingsStore 状态接口 =====
interface SettingsState {
  // 阅读设置
  readingSettings: ReadingSettings;

  // 配置级别
  configLevel: ConfigLevel;

  // ===== Actions =====
  updateReadingSettings: (partial: Partial<ReadingSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
  setConfigLevel: (level: ConfigLevel) => void;
  getActiveConfig: () => ReaderConfig;
}

// ===== 默认阅读设置 =====
const defaultReadingSettings: ReadingSettings = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  paragraphSpacing: 16,
  pageWidth: 800,
  theme: "cyberpunk",
  language: "auto",
  autoSaveProgress: true,
};

// ===== 默认配置级别 =====
const defaultConfigLevel: ConfigLevel = "medium";

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      readingSettings: defaultReadingSettings,
      configLevel: defaultConfigLevel,

      // 局部更新阅读设置
      updateReadingSettings: (partial: Partial<ReadingSettings>) => {
        set((state: SettingsState) => ({
          readingSettings: { ...state.readingSettings, ...partial },
        }));
      },

      // 设置主题
      setTheme: (theme: ThemeMode) => {
        get().updateReadingSettings({ theme });
      },

      // 设置配置级别
      setConfigLevel: (level: ConfigLevel) => {
        set({ configLevel: level });
      },

      // 获取当前活动配置
      getActiveConfig: (): ReaderConfig => {
        const level = get().configLevel;
        return PresetConfigs[level] || DefaultReaderConfig;
      },
    }),
    {
      name: "ergemd-settings",
      partialize: (state: SettingsState) => ({
        readingSettings: state.readingSettings,
        configLevel: state.configLevel,
      }),
      merge: (
        persistedState: unknown,
        currentState: SettingsState,
      ): SettingsState => {
        const persisted = persistedState as
          | { readingSettings?: ReadingSettings; configLevel?: ConfigLevel }
          | undefined;
        return {
          ...currentState,
          readingSettings: {
            ...defaultReadingSettings,
            ...(persisted?.readingSettings || {}),
          },
          configLevel: persisted?.configLevel ?? defaultConfigLevel,
        };
      },
    },
  ),
);
