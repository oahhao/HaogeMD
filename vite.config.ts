import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import path from "path";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: {
        lossless: true,
      },
      svg: {
        multipass: true,
        plugins: [
          { name: "removeViewBox", active: false },
          { name: "removeEmptyAttrs", active: true },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          if (
            id.includes("/node_modules/mermaid/") ||
            id.includes("/node_modules/@mermaid-js/") ||
            id.includes("/node_modules/cytoscape") ||
            id.includes("/node_modules/dagre-d3-es/") ||
            id.includes("/node_modules/d3")
          ) {
            return "mermaid";
          }

          if (id.includes("/node_modules/katex/")) {
            return "katex";
          }

          if (
            id.includes("/node_modules/react-markdown/") ||
            id.includes("/node_modules/remark-") ||
            id.includes("/node_modules/rehype-") ||
            id.includes("/node_modules/unified/") ||
            id.includes("/node_modules/micromark") ||
            id.includes("/node_modules/mdast-") ||
            id.includes("/node_modules/hast-")
          ) {
            return "markdown";
          }

          if (id.includes("/node_modules/highlight.js/")) {
            return "highlight";
          }

          if (id.includes("/node_modules/@tauri-apps/")) {
            return "tauri";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: [
        "**/src-tauri/**",
        "**/*.md",
        "**/*.markdown",
        "**/*.mdx",
      ],
    },
  },
}));
