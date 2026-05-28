import { useReaderStore } from "@/stores/readerStore";

/**
 * 导出为 PDF 文件。
 *
 * 使用浏览器原生打印引擎（window.print()），配合 @media print CSS。
 *
 * CSS 层面处理：
 * - 隐藏 UI 元素（标题栏/侧边栏/状态栏/标签栏）
 * - 取消所有固定高度容器（height: auto + overflow: visible）
 * - 启用 print-color-adjust: exact（保留主题背景色和文字颜色）
 * - 避免分页断裂（page-break-inside: avoid）
 *
 * 用户在打印对话框中选择"另存为 PDF"即可。
 */
export async function exportPdf(): Promise<void> {
  try {
    window.print();
  } catch (err) {
    console.error("Print failed:", err);
    useReaderStore.getState().addToast({ type: "error", message: "导出失败" });
  }
}
