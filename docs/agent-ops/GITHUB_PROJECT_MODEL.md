# GitHub Project Model

## Project

- Name: `SecureMeet Engineering Agents`
- Purpose: operational board for nightly-discovered and manual engineering work from intake through review.

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

### Source
- Type: single select
- Values: `manual`, `nightly`

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

1. `Inbox`: new work captured from nightly patrol or manual intake.
2. `Ready`: triaged and scoped with enough context to proceed.
3. `In Progress`: active planning or implementation.
4. `Waiting for User`: blocked on product/user decision.
5. `In Review`: implementation submitted and waiting review feedback.
6. `Done`: review-complete and closed.

## Intake mapping

- Nightly discoveries should be marked `Source=nightly` and may use `source/nightly` label.
- Manual issues should be marked `Source=manual`.
- Morning summary artifacts may use `report/morning-summary` label.

## Automation constraints

- Default operating model is one nightly run plus one morning summary.
- Keep project fields and status synchronized; avoid continuous 24/7 loops.
- Automatic PR creation is allowed only for small, safe tasks.
- Auto-merge is not allowed.

## Script behavior

`bootstrap_project.sh` enforces project existence, metadata, and custom fields idempotently.

For status options, it uses a `gh api graphql` mutation to reconcile the built-in `Status` field to the desired option set, then verifies alignment.
