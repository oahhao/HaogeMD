import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

/** 导出 HTML 选项 */
export interface ExportHtmlOptions {
  /** 是否内联当前主题的 CSS 变量 */
  inlineCss?: boolean;
  /** 导出指定章节的 DOM id（不传则导出整个文档） */
  sectionId?: string;
}

/**
 * 导出为 HTML 文件。
 *
 * 流程：
 * 1. 从渲染后的 DOM 提取 HTML 内容
 * 2. 收集当前主题的 CSS 变量值
 * 3. 生成完整的 HTML 文档（含内联 CSS）
 * 4. 弹出保存对话框，用户选择路径
 * 5. 通过 Tauri write_file 命令写入磁盘
 */
export async function exportHtml(
  containerSelector: string = ".markdown-body",
  options: ExportHtmlOptions = {},
): Promise<void> {
  const { inlineCss = true, sectionId } = options;

  const getHtmlContent = (): string => {
    if (sectionId) {
      const sectionEl = document.querySelector(`#${CSS.escape(sectionId)}`);
      if (!sectionEl) {
        throw new Error(`Section not found: ${sectionId}`);
      }
      return sectionEl.outerHTML;
    }

    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error(`Container not found: ${containerSelector}`);
    }
    return container.innerHTML;
  };

  const htmlContent = getHtmlContent();

  // 收集当前主题的 CSS 变量
  const computedStyle = getComputedStyle(document.documentElement);
  const cssVariables: Record<string, string> = {};

  const variableNames = [
    "bg-page",
    "bg-reader",
    "bg-sidebar",
    "bg-code",
    "text-primary",
    "text-secondary",
    "text-muted",
    "text-heading",
    "h2-color",
    "h3-color",
    "h4-color",
    "accent-cyan",
    "accent-pink",
    "accent-purple",
    "accent-green",
    "accent-yellow",
    "accent-orange",
    "accent-red",
    "divider",
    "hover-bg",
  ];

  for (const name of variableNames) {
    cssVariables[name] = computedStyle.getPropertyValue(`--${name}`).trim();
  }

  // 生成内联 CSS
  const inlineStyles = inlineCss
    ? `<style>
  :root {
    ${variableNames.map((name) => `--${name}: ${cssVariables[name]};`).join("\n    ")}
  }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    background-color: var(--bg-page);
    color: var(--text-primary);
    line-height: 1.8;
    max-width: 800px;
    margin: 2em auto;
    padding: 0 2em;
  }
  pre { background: var(--bg-code); border-radius: 8px; padding: 1em; overflow-x: auto; }
  code { font-family: "Cascadia Code", "Fira Code", Consolas, monospace; }
  a { color: var(--accent-cyan); }
  blockquote { border-left: 3px solid var(--accent-purple); padding: 0.5em 1em; color: var(--text-secondary); }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid var(--divider); padding: 0.5em 1em; }
  img { max-width: 100%; }
</style>`
    : "";

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErgeMD Export</title>
  ${inlineStyles}
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  // 弹出保存对话框
  const filePath = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
    defaultPath: "export.html",
  });

  if (!filePath) return;

  await invoke("write_file", {
    path: filePath as string,
    content: fullHtml,
  });
}
