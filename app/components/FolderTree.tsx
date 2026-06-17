'use client';

import React, { useState, useEffect } from 'react';
import { useFolderStore, Folder } from '../store/folderStore';
import { useChatStore } from '../store/chatStore';
import { Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';

function FolderItem({
  folder,
  folders,
  depth,
}: {
  folder: Folder;
  folders: Folder[];
  depth: number;
}) {
  const { activeFolderId, setActiveFolderId, renameFolder, deleteFolder, createFolder } = useFolderStore();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [showContext, setShowContext] = useState(false);

  useEffect(() => {
    if (!showContext) return;
    const handler = () => setShowContext(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showContext]);

  const chats = useChatStore((s) => s.chats);

  const children = folders.filter((f) => f.parentId === folder.id);
  const descendantIds: string[] = [];
  function collectDescendants(parentId: string) {
    const kids = folders.filter((f) => f.parentId === parentId);
    for (const k of kids) {
      descendantIds.push(k.id);
      collectDescendants(k.id);
    }
  }
  collectDescendants(folder.id);
  const chatCount = chats.filter((c) => c.folderId === folder.id || (c.folderId && descendantIds.includes(c.folderId))).length;
  const isActive = activeFolderId === folder.id;

  const handleRename = () => {
    if (renameValue.trim()) {
      renameFolder(folder.id, renameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <div className="relative">
      <div
        className={`group flex items-center gap-1 px-2 py-1 text-sm cursor-pointer transition-colors ${
          isActive ? 'text-accent bg-surface-overlay' : 'text-text-primary hover:bg-surface-overlay'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => setActiveFolderId(isActive ? null : folder.id)}
        onDoubleClick={() => { setRenaming(true); setRenameValue(folder.name); }}
        onContextMenu={(e) => { e.preventDefault(); setShowContext(!showContext); }}
      >
        {children.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 hover:text-accent transition-colors cursor-pointer"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        {isActive ? <FolderOpen size={14} /> : <FolderIcon size={14} />}
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
        <span className="text-text-secondary text-xs tabular-nums">{chatCount}</span>
        {showContext && (
          <div className="absolute mt-6 bg-surface border border-border shadow-lg z-50 text-sm" style={{ left: `${8 + depth * 16}px` }}>
            <button
              onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameValue(folder.name); setShowContext(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left"
            >
              <Pencil size={14} /> Rename
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); createFolder('New Folder', folder.id); setShowContext(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left"
            >
              <Plus size={14} /> Add sub-folder
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); setShowContext(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left text-accent-secondary"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
      {expanded && children.map((child) => (
        <FolderItem key={child.id} folder={child} folders={folders} depth={depth + 1} />
      ))}
    </div>
  );
}

export function FolderTree() {
  const { folders, createFolder, activeFolderId, setActiveFolderId } = useFolderStore();
  const rootFolders = folders.filter((f) => f.parentId === null);
  const totalChats = useChatStore((s) => s.chats.length);

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
          activeFolderId === null ? 'text-accent bg-surface-overlay' : 'text-text-primary hover:bg-surface-overlay'
        }`}
        onClick={() => setActiveFolderId(null)}
      >
        <FolderOpen size={16} />
        <span className="flex-1">All Chats</span>
        <span className="text-text-secondary text-xs tabular-nums">{totalChats}</span>
      </div>
      {rootFolders.map((folder) => (
        <FolderItem key={folder.id} folder={folder} folders={folders} depth={0} />
      ))}
      <button
        onClick={() => createFolder('New Folder')}
        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-accent hover:bg-surface-overlay transition-colors cursor-pointer"
      >
        <Plus size={14} />
        <span>New Folder</span>
      </button>
    </div>
  );
}
