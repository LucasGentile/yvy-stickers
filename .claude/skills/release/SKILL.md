---
name: release
description: Generate release notes and update README. Use when preparing a new version — summarises what changed since the last tag, updates the changelog, and bumps README if needed.
license: MIT
metadata:
  author: lucasgentile
  version: '1.0'
---

Prepare a release: generate a changelog entry and update the README if needed.

## Steps

### 1. Determine the release scope

Run in parallel:

```bash
git tag --sort=-version:refname | head -5
```

```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~20")..HEAD --oneline
```

If no tags exist, use all commits. Identify the previous tag (baseline) and the commits since then.

Ask the user: "What version should this be? (current latest: <tag>)" — suggest a semver bump based on the commit types:

- Patch if only fixes
- Minor if any `feat:` commits
- Major if any breaking changes

### 2. Categorise commits

Group the commits since the last tag into:

- **Features** (`feat:` prefix or new UI/behaviour)
- **Fixes** (`fix:` prefix or bug corrections)
- **Improvements** (refactors, performance, UX tweaks)
- **Internal** (tests, deps, tooling — omit from user-facing notes unless impactful)

### 3. Generate the changelog entry

Format:

```
## [vX.Y.Z] — YYYY-MM-DD

### Features
- ...

### Fixes
- ...

### Improvements
- ...
```

Write in Portuguese (pt-BR) since this is a Brazilian-audience app. Keep bullets concise and user-facing (what changed, not how).

If a `CHANGELOG.md` exists, prepend the new entry. If not, create it.

### 4. Update README if needed

Read the current README.md and check whether:

- The "latest version" or "last updated" field (if any) needs bumping
- Any feature described is now outdated given the new commits
- A new major feature warrants a new section

Only edit what's stale. Do not rewrite sections that are still accurate.

### 5. Confirm before writing

Show the user:

- The proposed version number
- The full changelog entry
- The README sections to be changed (if any)

Ask: "Looks good to tag and write?" — only write files after confirmation.

### 6. Write files and tag

After confirmation:

1. Write/update `CHANGELOG.md`
2. Update `README.md` if needed
3. Bump the version in `package.json` (`npm version <x.y.z> --no-git-tag-version`)
4. Show the commands to commit and tag, but do NOT run them — let the user run:
   ```bash
   git add CHANGELOG.md README.md package.json
   git commit -m "chore: release vX.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```
