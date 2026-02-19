/**
 * Postiz API Client
 *
 * Uploads media and creates/schedules posts via the Postiz public API (v1).
 * Auth: API key in Authorization header (no Bearer prefix).
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadedMedia {
  id: string;
  path: string;
}

export interface CreatedPost {
  id: string;
  group: string;
}

export interface Integration {
  id: string;
  name: string;
  providerIdentifier: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class SpellcastClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl ?? process.env.SPELLCAST_API_URL ?? "").replace(/\/$/, "");
    this.apiKey = apiKey ?? process.env.SPELLCAST_API_KEY ?? "";

    if (!this.baseUrl) throw new Error("SPELLCAST_API_URL not set");
    if (!this.apiKey) throw new Error("SPELLCAST_API_KEY not set");
  }

  private headers(contentType?: string): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: this.apiKey,
    };
    if (contentType) h["Content-Type"] = contentType;
    return h;
  }

  // ── Media upload ────────────────────────────────────────────

  /** Upload a media file from a local path */
  async uploadMediaFile(filePath: string): Promise<UploadedMedia> {
    const filename = path.basename(filePath);
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType =
      ext === ".mp4" ? "video/mp4" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      "image/png";

    return this.uploadMedia(data, filename, mimeType);
  }

  /** Upload media from a Buffer */
  async uploadMedia(buffer: Buffer, filename: string, mimeType: string): Promise<UploadedMedia> {
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const form = new FormData();
    form.append("file", blob, filename);

    const res = await fetch(`${this.baseUrl}/api/public/v1/upload`, {
      method: "POST",
      headers: { Authorization: this.apiKey },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Media upload failed (${res.status}): ${err}`);
    }

    return res.json() as Promise<UploadedMedia>;
  }

  // ── Posts ───────────────────────────────────────────────────

  /**
   * Create and schedule a post across multiple integrations.
   *
   * Each entry in `integrations` targets one platform. The Postiz API
   * groups them together when posted in one request.
   */
  async createPost(params: {
    integrations: {
      id: string;
      content: string;
      mediaIds: string[];
      providerIdentifier: string;
    }[];
    scheduledFor: string; // ISO 8601
    postType?: "post" | "story";
  }): Promise<CreatedPost> {
    const body = {
      type: "schedule",
      date: params.scheduledFor,
      shortLink: false,
      tags: [] as string[],
      posts: params.integrations.map((int) => ({
        integration: { id: int.id },
        value: [{
          content: int.content,
          image: int.mediaIds.map((id) => ({ id })),
        }],
        settings: {
          __type: int.providerIdentifier,
          ...(int.providerIdentifier === "instagram-standalone"
            ? { post_type: params.postType ?? "post" }
            : {}),
        },
      })),
    };

    const res = await fetch(`${this.baseUrl}/api/public/v1/posts`, {
      method: "POST",
      headers: this.headers("application/json"),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Create post failed (${res.status}): ${err}`);
    }

    return res.json() as Promise<CreatedPost>;
  }
}
