#!/usr/bin/env bash
set -euo pipefail

here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
remote="$here/ssh-restricted.sh"
digest_re='^sha256:[0-9a-f]{64}$'
new_digest=${1-}
[[ $new_digest =~ $digest_re ]] || { echo 'invalid image digest' >&2; exit 2; }

snapshot=$("$remote" check)
old_digest=$(printf '%s\n' "$snapshot" | sed -n '1s/^current_digest=//p')
[[ $old_digest =~ $digest_re ]] || { echo 'invalid current digest' >&2; exit 1; }
[[ $(printf '%s\n' "$snapshot" | sed -n '2p') == 'replicas=1/1' ]] || { echo 'service not healthy' >&2; exit 1; }

"$remote" verify "$new_digest"
deployment_started=0
on_exit() {
  local result=$?
  trap - EXIT
  if (( result != 0 && deployment_started == 1 )); then
    echo 'Deploy failed; attempting conditional rollback to the recorded digest.' >&2
    if "$remote" rollback "$new_digest" "$old_digest" &&
      bash "$here/../smoke-public.sh"; then
      echo 'Rollback and public smoke completed.' >&2
    else
      echo 'Rollback or smoke failed; manual inspection required.' >&2
    fi
  fi
  exit "$result"
}
trap on_exit EXIT

deployment_started=1
"$remote" deploy "$old_digest" "$new_digest"
after=$("$remote" status)
printf '%s\n' "$after" | grep -Fqx "current_digest=$new_digest"
printf '%s\n' "$after" | grep -Fqx 'replicas=1/1'
bash "$here/../smoke-public.sh"
printf 'deployed_digest=%s\nprevious_digest=%s\n' "$new_digest" "$old_digest"
