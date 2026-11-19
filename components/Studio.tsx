"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import ResultViewer, { type GenResult } from "./ResultViewer";
import { PRESETS, PRESET_CATEGORIES, type Preset } from "@/lib/presets";

const Viewer3D = dynamic(() => import("./Viewer3D"), { ssr: false });

type Mode = "text" | "image";

export default function Studio() {
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [activePresets, setActivePresets] = useState<Set<string>>(new Set());
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);

  const [result, setResult] = useState<GenResult | null>(null);
  const resultUrl = result?.url ?? null;
  const [meshUrl, setMeshUrl] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generating3D, setGenerating3D] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function togglePreset(preset: Preset) {
    setActivePresets((prev) => {
      const next = new Set(prev);
      if (next.has(preset.id)) {
        next.delete(preset.id);
      } else {
        next.add(preset.id);
      }
      return next;
    });
  }

  function buildPrompt() {
    const modifiers = PRESETS.filter((p) => activePresets.has(p.id)).map(
      (p) => p.promptModifier
    );
    return [prompt.trim(), ...modifiers].filter(Boolean).join(", ");
  }

  function onFileChosen(file: File) {
    setSourceFile(file);
    setSourcePreview(URL.createObjectURL(file));
    setMode("image");
  }

  async function uploadSource(): Promise<string> {
    if (!sourceFile) throw new Error("No source image.");
    const form = new FormData();
    form.append("file", sourceFile);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed.");
    return data.url as string;
  }

  async function handleGenerate() {
    const finalPrompt = buildPrompt();
    if (!finalPrompt) {
      setError("Enter a prompt or pick at least one preset.");
      return;
    }
    setError(null);
    setGenerating(true);
    setMeshUrl(null);
    setStatus("Generating...");
    try {
      let imageUrl: string | undefined;
      if (mode === "image" && sourceFile) {
        setStatus("Uploading source image...");
        imageUrl = await uploadSource();
      }
      setStatus("Rendering with Veridian Q engine...");
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setResult({
        url: data.url,
        prompt: finalPrompt,
        mode: imageUrl ? "image" : "text",
        model: "Flux Dev",
      });
      setStatus("Render complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStatus("Idle");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerate3D() {
    if (!resultUrl) return;
    setError(null);
    setGenerating3D(true);
    setStatus("Building 3D mesh...");
    try {
      const res = await fetch("/api/generate-3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: resultUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "3D generation failed.");
      setMeshUrl(data.meshUrl);
      setStatus("3D mesh ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "3D generation failed.");
    } finally {
      setGenerating3D(false);
    }
  }

  function reset() {
    setPrompt("");
    setActivePresets(new Set());
    setSourceFile(null);
    setSourcePreview(null);
    setResult(null);
    setMeshUrl(null);
    setError(null);
    setStatus("Idle");
    setMode("text");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Control panel */}
      <aside className="w-96 bg-black/90 backdrop-blur-md border-r border-stone-800 p-8 flex flex-col overflow-y-auto">
        <header className="mb-8 text-center">
          <h1 className="cinzel text-3xl text-stone-100 tracking-[0.3em]">
            VERIDIAN <span style={{ color: "var(--gold)" }}>Q</span>
          </h1>
          <p className="text-[9px] tracking-[0.5em] text-stone-500 uppercase mt-2">
            AI Generative Studio
          </p>
        </header>

        {/* Mode */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            className={`btn-master h-10 ${mode === "text" ? "active" : ""}`}
            onClick={() => setMode("text")}
          >
            Text → Image
          </button>
          <button
            className={`btn-master h-10 ${mode === "image" ? "active" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            Image → Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFileChosen(e.target.files[0])}
          />
        </div>

        {mode === "image" && sourcePreview && (
          <div className="mb-6 border border-stone-800 bg-black h-40 overflow-hidden">
            <img
              src={sourcePreview}
              alt="Uploaded source"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Prompt */}
        <div className="mb-6">
          <label className="text-[10px] text-stone-500 uppercase tracking-widest mb-2 block">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe what to create..."
            className="w-full bg-stone-900 border border-stone-800 p-3 text-xs text-stone-200 outline-none focus:border-[var(--gold)] transition"
          />
        </div>

        {/* Presets */}
        <div className="mb-6 border-t border-stone-900 pt-6 space-y-5">
          {PRESET_CATEGORIES.map((cat) => (
            <div key={cat}>
              <label className="text-[10px] text-amber-500 uppercase tracking-widest mb-2 block">
                {cat}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.filter((p) => p.category === cat).map((p) => (
                  <button
                    key={p.id}
                    className={`btn-master h-10 text-[10px] ${
                      activePresets.has(p.id) ? "active" : ""
                    }`}
                    onClick={() => togglePreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-6 border-t border-stone-900 space-y-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-amber-900/20 border border-amber-600/50 text-amber-500 py-3 font-bold text-[11px] uppercase tracking-widest hover:bg-amber-600/30 transition disabled:opacity-40"
          >
            {generating ? "Generating..." : "Activate Q"}
          </button>
          <button onClick={reset} className="btn-master w-full h-10 text-[9px]">
            New Session
          </button>
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-8 pb-16 bg-[#050505]">
        {error && (
          <div className="absolute top-6 left-6 right-6 bg-red-950/60 border border-red-700 text-red-300 text-xs p-3 rounded">
            {error}
          </div>
        )}

        {!resultUrl && !generating && (
          <p className="text-stone-600 text-xs uppercase tracking-widest">
            No render yet — set a prompt or presets and activate.
          </p>
        )}

        {generating && (
          <p className="text-amber-500 text-xs uppercase tracking-widest animate-pulse">
            {status}
          </p>
        )}

        {result && !meshUrl && (
          <ResultViewer
            key={result.url}
            result={result}
            onConvert3D={handleGenerate3D}
            converting3D={generating3D}
          />
        )}

        {meshUrl && (
          <div
            className="bg-[#12100e] shadow-[0_0_100px_black]"
            style={{ width: 600, height: 600 }}
          >
            <Viewer3D meshUrl={meshUrl} />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-8 py-4 border-t border-stone-800 text-[10px] text-stone-500 uppercase tracking-widest">
          Status: <span className="text-amber-400">{status}</span>
        </div>
      </main>
    </div>
  );
}
