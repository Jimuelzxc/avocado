'use client';
import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Settings as SettingsIcon, Trash2, Menu, X } from 'lucide-react';
import { Braces, ArrowUp } from 'lucide-react'
import { useChatStore, Message } from './store/chatStore';
import { SettingsModal } from './components/SettingsModal';
import { SystemPromptModal } from './components/SystemPromptModal';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const EMPTY_MESSAGES: Message[] = [];

export default function Desktop_1() {
  const {
    chats,
    activeChatId,
    apiKey,
    baseUrl,
    model,
    systemPrompt,
    isStreaming,
    setSettingsOpen,
    createChat,
    deleteChat,
    addMessage,
    updateLastMessage,
    replaceLastMessage,
    isSettingsOpen,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Prevent hydration errors by waiting for client-side mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Get active chat messages
  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat ? activeChat.messages : EMPTY_MESSAGES;

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
          systemPrompt,
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
            } catch {
              // Ignore incomplete line parse failures
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error('Streaming error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      replaceLastMessage(targetChatId, `Error: ${errorMessage}`);
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
    await handleSendMessage({ preventDefault: () => { } }, prevMessage.content);
  };

  // Hydration wrapper to avoid mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen w-full bg-surface text-text-primary justify-center items-center font-mono">
        <p>LOADING blues. SYSTEM...</p>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full bg-surface text-text-primary overflow-hidden font-mono selection:bg-[var(--selection)]"
    >
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-border h-full shrink-0">
        {/* Logo & Header */}
        <div className="p-5 flex justify-between items-center">
          <h1 className="text-accent text-base tracking-wide">blues.</h1>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1 hover:text-accent transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>

        {/* Action Button */}
        <div className="px-5 pb-6 flex gap-2">
          <button
            onClick={() => createChat()}
            className="flex-1 border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            New Chat
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center justify-between p-2 border ${chat.id === activeChatId ? 'border-accent text-accent' : 'border-transparent text-text-primary hover:bg-surface-overlay'
                }`}
            >
              <button
                onClick={() => useChatStore.setState({ activeChatId: chat.id })}
                className="flex-1 text-left text-sm truncate pr-2 cursor-pointer focus:outline-none"
              >
                {chat.title}
              </button>
              <button
                onClick={() => deleteChat(chat.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-accent-secondary cursor-pointer p-1 transition-opacity"
                aria-label="Delete Chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full relative border-border md:border-t-0 border-t">
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center p-4 border-b border-border">
          <h1 className="text-accent text-sm tracking-wide">blues.</h1>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="hover:text-accent cursor-pointer p-1"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-4 md:gap-8">
            {messages.length === 0 ? (
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
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${msg.role === 'user'
                    ? 'self-end border border-border p-4 max-w-[90%] md:max-w-[70%] bg-surface'
                    : 'self-start max-w-[95%] md:max-w-[85%] flex flex-col gap-4'
                    }`}
                >
                  {msg.role === 'user' ? (
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  ) : (
                    <MarkdownRenderer
                      content={msg.content}
                      isStreaming={isStreaming && idx === messages.length - 1}
                    />
                  )}

                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-3 pt-2 text-text-secondary">
                      <button
                        onClick={() => handleRegenerate(idx)}
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
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Form Input */}
        <div className="p-3 md:p-8 shrink-0 w-full">
          <div className="max-w-5xl mx-auto w-full">
            <form
              className="border border-border p-4 flex flex-col gap-4 relative min-h-[120px] bg-surface group focus-within:ring-1 focus-within:ring-accent transition-all"
              onSubmit={handleSendMessage}
            >
              <textarea
                className="w-full bg-transparent border-none outline-none resize-none text-base placeholder:text-text-secondary min-h-[60px] font-mono"
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
              <div className=" flex justify-between items-center w-full">
                <div className="text-text-primary">
                  <button id="system-prompt" type="button" onClick={() => setIsSystemPromptOpen(true)}>
                    <Braces size={22} strokeWidth={1.5} />
                  </button>

                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isStreaming || !inputValue.trim()}
                    className="p-2 hover:bg-surface-overlay rounded-sm transition-colors text-text-primary hover:text-accent disabled:opacity-50 disabled:hover:text-text-primary cursor-pointer"
                    aria-label="Send message"
                  >
                    <ArrowUp size={22} strokeWidth={1.5} />
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Mobile sidebar drawer overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-72 bg-surface border-r border-border flex flex-col z-50 animate-slide-in">
            <div className="p-5 flex justify-between items-center">
              <h1 className="text-accent text-base tracking-wide">blues.</h1>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => { setSettingsOpen(true); setIsMobileSidebarOpen(false); }}
                  className="p-1 hover:text-accent transition-colors cursor-pointer"
                  aria-label="Settings"
                >
                  <SettingsIcon size={18} />
                </button>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 hover:text-accent transition-colors cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-5 pb-6 flex gap-2">
              <button
                onClick={() => { createChat(); setIsMobileSidebarOpen(false); }}
                className="flex-1 border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-2 border ${chat.id === activeChatId ? 'border-accent text-accent' : 'border-transparent text-text-primary hover:bg-surface-overlay'}`}
                >
                  <button
                    onClick={() => { useChatStore.setState({ activeChatId: chat.id }); setIsMobileSidebarOpen(false); }}
                    className="flex-1 text-left text-sm truncate pr-2 cursor-pointer focus:outline-none"
                  >
                    {chat.title}
                  </button>
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-accent-secondary cursor-pointer p-1 transition-opacity"
                    aria-label="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal />}

      {/* System Prompt Modal */}
      {isSystemPromptOpen && <SystemPromptModal onClose={() => setIsSystemPromptOpen(false)} />}
    </div>
  );
}