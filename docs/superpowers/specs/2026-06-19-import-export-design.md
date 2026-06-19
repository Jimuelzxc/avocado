# Import/Export for avocado

## Overview

Add JSON-based import and export of all user data (chats, notes, folders, tags,
settings) so data is never trapped in localStorage. A single file download and a
single file upload — no server, no cloud.

## Data Model: Export Format

```json
{
  "version": 1,
  "exportedAt": "2026-06-19T12:00:00.000Z",
  "stores": {
    "chats": { "state": { ... } },
    "folders": { "state": { ... } },
    "tags": { "state": { ... } },
    "notes": { "state": { ... } },
    "noteFolders": { "state": { ... } }
  }
}
```

Each `stores.*.state` is the exact object shape that zustand persist writes to
localStorage under its key. This makes export a straight read from zustand
`getState()` and import a straight `localStorage.setItem()` + page reload.

The wrapper object (`version`, `exportedAt`) allows forward-compat migration.

## UI

### Trigger points

- **Sidebar footer** — a small "Export / Import" text link, styled like the
  existing UI (mono, text-secondary, hover:text-accent)
- **Settings modal** — a new "Data" section with Export and Import buttons

### Export flow

1. User clicks Export
2. `exportAll()` reads all stores, assembles the JSON blob, triggers a download
   via `URL.createObjectURL` + hidden `<a>` click
3. File named `avocado-backup-YYYY-MM-DD.json`

No confirmation needed — export is read-only.

### Import flow

1. User clicks Import → native file picker for `.json`
2. File is read, parsed, validated against a schema
3. Preview shown: "2 chats, 4 folders, 3 tags, 1 note will be imported"
4. Radio: **Replace** (default) vs **Merge**
5. Confirm button → applies data → `window.location.reload()`

## Import Modes

### Replace (default)

1. Clear every localStorage key used by the app
2. Write imported stores: `localStorage.setItem('blues-chat-storage', ...)` etc.
3. Reload

Simple, clean, no edge cases.

### Merge

For each store type:
- Append items (chats, folders, tags, notes) that don't already exist by ID
- Settings use the imported values (last write wins)
- Ignore items with colliding IDs (existing data takes priority)

More complex, but lets users combine data from two exports without losing what
they have.

## Validation

Import function checks:

1. File is valid JSON
2. Top-level has `version` (number) and `stores` (object)
3. Each store key matches an expected key
4. Store value has a `state` property that is an object
5. `version` is ≤ current supported version

On failure: show error message, no data is touched.

## Files Changed

| File | Change |
|------|--------|
| `app/lib/importExport.ts` | **New** — `exportAll()`, `importAll()`, validation, download trigger |
| `app/components/ImportExportModal.tsx` | **New** — modal with export button, import picker, replace/merge choice, preview |
| `app/page.tsx` | Add import/export button to sidebar footer; wire up modal |
| `app/components/SettingsModal.tsx` | Add "Data" section with export/import buttons |

## Out of Scope

- Auto-backup (scheduled or on-change)
- Cloud sync
- Selective item export (pick specific chats)
- Encrypted exports
