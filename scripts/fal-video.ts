/**
 * fal.ai Kling Video — Image-to-Video Integration
 *
 * Generates "living illustration" reels by animating Kontext images
 * with atmospheric motion (candle flicker, crystal shimmer, etc.)
 * using Kling 2.6 Pro via fal.ai.
 *
 * Cost: $0.07/sec without audio = $0.35 per 5s clip.
 */

import { fal } from "@fal-ai/client";
import type { QueueStatus } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Motion prompts — scene key → atmospheric motion description
// ---------------------------------------------------------------------------

export const MOTION_PROMPTS: Record<string, string> = {
  candle_magic:
    "Flickering candlelight casting dancing shadows on the wall, gentle flame movement, warm light pulsing softly",
  full_moon:
    "Soft moonlight rays shifting through clouds, gentle luminous glow pulsing, stars twinkling faintly in the sky",
  crystal_of_the_day:
    "Gentle crystalline shimmer with light refracting through facets, subtle rainbow prismatic sparkle, soft ambient glow",
  pendulum:
    "Slow pendulum swaying gently side to side, chain glinting in candlelight, hypnotic subtle motion",
  morning_ritual:
    "Steam rising softly from a cup, morning light streaming through a window, dust motes floating gently in sunbeams",
};

// ---------------------------------------------------------------------------
// API availability check
// ---------------------------------------------------------------------------

export function isFalAvailable(): boolean {
  return Boolean(process.env.FAL_API_KEY);
}

// ---------------------------------------------------------------------------
// Image-to-video generation
// ---------------------------------------------------------------------------

/**
 * Upload a local image to fal storage for use as input.
 */
async function uploadImage(imagePath: string): Promise<string> {
  const imageData = fs.readFileSync(imagePath);
  const file = new File([imageData], path.basename(imagePath), {
    type: "image/png",
  });
  const url = await fal.storage.upload(file);
  return url;
}

/**
 * Generate a living illustration video from a static image.
 *
 * @param imagePath  - Path to the source PNG image
 * @param sceneKey   - Key into MOTION_PROMPTS for the motion description
 * @param outputPath - Where to write the output MP4
 * @param duration   - Video duration in seconds (default 5)
 * @returns true if successful
 */
export async function generateLivingIllustration(
  imagePath: string,
  sceneKey: string,
  outputPath: string,
  duration: "5" | "10" = "5",
): Promise<boolean> {
  if (!isFalAvailable()) {
    console.error("  No FAL_API_KEY set — cannot generate video");
    return false;
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`  Source image not found: ${imagePath}`);
    return false;
  }

  const motionPrompt =
    MOTION_PROMPTS[sceneKey] ??
    "Subtle atmospheric motion, gentle ambient movement, soft light shifts";

  try {
    // Configure fal client with API key
    fal.config({ credentials: process.env.FAL_API_KEY! });

    console.log(`    Uploading image to fal storage...`);
    const imageUrl = await uploadImage(imagePath);

    console.log(`    Generating video (Kling 2.6 Pro, ${duration}s)...`);
    console.log(`    Motion: "${motionPrompt.slice(0, 60)}..."`);

    const result = await fal.subscribe("fal-ai/kling-video/v2.6/pro/image-to-video", {
      input: {
        prompt: motionPrompt,
        start_image_url: imageUrl,
        duration,
        generate_audio: false,
      },
      logs: true,
      onQueueUpdate: (update: QueueStatus) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          for (const log of update.logs) {
            console.log(`    [fal] ${log.message}`);
          }
        }
      },
    });

    // Download the resulting video
    const videoUrl = (result.data as { video?: { url?: string } })?.video?.url;
    if (!videoUrl) {
      console.error("  No video URL in fal response");
      return false;
    }

    console.log(`    Downloading MP4...`);
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      console.error(`  Video download failed: ${videoRes.status}`);
      return false;
    }

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, videoBuffer);
    console.log(`    Saved: ${outputPath}`);
    return true;
  } catch (err) {
    console.error(`  Kling video generation failed:`, err);
    return false;
  }
}
