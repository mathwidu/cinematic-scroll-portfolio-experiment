#!/usr/bin/env bash
set -euo pipefail

here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -x $here/ssh-restricted.sh ]] || { echo 'SSH client must be executable in the checkout' >&2; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/scripts/ci"
mkdir -p "$tmp/bin"
printf '#!/usr/bin/env bash\nexit 0\n' > "$tmp/bin/sleep"
chmod 700 "$tmp/bin/sleep"
export PATH="$tmp/bin:$PATH"
cp "$here/deploy-restricted.sh" "$tmp/scripts/ci/deploy-restricted.sh"
old=sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
new=sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
printf '%s\n' "$old" > "$tmp/current"
export TEST_STATE=$tmp

cat > "$tmp/scripts/ci/ssh-restricted.sh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
case $1 in
  check|status) printf 'current_digest=%s\nreplicas=1/1\n' "$(cat "$TEST_STATE/current")" ;;
  verify) printf 'verified_digest=%s\n' "$2" ;;
  deploy) [[ $(cat "$TEST_STATE/current") == "$2" ]]; printf '%s\n' "$3" > "$TEST_STATE/current" ;;
  rollback) [[ $(cat "$TEST_STATE/current") == "$2" ]]; printf '%s\n' "$3" > "$TEST_STATE/current"; printf 'rollback\n' >> "$TEST_STATE/events" ;;
  *) exit 2 ;;
esac
MOCK
cat > "$tmp/scripts/smoke-public.sh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
count=$(cat "$TEST_STATE/smoke_count" 2>/dev/null || printf '0')
count=$((count + 1))
printf '%s\n' "$count" > "$TEST_STATE/smoke_count"
[[ ${FAIL_SMOKE-0} == 0 && $count -gt ${FAIL_BEFORE-0} ]]
MOCK
chmod 700 "$tmp/scripts/ci/ssh-restricted.sh" "$tmp/scripts/smoke-public.sh"

bash "$tmp/scripts/ci/deploy-restricted.sh" "$new" > "$tmp/output"
grep -qx "deployed_digest=$new" "$tmp/output"
test "$(cat "$tmp/current")" = "$new"
printf '%s\n' "$old" > "$tmp/current"
printf '0\n' > "$tmp/smoke_count"
FAIL_BEFORE=2 bash "$tmp/scripts/ci/deploy-restricted.sh" "$new" > "$tmp/output"
test "$(cat "$tmp/current")" = "$new"
test "$(cat "$tmp/smoke_count")" = 3
test ! -e "$tmp/events"
printf '%s\n' "$old" > "$tmp/current"
printf '0\n' > "$tmp/smoke_count"
if FAIL_SMOKE=1 bash "$tmp/scripts/ci/deploy-restricted.sh" "$new" > "$tmp/output" 2>&1; then
  echo 'expected smoke failure' >&2
  exit 1
fi
test "$(cat "$tmp/current")" = "$old"
test "$(cat "$tmp/events")" = rollback
printf '%s\n' 'deploy-restricted tests: ok'
