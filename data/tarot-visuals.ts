/**
 * Visual mapping for tarot cards
 *
 * Each card has:
 * - rulingPlanet: For the Astronomicon symbol
 * - cardArt: Unique visual element representing the card's meaning
 * - pattern: Subtle background pattern
 */

export type TarotPattern =
  | 'radiating-lines'
  | 'concentric-circles'
  | 'ascending-dots'
  | 'flowing-waves'
  | 'geometric-grid'
  | 'spiral'
  | 'none';

// Card-specific art types - each represents the card's core meaning
export type TarotArt =
  | 'cliff-edge' // The Fool - precipice, leap of faith
  | 'infinity-tools' // The Magician - infinity with 4 elements below
  | 'pillars-veil' // High Priestess - two pillars with mystery between
  | 'growing-abundance' // The Empress - flourishing growth
  | 'throne-structure' // The Emperor - solid angular throne
  | 'sacred-keys' // The Hierophant - crossed keys, tradition
  | 'union-hearts' // The Lovers - two becoming one
  | 'chariot-wheels' // The Chariot - wheels in motion
  | 'gentle-infinity' // Strength - soft infinity, inner power
  | 'lantern-path' // The Hermit - light illuminating the way
  | 'wheel-cycle' // Wheel of Fortune - rotating wheel
  | 'balanced-scales' // Justice - perfectly balanced
  | 'suspended-figure' // The Hanged Man - inverted perspective
  | 'transformation-gate' // Death - doorway/threshold
  | 'flowing-vessels' // Temperance - water between cups
  | 'chains-below' // The Devil - bondage, material
  | 'lightning-tower' // The Tower - structure breaking
  | 'pouring-stars' // The Star - hope, renewal
  | 'twin-towers-moon' // The Moon - path between, reflection
  | 'radiant-sun' // The Sun - full radiating joy
  | 'rising-figures' // Judgement - awakening, ascension
  | 'world-wreath'; // The World - completion, wholeness

export interface TarotVisual {
  rulingPlanet: string;
  zodiacSign?: string;
  cardArt: TarotArt;
  pattern: TarotPattern;
  colors?: [string, string];
}

export const TAROT_VISUALS: Record<string, TarotVisual> = {
  // 0 - The Fool - Leap into the unknown
  theFool: {
    rulingPlanet: 'uranus',
    zodiacSign: 'aquarius',
    cardArt: 'cliff-edge',
    pattern: 'ascending-dots',
    colors: ['#C77DFF', '#A78BFA'],
  },

  // I - The Magician - Manifestation, all tools at hand
  theMagician: {
    rulingPlanet: 'mercury',
    cardArt: 'infinity-tools',
    pattern: 'radiating-lines',
    colors: ['#F59E0B', '#8458D8'],
  },

  // II - The High Priestess - Mystery, duality, hidden knowledge
  theHighPriestess: {
    rulingPlanet: 'moon',
    cardArt: 'pillars-veil',
    pattern: 'flowing-waves',
    colors: ['#7B7BE8', '#A78BFA'],
  },

  // III - The Empress - Abundance, growth, nurturing
  theEmpress: {
    rulingPlanet: 'venus',
    cardArt: 'growing-abundance',
    pattern: 'flowing-waves',
    colors: ['#6B9B7A', '#EE789E'],
  },

  // IV - The Emperor - Structure, authority, stability
  theEmperor: {
    rulingPlanet: 'mars',
    zodiacSign: 'aries',
    cardArt: 'throne-structure',
    pattern: 'geometric-grid',
    colors: ['#D06060', '#F59E0B'],
  },

  // V - The Hierophant - Tradition, sacred knowledge
  theHierophant: {
    rulingPlanet: 'venus',
    zodiacSign: 'taurus',
    cardArt: 'sacred-keys',
    pattern: 'geometric-grid',
    colors: ['#8458D8', '#6B9B7A'],
  },

  // VI - The Lovers - Union, choice, partnership
  theLovers: {
    rulingPlanet: 'mercury',
    zodiacSign: 'gemini',
    cardArt: 'union-hearts',
    pattern: 'radiating-lines',
    colors: ['#EE789E', '#C77DFF'],
  },

  // VII - The Chariot - Victory, willpower, momentum
  theChariot: {
    rulingPlanet: 'moon',
    zodiacSign: 'cancer',
    cardArt: 'chariot-wheels',
    pattern: 'none',
    colors: ['#7B7BE8', '#F59E0B'],
  },

  // VIII - Strength - Inner power, gentle control
  strength: {
    rulingPlanet: 'sun',
    zodiacSign: 'leo',
    cardArt: 'gentle-infinity',
    pattern: 'flowing-waves',
    colors: ['#F59E0B', '#D06060'],
  },

  // IX - The Hermit - Inner light, solitude, guidance
  theHermit: {
    rulingPlanet: 'mercury',
    zodiacSign: 'virgo',
    cardArt: 'lantern-path',
    pattern: 'ascending-dots',
    colors: ['#6B9B7A', '#8458D8'],
  },

  // X - Wheel of Fortune - Cycles, fate, turning points
  wheelOfFortune: {
    rulingPlanet: 'jupiter',
    cardArt: 'wheel-cycle',
    pattern: 'none',
    colors: ['#D070E8', '#F59E0B'],
  },

  // XI - Justice - Balance, truth, fairness
  justice: {
    rulingPlanet: 'venus',
    zodiacSign: 'libra',
    cardArt: 'balanced-scales',
    pattern: 'none',
    colors: ['#C77DFF', '#7B7BE8'],
  },

  // XII - The Hanged Man - Surrender, new perspective
  theHangedMan: {
    rulingPlanet: 'neptune',
    cardArt: 'suspended-figure',
    pattern: 'spiral',
    colors: ['#7B7BE8', '#C77DFF'],
  },

  // XIII - Death - Transformation, endings, rebirth
  death: {
    rulingPlanet: 'pluto',
    zodiacSign: 'scorpio',
    cardArt: 'transformation-gate',
    pattern: 'none',
    colors: ['#1e1e2e', '#8458D8'],
  },

  // XIV - Temperance - Balance, patience, flow
  temperance: {
    rulingPlanet: 'jupiter',
    zodiacSign: 'sagittarius',
    cardArt: 'flowing-vessels',
    pattern: 'flowing-waves',
    colors: ['#D070E8', '#7B7BE8'],
  },

  // XV - The Devil - Bondage, materialism, shadow
  theDevil: {
    rulingPlanet: 'saturn',
    zodiacSign: 'capricorn',
    cardArt: 'chains-below',
    pattern: 'none',
    colors: ['#D06060', '#1e1e2e'],
  },

  // XVI - The Tower - Sudden change, revelation, upheaval
  theTower: {
    rulingPlanet: 'mars',
    cardArt: 'lightning-tower',
    pattern: 'none',
    colors: ['#D06060', '#F59E0B'],
  },

  // XVII - The Star - Hope, renewal, serenity
  theStar: {
    rulingPlanet: 'uranus',
    zodiacSign: 'aquarius',
    cardArt: 'pouring-stars',
    pattern: 'ascending-dots',
    colors: ['#C77DFF', '#7B7BE8'],
  },

  // XVIII - The Moon - Illusion, intuition, the unconscious
  theMoon: {
    rulingPlanet: 'moon',
    zodiacSign: 'pisces',
    cardArt: 'twin-towers-moon',
    pattern: 'flowing-waves',
    colors: ['#7B7BE8', '#C77DFF'],
  },

  // XIX - The Sun - Joy, success, vitality
  theSun: {
    rulingPlanet: 'sun',
    cardArt: 'radiant-sun',
    pattern: 'none',
    colors: ['#F59E0B', '#D070E8'],
  },

  // XX - Judgement - Awakening, rebirth, calling
  judgement: {
    rulingPlanet: 'pluto',
    cardArt: 'rising-figures',
    pattern: 'ascending-dots',
    colors: ['#D070E8', '#8458D8'],
  },

  // XXI - The World - Completion, integration, wholeness
  theWorld: {
    rulingPlanet: 'saturn',
    cardArt: 'world-wreath',
    pattern: 'none',
    colors: ['#8458D8', '#6B9B7A'],
  },

  // Default fallback
  default: {
    rulingPlanet: 'sun',
    cardArt: 'radiant-sun',
    pattern: 'none',
    colors: ['#8458D8', '#7B7BE8'],
  },
};
