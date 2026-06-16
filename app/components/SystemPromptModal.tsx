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
      <div className="w-full max-w-2xl border-2 border-white bg-[#000080] p-6 text-white font-mono shadow-2xl relative">
        <div className="flex justify-between items-center border-b border-white pb-3 mb-4">
          <h2 className="text-[#20ffe5] text-lg font-bold">SYSTEM PROMPT</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-[#f6ff00] cursor-pointer"
          >
            [X]
          </button>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <label className="text-white/80 text-sm mb-1">
            Define how the AI behaves across all conversations:
          </label>
          <textarea
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            rows={10}
            placeholder="You are a helpful assistant..."
            className="w-full bg-[#000080] border border-white text-white p-3 outline-none focus:border-[#20ffe5] font-mono text-sm resize-y"
          />
        </div>

        <div className="flex gap-4 justify-end pt-4 border-t border-white/20">
          <button
            onClick={onClose}
            className="border border-white hover:bg-white/10 px-4 py-2 cursor-pointer transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="border border-[#20ffe5] text-[#20ffe5] hover:bg-[#20ffe5]/10 px-4 py-2 cursor-pointer transition-colors font-bold"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
