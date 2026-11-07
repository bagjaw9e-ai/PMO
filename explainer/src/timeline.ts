export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const AUDIO_SECONDS = 73.665306;
export const TOTAL_FRAMES = 2210;

export type Pose =
  | "idle"
  | "walk"
  | "point"
  | "think"
  | "explain"
  | "nod"
  | "celebrate";

export type StickTone = "black" | "red";

export type SceneDef = {
  id: string;
  name: string;
  from: number;
  durationInFrames: number;
  pose: Pose;
  stick: StickTone;
};

// Sentence boundaries come from the narration in public/audio.mp3.
// Edit `from` and `durationInFrames` to resync a scene. Frames are 30 fps.
export const SCENES: readonly SceneDef[] = [
  // 0.00s–4.72s  Jangan pernah menikah...
  {
    id: "warning",
    name: "warning",
    from: 0,
    durationInFrames: 142,
    pose: "point",
    stick: "red",
  },
  // 4.72s–11.86s  Fisiknya gagah, sirkuit otak rusak
  {
    id: "cracked-circuit",
    name: "cracked-circuit",
    from: 142,
    durationInFrames: 214,
    pose: "idle",
    stick: "black",
  },
  // 11.86s–18.00s  Kamar sendiri, nafsu tak terkendali
  {
    id: "uncontrolled",
    name: "uncontrolled",
    from: 356,
    durationInFrames: 184,
    pose: "idle",
    stick: "red",
  },
  // 18.00s–23.26s  Visual cortex terbiasa ilusi
  {
    id: "visual-cortex",
    name: "visual-cortex",
    from: 540,
    durationInFrames: 158,
    pose: "think",
    stick: "red",
  },
  // 23.26s–27.36s  Reseptor dopamin tumpul
  {
    id: "dopamine",
    name: "dopamine",
    from: 698,
    durationInFrames: 123,
    pose: "idle",
    stick: "black",
  },
  // 27.36s–36.90s  Kontras, gairah nyata mati
  {
    id: "contrast",
    name: "contrast",
    from: 821,
    durationInFrames: 286,
    pose: "explain",
    stick: "red",
  },
  // 36.90s–41.02s  Prefrontal cortex terinfeksi
  {
    id: "prefrontal",
    name: "prefrontal",
    from: 1107,
    durationInFrames: 124,
    pose: "think",
    stick: "red",
  },
  // 41.02s–45.68s  Empati mati, suami dingin
  {
    id: "empathy",
    name: "empathy",
    from: 1231,
    durationInFrames: 139,
    pose: "idle",
    stick: "black",
  },
  // 45.68s–53.68s  Marah, lari ke layar HP
  {
    id: "amygdala",
    name: "amygdala",
    from: 1370,
    durationInFrames: 240,
    pose: "walk",
    stick: "red",
  },
  // 53.68s–59.20s  Pernikahan tidak otomatis mengubah
  {
    id: "no-naive",
    name: "no-naive",
    from: 1610,
    durationInFrames: 166,
    pose: "nod",
    stick: "black",
  },
  // 59.20s–62.92s  Pemimpin vs budak birahi
  {
    id: "leader",
    name: "leader",
    from: 1776,
    durationInFrames: 112,
    pose: "walk",
    stick: "red",
  },
  // 62.92s–73.67s  Berhenti, sambung ulang saraf
  {
    id: "rewire",
    name: "rewire",
    from: 1888,
    durationInFrames: 322,
    pose: "celebrate",
    stick: "red",
  },
];

const covered = SCENES.reduce((sum, scene) => sum + scene.durationInFrames, 0);

if (covered !== TOTAL_FRAMES) {
  throw new Error(`Timeline covers ${covered} frames, expected ${TOTAL_FRAMES}`);
}

SCENES.forEach((scene, index) => {
  const expectedFrom =
    index === 0 ? 0 : SCENES[index - 1].from + SCENES[index - 1].durationInFrames;
  if (scene.from !== expectedFrom) {
    throw new Error(`Scene ${scene.id} starts at ${scene.from}, expected ${expectedFrom}`);
  }
});
