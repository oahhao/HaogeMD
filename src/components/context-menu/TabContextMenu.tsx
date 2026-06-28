import type { ContextMenuEntry } from "@/types";

export interface TabContextMenuProps {
  hasMultipleTabs: boolean;
  hasRightTabs: boolean;
  isPinned?: boolean;
  onCloseTab: () => void;
  onCloseOtherTabs: () => void;
  onCloseRightTabs: () => void;
  onPinTab?: () => void;
  onOpenInNewWindow: () => void;
  onCopyFilePath: () => void;
  onRevealInExplorer: () => void;
}

/**
 * 标签栏右键菜单项（PDR 6.5.5）。
 * - 固定/取消固定标签
 * - 关闭标签页（始终）
 * - 关闭其他标签（多个标签时）
 * - 关闭右侧标签（右侧有标签时）
 * - 在新窗口中打开
 * - 复制文件路径
 * - 在资源管理器中显示
 */
export function getTabContextMenuItems(
  props: TabContextMenuProps,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [];

  // 固定/取消固定标签
  if (props.onPinTab) {
    items.push({
      id: "pinTab",
      label: props.isPinned ? "取消固定" : "📌 固定标签",
      shortcut: "Ctrl+⇧+P",
      action: props.onPinTab,
    });
    items.push({ id: "sepPin", separator: true });
  }

  items.push({
    id: "closeTab",
    label: "关闭标签页",
    shortcut: "Ctrl+W",
    action: props.onCloseTab,
  });

  if (props.hasMultipleTabs) {
    items.push({
      id: "closeOtherTabs",
      label: "关闭其他标签",
      action: props.onCloseOtherTabs,
    });
  }

  if (props.hasRightTabs) {
    items.push({
      id: "closeRightTabs",
      label: "关闭右侧标签",
      action: props.onCloseRightTabs,
    });
  }

  items.push({ id: "sep1", separator: true });

  items.push({
    id: "openInNewWindow",
    label: "在新窗口中打开",
    shortcut: "Ctrl+N",
    action: props.onOpenInNewWindow,
  });

  items.push({ id: "sep2", separator: true });

  items.push({
    id: "copyFilePath",
    label: "复制文件路径",
    shortcut: "Ctrl+⇧+C",
    action: props.onCopyFilePath,
  });

  items.push({
    id: "revealInExplorer",
    label: "在资源管理器中显示",
    shortcut: "Ctrl+⇧+D",
    action: props.onRevealInExplorer,
  });

  return items;
}
