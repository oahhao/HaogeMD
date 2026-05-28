import type { ContextMenuEntry } from "@/types";

export interface CodeBlockContextMenuProps {
  codeContent: string;
  hasSelection: boolean;
  onCopyCode: () => void;
  onCopySelection: () => void;
  onEditCodeBlock: () => void;
}

/**
 * 代码块右键菜单项（PDR 6.5.2）。
 * - 复制代码（始终）
 * - 复制选中（有选中文本时）
 * - 编辑代码块（Task 9 快速编辑实现后替换占位 action）
 */
export function getCodeBlockContextMenuItems(
  props: CodeBlockContextMenuProps,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [];

  items.push({
    id: "copyCode",
    label: "复制代码",
    action: props.onCopyCode,
  });

  if (props.hasSelection) {
    items.push({
      id: "copySelection",
      label: "复制选中",
      shortcut: "Ctrl+C",
      action: props.onCopySelection,
    });
  }

  items.push({ id: "sep1", separator: true });

  items.push({
    id: "editCodeBlock",
    label: "编辑代码块",
    action: props.onEditCodeBlock,
  });

  return items;
}
