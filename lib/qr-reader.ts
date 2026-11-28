// Reads a QR code from a playing <video>. Browsers with a built-in BarcodeDetector
// (Chrome on Android and macOS, Edge) use it; the rest (Chrome on Windows, Firefox,
// Safari) decode frames with jsQR, loaded only when the camera is started.

type Detector = {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => Detector;
  }
}

export type QrReader = (video: HTMLVideoElement) => Promise<string | null>;

export async function createQrReader(): Promise<QrReader> {
  if (window.BarcodeDetector) {
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    if (!context || !video.videoWidth) return null;
    // A smaller frame decodes faster and is plenty for a pass held up to the camera.
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    return (
      jsQR(frame.data, frame.width, frame.height, {
        inversionAttempts: "dontInvert",
      })?.data ?? null
    );
  };
}

export function hasCamera() {
  return (
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
  );
}
