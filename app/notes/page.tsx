'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useNotesStore } from '../store/notesStore';
import { NotesSidebar } from '../components/NotesSidebar';

export default function NotesPage() {
  const router = useRouter();
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const createNote = useNotesStore((s) => s.createNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (notes.length === 0) {
      const id = createNote();
      updateNote(id, '# Welcome to Notes\n\nStart writing in markdown...');
    } else if (!activeNoteId) {
      setActiveNote(notes[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="flex h-screen w-full bg-surface text-text-primary overflow-hidden font-mono selection:bg-[var(--selection)]">
      <div className="hidden md:flex">
        <NotesSidebar />
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-3 border-b border-border shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1 hover:text-accent transition-colors cursor-pointer"
              aria-label="Open notes list"
            >
              <Menu size={18} />
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 text-xs md:text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
          <button
            onClick={() => createNote()}
            className="border border-border px-2 md:px-3 py-1 text-xs md:text-sm hover:bg-surface-overlay transition-colors cursor-pointer whitespace-nowrap"
          >
            + New Note
          </button>
        </div>
        {activeNote ? (
          <div className="flex-1 overflow-hidden p-2 md:p-4" data-color-mode="dark">
            <MDEditor
              value={activeNote.content}
              onChange={(val) => updateNote(activeNote.id, val ?? '')}
              height="100%"
              visibleDragbar={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary/40 text-sm px-4">
            Select or create a note to get started
          </div>
        )}
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-72 bg-surface border-r border-border z-50">
            <NotesSidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
