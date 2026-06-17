'use client';

import React, { useState } from 'react';
import { useChatStore, Theme, FontSize, FontFamily } from '../store/chatStore';

export function SettingsModal() {
  const { apiKey, baseUrl, model, theme, fontSize, fontFamily, setTheme, setFontSize, setFontFamily, setSettings, setSettingsOpen } = useChatStore();

  const [activeTab, setActiveTab] = useState<'appearance' | 'api'>('api');

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

  const tabClass = (tab: 'appearance' | 'api') =>
    `flex-1 py-2 text-sm font-bold transition-colors cursor-pointer ${
      activeTab === tab
        ? 'text-accent border-b-2 border-accent'
        : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
    }`;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 mx-2">
      <div className="w-full max-w-md bg-surface border border-border p-6 text-text-primary font-mono shadow-2xl relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-accent text-xs font-bold tracking-widest uppercase">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex mb-5">
          <button onClick={() => setActiveTab('api')} className={tabClass('api')}>
            API
          </button>
          <button onClick={() => setActiveTab('appearance')} className={tabClass('appearance')}>
            Appearance
          </button>
        </div>

        {activeTab === 'appearance' && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary text-[11px] tracking-wider uppercase">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="w-full bg-surface border border-border text-text-primary px-3 py-2 outline-none focus:border-accent transition-colors"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="claude">Claude Code</option>
                <option value="avocado">Avocado</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-text-secondary text-[11px] tracking-wider uppercase">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as FontSize)}
                className="w-full bg-surface border border-border text-text-primary px-3 py-2 outline-none focus:border-accent transition-colors"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-text-secondary text-[11px] tracking-wider uppercase">Font</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                className="w-full bg-surface border border-border text-text-primary px-3 py-2 outline-none focus:border-accent transition-colors"
              >
                <option value="mono">Monospace</option>
                <option value="sans">Sans-serif</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="flex flex-col gap-3 text-sm">
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-surface border border-border text-text-primary px-3 py-2 outline-none focus:border-accent transition-colors"
            >
              <option value="openrouter">OpenRouter (Cloud)</option>
              <option value="ollama">Ollama (Localhost)</option>
              <option value="custom">Custom Endpoint</option>
            </select>

            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              disabled={preset !== 'custom'}
              placeholder="https://api.example.com/v1"
              className="w-full bg-surface border border-border text-text-primary px-3 py-2 outline-none focus:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-text-secondary/50"
            />

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder={preset === 'ollama' ? 'No API key required' : 'sk-...'}
                disabled={preset === 'ollama'}
                className="w-full bg-surface border border-border text-text-primary px-3 py-2 pr-14 outline-none focus:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-text-secondary/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                disabled={preset === 'ollama'}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] text-accent hover:text-accent-secondary transition-colors disabled:opacity-40 cursor-pointer"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>

            <input
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              placeholder="model-name"
              className="w-full bg-surface border border-border text-text-primary px-3 py-2 outline-none focus:border-accent transition-colors placeholder:text-text-secondary/50"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border/20">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-surface font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
