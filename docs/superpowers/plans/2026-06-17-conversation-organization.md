# Conversation Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add folders (with nesting) and tags to organize chats, with a new sidebar layout showing folder tree + tag cloud + filtered chat list.

**Architecture:** Two new zustand stores (`folderStore`, `tagStore`) with separate persist keys. Chat model gets `folderId` + `tagIds` fields. Sidebar components render folder tree, tag cloud, and filtered chat list pulled from existing store.

**Tech Stack:** zustand v5 (stores), Tailwind v4 (styling), lucide-react (icons), existing persist middleware

---

### Task 1: FolderStore

**Files:**
- Create: `app/store/folderStore.ts`

- [ ] **Step 1: Create folder store**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

interface FolderState {
  folders: Folder[];
  activeFolderId: string | null;
  createFolder: (name: string, parentId?: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  setActiveFolderId: (id: string | null) => void;
  moveChatToFolder: (chatId: string, folderId: string | null) => void;
}

export const useFolderStore = create<FolderState>()(
  persist(
    (set) => ({
      folders: [],
      activeFolderId: null,

      createFolder: (name, parentId) => {
        const id = crypto.randomUUID();
        const folder: Folder = { id, name, parentId: parentId ?? null, createdAt: Date.now() };
        set((s) => ({ folders: [...s.folders, folder] }));
        return id;
      },

      renameFolder: (id, name) =>
        set((s) => ({
          folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
        })),

      deleteFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id && f.parentId !== id),
        })),

      setActiveFolderId: (id) => set({ activeFolderId: id }),

      moveChatToFolder: (chatId, folderId) => {
        const { useChatStore } = require('./chatStore');
        const chat = useChatStore.getState().chats.find((c) => c.id === chatId);
        if (!chat) return;
        useChatStore.setState({
          chats: useChatStore.getState().chats.map((c) =>
            c.id === chatId ? { ...c, folderId } : c
          ),
        });
      },
    }),
    { name: 'blues-folder-storage',
      partialize: (s: FolderState) => ({ folders: s.folders, activeFolderId: s.activeFolderId }),
    }
  )
);
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/store/folderStore.ts
git commit -m "feat: add folder store with CRUD"
```

---

### Task 2: TagStore

**Files:**
- Create: `app/store/tagStore.ts`

- [ ] **Step 1: Create tag store**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagState {
  tags: Tag[];
  activeTagIds: string[];
  createTag: (name: string, color?: string) => string;
  deleteTag: (id: string) => void;
  setActiveTagIds: (ids: string[]) => void;
  toggleTagFilter: (tagId: string) => void;
}

const TAG_COLORS = ['#20ffe5', '#f6ff00', '#ff8a65', '#e06c75', '#4fc3f7', '#8bc34a'];

export const useTagStore = create<TagState>()(
  persist(
    (set) => ({
      tags: [],
      activeTagIds: [],

      createTag: (name, color) => {
        const id = crypto.randomUUID();
        const tag: Tag = { id, name, color: color ?? TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] };
        set((s) => ({ tags: [...s.tags, tag] }));
        return id;
      },

      deleteTag: (id) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
        })),

      setActiveTagIds: (ids) => set({ activeTagIds: ids }),

      toggleTagFilter: (tagId) =>
        set((s) => ({
          activeTagIds: s.activeTagIds.includes(tagId)
            ? s.activeTagIds.filter((id) => id !== tagId)
            : [...s.activeTagIds, tagId],
        })),
    }),
    {
      name: 'blues-tag-storage',
      partialize: (s: TagState) => ({ tags: s.tags, activeTagIds: s.activeTagIds }),
    }
  )
);
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/store/tagStore.ts
git commit -m "feat: add tag store with CRUD and filter"
```

---

### Task 3: Update Chat model with folderId and tagIds

**Files:**
- Modify: `app/store/chatStore.ts`

- [ ] **Step 1: Add folderId and tagIds to Chat interface**

Find the `Chat` interface and add two fields:

```typescript
export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  activeLeafId: string | null;
  folderId: string | null;
  tagIds: string[];
}
```

- [ ] **Step 2: Add folderId and tagIds to createChat**

In `createChat` action, update the newChat object:

```typescript
const newChat: Chat = {
  id: newId,
  title: 'New Chat',
  messages: [],
  activeLeafId: null,
  folderId: null,
  tagIds: [],
};
```

- [ ] **Step 3: Add to partialize**

Add `folderId` and `tagIds` to each chat in the partialize function. Find the `partialize` key and update the chat serialization — since `chats` is persisted as-is, and `folderId` / `tagIds` are part of `Chat`, they'll be automatically included. No change needed.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors (Chat references createChat must include new fields).

- [ ] **Step 5: Commit**

```bash
git add app/store/chatStore.ts
git commit -m "feat: add folderId and tagIds to Chat model"
```

---

### Task 4: FolderTree component

**Files:**
- Create: `app/components/FolderTree.tsx`

- [ ] **Step 1: Create FolderTree component**

```typescript
'use client';

import React, { useState } from 'react';
import { useFolderStore, Folder } from '../store/folderStore';
import { useChatStore } from '../store/chatStore';
import { Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';

function countChatsInFolder(folderId: string, descendantIds: string[]): number {
  const chats = useChatStore.getState().chats;
  return chats.filter((c) => c.folderId === folderId || descendantIds.includes(c.folderId ?? '')).length;
}

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
  const chatCount = countChatsInFolder(folder.id, descendantIds);
  const isActive = activeFolderId === folder.id;

  const handleRename = () => {
    if (renameValue.trim()) {
      renameFolder(folder.id, renameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 text-sm cursor-pointer transition-colors ${
          isActive ? 'text-accent bg-surface-overlay' : 'text-text-primary hover:bg-surface-overlay'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => setActiveFolderId(isActive ? null : folder.id)}
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
          <div className="absolute left-8 mt-6 bg-surface border border-border shadow-lg z-50 text-sm" onMouseLeave={() => setShowContext(false)}>
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
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/FolderTree.tsx
git commit -m "feat: add FolderTree component with nested folders and context menu"
```

---

### Task 5: TagCloud component

**Files:**
- Create: `app/components/TagCloud.tsx`

- [ ] **Step 1: Create TagCloud component**

```typescript
'use client';

import React, { useState } from 'react';
import { useTagStore } from '../store/tagStore';
import { useChatStore } from '../store/chatStore';
import { Plus, X } from 'lucide-react';

export function TagCloud() {
  const { tags, activeTagIds, createTag, deleteTag, toggleTagFilter } = useTagStore();
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleCreate = () => {
    if (inputValue.trim()) {
      createTag(inputValue.trim());
      setInputValue('');
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary tracking-wider uppercase">Tags</span>
        <button
          onClick={() => setAdding(!adding)}
          className="text-text-secondary hover:text-accent transition-colors cursor-pointer"
        >
          <Plus size={14} />
        </button>
      </div>
      {adding && (
        <div className="flex gap-1 mb-1">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setAdding(false); setInputValue(''); } }}
            placeholder="New tag..."
            className="flex-1 bg-surface border border-border px-2 py-1 text-xs outline-none focus:border-accent"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="text-xs px-2 py-1 border border-accent text-accent hover:bg-accent/10 cursor-pointer transition-colors"
          >
            Add
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isActive = activeTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggleTagFilter(tag.id)}
              className={`group inline-flex items-center gap-1 px-2 py-0.5 text-xs border transition-colors cursor-pointer ${
                isActive
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border text-text-secondary hover:border-accent hover:text-accent'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <span
                className="opacity-0 group-hover:opacity-100 hover:text-accent-secondary transition-opacity ml-0.5"
                onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
              >
                <X size={10} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/TagCloud.tsx
git commit -m "feat: add TagCloud component with create and filter"
```

---

### Task 6: ChatContextMenu component

**Files:**
- Create: `app/components/ChatContextMenu.tsx`

- [ ] **Step 1: Create context menu**

```typescript
'use client';

import React, { useState } from 'react';
import { useFolderStore, Folder } from '../store/folderStore';
import { useTagStore, Tag } from '../store/tagStore';
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
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/ChatContextMenu.tsx
git commit -m "feat: add ChatContextMenu with folder move and tag assignment"
```

---

### Task 7: Update TagStore with assign/remove chat helpers

The `assignTagToChat` and `removeTagFromChat` functions need to be added to tagStore.

**Files:**
- Modify: `app/store/tagStore.ts`

- [ ] **Step 1: Add assignTagToChat and removeTagFromChat**

Add these actions to the `TagState` interface and the store:

```typescript
// Add to TagState interface
assignTagToChat: (chatId: string, tagId: string) => void;
removeTagFromChat: (chatId: string, tagId: string) => void;

// Add inside create<> after toggleTagFilter
assignTagToChat: (chatId, tagId) => {
  const { useChatStore } = require('./chatStore');
  const chat = useChatStore.getState().chats.find((c) => c.id === chatId);
  if (!chat || chat.tagIds.includes(tagId)) return;
  useChatStore.setState({
    chats: useChatStore.getState().chats.map((c) =>
      c.id === chatId ? { ...c, tagIds: [...c.tagIds, tagId] } : c
    ),
  });
},

removeTagFromChat: (chatId, tagId) => {
  const { useChatStore } = require('./chatStore');
  const chat = useChatStore.getState().chats.find((c) => c.id === chatId);
  if (!chat) return;
  useChatStore.setState({
    chats: useChatStore.getState().chats.map((c) =>
      c.id === chatId ? { ...c, tagIds: c.tagIds.filter((t) => t !== tagId) } : c
    ),
  });
},
```

(Also add these to the `partialize` — since they're functions, they're automatically excluded.)

- [ ] **Step 2: Update tag delete to also remove from chats**

Add tag removal from all chats when a tag is deleted. Update the `deleteTag` action:

```typescript
deleteTag: (id) =>
  set((s) => {
    const { useChatStore } = require('./chatStore');
    useChatStore.setState({
      chats: useChatStore.getState().chats.map((c) => ({
        ...c,
        tagIds: c.tagIds.filter((t) => t !== id),
      })),
    });
    return { tags: s.tags.filter((t) => t.id !== id) };
  }),
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/store/tagStore.ts
git commit -m "feat: add tag assign/remove helpers and cascade delete"
```

---

### Task 8: Integrate into sidebar — update page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports**

Find the existing imports and add:

```typescript
import { useFolderStore } from './store/folderStore';
import { useTagStore } from './store/tagStore';
import { FolderTree } from './components/FolderTree';
import { TagCloud } from './components/TagCloud';
import { ChatContextMenu } from './components/ChatContextMenu';
```

- [ ] **Step 2: Add folder/tag filtering state and context menu**

After the existing state declarations (around line 60-65), add:

```typescript
const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);
```

- [ ] **Step 3: Build filtered chat list**

After `const activePath = ...` (around line 77-79), add the filtered chat list for the sidebar:

```typescript
const { folders, activeFolderId } = useFolderStore();
const { tags, activeTagIds } = useTagStore();

const filteredChats = chats.filter((chat) => {
  // Folder filter
  if (activeFolderId !== null) {
    const descendantIds: string[] = [];
    function collectDescendants(parentId: string) {
      const kids = folders.filter((f) => f.parentId === parentId);
      for (const k of kids) {
        descendantIds.push(k.id);
        collectDescendants(k.id);
      }
    }
    collectDescendants(activeFolderId);
    const allowedFolderIds = [activeFolderId, ...descendantIds];
    if (!chat.folderId || !allowedFolderIds.includes(chat.folderId)) return false;
  }
  // Tag filter (OR within tags)
  if (activeTagIds.length > 0) {
    if (!chat.tagIds.some((t) => activeTagIds.includes(t))) return false;
  }
  return true;
});
```

- [ ] **Step 4: Replace sidebar chat history list**

Find the sidebar chat history list section (the `chats.map((chat) => ...` inside the desktop sidebar `<aside>`) and replace it with the filtered list:

```typescript
{/* Chat History List */}
<div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
  {filteredChats.map((chat) => (
    <div
      key={chat.id}
      className={`group flex items-center justify-between p-2 border ${chat.id === activeChatId ? 'border-accent text-accent' : 'border-transparent text-text-primary hover:bg-surface-overlay'
      }`}
      onContextMenu={(e) => { e.preventDefault(); setContextMenuChatId(chat.id); }}
    >
      <button
        onClick={() => useChatStore.setState({ activeChatId: chat.id })}
        className="flex-1 text-left text-sm truncate pr-2 cursor-pointer focus:outline-none"
      >
        {chat.title}
      </button>
      <button
        onClick={() => deleteChat(chat.id)}
        className="opacity-0 group-hover:opacity-100 hover:text-accent-secondary cursor-pointer p-1 transition-opacity"
        aria-label="Delete Chat"
      >
        <Trash2 size={14} />
      </button>
    </div>
  ))}
</div>
```

Now find the similar section in the mobile drawer and do the same replacement.

- [ ] **Step 5: Add FolderTree and TagCloud to sidebar**

In the desktop sidebar, add them between the "New Chat" button and the chat list section. Find:

```typescript
{/* Chat History List */}
<div className="flex-1 overflow-y-auto ...
```

And insert before it:

```typescript
{/* Folder Tree */}
<div className="border-b border-border pb-2 mb-2">
  <FolderTree />
</div>

{/* Tag Cloud */}
<div className="border-b border-border pb-2 mb-2">
  <TagCloud />
</div>
```

Do the same in the mobile drawer sidebar.

- [ ] **Step 6: Add context menu overlay**

Before the closing `</main>` tag, add:

```typescript
{contextMenuChatId && (
  <div
    className="fixed inset-0 z-50"
    onClick={() => setContextMenuChatId(null)}
  >
    <div
      className="absolute"
      style={{ left: '72px', top: '200px' }}
      onClick={(e) => e.stopPropagation()}
    >
      <ChatContextMenu
        chatId={contextMenuChatId}
        onClose={() => setContextMenuChatId(null)}
      />
    </div>
  </div>
)}
```

- [ ] **Step 7: Show tags on chat list items**

In both sidebar chat list items (desktop and mobile), add tag chips after the title. Inside the chat div, after the title button:

```typescript
{chat.tagIds.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {chat.tagIds.slice(0, 3).map((tagId) => {
      const tag = tags.find((t) => t.id === tagId);
      if (!tag) return null;
      return (
        <span
          key={tagId}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] border border-border"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
          {tag.name}
        </span>
      );
    })}
    {chat.tagIds.length > 3 && (
      <span className="text-[10px] text-text-secondary">+{chat.tagIds.length - 3}</span>
    )}
  </div>
)}
```

- [ ] **Step 8: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Verify lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate folder tree, tag cloud, and context menu into sidebar"
```

---

### Task 9: Ensure filter has "All Chats" + No folder

- [ ] **Step 1: Verify "All Chats" and "No folder" behavior**

In page.tsx the filtered chat list already handles `activeFolderId === null` correctly (no folder filter).
The "No folder" option in ChatContextMenu sets `folderId: null`.
Chats with `folderId: null` appear when "All Chats" is selected.

No code changes needed — verify the logic is correct by reviewing the filter in Task 8 Step 3.

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: verify all-chats and unassigned chat logic"
```
