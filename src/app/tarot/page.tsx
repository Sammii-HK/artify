"use client";

import { useState, useEffect, useCallback } from "react";

// ── Card data matching lunary-tarot.py definitions ──────────────────────────

const MAJOR_ARCANA = [
  "0 The Fool", "I The Magician", "II The High Priestess", "III The Empress",
  "IV The Emperor", "V The Hierophant", "VI The Lovers", "VII The Chariot",
  "VIII Strength", "IX The Hermit", "X Wheel of Fortune", "XI Justice",
  "XII The Hanged Man", "XIII Death", "XIV Temperance", "XV The Devil",
  "XVI The Tower", "XVII The Star", "XVIII The Moon", "XIX The Sun",
  "XX Judgement", "XXI The World",
];

const SUITS = ["Cups", "Pentacles", "Swords", "Wands"] as const;
const RANKS = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King",
];

interface CardDef {
  name: string;
  suit: string;
  type: "major" | "minor";
  imagePath: string;
}

function toFilename(name: string): string {
  return name.toLowerCase().replace(/ /g, "_").replace(/'/g, "");
}

function getAllCards(): CardDef[] {
  const cards: CardDef[] = [];

  for (const name of MAJOR_ARCANA) {
    cards.push({
      name,
      suit: "major",
      type: "major",
      imagePath: `/lunary_tarot/major/${toFilename(name)}.png`,
    });
  }

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const name = `${rank} of ${suit}`;
      cards.push({
        name,
        suit: suit.toLowerCase(),
        type: "minor",
        imagePath: `/lunary_tarot/${suit.toLowerCase()}/${toFilename(name)}.png`,
      });
    }
  }

  return cards;
}

const ALL_CARDS = getAllCards();

type Filter = "all" | "major" | "cups" | "pentacles" | "swords" | "wands";

const FILTERS: { key: Filter; label: string; count: number }[] = [
  { key: "all", label: "All 78", count: 78 },
  { key: "major", label: "Major Arcana", count: 22 },
  { key: "cups", label: "Cups", count: 14 },
  { key: "pentacles", label: "Pentacles", count: 14 },
  { key: "swords", label: "Swords", count: 14 },
  { key: "wands", label: "Wands", count: 14 },
];

const SUIT_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  major: { bg: "bg-indigo-950/60", border: "border-indigo-400/30", text: "text-indigo-300", icon: "\u2729" },
  cups: { bg: "bg-violet-950/60", border: "border-violet-400/30", text: "text-violet-300", icon: "\u{1F964}" },
  pentacles: { bg: "bg-amber-950/60", border: "border-amber-400/30", text: "text-amber-300", icon: "\u2B50" },
  swords: { bg: "bg-slate-900/60", border: "border-slate-400/30", text: "text-slate-300", icon: "\u2694\uFE0F" },
  wands: { bg: "bg-orange-950/60", border: "border-orange-400/30", text: "text-orange-300", icon: "\u{1FA84}" },
};

// ── Modal ───────────────────────────────────────────────────────────────────

function CardModal({ card, onClose, allCards }: { card: CardDef; onClose: () => void; allCards: CardDef[] }) {
  const currentIndex = allCards.findIndex((c) => c.name === card.name);

  const navigate = useCallback((dir: -1 | 1) => {
    const nextIndex = currentIndex + dir;
    if (nextIndex >= 0 && nextIndex < allCards.length) {
      // Find the card tile and trigger its click — but simpler to just
      // dispatch a custom event. Instead, we'll use a callback.
      const nextCard = allCards[nextIndex];
      if (nextCard) {
        window.dispatchEvent(new CustomEvent("modal-navigate", { detail: nextCard }));
      }
    }
  }, [currentIndex, allCards]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, navigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-lg w-full mx-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-stone-400 hover:text-white text-sm transition"
        >
          ESC to close
        </button>

        {/* Card image */}
        <img
          src={card.imagePath}
          alt={card.name}
          className="max-h-[80vh] w-auto rounded-xl shadow-2xl shadow-indigo-900/30"
        />

        {/* Card name */}
        <p className="mt-4 text-lg font-semibold text-stone-200">{card.name}</p>
        <p className="text-xs text-stone-500 capitalize">{card.suit === "major" ? "Major Arcana" : card.suit}</p>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-stone-500 hover:text-white transition text-2xl"
          >
            &larr;
          </button>
        )}
        {currentIndex < allCards.length - 1 && (
          <button
            onClick={() => navigate(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-stone-500 hover:text-white transition text-2xl"
          >
            &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

// ── Card Tile ───────────────────────────────────────────────────────────────

function CardTile({ card, onClick }: { card: CardDef; onClick: (card: CardDef) => void }) {
  const [hasImage, setHasImage] = useState(true);
  const colors = SUIT_COLORS[card.suit] || SUIT_COLORS.major;

  return (
    <div
      onClick={() => hasImage && onClick(card)}
      className={`group relative rounded-xl border overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${colors.border} bg-stone-900 ${hasImage ? "cursor-pointer" : ""}`}
    >
      {hasImage ? (
        <img
          src={card.imagePath}
          alt={card.name}
          className="w-full aspect-[2/3] object-cover"
          onError={() => setHasImage(false)}
        />
      ) : (
        <div className={`w-full aspect-[2/3] flex flex-col items-center justify-center gap-3 ${colors.bg}`}>
          <span className="text-3xl opacity-40">{colors.icon}</span>
          <div className={`text-xs font-medium opacity-30 ${colors.text}`}>not yet generated</div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-3 pt-8">
        <p className="text-sm font-semibold text-white/90 drop-shadow-md">{card.name}</p>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function TarotPreview() {
  const [filter, setFilter] = useState<Filter>("all");
  const [modalCard, setModalCard] = useState<CardDef | null>(null);

  const filtered = filter === "all"
    ? ALL_CARDS
    : ALL_CARDS.filter((c) => c.suit === filter);

  // Listen for arrow key navigation events from the modal
  useEffect(() => {
    function onNavigate(e: Event) {
      const card = (e as CustomEvent).detail as CardDef;
      setModalCard(card);
    }
    window.addEventListener("modal-navigate", onNavigate);
    return () => window.removeEventListener("modal-navigate", onNavigate);
  }, []);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      {/* Modal */}
      {modalCard && (
        <CardModal
          card={modalCard}
          onClose={() => setModalCard(null)}
          allCards={filtered}
        />
      )}

      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8">
        <div className="flex items-baseline gap-4 mb-2">
          <h1 className="text-4xl font-bold tracking-tight text-indigo-200">
            Lunary Tarot
          </h1>
          <span className="text-sm text-stone-500">78 cards</span>
        </div>
        <p className="text-stone-400 mb-8">
          Full deck preview &mdash; click any card to expand
        </p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === f.key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        {filter === "all" ? (
          <>
            {/* Major Arcana section */}
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-indigo-300 mb-4 uppercase tracking-wide">
                Major Arcana
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {ALL_CARDS.filter((c) => c.type === "major").map((card) => (
                  <CardTile key={card.name} card={card} onClick={setModalCard} />
                ))}
              </div>
            </section>

            {/* Each suit */}
            {SUITS.map((suit) => (
              <section key={suit} className="mb-12">
                <h2 className={`text-lg font-semibold mb-4 uppercase tracking-wide ${
                  SUIT_COLORS[suit.toLowerCase()]?.text || "text-stone-300"
                }`}>
                  {suit}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {ALL_CARDS.filter((c) => c.suit === suit.toLowerCase()).map((card) => (
                    <CardTile key={card.name} card={card} onClick={setModalCard} />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((card) => (
              <CardTile key={card.name} card={card} onClick={setModalCard} />
            ))}
          </div>
        )}
      </div>

      {/* Reference cards */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="text-lg font-semibold text-stone-400 mb-4 uppercase tracking-wide">
          Style References
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl">
          <div
            className="rounded-xl border border-indigo-400/30 overflow-hidden bg-stone-900 cursor-pointer hover:scale-[1.02] transition-all"
            onClick={() => setModalCard({ name: "II The High Priestess", suit: "major", type: "major", imagePath: "/high-priestess.png" })}
          >
            <img src="/high-priestess.png" alt="High Priestess reference" className="w-full aspect-[2/3] object-cover" />
            <div className="px-3 py-2 text-center">
              <p className="text-xs text-stone-400">Major Arcana reference</p>
            </div>
          </div>
          <div
            className="rounded-xl border border-violet-400/30 overflow-hidden bg-stone-900 cursor-pointer hover:scale-[1.02] transition-all"
            onClick={() => setModalCard({ name: "Queen of Cups", suit: "cups", type: "minor", imagePath: "/mother-cups.png" })}
          >
            <img src="/mother-cups.png" alt="Mother of Cups reference" className="w-full aspect-[2/3] object-cover" />
            <div className="px-3 py-2 text-center">
              <p className="text-xs text-stone-400">Cups reference</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
