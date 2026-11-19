"use client";

import { useEffect, useState } from "react";
import {
  EXPORT_PRESETS,
  MAX_DIMENSION,
  loadBitmap,
  renderExport,
  saveBlob,
  type ExportFormat,
  type FitMode,
} from "@/lib/export-image";

type Props = {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  onClose: () => void;
};

export default function ExportDialog({ url, naturalWidth, naturalHeight, onClose }: Props) {
  const [presetId, setPresetId] = useState<string>("original");
  const [customW, setCustomW] = useState(String(naturalWidth || 1024));
  const [customH, setCustomH] = useState(String(naturalHeight || 1024));
  const [lockRatio, setLockRatio] = useState(true);
  const [fit, setFit] = useState<FitMode>("cover");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const preset = EXPORT_PRESETS.find((p) => p.id === presetId);
  const size =
    presetId === "original"
      ? { w: naturalWidth, h: naturalHeight }
      : presetId === "custom"
      ? { w: Math.round(Number(customW)), h: Math.round(Number(customH)) }
      : { w: preset!.width, h: preset!.height };

  const valid =
    size.w > 0 && size.h > 0 && size.w <= MAX_DIMENSION && size.h <= MAX_DIMENSION;
  const upscale = valid && naturalWidth > 0 && Math.max(size.w / naturalWidth, size.h / naturalHeight) > 1;

  function onCustomW(v: string) {
    setCustomW(v);
    const n = Number(v);
    if (lockRatio && n > 0 && naturalWidth > 0) {
      setCustomH(String(Math.round((n * naturalHeight) / naturalWidth)));
    }
  }
  function onCustomH(v: string) {
    setCustomH(v);
    const n = Number(v);
    if (lockRatio && n > 0 && naturalHeight > 0) {
      setCustomW(String(Math.round((n * naturalWidth) / naturalHeight)));
    }
  }

  async function handleDownload() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const bitmap = await loadBitmap(url);
      const blob = await renderExport({
        bitmap,
        width: size.w,
        height: size.h,
        fit,
        format,
      });
      bitmap.close();
      const ext = format === "jpeg" ? "jpg" : format;
      saveBlob(blob, `veridian-q-${size.w}x${size.h}.${ext}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  const rowCls = (active: boolean) =>
    `w-full flex items-center justify-between px-3 py-2 text-left border transition text-[11px] ${
      active
        ? "border-[var(--gold)] bg-[#1a1a1a] text-white"
        : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-600"
    }`;

  const inputCls =
    "w-full bg-stone-900 border border-stone-800 p-2 text-xs text-stone-200 outline-none focus:border-[var(--gold)] transition";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export"
        className="w-full max-w-xl max-h-full overflow-y-auto bg-[#0b0b0b] border border-stone-800 shadow-[0_0_80px_black]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2 className="cinzel text-lg tracking-[0.3em] text-stone-100">
            EXPORT <span style={{ color: "var(--gold)" }}>·</span>
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="text-stone-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-[10px] text-amber-500 uppercase tracking-widest mb-2 block">
              Size
            </label>
            <div className="space-y-1.5">
              <button className={rowCls(presetId === "original")} onClick={() => setPresetId("original")}>
                <span>Original</span>
                <span className="text-stone-500">
                  {naturalWidth} × {naturalHeight}
                </span>
              </button>
              {EXPORT_PRESETS.map((p) => (
                <button key={p.id} className={rowCls(presetId === p.id)} onClick={() => setPresetId(p.id)}>
                  <span>{p.label}</span>
                  <span className="text-stone-500">
                    {p.width} × {p.height}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </button>
              ))}
              <button className={rowCls(presetId === "custom")} onClick={() => setPresetId("custom")}>
                <span>Custom</span>
                <span className="text-stone-500">any size up to {MAX_DIMENSION}px</span>
              </button>
            </div>

            {presetId === "custom" && (
              <div className="mt-3 flex items-end gap-3">
                <div className="flex-1">
                  <span className="text-[9px] text-stone-500 uppercase tracking-widest">Width px</span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_DIMENSION}
                    value={customW}
                    onChange={(e) => onCustomW(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[9px] text-stone-500 uppercase tracking-widest">Height px</span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_DIMENSION}
                    value={customH}
                    onChange={(e) => onCustomH(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <label className="flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-widest pb-2.5">
                  <input
                    type="checkbox"
                    checked={lockRatio}
                    onChange={(e) => setLockRatio(e.target.checked)}
                    className="accent-[#c5a059]"
                  />
                  Lock
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] text-amber-500 uppercase tracking-widest mb-2 block">
                Canvas fit
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button className={`btn-master h-9 text-[10px] ${fit === "cover" ? "active" : ""}`} onClick={() => setFit("cover")}>
                  Fill (crop)
                </button>
                <button className={`btn-master h-9 text-[10px] ${fit === "contain" ? "active" : ""}`} onClick={() => setFit("contain")}>
                  Fit (bars)
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-amber-500 uppercase tracking-widest mb-2 block">
                Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["png", "jpeg", "webp"] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    className={`btn-master h-9 text-[10px] ${format === f ? "active" : ""}`}
                    onClick={() => setFormat(f)}
                  >
                    {f === "jpeg" ? "JPG" : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-stone-500 leading-relaxed">
            Output: <span className="text-stone-300">{valid ? `${size.w} × ${size.h} px` : "invalid size"}</span>
            {upscale && " · upscaled with multi-pass high-quality resampling"}. Resizing is done on a
            canvas with progressive high-quality filtering, not CSS scaling. Upscaling cannot add
            detail that is not in the original.
          </p>

          {error && (
            <div className="bg-red-950/60 border border-red-700 text-red-300 text-xs p-3">{error}</div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-stone-800">
          <button onClick={onClose} disabled={busy} className="btn-master h-10 px-6 text-[10px]">
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={busy || !valid}
            className="flex-1 bg-amber-900/20 border border-amber-600/50 text-amber-500 py-2 font-bold text-[11px] uppercase tracking-widest hover:bg-amber-600/30 transition disabled:opacity-40"
          >
            {busy ? "Rendering..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
