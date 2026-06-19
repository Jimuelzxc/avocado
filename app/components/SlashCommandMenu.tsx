'use client';

import React, { useEffect, useRef } from 'react';
import type { SlashCommand } from '../store/chatStore';

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  filter: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ commands, filter, selectedIndex, onSelect, onClose }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (commands.length === 0) return null;

  const highlight = (text: string) => {
    if (!filter) return text;
    const idx = text.toLowerCase().indexOf(filter.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-accent font-bold">{text.slice(idx, idx + filter.length)}</span>
        {text.slice(idx + filter.length)}
      </>
    );
  };

  return (
    <div
      ref={menuRef}
      role="listbox"
      className="absolute bottom-full left-0 mb-2 w-72 max-h-64 overflow-y-auto border border-border bg-surface shadow-lg z-50 font-mono text-sm"
    >
      {commands.map((cmd, i) => (
        <div
          key={cmd.id}
          role="option"
          aria-selected={i === selectedIndex}
          onClick={() => onSelect(cmd)}
          className={`px-3 py-2 cursor-pointer flex flex-col gap-0.5 border-b border-border/30 last:border-b-0 transition-colors ${
            i === selectedIndex ? 'bg-surface-overlay border-l-2 border-l-accent' : 'hover:bg-surface-overlay'
          }`}
        >
          <span className="text-text-primary">
            /{highlight(cmd.shortcut)}
          </span>
          <span className="text-xs text-text-secondary truncate">{cmd.name}</span>
        </div>
      ))}
    </div>
  );
}
