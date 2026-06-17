'use client';

import React, { useState } from 'react';
import { useFolderStore } from '../store/folderStore';
import { useTagStore } from '../store/tagStore';
import { useChatStore } from '../store/chatStore';
import { Folder as FolderIcon, Tags, X, Check } from 'lucide-react';

interface ChatContextMenuProps {
  chatId: string;
  onClose: () => void;
}

export function ChatContextMenu({ chatId, onClose }: ChatContextMenuProps) {
  const { folders, moveChatToFolder } = useFolderStore();
  const { tags, assignTagToChat, removeTagFromChat } = useTagStore();
  const chat = useChatStore((s) => s.chats.find((c) => c.id === chatId));
  const [showTagPicker, setShowTagPicker] = useState(false);

  if (!chat) return null;

  const rootFolders = folders.filter((f) => f.parentId === null);

  return (
    <div className="bg-surface border border-border shadow-lg z-50 text-sm min-w-[180px]">
      <div className="px-3 py-1.5 text-xs text-text-secondary uppercase tracking-wider border-b border-border">
        Move to folder
      </div>
      <button
        onClick={() => { moveChatToFolder(chatId, null); onClose(); }}
        className={`flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left ${
          !chat.folderId ? 'text-accent' : 'text-text-primary'
        }`}
      >
        <FolderIcon size={14} />
        <span>No folder</span>
        {!chat.folderId && <Check size={14} className="ml-auto" />}
      </button>
      {rootFolders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => { moveChatToFolder(chatId, folder.id); onClose(); }}
          className={`flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left ${
            chat.folderId === folder.id ? 'text-accent' : 'text-text-primary'
          }`}
        >
          <FolderIcon size={14} />
          <span>{folder.name}</span>
          {chat.folderId === folder.id && <Check size={14} className="ml-auto" />}
        </button>
      ))}
      <div className="border-t border-border mt-1 pt-1">
        <button
          onClick={() => setShowTagPicker(!showTagPicker)}
          className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left"
        >
          <Tags size={14} />
          <span>Assign tags</span>
        </button>
        {showTagPicker && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {tags.map((tag) => {
              const hasTag = chat.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (hasTag) {
                      removeTagFromChat(chatId, tag.id);
                    } else {
                      assignTagToChat(chatId, tag.id);
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border transition-colors cursor-pointer ${
                    hasTag
                      ? 'border-accent text-accent'
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  {hasTag && <X size={10} />}
                </button>
              );
            })}
            {tags.length === 0 && (
              <span className="text-xs text-text-secondary">No tags yet. Create one in the sidebar.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
