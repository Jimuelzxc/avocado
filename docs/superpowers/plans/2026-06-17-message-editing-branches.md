# Message Editing with Branching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ChatGPT-style message editing that creates conversation branches instead of overwriting.

**Architecture:** Flat `messages[]` array becomes a tree via `parentId`. `activeLeafId` tracks the viewed path. Edit/regenerate create siblings. Version indicator `< 1/N >` switches branches.

**Tech Stack:** Zustand v5, React 19, Next.js 16 (app router), TypeScript, Tailwind v4

---

### Task 1: Refactor Data Model & Store

**Files:**
- Modify: `app/store/chatStore.ts` (entire file)

- [ ] **Step 1: Add `id`, `parentId`, `createdAt` to Message; add `activeLeafId` to Chat**

Replace the `Message` and `Chat` interfaces in `app/store/chatStore.ts`:

```typescript
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
}
```

- [ ] **Step 2: Add activeLeafId + new actions to ChatState**

Replace the `ChatState` interface actions section (lines 39-51):

```typescript
  // Actions
  setSettings: (settings: Partial<Settings>) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  createChat: () => string;
  deleteChat: (id: string) => void;
  addMessage: (chatId: string, message: { role: Message['role']; content: string }, parentId?: string | null) => void;
  updateLastMessage: (chatId: string, chunk: string) => void;
  replaceLastMessage: (chatId: string, content: string) => void;
  clearLastMessage: (chatId: string) => void;
  editMessage: (chatId: string, msgId: string, newContent: string) => string | null;
  regenerateMessage: (chatId: string, msgId: string) => void;
  switchVersion: (chatId: string, targetMsgId: string) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
```

- [ ] **Step 3: Add utility functions before the store**

Add these pure functions above the `create` call:

```typescript
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
```

- [ ] **Step 4: Add migration utility**

```typescript
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
  };
}
```

- [ ] **Step 5: Update `createChat` to include `activeLeafId: null`**

Replace the `createChat` action:

```typescript
      createChat: () => {
        const newId = crypto.randomUUID();
        const newChat: Chat = {
          id: newId,
          title: 'New Chat',
          messages: [],
          activeLeafId: null,
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChatId: newId,
        }));
        return newId;
      },
```

- [ ] **Step 6: Update `addMessage` to accept `parentId` and set `activeLeafId`**

Replace the `addMessage` action:

```typescript
      addMessage: (chatId, message, parentId) => set((state) => {
        const newId = crypto.randomUUID();
        const fullMsg: Message = {
          id: newId,
          role: message.role,
          content: message.content,
          parentId: parentId ?? null,
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
```

- [ ] **Step 7: Update streaming actions to use `activeLeafId` instead of last array index**

Replace `updateLastMessage`, `replaceLastMessage`, `clearLastMessage`:

```typescript
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
```

- [ ] **Step 8: Add migration call in store initialization and add branching actions**

Replace the entire store create call. The full store code after all changes:

```typescript
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
  };
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
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;

  setSettings: (settings: Partial<Settings>) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  createChat: () => string;
  deleteChat: (id: string) => void;
  addMessage: (chatId: string, message: { role: Message['role']; content: string }, parentId?: string | null) => void;
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

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
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
        const newId = crypto.randomUUID();
        const fullMsg: Message = {
          id: newId,
          role: message.role,
          content: message.content,
          parentId: parentId ?? null,
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
```

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors (the store is self-contained, no changes in page.tsx yet)

---

### Task 2: Update page.tsx — Active Path Rendering, Edit Mode, Version Switcher

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update imports**

Replace the import line:

```typescript
import { useChatStore, Message, getActivePath } from './store/chatStore';
```

- [ ] **Step 2: Replace `messages` derivation with `activePath`**

Replace lines 44-46:

```typescript
  const activeChat = chats.find((c) => c.id === activeChatId);
  const activePath = activeChat?.activeLeafId
    ? getActivePath(activeChat.messages, activeChat.activeLeafId)
    : [];
```

Also update the `useEffect` dependency from `messages` to `activePath` (line 57):

```typescript
  useEffect(() => {
    if (mounted) {
      scrollToBottom();
    }
  }, [activePath, mounted]);
```

- [ ] **Step 3: Add `streamFromActivePath` helper and replace `handleSendMessage`**

Add `streamFromActivePath` BEFORE `handleSendMessage`, then replace `handleSendMessage`. This ordering matters because `handleSendMessage` calls `streamFromActivePath`.

```typescript
  const streamFromActivePath = async (chatId: string, userContent: string) => {
    const currentState = useChatStore.getState();
    const currentChat = currentState.chats.find((c) => c.id === chatId);
    if (!currentChat || !currentChat.activeLeafId) return;

    // Get messages for API: active path up to (not including) the streaming leaf
    const fullPath = getActivePath(currentChat.messages, currentChat.activeLeafId);
    // Remove the last message (empty assistant placeholder) for history
    const historyMessages = fullPath.slice(0, -1);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: useChatStore.getState().apiKey,
          baseUrl: useChatStore.getState().baseUrl,
          model: useChatStore.getState().model,
          systemPrompt: useChatStore.getState().systemPrompt,
          messages: [...historyMessages, { role: 'user', content: userContent }],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        replaceLastMessage(chatId, `Error: ${data.error || 'Failed to fetch AI response'}`);
        useChatStore.setState({ isStreaming: false });
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        replaceLastMessage(chatId, 'Error: Response stream is not readable.');
        useChatStore.setState({ isStreaming: false });
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned) continue;

          if (cleaned.startsWith('data: ')) {
            const dataStr = cleaned.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const chunk = parsed.choices?.[0]?.delta?.content || '';
              if (chunk) {
                updateLastMessage(chatId, chunk);
              }
            } catch {
              // Ignore incomplete line parse failures
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error('Streaming error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      replaceLastMessage(chatId, `Error: ${errorMessage}`);
    } finally {
      useChatStore.setState({ isStreaming: false });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent | { preventDefault: () => void }, customContent?: string) => {
    e?.preventDefault();
    const text = customContent ?? inputValue;
    if (!text.trim() || isStreaming) return;

    if (!customContent) {
      setInputValue('');
    }

    let targetChatId = activeChatId;
    if (!targetChatId) {
      targetChatId = createChat();
    }

    const activeChatNow = chats.find((c) => c.id === targetChatId);
    const parentId = activeChatNow?.activeLeafId ?? null;

    // Add user message with parentId
    addMessage(targetChatId, { role: 'user', content: text }, parentId);

    // The activeLeafId is now the new user message. Add empty assistant as its child.
    useChatStore.setState({ isStreaming: true });
    const stateAfterUser = useChatStore.getState();
    const chatAfterUser = stateAfterUser.chats.find(c => c.id === targetChatId);
    const userMsgId = chatAfterUser?.activeLeafId;
    addMessage(targetChatId, { role: 'assistant', content: '' }, userMsgId);

    await streamFromActivePath(targetChatId, text);
  };
```

- [ ] **Step 4: Replace `handleRegenerate` to use branching**

Replace the `handleRegenerate` function:

```typescript
  const handleRegenerate = async (msgId: string) => {
    if (!activeChatId || isStreaming) return;
    const activeChatNow = chats.find((c) => c.id === activeChatId);
    if (!activeChatNow) return;

    const assistantMsg = activeChatNow.messages.find(m => m.id === msgId);
    if (!assistantMsg || assistantMsg.role !== 'assistant') return;
    const parentUserMsg = activeChatNow.messages.find(m => m.id === assistantMsg.parentId);
    if (!parentUserMsg || parentUserMsg.role !== 'user') return;

    // Create new assistant sibling (sets activeLeafId to new empty message)
    useChatStore.getState().regenerateMessage(activeChatId, msgId);

    // Stream new response
    await streamFromActivePath(activeChatId, parentUserMsg.content);
  };
```

- [ ] **Step 5: Add state declarations + `handleEdit` and `handleSwitchVersion`**

First, add the new `useState` declarations to the existing ones (after `const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);`):

```typescript
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
```

Then add these functions after `handleCopy`:

```typescript
  const handleEdit = (msgId: string, currentContent: string) => {
    setEditingMsgId(msgId);
    setEditValue(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!activeChatId || !editingMsgId || !editValue.trim() || isStreaming) return;
    const newContent = editValue.trim();
    const newMsgId = useChatStore.getState().editMessage(activeChatId, editingMsgId, newContent);
    setEditingMsgId(null);
    setEditValue('');

    // Auto-regenerate: stream new response
    if (newMsgId) {
      useChatStore.setState({ isStreaming: true });
      addMessage(activeChatId, { role: 'assistant', content: '' }, newMsgId);
      await streamFromActivePath(activeChatId, newContent);
    }
  };

  const handleSwitchVersion = (targetMsgId: string) => {
    if (!activeChatId) return;
    useChatStore.getState().switchVersion(activeChatId, targetMsgId);
  };
```

- [ ] **Step 7: Replace the message rendering loop**

Replace the message rendering section (lines 270-328). The full section from `<div className="flex-1 overflow-y-auto...">` to `</div>`:

```tsx
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-4 md:gap-8">
            {activePath.length === 0 ? (
              <div className="border border-border p-4 md:p-8 bg-surface text-center my-8 flex flex-col gap-4">
                <h2 className="text-lg md:text-xl text-accent font-bold">blues. SYSTEM V1.0</h2>
                <p className="text-xs md:text-sm leading-relaxed text-text-secondary">
                  Welcome to the blues AI retro terminal.
                  Please send a message to start conversing, or open the sidebar to configure your model and keys.
                </p>
                <div className="text-xs md:text-sm text-left bg-surface-overlay p-4 border border-border/20 text-accent-secondary">
                  Current Provider: <span className="text-text-primary">{baseUrl}</span><br />
                  Active Model: <span className="text-text-primary">{model}</span>
                </div>
              </div>
            ) : (
              activePath.map((msg) => {
                const siblings = activeChat
                  ? activeChat.messages.filter(m => m.parentId === msg.parentId).sort((a, b) => a.createdAt - b.createdAt)
                  : [];
                const siblingIdx = siblings.findIndex(s => s.id === msg.id);
                const isEditing = editingMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`${msg.role === 'user'
                      ? 'self-end border border-border p-4 max-w-[90%] md:max-w-[70%] bg-surface'
                      : 'self-start max-w-[95%] md:max-w-[85%] flex flex-col gap-4'
                      }`}
                  >
                    {msg.role === 'user' ? (
                      isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="w-full bg-transparent border border-border p-2 outline-none resize-none text-base font-mono whitespace-pre-wrap"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                            }}
                            autoFocus
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={isStreaming || !editValue.trim()}
                              className="text-xs border border-border px-3 py-1 hover:bg-surface-overlay transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-xs border border-border px-3 py-1 hover:bg-surface-overlay transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-2 pt-1">
                            {siblings.length > 1 && (
                              <VersionIndicator
                                siblings={siblings}
                                currentId={msg.id}
                                siblingIdx={siblingIdx}
                                onSwitch={handleSwitchVersion}
                              />
                            )}
                            <button
                              onClick={() => handleEdit(msg.id, msg.content)}
                              disabled={isStreaming}
                              className="text-xs text-text-secondary hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
                              aria-label="Edit message"
                            >
                              edit
                            </button>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <MarkdownRenderer
                          content={msg.content}
                          isStreaming={isStreaming && msg.id === activeChat?.activeLeafId}
                        />
                        <div className="flex items-center gap-3 pt-2 text-text-secondary">
                          {siblings.length > 1 && (
                            <VersionIndicator
                              siblings={siblings}
                              currentId={msg.id}
                              siblingIdx={siblingIdx}
                              onSwitch={handleSwitchVersion}
                            />
                          )}
                          <button
                            onClick={() => handleRegenerate(msg.id)}
                            disabled={isStreaming}
                            className="hover:text-accent disabled:opacity-50 transition-colors p-1 cursor-pointer"
                            aria-label="Regenerate response"
                          >
                            <RotateCcw size={18} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleCopy(msg.content)}
                            className="hover:text-accent transition-colors p-1 cursor-pointer"
                            aria-label="Copy to clipboard"
                          >
                            <Copy size={18} strokeWidth={1.5} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
```

- [ ] **Step 8: Add `VersionIndicator` inline component before the main Desktop_1 component (after line 9)**

```tsx
function VersionIndicator({
  siblings,
  currentId,
  siblingIdx,
  onSwitch,
}: {
  siblings: { id: string }[];
  currentId: string;
  siblingIdx: number;
  onSwitch: (targetId: string) => void;
}) {
  return (
    <span className="flex items-center gap-1 text-xs text-text-secondary select-none">
      <button
        onClick={() => onSwitch(siblings[siblingIdx - 1].id)}
        disabled={siblingIdx === 0}
        className="hover:text-accent disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-default"
        aria-label="Previous version"
      >
        ‹
      </button>
      {siblingIdx + 1}/{siblings.length}
      <button
        onClick={() => onSwitch(siblings[siblingIdx + 1].id)}
        disabled={siblingIdx === siblings.length - 1}
        className="hover:text-accent disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-default"
        aria-label="Next version"
      >
        ›
      </button>
    </span>
  );
}
```

- [ ] **Step 9: Run typecheck and lint**

Run:
```bash
npx tsc --noEmit
```
Expected: No type errors.

Run:
```bash
npm run lint
```
Expected: No lint errors.
