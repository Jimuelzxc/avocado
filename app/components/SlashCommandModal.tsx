'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface SlashCommandModalProps {
  onClose: () => void;
}

export function SlashCommandModal({ onClose }: SlashCommandModalProps) {
  const { customSlashCommands, addCustomSlashCommand, updateCustomSlashCommand, deleteCustomSlashCommand } = useChatStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const cmd = customSlashCommands.find(c => c.id === id);
    if (cmd) {
      setName(cmd.name);
      setShortcut(cmd.shortcut);
      setContent(cmd.content);
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    setName('');
    setShortcut('');
    setContent('');
  };

  const handleSave = () => {
    const trimmedName = name.trim() || 'Untitled';
    const trimmedShortcut = shortcut.trim().toLowerCase().replace(/\s+/g, '-') || trimmedName.toLowerCase().replace(/\s+/g, '-');
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    if (selectedId) {
      updateCustomSlashCommand(selectedId, trimmedName, trimmedShortcut, trimmedContent);
    } else {
      addCustomSlashCommand(trimmedName, trimmedShortcut, trimmedContent);
    }
    handleNew();
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteCustomSlashCommand(id);
      setConfirmDelete(null);
      if (selectedId === id) {
        setSelectedId(null);
        setName('');
        setShortcut('');
        setContent('');
      }
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 mx-2">
      <div className="w-full max-w-3xl border-2 border-border bg-surface text-text-primary font-mono shadow-2xl relative">
        <div className="flex justify-between items-center border-b border-border pb-3 mb-4 p-4">
          <h2 className="text-accent text-base font-bold">SLASH COMMANDS</h2>
          <button
            onClick={onClose}
            className="text-text-primary hover:text-accent-secondary cursor-pointer"
          >
            [X]
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 p-4 pt-0">
          {/* Left: Command list */}
          <div className="w-full md:w-1/3 border border-border flex flex-col">
            <div className="p-2 text-xs text-text-secondary border-b border-border">
              COMMANDS ({customSlashCommands.length})
            </div>
            <div className="flex-1 overflow-y-auto max-h-48 md:max-h-64">
              {customSlashCommands.length === 0 && (
                <div className="p-3 text-xs text-text-secondary">
                  No custom commands yet.
                </div>
              )}
              {customSlashCommands.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`p-2 cursor-pointer text-sm border-b border-border/30 transition-colors ${
                    selectedId === c.id
                      ? 'bg-white/5 border-l-2 border-l-white/50 text-text-primary'
                      : 'hover:bg-surface-overlay'
                  }`}
                >
                  <div className="truncate">/{c.shortcut}</div>
                  <div className="text-xs text-text-secondary truncate">{c.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Editor */}
          <div className="w-full md:flex-1 flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Command name..."
              className="w-full bg-surface border border-border text-text-primary p-2 outline-none focus:border-accent font-mono text-sm"
            />

            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">/</span>
              <input
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="shortcut"
                className="flex-1 bg-surface border border-border text-text-primary p-2 outline-none focus:border-accent font-mono text-sm"
              />
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Template content..."
              className="w-full bg-surface border border-border text-text-primary p-3 outline-none focus:border-accent font-mono text-sm resize-y"
            />

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleNew}
                className="border border-border hover:bg-surface-overlay px-3 py-1.5 text-xs cursor-pointer transition-colors"
              >
                + NEW
              </button>
              <button
                onClick={handleSave}
                disabled={!content.trim()}
                className="border border-accent text-accent hover:bg-accent/10 px-3 py-1.5 text-xs cursor-pointer transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                SAVE
              </button>
              {selectedId && (
                <button
                  onClick={() => handleDelete(selectedId)}
                  className="border border-red-600 text-red-500 hover:bg-red-600/10 px-3 py-1.5 text-xs cursor-pointer transition-colors"
                >
                  {confirmDelete === selectedId ? 'CONFIRM DELETE' : 'DELETE'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 pt-0">
          <button
            onClick={onClose}
            className="border border-border hover:bg-surface-overlay px-3 py-1.5 text-xs cursor-pointer transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
