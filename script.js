const root = document.documentElement;
const canvas = document.querySelector("#kinetic-field");
const ctx = canvas.getContext("2d");
const hero = document.querySelector(".hero");
const sequenceCanvas = document.querySelector("#product-sequence");
const sequenceCtx = sequenceCanvas.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const axonSequence = {
  prefix: "assets/sequence/axon_",
  pad: 4,
  startIndex: 1,
  count: 121,
  ext: "jpg"
};
let activeSequence = axonSequence;
let frameCount = axonSequence.count;
const sequenceImages = [];
let loadedFrames = 0;
let currentFrameKey = "";
let targetProgress = 0;
let renderedProgress = 0;
let sequenceReady = false;

const particles = Array.from({ length: 86 }, (_, index) => ({
  x: Math.random(),
  y: Math.random(),
  speed: 0.16 + Math.random() * 0.52,
  radius: 1.5 + Math.random() * 4.8,
  hue: [84, 165, 12, 206][index % 4],
  drift: Math.random() * Math.PI * 2,
}));

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  setScroll();
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function sceneProgress() {
  const rect = hero.getBoundingClientRect();
  const scrollable = Math.max(1, hero.offsetHeight - window.innerHeight);
  return clamp01(-rect.top / scrollable);
}

function storyOpacity(value, center, width) {
  return clamp01(1 - Math.abs(value - center) / width);
}

function setScroll() {
  const value = sceneProgress();
  targetProgress = value;
  if (prefersReducedMotion) {
    renderedProgress = value;
    updateSceneVars(renderedProgress);
    updateSequenceFrame(true);
  }
}

function updateSceneVars(value) {
  root.style.setProperty("--scroll", value.toFixed(4));
  root.style.setProperty("--scene-progress", value.toFixed(4));
  root.style.setProperty("--panel-intro", storyOpacity(value, 0.03, 0.2).toFixed(3));
  root.style.setProperty("--panel-switches", storyOpacity(value, 0.3, 0.18).toFixed(3));
  root.style.setProperty("--panel-layers", storyOpacity(value, 0.61, 0.18).toFixed(3));
  root.style.setProperty("--panel-finish", storyOpacity(value, 0.9, 0.2).toFixed(3));
  root.dataset.phase = value < 0.28 ? "assembled" : value < 0.64 ? "switches" : "chassis";
}

function drawSequenceFrame(progress, force = false) {
  const exactFrame = clamp01(progress) * (frameCount - 1);
  const lowerIndex = Math.floor(exactFrame);
  const upperIndex = Math.min(frameCount - 1, lowerIndex + 1);
  const blend = exactFrame - lowerIndex;
  const lowerImage = sequenceImages[lowerIndex];
  const upperImage = sequenceImages[upperIndex];
  const frameKey = `${lowerIndex}:${upperIndex}:${blend.toFixed(2)}`;

  if (!force && frameKey === currentFrameKey) {
    return;
  }
  if (!lowerImage || !lowerImage.complete) {
    return;
  }

  currentFrameKey = frameKey;
  sequenceCtx.clearRect(0, 0, sequenceCanvas.width, sequenceCanvas.height);
  sequenceCtx.globalAlpha = 1;
  sequenceCtx.drawImage(lowerImage, 0, 0, sequenceCanvas.width, sequenceCanvas.height);
  if (upperImage && upperImage.complete && blend > 0.01) {
    sequenceCtx.globalAlpha = blend;
    sequenceCtx.drawImage(upperImage, 0, 0, sequenceCanvas.width, sequenceCanvas.height);
    sequenceCtx.globalAlpha = 1;
  }
}

function updateSequenceFrame(force = false) {
  if (!sequenceReady) {
    return;
  }
  drawSequenceFrame(renderedProgress, force);
}

async function detectSequence() {
  try {
    const response = await fetch("assets/sequence/frame-count.txt", { cache: "no-store" });
    if (response.ok) {
      const count = Number.parseInt((await response.text()).trim(), 10);
      if (Number.isFinite(count) && count > 8) {
        activeSequence = { ...axonSequence, count };
        frameCount = count;
      }
    }
  } catch (_error) {
    activeSequence = axonSequence;
    frameCount = axonSequence.count;
  }
}

async function preloadSequence() {
  await detectSequence();
  document.body.classList.add("sequence-loading");
  for (let i = 0; i < frameCount; i += 1) {
    const image = new Image();
    image.decoding = "async";
    const frameNumber = i + activeSequence.startIndex;
    image.src = `${activeSequence.prefix}${String(frameNumber).padStart(activeSequence.pad, "0")}.${activeSequence.ext}`;
    image.onload = () => {
      loadedFrames += 1;
      if (!sequenceReady && loadedFrames >= 8) {
        sequenceReady = true;
        document.body.classList.remove("sequence-loading");
        updateSequenceFrame();
      }
    };
    sequenceImages.push(image);
  }
}

function draw(time) {
  if (!prefersReducedMotion) {
    const delta = targetProgress - renderedProgress;
    renderedProgress += delta * 0.16;
    if (Math.abs(delta) < 0.0008) {
      renderedProgress = targetProgress;
    }
    updateSceneVars(renderedProgress);
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const scroll = Number.parseFloat(getComputedStyle(root).getPropertyValue("--scroll")) || 0;
  const cx = window.innerWidth * 0.68;
  const cy = window.innerHeight * 0.48;

  for (const p of particles) {
    const wave = Math.sin(time * 0.001 * p.speed + p.drift);
    const x = cx + (p.x - 0.5) * window.innerWidth * 0.92 + wave * 50 + scroll * 80;
    const y = cy + (p.y - 0.5) * window.innerHeight * 0.92 - scroll * 120 + Math.cos(time * 0.001 + p.drift) * 34;
    const alpha = 0.14 + (1 - scroll * 0.55) * 0.34;

    ctx.beginPath();
    ctx.fillStyle = `hsla(${p.hue}, 92%, 68%, ${alpha})`;
    ctx.arc(x, y, p.radius * (1 + scroll * 1.35), 0, Math.PI * 2);
    ctx.fill();

    if (p.radius > 4) {
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${p.hue}, 92%, 70%, ${alpha * 0.55})`;
      ctx.lineWidth = 1;
      ctx.moveTo(x, y);
      ctx.lineTo(x + wave * 44, y + 42 + scroll * 46);
      ctx.stroke();
    }
  }

  if (!prefersReducedMotion) {
    requestAnimationFrame(draw);
  }
  updateSequenceFrame();
}

function onPointerMove(event) {
  const x = event.clientX / Math.max(1, window.innerWidth) - 0.5;
  const y = event.clientY / Math.max(1, window.innerHeight) - 0.5;
  root.style.setProperty("--mouse-x", x.toFixed(4));
  root.style.setProperty("--mouse-y", y.toFixed(4));
}

const ticker = document.querySelector(".ticker-track");
if (ticker) {
  ticker.innerHTML = `${ticker.innerHTML}${ticker.innerHTML}`;
}

window.addEventListener("resize", resize);
window.addEventListener("scroll", setScroll, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: true });

resize();
preloadSequence();
setScroll();
updateSceneVars(renderedProgress);
draw(0);
