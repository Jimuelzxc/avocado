# Stream Cancellation — UX Design

## Problem

The chat app streams AI responses via Server-Sent Events. There is currently no way to stop a stream mid-response. During streaming, the input and send button are simply disabled — the user must wait for the model to finish or refresh the page. This is frustrating with slow models, accidentally triggered long responses, or when the model goes off-track.

## Design

### AbortController ref in page.tsx

A `useRef<AbortController | null>` holds the active stream's controller. Created before `fetch()` and passed as the `signal` property. On stop, `abortController.abort()` is called.

### Stop button replaces Send button while streaming

The `ArrowUp` send icon is replaced by a `Square` stop icon (from `lucide-react`) when `isStreaming` is `true`.

| State | Button shown | Behavior |
|-------|-------------|----------|
| Idle | ArrowUp (send) | Sends message, disabled when input empty |
| Streaming | Square (stop) | Calls `abort()`, stream halts, partial content preserved |

### AbortError handling

In the `catch` block of `streamFromActivePath`:
- If `error.name === 'AbortError'` → do nothing (partial content stays, `isStreaming` set to `false` via `finally`)
- Otherwise → show error message (existing behavior unchanged)

### Stop button UX

- Same position and size as send button (bottom-right of form)
- Square icon with distinct hover color (red/accent-secondary tint)
- `type="button"` (not submit)
- Always clickable during streaming (not disabled)
- Button is `disabled` when not streaming (hidden via conditional render, not just disabled)

### Edge cases handled

- **Double stop:** second click is no-op (already aborted, `isStreaming` already `false`)
- **Stream finishes naturally:** controller ref cleaned up in `finally`
- **Abort + new message:** createChat checks `isStreaming` (existing guard handles it)
- **Partial content:** preserved exactly as received up to abort point

## Files changed

- `app/page.tsx` — AbortController ref, icon swap, catch logic
