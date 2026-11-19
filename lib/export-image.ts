// Client-side export helpers: high-quality resampling + download.
// Browser-only (uses canvas / createImageBitmap).

export type ExportPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  note?: string;
};

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: "ig-post", label: "Instagram Post", width: 1080, height: 1080 },
  { id: "ig-story", label: "Instagram Story", width: 1080, height: 1920 },
  { id: "x-post", label: "Twitter / X Post", width: 1600, height: 900 },
  { id: "fb-post", label: "Facebook Post", width: 1200, height: 630 },
  { id: "hd", label: "HD", width: 1920, height: 1080 },
  { id: "4k", label: "4K UHD", width: 3840, height: 2160 },
  { id: "letter", label: "Letter 8.5×11 in", width: 2550, height: 3300, note: "300 dpi" },
  { id: "a4", label: "A4", width: 2480, height: 3508, note: "300 dpi" },
  { id: "print-13x19", label: "Print 13×19 in", width: 3900, height: 5700, note: "300 dpi" },
];

export type FitMode = "cover" | "contain";
export type ExportFormat = "png" | "jpeg" | "webp";

export const MAX_DIMENSION = 16384;

// Same-origin proxy so pixel access never depends on the CDN's CORS headers.
export function proxied(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(proxied(url));
  if (!res.ok) throw new Error(`Could not load image (${res.status}).`);
  return createImageBitmap(await res.blob());
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function draw(
  src: CanvasImageSource,
  sx: number, sy: number, sw: number, sh: number,
  dw: number, dh: number
): HTMLCanvasElement {
  const c = makeCanvas(dw, dh);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

/**
 * Resample a source region to dw x dh in progressive steps (never more than
 * 2x per step). Single-shot big jumps alias on downscale and look blocky on
 * upscale; stepping with "high" smoothing (bicubic/Lanczos-class in browsers)
 * keeps edges clean at any target size.
 */
function resample(
  src: CanvasImageSource,
  sx: number, sy: number, sw: number, sh: number,
  dw: number, dh: number
): HTMLCanvasElement {
  let cur: CanvasImageSource = src;
  let cx = sx, cy = sy, cw = sw, ch = sh;
  let w = sw, h = sh;

  // Step toward the target by at most a factor of 2 per pass.
  for (let i = 0; i < 12; i++) {
    const nw = stepToward(w, dw);
    const nh = stepToward(h, dh);
    const last = nw === dw && nh === dh;
    const out = draw(cur, cx, cy, cw, ch, nw, nh);
    if (last) return out;
    cur = out;
    cx = 0; cy = 0; cw = out.width; ch = out.height;
    w = nw; h = nh;
  }
  return draw(cur, cx, cy, cw, ch, dw, dh);
}

function stepToward(from: number, to: number): number {
  if (to > from) return Math.min(to, Math.round(from * 2));
  return Math.max(to, Math.round(from / 2));
}

export async function renderExport(opts: {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  fit: FitMode;
  format: ExportFormat;
  quality?: number;
  background?: string;
}): Promise<Blob> {
  const { bitmap, width, height, fit, format, quality = 0.95, background = "#000000" } = opts;
  const W = Math.round(width), H = Math.round(height);
  if (!(W > 0 && H > 0) || W > MAX_DIMENSION || H > MAX_DIMENSION) {
    throw new Error(`Size must be between 1 and ${MAX_DIMENSION}px.`);
  }

  const iw = bitmap.width, ih = bitmap.height;
  const target = makeCanvas(W, H);
  const ctx = target.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (format === "jpeg" || fit === "contain") {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
  }

  if (fit === "cover") {
    // Crop the source to the target aspect, then resample the crop.
    const scale = Math.max(W / iw, H / ih);
    const sw = W / scale, sh = H / scale;
    const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
    const out = resample(bitmap, sx, sy, sw, sh, W, H);
    ctx.drawImage(out, 0, 0);
  } else {
    const scale = Math.min(W / iw, H / ih);
    const dw = Math.round(iw * scale), dh = Math.round(ih * scale);
    const out = resample(bitmap, 0, 0, iw, ih, dw, dh);
    ctx.drawImage(out, Math.round((W - dw) / 2), Math.round((H - dh) / 2));
  }

  const mime = `image/${format}`;
  return new Promise((resolve, reject) =>
    target.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed (size may exceed browser limits)."))),
      mime,
      format === "png" ? undefined : quality
    )
  );
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function extFromBlob(blob: Blob): string {
  const t = blob.type.split("/")[1] || "png";
  return t === "jpeg" ? "jpg" : t;
}
