import { interpolate, random } from "remotion";
import { COLOR, clamp } from "../theme";

const LOBE =
  "M -6 62 C -48 66 -78 36 -80 -4 C -108 -8 -104 -58 -62 -74 C -34 -96 8 -78 4 -52 C 8 -86 52 -92 74 -62 C 108 -48 112 6 86 18 C 108 36 86 70 46 72 C 24 86 -2 78 -6 62";

export const Brain: React.FC<{
  x: number;
  y: number;
  scale?: number;
  frame: number;
  crack?: number;
  wild?: number;
  infection?: number;
  id: string;
}> = ({ x, y, scale = 1, frame, crack = 0, wild = 0, infection = 0, id }) => {
  const cracks = [
    "M -20 -20 L -48 18 L -24 36",
    "M 16 -34 L 40 -4 L 22 28",
    "M -6 8 L 10 40 L -8 62",
    "M 34 20 L 62 34",
  ];
  const radius = interpolate(infection, [0, 1], [0, 118], clamp);

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="8" rx="108" ry="86" fill={COLOR.glow} opacity={0.12 + infection * 0.18} />
      <path d={LOBE} fill="#140308" stroke={COLOR.blood} strokeWidth={6} />
      <path d="M 4 -58 C -2 -8 10 28 2 64" fill="none" stroke={COLOR.dim} strokeWidth={3} />
      <path
        d="M -58 -18 C -36 -28 -24 6 -46 28 M -34 -46 C -8 -36 -16 -8 -6 -2 M 28 -40 C 52 -24 40 8 62 4 M 24 -4 C 46 8 36 36 58 28"
        fill="none"
        stroke={COLOR.dim}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {infection > 0.02 ? (
        <g clipPath={`url(#infect-${id})`}>
          <path d={LOBE} fill="#ff1e2a" opacity={0.9} />
        </g>
      ) : null}
      <clipPath id={`infect-${id}`}>
        <circle cx="62" cy="-6" r={radius} />
      </clipPath>
      {cracks.map((d, index) => (
        <path
          key={`crack-${index}`}
          d={d}
          fill="none"
          stroke={COLOR.hot}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={160}
          strokeDashoffset={interpolate(crack, [0, 1], [160, 0], clamp)}
          opacity={crack}
        />
      ))}
      {Array.from({ length: 8 }, (_, index) => {
        const orbit = frame * 0.08 + index * 0.8;
        const reach = (70 + index * 16) * wild;
        const sx = -70 + Math.cos(orbit) * reach;
        const sy = -6 + Math.sin(orbit * 1.35) * reach * 0.72;
        const size = 6 + random(`spark-size-${index}`) * 16;
        return (
          <circle
            key={`spark-${index}`}
            cx={sx}
            cy={sy}
            r={size}
            fill={index % 2 === 0 ? COLOR.glow : COLOR.hot}
            opacity={wild * (0.35 + random(`spark-op-${index}`) * 0.5)}
          />
        );
      })}
    </g>
  );
};

export const Phone: React.FC<{
  x: number;
  y: number;
  scale?: number;
  chaos?: number;
  frame: number;
}> = ({ x, y, scale = 1, chaos = 1, frame }) => {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-78} y={-132} width={156} height={274} rx={22} fill="#100206" stroke={COLOR.glow} strokeWidth={5} />
      <rect x={-60} y={-108} width={120} height={214} rx={10} fill="#2a0810" />
      {Array.from({ length: 7 }, (_, index) => {
        const wobble = Math.sin(frame / 6 + index) * 22 * chaos;
        return (
          <path
            key={`screen-vein-${index}`}
            d={`M ${-46 + index * 14} -86 C ${-8 + wobble} ${-24 + index * 8}, ${18 - wobble} ${36}, ${-28 + index * 9} 86`}
            fill="none"
            stroke={index % 2 === 0 ? COLOR.glow : COLOR.hot}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.35 + chaos * 0.5}
          />
        );
      })}
      <circle cy={124} r={5} fill={COLOR.ember} />
    </g>
  );
};

export const Bed: React.FC<{ x: number; y: number; scale?: number }> = ({
  x,
  y,
  scale = 1,
}) => {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-250} y={36} width={500} height={78} rx={18} fill="#120308" stroke={COLOR.blood} strokeWidth={5} />
      <rect x={-230} y={-8} width={110} height={56} rx={14} fill="#2a0c14" />
      <rect x={130} y={0} width={90} height={46} rx={12} fill="#2a0c14" />
      <path d="M -250 36 H 250" stroke={COLOR.glow} strokeWidth={2} opacity={0.45} />
    </g>
  );
};

export const Rings: React.FC<{ x: number; y: number; pop: number }> = ({ x, y, pop }) => {
  return (
    <g transform={`translate(${x} ${y}) scale(${pop})`} opacity={pop}>
      <circle cx={-22} cy={0} r={54} fill="none" stroke={COLOR.ember} strokeWidth={7} />
      <circle cx={22} cy={0} r={54} fill="none" stroke={COLOR.glow} strokeWidth={7} />
    </g>
  );
};

export const Room: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x,
  y,
  width,
  height,
}) => {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={28}
      fill="#070204"
      stroke={COLOR.blood}
      strokeWidth={4}
      opacity={0.9}
    />
  );
};

export const NerveLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  frame: number;
  amplitude: number;
  phase?: number;
}> = ({ x1, y1, x2, y2, frame, amplitude, phase = 0 }) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + Math.sin(frame / 6 + phase) * amplitude;
  return (
    <path
      d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
      fill="none"
      stroke={COLOR.glow}
      strokeWidth={3}
      strokeLinecap="round"
      opacity={0.8}
    />
  );
};
