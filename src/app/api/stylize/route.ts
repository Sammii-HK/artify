import { NextRequest, NextResponse } from "next/server";
import { STYLES, StyleKey } from "@/lib/styles";
import { SCENES, SceneKey, buildScenePrompt } from "@/lib/scenes";
import { ownerAllowed } from "@/lib/owner-key";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Every image is a paid model call, so the public site never makes one for a visitor.
  if (!ownerAllowed(req.headers.get("x-artify-key"), process.env.ARTIFY_OWNER_KEY)) {
    return NextResponse.json(
      { error: "Image generation is private on this public site, because each image is a paid model call." },
      { status: 401 }
    );
  }

  const token = process.env.DEEPINFRA_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server misconfigured: missing API token" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const imageFile = formData.get("image") as File | null;
  const styleKey = formData.get("style") as string | null;
  const sceneKey = formData.get("scene") as string | null;
  const customPrompt = formData.get("custom_prompt") as string | null;

  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  let prompt: string;
  if (customPrompt && customPrompt.trim().length > 0) {
    prompt = customPrompt.trim();
  } else if (sceneKey && sceneKey in SCENES) {
    prompt = buildScenePrompt(SCENES[sceneKey as SceneKey]);
  } else if (styleKey && styleKey in STYLES) {
    prompt = STYLES[styleKey as StyleKey].prompt;
  } else {
    return NextResponse.json(
      { error: "Provide a style, scene, or custom prompt" },
      { status: 400 }
    );
  }

  const outbound = new FormData();
  outbound.append("image", imageFile, imageFile.name);
  outbound.append("prompt", prompt);
  outbound.append("model", "black-forest-labs/FLUX.1-Kontext-dev");

  const response = await fetch(
    "https://api.deepinfra.com/v1/openai/images/edits",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: outbound,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `DeepInfra error: ${response.status}`, details: errorText },
      { status: response.status }
    );
  }

  const result = await response.json();
  return NextResponse.json(result);
}
