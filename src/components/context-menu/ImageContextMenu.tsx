import type { ContextMenuEntry } from "@/types";

export interface ImageContextMenuProps {
  imageUrl: string;
  imageAlt: string;
  onCopyImage: () => void;
  onViewFullSize: () => void;
  onOpenInNewWindow: () => void;
  onCopyImagePath: () => void;
  onEditImage?: () => void;
}

/**
 * 图片右键菜单项（PDR 6.5.3）。
 * - 复制图片
 * - 放大查看
 * - 在新窗口打开图片
 * - 复制图片路径
 */
export function getImageContextMenuItems(
  props: ImageContextMenuProps,
  t: (key: string) => string,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [
    {
      id: "copyImage",
      label: t("image.copyImage"),
      action: props.onCopyImage,
    },
    {
      id: "viewFullSize",
      label: t("image.zoomView"),
      shortcut: t("image.click"),
      action: props.onViewFullSize,
    },
    { id: "sep1", separator: true },
    {
      id: "openInNewWindow",
      label: t("image.openInNewWindow"),
      action: props.onOpenInNewWindow,
    },
    {
      id: "copyImagePath",
      label: t("image.copyPath"),
      action: props.onCopyImagePath,
    },
  ];

  if (props.onEditImage) {
    items.push(
      { id: "sep2", separator: true },
      {
        id: "editImage",
        label: t("image.editImage"),
        action: props.onEditImage,
      },
    );
  }

  return items;
}
