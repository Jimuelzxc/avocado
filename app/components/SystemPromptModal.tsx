'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface SystemPromptModalProps {
  onClose: () => void;
}

export function SystemPromptModal({ onClose }: SystemPromptModalProps) {
  const { presets, systemPrompt, activePresetId, savePreset, deletePreset, loadPreset } = useChatStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState(systemPrompt);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSelectPreset = (id: string) => {
    setSelectedId(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      setName(preset.name);
      setContent(preset.content);
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    setName('');
    setContent('');
  };

  const handleLoad = () => {
    if (selectedId) {
      loadPreset(selectedId);
      onClose();
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim() || 'Untitled';
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    if (selectedId) {
      savePreset(selectedId, trimmedName, trimmedContent);
    } else {
      const newId = savePreset(null, trimmedName, trimmedContent);
      setSelectedId(newId);
    }
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deletePreset(id);
      setConfirmDelete(null);
      if (selectedId === id) {
        setSelectedId(null);
        setName('');
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
          <h2 className="text-accent text-base font-bold">SYSTEM PROMPT LIBRARY</h2>
          <button
            onClick={onClose}
            className="text-text-primary hover:text-accent-secondary cursor-pointer"
          >
            [X]
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 p-4 pt-0">
          {/* Left: Preset list */}
          <div className="w-full md:w-1/3 border border-border flex flex-col">
            <div className="p-2 text-xs text-text-secondary border-b border-border">
              PRESETS ({presets.length})
            </div>
            <div className="flex-1 overflow-y-auto max-h-48 md:max-h-64">
              {presets.length === 0 && (
                <div className="p-3 text-xs text-text-secondary">
                  No presets yet.
                </div>
              )}
              {presets.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-2 cursor-pointer text-sm border-b border-border/30 transition-colors ${
                    selectedId === p.id
                      ? 'bg-white/5 border-l-2 border-l-white/50 text-text-primary'
                      : activePresetId === p.id
                        ? 'bg-green-500/10 border-l-2 border-l-green-500'
                        : 'hover:bg-surface-overlay'
                  }`}
                >
                  <div className="truncate">{p.name}</div>
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
              placeholder="Preset name..."
              className="w-full bg-surface border border-border text-text-primary p-2 outline-none focus:border-accent font-mono text-sm"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="You are a helpful assistant..."
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
                onClick={handleLoad}
                disabled={!selectedId}
                className="border border-accent text-accent hover:bg-accent/10 px-3 py-1.5 text-xs cursor-pointer transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                LOAD
              </button>
              <button
                onClick={handleSave}
                disabled={!content.trim()}
                className="border border-border hover:bg-surface-overlay px-3 py-1.5 text-xs cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
