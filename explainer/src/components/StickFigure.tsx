import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Pose } from "../timeline";
import { COLOR, clamp } from "../theme";

export type JointOverride = Partial<{
  torso: number;
  head: number;
  lArm: number;
  rArm: number;
  lFore: number;
  rFore: number;
  lThigh: number;
  rThigh: number;
  lShin: number;
  rShin: number;
}>;

type Mood = "neutral" | "angry" | "cold" | "hurt";

type StickFigureProps = {
  pose: Pose;
  tone: "black" | "red";
  x: number;
  y: number;
  scale?: number;
  facing?: 1 | -1;
  energy?: number;
  hair?: boolean;
  mood?: Mood;
  overrides?: JointOverride;
};

const REST = {
  torso: 0,
  head: 0,
  lArm: 16,
  rArm: -16,
  lFore: 10,
  rFore: -8,
  lThigh: 8,
  rThigh: -8,
  lShin: -4,
  rShin: 4,
};

const POSES: Record<Pose, typeof REST> = {
  idle: REST,
  walk: { ...REST, torso: 2 },
  point: {
    torso: -8,
    head: -6,
    lArm: 18,
    rArm: 74,
    lFore: 8,
    rFore: 8,
    lThigh: 8,
    rThigh: -8,
    lShin: -4,
    rShin: 4,
  },
  think: {
    torso: 6,
    head: 14,
    lArm: 20,
    rArm: -118,
    lFore: 8,
    rFore: 86,
    lThigh: 8,
    rThigh: -8,
    lShin: -4,
    rShin: 4,
  },
  explain: {
    torso: -3,
    head: -2,
    lArm: -74,
    rArm: 74,
    lFore: -18,
    rFore: 18,
    lThigh: 9,
    rThigh: -9,
    lShin: -4,
    rShin: 4,
  },
  nod: REST,
  celebrate: {
    torso: -6,
    head: -8,
    lArm: -152,
    rArm: 152,
    lFore: -8,
    rFore: 8,
    lThigh: -12,
    rThigh: 14,
    lShin: 8,
    rShin: 6,
  },
};

const endOf = (x: number, y: number, angle: number, length: number) => {
  const rad = (angle * Math.PI) / 180;
  return {
    x: x + Math.sin(rad) * length,
    y: y + Math.cos(rad) * length,
  };
};

const Bone: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  core: string;
  vein: string;
  dash: number;
  width?: number;
}> = ({ x1, y1, x2, y2, core, vein, dash, width = 11 }) => {
  return (
    <>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={core}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={vein}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeDasharray="18 7"
        strokeDashoffset={dash}
      />
    </>
  );
};

const Eyes: React.FC<{ mood: Mood; frame: number; vein: string }> = ({
  mood,
  frame,
  vein,
}) => {
  const blink = Math.sin(frame / 11) > 0.96 ? 0.2 : 1;
  if (mood === "angry") {
    return (
      <g stroke={vein} strokeWidth={3} strokeLinecap="round" fill="none">
        <line x1={-16} y1={-10} x2={-5} y2={-3} />
        <line x1={16} y1={-10} x2={5} y2={-3} />
        <line x1={-7} y1={8} x2={7} y2={6} />
      </g>
    );
  }
  if (mood === "cold") {
    return (
      <g stroke={vein} strokeWidth={3} strokeLinecap="round">
        <line x1={-14} y1={-2} x2={-4} y2={-2} opacity={blink} />
        <line x1={4} y1={-2} x2={14} y2={-2} opacity={blink} />
      </g>
    );
  }
  if (mood === "hurt") {
    return (
      <g stroke={vein} strokeWidth={3} strokeLinecap="round" fill="none">
        <line x1={-14} y1={-1} x2={-4} y2={3} />
        <line x1={4} y1={3} x2={14} y2={-1} />
        <path d="M -6 10 Q 0 6 6 10" />
      </g>
    );
  }
  return (
    <g fill={vein}>
      <circle cx={-9} cy={-2} r={2.4 * blink} />
      <circle cx={9} cy={-2} r={2.4 * blink} />
    </g>
  );
};

export const StickFigure: React.FC<StickFigureProps> = ({
  pose,
  tone,
  x,
  y,
  scale = 1,
  facing = 1,
  energy = 1,
  hair = false,
  mood = "neutral",
  overrides,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140, mass: 0.75 },
  });
  const gesture = spring({
    frame,
    fps,
    config: { damping: 11, stiffness: 170, mass: 0.6 },
  });
  const target = POSES[pose];
  const walking = pose === "walk";
  const cycle = (frame / fps) * Math.PI * 2 * 1.65;
  const swing = Math.sin(cycle);
  const idleSway = walking ? swing * 4 : Math.sin(frame / 13) * 5.5 * energy;
  const breathe = Math.sin(frame / 17) * 4 * energy;

  let torso = target.torso + (walking ? 0 : idleSway * 0.85);
  let head = target.head + (walking ? -swing * 4 : -idleSway * 0.4);
  let lArm = target.lArm;
  let rArm = target.rArm;
  let lFore = target.lFore;
  let rFore = target.rFore;
  let lThigh = target.lThigh;
  let rThigh = target.rThigh;
  let lShin = target.lShin;
  let rShin = target.rShin;
  let bob = breathe;

  if (walking) {
    lThigh = swing * 32 * energy;
    rThigh = -swing * 32 * energy;
    lShin = Math.max(0, -swing) * 38 * energy;
    rShin = Math.max(0, swing) * 38 * energy;
    lArm = -swing * 26 * energy;
    rArm = swing * 26 * energy;
    lFore = 12;
    rFore = -12;
    bob = -Math.abs(Math.cos(cycle)) * 12 * energy;
    torso = swing * 5;
  }

  if (pose === "nod") {
    head += Math.sin(frame / 4.4) * 16 * energy;
  }

  if (pose === "celebrate") {
    const hop = Math.abs(Math.sin(frame / 5.2));
    bob -= hop * 30 * gesture;
    lArm += Math.sin(frame / 6) * 8;
    rArm -= Math.sin(frame / 6) * 8;
  }

  if (pose === "point" || pose === "explain" || pose === "think") {
    rArm += Math.sin(frame / 14) * 3.5 * gesture;
    lArm += Math.sin(frame / 16) * 2.5 * gesture;
  }

  const mix = (posed: number, key: keyof JointOverride) => {
    const override = overrides?.[key];
    const settled = REST[key] + (posed - REST[key]) * settle;
    if (override === undefined) {
      return settled;
    }
    return settled + (override - settled) * settle;
  };

  torso = mix(torso, "torso");
  head = mix(head, "head");
  lArm = mix(lArm, "lArm");
  rArm = mix(rArm, "rArm");
  lFore = mix(lFore, "lFore");
  rFore = mix(rFore, "rFore");
  lThigh = mix(lThigh, "lThigh");
  rThigh = mix(rThigh, "rThigh");
  lShin = mix(lShin, "lShin");
  rShin = mix(rShin, "rShin");
  bob *= settle;

  const core = tone === "red" ? COLOR.stickRed : COLOR.stickBlack;
  const vein = tone === "red" ? COLOR.ember : COLOR.vein;
  const dash = -frame * 1.5;
  const torsoLen = 118;
  const upper = 72;
  const fore = 62;
  const thigh = 86;
  const shin = 78;

  const hipL = { x: -28, y: 8 };
  const hipR = { x: 28, y: 8 };
  const kneeL = endOf(hipL.x, hipL.y, lThigh, thigh);
  const kneeR = endOf(hipR.x, hipR.y, rThigh, thigh);
  const footL = endOf(kneeL.x, kneeL.y, lThigh + lShin, shin);
  const footR = endOf(kneeR.x, kneeR.y, rThigh + rShin, shin);
  const shoulderL = { x: -24, y: -torsoLen + 18 };
  const shoulderR = { x: 24, y: -torsoLen + 18 };
  const elbowL = endOf(shoulderL.x, shoulderL.y, lArm, upper);
  const elbowR = endOf(shoulderR.x, shoulderR.y, rArm, upper);
  const handL = endOf(elbowL.x, elbowL.y, lArm + lFore, fore);
  const handR = endOf(elbowR.x, elbowR.y, rArm + rFore, fore);
  const headY = -torsoLen - 36;

  const pop = interpolate(settle, [0, 1], [0.86, 1], {
    ...clamp,
    output: "perceptual-scale",
  });

  return (
    <g
      transform={`translate(${x} ${y + bob}) scale(${facing * scale * pop} ${scale * pop})`}
    >
      <ellipse cx="0" cy="176" rx="78" ry="14" fill={COLOR.glow} opacity="0.16" />
      <Bone
        x1={hipL.x}
        y1={hipL.y}
        x2={kneeL.x}
        y2={kneeL.y}
        core={core}
        vein={vein}
        dash={dash}
      />
      <Bone
        x1={kneeL.x}
        y1={kneeL.y}
        x2={footL.x}
        y2={footL.y}
        core={core}
        vein={vein}
        dash={dash + 8}
      />
      <Bone
        x1={hipR.x}
        y1={hipR.y}
        x2={kneeR.x}
        y2={kneeR.y}
        core={core}
        vein={vein}
        dash={dash + 4}
      />
      <Bone
        x1={kneeR.x}
        y1={kneeR.y}
        x2={footR.x}
        y2={footR.y}
        core={core}
        vein={vein}
        dash={dash + 12}
      />
      <g transform={`rotate(${torso} 0 0)`}>
        <Bone x1={0} y1={0} x2={0} y2={-torsoLen} core={core} vein={vein} dash={dash} width={12} />
        <Bone
          x1={shoulderL.x}
          y1={shoulderL.y}
          x2={elbowL.x}
          y2={elbowL.y}
          core={core}
          vein={vein}
          dash={dash}
        />
        <Bone
          x1={elbowL.x}
          y1={elbowL.y}
          x2={handL.x}
          y2={handL.y}
          core={core}
          vein={vein}
          dash={dash + 6}
          width={9}
        />
        <Bone
          x1={shoulderR.x}
          y1={shoulderR.y}
          x2={elbowR.x}
          y2={elbowR.y}
          core={core}
          vein={vein}
          dash={dash + 3}
        />
        <Bone
          x1={elbowR.x}
          y1={elbowR.y}
          x2={handR.x}
          y2={handR.y}
          core={core}
          vein={vein}
          dash={dash + 9}
          width={9}
        />
        <g transform={`translate(0 ${headY}) rotate(${head})`}>
          <circle r={36} fill={COLOR.black} stroke={vein} strokeWidth={6} />
          {hair ? (
            <path
              d="M -32 -6 C -18 -62 26 -66 36 -2"
              fill="none"
              stroke={vein}
              strokeWidth={7}
              strokeLinecap="round"
            />
          ) : null}
          <Eyes mood={mood} frame={frame} vein={vein} />
        </g>
        <circle cx={shoulderL.x} cy={shoulderL.y} r={5} fill={vein} />
        <circle cx={shoulderR.x} cy={shoulderR.y} r={5} fill={vein} />
        <circle cx={handL.x} cy={handL.y} r={5} fill={vein} />
        <circle cx={handR.x} cy={handR.y} r={5} fill={vein} />
      </g>
      <circle cx={hipL.x} cy={hipL.y} r={5} fill={vein} />
      <circle cx={hipR.x} cy={hipR.y} r={5} fill={vein} />
      <circle r={6} fill={tone === "red" ? COLOR.hot : COLOR.blood} opacity="0.85" />
    </g>
  );
};
