import { type Extension } from "@codemirror/state";

const languageMap: Record<string, () => Promise<Extension>> = {
  javascript: () =>
    import("@codemirror/lang-javascript").then((m) => m.javascript()),
  js: () =>
    import("@codemirror/lang-javascript").then((m) => m.javascript()),
  typescript: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ typescript: true }),
    ),
  ts: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ typescript: true }),
    ),
  python: () => import("@codemirror/lang-python").then((m) => m.python()),
  py: () => import("@codemirror/lang-python").then((m) => m.python()),
  java: () => import("@codemirror/lang-java").then((m) => m.java()),
  cpp: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  c: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  rust: () => import("@codemirror/lang-rust").then((m) => m.rust()),
  sql: () => import("@codemirror/lang-sql").then((m) => m.sql()),
  json: () => import("@codemirror/lang-json").then((m) => m.json()),
  xml: () => import("@codemirror/lang-xml").then((m) => m.xml()),
  html: () => import("@codemirror/lang-html").then((m) => m.html()),
  css: () => import("@codemirror/lang-css").then((m) => m.css()),
  sass: () => import("@codemirror/lang-sass").then((m) => m.sass()),
  scss: () => import("@codemirror/lang-sass").then((m) => m.sass()),
  php: () => import("@codemirror/lang-php").then((m) => m.php()),
  lezer: () => import("@codemirror/lang-lezer").then((m) => m.lezer()),
  wast: () => import("@codemirror/lang-wast").then((m) => m.wast()),
  wasm: () => import("@codemirror/lang-wast").then((m) => m.wast()),
  markdown: () =>
    import("@codemirror/lang-markdown").then((m) => m.markdown()),
  md: () =>
    import("@codemirror/lang-markdown").then((m) => m.markdown()),
};

export async function getCodeLanguageExtension(
  language: string,
): Promise<Extension | null> {
  const lang = language.toLowerCase();
  const loader = languageMap[lang];

  if (loader) {
    try {
      return await loader();
    } catch (error) {
      console.warn(`Failed to load language ${language}:`, error);
      return null;
    }
  }

  return null;
}