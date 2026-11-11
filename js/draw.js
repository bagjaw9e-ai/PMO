import { BASE_H, BASE_W, GLITCH_TIMES, WHOOSH_TIMES } from "./timeline.js";
import { beat, clamp, easeOut, hash01, lerp, mulberry32 } from "./math.js";

export const RED = "#ff2438";
export const RED_HOT = "#ff4d5a";
export const CORE = "rgba(255, 228, 228, 0.92)";

const matteQueue = [];

export function clearMattes() {
  matteQueue.length = 0;
}

export function queueMatte(ctx, fn) {
  const matrix = ctx.getTransform();
  const alpha = ctx.globalAlpha;
  matteQueue.push({ matrix, alpha, fn });
}

export function flushMattes(ctx) {
  for (const item of matteQueue) {
    ctx.save();
    ctx.setTransform(item.matrix);
    ctx.globalAlpha = item.alpha;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    item.fn(ctx);
    ctx.restore();
  }
  matteQueue.length = 0;
}

export function glowSpot(ctx, x, y, radius, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255, 0, 36, ${alpha})`);
  g.addColorStop(0.45, `rgba(140, 0, 24, ${alpha * 0.45})`);
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function strokeNeon(ctx, build, width, color = RED, coreAlpha = 0.9) {
  ctx.beginPath();
  build(ctx);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  if (coreAlpha > 0) {
    ctx.lineWidth = Math.max(1, width * 0.28);
    ctx.strokeStyle = `rgba(255, 232, 232, ${coreAlpha})`;
    ctx.stroke();
  }
}

function rounded(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const POSES = {
  stand: {
    head: [4, -248], shoulder: [0, -186], hip: [0, 0],
    elbowN: [28, -124], handN: [16, -58],
    elbowF: [-24, -122], handF: [-12, -54],
    kneeN: [16, 82], footN: [18, 176],
    kneeF: [-12, 84], footF: [-14, 178],
  },
  proud: {
    head: [-16, -258], shoulder: [-4, -190], hip: [0, 0],
    elbowN: [52, -154], handN: [16, -96],
    elbowF: [-46, -150], handF: [-10, -92],
    kneeN: [26, 82], footN: [34, 178],
    kneeF: [-8, 84], footF: [2, 178],
  },
  slump: {
    head: [54, -186], shoulder: [32, -142], hip: [0, 0],
    elbowN: [48, -70], handN: [40, 16],
    elbowF: [-8, -78], handF: [-4, 8],
    kneeN: [22, 74], footN: [28, 162],
    kneeF: [-6, 78], footF: [-2, 164],
  },
  sit: {
    head: [22, -214], shoulder: [12, -158], hip: [0, 0],
    elbowN: [58, -96], handN: [86, -24],
    elbowF: [-26, -118], handF: [-34, -52],
    kneeN: [128, 2], footN: [132, 108],
    kneeF: [108, 8], footF: [112, 110],
  },
  hunch: {
    head: [48, -176], shoulder: [30, -130], hip: [0, 0],
    elbowN: [72, -62], handN: [92, 6],
    elbowF: [-16, -96], handF: [-22, -28],
    kneeN: [118, 8], footN: [122, 104],
    kneeF: [96, 14], footF: [100, 106],
  },
  lie: {
    head: [-248, -6], shoulder: [-176, 0], hip: [0, 0],
    elbowN: [-130, 28], handN: [-78, 42],
    elbowF: [-90, 8], handF: [10, 6],
    kneeN: [128, 4], footN: [248, 2],
    kneeF: [116, -6], footF: [236, -8],
  },
  rage: {
    head: [-8, -252], shoulder: [6, -188], hip: [0, 0],
    elbowN: [62, -236], handN: [28, -308],
    elbowF: [-52, -150], handF: [-78, -64],
    kneeN: [32, 78], footN: [48, 174],
    kneeF: [-18, 82], footF: [-4, 176],
  },
  reach: {
    head: [14, -240], shoulder: [6, -180], hip: [0, 0],
    elbowN: [78, -150], handN: [132, -142],
    elbowF: [18, -86], handF: [22, 24],
    kneeN: [22, 82], footN: [26, 176],
    kneeF: [-12, 84], footF: [-8, 178],
  },
  stop: {
    head: [0, -250], shoulder: [0, -188], hip: [0, 0],
    elbowN: [70, -188], handN: [128, -190],
    elbowF: [-6, -120], handF: [-10, -48],
    kneeN: [16, 82], footN: [6, 176],
    kneeF: [-24, 86], footF: [-48, 178],
  },
  kneel: {
    head: [46, -164], shoulder: [26, -122], hip: [0, 0],
    elbowN: [70, -28], handN: [96, 46],
    elbowF: [8, -48], handF: [18, 24],
    kneeN: [6, 86], footN: [-62, 94],
    kneeF: [-8, 86], footF: [-74, 92],
  },
  dive: {
    head: [92, -148], shoulder: [48, -112], hip: [0, 0],
    elbowN: [130, -72], handN: [196, -28],
    elbowF: [24, -36], handF: [48, 28],
    kneeN: [62, 36], footN: [16, 112],
    kneeF: [-8, 48], footF: [-28, 120],
  },
  front: {
    front: true,
    head: [0, -240], shoulder: [0, -176],
    shoulderN: [12, -176], shoulderF: [-12, -176], hip: [0, 0],
    elbowN: [68, -118], handN: [74, -42],
    elbowF: [-68, -118], handF: [-74, -42],
    kneeN: [30, 82], footN: [34, 176],
    kneeF: [-30, 82], footF: [-34, 176],
  },
};

function mixPoint(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function mixPose(a, b, t) {
  const keys = ["head", "shoulder", "shoulderN", "shoulderF", "hip", "elbowN", "handN", "elbowF", "handF", "kneeN", "footN", "kneeF", "footF"];
  const out = { front: Boolean(a.front && b.front) };
  for (const key of keys) {
    const pa = a[key] || a.shoulder || a.hip || [0, 0];
    const pb = b[key] || b.shoulder || b.hip || [0, 0];
    if (a[key] || b[key]) out[key] = mixPoint(pa, pb, t);
  }
  return out;
}

export function solveFigure(pose) {
  const from = POSES[pose.pose || "stand"] || POSES.stand;
  const src = pose.poseTo ? mixPose(from, POSES[pose.poseTo] || from, pose.mix || 0) : from;
  const sc = pose.sc ?? 1;
  const face = pose.face ?? 1;
  const sign = face < 0 ? -1 : 1;
  const place = (pt) => [pose.x + pt[0] * sc * sign + (pose.jx || 0), pose.y + pt[1] * sc + (pose.jy || 0)];
  const hip = place(src.hip || [0, 0]);
  const shoulder = place(src.shoulder || [0, -180]);
  const head = place(src.head || [0, -240]);
  return {
    hip,
    head,
    headR: 36 * sc,
    shoulder,
    armN: {
      origin: place(src.shoulderN || src.shoulder || [0, -180]),
      el: place(src.elbowN),
      hand: place(src.handN),
    },
    armF: {
      origin: place(src.shoulderF || src.shoulder || [0, -180]),
      el: place(src.elbowF),
      hand: place(src.handF),
    },
    legN: { origin: hip, knee: place(src.kneeN), foot: place(src.footN) },
    legF: { origin: hip, knee: place(src.kneeF), foot: place(src.footF) },
    sc,
    face: sign,
    skirt: Boolean(pose.skirt),
    front: Boolean(src.front),
    kind: src.front ? "front" : "side",
  };
}

function traceChain(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
}

function ringPoint(from, center, radius) {
  const dx = center[0] - from[0];
  const dy = center[1] - from[1];
  const dist = Math.hypot(dx, dy) || 1;
  const k = Math.max(0, (dist - radius) / dist);
  return [from[0] + dx * k, from[1] + dy * k];
}

export function drawStickman(ctx, pose, opt = {}) {
  const fig = pose.head && pose.armN ? pose : solveFigure(pose);
  const paint = (c) => paintFigure(c, fig, opt);
  if (opt.matte) queueMatte(ctx, paint);
  else paint(ctx);
  return fig;
}

function paintFigure(ctx, fig, opt) {
  const t = opt.t || 0;
  const jitter = opt.jitter || 0;
  const j = (pt) => {
    if (!jitter) return pt;
    return [
      pt[0] + Math.sin(t * 34 + pt[1] * 0.02) * jitter,
      pt[1] + Math.cos(t * 29 + pt[0] * 0.02) * jitter,
    ];
  };
  const color = opt.color || RED;
  const width = (opt.width || 8) * fig.sc * (1 + (opt.pulse ? beat(t, opt.bpm || 70) * 0.08 : 0));
  const core = opt.core ?? 0.88;
  const limb = (parts, alpha) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    strokeNeon(ctx, (c) => traceChain(c, parts.map(j)), width, color, core);
    ctx.restore();
  };

  if (opt.trail) {
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.translate(-opt.trail, 0);
    paintFigure(ctx, fig, { ...opt, trail: 0 });
    ctx.restore();
  }

  const farAlpha = fig.front ? 0.9 : 0.38;
  limb([fig.legF.origin, fig.legF.knee, fig.legF.foot], farAlpha);
  limb([fig.armF.origin, fig.armF.el, fig.armF.hand], farAlpha);
  const neck = ringPoint(j(fig.shoulder), j(fig.head), fig.headR);
  strokeNeon(ctx, (c) => traceChain(c, [j(fig.hip), j(fig.shoulder), neck]), width, color, core);
  limb([fig.legN.origin, fig.legN.knee, fig.legN.foot], 1);
  limb([fig.armN.origin, fig.armN.el, fig.armN.hand], 1);

  const foot = (pt) => {
    ctx.beginPath();
    ctx.moveTo(pt[0] - 8 * fig.sc, pt[1]);
    ctx.lineTo(pt[0] + fig.face * 18 * fig.sc, pt[1]);
  };
  strokeNeon(ctx, (c) => {
    foot(fig.legN.foot);
    c.moveTo(fig.legF.foot[0] - 6 * fig.sc, fig.legF.foot[1]);
    c.lineTo(fig.legF.foot[0] + fig.face * 14 * fig.sc, fig.legF.foot[1]);
  }, width * 0.7, color, core * 0.4);

  ctx.beginPath();
  ctx.arc(fig.head[0], fig.head[1], fig.headR, 0, Math.PI * 2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.lineWidth = Math.max(1, width * 0.28);
  ctx.strokeStyle = `rgba(255, 232, 232, ${core})`;
  ctx.stroke();

  drawFace(ctx, fig, opt.expression || "neutral", width * 0.55, color);
  if (opt.woman) drawHair(ctx, fig, opt.hair || "down", width * 0.7, color, core);
  if (fig.skirt) drawSkirt(ctx, fig, width * 0.85, color, core);
}

function drawFace(ctx, fig, expression, width, color) {
  const dir = fig.face;
  const r = fig.headR;
  if (fig.front) {
    const y = fig.head[1] + (expression === "down" ? r * 0.08 : 0);
    const d = r * 0.28;
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.moveTo(fig.head[0] - d - 7, y);
    ctx.lineTo(fig.head[0] - d + 8, y + (expression === "down" ? 3 : 0));
    ctx.moveTo(fig.head[0] + d - 8, y + (expression === "down" ? 3 : 0));
    ctx.lineTo(fig.head[0] + d + 7, y);
    if (expression === "angry") {
      ctx.moveTo(fig.head[0] - d - 8, y - r * 0.28);
      ctx.lineTo(fig.head[0] - d + 10, y - r * 0.16);
      ctx.moveTo(fig.head[0] + d + 8, y - r * 0.28);
      ctx.lineTo(fig.head[0] + d - 10, y - r * 0.16);
    } else if (expression === "firm") {
      ctx.moveTo(fig.head[0] - d - 4, y - r * 0.24);
      ctx.lineTo(fig.head[0] - d + 10, y - r * 0.24);
      ctx.moveTo(fig.head[0] + d - 10, y - r * 0.24);
      ctx.lineTo(fig.head[0] + d + 4, y - r * 0.24);
    }
    ctx.stroke();
    return;
  }
  const ex = fig.head[0] + dir * r * 0.32;
  const ey = fig.head[1] - r * 0.02;
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  if (expression === "down" || expression === "dull") {
    ctx.moveTo(ex - dir * 4, ey + 5);
    ctx.lineTo(ex + dir * 14, ey + 9);
  } else if (expression === "closed") {
    ctx.moveTo(ex - dir * 2, ey + 2);
    ctx.lineTo(ex + dir * 14, ey + 2);
  } else if (expression === "angry") {
    ctx.moveTo(ex - dir * 2, ey);
    ctx.lineTo(ex + dir * 15, ey - 2);
    ctx.moveTo(ex - dir * 6, ey - r * 0.28);
    ctx.lineTo(ex + dir * 16, ey - r * 0.16);
  } else if (expression === "firm") {
    ctx.moveTo(ex - dir * 2, ey);
    ctx.lineTo(ex + dir * 14, ey);
    ctx.moveTo(ex - dir * 4, ey - r * 0.26);
    ctx.lineTo(ex + dir * 15, ey - r * 0.22);
  } else if (expression === "calm") {
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + dir * 12, ey);
  } else {
    ctx.moveTo(ex - dir * 2, ey);
    ctx.lineTo(ex + dir * 13, ey - 1);
  }
  ctx.stroke();
}

function drawHair(ctx, fig, flow, width, color, core) {
  const [hx, hy] = fig.head;
  const r = fig.headR;
  if (fig.front) {
    strokeNeon(ctx, (c) => {
      for (let i = 0; i < 4; i += 1) {
        const side = i < 2 ? -1 : 1;
        const o = (i % 2) * r * 0.18;
        c.moveTo(hx + side * o, hy - r * 0.7);
        c.quadraticCurveTo(hx + side * r * 1.15, hy + r * 0.2, hx + side * r * 0.72, hy + r * (1.9 + (i % 2) * 0.3));
      }
    }, width, color, core * 0.5);
    return;
  }
  const back = -fig.face;
  strokeNeon(ctx, (c) => {
    for (let i = 0; i < 5; i += 1) {
      const o = (i - 2) * r * 0.2;
      if (flow === "pillow") {
        c.moveTo(hx + o * 0.3, hy - r * 0.15);
        c.quadraticCurveTo(hx + back * r * 0.2, hy + r * 0.2, hx + back * r * (2.3 + i * 0.18), hy + o);
      } else {
        c.moveTo(hx + Math.cos(-0.6 + i * 0.25) * r * 0.2, hy - r * 0.55);
        c.quadraticCurveTo(
          hx + back * r * 1.25,
          hy + r * (0.1 + i * 0.12),
          hx + back * r * 0.35 + o,
          hy + r * (2.15 + i * 0.12)
        );
      }
    }
  }, width, color, core * 0.5);
}

function drawSkirt(ctx, fig, width, color, core) {
  const [x, y] = fig.hip;
  const s = fig.sc;
  strokeNeon(ctx, (c) => {
    c.moveTo(x, y - 16 * s);
    c.lineTo(x - 58 * s, y + 78 * s);
    c.lineTo(x + 58 * s, y + 78 * s);
    c.closePath();
  }, width, color, core * 0.45);
}

export function drawPhone(ctx, x, y, rot, opt = {}) {
  const w = opt.w ?? 168;
  const h = opt.h ?? 286;
  const color = opt.color || RED;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  rounded(ctx, -w / 2, -h / 2, w, h, 22);
  ctx.lineWidth = opt.line ?? 7;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 230, 230, 0.8)";
  ctx.stroke();
  ctx.save();
  rounded(ctx, -w / 2 + 12, -h / 2 + 16, w - 24, h - 32, 12);
  ctx.clip();
  ctx.fillStyle = opt.dim ? "#070003" : "#120006";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  if (!opt.dim) paintScreen(ctx, w, h, opt);
  ctx.restore();
  ctx.restore();
}

function paintScreen(ctx, w, h, opt) {
  const t = opt.t || 0;
  const mode = opt.screen || "recline";
  ctx.save();
  ctx.globalAlpha *= 0.95;
  if (mode === "wild") {
    paintGhost(ctx, -w * 0.02, -h * 0.08, w / 250, t * 0.8, "stand", 0.85);
    paintGhost(ctx, w * 0.08, h * 0.12, w / 280, t * 0.6 + 1, "recline", 0.7);
  } else if (mode === "recline") {
    paintGhost(ctx, 0, 8, w / 190, t, "recline", 0.95);
  } else if (mode === "flicker") {
    const a = 0.25 + Math.abs(Math.sin(t * 18)) * 0.75;
    ctx.globalAlpha *= a;
    paintGhost(ctx, 0, 6, w / 180, t, "recline", 1);
  }
  const scan = ((t * 90) % (h + 40)) - h / 2 - 20;
  ctx.fillStyle = "rgba(255, 40, 60, 0.08)";
  ctx.fillRect(-w / 2, scan, w, 10);
  ctx.restore();
}

export function paintGhost(ctx, x, y, s, phase, variant, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(phase * 0.7) * (variant === "recline" ? 0.08 : 0.22));
  ctx.globalAlpha *= alpha;
  const flick = Math.sin(phase * 9.0) > 0.72 ? (hash01(phase * 4) - 0.5) * 18 * s : 0;
  ctx.translate(flick, 0);
  strokeNeon(ctx, (c) => {
    if (variant === "recline") {
      c.arc(-62 * s, -8 * s, 14 * s, 0, Math.PI * 2);
      c.moveTo(-48 * s, -4 * s);
      c.quadraticCurveTo(-10 * s, -28 * s + Math.sin(phase * 2) * 8 * s, 36 * s, 6 * s);
      c.quadraticCurveTo(70 * s, 22 * s, 78 * s, 48 * s);
      c.moveTo(-10 * s, -6 * s);
      c.quadraticCurveTo(10 * s, 16 * s, 4 * s, 42 * s);
      c.moveTo(20 * s, 4 * s);
      c.quadraticCurveTo(48 * s, 20 * s, 40 * s, 52 * s);
    } else {
      c.arc(0, -58 * s, 14 * s, 0, Math.PI * 2);
      c.moveTo(0, -44 * s);
      c.quadraticCurveTo(26 * s * Math.sin(phase), 0, 0, 48 * s);
      c.moveTo(0, -16 * s);
      c.quadraticCurveTo(-42 * s, -4 * s, -24 * s, 30 * s);
      c.moveTo(0, -16 * s);
      c.quadraticCurveTo(40 * s, 6 * s, 26 * s, 34 * s);
      c.moveTo(-18 * s, 18 * s);
      c.quadraticCurveTo(0, 34 * s, 18 * s, 16 * s);
      c.moveTo(-8 * s, 48 * s);
      c.lineTo(-20 * s, 96 * s);
      c.moveTo(8 * s, 48 * s);
      c.lineTo(22 * s, 98 * s);
    }
  }, Math.max(2, 5 * s), RED, 0.75);
  ctx.restore();
}

export function drawHologram(ctx, x, y, s, t, intensity) {
  glowSpot(ctx, x, y, 160 * s, 0.14 * intensity);
  paintGhost(ctx, x - 16 * s, y - 10 * s, s * 0.95, t * 0.9, "stand", 0.4 + intensity * 0.35);
  paintGhost(ctx, x + 28 * s, y + 24 * s, s * 0.8, t * 0.7 + 1.2, "recline", 0.35 + intensity * 0.3);
}

export function traceSmooth(ctx, pts) {
  if (!pts.length) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
    return;
  }
  for (let i = 1; i < pts.length - 1; i += 1) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

export function pointOnPoly(pts, u) {
  if (u <= 0) return pts[0];
  if (u >= 1) return pts[pts.length - 1];
  let total = 0;
  const lens = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(len);
    total += len;
  }
  let dist = clamp(u) * total;
  for (let i = 0; i < lens.length; i += 1) {
    if (dist <= lens[i] || i === lens.length - 1) {
      const k = lens[i] === 0 ? 0 : dist / lens[i];
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
    }
    dist -= lens[i];
  }
  return pts[pts.length - 1];
}

function sampleSpan(pts, u0, u1) {
  const out = [];
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) out.push(pointOnPoly(pts, u0 + (u1 - u0) * (i / steps)));
  return out;
}

export function wobblePath(anchors, amount, seed) {
  const pts = [];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const steps = 7;
    for (let s = 0; s < steps; s += 1) {
      const u = s / steps;
      const x = lerp(a[0], b[0], u);
      const y = lerp(a[1], b[1], u);
      const nx = -(b[1] - a[1]);
      const ny = b[0] - a[0];
      const nl = Math.hypot(nx, ny) || 1;
      const wob = Math.sin(u * Math.PI) * amount * Math.sin(seed + i * 2.2 + u * 9);
      pts.push([x + (nx / nl) * wob, y + (ny / nl) * wob]);
    }
  }
  pts.push(anchors[anchors.length - 1]);
  return pts;
}

export function drawRouteVeins(ctx, anchors, growth, width = 4) {
  const grow = clamp(growth);
  if (grow <= 0.01) return;
  for (let k = 0; k < 4; k += 1) {
    const path = wobblePath(anchors, 8 + k * 5, k * 2.4 + 1);
    const span = sampleSpan(path, 0, grow);
    strokeNeon(ctx, (c) => traceSmooth(c, span), width * (1 - k * 0.12), k % 2 ? RED_HOT : RED, 0.55);
  }
  if (grow > 0.2) {
    const path = wobblePath(anchors, 12, 4);
    const u = (growth * 1.4) % 1;
    const p = pointOnPoly(path, Math.min(u, grow));
    ctx.fillStyle = CORE;
    ctx.beginPath();
    ctx.arc(p[0], p[1], width * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawVeinTree(ctx, x, y, angle, depth, length, seed, width) {
  const rnd = mulberry32(seed);
  const pts = [];
  const steps = 6;
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    pts.push([
      x + Math.cos(angle) * length * u + Math.sin(u * 8 + seed) * length * 0.07,
      y + Math.sin(angle) * length * u + Math.cos(u * 6 + seed) * length * 0.07,
    ]);
  }
  strokeNeon(ctx, (c) => traceSmooth(c, pts), width, RED, 0.45);
  if (depth <= 0) return;
  const end = pts[pts.length - 1];
  const branches = depth >= 3 ? 3 : 2;
  for (let i = 0; i < branches; i += 1) {
    drawVeinTree(
      ctx,
      end[0],
      end[1],
      angle + (rnd() - 0.48) * 1.2,
      depth - 1,
      length * (0.56 + rnd() * 0.12),
      seed * 5 + i * 17 + 3,
      width * 0.72
    );
  }
}

export function drawMotes(ctx, t, count, alpha, speed) {
  const rnd = mulberry32(1234);
  for (let i = 0; i < count; i += 1) {
    const bx = rnd() * BASE_W;
    const by = rnd();
    const sp = 16 + rnd() * speed;
    let y = (by * BASE_H - t * sp) % BASE_H;
    if (y < 0) y += BASE_H;
    const x = bx + Math.sin(t * 0.7 + i) * 14;
    const r = 0.8 + rnd() * 2.1;
    const a = alpha * (0.25 + rnd() * 0.75) * (0.55 + 0.45 * Math.sin(t * 2 + i));
    ctx.fillStyle = `rgba(255, 42, 60, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBed(ctx, x, y, w, h) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#8a1830";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - 36, y + h);
  ctx.lineTo(x + 28, y + h);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = "#ff3050";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.strokeRect(x + 18, y - 150, 26, 170);
  rounded(ctx, x + 48, y + 22, 110, Math.min(86, h * 0.28), 16);
  ctx.strokeStyle = "#a01830";
  ctx.stroke();
  ctx.restore();
}

export function drawCouch(ctx, x, y, w) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#8a1830";
  rounded(ctx, x, y, w, 78, 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + 20, y - 70);
  ctx.lineTo(x + 70, y);
  ctx.moveTo(x + w - 20, y);
  ctx.lineTo(x + w - 20, y - 70);
  ctx.lineTo(x + w - 70, y);
  ctx.stroke();
  ctx.restore();
}

export function drawFloor(ctx, y) {
  ctx.save();
  ctx.strokeStyle = "#2a000c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, y);
  ctx.lineTo(BASE_W - 60, y);
  ctx.stroke();
  ctx.restore();
}

export function drawDivider(ctx, y, t) {
  const wob = Math.sin(t * 2.4) * 8;
  strokeNeon(ctx, (c) => {
    c.moveTo(36, y + wob);
    c.bezierCurveTo(280, y - 18, 760, y + 22, BASE_W - 36, y - wob);
  }, 3, RED, 0.8);
  ctx.save();
  ctx.setLineDash([8, 16]);
  ctx.lineDashOffset = -t * 80;
  ctx.beginPath();
  ctx.moveTo(36, y + wob);
  ctx.bezierCurveTo(280, y - 18, 760, y + 22, BASE_W - 36, y - wob);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 220, 220, 0.7)";
  ctx.stroke();
  ctx.restore();
}

export function drawShockwaves(ctx, x, y, t, power) {
  ctx.save();
  for (let i = 0; i < 3; i += 1) {
    const u = (t * 0.85 + i * 0.33) % 1;
    ctx.beginPath();
    ctx.arc(x, y, 30 + u * 260, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(255, 36, 56, ${(1 - u) * power})`;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHalo(ctx, x, y, radius, t, chaos) {
  const count = chaos > 0.5 ? 5 : 3;
  for (let i = 0; i < count; i += 1) {
    const rot = t * (chaos > 0.5 ? 1.8 : 0.22) * (i % 2 ? -1 : 1) + i * 0.8;
    const span = chaos > 0.5 ? 0.55 + (i % 3) * 0.2 : 1.4;
    const r = radius + i * (chaos > 0.5 ? 16 : 22);
    strokeNeon(ctx, (c) => c.arc(x, y, r, rot, rot + span), chaos > 0.5 ? 3 : 2.5, RED, chaos > 0.5 ? 0.35 : 0.7);
  }
}

const FOLDS = (() => {
  const rnd = mulberry32(42);
  const folds = [];
  for (let i = 0; i < 16; i += 1) {
    const pts = [];
    let x = -0.9 + (i % 3) * 0.12;
    let y = -0.72 + (i % 8) * 0.18;
    for (let k = 0; k < 5; k += 1) {
      pts.push([x, y]);
      x += 0.2 + rnd() * 0.08;
      y += (rnd() - 0.5) * 0.18;
    }
    folds.push(pts);
  }
  return folds;
})();

const CRACKS = [
  [[-0.9, -0.15], [-0.45, 0.05], [-0.05, -0.18], [0.4, 0.12], [0.95, -0.02]],
  [[-0.55, -0.72], [-0.25, -0.3], [0.05, 0.05], [0.25, 0.62]],
  [[-1.0, 0.35], [-0.5, 0.5], [0.05, 0.32], [0.55, 0.48]],
  [[0.15, -0.8], [0.45, -0.35], [0.7, 0.05], [0.95, 0.4]],
];

const CIRCUITS = [
  [[-0.85, 0.05], [-0.4, 0.28], [0.05, 0.08], [0.5, 0.3], [0.95, 0.05]],
  [[-0.75, -0.45], [-0.25, -0.6], [0.25, -0.38], [0.8, -0.18]],
  [[-0.6, 0.45], [-0.15, 0.62], [0.35, 0.4], [0.85, 0.5]],
  [[-0.2, -0.75], [0.05, -0.2], [0.15, 0.25], [0.05, 0.7]],
  [[-0.95, -0.2], [-0.55, -0.35], [-0.2, 0.0], [0.25, -0.1], [0.7, 0.15]],
  [[-0.4, -0.1], [0.0, -0.45], [0.45, -0.55], [0.9, -0.35]],
];

export const RECEPTORS = (() => {
  const rnd = mulberry32(9);
  const pts = [];
  let guard = 0;
  while (pts.length < 26 && guard < 200) {
    guard += 1;
    const x = (rnd() - 0.5) * 1.9;
    const y = (rnd() - 0.5) * 1.5;
    if ((x * x) / 0.92 + (y * y) / 0.62 <= 1) {
      pts.push({ x, y, delay: rnd(), phase: rnd() * 6.28 });
    }
  }
  return pts;
})();

export function brainPoint(cx, cy, s, x, y) {
  return [cx + x * s, cy + y * s];
}

export function unitBrainPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 1.02, s * 0.82, 0, 0, Math.PI * 2);
}

export function drawBrain(ctx, cx, cy, s, opt = {}) {
  const t = opt.t || 0;
  unitBrainPath(ctx, cx, cy, s);
  ctx.save();
  ctx.clip();
  const front = opt.highlight || "none";
  if (front !== "none" || opt.infection > 0 || opt.wild > 0) {
    const hx = front === "back" ? cx - s * 0.55 : front === "front" ? cx + s * 0.5 : cx + s * 0.15;
    const wash = ctx.createRadialGradient(hx, cy, 10, hx, cy, s * 1.1);
    const amount = Math.max(opt.infection || 0, opt.wild || 0, front === "none" ? 0 : 0.35);
    wash.addColorStop(0, `rgba(255, 0, 40, ${0.22 * amount})`);
    wash.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = wash;
    ctx.fillRect(cx - s * 2, cy - s * 2, s * 4, s * 4);
  }
  ctx.globalAlpha *= opt.foldAlpha ?? 0.45;
  for (const fold of FOLDS) {
    strokeNeon(ctx, (c) => {
      traceSmooth(c, fold.map((pt) => brainPoint(cx, cy, s, pt[0], pt[1])));
    }, Math.max(1.5, s * 0.012), "#c01028", 0.25);
  }
  ctx.restore();

  if (opt.crack > 0) {
    ctx.save();
    ctx.globalAlpha *= opt.crack;
    for (const crack of CRACKS) {
      const pts = crack.map((pt) => brainPoint(cx, cy, s, pt[0], pt[1]));
      strokeNeon(ctx, (c) => traceSmooth(c, pts), Math.max(2, s * 0.014), RED_HOT, 0.7);
      if (opt.crack > 0.45) {
        const spark = pointOnPoly(pts, (0.3 + Math.sin(t * 6 + pts[0][0]) * 0.2 + 1) % 1);
        ctx.fillStyle = CORE;
        ctx.beginPath();
        ctx.arc(spark[0], spark[1], Math.max(2, s * 0.02), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  if (opt.wild > 0) {
    ctx.save();
    unitBrainPath(ctx, cx, cy, s);
    ctx.clip();
    const ghosts = 3 + Math.round(opt.wild * 2);
    for (let i = 0; i < ghosts; i += 1) {
      const px = cx - s * (0.15 + (i % 3) * 0.22) + Math.sin(t * 1.4 + i) * s * 0.06;
      const py = cy - s * 0.15 + ((i % 4) - 1.5) * s * 0.28;
      paintGhost(ctx, px, py, (s / 280) * (0.7 + (i % 2) * 0.25), t * 1.2 + i, i % 2 ? "recline" : "stand", opt.wild * 0.7);
    }
    ctx.restore();
  }

  if (opt.repair >= 0) {
    CIRCUITS.forEach((circuit, index) => {
      const local = clamp((opt.repair - index * 0.07) / 0.62);
      if (local <= 0) return;
      const pts = circuit.map((pt) => brainPoint(cx, cy, s, pt[0], pt[1]));
      const gap = (1 - local) * 0.18;
      const left = sampleSpan(pts, 0, Math.max(0.02, 0.5 - gap));
      const right = sampleSpan(pts, Math.min(0.98, 0.5 + gap), 1);
      const showRight = local > 0.45;
      strokeNeon(ctx, (c) => traceSmooth(c, left), Math.max(2, s * 0.013), RED, 0.8);
      if (showRight) strokeNeon(ctx, (c) => traceSmooth(c, right), Math.max(2, s * 0.013), RED, 0.8);
      const tip = pointOnPoly(pts, local);
      ctx.fillStyle = "#fff2f2";
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], Math.max(3, s * 0.025) * (0.6 + local * 0.4), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (opt.amygdala > 0) {
    const spots = [brainPoint(cx, cy, s, -0.08, 0.12), brainPoint(cx, cy, s, 0.18, 0.2)];
    ctx.save();
    ctx.globalAlpha *= 0.45 + opt.amygdala * 0.55;
    for (const spot of spots) {
      glowSpot(ctx, spot[0], spot[1], s * (0.16 + opt.amygdala * 0.18), 0.35 * opt.amygdala);
      ctx.beginPath();
      ctx.ellipse(spot[0], spot[1], s * 0.09, s * 0.14, 0.4, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, s * 0.02);
      ctx.strokeStyle = RED_HOT;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha *= opt.outlineAlpha ?? 1;
  unitBrainPath(ctx, cx, cy, s);
  ctx.lineWidth = Math.max(3, s * 0.02);
  ctx.strokeStyle = RED;
  ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.006);
  ctx.strokeStyle = CORE;
  ctx.stroke();
  strokeNeon(ctx, (c) => {
    c.moveTo(cx + s * 0.02, cy - s * 0.72);
    c.bezierCurveTo(cx + s * 0.12, cy - s * 0.2, cx - s * 0.04, cy + s * 0.15, cx + s * 0.04, cy + s * 0.62);
  }, Math.max(2, s * 0.012), RED, 0.35);
  strokeNeon(ctx, (c) => {
    c.moveTo(cx - s * 0.07, cy + s * 0.78);
    c.lineTo(cx - s * 0.04, cy + s * 0.98);
    c.moveTo(cx + s * 0.09, cy + s * 0.78);
    c.lineTo(cx + s * 0.06, cy + s * 0.98);
  }, Math.max(2, s * 0.016), RED, 0.45);
  ctx.restore();
}

export function drawFlatline(ctx, pts, t, flat) {
  const amount = clamp(flat);
  const out = pts.map((pt, i) => {
    const wave = Math.sin(t * 10 + i) * (1 - amount) * 16;
    return [pt[0], pt[1] + wave];
  });
  const color = amount > 0.85 ? "#6a4044" : RED;
  strokeNeon(ctx, (c) => traceSmooth(c, out), 4, color, 1 - amount);
}

export function drawEmpathyLink(ctx, a, b, broken) {
  const k = clamp(broken);
  const y = Math.min(a[1], b[1]) - 108;
  const mid = (a[0] + b[0]) / 2;
  const gap = 16 + k * 86;
  const leftEnd = mid - gap;
  const rightEnd = mid + gap;
  const node = (x, yy) => {
    ctx.beginPath();
    ctx.arc(x, yy, 6, 0, Math.PI * 2);
    ctx.fillStyle = RED_HOT;
    ctx.fill();
  };
  strokeNeon(ctx, (c) => {
    c.moveTo(a[0], a[1] - 36);
    c.lineTo(a[0], y);
    c.lineTo(leftEnd, y);
  }, 4, RED, 0.75);
  strokeNeon(ctx, (c) => {
    c.moveTo(b[0], b[1] - 36);
    c.lineTo(b[0], y);
    c.lineTo(rightEnd, y);
  }, 4, RED, 0.75);
  node(a[0], y);
  node(leftEnd, y);
  node(rightEnd, y);
  node(b[0], y);
  if (k > 0.15) {
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.beginPath();
    ctx.moveTo(leftEnd + 10, y - 12);
    ctx.lineTo(leftEnd + 24, y + 12);
    ctx.moveTo(rightEnd - 10, y - 12);
    ctx.lineTo(rightEnd - 24, y + 12);
    ctx.lineWidth = 3;
    ctx.strokeStyle = CORE;
    ctx.stroke();
    glowSpot(ctx, mid, y, 36, 0.28 * (1 - k * 0.4));
    ctx.restore();
  }
}

export function drawWhoosh(ctx, t) {
  for (const mark of WHOOSH_TIMES) {
    const u = (t - mark) / 0.46;
    if (u < 0 || u > 1) continue;
    const y = -140 + easeOut(u) * (BASE_H + 280);
    const alpha = Math.sin(clamp(u) * Math.PI) * 0.5;
    const grad = ctx.createLinearGradient(0, y - 100, 0, y + 100);
    grad.addColorStop(0, "rgba(255, 0, 40, 0)");
    grad.addColorStop(0.5, `rgba(255, 28, 52, ${alpha})`);
    grad.addColorStop(1, "rgba(255, 0, 40, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 100, BASE_W, 200);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BASE_W, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255, 236, 236, ${alpha})`;
    ctx.stroke();
  }
}

export function glitchAmount(t) {
  let amount = 0;
  for (const mark of GLITCH_TIMES) {
    const d = Math.abs(t - mark);
    if (d < 0.15) amount = Math.max(amount, 1 - d / 0.15);
  }
  return amount;
}

export function applyGlitch(ctx, canvas, buffer, bctx, t) {
  const amount = glitchAmount(t);
  if (amount < 0.05) return;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.clearRect(0, 0, canvas.width, canvas.height);
  bctx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const strips = 6 + Math.floor(amount * 8);
  for (let i = 0; i < strips; i += 1) {
    const y = hash01(t * 13 + i * 19.1) * canvas.height;
    const h = (3 + hash01(i * 3.1 + t) * 26) * (canvas.height / BASE_H);
    const shift = (hash01(t * 9 + i) - 0.5) * 64 * amount;
    ctx.drawImage(buffer, 0, y, canvas.width, h, shift, y, canvas.width, h);
  }
  ctx.restore();
}

export function bloom(ctx, source, glow, gctx) {
  gctx.clearRect(0, 0, glow.width, glow.height);
  gctx.drawImage(source, 0, 0, glow.width, glow.height);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = "blur(16px)";
  ctx.globalAlpha = 0.85;
  ctx.drawImage(glow, 0, 0, source.width, source.height);
  ctx.filter = "blur(3px)";
  ctx.globalAlpha = 0.7;
  ctx.drawImage(glow, 0, 0, source.width, source.height);
  ctx.restore();
}

let vignetteGrad = null;

export function vignette(ctx) {
  if (!vignetteGrad) {
    vignetteGrad = ctx.createRadialGradient(
      BASE_W / 2,
      BASE_H * 0.46,
      BASE_H * 0.18,
      BASE_W / 2,
      BASE_H * 0.5,
      BASE_H * 0.75
    );
    vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
    vignetteGrad.addColorStop(1, "rgba(0,0,0,0.82)");
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.restore();
}

export function clipBand(ctx, y, h, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, BASE_W, h);
  ctx.clip();
  fn();
  ctx.restore();
}

export function camera(ctx, t, ampX, ampY, shake, bpm = 72) {
  const pulse = beat(t, bpm);
  ctx.translate(
    Math.sin(t * 0.32) * ampX + Math.sin(t * 18) * shake * (0.35 + pulse),
    Math.cos(t * 0.27) * ampY + Math.cos(t * 15) * shake * (0.35 + pulse)
  );
}

export function phoneAngle(fig) {
  const a = fig.armN.el;
  const b = fig.armN.hand;
  return Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2;
}
