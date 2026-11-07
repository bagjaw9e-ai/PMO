import { spawn, execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fps = 30;
const frameDir = path.join(root, "out", "frames");
const outFile = path.join(root, "out", "stickman-neon.mp4");
const chromePath = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function audioDuration() {
  const raw = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(root, "assets", "audio.mp3")],
    { encoding: "utf8" }
  ).trim();
  const duration = Number(raw);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Durasi audio tidak valid: ${raw}`);
  return duration;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const rel = decodeURIComponent(url.pathname);
    const filePath = path.join(root, rel === "/" ? "index.html" : rel);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error("missing");
      res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

function runFfmpeg(duration) {
  const args = [
    "-y",
    "-framerate",
    String(fps),
    "-start_number",
    "0",
    "-i",
    path.join(frameDir, "%05d.jpg"),
    "-i",
    path.join(root, "assets", "audio.mp3"),
    "-t",
    duration.toFixed(3),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "17",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    "-shortest",
    outFile,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    child.stderr.on("data", (chunk) => {
      log += chunk.toString();
      if (log.length > 8000) log = log.slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${log}`));
    });
  });
}

async function main() {
  const duration = audioDuration();
  const fullFrames = Math.ceil(duration * fps);
  const frameLimit = Number(process.env.FRAME_LIMIT);
  const frameCount = Number.isFinite(frameLimit) && frameLimit > 0 ? Math.min(fullFrames, frameLimit) : fullFrames;
  await rm(frameDir, { recursive: true, force: true });
  await mkdir(frameDir, { recursive: true });
  await mkdir(path.dirname(outFile), { recursive: true });

  const { server, port } = await startServer();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--hide-scrollbars", "--mute-audio"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(`http://127.0.0.1:${port}/?export=1`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__ready === true);

    const started = Date.now();
    for (let i = 0; i < frameCount; i += 1) {
      const time = Math.min(duration, i / fps);
      const dataUrl = await page.evaluate((t) => {
        window.__anim.seek(t);
        return document.getElementById("view").toDataURL("image/jpeg", 0.92);
      }, time);
      const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
      await writeFile(path.join(frameDir, `${String(i).padStart(5, "0")}.jpg`), Buffer.from(encoded, "base64"));
      if (i % 30 === 0 || i === frameCount - 1) {
        const elapsed = (Date.now() - started) / 1000;
        const rate = (i + 1) / Math.max(elapsed, 0.001);
        const remain = (frameCount - i - 1) / rate;
        console.log(`frame ${i + 1}/${frameCount}  ${rate.toFixed(1)} fps  sisa ~${Math.ceil(remain)}s`);
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log("encoding mp4...");
  await runFfmpeg(duration);
  await rm(frameDir, { recursive: true, force: true });

  const info = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,codec_name", "-of", "json", outFile],
    { encoding: "utf8" }
  );
  console.log(info);
  console.log(`saved ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
