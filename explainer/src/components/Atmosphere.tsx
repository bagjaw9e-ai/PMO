import { AbsoluteFill, random, useCurrentFrame, interpolate } from "remotion";
import { SCENES } from "../timeline";
import { COLOR, clamp } from "../theme";

const VEINS = Array.from({ length: 18 }, (_, index) => {
  const x = 40 + random(`vein-x-${index}`) * 1000;
  const y = random(`vein-y-${index}`) * 1700;
  const len = 220 + random(`vein-len-${index}`) * 520;
  const bend = (random(`vein-bend-${index}`) - 0.5) * 340;
  const depth = 0.18 + random(`vein-depth-${index}`) * 0.7;
  return { index, x, y, len, bend, depth };
});

export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneIndex = Math.max(
    0,
    SCENES.findIndex(
      (scene) => frame >= scene.from && frame < scene.from + scene.durationInFrames,
    ),
  );
  const glowX = interpolate(sceneIndex, [0, 11], [34, 68], clamp);
  const glowY = interpolate(sceneIndex % 2 === 0 ? 0 : 1, [0, 1], [36, 58], clamp);
  const pulse = 0.55 + Math.sin(frame / 18) * 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        <defs>
          <radialGradient id="room-glow" cx={`${glowX}%`} cy={`${glowY}%`} r="68%">
            <stop offset="0%" stopColor="#4a0a14" stopOpacity={pulse} />
            <stop offset="46%" stopColor="#1a0509" />
            <stop offset="100%" stopColor={COLOR.bg} />
          </radialGradient>
          <filter id="vein-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <radialGradient id="vignette" cx="50%" cy="45%" r="70%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#room-glow)" />
        <g filter="url(#vein-blur)">
          {VEINS.map((vein) => {
            const sway = Math.sin(frame / (18 + vein.index) + vein.index) * 18;
            const d = `M ${vein.x} ${vein.y} C ${vein.x + vein.bend} ${vein.y + vein.len * 0.33}, ${vein.x - vein.bend * 0.55 + sway} ${vein.y + vein.len * 0.68}, ${vein.x + vein.bend * 0.15} ${vein.y + vein.len}`;
            return (
              <path
                key={`vein-${vein.index}`}
                d={d}
                fill="none"
                stroke={vein.depth > 0.55 ? COLOR.glow : COLOR.blood}
                strokeWidth={vein.depth > 0.6 ? 3.2 : 1.6}
                strokeLinecap="round"
                strokeDasharray={`${28 + vein.depth * 50} ${70 + vein.depth * 40}`}
                strokeDashoffset={-frame * (0.7 + vein.depth)}
                opacity={0.16 + vein.depth * 0.38}
              />
            );
          })}
        </g>
        <ellipse
          cx="540"
          cy="1710"
          rx="390"
          ry="28"
          fill="#ff1a24"
          opacity={0.08 + Math.sin(frame / 20) * 0.03}
        />
        <rect width="1080" height="1920" fill="url(#vignette)" />
      </svg>
    </AbsoluteFill>
  );
};
