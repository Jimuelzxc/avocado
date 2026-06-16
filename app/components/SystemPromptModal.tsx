'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface SystemPromptModalProps {
  onClose: () => void;
}

export function SystemPromptModal({ onClose }: SystemPromptModalProps) {
  const { systemPrompt, setSettings } = useChatStore();
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);

  const handleSave = () => {
    setSettings({ systemPrompt: localPrompt });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="w-full max-w-2xl border-2 border-border bg-surface p-6 text-text-primary font-mono shadow-2xl relative">
        <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
          <h2 className="text-accent text-lg font-bold">SYSTEM PROMPT</h2>
          <button
            onClick={onClose}
            className="text-text-primary hover:text-accent-secondary cursor-pointer"
          >
            [X]
          </button>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <label className="text-text-secondary text-sm mb-1">
            Define how the AI behaves across all conversations:
          </label>
          <textarea
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            rows={10}
            placeholder="You are a helpful assistant..."
            className="w-full bg-surface border border-border text-text-primary p-3 outline-none focus:border-accent font-mono text-sm resize-y"
          />
        </div>

        <div className="flex gap-4 justify-end pt-4 border-t border-border/20">
          <button
            onClick={onClose}
            className="border border-border hover:bg-surface-overlay px-4 py-2 cursor-pointer transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="border border-accent text-accent hover:bg-accent/10 px-4 py-2 cursor-pointer transition-colors font-bold"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
