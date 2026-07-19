import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxy = env.VITE_DEV_API_PROXY || "http://127.0.0.1:8000";
  const appBuildId =
    env.VITE_APP_BUILD_ID?.trim() ||
    (mode === "production" ? String(Date.now()) : "dev");

  // Zoom Meeting SDK screen share needs COOP/COEP, but those headers break Daily Prebuilt
  // iframes on the same origin. Daily is the default provider — keep isolation OFF globally.
  // If Zoom screen-share regression appears, gate headers only for explicit Zoom-only routes.
  const shouldApplyZoomIsolation = (_url = "") => false;

  return {
  define: {
    "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(appBuildId),
  },
  server: {
    host: "::",
    port: Number(env.VITE_DEV_PORT || 8080),
    strictPort: false,
    open: "/login",
    // Do not set COOP/COEP globally — they break Daily Prebuilt on live-cohort pages.
    proxy: {
      "/storage": {
        target: apiProxy,
        changeOrigin: true,
      },
      "/api": {
        // Parrot-Learning Laravel API (E-learning-parrot-backend on :8000)
        target: apiProxy,
        changeOrigin: true,
        // Large API payloads / slow Laravel responses (uploads go direct to pCloud, not here)
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
  },
  preview: {},
  plugins: [
    {
      name: "zoom-cross-origin-isolation",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (shouldApplyZoomIsolation(req.url || "")) {
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
            res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (shouldApplyZoomIsolation(req.url || "")) {
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
            res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
          }
          next();
        });
      },
    },
    react(),
    {
      name: "inject-app-build-id",
      transformIndexHtml(html) {
        return html.replace(
          "<head>",
          `<head>\n    <meta name="app-build-id" content="${appBuildId}" />`,
        );
      },
    },
    {
      name: "emit-version-json",
      closeBundle() {
        const outDir = path.resolve(__dirname, "dist");
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(
          path.join(outDir, "version.json"),
          JSON.stringify(
            { buildId: appBuildId, builtAt: new Date().toISOString() },
            null,
            2,
          ),
        );

        const htaccessSrc = path.resolve(__dirname, "public/.htaccess");
        const htaccessDest = path.join(outDir, ".htaccess");
        if (fs.existsSync(htaccessSrc)) {
          fs.copyFileSync(htaccessSrc, htaccessDest);
        }
      },
    },
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Zoom Meeting SDK v6 minifies to ~9 MB; isolate it so the main app bundle stays small.
    chunkSizeWarningLimit: 10_000,
    modulePreload: {
      resolveDependencies(filename, deps) {
        return deps.filter((dep) => !dep.includes("zoom-meetingsdk"));
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@zoom/meetingsdk")) {
            return "zoom-meetingsdk";
          }
        },
      },
    },
  },
};
});
