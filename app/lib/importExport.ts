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

function getArrayField(key: string, state: unknown): unknown[] | null {
  const s = state as Record<string, unknown>;
  if (key === 'blues-chat-storage') return (s.chats as unknown[]) ?? null;
  if (key === 'blues-folder-storage') return (s.folders as unknown[]) ?? null;
  if (key === 'blues-tag-storage') return (s.tags as unknown[]) ?? null;
  if (key === 'avocado-notes') return (s.notes as unknown[]) ?? null;
  if (key === 'avocado-note-folders') return (s.folders as unknown[]) ?? null;
  return null;
}

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
      const merged = mergeStoreState(existing, importedStore.state as Record<string, unknown>, key);
      localStorage.setItem(key, JSON.stringify(merged));
    }
  }
  window.location.reload();
}

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
