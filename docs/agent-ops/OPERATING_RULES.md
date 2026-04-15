# Operating Rules

## Purpose

Define non-negotiable operating rules for SecureMeet’s 5-agent workflow.

## Mandatory Startup Rules

1. Read all `docs/agent-ops/*.md` before making changes.
2. Confirm current branch is `feat/securemeet-agent-foundation` for this rollout.
3. Confirm scope is repository guidance and workflow behavior (no fake automation).

## Operating Cadence Rules

- Primary flow is one nightly patrol run and one morning summary run.
- Manual issue intake remains supported as a secondary input source.
- Keep operations conservative; do not run agents continuously/24-7.
- Keep GitHub Project state synchronized for both `manual` and `nightly` sources.

## Ownership Rules

- **Issue Coordinator (Codex):** owns nightly patrol intake, morning summary publication, routing, and handoff readiness.
- **Solution Planner (Claude):** owns solution shape, dependency order, and implementation plan.
- **Backend Engineer (Codex):** owns backend implementation tasks only.
- **Frontend Engineer (Codex):** owns frontend implementation tasks only.
- **Architecture & Review Lead (Claude):** owns architecture alignment, risk review, and final readiness recommendation.

## Concurrency Rules

- One implementation agent per issue at a time.
- Backend and Frontend Engineer must not implement concurrently on the same issue unless explicitly approved in the plan.
- If concurrent execution is approved, ownership boundaries must be explicit and non-overlapping.

## Architecture Preservation Rules

- Preserve existing SecureMeet architecture by default.
- Do not introduce structural refactors without explicit request.
- Prefer local fixes over broad rewrites.
- Keep API and UI behavior stable unless change is explicitly requested.

## Change Discipline Rules

- Prefer smallest viable diff that satisfies acceptance criteria.
- Avoid speculative abstractions.
- Keep naming and file placement consistent with current codebase conventions.
- Do not add automation behavior unless explicitly requested.
- Auto-open PRs only for small, safe, low-risk tasks.
- Never auto-merge.

## Review and Merge Rules

- No direct merge to `main`.
- All work must be reviewed through PR.
- PRs must include a clear change summary and validation notes.

## Escalation Rules

Escalate to Solution Planner or Architecture & Review Lead when:

- Acceptance criteria conflict with architecture constraints.
- A requested change appears to require cross-layer redesign.
- Security, auth, or data-integrity assumptions are unclear.
