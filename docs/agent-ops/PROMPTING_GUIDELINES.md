# Prompting Guidelines

Use these rules when writing prompts for SecureMeet agent roles.

## Core Principles

- State role mission in one clear sentence.
- Provide concrete issue context and acceptance criteria.
- Constrain work to minimal changes.
- Require architecture preservation unless explicit override is given.
- Require explicit validation outputs.

## Required Prompt Structure

1. Mission
2. Responsibilities
3. Allowed actions
4. Forbidden actions
5. Exit criteria
6. Example triggers

## Context Block Requirements

Every prompt should include:

- Issue or task reference
- Current branch (`feat/securemeet-agent-foundation` for this rollout)
- Files/components in scope
- Known constraints and non-goals
- Required validation expectations

## Architecture Guardrails to Include

- Preserve current FastAPI + SQLAlchemy + SQLite backend patterns.
- Preserve current React + TypeScript + Vite frontend patterns.
- Avoid broad refactors unless explicitly requested.
- Keep interfaces consistent across backend/frontend boundaries.

## Output Requirements

Each agent output should be structured and actionable:

- Summary of intent
- Concrete work plan or patch scope
- Validation done or required
- Risks/open questions
- Clear handoff target

## Anti-Patterns

Avoid prompts that:

- Ask for broad rewrites without constraints
- Skip acceptance criteria
- Hide forbidden actions
- Encourage speculative abstractions
- Introduce fake automation behavior
