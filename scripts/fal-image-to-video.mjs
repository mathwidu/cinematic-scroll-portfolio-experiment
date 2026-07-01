import { fal } from "@fal-ai/client";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { basename, resolve } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const root = resolve(new URL("..", import.meta.url).pathname);
const outDir = resolve(root, "fal-results");
const startPath = resolve(root, "assets/fal-inputs/keyboard-start.png");
const endPath = resolve(root, "assets/fal-inputs/keyboard-end.png");

const key = process.env.FAL_KEY || process.env.FAL_API_KEY;
if (!key) {
  console.error("Missing FAL_KEY or FAL_API_KEY. Export one before running npm run fal:video.");
  process.exit(2);
}

fal.config({ credentials: key });
await mkdir(outDir, { recursive: true });

const provider = process.env.FAL_VIDEO_PROVIDER || "kling-o3";
const prompt = [
  "Premium mechanical keyboard product teardown animation.",
  "Start fully assembled, then smoothly deconstruct into floating layers: keycaps, switches, plate, PCB, screws, case, and green light bar.",
  "Keep the same camera angle, dark graphite studio, luxury product photography, readable components, no text, no hands.",
  "Cinematic parallax, precise technical assembly, smooth controlled motion, commercial website hero quality."
].join(" ");

async function uploadLocalImage(path) {
  const bytes = await readFile(path);
  const blob = new Blob([bytes], { type: "image/png" });
  return fal.storage.upload(blob);
}

function pickVideoUrl(result) {
  return (
    result?.video?.url ||
    result?.video_url ||
    result?.output?.video?.url ||
    result?.output?.video_url ||
    result?.data?.video?.url ||
    result?.data?.video_url
  );
}

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }
  await finished(Readable.fromWeb(response.body).pipe(createWriteStream(path)));
}

const startUrl = await uploadLocalImage(startPath);
const endUrl = await uploadLocalImage(endPath);

let model;
let input;

if (provider === "veo-fast") {
  model = "fal-ai/veo3.1/fast/first-last-frame-to-video";
  input = {
    prompt,
    first_frame_url: startUrl,
    last_frame_url: endUrl,
    duration: "8s",
    resolution: "720p",
    aspect_ratio: "16:9"
  };
} else {
  model = "fal-ai/kling-video/o3/standard/image-to-video";
  input = {
    prompt,
    image_url: startUrl,
    end_image_url: endUrl,
    duration: "5",
    aspect_ratio: "16:9",
    negative_prompt: "warped keyboard, melted keys, text, logo, watermark, hands, people, camera jump, low quality"
  };
}

console.log(`Submitting ${model}`);
const result = await fal.subscribe(model, {
  input,
  logs: true,
  onQueueUpdate(update) {
    if (update.status === "IN_PROGRESS") {
      for (const log of update.logs || []) {
        console.log(log.message);
      }
    } else {
      console.log(update.status);
    }
  }
});

const videoUrl = pickVideoUrl(result);
if (!videoUrl) {
  await writeFile(resolve(outDir, "fal-result-debug.json"), JSON.stringify(result, null, 2));
  throw new Error("fal result did not include a recognized video URL. See fal-result-debug.json.");
}

const meta = {
  provider,
  model,
  prompt,
  startPath,
  endPath,
  startUrl,
  endUrl,
  videoUrl,
  rawResult: result
};
await writeFile(resolve(outDir, "fal-result.json"), JSON.stringify(meta, null, 2));

const videoPath = resolve(outDir, `${provider}-${basename(videoUrl).split("?")[0] || "video.mp4"}`);
await download(videoUrl, videoPath);
await writeFile(resolve(outDir, "latest-video-path.txt"), `${videoPath}\n`);
console.log(`Downloaded ${videoPath}`);
