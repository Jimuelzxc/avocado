import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parentId: string | null;
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  activeLeafId: string | null;
  folderId: string | null;
  tagIds: string[];
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
}

export type Theme = 'default' | 'dark' | 'light' | 'claude' | 'avocado';
export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'mono' | 'sans';

interface ChatState {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  isSettingsOpen: boolean;
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;

  // Actions
  setSettings: (settings: Partial<Settings>) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  createChat: () => string;
  deleteChat: (id: string) => void;
  addMessage: (chatId: string, message: { role: Message['role']; content: string }, parentId?: string) => void;
  updateLastMessage: (chatId: string, chunk: string) => void;
  replaceLastMessage: (chatId: string, content: string) => void;
  clearLastMessage: (chatId: string) => void;
  editMessage: (chatId: string, msgId: string, newContent: string) => string | null;
  regenerateMessage: (chatId: string, msgId: string) => void;
  switchVersion: (chatId: string, targetMsgId: string) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
}

export function getActivePath(messages: Message[], leafId: string | null): Message[] {
  if (!leafId) return [];
  const path: Message[] = [];
  let current = messages.find(m => m.id === leafId);
  while (current) {
    path.unshift(current);
    current = messages.find(m => m.id === current!.parentId);
  }
  return path;
}

function getDeepestDescendant(messages: Message[], startId: string): string {
  const children = messages.filter(m => m.parentId === startId);
  if (children.length === 0) return startId;
  children.sort((a, b) => b.createdAt - a.createdAt);
  return getDeepestDescendant(messages, children[0].id);
}

function migrateChat(chat: { id: string; title: string; messages: any[] }): Chat {
  let prevId: string | null = null;
  let lastId: string | null = null;
  const messages = chat.messages.map((msg: any) => {
    const id = crypto.randomUUID();
    const migrated: Message = {
      id,
      role: msg.role,
      content: msg.content,
      parentId: prevId,
      createdAt: Date.now(),
    };
    prevId = id;
    lastId = id;
    return migrated;
  });
  return {
    id: chat.id,
    title: chat.title,
    messages,
    activeLeafId: lastId,
    folderId: null,
    tagIds: [],
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      apiKey: '',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.2-3b-instruct',
      systemPrompt: '',
      chats: [],
      activeChatId: null,
      isStreaming: false,
      isSettingsOpen: false,
      theme: 'default',
      fontSize: 'medium',
      fontFamily: 'mono',

      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

      createChat: () => {
        const newId = crypto.randomUUID();
        const newChat: Chat = {
          id: newId,
          title: 'New Chat',
          messages: [],
          activeLeafId: null,
          folderId: null,
          tagIds: [],
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChatId: newId,
        }));
        return newId;
      },

      deleteChat: (id) => set((state) => {
        const newChats = state.chats.filter((c) => c.id !== id);
        let newActiveId = state.activeChatId;
        if (state.activeChatId === id) {
          newActiveId = newChats.length > 0 ? newChats[0].id : null;
        }
        return {
          chats: newChats,
          activeChatId: newActiveId,
        };
      }),

      addMessage: (chatId, message, parentId) => set((state) => {
        const parentIdOrDefault = parentId ?? state.chats.find(c => c.id === chatId)?.activeLeafId ?? null;
        const newId = crypto.randomUUID();
        const fullMsg: Message = {
          id: newId,
          role: message.role,
          content: message.content,
          parentId: parentIdOrDefault,
          createdAt: Date.now(),
        };
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            const updatedMessages = [...chat.messages, fullMsg];
            let newTitle = chat.title;
            if (chat.messages.length === 0 && message.role === 'user') {
              newTitle = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
            }
            return { ...chat, messages: updatedMessages, title: newTitle, activeLeafId: newId };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      updateLastMessage: (chatId, chunk) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId && chat.activeLeafId) {
            const messages = chat.messages.map((m) =>
              m.id === chat.activeLeafId
                ? { ...m, content: m.content + chunk }
                : m
            );
            return { ...chat, messages };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      replaceLastMessage: (chatId, content) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId && chat.activeLeafId) {
            const messages = chat.messages.map((m) =>
              m.id === chat.activeLeafId
                ? { ...m, content }
                : m
            );
            return { ...chat, messages };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      clearLastMessage: (chatId) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId && chat.activeLeafId) {
            const messages = chat.messages.map((m) =>
              m.id === chat.activeLeafId
                ? { ...m, content: '' }
                : m
            );
            return { ...chat, messages };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      editMessage: (chatId, msgId, newContent) => {
        let newMsgId: string | null = null;
        set((state) => {
          const updatedChats = state.chats.map((chat) => {
            if (chat.id !== chatId) return chat;
            const original = chat.messages.find(m => m.id === msgId);
            if (!original || original.role !== 'user') return chat;
            const newId = crypto.randomUUID();
            newMsgId = newId;
            const newMsg: Message = {
              id: newId,
              role: 'user',
              content: newContent,
              parentId: original.parentId,
              createdAt: Date.now(),
            };
            return { ...chat, messages: [...chat.messages, newMsg], activeLeafId: newId };
          });
          return { chats: updatedChats };
        });
        return newMsgId;
      },

      regenerateMessage: (chatId, msgId) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id !== chatId) return chat;
          const target = chat.messages.find(m => m.id === msgId);
          if (!target || target.role !== 'assistant') return chat;
          const newId = crypto.randomUUID();
          const newMsg: Message = {
            id: newId,
            role: 'assistant',
            content: '',
            parentId: target.parentId,
            createdAt: Date.now(),
          };
          return { ...chat, messages: [...chat.messages, newMsg], activeLeafId: newId };
        });
        return { chats: updatedChats };
      }),

      switchVersion: (chatId, targetMsgId) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id !== chatId) return chat;
          if (!chat.messages.some(m => m.id === targetMsgId)) return chat;
          const leafId = getDeepestDescendant(chat.messages, targetMsgId);
          return { ...chat, activeLeafId: leafId };
        });
        return { chats: updatedChats };
      }),

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
    }),
    {
      name: 'blues-chat-storage',
      partialize: (state) => ({
        apiKey: state.apiKey,
        baseUrl: state.baseUrl,
        model: state.model,
        systemPrompt: state.systemPrompt,
        chats: state.chats,
        activeChatId: state.activeChatId,
        theme: state.theme,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
      }),
      migrate: (persisted: any) => {
        if (persisted?.chats?.length > 0 && persisted.chats[0]?.messages?.[0]?.id === undefined) {
          persisted.chats = persisted.chats.map(migrateChat);
        }
        return persisted;
      },
    }
  )
);
