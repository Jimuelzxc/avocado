'use client';
import React, { useState } from 'react';
import {
  Plus, Trash2, FileText, Folder as FolderIcon, FolderOpen,
  ChevronRight, ChevronDown, Pencil, MoreHorizontal,
} from 'lucide-react';
import { useNotesStore, Note } from '../store/notesStore';
import { useNoteFolderStore, NoteFolder } from '../store/noteFolderStore';

function FolderItem({
  folder,
  folders,
  notes,
  activeNoteId,
  depth,
  onSelectNote,
  onDeleteNote,
}: {
  folder: NoteFolder;
  folders: NoteFolder[];
  notes: Note[];
  activeNoteId: string | null;
  depth: number;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}) {
  const { renameFolder, deleteFolder, createFolder } = useNoteFolderStore();
  const createNoteInFolder = useNotesStore((s) => s.createNote);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [showMenu, setShowMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const children = folders.filter((f) => f.parentId === folder.id);
  const folderNotes = notes.filter((n) => n.folderId === folder.id);
  const hasItems = children.length > 0 || folderNotes.length > 0;

  const handleRename = () => {
    if (renameValue.trim()) renameFolder(folder.id, renameValue.trim());
    setRenaming(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const noteId = e.dataTransfer.getData('text/note-id');
    if (noteId) useNotesStore.getState().moveNoteToFolder(noteId, folder.id);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 text-sm cursor-pointer transition-colors ${
          dragOver ? 'bg-accent/10 ring-1 ring-accent' : 'hover:bg-surface-overlay'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasItems ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 hover:text-accent transition-colors cursor-pointer"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        {expanded ? <FolderOpen size={14} className="shrink-0" /> : <FolderIcon size={14} className="shrink-0" />}
        {renaming ? (
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="flex-1 bg-transparent border border-accent outline-none px-1 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-accent transition-all cursor-pointer"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-6 bg-surface border border-border shadow-lg z-50 text-sm min-w-32"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setRenaming(true); setRenameValue(folder.name); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left"
              >
                <Pencil size={14} /> Rename
              </button>
              <button
                onClick={() => { createFolder('New Folder', folder.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left"
              >
                <Plus size={14} /> Subfolder
              </button>
              <button
                onClick={() => {
                  const id = createNoteInFolder(folder.id);
                  setActiveNote(id);
                  setExpanded(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left"
              >
                <FileText size={14} /> New Note
              </button>
              <button
                onClick={() => { deleteFolder(folder.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left text-red-400"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <>
          {children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              folders={folders}
              notes={notes}
              activeNoteId={activeNoteId}
              depth={depth + 1}
              onSelectNote={onSelectNote}
              onDeleteNote={onDeleteNote}
            />
          ))}
          {folderNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              depth={depth + 1}
              onSelect={() => onSelectNote(note.id)}
              onDelete={() => onDeleteNote(note.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function NoteItem({
  note, isActive, depth, onSelect, onDelete,
}: {
  note: Note; isActive: boolean; depth: number; onSelect: () => void; onDelete: () => void;
}) {
  const folders = useNoteFolderStore((s) => s.folders);
  const [showMenu, setShowMenu] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/note-id', note.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors ${
        isActive ? 'bg-surface-overlay text-accent' : 'hover:bg-surface-overlay'
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onSelect}
    >
      <FileText size={14} className="shrink-0 text-text-secondary" />
      <span className="text-sm truncate flex-1">{note.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 hover:text-red-400 cursor-pointer p-0.5 transition-opacity shrink-0 max-md:opacity-100"
      >
        <Trash2 size={12} />
      </button>
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-accent transition-all cursor-pointer max-md:opacity-100"
        >
          <MoreHorizontal size={12} />
        </button>
        {showMenu && (
          <div
            className="absolute right-0 top-5 bg-surface border border-border shadow-lg z-50 text-sm min-w-40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-xs text-text-secondary border-b border-border/50">Move to folder</div>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => { useNotesStore.getState().moveNoteToFolder(note.id, f.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left"
              >
                <FolderIcon size={14} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            <button
              onClick={() => { useNotesStore.getState().moveNoteToFolder(note.id, null); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left border-t border-border/50"
            >
              <FileText size={14} />
              <span>Unfiled</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotesSidebar({ onClose }: { onClose?: () => void }) {
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const createNote = useNotesStore((s) => s.createNote);
  const { folders, createFolder } = useNoteFolderStore();
  const [unfiledExpanded, setUnfiledExpanded] = useState(true);
  const [unfiledDragOver, setUnfiledDragOver] = useState(false);

  const rootFolders = folders.filter((f) => f.parentId === null);
  const unfiledNotes = notes.filter((n) => !n.folderId);
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleUnfiledDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setUnfiledDragOver(true);
  };

  const handleUnfiledDragLeave = () => setUnfiledDragOver(false);

  const handleUnfiledDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUnfiledDragOver(false);
    const noteId = e.dataTransfer.getData('text/note-id');
    if (noteId) useNotesStore.getState().moveNoteToFolder(noteId, null);
  };

  return (
    <div className="w-64 border-r border-border h-full flex flex-col bg-surface overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-accent text-sm tracking-wide">Notes</h2>
        <div className="flex items-center gap-1">
          {onClose && (
            <button onClick={onClose} className="p-1 hover:text-accent transition-colors cursor-pointer md:hidden" aria-label="Close notes list">
              <ChevronRight size={16} />
            </button>
          )}
          <button
            onClick={() => createNote()}
            className="p-1 hover:text-accent transition-colors cursor-pointer"
            aria-label="New note"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          {rootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              folders={folders}
              notes={sortedNotes}
              activeNoteId={activeNoteId}
              depth={0}
              onSelectNote={setActiveNote}
              onDeleteNote={deleteNote}
            />
          ))}
          <button
            onClick={() => createFolder('New Folder')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-accent hover:bg-surface-overlay transition-colors cursor-pointer w-full"
          >
            <Plus size={14} />
            <span>New Folder</span>
          </button>
        </div>
        {unfiledNotes.length > 0 && (
          <div className="border-t border-border/50 pt-1">
            <div
              className={`flex items-center gap-1 px-3 py-1.5 text-sm cursor-pointer hover:bg-surface-overlay transition-colors select-none ${
                unfiledDragOver ? 'bg-accent/10 ring-1 ring-accent' : ''
              }`}
              onClick={() => setUnfiledExpanded(!unfiledExpanded)}
              onDragOver={handleUnfiledDragOver}
              onDragLeave={handleUnfiledDragLeave}
              onDrop={handleUnfiledDrop}
            >
              {unfiledExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <FileText size={14} className="shrink-0 text-text-secondary" />
              <span className="flex-1 text-text-secondary">Unfiled</span>
              <span className="text-xs text-text-secondary/60">{unfiledNotes.length}</span>
            </div>
            {unfiledExpanded && unfiledNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                depth={1}
                onSelect={() => setActiveNote(note.id)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
          </div>
        )}
        {notes.length === 0 && (
          <div className="p-4 text-sm text-text-secondary text-center">
            No notes yet. Click + to create one.
          </div>
        )}
      </div>
    </div>
  );
}
