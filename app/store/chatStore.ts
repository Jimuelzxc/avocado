import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
}

interface ChatState {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  isSettingsOpen: boolean;
  theme: string;
  
  // Actions
  setSettings: (settings: Partial<Settings>) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  createChat: () => string;
  deleteChat: (id: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateLastMessage: (chatId: string, chunk: string) => void;
  replaceLastMessage: (chatId: string, content: string) => void;
  clearLastMessage: (chatId: string) => void;
  setTheme: (theme: string) => void;
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

      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
      
      createChat: () => {
        const newId = crypto.randomUUID();
        const newChat: Chat = {
          id: newId,
          title: 'New Chat',
          messages: [],
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

      addMessage: (chatId, message) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            const updatedMessages = [...chat.messages, message];
            // Update title based on the first message
            let newTitle = chat.title;
            if (chat.messages.length === 0 && message.role === 'user') {
              newTitle = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
            }
            return { ...chat, messages: updatedMessages, title: newTitle };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      updateLastMessage: (chatId, chunk) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            const messages = [...chat.messages];
            if (messages.length > 0) {
              const lastIdx = messages.length - 1;
              messages[lastIdx] = {
                ...messages[lastIdx],
                content: messages[lastIdx].content + chunk,
              };
            }
            return { ...chat, messages };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      replaceLastMessage: (chatId, content) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            const messages = [...chat.messages];
            if (messages.length > 0) {
              const lastIdx = messages.length - 1;
              messages[lastIdx] = { ...messages[lastIdx], content };
            }
            return { ...chat, messages };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      clearLastMessage: (chatId) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            const messages = [...chat.messages];
            if (messages.length > 0) {
              const lastIdx = messages.length - 1;
              messages[lastIdx] = { ...messages[lastIdx], content: '' };
            }
            return { ...chat, messages };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),
      setTheme: (theme) => set({ theme }),
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
      }),
    }
  )
);
