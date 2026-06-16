# Themes System Design

## Overview

Add a multi-theme system to the blues. chat app. Four themes: Default (current retro navy), Dark, Light, and Claude Code (warm dark). Users switch via a dropdown in the sidebar.

## Token System

All hardcoded colors replaced with semantic CSS custom properties, mapped through Tailwind's `@theme inline` directive.

| Token | Tailwind class | Purpose |
|-------|---------------|---------|
| `--surface` | `bg-surface` | Primary background |
| `--surface-overlay` | `bg-surface-overlay` | Overlay/info banners |
| `--text-primary` | `text-primary` | Body text |
| `--text-secondary` | `text-text-secondary` | Dimmed/muted text |
| `--accent` | `text-accent`, `border-accent`, `ring-accent` | Headlines, active states, focus rings |
| `--accent-secondary` | `text-accent-secondary` | Secondary highlight (delete hover, etc.) |
| `--border` | `border-border` | Borders |
| `--selection` | `selection:bg-selection` (via custom) | Text selection highlight |

## Theme Palettes

### Default (current retro)
- `--surface`: `#000080`
- `--surface-overlay`: `rgba(0,0,0,0.3)`
- `--text-primary`: `#ffffff`
- `--text-secondary`: `rgba(255,255,255,0.8)`
- `--accent`: `#20ffe5`
- `--accent-secondary`: `#f6ff00`
- `--border`: `#ffffff`
- `--selection`: `rgba(32,255,229,0.3)`

### Dark
- `--surface`: `#111111`
- `--surface-overlay`: `rgba(255,255,255,0.05)`
- `--text-primary`: `#e0e0e0`
- `--text-secondary`: `rgba(224,224,224,0.7)`
- `--accent`: `#4fc3f7`
- `--accent-secondary`: `#ff8a65`
- `--border`: `#333333`
- `--selection`: `rgba(79,195,247,0.3)`

### Light
- `--surface`: `#ffffff`
- `--surface-overlay`: `rgba(0,0,0,0.05)`
- `--text-primary`: `#1a1a1a`
- `--text-secondary`: `rgba(26,26,26,0.6)`
- `--accent`: `#2563eb`
- `--accent-secondary`: `#d97706`
- `--border`: `#d1d5db`
- `--selection`: `rgba(37,99,235,0.2)`

### Claude Code
- `--surface`: `#1a1a1a`
- `--surface-overlay`: `rgba(255,255,255,0.06)`
- `--text-primary`: `#e8dcc8`
- `--text-secondary`: `rgba(232,220,200,0.6)`
- `--accent`: `#f5a623`
- `--accent-secondary`: `#e06c75`
- `--border`: `#3a3a3a`
- `--selection`: `rgba(245,166,35,0.3)`

## Architecture

### CSS (`globals.css`)
- Declare CSS variables on `:root` (mapped to Default theme)
- `[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="claude"]` blocks override
- Tailwind `@theme inline` maps `--color-*` to token classes

### Store (`chatStore.ts`)
- Add `theme: 'default'` to persisted state
- Add `setTheme: (theme: string) => void` action
- Persisted alongside existing settings in `'blues-chat-storage'`

### Activation
- Tiny `ThemeProvider` client component in layout that:
  - Reads `theme` from zustand store
  - Sets `data-theme` attribute on `<html>`
  - On initial load, respects `prefers-color-scheme` as default (maps to dark/light), but user selection overrides

### Theme Switcher UI
- Dropdown `<select>` in sidebar header, between the logo/title and the gear icon
- Styled to match the retro feel
- Four options: Default, Dark, Light, Claude Code
- On change: calls `setTheme()` in store

### Refactoring
Replace every hardcoded color value in these files with token-based Tailwind classes:

- `app/page.tsx` — all `bg-[#000080]`, `text-[#20ffe5]`, `text-[#f6ff00]`, `text-white`, `border-white`, `bg-black/30`, `selection:bg-[#20ffe5]/30`, hover colors
- `app/components/SettingsModal.tsx` — all `bg-[#000080]`, `text-[#20ffe5]`, `text-white`, `border-white`, `hover:bg-[#20ffe5]/10`, `border-[#20ffe5]`
- `app/components/SystemPromptModal.tsx` — same pattern (check for hardcoded colors)
- `app/components/MarkdownRenderer.tsx` — same pattern

## Files Changed

1. `app/globals.css` — add CSS variables, theme blocks, `@theme inline` mapping
2. `app/store/chatStore.ts` — add `theme` state + `setTheme` action
3. `app/layout.tsx` — add `ThemeProvider` client component
4. `app/page.tsx` — add theme switcher dropdown, refactor hardcoded colors
5. `app/components/SettingsModal.tsx` — refactor hardcoded colors
6. `app/components/SystemPromptModal.tsx` — refactor hardcoded colors (if needed)
7. `app/components/MarkdownRenderer.tsx` — refactor hardcoded colors (if needed)

## Future Considerations

- New themes can be added by adding a `[data-theme="name"]` block and palette values
- Could extend to allow custom accent color in the future
