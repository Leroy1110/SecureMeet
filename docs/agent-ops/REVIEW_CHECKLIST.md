# Review Checklist

Use this checklist before approving any implementation PR.

## 1. Scope and Intent

- Change matches the issue and approved plan.
- Diff is minimal and avoids over-engineering.
- No unrelated refactors were introduced.

## 2. Architecture Alignment

- Existing SecureMeet architecture is preserved unless explicitly requested.
- Backend changes follow FastAPI + SQLAlchemy + SQLite patterns.
- Frontend changes follow React + TypeScript + Vite patterns.
- Interfaces between backend and frontend remain coherent.

## 3. Correctness

- Acceptance criteria are fully met.
- Edge cases in issue scope are covered.
- Error handling is explicit and consistent.
- No obvious regression risks are introduced.

## 4. Security and Privacy

- Auth and permission checks remain correct.
- Sensitive data handling remains safe.
- No insecure defaults or bypass paths were added.
- Logging avoids leaking secrets/tokens.

## 5. Data and API Integrity

- Schema/data behavior remains consistent or migration is documented.
- API contract changes are explicit and justified.
- Backward compatibility impact is documented.

## 6. Tests and Validation

- Relevant tests were added/updated where behavior changed.
- Existing tests pass for touched areas.
- Manual verification steps are documented when tests are insufficient.

## 7. Documentation and Handoff

- PR summary clearly explains what changed and why.
- PR summary states what was intentionally not changed.
- PR includes validation evidence and known follow-ups.

## Review Outcome

- **Approve** only if all critical checks pass.
- **Request changes** if correctness, architecture, or security gaps exist.
