#!/usr/bin/env bash
set -euo pipefail

PROJECT_TITLE="SecureMeet Engineering Agents"
PROJECT_DESCRIPTION="Project for SecureMeet nightly patrol and morning summary workflow across intake, planning, implementation, review, and waiting-for-user states."
PROJECT_README=$(cat <<'EOT'
# SecureMeet Engineering Agents

This project manages SecureMeet engineering delivery across:

- Nightly patrol discovery
- Morning summary reporting
- Manual issue intake (secondary input)
- Planning
- Implementation
- Review
- Waiting-for-user blocked work

Use this board as the execution control plane for conservative agent/human collaboration (not 24/7 continuous runs).
EOT
)

DESIRED_STATUSES=(
  "Inbox"
  "Ready"
  "In Progress"
  "Waiting for User"
  "In Review"
  "Done"
)

OWNER=""
REPO=""

log() {
  printf '[bootstrap-project] %s\n' "$*"
}

die() {
  printf '[bootstrap-project] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

json_projects_query='(
  if type=="array" then .
  elif (type=="object" and .projects?) then .projects
  elif (type=="object" and .items?) then .items
  else []
  end
)'

json_fields_query='(
  if type=="array" then .
  elif (type=="object" and .fields?) then .fields
  else []
  end
)'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner)
      OWNER="${2:-}"
      shift 2
      ;;
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --help|-h)
      cat <<'USAGE'
Usage: ./scripts/github/bootstrap_project.sh [--owner OWNER] [--repo OWNER/REPO]
USAGE
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

require_cmd gh
require_cmd jq

if ! gh auth status -h github.com >/dev/null 2>&1; then
  die "gh authentication is invalid. Run: gh auth login -h github.com"
fi

scopes_raw="$(gh auth status -h github.com -t 2>&1 | sed -n 's/.*Token scopes: //p' | head -n 1 | tr -d '\r')"
if [[ -n "$scopes_raw" && "$scopes_raw" != *project* ]]; then
  die "Current gh token is missing the 'project' scope. Run: gh auth refresh -h github.com -s project"
fi

if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi
if [[ -z "$OWNER" && -n "$REPO" ]]; then
  OWNER="${REPO%%/*}"
fi
if [[ -z "$OWNER" ]]; then
  OWNER="$(gh api user --jq .login 2>/dev/null || true)"
fi
[[ -n "$OWNER" ]] || die "Unable to determine owner. Pass --owner explicitly."

if ! gh project list --owner "$OWNER" --limit 1 >/dev/null 2>&1; then
  die "Unable to list projects for owner '$OWNER'. Ensure your auth has access and project scope."
fi

if [[ -n "$REPO" ]]; then
  if gh repo view "$REPO" --json id >/dev/null 2>&1; then
    log "Repository context: $REPO"
  else
    log "Warning: unable to access repository '$REPO'. Project link step will be skipped."
    REPO=""
  fi
fi

list_projects_json() {
  gh project list --owner "$OWNER" --limit 200 --format json
}

get_project_number() {
  list_projects_json | jq -r --arg title "$PROJECT_TITLE" "$json_projects_query | map(select(.title == \$title)) | .[0].number // empty"
}

PROJECT_NUMBER="$(get_project_number)"
if [[ -z "$PROJECT_NUMBER" ]]; then
  log "Project '$PROJECT_TITLE' not found for owner '$OWNER'. Creating..."
  PROJECT_NUMBER="$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json --jq '.number')"
  [[ -n "$PROJECT_NUMBER" ]] || PROJECT_NUMBER="$(get_project_number)"
  [[ -n "$PROJECT_NUMBER" ]] || die "Project creation appears to have failed."
  log "Created project #$PROJECT_NUMBER"
else
  log "Project already exists as #$PROJECT_NUMBER"
fi

gh project edit "$PROJECT_NUMBER" \
  --owner "$OWNER" \
  --description "$PROJECT_DESCRIPTION" \
  --readme "$PROJECT_README" >/dev/null

log "Updated project metadata (description/readme)."

if [[ -n "$REPO" ]]; then
  if gh project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1; then
    log "Linked project to repository '$REPO'."
  else
    log "Project link already exists or cannot be changed (non-fatal)."
  fi
fi

fields_json() {
  gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json
}

get_field_id() {
  local current_json="$1"
  local field_name="$2"
  jq -r --arg name "$field_name" "$json_fields_query | map(select(.name == \$name)) | .[0].id // empty" <<<"$current_json"
}

get_field_options() {
  local current_json="$1"
  local field_name="$2"
  jq -r --arg name "$field_name" "$json_fields_query | map(select(.name == \$name)) | .[0].options[]?.name" <<<"$current_json"
}

ensure_text_field() {
  local field_name="$1"
  local current_json="$2"

  if [[ -n "$(get_field_id "$current_json" "$field_name")" ]]; then
    log "Field exists: $field_name"
    return 0
  fi

  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "$field_name" \
    --data-type TEXT >/dev/null
  log "Created field: $field_name (TEXT)"
}

ensure_single_select_field() {
  local field_name="$1"
  local options_csv="$2"
  local current_json="$3"

  local existing_id
  existing_id="$(get_field_id "$current_json" "$field_name")"

  if [[ -z "$existing_id" ]]; then
    gh project field-create "$PROJECT_NUMBER" \
      --owner "$OWNER" \
      --name "$field_name" \
      --data-type SINGLE_SELECT \
      --single-select-options "$options_csv" >/dev/null
    log "Created field: $field_name (SINGLE_SELECT: $options_csv)"
    return 0
  fi

  local existing_options
  existing_options="$(get_field_options "$current_json" "$field_name")"

  local missing=()
  local opt
  IFS=',' read -r -a desired_opts <<<"$options_csv"
  for opt in "${desired_opts[@]}"; do
    if ! grep -Fxq "$opt" <<<"$existing_options"; then
      missing+=("$opt")
    fi
  done

  if [[ ${#missing[@]} -eq 0 ]]; then
    log "Field exists and matches options: $field_name"
  else
    log "Field exists but is missing options in '$field_name': ${missing[*]}"
    log "GitHub CLI limitation: there is no dedicated non-destructive gh project command to reconcile single-select options on existing built-in/custom fields."
    log "Please apply a GraphQL mutation automation step for field option reconciliation, then re-run this script."
  fi
}

current_fields="$(fields_json)"

ensure_single_select_field "Priority" "P0,P1,P2,P3" "$current_fields"
current_fields="$(fields_json)"

ensure_single_select_field "Area" "backend,frontend,full-stack,security,ci,docs,infra" "$current_fields"
current_fields="$(fields_json)"

ensure_single_select_field "Source" "manual,nightly" "$current_fields"
current_fields="$(fields_json)"

ensure_single_select_field "Agent Owner" "Issue Coordinator,Solution Planner,Backend Engineer,Frontend Engineer,Architecture & Review Lead" "$current_fields"
current_fields="$(fields_json)"

ensure_single_select_field "Needs User Reply" "yes,no" "$current_fields"
current_fields="$(fields_json)"

ensure_text_field "PR Link" "$current_fields"
current_fields="$(fields_json)"

ensure_single_select_field "Risk" "low,medium,high" "$current_fields"
current_fields="$(fields_json)"

status_options="$(get_field_options "$current_fields" "Status")"
status_field_id="$(get_field_id "$current_fields" "Status")"
[[ -n "$status_field_id" ]] || die "Could not find built-in Status field ID."

status_alignment() {
  local options="$1"
  local missing=()
  local extra=()
  local missing_joined=""
  local extra_joined=""
  local desired
  local existing

  for desired in "${DESIRED_STATUSES[@]}"; do
    if ! grep -Fxq "$desired" <<<"$options"; then
      missing+=("$desired")
    fi
  done

  while IFS= read -r existing; do
    [[ -z "$existing" ]] && continue
    if ! printf '%s\n' "${DESIRED_STATUSES[@]}" | grep -Fxq "$existing"; then
      extra+=("$existing")
    fi
  done <<<"$options"

  if [[ ${#missing[@]} -gt 0 ]]; then
    missing_joined="${missing[*]}"
  fi
  if [[ ${#extra[@]} -gt 0 ]]; then
    extra_joined="${extra[*]}"
  fi

  printf '%s\n' "${missing_joined}|||${extra_joined}"
}

alignment="$(status_alignment "$status_options")"
missing_statuses="${alignment%%|||*}"
extra_statuses="${alignment#*|||}"

if [[ -n "$missing_statuses" || -n "$extra_statuses" ]]; then
  log "Status field is not aligned. Missing: ${missing_statuses:-none}. Extra: ${extra_statuses:-none}."
  log "Reconciling built-in Status options via gh GraphQL mutation..."

  status_mutation=$(cat <<MUTATION
mutation {
  updateProjectV2Field(input:{
    fieldId:"$status_field_id",
    name:"Status",
    singleSelectOptions:[
      {name:"Inbox", color:GRAY, description:"Newly captured from nightly patrol or manual intake"},
      {name:"Ready", color:BLUE, description:"Triaged and ready for planning or implementation"},
      {name:"In Progress", color:YELLOW, description:"Actively being worked"},
      {name:"Waiting for User", color:ORANGE, description:"Blocked pending user feedback"},
      {name:"In Review", color:PURPLE, description:"Implementation submitted and under review"},
      {name:"Done", color:GREEN, description:"Completed and closed"}
    ]
  }) {
    projectV2Field {
      ... on ProjectV2SingleSelectField {
        id
      }
    }
  }
}
MUTATION
)

  if ! gh api graphql -f query="$status_mutation" >/dev/null; then
    log "Exact limitation: unable to reconcile built-in Status options automatically via gh GraphQL."
    log "Next automation step required: run a dedicated GraphQL status mutation manually, then re-run this script."
    exit 2
  fi

  current_fields="$(fields_json)"
  status_options="$(get_field_options "$current_fields" "Status")"
  alignment="$(status_alignment "$status_options")"
  missing_statuses="${alignment%%|||*}"
  extra_statuses="${alignment#*|||}"
fi

PROJECT_URL="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq '.url // empty')"
log "Project URL: ${PROJECT_URL:-unavailable}"

if [[ -z "$missing_statuses" && -z "$extra_statuses" ]]; then
  log "Status field includes all required workflow states."
else
  log "Status reconciliation incomplete. Missing: ${missing_statuses:-none}. Extra: ${extra_statuses:-none}."
  log "Exact limitation: gh project subcommands alone cannot fully enforce built-in Status option replacement."
  log "Next automation step required: GraphQL mutation troubleshooting, then re-run this script for verification."
  exit 2
fi

log "Bootstrap completed successfully for project '$PROJECT_TITLE' (#$PROJECT_NUMBER)."
