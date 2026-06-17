import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useChatStore } from './chatStore';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

function collectDescendantIds(folders: Folder[], parentId: string): string[] {
  const ids: string[] = [];
  for (const f of folders) {
    if (f.parentId === parentId) {
      ids.push(f.id, ...collectDescendantIds(folders, f.id));
    }
  }
  return ids;
}

interface FolderState {
  folders: Folder[];
  activeFolderId: string | null;
  createFolder: (name: string, parentId?: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  setActiveFolderId: (id: string | null) => void;
  moveChatToFolder: (chatId: string, folderId: string | null) => void;
}

export const useFolderStore = create<FolderState>()(
  persist(
    (set) => ({
      folders: [],
      activeFolderId: null,

      createFolder: (name, parentId) => {
        const id = crypto.randomUUID();
        const folder: Folder = { id, name, parentId: parentId ?? null, createdAt: Date.now() };
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
          return {
            folders: s.folders.filter((f) => !idsToRemove.includes(f.id)),
            activeFolderId: idsToRemove.includes(s.activeFolderId ?? '') ? null : s.activeFolderId,
          };
        }),

      setActiveFolderId: (id) => set({ activeFolderId: id }),

      moveChatToFolder: (chatId, folderId) => {
        const chat = useChatStore.getState().chats.find((c) => c.id === chatId);
        if (!chat) return;
        useChatStore.setState({
          chats: useChatStore.getState().chats.map((c) =>
            c.id === chatId ? { ...c, folderId: folderId as string | null } : c
          ),
        });
      },
    }),
    { name: 'blues-folder-storage',
      partialize: (s: FolderState) => ({ folders: s.folders, activeFolderId: s.activeFolderId }),
    }
  )
);
