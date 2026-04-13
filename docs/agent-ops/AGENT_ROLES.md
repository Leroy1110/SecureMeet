# Agent Roles

## Issue Coordinator

- Owns intake triage.
- Ensures issue clarity and baseline labels.
- Moves scoped work to `Ready`.

## Solution Planner

- Breaks approved work into implementable steps.
- Captures architecture and risk notes.
- Assigns execution ownership.

## Backend Engineer

- Delivers backend/API/data-layer changes.
- Ensures tests cover backend behavior.

## Frontend Engineer

- Delivers frontend/UI interaction changes.
- Ensures UX states and client validation are complete.

## Architecture & Review Lead

- Reviews design consistency, risk, and maintainability.
- Owns final review readiness and quality gate.
- Confirms closure criteria before `Done`.

## Waiting-for-user contract

When work is blocked on user input:

- Set project status to `Waiting for User`.
- Set `Needs User Reply` field to `yes`.
- Add `status/waiting-for-user` label.
