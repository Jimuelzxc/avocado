# Multi-Modal Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image upload (paste, drag-drop, file picker) and PDF text extraction to the avocado chat app.

**Architecture:** All client-side. Images compressed via Canvas API, stored as base64 data URLs inline in messages. PDFs text-extracted via pdfjs-dist. Existing OpenAI-compatible API route passes content blocks through unchanged.

**Tech Stack:** TypeScript, React, Canvas API, pdfjs-dist, Tailwind CSS

---

### Task 1: Add ContentBlock types and install pdfjs-dist

**Files:**
- Modify: `app/store/chatStore.ts:4-10`
- Modify: `package.json`

- [ ] **Install pdfjs-dist**

```bash
npm install pdfjs-dist
npm install -D @types/pdfjs-dist
```

- [ ] **Add ContentBlock types to chatStore.ts**

Insert before `Message` interface:

```typescript
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'pdf_text'; text: string; filename: string };

export type MessageContent = string | ContentBlock[];
```

Change `Message.content` type from `string` to `MessageContent`:

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent;
  parentId: string | null;
  createdAt: number;
}
```

- [ ] **Commit**

```bash
git add app/store/chatStore.ts package.json package-lock.json
git commit -m "feat: add ContentBlock types, install pdfjs-dist"
```

---

### Task 2: Create image compression utility

**Files:**
- Create: `app/lib/imageCompress.ts`

- [ ] **Create image compression utility**

```typescript
export function compressImage(file: File, maxDimension = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not get canvas context')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
```

- [ ] **Commit**

```bash
git add app/lib/imageCompress.ts
git commit -m "feat: add client-side image compression utility"
```

---

### Task 3: Create PDF text extraction utility

**Files:**
- Create: `app/lib/extractPdf.ts`

- [ ] **Create PDF text extraction utility**

```typescript
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractPdfText(file: File): Promise<{ text: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    pages.push(pageText);
  }
  return { text: pages.join('\n\n') };
}
```

- [ ] **Commit**

```bash
git add app/lib/extractPdf.ts
git commit -m "feat: add PDF text extraction utility"
```

---

### Task 4: Create AttachmentPreview component

**Files:**
- Create: `app/components/AttachmentPreview.tsx`

- [ ] **Create AttachmentPreview**

```typescript
'use client';
import { X, FileText } from 'lucide-react';

export interface Attachment {
  id: string;
  type: 'image' | 'pdf';
  data: string; // base64 data URL for images
  filename?: string;
  name: string;
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pb-2">
      {attachments.map((att) => (
        <div key={att.id} className="group relative border border-border p-1 flex items-center gap-1.5">
          {att.type === 'image' ? (
            <img src={att.data} alt={att.name} className="w-10 h-10 object-cover" />
          ) : (
            <FileText size={20} className="text-text-secondary" />
          )}
          <span className="text-xs truncate max-w-24">{att.name}</span>
          <button
            onClick={() => onRemove(att.id)}
            className="absolute -top-2 -right-2 bg-surface-overlay border border-border p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/components/AttachmentPreview.tsx
git commit -m "feat: add AttachmentPreview component"
```

---

### Task 5: Add attachment handling to page.tsx — state, handlers, input area

**Files:**
- Modify: `app/page.tsx`

- [ ] **Import new dependencies and add attachment state**

Add imports:
```typescript
import { compressImage } from './lib/imageCompress';
import { extractPdfText } from './lib/extractPdf';
import { AttachmentPreview, Attachment } from './components/AttachmentPreview';
import { ContentBlock, MessageContent } from './store/chatStore';
import { FileImage } from 'lucide-react';
```

Add state after existing useState lines (~line 68):
```typescript
const [attachments, setAttachments] = useState<Attachment[]>([]);
const fileInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Add file input element and attachment handlers**

After the `handleEdit` function (around line 244), add:

```typescript
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      const data = await compressImage(file);
      setAttachments((prev) => [...prev, { id: crypto.randomUUID(), type: 'image', data, name: file.name }]);
    } else if (file.type === 'application/pdf') {
      const { text } = await extractPdfText(file);
      setAttachments((prev) => [...prev, { id: crypto.randomUUID(), type: 'pdf', data: text, filename: file.name, name: file.name }]);
    }
  }
  if (fileInputRef.current) fileInputRef.current.value = '';
};

const handlePaste = async (e: React.ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) continue;
      const data = await compressImage(file);
      setAttachments((prev) => [...prev, { id: crypto.randomUUID(), type: 'image', data, name: 'Pasted image' }]);
    }
  }
};

const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (!files) return;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      const data = await compressImage(file);
      setAttachments((prev) => [...prev, { id: crypto.randomUUID(), type: 'image', data, name: file.name }]);
    } else if (file.type === 'application/pdf') {
      const { text } = await extractPdfText(file);
      setAttachments((prev) => [...prev, { id: crypto.randomUUID(), type: 'pdf', data: text, filename: file.name, name: file.name }]);
    }
  }
};

const removeAttachment = (id: string) => {
  setAttachments((prev) => prev.filter((a) => a.id !== id));
};
```

- [ ] **Update handleSendMessage to build content blocks**

Replace the line `addMessage(targetChatId, { role: 'user', content: text }, parentId);` with:

```typescript
if (attachments.length > 0) {
  const blocks: ContentBlock[] = [];
  if (text.trim()) blocks.push({ type: 'text', text });
  for (const att of attachments) {
    if (att.type === 'image') {
      blocks.push({ type: 'image_url', image_url: { url: att.data } });
    } else if (att.type === 'pdf') {
      blocks.push({ type: 'pdf_text', text: att.data, filename: att.filename || att.name });
    }
  }
  addMessage(targetChatId, { role: 'user', content: blocks }, parentId);
} else {
  addMessage(targetChatId, { role: 'user', content: text }, parentId);
}
```

Add `setAttachments([]);` after either branch to clear attachments on send.

- [ ] **Update the input form — add file input, paste/drop handlers, attachment preview**

Add hidden file input before the textarea:
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*,application/pdf"
  multiple
  className="hidden"
  onChange={handleFileSelect}
/>
```

Add `onPaste={handlePaste}` and `onDrop={handleDrop}` to the form element:
```tsx
<form
  className="..."
  onSubmit={handleSendMessage}
  onPaste={handlePaste}
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
>
```

Add `AttachmentPreview` between textarea and the action buttons row:
```tsx
<AttachmentPreview attachments={attachments} onRemove={removeAttachment} />
```

Add paperclip button next to the braces button:
```tsx
<button type="button" onClick={() => fileInputRef.current?.click()}>
  <FileImage size={22} strokeWidth={1.5} />
</button>
```

- [ ] **Commit**

```bash
git add app/page.tsx
git commit -m "feat: add image/file attachment handlers and input UI to page"
```

---

### Task 6: Update MarkdownRenderer for image and PDF content blocks

**Files:**
- Modify: `app/components/MarkdownRenderer.tsx`

- [ ] **Update props to accept MessageContent**

Change interface:
```typescript
import { MessageContent, ContentBlock } from '../store/chatStore';
import { Expand, FileText } from 'lucide-react';

interface MarkdownRendererProps {
  content: MessageContent;
  isStreaming?: boolean;
}
```

- [ ] **Add rendering logic for content blocks**

At the top of the component, before the markdown render, add:

```typescript
const [expandedImage, setExpandedImage] = useState<string | null>(null);

if (Array.isArray(content)) {
  return (
    <div className="w-full select-text flex flex-col gap-3 selection:bg-[var(--selection)]">
      {content.map((block, i) => {
        if (block.type === 'text') {
          return (
            <div key={i} className="w-full">
              <NormalMarkdown content={block.text + (isStreaming && i === content.length - 1 ? '▋' : '')} />
            </div>
          );
        }
        if (block.type === 'image_url') {
          return (
            <div key={i} className="relative group inline-block max-w-lg">
              <img
                src={block.image_url.url}
                alt="User uploaded image"
                className="max-w-full h-auto border border-border cursor-pointer"
                onClick={() => setExpandedImage(block.image_url.url)}
              />
              <button
                onClick={() => setExpandedImage(block.image_url.url)}
                className="absolute top-1 right-1 p-1 bg-surface/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Expand size={14} />
              </button>
            </div>
          );
        }
        if (block.type === 'pdf_text') {
          return (
            <div key={i} className="flex items-center gap-2 border border-border p-2 text-sm text-text-secondary">
              <FileText size={16} />
              <span>{block.filename}</span>
            </div>
          );
        }
        return null;
      })}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <img src={expandedImage} alt="Expanded" className="max-h-[90vh] max-w-[90vw] object-contain" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Extract the existing markdown render into a helper component**

Rename the current return to a `<NormalMarkdown>` component:

```typescript
function NormalMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={/* ... same components as before ... */}
    >
      {content}
    </ReactMarkdown>
  );
}
```

The main `MarkdownRenderer` function becomes:
```typescript
export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  if (Array.isArray(content)) {
    return /* content blocks renderer as above */;
  }
  return (
    <div className="w-full select-text selection:bg-[var(--selection)]">
      <NormalMarkdown content={content + (isStreaming ? '▋' : '')} />
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/components/MarkdownRenderer.tsx
git commit -m "feat: add image and PDF content block rendering to MarkdownRenderer"
```

---

### Task 7: Verify build

**Files:** None

- [ ] **Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```

Fix any issues.

- [ ] **Commit any fixes**

```bash
git add -A
git commit -m "chore: fix type/lint issues after multi-modal changes"
```
