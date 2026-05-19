---
name: wrap
description: End-of-session validation — runs tests, lint, prettier, reviews recent changes for gaps and refactor opportunities. Use when stopping work and wanting to validate everything is clean.
license: MIT
metadata:
  author: lucasgentile
  version: '1.0'
---

End-of-session quality gate. Run this before wrapping up a work session.

## Steps

### 1. Understand what changed

Run in parallel:
- `git diff --stat HEAD~5..HEAD` — see which files were touched in recent commits
- `git status` — catch any uncommitted changes

Summarise the scope in one sentence before proceeding.

### 2. Run the full quality suite

Run all three in parallel:

```bash
npm run lint 2>&1
```

```bash
npm test 2>&1 | tail -30
```

```bash
npx prettier --check . 2>&1
```

### 3. Fix everything found

**Lint errors/warnings**: Fix at the source. Never suppress with `eslint-disable` unless there is a documented unavoidable reason.

**Failing tests**: Investigate root cause. Categorise as one of:
- *Missing mock* — a new import wasn't mocked in the test file. Add the mock.
- *Stale test* — the test asserts behaviour that was intentionally removed. Update the test to match current intent (or delete if the feature is gone).
- *Real regression* — the code broke something. Fix the code.

**Prettier violations**: Run `npx prettier --write <files>` on every flagged file. Do not format files that are not in the violation list.

### 4. Re-run until clean

Re-run all three checks after fixes. Repeat until:
- `npm run lint` exits 0 with no warnings
- `npm test` shows all test files passing
- `npx prettier --check .` shows "All matched files use Prettier code style!"

### 5. Self-review of recent changes

Read the diff of everything changed in this session:
```bash
git diff HEAD~5..HEAD
```

For each file, check:
- **Dead code**: state, variables, or imports that are set but never consumed
- **Missing test coverage**: new actions, hooks, or logic branches with no corresponding test
- **Incomplete features**: TODOs, commented-out blocks, or state that is fetched but never rendered
- **Over-engineering**: abstractions that aren't used by more than one caller yet

### 6. Report

Produce a concise summary with four sections:

**Fixed**
- Bullet list of issues found and resolved

**Test coverage gaps** (if any)
- New code paths that have no test

**Refactor suggestions** (optional, only if clearly worthwhile)
- Specific suggestion with file:line reference, not vague advice

**Remaining known issues** (if any)
- Things intentionally left for later, with a one-line reason

End with: "Session validated — lint ✓, tests ✓, prettier ✓"
