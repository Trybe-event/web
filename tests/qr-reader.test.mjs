import test from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";

// The Entry pass draws its QR with the qrcode package (margin 2). The camera fallback
// reads frames with jsQR. This proves the two agree on a real pass code.
function render(text, scale = 8, margin = 2) {
  const { modules } = QRCode.create(text);
  const size = (modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < modules.size; y++)
    for (let x = 0; x < modules.size; x++) {
      if (!modules.get(y, x)) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const px = (x + margin) * scale + dx;
          const py = (y + margin) * scale + dy;
          const at = (py * size + px) * 4;
          pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
        }
    }
  return { pixels, size };
}

test("the camera fallback reads an entry pass QR code", () => {
  const code = "3O0NTdRmRwbahRi1ET1yDFBs";
  const { pixels, size } = render(code);
  const read = jsQR(pixels, size, size, { inversionAttempts: "dontInvert" });
  assert.equal(read?.data, code);
});
