import { useQuickEdit } from "@/hooks/useQuickEdit";
import { useReaderStore } from "@/stores/readerStore";
import type { MarkdownBlock } from "@/types/markdownBlock";
import { parseMarkdownBlocks } from "@/utils/markdownBlocks";
import React, { memo, useMemo } from "react";
import MarkdownBlockView from "./MarkdownBlockView";

interface MarkdownViewProps {
  content: string;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  const { startEdit } = useQuickEdit();
  const quickEditSignal = useReaderStore((s) => s.quickEditSignal);

  // 监听右键菜单"编辑此段落"信号
  React.useEffect(() => {
    if (quickEditSignal > 0) {
      const target = useReaderStore.getState().contextMenuEditTarget;
      if (target) {
        startEdit(target);
      }
    }
  }, [quickEditSignal, startEdit]);

  const { blocks, referenceDefinitions } = useMemo(
    () => parseMarkdownBlocks(content),
    [content],
  );

  if (typeof content !== "string") return null;

  return (
    <div
      className="markdown-body"
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest(
            "code, pre, button, .mermaid, img, input, select, textarea",
          )
        )
          return;
        startEdit(target);
      }}
      style={
        {
          color: "var(--text-primary)",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          "--katex-font-size": "1.15em",
        } as React.CSSProperties
      }
    >
      {blocks.map((block: MarkdownBlock, index: number) => (
        <MarkdownBlockView
          key={index}
          block={block}
          referenceDefinitions={referenceDefinitions}
        />
      ))}
    </div>
  );
};

MarkdownView.displayName = "MarkdownView";

export default memo(
  MarkdownView,
  (prev, next) => prev.content === next.content,
);
