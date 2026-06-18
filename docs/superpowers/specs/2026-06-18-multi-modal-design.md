# Multi-Modal Support

## Overview
Add image upload (via file picker, paste, drag-drop) and PDF text extraction to the avocado chat app. Images are compressed client-side and stored as base64 data URLs inline in messages. PDFs are text-extracted client-side via pdfjs-dist.

## Data Model

`Message.content` becomes `string | ContentBlock[]` where:

```
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "pdf_text"; text: string; filename: string }
```

Plain text messages stay as `string` for backward compatibility. The store and persistence layer handle both shapes.

## Image Capture

Three entry points:
- **File picker**: button in input bar triggers `<input type="file" accept="image/*">`
- **Paste**: `onPaste` handler checks for `clipboardData.items` with image types
- **Drag & drop**: `onDrop` handler on input area reads `File` objects

Pipeline: File → compress (resize to max 1024px longest edge, 80% JPEG quality via Canvas) → encode as base64 data URL → store in message content blocks.

## PDF Handling

File picker accepts `application/pdf`. On selection, `pdfjs-dist` renders each page to canvas, extracts text, concatenates into a single string. Stored as a `pdf_text` block with filename.

UI shows a small document icon + filename chip (not the raw text). The extracted text is sent to the AI as context.

## Input Area UI

- Attachment button (paperclip icon) alongside system prompt button
- Preview strip between textarea and action buttons showing:
  - Image thumbnails (64x64 cropped) with X remove button
  - PDF filename chips with document icon and X remove button
- Paste/drop zone covers the entire input container

Attachments are held in local component state and cleared on send.

## Message Display

- **Images**: rendered inline in `MarkdownRenderer`, max-width constrained, clickable for lightbox/full-size overlay
- **PDFs**: shown as document filename chip, not inline text dump

## API Sending

When sending, component builds the content block array from input text + current attachments. The `api/chat/route.ts` already passes messages through unchanged — the OpenAI-compatible content blocks are forwarded as-is.

## Migration

Existing messages with plain string `content` remain valid. The rendering code checks `typeof content === "string"` for the old format and handles arrays for the new format.

## No Server Changes

All processing is client-side. No new API routes, no server-side dependencies.
