import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
try {
  require.resolve("next/package.json");
} catch {
  console.error(
    "Next.js dependencies are missing. Run npm ci inside the web directory, then run npm run dev again.",
  );
  process.exitCode = 1;
}
