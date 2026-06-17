# Message Editing with Conversation Branching

## Summary

ChatGPT-style edit history: editing a user message creates a new "branch" (version) instead of overwriting. Old branches are preserved and switchable via `< 1/N >` version indicators. Regenerating an assistant message also branches. Auto-regeneration on edit.

## Data Model

### Message (modified)

```typescript
interface Message {
  id: string              // crypto.randomUUID()
  role: 'user' | 'assistant'
  content: string
  parentId: string | null // links to the message this replies to
  createdAt: number
}
```

Messages form a tree via `parentId`. Siblings (same `parentId`) represent different versions at the same conversation position.

### Chat (modified)

```typescript
interface Chat {
  id: string
  title: string
  messages: Message[]
  activeLeafId: string | null  // tail of the currently viewed path
}
```

## Active Path

Computed from `activeLeafId` by walking `parentId` pointers to root. Pure function or memoized selector — called during render.

```
getActivePath(messages, leafId):
  path = []
  current = findByID(messages, leafId)
  while (current):
    path.unshift(current)
    current = findByID(messages, current.parentId)
  return path
```

Only messages on the active path are rendered. All other messages (other branches) are hidden but fully preserved.

## Version Indicator

Shown on any message that has siblings (same `parentId`). Format:

```
< 1/3 >    or    < 2/3 >
```

- Left/right arrows cycle through siblings
- Clicking switches to the selected sibling's deepest descendant (most-recent child at each subsequent fork)
- Position: user messages get indicator below content (above edit button); assistant messages get indicator inline with Regenerate/Copy

## Edit Flow

1. User clicks pencil icon on their user message
2. Content area becomes a `<textarea>` with Save / Cancel buttons
3. User modifies content, clicks Save
4. `editMessage(chatId, msgId, newContent)`:
   - Creates new `Message` with: same `parentId` as original, `role: 'user'`, new content, new ID, current timestamp
   - Sets `activeLeafId` to new message
5. Auto-regenerate: immediately calls API with new user content
   - Creates new assistant `Message` with `parentId` = new user message's ID
   - Sets `activeLeafId` to the new assistant message
   - Streams response via existing `updateLastMessage` / `replaceLastMessage` pattern
6. Old user message and its entire subtree remain in `messages[]` — reachable via version switching

## Regenerate Flow

1. User clicks RotateCcw on assistant message
2. `regenerateMessage(chatId, msgId)`:
   - Creates new assistant `Message` with same `parentId` as original
   - Calls API with the parent user message's content
   - Sets `activeLeafId` to new message
3. Streams normally
4. Old assistant message and its subtree remain accessible

## Store Actions (new/modified)

| Action | Signature | Behavior |
|--------|-----------|----------|
| `addMessage` | `(chatId, message, parentId?)` | Modified: takes `parentId` instead of appending to array end |
| `editMessage` | `(chatId, msgId, newContent)` | Creates user sibling → auto-regenerates |
| `regenerateMessage` | `(chatId, msgId)` | Creates assistant sibling → streams new response |
| `switchVersion` | `(chatId, parentId, targetChildId)` | Recomputes active path to target sibling's deepest descendant |
| `updateLastMessage` | (unchanged) | Appends chunk to the leaf message |
| `replaceLastMessage` | (unchanged) | Replaces leaf content (error case) |
| `clearLastMessage` | (unchanged) | Clears leaf content (stream start) |

## UI Components

All in `page.tsx` (inline, matching existing pattern). No new component files.

**User message rendering** — new edit button + version indicator:
```
<div>
  {editing
    ? <textarea value={editValue} onChange={...} />
    : <p>{msg.content}</p>
  }
  {editing && <button>Save</button> <button>Cancel</button>}
  {!editing && siblings.length > 1 && <VersionIndicator ... />}
  {!editing && <button onClick={startEdit}>✏️</button>}
</div>
```

**Assistant message rendering** — version indicator added to existing button row:
```
<div>
  <MarkdownRenderer content={msg.content} />
  <div className="flex gap-2 items-center">
    {siblings.length > 1 && <VersionIndicator ... />}
    <button onClick={regenerate}><RotateCcw /></button>
    <button onClick={copy}><Copy /></button>
  </div>
</div>
```

**VersionIndicator** — inline component:
```
function VersionIndicator({ siblings, currentId, onSwitch }) {
  const idx = siblings.findIndex(s => s.id === currentId)
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <button onClick={() => onSwitch(siblings[idx - 1])} disabled={idx === 0}>‹</button>
      {idx + 1}/{siblings.length}
      <button onClick={() => onSwitch(siblings[idx + 1])} disabled={idx === siblings.length - 1}>›</button>
    </span>
  )
}
```

## Edge Cases

| Case | Behavior |
|------|----------|
| Edit while streaming | Edit button disabled (`isStreaming` check) |
| Edit root message | Works normally — sibling with `parentId: null` |
| Consecutive edits of same message | Each creates a new sibling; version counter increments |
| Regenerate after edit | New assistant becomes child of the (already-edited) user message |
| Switch branches, unequal depth | Walks to deepest descendant via most-recent child at each fork |
| State migration (localStorage) | Boot: assign IDs + parentId + activeLeafId to existing flat messages |
| Delete chat with branches | Recursively collect all descendants via parentId before removal |
| Send message after editing | `addMessage` with `parentId` = the edited message's ID — natural continuation |

## State Migration

On first load with old data (no IDs, flat array):

```typescript
migrateChat(chat: OldChat): Chat {
  let prevId: string | null = null
  for (const msg of chat.messages) {
    msg.id = crypto.randomUUID()
    msg.parentId = prevId
    msg.createdAt = Date.now()
    prevId = msg.id
  }
  chat.activeLeafId = prevId // last message
  return chat as Chat
}
```

## Send Message Flow (modified)

Current: `addMessage(chatId, userMsg)` → `addMessage(chatId, emptyAssistantMsg)` → stream

Modified:
- First message: `parentId = null`
- Subsequent messages: `parentId = activeLeafId` (last message on active path)
- After an edit: `parentId = newly edited message ID`
- Auto-regeneration after edit: `parentId = edited message ID`, then stream

The active path always extends from root through the active leaf. New messages always become children of the active leaf.

## File Changes

| File | Change |
|------|--------|
| `app/store/chatStore.ts` | Add `editMessage`, `regenerateMessage`, `switchVersion` actions. Modify `addMessage` to accept `parentId`. Add `migrateChat`. Add `getActivePath` utility. |
| `app/page.tsx` | Add edit button + textarea on user messages. Add `VersionIndicator` component. Wire version switching. Wire auto-regeneration. Add `deleteMessageBranch` for chat deletion. |
| No new files | Everything stays inline per existing pattern |
