# Avocado Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Avocado theme (green-accented variant of Claude Code) to the theme system.

**Architecture:** Add `[data-theme="avocado"]` CSS block (claude palette with green accents), extend the `Theme` union type, and add a dropdown option. The existing token-based system handles everything else.

**Tech Stack:** CSS custom properties, Tailwind v4 `@theme inline`, zustand

---

### Task 1: Add Avocado CSS variables

**Files:**
- Modify: `app/globals.css` (add block after claude block, line 58)

- [ ] **Step 1: Insert the avocado theme block after the claude theme block**

```css
[data-theme="avocado"] {
  --surface: #1a1a1a;
  --surface-overlay: rgba(255, 255, 255, 0.06);
  --text-primary: #e8dcc8;
  --text-secondary: rgba(232, 220, 200, 0.6);
  --accent: #4caf50;
  --accent-secondary: #8bc34a;
  --border: #3a3a3a;
  --selection: rgba(76, 175, 80, 0.3);
}
```

Insert after line 58 (the closing `}` of `[data-theme="claude"]`).

- [ ] **Step 2: Verify CSS parses**

Run: `npx tsc --noEmit`
Expected: no errors (or unrelated pre-existing errors only)

### Task 2: Extend Theme type

**Files:**
- Modify: `app/store/chatStore.ts` (line 22)

- [ ] **Step 1: Add `'avocado'` to the Theme union type**

```ts
export type Theme = 'default' | 'dark' | 'light' | 'claude' | 'avocado';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

### Task 3: Add dropdown option

**Files:**
- Modify: `app/components/SettingsModal.tsx` (line 88)

- [ ] **Step 1: Add Avocado option after Claude Code**

```tsx
<option value="claude">Claude Code</option>
<option value="avocado">Avocado</option>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

### Task 4: Verify the full build

- [ ] **Step 1: Build and lint**

```bash
npm run build
npm run lint
```

Expected: Build succeeds, lint passes.
