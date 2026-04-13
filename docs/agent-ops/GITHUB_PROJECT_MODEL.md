# GitHub Project Model

## Project

- Name: `SecureMeet Engineering Agents`
- Purpose: operational board for issue triage, planning, implementation, review, and user-blocked work.

## Workflow statuses

The target workflow statuses are:

1. Inbox
2. Ready
3. In Progress
4. Waiting for User
5. In Review
6. Done

## Custom fields

### Priority
- Type: single select
- Values: `P0`, `P1`, `P2`, `P3`

### Area
- Type: single select
- Values: `backend`, `frontend`, `full-stack`, `security`, `ci`, `docs`, `infra`

### Agent Owner
- Type: single select
- Values:
  - `Issue Coordinator`
  - `Solution Planner`
  - `Backend Engineer`
  - `Frontend Engineer`
  - `Architecture & Review Lead`

### Needs User Reply
- Type: single select
- Values: `yes`, `no`

### PR Link
- Type: text

### Risk
- Type: single select
- Values: `low`, `medium`, `high`

## Lifecycle intent

1. `Inbox`: issue captured, pending triage.
2. `Ready`: clear problem statement and enough context to proceed.
3. `In Progress`: active planning or implementation.
4. `Waiting for User`: blocked on product/user decision.
5. `In Review`: implementation submitted and waiting review feedback.
6. `Done`: shipped and closed.

## Script behavior

`bootstrap_project.sh` enforces project existence, metadata, and custom fields idempotently.

For status options, it uses a `gh api graphql` mutation to reconcile the built-in `Status` field to the desired option set, then verifies alignment.
