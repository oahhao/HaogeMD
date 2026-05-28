import { useQuickEdit } from "@/hooks/useQuickEdit";
import { useSettingsStore } from "@/stores/settingsStore";
import type { MarkdownBlock } from "@/types/markdownBlock";
import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import CodeBlock from "./CodeBlock";
import ContextMenuImage from "./ContextMenuImage";
import ContextMenuLink from "./ContextMenuLink";
import LazyMermaidBlock from "./LazyMermaidBlock";

import remarkAbbr from "@syenchuk/remark-abbr";
import remarkSupersub from "remark-supersub";

// ── 共享的 remarkPlugins / rehypePlugins ──────────────

const REMARK_PLUGINS = [
  remarkSupersub,
  [remarkGfm, { singleTilde: false }],
  remarkMath,
  remarkEmoji,
  remarkAbbr,
] as unknown as Parameters<
  typeof import("react-markdown").default
>[0]["remarkPlugins"];
const REHYPE_PLUGINS = [rehypeRaw, rehypeSlug, rehypeKatex];

// ── Admonition 辅助函数 ──────────────────────────────────

const ADMONITION_TYPES: Record<
  string,
  { title: string; color: string; icon: string }
> = {
  NOTE: { title: "Note", color: "var(--admonition-note, #60A5FA)", icon: "📝" },
  TIP: { title: "Tip", color: "var(--admonition-tip, #34D399)", icon: "💡" },
  WARNING: {
    title: "Warning",
    color: "var(--admonition-warning, #FBBF24)",
    icon: "⚠️",
  },
  CAUTION: {
    title: "Caution",
    color: "var(--admonition-caution, #F87171)",
    icon: "🚨",
  },
  IMPORTANT: {
    title: "Important",
    color: "var(--admonition-important, #A78BFA)",
    icon: "📌",
  },
  INFO: { title: "Info", color: "var(--admonition-info, #06B6D4)", icon: "ℹ️" },
  SUCCESS: {
    title: "Success",
    color: "var(--admonition-success, #10B981)",
    icon: "✅",
  },
  ERROR: {
    title: "Error",
    color: "var(--admonition-error, #EF4444)",
    icon: "❌",
  },
  DANGER: {
    title: "Danger",
    color: "var(--admonition-danger, #DC2626)",
    icon: "🔥",
  },
};

function getTextContent(element: React.ReactNode): string {
  let text = "";
  React.Children.forEach(element, (child) => {
    if (typeof child === "string") {
      text += child;
    } else if (React.isValidElement(child)) {
      const childProps = child.props as { children?: React.ReactNode };
      text += getTextContent(childProps.children);
    }
  });
  return text;
}

function cloneElementWithText(
  element: React.ReactElement,
  newText: string,
): React.ReactElement {
  return React.cloneElement(element, {}, newText || "\u00A0");
}

// ── 组件 ──────────────────────────────────────────────

interface MarkdownBlockViewProps {
  block: MarkdownBlock;
  referenceDefinitions?: string;
}

const MarkdownBlockView: React.FC<MarkdownBlockViewProps> = memo(
  ({ block, referenceDefinitions }) => {
    const { startEdit } = useQuickEdit();
    const paragraphSpacing = useSettingsStore(
      (s) => s.readingSettings.paragraphSpacing,
    );

    // ── Heading block：使用 ReactMarkdown 渲染，支持链接等内联元素 ──
    if (block.type === "heading") {
      const level = block.headingLevel ?? 1;

      // 从 raw 中提取标题内容（去掉 # 号）
      const headingContent = block.raw
        .replace(/^\s{0,3}#{1,6}\s*/, "")
        .replace(/\s*#+\s*$/, "")
        .trim();

      return (
        <div
          id={block.tocId}
          data-block-type="heading"
          data-raw={encodeURIComponent(block.raw)}
          className="markdown-body"
        >
          <ReactMarkdown
            remarkPlugins={REMARK_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS}
          >
            {`${"#".repeat(level)} ${headingContent}`}
          </ReactMarkdown>
        </div>
      );
    }

    // ── Mermaid block：使用 LazyMermaidBlock 懒渲染 ─
    if (block.type === "mermaid") {
      const codeLines = block.raw.split("\n");
      const code = codeLines.slice(1, -1).join("\n").trim();

      return (
        <div data-block-type="mermaid" data-raw={encodeURIComponent(block.raw)}>
          <LazyMermaidBlock code={code} raw={block.raw} />
        </div>
      );
    }

    // ── Math block：数学公式 ──
    if (block.type === "math") {
      return (
        <div
          data-block-type="math"
          data-raw={encodeURIComponent(block.raw)}
          className="my-4"
        >
          <ReactMarkdown
            remarkPlugins={REMARK_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS}
          >
            {block.raw}
          </ReactMarkdown>
        </div>
      );
    }

    // ── Blank block ──
    if (block.type === "blank") {
      return <div data-block-type="blank" style={{ height: "0.5em" }} />;
    }

    // ── Thematic break ──
    if (block.type === "thematicBreak") {
      return (
        <div
          style={{ margin: "2em 0" }}
          data-raw={encodeURIComponent(block.raw)}
        >
          <svg
            width="100%"
            height="2"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="hr-taper-grad">
                <stop offset="0%" stopColor="var(--accent-cyan, #00FFFF)" />
                <stop offset="100%" stopColor="var(--accent-purple, #BF00FF)" />
              </linearGradient>
            </defs>
            <path d="M0,1 Q50,0 100,1 Q50,2 0,1 Z" fill="url(#hr-taper-grad)" />
          </svg>
        </div>
      );
    }

    // ── 其他 block：使用 ReactMarkdown 渲染 ──
    const components = useMemo(
      () => ({
        h1(props: React.HTMLAttributes<HTMLHeadingElement>) {
          const { children, ...rest } = props;
          return (
            <h1 {...rest} data-raw={encodeURIComponent(block.raw)}>
              {children}
            </h1>
          );
        },
        h2(props: React.HTMLAttributes<HTMLHeadingElement>) {
          const { children, ...rest } = props;
          return (
            <h2 {...rest} data-raw={encodeURIComponent(block.raw)}>
              {children}
            </h2>
          );
        },
        h3(props: React.HTMLAttributes<HTMLHeadingElement>) {
          const { children, ...rest } = props;
          return (
            <h3 {...rest} data-raw={encodeURIComponent(block.raw)}>
              {children}
            </h3>
          );
        },
        h4(props: React.HTMLAttributes<HTMLHeadingElement>) {
          const { children, ...rest } = props;
          return (
            <h4 {...rest} data-raw={encodeURIComponent(block.raw)}>
              {children}
            </h4>
          );
        },
        p(props: React.HTMLAttributes<HTMLParagraphElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <p
              {...rest}
              data-raw={encodeURIComponent(block.raw)}
              style={{
                color: "var(--text-primary)",
                margin: `0 0 ${paragraphSpacing}px 0`,
                lineHeight: "inherit",
                ...incomingStyle,
              }}
            >
              {children}
            </p>
          );
        },
        ul(props: React.HTMLAttributes<HTMLUListElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <ul
              {...rest}
              style={{
                color: "var(--text-primary)",
                paddingLeft: "1.5em",
                marginBottom: "1em",
                ...incomingStyle,
              }}
            >
              {children}
            </ul>
          );
        },
        ol(props: React.HTMLAttributes<HTMLOListElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <ol
              {...rest}
              style={{
                color: "var(--text-primary)",
                paddingLeft: "1.5em",
                marginBottom: "1em",
                ...incomingStyle,
              }}
            >
              {children}
            </ol>
          );
        },
        li(props: React.HTMLAttributes<HTMLLIElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <li
              {...rest}
              data-raw={encodeURIComponent(block.raw)}
              style={{
                marginBottom: "0.3em",
                lineHeight: "inherit",
                ...incomingStyle,
              }}
            >
              {children}
            </li>
          );
        },
        a(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
          return <ContextMenuLink {...props} />;
        },
        blockquote(
          props: React.HTMLAttributes<HTMLQuoteElement> & {
            children?: React.ReactNode;
          },
        ) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;

          // 检测是否是 Admonition 并解析
          let isAdmonition = false;
          let admonitionType = "NOTE";
          let filteredChildren = children;

          const childrenArray = React.Children.toArray(children);
          if (childrenArray.length > 0) {
            // 遍历所有子元素，查找 Admonition 标记
            let foundAdmonitionIndex = -1;
            let foundAdmonitionType = "";

            for (let i = 0; i < childrenArray.length; i++) {
              const child = childrenArray[i];
              if (React.isValidElement(child)) {
                const childText = getTextContent(child);
                const admonitionMatch = childText.match(
                  /^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT|INFO|SUCCESS|ERROR|DANGER)\]/,
                );
                if (admonitionMatch) {
                  foundAdmonitionIndex = i;
                  foundAdmonitionType = admonitionMatch[1];
                  break;
                }
              }
            }

            if (foundAdmonitionType) {
              isAdmonition = true;
              admonitionType = foundAdmonitionType;
              // 移除 [!TYPE] 标记
              filteredChildren = React.Children.map(
                childrenArray,
                (child, idx) => {
                  if (
                    idx === foundAdmonitionIndex &&
                    React.isValidElement(child)
                  ) {
                    const text = getTextContent(child);
                    const newText = text.replace(
                      /^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT|INFO|SUCCESS|ERROR|DANGER)\]\s*/,
                      "",
                    );
                    return cloneElementWithText(child, newText);
                  }
                  return child;
                },
              );
            }
          }

          if (isAdmonition) {
            const { title, color, icon } = ADMONITION_TYPES[admonitionType];
            return (
              <div
                style={{
                  borderLeft: `4px solid ${color}`,
                  paddingLeft: "1em",
                  paddingRight: "1em",
                  paddingTop: "0.5em",
                  paddingBottom: "0.5em",
                  marginLeft: 0,
                  marginRight: 0,
                  marginBottom: "1em",
                  backgroundColor: `${color}15`,
                  borderRadius: "0 6px 6px 0",
                  ...incomingStyle,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5em",
                    marginBottom: "0.3em",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: "1.2em" }}>{icon}</span>
                  <span style={{ color }}>{title}</span>
                </div>
                <div
                  style={{ color: "var(--text-primary)", fontStyle: "normal" }}
                >
                  {filteredChildren}
                </div>
              </div>
            );
          }

          // 普通 blockquote
          return (
            <blockquote
              {...rest}
              data-raw={encodeURIComponent(block.raw)}
              style={{
                borderLeft: "3px solid var(--accent-purple)",
                paddingLeft: "1em",
                marginLeft: 0,
                marginRight: 0,
                marginBottom: "1em",
                color: "var(--text-secondary)",
                fontStyle: "italic",
                ...incomingStyle,
              }}
            >
              {children}
            </blockquote>
          );
        },
        table(props: React.HTMLAttributes<HTMLTableElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <div className="overflow-x-auto" style={{ marginBottom: "1em" }}>
              <table
                {...rest}
                data-raw={encodeURIComponent(block.raw)}
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  color: "var(--text-primary)",
                  fontSize: "0.95em",
                  ...incomingStyle,
                }}
              >
                {children}
              </table>
            </div>
          );
        },
        thead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <thead
              {...rest}
              style={{
                borderBottom: "1px solid var(--divider)",
                ...incomingStyle,
              }}
            >
              {children}
            </thead>
          );
        },
        th(
          props: React.HTMLAttributes<HTMLTableCellElement> & {
            align?: string;
            node?: { properties?: { align?: string } };
          },
        ) {
          const { children, style, align, node, ...restProps } = props;
          const resolvedAlign = align || node?.properties?.align;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <th
              {...restProps}
              style={{
                padding: "0.6em 1em",
                fontWeight: 600,
                color: "var(--text-heading)",
                ...incomingStyle,
                textAlign: (incomingStyle?.textAlign ||
                  resolvedAlign) as React.CSSProperties["textAlign"],
              }}
            >
              {children}
            </th>
          );
        },
        td(
          props: React.HTMLAttributes<HTMLTableCellElement> & {
            align?: string;
            node?: { properties?: { align?: string } };
          },
        ) {
          const { children, style, align, node, ...restProps } = props;
          const resolvedAlign = align || node?.properties?.align;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <td
              {...restProps}
              style={{
                padding: "0.5em 1em",
                borderBottom: "1px solid var(--divider)",
                ...incomingStyle,
                ...(resolvedAlign
                  ? {
                      textAlign:
                        resolvedAlign as React.CSSProperties["textAlign"],
                    }
                  : {}),
              }}
            >
              {children}
            </td>
          );
        },
        img(props: React.ImgHTMLAttributes<HTMLImageElement>) {
          return <ContextMenuImage {...props} />;
        },
        code(
          props: React.HTMLAttributes<HTMLElement> & {
            inline?: boolean;
            node?: unknown;
            className?: string;
            children?: React.ReactNode;
          },
        ) {
          const { className, children, style, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;
          const incomingStyle = style as React.CSSProperties | undefined;

          if (isInline) {
            return (
              <code
                style={{
                  background: "var(--inline-code-bg)",
                  color: "var(--accent-pink)",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  fontSize: "0.9em",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  ...incomingStyle,
                }}
                {...rest}
              >
                {children}
              </code>
            );
          }

          const language = match[1];
          const codeString = String(children).replace(/\n$/, "");
          return <CodeBlock language={language} code={codeString} />;
        },
        pre(
          props: React.HTMLAttributes<HTMLPreElement> & {
            node?: unknown;
            children?: React.ReactNode;
          },
        ) {
          const { children, ...rest } = props;
          const child = React.Children.toArray(children)[0] as
            | React.ReactElement
            | undefined;
          if (
            child &&
            child.props &&
            typeof (child.props as { className?: string }).className ===
              "string" &&
            (child.props as { className?: string }).className?.includes(
              "language-mermaid",
            )
          ) {
            const codeString = String(
              (child.props as { children?: React.ReactNode }).children,
            ).replace(/\n$/, "");
            return <LazyMermaidBlock code={codeString} />;
          }
          return <pre {...rest}>{children}</pre>;
        },
        hr() {
          return (
            <div style={{ margin: "2em 0" }}>
              <svg
                width="100%"
                height="2"
                viewBox="0 0 100 2"
                preserveAspectRatio="none"
                style={{ display: "block" }}
              >
                <defs>
                  <linearGradient id="hr-taper-grad">
                    <stop offset="0%" stopColor="var(--accent-cyan, #00FFFF)" />
                    <stop
                      offset="100%"
                      stopColor="var(--accent-purple, #BF00FF)"
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M0,1 Q50,0 100,1 Q50,2 0,1 Z"
                  fill="url(#hr-taper-grad)"
                />
              </svg>
            </div>
          );
        },
        strong(
          props: React.HTMLAttributes<HTMLElement> & {
            node?: unknown;
          },
        ) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <strong
              {...rest}
              style={{
                color: "var(--text-heading)",
                fontWeight: 600,
                ...incomingStyle,
              }}
            >
              {children}
            </strong>
          );
        },
        em(
          props: React.HTMLAttributes<HTMLElement> & {
            node?: unknown;
          },
        ) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <em
              {...rest}
              style={{
                color: "var(--text-primary)",
                fontStyle: "italic",
                ...incomingStyle,
              }}
            >
              {children}
            </em>
          );
        },
        del(props: React.HTMLAttributes<HTMLElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <del
              {...rest}
              style={{
                color: "var(--text-secondary)",
                textDecoration: "line-through",
                ...incomingStyle,
              }}
            >
              {children}
            </del>
          );
        },
        kbd(props: React.HTMLAttributes<HTMLElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <kbd
              {...rest}
              style={{
                display: "inline-block",
                padding: "2px 6px",
                fontSize: "0.85em",
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-code)",
                border: "1px solid var(--divider)",
                borderRadius: "4px",
                boxShadow: "0 1px 1px rgba(0,0,0,0.2)",
                ...incomingStyle,
              }}
            >
              {children}
            </kbd>
          );
        },
        mark(props: React.HTMLAttributes<HTMLElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <mark
              {...rest}
              style={{
                backgroundColor: "var(--accent-yellow)",
                color: "var(--bg-page)",
                padding: "1px 4px",
                borderRadius: "2px",
                ...incomingStyle,
              }}
            >
              {children}
            </mark>
          );
        },

        abbr(props: React.HTMLAttributes<HTMLElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <abbr
              {...rest}
              style={{
                textDecoration: "underline dotted var(--text-muted)",
                cursor: "help",
                ...incomingStyle,
              }}
            >
              {children}
            </abbr>
          );
        },

        // <details> 折叠块 - 保留原生行为
        details(props: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <details
              {...rest}
              style={{
                margin: "1em 0",
                padding: "0.5em 1em",
                border: "1px solid var(--divider)",
                borderRadius: "6px",
                backgroundColor: "var(--hover-bg-subtle)",
                ...incomingStyle,
              }}
            >
              {children}
            </details>
          );
        },

        // <summary> 折叠标题 - 保留原生行为
        summary(props: React.HTMLAttributes<HTMLElement>) {
          const { children, style, ...rest } = props;
          const incomingStyle = style as React.CSSProperties | undefined;
          return (
            <summary
              {...rest}
              style={{
                cursor: "pointer",
                fontWeight: 600,
                color: "var(--accent-cyan)",
                padding: "0.3em 0",
                userSelect: "none",
                ...incomingStyle,
              }}
            >
              {children}
            </summary>
          );
        },
      }),
      [paragraphSpacing, block.raw],
    );

    return (
      <div
        className="markdown-body"
        data-block-type={block.type}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest(
              "a, code, pre, button, .mermaid, img, input, select, textarea",
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
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={components}
        >
          {referenceDefinitions
            ? `${block.raw}\n\n${referenceDefinitions}`
            : block.raw}
        </ReactMarkdown>
      </div>
    );
  },
);

MarkdownBlockView.displayName = "MarkdownBlockView";

export default MarkdownBlockView;
