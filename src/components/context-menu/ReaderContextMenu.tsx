import type { ContextMenuEntry } from "@/types";

/**
 * 阅读区右键菜单 props。
 *
 * hasSelection / selectedText 由调用方在 onContextMenu 事件中通过
 * window.getSelection() 获取后传入。
 */
export interface ReaderContextMenuProps {
  hasSelection: boolean;
  selectedText: string;
  onCopy: () => void;
  onSelectAll: () => void;
  onSearch: (query: string) => void;
  onEditParagraph: () => void;
  canEditParagraph: boolean;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onOpenInNewWindow: () => void;
  onShowAbout?: () => void;
}

/**
 * 生成阅读区右键菜单项列表。
 *
 * 菜单结构（PDR 6.5.1）：
 * - 复制（有选中文本时可用）
 * - 全选
 * - 搜索...（有选中文本时显示，用选中文本触发搜索）
 * - ──分隔线──
 * - 编辑此段落
 * - ──分隔线──
 * - 导出为 HTML
 * - 导出为 PDF
 * - ──分隔线──
 * - 在新窗口中打开
 *
 * 注意：文案暂用中文硬编码，Task 12（i18n 接入）时统一替换。
 */
export function getReaderContextMenuItems(
  props: ReaderContextMenuProps,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [];

  // 复制
  items.push({
    id: "copy",
    label: "复制",
    shortcut: "Ctrl+C",
    disabled: !props.hasSelection,
    action: props.onCopy,
  });

  // 全选
  items.push({
    id: "selectAll",
    label: "全选",
    shortcut: "Ctrl+A",
    action: props.onSelectAll,
  });

  // 搜索（仅在有选中文本时显示）
  if (props.hasSelection) {
    items.push({
      id: "search",
      label: "搜索...",
      action: () => props.onSearch(props.selectedText),
    });
  }

  items.push({ id: "sep1", separator: true });

  // 编辑此段落（仅对支持编辑的元素显示）
  if (props.canEditParagraph) {
    items.push({
      id: "editParagraph",
      label: "编辑此段落",
      shortcut: "双击",
      action: props.onEditParagraph,
    });

    items.push({ id: "sep2", separator: true });
  }

  // 导出为 HTML（Task 10 实现后替换占位 action）
  items.push({
    id: "exportHtml",
    label: "导出为 HTML",
    shortcut: "Ctrl+E",
    action: props.onExportHtml,
  });

  // 导出为 PDF（Task 10 实现后替换占位 action）
  items.push({
    id: "exportPdf",
    label: "导出为 PDF",
    shortcut: "Ctrl+P",
    action: props.onExportPdf,
  });

  // 导出为 Word
  items.push({
    id: "exportDocx",
    label: "导出为 Word",
    shortcut: "Ctrl+Shift+E",
    action: props.onExportDocx,
  });

  items.push({ id: "sep3", separator: true });

  // 在新窗口中打开（Task 11 多窗口实现后替换占位 action）
  items.push({
    id: "openInNewWindow",
    label: "在新窗口中打开",
    shortcut: "Ctrl+N",
    action: props.onOpenInNewWindow,
  });

  // 关于
  if (props.onShowAbout) {
    items.push({ id: "sep4", separator: true });
    items.push({
      id: "about",
      label: "关于 ErgeMD",
      action: props.onShowAbout,
    });
  }

  return items;
}
