import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { generateExportHtml } from "./generateExportHtml";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { useSettingsStore } from "@/stores/settingsStore";

async function doExportPdf(grayscale: boolean): Promise<void> {
  const fileStore = useFileStore.getState();
  const content = fileStore.currentContent;

  if (!content || !content.trim()) {
    useReaderStore.getState().addToast({ type: "error", message: "没有可导出的内容" });
    return;
  }

  const defaultFileName = fileStore.currentFilePath
    ? fileStore.currentFilePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "export"
    : "export";

  const fontSize = useSettingsStore.getState().readingSettings.fontSize;

  const htmlPromise = generateExportHtml(content, { grayscale, fontSize });
  const filePathPromise = save({
    filters: [{ name: "PDF", extensions: ["pdf"] }],
    defaultPath: `${defaultFileName}.pdf`,
  });

  try {
    const [htmlContent, filePath] = await Promise.all([htmlPromise, filePathPromise]);

    if (!filePath) return;

    await invoke("export_pdf", {
      htmlContent,
      filePath,
    });
    useReaderStore.getState().addToast({ type: "success", message: "PDF 导出成功" });
  } catch (err) {
    console.error("PDF export failed:", err);
    useReaderStore.getState().addToast({ type: "error", message: "导出 PDF 失败" });
  }
}

export async function exportPdf(): Promise<void> {
  return doExportPdf(false);
}

export async function exportPdfGrayscale(): Promise<void> {
  return doExportPdf(true);
}
