'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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

  useEffect(() => {
    if (notes.length === 0) {
      const id = createNote();
      updateNote(id, '# Welcome to Notes\n\nStart writing in markdown...');
    } else if (!activeNoteId) {
      setActiveNote(notes[0].id);
    }
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="flex h-screen w-full bg-surface text-text-primary overflow-hidden font-mono selection:bg-[var(--selection)]">
      <NotesSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Chat
          </button>
          <button
            onClick={() => createNote()}
            className="border border-border px-3 py-1 text-sm hover:bg-surface-overlay transition-colors cursor-pointer"
          >
            + New Note
          </button>
        </div>
        {activeNote ? (
          <div className="flex-1 overflow-hidden p-4" data-color-mode="dark">
            <MDEditor
              value={activeNote.content}
              onChange={(val) => updateNote(activeNote.id, val ?? '')}
              height="100%"
              visibleDragbar={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary/40">
            Select or create a note to get started
          </div>
        )}
      </div>
    </div>
  );
}
