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
  assignTagToChat: (chatId: string, tagId: string) => void;
  removeTagFromChat: (chatId: string, tagId: string) => void;
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
        set((s) => {
          const { useChatStore } = require('./chatStore');
          const chats: { id: string; tagIds: string[] }[] = useChatStore.getState().chats;
          useChatStore.setState({
            chats: chats.map((c: { id: string; tagIds: string[] }) => ({
              ...c,
              tagIds: c.tagIds.filter((t: string) => t !== id),
            })),
          });
          return { tags: s.tags.filter((t) => t.id !== id), activeTagIds: s.activeTagIds.filter((tid) => tid !== id) };
        }),

      setActiveTagIds: (ids) => set({ activeTagIds: ids }),

      toggleTagFilter: (tagId) =>
        set((s) => ({
          activeTagIds: s.activeTagIds.includes(tagId)
            ? s.activeTagIds.filter((id) => id !== tagId)
            : [...s.activeTagIds, tagId],
        })),

      assignTagToChat: (chatId, tagId) => {
        const { useChatStore } = require('./chatStore');
        interface ChatLike { id: string; tagIds: string[] }
        const chats: ChatLike[] = useChatStore.getState().chats;
        const chat = chats.find((c: ChatLike) => c.id === chatId);
        if (!chat || chat.tagIds.includes(tagId)) return;
        useChatStore.setState({
          chats: chats.map((c: ChatLike) =>
            c.id === chatId ? { ...c, tagIds: [...c.tagIds, tagId] } : c
          ),
        });
      },

      removeTagFromChat: (chatId, tagId) => {
        const { useChatStore } = require('./chatStore');
        interface ChatLike { id: string; tagIds: string[] }
        const chats: ChatLike[] = useChatStore.getState().chats;
        const chat = chats.find((c: ChatLike) => c.id === chatId);
        if (!chat) return;
        useChatStore.setState({
          chats: chats.map((c: ChatLike) =>
            c.id === chatId ? { ...c, tagIds: c.tagIds.filter((t: string) => t !== tagId) } : c
          ),
        });
      },
    }),
    {
      name: 'blues-tag-storage',
      partialize: (s: TagState) => ({ tags: s.tags, activeTagIds: s.activeTagIds }),
    }
  )
);
