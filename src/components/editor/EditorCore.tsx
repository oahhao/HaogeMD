import { memo, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
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
  onDebugInfo?: (info: { 
    action: string; 
    value: string;
    valueEscape: string;
    valueLines: number;
    valueSplit: string[];
    current?: string;
    currentEscape?: string;
    currentLines?: number;
    currentSplit?: string[];
    docContent?: string;
    docContentEscape?: string;
    docLines?: number;
    docSplit?: string[];
    domInfo?: {
      cmLineCount: number;
      cmLinesContent: string[];
      containerChildCount: number;
      containerChildren: string[];
      containerHeight: number;
      containerWidth: number;
      contentHeight: number;
      contentWidth: number;
      cmEditorHeight: number;
      cmScrollerHeight: number;
      cmGutterHeight: number;
      contentPaddingTop: number;
      contentPaddingBottom: number;
      contentMarginTop: number;
      contentMarginBottom: number;
      editorMinHeight: number;
      editorMaxHeight: number;
    };
  }) => void;
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
        onDebugInfo,
      },
      ref,
    ) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const editorViewRef = useRef<EditorView | null>(null);
      const isExternalUpdateRef = useRef(false);
      const isInternalUpdateRef = useRef(false);
      const isInitializedRef = useRef(false);
      const readOnlyCompartment = useRef(new Compartment());
      const languageCompartment = useRef(new Compartment());

      const valueRef = useRef(value);
      valueRef.current = value;

      const onChangeRef = useRef(onChange);
      onChangeRef.current = onChange;

      const onEditorReadyRef = useRef(onEditorReady);
      onEditorReadyRef.current = onEditorReady;

      const onDebugInfoRef = useRef(onDebugInfo);
      onDebugInfoRef.current = onDebugInfo;

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
        const container = containerRef.current;
        if (!container || isInitializedRef.current) {
          return () => {};
        }

        // 如果 value 是空的，使用空字符串作为初始值
        const initialDoc = valueRef.current || "";

        const updateListener = EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdateRef.current) {
            const newValue = update.state.doc.toString();
            isInternalUpdateRef.current = true;
            onChangeRef.current(newValue);
          }
        });

        const state = EditorState.create({
          doc: initialDoc,
          extensions: [
            ...getEditorExtensions(),
            getEditorTheme(),
            getHighlightStyle(),
            languageCompartment.current.of([]),
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

        // 立即获取文档状态并传递给调试回调
        if (onDebugInfoRef.current) {
          const docContent = view.state.doc.toString();
          const docLines = view.state.doc.lines;
          
          // 获取 DOM 结构信息
          const cmContent = container.querySelector('.cm-content');
          const cmLines = cmContent ? Array.from(cmContent.querySelectorAll('.cm-line')) : [];
          const containerChildren = container.children;
          
          // 获取高度信息
          const containerRect = container.getBoundingClientRect();
          const contentRect = cmContent ? cmContent.getBoundingClientRect() : null;
          const cmEditor = container.querySelector('.cm-editor');
          const cmScroller = container.querySelector('.cm-scroller');
          const cmGutter = container.querySelector('.cm-gutters');
          
          onDebugInfoRef.current({
            action: 'CREATE',
            value: valueRef.current,
            valueEscape: JSON.stringify(valueRef.current),
            valueLines: valueRef.current.split('\n').length,
            valueSplit: valueRef.current.split('\n'),
            docContent: docContent,
            docContentEscape: JSON.stringify(docContent),
            docLines: docLines,
            docSplit: docContent.split('\n'),
            domInfo: {
              cmLineCount: cmLines.length,
              cmLinesContent: cmLines.map(line => line.textContent || ''),
              containerChildCount: containerChildren.length,
              containerChildren: Array.from(containerChildren).map(child => child.tagName),
              containerHeight: containerRect.height,
              containerWidth: containerRect.width,
              contentHeight: contentRect ? contentRect.height : 0,
              contentWidth: contentRect ? contentRect.width : 0,
              cmEditorHeight: cmEditor ? cmEditor.getBoundingClientRect().height : 0,
              cmScrollerHeight: cmScroller ? cmScroller.getBoundingClientRect().height : 0,
              cmGutterHeight: cmGutter ? cmGutter.getBoundingClientRect().height : 0,
              contentPaddingTop: cmContent ? parseInt(getComputedStyle(cmContent).paddingTop) : 0,
              contentPaddingBottom: cmContent ? parseInt(getComputedStyle(cmContent).paddingBottom) : 0,
              contentMarginTop: cmContent ? parseInt(getComputedStyle(cmContent).marginTop) : 0,
              contentMarginBottom: cmContent ? parseInt(getComputedStyle(cmContent).marginBottom) : 0,
              editorMinHeight: parseInt(container.style.minHeight) || 0,
              editorMaxHeight: parseInt(container.style.maxHeight) || 0,
            },
          });
        }
        isInitializedRef.current = true;

        if (onEditorReadyRef.current) {
          onEditorReadyRef.current(view);
        }

        if (autoFocusRef.current) {
          view.focus();
          view.dispatch({
            selection: { anchor: view.state.doc.length, head: view.state.doc.length },
          });
        }

        return () => {
          view.destroy();
          editorViewRef.current = null;
          isInitializedRef.current = false;
        };
      }, []);  // 只在挂载时执行一次

      useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;

        if (!language) {
          view.dispatch({
            effects: languageCompartment.current.reconfigure([]),
          });
          return;
        }

        let cancelled = false;
        async function loadAndReconfigure(lang: string) {
          const langExt = await getCodeLanguageExtension(lang);
          if (cancelled) return;
          const currentView = editorViewRef.current;
          if (!currentView) return;
          currentView.dispatch({
            effects: languageCompartment.current.reconfigure(langExt ? [langExt] : []),
          });
        }
        loadAndReconfigure(language);
        return () => {
          cancelled = true;
        };
      }, [language]);

      useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;

        if (isInternalUpdateRef.current) {
          isInternalUpdateRef.current = false;
          return;
        }

        const currentValue = view.state.doc.toString();
        if (value !== currentValue) {
          if (onDebugInfoRef.current) {
            onDebugInfoRef.current({
              action: 'SYNC',
              value: value,
              valueEscape: JSON.stringify(value),
              valueLines: value.split('\n').length,
              valueSplit: value.split('\n'),
              current: currentValue,
              currentEscape: JSON.stringify(currentValue),
              currentLines: currentValue.split('\n').length,
              currentSplit: currentValue.split('\n'),
              docContent: currentValue,
              docContentEscape: JSON.stringify(currentValue),
              docLines: view.state.doc.lines,
              docSplit: currentValue.split('\n'),
            });
          }
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
            width: "100%",
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