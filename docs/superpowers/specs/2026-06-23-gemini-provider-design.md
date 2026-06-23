# Gemini Provider Integration

Add Google Gemini as a 4th provider preset in the chat app's Settings modal, routing requests through Gemini's native API (`generateContent` / `streamGenerateContent`) instead of the OpenAI-compatible proxy.

## Scope

A single new preset — no generic provider abstraction layer.

## Settings State

A `provider` field is added to the persisted `Settings` interface:

```typescript
interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  provider: 'openai' | 'gemini';  // new, default: 'openai'
}
```

The SettingsModal preset detection is updated to recognize Gemini (by checking `provider` and/or `baseUrl`).

## Settings Modal UI

A 4th option is added to the preset `<select>`:

| Preset | Label | Sets |
|--------|-------|------|
| OpenRouter | "OpenRouter (Cloud)" | `provider: 'openai'`, `baseUrl: https://openrouter.ai/api/v1`, `model: meta-llama/llama-3.2-3b-instruct` |
| Ollama | "Ollama (Localhost)" | `provider: 'openai'`, `baseUrl: http://localhost:11434/v1`, `model: llama3.2` |
| Gemini | "Gemini (Google)" | `provider: 'gemini'`, `baseUrl: https://generativelanguage.googleapis.com/v1beta`, `model: gemini-2.5-flash` |
| Custom | "Custom Endpoint" | Leaves provider/baseUrl/model editable |

The baseUrl field is disabled for Gemini (just like OpenRouter/Ollama) since the endpoint is fixed. Model and API key fields remain editable.

## Client-Side Streaming (`page.tsx`)

The `streamFromActivePath` function sends the `provider` value in the POST body:

```typescript
body: JSON.stringify({
  provider: useChatStore.getState().provider,  // new
  apiKey: useChatStore.getState().apiKey,
  baseUrl: useChatStore.getState().baseUrl,
  model: useChatStore.getState().model,
  systemPrompt: useChatStore.getState().systemPrompt,
  messages: [...historyMessages, { role: "user", content: userContent }],
})
```

The SSE parser on the client remains **unchanged** — it still expects `data: {"choices":[{"delta":{"content":"..."}}]}` format. The backend is responsible for translating Gemini's SSE to this format.

## API Route Transformation (`route.ts`)

When `provider === 'gemini'`:

### Request (outgoing to Gemini API)

- **URL**: `{baseUrl}/models/{model}:streamGenerateContent?alt=sse&key={apiKey}`
- **Method**: POST
- **Headers**: `Content-Type: application/json` (no Authorization header — key goes in URL query)
- **Body transformation**:

```
OpenAI format → Gemini format

systemPrompt    → system_instruction: { parts: [{ text: systemPrompt }] }
user messages   → contents: [{ role: "user", parts: [{ text: content }] }]
assistant msgs  → contents: [{ role: "model", parts: [{ text: content }] }]
image messages  → parts: [{ inlineData: { mimeType, data: base64Data } }]
```

The `model` field is removed from the request body (it's in the URL path). No `stream` field needed (streaming is determined by the URL endpoint).

### Response (incoming from Gemini API)

Gemini's SSE format:
```
data: {"candidates": [{"content": {"parts": [{"text": "Hello"}], "role": "model"}, "index": 0, "finishReason": null}]}

data: [DONE]
```

Is transformed to OpenAI-compatible chunks:
```
data: {"choices": [{"delta": {"content": "Hello"}, "index": 0}]}

data: [DONE]
```

The route reads Gemini's stream, extracts `candidates[0].content.parts[*].text`, and writes OpenAI-format SSE events to the response. The outer SSE framing (`data: ...\n\n`) is preserved.

### Error Handling

Gemini error responses (non-2xx) return JSON like `{ error: { message: "...", code: 400 } }`. The route maps these to the same `{ error: "..." }` format the client already handles.

## Files Changed

| File | Change |
|------|--------|
| `app/store/chatStore.ts` | Add `provider: 'openai'` to `Settings` interface, default state, and `partialize` |
| `app/components/SettingsModal.tsx` | Add Gemini preset option; detect Gemini in preset computation |
| `app/page.tsx` | Include `provider` in POST body to `/api/chat` |
| `app/api/chat/route.ts` | Detect `provider: 'gemini'`, transform request/response format |

No new files, no new dependencies.

## Non-Goals

- No generic provider abstraction layer
- No Anthropic/Cohere/etc. support — just Gemini
- No `safetySettings` or `generationConfig` passthrough (uses Gemini defaults)
- No separate API key field per provider
