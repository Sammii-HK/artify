/**
 * Remotion Entry Point — registers all compositions.
 */

import React from "react";
import { Composition, registerRoot } from "remotion";
import { CarouselRecap } from "./CarouselRecap";
import { KenBurns } from "./KenBurns";
import { AnimatedTextSlide } from "./AnimatedTextSlide";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CarouselRecap"
        component={CarouselRecap as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={450} // 15s at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          slides: [] as string[],
          heading: "",
        }}
      />
      <Composition
        id="KenBurns"
        component={KenBurns as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={270} // 9s at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          imagePath: "",
          overlayText: "",
        }}
      />
      <Composition
        id="KenBurnsStory"
        component={KenBurns as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={210} // 7s at 30fps — shorter for stories vs 9s reels
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          imagePath: "",
          overlayText: "",
        }}
      />
      <Composition
        id="AnimatedTextSlide"
        component={AnimatedTextSlide as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={180} // 6s at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          heading: "",
          body: [] as string[],
          template: "info",
          backgroundImage: "",
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
