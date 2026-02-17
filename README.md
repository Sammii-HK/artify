# Artify — Automated Instagram Content Pipeline

An automated content generation pipeline for the **Sammii Spellbound** Instagram brand. Generates daily witchcraft, tarot, and astrology content — images, videos, carousels, and captions — then schedules posts via Spellcast.

## What It Does

Every day at 3am UTC, a cron job on Hetzner generates tomorrow's Instagram content:

- **AI-generated images** via DeepInfra Flux Kontext (image-to-image from hand-drawn character art)
- **Branded text slides** for carousels and stories (SVG-to-PNG via Sharp)
- **Animated story videos** via Remotion (Ken Burns motion, animated text slides)
- **Living illustration reels** via fal.ai Kling 2.6 Pro
- **SEO-optimised captions** via DeepInfra Llama with rotating opening styles
- **Automatic scheduling** via Spellcast API

Content follows a weekly cadence based on real-time astrology data (moon phase, zodiac season, sabbat proximity).

## Architecture

```
Hetzner Cron (3am UTC daily)
  → scripts/daily-generate.ts
      ├── Build day plan (astro context + content cadence)
      ├── Generate images (DeepInfra Kontext)
      ├── Render text slides (Sharp SVG→PNG)
      ├── Render video stories (Remotion)
      ├── Generate captions (DeepInfra Llama)
      ├── Upload media to Spellcast
      └── Schedule posts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 |
| Image generation | DeepInfra FLUX.1-Kontext-dev |
| Caption generation | DeepInfra Llama 3.1-8B |
| Hand validation | DeepInfra Llama 3.2 Vision |
| Text slides | Sharp (SVG→PNG) |
| Video rendering | Remotion (4 compositions) |
| Living illustrations | fal.ai Kling 2.6 Pro |
| Scheduling | Spellcast API → Postiz |
| Hosting | Vercel (web) + Hetzner (cron) |
| Astrological data | astronomy-engine |

## Content Types

### Weekly Cadence

| Day | Feed Post | Stories | Reel |
|-----|----------|---------|------|
| Monday | Moon guide carousel | 3 Kontext + 1 text | — |
| Tuesday | Tarot/Rune carousel | 3 Kontext + 1 text | — |
| Wednesday | — | 2 Kontext + 2 text | Carousel recap |
| Thursday | Crystal/Spell/Chakra carousel | 3 Kontext + 1 text | — |
| Friday | — | 2 Kontext + 1 text | Living illustration |
| Saturday | Single feed post | 2 Kontext + 1 text | — |
| Sunday | Zodiac/Angel number carousel | 3 Kontext + 1 text | — |

### Remotion Compositions

- **KenBurnsStory** (7s) — Parallax motion for story videos
- **AnimatedTextSlide** (6s) — Animated engagement text with watercolour blobs and sparkles
- **KenBurns** (9s) — Reel-format motion parallax
- **CarouselRecap** (15s) — Carousel preview reel with text overlays

### 42 Scenes

Character illustrations mapped across 7 colour palettes (celestial, mystic, earthy, oceanic, solar, cream, indigo), with rotating hairstyles and outfits. Each scene generates a unique image via Kontext image-to-image editing from the original hand-drawn base art.

## Project Structure

```
artify/
├── scripts/
│   ├── daily-generate.ts         # Hetzner cron script
│   ├── content-pipeline.ts       # CLI for manual weekly generation
│   ├── carousel-types.ts         # 8 carousel content type definitions
│   ├── text-slide-renderer.ts    # SVG→PNG branded text slides
│   ├── render-reel.ts            # Remotion rendering wrapper
│   ├── fal-video.ts              # Kling living illustration integration
│   └── remotion/                 # Remotion compositions
│       ├── Root.tsx
│       ├── AnimatedTextSlide.tsx
│       ├── CarouselRecap.tsx
│       └── KenBurns.tsx
├── src/
│   ├── lib/
│   │   ├── pipeline/             # Shared pipeline modules
│   │   │   ├── day-plan.ts       # Single-day content planning
│   │   │   ├── image-gen.ts      # DeepInfra Kontext image generation
│   │   │   ├── caption-gen.ts    # Llama caption + story text generation
│   │   │   ├── spellcast-client.ts # Spellcast API client
│   │   │   └── index.ts
│   │   ├── scenes.ts             # 42 scene definitions
│   │   ├── styles.ts             # 15 colouring styles
│   │   └── astro.ts              # Real-time moon/zodiac/sabbat data
│   └── app/api/
│       ├── stylize/route.ts      # Image colouring API
│       └── og/route.tsx          # Open Graph image generation
├── public/
│   ├── coloured/                 # 7 cached coloured base images
│   └── content/                  # Generated content by date
└── data/                         # JSON data for carousels
    ├── tarot-cards.json
    ├── crystals.json
    ├── spells.json
    ├── zodiac-signs.json
    ├── chakras.json
    ├── runes.json
    └── angel-numbers.json
```

## Usage

### Daily Generation (Hetzner Cron)

```bash
# Generate tomorrow's content and schedule via Spellcast
npm run daily-generate

# Dry run — generate content but don't upload
npm run daily-generate:dry

# Quick test — no video rendering, no hand validation
npm run daily-generate:test

# Generate for a specific date
npx tsx scripts/daily-generate.ts --date 2026-02-18
```

### Manual Weekly Generation (CLI)

```bash
# Preview weekly plan
npx tsx scripts/content-pipeline.ts plan --week next

# Generate full week
npx tsx scripts/content-pipeline.ts generate --week next

# Single scene
npx tsx scripts/content-pipeline.ts single --scene tarot_17_star

# Standalone reel
npx tsx scripts/content-pipeline.ts reel --type kenburns --scene full_moon
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEEPINFRA_API_TOKEN` | Image + caption generation |
| `FAL_API_KEY` | fal.ai Kling living illustration reels |
| `SPELLCAST_API_URL` | Spellcast API base URL |
| `SPELLCAST_API_KEY` | Spellcast authentication |
| `SPELLCAST_ACCOUNT_SET_ID` | Target account set for scheduling |

## Cost

~$0.50-1.00/day for DeepInfra (Kontext images + Llama captions). Remotion video rendering and text slides are free (local). Optional fal.ai Kling videos are $0.35/clip.

## Brand

All content follows the [Sammii Spellbound character bible and style guide](./style-guide.md) — a hand-drawn witchy illustration style with a defined colour palette, typography system, and consistent character design across 42 scenes.
