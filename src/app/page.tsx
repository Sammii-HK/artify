"use client";

import { useState, useRef, useCallback } from "react";
import { STYLES, type StyleKey } from "@/lib/styles";
import { SCENES, scenesByDay } from "@/lib/scenes";

const styleKeys = Object.keys(STYLES) as StyleKey[];
const sceneGroups = scenesByDay();
const allSceneKeys = Object.keys(SCENES);

type Mode = "colourize" | "scene";

interface BatchResult {
  sceneKey: string;
  label: string;
  url: string | null;
  status: "pending" | "loading" | "done" | "error";
  error?: string;
}

async function convertToJpeg(file: File): Promise<File> {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }

  if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic")) {
    const heic2any = (await import("heic2any")).default;
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const result = Array.isArray(blob) ? blob[0] : blob;
    const name = file.name.replace(/\.\w+$/, ".jpg");
    return new File([result], name, { type: "image/jpeg" });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Image conversion failed"));
          const name = file.name.replace(/\.\w+$/, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Could not load image — format not supported by this browser"));
    img.src = URL.createObjectURL(file);
  });
}

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("colourize");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleKey | "custom">("soft_watercolour");
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set(["eclipse_ritual"]));
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setResultUrl(null);
    setBatchResults([]);
    setError(null);
    try {
      const converted = await convertToJpeg(f);
      setFile(converted);
      setPreview(URL.createObjectURL(converted));
    } catch {
      setFile(null);
      setPreview(null);
      setError("Could not load image — try saving it as JPEG first");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) handleFile(f);
    },
    [handleFile]
  );

  const toggleScene = useCallback((key: string) => {
    setSelectedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAllScenes = useCallback(() => {
    setSelectedScenes(new Set(allSceneKeys));
  }, []);

  const clearScenes = useCallback(() => {
    setSelectedScenes(new Set());
  }, []);

  const isCustomColourize = mode === "colourize" && selectedStyle === "custom";
  const isCustomScene = mode === "scene" && selectedScenes.size === 0;
  const showCustomPrompt = isCustomColourize || isCustomScene;

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);
    setBatchResults([]);

    if (mode === "colourize") {
      // Single request for colourize mode (unchanged behaviour)
      const form = new FormData();
      form.append("image", file);
      if (selectedStyle === "custom") {
        form.append("custom_prompt", customPrompt);
      } else {
        form.append("style", selectedStyle);
      }

      try {
        const res = await fetch("/api/stylize", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Request failed");
        const imageData = json.data?.[0];
        if (imageData?.url) {
          setResultUrl(imageData.url);
        } else if (imageData?.b64_json) {
          setResultUrl(`data:image/png;base64,${imageData.b64_json}`);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Batch scene generation
    const scenesToGenerate = Array.from(selectedScenes);
    if (scenesToGenerate.length === 0) return;

    const initialResults: BatchResult[] = scenesToGenerate.map((key) => ({
      sceneKey: key,
      label: SCENES[key]?.label ?? key,
      url: null,
      status: "loading",
    }));
    setBatchResults(initialResults);

    const promises = scenesToGenerate.map(async (sceneKey, idx) => {
      const form = new FormData();
      form.append("image", file);
      form.append("scene", sceneKey);

      try {
        const res = await fetch("/api/stylize", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Request failed");
        const imageData = json.data?.[0];
        let url: string | null = null;
        if (imageData?.url) {
          url = imageData.url;
        } else if (imageData?.b64_json) {
          url = `data:image/png;base64,${imageData.b64_json}`;
        } else {
          throw new Error("Unexpected response format");
        }

        setBatchResults((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], url, status: "done" };
          return next;
        });
      } catch (e: unknown) {
        setBatchResults((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            status: "error",
            error: e instanceof Error ? e.message : "Failed",
          };
          return next;
        });
      }
    });

    await Promise.allSettled(promises);
    setLoading(false);
  }

  async function handleDownload() {
    if (!resultUrl) return;
    await downloadImage(resultUrl, `artify-${selectedStyle}-${Date.now()}.png`);
  }

  async function handleSaveAll() {
    const successes = batchResults.filter((r) => r.status === "done" && r.url);
    if (successes.length === 0) return;

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    await Promise.all(
      successes.map(async (result) => {
        const res = await fetch(result.url!);
        const blob = await res.blob();
        zip.file(`artify-${result.sceneKey}.png`, blob);
      })
    );

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artify-batch-${Date.now()}.zip`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const doneCount = batchResults.filter((r) => r.status === "done" || r.status === "error").length;
  const totalCount = batchResults.length;
  const successCount = batchResults.filter((r) => r.status === "done").length;

  const canSubmit =
    file &&
    !loading &&
    (mode === "colourize"
      ? selectedStyle !== "custom" || customPrompt.trim().length > 0
      : selectedScenes.size > 0);

  const sceneSubmitLabel =
    mode === "scene" && selectedScenes.size > 0
      ? `Artify ${selectedScenes.size} scene${selectedScenes.size === 1 ? "" : "s"}`
      : "Artify";

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Artify</h1>
      <p className="mb-6 text-stone-500 dark:text-stone-400">
        Turn pencil sketches into coloured illustrations, or generate content scenes
      </p>

      {/* Mode toggle */}
      <div className="mb-6 flex rounded-lg bg-stone-100 dark:bg-stone-800 p-1">
        <button
          onClick={() => setMode("colourize")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === "colourize"
              ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          Colourize
        </button>
        <button
          onClick={() => setMode("scene")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === "scene"
              ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          Scene Edit
        </button>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 p-8 transition hover:border-stone-400 dark:hover:border-stone-500"
      >
        {preview ? (
          <img
            src={preview}
            alt="Upload preview"
            className="max-h-64 rounded-lg object-contain"
          />
        ) : (
          <div className="text-center text-stone-400 dark:text-stone-500">
            <p className="text-lg font-medium">
              {mode === "colourize" ? "Drop a sketch here" : "Drop your coloured Sammii here"}
            </p>
            <p className="text-sm">or click to browse</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* Colourize mode — style picker */}
      {mode === "colourize" && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">Choose a style</p>
          <div className="flex flex-wrap gap-2">
            {styleKeys.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedStyle(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedStyle === key
                    ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                }`}
              >
                {STYLES[key].label}
              </button>
            ))}
            <button
              onClick={() => setSelectedStyle("custom")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedStyle === "custom"
                  ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              }`}
            >
              Custom
            </button>
          </div>
        </div>
      )}

      {/* Scene Edit mode — scene picker grouped by day (multi-select) */}
      {mode === "scene" && (
        <div className="mb-4 space-y-3">
          {/* Select all / Clear buttons */}
          <div className="flex gap-2">
            <button
              onClick={selectAllScenes}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
            >
              Select all
            </button>
            <button
              onClick={clearScenes}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
            >
              Clear
            </button>
          </div>

          {sceneGroups.map(({ day, scenes }) => (
            <div key={day}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                {day}
              </p>
              <div className="flex flex-wrap gap-2">
                {scenes.map(({ key, scene }) => (
                  <button
                    key={key}
                    onClick={() => toggleScene(key)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      selectedScenes.has(key)
                        ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                    }`}
                  >
                    {scene.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom prompt textarea */}
      {showCustomPrompt && (
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={
            mode === "colourize"
              ? "Describe how you want the sketch coloured..."
              : "Describe the scene you want Sammii in..."
          }
          rows={3}
          className="mb-4 w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none dark:text-stone-100 dark:placeholder-stone-500"
        />
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mb-8 w-full rounded-lg bg-stone-800 dark:bg-stone-100 py-3 text-sm font-semibold text-white dark:text-stone-900 transition hover:bg-stone-700 dark:hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {totalCount > 1
              ? `Generating... ${doneCount} of ${totalCount} done`
              : "Generating... this takes 30-60s"}
          </span>
        ) : mode === "scene" ? (
          sceneSubmitLabel
        ) : (
          "Artify"
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Single result (colourize mode) */}
      {resultUrl && preview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-stone-400 uppercase tracking-wide">
                Original
              </p>
              <img
                src={preview}
                alt="Original"
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-stone-400 uppercase tracking-wide">
                Result
              </p>
              <img
                src={resultUrl}
                alt="Generated result"
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700"
              />
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="mt-4 w-full rounded-lg border border-stone-300 dark:border-stone-600 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 transition hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Save result
          </button>
        </>
      )}

      {/* Batch results grid (scene mode) */}
      {batchResults.length > 0 && (
        <div>
          {/* Save all button */}
          {successCount > 1 && !loading && (
            <button
              onClick={handleSaveAll}
              className="mb-4 w-full rounded-lg border border-stone-300 dark:border-stone-600 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 transition hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Download all as zip ({successCount} images)
            </button>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {batchResults.map((result) => (
              <div
                key={result.sceneKey}
                className="rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden"
              >
                <div className="px-3 py-2 bg-stone-50 dark:bg-stone-800/50">
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                    {result.label}
                  </p>
                </div>

                {result.status === "loading" && (
                  <div className="flex items-center justify-center h-48 bg-stone-50 dark:bg-stone-800/30">
                    <svg
                      className="h-6 w-6 animate-spin text-stone-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                )}

                {result.status === "done" && result.url && (
                  <>
                    <img
                      src={result.url}
                      alt={result.label}
                      className="w-full"
                    />
                    <div className="px-3 py-2">
                      <button
                        onClick={() =>
                          downloadImage(
                            result.url!,
                            `artify-${result.sceneKey}-${Date.now()}.png`
                          )
                        }
                        className="w-full rounded-md border border-stone-300 dark:border-stone-600 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 transition hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        Save
                      </button>
                    </div>
                  </>
                )}

                {result.status === "error" && (
                  <div className="flex items-center justify-center h-48 bg-red-50 dark:bg-red-900/20">
                    <p className="text-xs text-red-500 dark:text-red-400 px-3 text-center">
                      {result.error || "Failed"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
