'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MessageContent } from '../store/chatStore';
import { Expand, FileText } from 'lucide-react';

interface MarkdownRendererProps {
  content: MessageContent;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (Array.isArray(content)) {
    return (
      <div className="w-full select-text flex flex-col gap-3 selection:bg-[var(--selection)]">
        {content.map((block, i) => {
          if (block.type === 'text') {
            return (
              <div key={i} className="w-full">
                <NormalMarkdown content={block.text + (isStreaming && i === content.length - 1 ? '\u258B' : '')} />
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
              <div key={i} className="inline-flex items-center gap-2 border border-border p-2 text-sm text-text-secondary">
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

  const markdownContent = content + (isStreaming ? '\u258B' : '');
  return (
    <div className="w-full select-text selection:bg-[var(--selection)]">
      <NormalMarkdown content={markdownContent} />
    </div>
  );
}

function NormalMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          if (isInline) {
            return (
              <code
                className="bg-surface-overlay border border-border/20 text-accent px-1.5 py-0.5 rounded-sm text-sm font-mono break-all"
                {...props}
              >
                {children}
              </code>
            );
          }
          const language = match[1] || 'text';
          return <CodeBlock language={language} code={String(children).replace(/\n$/, '')} {...props} />;
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-4 border-2 border-border max-w-full">
            <table className="min-w-full divide-y-2 divide-border text-left text-sm font-mono bg-surface text-text-primary">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-accent text-text-primary">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border/50">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="divide-x divide-border">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 font-bold uppercase border border-white text-center">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border border-border">{children}</td>
        ),
        p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-accent pl-4 italic my-4 text-text-secondary bg-surface-overlay py-1">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:text-accent-secondary transition-colors"
          >
            {children}
          </a>
        ),
        h1: ({ children }) => <h1 className="text-lg font-bold my-4 text-accent">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold my-3 text-accent">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold my-2 text-accent">{children}</h3>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="border border-border my-4 flex flex-col bg-surface max-w-full overflow-x-auto">
      <div className="flex justify-between items-center bg-surface border-b border-border px-3 py-1.5 text-xs text-white font-mono uppercase select-none">
        <span className="text-accent font-bold">[{language}]</span>
        <button
          onClick={handleCopy}
          className="hover:text-accent-secondary font-bold focus:outline-none cursor-pointer transition-colors active:text-[#20ffe5]"
        >
          {copied ? '[COPIED!]' : '[COPY]'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language.toLowerCase()}
          PreTag="div"
          customStyle={{ margin: 0, background: '#000000', padding: '1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', lineHeight: '1.25rem' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
