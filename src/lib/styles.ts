// Shared style instructions derived from the Sammii Spellbound character bible.
// These get appended to every prompt to enforce consistency.
const STYLE_BASE =
  "Preserve the exact line work, character design, face shape, and proportions. " +
  "Keep the sketchy-but-confident line quality — thick contour lines, thinner detail lines, flowing hair strokes. " +
  "Use soft black (#2D2A32) for the darkest linework, never pure black. " +
  "The crescent moon pendant necklace must be visible. " +
  "Maintain the semi-realistic stylised art style with large expressive detailed-iris eyes and slightly elongated elegant proportions. " +
  "Colouring should feel like soft watercolour — gentle bleeds, not flat or cell-shaded. Use no more than 3–4 palette colours per piece. " +
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
      "Transform this pencil sketch into a cosy winter solstice illustration. " +
      "Warm brunette hair with cool frost highlights. Fair skin with warm candlelight tones and deep evergreen shadows. " +
      "The robe/dress in deep evergreen (#2D4A3E) with rich cranberry (#8B2252) and warm gold (#D4AF73) accents. " +
      "Soft gold crescent moon pendant necklace glowing with candlelight. " +
      "Background of deep winter darkness with warm gold candlelight pooling around her, frost white accents at the edges, " +
      "subtle evergreen branches and holly berries suggested in the background. " +
      "The colouring should feel like a cosy Yule night — warm light against winter darkness, rich and intimate. " +
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
} as const;

export type StyleKey = keyof typeof STYLES;
