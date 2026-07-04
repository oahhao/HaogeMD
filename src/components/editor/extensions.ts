import { getEditorKeymap } from "./keymap";
import { bracketMatching } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { type Extension } from "@codemirror/state";

export function getEditorExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    bracketMatching(),
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
    }),
    getEditorKeymap(),
  ];
}