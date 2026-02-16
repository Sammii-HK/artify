"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types matching the plan.json / content.json shape                  */
/* ------------------------------------------------------------------ */

interface MoonData {
  name: string;
  illumination: number;
  phase: number;
  emoji: string;
}

interface ZodiacData {
  sign: string;
  symbol: string;
}

interface SabbatData {
  name: string;
  [key: string]: unknown;
}

interface AstroData {
  date: string;
  dayName: string;
  moon: MoonData;
  zodiac: ZodiacData;
  sabbat: SabbatData | null;
}

interface SlideTextContent {
  heading: string;
  body: string[];
  footer?: string;
}

interface Slide {
  type: "hook_image" | "text_card";
  image: string | null;
  textContent?: SlideTextContent;
}

interface Post {
  sceneKey: string;
  label: string;
  day: string;
  slot: "feed" | "story";
  image: string | null;
  caption: string | null;
  astro: AstroData;
  format?: "single" | "carousel";
  slides?: Slide[];
  contentType?: string;
  dataRef?: string;
}

interface DayPlan {
  date: string;
  dayName: string;
  astro: AstroData;
  posts: Post[];
}

interface WeekPlan {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  days: DayPlan[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Return the Monday on or before the given date */
function toMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Generate recent Monday date strings going back N weeks */
function recentMondays(count: number): string[] {
  const now = new Date();
  const monday = toMonday(now);
  // Also check next week's Monday
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const dates: string[] = [formatDate(nextMonday)];
  for (let i = 0; i < count; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    dates.push(formatDate(d));
  }
  return dates;
}

async function tryFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function SlotBadge({ slot }: { slot: "feed" | "story" }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        slot === "feed"
          ? "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
          : "bg-stone-300 text-stone-800 dark:bg-stone-600 dark:text-stone-200"
      }`}
    >
      {slot === "feed" ? "Feed" : "Story"}
    </span>
  );
}

function FormatBadge({ post }: { post: Post }) {
  if (post.format !== "carousel" || !post.slides?.length) return null;
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      Carousel ({post.slides.length})
    </span>
  );
}

function CarouselSlides({ slides }: { slides: Slide[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const slideWidth = el.offsetWidth;
    const index = Math.round(el.scrollLeft / slideWidth);
    setActiveIndex(index);
  }, []);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.offsetWidth, behavior: "smooth" });
  }, []);

  return (
    <div className="relative">
      {/* Scrollable slide container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center">
            {slide.image ? (
              <img
                src={slide.image}
                alt={slide.textContent?.heading ?? `Slide ${i + 1}`}
                className="w-full aspect-[4/5] object-cover"
              />
            ) : (
              <div className="flex items-center justify-center aspect-[4/5] bg-stone-100 dark:bg-stone-800">
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  {slide.type === "hook_image" ? "Hook not generated" : "Slide not generated"}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === activeIndex
                  ? "bg-stone-700 dark:bg-stone-300"
                  : "bg-stone-300 dark:bg-stone-600"
              }`}
            />
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          {activeIndex > 0 && (
            <button
              onClick={() => scrollTo(activeIndex - 1)}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-stone-800/80 flex items-center justify-center text-stone-600 dark:text-stone-300 shadow-sm"
            >
              &lsaquo;
            </button>
          )}
          {activeIndex < slides.length - 1 && (
            <button
              onClick={() => scrollTo(activeIndex + 1)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-stone-800/80 flex items-center justify-center text-stone-600 dark:text-stone-300 shadow-sm"
            >
              &rsaquo;
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const isCarousel = post.format === "carousel" && post.slides && post.slides.length > 0;

  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800/50">
      {/* Image / carousel / placeholder */}
      {isCarousel ? (
        <CarouselSlides slides={post.slides!} />
      ) : post.image ? (
        <img
          src={post.image}
          alt={post.label}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="flex items-center justify-center aspect-square bg-stone-100 dark:bg-stone-800">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Not generated
          </p>
        </div>
      )}

      {/* Info */}
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
            {post.label}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FormatBadge post={post} />
            <SlotBadge slot={post.slot} />
          </div>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          {post.sceneKey}
          {post.contentType && (
            <span className="ml-1 text-stone-300 dark:text-stone-600">
              / {post.contentType}
            </span>
          )}
          {post.dataRef && (
            <span className="ml-1 text-stone-300 dark:text-stone-600">
              / {post.dataRef}
            </span>
          )}
        </p>

        {/* Caption */}
        {post.caption && (
          <div>
            <p
              className={`text-xs text-stone-600 dark:text-stone-400 leading-relaxed ${
                !expanded ? "line-clamp-3" : ""
              }`}
            >
              {post.caption}
            </p>
            {post.caption.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DayPlan }) {
  const { astro } = day;

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            {day.dayName} &middot; {formatDateDisplay(day.date)}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Moon badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 dark:bg-stone-700 px-2.5 py-0.5 text-xs text-stone-700 dark:text-stone-300">
              {astro.moon.emoji} {astro.moon.name}{" "}
              <span className="text-stone-400 dark:text-stone-500">
                {astro.moon.illumination.toFixed(1)}%
              </span>
            </span>
            {/* Zodiac badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 dark:bg-stone-700 px-2.5 py-0.5 text-xs text-stone-700 dark:text-stone-300">
              {astro.zodiac.symbol} {astro.zodiac.sign}
            </span>
            {/* Sabbat */}
            {astro.sabbat && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                {astro.sabbat.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
        {day.posts.map((post, idx) => (
          <PostCard key={`${post.sceneKey}-${idx}`} post={post} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [content, setContent] = useState<WeekPlan | null>(null);
  const [singles, setSingles] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Discover available weeks on mount
  useEffect(() => {
    async function discover() {
      const mondays = recentMondays(8);
      const found: string[] = [];

      await Promise.all(
        mondays.map(async (date) => {
          const [p, c] = await Promise.all([
            tryFetchJson(`/content/${date}/plan.json`),
            tryFetchJson(`/content/${date}/content.json`),
          ]);
          if (p || c) found.push(date);
        })
      );

      // Sort descending (most recent first)
      found.sort((a, b) => b.localeCompare(a));
      setAvailableWeeks(found);

      // Pick week from URL or default to most recent
      const urlWeek = searchParams.get("week");
      if (urlWeek && found.includes(urlWeek)) {
        setSelectedWeek(urlWeek);
      } else if (found.length > 0) {
        setSelectedWeek(found[0]);
      }

      setLoading(false);
    }
    discover();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load week data when selection changes
  useEffect(() => {
    if (!selectedWeek) return;

    async function loadWeek() {
      setLoading(true);
      const [p, c, s] = await Promise.all([
        tryFetchJson<WeekPlan>(`/content/${selectedWeek}/plan.json`),
        tryFetchJson<WeekPlan>(`/content/${selectedWeek}/content.json`),
        tryFetchJson<{ posts: Post[] }>(`/content/singles/content.json`),
      ]);
      setPlan(p);
      setContent(c);
      setSingles(s?.posts ?? null);
      setLoading(false);
    }
    loadWeek();
  }, [selectedWeek]);

  const handleWeekChange = useCallback(
    (week: string) => {
      setSelectedWeek(week);
      router.replace(`/preview?week=${week}`, { scroll: false });
    },
    [router]
  );

  // Merge content on top of plan — content.json has generated images/captions
  const weekData = content ?? plan;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Content Preview</h1>

        {availableWeeks.length > 0 && (
          <select
            value={selectedWeek ?? ""}
            onChange={(e) => handleWeekChange(e.target.value)}
            className="rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 focus:border-stone-500 focus:outline-none"
          >
            {availableWeeks.map((w) => (
              <option key={w} value={w}>
                Week of {formatDateDisplay(w)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <svg
            className="h-6 w-6 animate-spin text-stone-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!loading && !weekData && (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-600 px-6 py-16 text-center">
          <p className="text-stone-400 dark:text-stone-500">
            No content found. Run the content pipeline to generate a plan.
          </p>
          <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
            npx tsx scripts/content-pipeline.ts plan --week next
          </p>
        </div>
      )}

      {/* Week content */}
      {!loading && weekData && (
        <div className="space-y-6">
          {/* Meta */}
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {weekData.weekStart} &mdash; {weekData.weekEnd}
            {weekData.generatedAt && (
              <>
                {" "}
                &middot; Generated{" "}
                {new Date(weekData.generatedAt).toLocaleString()}
              </>
            )}
          </p>

          {/* Day cards */}
          {weekData.days.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}

          {/* Singles section */}
          {singles && singles.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-stone-700 dark:text-stone-300">
                Singles
              </h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {singles.map((post) => (
                  <PostCard key={post.sceneKey} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="mb-8 text-3xl font-bold tracking-tight">
            Content Preview
          </h1>
          <div className="flex items-center justify-center py-24">
            <svg
              className="h-6 w-6 animate-spin text-stone-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        </main>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
