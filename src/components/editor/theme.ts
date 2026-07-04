import { EditorView } from "@codemirror/view";
import { type Extension } from "@codemirror/state";

export function getEditorTheme(): Extension {
  return EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "14px",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
      overflow: "auto",
    },
    ".cm-content": {
      padding: "8px 0",
      caretColor: "var(--accent-cyan, #00FFFF)",
    },
    ".cm-line": {
      padding: "0 8px",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--text-muted, #666)",
    },
    ".cm-gutter": {
      minWidth: "36px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--text-primary, #fff)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--bg-hover, rgba(255,255,255,0.05))",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--accent-cyan, #00FFFF)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "var(--accent-cyan, rgba(0,255,255,0.2)) !important",
    },
    ".cm-selectionMatch": {
      backgroundColor: "var(--accent-cyan, rgba(0,255,255,0.1))",
    },
  });
}

export function getHighlightStyle(): Extension {
  return EditorView.baseTheme({
    ".cm-header": {
      color: "var(--accent-cyan, #00FFFF)",
      fontWeight: "bold",
    },
    ".cm-header-1": { fontSize: "1.6em" },
    ".cm-header-2": { fontSize: "1.4em" },
    ".cm-header-3": { fontSize: "1.2em" },
    ".cm-header-4": { fontSize: "1.1em" },
    ".cm-header-5": { fontSize: "1em" },
    ".cm-header-6": { fontSize: "0.9em" },
    ".cm-strong": {
      color: "var(--text-primary, #fff)",
      fontWeight: "bold",
    },
    ".cm-emphasis": {
      color: "var(--text-primary, #fff)",
      fontStyle: "italic",
    },
    ".cm-strikethrough": {
      color: "var(--text-muted, #666)",
      textDecoration: "line-through",
    },
    ".cm-link": {
      color: "var(--accent-cyan, #00FFFF)",
      textDecoration: "underline",
    },
    ".cm-url": {
      color: "var(--text-secondary, #aaa)",
    },
    ".cm-code, .cm-monospace": {
      color: "var(--accent-orange, #FFA500)",
      fontFamily: "monospace",
      backgroundColor: "var(--bg-code-inline, rgba(255,255,255,0.05))",
      padding: "0 4px",
      borderRadius: "2px",
    },
    ".cm-quote": {
      color: "var(--text-muted, #666)",
      fontStyle: "italic",
    },
    ".cm-list": {
      color: "var(--accent-cyan, #00FFFF)",
    },
    ".cm-hr": {
      color: "var(--text-muted, #666)",
    },
    ".cm-meta": {
      color: "var(--text-muted, #666)",
    },
  });
}