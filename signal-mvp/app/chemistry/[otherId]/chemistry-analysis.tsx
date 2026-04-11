'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const LENSES = [
  { key: 'friend', label: '친구' },
  { key: 'romantic', label: '연인' },
  { key: 'family', label: '가족' },
  { key: 'work', label: '동료' },
] as const;

export default function ChemistryAnalysis({ otherId, otherName }: { otherId: string; otherName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState<string>('friend');

  if (!open) {
    return (
      <section className="border-t border-line pt-6">
        <button onClick={() => setOpen(true)}
          className="w-full py-3 border border-line rounded-xl text-sm text-fg hover:bg-card transition">
          케미 분석
        </button>
      </section>
    );
  }

  return (
    <section className="border-t border-line pt-6">
      <p className="text-xs text-dim mb-3">어떤 관계로 볼까?</p>

      {/* 렌즈 탭 */}
      <div className="flex gap-1 p-1 border border-line rounded-xl mb-4">
        {LENSES.map((l) => (
          <button key={l.key} onClick={() => setSelectedLens(l.key)}
            className={`flex-1 py-2 text-xs rounded-lg transition ${
              selectedLens === l.key ? 'bg-card text-fg font-semibold' : 'text-faint hover:text-dim'
            }`}>
            {l.label}
          </button>
        ))}
      </div>

      {/* 시작 */}
      <button onClick={() => router.push(`/chemistry/${otherId}/${selectedLens}`)}
        className="w-full py-3 bg-fg text-bg rounded-xl text-sm font-semibold hover:opacity-80 transition">
        {otherName}과의 {LENSES.find((l) => l.key === selectedLens)?.label} 케미 시작
      </button>
    </section>
  );
}
