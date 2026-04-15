# Workflow States

## State Model

SecureMeet uses these workflow states for both manual issues and nightly-discovered work:

1. **Inbox**
2. **Ready**
3. **In Progress**
4. **Waiting for User**
5. **In Review**
6. **Done**

## Intake Sources

- **Manual:** issue/template-driven intake.
- **Nightly:** patrol-discovered defects, risks, or opportunities.

Track source using the `Source` project field (`manual` or `nightly`).

## State Definitions

### Inbox
- New work captured from nightly patrol or manual intake.
- Owner: Issue Coordinator.
- Required output: clarified problem statement, source set, and initial labels.
- Exit condition: item has enough context to move to `Ready`.

### Ready
- Item is triaged and scoped.
- Owner: Issue Coordinator or Solution Planner.
- Required output: confirmed acceptance criteria and assigned next role.
- Exit condition: active plan or implementation starts.

### In Progress
- Active planning or implementation.
- Owner: Solution Planner, Backend Engineer, or Frontend Engineer.
- Required output: plan update or implementation commits.
- Rule: only one implementation agent per issue at a time.
- Exit condition: PR opened or work blocked.

### Waiting for User
- Blocked on human decision/input.
- Owner: current active agent.
- Required output: explicit blocking question + impact note.
- Exit condition: user reply received and blocker resolved.

### In Review
- PR is open and awaiting review outcome.
- Owner: Architecture & Review Lead.
- Required output: review decision with required changes or approval rationale.
- Exit condition: approved and merged, or returned to `In Progress`.

### Done
- PR merged and closure criteria met.
- Owner: Issue Coordinator confirms closure.
- Required output: final closure note and traceable summary.

## Allowed Transitions

- `Inbox -> Ready`
- `Ready -> In Progress`
- `In Progress -> Waiting for User`
- `Waiting for User -> In Progress`
- `In Progress -> In Review`
- `In Review -> In Progress`
- `In Review -> Done`

## Transition Rules

- Do not skip directly from `Inbox` to `In Review`.
- Do not move to `Done` without review completion.
- Move to `Waiting for User` immediately when blocked by user input.
- Keep discovery/project sync within one nightly run + one morning summary cycle (not 24/7 continuous execution).
