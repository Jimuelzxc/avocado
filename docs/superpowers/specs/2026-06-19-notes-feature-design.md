# Notes Feature — Design Spec

## Overview

Add a simple notes feature to the avocado chat app, accessible via a dedicated `/notes` route. Notes are stored locally in the browser using zustand + localStorage. The UX is inspired by Obsidian's markdown editor with live preview.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Chat workspace (unchanged) |
| `/notes` | Notes workspace |

## Sidebar Navigation

- In `app/page.tsx`, a "Notes" button is added below "New Chat" in the sidebar
- Clicking navigates to `/notes` via `useRouter().push('/notes')`
- The `/notes` page has a "← Back to Chat" button that navigates back to `/`

## Page Layout (`/notes`)

- **Left panel**: Notes list — shows all notes, each displaying title + first line preview, sorted by `updatedAt` descending
- **Right panel**: `@uiw/react-md-editor` with live preview mode — single pane where markdown renders inline as you type (Obsidian-style)
- **Top bar**: "← Back to Chat" link, "New Note" button

## Data Model

```ts
interface Note {
  id: string;
  title: string;       // auto-derived from first heading or line
  content: string;      // raw markdown text
  createdAt: number;
  updatedAt: number;
}
```

## Store (`notesStore.ts`)

- Zustand store synced to `localStorage` under key `avocado-notes`
- Operations: `createNote()`, `updateNote(id, content)`, `deleteNote(id)`, `setActiveNote(id)`
- On first load (empty store), creates a default "Welcome" note with example markdown
- Title auto-extracts from first `# ` heading or falls back to first non-empty line

## Editor Behavior

- Uses `@uiw/react-md-editor` with live preview mode — single unified editor pane
- Markdown renders inline as you type (Obsidian/Notion-style WYSIWYG)
- Auto-save: every keystroke persists to localStorage via the store
- `data-color-mode="dark"` for dark theme compatibility
- Dragbar hidden via `visibleDragbar={false}`

## Dependencies

- `@uiw/react-md-editor` — live preview markdown editor
- `zustand` — state management
- `lucide-react` — icons

## Files to Create

1. `app/notes/page.tsx` — notes page layout
2. `app/store/notesStore.ts` — zustand notes store with localStorage
3. `app/components/NotesSidebar.tsx` — notes list panel

## Files to Modify

1. `app/page.tsx` — add "Notes" button below "New Chat"

## Non-Goals

- No cloud sync
- No rich text editing (CodeMirror/Monaco)
- No graph view, backlinks, or daily notes
- No attachments in notes
