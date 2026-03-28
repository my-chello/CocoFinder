# Project Snapshots

This folder stores timestamped project snapshots so you can go back to an older version later.

## Create a new snapshot

Run:

```powershell
npm run snapshot
```

This creates a new `.zip` file in this folder.

## What is included

- source code
- app config
- project docs

## What is excluded

- `node_modules`
- `.git`
- `.expo`
- older files inside `snapshots`

## Restore a snapshot

1. Unzip the snapshot to a folder.
2. Open that restored folder in your editor.
3. Run:

```powershell
npm install
npx expo start
```
