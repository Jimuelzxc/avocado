# Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/`-triggered command menu to the chat input that inserts prompt templates and executes built-in actions.

**Architecture:** A `SlashCommandMenu` dropdown component is positioned above the textarea. The page component detects `/` typing in the textarea `onChange`, opens the menu with filtered results, and handles keyboard navigation. On selection, the `/command` text is replaced with the template content. Slash commands are synced from built-in definitions and user's existing `PromptPreset` library.

**Tech Stack:** React, zustand (persisted), Tailwind v4

---

### Task 1: Add SlashCommand types and store actions

**Files:**
- Modify: `app/store/chatStore.ts`

- [ ] **Step 1: Add SlashCommand interface after PromptPreset**

```ts
export interface SlashCommand {
  id: string;
  name: string;
  shortcut: string;
  content: string;
  builtIn: boolean;
}
```

- [ ] **Step 2: Add slashCommands to the ChatState interface**

Add this line after `fontFamily: FontFamily;` in the interface:
```ts
slashCommands: SlashCommand[];
```

- [ ] **Step 3: Add initSlashCommands and syncSlashFromPresets to the ChatState interface**

Add these after `setFontFamily:` in the interface:
```ts
initSlashCommands: () => void;
syncSlashFromPresets: () => void;
```

- [ ] **Step 4: Add default state value**

After `fontFamily: 'mono',` add:
```ts
slashCommands: [],
```

- [ ] **Step 5: Add action implementations after setFontFamily**

```ts
initSlashCommands: () => {
  const existing = get().slashCommands;
  if (existing.length > 0) return;

  const builtins: SlashCommand[] = [
    { id: 'builtin-help', name: 'Help', shortcut: 'help', content: 'Available commands: /help, /clear, /summarize, /explain', builtIn: true },
    { id: 'builtin-clear', name: 'Clear Chat', shortcut: 'clear', content: '', builtIn: true },
    { id: 'builtin-summarize', name: 'Summarize', shortcut: 'summarize', content: 'Summarize the following in 3 bullet points:', builtIn: true },
    { id: 'builtin-explain', name: 'Explain Simply', shortcut: 'explain', content: "Explain this like I'm 5:", builtIn: true },
  ];

  const presets = get().presets;
  const fromPresets: SlashCommand[] = presets.map(p => ({
    id: `preset-${p.id}`,
    name: p.name,
    shortcut: p.name.toLowerCase().replace(/\s+/g, '-'),
    content: p.content,
    builtIn: false,
  }));

  set({ slashCommands: [...builtins, ...fromPresets] };
},

syncSlashFromPresets: () => {
  const builtins = get().slashCommands.filter(s => s.builtIn);
  const presets = get().presets;
  const fromPresets: SlashCommand[] = presets.map(p => ({
    id: `preset-${p.id}`,
    name: p.name,
    shortcut: p.name.toLowerCase().replace(/\s+/g, '-'),
    content: p.content,
    builtIn: false,
  }));
  set({ slashCommands: [...builtins, ...fromPresets] });
},
```

- [ ] **Step 6: Call syncSlashFromPresets inside savePreset**

Edit `savePreset` so both the update and create branches call `get().syncSlashFromPresets()` before returning.

After the set call in the update branch (`set({ presets: presets.map(...) })`), add:
```ts
get().syncSlashFromPresets();
```

After the set call in the create branch (`set({ presets: [...presets, ...] })`), add:
```ts
get().syncSlashFromPresets();
```

- [ ] **Step 7: Call syncSlashFromPresets inside deletePreset**

After `set({ presets: get().presets.filter((p) => p.id !== id) });`, add:
```ts
get().syncSlashFromPresets();
```

- [ ] **Step 8: Add slashCommands to the persist partialize list**

In the `partialize` function, add `slashCommands: state.slashCommands,` after `fontFamily:`.

- [ ] **Step 9: Commit**

```bash
git add app/store/chatStore.ts
git commit -m "feat: add SlashCommand type and store actions"
```

---

### Task 2: Create SlashCommandMenu component

**Files:**
- Create: `app/components/SlashCommandMenu.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import type { SlashCommand } from '../store/chatStore';

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  filter: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ commands, filter, selectedIndex, onSelect, onClose }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (commands.length === 0) return null;

  const highlight = (text: string) => {
    if (!filter) return text;
    const idx = text.toLowerCase().indexOf(filter.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-accent font-bold">{text.slice(idx, idx + filter.length)}</span>
        {text.slice(idx + filter.length)}
      </>
    );
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 w-72 max-h-64 overflow-y-auto border border-border bg-surface shadow-lg z-50 font-mono text-sm"
    >
      {commands.map((cmd, i) => (
        <div
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          className={`px-3 py-2 cursor-pointer flex flex-col gap-0.5 border-b border-border/30 last:border-b-0 transition-colors ${
            i === selectedIndex ? 'bg-surface-overlay border-l-2 border-l-accent' : 'hover:bg-surface-overlay'
          }`}
        >
          <span className="text-text-primary">
            /{highlight(cmd.shortcut)}
          </span>
          <span className="text-xs text-text-secondary truncate">{cmd.name}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add app/components/SlashCommandMenu.tsx
git commit -m "feat: create SlashCommandMenu component"
```

---

### Task 3: Integrate slash commands into the chat input

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports:
```ts
import { SlashCommandMenu } from './components/SlashCommandMenu';
import type { SlashCommand } from './store/chatStore';
```

- [ ] **Step 2: Add state variables after `fileInputRef`**

```ts
const textareaRef = useRef<HTMLTextAreaElement>(null);
const [slashOpen, setSlashOpen] = useState(false);
const [slashFilter, setSlashFilter] = useState('');
const [slashIndex, setSlashIndex] = useState(0);
```

- [ ] **Step 3: Add initSlashCommands call in the mount useEffect**

In the existing mount effect (`useEffect(() => { if (mounted && chats.length === 0) { createChat(); } ...), add this before createChat():

```ts
useChatStore.getState().initSlashCommands();
```

- [ ] **Step 4: Compute filtered commands**

After the `filteredChats` computation, add:
```ts
const slashCommands = useChatStore(s => s.slashCommands);
const filteredSlashCommands = slashOpen
  ? slashCommands.filter(cmd => !slashFilter || cmd.shortcut.toLowerCase().includes(slashFilter.toLowerCase()) || cmd.name.toLowerCase().includes(slashFilter.toLowerCase()))
  : [];
```

- [ ] **Step 5: Add the slash select handler**

After `handleSwitchVersion`, add:
```ts
const handleSlashSelect = (cmd: SlashCommand) => {
  if (cmd.shortcut === 'clear') {
    if (activeChatId && window.confirm('Clear this chat?')) {
      useChatStore.getState().deleteChat(activeChatId);
      useChatStore.getState().createChat();
    }
    setSlashOpen(false);
    return;
  }

  const cursorPos = textareaRef.current?.selectionStart ?? inputValue.length;
  const textBefore = inputValue.slice(0, cursorPos);
  const textAfter = inputValue.slice(cursorPos);
  const lastSlashIdx = textBefore.lastIndexOf('/');
  const newValue = textBefore.slice(0, lastSlashIdx) + cmd.content + textAfter;
  setInputValue(newValue);
  setSlashOpen(false);

  requestAnimationFrame(() => {
    const ta = textareaRef.current;
    if (ta) {
      const pos = lastSlashIdx + cmd.content.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    }
  });
};
```

- [ ] **Step 6: Replace the existing textarea with one that handles slash commands**

Replace the existing `<textarea>` block (lines ~628-641) with:

```tsx
<textarea
  ref={textareaRef}
  className="w-full bg-transparent border-none outline-none resize-none text-base placeholder:text-text-secondary min-h-[60px] font-mono"
  placeholder="Ask a question...  Type / for commands"
  rows={2}
  value={inputValue}
  onChange={(e) => {
    const val = e.target.value;
    setInputValue(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastWord = textBeforeCursor.split(/\s/).pop() || '';

    if (lastWord.startsWith('/') && lastWord.length > 1) {
      setSlashFilter(lastWord.slice(1));
      setSlashOpen(true);
      setSlashIndex(0);
    } else if (lastWord === '/') {
      setSlashFilter('');
      setSlashOpen(true);
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  }}
  disabled={isStreaming}
  onKeyDown={(e) => {
    if (slashOpen) {
      const list = filteredSlashCommands;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(i => Math.min(i + 1, list.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && list[slashIndex]) {
        e.preventDefault();
        handleSlashSelect(list[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setSlashOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }}
/>
```

- [ ] **Step 7: Add the SlashCommandMenu inside the form**

Inside the `<form>`, right before the closing `</form>` tag, add:

```tsx
{slashOpen && (
  <SlashCommandMenu
    commands={filteredSlashCommands}
    filter={slashFilter}
    selectedIndex={slashIndex}
    onSelect={handleSlashSelect}
    onClose={() => setSlashOpen(false)}
  />
)}
```

The form needs `className="relative ..."` to anchor the absolute-positioned menu. Change the form's `className` from:
```
className="border border-border...
```
to:
```
className="relative border border-border...
```

- [ ] **Step 8: Run typecheck**

```bash
npx tsc --noEmit --pretty 2>&1 | head -40
```

Fix any type errors.

- [ ] **Step 9: Run linter**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 10: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate slash command menu into chat input"
```

---

### Spec Self-Review

1. **Spec coverage:** All requirements mapped — data model (Task 1), component UI (Task 2), textarea integration (Task 3), built-in commands + preset sync (Task 1 steps 5-7), `/clear` action (Task 3 step 5). No gaps.
2. **Placeholder scan:** Every step has actual code. No TBD/TODO/incomplete references.
3. **Type consistency:** `SlashCommand` interface defined in Task 1, used in Tasks 2 and 3. `initSlashCommands` called from page.tsx per Task 3 step 3. `syncSlashFromPresets` called inside `savePreset` and `deletePreset` per Task 1 steps 6-7. All consistent.
