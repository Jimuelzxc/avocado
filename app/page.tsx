'use client';
import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Settings as SettingsIcon, Trash2, Menu, X, Pencil } from 'lucide-react';
import { Braces, ArrowUp, Square } from 'lucide-react'
import { useChatStore, getActivePath } from './store/chatStore';
import { useFolderStore } from './store/folderStore';
import { useTagStore } from './store/tagStore';
import { FolderTree } from './components/FolderTree';
import { TagCloud } from './components/TagCloud';
import { ChatContextMenu } from './components/ChatContextMenu';
import { SettingsModal } from './components/SettingsModal';
import { SystemPromptModal } from './components/SystemPromptModal';
import { MarkdownRenderer } from './components/MarkdownRenderer';

function VersionIndicator({
  siblings,
  siblingIdx,
  onSwitch,
}: {
  siblings: { id: string }[];
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

export default function Desktop_1() {
  const {
    chats,
    activeChatId,
    baseUrl,
    model,
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
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenuPos, setContextMenuPos] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { folders, activeFolderId } = useFolderStore();
  const { tags, activeTagIds } = useTagStore();

  const filteredChats = chats.filter((chat) => {
    if (activeFolderId !== null) {
      const descendantIds: string[] = [];
      function collectDescendants(parentId: string) {
        const kids = folders.filter((f) => f.parentId === parentId);
        for (const k of kids) {
          descendantIds.push(k.id);
          collectDescendants(k.id);
        }
      }
      collectDescendants(activeFolderId);
      const allowedFolderIds = [activeFolderId, ...descendantIds];
      if (!chat.folderId || !allowedFolderIds.includes(chat.folderId)) return false;
    }
    if (activeTagIds.length > 0) {
      if (!chat.tagIds.some((t) => activeTagIds.includes(t))) return false;
    }
    return true;
  });

  // Prevent hydration errors by waiting for client-side mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Get active chat messages
  const activeChat = chats.find((c) => c.id === activeChatId);
  const activePath = activeChat?.activeLeafId
    ? getActivePath(activeChat.messages, activeChat.activeLeafId)
    : [];

  // Scroll to bottom on messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (mounted) {
      scrollToBottom();
    }
  }, [activePath, mounted]);

  // Handle initial state setup
  useEffect(() => {
    if (mounted && chats.length === 0) {
      createChat();
    }
  }, [mounted, chats.length, createChat]);

  const streamFromActivePath = async (chatId: string, userContent: string) => {
    const currentState = useChatStore.getState();
    const currentChat = currentState.chats.find((c) => c.id === chatId);
    if (!currentChat || !currentChat.activeLeafId) return;

    const fullPath = getActivePath(currentChat.messages, currentChat.activeLeafId);
    const historyMessages = fullPath.slice(0, -1);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        signal: controller.signal,
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
            } catch { }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Streaming error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      replaceLastMessage(chatId, `Error: ${errorMessage}`);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
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
    const parentId = activeChatNow?.activeLeafId ?? undefined;

    addMessage(targetChatId, { role: 'user', content: text }, parentId);

    useChatStore.setState({ isStreaming: true });
    const stateAfterUser = useChatStore.getState();
    const chatAfterUser = stateAfterUser.chats.find(c => c.id === targetChatId);
    const userMsgId = chatAfterUser?.activeLeafId ?? undefined;
    addMessage(targetChatId, { role: 'assistant', content: '' }, userMsgId);

    await streamFromActivePath(targetChatId, text);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

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

    if (newMsgId) {
      useChatStore.setState({ isStreaming: true });
      addMessage(activeChatId, { role: 'assistant', content: '' }, newMsgId);
      await streamFromActivePath(activeChatId, newContent);
    }
  };

  const handleRegenerate = async (msgId: string) => {
    if (!activeChatId || isStreaming) return;
    const activeChatNow = chats.find((c) => c.id === activeChatId);
    if (!activeChatNow) return;

    const assistantMsg = activeChatNow.messages.find(m => m.id === msgId);
    if (!assistantMsg || assistantMsg.role !== 'assistant') return;
    const parentUserMsg = activeChatNow.messages.find(m => m.id === assistantMsg.parentId);
    if (!parentUserMsg || parentUserMsg.role !== 'user') return;

    useChatStore.getState().regenerateMessage(activeChatId, msgId);
    useChatStore.setState({ isStreaming: true });
    await streamFromActivePath(activeChatId, parentUserMsg.content);
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSwitchVersion = (targetMsgId: string) => {
    if (!activeChatId) return;
    useChatStore.getState().switchVersion(activeChatId, targetMsgId);
  };

  // Hydration wrapper to avoid mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen w-full bg-surface text-text-primary justify-center items-center font-mono">
        <p>LOADING avocado. SYSTEM...</p>
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
          <h1 className="text-accent text-base tracking-wide">avocado.</h1>
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

        {/* Folder Tree */}
        <div className="border-b border-border pb-2 mb-2 mx-3">
          <FolderTree />
        </div>

        {/* Tag Cloud */}
        <div className="border-b border-border pb-2 mb-2 mx-3">
          <TagCloud />
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex flex-col p-2 border ${chat.id === activeChatId ? 'border-accent text-accent' : 'border-transparent text-text-primary hover:bg-surface-overlay'
                }`}
              onContextMenu={(e) => { e.preventDefault(); setContextMenuPos({ chatId: chat.id, x: e.clientX, y: e.clientY }); }}
            >
              <div className="flex items-center justify-between">
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
              {chat.tagIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {chat.tagIds.slice(0, 3).map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] border border-border"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                    );
                  })}
                  {chat.tagIds.length > 3 && (
                    <span className="text-[10px] text-text-secondary">+{chat.tagIds.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full relative border-border md:border-t-0 border-t">
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center p-4 border-b border-border">
          <h1 className="text-accent text-sm tracking-wide">avocado.</h1>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="hover:text-accent cursor-pointer p-1"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-3 md:gap-8">
            {activePath.length === 0 ? (
              <div className="border border-border p-4 md:p-8 bg-surface text-center my-8 flex flex-col gap-4">
                <h2 className="text-lg md:text-xl text-accent font-bold">avocado. SYSTEM V1.0</h2>
                <p className="text-xs md:text-sm leading-relaxed text-text-secondary">
                  Welcome to the blues AI retro terminal.
                  Please send a message to start conversing, or open the sidebar to configure your model and keys.
                </p>
                <div className="text-xs text-left bg-surface-overlay p-4 border border-border/20 text-accent-secondary">
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
                      ? 'self-end flex flex-col items-end'
                      : 'self-start w-full md:max-w-[85%] flex flex-col gap-4'
                      }`}
                  >
                    {msg.role === 'user' ? (
                      <>
                        <div className="border border-border p-4 w-full md:max-w-[70%] min-w-0 md:min-w-[200px] max-w-full bg-surface">
                          {isEditing ? (
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
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                        {!isEditing && (
                          <div className="flex items-center gap-2 mt-1">
                            {siblings.length > 1 && (
                              <VersionIndicator
                                siblings={siblings}
                                siblingIdx={siblingIdx}
                                onSwitch={handleSwitchVersion}
                              />
                            )}
                            <button
                              onClick={() => handleEdit(msg.id, msg.content)}
                              disabled={isStreaming}
                              className="text-text-secondary hover:text-accent transition-colors cursor-pointer disabled:opacity-50 p-1"
                              aria-label="Edit message"
                            >
                              <Pencil size={14} strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </>
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

        {/* Form Input */}
        <div className="p-3 md:p-8 shrink-0 w-full">
          <div className="max-w-5xl mx-auto w-full">
            <form
              className="border border-border p-3 md:p-6 flex flex-col gap-3 md:gap-4 relative min-h-[100px] md:min-h-[120px] bg-surface group focus-within:ring-1 focus-within:ring-accent transition-all"
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
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStopStream}
                      className="p-2 hover:bg-surface-overlay rounded-sm transition-colors text-accent-secondary hover:text-red-400 cursor-pointer"
                      aria-label="Stop streaming"
                    >
                      <Square size={22} strokeWidth={1.5} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputValue.trim()}
                      className="p-2 hover:bg-surface-overlay rounded-sm transition-colors text-text-primary hover:text-accent disabled:opacity-50 disabled:hover:text-text-primary cursor-pointer"
                      aria-label="Send message"
                    >
                      <ArrowUp size={22} strokeWidth={1.5} />
                    </button>
                  )}
                </div>

              </div>
            </form>
          </div>
        </div>
      </main>

      {contextMenuPos && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenuPos(null)}
        >
          <div
            className="fixed"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ChatContextMenu
              chatId={contextMenuPos.chatId}
              onClose={() => setContextMenuPos(null)}
            />
          </div>
        </div>
      )}

      {/* Mobile sidebar drawer overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-72 bg-surface border-r border-border flex flex-col z-50 animate-slide-in">
            <div className="p-5 flex justify-between items-center">
              <h1 className="text-accent text-base tracking-wide">avocado.</h1>
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
            <div className="border-b border-border pb-2 mb-2 mx-3">
              <FolderTree />
            </div>
            <div className="border-b border-border pb-2 mb-2 mx-3">
              <TagCloud />
            </div>
            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex flex-col p-2 border ${chat.id === activeChatId ? 'border-accent text-accent' : 'border-transparent text-text-primary hover:bg-surface-overlay'}`}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenuPos({ chatId: chat.id, x: e.clientX, y: e.clientY }); }}
                >
                  <div className="flex items-center justify-between">
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
                  {chat.tagIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {chat.tagIds.slice(0, 3).map((tagId) => {
                        const tag = tags.find((t) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <span
                            key={tagId}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] border border-border"
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </span>
                        );
                      })}
                      {chat.tagIds.length > 3 && (
                        <span className="text-[10px] text-text-secondary">+{chat.tagIds.length - 3}</span>
                      )}
                    </div>
                  )}
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
