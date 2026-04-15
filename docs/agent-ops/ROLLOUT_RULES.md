# Rollout Rules

These rules apply to the agent-OS foundation rollout in branch `feat/securemeet-agent-foundation`.

## Rollout Scope

- Preserve and evolve the existing agent-ops foundation.
- Reframe operations to nightly patrol + morning summary as the primary flow.
- Keep manual issue intake supported as a secondary flow.
- Keep rollout changes focused on docs/process artifacts and bootstrap scripts.

## Out of Scope

- No recreation of the GitHub Project from scratch.
- No removal of issue templates.
- No fake automation.
- No 24/7 continuous agent execution.
- No direct product architecture redesign.

## Branch and Merge Rules

- Work only on `feat/securemeet-agent-foundation` during this rollout.
- Never merge directly to `main`.
- Merge only through reviewed PR.
- No auto-merge.

## Execution Rules

- Target one nightly patrol run and one morning summary run.
- Keep GitHub Project status and fields synchronized for nightly/manual work.
- One implementation agent per issue at a time.
- Planner and reviewer roles remain Claude-only.
- Coordination and implementation roles remain Codex-only.
- Auto-open PRs only for small, safe, low-risk tasks.

## Quality Gate for Completion

Rollout is complete only when:

1. Required `docs/agent-ops` guidance files exist and are coherent with nightly-first operation.
2. Project model supports both manual and nightly-discovered work.
3. Rules clearly enforce conservative cadence, minimal changes, and architecture preservation.
4. PR includes a complete summary and validation notes.
