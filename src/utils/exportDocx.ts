import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { createImageAdapter } from "./exportImageHelper";

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

  // 创建自定义图片适配器（如果提供了 basePath）
  const imageAdapter = basePath ? createImageAdapter(basePath) : undefined;

  const doc = await markdownDocx(markdownContent, {
    gfm: true,
    ignoreHtml: false,
    imageAdapter
  });

  const blob = await Packer.toBlob(doc);
  const arrayBuffer = await blob.arrayBuffer();
  
  // 优化：使用 Buffer 或 TypedArray 直接转换为 base64
  const base64Data = btoa(
    Array.from(new Uint8Array(arrayBuffer), (byte) => String.fromCharCode(byte)).join('')
  );

  await invoke("write_binary_file", { path: filePath, base64Data });
}
