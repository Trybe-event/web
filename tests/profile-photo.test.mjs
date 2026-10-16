import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const javascript = ts.transpileModule(
  readFileSync(new URL("../lib/profile-photo.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { optimizeProfilePhoto } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

test("rejects unsupported and oversized sources before decoding", async () => {
  await assert.rejects(
    optimizeProfilePhoto(
      new File(["photo"], "photo.heic", { type: "image/heic" }),
    ),
    /Export HEIC/,
  );
  await assert.rejects(
    optimizeProfilePhoto(new File([], "empty.jpg", { type: "image/jpeg" })),
    /20 MB/,
  );
  await assert.rejects(
    optimizeProfilePhoto({ type: "image/jpeg", size: 21 * 1024 * 1024 }),
    /20 MB/,
  );
});

test("reduces dimensions and quality until under 200 KB, then releases the source", async (context) => {
  const encodings = [];
  let released = false;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toBlob(callback, type, quality) {
      encodings.push({ width: this.width, height: this.height, type, quality });
      callback(
        new Blob([new Uint8Array(encodings.length === 1 ? 250000 : 120000)], {
          type,
        }),
      );
    },
  };
  context.mock.method(URL, "createObjectURL", () => "blob:test");
  context.mock.method(URL, "revokeObjectURL", () => {
    released = true;
  });
  globalThis.Image = undefined;
  context.mock.property(globalThis, "Image", function () {
    return {
      naturalWidth: 4032,
      naturalHeight: 3024,
      set src(value) {
        if (value) queueMicrotask(() => this.onload());
      },
    };
  });
  globalThis.document = undefined;
  context.mock.property(globalThis, "document", {
    createElement: () => canvas,
  });
  const result = await optimizeProfilePhoto(
    new File(["original"], "iphone.jpg", { type: "image/jpeg" }),
  );
  assert.equal(result.type, "image/jpeg");
  assert.equal(result.name, "profile-photo.jpg");
  assert.equal(result.size, 120000);
  assert.equal(encodings[0].width, 768);
  assert.equal(encodings[0].height, 576);
  assert.ok(encodings[1].quality < encodings[0].quality);
  assert.equal(released, true);
});
