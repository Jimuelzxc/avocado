# Slash Commands for avocado

## Overview

Add a `/`-triggered command menu to the chat input that lets users quickly insert
prompt templates and execute built-in actions. Leverages the existing
`PromptPreset` infrastructure so presets saved in the System Prompt modal
automatically become available as slash commands.

## Data Model

```ts
interface SlashCommand {
  id: string;
  name: string;        // display label, e.g. "Summarize"
  shortcut: string;    // trigger text after /, e.g. "summarize"
  content: string;     // template text inserted into the input
  builtIn: boolean;    // true for /help, /clear etc.
}
```

Stored in `chatStore` under `slashCommands: SlashCommand[]`, persisted via
zustand middleware alongside existing data.

**Auto-sync:** When a `PromptPreset` is saved/updated/deleted in the
SystemPromptModal, the corresponding `SlashCommand` is created/updated/deleted
automatically. Built-in commands are seeded on first load and never collide
with user-defined ones.

## Built-in Commands

| Trigger     | Behavior |
|-------------|----------|
| `/help`     | Inserts a short list of available commands |
| `/clear`    | Clears the active chat (with a confirmation step) |
| `/summarize`| Inserts "Summarize the following in 3 bullet points:" |
| `/explain`  | Inserts "Explain this like I'm 5:" |

## UI: SlashCommandMenu Component

A positioned dropdown rendered as an overlay above the textarea.

**Triggering:**
- Typing `/` at the start of a word (or after whitespace) opens the menu
- As the user types more characters, the list filters by substring match on
  `shortcut` and `name`
- Deleting back to just `/` shows all commands

**Appearance:**
- Floating panel anchored near the cursor, styled to match the retro terminal
  theme (`bg-surface`, `border-border`, monospace font)
- Max ~8 visible items, scrollable if more
- Each row shows the shortcut (with matching chars highlighted/bolded) and a
  one-line preview of the content
- Selected item is highlighted with `bg-surface-overlay` / accent border

**Keyboard:**
- `ArrowUp` / `ArrowDown` — navigate the list
- `Enter` — select the highlighted item; replaces `/command` text with the
  template content in the textarea; keeps focus in the textarea
- `Escape` — close the menu without selecting
- `Backspace` when the input is just `/` — close the menu

**Click:**
- Clicking an item selects it (same as Enter)
- Clicking outside the menu closes it

## Integration into page.tsx

The existing textarea's `onChange` handler is augmented to:

1. Detect `/` typed after whitespace or at the start
2. Extract the partial command text
3. Open/filter the `SlashCommandMenu`
4. On selection, replace the `/partial` text with the template `content`
5. On Escape/Backspace, close the menu

No changes to the message-sending flow — the command content ends up as
regular text in the textarea, and the user sends it normally (or edits first).

## Store Changes (chatStore.ts)

Add state:
- `slashCommands: SlashCommand[]`
- `isSlashMenuOpen: boolean`
- `slashFilter: string`
- `selectedSlashIndex: number`

Add actions:
- `initSlashCommands()` — seed built-in commands on first load
- `syncSlashFromPresets()` — sync user presets into slash commands
- `selectSlashCommand(id)` — apply the selected command to the input

The existing `savePreset`, `deletePreset` actions call `syncSlashFromPresets`
after mutation.

## Files Changed

| File | Change |
|------|--------|
| `app/store/chatStore.ts` | Add SlashCommand type, state fields, actions |
| `app/components/SlashCommandMenu.tsx` | **New** — the dropdown component |
| `app/page.tsx` | Integrate slash menu into textarea handler |

## Out of Scope

- Slash commands in the Notes editor (future)
- Custom user-defined shortcuts via a dedicated UI (the System Prompt modal
  already serves this purpose)
- Server-side command execution
