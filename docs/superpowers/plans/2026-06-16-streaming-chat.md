# Streaming Chat & Persistent State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static retro UI into a fully functional local chat application with configurable API providers (Ollama, OpenRouter, etc.), streaming responses, and persistent chat sessions.

**Architecture:** We use a Zustand persistent store (saved in the browser's localStorage) to manage the chat history, current session, and API credentials. We write a Next.js Server Route (`/api/chat`) to proxy and stream request completions from the API provider to the browser, avoiding CORS errors.

**Tech Stack:** Next.js 16.2.9, Zustand 5.0.14, Tailwind v4, Lucide React

---

### Task 1: Create Zustand Store for Chats and Settings

Create a Zustand store that handles state persistence via localStorage.

**Files:**
- Create: `app/store/chatStore.ts`

- [ ] **Step 1: Write store file**
  Create the store with types for Settings, Messages, Chats, and Actions.
  
  ```typescript
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
  }

  interface ChatState {
    apiKey: string;
    baseUrl: string;
    model: string;
    chats: Chat[];
    activeChatId: string | null;
    isStreaming: boolean;
    isSettingsOpen: boolean;
    
    // Actions
    setSettings: (settings: Partial<Settings>) => void;
    setSettingsOpen: (isOpen: boolean) => void;
    createChat: () => string;
    deleteChat: (id: string) => void;
    addMessage: (chatId: string, message: Message) => void;
    updateLastMessage: (chatId: string, chunk: string) => void;
    replaceLastMessage: (chatId: string, content: string) => void;
    clearLastMessage: (chatId: string) => void;
  }

  export const useChatStore = create<ChatState>()(
    persist(
      (set, get) => ({
        apiKey: '',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'meta-llama/llama-3.2-3b-instruct',
        chats: [],
        activeChatId: null,
        isStreaming: false,
        isSettingsOpen: false,

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
      }),
      {
        name: 'blues-chat-storage',
        partialize: (state) => ({
          apiKey: state.apiKey,
          baseUrl: state.baseUrl,
          model: state.model,
          chats: state.chats,
          activeChatId: state.activeChatId,
        }),
      }
    )
  );
  ```

- [ ] **Step 2: Verify compiling**
  Run: `npx tsc --noEmit`
  Expected: Command finishes successfully with no syntax errors.

- [ ] **Step 3: Commit**
  Run: `git add app/store/chatStore.ts; git commit -m "feat: add Zustand store for chat and settings"`

---

### Task 2: Create Next.js API Route for Chat Completion

Create the API route handler to send and stream completions from the target endpoint.

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Write Route handler**
  Create the endpoint `/api/chat` that accepts client settings and forwards the request using streaming.
  
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';

  export async function POST(req: NextRequest) {
    try {
      const { apiKey, baseUrl, model, messages } = await req.json();

      if (!baseUrl) {
        return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
      }

      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
      }

      // Format clean URL path (remove trailing slash)
      const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const apiUrl = `${sanitizedBaseUrl}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `API error (${response.status}): ${errorText || response.statusText}` },
          { status: response.status }
        );
      }

      // Pipe the body stream directly to the response
      const stream = response.body;
      if (!stream) {
        return NextResponse.json({ error: 'Response body is not readable' }, { status: 500 });
      }

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error: any) {
      console.error('API Error:', error);
      return NextResponse.json(
        { error: `Internal server error: ${error?.message || String(error)}` },
        { status: 500 }
      );
    }
  }
  ```

- [ ] **Step 2: Verify compiling**
  Run: `npx tsc --noEmit`
  Expected: Successful completion with no TS errors.

- [ ] **Step 3: Commit**
  Run: `git add app/api/chat/route.ts; git commit -m "feat: add api route for streaming OpenAI completions"`

---

### Task 3: Build Settings Modal UI

Create a modal dialog component that overlays the chat application.

**Files:**
- Create: `app/components/SettingsModal.tsx`

- [ ] **Step 1: Write SettingsModal component**
  Write the SettingsModal with presets for Ollama, OpenRouter, and custom options. Use standard retro styled inputs.
  
  ```typescript
  'use client';

  import React, { useState, useEffect } from 'react';
  import { useChatStore } from '../store/chatStore';

  export function SettingsModal() {
    const { apiKey, baseUrl, model, setSettings, isSettingsOpen, setSettingsOpen } = useChatStore();

    const [preset, setPreset] = useState('openrouter');
    const [localApiKey, setLocalApiKey] = useState('');
    const [localBaseUrl, setLocalBaseUrl] = useState('');
    const [localModel, setLocalModel] = useState('');
    const [showKey, setShowKey] = useState(false);

    // Sync store settings with local component state when modal opens
    useEffect(() => {
      if (isSettingsOpen) {
        setLocalApiKey(apiKey);
        setLocalBaseUrl(baseUrl);
        setLocalModel(model);
        
        if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
          setPreset('ollama');
        } else if (baseUrl.includes('openrouter.ai')) {
          setPreset('openrouter');
        } else {
          setPreset('custom');
        }
      }
    }, [isSettingsOpen, apiKey, baseUrl, model]);

    // Handle preset selection
    const handlePresetChange = (selected: string) => {
      setPreset(selected);
      if (selected === 'ollama') {
        setLocalBaseUrl('http://localhost:11434/v1');
        setLocalModel('llama3.2');
        setLocalApiKey('');
      } else if (selected === 'openrouter') {
        setLocalBaseUrl('https://openrouter.ai/api/v1');
        setLocalModel('meta-llama/llama-3.2-3b-instruct');
      }
    };

    const handleSave = () => {
      setSettings({
        apiKey: localApiKey,
        baseUrl: localBaseUrl,
        model: localModel,
      });
      setSettingsOpen(false);
    };

    if (!isSettingsOpen) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
        {/* Retro style modal container */}
        <div className="w-full max-w-md border-2 border-white bg-[#000080] p-6 text-white font-mono shadow-2xl relative">
          <div className="flex justify-between items-center border-b border-white pb-3 mb-4">
            <h2 className="text-[#20ffe5] text-lg font-bold">SYSTEM CONFIG</h2>
            <button 
              onClick={() => setSettingsOpen(false)}
              className="text-white hover:text-[#f6ff00] cursor-pointer"
            >
              [X]
            </button>
          </div>

          <div className="flex flex-col gap-4 text-sm">
            {/* Preset Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-white/80">API PRESET:</label>
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full bg-[#000080] border border-white text-white p-2 outline-none focus:border-[#20ffe5]"
              >
                <option value="openrouter">OpenRouter (Cloud)</option>
                <option value="ollama">Ollama (Localhost)</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            {/* Base URL */}
            <div className="flex flex-col gap-1">
              <label className="text-white/80">BASE URL:</label>
              <input
                type="text"
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                disabled={preset !== 'custom'}
                className="w-full bg-[#000080] border border-white text-white p-2 outline-none focus:border-[#20ffe5] disabled:opacity-60"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1">
              <label className="text-white/80 flex justify-between">
                <span>API KEY:</span>
                <button 
                  type="button" 
                  onClick={() => setShowKey(!showKey)} 
                  className="text-[#20ffe5] hover:underline cursor-pointer"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </label>
              <input
                type={showKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder={preset === 'ollama' ? 'None required' : 'Enter API Key'}
                disabled={preset === 'ollama'}
                className="w-full bg-[#000080] border border-white text-white p-2 outline-none focus:border-[#20ffe5] disabled:opacity-60"
              />
            </div>

            {/* Model Name */}
            <div className="flex flex-col gap-1">
              <label className="text-white/80">MODEL NAME:</label>
              <input
                type="text"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full bg-[#000080] border border-white text-white p-2 outline-none focus:border-[#20ffe5]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 justify-end mt-6 pt-4 border-t border-white/20">
            <button
              onClick={() => setSettingsOpen(false)}
              className="border border-white hover:bg-white/10 px-4 py-2 cursor-pointer transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              className="border border-[#20ffe5] text-[#20ffe5] hover:bg-[#20ffe5]/10 px-4 py-2 cursor-pointer transition-colors font-bold"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify compiling**
  Run: `npx tsc --noEmit`
  Expected: Successful completion.

- [ ] **Step 3: Commit**
  Run: `git add app/components/SettingsModal.tsx; git commit -m "feat: add SettingsModal component"`

---

### Task 4: UI & Streaming Logic Integration

Update the main page `app/page.tsx` to integrate the store and route handler.

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write integration logic**
  Open and update `app/page.tsx` with logic to fetch store state, trigger chat requests, handle streams, and display chats.
  
  ```typescript
  'use client';
  import React, { useState, useEffect, useRef } from 'react';
  import { RotateCcw, Copy, Send, Settings as SettingsIcon, Trash2 } from 'lucide-react';
  import { useChatStore, Message } from './store/chatStore';
  import { SettingsModal } from './components/SettingsModal';

  export default function Desktop_1() {
    const {
      chats,
      activeChatId,
      apiKey,
      baseUrl,
      model,
      isStreaming,
      setSettingsOpen,
      createChat,
      deleteChat,
      addMessage,
      updateLastMessage,
      replaceLastMessage,
      clearLastMessage,
    } = useChatStore();

    const [inputValue, setInputValue] = useState('');
    const [mounted, setMounted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Prevent hydration errors by waiting for client-side mount
    useEffect(() => {
      setMounted(true);
    }, []);

    // Get active chat messages
    const activeChat = chats.find((c) => c.id === activeChatId);
    const messages = activeChat ? activeChat.messages : [];

    // Scroll to bottom on messages update
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
      if (mounted) {
        scrollToBottom();
      }
    }, [messages, mounted]);

    // Handle initial state setup
    useEffect(() => {
      if (mounted && chats.length === 0) {
        createChat();
      }
    }, [mounted, chats.length, createChat]);

    const handleSendMessage = async (e: React.FormEvent, customContent?: string) => {
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

      // Add user message
      const userMsg: Message = { role: 'user', content: text };
      addMessage(targetChatId, userMsg);

      // Add placeholder assistant message
      const assistantMsg: Message = { role: 'assistant', content: '' };
      addMessage(targetChatId, assistantMsg);

      // Set streaming flag in store
      useChatStore.setState({ isStreaming: true });

      try {
        const currentChat = useChatStore.getState().chats.find((c) => c.id === targetChatId);
        const chatMessages = currentChat ? currentChat.messages.slice(0, -1) : [];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey,
            baseUrl,
            model,
            messages: [...chatMessages, userMsg],
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          replaceLastMessage(targetChatId, `Error: ${data.error || 'Failed to fetch AI response'}`);
          useChatStore.setState({ isStreaming: false });
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
          replaceLastMessage(targetChatId, 'Error: Response stream is not readable.');
          useChatStore.setState({ isStreaming: false });
          return;
        }

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep partial line in buffer

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
                  updateLastMessage(targetChatId, chunk);
                }
              } catch (err) {
                // Ignore incomplete line parse failures
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Streaming error:', error);
        replaceLastMessage(targetChatId, `Error: ${error?.message || 'A network error occurred.'}`);
      } finally {
        useChatStore.setState({ isStreaming: false });
      }
    };

    const handleCopy = (content: string) => {
      navigator.clipboard.writeText(content);
    };

    const handleRegenerate = async (idx: number) => {
      if (!activeChatId || isStreaming) return;
      const activeChatNow = chats.find((c) => c.id === activeChatId);
      if (!activeChatNow) return;

      // Find user message prior to this assistant response
      const prevMessage = activeChatNow.messages[idx - 1];
      if (!prevMessage || prevMessage.role !== 'user') return;

      // Remove last AI response and rewrite
      // Truncate message array to just before the assistant message
      const updatedMessages = activeChatNow.messages.slice(0, idx);
      
      // Update store chats state
      const updatedChats = chats.map((c) => {
        if (c.id === activeChatId) {
          return { ...c, messages: updatedMessages };
        }
        return c;
      });
      useChatStore.setState({ chats: updatedChats });

      // Trigger message flow with the prevMessage content
      await handleSendMessage({ preventDefault: () => {} } as any, prevMessage.content);
    };

    // Hydration wrapper to avoid mismatch
    if (!mounted) {
      return (
        <div className="flex h-screen w-full bg-[#000080] text-white justify-center items-center font-mono">
          <p>LOADING blues. SYSTEM...</p>
        </div>
      );
    }

    return (
      <div
        className="flex h-screen w-full bg-[#000080] text-white overflow-hidden font-mono selection:bg-[#20ffe5]/30"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {/* Sidebar */}
        <aside className="hidden md:flex w-72 flex-col border-r border-white h-full shrink-0">
          {/* Logo & Header */}
          <div className="p-5 flex justify-between items-center">
            <h1 className="text-[#20ffe5] text-lg tracking-wide">blues.</h1>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1 hover:text-[#20ffe5] transition-colors cursor-pointer"
              aria-label="Settings"
            >
              <SettingsIcon size={18} />
            </button>
          </div>

          {/* Action Button */}
          <div className="px-5 pb-6 flex gap-2">
            <button
              onClick={() => createChat()}
              className="flex-1 border border-white py-2 px-4 text-left text-base hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-[#20ffe5] cursor-pointer"
            >
              New Chat
            </button>
          </div>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
            {chats.map((chat) => (
              <div 
                key={chat.id} 
                className={`group flex items-center justify-between p-2 border ${
                  chat.id === activeChatId ? 'border-[#20ffe5] text-[#20ffe5]' : 'border-transparent text-white hover:bg-white/5'
                }`}
              >
                <button
                  onClick={() => useChatStore.setState({ activeChatId: chat.id })}
                  className="flex-1 text-left text-base truncate pr-2 cursor-pointer focus:outline-none"
                >
                  {chat.title}
                </button>
                <button
                  onClick={() => deleteChat(chat.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-[#f6ff00] cursor-pointer p-1 transition-opacity"
                  aria-label="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col h-full relative border-white md:border-t-0 border-t">
          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center p-4 border-b border-white">
            <h1 className="text-[#20ffe5] text-base tracking-wide">blues.</h1>
            <div className="flex gap-3">
              <button
                onClick={() => createChat()}
                className="text-sm border border-white px-2 py-1 hover:bg-white/10 cursor-pointer"
              >
                New
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="hover:text-[#20ffe5] cursor-pointer"
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">
              {messages.length === 0 ? (
                <div className="border border-white p-6 md:p-8 bg-[#000080] text-center my-8 flex flex-col gap-4">
                  <h2 className="text-xl md:text-2xl text-[#20ffe5] font-bold">blues. SYSTEM V1.0</h2>
                  <p className="text-sm md:text-base leading-relaxed text-white/80">
                    Welcome to the blues AI retro terminal. 
                    Please send a message to start conversing, or click the Settings gear icon to select a model/configure keys.
                  </p>
                  <div className="text-xs md:text-sm text-left bg-black/30 p-4 border border-white/20 text-[#f6ff00]">
                    Current Provider: <span className="text-white">{baseUrl}</span><br />
                    Active Model: <span className="text-white">{model}</span>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`${
                      msg.role === 'user'
                        ? 'self-end border border-white p-4 max-w-[90%] md:max-w-[70%] bg-[#000080]'
                        : 'self-start max-w-[95%] md:max-w-[85%] flex flex-col gap-4'
                    }`}
                  >
                    <p className={`${
                      msg.role === 'user' ? 'text-sm md:text-base' : 'text-lg md:text-xl font-extrabold'
                    } leading-relaxed whitespace-pre-wrap`}>
                      {msg.content || (isStreaming && idx === messages.length - 1 ? '▋' : '')}
                    </p>

                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-3 pt-2 text-white/70">
                        <button
                          onClick={() => handleRegenerate(idx)}
                          disabled={isStreaming}
                          className="hover:text-[#20ffe5] disabled:opacity-50 transition-colors p-1 cursor-pointer"
                          aria-label="Regenerate response"
                        >
                          <RotateCcw size={18} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleCopy(msg.content)}
                          className="hover:text-[#20ffe5] transition-colors p-1 cursor-pointer"
                          aria-label="Copy to clipboard"
                        >
                          <Copy size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Form Input */}
          <div className="p-4 md:p-8 shrink-0 w-full">
            <div className="max-w-5xl mx-auto w-full">
              <form
                className="border border-white p-4 flex flex-col gap-4 relative min-h-[120px] bg-[#000080] group focus-within:ring-1 focus-within:ring-[#20ffe5] transition-all"
                onSubmit={handleSendMessage}
              >
                <textarea
                  className="w-full bg-transparent border-none outline-none resize-none text-lg placeholder:text-white/60 min-h-[60px] font-mono"
                  placeholder="Ask a question..."
                  rows={2}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isStreaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <div className="absolute bottom-4 right-4">
                  <button
                    type="submit"
                    disabled={isStreaming || !inputValue.trim()}
                    className="p-2 hover:bg-white/10 rounded-sm transition-colors text-white hover:text-[#20ffe5] disabled:opacity-50 disabled:hover:text-white cursor-pointer"
                    aria-label="Send message"
                  >
                    <Send size={22} strokeWidth={1.5} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        
        {/* Settings Modal */}
        <SettingsModal />
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify compiling**
  Run: `npx tsc --noEmit`
  Expected: Successful TS validation with no compiler errors.

- [ ] **Step 3: Commit**
  Run: `git add app/page.tsx; git commit -m "feat: integrate state store and route stream logic in main page UI"`
