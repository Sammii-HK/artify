/**
 * Carousel Recap Reel
 *
 * The hook illustration stays full-screen the entire reel with Ken Burns
 * motion, bokeh, sparkles, and vignette. Text content from each carousel
 * slide layers on top in the lower third, swapping between slides.
 *
 * Structure:
 * - Title pops in over the illustration (first ~2s)
 * - Text slides layer on/off in the lower third
 * - Illustration is always visible and moving
 * - Seamless loop
 *
 * 1080x1920 (9:16), 15s at 30fps = 450 frames.
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Sequence,
} from "remotion";
import { noise2D } from "@remotion/noise";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlideTextData {
  heading: string;
  body: string[];
  footer?: string;
}

export interface ImagePalette {
  dominant: string;    // darkened dominant — card bg
  accent: string;      // vibrant accent — headings, lines
  light: string;       // bright tone — body text
  muted: string;       // mid-tone — footer, subtle elements
}

export interface CarouselRecapProps {
  slides: string[];
  slideTexts?: (SlideTextData | null)[];
  heading?: string;
  palette?: ImagePalette;
}

const WATERMARK = "@sammiispellbound";

const COLORS = {
  midnightPlum: "#4A3352",
  deepPlum: "#2A1832",
  warmCream: "#F5EDE3",
  softGold: "#D4AF73",
  lavender: "#B8A9C9",
  dustyRose: "#C4929E",
};

// ---------------------------------------------------------------------------
// Bokeh orbs
// ---------------------------------------------------------------------------

const BokehOrbs: React.FC<{ count?: number }> = ({ count = 10 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const orbs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        baseX: ((i * 4517 + 211) % 100) / 100 * width,
        baseY: ((i * 3301 + 743) % 100) / 100 * height,
        size: 35 + (i % 6) * 22,
        speed: 0.2 + (i % 4) * 0.08,
        phase: (i * 97.3) % (Math.PI * 2),
        hue: i % 3 === 0 ? 38 : i % 3 === 1 ? 280 : 220,
      })),
    [count, width, height],
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {orbs.map((orb) => {
        const driftX = noise2D(`bk-x-${orb.id}`, frame * 0.003 * orb.speed, orb.id) * 70;
        const driftY = noise2D(`bk-y-${orb.id}`, orb.id, frame * 0.002 * orb.speed) * 45;
        const pulse = interpolate(
          Math.sin(frame * 0.04 + orb.phase),
          [-1, 1],
          [0.05, 0.15],
        );
        return (
          <div
            key={orb.id}
            style={{
              position: "absolute",
              left: orb.baseX + driftX - orb.size / 2,
              top: orb.baseY + driftY - orb.size / 2,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, hsla(${orb.hue}, 50%, 75%, ${pulse}) 0%, hsla(${orb.hue}, 40%, 60%, ${pulse * 0.3}) 40%, transparent 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Sparkles
// ---------------------------------------------------------------------------

const Sparkles: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        baseX: ((i * 7919 + 331) % 100) / 100 * width,
        baseY: ((i * 6271 + 127) % 100) / 100 * height,
        size: 1.5 + (i % 4) * 1.3,
        speed: 0.3 + (i % 3) * 0.2,
        phase: (i * 137.5) % (Math.PI * 2),
        isGold: i % 3 === 0,
        isBright: i % 6 === 0,
      })),
    [count, width, height],
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p) => {
        const floatX = noise2D(`sp-x-${p.id}`, frame * 0.007 * p.speed, p.id) * 25;
        const floatY = noise2D(`sp-y-${p.id}`, p.id, frame * 0.005 * p.speed) * 20 - frame * 0.1;
        const twinkle = interpolate(
          Math.sin(frame * 0.13 + p.phase),
          [-1, 1],
          [0, 1],
        );
        const color = p.isGold ? COLORS.softGold : COLORS.warmCream;
        const actualSize = p.isBright ? p.size * 1.6 : p.size;
        const glowRadius = p.isBright ? actualSize * 4 : actualSize * 2.5;
        const opacity = p.isBright ? twinkle * 0.9 : twinkle * 0.65;

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.baseX + floatX,
              top: ((p.baseY + floatY) % height + height) % height,
              width: actualSize,
              height: actualSize,
              borderRadius: "50%",
              backgroundColor: color,
              opacity,
              boxShadow: `0 0 ${glowRadius}px ${glowRadius / 2}px ${
                p.isGold
                  ? `rgba(212,175,115,${opacity * 0.5})`
                  : `rgba(255,255,255,${opacity * 0.4})`
              }`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Breathing vignette
// ---------------------------------------------------------------------------

const BreathingVignette: React.FC = () => {
  const frame = useCurrentFrame();
  const breath = interpolate(Math.sin(frame * 0.035), [-1, 1], [0.45, 0.65]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${breath}) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Title overlay — pops in over the illustration, then fades out
// ---------------------------------------------------------------------------

const TitleOverlay: React.FC<{
  heading: string;
  holdFrames: number;
  accentColor: string;
  textColor: string;
}> = ({
  heading,
  holdFrames,
  accentColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = heading.split(" ");

  // Fade out
  const fadeOut = interpolate(
    frame,
    [holdFrames - 15, holdFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Gold line
  const lineProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeOut,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Title card — backdrop hugs the text */}
      <div
        style={{
          backgroundColor: "rgba(0,0,0,0.35)",
          borderRadius: 14,
          padding: "24px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "85%",
        }}
      >
        {/* Gold line above */}
        <div
          style={{
            width: interpolate(lineProgress, [0, 1], [0, 140]),
            height: 2,
            backgroundColor: accentColor,
            opacity: 0.6,
            marginBottom: 14,
          }}
        />

        {/* Word-by-word heading */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0 16px",
          }}
        >
          {words.map((word, i) => {
            const p = spring({
              frame: frame - i * 5,
              fps,
              config: { damping: 13, stiffness: 180 },
            });
            return (
              <span
                key={i}
                style={{
                  color: textColor,
                  fontSize: 58,
                  fontFamily: "Cormorant Garamond, Georgia, serif",
                  fontWeight: 700,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 20}px)`,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Accent line below */}
        <div
          style={{
            width: interpolate(
              spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 120 } }),
              [0, 1],
              [0, 140],
            ),
            height: 2,
            backgroundColor: accentColor,
            opacity: 0.6,
            marginTop: 14,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Text card overlay — appears in the lower third over the illustration
// ---------------------------------------------------------------------------

const TextCardOverlay: React.FC<{
  textData: SlideTextData;
  holdFrames: number;
  slideIndex: number;
  cardBg: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
}> = ({ textData, holdFrames, slideIndex, cardBg, accentColor, textColor, mutedColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  // Exit
  const exitFade = interpolate(
    frame,
    [holdFrames - 12, holdFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Heading
  const headingProgress = spring({
    frame: frame - 3,
    fps,
    config: { damping: 12, stiffness: 200 },
  });
  const headingScale = interpolate(headingProgress, [0, 1], [1.15, 1.0]);

  // Gold line
  const lineWidth = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [0, 100],
  );

  // Slide up from bottom
  const slideUp = interpolate(enterProgress, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        opacity: enterProgress * exitFade,
        transform: `translateY(${slideUp}px)`,
      }}
    >
      {/* Card background — lower portion */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 40,
          right: 40,
          top: "auto",
          padding: "30px 40px 40px",
          borderRadius: 16,
          backgroundColor: `${cardBg}d0`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Slide counter */}
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 20,
            color: accentColor,
            fontSize: 22,
            fontFamily: "Helvetica, Arial, sans-serif",
            fontWeight: 600,
            opacity: 0.6,
          }}
        >
          {slideIndex + 1}
        </div>

        {/* Heading */}
        <div
          style={{
            textAlign: "center",
            opacity: headingProgress,
            transform: `scale(${headingScale})`,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: accentColor,
              fontSize: 44,
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {textData.heading}
          </span>
        </div>

        {/* Gold accent line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: accentColor,
            opacity: 0.45,
            marginBottom: 16,
          }}
        />

        {/* Body lines */}
        {textData.body.map((line, i) => {
          const lineDelay = 14 + i * 8;
          const lineProgress = spring({
            frame: frame - lineDelay,
            fps,
            config: { damping: 15, stiffness: 160 },
          });
          const translateY = interpolate(lineProgress, [0, 1], [15, 0]);

          return (
            <div
              key={i}
              style={{
                opacity: lineProgress,
                transform: `translateY(${translateY}px)`,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: textColor,
                  fontSize: 30,
                  fontFamily: "Helvetica, Arial, sans-serif",
                  fontWeight: 400,
                  lineHeight: 1.45,
                }}
              >
                {line}
              </span>
            </div>
          );
        })}

        {/* Footer */}
        {textData.footer && (
          <div
            style={{
              marginTop: 12,
              opacity: interpolate(
                spring({
                  frame: frame - 20 - textData.body.length * 8,
                  fps,
                  config: { damping: 20 },
                }),
                [0, 1],
                [0, 0.7],
              ),
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: mutedColor,
                fontSize: 24,
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontStyle: "italic",
                fontWeight: 500,
              }}
            >
              {textData.footer}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

const ProgressBar: React.FC<{ progress: number; color: string }> = ({ progress, color }) => {
  if (progress <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 55,
        left: 60,
        right: 60,
        height: 3,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 2,
      }}
    >
      <div
        style={{
          width: `${Math.min(progress, 1) * 100}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

export const CarouselRecap: React.FC<CarouselRecapProps> = ({
  slides,
  slideTexts,
  heading,
  palette,
}) => {
  // Resolve palette — use image-derived colors if available, fall back to defaults
  const pal = useMemo(() => ({
    cardBg: palette?.dominant ?? COLORS.deepPlum,
    accent: palette?.accent ?? COLORS.softGold,
    text: palette?.light ?? COLORS.warmCream,
    muted: palette?.muted ?? COLORS.dustyRose,
  }), [palette]);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // The hook image is always slides[0] — used as the full-screen background
  const hookImage = slides[0] || "";

  // Text slides are everything with text data
  const textEntries = useMemo(() => {
    const entries: { text: SlideTextData; originalIndex: number }[] = [];
    slideTexts?.forEach((t, i) => {
      if (t) entries.push({ text: t, originalIndex: i });
    });
    return entries;
  }, [slideTexts]);

  // Timing
  const titleHold = 60; // 2s for title over illustration
  const outroFrames = 20;
  const textAreaFrames = durationInFrames - titleHold - outroFrames;

  // Weight text slides by content length
  const textWeights = useMemo(() => {
    return textEntries.map((entry) => {
      const lineCount = entry.text.body.length + (entry.text.footer ? 0.5 : 0);
      return Math.max(1.2, 0.8 + lineCount * 0.5);
    });
  }, [textEntries]);

  const totalWeight = textWeights.reduce((a, b) => a + b, 0) || 1;
  const textDurations = textWeights.map((w) =>
    Math.floor((w / totalWeight) * textAreaFrames),
  );

  const textStarts = useMemo(() => {
    const starts: number[] = [];
    let cursor = titleHold;
    for (const dur of textDurations) {
      starts.push(cursor);
      cursor += dur;
    }
    return starts;
  }, [textDurations, titleHold]);

  // Slow continuous zoom-in with gentle drift — natural reel feel
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.18], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });
  const panX = noise2D("cr-pan-x", frame * 0.002, 0) * 1.5;
  const panY = noise2D("cr-pan-y", 0, frame * 0.0015) * 1.0;

  // Loop fades
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Warmth
  const warmth = interpolate(Math.sin(frame * 0.012), [-1, 1], [0, 8]);

  // Overall progress for the bar
  const overallProgress = Math.max(0, (frame - titleHold) / textAreaFrames);

  // Bottom gradient — always present, intensifies when text cards are showing
  const hasTextOnScreen = frame >= titleHold && frame < durationInFrames - outroFrames;
  const gradientOpacity = hasTextOnScreen
    ? interpolate(frame, [titleHold, titleHold + 15], [0.3, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0.3;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0612" }}>
      {/* Hook illustration — full screen, always visible */}
      <AbsoluteFill
        style={{
          opacity: fadeIn * fadeOut,
          transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
          filter: `saturate(1.1) brightness(1.02) sepia(${warmth}%)`,
        }}
      >
        {hookImage && (
          <Img
            src={hookImage}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </AbsoluteFill>

      {/* Bottom gradient for text readability */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(10,6,18,0) 0%, rgba(10,6,18,0) 35%, rgba(10,6,18,${0.65 * gradientOpacity}) 55%, rgba(10,6,18,${0.85 * gradientOpacity}) 100%)`,
          opacity: fadeIn * fadeOut,
          pointerEvents: "none",
        }}
      />

      {/* Bokeh */}
      <BokehOrbs count={10} />

      {/* Sparkles */}
      <Sparkles count={30} />

      {/* Breathing vignette */}
      <BreathingVignette />

      {/* Title overlay — shows for first 2s over the illustration */}
      {heading && (
        <Sequence from={0} durationInFrames={titleHold + 10}>
          <TitleOverlay heading={heading} holdFrames={titleHold} accentColor={pal.accent} textColor={pal.text} />
        </Sequence>
      )}

      {/* Text card overlays — layer on in the lower third */}
      {textEntries.map((entry, i) => (
        <Sequence
          key={i}
          from={textStarts[i]}
          durationInFrames={textDurations[i] + 12}
        >
          <TextCardOverlay
            textData={entry.text}
            holdFrames={textDurations[i]}
            slideIndex={i}
            cardBg={pal.cardBg}
            accentColor={pal.accent}
            textColor={pal.text}
            mutedColor={pal.muted}
          />
        </Sequence>
      ))}

      {/* Progress bar */}
      <ProgressBar progress={overallProgress} color={pal.accent} />

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: frame > 25 ? 0.5 * fadeOut : 0,
          color: pal.accent,
          fontSize: 20,
          fontFamily: "Helvetica, Arial, sans-serif",
          fontWeight: 500,
          letterSpacing: 2.5,
        }}
      >
        {WATERMARK}
      </div>
    </AbsoluteFill>
  );
};
