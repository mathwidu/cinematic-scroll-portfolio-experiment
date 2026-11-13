#!/usr/bin/env bash
# Client for the single-service forced command installed on the VPS.
set -euo pipefail
umask 077

image_digest='sha256:[0-9a-f]{64}'
case $# in
  1)
    [[ $1 == check || $1 == status ]] || exit 2
    request=$1
    ;;
  2)
    [[ $1 == verify && $2 =~ ^$image_digest$ ]] || exit 2
    request="$1 $2"
    ;;
  3)
    [[ ( $1 == deploy || $1 == rollback ) && $2 =~ ^$image_digest$ && $3 =~ ^$image_digest$ ]] || exit 2
    request="$1 $2 $3"
    ;;
  *) exit 2 ;;
esac

: "${CINEMATIC_CI_SSH_KEY:?missing CI key}"
: "${VPS_HOST:?missing VPS host}"
: "${VPS_PORT:?missing VPS port}"
[[ $VPS_PORT =~ ^[0-9]{1,5}$ ]] || exit 2

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
chmod 700 "$scratch"
printf '%s\n' "$CINEMATIC_CI_SSH_KEY" > "$scratch/id_ci"
chmod 600 "$scratch/id_ci"
for attempt in 1 2 3; do
  ssh-keyscan -T 10 -p "$VPS_PORT" -t ed25519 "$VPS_HOST" 2>/dev/null > "$scratch/known_hosts" || true
  [[ -s $scratch/known_hosts ]] && break
  [[ $attempt -eq 3 ]] || sleep 2
done
[[ -s $scratch/known_hosts ]] || { echo 'no VPS Ed25519 host key after retries' >&2; exit 1; }
fingerprints=$(ssh-keygen -lf "$scratch/known_hosts" -E sha256 | awk '{print $2}')
[[ -n $fingerprints ]] || { echo 'invalid VPS host key' >&2; exit 1; }
while IFS= read -r observed; do
  [[ $observed == 'SHA256:OP2mEYSEN/XyO8D5UMqmlmOQ3XIWOjpICG6PpFPyAAE' ]] || {
    echo 'VPS host key mismatch' >&2
    exit 1
  }
done <<< "$fingerprints"

ssh -T -i "$scratch/id_ci" \
  -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$scratch/known_hosts" -o GlobalKnownHostsFile=/dev/null \
  -o ForwardAgent=no -o ClearAllForwardings=yes -o ConnectTimeout=10 \
  -p "$VPS_PORT" "deploy@$VPS_HOST" "$request"
