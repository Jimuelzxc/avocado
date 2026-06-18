# System Prompt Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the single system prompt textarea to a library of named presets that users can save, load, edit, and delete.

**Architecture:** Two-file change. The zustand store gets a `presets` array + new actions. The SystemPromptModal gets a split-pane UI: preset list on the left, name+editor on the right. The API route is untouched.

**Tech Stack:** zustand v5, React, TypeScript, Tailwind v4

---

### Task 1: Store — add presets state and actions

**Files:**
- Modify: `app/store/chatStore.ts`

- [ ] **Step 1: Add PromptPreset type and presets state**

Add the `PromptPreset` interface near the top of the file (after the existing interfaces), and add `presets` to the `ChatState` type:

```typescript
interface PromptPreset {
  id: string;
  name: string;
  content: string;
}
```

Add to `ChatState` interface (after `systemPrompt: string`):
```typescript
  presets: PromptPreset[];
  savePreset: (id: string | null, name: string, content: string) => string;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => void;
```

- [ ] **Step 2: Add initial value**

In the `initialState` object, after `systemPrompt: ''`:
```typescript
  presets: [],
```

- [ ] **Step 3: Add migration in the existing persist migrate function and add new actions**

In the `migrate` function of the persist config (line ~290), add migration logic. The `migrate` receives the persisted state directly, so it runs during rehydration — the right time to create a Default preset:

```typescript
migrate: (persisted: any) => {
  if (persisted?.chats?.length > 0 && persisted.chats[0]?.messages?.[0]?.id === undefined) {
    persisted.chats = persisted.chats.map(migrateChat);
  }
  // Migration v2: systemPrompt -> Default preset
  if (persisted?.systemPrompt?.trim() && (!persisted?.presets || persisted.presets.length === 0)) {
    persisted.presets = [{
      id: crypto.randomUUID(),
      name: 'Default',
      content: persisted.systemPrompt,
    }];
  }
  return persisted;
},
```

Then add the three new actions after `setSettingsOpen`:

```typescript
      savePreset: (id, name, content) => {
        const presets = get().presets;
        if (id) {
          // Update existing
          set({
            presets: presets.map((p) => p.id === id ? { ...p, name, content } : p),
          });
          return id;
        } else {
          // Create new
          const newId = crypto.randomUUID();
          set({
            presets: [...presets, { id: newId, name, content }],
          });
          return newId;
        }
      },

      deletePreset: (id) => {
        set({ presets: get().presets.filter((p) => p.id !== id) });
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) {
          set({ systemPrompt: preset.content });
        }
      },
```

- [ ] **Step 4: Persist presets array**

In the `partialize` function, add `presets` to the persisted state:

```typescript
partialize: (state) => ({
  apiKey: state.apiKey,
  baseUrl: state.baseUrl,
  model: state.model,
  systemPrompt: state.systemPrompt,
  presets: state.presets,
  chats: state.chats,
  activeChatId: state.activeChatId,
  theme: state.theme,
  fontSize: state.fontSize,
  fontFamily: state.fontFamily,
}),
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

---

### Task 2: Rewrite SystemPromptModal with split-pane library UI

**Files:**
- Modify: `app/components/SystemPromptModal.tsx`

Complete rewrite of the component. The full file content:

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { useChatStore } from '../store/chatStore';

interface SystemPromptModalProps {
  onClose: () => void;
}

export function SystemPromptModal({ onClose }: SystemPromptModalProps) {
  const { presets, systemPrompt, savePreset, deletePreset, loadPreset } = useChatStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState(systemPrompt);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedId) ?? null,
    [presets, selectedId],
  );

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

  const handleSaveAsNew = () => {
    const trimmedName = name.trim() || 'Untitled';
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    savePreset(null, trimmedName, trimmedContent);
    setSelectedId(null);
    setName('');
    setContent('');
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

        <div className="flex gap-4 p-4 pt-0">
          {/* Left: Preset list */}
          <div className="w-1/3 border border-border flex flex-col">
            <div className="p-2 text-xs text-text-secondary border-b border-border">
              PRESETS ({presets.length})
            </div>
            <div className="flex-1 overflow-y-auto max-h-64">
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
                      ? 'bg-accent/10 text-accent border-l-2 border-l-accent'
                      : 'hover:bg-surface-overlay'
                  }`}
                >
                  <div className="truncate">{p.name}</div>
                </div>
              ))}
            </div>
            <button
              onClick={handleNew}
              className="border-t border-border p-2 text-xs text-accent hover:bg-surface-overlay cursor-pointer transition-colors text-left"
            >
              + NEW PRESET
            </button>
          </div>

          {/* Right: Editor */}
          <div className="flex-1 flex flex-col gap-3">
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
                onClick={handleLoad}
                disabled={!selectedId}
                className="border border-accent text-accent hover:bg-accent/10 px-3 py-1.5 text-xs cursor-pointer transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                LOAD
              </button>
              {selectedId && (
                <button
                  onClick={() => handleDelete(selectedId)}
                  className="border border-red-600 text-red-500 hover:bg-red-600/10 px-3 py-1.5 text-xs cursor-pointer transition-colors"
                >
                  {confirmDelete === selectedId ? 'CONFIRM DELETE' : 'DELETE'}
                </button>
              )}
              <button
                onClick={handleSaveAsNew}
                disabled={!content.trim()}
                className="border border-border hover:bg-surface-overlay px-3 py-1.5 text-xs cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                SAVE AS NEW
              </button>
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

---

### Verification

- [ ] Run the dev server: `npm run dev`
- [ ] Open the app, click the `{ }` button — see empty preset list
- [ ] Create a preset: type a name and content, click "SAVE AS NEW" — appears in list
- [ ] Create 2 more presets — all appear, click between them to preview
- [ ] Click LOAD — modal closes, send a message — system prompt is active
- [ ] Reopen modal — click DELETE — prompt confirms, deletes on second click
- [ ] Reload the page — presets persist
- [ ] Run `npx tsc --noEmit` — no type errors
