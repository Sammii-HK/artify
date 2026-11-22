# Artify local verification, 20 November 2026

This is an unreleased local branch, not a live deployment. The owner's main checkout and its uncommitted changes were preserved. No environment files were copied or read. No image, vision, caption, video, upload or scheduling provider was called, and no generation spend was incurred.

## Correctness repairs

- Vision validation distinguishes passed, failed, skipped and error. Missing credentials/images, provider outages and empty or malformed verdicts cannot pass.
- Generated candidates stay in memory until accepted. If a rejected first image is followed by a failed retry, no rejected image is returned as success and any previous output remains untouched. A validation outage stops as needs-review rather than buying a retry. Explicitly disabled validation produces unchecked output, with validation skipped and pass false.
- The daily dry command dynamically avoids the live module. It calculates dates and content cadence only, with generation, validation, uploads and scheduling explicitly false. Its actual CLI was exercised under guards rejecting network calls, credential-file reads and writes. Unknown options and invalid dates fail before generation.
- Daily manifests expose validation and partial-run states. Cached images are labelled not checked this run. Caption failures no longer increment successful captions. Unmeasured provider costs are no longer presented as an exact per-image charge.
- The studio clears failed result URLs, handles empty provider responses and download errors, locks conflicting controls during work, and makes custom scenes available after clearing the scene selection.

## Actual browser observations

Production build served locally on port 4806. Fresh agent tabs only.

- Desktop 1144px: shared navigation, both recorded assets loaded, no horizontal overflow, all navigation links 44px high.
- The local project sketch loads into both source and starting-point previews. Style search for ocean reduces the choices to Ocean Mystic plus the custom option. Scene editing exposes grouped, named controls. Clearing selection disables generation until a custom direction is entered; entering a direction enables the request button. The Generate button was never pressed.
- Phone 390px: document scroll width exactly 390px, shared navigation links remain 44px high, single-column workspace. The recorded-runs and tarot-archive routes are reachable and retain navigation without horizontal overflow.
- There are no saved content manifests or generated tarot cards in this isolated checkout. Recorded runs therefore shows its empty state, and tarot cards show not yet generated. These routes were checked for honest absence and navigation only, not presented as populated archives or certified as fully polished.

Screenshots in `.codex-artifacts`, deliberately excluded from the local code commit:

- `artify-studio-desktop.jpg`: actual 1144px landing/workspace, recorded project output.
- `artify-workspace-desktop.jpg`: actual 1144px source preview and custom direction; no generated result.
- `artify-studio-phone.jpg`: actual 390px landing and navigation, recorded project output.

## Automated checks

- 15 mocked tests: dry-run isolation, strict dates/flags, weekly-date agreement, validation outages/skips/verdicts, failed retries, accepted fresh retry, disabled validation, failed downloads, custom scenes, unusable provider responses and upload limits.
- Shared Lucide icon lint: zero blocking violations. Eight icon-guard regression tests pass. Astro data symbols remain in content-generation data; rendered archive navigation/badges use named Lucide icons.
- TypeScript and production build pass. Next 16.4.6, aligned Remotion 4.0.545 packages and Sharp 0.35.5. Dependency audit reports zero vulnerabilities.

## Limits

Live image quality, provider availability, generation charges, scheduling, rendering and deployment were not exercised. Automated hand validation is fallible. Web results remain explicitly unvalidated. HEIC conversion, large-source browser behaviour and real generated-result download CORS were not certified. The legacy manual CLI's broader generation/scheduling semantics remain outside this verification. The archive routes retain their earlier visual designs beyond the shared navigation and icon repairs.
