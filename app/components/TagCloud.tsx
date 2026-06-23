'use client';

import React, { useState } from 'react';
import { useTagStore } from '../store/tagStore';
import { Plus, X, Tag } from 'lucide-react';

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
        <span className="text-xs text-text-secondary tracking-wider uppercase flex items-center gap-1.5">
          <Tag size={12} />
          Tags
        </span>
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
