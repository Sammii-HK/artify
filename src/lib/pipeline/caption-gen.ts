/**
 * Caption & Story Text Generation — DeepInfra Llama
 *
 * Generates Instagram captions for feed posts, carousels, and story text
 * for engagement slides.
 */

import type { Scene } from "../scenes";
import type { AstroContext } from "../astro";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LLM_API = "https://api.deepinfra.com/v1/openai/chat/completions";
const LLM_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";
const BRAND_API_URL = process.env.BRAND_API_URL || "http://localhost:9002";

function getToken(): string {
  return process.env.DEEPINFRA_API_TOKEN ?? "";
}

// ---------------------------------------------------------------------------
// LLM call helper — tries local Brand API first, falls back to DeepInfra
// ---------------------------------------------------------------------------

async function llmChat(
  messages: { role: string; content: string }[],
  options: { max_tokens: number; temperature: number },
): Promise<string | null> {
  // Try local Brand API first (free, adds grimoire context)
  try {
    const health = await fetch(`${BRAND_API_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (health.ok) {
      const res = await fetch(`${BRAND_API_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          max_tokens: options.max_tokens,
          temperature: options.temperature,
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
    }
  } catch {}

  // Fall back to DeepInfra
  const token = getToken();
  if (!token) return null;

  const res = await fetch(LLM_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
    }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? null;
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export const CAPTION_SYSTEM_PROMPT =
  "You are Sammii Spellbound, writing Instagram captions for a witchcraft, tarot, and astrology account. " +
  "Your tone is warm and knowledgeable — like a friend who knows a lot about witchcraft. " +
  "Speak directly to the reader with \"you\". Be practical and grounded. " +
  "Occasionally playful, never preachy or condescending. " +
  "Weave in astrological context naturally.\n\n" +

  "OPENING RULES (critical):\n" +
  "- NEVER open with a greeting: no \"Hey lovely!\", \"Happy Monday!\", \"Hi beautiful souls!\", " +
  "\"Good morning witches!\", \"Hello gorgeous!\" or any variation.\n" +
  "- NEVER open with an emoji.\n" +
  "- Your first sentence must HOOK the reader using one of these styles:\n" +
  "  1. BOLD CLAIM — a surprising statement (\"Most people get moon water completely wrong.\")\n" +
  "  2. DIRECT QUESTION — challenge the reader (\"When was the last time you actually sat with your tarot cards without rushing?\")\n" +
  "  3. STORY HOOK — micro-narrative opening (\"I pulled The Tower at 3am last Tuesday and honestly? It was the best thing that happened all week.\")\n" +
  "  4. PATTERN INTERRUPT — unexpected/contrarian angle (\"Unpopular opinion: you don't need to cleanse your crystals every full moon.\")\n" +
  "  5. PRACTICAL HOW-TO — immediate value (\"Three drops of rosemary oil, a black candle, and five minutes — that's all this protection spell needs.\")\n\n" +

  "LUNARY CONTEXT:\n" +
  "Sammii runs Lunary (lunary.app), a witchy astrology companion app. " +
  "Include ONE natural mention of Lunary per caption — e.g. referencing checking Lunary for today's moon phase, " +
  "using Lunary's daily guidance, or suggesting the reader try Lunary for personalised insights. " +
  "Make it feel like a genuine recommendation, not an ad. Weave it into the middle or end of the caption, never as the opening line.\n\n" +

  "FORMAT:\n" +
  "- 250 to 350 words (longer captions perform better on Instagram SEO).\n" +
  "- Use line breaks for readability — no giant walls of text.\n" +
  "- Include a call to action before the hashtags (save, share, comment, check Lunary, etc.).\n" +
  "- End with EXACTLY 3 hashtags.\n\n" +

  "HASHTAG RULES:\n" +
  "- ONLY 3 hashtags. Instagram's algorithm ranks posts with fewer, highly specific hashtags higher.\n" +
  "- All 3 must be specific to the actual content (e.g. #WaningGibbous not #MoonPhase, #TheHighPriestess not #TarotCards).\n" +
  "- NEVER use generic/broad hashtags: #WitchyVibes #MoonMagic #WitchesOfInstagram #Witchcraft " +
  "#TarotReading #SpiritualAwakening #MysticVibes #CosmicEnergy #WitchLife #Manifesting " +
  "#TarotCards #AstrologyTarot #CrystalHealing #SpiritualGrowth #TarotReader #MoonPhase\n" +
  "- Vary hashtags between posts — never reuse the same set.";

// Platform-specific adaptation prompts
const FACEBOOK_ADAPT_PROMPT =
  "Adapt this Instagram caption for Facebook. Rules:\n" +
  "- Remove ALL hashtags entirely.\n" +
  "- Keep the same voice and tone but make it slightly more conversational.\n" +
  "- Facebook favours questions and discussion starters — ensure the CTA encourages comments.\n" +
  "- Keep the Lunary mention.\n" +
  "- Keep roughly the same length (Facebook rewards longer posts too).\n" +
  "- Return ONLY the adapted caption, nothing else.";

const THREADS_ADAPT_PROMPT =
  "Adapt this Instagram caption for Threads. Rules:\n" +
  "- MAXIMUM 150 characters. Shorter = better. The best Threads posts are 1-2 sentences.\n" +
  "- Remove ALL hashtags.\n" +
  "- Remove the Lunary mention.\n" +
  "- Take the single most interesting or provocative take from the caption.\n" +
  "- Make it feel like a hot take, opinion, or relatable thought — not an info post.\n" +
  "- Threads rewards personality and boldness. Be spicy.\n" +
  "- End with something that makes people want to reply (a question, a challenge, or a controversial statement).\n" +
  "- Return ONLY the adapted caption, nothing else.";

const STORY_TEXT_SYSTEM_PROMPT =
  "You are Sammii Spellbound, creating text for Instagram story slides. " +
  "Your tone is warm, witchy, and conversational — like a friend who knows magic. " +
  "Keep text SHORT — stories are read in seconds.\n\n" +
  "Return ONLY a JSON object with this shape:\n" +
  '{ "heading": "Short catchy title", "body": ["Line 1", "Line 2", ...], "footer": "CTA text" }\n\n' +
  "Rules:\n" +
  "- heading: max 5 words, catchy and on-theme\n" +
  "- body: 2-4 short lines (max 60 chars each)\n" +
  "- footer: the exact CTA phrase provided\n" +
  "- NO markdown, NO backticks, ONLY the JSON object";

// ---------------------------------------------------------------------------
// Opening style rotation
// ---------------------------------------------------------------------------

const OPENING_STYLES = [
  "bold_claim",
  "direct_question",
  "story_hook",
  "pattern_interrupt",
  "practical_howto",
] as const;

type OpeningStyle = (typeof OPENING_STYLES)[number];

const OPENING_STYLE_INSTRUCTIONS: Record<OpeningStyle, string> = {
  bold_claim:
    "Open with a bold, surprising statement that challenges common belief. " +
    "Example: \"Most people get moon water completely wrong.\"",
  direct_question:
    "Open with a direct question that makes the reader pause and reflect. " +
    "Example: \"When was the last time you actually sat with your tarot cards without rushing?\"",
  story_hook:
    "Open with a tiny personal story or anecdote — one or two sentences max. " +
    "Example: \"I pulled The Tower at 3am last Tuesday and honestly? It was the best thing that happened all week.\"",
  pattern_interrupt:
    "Open with something unexpected or contrarian — an unpopular opinion or surprising angle. " +
    "Example: \"Unpopular opinion: you don't need to cleanse your crystals every full moon.\"",
  practical_howto:
    "Open with immediate, practical value — a recipe, a step count, or a quick how-to. " +
    "Example: \"Three drops of rosemary oil, a black candle, and five minutes — that's all this protection spell needs.\"",
};

// ---------------------------------------------------------------------------
// Lunary mentions
// ---------------------------------------------------------------------------

type ContentTopic = "moon" | "tarot" | "crystal" | "zodiac" | "spell" | "angel_number" | "chakra" | "rune" | "general";

const LUNARY_MENTIONS: Record<ContentTopic, string[]> = {
  moon: [
    "I always check Lunary before planning my moon rituals — it tracks the exact phase and sign so I don't have to guess.",
    "If you want to know how tonight's moon affects YOUR sign specifically, Lunary (lunary.app) breaks it down beautifully.",
    "I built the moon tracking in Lunary specifically for nights like this — open it up and see what the current phase means for you.",
  ],
  tarot: [
    "If you're not sure which spread to use, Lunary has a daily card pull feature that takes the guesswork out of it.",
    "I log all my readings in Lunary so I can spot patterns over time — it's a game changer for tarot journaling.",
    "Lunary's daily guidance pairs perfectly with your morning card pull — try them together for a week and see what shifts.",
  ],
  crystal: [
    "Lunary actually tells you which crystals work best with the current moon phase — check it before your next grid.",
    "I cross-reference my crystal work with Lunary's lunar calendar — certain stones hit different depending on the phase.",
    "If you want to know which crystals to charge tonight, Lunary (lunary.app) has your personalised lunar schedule.",
  ],
  zodiac: [
    "Lunary goes deeper than your sun sign — it maps transits to your birth chart so you know what's actually happening for YOU.",
    "I designed Lunary to cut through generic horoscopes — it gives you personalised insights based on real-time transits.",
    "Want to know how this season actually affects your chart? Lunary (lunary.app) makes it ridiculously easy to check.",
  ],
  spell: [
    "I time all my spellwork using Lunary's lunar calendar — the right moon phase makes such a difference to your intention setting.",
    "Before you cast, check Lunary for today's planetary hours — timing your spells properly is half the work.",
    "Lunary has a built-in ritual planner that aligns your spellwork with the current astro energy — worth a look.",
  ],
  angel_number: [
    "I've been logging my angel number sightings in Lunary's journal — the patterns that emerge are wild.",
    "If you keep seeing repeating numbers, Lunary (lunary.app) can help you track and decode them over time.",
    "Lunary connects your angel number messages to the current astrological weather — it adds a whole new layer of meaning.",
  ],
  chakra: [
    "Lunary maps chakra work to the current lunar phase — root chakra work hits different during a new moon.",
    "I use Lunary to plan my energy work around the moon cycle — it tells you which chakras are most receptive right now.",
    "If you want to align your chakra practice with the cosmos, Lunary (lunary.app) makes it intuitive.",
  ],
  rune: [
    "I've started logging my daily rune pulls in Lunary alongside my tarot — the cross-references are fascinating.",
    "Lunary's journal feature is perfect for tracking your rune work and spotting recurring themes.",
    "If you're building a rune practice, Lunary (lunary.app) helps you connect the dots between your pulls and the current astro weather.",
  ],
  general: [
    "Lunary (lunary.app) is my go-to for keeping all of this organised — moon phases, daily guidance, and ritual planning in one place.",
    "If you want a witchy companion app that actually gets it, Lunary is what I built for exactly that reason.",
    "I pour everything I know into Lunary — check it out at lunary.app for daily personalised guidance.",
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getOpeningStyle(dayIndex: number, postIndex: number): OpeningStyle {
  const idx = (dayIndex * 7 + postIndex) % OPENING_STYLES.length;
  return OPENING_STYLES[idx];
}

export function getLunaryHint(contentTopic: ContentTopic, seed: number): string {
  const options = LUNARY_MENTIONS[contentTopic];
  return options[Math.abs(seed) % options.length];
}

export function inferContentTopic(sceneKey: string, contentType?: string): ContentTopic {
  const key = (contentType ?? sceneKey).toLowerCase();
  if (key.includes("moon") || key.includes("lunar") || key.includes("full_moon") || key.includes("new_moon") || key.includes("waning") || key.includes("waxing")) return "moon";
  if (key.includes("tarot") || key.includes("card_pull") || key.includes("pendulum") || key.includes("oracle")) return "tarot";
  if (key.includes("crystal") || key.includes("amethyst") || key.includes("rose_quartz") || key.includes("obsidian")) return "crystal";
  if (key.includes("zodiac") || key.includes("pisces") || key.includes("aries") || key.includes("season")) return "zodiac";
  if (key.includes("spell") || key.includes("candle") || key.includes("ritual") || key.includes("protection") || key.includes("kitchen_witch")) return "spell";
  if (key.includes("angel") || key.includes("number")) return "angel_number";
  if (key.includes("chakra")) return "chakra";
  if (key.includes("rune")) return "rune";
  return "general";
}

// ---------------------------------------------------------------------------
// Caption generation
// ---------------------------------------------------------------------------

export async function generateCaption(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext,
  dayIndex = 0,
  postIndex = 0,
): Promise<string | null> {
  const openingStyle = getOpeningStyle(dayIndex, postIndex);
  const topic = inferContentTopic(sceneKey);
  const lunaryHint = getLunaryHint(topic, dayIndex * 100 + postIndex);

  // Build rich astro context lines
  let moonLine = `Moon: ${astro.moon.emoji} ${astro.moon.name} (${astro.moon.illumination}% illumination)`;
  if (astro.moon.fullMoonName) {
    moonLine = `Moon: ${astro.moon.emoji} Tonight is the ${astro.moon.fullMoonName} (Full Moon, ${astro.moon.illumination}% illumination)`;
  }
  if (astro.moon.isSupermoon) {
    moonLine += `\nThis is a Supermoon — the moon is at its closest to Earth`;
  }

  let extraContext = "";
  if (astro.eclipse) {
    extraContext += `Eclipse: ${astro.eclipse.type} in ${astro.eclipse.sign} on ${astro.eclipse.date} — ${astro.eclipse.theme}\n`;
  }
  if (astro.mercuryRetrograde?.active) {
    extraContext += `Mercury is currently retrograde (${astro.mercuryRetrograde.signFrom} → ${astro.mercuryRetrograde.signTo})\n`;
  } else if (astro.mercuryRetrograde) {
    extraContext += `Mercury retrograde approaching ${astro.mercuryRetrograde.start} (${astro.mercuryRetrograde.signFrom} → ${astro.mercuryRetrograde.signTo})\n`;
  }

  const userMsg =
    `Write an Instagram caption for this post:\n` +
    `Scene: ${scene.label} (${sceneKey})\n` +
    `Day: ${astro.dayName}\n` +
    `${moonLine}\n` +
    `Zodiac season: ${astro.zodiac.symbol} ${astro.zodiac.sign}\n` +
    (astro.sabbat
      ? `Sabbat nearby: ${astro.sabbat.name} — ${astro.sabbat.theme}\n`
      : "") +
    extraContext +
    `\nOPENING STYLE FOR THIS POST: ${OPENING_STYLE_INSTRUCTIONS[openingStyle]}\n` +
    `\nLUNARY MENTION TO WEAVE IN: "${lunaryHint}"\n` +
    `\nWrite an engaging caption that weaves in the astro context naturally. ` +
    `Include SEO keywords related to ${topic.replace(/_/g, " ")} and ${scene.label.toLowerCase()}.`;

  const result = await llmChat(
    [
      { role: "system", content: CAPTION_SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
    { max_tokens: 700, temperature: 0.85 },
  );

  return result;
}

export async function generateCarouselCaption(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext,
  contentType: string,
  dataRef: string,
  dayIndex = 0,
  postIndex = 0,
): Promise<string | null> {
  const openingStyle = getOpeningStyle(dayIndex, postIndex);
  const topic = inferContentTopic(sceneKey, contentType);
  const lunaryHint = getLunaryHint(topic, dayIndex * 100 + postIndex);
  const specificTopic = dataRef.replace(/_/g, " ");

  // Build rich astro context lines
  let carouselMoonLine = `Moon: ${astro.moon.emoji} ${astro.moon.name} (${astro.moon.illumination}% illumination)`;
  if (astro.moon.fullMoonName) {
    carouselMoonLine = `Moon: ${astro.moon.emoji} Tonight is the ${astro.moon.fullMoonName} (Full Moon, ${astro.moon.illumination}% illumination)`;
  }
  if (astro.moon.isSupermoon) {
    carouselMoonLine += `\nThis is a Supermoon — the moon is at its closest to Earth`;
  }

  let carouselExtraContext = "";
  if (astro.eclipse) {
    carouselExtraContext += `Eclipse: ${astro.eclipse.type} in ${astro.eclipse.sign} on ${astro.eclipse.date} — ${astro.eclipse.theme}\n`;
  }
  if (astro.mercuryRetrograde?.active) {
    carouselExtraContext += `Mercury is currently retrograde (${astro.mercuryRetrograde.signFrom} → ${astro.mercuryRetrograde.signTo})\n`;
  } else if (astro.mercuryRetrograde) {
    carouselExtraContext += `Mercury retrograde approaching ${astro.mercuryRetrograde.start} (${astro.mercuryRetrograde.signFrom} → ${astro.mercuryRetrograde.signTo})\n`;
  }

  const userMsg =
    `Write an Instagram caption for a CAROUSEL post (multiple slides):\n` +
    `Content type: ${contentType.replace(/_/g, " ")}\n` +
    `Specific topic: ${specificTopic}\n` +
    `Scene: ${scene.label} (${sceneKey})\n` +
    `Day: ${astro.dayName}\n` +
    `${carouselMoonLine}\n` +
    `Zodiac season: ${astro.zodiac.symbol} ${astro.zodiac.sign}\n` +
    (astro.sabbat
      ? `Sabbat nearby: ${astro.sabbat.name} — ${astro.sabbat.theme}\n`
      : "") +
    carouselExtraContext +
    `\nOPENING STYLE FOR THIS POST: ${OPENING_STYLE_INSTRUCTIONS[openingStyle]}\n` +
    `\nLUNARY MENTION TO WEAVE IN: "${lunaryHint}"\n` +
    `\nYour caption should:\n` +
    `- Hook the reader with the specified opening style (NO greetings)\n` +
    `- Introduce the specific topic (${specificTopic}) with genuine insight\n` +
    `- Include a swipe CTA naturally in the MIDDLE of the caption (not as a formulaic last line)\n` +
    `- Weave in the Lunary mention naturally\n` +
    `- Include SEO keywords related to ${specificTopic}\n` +
    `- End with a save/share CTA and exactly 8 diverse hashtags`;

  const result = await llmChat(
    [
      { role: "system", content: CAPTION_SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
    { max_tokens: 700, temperature: 0.85 },
  );

  return result;
}

// ---------------------------------------------------------------------------
// Platform variants
// ---------------------------------------------------------------------------

export interface PlatformCaptions {
  instagram: string;
  facebook: string;
  threads: string;
}

/** Take an Instagram caption and generate Facebook + Threads variants */
export async function generatePlatformVariants(instagramCaption: string): Promise<PlatformCaptions> {
  const [facebook, threads] = await Promise.all([
    adaptCaption(instagramCaption, FACEBOOK_ADAPT_PROMPT),
    adaptCaption(instagramCaption, THREADS_ADAPT_PROMPT),
  ]);

  return {
    instagram: instagramCaption,
    facebook,
    threads: threads.length > 200 ? threads.slice(0, 197) + "..." : threads,
  };
}

async function adaptCaption(originalCaption: string, systemPrompt: string): Promise<string> {
  const result = await llmChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: originalCaption },
    ],
    { max_tokens: 500, temperature: 0.7 },
  );
  return result ?? originalCaption;
}

// ---------------------------------------------------------------------------
// Story text generation
// ---------------------------------------------------------------------------

export async function generateStoryText(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext,
  cta: string,
): Promise<{ heading: string; body: string[]; footer: string }> {
  const fallback = {
    heading: scene.label,
    body: [`${astro.moon.emoji} ${astro.moon.name}`, `${astro.zodiac.symbol} ${astro.zodiac.sign} season`],
    footer: cta,
  };

  let storyMoonLine = `Moon: ${astro.moon.emoji} ${astro.moon.name} (${astro.moon.illumination}%)`;
  if (astro.moon.fullMoonName) {
    storyMoonLine = `Moon: ${astro.moon.emoji} ${astro.moon.fullMoonName} (Full Moon, ${astro.moon.illumination}%)`;
  }

  let storyExtra = "";
  if (astro.eclipse) {
    storyExtra += `Eclipse: ${astro.eclipse.type} in ${astro.eclipse.sign}\n`;
  }
  if (astro.mercuryRetrograde?.active) {
    storyExtra += `Mercury retrograde in ${astro.mercuryRetrograde.signFrom}\n`;
  }

  const userMsg =
    `Create story text for: ${scene.label} (${sceneKey})\n` +
    `${storyMoonLine}\n` +
    `Zodiac: ${astro.zodiac.symbol} ${astro.zodiac.sign}\n` +
    `Day: ${astro.dayName}\n` +
    storyExtra +
    `CTA (use as footer exactly): "${cta}"\n` +
    `\nMake it engaging and on-theme. The text will be rendered as a 1080x1920 story image.`;

  try {
    const raw = await llmChat(
      [
        { role: "system", content: STORY_TEXT_SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { max_tokens: 300, temperature: 0.8 },
    );

    if (!raw) return fallback;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      heading: parsed.heading ?? fallback.heading,
      body: Array.isArray(parsed.body) ? parsed.body : fallback.body,
      footer: cta,
    };
  } catch {
    console.error(`  Story text generation failed, using fallback`);
    return fallback;
  }
}
