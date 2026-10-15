// Copies the API contract from a sibling clone of Trybe-event/api, then regenerate types
// with `npm run gen:api`. Pass a path to use another location.
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.argv[2] ?? "../api/openapi/openapi.yaml");
if (!existsSync(source)) {
  console.error(
    `Contract not found at ${source}. Clone Trybe-event/api next to this repo or pass its path.`,
  );
  process.exit(1);
}
copyFileSync(source, "contract/openapi.yaml");
console.log(
  `Copied ${source} -> contract/openapi.yaml. Now run: npm run gen:api`,
);
