# SecureMeet Agent Operating System

This repository uses a 5-agent operating model centered on nightly patrol and morning summary delivery.

Manual issue intake remains supported as a secondary input path.

## Required Preflight

Before any code or docs change:

1. Read all files in [`docs/agent-ops`](./docs/agent-ops).
2. Confirm the active branch is `feat/securemeet-agent-foundation`.
3. Confirm the planned change is minimal and preserves existing architecture.

## Target Operating Cadence

- Run one nightly patrol cycle.
- Run one morning summary cycle.
- Keep GitHub Project state in sync with discovered and manual work.
- Do not run agents continuously or 24/7.
- Open PRs automatically only for small, safe, low-risk tasks.
- Never auto-merge.

## 5-Agent Model

1. **Issue Coordinator (Codex)**
   - Owns nightly patrol intake, morning summary publication, and project sync.
   - Routes both nightly-discovered work and manual issues.
2. **Solution Planner (Claude)**
   - Produces implementation plans and risk-aware sequencing for selected work.
3. **Backend Engineer (Codex)**
   - Implements backend changes aligned with plan.
4. **Frontend Engineer (Codex)**
   - Implements frontend changes aligned with plan.
5. **Architecture & Review Lead (Claude)**
   - Performs architecture consistency and final quality review.

## Role Boundaries

- Use **Claude** for planning and architecture review.
- Use **Codex** for coordination and implementation.
- Only one implementation agent (**Backend Engineer** or **Frontend Engineer**) may actively implement for a single issue at a time.

## Branch and Merge Policy (This Rollout)

- Work only on branch `feat/securemeet-agent-foundation` for this rollout.
- Do not directly merge to `main`.
- All changes must go through a PR with review.
- No auto-merge.

## Engineering Guardrails

- Prefer minimal, targeted changes over over-engineering.
- Preserve SecureMeet’s existing architecture unless explicitly asked to change it.
- Keep backend conventions aligned with current FastAPI + SQLAlchemy + SQLite patterns.
- Keep frontend conventions aligned with current React + TypeScript + Vite patterns.
- Do not add fake automation; only document workflow behavior and repository guidance.

## PR Completion Standard

Every PR must include a clear summary:

- What changed
- Why it changed
- What was intentionally not changed
- Validation performed (tests/checks/manual verification)
- Open risks or follow-ups
