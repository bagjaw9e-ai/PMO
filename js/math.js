export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export const lerp = (a, b, t) => a + (b - a) * t;

export function smooth(t) {
  t = clamp(t);
  return t * t * (3 - 2 * t);
}

export function easeOut(t) {
  t = clamp(t);
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

export function easeInOut(t) {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function beat(t, bpm = 70) {
  const phase = (((t * bpm) / 60) % 1 + 1) % 1;
  const gauss = (x, w) => Math.exp(-(x * x) / (w * w));
  return gauss(phase, 0.045) + 0.55 * gauss(phase - 0.16, 0.034);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
