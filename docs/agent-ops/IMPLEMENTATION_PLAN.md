# Plan: SecureMeet Agent Ops Foundation
 
## Context
 
SecureMeet is a secure video conferencing app (FastAPI + React/TS + SQLite) built by a solo high-school developer. The repo has 32 merged PRs with good conventional-commit discipline but no issue templates, PR templates, CODEOWNERS, docs/ folder, or agent configuration.
 
This plan bootstraps a 5-agent workflow (3 Codex + 2 Claude) with all the GitHub scaffolding needed. No paid API keys — all agent invocations are manual in V1. The goal is to ship one PR from branch `feat/securemeet-agent-ops-foundation` that adds all operational scaffolding without touching application code.
 
---
 
## Deliverable
 
A single markdown file: `docs/agent-ops/IMPLEMENTATION_PLAN.md` containing the full plan. Supporting files are created alongside it during implementation.
 
---
 
## File Tree — All New Files
 
```
securemeet/
  CLAUDE.md                                       # Root agent instructions (Claude Code auto-reads)
  .codex/
    AGENTS.md                                     # Codex agent context & prompts
  .github/
    CODEOWNERS
    PULL_REQUEST_TEMPLATE.md
    labels.yml                                    # Declarative label definitions
    ISSUE_TEMPLATE/
      config.yml                                  # Issue chooser config
      bug_report.yml
      feature_request.yml
      agent_task.yml
    workflows/
      issue-triage.yml                            # Auto-label on issue open
      plan-request.yml                            # workflow_dispatch → planning prompt
      pr-review-checklist.yml                     # Auto-post review checklist on PR open
      label-sync.yml                              # Sync labels from labels.yml
  docs/
    agent-ops/
      IMPLEMENTATION_PLAN.md                      # The master plan document
      AGENT_ROLES.md                              # Who does what (5 agents defined)
      WORKFLOW_GUIDE.md                           # Pipeline walkthrough + project board setup steps
      HANDOFF_PROTOCOL.md                         # How agents pass work to each other
```
 
**No changes** to `backend/`, `frontend/`, or existing workflow files.
 
---
 
## GitHub Project Board
 
- **Name**: SecureMeet Agent Ops
- **Type**: GitHub Projects v2 (board + table views)
- **Created manually** (documented in WORKFLOW_GUIDE.md)
 
### Columns (Status Field)
 
| Column | Meaning |
|---|---|
| Inbox | New issue, not yet triaged |
| Ready | Triaged, labeled, has enough info to plan or implement |
| In Progress | Being implemented (branch exists) or being planned |
| Waiting for User | Blocked on human input / decision |
| In Review | PR opened, awaiting review |
| Done | PR merged, issue closed |
 
### Custom Fields
 
| Field | Type | Values / Description |
|---|---|---|
| Priority | Single select | `P0-critical`, `P1-high`, `P2-medium`, `P3-low` |
| Area | Single select | `backend`, `frontend`, `infra`, `docs`, `ci` |
| Agent Owner | Single select | `issue-coordinator`, `solution-planner`, `backend-engineer`, `frontend-engineer`, `review-lead`, `human` |
| Needs User Reply | Checkbox (boolean) | True when issue is blocked on human input |
| PR Link | Text | URL to the implementing PR |
| Risk | Single select | `low`, `medium`, `high` |
 
### Status Transitions → Issue/PR Lifecycle
 
```
Issue created                                    → Inbox
  Labels applied, priority set (triage done)     → Ready
  Agent or human starts work (branch created)    → In Progress
  Blocked on human decision                      → Waiting for User
  PR opened                                      → In Review
  PR approved + merged, issue closed             → Done
```
 
- "Waiting for User" applies the `status/needs-user-reply` label AND moves the card
- When the user replies, move back to the previous column (Ready or In Progress)
- "Needs User Reply" custom field is toggled independently as a filter aid
 
---
 
## Labels Taxonomy
 
Defined in `.github/labels.yml`, synced via `label-sync.yml` workflow.
 
### Area (color: `#0075ca`)
`area/backend`, `area/frontend`, `area/infra`, `area/docs`, `area/security`
 
### Type
`type/bug` (#d73a4a), `type/feature` (#0e8a16), `type/enhancement` (#a2eeef), `type/chore` (#e4e669), `type/docs` (#0075ca)
 
### Priority
`priority/P0-critical` (#b60205), `priority/P1-high` (#d93f0b), `priority/P2-medium` (#fbca04), `priority/P3-low` (#0e8a16)
 
### Agent (color: `#7057ff`)
`agent/issue-coordinator`, `agent/solution-planner`, `agent/backend-engineer`, `agent/frontend-engineer`, `agent/review-lead`
 
### Status (color: `#e4e669`)
`status/needs-triage`, `status/needs-plan`, `status/plan-ready`, `status/in-progress`, `status/needs-review`, `status/needs-user-reply`, `status/blocked`
 
### Risk
`risk/low` (#0e8a16), `risk/medium` (#fbca04), `risk/high` (#b60205)
 
### Size (color: `#006b75`)
`size/XS`, `size/S`, `size/M`, `size/L`, `size/XL`
 
---
 
## 5-Agent Roles & Handoff Protocol
 
| # | Agent | Tool | Trigger | Output | Human Gate |
|---|---|---|---|---|---|
| 1 | Issue Coordinator | Codex | New issue opened | Labels applied, priority set, routed | Dev confirms triage |
| 2 | Solution Planner | Claude | Issue labeled `status/needs-plan` | Implementation plan comment | Dev reviews plan |
| 3 | Backend Engineer | Codex | Plan approved + `area/backend` | Feature branch + PR | Dev reviews PR |
| 4 | Frontend Engineer | Codex | Plan approved + `area/frontend` | Feature branch + PR | Dev reviews PR |
| 5 | Review Lead | Claude | PR opened | Review comment (approve/request changes) | Dev makes final merge decision |
 
### V1 Invocation Method (Manual)
- **Codex**: Developer opens Codex, pastes issue link or plan, references `.codex/AGENTS.md` context
- **Claude**: Developer opens Claude Code in terminal, references issue, `CLAUDE.md` provides context
- **workflow_dispatch**: `plan-request.yml` posts a structured planning prompt comment on the issue
 
---
 
## GitHub Actions Workflows (V1)
 
### 1. `issue-triage.yml`
- **Trigger**: `issues: [opened]`
- **Action**: If no `status/*` label present, add `status/needs-triage`. Auto-detect `area/backend` or `area/frontend` from issue body.
 
### 2. `plan-request.yml`
- **Trigger**: `workflow_dispatch` with `issue_number` input
- **Action**: Add `status/needs-plan` + `agent/solution-planner` labels, remove `status/needs-triage`, post structured planning prompt comment.
 
### 3. `pr-review-checklist.yml`
- **Trigger**: `pull_request: [opened]`
- **Action**: Post review checklist comment (code quality, security, testing, architecture).
 
### 4. `label-sync.yml`
- **Trigger**: Push to `main` changing `.github/labels.yml`, or `workflow_dispatch`
- **Action**: Sync repo labels from `.github/labels.yml` using `EndBug/label-sync@v2`.
 
---
 
## Issue & PR Templates
 
### Issue Templates
1. **Bug Report** (`bug_report.yml`) — fields: description, steps to reproduce, expected behavior, area dropdown, logs/screenshots
2. **Feature Request** (`feature_request.yml`) — fields: problem statement, proposed solution, area dropdown, alternatives
3. **Agent Task** (`agent_task.yml`) — fields: parent issue link, task description, area dropdown, target agent dropdown, acceptance criteria
 
### PR Template
Sections: Summary, Related Issue (`Closes #XX`), Changes (bullet list), Area checkboxes, Test Plan, Agent Attribution checkboxes, Risk level, Screenshots
 
### CODEOWNERS
```
* @Leroy1110
/backend/ @Leroy1110
/frontend/ @Leroy1110
/.github/ @Leroy1110
```
 
---
 
## V1 Scope
 
### IN
- All files in the file tree above
- Manual project board setup (documented steps)
- Manual agent invocation via Codex/Claude
- 4 new GitHub Actions workflows (lightweight automation)
- Full labels taxonomy
 
### OUT (Deferred to V2+)
- Automatic agent invocation via API (needs paid keys)
- GitHub App or bot account
- Auto-merge on approval
- Project board GraphQL automation
- Slack/Discord notifications
- Branch protection rules (set up manually, not via files)
- Codex sandboxing/guardrails beyond human review
 
---
 
## Risks
 
| Risk | Impact | Mitigation |
|---|---|---|
| Agent-generated code drifts from conventions | Medium | `CLAUDE.md` + `.codex/AGENTS.md` context files + CI + human review gate |
| Label sprawl from manual additions | Low | `label-sync.yml` enforces canonical set |
| Issues stuck in pipeline | Medium | Board makes stuck issues visible; V2 can add stale-issue reminders |
| Security vuln in agent-generated code | High | Review checklist has security section; Claude reviews all PRs; human merges |
| Process overhead slows solo developer | Medium | All agent steps are optional; scaffolding (templates, labels) is useful standalone |
| Workflow permission abuse | Low | CODEOWNERS requires owner approval for `.github/` changes; permissions scoped minimally |
 
---
 
## Phased Execution Order
 
### Phase 1: Foundation Files
**Files**: `CLAUDE.md`, `.codex/AGENTS.md`, `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/labels.yml`, all `docs/agent-ops/*.md`
**Commit**: `docs: add agent ops foundation files and CLAUDE.md`
**Acceptance**: All files exist, `CLAUDE.md` reflects project conventions accurately.
 
### Phase 2: Issue Templates
**Files**: `.github/ISSUE_TEMPLATE/config.yml`, `bug_report.yml`, `feature_request.yml`, `agent_task.yml`
**Commit**: `chore: add GitHub issue templates`
**Acceptance**: Issue chooser shows all 3 forms on GitHub; forms validate required fields.
 
### Phase 3: Label Sync Workflow
**Files**: `.github/workflows/label-sync.yml`
**Commit**: `chore: add label sync workflow`
**Acceptance**: Manual dispatch creates all labels with correct names, colors, descriptions.
 
### Phase 4: Automation Workflows
**Files**: `.github/workflows/issue-triage.yml`, `plan-request.yml`, `pr-review-checklist.yml`
**Commit**: `chore: add agent ops automation workflows`
**Acceptance**: Test issue gets auto-labeled; plan-request dispatch posts comment; PR gets checklist. Existing CI unaffected.
 
### Phase 5: Project Board (Manual)
**No files**. Follow steps in `WORKFLOW_GUIDE.md`.
**Acceptance**: Board has 6 columns + 6 custom fields. One test issue moved Inbox → Done.
 
### Phase 6: PR & Merge
Open PR from `feat/securemeet-agent-ops-foundation` → `main` using the new PR template.
**Acceptance**: PR uses new template, review checklist auto-posts, existing CI unaffected, templates verified on feature branch before merge.
 
---
 
## Key Design Decisions
 
1. **Manual invocation, not automated** — no paid API keys; `workflow_dispatch` provides structure without infrastructure
2. **Labels as primary status tracking** — simpler than Projects v2 GraphQL API for a solo dev
3. **Single umbrella branch** — atomic rollout, no intermediate broken states
4. **`delete-other-labels: false`** — preserves GitHub default labels; switch to `true` in V2
5. **Single `.codex/AGENTS.md`** — all 3 Codex agents in one file; split later if needed
 
---
 
## Verification Plan
 
1. Push branch, check that `backend-ci` and `frontend-ci` do NOT trigger (no `backend/` or `frontend/` changes)
2. Trigger `label-sync` workflow manually → verify all labels created
3. Create a test issue → verify `issue-triage` auto-labels it
4. Run `plan-request` dispatch → verify planning comment appears
5. Open the umbrella PR → verify review checklist auto-posts
6. Verify issue template chooser renders all 3 forms
7. Set up project board manually per WORKFLOW_GUIDE.md, drag a test issue through all columns