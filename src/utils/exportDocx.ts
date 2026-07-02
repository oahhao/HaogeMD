import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { resolveAllImages } from "./exportImageHelper";

export async function exportDocx(markdownContent: string, basePath?: string): Promise<void> {
  if (!markdownContent) {
    throw new Error("No markdown content found");
  }

  const filePath = await save({
    filters: [{ name: "Word", extensions: ["docx"] }],
    defaultPath: "export.docx",
  });

  if (!filePath) return;

  const { markdownDocx, Packer } = await import("markdown-docx");

  // 解析所有图片为 data URL
  let resolvedContent = markdownContent;
  let warnings: string[] = [];
  
  if (basePath) {
    const result = await resolveAllImages(markdownContent, basePath);
    resolvedContent = result.content;
    warnings = result.warnings;
    
    // 显示警告信息
    if (warnings.length > 0) {
      console.warn("Word导出图片大小警告:", warnings.join("\n"));
      // 可以在这里添加用户提示，比如使用 dialog 显示警告
    }
    
    if (result.totalImages > 0) {
      console.log(`Word导出: 处理了 ${result.totalImages} 张图片，总大小 ${result.totalSizeMB} MB`);
    }
  }

  const doc = await markdownDocx(resolvedContent, {
    gfm: true,
    ignoreHtml: false,
  });

  const blob = await Packer.toBlob(doc);
  const arrayBuffer = await blob.arrayBuffer();
  
  // 优化：使用 Buffer 或 TypedArray 直接转换为 base64
  const base64Data = btoa(
    Array.from(new Uint8Array(arrayBuffer), (byte) => String.fromCharCode(byte)).join('')
  );

  await invoke("write_binary_file", { path: filePath, base64Data });
}
