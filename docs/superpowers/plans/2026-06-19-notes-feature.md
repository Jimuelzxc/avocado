# Notes Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a notes feature with markdown editor, live preview, and localStorage persistence.

**Architecture:** New `/notes` route with a zustand+localStorage store. Left panel shows notes list, right panel is a `@uiw/react-md-editor` with live preview mode (Obsidian/Notion-style inline rendering). "Notes" button in chat sidebar navigates via router.

**Tech Stack:** Next.js App Router, zustand v5, @uiw/react-md-editor, lucide-react

---

### Task 1: Create Notes Store

**Files:**
- Create: `app/store/notesStore.ts`

- [ ] **Step 1: Write the notes store**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  const headingMatch = firstLine.match(/^#\s+(.+)/);
  if (headingMatch) return headingMatch[1].trim();
  const trimmed = firstLine.replace(/^#+\s*/, '').trim();
  return trimmed || 'Untitled';
}

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  createNote: () => string;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      activeNoteId: null,
      createNote: () => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const note: Note = {
          id,
          title: 'Untitled',
          content: '',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ notes: [note, ...state.notes], activeNoteId: id }));
        return id;
      },
      updateNote: (id, content) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id
              ? { ...n, content, title: extractTitle(content), updatedAt: Date.now() }
              : n
          ),
        }));
      },
      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        }));
      },
      setActiveNote: (id) => set({ activeNoteId: id }),
    }),
    { name: 'avocado-notes' }
  )
);
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/store/notesStore.ts
git commit -m "feat: add notes store with zustand and localStorage persistence"
```

---

### Task 2: Add Notes Button to Chat Sidebar

**Files:**
- Modify: `app/page.tsx:399-406`

- [ ] **Step 1: Add Notes button and useRouter import**

Add `useRouter` import from `next/navigation` at the top of `page.tsx`:

```tsx
import { useRouter } from 'next/navigation';
```

In the sidebar action buttons section (around line 399-406), modify to add the Notes button:

```tsx
{/* Action Buttons */}
<div className="px-5 pb-6 flex flex-col gap-2">
  <button
    onClick={() => createChat()}
    className="w-full border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
  >
    New Chat
  </button>
  <button
    onClick={() => useRouter().push('/notes')}
    className="w-full border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
  >
    Notes
  </button>
</div>
```

Update the same section in the mobile sidebar drawer too (around lines 719-726).

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add Notes button to chat sidebar"
```

---

### Task 3: Create Notes Sidebar Component

**Files:**
- Create: `app/components/NotesSidebar.tsx`

- [ ] **Step 1: Write the NotesSidebar component**

```tsx
'use client';
import React from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useNotesStore, Note } from '../store/notesStore';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getPreview(content: string): string {
  const lines = content.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const stripped = line.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim();
    if (stripped) return stripped;
  }
  return 'Empty note';
}

export function NotesSidebar() {
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="w-64 border-r border-border h-full flex flex-col bg-surface overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-accent text-sm tracking-wide">Notes</h2>
        <button
          onClick={() => useNotesStore.getState().createNote()}
          className="p-1 hover:text-accent transition-colors cursor-pointer"
          aria-label="New note"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-sm text-text-secondary text-center">
            No notes yet. Click + to create one.
          </div>
        ) : (
          sorted.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onSelect={() => setActiveNote(note.id)}
              onDelete={() => deleteNote(note.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NoteItem({
  note,
  isActive,
  onSelect,
  onDelete,
}: {
  note: Note;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex flex-col p-3 border-b border-border/50 cursor-pointer transition-colors ${
        isActive ? 'bg-surface-overlay border-l-2 border-l-accent' : 'hover:bg-surface-overlay'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText size={14} className="shrink-0 text-text-secondary" />
          <span className="text-sm truncate">{note.title}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 hover:text-red-400 cursor-pointer p-1 transition-opacity shrink-0"
          aria-label="Delete note"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <p className="text-xs text-text-secondary truncate mt-0.5">{getPreview(note.content)}</p>
      <span className="text-[10px] text-text-secondary/60 mt-0.5">{formatDate(note.updatedAt)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/NotesSidebar.tsx
git commit -m "feat: create NotesSidebar component"
```

---

### Task 4: Create Notes Page

**Files:**
- Create: `app/notes/page.tsx`
- Dep: `npm install @uiw/react-md-editor` (live preview markdown editor)

- [ ] **Step 1: Write the notes page**

```tsx
'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useNotesStore } from '../store/notesStore';
import { NotesSidebar } from '../components/NotesSidebar';

export default function NotesPage() {
  const router = useRouter();
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const createNote = useNotesStore((s) => s.createNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);

  useEffect(() => {
    if (notes.length === 0) {
      const id = createNote();
      updateNote(id, '# Welcome to Notes\n\nStart writing in markdown...');
    } else if (!activeNoteId) {
      setActiveNote(notes[0].id);
    }
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="flex h-screen w-full bg-surface text-text-primary overflow-hidden font-mono selection:bg-[var(--selection)]">
      <NotesSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Chat
          </button>
          <button
            onClick={() => createNote()}
            className="border border-border px-3 py-1 text-sm hover:bg-surface-overlay transition-colors cursor-pointer"
          >
            + New Note
          </button>
        </div>
        {activeNote ? (
          <div className="flex-1 overflow-hidden p-4" data-color-mode="dark">
            <MDEditor
              value={activeNote.content}
              onChange={(val) => updateNote(activeNote.id, val ?? '')}
              height="100%"
              visibleDragbar={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary/40">
            Select or create a note to get started
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/notes/page.tsx
git commit -m "feat: add notes page with @uiw/react-md-editor live preview"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: Both pass with no errors.

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "chore: finalize notes feature implementation"
```
