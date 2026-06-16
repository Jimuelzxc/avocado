# Mobile Responsiveness Design

## Overview

Make the blues. chat app fully responsive and usable on mobile devices. The current
app hides the sidebar entirely on screens smaller than `md` (768px), making chat
history inaccessible on phones. This spec addresses that gap plus tightens spacing
and ensures modals don't overflow.

## Design Decisions

### Hamburger Overlay Drawer (not persistent sidebar)

The sidebar becomes a slide-out overlay on mobile, triggered by a hamburger icon.
Rationale: this preserves the desktop layout unchanged, matches the dominant
mobile chat pattern (Telegram, WhatsApp, etc.), and requires minimal structural
changes — the sidebar content stays identical, only the container behavior changes.

**Rejected alternatives:**
- **Bottom nav / tab bar** — would require duplicating navigation; overkill for a
  sidebar that's mostly a chat list
- **Swipe gesture only** — not discoverable enough; hamburger + swipe is ideal but
  hamburger alone covers the accessibility requirement

## Changes

### 1. Hamburger Drawer

- Replace the current mobile header "New" text button with a hamburger icon
  (`Menu` from lucide-react)
- Add a boolean state `isMobileSidebarOpen`
- Drawer renders as a fixed overlay:
  - Full-screen dark backdrop (`bg-black/60`) with `z-40`
  - Sidebar panel slides in from left, same width as desktop (w-72), at `z-50`
  - Same sidebar content as desktop, wrapped in the drawer
- Backdrop click, close button (X), or selecting a chat closes the drawer
- `overflow-hidden` on `<body>` while open (to prevent background scroll)
- Animations: backdrop fades in, sidebar slides in via Tailwind translate utilities

### 2. Tighter Mobile Spacing

- Fix typo `p-8md:p-8` → `p-4 md:p-8` on the messages container
- Reduce `gap-8` between messages → `gap-4 md:gap-8`
- Reduce empty state `p-6 md:p-8` → `p-4 md:p-8`
- Reduce input form outer padding `p-4 md:p-8` → `p-3 md:p-8`
- Reduce welcome message heading/text sizes slightly on mobile

### 3. Modal Safety

- SettingsModal: add `mx-2` to prevent edge-to-edge on very narrow screens
- SystemPromptModal: same treatment
- Both modals already use `p-4` and sensible max-widths — no other changes needed

### 4. Message Bubbles

- Current widths (`max-w-[90%]` user, `max-w-[95%]` assistant) work fine on mobile
- No changes needed

## Files Changed

| File | Change |
|------|--------|
| `app/page.tsx` | Add mobile drawer state, hamburger icon, drawer overlay, spacing adjustments |
| `app/components/SettingsModal.tsx` | Add `mx-2` to container |
| `app/components/SystemPromptModal.tsx` | Add `mx-2` to container |

## Non-Goals

- No changes to desktop layout
- No touch gesture handling beyond the hamburger
- No new components — everything is inline in existing files
- No testing (no test framework installed)
