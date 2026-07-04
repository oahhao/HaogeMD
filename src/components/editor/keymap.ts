import { keymap } from "@codemirror/view";
import { type Extension } from "@codemirror/state";
import { executeInsertAction } from "@/utils/markdownInsert";

export function getEditorKeymap(): Extension {
  return keymap.of([
    {
      key: "Mod-b",
      run: (view) => executeInsertAction(view, { type: "bold" }),
    },
    {
      key: "Mod-i",
      run: (view) => executeInsertAction(view, { type: "italic" }),
    },
    {
      key: "Mod-s",
      run: (view) => executeInsertAction(view, { type: "strikethrough" }),
    },
    {
      key: "Mod-`",
      run: (view) => executeInsertAction(view, { type: "code" }),
    },
    {
      key: "Mod-1",
      run: (view) => executeInsertAction(view, { type: "heading", level: 1 }),
    },
    {
      key: "Mod-2",
      run: (view) => executeInsertAction(view, { type: "heading", level: 2 }),
    },
    {
      key: "Mod-3",
      run: (view) => executeInsertAction(view, { type: "heading", level: 3 }),
    },
    {
      key: "Mod-4",
      run: (view) => executeInsertAction(view, { type: "heading", level: 4 }),
    },
    {
      key: "Mod-5",
      run: (view) => executeInsertAction(view, { type: "heading", level: 5 }),
    },
    {
      key: "Mod-6",
      run: (view) => executeInsertAction(view, { type: "heading", level: 6 }),
    },
    {
      key: "Mod-k",
      run: (view) => executeInsertAction(view, { type: "link" }),
    },
  ]);
}