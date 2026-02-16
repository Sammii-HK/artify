/**
 * Animated Text Slide — Engagement Story Composition
 *
 * Animated version of the static text-slide-renderer for Instagram stories.
 * Matches Style B aesthetic (warmCream + watercolour blobs) with animated elements.
 *
 * Features:
 * - Drifting watercolour blobs via noise2D
 * - Gold border draws on over first second (animated strokeDashoffset)
 * - Spring pop-in heading, growing divider, staggered body lines
 * - Template-specific body styling (info, list, numbered, journal)
 * - Ambient sparkle particles
 * - Loop fades at start/end
 *
 * 1080x1920 (9:16), 6s at 30fps = 180 frames.
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TextSlideTemplate = "info" | "list" | "numbered" | "journal";

export interface AnimatedTextSlideProps {
  heading: string;
  body: string[];
  footer?: string;
  template: TextSlideTemplate;
  cta?: string;
}

// ---------------------------------------------------------------------------
// Brand colors — matches text-slide-renderer
// ---------------------------------------------------------------------------

const COLORS = {
  midnightPlum: "#4A3352",
  dustyRose: "#C4929E",
  warmCream: "#F5EDE3",
  softGold: "#D4AF73",
  lavender: "#B8A9C9",
  sage: "#A8B5A0",
};

const WATERMARK = "@sammiispellbound";

// ---------------------------------------------------------------------------
// Drifting watercolour blobs — Style B animated
// ---------------------------------------------------------------------------

interface BlobConfig {
  id: number;
  cx: number;
  cy: number;
  r: number;
  color: string;
  opacity: number;
  speed: number;
}

const WatercolourBlobs: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const blobs: BlobConfig[] = useMemo(
    () => [
      { id: 0, cx: width * 0.2, cy: height * 0.3, r: 280, color: COLORS.lavender, opacity: 0.12, speed: 0.6 },
      { id: 1, cx: width * 0.75, cy: height * 0.7, r: 240, color: COLORS.dustyRose, opacity: 0.1, speed: 0.5 },
      { id: 2, cx: width * 0.5, cy: height * 0.15, r: 200, color: COLORS.softGold, opacity: 0.08, speed: 0.7 },
      { id: 3, cx: width * 0.3, cy: height * 0.8, r: 180, color: COLORS.sage, opacity: 0.1, speed: 0.55 },
      { id: 4, cx: width * 0.85, cy: height * 0.25, r: 150, color: COLORS.dustyRose, opacity: 0.06, speed: 0.65 },
      { id: 5, cx: width * 0.14, cy: height * 0.55, r: 120, color: COLORS.softGold, opacity: 0.04, speed: 0.45 },
    ],
    [width, height],
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {blobs.map((blob) => {
        const driftX = noise2D(`blob-x-${blob.id}`, frame * 0.003 * blob.speed, blob.id) * 40;
        const driftY = noise2D(`blob-y-${blob.id}`, blob.id, frame * 0.002 * blob.speed) * 30;
        const breathe = interpolate(
          Math.sin(frame * 0.03 + blob.id * 1.2),
          [-1, 1],
          [0.9, 1.1],
        );

        return (
          <div
            key={blob.id}
            style={{
              position: "absolute",
              left: blob.cx + driftX - (blob.r * breathe),
              top: blob.cy + driftY - (blob.r * breathe),
              width: blob.r * 2 * breathe,
              height: blob.r * 2 * breathe,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${blob.color}${Math.round(blob.opacity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Animated gold border — draws on via strokeDashoffset
// ---------------------------------------------------------------------------

const AnimatedGoldBorder: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const margin = 20;
  const rx = 12;
  const w = width - margin * 2;
  const h = height - margin * 2;
  const perimeter = 2 * (w + h) - 8 * rx + 2 * Math.PI * rx; // approximate

  // Draw on over first 30 frames (1 second)
  const drawProgress = interpolate(frame, [0, 30], [perimeter, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Opacity fade in
  const opacity = interpolate(frame, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <rect
        x={margin}
        y={margin}
        width={w}
        height={h}
        rx={rx}
        ry={rx}
        fill="none"
        stroke={COLORS.softGold}
        strokeWidth={3}
        strokeDasharray={perimeter}
        strokeDashoffset={drawProgress}
        opacity={opacity}
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Sparkles — lighter version for text slides (15 particles)
// ---------------------------------------------------------------------------

const Sparkles: React.FC<{ count?: number }> = ({ count = 15 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        baseX: ((i * 7919 + 331) % 100) / 100 * width,
        baseY: ((i * 6271 + 127) % 100) / 100 * height,
        size: 2 + (i % 4) * 1.2,
        speed: 0.2 + (i % 3) * 0.15,
        phase: (i * 137.5) % (Math.PI * 2),
        isGold: i % 2 === 0,
      })),
    [count, width, height],
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p) => {
        const floatX = noise2D(`ts-x-${p.id}`, frame * 0.006 * p.speed, p.id) * 20;
        const floatY = noise2D(`ts-y-${p.id}`, p.id, frame * 0.004 * p.speed) * 15;
        const twinkle = interpolate(
          Math.sin(frame * 0.12 + p.phase),
          [-1, 1],
          [0, 1],
        );
        const color = p.isGold ? COLORS.softGold : COLORS.warmCream;
        const opacity = twinkle * 0.6;

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.baseX + floatX,
              top: p.baseY + floatY,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity,
              boxShadow: `0 0 ${p.size * 3}px ${p.size * 1.5}px ${
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
// Body line renderers — template-specific
// ---------------------------------------------------------------------------

const InfoBody: React.FC<{ lines: string[]; startFrame: number }> = ({ lines, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loopFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      {lines.map((line, i) => {
        const lineStart = startFrame + i * 10;
        const progress = spring({
          frame: frame - lineStart,
          fps,
          config: { damping: 14, stiffness: 160 },
        });

        return (
          <div
            key={i}
            style={{
              textAlign: "center",
              padding: "0 60px",
              opacity: progress * loopFade,
              transform: `translateY(${(1 - progress) * 15}px)`,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                color: COLORS.midnightPlum,
                fontSize: 32,
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: 400,
                lineHeight: 1.5,
                opacity: 0.85,
              }}
            >
              {line}
            </span>
          </div>
        );
      })}
    </>
  );
};

const ListBody: React.FC<{ lines: string[]; startFrame: number }> = ({ lines, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loopFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      {lines.map((line, i) => {
        const lineStart = startFrame + i * 10;
        const progress = spring({
          frame: frame - lineStart,
          fps,
          config: { damping: 14, stiffness: 160 },
        });

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              padding: "0 90px",
              opacity: progress * loopFade,
              transform: `translateX(${(1 - progress) * 20}px)`,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                color: COLORS.softGold,
                fontSize: 28,
                marginRight: 14,
                flexShrink: 0,
              }}
            >
              &#x2726;
            </span>
            <span
              style={{
                color: COLORS.midnightPlum,
                fontSize: 30,
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: 400,
                lineHeight: 1.45,
                opacity: 0.85,
              }}
            >
              {line}
            </span>
          </div>
        );
      })}
    </>
  );
};

const NumberedBody: React.FC<{ lines: string[]; startFrame: number }> = ({ lines, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loopFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      {lines.map((line, i) => {
        const lineStart = startFrame + i * 10;
        const progress = spring({
          frame: frame - lineStart,
          fps,
          config: { damping: 14, stiffness: 160 },
        });

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              padding: "0 80px",
              opacity: progress * loopFade,
              transform: `translateY(${(1 - progress) * 15}px)`,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: `${COLORS.softGold}4d`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: COLORS.softGold,
                  fontSize: 24,
                  fontFamily: "Cormorant Garamond, Georgia, serif",
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
            </div>
            <span
              style={{
                color: COLORS.midnightPlum,
                fontSize: 28,
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: 400,
                lineHeight: 1.45,
                opacity: 0.85,
              }}
            >
              {line}
            </span>
          </div>
        );
      })}
    </>
  );
};

const JournalBody: React.FC<{ lines: string[]; startFrame: number }> = ({ lines, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loopFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      {lines.map((line, i) => {
        const lineStart = startFrame + i * 10;
        const progress = spring({
          frame: frame - lineStart,
          fps,
          config: { damping: 14, stiffness: 160 },
        });

        return (
          <div
            key={i}
            style={{
              padding: "0 90px",
              opacity: progress * loopFade,
              transform: `translateY(${(1 - progress) * 12}px)`,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                color: COLORS.midnightPlum,
                fontSize: 28,
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 1.5,
                opacity: 0.8,
              }}
            >
              &mdash; {line}
            </span>
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

export const AnimatedTextSlide: React.FC<AnimatedTextSlideProps> = ({
  heading,
  body,
  footer,
  template,
  cta,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // --- Loop fades ---
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // --- Heading spring pop-in at frame 8 ---
  const headingProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 12, stiffness: 200 },
  });
  const headingScale = interpolate(headingProgress, [0, 1], [1.2, 1.0]);
  const headingLoopFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // --- Divider grows from center at frame 18 ---
  const dividerProgress = spring({
    frame: frame - 18,
    fps,
    config: { damping: 18, stiffness: 100 },
  });
  const dividerWidth = interpolate(dividerProgress, [0, 1], [0, 160]);

  // --- Footer / CTA spring pop-in at frame 120 ---
  const footerText = cta || footer;
  const footerProgress = spring({
    frame: frame - 120,
    fps,
    config: { damping: 14, stiffness: 160 },
  });
  const footerGlow = interpolate(
    Math.sin(Math.max(0, frame - 130) * 0.06),
    [-1, 1],
    [4, 10],
  );

  // --- Watermark fade in at frame 40 ---
  const watermarkOpacity = interpolate(frame, [40, 55], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const watermarkLoopFade = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // --- Body lines start at frame 30 ---
  const bodyStartFrame = 30;

  const BodyComponent = {
    info: InfoBody,
    list: ListBody,
    numbered: NumberedBody,
    journal: JournalBody,
  }[template];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.warmCream,
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* Drifting watercolour blobs */}
      <WatercolourBlobs />

      {/* Animated gold border */}
      <AnimatedGoldBorder />

      {/* Sparkles */}
      <Sparkles count={15} />

      {/* --- Text content --- */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 280,
        }}
      >
        {/* Heading */}
        <div
          style={{
            textAlign: "center",
            padding: "0 60px",
            opacity: headingProgress * headingLoopFade,
            transform: `scale(${headingScale})`,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              color: COLORS.midnightPlum,
              fontSize: 52,
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {heading}
          </span>
        </div>

        {/* Gold divider line */}
        <div
          style={{
            width: dividerWidth,
            height: 2,
            backgroundColor: COLORS.softGold,
            opacity: 0.7 * headingLoopFade,
            marginBottom: 30,
          }}
        />

        {/* Journal subtitle */}
        {template === "journal" && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 20,
              opacity: interpolate(
                spring({ frame: frame - 22, fps, config: { damping: 15 } }),
                [0, 1],
                [0, 0.5],
              ) * headingLoopFade,
            }}
          >
            <span
              style={{
                color: COLORS.midnightPlum,
                fontSize: 24,
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              Grab your journal and reflect
            </span>
          </div>
        )}

        {/* Body lines — template-specific */}
        <div style={{ width: "100%", marginTop: 10 }}>
          <BodyComponent lines={body} startFrame={bodyStartFrame} />
        </div>
      </AbsoluteFill>

      {/* Footer / CTA */}
      {footerText && (
        <div
          style={{
            position: "absolute",
            bottom: 180,
            left: 0,
            right: 0,
            textAlign: "center",
            padding: "0 60px",
            opacity: footerProgress * headingLoopFade,
          }}
        >
          <span
            style={{
              color: COLORS.softGold,
              fontSize: 28,
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontStyle: "italic",
              fontWeight: 500,
              textShadow: frame > 130
                ? `0 0 ${footerGlow}px rgba(212,175,115,0.3)`
                : "none",
            }}
          >
            {footerText}
          </span>
        </div>
      )}

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: watermarkOpacity * watermarkLoopFade,
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
