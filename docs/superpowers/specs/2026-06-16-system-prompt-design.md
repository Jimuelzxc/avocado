# Design Spec: Custom System Prompt

Allow users to set a custom system prompt that gets injected into every chat conversation.

## Goal

Give users control over the AI's behavior by providing a system prompt field in the settings modal. The prompt is blank by default, and when non-empty, it is silently prepended as a `system` role message to every API call.

## Changes

### 1. Zustand Store (`app/store/chatStore.ts`)

- Add `systemPrompt: string` to the `Settings` interface with default `''`
- Add `systemPrompt` to the `partialize` list so it persists to localStorage
- No new actions needed — `setSettings` already accepts `Partial<Settings>`

### 2. Settings Modal (`app/components/SettingsModal.tsx`)

- Add `localSystemPrompt` state initialized from store's `systemPrompt`
- Add a multi-line `<textarea>` below the model name field with label "SYSTEM PROMPT:"
- The textarea has 4 visible rows, matches existing input styling
- Pass `systemPrompt: localSystemPrompt` through `setSettings` on save

### 3. Frontend Page (`app/page.tsx`)

- Destructure `systemPrompt` from the store
- Pass it in the API request body alongside `apiKey`, `baseUrl`, `model`, `messages`

### 4. API Route (`app/api/chat/route.ts`)

- Extract `systemPrompt` from the request body
- Build the messages array conditionally:
  - If `systemPrompt` is non-empty, prepend `{ role: 'system', content: systemPrompt }`
  - If empty, use client-provided messages as-is
- This keeps the system prompt invisible in the UI — no system bubble shown to the user

## Key Decisions

- **Server-side injection** — the system prompt is added in the API route, not the client store. This keeps it out of the visible message list and avoids rendering system messages in the chat UI.
- **Blank default** — no change in behavior for existing users. Only activates when explicitly set.
- **Global only** — applied to all chats. Per-chat overrides can come in a future iteration.

## Verification

- Open settings, set a system prompt, save. Reload page — prompt persists.
- Send a message — the upstream API receives a `system` message as the first message.
- Clear the system prompt — messages send without a system message.
