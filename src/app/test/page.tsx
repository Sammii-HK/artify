"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface TestScene {
  key: string;
  label: string;
  day: string;
  palette: string;
  image: string | null;
}

interface TestManifest {
  scenes: TestScene[];
}

const PALETTE_COLOURS: Record<string, string> = {
  celestial: "#6b5ce7",
  mystic: "#9333ea",
  oceanic: "#0891b2",
  earthy: "#65a30d",
  solar: "#ea580c",
  cream: "#d4a574",
  indigo: "#4338ca",
};

const CATEGORY_COLOURS: Record<string, string> = {
  "Moon Monday": "#6b5ce7",
  "Tarot Tuesday": "#9333ea",
  "Zodiac Wednesday": "#0891b2",
  "Crystal Thursday": "#65a30d",
  "Spell Friday": "#ea580c",
  "Cosy Saturday": "#d4a574",
  "Sunday": "#f59e0b",
  "Stories": "#ec4899",
  "Carousel Hook": "#14b8a6",
  "Feed Singles": "#f97316",
};

export default function TestPage() {
  const [manifest, setManifest] = useState<TestManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/content/test/manifest.json")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} — run: npx tsx scripts/content-pipeline.ts test`);
        return res.json();
      })
      .then(setManifest)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#f87171" }}>
        <h1>Scene Test</h1>
        <p>Could not load manifest: {error}</p>
        <code style={{ display: "block", marginTop: 16, color: "#a3a3a3" }}>
          npx tsx scripts/content-pipeline.ts test
        </code>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#a3a3a3" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", background: "#0a0a0a", minHeight: "100vh" }}>
      <h1 style={{ color: "#e5e5e5", marginBottom: 8 }}>Scene Test — Palette Comparison</h1>
      <p style={{ color: "#737373", marginBottom: 24 }}>
        {manifest.scenes.length} scenes across {new Set(manifest.scenes.map((s) => s.palette)).size} palettes
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
          gap: 16,
        }}
      >
        {manifest.scenes.map((scene) => (
          <div
            key={scene.key}
            style={{
              background: "#171717",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #262626",
            }}
          >
            {scene.image ? (
              <Image
                src={scene.image}
                alt={scene.label}
                width={1024}
                height={1024}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            ) : (
              <div
                style={{
                  aspectRatio: "1",
                  background: "#262626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#525252",
                }}
              >
                No image
              </div>
            )}

            <div style={{ padding: 12 }}>
              <div style={{ color: "#e5e5e5", fontWeight: 600, marginBottom: 8 }}>
                {scene.label}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    background: CATEGORY_COLOURS[scene.day] ?? "#525252",
                    color: "#fff",
                  }}
                >
                  {scene.day}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    background: "#262626",
                    color: PALETTE_COLOURS[scene.palette] ?? "#a3a3a3",
                    border: `1px solid ${PALETTE_COLOURS[scene.palette] ?? "#525252"}`,
                  }}
                >
                  {scene.palette}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 12,
                    color: "#525252",
                  }}
                >
                  {scene.key}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
