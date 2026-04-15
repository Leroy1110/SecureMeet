# SecureMeet Agent Ops

This directory contains the foundation for a GitHub-based engineering-agent workflow in SecureMeet.

The primary system goal is nightly patrol plus morning summary. Manual issue intake remains supported as an additional input source.

## What this setup covers

- Nightly patrol discovery
- Morning summary reporting
- Planning handoff and implementation ownership
- Review stage and quality gate
- Waiting-for-user blocking states
- Manual issue intake as a secondary path

## Target operating cadence

- One nightly patrol run
- One morning summary run
- GitHub Project kept in sync
- Conservative operation (not 24/7 continuous execution)
- Auto PRs only for small, safe tasks
- No auto-merge

## Project and labels bootstrap

Use the scripts in `scripts/github`:

```bash
./scripts/github/bootstrap_labels.sh
./scripts/github/bootstrap_project.sh
```

Both scripts are safe to re-run.

## Prerequisites

1. `gh` CLI installed.
2. `jq` installed.
3. GitHub auth configured with valid scopes:

```bash
gh auth login -h github.com
gh auth refresh -h github.com -s project,repo
```

## GitHub Project target

- Project name: `SecureMeet Engineering Agents`
- Lifecycle focus: nightly/manual intake -> planning -> implementation -> review -> done
- Blocking state: `Waiting for User`
- Source tracking: `Source` field with values `manual`, `nightly`

See [GITHUB_PROJECT_MODEL.md](./GITHUB_PROJECT_MODEL.md) for the full schema.

## Labels model

See [LABELS.md](./LABELS.md).

## Agent role model

See [AGENT_ROLES.md](./AGENT_ROLES.md).

## Known GitHub CLI limitation

`gh project` subcommands support project and field creation, but they do not provide a dedicated command for replacing built-in `Status` options.

`bootstrap_project.sh` handles this by:

- using `gh project create/edit/field-create` for baseline setup
- using `gh api graphql` to reconcile the built-in `Status` option set when needed
- validating final status alignment on each run

If GraphQL mutation execution fails (permissions/schema changes), the script exits with a clear error and next-step guidance.

## Recommended execution order

1. Run `bootstrap_labels.sh`
2. Run `bootstrap_project.sh`
3. Re-run `bootstrap_project.sh` anytime to confirm fields and statuses remain aligned
