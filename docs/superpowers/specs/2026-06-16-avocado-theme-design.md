# Avocado Theme Design

## Overview

New "Avocado" theme — a green-accented variant of the existing Claude Code theme. Same warm dark background, but the amber/red accents replaced with green tones for a fresh, earthy feel.

## Changes from Claude Code

| Token | Claude Code | Avocado |
|-------|------------|---------|
| `--accent` | `#f5a623` (amber) | `#4caf50` (medium green) |
| `--accent-secondary` | `#e06c75` (soft red) | `#8bc34a` (light green) |
| `--selection` | `rgba(245,166,35,0.3)` | `rgba(76,175,80,0.3)` |

Everything else inherits from Claude Code's palette (`--surface`, `--surface-overlay`, `--text-primary`, `--text-secondary`, `--border`).

## Full Palette

- `--surface`: `#1a1a1a`
- `--surface-overlay`: `rgba(255,255,255,0.06)`
- `--text-primary`: `#e8dcc8`
- `--text-secondary`: `rgba(232,220,200,0.6)`
- `--accent`: `#4caf50`
- `--accent-secondary`: `#8bc34a`
- `--border`: `#3a3a3a`
- `--selection`: `rgba(76,175,80,0.3)`

## Implementation

### CSS (`globals.css`)
Add `[data-theme="avocado"]` block (copied from claude, three colors swapped).

### Store (`chatStore.ts`)
Add `'avocado'` to the `Theme` union type.

### Theme Switcher
Add "Avocado" option to the dropdown in `SettingsModal.tsx`.

## Files Changed

1. `app/globals.css` — add `[data-theme="avocado"]` block
2. `app/store/chatStore.ts` — add `'avocado'` to `Theme` type
3. `app/components/SettingsModal.tsx` — add dropdown option

No other files need changes — the token-based system handles the rest.
