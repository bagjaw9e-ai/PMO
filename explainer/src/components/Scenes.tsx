import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Bed, Brain, NerveLine, Phone, Rings, Room } from "./Motifs";
import { StickFigure } from "./StickFigure";
import { COLOR, clamp } from "../theme";

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <svg width="100%" height="100%" viewBox="0 0 1080 1920">
      {children}
    </svg>
  );
};

const WarningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phonePop = spring({
    frame,
    fps,
    delay: 6,
    config: { damping: 12, stiffness: 150 },
  });
  const retreat = interpolate(frame, [8, 130], [470, 230], clamp);
  const shake = Math.sin(frame / 3.2) * 8;

  return (
    <Canvas>
      <Phone x={760} y={620} scale={1.15 * phonePop} chaos={1} frame={frame} />
      <ellipse cx={760} cy={860} rx={120} ry={24} fill={COLOR.glow} opacity={0.2} />
      <StickFigure
        pose="point"
        tone="red"
        x={430}
        y={1320}
        scale={1.45}
        facing={1}
        mood="angry"
        overrides={{ head: -10 + shake }}
      />
      <g opacity={0.85}>
        <StickFigure pose="walk" tone="black" x={retreat} y={1500} scale={0.85} facing={-1} />
      </g>
    </Canvas>
  );
};

const CrackedCircuitScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const crack = interpolate(frame, [24, duration - 16], [0, 1], clamp);
  const collapse = interpolate(frame, [70, 150], [0, 1], clamp);
  const brainPop = spring({
    frame,
    fps,
    delay: 4,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <Canvas>
      <g opacity={brainPop} transform={`translate(0 ${(1 - brainPop) * 40})`}>
        <Brain x={540} y={520} scale={2.05} frame={frame} crack={crack} id="cracked" />
      </g>
      <StickFigure
        pose="explain"
        tone="black"
        x={540}
        y={1380}
        scale={1.5}
        mood={collapse > 0.55 ? "hurt" : "neutral"}
        overrides={{
          lArm: interpolate(collapse, [0, 1], [-74, 26], clamp),
          rArm: interpolate(collapse, [0, 1], [74, -22], clamp),
          lFore: interpolate(collapse, [0, 1], [-18, 14], clamp),
          rFore: interpolate(collapse, [0, 1], [18, -12], clamp),
          torso: interpolate(collapse, [0, 1], [-4, 20], clamp),
          head: interpolate(collapse, [0, 1], [-2, 24], clamp),
        }}
      />
    </Canvas>
  );
};

const UncontrolledScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phonePop = spring({
    frame,
    fps,
    delay: 8,
    config: { damping: 12, stiffness: 140 },
  });
  const rub = Math.sin(frame / 3) * 22;
  const pulse = 0.35 + Math.sin(frame / 5) * 0.2;

  return (
    <Canvas>
      <Room x={140} y={420} width={800} height={1080} />
      <Bed x={520} y={1180} scale={0.86} />
      <Phone x={820} y={1360} scale={0.62 * phonePop} chaos={0.85} frame={frame} />
      <ellipse cx={390} cy={1210} rx={64} ry={22} fill={COLOR.glow} opacity={pulse} />
      <StickFigure
        pose="idle"
        tone="red"
        x={390}
        y={1168}
        scale={1.15}
        facing={-1}
        mood="hurt"
        overrides={{
          torso: 4,
          head: 8,
          lArm: 36,
          rArm: 18,
          lFore: 8,
          rFore: 12 + rub * 0.35,
          lThigh: -78,
          rThigh: -96,
          lShin: 86,
          rShin: 104,
        }}
      />
    </Canvas>
  );
};

const VisualCortexScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wild = spring({
    frame,
    fps,
    delay: 8,
    config: { damping: 16, stiffness: 80 },
  });

  return (
    <Canvas>
      <Brain x={540} y={620} scale={2.35} frame={frame} wild={wild} id="visual" />
      {Array.from({ length: 5 }, (_, index) => {
        const angle = frame * 0.04 + index * 1.2;
        const radius = 280 + index * 24;
        return (
          <circle
            key={`illusion-${index}`}
            cx={540 + Math.cos(angle) * radius * 0.72}
            cy={620 + Math.sin(angle * 1.2) * radius * 0.42}
            r={10 + random(`illusion-${index}`) * 22}
            fill="none"
            stroke={COLOR.hot}
            strokeWidth={3}
            opacity={0.35 + wild * 0.4}
          />
        );
      })}
      <StickFigure pose="think" tone="red" x={540} y={1460} scale={1.35} />
    </Canvas>
  );
};

const DopamineScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const night = interpolate(frame, [0, Math.max(1, duration - 8)], [0, 1], clamp);

  return (
    <Canvas>
      <circle cx={820} cy={280} r={54} fill="#3a1018" opacity={0.8} />
      {Array.from({ length: 4 }, (_, index) => {
        const spin = frame * 0.05 + index;
        return (
          <path
            key={`fantasy-${index}`}
            d={`M ${180 + index * 40} ${360 + index * 30} C ${300 + Math.sin(spin) * 80} ${480}, ${620} ${520 + index * 40}, ${760} ${700}`}
            fill="none"
            stroke={COLOR.glow}
            strokeWidth={3}
            opacity={0.25 + night * 0.35}
          />
        );
      })}
      {Array.from({ length: 8 }, (_, index) => {
        const dim = interpolate(frame, [index * 8, index * 8 + 28], [1, 0.12], clamp);
        return (
          <g key={`receptor-${index}`}>
            <circle
              cx={180 + index * 100}
              cy={860}
              r={28}
              fill={COLOR.glow}
              opacity={dim}
            />
            <circle
              cx={180 + index * 100}
              cy={860}
              r={12}
              fill={COLOR.ember}
              opacity={dim * 0.8}
            />
          </g>
        );
      })}
      <StickFigure
        pose="idle"
        tone="black"
        x={540}
        y={1420}
        scale={1.4}
        mood="hurt"
        energy={1 - night * 0.65}
        overrides={{
          torso: 8 + night * 16,
          head: 6 + night * 18,
          lArm: 20,
          rArm: -18,
        }}
      />
    </Canvas>
  );
};

const ContrastScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const fadeBeauty = interpolate(frame, [10, duration * 0.55], [1, 0.18], clamp);
  const nerveAmp = interpolate(frame, [duration * 0.42, duration * 0.82], [26, 0], clamp);

  return (
    <Canvas>
      <Bed x={540} y={1288} />
      <g opacity={fadeBeauty}>
        <ellipse cx={300} cy={1080} rx={90} ry={150} fill={COLOR.glow} opacity={0.16} />
        <StickFigure pose="idle" tone="red" x={300} y={1120} scale={1.2} hair facing={1} />
      </g>
      <StickFigure
        pose="idle"
        tone="black"
        x={760}
        y={1140}
        scale={1.2}
        facing={-1}
        mood="cold"
        energy={0.55}
        overrides={{
          lArm: 18,
          rArm: -14,
          torso: 8,
          head: 12,
        }}
      />
      <NerveLine x1={760} y1={940} x2={980} y2={760} frame={frame} amplitude={nerveAmp} />
      <NerveLine x1={760} y1={990} x2={560} y2={820} frame={frame} amplitude={nerveAmp} phase={1.4} />
      <NerveLine x1={800} y1={1040} x2={1000} y2={1020} frame={frame} amplitude={nerveAmp * 0.6} phase={2.2} />
    </Canvas>
  );
};

const PrefrontalScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const infection = interpolate(frame, [8, Math.max(9, duration - 12)], [0.05, 1], clamp);
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });

  return (
    <Canvas>
      <g opacity={pop}>
        <Brain x={540} y={600} scale={2.3} frame={frame} infection={infection} id="prefrontal" />
      </g>
      <StickFigure
        pose="think"
        tone="red"
        x={540}
        y={1460}
        scale={1.35}
        mood="hurt"
        overrides={{ lArm: -40, lFore: -20 }}
      />
    </Canvas>
  );
};

const EmpathyScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const link = interpolate(frame, [16, Math.max(17, duration - 18)], [1, 0], clamp);
  const nodes = [
    { x: 250, y: 520 },
    { x: 470, y: 430 },
    { x: 690, y: 500 },
    { x: 560, y: 700 },
    { x: 340, y: 730 },
  ];

  return (
    <Canvas>
      {nodes.map((node, index) => {
        const next = nodes[(index + 1) % nodes.length];
        return (
          <line
            key={`link-${index}`}
            x1={node.x}
            y1={node.y}
            x2={next.x}
            y2={next.y}
            stroke={COLOR.glow}
            strokeWidth={3}
            opacity={link * 0.8}
            strokeDasharray={`${link * 80} 40`}
          />
        );
      })}
      {nodes.map((node, index) => (
        <circle
          key={`node-${index}`}
          cx={node.x}
          cy={node.y}
          r={16}
          fill={COLOR.glow}
          opacity={0.2 + link * 0.7}
        />
      ))}
      <StickFigure
        pose="explain"
        tone="red"
        x={300}
        y={1360}
        scale={1.2}
        hair
        facing={1}
        overrides={{ lArm: 12, rArm: 58, rFore: 10 }}
      />
      <StickFigure
        pose="idle"
        tone="black"
        x={780}
        y={1360}
        scale={1.2}
        facing={-1}
        mood="cold"
        energy={0.45}
        overrides={{ torso: 6, head: 8, lArm: 10, rArm: -8 }}
      />
      <line
        x1={430}
        y1={1240}
        x2={430 + link * 220}
        y2={1240}
        stroke={COLOR.hot}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.3 + link * 0.6}
      />
    </Canvas>
  );
};

const AmygdalaScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const handoff = interpolate(frame, [130, 156], [0, 1], clamp);
  const x = interpolate(frame, [140, Math.max(141, duration - 12)], [360, 620], clamp);
  const fog = spring({
    frame: Math.max(0, frame - 150),
    fps,
    config: { damping: 18, stiffness: 80 },
  });

  return (
    <Canvas>
      <ellipse cx={820} cy={980} rx={180 + fog * 40} ry={90} fill={COLOR.glow} opacity={0.08 + fog * 0.16} />
      <Phone x={820} y={760} scale={0.9 + fog * 0.25} chaos={1 - fog * 0.7} frame={frame} />
      <g opacity={1 - handoff}>
        <StickFigure
          pose="explain"
          tone="red"
          x={x}
          y={1360}
          scale={1.4}
          mood="angry"
          energy={1.2}
          overrides={{ lArm: -110, rArm: 110, torso: -8, head: Math.sin(frame / 2.4) * 8 }}
        />
      </g>
      <g opacity={handoff}>
        <StickFigure pose="walk" tone="red" x={x} y={1360} scale={1.4} facing={1} energy={1.15} />
      </g>
    </Canvas>
  );
};

const NoNaiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ringPop = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 11, stiffness: 140 },
  });

  return (
    <Canvas>
      <Rings x={540} y={520} pop={ringPop} />
      {Array.from({ length: 10 }, (_, index) => {
        const jitterX = (random(`static-x-${index}-${Math.floor(frame / 3)}`) - 0.5) * 80;
        const jitterY = (random(`static-y-${index}-${Math.floor(frame / 3)}`) - 0.5) * 70;
        return (
          <line
            key={`static-${index}`}
            x1={760 + jitterX}
            y1={1120 + jitterY}
            x2={760 + jitterX + 16}
            y2={1120 + jitterY - 10}
            stroke={COLOR.glow}
            strokeWidth={2}
            opacity={0.7}
          />
        );
      })}
      <StickFigure pose="nod" tone="red" x={280} y={1320} scale={1.25} hair facing={1} mood="angry" />
      <StickFigure
        pose="idle"
        tone="black"
        x={760}
        y={1360}
        scale={1.3}
        mood="cold"
        energy={0.4}
        overrides={{ torso: 10, head: 12 }}
      />
    </Canvas>
  );
};

const LeaderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const march = interpolate(frame, [0, durationInFrames - 6], [240, 460], clamp);

  return (
    <Canvas>
      <StickFigure pose="walk" tone="red" x={march} y={1180} scale={1.45} energy={1.1} />
      <StickFigure
        pose="idle"
        tone="black"
        x={760}
        y={1320}
        scale={1.15}
        mood="hurt"
        energy={0.4}
        overrides={{
          torso: 16,
          head: 22,
          lArm: 22,
          rArm: 36,
          lFore: 12,
          rFore: 20,
        }}
      />
      {Array.from({ length: 5 }, (_, index) => (
        <circle
          key={`chain-${index}`}
          cx={900}
          cy={1280 + index * 78}
          r={11}
          fill="none"
          stroke={COLOR.glow}
          strokeWidth={3}
        />
      ))}
      <circle cx={900} cy={1688} r={34} fill={COLOR.glow} opacity={0.35 + Math.sin(frame / 8) * 0.1} />
    </Canvas>
  );
};

const RewireScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = interpolate(frame, [100, 132], [0, 1], clamp);
  const heal = spring({
    frame: Math.max(0, frame - 108),
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const paths = [
    { x1: 180, y1: 480, x2: 900, y2: 420 },
    { x1: 140, y1: 700, x2: 940, y2: 640 },
    { x1: 220, y1: 900, x2: 860, y2: 860 },
  ];

  return (
    <Canvas>
      {paths.map((path, index) => {
        const gap = interpolate(heal, [0, 1], [120, 0], clamp);
        const midX = (path.x1 + path.x2) / 2;
        return (
          <g key={`heal-${index}`}>
            <path
              d={`M ${path.x1} ${path.y1} C ${midX - 80} ${path.y1 - 40}, ${midX - gap} ${path.y2 + 30}, ${midX - gap} ${(path.y1 + path.y2) / 2}`}
              fill="none"
              stroke={COLOR.blood}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <path
              d={`M ${midX + gap} ${(path.y1 + path.y2) / 2} C ${midX + gap} ${path.y2 - 20}, ${midX + 90} ${path.y2 + 24}, ${path.x2} ${path.y2}`}
              fill="none"
              stroke={COLOR.glow}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="10 12"
              strokeDashoffset={-frame * 1.4}
              opacity={0.4 + heal * 0.6}
            />
          </g>
        );
      })}
      <g opacity={1 - rise}>
        <StickFigure
          pose="idle"
          tone="black"
          x={540}
          y={1400}
          scale={1.4}
          mood="hurt"
          energy={0.4}
          overrides={{ torso: 18, head: 20, lArm: 16, rArm: -14 }}
        />
      </g>
      <g opacity={rise}>
        <StickFigure pose="celebrate" tone="red" x={540} y={1320} scale={1.5} />
      </g>
    </Canvas>
  );
};

export const SceneBody: React.FC<{ sceneId: string; duration: number }> = ({
  sceneId,
  duration,
}) => {
  switch (sceneId) {
    case "warning":
      return <WarningScene />;
    case "cracked-circuit":
      return <CrackedCircuitScene duration={duration} />;
    case "uncontrolled":
      return <UncontrolledScene />;
    case "visual-cortex":
      return <VisualCortexScene />;
    case "dopamine":
      return <DopamineScene duration={duration} />;
    case "contrast":
      return <ContrastScene duration={duration} />;
    case "prefrontal":
      return <PrefrontalScene duration={duration} />;
    case "empathy":
      return <EmpathyScene duration={duration} />;
    case "amygdala":
      return <AmygdalaScene duration={duration} />;
    case "no-naive":
      return <NoNaiveScene />;
    case "leader":
      return <LeaderScene />;
    case "rewire":
      return <RewireScene />;
    default:
      return null;
  }
};
