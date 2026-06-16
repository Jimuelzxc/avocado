# Design Spec: Markdown Rendering & Retro Syntax Highlighting

This design document outlines how we will add Markdown rendering and syntax highlighting to the **blues.** chat application while keeping the retro visual style.

## Goal
Transform plain text AI responses into beautifully formatted rich text. This includes rendering standard Markdown structures (lists, blockquotes, tables) and adding custom retro-themed code block frames with syntax highlighting and a copy button.

## User Review Required

> [!IMPORTANT]
> To support Markdown in our React 19 codebase, we will use `react-markdown` v9, which has native support for React 19. Older versions of common markdown packages are incompatible with React 19's server components/types and will cause build/runtime errors.

## Architectural Components

### 1. Reusable Component: `MarkdownRenderer`
We will create a standalone component to render markdown securely and convert the AST elements into custom-styled React elements.

* **File:** `app/components/MarkdownRenderer.tsx`
* **Props:**
  - `content` (string) - The raw Markdown message text.
  - `isStreaming` (boolean) - Whether the message is currently streaming. If true, we will append a typing cursor `▋` at the end of the text.

### 2. Custom Renderers & Styling

We will customize the following elements rendered by `react-markdown`:

#### A. Code Blocks (`code` tag)
For inline code, we will render a simple cyan background with a border.
For fenced code blocks:
- **Frame Header:** A DOS-like window top-bar in `#000080` (blue) with a `#20ffe5` (cyan) border. It will show the language name (e.g. `JS`, `TSX`, `PYTHON`) on the left and a "COPY" button on the right.
- **Copy Action:** Clicking the "COPY" button will copy the block contents to the clipboard and change the button text to "COPIED!" temporarily.
- **Syntax Highlighting:** We will use `react-syntax-highlighter` with the Prism light build. We will style it using a custom or adapted theme matching our retro colors (dark blue/black background, cyan/yellow/white text syntax tokens).

#### B. Tables (`table` tag)
Instead of standard modern tables, tables will have:
- A double or thick white border (`border-2 border-white`).
- Cyan header backgrounds (`bg-[#20ffe5]` text-black) to match the BIOS terminal look.
- Monospace spacing and cell padding (`p-2 border border-white`).

#### C. Typography & Lists (`ul`, `ol`, `li`, `p`, `blockquote`)
Tailwind v4's CSS resets disable default list bullets. We will define explicit styling:
- **Unordered Lists:** `list-disc pl-5 my-2 space-y-1`
- **Ordered Lists:** `list-decimal pl-5 my-2 space-y-1`
- **Paragraphs:** `mb-4 last:mb-0 leading-relaxed`
- **Blockquotes:** `border-l-4 border-[#20ffe5] pl-4 italic my-4 text-white/80`

### 3. Page Integration
In [page.tsx](file:///c:/Users/jimue/Desktop/Vibe%20Coding/sd/app/page.tsx), we will import the `MarkdownRenderer` component and replace the plain paragraph rendering for assistant messages:

```tsx
<div className="self-start max-w-[95%] md:max-w-[85%] flex flex-col gap-4">
  <MarkdownRenderer 
    content={msg.content} 
    isStreaming={isStreaming && idx === messages.length - 1} 
  />
  ...
</div>
```

---

## Verification & Testing Plan

### Automated Verification
We will run:
* `npm run lint` to ensure no lint errors are introduced.
* `npx tsc --noEmit` to ensure TypeScript compile checks pass.
* `npm run build` to verify the production Next.js compilation succeeds with React 19 ESM imports.

### Manual Verification
1. **Markdown Formatting:** Ask the AI to write structured text with headers, bold text, lists, and a table to confirm correct rendering.
2. **Code Syntax Highlighting:** Ask the AI to generate a JavaScript or Python snippet. Verify syntax highlights correct tokens and the DOS window frame is displayed.
3. **Copy Code:** Click the "COPY" button on the code block, verify clipboard contents match the code, and confirm the button transitions to "COPIED!" and back.
4. **Streaming Behavior:** Verify that when a message is streaming, the typing cursor `▋` remains visible at the end of the text/markdown nodes and doesn't break the layout.
