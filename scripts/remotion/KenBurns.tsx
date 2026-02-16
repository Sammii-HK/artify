/**
 * Living Illustration Reel
 *
 * Engaging reel format with structured text content over an animated illustration:
 * - Hook text pops in immediately (0-2s)
 * - Body facts/tips reveal sequentially (2-7s)
 * - CTA at end (7-8.5s)
 * - Seamless loop fade (8.5-9s)
 *
 * Visual effects: eased Ken Burns zoom, bokeh orbs, sparkles, breathing vignette.
 *
 * 1080x1920 (9:16), 9s at 30fps = 270 frames.
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
} from "remotion";
import { noise2D } from "@remotion/noise";

export interface KenBurnsProps {
  imagePath: string;
  /** Bold hook text — shown first, big and punchy */
  overlayText?: string;
  /** Body lines — revealed one at a time after the hook */
  bodyLines?: string[];
  /** Call to action — shown at the end */
  cta?: string;
}

const WATERMARK = "@sammiispellbound";

const COLORS = {
  midnightPlum: "#4A3352",
  deepPlum: "#2A1832",
  warmCream: "#F5EDE3",
  softGold: "#D4AF73",
  dustyRose: "#C4929E",
  lavender: "#B8A9C9",
};

// ---------------------------------------------------------------------------
// Bokeh orbs
// ---------------------------------------------------------------------------

const BokehOrbs: React.FC<{ count?: number }> = ({ count = 12 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const orbs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        baseX: ((i * 4517 + 211) % 100) / 100 * width,
        baseY: ((i * 3301 + 743) % 100) / 100 * height,
        size: 40 + (i % 6) * 25,
        speed: 0.2 + (i % 4) * 0.1,
        phase: (i * 97.3) % (Math.PI * 2),
        hue: i % 3 === 0 ? 38 : i % 3 === 1 ? 280 : 220,
      })),
    [count, width, height],
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {orbs.map((orb) => {
        const driftX = noise2D(`bk-x-${orb.id}`, frame * 0.003 * orb.speed, orb.id) * 80;
        const driftY = noise2D(`bk-y-${orb.id}`, orb.id, frame * 0.002 * orb.speed) * 50;
        const pulse = interpolate(
          Math.sin(frame * 0.04 + orb.phase),
          [-1, 1],
          [0.06, 0.18],
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

const Sparkles: React.FC<{ count?: number }> = ({ count = 45 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        baseX: ((i * 7919 + 331) % 100) / 100 * width,
        baseY: ((i * 6271 + 127) % 100) / 100 * height,
        size: 2 + (i % 5) * 1.5,
        speed: 0.3 + (i % 3) * 0.25,
        phase: (i * 137.5) % (Math.PI * 2),
        isGold: i % 3 === 0,
        isBright: i % 7 === 0,
      })),
    [count, width, height],
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p) => {
        const floatX = noise2D(`sp-x-${p.id}`, frame * 0.008 * p.speed, p.id) * 30;
        const floatY = noise2D(`sp-y-${p.id}`, p.id, frame * 0.006 * p.speed) * 25 - frame * 0.12;
        const twinkle = interpolate(
          Math.sin(frame * 0.15 + p.phase),
          [-1, 1],
          [0, 1],
        );
        const color = p.isGold ? COLORS.softGold : COLORS.warmCream;
        const actualSize = p.isBright ? p.size * 1.8 : p.size;
        const glowRadius = p.isBright ? actualSize * 5 : actualSize * 3;
        const opacity = p.isBright ? twinkle * 0.95 : twinkle * 0.75;

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
                  ? `rgba(212,175,115,${opacity * 0.6})`
                  : `rgba(255,255,255,${opacity * 0.5})`
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
  const breath = interpolate(Math.sin(frame * 0.04), [-1, 1], [0.5, 0.72]);

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
// Text block component — used for hook, body lines, and CTA
// ---------------------------------------------------------------------------

const TextBlock: React.FC<{
  text: string;
  startFrame: number;
  holdFrames?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: string;
  yPosition: number;
  withGlow?: boolean;
  withBg?: boolean;
}> = ({
  text,
  startFrame,
  holdFrames,
  fontSize = 40,
  color = COLORS.warmCream,
  fontFamily = "Helvetica, Arial, sans-serif",
  fontWeight = 500,
  fontStyle = "normal",
  yPosition,
  withGlow = false,
  withBg = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (frame < startFrame) return null;

  // Spring pop-in
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const scale = interpolate(progress, [0, 1], [1.2, 1.0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  // Optional hold duration — fade out after hold
  let holdFade = 1;
  if (holdFrames !== undefined) {
    holdFade = interpolate(
      frame,
      [startFrame + holdFrames - 10, startFrame + holdFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  }

  // Always fade before end for loop
  const loopFade = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames - 10],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Glow pulse for hook text
  const glowFrame = Math.max(0, frame - startFrame - 12);
  const glowIntensity = withGlow
    ? interpolate(Math.sin(glowFrame * 0.06), [-1, 1], [6, 16])
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: yPosition,
        left: 0,
        right: 0,
        textAlign: "center",
        padding: "0 55px",
        opacity: opacity * holdFade * loopFade,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: withBg ? "14px 30px" : "0",
          borderRadius: withBg ? 12 : 0,
          backgroundColor: withBg ? "rgba(0,0,0,0.45)" : "transparent",
        }}
      >
        <span
          style={{
            color,
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            lineHeight: 1.35,
            textShadow: withGlow
              ? `0 0 ${glowIntensity}px rgba(212,175,115,0.7), 0 0 ${glowIntensity * 2}px rgba(212,175,115,0.3)`
              : undefined,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Gold divider line
// ---------------------------------------------------------------------------

const GoldLine: React.FC<{ startFrame: number; yPosition: number }> = ({
  startFrame,
  yPosition,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (frame < startFrame) return null;

  const width = interpolate(
    spring({ frame: frame - startFrame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [0, 100],
  );

  const loopFade = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames - 10],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        top: yPosition,
        left: "50%",
        transform: "translateX(-50%)",
        width,
        height: 2,
        backgroundColor: COLORS.softGold,
        opacity: 0.5 * loopFade,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

export const KenBurns: React.FC<KenBurnsProps> = ({
  imagePath,
  overlayText,
  bodyLines,
  cta,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const hasContent = overlayText || (bodyLines && bodyLines.length > 0);

  // --- Timing layout ---
  // Hook:  frame 10 → hold ~55 frames (~1.8s)
  // Body lines: stagger from frame 65, each holds ~50 frames
  // CTA: appears after last body line
  const hookStart = 10;
  const hookHold = 55;
  const bodyStart = hookStart + hookHold;
  const bodyLineHold = 50;
  const bodyCount = bodyLines?.length ?? 0;
  const ctaStart = bodyStart + bodyCount * bodyLineHold + 5;

  // --- Ken Burns — slow continuous zoom-in with gentle drift ---
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.16], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });
  const panX = noise2D("pan-x", frame * 0.002, 0) * 1.8;
  const panY = noise2D("pan-y", 0, frame * 0.0015) * 1.2;

  // --- Loop fades ---
  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // --- Warmth shift ---
  const warmth = interpolate(Math.sin(frame * 0.015), [-1, 1], [0, 10]);

  // --- Darken image slightly when text content is present ---
  const imgBrightness = hasContent ? 0.65 : 1.0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0612" }}>
      {/* Image layer */}
      <AbsoluteFill
        style={{
          opacity: fadeIn * fadeOut,
          transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
          filter: `saturate(1.12) brightness(${imgBrightness}) sepia(${warmth}%)`,
        }}
      >
        <Img
          src={imagePath}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Gradient overlay for text readability */}
      {hasContent && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(10,6,18,0) 0%, rgba(10,6,18,0.1) 40%, rgba(10,6,18,0.6) 65%, rgba(10,6,18,0.8) 100%)",
            opacity: fadeIn * fadeOut,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Bokeh orbs */}
      <BokehOrbs count={12} />

      {/* Sparkles */}
      <Sparkles count={45} />

      {/* Breathing vignette */}
      <BreathingVignette />

      {/* --- Text content --- */}

      {/* Hook text — big, gold, with glow + background pill (lower third) */}
      {overlayText && (
        <TextBlock
          text={overlayText}
          startFrame={hookStart}
          holdFrames={bodyCount > 0 ? hookHold : undefined}
          fontSize={58}
          color={COLORS.softGold}
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontWeight={700}
          yPosition={1100}
          withGlow
          withBg
        />
      )}

      {/* Gold divider after hook */}
      {bodyCount > 0 && <GoldLine startFrame={hookStart + 20} yPosition={1190} />}

      {/* Body lines — staggered, each replaces the previous */}
      {bodyLines?.map((line, i) => {
        const lineStart = bodyStart + i * bodyLineHold;
        return (
          <TextBlock
            key={i}
            text={line}
            startFrame={lineStart}
            holdFrames={bodyLineHold}
            fontSize={38}
            color={COLORS.warmCream}
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight={400}
            yPosition={1240}
            withBg
          />
        );
      })}

      {/* CTA — dusty rose, italic */}
      {cta && (
        <TextBlock
          text={cta}
          startFrame={ctaStart}
          fontSize={30}
          color={COLORS.dustyRose}
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontWeight={500}
          fontStyle="italic"
          yPosition={1370}
        />
      )}

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity:
            interpolate(frame, [35, 50], [0, 0.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }) * fadeOut,
          color: COLORS.softGold,
          fontSize: 22,
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
