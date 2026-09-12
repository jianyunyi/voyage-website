import { defineConfig } from "vitest/config";
import path from "path";

// 独立 vitest 配置：不加载 @cloudflare/vite-plugin
// （该插件与 vitest 的 resolve.external 冲突）
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/components/ErrorBoundary.test.tsx",
      "src/lib/export.test.ts",
      "src/lib/hotel-images.test.ts",
      "src/pages/Compare.test.tsx",
      "src/worker/**/*.test.ts",
    ],
  },
});
