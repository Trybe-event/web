import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".agent/**",
    ".npm-cache/**",
    ".next/**",
    "out/**",
    "next-env.d.ts",
    "public/mockServiceWorker.js",
    "lib/api/schema.d.ts",
    "e2e-report/**",
    "test-results/**",
  ]),
]);
