# Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON export/import for all local data (chats, folders, tags, notes, note folders).

**Architecture:** A pure utility module handles read/write from localStorage (zustand persist keys). A modal component wraps the UI. Two existing files get trigger points wired in.

**Tech Stack:** zustand v5, localStorage, native file picker + Blob download

---

### File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `app/lib/importExport.ts` | **Create** | `exportAll()`, `importAll()`, validation, merge/replace logic |
| `app/components/ImportExportModal.tsx` | **Create** | Modal with export button, import picker + preview + mode selector |
| `app/page.tsx` | **Modify** | Add "Export / Import" link to sidebar footer |
| `app/components/SettingsModal.tsx` | **Modify** | Add "Data" tab with export/import buttons |

---

### Task 1: Core import/export module

**Files:**
- Create: `app/lib/importExport.ts`

- [ ] **Step 1: Create the file with types and constants**

```ts
const STORE_KEYS = [
  'blues-chat-storage',
  'blues-folder-storage',
  'blues-tag-storage',
  'avocado-notes',
  'avocado-note-folders',
] as const;

interface ExportData {
  version: number;
  exportedAt: string;
  stores: Record<string, { state: unknown }>;
}

interface ImportResult {
  success: boolean;
  error?: string;
  preview?: { key: string; count: number }[];
}
```

- [ ] **Step 2: Implement `exportAll`**

```ts
function getDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function exportAll(): void {
  const stores: Record<string, { state: unknown }> = {};
  for (const key of STORE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      stores[key] = JSON.parse(raw);
    }
  }
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    stores,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `avocado-backup-${getDateStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Implement validation**

```ts
function validateImportData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Not a valid JSON object' };
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'number') return { valid: false, error: 'Missing or invalid version' };
  if (!d.stores || typeof d.stores !== 'object') return { valid: false, error: 'Missing stores object' };
  for (const key of STORE_KEYS) {
    const store = (d.stores as Record<string, unknown>)[key];
    if (store && (typeof store !== 'object' || !('state' in (store as object)))) {
      return { valid: false, error: `Store ${key} is missing state field` };
    }
  }
  return { valid: true };
}
```

- [ ] **Step 4: Implement `getItemCount` for preview**

```ts
function getArrayField(key: string, state: unknown): unknown[] | null {
  const s = state as Record<string, unknown>;
  if (key === 'blues-chat-storage') return (s.chats as unknown[]) ?? null;
  if (key === 'blues-folder-storage') return (s.folders as unknown[]) ?? null;
  if (key === 'blues-tag-storage') return (s.tags as unknown[]) ?? null;
  if (key === 'avocado-notes') return (s.notes as unknown[]) ?? null;
  if (key === 'avocado-note-folders') return (s.folders as unknown[]) ?? null;
  return null;
}
```

- [ ] **Step 5: Implement `previewImport`**

```ts
export function previewImport(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const validation = validateImportData(data);
        if (!validation.valid) {
          resolve({ success: false, error: validation.error });
          return;
        }
        const d = data as ExportData;
        const preview: { key: string; count: number }[] = [];
        for (const key of STORE_KEYS) {
          const store = d.stores[key];
          if (store) {
            const arr = getArrayField(key, store.state);
            const count = arr ? arr.length : 1;
            const label = key === 'blues-chat-storage' ? 'Chats'
              : key === 'blues-folder-storage' ? 'Chat Folders'
              : key === 'blues-tag-storage' ? 'Tags'
              : key === 'avocado-notes' ? 'Notes'
              : 'Note Folders';
            preview.push({ key: label, count });
          }
        }
        resolve({ success: true, preview });
      } catch {
        resolve({ success: false, error: 'Failed to parse JSON file' });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'Failed to read file' });
    reader.readAsText(file);
  });
}
```

- [ ] **Step 6: Implement `importAll` (replace mode)**

```ts
export function importAll(data: ExportData, mode: 'replace' | 'merge'): void {
  for (const key of STORE_KEYS) {
    const importedStore = data.stores[key];
    if (!importedStore) continue;

    if (mode === 'replace') {
      localStorage.setItem(key, JSON.stringify(importedStore));
    } else {
      const existingRaw = localStorage.getItem(key);
      if (!existingRaw) {
        localStorage.setItem(key, JSON.stringify(importedStore));
        continue;
      }
      const existing = JSON.parse(existingRaw);
      const merged = mergeStoreState(existing, importedStore.state, key);
      localStorage.setItem(key, JSON.stringify(merged));
    }
  }
  window.location.reload();
}
```

- [ ] **Step 7: Implement `mergeStoreState`**

```ts
function mergeStoreState(
  existing: { state: Record<string, unknown>; version?: number },
  importedState: Record<string, unknown>,
  key: string
): { state: Record<string, unknown>; version?: number } {
  const merged = { ...existing.state };

  const arr = getArrayField(key, importedState);
  if (arr) {
    const existingArr = (merged[getArrayKey(key)] as unknown[]) ?? [];
    const existingIds = new Set(existingArr.map((i: any) => i.id).filter(Boolean));
    const newItems = arr.filter((i: any) => i.id && !existingIds.has(i.id));
    merged[getArrayKey(key)] = [...existingArr, ...newItems];
  }

  return { ...existing, state: merged };
}

function getArrayKey(key: string): string {
  if (key === 'blues-chat-storage') return 'chats';
  if (key === 'blues-folder-storage') return 'folders';
  if (key === 'blues-tag-storage') return 'tags';
  if (key === 'avocado-notes') return 'notes';
  return 'folders';
}
```

- [ ] **Step 8: Commit**

```bash
git add app/lib/importExport.ts
git commit -m "feat: add import/export utility module"
```

---

### Task 2: Import/Export Modal component

**Files:**
- Create: `app/components/ImportExportModal.tsx`

- [ ] **Step 1: Write the modal shell with close button and backdrop**

```tsx
'use client';

import React, { useRef, useState } from 'react';
import { exportAll, previewImport, importAll } from '../lib/importExport';

interface ImportExportModalProps {
  onClose: () => void;
}

export function ImportExportModal({ onClose }: ImportExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [preview, setPreview] = useState<{ key: string; count: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<any>(null);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 mx-2">
      <div className="w-full max-w-md bg-surface border border-border p-6 text-text-primary font-mono shadow-2xl relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-accent text-xs font-bold tracking-widest uppercase">Import / Export</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          {/* Export */}
          <div className="border border-border p-4">
            <p className="text-text-secondary text-[11px] tracking-wider uppercase mb-2">Export</p>
            <p className="text-xs text-text-secondary mb-3">Download all data as a JSON backup file.</p>
            <button
              onClick={() => { exportAll(); onClose(); }}
              className="w-full border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              Download Backup
            </button>
          </div>

          {/* Import */}
          <div className="border border-border p-4">
            <p className="text-text-secondary text-[11px] tracking-wider uppercase mb-2">Import</p>
            <p className="text-xs text-text-secondary mb-3">Restore data from a backup file.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setError(null);
                setPreview(null);
                setImportData(null);
                const result = await previewImport(file);
                if (!result.success) {
                  setError(result.error ?? 'Unknown error');
                } else if (result.preview) {
                  setPreview(result.preview);
                  // Store data for actual import
                  const reader = new FileReader();
                  reader.onload = () => {
                    try { setImportData(JSON.parse(reader.result as string)); } catch {}
                  };
                  reader.readAsText(file);
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              Select Backup File
            </button>

            {error && (
              <p className="text-red-400 text-xs mt-2">{error}</p>
            )}

            {preview && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-text-secondary text-[11px] tracking-wider uppercase mb-2">Preview</p>
                <div className="space-y-1 mb-3">
                  {preview.map((p) => (
                    <div key={p.key} className="flex justify-between text-xs">
                      <span>{p.key}</span>
                      <span className="text-accent">{p.count}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-text-secondary">Mode:</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                    className="bg-surface border border-border text-text-primary px-2 py-1 text-xs outline-none focus:border-accent"
                  >
                    <option value="replace">Replace (wipes existing data)</option>
                    <option value="merge">Merge (keeps existing, adds new)</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (importData) importAll(importData, importMode);
                  }}
                  className="w-full border border-accent py-2 px-4 text-left text-sm text-accent hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  Confirm Import
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/ImportExportModal.tsx
git commit -m "feat: add import/export modal component"
```

---

### Task 3: Wire sidebar link in page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add import path at top**

```ts
import { ImportExportModal } from './components/ImportExportModal';
```

- [ ] **Step 2: Add state variable after other useState declarations** (around line 74)

```ts
const [isImportExportOpen, setIsImportExportOpen] = useState(false);
```

- [ ] **Step 3: Add import/export link in sidebar footer**, after the TagCloud closing `</div>` and before chat history. Insert after line ~423:

```tsx
<div className="px-5 pb-2">
  <button
    onClick={() => setIsImportExportOpen(true)}
    className="w-full text-left text-xs text-text-secondary hover:text-accent transition-colors cursor-pointer py-1"
  >
    Export / Import
  </button>
</div>
```

- [ ] **Step 4: Also add to mobile sidebar** at the corresponding location (after TagCloud, before chat list in the mobile drawer) around line ~746.

- [ ] **Step 5: Render the modal** near the end of the return, alongside the other modals (around line ~798):

```tsx
{isImportExportOpen && <ImportExportModal onClose={() => setIsImportExportOpen(false)} />}
```

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add import/export button to sidebar"
```

---

### Task 4: Add Data tab to SettingsModal

**Files:**
- Modify: `app/components/SettingsModal.tsx`

- [ ] **Step 1: Add import path at top**

```tsx
import { ImportExportModal } from './ImportExportModal';
```

- [ ] **Step 2: Add state for the modal**

```tsx
const [isImportExportOpen, setIsImportExportOpen] = useState(false);
```

- [ ] **Step 3: Add "data" to the tab union type and state** (line 9)

Change:
```tsx
const [activeTab, setActiveTab] = useState<'appearance' | 'api'>('api');
```
To:
```tsx
const [activeTab, setActiveTab] = useState<'appearance' | 'api' | 'data'>('api');
```

- [ ] **Step 4: Add the Data tab button** alongside API and Appearance buttons (after line 73):

```tsx
<button onClick={() => setActiveTab('data')} className={tabClass('data')}>
  Data
</button>
```

- [ ] **Step 5: Add the Data tab content** after the Appearance section (before the footer buttons, around line ~118):

```tsx
{activeTab === 'data' && (
  <div className="flex flex-col gap-4 text-sm">
    <p className="text-text-secondary text-xs">Export or import your data as JSON.</p>
    <button
      onClick={() => setIsImportExportOpen(true)}
      className="w-full border border-border py-2 px-4 text-left text-sm hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
    >
      Open Import / Export
    </button>
  </div>
)}
```

- [ ] **Step 6: Render the ImportExportModal** at the end of the return:

```tsx
{isImportExportOpen && <ImportExportModal onClose={() => setIsImportExportOpen(false)} />}
```

- [ ] **Step 7: Commit**

```bash
git add app/components/SettingsModal.tsx
git commit -m "feat: add data tab to settings modal"
```

---

## Self-Review Checklist

- **Spec coverage:** Every requirement in the spec has a task:
  - `exportAll()` reads all stores → Task 1 Step 2
  - Download as `avocado-backup-YYYY-MM-DD.json` → Task 1 Step 2
  - Import with file picker + preview → Task 1 Steps 3-5, Task 2
  - Replace mode → Task 1 Step 6
  - Merge mode → Task 1 Step 7
  - Validation/rejection of bad files → Task 1 Step 3, Task 2
  - Sidebar trigger → Task 3
  - Settings modal trigger → Task 4
- **No placeholders:** All code is inline, no TODOs.
- **Type consistency:** All type names match across steps.
