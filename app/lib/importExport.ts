interface StoreInfo {
  arrayField: string;
  label: string;
}

const STORE_META: Record<string, StoreInfo> = {
  'blues-chat-storage': { arrayField: 'chats', label: 'Chats' },
  'blues-folder-storage': { arrayField: 'folders', label: 'Chat Folders' },
  'blues-tag-storage': { arrayField: 'tags', label: 'Tags' },
  'avocado-notes': { arrayField: 'notes', label: 'Notes' },
  'avocado-note-folders': { arrayField: 'folders', label: 'Note Folders' },
};

const STORE_KEYS = Object.keys(STORE_META);

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

function getArrayField(key: string, state: unknown): unknown[] {
  const info = STORE_META[key];
  if (!info) return [];
  const s = state as Record<string, unknown>;
  return (s[info.arrayField] as unknown[]) ?? [];
}

export function previewImport(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    if (file.size === 0) {
      resolve({ success: false, error: 'File is empty' });
      return;
    }
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
            preview.push({ key: STORE_META[key].label, count: arr.length });
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
  const info = STORE_META[key];

  const importedArr = getArrayField(key, importedState);
  if (importedArr.length > 0 && info) {
    const existingArr = (merged[info.arrayField] as { id: string }[]) ?? [];
    const existingIds = new Set(existingArr.map((i) => i.id).filter(Boolean));
    const newItems = importedArr.filter((i): i is { id: string; [k: string]: unknown } => !!(i as { id?: string }).id && !existingIds.has((i as { id: string }).id));
    merged[info.arrayField] = [...existingArr, ...newItems];
  }

  return { ...existing, state: merged };
}
