"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  ImagePlus,
  Layers,
  LoaderCircle,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { STYLES, type StyleKey } from "@/lib/styles";
import { SCENES, scenesByDay } from "@/lib/scenes";
import { resultImage, sceneRequests, validateUpload } from "@/lib/studio";

const styleKeys = Object.keys(STYLES) as StyleKey[];
const sceneGroups = scenesByDay();
const sceneLabels = Object.fromEntries(
  Object.entries(SCENES).map(([key, scene]) => [key, scene.label]),
);
type Mode = "colourize" | "scene";
type Result = {
  key: string;
  label: string;
  status: "pending" | "loading" | "done" | "error";
  url?: string;
  error?: string;
};

async function convertImage(file: File): Promise<File> {
  validateUpload(file);
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  ) {
    const convert = (await import("heic2any")).default;
    const converted = await convert({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    return new File(
      [Array.isArray(converted) ? converted[0] : converted],
      file.name.replace(/\.[^.]+$/, ".jpg"),
      { type: "image/jpeg" },
    );
  }
  return file;
}
async function imageBlob(url: string) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      "The image could not be downloaded. Your result is still here.",
    );
  const blob = await response.blob();
  if (
    blob.type &&
    !blob.type.startsWith("image/") &&
    blob.type !== "application/octet-stream"
  )
    throw new Error("The download did not contain an image.");
  return blob;
}
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("colourize");
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null);
  const [style, setStyle] = useState<StyleKey | "custom">("soft_watercolour");
  const [scenes, setScenes] = useState<string[]>(["eclipse_ritual"]);
  const [prompt, setPrompt] = useState(""),
    [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false),
    [preparing, setPreparing] = useState(false),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(""),
    [uploadError, setUploadError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    uploadId = useRef(0);
  const busy = loading || preparing || saving;
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const custom =
    mode === "colourize" ? style === "custom" : scenes.length === 0;
  const jobs =
    mode === "colourize"
      ? [
          {
            key: style,
            label:
              style === "custom" ? "Custom illustration" : STYLES[style].label,
            customPrompt: style === "custom" ? prompt : undefined,
            style: style === "custom" ? undefined : style,
          },
        ]
      : sceneRequests(scenes, prompt, sceneLabels);
  const successes = results.filter(
    (result) => result.status === "done" && result.url,
  );
  const failures = results.filter((result) => result.status === "error").length;
  const done = successes.length + failures;
  const canGenerate =
    !!file && !busy && jobs.length > 0 && (!custom || !!prompt.trim());
  const visibleStyles = styleKeys.filter((key) =>
    (STYLES[key].label + " " + key).toLowerCase().includes(query.toLowerCase()),
  );

  async function chooseFile(source: File) {
    const id = ++uploadId.current;
    setPreparing(true);
    setUploadError("");
    try {
      const converted = await convertImage(source);
      const bitmap = await createImageBitmap(converted);
      bitmap.close();
      if (id !== uploadId.current) return;
      setFile(converted);
      setPreview(URL.createObjectURL(converted));
      setResults([]);
    } catch (problem) {
      if (id === uploadId.current)
        setUploadError(
          problem instanceof Error
            ? problem.message
            : "This image could not be opened.",
        );
    } finally {
      if (id === uploadId.current) setPreparing(false);
    }
  }
  async function useSketch() {
    setUploadError("");
    setPreparing(true);
    try {
      const response = await fetch("/sammii-spellbound.png");
      if (!response.ok)
        throw new Error(
          "The project sketch is unavailable. Choose your own image instead.",
        );
      await chooseFile(
        new File([await response.blob()], "project-sketch.png", {
          type: "image/png",
        }),
      );
    } catch (problem) {
      setUploadError(
        problem instanceof Error
          ? problem.message
          : "The sketch could not be loaded.",
      );
    } finally {
      setPreparing(false);
    }
  }
  async function generate() {
    if (!canGenerate || !file) return;
    setLoading(true);
    setError("");
    setResults(
      jobs.map((job) => ({
        key: job.key,
        label: job.label,
        status: "pending",
      })),
    );
    try {
      // Keep the batch deliberate: one requested image at a time, with an honest per-image result.
      for (const job of jobs) {
        setResults((previous) =>
          previous.map((result) =>
            result.key === job.key ? { ...result, status: "loading" } : result,
          ),
        );
        const form = new FormData();
        form.append("image", file);
        if (job.customPrompt)
          form.append("custom_prompt", job.customPrompt.trim());
        else if ("style" in job && job.style) form.append("style", job.style);
        else if ("scene" in job && job.scene) form.append("scene", job.scene);
        try {
          const response = await fetch("/api/stylize", {
            method: "POST",
            body: form,
          });
          const body = await response.json();
          if (!response.ok)
            throw new Error(body.error || "Generation could not complete.");
          const url = resultImage(body);
          setResults((previous) =>
            previous.map((result) =>
              result.key === job.key
                ? { ...result, status: "done", url }
                : result,
            ),
          );
        } catch (problem) {
          setResults((previous) =>
            previous.map((result) =>
              result.key === job.key
                ? {
                    ...result,
                    status: "error",
                    url: undefined,
                    error:
                      problem instanceof Error
                        ? problem.message
                        : "Generation could not complete.",
                  }
                : result,
            ),
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }
  async function download(result: Result) {
    if (!result.url) return;
    setSaving(true);
    setError("");
    try {
      saveBlob(await imageBlob(result.url), `artify-${result.key}.png`);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Download failed. Your image is still available.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function downloadAll() {
    if (!successes.length) return;
    setSaving(true);
    setError("");
    try {
      const JSZip = (await import("jszip")).default,
        zip = new JSZip();
      for (const result of successes)
        zip.file(`artify-${result.key}.png`, await imageBlob(result.url!));
      saveBlob(await zip.generateAsync({ type: "blob" }), "artify-results.zip");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "The ZIP could not be created. Individual results are still available.",
      );
    } finally {
      setSaving(false);
    }
  }
  function changeMode(next: Mode) {
    setMode(next);
    setQuery("");
    setResults([]);
    setError("");
  }

  return (
    <div className="artify-studio">
      <main className="studio-main">
        <div id="studio" className="studio-workspace">
          <section className="studio-panel" aria-labelledby="setup-heading">
            <div className="studio-section-title">
              <span>Input</span>
              <h2 id="setup-heading">Image settings</h2>
            </div>
            <div
              role="group"
              aria-label="Editing mode"
              className="studio-modes"
            >
              <button
                disabled={busy}
                aria-pressed={mode === "colourize"}
                onClick={() => changeMode("colourize")}
              >
                <Palette size={16} aria-hidden />
                Colourize
              </button>
              <button
                disabled={busy}
                aria-pressed={mode === "scene"}
                onClick={() => changeMode("scene")}
              >
                <Layers size={16} aria-hidden />
                Scene edit
              </button>
            </div>
            <div
              onDrop={(event) => {
                event.preventDefault();
                if (!busy && event.dataTransfer.files[0])
                  void chooseFile(event.dataTransfer.files[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
              className="studio-upload"
            >
              <button
                disabled={busy}
                onClick={() => input.current?.click()}
                aria-label={
                  preview ? "Replace source image" : "Choose a source image"
                }
              >
                {preview ? (
                  <img src={preview} alt="Your source image" />
                ) : (
                  <>
                    <ImagePlus size={25} aria-hidden />
                    <strong>
                      {preparing ? "Opening your image…" : "Drop an image here"}
                    </strong>
                    <span>or choose a file</span>
                  </>
                )}
              </button>
              <input
                ref={input}
                type="file"
                accept="image/*,.heic,.heif"
                disabled={busy}
                className="sr-only"
                tabIndex={-1}
                aria-label="Source image file"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) void chooseFile(selected);
                  event.target.value = "";
                }}
              />
              {file && <p className="studio-file-name">{file.name}</p>}
            </div>
            <div className="studio-upload-meta">
              <span>JPG, PNG, WebP or HEIC. Up to 20 MB.</span>
              <button disabled={busy} onClick={() => void useSketch()}>
                Use the project sketch <ArrowUpRight size={13} aria-hidden />
              </button>
            </div>
            {uploadError && (
              <p className="studio-result-error" role="alert">
                {uploadError}
              </p>
            )}
            <label className="studio-search">
              <Search size={16} aria-hidden />
              <span className="sr-only">
                Find {mode === "colourize" ? "a style" : "a scene"}
              </span>
              <input
                disabled={busy}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder={
                  mode === "colourize" ? "Find a style" : "Find a scene"
                }
              />
            </label>
            {mode === "colourize" ? (
              <div
                className="studio-choice-list"
                role="group"
                aria-label="Illustration style"
              >
                {visibleStyles.map((key) => (
                  <button
                    key={key}
                    disabled={busy}
                    aria-pressed={style === key}
                    onClick={() => setStyle(key)}
                  >
                    {STYLES[key].label}
                  </button>
                ))}
                <button
                  disabled={busy}
                  aria-pressed={style === "custom"}
                  onClick={() => setStyle("custom")}
                >
                  Your own prompt
                </button>
              </div>
            ) : (
              <div className="studio-scenes">
                <div className="studio-small-actions">
                  <span>{scenes.length} scenes selected</span>
                  <button disabled={busy} onClick={() => setScenes([])}>
                    Clear selection
                  </button>
                </div>
                {sceneGroups.map((group) => {
                  const visible = group.scenes.filter((item) =>
                    (item.scene.label + " " + group.day)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  );
                  return visible.length ? (
                    <details
                      key={group.day}
                      open={
                        !!query ||
                        group.scenes.some((item) => scenes.includes(item.key))
                      }
                    >
                      <summary>
                        {group.day}
                        <ChevronDown size={15} aria-hidden />
                      </summary>
                      <div
                        role="group"
                        aria-label={`${group.day} scenes`}
                        className="studio-choice-list"
                      >
                        {visible.map((item) => (
                          <button
                            key={item.key}
                            disabled={busy}
                            aria-pressed={scenes.includes(item.key)}
                            onClick={() =>
                              setScenes((previous) =>
                                previous.includes(item.key)
                                  ? previous.filter((key) => key !== item.key)
                                  : [...previous, item.key],
                              )
                            }
                          >
                            {item.scene.label}
                          </button>
                        ))}
                      </div>
                    </details>
                  ) : null;
                })}
              </div>
            )}
            {custom && (
              <label className="studio-prompt">
                Your direction
                <textarea
                  disabled={busy}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={
                    mode === "colourize"
                      ? "Describe the palette and texture…"
                      : "Describe the scene you want to create…"
                  }
                  rows={4}
                />
              </label>
            )}
            <p className="studio-provider-note">
              <ShieldCheck size={16} aria-hidden />
              Generation sends your chosen image to DeepInfra. Generated images
              are not automatically hand-validated in this studio.
            </p>
            <button
              className="studio-generate"
              disabled={!canGenerate}
              onClick={() => void generate()}
            >
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" aria-hidden />
              ) : (
                <Sparkles size={18} aria-hidden />
              )}
              {loading
                ? `Generating ${Math.min(done + 1, jobs.length)} of ${jobs.length}`
                : `Generate ${jobs.length > 1 ? `${jobs.length} images` : "illustration"}`}
            </button>
            {preparing && (
              <p role="status" className="studio-note">
                Preparing the image on your device.
              </p>
            )}
          </section>
          <section
            className="studio-panel studio-results"
            aria-labelledby="results-heading"
          >
            <div className="studio-section-title">
              <span>Output</span>
              <h2 id="results-heading">Results</h2>
            </div>
            {!results.length ? (
              <div className="studio-empty">
                <img
                  src={preview || "/sammii-spellbound.png"}
                  alt={
                    preview
                      ? "Selected source awaiting generation"
                      : "The original project sketch, shown as an input example"
                  }
                />
                <div>
                  <span>
                    {preview
                      ? "Your starting point"
                      : "The original project sketch"}
                  </span>
                  <p>
                    Your generated images will appear here. Nothing is generated
                    until you choose to run it.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p role="status" className="studio-note">
                  {loading
                    ? `${done} of ${results.length} requests complete`
                    : `${successes.length} generated${failures ? `, ${failures} failed` : ""}. Review before use.`}
                </p>
                <div className="studio-result-grid">
                  {results.map((result) => (
                    <article key={result.key} className="studio-result">
                      <h3>{result.label}</h3>
                      {result.status === "done" && result.url ? (
                        <>
                          <img
                            src={result.url}
                            alt={`${result.label}: generated output awaiting visual review`}
                          />
                          <div className="studio-result-footer">
                            <span>Needs visual review</span>
                            <button
                              disabled={saving}
                              onClick={() => void download(result)}
                              aria-label={`Download ${result.label}`}
                            >
                              <Download size={16} aria-hidden />
                              Save
                            </button>
                          </div>
                        </>
                      ) : result.status === "error" ? (
                        <p className="studio-result-error" role="alert">
                          {result.error}
                        </p>
                      ) : (
                        <div className="studio-result-wait">
                          {result.status === "loading" && (
                            <LoaderCircle
                              size={24}
                              className="animate-spin"
                              aria-hidden
                            />
                          )}
                          <span>
                            {result.status === "pending"
                              ? "Waiting its turn"
                              : "Generating image…"}
                          </span>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                {successes.length > 1 && (
                  <button
                    className="studio-download-all"
                    disabled={saving || loading}
                    onClick={() => void downloadAll()}
                  >
                    <Download size={17} aria-hidden />
                    {saving
                      ? "Preparing ZIP…"
                      : `Download ${successes.length} available images`}
                  </button>
                )}
              </>
            )}
            {error && (
              <div role="alert" className="studio-error">
                <p>{error}</p>
                <button
                  onClick={() => setError("")}
                  aria-label="Dismiss message"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

    </div>
  );
}
