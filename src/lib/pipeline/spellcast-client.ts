/**
 * Spellcast API Client
 *
 * Uploads media and creates/schedules posts on Spellcast.
 * Auth: API key in Authorization header.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccountSet {
  id: string;
  name: string;
}

export interface UploadedMedia {
  id: string;
  url: string;
}

export interface CreatedPost {
  id: string;
  status: string;
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
      Authorization: `Bearer ${this.apiKey}`,
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
    form.append("filename", filename);

    const res = await fetch(`${this.baseUrl}/api/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Media upload failed (${res.status}): ${err}`);
    }

    return res.json() as Promise<UploadedMedia>;
  }

  // ── Posts ───────────────────────────────────────────────────

  /** Create and schedule a post */
  async createPost(params: {
    content: string;
    mediaIds: string[];
    scheduledFor: string; // ISO 8601
    accountSetId: string;
    postType: "post" | "story" | "reel";
  }): Promise<CreatedPost> {
    const res = await fetch(`${this.baseUrl}/api/posts`, {
      method: "POST",
      headers: this.headers("application/json"),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Create post failed (${res.status}): ${err}`);
    }

    return res.json() as Promise<CreatedPost>;
  }

  // ── Account sets ────────────────────────────────────────────

  /** List available account sets */
  async getAccountSets(): Promise<AccountSet[]> {
    const res = await fetch(`${this.baseUrl}/api/account-sets`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Get account sets failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return (data as { accountSets: AccountSet[] }).accountSets;
  }
}
