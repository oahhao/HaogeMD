import { memo, useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { EditorState, type Extension, Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getEditorExtensions } from "./extensions";
import { getEditorTheme, getHighlightStyle } from "./theme";
import { getCodeLanguageExtension } from "./codeHighlight";

export interface EditorCoreRef {
  getEditorView: () => EditorView | null;
  getValue: () => string;
  focus: () => void;
}

interface EditorCoreProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  readOnly?: boolean;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  onEditorReady?: (view: EditorView) => void;
  language?: string;
}

const EditorCore = memo(
  forwardRef<EditorCoreRef, EditorCoreProps>(
    (
      {
        value,
        onChange,
        autoFocus = false,
        readOnly = false,
        minHeight = 100,
        maxHeight = 400,
        className,
        onEditorReady,
        language,
      },
      ref,
    ) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const editorViewRef = useRef<EditorView | null>(null);
      const isExternalUpdateRef = useRef(false);
      const [dynamicExtensions, setDynamicExtensions] = useState<Extension[]>([]);
      const readOnlyCompartment = useRef(new Compartment());

      const onChangeRef = useRef(onChange);
      onChangeRef.current = onChange;

      const onEditorReadyRef = useRef(onEditorReady);
      onEditorReadyRef.current = onEditorReady;

      const readOnlyRef = useRef(readOnly);
      readOnlyRef.current = readOnly;

      const autoFocusRef = useRef(autoFocus);
      autoFocusRef.current = autoFocus;

      useImperativeHandle(ref, () => ({
        getEditorView: () => editorViewRef.current,
        getValue: () => editorViewRef.current?.state.doc.toString() ?? "",
        focus: () => editorViewRef.current?.focus(),
      }));

      useEffect(() => {
        async function loadLanguageExtension() {
          if (language) {
            const langExt = await getCodeLanguageExtension(language);
            setDynamicExtensions(langExt ? [langExt] : []);
          } else {
            setDynamicExtensions([]);
          }
        }
        loadLanguageExtension();
      }, [language]);

      useEffect(() => {
        const container = containerRef.current;
        if (!container) {
          return () => {};
        }

        const updateListener = EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdateRef.current) {
            const newValue = update.state.doc.toString();
            onChangeRef.current(newValue);
          }
        });

        const state = EditorState.create({
          doc: value,
          extensions: [
            ...getEditorExtensions(),
            getEditorTheme(),
            getHighlightStyle(),
            ...dynamicExtensions,
            updateListener,
            EditorView.lineWrapping,
            readOnlyCompartment.current.of(EditorState.readOnly.of(readOnlyRef.current)),
          ],
        });

        const view = new EditorView({
          state,
          parent: container,
        });

        editorViewRef.current = view;

        if (onEditorReadyRef.current) {
          onEditorReadyRef.current(view);
        }

        if (autoFocusRef.current) {
          view.focus();
        }

        return () => {
          view.destroy();
          editorViewRef.current = null;
        };
      }, [dynamicExtensions]);

      useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;

        const currentValue = view.state.doc.toString();
        if (value !== currentValue) {
          isExternalUpdateRef.current = true;

          const main = view.state.selection.main;
          const newLength = value.length;
          const clampedAnchor = Math.min(main.anchor, newLength);
          const clampedHead = Math.min(main.head, newLength);

          view.dispatch({
            changes: {
              from: 0,
              to: currentValue.length,
              insert: value,
            },
            selection: { anchor: clampedAnchor, head: clampedHead },
          });

          isExternalUpdateRef.current = false;
        }
      }, [value]);

      useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;

        view.dispatch({
          effects: readOnlyCompartment.current.reconfigure(
            EditorState.readOnly.of(readOnly),
          ),
        });
      }, [readOnly]);

      return (
        <div
          ref={containerRef}
          className={className}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            overflow: "auto",
            background: "var(--bg-code, #16162A)",
            color: "var(--text-primary)",
          }}
        />
      );
    },
  ),
);

EditorCore.displayName = "EditorCore";

export default EditorCore;