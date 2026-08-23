---
description: bump app version (patch/minor/major) and commit
---

## When to use

Run this workflow whenever you want to release a new version of the app.
Ask the user which bump type they want if not specified: `patch` (bug fixes), `minor` (new features), `major` (breaking changes).

## Steps

1. Confirm the bump type with the user (`patch`, `minor`, or `major`).

// turbo 2. Run the version bump (replace `patch` with the chosen type):

```
npm run version:patch
```

This will:

- Bump the version in `package.json` (single source of truth)
- Trigger `postversion` which commits and tags automatically
- `app.config.js` reads from `package.json` so Expo picks it up at build time
- `SettingsScreen` reads from `expo-constants` so the UI always shows the right version

3. Confirm the new version to the user:

```
node -p "require('./package.json').version"
```
