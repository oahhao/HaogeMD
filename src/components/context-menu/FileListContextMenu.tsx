import type { ContextMenuEntry } from "@/types";

export interface FileListContextMenuProps {
  filePath: string;
  fileName: string;
  onOpen: () => void;
  onOpenInNewTab: () => void;
  onOpenInNewWindow: () => void;
  onCopyFilePath: () => void;
  onRevealInExplorer: () => void;
}

/**
 * 文件列表右键菜单项（PDR 6.5.6）。
 * - 打开
 * - 在新标签页打开
 * - 在新窗口中打开
 * - 复制文件路径
 * - 在资源管理器中显示
 */
export function getFileListContextMenuItems(
  props: FileListContextMenuProps,
): ContextMenuEntry[] {
  return [
    {
      id: "open",
      label: "打开",
      action: props.onOpen,
    },
    {
      id: "openInNewTab",
      label: "在新标签页打开",
      action: props.onOpenInNewTab,
    },
    {
      id: "openInNewWindow",
      label: "在新窗口中打开",
      action: props.onOpenInNewWindow,
    },
    { id: "sep1", separator: true },
    {
      id: "copyFilePath",
      label: "复制文件路径",
      action: props.onCopyFilePath,
    },
    {
      id: "revealInExplorer",
      label: "在资源管理器中显示",
      action: props.onRevealInExplorer,
    },
  ];
}
