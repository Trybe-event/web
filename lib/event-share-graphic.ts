import QRCode from "qrcode";

export const SHARE_COLORS = {
  paper: "#faf9f5",
  ink: "#20261d",
  muted: "#5f6558",
  lime: "#c3ef66",
};

// Keep long event names and registration URLs readable rather than truncating them.
export function graphicTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const character of text) {
    if (line && context.measureText(line + character).width > maxWidth) {
      lines.push(line.trimEnd());
      line = "";
    }
    line += character;
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

// Draw QR modules directly into the export canvas. Resizing a source canvas before
// copying it erases its bitmap, so export never reuses the preview/source canvas.
export function drawEventShareGraphic(
  canvas: HTMLCanvasElement,
  name: string,
  url: string,
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable.");
  const width = 1240;
  const padding = 80;
  context.font = "700 64px Manrope, ui-sans-serif, system-ui, sans-serif";
  const titleLines = graphicTextLines(context, name, width - padding * 2);
  context.font = "500 36px 'DM Sans', ui-sans-serif, system-ui, sans-serif";
  const urlLines = graphicTextLines(context, url, width - padding * 2);
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quietModules = 4;
  const scale = Math.max(
    1,
    Math.floor(880 / (qr.modules.size + quietModules * 2)),
  );
  const qrSize = (qr.modules.size + quietModules * 2) * scale;
  const titleTop = 96;
  const titleBottom = titleTop + titleLines.length * 76;
  const qrTop = titleBottom + 120;
  const qrLeft = Math.floor((width - qrSize) / 2);
  const urlTop = qrTop + qrSize + 124;
  canvas.width = width;
  canvas.height = Math.max(1600, urlTop + urlLines.length * 46 + 96);
  context.fillStyle = SHARE_COLORS.paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = SHARE_COLORS.lime;
  context.fillRect(0, 0, width, 24);
  context.textBaseline = "top";
  context.fillStyle = SHARE_COLORS.ink;
  context.font = "700 64px Manrope, ui-sans-serif, system-ui, sans-serif";
  titleLines.forEach((line, index) =>
    context.fillText(line, padding, titleTop + index * 76),
  );
  context.font = "500 40px 'DM Sans', ui-sans-serif, system-ui, sans-serif";
  context.fillText("Scan the code to register", padding, titleBottom + 24);
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) {
        context.fillRect(
          qrLeft + (column + quietModules) * scale,
          qrTop + (row + quietModules) * scale,
          scale,
          scale,
        );
      }
    }
  }
  context.font = "600 40px 'DM Sans', ui-sans-serif, system-ui, sans-serif";
  context.fillText("Or open this link:", padding, urlTop - 64);
  context.font = "500 36px 'DM Sans', ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = SHARE_COLORS.muted;
  urlLines.forEach((line, index) =>
    context.fillText(line, padding, urlTop + index * 46),
  );
}
