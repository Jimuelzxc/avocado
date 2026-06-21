'use client';

import React, { useRef, useState } from 'react';
import { exportAll, previewImport, importAll, type ExportData } from '../lib/importExport';

interface ImportExportModalProps {
  onClose: () => void;
}

export function ImportExportModal({ onClose }: ImportExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [preview, setPreview] = useState<{ key: string; count: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<ExportData | null>(null);

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
                  setImportData(result.data ?? null);
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