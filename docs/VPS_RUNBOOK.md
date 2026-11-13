# VPS Runbook

## Target

- Repo: `mathwidu/cinematic-scroll-portfolio-experiment`
- Stack: `cinematic-scroll-portfolio`
- Service: `cinematic-scroll-portfolio_web`
- Host: `cinematic-scroll.matheusduarte.dev.br`
- Runtime: static Nginx container
- Public network: `network_swarm_public`
- Database/secrets/volumes: none

## Current CI/CD

1. Pushes to `main` and PRs run `.github/workflows/swarm-ghcr-cicd.yml`.
   Pushes publish the GHCR image; PRs build without publishing.
2. For a release, run `.github/workflows/cinematic-restricted-ci-pilot.yml`
   manually on `main` with `operation=inspect`, then `operation=deploy`.
   `deploy` runs the quality check, builds and publishes a unique image,
   updates the Swarm service by digest, checks the public route and attempts
   a conditional rollback if verification fails. A short retry window covers
   Traefik convergence after the service update.
3. Confirm the run, service digest, `1/1`, container health, HTTPS and smoke:

```bash
scripts/smoke-public.sh https://cinematic-scroll.matheusduarte.dev.br
```

## GitHub Secrets For Restricted Deploy

The manual deploy uses a dedicated key whose public entry on the VPS has
`restrict` and a forced command for this service only:

- `VPS_HOST`
- `VPS_PORT`
- `CINEMATIC_CI_SSH_KEY`

The private key stays in the GitHub Actions secret. The workflow checks the
VPS Ed25519 host fingerprint before connecting. The old `VPS_USER` and
`VPS_SSH_KEY` secrets are not referenced by either current workflow; retain
their values only for the documented recovery window.

## Historical first deployment — 2026-07-01

The first stack deployment used an unrestricted `deploy` key and the stack
file at `/home/deploy/stacks/cinematic-scroll-portfolio/stack.yml`. DNS and
Traefik were already configured. Do not use the old SSH procedure for regular
releases. The restricted workflow updates the existing service; it does not
recreate the stack or change DNS.

The manual workflow records the previous digest and only restores it if the
service still runs the digest from that release. If automatic recovery fails,
stop further releases and inspect the service from the separate administrative
session before changing it again. An image rollback cannot undo external
effects; this app currently declares no database, volume or secret.

## Notes

- Do not commit `fal-results/`; keep raw generated videos local.
- The runtime frame sequence currently uses JPG because this Mac lacks a WebP encoder in ffmpeg. Converting `assets/sequence` to WebP/AVIF later should be treated as an asset optimization pass.
