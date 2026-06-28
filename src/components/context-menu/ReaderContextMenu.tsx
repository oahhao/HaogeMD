import type { ContextMenuEntry } from "@/types";

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
  onExportPdfGrayscale: () => void;
  onExportDocx: () => void;
  onOpenInNewWindow: () => void;
  onShowAbout?: () => void;
}

export function getReaderContextMenuItems(
  props: ReaderContextMenuProps,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [];

  items.push({
    id: "copy",
    label: "复制",
    shortcut: "Ctrl+C",
    disabled: !props.hasSelection,
    action: props.onCopy,
  });

  items.push({
    id: "selectAll",
    label: "全选",
    shortcut: "Ctrl+A",
    action: props.onSelectAll,
  });

  if (props.hasSelection) {
    items.push({
      id: "search",
      label: "搜索...",
      action: () => props.onSearch(props.selectedText),
    });
  }

  items.push({ id: "sep1", separator: true });

  if (props.canEditParagraph) {
    items.push({
      id: "editParagraph",
      label: "编辑此段落",
      shortcut: "双击",
      action: props.onEditParagraph,
    });

    items.push({ id: "sep2", separator: true });
  }

  items.push({
    id: "exportHtml",
    label: "导出为 HTML",
    shortcut: "Ctrl+E",
    action: props.onExportHtml,
  });

  items.push({
    id: "exportPdfGrayscale",
    label: "导出为 PDF（黑白-推荐）",
    shortcut: "Ctrl+Shift+P",
    action: props.onExportPdfGrayscale,
  });

  items.push({
    id: "exportPdf",
    label: "导出为 PDF（带样式）",
    shortcut: "Ctrl+P",
    action: props.onExportPdf,
  });

  items.push({
    id: "exportDocx",
    label: "导出为 Word",
    shortcut: "Ctrl+Shift+E",
    action: props.onExportDocx,
  });

  items.push({ id: "sep3", separator: true });

  items.push({
    id: "openInNewWindow",
    label: "在新窗口中打开",
    shortcut: "Ctrl+N",
    action: props.onOpenInNewWindow,
  });

  if (props.onShowAbout) {
    items.push({ id: "sep4", separator: true });
    items.push({
      id: "about",
      label: "关于 HaogeMD",
      action: props.onShowAbout,
    });
  }

  return items;
}
