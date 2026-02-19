// Shared style instructions derived from the Sammii Spellbound character bible.
// These get appended to every prompt to enforce consistency.
const STYLE_BASE =
  "Preserve the exact line work, character design, face shape, and proportions. " +
  "Keep the sketchy-but-confident line quality — thick contour lines, thinner detail lines, flowing hair strokes. " +
  "Use soft black (#2D2A32) for the darkest linework, never pure black. " +
  "The crescent moon pendant necklace must be visible. " +
  "Her eyes must remain warm brown/amber (#8B6914) with detailed irises — never change her eye colour. " +
  "Maintain the semi-realistic stylised art style with large expressive detailed-iris eyes and slightly elongated elegant proportions. " +
  "Colouring should feel soft and painted — gentle bleeds and visible brushwork, not flat or cell-shaded. Use no more than 3–4 palette colours per piece. " +
  "Highlights should be left as negative space (warm cream showing through). " +
  "Do NOT make this photorealistic, flat vector, chibi, full anime, or dark gothic. " +
  "Do not change the character's face, pose, or outfit structure. " +
  "All hands must have exactly 5 fingers and all feet must have exactly 5 toes. Do not add extra digits.";

export const STYLES = {
  soft_watercolour: {
    label: "Soft Watercolour",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration. " +
      "Warm brunette hair with subtle honey highlights. Fair skin with warm undertones and soft shadows in lavender (#B8A9C9) tones — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in deep midnight plum (#4A3352) with dusty rose (#C4929E) accents. " +
      "Soft gold (#D4AF73) details on the collar and crescent moon pendant necklace. " +
      "Warm cream (#F5EDE3) background with a subtle lavender atmospheric glow. " +
      "The colouring should feel soft, warm, and hand-painted. " +
      STYLE_BASE,
  },
  celestial_glow: {
    label: "Celestial Glow",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a cosy magical aesthetic. " +
      "Warm brunette hair with subtle auburn tones. Fair skin with warm undertones and soft plum (#4A3352) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in deep indigo-blue with plum accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Warm cream (#F5EDE3) background with soft suggested elements — tiny faded gold star dots, a faint crescent moon — in the background. " +
      "Colouring should feel organic and soft, like a nature journal illustration. " +
      STYLE_BASE,
  },
  sage_earth: {
    label: "Sage & Earth",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a cosy herbal witch aesthetic. " +
      "Warm brunette hair with golden-brown tones. Fair warm-toned skin with soft shadows in sage green (#A8B5A0) and lavender undertones — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in muted sage green with cream and dusty rose (#C4929E) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Warm cream (#F5EDE3) background with soft botanical elements — faded leaves, herbs — suggested in the background. " +
      "Colouring should feel organic and soft, like a nature journal illustration. " +
      STYLE_BASE,
  },
  high_priestess: {
    label: "High Priestess",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a mysterious high priestess aesthetic. " +
      "Warm brunette hair with rich auburn tones. Fair skin with warm undertones and soft plum (#4A3352) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in midnight plum (#4A3352) with dusty rose (#C4929E) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Warm cream (#F5EDE3) background with a subtle lavender (#B8A9C9) atmospheric glow. " +
      "Colouring should feel mystical and soft, like a fairy tale book illustration. " +
      STYLE_BASE,
  },
  fire_sorceress: {
    label: "Fire Sorceress",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a warm fire and solar aesthetic. " +
      "Warm brunette hair with bright amber and copper highlights. Fair skin with warm golden undertones and soft burnt amber (#C87941) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in deep plum (#4A3352) with burnt amber (#C87941) and gold (#D4AF73) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Warm cream (#F5EDE3) background with a soft amber and gold atmospheric glow. " +
      "Colouring should feel warm and empowering, like a nature journal illustration. " +
      STYLE_BASE,
  },
  ocean_mystic: {
    label: "Ocean Mystic",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a cosy oceanic aesthetic. " +
      "Warm brunette hair with cool-toned highlights. Fair skin with cool undertones and soft lavender (#B8A9C9) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in deep teal (#2E6B6B) with lavender (#B8A9C9) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Warm cream (#F5EDE3) background with soft suggested elements — faded teal shells, pale blue water drops — in the background. " +
      "Colouring should feel organic and soft, like a nature journal illustration. " +
      STYLE_BASE,
  },
  shadow_ritual: {
    label: "Shadow Ritual",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a moody plum and rose aesthetic. " +
      "Warm brunette hair with deep auburn tones. Fair skin with warm undertones and soft plum (#4A3352) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in midnight plum (#4A3352) with dusty rose (#C4929E) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Warm cream (#F5EDE3) background with a soft plum and dusty rose (#C4929E) atmospheric glow. " +
      "Colouring should feel intimate and soft, like a fairy tale book illustration. " +
      STYLE_BASE,
  },

  // ── Sabbat colouring styles (Wheel of the Year) ────────────────────────
  yule: {
    label: "Yule",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a cosy winter solstice aesthetic. " +
      "Warm brunette hair with cool frost highlights. Fair skin with warm candlelight tones and deep evergreen shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in deep evergreen (#2D4A3E) with rich cranberry (#8B2252) and warm gold (#D4AF73) accents. " +
      "Soft gold crescent moon pendant necklace glowing with candlelight. " +
      "Background of warm cream with warm gold candlelight pooling around her, frost white accents at the edges, " +
      "subtle evergreen branches and holly berries suggested in the background. " +
      "The colouring should feel like a cosy Yule night — warm light against soft darkness, rich and intimate. " +
      STYLE_BASE,
  },
  imbolc: {
    label: "Imbolc",
    prompt:
      "Transform this pencil sketch into a gentle early spring illustration. " +
      "Warm brunette hair with soft golden highlights. Fair skin with gentle warm tones and pale lavender shadows. " +
      "The robe/dress in soft white and pale yellow (#F5E6B8) with gentle green (#C5D5B5) accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of soft white with pale yellow candlelight warmth, delicate green shoots, " +
      "snowdrop flowers suggested at the edges, and a gentle lavender (#B8A9C9) atmospheric glow. " +
      "The colouring should feel like the first light of spring — tender, hopeful, awakening. " +
      STYLE_BASE,
  },
  ostara: {
    label: "Ostara",
    prompt:
      "Transform this pencil sketch into a fresh spring equinox illustration. " +
      "Warm brunette hair with golden-honey highlights. Fair skin with warm spring light and soft pink shadows. " +
      "The robe/dress in fresh spring green (#7BA67B) with pastel pink (#E8C4C4) and pale blue accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of pale blue sky (#B5CCE0) with blooming flowers — cherry blossoms, daffodils — in pastel pinks and soft gold. " +
      "Painted eggs and new green growth suggested at the edges. " +
      "The colouring should feel like a bright spring morning — fresh, light, new beginnings. " +
      STYLE_BASE,
  },
  beltane: {
    label: "Beltane",
    prompt:
      "Transform this pencil sketch into a vibrant May Day illustration. " +
      "Warm brunette hair with rich warm highlights and tiny flowers woven in. Fair skin with warm golden-pink light and soft green shadows. " +
      "The robe/dress in vibrant green (#5A8A5A) with dusty rose (#C4929E) and warm gold (#D4AF73) ribbon accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of lush green with wildflower meadow energy — pinks, golds, and warm greens. " +
      "Subtle maypole ribbons in dusty rose and gold weaving through the background. " +
      "The colouring should feel like a warm May morning — abundant, sensual, full of life. " +
      STYLE_BASE,
  },
  litha: {
    label: "Litha",
    prompt:
      "Transform this pencil sketch into a radiant summer solstice illustration. " +
      "Warm brunette hair with bright golden-amber highlights as if sun-kissed. Fair skin with warm golden lighting and honey-toned shadows. " +
      "The robe/dress in bright warm gold (#D4AF73) with sunflower yellow (#E8C840) and lush green accents. " +
      "Soft gold crescent moon pendant necklace blazing with sunlight. " +
      "Background of warm amber and gold radiating like the sun, with lush green at the edges and soft honey tones throughout. " +
      "Peak sun energy — bright, abundant, powerful but soft and painterly. " +
      STYLE_BASE,
  },
  lammas: {
    label: "Lammas",
    prompt:
      "Transform this pencil sketch into a warm first harvest illustration. " +
      "Warm brunette hair with wheat-gold highlights. Fair skin with warm amber light and russet brown shadows. " +
      "The robe/dress in warm wheat gold (#C8A850) with amber (#C87941) and sage green (#A8B5A0) accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of warm wheat gold fields with amber and russet brown tones, " +
      "subtle suggestions of grain sheaves, bread, and harvest abundance. " +
      "The colouring should feel like a late summer harvest — warm, golden, grateful, grounded. " +
      STYLE_BASE,
  },
  mabon: {
    label: "Mabon",
    prompt:
      "Transform this pencil sketch into a rich autumn equinox illustration. " +
      "Warm brunette hair with deep auburn and copper tones. Fair skin with warm amber lighting and rich brown shadows. " +
      "The robe/dress in rich amber (#C87941) with burnt orange, deep red (#8B3A3A), and warm brown accents. " +
      "Soft gold crescent moon pendant necklace catching autumn light. " +
      "Background of falling leaves in amber, burnt orange, and deep red, with warm brown and gold tones. " +
      "Subtle suggestions of apple harvest, balance, and autumnal abundance. " +
      "The colouring should feel like a golden autumn afternoon — rich, warm, balanced. " +
      STYLE_BASE,
  },
  samhain: {
    label: "Samhain",
    prompt:
      "Transform this pencil sketch into a mysterious Samhain illustration. " +
      "Warm brunette hair with deep plum and shadow tones. Fair skin with candlelight warmth on one side and deep plum shadows on the other. " +
      "The robe/dress in deep plum (#4A3352) with charcoal, burnt orange (#C87941), and bone white (#F5EDE3) accents. " +
      "Soft gold crescent moon pendant necklace glowing in the darkness. " +
      "Background of deep plum and charcoal with burnt orange candlelight, bone white accents suggesting the thinning veil. " +
      "Ancestor energy — respectful, mysterious, sacred. Not cartoonish Halloween, not spooky or silly. " +
      "The colouring should feel like a late October night — deep, warm, liminal, sacred. " +
      STYLE_BASE,
  },

  // ── Zodiac colouring styles ───────────────────────────────────────────────
  zodiac_aries: {
    label: "Aries",
    prompt:
      "Transform this pencil sketch into a bold fiery illustration for Aries season. " +
      "Warm brunette hair with bright copper-red highlights like sparks. Fair skin with warm golden undertones and soft crimson shadows. " +
      "The robe/dress in bold crimson red (#B22234) with warm gold (#D4AF73) and burnt orange accents. " +
      "Soft gold crescent moon pendant necklace catching firelight. " +
      "Background of warm cream with bold washes of crimson and gold, subtle ram horn shapes suggested in faint gold linework. " +
      "The colouring should feel fierce and warm — like the first burst of spring fire, confident and alive. " +
      STYLE_BASE,
  },
  zodiac_taurus: {
    label: "Taurus",
    prompt:
      "Transform this pencil sketch into a lush earthy illustration for Taurus season. " +
      "Warm brunette hair with rich chestnut tones. Fair skin with warm golden-pink undertones and soft mossy green shadows. " +
      "The robe/dress in rich emerald green (#3A6B4A) with dusty rose (#C4929E) and warm brown accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of warm cream with lush green and rose washes, subtle suggestions of blooming roses and soft earth tones at the edges. " +
      "The colouring should feel grounded and sensual — like a warm garden in full bloom, rich and abundant. " +
      STYLE_BASE,
  },
  zodiac_gemini: {
    label: "Gemini",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a light airy Gemini aesthetic. " +
      "Warm brunette hair with soft golden highlights. Fair skin with warm undertones and soft lavender (#B8A9C9) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in soft lavender (#9B8EC4) with pale yellow (#F5E6B8) and warm gold (#D4AF73) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Background of warm cream with washes of lavender and pale yellow, subtle mirrored butterfly or twin motifs suggested in faint gold linework. " +
      "The colouring should feel light and curious — like a breezy spring day, playful and quick. " +
      STYLE_BASE,
  },
  zodiac_cancer: {
    label: "Cancer",
    prompt:
      "Transform this pencil sketch into a soft silvery illustration for Cancer season. " +
      "Warm brunette hair with cool silver-brown highlights. Fair skin with soft pearlescent undertones and gentle grey-lavender shadows. " +
      "The robe/dress in soft silver-grey (#A8B0B8) with pearl white and pale blue (#B5CCE0) accents. " +
      "Soft gold crescent moon pendant necklace with silver highlights. " +
      "Background of warm cream with silvery-blue and pearl washes, a subtle crescent moon suggested in pale gold, gentle wave forms at the edges. " +
      "The colouring should feel nurturing and moonlit — like a calm tide under soft moonlight, protective and tender. " +
      STYLE_BASE,
  },
  zodiac_leo: {
    label: "Leo",
    prompt:
      "Transform this pencil sketch into a radiant golden illustration for Leo season. " +
      "Warm brunette hair with bright golden-amber highlights like a lion's mane. Fair skin with warm golden lighting and honey-toned shadows. " +
      "The robe/dress in rich warm gold (#D4AF73) with deep amber (#C87941) and sunflower yellow (#E8C840) accents. " +
      "Soft gold crescent moon pendant necklace blazing bright. " +
      "Background of warm cream with bold gold and amber washes radiating outward like sunlight, subtle lion silhouette suggested in faint gold. " +
      "The colouring should feel regal and warm — like standing in a golden spotlight, confident and generous. " +
      STYLE_BASE,
  },
  zodiac_virgo: {
    label: "Virgo",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a clean earthy Virgo aesthetic. " +
      "Warm brunette hair with cool brown and subtle wheat highlights. Fair skin with clean warm undertones and soft sage (#A8B5A0) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in muted sage green (#A8B5A0) with cream (#F5EDE3) and warm wheat (#C8A850) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Background of warm cream with sage green botanical washes, subtle grain sheaves and herb sprigs suggested at the edges in soft green and wheat-gold. " +
      "The colouring should feel precise and natural — like a pressed flower page in a nature journal, clean and grounded. " +
      STYLE_BASE,
  },
  zodiac_libra: {
    label: "Libra",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with an elegant Libra aesthetic. " +
      "Warm brunette hair with soft rose-gold highlights. Fair skin with warm pink undertones and soft dusty rose (#C4929E) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in dusty rose (#C4929E) with soft blue (#B5CCE0) and warm gold (#D4AF73) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Background of warm cream with symmetrical washes of dusty rose and soft blue, subtle golden scales motifs suggested in faint gold linework. " +
      "The colouring should feel harmonious and elegant — like a perfectly balanced composition, graceful and fair. " +
      STYLE_BASE,
  },
  zodiac_scorpio: {
    label: "Scorpio",
    prompt:
      "Transform this pencil sketch into an intense mysterious illustration for Scorpio season. " +
      "Warm brunette hair with deep burgundy and black-cherry tones. Fair skin with warm undertones and deep plum (#4A3352) shadows with intensity. " +
      "The robe/dress in deep black-cherry (#5A1A2A) with rich plum (#4A3352) and dark gold (#B8962E) accents. " +
      "Soft gold crescent moon pendant necklace glowing against the darkness. " +
      "Background of warm cream deepening to rich plum and black-cherry at the edges, subtle scorpion tail curve suggested in dark gold. " +
      "The colouring should feel magnetic and deep — like looking into still dark water, powerful and transformative. " +
      STYLE_BASE,
  },
  zodiac_sagittarius: {
    label: "Sagittarius",
    prompt:
      "Transform this pencil sketch into a warm adventurous illustration for Sagittarius season. " +
      "Warm brunette hair with bright auburn and copper highlights. Fair skin with warm golden undertones and soft purple (#7B6B8A) shadows. " +
      "The robe/dress in rich purple (#6B4E8A) with warm amber (#C87941) and bright gold (#D4AF73) accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of warm cream with bold purple and amber washes, subtle arrow and constellation motifs suggested in gold. " +
      "The colouring should feel expansive and warm — like a late autumn bonfire under a starry sky, free and optimistic. " +
      STYLE_BASE,
  },
  zodiac_capricorn: {
    label: "Capricorn",
    prompt:
      "Transform this pencil sketch into a grounded winter illustration for Capricorn season. " +
      "Warm brunette hair with cool dark-brown tones. Fair skin with cool undertones and soft charcoal (#4A4A50) shadows. " +
      "The robe/dress in deep charcoal (#4A4A50) with forest green (#2D4A3E) and warm gold (#D4AF73) accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of warm cream with charcoal and forest green washes, subtle mountain peak shapes suggested at the edges in soft grey. " +
      "The colouring should feel solid and elegant — like a snow-dusted mountain at dusk, ambitious and enduring. " +
      STYLE_BASE,
  },
  zodiac_aquarius: {
    label: "Aquarius",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a cool visionary Aquarius aesthetic. " +
      "Warm brunette hair with subtle cool-toned highlights. Fair skin with cool undertones and soft blue-violet (#6A7FB5) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in muted blue-violet (#6A7FB5) with soft lavender (#B8A9C9) and warm gold (#D4AF73) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Background of warm cream with washes of blue-violet and lavender, subtle wave and lightning motifs suggested in soft silver linework. " +
      "The colouring should feel innovative and cool — like crisp winter air, progressive and visionary but soft and painterly. " +
      STYLE_BASE,
  },
  zodiac_pisces: {
    label: "Pisces",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a dreamy oceanic Pisces aesthetic. " +
      "Warm brunette hair with soft sea-green highlights. Fair skin with cool pearlescent undertones and soft teal (#5A8A8A) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in soft sea-green (#5A8A8A) with lavender (#B8A9C9) and warm gold (#D4AF73) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Background of warm cream with dreamy washes of sea-green, lavender, and pale blue, subtle fish and flowing water motifs suggested in faint gold linework. " +
      "The colouring should feel dreamy and intuitive — like gazing into tide pools at twilight, gentle and mystical. " +
      STYLE_BASE,
  },

  // ── Moon phase colouring styles ───────────────────────────────────────────
  moon_new: {
    label: "New Moon",
    prompt:
      "Transform this pencil sketch into a dark intimate illustration for the new moon. " +
      "Warm brunette hair with deep shadow tones, almost blending into the background. Fair skin with warm candlelight on one side and deep indigo shadows on the other. " +
      "The robe/dress in deep indigo (#1A1A3A) with charcoal and faint gold (#D4AF73) thread accents. " +
      "Soft gold crescent moon pendant necklace glowing as the brightest point. " +
      "Background of deep indigo fading to near-black, with the faintest suggestion of a dark circle moon — tiny gold sparks like seeds in the darkness. " +
      "The colouring should feel like the moment before dawn — still, potent, full of unseen possibility. " +
      STYLE_BASE,
  },
  moon_waxing_crescent: {
    label: "Waxing Crescent",
    prompt:
      "Transform this pencil sketch into a hopeful night illustration for the waxing crescent moon. " +
      "Warm brunette hair with silver-gold highlights catching the first moonlight. Fair skin with warm undertones and soft indigo shadows. " +
      "The robe/dress in dark indigo (#2A2A4A) with silver-grey and pale gold accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of deep indigo lightening at one edge, a thin waxing crescent in pale gold, tiny dots of silver-gold light appearing. " +
      "The colouring should feel like the first sliver of hope — tender new light emerging from darkness, setting intentions. " +
      STYLE_BASE,
  },
  moon_first_quarter: {
    label: "First Quarter",
    prompt:
      "Transform this pencil sketch into a beautifully coloured illustration with a determined half-moon aesthetic. " +
      "Warm brunette hair with warm highlights, one side catching light. Fair skin with warm undertones and soft indigo (#3A3A6B) shadows — face and skin clean and smooth with no stray lines or marks. " +
      "The robe/dress in deep blue-violet (#3A3A6B) with warm gold (#D4AF73) accents. " +
      "Soft gold (#D4AF73) crescent moon pendant necklace. " +
      "Background subtly transitioning from warm gold on one side to cool indigo on the other, a half-moon shape suggested in pale gold. " +
      "The colouring should feel like a crossroads — light and dark in balance, decisive and building momentum. " +
      STYLE_BASE,
  },
  moon_waxing_gibbous: {
    label: "Waxing Gibbous",
    prompt:
      "Transform this pencil sketch into a luminous building illustration for the waxing gibbous moon. " +
      "Warm brunette hair with bright silver-gold highlights, almost glowing. Fair skin with warm silver-gold lighting and soft lavender shadows. " +
      "The robe/dress in soft indigo (#4A4A7B) with bright silver and warm gold (#D4AF73) accents. " +
      "Soft gold crescent moon pendant necklace catching strong moonlight. " +
      "Background of soft indigo filled with silver-gold light, a nearly-full moon shape glowing in the upper area, building energy. " +
      "The colouring should feel like anticipation — almost full, almost there, luminous and refining. " +
      STYLE_BASE,
  },
  moon_full: {
    label: "Full Moon",
    prompt:
      "Transform this pencil sketch into a radiant silvery illustration for the full moon. " +
      "Warm brunette hair with bright silver highlights as if bathed in moonlight. Fair skin glowing with silver-gold light and the softest lavender shadows. " +
      "The robe/dress in silver-white (#C8C8D8) with pale gold (#D4AF73) and soft lavender (#B8A9C9) accents. " +
      "Soft gold crescent moon pendant necklace blazing with reflected moonlight. " +
      "Background of soft silver-blue light radiating outward, a large luminous full moon glow, everything bathed in silver and cream. " +
      "The colouring should feel like standing in full moonlight — illuminated, powerful, everything revealed. " +
      STYLE_BASE,
  },
  moon_waning_gibbous: {
    label: "Waning Gibbous",
    prompt:
      "Transform this pencil sketch into a grateful softening illustration for the waning gibbous moon. " +
      "Warm brunette hair with fading silver highlights giving way to warmer brown. Fair skin with warm undertones and soft plum (#4A3352) shadows deepening. " +
      "The robe/dress in soft plum (#5A4A6B) with fading silver and warm gold (#D4AF73) accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background of soft plum and silver, a slightly diminished moon glow — still bright but beginning to soften at one edge. " +
      "The colouring should feel like gratitude — sharing the light, generous and softly releasing. " +
      STYLE_BASE,
  },
  moon_last_quarter: {
    label: "Last Quarter",
    prompt:
      "Transform this pencil sketch into a reflective balanced illustration for the last quarter moon. " +
      "Warm brunette hair with muted highlights, contemplative tones. Fair skin with cool undertones and soft grey-lavender shadows. " +
      "The robe/dress in muted grey-blue (#5A6A7A) with dusty rose (#C4929E) and faint gold accents. " +
      "Soft gold crescent moon pendant necklace. " +
      "Background split between fading light and deepening shadow, a half-moon shape — the other half from first quarter — in pale gold. " +
      "The colouring should feel like reflection — looking back, releasing what no longer serves, quiet and clear-eyed. " +
      STYLE_BASE,
  },
  moon_waning_crescent: {
    label: "Waning Crescent",
    prompt:
      "Transform this pencil sketch into a restful fading illustration for the waning crescent moon. " +
      "Warm brunette hair with deep soft tones, settling into quiet. Fair skin with soft warm undertones fading into gentle shadow. " +
      "The robe/dress in deep muted indigo (#3A3A5A) with soft plum and the faintest gold thread. " +
      "Soft gold crescent moon pendant necklace — the last light. " +
      "Background of deep soft indigo with just a thin waning crescent sliver in pale gold, quiet and sparse — space for rest. " +
      "The colouring should feel like the last exhale before sleep — surrendering, resting, preparing for renewal. " +
      STYLE_BASE,
  },
} as const;

export type StyleKey = keyof typeof STYLES;
