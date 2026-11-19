"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ExportDialog from "./ExportDialog";
import { extFromBlob, proxied, saveBlob } from "@/lib/export-image";

export type GenResult = {
  url: string;
  prompt: string;
  mode: "text" | "image";
  model: string;
};

const MIN_ZOOM = 25;
const MAX_ZOOM = 800;
const STEP = 25;
const clamp = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(v)));

type Props = {
  result: GenResult;
  onConvert3D: () => void;
  converting3D: boolean;
};

export default function ResultViewer({ result, onConvert3D, converting3D }: Props) {
  // Zoom is relative to "fit": 100% = whole image visible, uncropped.
  const [zoom, setZoom] = useState(100);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [exportOpen, setExportOpen] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);
  const [dlBusy, setDlBusy] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const PAD = 24;
  const availW = Math.max(1, box.w - PAD * 2);
  const availH = Math.max(1, box.h - PAD * 2);
  const fitScale = natural.w ? Math.min(availW / natural.w, availH / natural.h) : 1;
  const dispW = natural.w * fitScale * (zoom / 100);
  const dispH = natural.h * fitScale * (zoom / 100);

  const fitScreen = useCallback(() => {
    setZoom(100);
    const el = viewerRef.current;
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
  }, []);

  function onWheel(e: React.WheelEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
  }

  function onPointerDown(e: React.PointerEvent) {
    const el = viewerRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const el = viewerRef.current;
    if (!drag.current || !el) return;
    el.scrollLeft = drag.current.sl - (e.clientX - drag.current.x);
    el.scrollTop = drag.current.st - (e.clientY - drag.current.y);
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function downloadOriginal() {
    setDlBusy(true);
    setDlError(null);
    try {
      const res = await fetch(proxied(result.url));
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      saveBlob(blob, `veridian-q-original.${extFromBlob(blob)}`);
    } catch {
      // Cross-origin fetch blocked: fall back to opening the file directly.
      window.open(result.url, "_blank", "noopener");
      setDlError("Direct download blocked by the browser; opened the original in a new tab.");
    } finally {
      setDlBusy(false);
    }
  }

  const modeLabel = result.mode === "image" ? "Image→Image" : "Text→Image";
  const canPan = natural.w > 0 && (dispW > availW + 0.5 || dispH > availH + 0.5);

  return (
    <div className="flex w-full h-full gap-6 min-h-0">
      {/* Viewer column */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
        <div
          ref={viewerRef}
          onWheel={onWheel}
          onPointerDown={canPan ? onPointerDown : undefined}
          onPointerMove={canPan ? onPointerMove : undefined}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`flex-1 min-h-0 overflow-auto bg-[#12100e] border border-stone-900 shadow-[0_0_100px_black] ${
            canPan ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          {/* margin:auto centers when smaller than viewer, scrolls from top-left when larger */}
          <div
            className="flex"
            style={{
              minWidth: "100%",
              minHeight: "100%",
              width: "max-content",
              height: "max-content",
              padding: PAD,
              boxSizing: "border-box",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt="Generated render"
              draggable={false}
              onLoad={(e) =>
                setNatural({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              style={{
                width: natural.w ? dispW : undefined,
                height: natural.w ? dispH : undefined,
                maxWidth: "none",
                margin: "auto",
                flexShrink: 0,
                visibility: natural.w ? "visible" : "hidden",
              }}
            />
          </div>
        </div>

        {/* Zoom bar */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-stone-400 uppercase tracking-widest">
          <button
            className="btn-master h-8 w-8"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => clamp(z - STEP))}
            disabled={zoom <= MIN_ZOOM}
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(clamp(Number(e.target.value)))}
            aria-label="Zoom"
            className="w-40 accent-[#c5a059]"
          />
          <button
            className="btn-master h-8 w-8"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => clamp(z + STEP))}
            disabled={zoom >= MAX_ZOOM}
          >
            +
          </button>
          <span className="w-12 text-center text-amber-400 tabular-nums">{zoom}%</span>
          <button className="btn-master h-8 px-4 text-[10px]" onClick={fitScreen}>
            Fit Screen
          </button>
        </div>
      </div>

      {/* Metadata panel */}
      <aside className="w-80 shrink-0 bg-[#0b0b0b] border border-stone-800 p-5 flex flex-col gap-5 overflow-y-auto min-h-0">
        <div>
          <label className="text-[10px] text-amber-500 uppercase tracking-widest mb-2 block">
            Prompt
          </label>
          <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto pr-1">
            {result.prompt}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-500 border-t border-stone-900 pt-4">
          <span>{result.model}</span>
          <span className="text-stone-700">|</span>
          <span>{modeLabel}</span>
          <span className="text-stone-700">|</span>
          <span>{natural.w ? `${natural.w} × ${natural.h}` : "…"}</span>
        </div>

        <div className="mt-auto space-y-2 pt-4 border-t border-stone-900">
          <button
            onClick={() => setExportOpen(true)}
            disabled={!natural.w}
            className="w-full bg-amber-900/20 border border-amber-600/50 text-amber-500 py-2.5 font-bold text-[11px] uppercase tracking-widest hover:bg-amber-600/30 transition disabled:opacity-40"
          >
            Export
          </button>
          <button
            onClick={downloadOriginal}
            disabled={dlBusy}
            className="btn-master w-full h-9 text-[10px]"
          >
            {dlBusy ? "Downloading..." : "Download Original"}
          </button>
          <button
            onClick={onConvert3D}
            disabled={converting3D}
            className="btn-master w-full h-9 text-[10px]"
          >
            {converting3D ? "Building 3D mesh..." : "Convert to Real 3D Mesh"}
          </button>
          {dlError && <p className="text-[10px] text-red-400">{dlError}</p>}
        </div>
      </aside>

      {exportOpen && (
        <ExportDialog
          url={result.url}
          naturalWidth={natural.w}
          naturalHeight={natural.h}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
