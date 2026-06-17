# Conversation Organization — Design Spec

## Goal

Add Notion-like organization to the chat app — folders + tags — so users can find any past conversation quickly.

## Data Model

### Folder

```
{
  id: string;
  name: string;
  parentId: string | null;   // null = root-level folder
  createdAt: number;
}
```

Stored in a new zustand store, persisted under key `blues-folder-storage`.

### Tag

Tags have a registry store:

```
Tag {
  id: string;
  name: string;
  color: string;       // accent color for chip
}
```

Chats reference tags by ID:

```
Chat {
  ... existing fields
  tagIds: string[];
}
```

Tags stored in a new zustand store, persisted under key `blues-tag-storage`.

### Chat changes

Existing chat gets two new optional fields:

```
Chat {
  ... existing fields
  folderId: string | null;
  tagIds: string[];
}
```

## Sidebar Layout

```
┌──────────────────────┐
│  avocado.      [⚙]  │
├──────────────────────┤
│  + New Chat          │
├──────────────────────┤
│  📁 All Chats     (N)│
│  📁 Work          (N)│
│    ├ sub-project  (N)│
│  📁 Learning     (N) │
│  📁 Personal     (N) │
├──────────────────────┤
│  Tags:               │
│  #urgent  #bugs  #ai │
├──────────────────────┤
│  [filtered chat list]│
└──────────────────────┘
```

## Folder management

- Create: `+` button at bottom of folder tree triggers inline input
- Rename: double-click folder name → inline edit
- Delete: right-click → "Delete" with "Move chats to parent" option
- Move chat: right-click chat → "Move to Folder..." → folder picker modal
- Sub-folders: right-click folder → "Add sub-folder"
- Expand/collapse: click folder chevron to toggle children

## Tag management

- Assign: right-click chat → "Assign Tags..." → multi-select tag picker
- Create on the fly: type in tag picker input, press Enter to create
- Remove: click `x` on tag chip in chat list item
- Filter: click tag in sidebar to filter; click again to remove filter

## Sidebar filtering logic

- Clicking a folder filters chat list to chats in that folder OR any descendant folder
- Folder count shows total chats in that folder and all sub-folders
- Clicking a tag toggles tag filter; multiple tags can be active (OR within tags)
- Tag filter AND folder filter are combined: must match folder AND any active tag
- "All Chats" clears folder filter but keeps tag filter
- Active state visually highlighted in both folder tree and tag cloud

## Zustand store additions

Two new separate stores:

```typescript
// useFolderStore — persist key: 'blues-folder-storage'
folders: Folder[];
activeFolderId: string | null;
createFolder(name: string, parentId?: string): string;
renameFolder(id: string, name: string): void;
deleteFolder(id: string): void;  // moves child chats to parent folder
moveChatToFolder(chatId: string, folderId: string | null): void;
getDescendantFolderIds(folderId: string): string[]; // helper
setActiveFolderId(id: string | null): void;

// useTagStore — persist key: 'blues-tag-storage'
tags: Tag[];
activeTagIds: string[];
createTag(name: string, color?: string): string;
deleteTag(id: string): void;
assignTagToChat(chatId: string, tagId: string): void;
removeTagFromChat(chatId: string, tagId: string): void;
setActiveTagIds(ids: string[]): void;
toggleTagFilter(tagId: string): void;
```

Existing chat store (`useChatStore`) gets folderId and tagIds added to the Chat interface and the `partialize` function includes these fields.

## Implementation order

1. Folder data model + store
2. Tag data model + store
3. Update chat model (folderId, tagIds)
4. Sidebar folder tree UI
5. Tag cloud UI
6. Chat list filtering
7. Folder CRUD (create, rename, delete)
8. Chat → folder assignment (right-click menu)
9. Tag assignment UI (right-click menu)
10. Persistence + migration
