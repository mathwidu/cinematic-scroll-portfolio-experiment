# VPS Runbook

## Target

- Repo: `mathwidu/cinematic-scroll-portfolio-experiment`
- Stack: `cinematic-scroll-portfolio`
- Service: `cinematic-scroll-portfolio_web`
- Host: `cinematic-scroll.matheusduarte.dev.br`
- Runtime: static Nginx container
- Public network: `network_swarm_public`
- Database/secrets/volumes: none

## First Deploy Checklist

1. Create the GitHub repo and push `main`.
2. Create DNS `A` record:
   - `cinematic-scroll.matheusduarte.dev.br -> 187.77.47.96`
3. Build/push the image through GitHub Actions, or locally with a GHCR login.
4. Copy `deploy/swarm/cinematic-scroll-portfolio.traefik.yml` to the VPS stack folder.
5. Deploy the stack on the VPS.
6. Smoke:

```bash
scripts/smoke-public.sh https://cinematic-scroll.matheusduarte.dev.br
```

## GitHub Secrets For Workflow Deploy

Follow the personal VPS SSH pattern with one key per repo:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_KEY`

The workflow can build on every push. The remote service update runs only from `workflow_dispatch`.

## Manual First Stack Deploy

Use this only after DNS and GHCR access are ready:

```bash
ssh deploy@187.77.47.96 'mkdir -p /opt/stacks/cinematic-scroll-portfolio'
scp deploy/swarm/cinematic-scroll-portfolio.traefik.yml \
  deploy@187.77.47.96:/opt/stacks/cinematic-scroll-portfolio/stack.yml
ssh deploy@187.77.47.96 \
  'docker stack deploy -c /opt/stacks/cinematic-scroll-portfolio/stack.yml cinematic-scroll-portfolio --with-registry-auth'
```

## Rollback

```bash
ssh deploy@187.77.47.96 \
  'docker service rollback cinematic-scroll-portfolio_web'
```

## Notes

- Do not commit `fal-results/`; keep raw generated videos local.
- The runtime frame sequence currently uses JPG because this Mac lacks a WebP encoder in ffmpeg. Converting `assets/sequence` to WebP/AVIF later should be treated as an asset optimization pass.
