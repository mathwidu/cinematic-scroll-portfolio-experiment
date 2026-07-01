# Cinematic Scroll Portfolio Experiment

Static portfolio experiment built from the AXON keyboard prototype.

The core idea is the workflow we extracted: first frame -> final frame -> fal.ai video -> extracted frames -> scroll-controlled canvas sequence.

## Local Run

```bash
npm run serve
```

Open http://127.0.0.1:4177/.

No build step is required for the site itself. The only Node dependency is for regenerating the fal.ai video.

## Asset Shape

- Runtime frames: `assets/sequence/axon_0001.jpg...`
- Frame count: `assets/sequence/frame-count.txt`
- fal.ai input frames and prompt: `assets/fal-inputs/`
- Raw generated videos/results: `fal-results/` and ignored by git

## Regenerate With fal.ai

Load `FAL_KEY` or `FAL_API_KEY` locally, then:

```bash
npm install
npm run fal:run
```

The page automatically uses the frames in `assets/sequence/`.

## VPS

The deploy target is a lightweight Nginx container behind Traefik:

- Stack: `cinematic-scroll-portfolio`
- Service: `cinematic-scroll-portfolio_web`
- Candidate host: `cinematic-scroll.matheusduarte.dev.br`

See [docs/VPS_RUNBOOK.md](docs/VPS_RUNBOOK.md).
