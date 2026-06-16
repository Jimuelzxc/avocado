# Design Spec: OpenAI-Compatible Chat Streaming & Persistent State

This design document outlines how we will add streaming chat capabilities and persistent state to the "blues." chat application.

## Goal
Transform the static retro UI into a fully functional chat application. Users can configure their own AI settings (Ollama, OpenRouter, etc.), send messages, see streaming AI responses, and persist their chat history across page reloads.

## Architectural Components

### 1. Zustand Store (State Management)
We will use Zustand's `persist` middleware to save settings and chats to the browser's `localStorage`.

- **State Fields:**
  - `apiKey` (string) - User's API key.
  - `baseUrl` (string) - API endpoint (defaults to `https://openrouter.ai/api/v1`).
  - `model` (string) - Chosen model (defaults to `meta-llama/llama-3.2-3b-instruct`).
  - `chats` (array of Chat objects):
    - `id` (string) - Unique ID.
    - `title` (string) - Name of the chat session.
    - `messages` (array of Message objects):
      - `role` ('user' | 'assistant')
      - `content` (string)
  - `activeChatId` (string | null) - ID of the active chat.
  - `isStreaming` (boolean) - True when the backend is sending words.
  - `isSettingsOpen` (boolean) - True when the settings popup is open.

- **Actions:**
  - `setSettings(apiKey, baseUrl, model)`
  - `createChat()` - Instantiates a new chat session and selects it.
  - `deleteChat(id)` - Deletes a chat session.
  - `addMessage(chatId, role, content)` - Appends a message.
  - `updateLastMessage(chatId, content)` - Appends streamed chunks to the last message.
  - `clearAllChats()` - Deletes all chat sessions.

### 2. Settings Modal UI
A retro-styled modal that overlays the main interface when the user clicks the "Settings" button.

- **Inputs:**
  - **Provider Preset Dropdown:** Picks presets (Ollama, OpenRouter, Custom) to auto-fill Base URL.
  - **API Key Input:** Input field with show/hide password toggle.
  - **Base URL Input:** Input field (e.g., `http://localhost:11434/v1` for Ollama).
  - **Model Name Input:** Input field (e.g., `llama3.2`).
- **Styles:** Retains the exact `#000080` (blue) and `#20ffe5` (cyan) visual style of the application.

### 3. Backend Route Handler: `app/api/chat/route.ts`
A Next.js Server Route that proxies requests to the target API to handle CORS issues and secure network requests.

- **Behavior:**
  - Receives the request containing message history and provider settings (`apiKey`, `baseUrl`, `model`).
  - Calls the upstream endpoint `${baseUrl}/chat/completions` with headers `Authorization: Bearer ${apiKey}` (if API key is present) and request body `{ model, messages, stream: true }`.
  - Streams the incoming response chunks back to the client using a `ReadableStream`.
  - Catches connection errors (e.g. if Ollama is offline) and returns a friendly JSON error message.

### 4. Frontend Integration in `app/page.tsx`
Hook up the page UI to use the Zustand store.

- **Sidebar:**
  - Populate the chat history list dynamically.
  - Add a delete button to each chat item in the sidebar.
  - Wire the "New Chat" button to create a new session.
  - Add a "Settings" button to open the settings modal.
- **Message List:**
  - Display messages for the currently selected chat.
  - Render a retro startup screen if no messages are present.
  - Add a "Copy" button to duplicate assistant responses.
  - Add a "Regenerate" button to retry the last query.
- **Input Form:**
  - Submit handler calls the API streaming logic.
  - Disables the send button while streaming is in progress.
  - Automatically scrolls the message box to the bottom as the words type out.

## Verification & Testing Plan
- **Mock Tests:** Verify API route returns stream responses correctly when mock parameters are sent.
- **Manual Verification:**
  - Test setting custom API URL (e.g. Ollama or OpenRouter) and keys.
  - Test sending messages and seeing them stream in real-time.
  - Test reload page and check if chats and settings are still loaded.
  - Test creating multiple chats, switching between them, and deleting them.
