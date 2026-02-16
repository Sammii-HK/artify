"""
🌙 LUNARY TAROT — Deck Generation Pipeline
============================================
Generates a complete 78-card tarot deck in the Lunary editorial illustration style.

Two-pass generation:
  Pass 1: Generate suit background (no figures)
  Pass 2: Add figure + suit symbols via Kontext edit

SETUP:
  pip install requests

  export DEEPINFRA_TOKEN=your_token_here

USAGE:
  # Generate a single card
  python lunary_tarot.py card --name "The High Priestess"
  python lunary_tarot.py card --name "Five of Cups"

  # Generate an entire suit
  python lunary_tarot.py suit --name cups

  # Generate all Major Arcana
  python lunary_tarot.py major

  # Generate the full 78-card deck
  python lunary_tarot.py deck

  # List all cards
  python lunary_tarot.py list

  # Preview a card's prompts without generating
  python lunary_tarot.py preview --name "The Moon"

COST: ~$0.02 per card (2 passes), full deck ≈ $1.56
"""

import os
import sys
import json
import argparse
import base64
import requests
from pathlib import Path
from datetime import datetime

# ============================================================
# CONFIGURATION
# ============================================================

DEEPINFRA_TOKEN = os.environ.get("DEEPINFRA_API_TOKEN", os.environ.get("DEEPINFRA_TOKEN", ""))
API_URL = "https://api.deepinfra.com/v1/openai/images/edits"
GEN_URL = "https://api.deepinfra.com/v1/openai/images/generations"
MODEL = "black-forest-labs/FLUX.1-Kontext-dev"
GEN_MODEL = "black-forest-labs/FLUX-1-dev"  # For text-to-image

OUTPUT_DIR = "public/lunary_tarot"

# ============================================================
# REFERENCE IMAGES — Style Anchors
# ============================================================
# Point these to your best existing cards. Kontext will use them as
# style references, transforming the content while preserving the look.
# This is THE key to deck consistency.
#
# If a reference exists → single-pass Kontext edit (more consistent)
# If no reference → two-pass: generate background + add figure (more variety)

REFERENCE_IMAGES = {
    # Your best Major Arcana card — used as style anchor for all majors
    "major": "public/high-priestess.png",

    # Per-suit references (optional). Set to a path once you have a card you love.
    # Leave as None to use the two-pass text-to-image approach.
    "cups": "public/mother-cups.png",
    "pentacles": None,  # e.g. "reference_images/five_of_pentacles.png"
    "swords": None,
    "wands": None,
}


# ============================================================
# UNIFIED STYLE PROMPT
# ============================================================

STYLE_BASE = (
    "illustration rendered in a graphic editorial illustration style, "
    "not a painting, not fantasy art, not cinematic. "
    "Designed shapes and simplified forms, reduced realism, no photoreal textures, "
    "no surface detail implying real materials. "
    "Depth created through layered colour fields, tonal contrast, "
    "and soft warm glow from symbolic objects. "
    "Composition is calm and authoritative with generous negative space "
    "and restrained sacred geometry. "
    "Very dark colour palette, dominated by deep indigo and near-black violet. "
    "Muted pinks and lilac only in small touches. "
    "Warm golden atmospheric glow radiates softly from the moon and key objects, "
    "with tiny scattered light particles in the air. "
    "Gold used sparingly as a graphic accent only. "
    "Mystical but controlled, timeless, feels like an illustrated plate, "
    "not a rendered scene. "
    "No digital painting style, no fantasy illustration style, no hyper-realism, "
    "no cinematic lighting, no grain or haze. "
    "No text, no borders, no decorative frames, no arch frames. 2:3 aspect ratio."
)

FIGURE_STYLE = (
    "Figures are full-body, archetypal, richly rendered with soft shading and depth. "
    "Faces have gentle features, not hyper-detailed but present and expressive. "
    "Clothing has weight and drape with tonal variation. "
    "Hands rendered as elegant forms, stylised but not stiff. "
    "Flora and decorative elements rendered as symbolic graphic motifs, "
    "simplified petal shapes, ornamental and intentional."
)


# ============================================================
# SUIT BACKGROUNDS
# ============================================================

SUIT_BACKGROUNDS = {
    "pentacles": (
        "graphic editorial illustration background, no people, no figures. "
        "Cultivated earth environment designed as a symbolic stage. "
        "Expresses human care, labour, patience, and material continuity without showing humans. "
        "Terraced ground, soil beds, paths, furrows, or horizontal land bands. "
        "Structure is orderly but imperfect, shaped by time rather than architecture. "
        "Materials feel earthen and organic: soil, clay, packed earth, wood. "
        "Stone may appear only as low retaining edges or ground supports, never monumental. "
        "Flat colour fields and layered shapes. "
        "Illustrative depth created through overlapping planes and scale, not lighting. "
        "No suit symbols of any kind, no coins, no pentacles, no icons, "
        "no markings that imply currency or wealth. "
        "No temples, no arches, no columns, no halls, no ruins, no fantasy structures. "
        "Colour palette rooted in deep indigo and nebula violet, translated into earthy tones. "
        "Muted warmth used sparingly, never bright or luminous. "
        "Subtle art nouveau-inspired linework integrated into land contours. "
        "Low contrast, partially implied, never decorative. "
        "No realistic lighting. No volumetric light. No cinematic shadows. "
        "No grain, no texture noise, no haze. "
        "Designed, calm, restrained, editorial illustration. "
        "No text, no symbols, no figures, 2:3 aspect ratio."
    ),

    "cups": (
        "graphic editorial illustration background, no people, no figures. "
        "Open still-water environment designed as a symbolic stage. "
        "A pond, pool, or quiet lake that feels naturally contained by land or horizon. "
        "Expresses emotional receptivity, reflection, and depth without narrative. "
        "Water surface is calm and expansive, with gentle ripples and reflective planes. "
        "Edges of the water are soft and natural, implied rather than sharply defined. "
        "Aquatic vegetation appears subtly at the margins: "
        "abstract reeds, lily pads, or water plants suggested through simplified shapes. "
        "No botanical realism, no detailed flowers, no decorative focal blooms. "
        "Surrounding forms are minimal and organic: low banks, subtle land curves, distant edges. "
        "No architecture, no chambers, no temples, no built enclosures. "
        "Flat colour fields and layered shapes. "
        "Illustrative depth created through overlap and scale, not realism. "
        "No suit symbols of any kind. "
        "No cups, no chalices, no icons, no coins, no pentacles, no wands, no swords. "
        "No Major Arcana symbols. "
        "No moon, no sun, no stars, no divine figures, no thresholds. "
        "Colour palette rooted in deep indigo and nebula violet with soft lilac. "
        "Muted pink warmth used sparingly, never luminous. "
        "Gold only as a faint graphic accent, never a light source. "
        "Subtle art nouveau-inspired linework integrated into water ripples and plant contours. "
        "Low contrast, partially implied, never decorative. "
        "No realistic lighting. No volumetric light. No cinematic shadows. "
        "No grain, no texture noise. "
        "Designed, calm, restrained, editorial illustration. "
        "No text, no symbols, no figures, 2:3 aspect ratio."
    ),

    "swords": (
        "graphic editorial illustration background, no people, no figures. "
        "Abstract air-and-structure environment designed as a symbolic stage. "
        "Expresses thought, tension, clarity, division, and mental pressure without narrative. "
        "Spatial forms are linear and architectural in feeling but not literal buildings: "
        "planes, corridors, layers, partitions, crossings, and interruptions. "
        "Structure feels precise, ordered, and slightly severe. "
        "Symmetry may be present but subtly broken or offset. "
        "Depth created through overlapping planes, receding layers, and scale. "
        "Not through lighting, shadow, or atmospheric effects. "
        "Materials feel cool and cerebral: smooth stone-like planes, matte surfaces, "
        "glassy or slate-like fields. No organic earth, no vegetation, no water. "
        "Flat colour fields and layered shapes. "
        "Illustrative depth created through composition, not realism. "
        "No suit symbols of any kind. "
        "No swords, no blades, no icons, no weapons, no objects. "
        "No Major Arcana symbols. "
        "No moon, no sun, no stars, no pillars, no divine imagery. "
        "Colour palette rooted in deep indigo, nebula violet, and cool blue-grey. "
        "High contrast avoided; mid-tones dominate. "
        "No browns, no sepia, no earthy warmth. "
        "Subtle art nouveau-inspired linework integrated into edges and intersections. "
        "Very low contrast, partially implied, never decorative. "
        "No realistic lighting. No volumetric light. No cinematic shadows. "
        "No grain, no texture noise, no haze. "
        "Designed, restrained, intellectual, editorial illustration. "
        "No text, no symbols, no figures, 2:3 aspect ratio."
    ),

    "wands": (
        "graphic editorial illustration background, no people, no figures. "
        "Abstract landscape of vertical energy designed as a symbolic stage. "
        "Expresses growth, ambition, movement, and creative force without narrative. "
        "Tall forms rise from the ground: stylised trees, branches, vertical lines, "
        "abstract pillars of organic growth. "
        "Environment feels alive with upward momentum and potential energy. "
        "Materials feel organic but abstracted: bark-like textures as flat shapes, "
        "leaf forms as geometric motifs, fire suggested through warm colour fields not flames. "
        "No architecture, no built structures, no fantasy elements. "
        "Flat colour fields and layered shapes. "
        "Illustrative depth created through overlapping planes and scale, not lighting. "
        "No suit symbols of any kind. No wands, no staffs, no rods, no sticks. "
        "No Major Arcana symbols. No moon, no sun, no stars, no divine imagery. "
        "Colour palette rooted in deep indigo and nebula violet with warm amber accents. "
        "Warm tones used to suggest fire energy, never bright or luminous. "
        "Subtle art nouveau-inspired linework integrated into growth forms and vertical lines. "
        "Low contrast, partially implied, never decorative. "
        "No realistic lighting. No volumetric light. No cinematic shadows. "
        "No grain, no texture noise. "
        "Designed, energetic but restrained, editorial illustration. "
        "No text, no symbols, no figures, 2:3 aspect ratio."
    ),

    "major": (
        "graphic editorial illustration background designed as a symbolic stage. "
        "Abstract sacred space with restrained geometry. "
        "Dark botanical silhouette motifs at edges and margins. "
        "Deep indigo and nebula violet colour fields. "
        "Gold used sparingly as a graphic accent only. "
        "Flat colour fields and layered shapes for depth. "
        "No realistic lighting. No volumetric light. No cinematic shadows. "
        "Designed, calm, authoritative, editorial illustration. "
        "No text, no borders, no frames."
    ),
}


# ============================================================
# NUMBER SYMBOLISM (for pip cards)
# ============================================================

NUMBER_STRUCTURE = {
    "Ace": "singular origin, one central form, emergence from void, potential",
    "Two": "duality, balance, mirroring, partnership, two symmetrical elements",
    "Three": "growth, expansion, triangle composition, creative synthesis",
    "Four": "stability, structure, four-cornered balance, foundation, order",
    "Five": "disruption, imbalance, one interruption in an otherwise stable system, conflict",
    "Six": "harmony restored, generosity, flow, equilibrium after disruption",
    "Seven": "reflection, assessment, mystery, inner questioning, suspension",
    "Eight": "movement, momentum, rapid change, mastery through effort",
    "Nine": "near completion, abundance or anxiety, culmination approaching",
    "Ten": "completion, fulfilment or burden, the full cycle, totality",
    "Page": "youth, curiosity, beginning of a journey, messenger energy",
    "Knight": "action, pursuit, movement toward a goal, intensity",
    "Queen": "mastery through receptivity, nurturing power, emotional authority",
    "King": "mastery through command, established authority, wisdom",
}


# ============================================================
# MAJOR ARCANA DEFINITIONS
# ============================================================

MAJOR_ARCANA = {
    "0 The Fool": {
        "figure": (
            "A young woman with long flowing hair and light skin, "
            "standing at the edge of a precipice, looking upward not down. "
            "Flowing garments in pale lilac and indigo layers. A small satchel in one hand. "
            "Posture is open, trusting, slightly leaning forward into the void. "
            "A small white dog at their feet. "
            "Deep night sky above with stars. "
            "Simplified flora silhouettes at the cliff edge."
        ),
        "background": "edge of a stylised cliff or precipice against open sky, transition between ground and void",
    },
    "I The Magician": {
        "figure": (
            "A figure seen from behind or in profile, one arm raised toward the sky, "
            "the other pointing down toward a stone altar. "
            "On the altar: a glowing cup, a blade, a branch, and a golden disc. "
            "Dark flowing robes with red lining. "
            "A faint lemniscate shape glowing above their head. "
            "Confident, channeling posture against deep dark sky."
        ),
        "background": "dark sacred space, stone altar, as above so below, deep indigo atmosphere",
    },
    "II The High Priestess": {
        "figure": (
            "A seated female figure between two pillars, one dark and one light. "
            "She holds an open book or scroll in her lap. "
            "A translucent veil drapes behind her. "
            "A crescent moon at her feet. "
            "A triple moon crown or crescent tiara on her head. "
            "Robes in deep violet-blue with silver or lilac accents. "
            "Eyes closed or downcast, serene and knowing. "
            "Pomegranates suggested as simplified motifs on the veil."
        ),
        "background": "two pillars framing a threshold, a veil between known and unknown, water or mist at the base",
    },
    "III The Empress": {
        "figure": (
            "A reclining or seated female figure in flowing robes surrounded by abundance. "
            "A crown of twelve stars or a garland of grain. "
            "Rich, sensual posture suggesting fertility and comfort. "
            "Cushions or soft drapery around her. "
            "Wheat or grain stalks as simplified graphic motifs. "
            "Venus symbol suggested subtly. "
            "Warm muted pinks and golds within the indigo palette."
        ),
        "background": "lush symbolic garden, flowing water, wheat fields as layered colour planes, abundance",
    },
    "IV The Emperor": {
        "figure": (
            "A seated male figure on a throne-like structure, front-facing, commanding. "
            "Angular, structured posture. Armoured or structured garments in deep red tones. "
            "A long scepter or orb. Ram motifs suggested on the throne. "
            "Mountains or geometric structures behind. "
            "Authority expressed through stillness and symmetry."
        ),
        "background": "angular mountain forms, structured geometric landscape, stone and sky, stark and ordered",
    },
    "V The Hierophant": {
        "figure": (
            "A robed figure seated between two pillars, hand raised in blessing. "
            "A triple crown or papal-like headdress. "
            "Crossed keys at the figure's feet. "
            "Religious or institutional garments in deep indigo and gold. "
            "Formal, symmetrical composition."
        ),
        "background": "temple interior with two pillars, formal sacred space, stone floor with pattern",
    },
    "VI The Lovers": {
        "figure": (
            "Two figures standing facing each other, hands almost touching. "
            "Behind one figure a tree of flame, behind the other a tree of fruit. "
            "Both figures in simple, flowing garments. "
            "A radiant light or glowing orb above them, not an angel. "
            "Connection expressed through proximity and mirroring poses."
        ),
        "background": "garden with two symbolic trees, a radiant glow above, Eden-like but abstracted",
    },
    "VII The Chariot": {
        "figure": (
            "A figure standing in or upon a vehicle or platform, holding a wand or scepter. "
            "A canopy of stars above. Two sphinxes or abstract creatures at the front, "
            "one dark and one light, pulling in slightly different directions. "
            "Armoured or structured garments with celestial motifs. "
            "A city or structured forms behind. "
            "Posture of determined control, facing forward."
        ),
        "background": "a city wall or structured horizon behind, starry canopy, path forward between two forces",
    },
    "VIII Strength": {
        "figure": (
            "A female figure gently closing or opening the mouth of a lion. "
            "The gesture is tender, not forceful. An infinity symbol above her head. "
            "Flowing white garments with floral garlands. "
            "The lion is stylised, more graphic motif than realistic animal. "
            "Rolling green hills or meadow as simplified planes behind. "
            "Grace and quiet power expressed through softness."
        ),
        "background": "rolling meadow or open landscape, gentle hills, infinite horizon suggesting patience",
    },
    "IX The Hermit": {
        "figure": (
            "A solitary cloaked figure standing on a mountain peak, holding a lantern. "
            "Inside the lantern, a six-pointed star glows. "
            "Long robes in grey-violet, a staff in the other hand. "
            "Head slightly bowed, inward-looking. "
            "Alone against vast space. "
            "The light is the only warm accent in a cool composition."
        ),
        "background": "mountain peak against dark sky, vast emptiness, snow or abstract terrain, solitude",
    },
    "X Wheel of Fortune": {
        "figure": (
            "A large wheel or circular form at the centre of the composition. "
            "Three creatures around it: one rising, one falling, one at the top. "
            "Symbols or letters suggested on the wheel's rim. "
            "Four winged creatures in the corners: lion, eagle, bull, angel (as graphic motifs). "
            "Clouds or abstract forms surrounding the wheel. "
            "Cyclical, turning, inevitable."
        ),
        "background": "clouds and sky, the wheel floating in cosmic space, four corner creatures as motifs",
    },
    "XI Justice": {
        "figure": (
            "A silhouette figure seated on a dark throne, holding glowing golden scales "
            "in one hand and a faintly glowing sword in the other. "
            "Dark heavy robes. Face in shadow, only the scales and sword catch the light. "
            "Perfectly centred, symmetrical composition. "
            "Impartial, unwavering, still."
        ),
        "background": "dark formal space, deep shadows, symmetry and order, minimal elements",
    },
    "XII The Hanged Man": {
        "figure": (
            "A figure suspended upside-down from a T-shaped tree or beam, "
            "hanging by one foot with the other leg crossed behind. "
            "Arms behind the back or forming a triangle. "
            "A halo or glow around the head. "
            "Expression serene, not suffering. "
            "The figure chose this. Surrender, not punishment."
        ),
        "background": "a living tree or wooden beam, leaves growing from it, sky visible, space for contemplation",
    },
    "XIII Death": {
        "figure": (
            "A skeletal or death-figure on a pale horse, carrying a black banner "
            "with a white rose or five-petaled flower. "
            "A sun rising or setting between two towers on the horizon. "
            "Not gruesome — transformative, inevitable, dignified. "
            "The figure is almost gentle. Only one rider, no other people."
        ),
        "background": "a river or horizon with the sun between two towers, transition landscape, empty and still",
    },
    "XIV Temperance": {
        "figure": (
            "A serene figure standing with one foot on land, one in water, no wings. "
            "Pouring glowing golden liquid between two vessels — the flow is continuous. "
            "A glowing golden triangle on the chest. "
            "A pathway leading to distant mountains. "
            "Robes in deep indigo and violet with gold accents. "
            "Patience, alchemy, balance, flow."
        ),
        "background": "land meeting dark water, a glowing path leading to distant mountains, deep dark atmosphere",
    },
    "XV The Devil": {
        "figure": (
            "A large horned figure perched above, part animal part human, wings spread. "
            "Loose chains hanging from the pedestal below. "
            "An inverted pentagram or five-pointed form above the devil's head. "
            "A dark throne or pedestal. Bat-like wings. "
            "Torch held downward. The scene is uncomfortable but not horrifying. "
            "Bondage is chosen, not forced."
        ),
        "background": "dark void, a pedestal or block, chains, oppressive but abstract space",
    },
    "XVI The Tower": {
        "figure": (
            "A tall tower struck by a bolt of lightning from above. "
            "A crown blown off the top. Debris falling. "
            "Flames or sparks erupting from the windows. "
            "The lightning bolt is the only bright element. "
            "Rocky foundation, dark sky. "
            "Sudden, unavoidable, necessary destruction."
        ),
        "background": "dark sky, rocky ground, the tower as central architectural form, lightning splitting it",
    },
    "XVII The Star": {
        "figure": (
            "A woman seen from behind, kneeling at a dark reflective pool. "
            "Long flowing hair down her back, deep violet robes. "
            "She pours glowing golden water from an urn into the dark pool, the water catches the light. "
            "Above her, golden stars scattered across a vast deep dark sky. "
            "She is mostly in shadow, backlit by the warm glow of the stars. "
            "Atmospheric, serene, still."
        ),
        "background": "vast dark sky filled with golden stars, dark reflective pool, dark foliage silhouettes at edges",
    },
    "XVIII The Moon": {
        "figure": (
            "A large moon face between two towers, a winding path leading from water to horizon. "
            "A crawfish or crustacean emerging from the water. "
            "A dog and a wolf howling at the moon on either side of the path. "
            "Drops or yods falling from the moon. "
            "Everything is uncertain, dreamlike, slightly unsettling. "
            "The path disappears into the unknown."
        ),
        "background": "two towers framing a moonlit path, water at the foreground, hills disappearing into fog",
    },
    "XIX The Sun": {
        "figure": (
            "A silhouette of a young figure riding a white horse, seen from the side. "
            "Arms raised joyfully. A massive golden sun disc fills the upper half of the image, "
            "radiating warm golden light across the dark landscape. "
            "Dark botanical silhouettes frame the bottom. "
            "The figure and horse are backlit by the sun. Warmth, joy, triumph."
        ),
        "background": "dark landscape silhouettes, massive golden sun disc dominates, warm glow against indigo sky",
    },
    "XX Judgement": {
        "figure": (
            "Silhouette figures rising from the ground with arms raised toward the sky. "
            "A great beam of golden light descending from above, not an angel. "
            "Mountains and water in the background. "
            "A sense of awakening and transformation. "
            "The figures are small against the vast sky."
        ),
        "background": "mountains and sea, vast sky with a single beam of golden light, call to awakening",
    },
    "XXI The World": {
        "figure": (
            "A dancing figure within a large wreath or oval laurel. "
            "Holding two wands or batons. Partially draped in flowing cloth. "
            "Four creatures in the corners: lion, eagle, bull, angel (as graphic motifs). "
            "The figure is celebrating, complete, whole. "
            "The wreath is infinity — beginning and end. "
            "Everything is harmonious and resolved."
        ),
        "background": "oval wreath or mandorla, four corner creatures, cosmic space, wholeness",
    },
}


# ============================================================
# MINOR ARCANA DEFINITIONS
# ============================================================

def get_minor_card(suit, rank):
    """Generate figure and background descriptions for a minor arcana card."""

    suit_lower = suit.lower()
    number_key = rank if rank in NUMBER_STRUCTURE else rank.split(" ")[-1] if " " in rank else rank

    # Suit-specific themes
    suit_themes = {
        "cups": {
            "element": "water",
            "domain": "emotions, relationships, intuition, dreams",
            "object": "cup, chalice, vessel, goblet",
            "energy": "flowing, receptive, emotional, intuitive",
        },
        "pentacles": {
            "element": "earth",
            "domain": "material world, work, money, body, craft",
            "object": "pentacle, coin, disc, earthen medallion",
            "energy": "grounded, patient, material, tangible",
        },
        "swords": {
            "element": "air",
            "domain": "mind, conflict, truth, decision, intellect",
            "object": "sword, blade, cutting edge",
            "energy": "sharp, decisive, mental, cutting",
        },
        "wands": {
            "element": "fire",
            "domain": "creativity, passion, ambition, will, action",
            "object": "wand, staff, branch, living rod",
            "energy": "fiery, creative, ambitious, dynamic",
        },
    }

    theme = suit_themes.get(suit_lower, suit_themes["cups"])
    num_desc = NUMBER_STRUCTURE.get(rank, "")

    # Number of suit objects for pip cards
    pip_numbers = {
        "Ace": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5,
        "Six": 6, "Seven": 7, "Eight": 8, "Nine": 9, "Ten": 10,
    }

    count = pip_numbers.get(rank)

    if count:
        # Pip card (Ace through Ten)
        figure_desc = (
            f"A composition expressing {num_desc}. "
            f"The scene involves {theme['domain']}. "
            f"Exactly {count} {theme['object']}(s) are present in the composition, "
            f"integrated into the environment — not floating, not arranged in a grid. "
            f"{'A single figure interacts with the scene.' if count <= 3 else 'Figures may be present, expressing the card energy through posture.'} "
            f"The overall energy is {theme['energy']}. "
            f"Suit symbols are grounded, embedded, or supported by the environment."
        )
    else:
        # Court card
        court_descriptions = {
            "Page": (
                f"A young figure standing, curious and attentive, holding a single {theme['object']}. "
                f"Simple garments suggesting the {theme['element']} element. "
                f"Posture of learning, looking at the {theme['object']} with fascination. "
                f"Fresh, beginning energy."
            ),
            "Knight": (
                f"A figure on horseback or in dynamic forward motion, holding a {theme['object']}. "
                f"Armoured or dressed for action. Intense, focused, charging forward. "
                f"The {theme['element']} element expressed through movement and determination."
            ),
            "Queen": (
                f"A seated female figure on a throne, holding a {theme['object']}. "
                f"The throne and surroundings express the {theme['element']} element. "
                f"She is receptive, nurturing, mastering through understanding. "
                f"Rich garments, comfortable authority, emotional intelligence."
            ),
            "King": (
                f"A seated male figure on a throne, holding a {theme['object']}. "
                f"The throne and surroundings express the {theme['element']} element. "
                f"He is commanding, experienced, mastering through will and wisdom. "
                f"Structured garments, established power, decisive energy."
            ),
        }
        figure_desc = court_descriptions.get(rank, f"A figure holding a {theme['object']}.")

    return {
        "figure": figure_desc,
        "suit": suit_lower,
        "rank": rank,
        "theme": theme,
        "number_meaning": num_desc,
    }


# ============================================================
# ALL 78 CARDS
# ============================================================

def get_all_cards():
    """Return definitions for all 78 cards."""
    cards = {}

    # Major Arcana
    for name, data in MAJOR_ARCANA.items():
        cards[name] = {
            "type": "major",
            "figure": data["figure"],
            "background_note": data["background"],
            "suit": "major",
        }

    # Minor Arcana
    suits = ["Cups", "Pentacles", "Swords", "Wands"]
    ranks = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
             "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"]

    for suit in suits:
        for rank in ranks:
            card_name = f"{rank} of {suit}"
            card_data = get_minor_card(suit, rank)
            cards[card_name] = {
                "type": "minor",
                "figure": card_data["figure"],
                "suit": card_data["suit"],
                "rank": rank,
                "theme": card_data["theme"],
                "number_meaning": card_data.get("number_meaning", ""),
            }

    return cards


# ============================================================
# PROMPT BUILDERS
# ============================================================

def build_background_prompt(card_name, card_data):
    """Build prompt for Pass 1: background only (text-to-image)."""

    suit = card_data["suit"]
    suit_bg = SUIT_BACKGROUNDS.get(suit, SUIT_BACKGROUNDS["major"])

    # For minor arcana, inject number-specific environment language into the background
    number_structure_inserts = {
        "Ace": (
            "The environment expresses singular origin and emergence. "
            "One central focal point in the landscape — a clearing, an opening, a source. "
            "Everything radiates outward from this single point. Potential, not yet realised."
        ),
        "Two": (
            "The environment expresses duality and balance. "
            "Mirrored or paired forms in the landscape — two banks, two paths, two planes. "
            "Symmetry that feels natural, not forced. Partnership, reflection."
        ),
        "Three": (
            "The environment expresses growth and creative expansion. "
            "Triangular composition in the landscape — three prominent forms or three layers of depth. "
            "Things are building, multiplying, taking shape."
        ),
        "Four": (
            "The environment expresses stability and structure. "
            "Four-cornered balance in the landscape — ordered, regular, settled. "
            "A sense of enclosure or containment that feels safe, not trapped. Foundation."
        ),
        "Five": (
            "The environment expresses disruption within a stable system. "
            "One deliberate break, misalignment, or interruption in an otherwise ordered landscape. "
            "A cracked terrace, a disturbed reflection, a gap in a pattern. "
            "The instability is specific and contained, not chaotic."
        ),
        "Six": (
            "The environment expresses harmony restored after disruption. "
            "Flow, generosity, equilibrium. The landscape feels balanced and giving. "
            "Movement that is gentle and purposeful — water flowing, paths converging, forms opening."
        ),
        "Seven": (
            "The environment expresses reflection and inner questioning. "
            "Something partially hidden or veiled in the landscape. Mystery, suspension. "
            "A sense of pause — the environment is waiting, contemplative, not moving forward."
        ),
        "Eight": (
            "The environment expresses momentum and rapid movement. "
            "Repeated forms creating a sense of speed or rhythm — ripples, furrows, descending planes. "
            "Mastery through effort. The landscape feels dynamic, directional."
        ),
        "Nine": (
            "The environment expresses near-completion and approaching culmination. "
            "Almost full, almost whole — one element shy of totality. "
            "Abundance that verges on excess, or anticipation that verges on anxiety."
        ),
        "Ten": (
            "The environment expresses completion and the full cycle. "
            "Totality, resolution. The landscape feels complete, enclosed, resolved. "
            "Nothing missing, nothing extra. The end of a journey through this element."
        ),
        "Page": (
            "The environment expresses beginning and curiosity. "
            "An opening or threshold at the edge of the suit's world. "
            "Fresh, inviting, slightly uncertain — the start of a journey."
        ),
        "Knight": (
            "The environment expresses forward movement and pursuit. "
            "A clear path or direction through the landscape. "
            "Dynamic, purposeful, charged with momentum."
        ),
        "Queen": (
            "The environment expresses established mastery through receptivity. "
            "The landscape is rich, comfortable, fully realised. "
            "The seat of power is natural, not forced — the environment serves the figure."
        ),
        "King": (
            "The environment expresses established mastery through command. "
            "The landscape is ordered, authoritative, complete. "
            "Structure and control expressed through the environment itself."
        ),
    }

    if card_data["type"] == "minor" and card_data.get("rank"):
        rank = card_data["rank"]
        number_note = number_structure_inserts.get(rank, "")
        if number_note:
            number_note = f"{number_note}. "
        else:
            number_note = ""
    else:
        number_note = ""

    if card_data.get("background_note"):
        specific = f"Specific setting: {card_data['background_note']}. "
    else:
        specific = ""

    return f"{suit_bg} {number_note}{specific}"


def build_single_pass_prompt(card_name, card_data):
    """Build a complete single-pass text-to-image prompt combining style + figure + background."""

    figure = card_data["figure"]
    suit = card_data.get("suit", "")
    suit_bg = SUIT_BACKGROUNDS.get(suit, SUIT_BACKGROUNDS["major"])

    # Suit symbol counts for pip cards
    pip_numbers = {
        "Ace": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5,
        "Six": 6, "Seven": 7, "Eight": 8, "Nine": 9, "Ten": 10,
    }

    suit_themes = {
        "cups": "cup, chalice, vessel, goblet",
        "pentacles": "pentacle, coin, disc",
        "swords": "sword, blade",
        "wands": "wand, staff, branch",
    }

    count_note = ""
    if card_data["type"] == "minor":
        rank = card_data.get("rank", "")
        count = pip_numbers.get(rank)
        obj = suit_themes.get(suit, "suit symbol")
        if count:
            count_note = f"Exactly {count} {obj}(s) integrated into the environment, not floating. "

    bg_note = card_data.get("background_note", "")
    specific = f"Setting: {bg_note}. " if bg_note else ""

    return (
        f"{STYLE_BASE} "
        f"{FIGURE_STYLE} "
        f"{figure} "
        f"{count_note}"
        f"{specific}"
        f"A simple glowing crescent moon shape, clean and graphic, not a realistic moon. "
        f"Stars in the sky are small glowing dots, not pointed star shapes, not five-pointed, just tiny warm dots of light. "
        f"All trees, flowers, and plants rendered as flat simplified silhouette shapes, "
        f"not realistic, not detailed, purely decorative graphic motifs. "
        f"{suit_bg}"
    )


def build_figure_prompt(card_name, card_data):
    """Build prompt for Pass 2: add figure to background (image-to-image via Kontext)."""

    figure = card_data["figure"]
    suit = card_data.get("suit", "")

    # Suit-specific symbol integration language (for adding suit symbols after background)
    suit_symbol_notes = {
        "pentacles": (
            "Add pentacle suit elements to the existing background. "
            "Pentacles are grounded, embedded, or supported by the environment. "
            "No floating symbols. "
            "Pentacles integrated subtly into the land or structure, not dominant. "
            "Maintain graphic editorial illustration style. "
            "Do not alter background composition or lighting. "
        ),
        "cups": (
            "Add cup suit elements to the existing background. "
            "Cups are vessels, chalices, goblets — resting on surfaces, emerging from water, held by the environment. "
            "No floating symbols. "
            "Cups integrated naturally into the water environment, not imposed. "
            "Maintain graphic editorial illustration style. "
            "Do not alter background composition or lighting. "
        ),
        "swords": (
            "Add sword suit elements to the existing background. "
            "Swords are blades, edges — embedded in planes, crossing structural forms, integrated into the geometry. "
            "No floating symbols. "
            "Swords aligned with the architectural logic of the environment. "
            "Maintain graphic editorial illustration style. "
            "Do not alter background composition or lighting. "
        ),
        "wands": (
            "Add wand suit elements to the existing background. "
            "Wands are living branches, staffs, rods — growing from the ground, embedded in the organic forms. "
            "No floating symbols. "
            "Wands part of the vertical growth energy, not imposed. "
            "Maintain graphic editorial illustration style. "
            "Do not alter background composition or lighting. "
        ),
    }

    suit_symbol_note = ""
    if card_data["type"] == "minor":
        suit_symbol_note = suit_symbol_notes.get(suit, "")

        # Add count for pip cards
        pip_numbers = {
            "Ace": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5,
            "Six": 6, "Seven": 7, "Eight": 8, "Nine": 9, "Ten": 10,
        }
        rank = card_data.get("rank", "")
        count = pip_numbers.get(rank)
        if count:
            suit_symbol_note += f"Exactly {count} suit symbol instances total, including whole, broken, or implied. "

    return (
        f"Add a figure to this background illustration. "
        f"{FIGURE_STYLE} "
        f"{figure} "
        f"{suit_symbol_note}"
        f"A glowing crescent moon at the base of the composition. "
        f"{STYLE_BASE}"
    )


# ============================================================
# IMAGE GENERATION
# ============================================================

def generate_background(prompt, output_path, token):
    """Generate an image via text-to-image using FLUX.1-dev inference API."""

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    data = {
        "prompt": prompt,
        "width": 768,
        "height": 1152,  # 2:3 ratio
    }

    inference_url = f"https://api.deepinfra.com/v1/inference/{GEN_MODEL}"

    try:
        response = requests.post(inference_url, headers=headers, json=data, timeout=180)
        response.raise_for_status()
        result = response.json()

        # The inference API returns images as data URIs
        if "images" in result and result["images"]:
            image_data = result["images"][0]
            if image_data.startswith("data:"):
                # Strip the data URI prefix
                b64 = image_data.split(",", 1)[1]
                with open(output_path, "wb") as f:
                    f.write(base64.b64decode(b64))
                return True

        # Fallback: try OpenAI-compatible format
        if "data" in result and result["data"]:
            b64 = result["data"][0].get("b64_json")
            url = result["data"][0].get("url")

            if b64:
                with open(output_path, "wb") as f:
                    f.write(base64.b64decode(b64))
                return True
            elif url:
                img = requests.get(url)
                with open(output_path, "wb") as f:
                    f.write(img.content)
                return True

        return False

    except Exception as e:
        print(f"  ❌ Generation error: {e}")
        return False


def add_figure(background_path, prompt, output_path, token):
    """Add a figure to an existing background via Kontext image-to-image."""

    with open(background_path, "rb") as f:
        image_data = f.read()

    files = {"image": ("background.png", image_data, "image/png")}
    data = {
        "prompt": prompt,
        "model": MODEL,
        "n": "1",
        "size": "1024x1024",
    }
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.post(API_URL, headers=headers, files=files, data=data, timeout=180)
        response.raise_for_status()
        result = response.json()

        if "data" in result and result["data"]:
            b64 = result["data"][0].get("b64_json")
            url = result["data"][0].get("url")

            if b64:
                with open(output_path, "wb") as f:
                    f.write(base64.b64decode(b64))
                return True
            elif url:
                img = requests.get(url)
                with open(output_path, "wb") as f:
                    f.write(img.content)
                return True

        return False

    except Exception as e:
        print(f"  ❌ Figure generation error: {e}")
        return False


def build_reference_prompt(card_name, card_data):
    """Build a single-pass Kontext prompt that transforms a reference card into a new card.
    This is the most consistent method — it takes your existing card and says
    'change the scene and figure but keep everything else identical.'"""

    figure = card_data["figure"]
    suit = card_data.get("suit", "")

    # Reference-based: keep the entire visual skeleton (dark bg, arch, flourishes,
    # crescent moon) and ONLY change the figure + symbolic elements around them.
    # The less we change, the more style is preserved.

    if card_data["type"] == "major":
        bg_note = card_data.get("background_note", "")
        return (
            f"Change the seated figure to: {figure} "
            f"Keep the same dark moody illustration style with grain texture. "
            f"Keep the thin art nouveau corner flourishes and dark botanical motifs. "
            f"Keep the near-monochrome indigo-violet palette. "
            f"Keep the glowing gold crescent moon. "
            f"Adapt the background for: {bg_note}. "
            f"No text."
        )

    else:
        theme = card_data.get("theme", {})
        rank = card_data.get("rank", "")
        number_meaning = card_data.get("number_meaning", "")

        pip_numbers = {
            "Ace": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5,
            "Six": 6, "Seven": 7, "Eight": 8, "Nine": 9, "Ten": 10,
        }
        count = pip_numbers.get(rank)
        count_note = f"Exactly {count} {theme.get('object', 'suit symbol')}(s) in the scene, grounded not floating. " if count else ""

        return (
            f"Change the seated figure to: {figure} "
            f"{count_note}"
            f"Keep the same dark moody illustration style with grain texture. "
            f"Keep the thin art nouveau corner flourishes and dark botanical motifs. "
            f"Keep the near-monochrome indigo-violet palette. "
            f"Keep the glowing gold crescent moon. "
            f"{'Express: ' + number_meaning + '. ' if number_meaning else ''}"
            f"No text."
        )


def generate_card(card_name, card_data, output_dir, token, skip_existing=True):
    """Generate a complete card via single-pass text-to-image."""

    # Clean filename
    safe_name = card_name.lower().replace(" ", "_").replace("'", "")
    card_dir = os.path.join(output_dir, card_data["suit"])
    os.makedirs(card_dir, exist_ok=True)

    final_path = os.path.join(card_dir, f"{safe_name}.png")
    prompt_path = os.path.join(card_dir, f"{safe_name}_prompts.json")

    if skip_existing and os.path.exists(final_path):
        print(f"  ⏭️  {card_name} — already exists, skipping")
        return True

    # ── SINGLE-PASS: Text-to-image with full style prompts ──
    prompt = build_single_pass_prompt(card_name, card_data)

    # Save prompts
    with open(prompt_path, "w") as f:
        json.dump({
            "card": card_name,
            "mode": "single_pass",
            "prompt": prompt,
        }, f, indent=2)

    print(f"\n  🎴 {card_name}")
    print(f"     Mode: single-pass text-to-image")
    print(f"     Generating...")

    ok = generate_background(prompt, final_path, token)
    if not ok:
        print(f"     ❌ Generation failed")
        return False

    print(f"     ✅ {card_name} complete → {final_path}")
    return True


# ============================================================
# CLI COMMANDS
# ============================================================

def cmd_list():
    """List all 78 cards."""
    cards = get_all_cards()
    print(f"\n🌙 LUNARY TAROT — ALL {len(cards)} CARDS\n")

    print("MAJOR ARCANA (22 cards)")
    print("-" * 40)
    for name, data in cards.items():
        if data["type"] == "major":
            print(f"  {name}")

    for suit in ["Cups", "Pentacles", "Swords", "Wands"]:
        print(f"\n{suit.upper()} (14 cards)")
        print("-" * 40)
        for name, data in cards.items():
            if data.get("suit") == suit.lower():
                print(f"  {name}")

    print(f"\nTotal: {len(cards)} cards")
    print()


def cmd_preview(card_name):
    """Preview prompts for a card without generating."""
    cards = get_all_cards()

    # Find the card (fuzzy match)
    match = None
    for name in cards:
        if card_name.lower() in name.lower():
            match = name
            break

    if not match:
        print(f"❌ Card not found: {card_name}")
        print(f"   Try: python lunary_tarot.py list")
        return

    card = cards[match]
    bg_prompt = build_background_prompt(match, card)
    fig_prompt = build_figure_prompt(match, card)

    suit = card.get("suit", "major")
    ref_path = REFERENCE_IMAGES.get(suit)
    has_ref = ref_path and os.path.exists(ref_path)

    print(f"\n🎴 {match}")
    print(f"   Type: {card['type']}")
    print(f"   Suit: {card['suit']}")

    if has_ref:
        ref_prompt = build_reference_prompt(match, card)
        print(f"   Mode: REFERENCE-BASED (using {ref_path})")
        print(f"   Cost: ~$0.01 (single Kontext pass)")
        print()
        print("SINGLE-PASS PROMPT:")
        print("-" * 60)
        print(ref_prompt[:800] + "..." if len(ref_prompt) > 800 else ref_prompt)
    else:
        print(f"   Mode: TWO-PASS (no reference for '{suit}')")
        print(f"   Cost: ~$0.02 (background + figure)")
        print(f"   Tip: Add a reference image to REFERENCE_IMAGES['{suit}'] for consistency")
        print()
        print("PASS 1 — BACKGROUND PROMPT:")
        print("-" * 60)
        print(bg_prompt[:500] + "..." if len(bg_prompt) > 500 else bg_prompt)
        print()
        print("PASS 2 — FIGURE PROMPT:")
        print("-" * 60)
        print(fig_prompt[:500] + "..." if len(fig_prompt) > 500 else fig_prompt)
    print()


def cmd_card(card_name):
    """Generate a single card."""
    if not DEEPINFRA_TOKEN:
        print("❌ Set DEEPINFRA_TOKEN environment variable")
        return

    cards = get_all_cards()
    match = None
    for name in cards:
        if card_name.lower() in name.lower():
            match = name
            break

    if not match:
        print(f"❌ Card not found: {card_name}")
        return

    print(f"\n🌙 LUNARY TAROT — Generating: {match}")
    generate_card(match, cards[match], OUTPUT_DIR, DEEPINFRA_TOKEN, skip_existing=False)


def cmd_suit(suit_name):
    """Generate all 14 cards of a suit."""
    if not DEEPINFRA_TOKEN:
        print("❌ Set DEEPINFRA_TOKEN environment variable")
        return

    cards = get_all_cards()
    suit_cards = {k: v for k, v in cards.items() if v.get("suit") == suit_name.lower()}

    if not suit_cards:
        print(f"❌ Unknown suit: {suit_name}")
        print(f"   Options: cups, pentacles, swords, wands, major")
        return

    print(f"\n🌙 LUNARY TAROT — Generating: {suit_name.upper()} ({len(suit_cards)} cards)")
    print(f"   Estimated cost: ~${len(suit_cards) * 0.02:.2f}")
    print("=" * 60)

    success = 0
    for name, data in suit_cards.items():
        if generate_card(name, data, OUTPUT_DIR, DEEPINFRA_TOKEN):
            success += 1

    print(f"\n{'=' * 60}")
    print(f"🎉 {success}/{len(suit_cards)} cards generated")
    print(f"📁 Output: {OUTPUT_DIR}/{suit_name.lower()}/")


def cmd_major():
    """Generate all 22 Major Arcana."""
    if not DEEPINFRA_TOKEN:
        print("❌ Set DEEPINFRA_TOKEN environment variable")
        return

    cards = get_all_cards()
    major_cards = {k: v for k, v in cards.items() if v["type"] == "major"}

    print(f"\n🌙 LUNARY TAROT — Generating: MAJOR ARCANA ({len(major_cards)} cards)")
    print(f"   Estimated cost: ~${len(major_cards) * 0.02:.2f}")
    print("=" * 60)

    success = 0
    for name, data in major_cards.items():
        if generate_card(name, data, OUTPUT_DIR, DEEPINFRA_TOKEN):
            success += 1

    print(f"\n{'=' * 60}")
    print(f"🎉 {success}/{len(major_cards)} cards generated")
    print(f"📁 Output: {OUTPUT_DIR}/major/")


def cmd_deck():
    """Generate the full 78-card deck."""
    if not DEEPINFRA_TOKEN:
        print("❌ Set DEEPINFRA_TOKEN environment variable")
        return

    cards = get_all_cards()

    print(f"\n🌙 LUNARY TAROT — Generating FULL DECK ({len(cards)} cards)")
    print(f"   Estimated cost: ~${len(cards) * 0.02:.2f}")
    print(f"   Estimated time: ~{len(cards) * 2} minutes")
    print("=" * 60)

    success = 0
    for name, data in cards.items():
        if generate_card(name, data, OUTPUT_DIR, DEEPINFRA_TOKEN):
            success += 1

    print(f"\n{'=' * 60}")
    print(f"🌙 LUNARY TAROT DECK COMPLETE")
    print(f"🎉 {success}/{len(cards)} cards generated")
    print(f"📁 Output: {OUTPUT_DIR}/")
    print(f"💰 Estimated cost: ~${success * 0.02:.2f}")


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="🌙 Lunary Tarot Deck Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s list                           List all 78 cards
  %(prog)s preview --name "The Moon"      Preview prompts for a card
  %(prog)s card --name "The High Priestess"  Generate one card
  %(prog)s card --name "Five of Cups"     Generate a minor arcana card
  %(prog)s suit --name cups               Generate all 14 Cups cards
  %(prog)s major                          Generate all 22 Major Arcana
  %(prog)s deck                           Generate the full 78-card deck
        """
    )

    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("list", help="List all 78 cards")

    preview_p = subparsers.add_parser("preview", help="Preview card prompts")
    preview_p.add_argument("--name", required=True, help="Card name")

    card_p = subparsers.add_parser("card", help="Generate a single card")
    card_p.add_argument("--name", required=True, help="Card name")

    suit_p = subparsers.add_parser("suit", help="Generate a suit")
    suit_p.add_argument("--name", required=True, help="Suit name (cups/pentacles/swords/wands)")

    subparsers.add_parser("major", help="Generate all Major Arcana")
    subparsers.add_parser("deck", help="Generate the full 78-card deck")

    args = parser.parse_args()

    if args.command == "list":
        cmd_list()
    elif args.command == "preview":
        cmd_preview(args.name)
    elif args.command == "card":
        cmd_card(args.name)
    elif args.command == "suit":
        cmd_suit(args.name)
    elif args.command == "major":
        cmd_major()
    elif args.command == "deck":
        cmd_deck()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
