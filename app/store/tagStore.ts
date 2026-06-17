import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagState {
  tags: Tag[];
  activeTagIds: string[];
  createTag: (name: string, color?: string) => string;
  deleteTag: (id: string) => void;
  setActiveTagIds: (ids: string[]) => void;
  toggleTagFilter: (tagId: string) => void;
}

const TAG_COLORS = ['#20ffe5', '#f6ff00', '#ff8a65', '#e06c75', '#4fc3f7', '#8bc34a'];

export const useTagStore = create<TagState>()(
  persist(
    (set) => ({
      tags: [],
      activeTagIds: [],

      createTag: (name, color) => {
        const id = crypto.randomUUID();
        const tag: Tag = { id, name, color: color ?? TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] };
        set((s) => ({ tags: [...s.tags, tag] }));
        return id;
      },

      deleteTag: (id) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          activeTagIds: s.activeTagIds.filter((tid) => tid !== id),
        })),

      setActiveTagIds: (ids) => set({ activeTagIds: ids }),

      toggleTagFilter: (tagId) =>
        set((s) => ({
          activeTagIds: s.activeTagIds.includes(tagId)
            ? s.activeTagIds.filter((id) => id !== tagId)
            : [...s.activeTagIds, tagId],
        })),
    }),
    {
      name: 'blues-tag-storage',
      partialize: (s: TagState) => ({ tags: s.tags, activeTagIds: s.activeTagIds }),
    }
  )
);
