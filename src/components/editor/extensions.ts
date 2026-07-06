import { getEditorKeymap } from "./keymap";
import { bracketMatching } from "@codemirror/language";
import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { type Extension } from "@codemirror/state";

export function getEditorExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    bracketMatching(),
    getEditorKeymap(),
  ];
}