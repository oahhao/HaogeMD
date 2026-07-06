import { EditorView } from "@codemirror/view";

export interface InsertAction {
  type: "bold" | "italic" | "strikethrough" | "code" | "heading" | "link" | "image" | "codeblock" | "quote" | "ul" | "ol" | "hr";
  level?: number;
  url?: string;
  alt?: string;
  lang?: string;
}

export function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
  placeholder = ""
): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.doc.sliceString(from, to);
  const text = selectedText || placeholder;
  const insert = before + text + after;

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + before.length, head: from + before.length + text.length },
    userEvent: "input.wrap",
  });

  return true;
}

export function insertHeading(view: EditorView, level: number): boolean {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.doc.sliceString(line.from, line.to);
  const prefix = "#".repeat(level) + " ";

  const headingMatch = lineText.match(/^(#{1,6})\s*/);
  let insert: string;

  if (headingMatch) {
    const afterHeading = lineText.slice(headingMatch[0].length);
    insert = prefix + afterHeading;
  } else {
    insert = prefix + lineText;
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert },
    selection: { anchor: line.from + insert.length },
    userEvent: "input.heading",
  });

  return true;
}

export function insertLink(view: EditorView, text = "", url = ""): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.doc.sliceString(from, to);
  const linkText = selectedText || text || "链接文本";
  const linkUrl = url || "url";
  const insert = `[${linkText}](${linkUrl})`;

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + 1, head: from + 1 + linkText.length },
    userEvent: "input.link",
  });

  return true;
}

export function insertImage(view: EditorView, alt = "", url = ""): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.doc.sliceString(from, to);
  const imageAlt = selectedText || alt || "图片描述";
  const imageUrl = url || "url";
  const insert = `![${imageAlt}](${imageUrl})`;

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: "input.image",
  });

  return true;
}

export function insertCodeBlock(view: EditorView, lang = ""): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.doc.sliceString(from, to);
  const insert = "```" + lang + "\n" + selectedText + "\n```\n";

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + 3 },
    userEvent: "input.codeblock",
  });

  return true;
}

export function insertQuote(view: EditorView): boolean {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.doc.sliceString(line.from, line.to);

  let insert: string;
  if (lineText.startsWith("> ")) {
    insert = lineText.slice(2);
  } else {
    insert = "> " + lineText;
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert },
    selection: { anchor: line.from + insert.length },
    userEvent: "input.quote",
  });

  return true;
}

export function insertList(view: EditorView, ordered = false): boolean {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.doc.sliceString(line.from, line.to);
  const prefix = ordered ? "1. " : "- ";

  let insert: string;
  if (lineText.startsWith("- ") || /^\d+\.\s/.test(lineText)) {
    insert = lineText.replace(/^(- |\d+\.\s)/, "");
  } else {
    insert = prefix + lineText;
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert },
    selection: { anchor: line.from + insert.length },
    userEvent: "input.list",
  });

  return true;
}

export function insertHr(view: EditorView): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const insert = "\n---\n";

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: "input.hr",
  });

  return true;
}

export function executeInsertAction(view: EditorView, action: InsertAction): boolean {
  switch (action.type) {
    case "bold":
      return wrapSelection(view, "**", "**", "粗体文本");
    case "italic":
      return wrapSelection(view, "*", "*", "斜体文本");
    case "strikethrough":
      return wrapSelection(view, "~~", "~~", "删除线文本");
    case "code":
      return wrapSelection(view, "`", "`", "代码");
    case "heading":
      return insertHeading(view, action.level ?? 1);
    case "link":
      return insertLink(view, "", action.url);
    case "image":
      return insertImage(view, action.alt, action.url);
    case "codeblock":
      return insertCodeBlock(view, action.lang ?? "");
    case "quote":
      return insertQuote(view);
    case "ul":
      return insertList(view, false);
    case "ol":
      return insertList(view, true);
    case "hr":
      return insertHr(view);
    default:
      return false;
  }
}