'use client';
import { X, FileText } from 'lucide-react';

export interface Attachment {
  id: string;
  type: 'image' | 'pdf';
  data: string;
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
