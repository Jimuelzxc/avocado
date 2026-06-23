# Gemini Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Gemini as a 4th provider preset that routes chat requests through Gemini's native API.

**Architecture:** A `provider` field is added to the persisted Settings. When `provider: 'gemini'`, the API route translates the OpenAI-format request to Gemini's `streamGenerateContent` API, then transforms Gemini's SSE response back to OpenAI-compatible chunks so the client-side stream parser is unchanged.

**Tech Stack:** Next.js 16.2.9, zustand v5, Tailwind v4

---

### Task 1: Add `provider` to Settings state

**Files:**
- Modify: `app/store/chatStore.ts:42-47` (Settings interface)
- Modify: `app/store/chatStore.ts:152-167` (default state)
- Modify: `app/store/chatStore.ts:411-425` (partialize)

- [ ] **Step 1: Add `provider` to the Settings interface**

```typescript
export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  provider: 'openai' | 'gemini';
}
```

- [ ] **Step 2: Add `provider: 'openai'` to the default store state, right after `systemPrompt: ''`**

```typescript
apiKey: '',
baseUrl: 'https://openrouter.ai/api/v1',
model: 'meta-llama/llama-3.2-3b-instruct',
systemPrompt: '',
provider: 'openai',
```

- [ ] **Step 3: Add `provider` to `partialize` so it's persisted to localStorage**

```typescript
partialize: (state) => ({
  apiKey: state.apiKey,
  baseUrl: state.baseUrl,
  model: state.model,
  systemPrompt: state.systemPrompt,
  provider: state.provider,
  presets: state.presets,
  // ... rest unchanged
}),
```

`setSettings` already uses `Partial<Settings>` spread — no changes needed there.

- [ ] **Step 4: Commit**

```bash
git add app/store/chatStore.ts
git commit -m "feat: add provider field to Settings state"
```

---

### Task 2: Update SettingsModal with Gemini preset

**Files:**
- Modify: `app/components/SettingsModal.tsx`

- [ ] **Step 1: Destructure `provider` from the store**

Replace the destructuring line:
```typescript
const { apiKey, baseUrl, model, theme, fontSize, fontFamily, setTheme, setFontSize, setFontFamily, setSettings, setSettingsOpen } = useChatStore();
```

With:
```typescript
const { apiKey, baseUrl, model, provider, theme, fontSize, fontFamily, setTheme, setFontSize, setFontFamily, setSettings, setSettingsOpen } = useChatStore();
```

- [ ] **Step 2: Update preset detection to recognize Gemini**

Replace the `useState` initialization:
```typescript
const [preset, setPreset] = useState(() => {
  if (provider === 'gemini') return 'gemini';
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return 'ollama';
  } else if (baseUrl.includes('openrouter.ai')) {
    return 'openrouter';
  } else {
    return 'custom';
  }
});
```

- [ ] **Step 3: Add 'gemini' case to `handlePresetChange`**

```typescript
const handlePresetChange = (selected: string) => {
  setPreset(selected);
  if (selected === 'ollama') {
    setLocalBaseUrl('http://localhost:11434/v1');
    setLocalModel('llama3.2');
    setLocalApiKey('');
  } else if (selected === 'openrouter') {
    setLocalBaseUrl('https://openrouter.ai/api/v1');
    setLocalModel('meta-llama/llama-3.2-3b-instruct');
  } else if (selected === 'gemini') {
    setLocalBaseUrl('https://generativelanguage.googleapis.com/v1beta');
    setLocalModel('gemini-2.5-flash');
  }
};
```

- [ ] **Step 4: Add "Gemini (Google)" option to the preset `<select>`**

Replace the existing 3 options:
```tsx
<option value="openrouter">OpenRouter (Cloud)</option>
<option value="ollama">Ollama (Localhost)</option>
<option value="gemini">Gemini (Google)</option>
<option value="custom">Custom Endpoint</option>
```

- [ ] **Step 5: Disable baseUrl input for Gemini (same as OpenRouter/Ollama)**

The existing `disabled={preset !== 'custom'}` already covers this since Gemini will set `preset` to `'gemini'`.

- [ ] **Step 6: Include `provider` in `handleSave`**

```typescript
const handleSave = () => {
  setSettings({
    apiKey: localApiKey,
    baseUrl: localBaseUrl,
    model: localModel,
    provider: preset === 'gemini' ? 'gemini' : 'openai',
  });
  setSettingsOpen(false);
};
```

- [ ] **Step 7: Commit**

```bash
git add app/components/SettingsModal.tsx
git commit -m "feat: add Gemini preset to SettingsModal"
```

---

### Task 3: Send `provider` in the API request body

**Files:**
- Modify: `app/page.tsx:198-207`

- [ ] **Step 1: Add `provider` to the POST body in `streamFromActivePath`**

```typescript
body: JSON.stringify({
  provider: useChatStore.getState().provider,
  apiKey: useChatStore.getState().apiKey,
  baseUrl: useChatStore.getState().baseUrl,
  model: useChatStore.getState().model,
  systemPrompt: useChatStore.getState().systemPrompt,
  messages: [
    ...historyMessages,
    { role: "user", content: userContent },
  ],
}),
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: send provider field in chat API request"
```

---

### Task 4: Implement Gemini request/response transformation in route.ts

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Destructure `provider` from the request body**

```typescript
const { apiKey, baseUrl, model, systemPrompt, messages, provider } = await req.json();
```

- [ ] **Step 2: Add early return for Gemini requests, before the existing OpenAI logic**

```typescript
if (provider === 'gemini') {
  return handleGeminiRequest(apiKey, baseUrl, model, systemPrompt, messages);
}
```

- [ ] **Step 3: Add the Gemini helper function inside route.ts**

This goes after the `POST` function, still in the same file.

```typescript
async function handleGeminiRequest(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: any[]
) {
  const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const apiUrl = `${sanitizedBaseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = messages.map((msg: any) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: contentToParts(msg.content),
  }));

  const body: any = { contents };
  if (systemPrompt?.trim()) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `Gemini error (${response.status})`;
    try {
      const err = JSON.parse(errorText);
      if (err.error?.message) msg = err.error.message;
    } catch {}
    return NextResponse.json({ error: msg }, { status: response.status });
  }

  const geminiStream = response.body;
  if (!geminiStream) {
    return NextResponse.json({ error: 'Response body is not readable' }, { status: 500 });
  }

  const reader = geminiStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const transformedStream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            const lines = (buffer + decoder.decode()).split('\n');
            for (const line of lines) {
              processGeminiLine(line.trim(), controller, encoder);
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            processGeminiLine(line.trim(), controller, encoder);
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(transformedStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function processGeminiLine(
  line: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  if (!line || line === 'data: [DONE]') return;
  if (!line.startsWith('data: ')) return;

  try {
    const parsed = JSON.parse(line.slice(6));
    const text = parsed.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text || '')
      .join('') || '';
    if (text) {
      const openaiChunk = JSON.stringify({
        choices: [{ delta: { content: text }, index: 0 }],
      });
      controller.enqueue(encoder.encode(`data: ${openaiChunk}\n\n`));
    }
  } catch {}
}

function contentToParts(content: any): any[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }
  if (Array.isArray(content)) {
    return content.map((block: any) => {
      if (block.type === 'text') return { text: block.text };
      if (block.type === 'image_url') {
        const match = block.image_url.url.match(/^data:(.+?);base64,(.+)$/);
        if (match) {
          return { inlineData: { mimeType: match[1], data: match[2] } };
        }
      }
      return { text: '' };
    });
  }
  return [{ text: '' }];
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add Gemini API request/response transformation"
```

---

### Task 5: Verify build

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 2: Lint check**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: Build succeeds.
