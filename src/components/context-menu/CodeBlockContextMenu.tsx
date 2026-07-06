import type { ContextMenuEntry } from "@/types";

export interface CodeBlockContextMenuProps {
  codeContent: string;
  hasSelection: boolean;
  onCopyCode: () => void;
  onCopySelection: () => void;
  onEditCodeBlock: () => void;
  onDeleteCodeBlock?: () => void;
}

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

  if (props.onDeleteCodeBlock) {
    items.push({
      id: "deleteCodeBlock",
      label: "删除代码块",
      action: props.onDeleteCodeBlock,
    });
  }

  return items;
}
