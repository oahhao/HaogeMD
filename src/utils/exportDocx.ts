import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

/**
 * 导出为 Word (.docx) 格式。
 *
 * 使用 markdown-docx 库将 Markdown 原文直接转换为 DOCX。
 * 依赖：pnpm add markdown-docx
 *
 * 优势：
 * - 直接从 Markdown AST 转换，保留标题/列表/表格/代码块/图片等格式
 * - 纯 JS 实现，无二进制依赖
 * - 支持浏览器环境
 *
 * 限制：
 * - 数学公式（KaTeX）不会渲染，保留原始 LaTeX 文本
 * - Mermaid 图表不会渲染，保留原始代码块
 */
export async function exportDocx(markdownContent: string): Promise<void> {
  if (!markdownContent) {
    throw new Error("No markdown content found");
  }

  // 弹出保存对话框
  const filePath = await save({
    filters: [{ name: "Word", extensions: ["docx"] }],
    defaultPath: "export.docx",
  });

  if (!filePath) return;

  // 动态导入 markdown-docx（避免首屏加载拖慢）
  const { markdownDocx, Packer } = await import("markdown-docx");

  // 转换为 docx 文档
  const doc = await markdownDocx(markdownContent, {
    gfm: true,
    ignoreHtml: false,
  });

  // 生成 blob
  const blob = await Packer.toBlob(doc);

  // 写入文件
  const arrayBuffer = await blob.arrayBuffer();
  await writeFile(filePath as string, new Uint8Array(arrayBuffer));
}
