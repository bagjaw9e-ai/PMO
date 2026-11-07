import { BASE_H, BASE_W } from "./timeline.js";
import { clamp, easeInOut, lerp, smooth } from "./math.js";
import {
  RED,
  RED_HOT,
  RECEPTORS,
  brainPoint,
  camera,
  clipBand,
  drawBed,
  drawBrain,
  drawCouch,
  drawDivider,
  drawEmpathyLink,
  drawFlatline,
  drawFloor,
  drawHalo,
  drawHologram,
  drawMotes,
  drawPhone,
  drawRouteVeins,
  drawShockwaves,
  drawStickman,
  drawVeinTree,
  glowSpot,
  queueMatte,
  solveFigure,
  strokeNeon,
  traceSmooth,
  wobblePath,
} from "./draw.js";

const DULL = "#9a9292";

function backdrop(ctx, alpha = 0.42) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  drawVeinTree(ctx, -40, 40, 0.72, 3, 300, 4, 2.2);
  drawVeinTree(ctx, BASE_W + 30, 160, Math.PI - 0.62, 3, 280, 12, 2.2);
  ctx.restore();
}

function heldPhone(ctx, fig, t, opt = {}) {
  const limb = opt.limb === "far" ? fig.armF : fig.armN;
  const a = limb.hand;
  const b = limb.el;
  const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const reach = opt.reach ?? 72;
  const x = a[0] + Math.cos(ang) * reach;
  const y = a[1] + Math.sin(ang) * reach + (opt.drop || 0);
  if (!opt.dim && opt.glowAlpha !== 0) glowSpot(ctx, x, y, opt.glow ?? 220, opt.glowAlpha ?? 0.18);
  drawPhone(ctx, x, y, ang - Math.PI / 2, {
    t,
    w: opt.w ?? 156,
    h: opt.h ?? 262,
    screen: opt.screen || "recline",
    dim: Boolean(opt.dim),
    color: opt.color || RED,
  });
  return [x, y];
}

function crackBody(ctx, fig, amount) {
  if (amount <= 0.02) return;
  const path = wobblePath([fig.head, fig.shoulder, fig.hip], 14, 2.2);
  ctx.save();
  ctx.globalAlpha *= amount;
  strokeNeon(ctx, (c) => traceSmooth(c, path), 4, RED_HOT, 0.8);
  ctx.restore();
}

function scene1(ctx, t, p) {
  camera(ctx, t, 10, 16, 1.8, 66);
  backdrop(ctx, 0.55);
  drawMotes(ctx, t, 40, 0.45, 24);
  glowSpot(ctx, 640, 1080, 460, 0.15);
  drawBed(ctx, 120, 1288, 860, 150);
  drawFloor(ctx, 1700);
  const fig = solveFigure({
    pose: "sit",
    x: 430,
    y: 1240,
    sc: 1.78,
    face: 1,
    jx: Math.sin(t * 40) * 2.2,
  });
  const grow = easeInOut(clamp(p / 0.62));
  drawStickman(ctx, fig, { t, expression: "down", pulse: true, bpm: 66, width: 8 });
  const phone = heldPhone(ctx, fig, t, { screen: "recline", reach: 78, w: 148, h: 246 });
  drawRouteVeins(ctx, [phone, fig.armN.hand, fig.armN.el, fig.shoulder, fig.head], grow, 3.2);
}

function scene2(ctx, t, p) {
  camera(ctx, t, 8, 12, 1.2);
  drawMotes(ctx, t, 36, 0.35, 30);
  const crack = smooth(clamp((p - 0.08) / 0.72));
  clipBand(ctx, 0, 1040, () => {
    glowSpot(ctx, 540, 520, 380, 0.1);
    drawFloor(ctx, 980);
    const fig = drawStickman(
      ctx,
      { pose: "proud", x: 540, y: 760, sc: 1.42, face: 1 },
      { t, expression: "calm", width: 8 }
    );
    crackBody(ctx, fig, crack);
  });
  drawDivider(ctx, 1040, t);
  clipBand(ctx, 1020, 900, () => {
    glowSpot(ctx, 540, 1500, 500, 0.16 + crack * 0.1);
    drawBrain(ctx, 540, 1500, 330, {
      t,
      crack: 0.3 + crack * 0.7,
      highlight: "front",
      foldAlpha: 0.6,
    });
  });
}

function scene3(ctx, t, p) {
  camera(ctx, t, 12, 18, 3.4, 96);
  backdrop(ctx, 0.7);
  drawMotes(ctx, t, 48, 0.55, 40);
  drawBed(ctx, 100, 1340, 900, 160);
  glowSpot(ctx, 700, 1100, 520, 0.2);
  const fig = solveFigure({
    pose: "hunch",
    x: 460,
    y: 1310,
    sc: 1.78,
    face: 1,
    jx: Math.sin(t * 52) * 5,
    jy: Math.cos(t * 47) * 2,
  });
  drawStickman(ctx, fig, { t, expression: "closed", pulse: true, bpm: 96, jitter: 1.3, width: 8 });
  const phone = heldPhone(ctx, fig, t, {
    screen: "wild",
    reach: 84,
    w: 176,
    h: 292,
    glow: 280,
    glowAlpha: 0.24,
  });
  drawRouteVeins(ctx, [phone, fig.armN.hand, fig.armN.el, fig.shoulder, fig.head], 1, 3.4);
  drawHologram(ctx, phone[0] + 210, phone[1] - 40, 1.15, t, 0.7 + p * 0.3);
}

function scene4(ctx, t, p) {
  camera(ctx, t, 8, 10, 2);
  drawMotes(ctx, t, 50, 0.55, 50);
  const wild = 0.5 + easeInOut(p) * 0.5;
  glowSpot(ctx, 540, 980, 640, 0.18);
  drawBrain(ctx, 540, 980, 400, {
    t,
    wild,
    highlight: "back",
    foldAlpha: 0.4,
    crack: 0.12,
  });
}

function scene5(ctx, t, p) {
  camera(ctx, t, 8, 12, 0.8, 58);
  drawMotes(ctx, t, 24, 0.22, 14);
  const cx = 540;
  const cy = 980;
  const s = 400;
  glowSpot(ctx, cx, cy, 540, 0.1 * (1 - p * 0.65));
  drawBrain(ctx, cx, cy, s, { t, foldAlpha: 0.18, outlineAlpha: 0.4 });
  const lifeOf = (rec) => 1 - smooth(clamp((p * 1.25 - rec.delay * 0.55) / 0.55));
  for (let i = 0; i < RECEPTORS.length; i += 1) {
    for (let j = i + 1; j < RECEPTORS.length; j += 1) {
      const a = RECEPTORS[i];
      const b = RECEPTORS[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy > 0.18) continue;
      const life = Math.min(lifeOf(a), lifeOf(b));
      const pa = brainPoint(cx, cy, s, a.x, a.y);
      const pb = brainPoint(cx, cy, s, b.x, b.y);
      if (life < 0.18) {
        queueMatte(ctx, (c) => {
          c.beginPath();
          c.moveTo(pa[0], pa[1]);
          c.lineTo(lerp(pa[0], pb[0], 0.42), lerp(pa[1], pb[1], 0.42));
          c.moveTo(pb[0], pb[1]);
          c.lineTo(lerp(pa[0], pb[0], 0.58), lerp(pa[1], pb[1], 0.58));
          c.lineWidth = 2;
          c.strokeStyle = "#5a4044";
          c.stroke();
        });
      } else {
        ctx.save();
        ctx.globalAlpha *= life;
        strokeNeon(ctx, (c) => {
          c.moveTo(pa[0], pa[1]);
          c.lineTo(pb[0], pb[1]);
        }, 2.4, RED, 0.55);
        ctx.restore();
      }
    }
  }
  for (const rec of RECEPTORS) {
    const life = lifeOf(rec);
    const [x, y] = brainPoint(cx, cy, s, rec.x, rec.y);
    const radius = 18;
    if (life < 0.2) {
      queueMatte(ctx, (c) => {
        c.beginPath();
        c.arc(x, y, radius, 0, Math.PI * 2);
        c.lineWidth = 3;
        c.strokeStyle = "#6a4a4e";
        c.stroke();
        c.beginPath();
        c.moveTo(x - 8, y - 8);
        c.lineTo(x + 7, y + 8);
        c.moveTo(x + 8, y - 7);
        c.lineTo(x - 7, y + 8);
        c.stroke();
      });
    } else {
      ctx.save();
      ctx.globalAlpha *= life * (0.7 + Math.sin(t * 3 + rec.phase) * 0.3);
      glowSpot(ctx, x, y, 40, 0.16 * life);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = RED_HOT;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function scene6(ctx, t, p) {
  const cut = smooth(clamp((p - 0.46) / 0.12));
  if (cut < 0.995) {
    ctx.save();
    ctx.globalAlpha *= 1 - cut;
    contrastShot(ctx, t);
    ctx.restore();
  }
  if (cut > 0.005) {
    ctx.save();
    ctx.globalAlpha *= cut;
    bedShot(ctx, t, clamp((p - 0.48) / 0.52));
    ctx.restore();
  }
}

function contrastShot(ctx, t) {
  camera(ctx, t, 8, 12, 1.2);
  backdrop(ctx, 0.28);
  drawMotes(ctx, t, 28, 0.28, 20);
  drawFloor(ctx, 1680);
  drawStickman(
    ctx,
    { pose: "front", x: 280, y: 1180, sc: 1.4, skirt: true },
    { t, expression: "calm", woman: true, hair: "down", color: DULL, core: 0.2, matte: true, width: 8 }
  );
  const man = drawStickman(
    ctx,
    { pose: "reach", x: 620, y: 1240, sc: 1.35, face: 1 },
    { t, expression: "dull", width: 8 }
  );
  const phone = heldPhone(ctx, man, t, { screen: "wild", reach: 70, w: 190, h: 310, glow: 300, glowAlpha: 0.28 });
  drawHologram(ctx, phone[0], phone[1] - 280, 1.35, t, 1);
}

function bedShot(ctx, t, p) {
  camera(ctx, t, 6, 10, 0.8, 58);
  drawMotes(ctx, t, 18, 0.18, 12);
  drawBed(ctx, 70, 960, 960, 460);
  const flat = smooth(clamp(p / 0.85));
  const man = drawStickman(
    ctx,
    { pose: "lie", x: 640, y: 1120, sc: 1.02, face: 1 },
    { t, expression: "closed", width: 8 }
  );
  drawStickman(
    ctx,
    { pose: "lie", x: 630, y: 1320, sc: 0.98, face: 1 },
    { t, expression: "dull", woman: true, hair: "pillow", color: DULL, core: 0.15, matte: true, width: 7 }
  );
  heldPhone(ctx, man, t, {
    screen: flat > 0.75 ? "flicker" : "recline",
    reach: 20,
    drop: 78,
    w: 92,
    h: 148,
    glowAlpha: 0.14 * (1 - flat * 0.75),
  });
  const nerve = [man.head, man.shoulder, man.hip, man.legN.foot].map((pt) => [pt[0], pt[1] - 34]);
  const paint = (c) => drawFlatline(c, nerve, t, flat);
  if (flat > 0.62) queueMatte(ctx, paint);
  else paint(ctx);
}

function scene7(ctx, t, p) {
  camera(ctx, t, 8, 12, 1.8, 74);
  drawMotes(ctx, t, 42, 0.45, 34);
  const infection = easeInOut(p);
  glowSpot(ctx, 700, 980, 560, 0.1 + infection * 0.16);
  drawBrain(ctx, 540, 980, 390, {
    t,
    infection,
    highlight: "front",
    crack: infection * 0.4,
    foldAlpha: 0.45,
  });
  ctx.save();
  ctx.globalAlpha *= 0.35 + infection * 0.65;
  drawVeinTree(ctx, 820, 980, 0.2, 3, 160, 7, 3.2);
  drawVeinTree(ctx, 760, 840, -0.35, 2, 130, 16, 2.6);
  ctx.restore();
}

function scene8(ctx, t, p) {
  camera(ctx, t, 6, 8, 0.4, 46);
  drawMotes(ctx, t, 14, 0.14, 8);
  const gap = lerp(0, 40, smooth(p));
  drawCouch(ctx, 120, 1280, 840);
  drawFloor(ctx, 1580);
  const man = drawStickman(
    ctx,
    { pose: "front", x: 380 - gap, y: 1180, sc: 1.28 },
    { t, expression: "dull", width: 8 }
  );
  const woman = drawStickman(
    ctx,
    { pose: "front", x: 720 + gap, y: 1165, sc: 1.22, skirt: true },
    { t, expression: "down", woman: true, hair: "down", color: "#c47078", core: 0.4, width: 8 }
  );
  drawEmpathyLink(ctx, man.head, woman.head, smooth(clamp((p - 0.32) / 0.22)));
}

function scene9(ctx, t, p) {
  const cut = smooth(clamp((p - 0.4) / 0.1));
  if (cut < 0.995) {
    ctx.save();
    ctx.globalAlpha *= 1 - cut;
    angerShot(ctx, t, clamp(p / 0.45));
    ctx.restore();
  }
  if (cut > 0.005) {
    ctx.save();
    ctx.globalAlpha *= cut;
    escapeShot(ctx, t, clamp((p - 0.42) / 0.58));
    ctx.restore();
  }
}

function angerShot(ctx, t, p) {
  camera(ctx, t, 10, 14, 4.5 + p * 3, 104);
  backdrop(ctx, 0.35);
  drawMotes(ctx, t, 36, 0.45, 60);
  drawFloor(ctx, 1680);
  glowSpot(ctx, 540, 760, 360, 0.14 + p * 0.08);
  const fig = drawStickman(
    ctx,
    {
      pose: "rage",
      x: 540 + Math.sin(t * 16) * 6,
      y: 1240,
      sc: 1.5,
      face: 1,
    },
    { t, expression: "angry", pulse: true, bpm: 104, jitter: 1.1, width: 9 }
  );
  drawShockwaves(ctx, fig.head[0], fig.head[1], t, 0.4 + p * 0.45);
  ctx.save();
  ctx.globalAlpha *= 0.75;
  drawBrain(ctx, fig.head[0] + 150, fig.head[1] - 20, 86, {
    t,
    amygdala: 0.5 + p * 0.5,
    foldAlpha: 0.35,
    outlineAlpha: 0.8,
  });
  ctx.restore();
}

function escapeShot(ctx, t, p) {
  camera(ctx, t, 14, 8, 2.8, 90);
  drawMotes(ctx, t, 40, 0.4, 80);
  const run = easeInOut(p);
  const sink = smooth(clamp((run - 0.74) / 0.26));
  const x = lerp(300, 560, run);
  ctx.save();
  ctx.globalAlpha *= 1 - sink;
  drawStickman(
    ctx,
    {
      pose: "stand",
      poseTo: "dive",
      mix: run,
      x,
      y: lerp(1260, 1180, run),
      sc: lerp(1.4, 0.72, sink),
      face: 1,
    },
    { t, expression: "down", jitter: 1.2, trail: 18 * run, width: 8 }
  );
  ctx.restore();
  const pw = lerp(180, 340, run);
  const ph = lerp(300, 560, run);
  const px = 820;
  const py = 1080;
  glowSpot(ctx, px, py, 220 + run * 80, 0.16);
  drawPhone(ctx, px, py, 0.04, { t, w: pw, h: ph, screen: "wild" });
  drawRouteVeins(ctx, [[x + 80, 1120], [px - pw * 0.35, py]], run, 3);
  for (let i = 0; i < 7; i += 1) {
    const y = (t * 80 + i * 150) % BASE_H;
    ctx.fillStyle = `rgba(255, 24, 46, ${0.04 * run})`;
    ctx.fillRect(0, y, BASE_W, 16);
  }
}

function scene10(ctx, t, p) {
  camera(ctx, t, 10, 14, 1.4);
  backdrop(ctx, 0.3);
  drawMotes(ctx, t, 30, 0.3, 22);
  drawFloor(ctx, 1700);
  const step = easeInOut(p);
  const womanX = lerp(860, 980, step);
  drawStickman(
    ctx,
    { pose: "stop", x: womanX, y: 1160, sc: 1.36, face: -1, skirt: true },
    { t, expression: "firm", woman: true, hair: "down", width: 8 }
  );
  const man = drawStickman(
    ctx,
    { pose: "reach", x: lerp(340, 280, step), y: 1280, sc: 1.28, face: 1 },
    { t, expression: "down", jitter: 1.3, width: 8 }
  );
  const phone = heldPhone(ctx, man, t, {
    limb: "far",
    screen: "flicker",
    reach: 70,
    w: 132,
    h: 214,
    glowAlpha: 0.18,
  });
  drawRouteVeins(ctx, [phone, man.armF.hand, man.armF.el, man.shoulder, man.head], 1, 3);
}

function scene11(ctx, t) {
  camera(ctx, t, 6, 10, 0.9);
  drawMotes(ctx, t, 30, 0.3, 24);
  clipBand(ctx, 0, 1020, () => {
    glowSpot(ctx, 540, 480, 340, 0.1);
    drawFloor(ctx, 960);
    const leader = drawStickman(
      ctx,
      { pose: "front", x: 540, y: 730, sc: 1.32 },
      { t, expression: "calm", width: 8 }
    );
    drawHalo(ctx, leader.head[0], leader.head[1], 78, t, 0);
  });
  drawDivider(ctx, 1040, t);
  clipBand(ctx, 1020, 900, () => {
    glowSpot(ctx, 720, 1560, 280, 0.16);
    drawFloor(ctx, 1780);
    const weak = drawStickman(
      ctx,
      { pose: "kneel", x: 470, y: 1360, sc: 1.4, face: 1 },
      { t, expression: "down", jitter: 1.6, width: 8 }
    );
    drawPhone(ctx, 780, 1620, 0.35, { t, w: 150, h: 240, screen: "wild" });
    drawRouteVeins(ctx, [[780, 1540], weak.armN.hand, weak.shoulder, weak.head], 1, 3.2);
    drawHalo(ctx, weak.head[0], weak.head[1], 52, t, 1);
  });
}

function scene12(ctx, t, p) {
  const k = easeInOut(p);
  camera(ctx, t, lerp(10, 6, k), lerp(14, 8, k), lerp(1.8, 0.3, k), 56);
  drawMotes(ctx, t, Math.round(lerp(36, 16, k)), lerp(0.4, 0.18, k), lerp(36, 14, k));
  drawFloor(ctx, 1720);
  glowSpot(ctx, 540, 900, 460, lerp(0.08, 0.13, k));
  const fig = drawStickman(
    ctx,
    {
      pose: "slump",
      poseTo: "stand",
      mix: k,
      x: 470,
      y: lerp(1320, 1240, k),
      sc: 1.55,
      face: 1,
    },
    { t, expression: k > 0.55 ? "calm" : "down", jitter: (1 - k) * 1.5, pulse: true, bpm: 56, width: 8 }
  );
  const bx = lerp(800, fig.head[0] + 6, k);
  const by = lerp(820, fig.head[1] + 4, k);
  const bs = lerp(240, 52, k);
  drawBrain(ctx, bx, by, bs, {
    t,
    repair: k,
    crack: (1 - k) * 0.65,
    foldAlpha: lerp(0.25, 0.75, k),
    infection: (1 - k) * 0.25,
  });
  drawHalo(ctx, fig.head[0], fig.head[1], lerp(46, 84, k), t, 1 - k);
  drawPhone(ctx, 240, 1580, 0.6, { t, w: 120, h: 190, dim: true, color: "#5a1828" });
  ctx.save();
  ctx.globalAlpha *= 1 - k;
  drawRouteVeins(ctx, [[280, 1520], [360, 1420]], 0.4, 2.6);
  ctx.restore();
}

export const DRAW = {
  1: scene1,
  2: scene2,
  3: scene3,
  4: scene4,
  5: scene5,
  6: scene6,
  7: scene7,
  8: scene8,
  9: scene9,
  10: scene10,
  11: scene11,
  12: scene12,
};
