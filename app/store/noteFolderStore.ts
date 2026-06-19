import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

function collectDescendantIds(folders: NoteFolder[], parentId: string): string[] {
  const ids: string[] = [];
  for (const f of folders) {
    if (f.parentId === parentId) {
      ids.push(f.id, ...collectDescendantIds(folders, f.id));
    }
  }
  return ids;
}

interface NoteFolderState {
  folders: NoteFolder[];
  createFolder: (name: string, parentId?: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
}

export const useNoteFolderStore = create<NoteFolderState>()(
  persist(
    (set) => ({
      folders: [],

      createFolder: (name, parentId) => {
        const id = crypto.randomUUID();
        const folder: NoteFolder = { id, name, parentId: parentId ?? null, createdAt: Date.now() };
        set((s) => ({ folders: [...s.folders, folder] }));
        return id;
      },

      renameFolder: (id, name) =>
        set((s) => ({
          folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
        })),

      deleteFolder: (id) =>
        set((s) => {
          const idsToRemove = [id, ...collectDescendantIds(s.folders, id)];
          return { folders: s.folders.filter((f) => !idsToRemove.includes(f.id)) };
        }),
    }),
    { name: 'avocado-note-folders' }
  )
);
