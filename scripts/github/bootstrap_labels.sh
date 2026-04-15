#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[bootstrap-labels] %s\n' "$*"
}

die() {
  printf '[bootstrap-labels] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

require_cmd gh

REPO="${1:-}"

if ! gh auth status -h github.com >/dev/null 2>&1; then
  die "gh authentication is invalid. Run: gh auth login -h github.com"
fi

if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi
[[ -n "$REPO" ]] || die "Unable to determine repository. Pass it explicitly, e.g. ./scripts/github/bootstrap_labels.sh OWNER/REPO"

if ! gh repo view "$REPO" --json id >/dev/null 2>&1; then
  die "Unable to access repository '$REPO' with current gh auth."
fi

labels=(
  "type/bug|d73a4a|Defect or unintended behavior"
  "type/feature|0e8a16|New user-facing or platform capability"
  "type/refactor|1d76db|Code quality or structural improvement"
  "type/security|b60205|Security-related issue or hardening"
  "type/ci|5319e7|Build, test, or CI pipeline work"
  "type/opportunity|bfdadc|Small safe improvement discovered during patrol"
  "area/backend|0e8a16|Backend/API/database scope"
  "area/frontend|1d76db|Frontend/UI/client scope"
  "area/full-stack|7057ff|Cross-layer backend + frontend scope"
  "area/infra|fbca04|Infrastructure, deployment, or operations"
  "source/nightly|0e8a16|Discovered by nightly patrol"
  "report/morning-summary|1d76db|Morning summary report item"
  "status/waiting-for-user|d876e3|Blocked pending user reply"
  "status/ready|0e8a16|Triaged and ready to start"
  "priority/p0|b60205|Critical priority"
  "priority/p1|d93f0b|High priority"
  "priority/p2|fbca04|Medium priority"
  "priority/p3|0e8a16|Low priority"
)

count=0
for spec in "${labels[@]}"; do
  IFS='|' read -r name color description <<<"$spec"
  gh label create "$name" \
    --repo "$REPO" \
    --color "$color" \
    --description "$description" \
    --force >/dev/null
  count=$((count + 1))
  log "Upserted label: $name"
done

log "Done. Upserted $count labels in $REPO"
