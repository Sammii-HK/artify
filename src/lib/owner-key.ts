import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Whether a request carries the owner's key. With no key configured, nobody is allowed:
 * a missing environment variable must switch paid generation off, never on.
 */
export function ownerAllowed(given: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  // Hashing first gives equal-length buffers, so the comparison takes the same time whatever was sent.
  return timingSafeEqual(digest(given), digest(expected));
}
