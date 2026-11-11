import { clamp, lerp } from "./math.js";

/**
 * Edit scene timing here. Times are seconds and line up with audio.mp3.
 * The draw functions live in js/scenes.js, keyed by id.
 */
export const BASE_W = 1080;
export const BASE_H = 1920;
export const TRANSITION = 0.5;
export const AUDIO_FALLBACK = 73.665;

export const SCENES = [
  { id: 1, start: 0, end: 4 },
  { id: 2, start: 4, end: 11 },
  { id: 3, start: 11, end: 18 },
  { id: 4, start: 18, end: 23 },
  { id: 5, start: 23, end: 27 },
  { id: 6, start: 27, end: 36 },
  { id: 7, start: 36, end: 41 },
  { id: 8, start: 41, end: 45 },
  { id: 9, start: 45, end: 53 },
  { id: 10, start: 53, end: 58 },
  { id: 11, start: 58, end: 63 },
  { id: 12, start: 63, end: 74 },
];

export const WHOOSH_TIMES = [0.06, 4, 11, 18, 23, 27, 31.5, 36, 41, 45, 49.35, 53, 58, 63];

export const GLITCH_TIMES = [0.08, 4.02, 7.35, 11.02, 15.4, 18.02, 21.2, 23.02, 27.02, 31.52, 36.02, 41.02, 43.2, 45.02, 46.4, 49.38, 53.02, 58.02, 63.02];

function cue(t, type, gain) {
  return { t, type, gain };
}

export const SFX_CUES = [
  cue(4, "whoosh", 0.28),
  cue(4.03, "impact", 0.34),
  cue(4.05, "glitch", 0.16),
  cue(7.35, "crackle", 0.32),
  cue(7.38, "glitch", 0.14),
  cue(11, "whoosh", 0.26),
  cue(11.03, "impact", 0.3),
  cue(11.06, "glitch", 0.14),
  cue(15.4, "glitch", 0.12),
  cue(18, "whoosh", 0.24),
  cue(18.03, "impact", 0.26),
  cue(18.05, "glitch", 0.18),
  cue(21.2, "glitch", 0.12),
  cue(23, "whoosh", 0.22),
  cue(23.03, "impact", 0.24),
  cue(25.2, "spark", 0.1),
  cue(26.1, "spark", 0.08),
  cue(27, "whoosh", 0.24),
  cue(27.03, "impact", 0.28),
  cue(31.5, "whoosh", 0.22),
  cue(31.53, "impact", 0.3),
  cue(31.55, "glitch", 0.12),
  cue(36, "whoosh", 0.22),
  cue(36.03, "impact", 0.26),
  cue(36.05, "glitch", 0.12),
  cue(39.2, "crackle", 0.26),
  cue(41, "whoosh", 0.2),
  cue(41.03, "impact", 0.22),
  cue(43.18, "impact", 0.28),
  cue(43.2, "glitch", 0.2),
  cue(45, "whoosh", 0.24),
  cue(45.03, "impact", 0.32),
  cue(46.4, "impact", 0.3),
  cue(46.42, "glitch", 0.16),
  cue(49.35, "whoosh", 0.32),
  cue(49.38, "impact", 0.3),
  cue(53, "whoosh", 0.26),
  cue(53.03, "impact", 0.28),
  cue(55.2, "whoosh", 0.16),
  cue(58, "whoosh", 0.24),
  cue(58.03, "impact", 0.3),
  cue(63, "whoosh", 0.2),
  cue(63.04, "impact", 0.18),
  cue(66.4, "spark", 0.16),
  cue(68.6, "spark", 0.14),
  cue(70.8, "spark", 0.12),
  cue(72.4, "spark", 0.1),
];

const AMBIENT = {
  1: { buzz: 0.05, buzzCutoff: 280, crackle: 0.02, heartBpm: 66, heartGain: 0.16 },
  2: { buzz: 0.065, buzzCutoff: 340, crackle: 0.055, heartBpm: 0, heartGain: 0 },
  3: { buzz: 0.045, buzzCutoff: 300, crackle: 0.028, heartBpm: 96, heartGain: 0.2 },
  4: { buzz: 0.07, buzzCutoff: 420, crackle: 0.04, heartBpm: 0, heartGain: 0 },
  5: { buzz: 0.03, buzzCutoff: 220, crackle: 0.035, heartBpm: 58, heartGain: 0.11 },
  6: { buzz: 0.036, buzzCutoff: 240, crackle: 0.02, heartBpm: 62, heartGain: 0.13 },
  7: { buzz: 0.08, buzzCutoff: 380, crackle: 0.06, heartBpm: 74, heartGain: 0.1 },
  8: { buzz: 0.016, buzzCutoff: 180, crackle: 0.004, heartBpm: 46, heartGain: 0.07 },
  9: { buzz: 0.055, buzzCutoff: 320, crackle: 0.03, heartBpm: 104, heartGain: 0.18 },
  10: { buzz: 0.032, buzzCutoff: 240, crackle: 0.012, heartBpm: 70, heartGain: 0.1 },
  11: { buzz: 0.04, buzzCutoff: 260, crackle: 0.02, heartBpm: 0, heartGain: 0 },
  12: { buzz: 0.04, buzzCutoff: 240, crackle: 0.012, heartBpm: 56, heartGain: 0.09 },
};

export function sceneAt(t) {
  let current = SCENES[0];
  for (const scene of SCENES) {
    if (t >= scene.start) current = scene;
  }
  return current;
}

export function sceneProgress(t, scene = sceneAt(t)) {
  return clamp((t - scene.start) / (scene.end - scene.start));
}

export function ambientAt(t) {
  const scene = sceneAt(t);
  const p = sceneProgress(t, scene);
  const ambient = { ...AMBIENT[scene.id] };

  if (scene.id === 5) {
    ambient.buzz = lerp(0.04, 0.012, p);
    ambient.heartGain = lerp(0.12, 0.05, p);
  }
  if (scene.id === 9 && p > 0.58) {
    const k = clamp((p - 0.58) / 0.42);
    ambient.heartBpm = lerp(104, 52, k);
    ambient.heartGain = lerp(0.18, 0.05, k);
    ambient.buzz = lerp(0.055, 0.018, k);
    ambient.buzzCutoff = lerp(320, 160, k);
  }
  if (scene.id === 12) {
    ambient.crackle = lerp(0.028, 0.003, p);
    ambient.buzz = lerp(0.05, 0.022, p);
    ambient.buzzCutoff = lerp(460, 170, p);
    ambient.heartGain = lerp(0.06, 0.1, p);
  }
  return ambient;
}
