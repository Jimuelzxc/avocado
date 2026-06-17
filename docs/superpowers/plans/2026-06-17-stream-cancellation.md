# Stream Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stop button to cancel AI stream mid-response, preserving partial content.

**Architecture:** A `useRef<AbortController>` in page.tsx holds the active stream controller. When send fires, create the controller and pass `signal` to fetch. The stop button (Square icon) replaces the send button (ArrowUp icon) while `isStreaming` is true. An AbortError catch skips the error message replacement.

**Tech Stack:** Next.js 16, React 19, zustand 5, lucide-react icons

**Files modified:** `app/page.tsx` only

---

### Task 1: Add imports, ref, and stop handler

**Files:**
- Modify: `app/page.tsx:1-8` (imports), `app/page.tsx:42-65` (ref + handler), `app/page.tsx:98-164` (stream function)

- [ ] **Step 1: Add Square to import**

```
Current: import { RotateCcw, Copy, Settings as SettingsIcon, Trash2, Menu, X, Pencil } from 'lucide-react';
Change:  import { RotateCcw, Copy, Settings as SettingsIcon, Trash2, Menu, X, Pencil, Square } from 'lucide-react';
```

- [ ] **Step 2: Add AbortController ref after existing refs (line ~64)**

```typescript
const abortControllerRef = useRef<AbortController | null>(null);
```

- [ ] **Step 3: Add stop handler after handleSendMessage**

```typescript
const handleStopStream = () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }
};
```

- [ ] **Step 4: Wire AbortController into streamFromActivePath**

In `streamFromActivePath`, just after the `useChatStore.getState()` call at the top, add:

```typescript
abortControllerRef.current?.abort(); // cancel any previous stream
const controller = new AbortController();
abortControllerRef.current = controller;
```

Pass the signal to the fetch call:

In the `fetch('/api/chat', ...)` call, add `signal: controller.signal,` to the options object.

In the `finally` block, add:

```typescript
if (abortControllerRef.current === controller) {
  abortControllerRef.current = null;
}
```

- [ ] **Step 5: Handle AbortError in catch**

Replace the catch block:

```typescript
catch (error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    // Stream was cancelled — keep partial content
    return;
  }
  console.error('Streaming error:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  replaceLastMessage(chatId, `Error: ${errorMessage}`);
}
```

### Task 2: Stop button in the form

**Files:**
- Modify: `app/page.tsx:476-485` (button area in form)

- [ ] **Step 1: Replace send button with conditional stop/send**

```tsx
<div>
  {isStreaming ? (
    <button
      type="button"
      onClick={handleStopStream}
      className="p-2 hover:bg-surface-overlay rounded-sm transition-colors text-accent-secondary hover:text-red-400 cursor-pointer"
      aria-label="Stop streaming"
    >
      <Square size={22} strokeWidth={1.5} />
    </button>
  ) : (
    <button
      type="submit"
      disabled={!inputValue.trim()}
      className="p-2 hover:bg-surface-overlay rounded-sm transition-colors text-text-primary hover:text-accent disabled:opacity-50 disabled:hover:text-text-primary cursor-pointer"
      aria-label="Send message"
    >
      <ArrowUp size={22} strokeWidth={1.5} />
    </button>
  )}
</div>
```

### Task 3: Verify

- [ ] **Step 1: Lint and typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Expected: no errors.
