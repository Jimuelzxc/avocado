'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

export function SettingsModal() {
  const { apiKey, baseUrl, model, setSettings, setSettingsOpen } = useChatStore();

  const [preset, setPreset] = useState(() => {
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      return 'ollama';
    } else if (baseUrl.includes('openrouter.ai')) {
      return 'openrouter';
    } else {
      return 'custom';
    }
  });
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
  const [localModel, setLocalModel] = useState(model);
  const [showKey, setShowKey] = useState(false);

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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      {/* Retro style modal container */}
      <div className="w-full max-w-md border-2 border-border bg-surface p-6 text-text-primary font-mono shadow-2xl relative">
        <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
          <h2 className="text-accent text-lg font-bold">SYSTEM CONFIG</h2>
          <button 
            onClick={() => setSettingsOpen(false)}
            className="text-text-primary hover:text-accent-secondary cursor-pointer"
          >
            [X]
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          {/* Preset Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-text-secondary">API PRESET:</label>
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-surface border border-border text-text-primary p-2 outline-none focus:border-accent"
            >
              <option value="openrouter">OpenRouter (Cloud)</option>
              <option value="ollama">Ollama (Localhost)</option>
              <option value="custom">Custom Endpoint</option>
            </select>
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1">
            <label className="text-text-secondary">BASE URL:</label>
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              disabled={preset !== 'custom'}
              className="w-full bg-surface border border-border text-text-primary p-2 outline-none focus:border-accent disabled:opacity-60"
            />
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-1">
            <label className="text-text-secondary flex justify-between">
              <span>API KEY:</span>
              <button 
                type="button" 
                onClick={() => setShowKey(!showKey)} 
                className="text-accent hover:underline cursor-pointer"
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
              className="w-full bg-surface border border-border text-text-primary p-2 outline-none focus:border-accent disabled:opacity-60"
            />
          </div>

          {/* Model Name */}
          <div className="flex flex-col gap-1">
            <label className="text-text-secondary">MODEL NAME:</label>
            <input
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full bg-surface border border-border text-text-primary p-2 outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-end mt-6 pt-4 border-t border-border/20">
          <button
            onClick={() => setSettingsOpen(false)}
            className="border border-border hover:bg-surface-overlay px-4 py-2 cursor-pointer transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="border border-accent text-accent hover:bg-accent/10 px-4 py-2 cursor-pointer transition-colors font-bold"
          >
            SAVE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}
