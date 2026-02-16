// Scene Edit prompts for generating content from a coloured Sammii base image.
// These are "Path 1" Kontext prompts — they edit an existing illustration into new scenes.

const SCENE_BASE =
  "This is extremely important: do not alter the character's facial features, eye style, or proportions in any way. " +
  "Keep her face and art style exactly the same. Maintain a hand-drawn illustration style with visible ink outlines and sketchy linework throughout. " +
  "Use flat colour fills with soft watercolour washes and sketchy edges — not airbrushed, rendered, or 3D. " +
  "Visible pencil or ink linework must show through over the colour, like a graphic novel or hand-painted comic. " +
  "Her gold crescent moon pendant necklace must always be clearly visible at her neckline — never remove or obscure it. " +
  "Her hair must always be long — never cut short. Follow the hairstyle description exactly — it is a key part of this scene. " +
  "All clothing must look like fitted, draped medieval-fantasy fabric inspired by Margaery Tyrell from Game of Thrones — body-skimming silhouettes with open necklines. Sleeves must either be absent (sleeveless), fitted to the arm, or open bell sleeves that hang straight down — never puffy, never billowing, never gathered at the wrist. Never structured, never modern, never a blazer or suit jacket. " +
  "Any stars in the scene must be rendered as tiny glowing dots of light — never five-pointed star shapes. " +
  "All hands must have exactly 5 fingers and all feet must have exactly 5 toes. Do not add extra digits.";

// ---------------------------------------------------------------------------
// Building blocks — hairstyles, outfits & palettes
// ---------------------------------------------------------------------------

export const HAIRSTYLES = {
  loose_waves:
    "Important — change her hairstyle: her hair falls in long loose waves past her shoulders, not straight, with visible wavy texture. ",
  half_up_braids:
    "Important — change her hairstyle: her hair is half-up with two small braids pulling back the front sections, the rest flowing loose and long behind her. ",
  low_bun_tendrils:
    "Important — change her hairstyle: her hair is gathered in a low loose bun at the nape of her neck, with soft face-framing tendrils falling free. ",
  side_swept:
    "Important — change her hairstyle: her hair is swept entirely over one shoulder in a long flowing cascade, the other side tucked behind her ear. ",
  crown_braid:
    "Important — change her hairstyle: her hair is styled in a loose crown braid wrapping around her head, with wisps falling free around her face. ",
  wild_curls:
    "Important — change her hairstyle: her hair falls in long wild voluminous curls, big and untamed, with lots of volume and movement. ",
  fishtail_braid:
    "Important — change her hairstyle: her hair is in a long loose fishtail braid draped over one shoulder, with face-framing pieces pulled free. ",
  sleek_straight:
    "Important — change her hairstyle: her hair falls long and sleek and straight, parted in the centre, like a smooth curtain framing her face. ",
} as const;

export const OUTFITS = {
  midnight_robe:
    "Her outfit is a fitted sleeveless gown in deep midnight plum with gold vine embroidery along the edges, a plunging draped neckline showing her necklace. The fabric skims her body. ",
  sage_wrap:
    "Her outfit is a wrapped fitted gown in muted sage green with cream trim, the fabric crossing at the bodice with a low open neckline showing her necklace. Open bell sleeves that hang straight down. ",
  dusty_rose_robe:
    "Her outfit is a fitted gown in dusty rose with plum accents, sleeveless with thin draped straps over the shoulders, the neckline low and open showing her necklace. ",
  indigo_cloak:
    "She wears a deep indigo hooded cloak with gold celestial embroidery over a fitted sleeveless gown, hood down, the neckline wide and open showing her necklace. ",
  cream_linen:
    "She wears a cream linen gown that fits close to the body with a draped cowl neckline, sleeveless, the fabric falling straight and clean, her necklace clearly visible. ",
  lavender_robe:
    "She wears a fitted lavender gown with gold trim at the low open neckline, the fabric body-skimming with long fitted sleeves, her necklace clearly visible. ",
  amber_tunic:
    "Her outfit is a fitted amber-gold gown with a wrapped bodice and gold leaf embroidery, sleeveless with a deep open neckline showing her necklace. ",
  forest_velvet:
    "Her outfit is a deep forest green velvet gown, fitted through the body with open bell sleeves that hang straight from the elbow, gold leaf embroidery along the hem, open neckline showing her necklace. ",
  moonlit_silver:
    "Her outfit is a silver-grey fitted gown with an off-the-shoulder neckline and bare arms, the fabric draping close to her body, her necklace clearly visible. ",
  autumn_wine:
    "Her outfit is a rich wine-red fitted wrap gown with gold filigree at the edges, the fabric crossing at the bodice with a low open neckline, sleeveless, her necklace clearly visible. ",
  ocean_teal:
    "Her outfit is a teal and sea-green fitted gown with a draped crossover bodice, sleeveless, the neckline low and open showing her necklace. ",
  dusty_rose_wrap:
    "Her outfit is a wrapped dusty rose gown fitted to her body, the fabric crossing at the chest with open bell sleeves hanging straight from the shoulder, open neckline showing her necklace. ",
} as const;

export const PALETTES = {
  celestial:
    "Background is deep indigo with tiny glowing dots of gold light, warm gold and cream highlights, and plum shadows. ",
  earthy:
    "Background is warm cream with sage botanical suggestions, muted green and lavender shadows. ",
  mystic:
    "Background is deep plum fading to dark, candlelight gold tones, rich plum shadows. ",
  oceanic:
    "Background is soft blue and lavender, cool-toned highlights, deep teal shadows. ",
  solar:
    "Background is warm amber and gold, golden-orange highlights, burnt amber shadows. ",
  cream:
    "Background is warm cream with lavender and dusty rose washes at edges, warm highlights. ",
  indigo:
    "Background is dark indigo with lavender wash at edges, warm cream and gold highlights. ",
} as const;

// ---------------------------------------------------------------------------
// Scene interface & prompt builder
// ---------------------------------------------------------------------------

export interface Scene {
  label: string;
  day: string;
  outfit: keyof typeof OUTFITS;
  hairstyle: keyof typeof HAIRSTYLES;
  palette: keyof typeof PALETTES;
  prompt: string; // composition/pose ONLY — outfit, hairstyle & palette are composed in
}

export function buildScenePrompt(scene: Scene): string {
  return (
    scene.prompt +
    HAIRSTYLES[scene.hairstyle] +
    OUTFITS[scene.outfit] +
    PALETTES[scene.palette] +
    SCENE_BASE
  );
}

// ---------------------------------------------------------------------------
// Tarot card frame prefix — shared by all 22 Major Arcana
// ---------------------------------------------------------------------------

const TAROT_FRAME =
  "Transform this illustration into a tarot card composition. " +
  "Keep the composition flat and illustrative like a hand-drawn tarot card, not a realistic oil painting. " +
  "Frame the entire image with an ornate gold border like a tarot card. ";

function tarotPrompt(numeral: string, name: string, pose: string): string {
  return (
    TAROT_FRAME +
    pose +
    `Add elegant serif text at the bottom reading "${numeral} — ${name}". `
  );
}

// ---------------------------------------------------------------------------
// All scenes
// ---------------------------------------------------------------------------

export const SCENES: Record<string, Scene> = {
  // ── Monday — Moon content ──────────────────────────────────────────────
  eclipse_ritual: {
    label: "Eclipse Night",
    day: "Moon Monday",
    outfit: "midnight_robe",
    hairstyle: "crown_braid",
    palette: "celestial",
    prompt:
      "Transform this illustration into a dramatic new moon eclipse scene. " +
      "Change the background to a deep indigo night sky with a black circle solar eclipse overhead, surrounded by a ring of soft gold corona light. " +
      "Add tiny glowing dots of gold light scattered across the sky. The character should be looking upward with a serene, knowing expression. " +
      "Add a subtle gold glow around her crescent moon necklace. " +
      "Keep the lighting simple and graphic — use flat shadow shapes rather than smooth gradients. " +
      "Warm cream and gold highlights on her skin, applied as visible brushstrokes not blended rendering. ",
  },
  new_moon_ritual: {
    label: "New Moon Ritual",
    day: "Moon Monday",
    outfit: "midnight_robe",
    hairstyle: "loose_waves",
    palette: "mystic",
    prompt:
      "Transform this illustration so the character is sitting cross-legged on the floor, seen from a slight angle, with a small ritual setup in front of her: " +
      "a black candle, a small journal/grimoire, and a pen. She's looking down at the journal with a focused, peaceful expression. " +
      "Soft candlelight illuminates her face and hands with warm gold tones, casting gentle plum shadows around her. " +
      "A thin crescent moon shape (dark/new moon) appears subtly in the upper corner in soft gold. ",
  },
  full_moon: {
    label: "Full Moon",
    day: "Moon Monday",
    outfit: "cream_linen",
    hairstyle: "wild_curls",
    palette: "celestial",
    prompt:
      "Transform this illustration into a full moon scene. " +
      "She stands outdoors with arms slightly raised, palms open, bathed in silver-gold moonlight. " +
      "A large luminous full moon glows behind her in the night sky, surrounded by tiny glowing dots of gold light. " +
      "Her expression is peaceful and reverent, eyes closed, face tilted upward. " +
      "Moonlight catches on her crescent moon necklace. ",
  },

  // ── Tuesday — Tarot content (non-card) ─────────────────────────────────
  rune_cast: {
    label: "Rune Cast",
    day: "Tarot Tuesday",
    outfit: "indigo_cloak",
    hairstyle: "sleek_straight",
    palette: "mystic",
    prompt:
      "Transform this illustration so the character is seated at a low table, casting rune stones from a velvet pouch. " +
      "Several stone runes with carved symbols are scattered on the table before her. " +
      "She looks down at the runes with focused concentration, one hand still holding the pouch. " +
      "Soft candlelight illuminates the runes from the side. ",
  },
  pendulum: {
    label: "Pendulum",
    day: "Tarot Tuesday",
    outfit: "midnight_robe",
    hairstyle: "side_swept",
    palette: "mystic",
    prompt:
      "Transform this illustration so the character holds a crystal pendulum dangling from a fine chain. " +
      "The pendulum — a pointed amethyst crystal — hangs from her fingers, mid-swing, with a subtle gold glow trail. " +
      "Her other hand rests palm-up beneath it. Her expression is calm and focused, watching the pendulum intently. ",
  },

  // ── Wednesday — Astrology / Zodiac ─────────────────────────────────────
  pisces_season: {
    label: "Pisces Season",
    day: "Zodiac Wednesday",
    outfit: "dusty_rose_robe",
    hairstyle: "wild_curls",
    palette: "oceanic",
    prompt:
      "Transform this illustration to celebrate Pisces season. " +
      "Her hair should be loose and flowing with tiny flowers or shells woven in. " +
      "Add a dreamy underwater-meets-sky background: soft blues and purples with gentle washes of colour, floating orbs of gold light, " +
      "and the Pisces constellation (two fish connected) subtly traced in glowing dots of gold light in the background. " +
      "Her expression should be dreamy and intuitive, eyes slightly unfocused as if sensing something beyond. ",
  },
  birth_chart: {
    label: "Birth Chart",
    day: "Zodiac Wednesday",
    outfit: "lavender_robe",
    hairstyle: "half_up_braids",
    palette: "celestial",
    prompt:
      "Transform this illustration so the character is studying a circular birth chart spread out before her. " +
      "The chart shows zodiac symbols arranged in a wheel with thin gold lines connecting them. " +
      "She traces a line on the chart with one finger, expression curious and engaged. " +
      "Faint zodiac constellations shimmer in the background behind her. ",
  },

  // ── Thursday — Crystal guide ───────────────────────────────────────────
  amethyst_guide: {
    label: "Amethyst Crystal",
    day: "Crystal Thursday",
    outfit: "midnight_robe",
    hairstyle: "low_bun_tendrils",
    palette: "cream",
    prompt:
      "Transform this illustration into a close-up composition showing just the character's hands and upper body (bust up). " +
      "She should be holding a large amethyst crystal cluster in both hands at chest height, looking down at it with reverence. " +
      "The amethyst has a soft purple-lavender colour with subtle gold highlights. " +
      "Small sparkles of gold and lavender float around the crystal. ",
  },
  crystal_grid: {
    label: "Crystal Grid",
    day: "Crystal Thursday",
    outfit: "cream_linen",
    hairstyle: "fishtail_braid",
    palette: "cream",
    prompt:
      "Transform this illustration so the character is kneeling on the floor, carefully arranging crystals in a sacred geometry grid pattern. " +
      "Various crystals — clear quartz points, amethyst, rose quartz, citrine — are laid out in a flower-of-life pattern. " +
      "She places the final crystal with both hands, expression focused and intentional. " +
      "A subtle glow connects the crystals in thin gold lines. ",
  },

  // ── Friday — Spell content ─────────────────────────────────────────────
  intention_spell: {
    label: "Intention Spell",
    day: "Spell Friday",
    outfit: "sage_wrap",
    hairstyle: "half_up_braids",
    palette: "mystic",
    prompt:
      "Transform this illustration so the character is standing at a table or altar, writing in her grimoire by candlelight. " +
      "On the table: an open leather-bound book, a golden pen, a white candle with a flame, a small bundle of dried herbs, and a clear quartz crystal point. " +
      "Her expression is focused and purposeful. " +
      "Warm candlelight illuminates her face from below, casting soft gold tones. " +
      "Tiny gold sparks drift upward from the candle flame. ",
  },
  candle_magic: {
    label: "Candle Magic",
    day: "Spell Friday",
    outfit: "sage_wrap",
    hairstyle: "loose_waves",
    palette: "mystic",
    prompt:
      "Transform this illustration so the character sits before an arrangement of coloured candles — white, red, green, and gold — each with a small carved symbol. " +
      "She is lighting one candle with a match, the flame just catching. " +
      "Her expression is serene and ritualistic. Warm candlelight glows on her face. " +
      "Thin wisps of smoke curl upward with subtle gold sparkles. ",
  },
  jar_spell: {
    label: "Jar Spell",
    day: "Spell Friday",
    outfit: "sage_wrap",
    hairstyle: "fishtail_braid",
    palette: "earthy",
    prompt:
      "Transform this illustration so the character is assembling a spell jar at a wooden table. " +
      "She layers dried herbs, small crystals, and a rolled paper intention into a glass jar. " +
      "Around her: dried lavender bundles, salt, small bottles of oils, and a candle for sealing. " +
      "Her expression is focused and content. Warm natural light from a nearby window. ",
  },

  // ── Saturday — Kitchen witch / seasonal ────────────────────────────────
  kitchen_witch: {
    label: "Kitchen Witch",
    day: "Cosy Saturday",
    outfit: "dusty_rose_robe",
    hairstyle: "low_bun_tendrils",
    palette: "earthy",
    prompt:
      "Transform this illustration into a kitchen witch scene. " +
      "She's standing in a kitchen, stirring a small cauldron-style pot. " +
      "Around her: hanging dried herbs (lavender, rosemary, chamomile) from above, jars of herbs and crystals on shelves behind her, a window showing a grey winter sky. " +
      "Her expression is focused and content — a subtle closed-mouth smile, not a big grin. " +
      "Steam rises from the pot with subtle gold sparkles in it. " +
      "The scene should feel grounded and witchy, not cute or cartoonish. ",
  },
  sabbat_altar: {
    label: "Sabbat Altar",
    day: "Cosy Saturday",
    outfit: "amber_tunic",
    hairstyle: "side_swept",
    palette: "earthy",
    prompt:
      "Transform this illustration so the character is arranging a seasonal altar on a wooden surface. " +
      "The altar holds candles, seasonal foliage (evergreen, dried flowers, acorns), a chalice, and a small offering bowl. " +
      "She places a bundle of dried herbs with both hands, expression reverent and grounded. " +
      "Warm natural light from the side. The scene feels cosy, sacred, and seasonal. ",
  },

  // ── Sunday — Affirmation / reflection ──────────────────────────────────
  weekly_affirmation: {
    label: "Affirmation",
    day: "Sunday",
    outfit: "lavender_robe",
    hairstyle: "loose_waves",
    palette: "cream",
    prompt:
      "Transform this illustration into a minimalist composition. " +
      "Show her in profile or three-quarter view, eyes closed peacefully, with her hand resting over her heart where the crescent moon necklace sits. " +
      "Her hair is in the loose flowing style. " +
      "A subtle gold crescent moon sits in the upper portion of the image. " +
      "The overall composition should feel peaceful, meditative, and leave room for text to be added. Minimal detail — let the simplicity speak. " +
      "Leave a large open space for text overlay. ",
  },
  shadow_work: {
    label: "Shadow Work",
    day: "Sunday",
    outfit: "indigo_cloak",
    hairstyle: "sleek_straight",
    palette: "mystic",
    prompt:
      "Transform this illustration so the character sits in contemplation, journaling by candlelight. " +
      "She writes in a dark leather journal, expression introspective and serious but not sad. " +
      "Behind her, a subtle mirror or reflection shows a slightly different version of her — same face, but expression more guarded, representing the shadow self. " +
      "The mirror image is faint, like a watercolour ghost. Single candle provides warm light. ",
  },
  chakra_meditation: {
    label: "Chakra Meditation",
    day: "Sunday",
    outfit: "lavender_robe",
    hairstyle: "crown_braid",
    palette: "cream",
    prompt:
      "Transform this illustration so the character sits in a meditation pose, legs crossed, hands resting on knees with palms up. " +
      "Two or three small glowing orbs of colour float near her body — a soft violet one near her crown and a warm green one at her heart. " +
      "Her eyes are closed, expression serene. A subtle gold aura surrounds her. " +
      "The chakra points glow softly, not cartoonish or neon. ",
  },

  // ── Stories templates ──────────────────────────────────────────────────
  daily_card_pull: {
    label: "Card Pull",
    day: "Stories",
    outfit: "midnight_robe",
    hairstyle: "side_swept",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait with the character holding up a single tarot card toward the viewer. " +
      "The card face is blank/glowing gold (the actual card will be added in editing). " +
      "She has a slight knowing smile. ",
  },
  ask_sammii: {
    label: "Ask Sammii",
    day: "Stories",
    outfit: "midnight_robe",
    hairstyle: "loose_waves",
    palette: "cream",
    prompt:
      "Transform this illustration so the character is resting her chin on her hand thoughtfully, looking directly at the viewer with a warm, knowing expression. " +
      "A subtle question mark shape made of tiny glowing dots of gold light above her head. Bust portrait. ",
  },
  moon_phase_checkin: {
    label: "Moon Check-in",
    day: "Stories",
    outfit: "midnight_robe",
    hairstyle: "crown_braid",
    palette: "indigo",
    prompt:
      "Transform this illustration so the character stands by a window at night, the moon visible through the glass casting silver-gold light across her face. " +
      "She rests one hand on the windowsill, the other touching her crescent moon necklace. " +
      "Tiny dots of light and a crescent moon reflect in the glass. Her expression is contemplative and connected — checking in with the moon's energy. " +
      "Warm cream and gold highlights on her skin contrast with the deep indigo night outside. " +
      "Subtle gold sparkles drift in the moonlight near her hand. ",
  },

  // ── Tarot Deck — all 22 Major Arcana ───────────────────────────────────
  tarot_00_fool: {
    label: "0 The Fool",
    day: "Tarot Deck",
    outfit: "cream_linen",
    hairstyle: "loose_waves",
    palette: "solar",
    prompt: tarotPrompt("0", "THE FOOL",
      "She stands at the edge of a cliff, one foot lifted as if about to step forward, looking up at the sky with joyful abandon. " +
      "She carries a small knapsack on a stick over one shoulder. A white dog leaps playfully at her feet. " +
      "A bright sun shines overhead. Wild flowers grow at the cliff edge. "),
  },
  tarot_01_magician: {
    label: "I The Magician",
    day: "Tarot Deck",
    outfit: "midnight_robe",
    hairstyle: "sleek_straight",
    palette: "celestial",
    prompt: tarotPrompt("I", "THE MAGICIAN",
      "She stands behind a small altar table with one hand raised pointing to the sky and the other pointing to the ground. " +
      "On the table: a cup, a pentacle coin, a small sword, and a wand. " +
      "An infinity symbol (lemniscate) floats subtly in gold above her head. " +
      "Red roses and white lilies frame the bottom of the composition. "),
  },
  tarot_02_high_priestess: {
    label: "II The High Priestess",
    day: "Tarot Deck",
    outfit: "midnight_robe",
    hairstyle: "crown_braid",
    palette: "mystic",
    prompt: tarotPrompt("II", "THE HIGH PRIESTESS",
      "She is seated on a throne between two pillars — one dark plum, one warm cream. " +
      "She holds an open grimoire in her lap, a crescent moon at her feet. " +
      "A veil of sheer lavender fabric drapes behind her with pomegranates and crescent moons embroidered in gold. "),
  },
  tarot_03_empress: {
    label: "III The Empress",
    day: "Tarot Deck",
    outfit: "dusty_rose_robe",
    hairstyle: "loose_waves",
    palette: "earthy",
    prompt: tarotPrompt("III", "THE EMPRESS",
      "She reclines on a cushioned seat in a lush garden setting. " +
      "Wheat and grain grow around her, ripe pomegranates hang from branches above. " +
      "She rests one hand on her heart, the other holds a golden sceptre. " +
      "A shield with the Venus symbol leans against her seat. The scene radiates abundance and fertility. "),
  },
  tarot_04_emperor: {
    label: "IV The Emperor",
    day: "Tarot Deck",
    outfit: "amber_tunic",
    hairstyle: "sleek_straight",
    palette: "solar",
    prompt: tarotPrompt("IV", "THE EMPEROR",
      "She sits upright on a stone throne carved with ram heads at the armrests. " +
      "She holds a golden ankh sceptre in one hand and an orb in the other. " +
      "Mountains rise behind the throne. Her expression is calm and authoritative. " +
      "The composition feels stable, grounded, and powerful. "),
  },
  tarot_05_hierophant: {
    label: "V The Hierophant",
    day: "Tarot Deck",
    outfit: "midnight_robe",
    hairstyle: "crown_braid",
    palette: "mystic",
    prompt: tarotPrompt("V", "THE HIEROPHANT",
      "She sits between two stone pillars in a temple setting, wearing elaborate ceremonial robes. " +
      "She raises one hand in a blessing gesture, two fingers raised. " +
      "Two crossed keys rest at her feet. An ornate triple crown or headdress sits on her head. " +
      "Two smaller figures kneel before her, seen from behind. "),
  },
  tarot_06_lovers: {
    label: "VI The Lovers",
    day: "Tarot Deck",
    outfit: "dusty_rose_robe",
    hairstyle: "side_swept",
    palette: "cream",
    prompt: tarotPrompt("VI", "THE LOVERS",
      "She stands in the centre of the composition with arms slightly open. " +
      "Behind her, two trees frame the scene — one with fruit (knowledge), one with flames (passion). " +
      "A large angelic figure with gold wings appears in clouds above, arms spread in blessing. " +
      "Her expression is open and contemplative, as if making a choice. Soft light bathes the scene. "),
  },
  tarot_07_chariot: {
    label: "VII The Chariot",
    day: "Tarot Deck",
    outfit: "amber_tunic",
    hairstyle: "half_up_braids",
    palette: "celestial",
    prompt: tarotPrompt("VII", "THE CHARIOT",
      "She stands in a golden chariot beneath a canopy of glowing dots of light. " +
      "Two sphinxes — one light, one dark — sit before the chariot. " +
      "She holds a wand or sceptre, expression determined and triumphant. " +
      "A city skyline is visible behind her. Glowing dots of light and a crescent moon shine above the canopy. "),
  },
  tarot_08_strength: {
    label: "VIII Strength",
    day: "Tarot Deck",
    outfit: "amber_tunic",
    hairstyle: "wild_curls",
    palette: "solar",
    prompt: tarotPrompt("VIII", "STRENGTH",
      "She gently holds open the jaws of a lion with calm, loving hands — not wrestling but taming with kindness. " +
      "The lion is peaceful, not aggressive. An infinity symbol floats subtly above her head in gold. " +
      "Flowers and greenery frame the scene. Her expression is serene and compassionate. "),
  },
  tarot_09_hermit: {
    label: "IX The Hermit",
    day: "Tarot Deck",
    outfit: "indigo_cloak",
    hairstyle: "low_bun_tendrils",
    palette: "mystic",
    prompt: tarotPrompt("IX", "THE HERMIT",
      "She stands alone on a mountain peak, holding a lantern in one raised hand that emits a gold six-pointed star of light. " +
      "She leans on a tall wooden staff with the other hand. " +
      "Snow-capped mountains stretch behind her. Her expression is wise and contemplative. " +
      "The scene is solitary and peaceful — a seeker of truth. "),
  },
  tarot_10_wheel: {
    label: "X Wheel of Fortune",
    day: "Tarot Deck",
    outfit: "lavender_robe",
    hairstyle: "fishtail_braid",
    palette: "celestial",
    prompt: tarotPrompt("X", "WHEEL OF FORTUNE",
      "She stands beside a large golden wheel covered in alchemical symbols and letters. " +
      "The wheel floats in the sky, clouds around it. " +
      "Winged creatures sit in the four corners — a bull, lion, eagle, and angel — each reading a book. " +
      "Her hand rests on the wheel. Her expression is knowing — cycles and fate. "),
  },
  tarot_11_justice: {
    label: "XI Justice",
    day: "Tarot Deck",
    outfit: "midnight_robe",
    hairstyle: "sleek_straight",
    palette: "cream",
    prompt: tarotPrompt("XI", "JUSTICE",
      "She sits on a stone throne between two grey pillars, holding a raised sword in her right hand and balanced golden scales in her left. " +
      "A square jewel clasp holds her robe at the collar. " +
      "Her expression is impartial and clear-eyed. A veil hangs between the pillars behind her. "),
  },
  tarot_12_hanged_man: {
    label: "XII The Hanged Man",
    day: "Tarot Deck",
    outfit: "indigo_cloak",
    hairstyle: "loose_waves",
    palette: "oceanic",
    prompt: tarotPrompt("XII", "THE HANGED MAN",
      "She hangs upside-down from a living tree by one foot, the other leg crossed behind the knee forming a figure-four shape. " +
      "Her arms are folded behind her back. Despite the inversion, her expression is peaceful and enlightened. " +
      "A golden halo glows around her head. Leaves sprout from the tree. "),
  },
  tarot_13_death: {
    label: "XIII Death",
    day: "Tarot Deck",
    outfit: "indigo_cloak",
    hairstyle: "wild_curls",
    palette: "mystic",
    prompt: tarotPrompt("XIII", "DEATH",
      "She walks through a field where flowers are both wilting and blooming simultaneously — decay and rebirth together. " +
      "She carries a black flag with a white rose emblem. " +
      "A setting sun glows gold on the horizon between two towers. " +
      "Her expression is calm and accepting — transformation, not fear. "),
  },
  tarot_14_temperance: {
    label: "XIV Temperance",
    day: "Tarot Deck",
    outfit: "lavender_robe",
    hairstyle: "side_swept",
    palette: "oceanic",
    prompt: tarotPrompt("XIV", "TEMPERANCE",
      "She stands with one foot on land and one in a stream of water. " +
      "She pours water between two golden cups in a flowing arc — the water glows with light. " +
      "Large translucent wings spread behind her. A golden triangle with a square inside it appears on her chest. " +
      "Irises bloom at the water's edge. A path leads to distant mountains and a golden sun. "),
  },
  tarot_15_devil: {
    label: "XV The Devil",
    day: "Tarot Deck",
    outfit: "midnight_robe",
    hairstyle: "half_up_braids",
    palette: "mystic",
    prompt: tarotPrompt("XV", "THE DEVIL",
      "She sits on a dark throne or pedestal in a powerful pose, one hand raised holding a flaming torch. " +
      "Loose chains drape around the base of the throne — the chains are loose enough to remove, symbolising self-imposed bonds. " +
      "An inverted pentagram floats above. Her expression is intense and knowing — shadow work, not evil. " +
      "The scene is dark but warm, empowering not frightening. "),
  },
  tarot_16_tower: {
    label: "XVI The Tower",
    day: "Tarot Deck",
    outfit: "amber_tunic",
    hairstyle: "wild_curls",
    palette: "solar",
    prompt: tarotPrompt("XVI", "THE TOWER",
      "A tall stone tower is struck by a bolt of golden lightning, its crown blown off. " +
      "She falls or leaps from the tower, arms outstretched, but her expression is strangely peaceful — liberation, not panic. " +
      "Flames and golden sparks rain down. The sky is dramatic with dark clouds and flashes of gold. "),
  },
  tarot_17_star: {
    label: "XVII The Star",
    day: "Tarot Deck",
    outfit: "lavender_robe",
    hairstyle: "fishtail_braid",
    palette: "celestial",
    prompt: tarotPrompt("XVII", "THE STAR",
      "She kneels beside a pool of water, pouring water from two vessels — one into the pool, one onto the earth. " +
      "A large eight-pointed gold star shines above her head and seven smaller glowing dots of white light surround it. " +
      "The landscape transitions from deep indigo sky at top to sage green land at bottom. " +
      "Her expression is serene and hopeful. "),
  },
  tarot_18_moon: {
    label: "XVIII The Moon",
    day: "Tarot Deck",
    outfit: "indigo_cloak",
    hairstyle: "crown_braid",
    palette: "indigo",
    prompt: tarotPrompt("XVIII", "THE MOON",
      "A large full moon with a face in profile dominates the upper sky, golden rays streaming down. " +
      "She walks a winding path between two towers toward distant mountains. " +
      "A dog and a wolf sit on either side of the path. A crayfish emerges from a pool in the foreground. " +
      "The scene is dreamlike and mysterious. "),
  },
  tarot_19_sun: {
    label: "XIX The Sun",
    day: "Tarot Deck",
    outfit: "cream_linen",
    hairstyle: "loose_waves",
    palette: "solar",
    prompt: tarotPrompt("XIX", "THE SUN",
      "She sits joyfully on a white horse in a garden of sunflowers, arms open wide. " +
      "A huge radiant sun with a face beams down with golden rays. " +
      "Sunflowers grow tall behind a low stone wall. A red banner or flag waves in her hand. " +
      "Her expression is pure joy and vitality. The scene radiates warmth and happiness. "),
  },
  tarot_20_judgement: {
    label: "XX Judgement",
    day: "Tarot Deck",
    outfit: "midnight_robe",
    hairstyle: "half_up_braids",
    palette: "celestial",
    prompt: tarotPrompt("XX", "JUDGEMENT",
      "A great angelic figure with gold wings blows a long trumpet from the clouds above. " +
      "She stands below with arms raised toward the sky in a gesture of awakening and renewal. " +
      "Other small figures rise from the ground around her. Mountains and water are in the distance. " +
      "Her expression is transcendent — answering a call. "),
  },
  tarot_21_world: {
    label: "XXI The World",
    day: "Tarot Deck",
    outfit: "dusty_rose_robe",
    hairstyle: "side_swept",
    palette: "celestial",
    prompt: tarotPrompt("XXI", "THE WORLD",
      "She dances inside a large oval laurel wreath, one leg crossed behind the other in a graceful pose. " +
      "She holds a wand or crystal in each hand. " +
      "In the four corners: a bull, lion, eagle, and angel — the four fixed signs. " +
      "Ribbons tie the wreath at top and bottom. Her expression is fulfilled and complete — journey's end. "),
  },

  // ── Carousel Hook Scenes ─────────────────────────────────────────────
  crystal_rose_quartz_hold: {
    label: "Rose Quartz Hold",
    day: "Carousel Hook",
    outfit: "dusty_rose_robe",
    hairstyle: "side_swept",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She holds a rose quartz crystal close to her chest with one hand. " +
      "The crystal has a soft pink watercolour wash. Her eyes are detailed with visible coloured irises, gazing down at the crystal with gentle reverence. " +
      "A few loose gold sparkles float nearby. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  crystal_clear_quartz_hold: {
    label: "Clear Quartz Hold",
    day: "Carousel Hook",
    outfit: "cream_linen",
    hairstyle: "sleek_straight",
    palette: "celestial",
    prompt:
      "Transform this illustration into a bust portrait. She holds a clear quartz point between her fingers near her face. " +
      "Her eyes are detailed with visible coloured irises, looking through the crystal with focus. " +
      "A few loose gold and white sparkles near the crystal. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  crystal_amethyst_hold: {
    label: "Amethyst Hold",
    day: "Carousel Hook",
    outfit: "lavender_robe",
    hairstyle: "low_bun_tendrils",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She holds an amethyst crystal against her heart with one hand, eyes half-closed in meditation. " +
      "The amethyst is painted in loose lavender and purple watercolour. A few gold sparkles drift upward. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  spell_altar_setup: {
    label: "Altar Setup",
    day: "Carousel Hook",
    outfit: "sage_wrap",
    hairstyle: "half_up_braids",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She holds a lit candle in one hand close to her chest, looking at the viewer with focused intention. " +
      "A few loosely sketched dried herbs and a small crystal float in the background. " +
      "Warm golden candlelight on her face. Her eyes are detailed with visible coloured irises. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  spell_potion_brewing: {
    label: "Potion Brewing",
    day: "Carousel Hook",
    outfit: "forest_velvet",
    hairstyle: "fishtail_braid",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She leans forward slightly, blowing gently across a steaming cup or small bowl she holds in one hand. " +
      "Wisps of steam with subtle gold and green sparkles rise from it. Her eyes are detailed with visible coloured irises, peeking over the steam. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  zodiac_constellation_gaze: {
    label: "Constellation Gaze",
    day: "Carousel Hook",
    outfit: "moonlit_silver",
    hairstyle: "wild_curls",
    palette: "celestial",
    prompt:
      "Transform this illustration into a bust portrait in three-quarter view. " +
      "Her eyes are detailed with visible coloured irises, reflecting golden starlight — expression full of wonder. " +
      "A few loosely sketched constellation lines in soft gold float behind her. " +
      "Gold starlight catches on her crescent moon necklace. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  moon_waxing_ritual: {
    label: "Waxing Moon Ritual",
    day: "Carousel Hook",
    outfit: "cream_linen",
    hairstyle: "loose_waves",
    palette: "celestial",
    prompt:
      "Transform this illustration into a bust portrait. She holds a small journal or grimoire close to her chest, a pen in her other hand. " +
      "A loosely sketched waxing crescent moon in soft gold floats behind her. Her expression is hopeful and determined. " +
      "Her eyes are detailed with visible coloured irises. Silver-gold moonlight on her skin. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  moon_waning_release: {
    label: "Waning Moon Release",
    day: "Carousel Hook",
    outfit: "indigo_cloak",
    hairstyle: "crown_braid",
    palette: "indigo",
    prompt:
      "Transform this illustration into a bust portrait. She holds a small piece of paper near a candle flame, about to release it. " +
      "A loosely sketched waning crescent moon floats behind her in soft gold. Her expression is calm and accepting — letting go. " +
      "Her eyes are detailed with visible coloured irises. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  chakra_healing_hands: {
    label: "Chakra Healing Hands",
    day: "Carousel Hook",
    outfit: "lavender_robe",
    hairstyle: "low_bun_tendrils",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She has both hands over her heart, eyes closed peacefully. " +
      "Two or three small loosely painted orbs of colour float near her — a soft violet one and a warm green one. " +
      "A subtle gold shimmer around her. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  rune_stone_reading: {
    label: "Rune Stone Reading",
    day: "Carousel Hook",
    outfit: "indigo_cloak",
    hairstyle: "sleek_straight",
    palette: "mystic",
    prompt:
      "Transform this illustration into a bust portrait. She holds a single flat rune stone between her fingers, showing it toward the viewer. " +
      "A simple carved symbol is visible on the stone. Her eyes are detailed with coloured irises, expression focused and knowing. " +
      "A few more rune stones are loosely sketched in the background. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  angel_number_vision: {
    label: "Angel Number Vision",
    day: "Carousel Hook",
    outfit: "dusty_rose_wrap",
    hairstyle: "side_swept",
    palette: "celestial",
    prompt:
      "Transform this illustration into a bust portrait. She looks at the viewer with a knowing, slightly awed expression. " +
      "Loosely sketched gold numbers — 111, 222, 333 — float faintly around her like dots of light. " +
      "Her eyes are detailed with visible coloured irises. Warm gold and cream tones. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  tarot_spread_layout: {
    label: "Tarot Spread",
    day: "Carousel Hook",
    outfit: "midnight_robe",
    hairstyle: "fishtail_braid",
    palette: "mystic",
    prompt:
      "Transform this illustration into a bust portrait. She holds up a single tarot card toward the viewer, the card face showing an ornate gold back. " +
      "Her expression is focused and knowing, one eyebrow slightly raised. Her eyes are detailed with coloured irises. " +
      "A few more cards are loosely sketched floating behind her. Soft gold sparkles near the cards. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  sabbat_wheel_year: {
    label: "Wheel of the Year",
    day: "Carousel Hook",
    outfit: "amber_tunic",
    hairstyle: "half_up_braids",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She holds a small wreath of mixed seasonal foliage — flowers, wheat, evergreen — in one hand near her chest. " +
      "Her expression is warm and reverent. Her eyes are detailed with coloured irises. " +
      "Loose gold sparkles and a few falling leaves sketched around her. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  herb_bundle_drying: {
    label: "Herb Bundle Drying",
    day: "Carousel Hook",
    outfit: "sage_wrap",
    hairstyle: "loose_waves",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She holds a small bundle of dried herbs — lavender and rosemary — tied with twine, bringing it close to smell it. " +
      "Her expression is content, eyes half-closed. Her eyes are detailed with coloured irises. " +
      "A few loosely sketched herb sprigs in the background. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },

  // ── New Story Scenes ─────────────────────────────────────────────────
  behind_the_scenes: {
    label: "Behind the Scenes",
    day: "Stories",
    outfit: "dusty_rose_robe",
    hairstyle: "half_up_braids",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She glances up from a grimoire she's holding, looking at the viewer with warm, detailed eyes — visible coloured irises, slight knowing smile. " +
      "A golden pen rests in her other hand. A few loosely sketched crystals and a candle float in the background. " +
      "Warm golden tones on her skin. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  poll_this_or_that: {
    label: "This or That Poll",
    day: "Stories",
    outfit: "dusty_rose_robe",
    hairstyle: "wild_curls",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She rests her chin on one hand, looking at the viewer with a playful, curious expression. " +
      "One eyebrow slightly raised as if asking a cheeky question. Her eyes are detailed with visible coloured irises. " +
      "Two soft loosely painted orbs float on either side — one gold, one lavender. " +
      "Leave open space for text overlay. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  daily_oracle: {
    label: "Daily Oracle",
    day: "Stories",
    outfit: "midnight_robe",
    hairstyle: "sleek_straight",
    palette: "celestial",
    prompt:
      "Transform this illustration into a bust portrait. She holds an open grimoire up near her face, peeking over the top at the viewer with one visible eye. " +
      "Her expression is mysterious and playful — like she knows something you don't. " +
      "Her detailed, coloured eyes are the focal point. Tiny glowing dots of gold light loosely sketched around her. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  morning_ritual: {
    label: "Morning Ritual",
    day: "Stories",
    outfit: "cream_linen",
    hairstyle: "low_bun_tendrils",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She holds a cup of tea in both hands close to her face, steam rising with a few loose gold sparkles. " +
      "Her expression is peaceful and sleepy-content, eyes half-open. Her eyes are detailed with visible coloured irises. " +
      "Warm soft tones. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  evening_wind_down: {
    label: "Evening Wind Down",
    day: "Stories",
    outfit: "lavender_robe",
    hairstyle: "side_swept",
    palette: "indigo",
    prompt:
      "Transform this illustration into a bust portrait. She holds an open book close to her chest, eyes closed peacefully. " +
      "Warm golden candlelight catches on one side of her face against a deep indigo background. " +
      "Her expression is calm and content. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  crystal_of_the_day: {
    label: "Crystal of the Day",
    day: "Stories",
    outfit: "sage_wrap",
    hairstyle: "fishtail_braid",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She holds a single crystal between two fingers near her face, showing it to the viewer. " +
      "Her eyes are detailed with visible coloured irises, expression warm and inviting. " +
      "A few loose gold sparkles near the crystal. Clean bright background. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  spell_tip: {
    label: "Spell Tip",
    day: "Stories",
    outfit: "sage_wrap",
    hairstyle: "loose_waves",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She holds up one finger as if sharing a tip, expression friendly and knowledgeable. " +
      "A small sparkle of gold at her fingertip. Her eyes are detailed with visible coloured irises. " +
      "Warm earthy tones. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  moon_energy_update: {
    label: "Moon Energy Update",
    day: "Stories",
    outfit: "midnight_robe",
    hairstyle: "crown_braid",
    palette: "indigo",
    prompt:
      "Transform this illustration into a bust portrait. A loosely sketched crescent moon in soft gold floats beside her head. " +
      "Her eyes are detailed with visible coloured irises, expression warm and informative. " +
      "Glowing dots of light loosely scattered across an indigo background. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  zodiac_meme: {
    label: "Zodiac Meme",
    day: "Stories",
    outfit: "dusty_rose_robe",
    hairstyle: "wild_curls",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She gives a knowing smirk and a side-eye look at the viewer. " +
      "Her eyes are detailed with visible coloured irises — the expression is the whole point, playfully judgmental. " +
      "Clean cream background with space for text overlay. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  gratitude_check: {
    label: "Gratitude Check",
    day: "Stories",
    outfit: "dusty_rose_wrap",
    hairstyle: "low_bun_tendrils",
    palette: "cream",
    prompt:
      "Transform this illustration into a bust portrait. She has both hands over her heart, eyes closed, with a soft smile. " +
      "Small loosely sketched gold hearts and sparkles float around her. " +
      "Warm and peaceful. Bust portrait on a warm cream background. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },

  // ── New Single-Image Feed Scenes ──────────────────────────────────────
  affirmation_sunrise: {
    label: "Sunrise Affirmation",
    day: "Feed Singles",
    outfit: "cream_linen",
    hairstyle: "loose_waves",
    palette: "solar",
    prompt:
      "Transform this illustration into a bust portrait in profile or three-quarter view, eyes closed peacefully, face tilted slightly upward. " +
      "Warm amber and gold watercolour washes suggest sunrise light on her face. " +
      "Her crescent moon necklace catches the light. Leave ample open space for text overlay. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  mood_rainy_day: {
    label: "Rainy Day Mood",
    day: "Feed Singles",
    outfit: "forest_velvet",
    hairstyle: "side_swept",
    palette: "oceanic",
    prompt:
      "Transform this illustration into a bust portrait. She holds a cup of tea close to her face in both hands, looking slightly to the side with a contemplative expression. " +
      "Soft blue and lavender watercolour washes in the background suggest rain. Her eyes are detailed with visible coloured irises. " +
      "Cosy, moody atmosphere. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  zodiac_season_announce: {
    label: "Zodiac Season",
    day: "Feed Singles",
    outfit: "moonlit_silver",
    hairstyle: "wild_curls",
    palette: "celestial",
    prompt:
      "Transform this illustration into a bust portrait. She looks at the viewer with an excited, welcoming expression. " +
      "A few loosely sketched constellation dots of gold light float behind her. Her eyes are detailed with visible coloured irises. " +
      "Leave space for zodiac season text overlay. Deep indigo and gold tones. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  spirit_animal: {
    label: "Spirit Animal",
    day: "Feed Singles",
    outfit: "sage_wrap",
    hairstyle: "fishtail_braid",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She has a gentle, peaceful expression with eyes half-closed. " +
      "A small loosely sketched translucent fox shape in soft gold sits near her shoulder — suggested rather than detailed. " +
      "Her eyes are detailed with visible coloured irises. Warm earthy tones with sage green washes. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  grimoire_page: {
    label: "Grimoire Page",
    day: "Feed Singles",
    outfit: "midnight_robe",
    hairstyle: "sleek_straight",
    palette: "mystic",
    prompt:
      "Transform this illustration into a bust portrait. She holds an open grimoire, showing the pages toward the viewer. " +
      "The visible pages have loosely sketched botanical illustrations and handwriting. Her expression is focused and scholarly. " +
      "Her eyes are detailed with visible coloured irises. Warm candlelight tones. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
  tea_reading: {
    label: "Tea Leaf Reading",
    day: "Feed Singles",
    outfit: "autumn_wine",
    hairstyle: "half_up_braids",
    palette: "earthy",
    prompt:
      "Transform this illustration into a bust portrait. She holds a teacup near her face, peering into it with intrigued, analytical eyes. " +
      "Her eyes are detailed with visible coloured irises. Warm amber light on her skin. " +
      "A few loose gold sparkles rise from the cup. " +
      "Keep the style flat and illustrative with visible ink outlines and sketchy watercolour washes — not rendered, not 3D, not photorealistic. ",
  },
};

export type SceneKey = keyof typeof SCENES;

// Group scenes by day for the UI
export function scenesByDay(): { day: string; scenes: { key: string; scene: Scene }[] }[] {
  const groups = new Map<string, { key: string; scene: Scene }[]>();
  for (const [key, scene] of Object.entries(SCENES)) {
    const list = groups.get(scene.day) ?? [];
    list.push({ key, scene });
    groups.set(scene.day, list);
  }
  return Array.from(groups, ([day, scenes]) => ({ day, scenes }));
}
