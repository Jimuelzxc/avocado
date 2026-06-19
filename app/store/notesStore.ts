import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
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
  createNote: (folderId?: string) => string;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  moveNoteToFolder: (noteId: string, folderId: string | null) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      activeNoteId: null,
      createNote: (folderId?: string) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const note: Note = {
          id, folderId: folderId ?? null, title: 'Untitled', content: '',
          createdAt: now, updatedAt: now,
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

      moveNoteToFolder: (noteId, folderId) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, folderId } : n
          ),
        })),
    }),
    { name: 'avocado-notes' }
  )
);
