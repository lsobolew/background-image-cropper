import { defineConfig } from "tsup";

export default defineConfig([
  // ESM + CommonJS + type declarations (for bundlers / Node)
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    target: "es2019",
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".js" };
    },
  },
  // Standalone global build for a plain <script> tag (window.BackgroundImageCropper)
  {
    entry: { "background-image-cropper": "src/index.ts" },
    format: ["iife"],
    globalName: "BackgroundImageCropper",
    target: "es2019",
    dts: false,
    sourcemap: true,
    minify: true,
    outExtension() {
      return { js: ".global.js" };
    },
  },
]);
