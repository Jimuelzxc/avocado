'use client';
import React from 'react';
import { Plus, Trash2, FileText, X } from 'lucide-react';
import { useNotesStore, Note } from '../store/notesStore';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getPreview(content: string): string {
  const lines = content.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const stripped = line.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim();
    if (stripped) return stripped;
  }
  return 'Empty note';
}

export function NotesSidebar({ onClose }: { onClose?: () => void }) {
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="w-64 border-r border-border h-full flex flex-col bg-surface overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-accent text-sm tracking-wide">Notes</h2>
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:text-accent transition-colors cursor-pointer md:hidden"
              aria-label="Close notes list"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => useNotesStore.getState().createNote()}
            className="p-1 hover:text-accent transition-colors cursor-pointer"
            aria-label="New note"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-sm text-text-secondary text-center">
            No notes yet. Click + to create one.
          </div>
        ) : (
          sorted.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onSelect={() => setActiveNote(note.id)}
              onDelete={() => deleteNote(note.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NoteItem({
  note,
  isActive,
  onSelect,
  onDelete,
}: {
  note: Note;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex flex-col p-3 border-b border-border/50 cursor-pointer transition-colors ${
        isActive ? 'bg-surface-overlay border-l-2 border-l-accent' : 'hover:bg-surface-overlay'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText size={14} className="shrink-0 text-text-secondary" />
          <span className="text-sm truncate">{note.title}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 hover:text-red-400 cursor-pointer p-1 transition-opacity shrink-0"
          aria-label="Delete note"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <p className="text-xs text-text-secondary truncate mt-0.5">{getPreview(note.content)}</p>
      <span className="text-[10px] text-text-secondary/60 mt-0.5">{formatDate(note.updatedAt)}</span>
    </div>
  );
}
