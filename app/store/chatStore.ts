import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'pdf_text'; text: string; filename: string };

export type MessageContent = string | ContentBlock[];

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent;
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

export interface PromptPreset {
  id: string;
  name: string;
  content: string;
}

export interface SlashCommand {
  id: string;
  name: string;
  shortcut: string;
  content: string;
  builtIn: boolean;
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  provider: 'openai' | 'gemini';
}

export interface PresetConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type PresetName = 'openrouter' | 'ollama' | 'gemini' | 'custom';

export type Theme = 'default' | 'dark' | 'light' | 'claude' | 'avocado';
export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'mono' | 'sans';

interface ChatState {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  presets: PromptPreset[];
  activePresetId: string | null;
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  isSettingsOpen: boolean;
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  slashCommands: SlashCommand[];
  customSlashCommands: SlashCommand[];
  provider: 'openai' | 'gemini';
  activePreset: PresetName;
  presetConfigs: Record<PresetName, PresetConfig>;

  // Actions
  setSettings: (settings: Partial<Settings>) => void;
  switchPreset: (name: PresetName) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  savePreset: (id: string | null, name: string, content: string) => string;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => void;
  createChat: () => string;
  deleteChat: (id: string) => void;
  addMessage: (chatId: string, message: { role: Message['role']; content: MessageContent }, parentId?: string) => void;
  updateLastMessage: (chatId: string, chunk: string) => void;
  replaceLastMessage: (chatId: string, content: string) => void;
  clearLastMessage: (chatId: string) => void;
  editMessage: (chatId: string, msgId: string, newContent: string) => string | null;
  regenerateMessage: (chatId: string, msgId: string) => void;
  switchVersion: (chatId: string, targetMsgId: string) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  rebuildSlashCommands: () => void;
  initSlashCommands: () => void;
  syncSlashFromPresets: () => void;
  addCustomSlashCommand: (name: string, shortcut: string, content: string) => void;
  updateCustomSlashCommand: (id: string, name: string, shortcut: string, content: string) => void;
  deleteCustomSlashCommand: (id: string) => void;
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

function presetsToSlashCommands(presets: PromptPreset[]): SlashCommand[] {
  return presets.map(p => ({
    id: `preset-${p.id}`,
    name: p.name,
    shortcut: p.name.toLowerCase().replace(/\s+/g, '-'),
    content: p.content,
    builtIn: false,
  }));
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.2-3b-instruct',
      systemPrompt: '',
      provider: 'openai',
      activePreset: 'openrouter',
      presetConfigs: {
        openrouter: { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.2-3b-instruct' },
        ollama: { apiKey: '', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' },
        gemini: { apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
        custom: { apiKey: '', baseUrl: '', model: '' },
      },
      presets: [],
      activePresetId: null,
      chats: [],
      activeChatId: null,
      isStreaming: false,
      isSettingsOpen: false,
      theme: 'avocado',
      fontSize: 'medium',
      fontFamily: 'mono',
      slashCommands: [],
      customSlashCommands: [],

      setSettings: (settings) => set((state) => {
        const newState = { ...state, ...settings };
        if (settings.apiKey !== undefined || settings.baseUrl !== undefined || settings.model !== undefined) {
          const p = state.activePreset;
          newState.presetConfigs = {
            ...state.presetConfigs,
            [p]: {
              ...state.presetConfigs[p],
              ...(settings.apiKey !== undefined ? { apiKey: settings.apiKey } : {}),
              ...(settings.baseUrl !== undefined ? { baseUrl: settings.baseUrl } : {}),
              ...(settings.model !== undefined ? { model: settings.model } : {}),
            },
          };
        }
        if (settings.systemPrompt !== undefined) {
          newState.activePresetId = null;
        }
        return newState;
      }),
      switchPreset: (name) => set((state) => ({
        activePreset: name,
        apiKey: state.presetConfigs[name].apiKey,
        baseUrl: state.presetConfigs[name].baseUrl,
        model: state.presetConfigs[name].model,
        provider: name === 'gemini' ? 'gemini' : 'openai',
      })),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

      savePreset: (id, name, content) => {
        const presets = get().presets;
        if (id) {
          set({
            presets: presets.map((p) => p.id === id ? { ...p, name, content } : p),
          });
          get().syncSlashFromPresets();
          return id;
        } else {
          const newId = crypto.randomUUID();
          set({
            presets: [...presets, { id: newId, name, content }],
          });
          get().syncSlashFromPresets();
          return newId;
        }
      },

      deletePreset: (id) => {
        set({ presets: get().presets.filter((p) => p.id !== id) });
        get().syncSlashFromPresets();
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) {
          set({ systemPrompt: preset.content, activePresetId: id });
        }
      },

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
              const raw = typeof message.content === 'string' ? message.content : message.content.map(b => b.type === 'text' ? b.text : '').join(' ').trim();
              newTitle = raw.slice(0, 30) + (raw.length > 30 ? '...' : '');
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
                ? { ...m, content: typeof m.content === 'string' ? m.content + chunk : chunk }
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

      rebuildSlashCommands: () => {
        const builtins: SlashCommand[] = [
          { id: 'builtin-help', name: 'Help', shortcut: 'help', content: 'Available commands: /help, /clear, /summarize, /explain', builtIn: true },
          { id: 'builtin-clear', name: 'Clear Chat', shortcut: 'clear', content: '', builtIn: true },
          { id: 'builtin-summarize', name: 'Summarize', shortcut: 'summarize', content: 'Summarize the following in 3 bullet points:', builtIn: true },
          { id: 'builtin-explain', name: 'Explain Simply', shortcut: 'explain', content: "Explain this like I'm 5:", builtIn: true },
        ];
        const fromPresets = presetsToSlashCommands(get().presets);
        const custom = get().customSlashCommands;
        set({ slashCommands: [...builtins, ...fromPresets, ...custom] });
      },

      initSlashCommands: () => {
        if (get().slashCommands.length > 0) return;
        get().rebuildSlashCommands();
      },

      syncSlashFromPresets: () => {
        get().rebuildSlashCommands();
      },

      addCustomSlashCommand: (name, shortcut, content) => {
        const cmd: SlashCommand = {
          id: crypto.randomUUID(),
          name,
          shortcut,
          content,
          builtIn: false,
        };
        set({ customSlashCommands: [...get().customSlashCommands, cmd] });
        get().rebuildSlashCommands();
      },

      updateCustomSlashCommand: (id, name, shortcut, content) => {
        set({
          customSlashCommands: get().customSlashCommands.map(c =>
            c.id === id ? { ...c, name, shortcut, content } : c
          ),
        });
        get().rebuildSlashCommands();
      },

      deleteCustomSlashCommand: (id) => {
        set({
          customSlashCommands: get().customSlashCommands.filter(c => c.id !== id),
        });
        get().rebuildSlashCommands();
      },
    }),
    {
      name: 'blues-chat-storage',
      partialize: (state) => ({
        activePreset: state.activePreset,
        presetConfigs: state.presetConfigs,
        systemPrompt: state.systemPrompt,
        presets: state.presets,
        activePresetId: state.activePresetId,
        chats: state.chats,
        activeChatId: state.activeChatId,
        theme: state.theme,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        slashCommands: state.slashCommands,
        customSlashCommands: state.customSlashCommands,
      }),
      migrate: (persisted: any) => {
        if (persisted?.chats?.length > 0 && persisted.chats[0]?.messages?.[0]?.id === undefined) {
          persisted.chats = persisted.chats.map(migrateChat);
        }
        // Migration v2: systemPrompt -> Default preset (only on first upgrade, not if user deleted all)
        if (persisted?.systemPrompt?.trim() && persisted?.presets === undefined) {
          persisted.presets = [{
            id: crypto.randomUUID(),
            name: 'Default',
            content: persisted.systemPrompt,
          }];
        }
        // Migration v3: flat fields → presetConfigs map
        if (persisted?.apiKey !== undefined && !persisted?.presetConfigs) {
          const isGemini = persisted.provider === 'gemini';
          const isLocal = persisted.baseUrl?.includes('localhost') || persisted.baseUrl?.includes('127.0.0.1');
          const isOpenRouter = persisted.baseUrl?.includes('openrouter.ai');
          const detectedPreset = isGemini ? 'gemini' : isLocal ? 'ollama' : isOpenRouter ? 'openrouter' : 'custom';

          persisted.presetConfigs = {
            openrouter: { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.2-3b-instruct' },
            ollama: { apiKey: '', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' },
            gemini: { apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
            custom: { apiKey: '', baseUrl: '', model: '' },
          };

          persisted.presetConfigs[detectedPreset] = {
            apiKey: persisted.apiKey || '',
            baseUrl: persisted.baseUrl || '',
            model: persisted.model || '',
          };

          persisted.activePreset = detectedPreset;
          delete persisted.apiKey;
          delete persisted.baseUrl;
          delete persisted.model;
          delete persisted.provider;
        }
        return persisted;
      },
    }
  )
);
