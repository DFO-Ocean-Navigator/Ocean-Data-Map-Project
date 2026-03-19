import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appVersion = (() => {
  try {
    return execSync("git describe --tags --abbrev=0").toString().trim();
  } catch {
    return "unknown";
  }
})();


function translationShorthandPlugin() {
  return {
    name: "translation-shorthand",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("node_modules") || id.includes("\0")) return null;
      if (!/\.(jsx?|tsx?)$/.test(id)) return null;
      if (/\bt\s*:\s*_\b/.test(code)) return null;
      const result = code
        .replace(/(?<![.\w$])__\(/g, "props.t(")
        .replace(/(?<![.\w$])_\(/g, "props.t(");
      return result !== code ? { code: result, map: null } : null;
    },
  };
}

export default defineConfig({
  plugins: [react({ include: /\.(jsx?|tsx?)$/ }), translationShorthandPlugin()],
  define: {
    "process.env.LOGGER_LEVEL": JSON.stringify("info"),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 3030,
    proxy: {
      "/api": "http://localhost:8443",
    },
  },
  build: {
    outDir: "public",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "oceannavigator.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n) => n.endsWith(".css")))
            return "oceannavigator.css";
          return "[name][extname]";
        },
      },
    },
  },
  resolve: {
    alias: {
      "axios/lib": path.resolve(__dirname, "./node_modules/axios/lib"),
    },
  },
  publicDir: false,
});
