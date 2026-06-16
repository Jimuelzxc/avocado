# Custom System Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set a custom system prompt in settings that gets injected as a `system` role message to every API call.

**Architecture:** System prompt is stored in Zustand (persisted), edited via the Settings modal, passed through the client, and injected server-side in the API route — so it never appears as a visible chat message.

**Tech Stack:** Next.js 16, Zustand v5, Tailwind v4

---

### Task 1: Add `systemPrompt` to Zustand store

**Files:**
- Modify: `app/store/chatStore.ts`

- [ ] **Step 1: Add `systemPrompt` to `Settings` interface and default state**

  Add the field to the `Settings` interface (line ~15-19) and to the default state (line ~44-50):

  ```typescript
  // In Settings interface (line ~15-19)
  export interface Settings {
    apiKey: string;
    baseUrl: string;
    model: string;
    systemPrompt: string;
  }
  ```

  ```typescript
  // In default state (line ~44-50)
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'meta-llama/llama-3.2-3b-instruct',
  systemPrompt: '',
  ```

  `setSettings` already accepts `Partial<Settings>` — no new action needed.

- [ ] **Step 2: Add `systemPrompt` to `partialize`**

  In the persist middleware config (line ~147-153), add `systemPrompt` so it's saved to localStorage:

  ```typescript
  partialize: (state) => ({
    apiKey: state.apiKey,
    baseUrl: state.baseUrl,
    model: state.model,
    systemPrompt: state.systemPrompt,
    chats: state.chats,
    activeChatId: state.activeChatId,
  }),
  ```

- [ ] **Step 3: Verify**

  Run: `npx tsc --noEmit`
  Expected: No type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add app/store/chatStore.ts
  git commit -m "feat: add systemPrompt field to Zustand store and persistence"
  ```

---

### Task 2: Add system prompt textarea to Settings modal

**Files:**
- Modify: `app/components/SettingsModal.tsx`

- [ ] **Step 1: Add `localSystemPrompt` state and initialize from store**

  After `const [localModel, setLocalModel] = useState(model);` (line 20), add:

  ```typescript
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  ```

  Update the destructure on line 7 to include `systemPrompt`:

  ```typescript
  const { apiKey, baseUrl, model, systemPrompt, setSettings, setSettingsOpen } = useChatStore();
  ```

- [ ] **Step 2: Add textarea to the settings form**

  After the Model Name input block (after line ~117, before the action buttons), add:

  ```tsx
  {/* System Prompt */}
  <div className="flex flex-col gap-1">
    <label className="text-white/80">SYSTEM PROMPT:</label>
    <textarea
      value={localSystemPrompt}
      onChange={(e) => setLocalSystemPrompt(e.target.value)}
      rows={4}
      placeholder="Optional: Set a system prompt to define AI behavior..."
      className="w-full bg-[#000080] border border-white text-white p-2 outline-none focus:border-[#20ffe5] font-mono text-sm resize-y"
    />
  </div>
  ```

- [ ] **Step 3: Include `systemPrompt` in save handler**

  Update `handleSave` (line ~36-43) to pass the local value:

  ```typescript
  const handleSave = () => {
    setSettings({
      apiKey: localApiKey,
      baseUrl: localBaseUrl,
      model: localModel,
      systemPrompt: localSystemPrompt,
    });
    setSettingsOpen(false);
  };
  ```

- [ ] **Step 4: Verify**

  Run: `npx tsc --noEmit`
  Expected: No type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/SettingsModal.tsx
  git commit -m "feat: add system prompt textarea to settings modal"
  ```

---

### Task 3: Pass `systemPrompt` from page to API

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Destructure `systemPrompt` from store**

  Add `systemPrompt` to the existing destructure at line ~11-25:

  ```typescript
  const {
    chats,
    activeChatId,
    apiKey,
    baseUrl,
    model,
    systemPrompt,
    isStreaming,
    ...
  ```

- [ ] **Step 2: Pass `systemPrompt` in the request body**

  In the `handleSendMessage` function, update the fetch body (line ~95-101) to include `systemPrompt`:

  ```typescript
  body: JSON.stringify({
    apiKey,
    baseUrl,
    model,
    systemPrompt,
    messages: [...chatMessages, userMsg],
  }),
  ```

- [ ] **Step 3: Verify**

  Run: `npx tsc --noEmit`
  Expected: No type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add app/page.tsx
  git commit -m "feat: pass systemPrompt to API route from chat page"
  ```

---

### Task 4: Inject system message in API route

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Extract `systemPrompt` from request body**

  Update the destructure on line 5:

  ```typescript
  const { apiKey, baseUrl, model, systemPrompt, messages } = await req.json();
  ```

- [ ] **Step 2: Conditionally prepend system message**

  After the validation checks (after line ~13) and before building the API URL (line ~16), add:

  ```typescript
  // Prepend system prompt if non-empty
  const fullMessages = systemPrompt?.trim()
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;
  ```

- [ ] **Step 3: Use `fullMessages` instead of `messages` in the upstream request**

  In the fetch body (line ~31-35), replace `messages` with `fullMessages`:

  ```typescript
  body: JSON.stringify({
    model,
    messages: fullMessages,
    stream: true,
  }),
  ```

- [ ] **Step 4: Verify**

  Run: `npx tsc --noEmit`
  Expected: No type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/api/chat/route.ts
  git commit -m "feat: inject system prompt as system message in API route"
  ```

---

### Verification

1. **Build check:** `npm run build` — should succeed
2. **Lint:** `npm run lint` — no new issues
3. **Manual test:** Open app → Settings → enter system prompt → Save → Send a message → AI receives system message
4. **Persistence:** Reload page → Settings → system prompt is still there
5. **Blank default:** Clear system prompt → Save → Send a message → no system message sent upstream
