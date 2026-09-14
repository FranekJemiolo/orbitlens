import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";

// Plugin to copy docs/assets to dist/docs/assets for final artifact verification
function copyDocsAssetsPlugin() {
  return {
    name: "copy-docs-assets",
    closeBundle() {
      const srcDir = path.resolve(import.meta.dirname, "docs/assets");
      const destDir = path.resolve(import.meta.dirname, "dist/docs/assets");
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(srcDir);
        for (const file of files) {
          const srcFile = path.join(srcDir, file);
          const destFile = path.join(destDir, file);
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
          }
        }
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      manifestFilename: "manifest.webmanifest",
      injectRegister: "script",
      manifest: {
        name: "OrbitLens AR Night Sky Tracker",
        short_name: "OrbitLens",
        description: "AR Night Sky Tracker & Orbital Telemetry PWA",
        start_url: "./",
        display: "fullscreen",
        orientation: "portrait-primary",
        theme_color: "#0B0E14",
        background_color: "#0B0E14",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,bin}"],
        runtimeCaching: [
          {
            urlPattern: /.*\/data\/stars\.bin$/,
            handler: "CacheFirst",
            options: {
              cacheName: "star-catalog-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/celestrak\.org\/.*|^https:\/\/ssd-api\.jpl\.nasa\.gov\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "orbital-telemetry-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/opensky-network\.org\/.*/,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
    copyDocsAssetsPlugin(),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  worker: {
    format: "es",
  },
});
