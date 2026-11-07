import { DRAW } from "./js/scenes.js";
import { createSfx } from "./js/sfx.js";
import {
  AUDIO_FALLBACK,
  BASE_H,
  BASE_W,
  SCENES,
  SFX_CUES,
  TRANSITION,
  ambientAt,
  sceneAt,
} from "./js/timeline.js";
import { applyGlitch, bloom, clearMattes, drawWhoosh, flushMattes, vignette } from "./js/draw.js";
import { clamp } from "./js/math.js";

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d", { alpha: false });
canvas.width = BASE_W;
canvas.height = BASE_H;

const glow = document.createElement("canvas");
glow.width = Math.round(BASE_W / 3);
glow.height = Math.round(BASE_H / 3);
const glowCtx = glow.getContext("2d", { alpha: true });

const buffer = document.createElement("canvas");
buffer.width = BASE_W;
buffer.height = BASE_H;
const bufferCtx = buffer.getContext("2d", { alpha: false });

const audio = document.getElementById("voice");
const playBtn = document.getElementById("play");
const seek = document.getElementById("seek");
const fullBtn = document.getElementById("full");
const sfx = createSfx(SFX_CUES);

const params = new URLSearchParams(location.search);
const debug = params.has("debug");
const initialT = Math.max(0, Number(params.get("t")) || 0);
let forcedT = params.has("t") ? initialT : null;
let scrubbing = false;
let lastDrawn = 0;
let introPlayed = false;

function duration() {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : AUDIO_FALLBACK;
}

function mediaTime() {
  if (forcedT != null) {
    const playing = !audio.paused && !audio.ended;
    if (playing && Math.abs((audio.currentTime || 0) - forcedT) < 0.12) forcedT = null;
    else return forcedT;
  }
  return audio.currentTime || 0;
}

function renderFrame(time) {
  const t = clamp(time, 0, SCENES[SCENES.length - 1].end);
  lastDrawn = t;
  clearMattes();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  const last = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i += 1) {
    const scene = SCENES[i];
    if (t < scene.start || t > scene.end) continue;
    const fadeIn = i === 0 ? 1 : clamp((t - scene.start) / TRANSITION);
    const fadeOut = i === last ? 1 : clamp((scene.end - t) / TRANSITION);
    const alpha = Math.min(fadeIn, fadeOut);
    if (alpha < 0.004) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    const zoom = 1 + (1 - alpha) * 0.04;
    ctx.translate(BASE_W / 2, BASE_H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-BASE_W / 2, -BASE_H / 2);
    const progress = clamp((t - scene.start) / (scene.end - scene.start));
    DRAW[scene.id](ctx, t, progress);
    ctx.restore();
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  drawWhoosh(ctx, t);
  ctx.restore();

  bloom(ctx, canvas, glow, glowCtx);
  flushMattes(ctx);
  vignette(ctx);
  applyGlitch(ctx, canvas, buffer, bufferCtx, t);

  if (debug) {
    const scene = sceneAt(t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255, 90, 100, 0.9)";
    ctx.font = "28px ui-monospace, monospace";
    ctx.fillText(`${t.toFixed(2)}   scene ${scene.id}`, 40, 70);
    ctx.restore();
  }
}

function paintSeek(fraction) {
  const pct = `${clamp(fraction) * 100}%`;
  seek.style.background = `linear-gradient(90deg, #ff2438 ${pct}, #2a0008 ${pct})`;
}

function updateUi(time) {
  const playing = !audio.paused && !audio.ended;
  playBtn.classList.toggle("is-playing", playing);
  playBtn.setAttribute("aria-label", playing ? "Jeda" : "Putar");
  if (!scrubbing) seek.value = String(Math.round((time / duration()) * 10000));
  paintSeek(Number(seek.value) / 10000);
}

function toggle() {
  if (!audio.paused && !audio.ended) {
    audio.pause();
    return;
  }
  sfx.unlock();
  const dur = duration();
  let startAt = forcedT != null ? forcedT : audio.currentTime || 0;
  if (audio.ended || startAt >= dur - 0.08) {
    startAt = 0;
    audio.currentTime = 0;
    introPlayed = false;
  } else if (Math.abs((audio.currentTime || 0) - startAt) > 0.08) {
    audio.currentTime = startAt;
  }
  if (startAt < 0.25 && !introPlayed) {
    sfx.intro();
    introPlayed = true;
  }
  sfx.reset(startAt);
  forcedT = null;
  audio.play().catch(() => {});
}

function seekTo(time) {
  const next = clamp(time, 0, duration());
  forcedT = next;
  scrubbing = true;
  sfx.reset(next);
  if (next > 0.3) introPlayed = true;
  try {
    audio.currentTime = next;
  } catch {
    /* metadata may still be loading */
  }
}

seek.addEventListener("pointerdown", () => {
  scrubbing = true;
});
seek.addEventListener("input", () => {
  seekTo((Number(seek.value) / 10000) * duration());
});
const endScrub = () => {
  scrubbing = false;
};
seek.addEventListener("pointerup", endScrub);
seek.addEventListener("pointercancel", endScrub);
seek.addEventListener("change", endScrub);

playBtn.addEventListener("click", toggle);
fullBtn.addEventListener("click", () => {
  const stage = document.getElementById("stage");
  if (document.fullscreenElement) document.exitFullscreen();
  else stage.requestFullscreen();
});

window.addEventListener("keydown", (event) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" && event.code !== "Space") return;
  if (event.code === "Space") {
    event.preventDefault();
    toggle();
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    seekTo(mediaTime() + 2);
    scrubbing = false;
  } else if (event.code === "ArrowLeft") {
    event.preventDefault();
    seekTo(Math.max(0, mediaTime() - 2));
    scrubbing = false;
  } else if (event.code === "KeyF") {
    fullBtn.click();
  }
});

function frame() {
  const time = mediaTime();
  renderFrame(time);
  const playing = !audio.paused && !audio.ended;
  sfx.update(time, playing, ambientAt(time));
  updateUi(time);
  requestAnimationFrame(frame);
}

renderFrame(initialT);
updateUi(initialT);
requestAnimationFrame(frame);

window.__anim = {
  seek(time) {
    forcedT = time;
    try {
      audio.currentTime = time;
    } catch {
      /* ignore seek before metadata */
    }
    renderFrame(time);
    updateUi(time);
  },
  time() {
    return lastDrawn;
  },
};
window.__ready = true;
