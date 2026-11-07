import { Composition } from "remotion";
import { Explainer } from "./Explainer";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./timeline";

export const MyComposition = () => {
  return (
    <Composition
      id="StickmanExplainer"
      component={Explainer}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
