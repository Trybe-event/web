import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import QRCode from "qrcode";
const require = createRequire(import.meta.url);
const source = ts.transpileModule(
  readFileSync(
    new URL("../lib/event-share-graphic.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  },
).outputText;
const loaded = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { URL })(
  require,
  loaded,
  loaded.exports,
);
const { drawEventShareGraphic, SHARE_COLORS } = loaded.exports;
function canvasHarness() {
  const rectangles = [];
  const texts = [];
  const context = {
    fillStyle: "",
    font: "",
    textBaseline: "",
    measureText(value) {
      return {
        width:
          [...value].length *
          (parseInt(this.font.match(/\d+px/)?.[0] ?? "36") * 0.6),
      };
    },
    fillRect(x, y, width, height) {
      rectangles.push({ x, y, width, height, color: this.fillStyle });
    },
    fillText(value, x, y) {
      texts.push({ value, x, y, font: this.font });
    },
  };
  const dimensions = { width: 0, height: 0 };
  const canvas = { getContext: () => context };
  for (const field of ["width", "height"])
    Object.defineProperty(canvas, field, {
      get: () => dimensions[field],
      set: (value) => {
        dimensions[field] = value;
        rectangles.length = 0;
        texts.length = 0;
        context.fillStyle = "";
        context.font = "";
      },
    });
  return { canvas, rectangles, texts };
}
test("PNG export retains every QR module after canvas resizing with room for the quiet zone", () => {
  const url = "https://trybe.events/devfest-lagos-2026";
  const output = canvasHarness();
  drawEventShareGraphic(output.canvas, "DevFest Lagos 2026", url);
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const scale = Math.floor(880 / (qr.modules.size + 8));
  const left = Math.floor((1240 - (qr.modules.size + 8) * scale) / 2);
  const top = 96 + 76 + 120;
  const expected = [];
  for (let row = 0; row < qr.modules.size; row++)
    for (let column = 0; column < qr.modules.size; column++)
      if (qr.modules.get(row, column))
        expected.push({
          x: left + (column + 4) * scale,
          y: top + (row + 4) * scale,
          width: scale,
          height: scale,
          color: SHARE_COLORS.ink,
        });
  const actual = output.rectangles.filter(
    (rect) => rect.color === SHARE_COLORS.ink,
  );
  assert.deepEqual(actual, expected);
  assert.ok(actual.length > 0, "QR must not be blank");
  assert.ok(
    actual.every(
      (rect) =>
        rect.x >= 4 * scale &&
        rect.y >= 4 * scale &&
        rect.x + rect.width <= output.canvas.width - 4 * scale &&
        rect.y + rect.height <= output.canvas.height - 4 * scale,
    ),
  );
});
test("long names and full canonical URLs remain readable inside the exported graphic", () => {
  const url = `https://events.example/${"very-long-event-name-".repeat(8)}`;
  const name = "A community event with a very long title ".repeat(4).trim();
  const output = canvasHarness();
  drawEventShareGraphic(output.canvas, name, url);
  assert.ok(
    output.texts.every(
      (text) =>
        text.x >= 0 &&
        text.y + parseInt(text.font.match(/\d+px/)[0]) <= output.canvas.height,
    ),
  );
  const urlLines = output.texts.filter((text) =>
    text.font.startsWith("500 36px"),
  );
  assert.equal(urlLines.map((text) => text.value).join(""), url);
  assert.ok(!output.texts.some((text) => text.value.includes("…")));
});
test("unavailable canvas export reports failure rather than a blank success", () => {
  assert.throws(
    () =>
      drawEventShareGraphic(
        { getContext: () => null },
        "Event",
        "https://trybe.events/event",
      ),
    /unavailable/,
  );
});

test("short invitations include the readable six-character code", () => {
  const output = canvasHarness();
  drawEventShareGraphic(
    output.canvas,
    "DevFest",
    "https://trybe.events/jyka2k",
  );
  assert.ok(output.texts.some((text) => text.value === "Event code: JYKA2K"));
});
