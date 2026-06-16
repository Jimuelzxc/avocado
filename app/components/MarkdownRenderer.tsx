'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const markdownContent = content + (isStreaming ? '▋' : '');

  return (
    <div className="w-full select-text selection:bg-[#20ffe5]/30">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom block and inline code renderer
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="bg-black/30 border border-white/20 text-[#20ffe5] px-1.5 py-0.5 rounded-sm text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Fenced code block (block)
            const language = match[1] || 'text';
            return <CodeBlock language={language} code={String(children).replace(/\n$/, '')} {...props} />;
          },

          // Custom table elements
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border-2 border-white max-w-full">
              <table className="min-w-full divide-y-2 divide-white text-left text-sm font-mono bg-black text-white">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#20ffe5] text-black">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/50">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="divide-x divide-white">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-bold uppercase border border-white text-center">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border border-white">
              {children}
            </td>
          ),

          // Custom typographical styles
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#20ffe5] pl-4 italic my-4 text-white/80 bg-black/20 py-1">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#20ffe5] underline hover:text-[#f6ff00] transition-colors"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold my-4 text-[#20ffe5]">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold my-3 text-[#20ffe5]">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold my-2 text-[#20ffe5]">{children}</h3>,
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
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
    <div className="border border-white my-4 flex flex-col bg-black">
      {/* Retro DOS Window header */}
      <div className="flex justify-between items-center bg-[#000080] border-b border-white px-3 py-1.5 text-xs text-white font-mono uppercase select-none">
        <span className="text-[#20ffe5] font-bold">[{language}]</span>
        <button
          onClick={handleCopy}
          className="hover:text-[#f6ff00] font-bold focus:outline-none cursor-pointer transition-colors active:text-[#20ffe5]"
        >
          {copied ? '[COPIED!]' : '[COPY]'}
        </button>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language.toLowerCase()}
          PreTag="div"
          customStyle={{
            margin: 0,
            background: '#000000',
            padding: '1rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
