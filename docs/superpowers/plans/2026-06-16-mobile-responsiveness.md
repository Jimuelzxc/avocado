# Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the blues. chat app fully responsive and usable on mobile devices.

**Architecture:** Three independent changes to existing files: add a hamburger slide-out drawer for the sidebar on mobile, tighten spacing/padding at small viewports, and add margin safety to modals. No new components, no state management changes, no breakpoint additions.

**Tech Stack:** Next.js 16, Tailwind v4, lucide-react icons, zustand

---

### Task 1: Modal margin safety

**Files:**
- Modify: `app/components/SettingsModal.tsx:54`
- Modify: `app/components/SystemPromptModal.tsx:20`

- [ ] **Step 1: Add mx-2 to SettingsModal container**

Edit line 54 to add `mx-2`:

```tsx
<div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 mx-2">
```

- [ ] **Step 2: Add mx-2 to SystemPromptModal container**

Edit line 20 to add `mx-2`:

```tsx
<div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 mx-2">
```

- [ ] **Step 3: Commit**

```bash
git add app/components/SettingsModal.tsx app/components/SystemPromptModal.tsx
git commit -m "fix: add mx-2 margin to modals for mobile safety"
```

---

### Task 2: Tighter mobile spacing in page.tsx

**Files:**
- Modify: `app/page.tsx` (multiple lines)

- [ ] **Step 1: Fix messages container padding typo**

Line 276: `p-8md:p-8` is a typo (missing space). Change to:

```tsx
<div className="flex-1 overflow-y-auto p-4 md:p-8">
```

- [ ] **Step 2: Reduce message gap on mobile**

Line 277: Reduce gap on mobile:

```tsx
<div className="max-w-5xl mx-auto w-full flex flex-col gap-4 md:gap-8">
```

- [ ] **Step 3: Tighten empty state padding**

Line 279: Reduce padding on mobile:

```tsx
<div className="border border-border p-4 md:p-8 bg-surface text-center my-8 flex flex-col gap-4">
```

- [ ] **Step 4: Reduce input form outer padding**

Line 337: Tighter on mobile:

```tsx
<div className="p-3 md:p-8 shrink-0 w-full">
```

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "fix: tighten mobile spacing in messages and input areas"
```

---

### Task 3: Mobile hamburger drawer for sidebar

**Files:**
- Modify: `app/page.tsx`

This is the main change. The sidebar is currently `hidden md:flex` — invisible on mobile.
We'll add a slide-out overlay drawer triggered by a hamburger icon.

- [ ] **Step 1: Add import for Menu icon**

Add `Menu` to the lucide-react import on line 3:

```tsx
import { RotateCcw, Copy, Settings as SettingsIcon, Trash2, Menu, X } from 'lucide-react';
```

- [ ] **Step 2: Add mobile sidebar state**

Add this state after the existing `isSystemPromptOpen` state (line 32):

```tsx
const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
```

- [ ] **Step 3: Replace mobile "New" button with hamburger icon**

On line 265, replace the current button:

```tsx
<button
  onClick={() => createChat()}
  className="text-sm border border-border px-2 py-1 hover:bg-surface-overlay cursor-pointer"
>
  New
</button>
```

With a hamburger button:

```tsx
<button
  onClick={() => setIsMobileSidebarOpen(true)}
  className="hover:text-accent cursor-pointer p-1"
  aria-label="Open sidebar"
>
  <Menu size={20} />
</button>
```

- [ ] **Step 4: Add drawer overlay markup**

After the closing `</main>` tag (before the SettingsModal), add the slide-out drawer:

```tsx
{/* Mobile sidebar drawer overlay */}
{isMobileSidebarOpen && (
  <div className="fixed inset-0 z-40 md:hidden">
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-black/60"
      onClick={() => setIsMobileSidebarOpen(false)}
    />
    {/* Drawer panel */}
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface border-r border-border flex flex-col z-50 animate-slide-in">
      <div className="p-5 flex justify-between items-center">
        <h1 className="text-accent text-base tracking-wide">blues.</h1>
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="p-1 hover:text-accent transition-colors cursor-pointer"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-5 pb-6 flex gap-2">
        <button
          onClick={() => { createChat(); setIsMobileSidebarOpen(false); }}
          className="flex-1 border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
        >
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group flex items-center justify-between p-2 border ${chat.id === activeChatId ? 'border-accent text-accent' : 'border-transparent text-text-primary hover:bg-surface-overlay'}`}
          >
            <button
              onClick={() => { useChatStore.setState({ activeChatId: chat.id }); setIsMobileSidebarOpen(false); }}
              className="flex-1 text-left text-sm truncate pr-2 cursor-pointer focus:outline-none"
            >
              {chat.title}
            </button>
            <button
              onClick={() => deleteChat(chat.id)}
              className="opacity-0 group-hover:opacity-100 hover:text-accent-secondary cursor-pointer p-1 transition-opacity"
              aria-label="Delete Chat"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  </div>
)}
```

- [ ] **Step 5: Add slide-in animation keyframes to globals.css**

Add to `app/globals.css` (after existing rules):

```css
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@utility animate-slide-in {
  animation: slide-in 0.2s ease-out;
}
```

- [ ] **Step 6: Verify the build compiles**

```bash
npm run lint
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: add mobile hamburger drawer for sidebar"
```
