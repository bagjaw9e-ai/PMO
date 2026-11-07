import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Audio } from "@remotion/media";
import { Atmosphere } from "./components/Atmosphere";
import { SceneBody } from "./components/Scenes";
import { SCENES, type SceneDef } from "./timeline";
import { clamp } from "./theme";

const SceneStage: React.FC<{ scene: SceneDef }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 130, mass: 0.8 },
  });
  const fadeIn = interpolate(frame, [0, 9], [0, 1], clamp);
  const fadeOut = interpolate(
    frame,
    [Math.max(12, scene.durationInFrames - 12), scene.durationInFrames - 1],
    [1, 0],
    clamp,
  );
  const opacity = Math.min(fadeIn, fadeOut);
  const rise = interpolate(pop, [0, 1], [42, 0], clamp);
  const scale = interpolate(pop, [0, 1], [0.94, 1], {
    ...clamp,
    output: "perceptual-scale",
  });
  const flash = interpolate(frame, [0, 16], [0.42, 0], clamp);

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ translate: `0px ${rise}px`, scale }}>
        <SceneBody sceneId={scene.id} duration={scene.durationInFrames} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(255,32,32,0.8), rgba(255,0,0,0) 60%)",
          opacity: flash,
        }}
      />
    </AbsoluteFill>
  );
};

export const Explainer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050102" }}>
      <Atmosphere />
      <Audio src={staticFile("audio.mp3")} name="Narration" volume={1} />
      {SCENES.map((scene) => (
        <Sequence
          key={scene.id}
          name={scene.name}
          from={scene.from}
          durationInFrames={scene.durationInFrames}
        >
          <SceneStage scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
