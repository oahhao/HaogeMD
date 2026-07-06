import { memo, useCallback, useEffect, useRef, useState } from "react";
import EditorCore, { type EditorCoreRef } from "@/components/editor/EditorCore";
import QuickEditToolbar from "@/components/reader/QuickEditToolbar";
import type { EditorView } from "@codemirror/view";

interface QuickEditProps {
  text: string;
  originalText: string;
  targetElement: HTMLElement;
  onSave: () => void;
  onCancel: () => void;
  onUpdate?: (text: string) => void;
  visible?: boolean;
}

const QuickEdit = memo(
  ({ text, originalText: _originalText, targetElement, onSave, onCancel, onUpdate, visible = true }: QuickEditProps) => {
    const editorRef = useRef<EditorCoreRef>(null);
    const [editorView, setEditorView] = useState<EditorView | null>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const [height, setHeight] = useState(100);
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);

    // 根据内容动态调整高度
    useEffect(() => {
      if (text) {
        const lineCount = text.split('\n').length;
        const lineHeight = 20; // 每行大约 20px
        const padding = 40; // 上下 padding
        const newHeight = Math.max(100, Math.min(400, lineCount * lineHeight + padding));
        setHeight(newHeight);
      }
    }, [text]);

    useEffect(() => {
      const updatePosition = () => {
        const rect = targetElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const editHeight = height + 80;
        const editWidth = Math.min(rect.width, 800);

        const top = rect.top;
        let left = rect.left;

        if (left + editWidth > windowWidth) {
          left = windowWidth - editWidth - 16;
        }
        if (left < 0) {
          left = 16;
        }

        setPosition({
          top: Math.max(16, Math.min(top, windowHeight - editHeight - 16)),
          left: Math.max(16, left),
          width: Math.min(editWidth, windowWidth - 32),
        });
      };

      updatePosition();

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      const scrollContainer =
        targetElement.closest('[data-scroll-container="true"]') ||
        targetElement.closest('[data-virtuoso-scroller="true"]') ||
        targetElement.closest(".reading-scroll-container") ||
        document.body;
      scrollContainer.addEventListener("scroll", updatePosition);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
        scrollContainer.removeEventListener("scroll", updatePosition);
      };
    }, [targetElement, height]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const container = document.getElementById("quick-edit-container");
        if (container && !container.contains(e.target as Node)) {
          onSave();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [onSave]);

    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, []);

    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      };
      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }, [onCancel]);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = height;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    }, [height]);

    useEffect(() => {
      const handleResizeMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaY = e.clientY - startYRef.current;
        const newHeight = Math.min(
          500,
          Math.max(150, startHeightRef.current + deltaY),
        );
        setHeight(newHeight);
      };

      const handleResizeEnd = () => {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);

      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }, []);

    const handleEditorReady = useCallback((view: EditorView) => {
      setEditorView(view);
    }, []);

    const handleTextChange = useCallback(
      (newText: string) => {
        if (visible && onUpdate) {
          onUpdate(newText);
        }
      },
      [visible, onUpdate],
    );

    const handleSave = useCallback(() => {
      onSave();
    }, [onSave]);

    return (
      <>
        <div
          id="quick-edit-container"
          style={{
            display: visible ? "flex" : "none",
            position: "fixed",
            top: visible ? position.top : 0,
            left: visible ? position.left : 0,
            width: visible ? position.width : 0,
            zIndex: 999999,
            border: "1px solid var(--accent-cyan, #00FFFF)",
            borderRadius: "4px",
            boxShadow: "0 4px 24px var(--shadow-popup)",
            flexDirection: "column",
          }}
        >
        <QuickEditToolbar editorView={editorView} />

        <div style={{ flex: 1, overflow: "hidden" }}>
          {text && text.length > 0 && (
            <EditorCore
              ref={editorRef}
              value={text}
              onChange={handleTextChange}
              autoFocus
              minHeight={Math.max(100, text.split('\n').length * 20 + 40)}
              maxHeight={Math.max(100, text.split('\n').length * 20 + 40)}
              onEditorReady={handleEditorReady}
            />
          )}
        </div>

        <div
          onMouseDown={handleResizeStart}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "8px",
            background: "var(--bg-code, #16162A)",
            cursor: "ns-resize",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "2px",
              borderRadius: "1px",
              background: "var(--accent-cyan, #00FFFF)",
              opacity: 0.4,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "4px 8px",
            background: "var(--bg-code, #16162A)",
            fontSize: "0.6875rem",
            color: "var(--text-muted)",
            borderRadius: "0 0 4px 4px",
          }}
        >
          <span>Ctrl+Enter 保存 / Esc 取消</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onCancel}
              style={{
                color: "var(--text-secondary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.6875rem",
                padding: "2px 4px",
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              style={{
                color: "var(--accent-cyan)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.6875rem",
                padding: "2px 4px",
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
      </>
    );
  },
);

QuickEdit.displayName = "QuickEdit";

export default QuickEdit;