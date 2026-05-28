import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * 快速编辑 Hook。
 *
 * 职责：
 * - 管理编辑状态（正在编辑的元素、原始文本、编辑文本）
 * - 保存时通过 Tauri invoke 写回源文件
 * - 保存后同步更新 fileStore（tabs + currentContent）
 */
export function useQuickEdit() {
  const { t } = useTranslation();
  const quickEditElement = useReaderStore((s) => s.quickEditElement);
  const quickEditOriginalText = useReaderStore((s) => s.quickEditOriginalText);
  const quickEditText = useReaderStore((s) => s.quickEditText);
  const startQuickEdit = useReaderStore((s) => s.startQuickEdit);
  const updateQuickEditText = useReaderStore((s) => s.updateQuickEditText);
  const cancelQuickEdit = useReaderStore((s) => s.cancelQuickEdit);
  const finishQuickEdit = useReaderStore((s) => s.finishQuickEdit);

  const isEditing = quickEditElement !== null;

  const startEdit = useCallback(
    (element: HTMLElement) => {
      // 优先查找带有 data-raw 属性的块级元素
      const rawElement = element.closest("[data-raw]");

      if (rawElement) {
        const rawAttr = rawElement.getAttribute("data-raw");
        const originalText = rawAttr
          ? decodeURIComponent(rawAttr)
          : (rawElement.textContent ?? "");
        startQuickEdit(rawElement as HTMLElement, originalText);
        return;
      }

      // fallback：处理没有 data-raw 的链接
      const linkElement = element.closest("a");
      if (linkElement) {
        const linkText = linkElement.textContent ?? "";
        const href = linkElement.getAttribute("href") ?? "";
        const markdownFormat = `[${linkText}](${href})`;
        startQuickEdit(linkElement as HTMLElement, markdownFormat);
        return;
      }

      const blockElement =
        element.closest('[data-block-type="mermaid"]') ||
        element.closest('[data-block-type="math"]') ||
        element.closest("table") ||
        element.closest("blockquote") ||
        element.closest("h1") ||
        element.closest("h2") ||
        element.closest("h3") ||
        element.closest("h4") ||
        element.closest("h5") ||
        element.closest("h6") ||
        element.closest("li") ||
        element.closest("p");

      if (!blockElement) return;

      const rawAttr = blockElement.getAttribute("data-raw");
      const originalText = rawAttr
        ? decodeURIComponent(rawAttr)
        : (blockElement.textContent ?? "");
      startQuickEdit(blockElement as HTMLElement, originalText);
    },
    [startQuickEdit],
  );

  const updateEditText = useCallback(
    (text: string) => {
      updateQuickEditText(text);
    },
    [updateQuickEditText],
  );

  const saveEdit = useCallback(async () => {
    const { currentFilePath, currentContent, updateContent } =
      useFileStore.getState();
    const {
      addToast,
      finishQuickEdit: finish,
      quickEditElement,
    } = useReaderStore.getState();
    const originalText = quickEditOriginalText;
    const editText = quickEditText;

    if (originalText === editText) {
      finish();
      return;
    }

    if (!currentFilePath) return;

    // 检查是否是链接编辑（[text](url) 格式）
    const isLinkEdit = quickEditElement?.tagName === "A";
    if (isLinkEdit) {
      const linkMatch = editText.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
      if (linkMatch) {
        const newText = linkMatch[1];
        const newHref = linkMatch[2];
        // 直接更新 DOM 中的链接
        if (quickEditElement) {
          quickEditElement.textContent = newText;
          quickEditElement.setAttribute("href", newHref);
        }
        addToast({ type: "success", message: t("quickEdit.linkUpdated") });
        finish();
        return;
      }
    }

    try {
      const newContent = currentContent.replace(originalText, editText);
      if (newContent === currentContent) {
        addToast({ type: "warning", message: t("quickEdit.noMatch") });
        return;
      }

      await invoke("write_file", {
        path: currentFilePath,
        content: newContent,
      });

      updateContent(newContent);
      addToast({ type: "success", message: t("quickEdit.saveSuccess") });
    } catch {
      addToast({ type: "error", message: t("quickEdit.saveFailed") });
    }

    finish();
  }, [quickEditOriginalText, quickEditText, finishQuickEdit]);

  const cancelEdit = useCallback(() => {
    cancelQuickEdit();
  }, [cancelQuickEdit]);

  return {
    editState: {
      isEditing,
      editingElement: quickEditElement,
      originalText: quickEditOriginalText,
      editText: quickEditText,
    },
    startEdit,
    updateEditText,
    saveEdit,
    cancelEdit,
  };
}
