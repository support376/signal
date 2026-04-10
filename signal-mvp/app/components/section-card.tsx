'use client';

import { useState } from 'react';

interface Props {
  emoji: string;
  title: string;
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function SectionCard({ emoji, title, summary, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-card border border-line rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-start gap-3 hover:bg-card-hover"
      >
        <span className="text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-fg">{title}</p>
          <p className="text-xs text-dim mt-1 line-clamp-2">{summary}</p>
        </div>
        <span className={`text-dim text-lg ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-line">
          {children}
        </div>
      )}
    </div>
  );
}
