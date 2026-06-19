'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { NotesSidebar } from '../components/NotesSidebar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="flex h-screen w-full bg-surface text-text-primary overflow-hidden font-mono selection:bg-[var(--selection)]">
      <NotesSidebar />
      <div className="flex-1 flex flex-col h-full">
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
          <div className="flex-1 flex divide-x divide-border overflow-hidden">
            <textarea
              className="w-1/2 h-full bg-transparent border-none outline-none resize-none text-sm p-4 font-mono leading-relaxed placeholder:text-text-secondary/40"
              placeholder="Write your note in markdown..."
              value={activeNote.content}
              onChange={(e) => updateNote(activeNote.id, e.target.value)}
            />
            <div className="w-1/2 h-full overflow-y-auto p-4 text-sm leading-relaxed">
              {activeNote.content.trim() ? (
                <MarkdownRenderer content={activeNote.content} />
              ) : (
                <p className="text-text-secondary/40">Write something...</p>
              )}
            </div>
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
