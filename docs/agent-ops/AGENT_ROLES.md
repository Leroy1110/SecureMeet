# Agent Roles

## Issue Coordinator

- Owns nightly patrol intake and morning summary publication.
- Keeps GitHub Project status/fields synchronized for nightly and manual work.
- Ensures manual issue intake stays supported as a secondary input path.
- Routes scoped work to `Ready` with clear ownership.

## Solution Planner

- Breaks selected work into implementable steps.
- Prioritizes low-risk, high-signal items from nightly findings and manual intake.
- Captures architecture and risk notes.
- Assigns execution ownership.

## Backend Engineer

- Delivers backend/API/data-layer changes.
- Ensures tests cover backend behavior.
- Allows auto-opened PRs only when task is small, safe, and low-risk.

## Frontend Engineer

- Delivers frontend/UI interaction changes.
- Ensures UX states and client validation are complete.
- Allows auto-opened PRs only when task is small, safe, and low-risk.

## Architecture & Review Lead

- Reviews design consistency, risk, and maintainability.
- Owns final review readiness and quality gate.
- Confirms closure criteria before `Done`.
- Enforces no auto-merge.

## Cadence Contract

- Run agents conservatively, not continuously.
- Target one nightly patrol run and one morning summary run.
- Keep the board current instead of increasing run frequency.

## Waiting-for-user contract

When work is blocked on user input:

- Set project status to `Waiting for User`.
- Set `Needs User Reply` field to `yes`.
- Add `status/waiting-for-user` label.
