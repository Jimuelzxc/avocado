# Per-Preset Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Each preset (OpenRouter, Ollama, Gemini, Custom) stores its own apiKey, baseUrl, and model independently. Switching presets restores that preset's saved values.

**Architecture:** A `presets` map in the store holds per-preset config. Flat fields (`apiKey`, `baseUrl`, `model`, `provider`) are kept as derived state (synced on every save/preset switch) so existing consumers -- `page.tsx` and `route.ts` -- work unchanged. `partialize` persists `presets` + `activePreset` instead of the flat fields.

**Tech Stack:** zustand v5, TypeScript

---

### Task 1: Restructure store state for per-preset config

**Files:**
- Modify: `app/store/chatStore.ts`

**Changes:**

1. Add `PresetConfig` interface right after `Settings`:

```typescript
export interface PresetConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type PresetName = 'openrouter' | 'ollama' | 'gemini' | 'custom';
```

2. Add `activePreset` and `presets` to `ChatState` interface (after the existing fields):

```typescript
interface ChatState {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  provider: 'openai' | 'gemini';
  activePreset: PresetName;
  presets: Record<PresetName, PresetConfig>;
  // ... rest unchanged
}
```

3. Update defaults in the `create` call. Replace:

```typescript
apiKey: '',
baseUrl: 'https://openrouter.ai/api/v1',
model: 'meta-llama/llama-3.2-3b-instruct',
systemPrompt: '',
provider: 'openai',
```

With:

```typescript
apiKey: '',
baseUrl: 'https://openrouter.ai/api/v1',
model: 'meta-llama/llama-3.2-3b-instruct',
systemPrompt: '',
provider: 'openai',
activePreset: 'openrouter',
presets: {
  openrouter: { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.2-3b-instruct' },
  ollama: { apiKey: '', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' },
  gemini: { apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
  custom: { apiKey: '', baseUrl: '', model: '' },
},
```

4. Update `setSettings` to also save to the active preset:

```typescript
setSettings: (settings) => set((state) => {
  const newState = { ...state, ...settings };
  if (settings.apiKey !== undefined || settings.baseUrl !== undefined || settings.model !== undefined) {
    const p = state.activePreset;
    newState.presets = {
      ...state.presets,
      [p]: {
        ...state.presets[p],
        ...(settings.apiKey !== undefined ? { apiKey: settings.apiKey } : {}),
        ...(settings.baseUrl !== undefined ? { baseUrl: settings.baseUrl } : {}),
        ...(settings.model !== undefined ? { model: settings.model } : {}),
      },
    };
  }
  if (settings.systemPrompt !== undefined) {
    newState.activePresetId = null;
  }
  return newState;
}),
```

5. Add `switchPreset` action to `ChatState`:

```typescript
interface ChatState {
  // ...after existing actions
  switchPreset: (name: PresetName) => void;
}
```

Implementation (in the create function, after `setSettings`):

```typescript
switchPreset: (name) => set((state) => ({
  activePreset: name,
  apiKey: state.presets[name].apiKey,
  baseUrl: state.presets[name].baseUrl,
  model: state.presets[name].model,
  provider: name === 'gemini' ? 'gemini' : 'openai',
})),
```

6. Update `partialize`. Replace flat field entries with:

```typescript
partialize: (state) => ({
  activePreset: state.activePreset,
  presets: state.presets,
  systemPrompt: state.systemPrompt,
  presets: state.presets,
  activePresetId: state.activePresetId,
  chats: state.chats,
  activeChatId: state.activeChatId,
  theme: state.theme,
  fontSize: state.fontSize,
  fontFamily: state.fontFamily,
  slashCommands: state.slashCommands,
  customSlashCommands: state.customSlashCommands,
}),
```

7. Update the migration in the persist config. After the existing `migrate` function body, add a v3 migration before the return:

```typescript
migrate: (persisted: any) => {
  // existing migrations (lines 426-439 unchanged)...
  
  // Migration v3: flat fields → presets map
  if (persisted?.apiKey !== undefined && !persisted?.presets) {
    const isGemini = persisted.provider === 'gemini';
    const isLocal = persisted.baseUrl?.includes('localhost') || persisted.baseUrl?.includes('127.0.0.1');
    const isOpenRouter = persisted.baseUrl?.includes('openrouter.ai');
    const detectedPreset = isGemini ? 'gemini' : isLocal ? 'ollama' : isOpenRouter ? 'openrouter' : 'custom';

    persisted.presets = {
      openrouter: { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.2-3b-instruct' },
      ollama: { apiKey: '', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' },
      gemini: { apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
      custom: { apiKey: '', baseUrl: '', model: '' },
    };

    persisted.presets[detectedPreset] = {
      apiKey: persisted.apiKey || '',
      baseUrl: persisted.baseUrl || '',
      model: persisted.model || '',
    };

    persisted.activePreset = detectedPreset;
    delete persisted.apiKey;
    delete persisted.baseUrl;
    delete persisted.model;
    delete persisted.provider;
  }
  
  return persisted;
},
```

**Edge case:** The `provider` field was added in the previous task. Some users may have it in localStorage, some may not. Check before accessing.

- [ ] **Step 1:** Add `PresetConfig`, `PresetName` types above `ChatState`
- [ ] **Step 2:** Add `activePreset`, `presets` to `ChatState` interface
- [ ] **Step 3:** Update defaults with per-preset maps
- [ ] **Step 4:** Update `setSettings` to write to `presets[activePreset]`
- [ ] **Step 5:** Add `switchPreset` action
- [ ] **Step 6:** Update `partialize` to persist `activePreset` + `presets`
- [ ] **Step 7:** Add v3 migration for old flat format
- [ ] **Step 8:** Verify TypeScript passes

```bash
npx tsc --noEmit
```

- [ ] **Step 9:** Commit

```bash
git add app/store/chatStore.ts
git commit -m "feat: store per-preset config in presets map"
```

---

### Task 2: Update SettingsModal to use per-preset config

**Files:**
- Modify: `app/components/SettingsModal.tsx`

**Changes:**

1. Destructure `activePreset` and `switchPreset` from the store:

```typescript
const { apiKey, baseUrl, model, activePreset, presets, switchPreset, theme, fontSize, fontFamily, setTheme, setFontSize, setFontFamily, setSettings, setSettingsOpen } = useChatStore();
```

2. Replace the `preset` useState + initialization with one derived from `activePreset`:

```typescript
const [preset, setPreset] = useState<PresetName>(activePreset);
const [localApiKey, setLocalApiKey] = useState(apiKey);
const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
const [localModel, setLocalModel] = useState(model);
const [showKey, setShowKey] = useState(false);
```

3. Update `handlePresetChange` to load from store's presets map instead of hardcoded values:

```typescript
const handlePresetChange = (selected: PresetName) => {
  setPreset(selected);
  const presetData = presets[selected];
  setLocalBaseUrl(presetData.baseUrl);
  setLocalModel(presetData.model);
  setLocalApiKey(presetData.apiKey);
};
```

4. Update `handleSave` to save and switch preset:

```typescript
const handleSave = () => {
  setSettings({
    apiKey: localApiKey,
    baseUrl: localBaseUrl,
    model: localModel,
  });
  switchPreset(preset);
  setSettingsOpen(false);
};
```

Actually, `switchPreset` should be called first so the flat fields match the preset, then `setSettings` saves to the correct preset. But actually, since `switchPreset` copies `presets[name]` into flat fields and `setSettings` writes flat fields to `presets[activePreset]`, the order matters. Let me think...

If user is on OpenRouter (activePreset='openrouter'), switches to Gemini, sets API key, saves:
1. `preset` local state = 'gemini'
2. `switchPreset('gemini')` → activePreset='gemini', flat fields = presets.gemini values
3. But the local form state has the user's edits! We'd lose them!

Hmm, this is a problem. The local form state and the store are decoupled. Let me rethink.

Current flow:
1. Modal opens → local state = store values
2. User edits → local state changes
3. User saves → local state → store via setSettings

New flow needed:
1. Modal opens → local state = store values (same)
2. User changes preset → load that preset's data into local state (overwrites edits)
3. User edits → local state changes (same)
4. User saves → save local state to store AND switch/store to current preset

So `handleSave` should:
1. Save local state to store (which writes to `presets[activePreset]`)
2. Switch active preset OR just set activePreset

Actually, the issue is: `activePreset` in the store might be 'openrouter' but the user is editing 'gemini' form fields. When they save, we need to:
1. Save the local form to `presets['gemini']` 
2. Set `activePreset` to 'gemini'
3. Sync flat fields

New handleSave:

```typescript
const handleSave = () => {
  switchPreset(preset);
  setSettings({
    apiKey: localApiKey,
    baseUrl: localBaseUrl,
    model: localModel,
  });
  setSettingsOpen(false);
};
```

Wait, this order also doesn't work. If user was on openrouter (activePreset='openrouter') and selects gemini in the dropdown:
- `preset` local state = 'gemini' (set in handlePresetChange)
- `localApiKey` = (whatever user typed or loaded from presets)
- On save: `switchPreset('gemini')` → copies `presets['gemini']` into flat fields (overwriting the local edits!)
- Then `setSettings({ apiKey: localApiKey, ... })` → writes to `presets['gemini']` because `activePreset` is now 'gemini'

Actually wait, that works! `switchPreset` copies `presets['gemini']` into flat fields, then `setSettings` copies local form state into both flat fields AND `presets['gemini']`. The `switchPreset` step is redundant for the values but it sets the correct `activePreset` and `provider`.

Actually, the `switchPreset` step is destructive — it overwrites the flat fields with the old preset values BEFORE `setSettings` updates them with local form values. That's fine because `setSettings` overwrites them again. So the final state is:

1. `activePreset` = 'gemini' ✓
2. `provider` = 'gemini' ✓  
3. Flat `apiKey` = `localApiKey` ✓
4. `presets['gemini'].apiKey` = `localApiKey` ✓

This works!

But what if we do it in the opposite order? `setSettings` first, then `switchPreset`?

1. `setSettings({ apiKey: localApiKey, baseUrl: localBaseUrl, model: localModel })` 
   - Writes to flat fields AND `presets[activePreset]` (which is 'openrouter' at this point)
   - So the data goes to the WRONG preset!
2. Then `switchPreset('gemini')` copies `presets['gemini']` into flat fields
   - Now flat fields have old Gemini data, not the user's edits!

So the correct order is: `switchPreset` first, then `setSettings`. Let me use that.

```typescript
const handleSave = () => {
  switchPreset(preset);
  setSettings({
    apiKey: localApiKey,
    baseUrl: localBaseUrl,
    model: localModel,
  });
  setSettingsOpen(false);
};
```

5. Import `PresetName` type:

```typescript
import { useChatStore, Theme, FontSize, FontFamily, PresetName } from '../store/chatStore';
```

- [ ] **Step 1:** Import `PresetName` type
- [ ] **Step 2:** Destructure `activePreset`, `presets`, `switchPreset`
- [ ] **Step 3:** Replace preset initialization — derive from `activePreset` instead of URL detection
- [ ] **Step 4:** Update `handlePresetChange` to load from `presets[selected]`
- [ ] **Step 5:** Update `handleSave` to call `switchPreset` before `setSettings`
- [ ] **Step 6:** Verify TypeScript passes
- [ ] **Step 7:** Commit

```bash
git add app/components/SettingsModal.tsx
git commit -m "feat: SettingsModal uses per-preset config from store"
```

---

### Task 3: Verify build

- [ ] **Step 1:** TypeScript check

```bash
npx tsc --noEmit
```

- [ ] **Step 2:** Lint

```bash
npm run lint
```

- [ ] **Step 3:** Build

```bash
npm run build
```
