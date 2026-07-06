import { memo } from "react";
import type { EditorView } from "@codemirror/view";
import type { InsertAction } from "@/utils/markdownInsert";
import { executeInsertAction } from "@/utils/markdownInsert";

interface QuickEditToolbarProps {
  editorView: EditorView | null;
}

const QuickEditToolbar = memo(({ editorView }: QuickEditToolbarProps) => {
  const handleAction = (action: InsertAction) => {
    if (!editorView) return;
    executeInsertAction(editorView, action);
    editorView.focus();
  };

  const buttonStyle = {
    padding: "4px 8px",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "0.75rem",
    borderRadius: "2px",
    transition: "background 0.15s, color 0.15s",
  };

  const separatorStyle = {
    width: "1px",
    height: "16px",
    background: "var(--border-color, rgba(255,255,255,0.1))",
    margin: "0 4px",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "4px 8px",
        background: "var(--bg-secondary, rgba(0,0,0,0.2))",
        borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.1))",
        fontSize: "0.75rem",
      }}
    >
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "bold" })}
        title="加粗 (Ctrl+B)"
      >
        **B**
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "italic" })}
        title="斜体 (Ctrl+I)"
      >
        *I*
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "strikethrough" })}
        title="删除线"
      >
        ~~S~~
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "code" })}
        title="行内代码"
      >
        `C`
      </button>

      <div style={separatorStyle} />

      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "heading", level: 1 })}
        title="一级标题"
      >
        H1
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "heading", level: 2 })}
        title="二级标题"
      >
        H2
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "heading", level: 3 })}
        title="三级标题"
      >
        H3
      </button>

      <div style={separatorStyle} />

      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "link" })}
        title="链接"
      >
        🔗
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "image" })}
        title="图片"
      >
        🖼
      </button>

      <div style={separatorStyle} />

      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "codeblock" })}
        title="代码块"
      >
        代码
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "quote" })}
        title="引用"
      >
        引用
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "ul" })}
        title="无序列表"
      >
        列表
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleAction({ type: "ol" })}
        title="有序列表"
      >
        1.
      </button>
    </div>
  );
});

QuickEditToolbar.displayName = "QuickEditToolbar";

export default QuickEditToolbar;