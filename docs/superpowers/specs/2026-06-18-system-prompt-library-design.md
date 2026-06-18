# Design Spec: System Prompt Library

Upgrade the single system prompt to a library of named presets that users can save, load, edit, and delete.

## Goal

Give users a "library of system prompts" — instead of one textarea, they can create multiple named presets (e.g. "Code Reviewer", "Creative Writer", "Translator"), pick one to activate, and manage the collection.

## Data Model

```typescript
interface PromptPreset {
  id: string;
  name: string;
  content: string;
}
```

### Zustand Store Additions (`app/store/chatStore.ts`)

- Add `presets: PromptPreset[]` — initial value `[]`
- Add actions:
  - `savePreset(id: string | null, name: string, content: string): string` — creates or updates a preset; returns the preset id
  - `deletePreset(id: string): void` — removes a preset
  - `loadPreset(id: string): void` — copies the preset's content into `systemPrompt`
- `systemPrompt: string` stays unchanged as the "active/working" prompt
- Persist `presets` array to localStorage via `partialize`

### Migration

On first load after this update, if `systemPrompt` is non-empty and `presets` is empty, auto-create a preset named "Default" with the existing content. This ensures nobody loses their saved prompt.

## UI Changes

### SystemPromptModal (`app/components/SystemPromptModal.tsx`)

The modal gets a split layout — **no tabs, both sections visible**:

```
┌─────────────────────────────────────┐
│  SYSTEM PROMPT LIBRARY          [X] │
├───────────────────┬─────────────────┤
│                   │                 │
│  ┌─ Presets ───┐ │  Name: [_____] │
│  │ Code Reviewer│ │                 │
│  │ Creative Wrtr│ │  ┌─ Editor ──┐ │
│  │ Translator   │ │  │            │ │
│  │              │ │  │ (textarea) │ │
│  │ [+] New      │ │  │            │ │
│  └──────────────┘ │  └────────────┘ │
│                   │                 │
│                   │  [Load] [Delete]│
│                   │  [Save As New]  │
├───────────────────┴─────────────────┤
│               [CLOSE]               │
└─────────────────────────────────────┘
```

**Left pane — Preset list:**
- Shows all saved presets by name
- Clicking one selects it (highlights it)
- "+ New" button at the bottom creates a new blank preset with a placeholder name

**Right pane — Editor:**
- Name input at top
- Textarea (same as current, 10 rows)
- **Load** button — copies selected preset's content into `systemPrompt` and closes modal (this is "activating" a preset)
- **Delete** button — removes selected preset (with confirmation)
- **Save As New** button — saves current editor content as a new preset (prompts for name if empty)

**Footer:**
- CLOSE button — closes modal without changing `systemPrompt`

### Textarea + Name field behavior:
- When no preset is selected: shows current `systemPrompt` in textarea, name field is empty
- When a preset is selected: populates textarea and name with that preset's values (this is a local preview — doesn't change `systemPrompt` until "Load" is clicked)
- User can edit the textarea freely without affecting the saved preset

## Backward Compatibility

- `systemPrompt` persists as-is — existing saved prompts survive
- The API route (`app/api/chat/route.ts`) needs zero changes — it still receives `systemPrompt` as a string
- `page.tsx` needs zero changes — it already sends `systemPrompt` from the store

## Non-Goals

- No default/seeded presets shipped with the app (YAGNI)
- No per-chat prompt assignment (future scope, not v1)
- No quick-swap toolbar in the chat input (future scope — Approach 2)
- No drag-to-reorder presets

## Key Decisions

- **Working copy model** — `systemPrompt` is always the active prompt. Presets are saved templates. Loading a preset copies, doesn't link. This avoids confusing "is this preset live?" state.
- **Side-by-side layout** — list + editor visible simultaneously. Faster than tab switching, and the modal is already sizable.
- **Local preview** — clicking a preset fills the textarea but doesn't activate it until "Load" is clicked. Prevents accidental overwrites.

## Verification

- Open system prompt modal — see preset list (empty on fresh install)
- Create 2-3 presets with names and content — they persist on reload
- Click a preset — name and content fill the editor
- Click Load — modal closes, next chat message includes the loaded prompt
- Edit textarea without saving — Load still uses the preset's original content
- Delete a preset — it's gone on reload
- Existing user with saved system prompt sees it migrated to a "Default" preset
