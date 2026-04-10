'use client';

import { useState } from 'react';
import ShareModal from './share-modal';

interface Props {
  userId: string;
  initialSlug: string;
  name: string;
  referredCount: number;
}

export default function MyLinkCard({ userId, initialSlug, name, referredCount }: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialSlug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  async function saveSlug() {
    if (!draft.trim() || draft === slug) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newSlug: draft.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '실패');
      setSlug(data.slug);
      setEditing(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="mb-12">
        <div className="bg-card border border-line rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-xs text-dim uppercase tracking-wider">내 Signalogy 링크</p>
            <p className="text-xs text-accent3">초대한 사람: {referredCount}명</p>
          </div>

          {!editing ? (
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-lg text-fg break-all">
                <span className="text-dim">signal/u/</span>
                <span className="text-accent">{slug}</span>
              </p>
              <button
                onClick={() => {
                  setDraft(slug);
                  setEditing(true);
                  setError('');
                }}
                className="text-xs text-dim hover:text-accent whitespace-nowrap"
              >
                ✏️ 변경
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-dim font-mono text-sm">signal/u/</span>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.toLowerCase())}
                  placeholder="3-20자, 영문/숫자/_/-"
                  className="flex-1 px-3 py-2 bg-bg border border-line rounded-lg text-fg focus:border-accent focus:outline-none font-mono text-sm"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={saveSlug}
                  disabled={saving}
                  className="px-3 py-1.5 bg-accent text-bg rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setError('');
                  }}
                  className="px-3 py-1.5 bg-bg border border-line rounded-lg text-xs text-dim"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => setShareOpen(true)}
              className="py-2 bg-bg border border-line rounded-lg text-sm hover:border-accent2 transition"
            >
              📤 공유 / QR
            </button>
            <a
              href={`/u/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 bg-bg border border-line rounded-lg text-sm hover:border-accent2 transition text-center"
            >
              👁 미리보기
            </a>
          </div>
        </div>
      </section>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        slug={slug}
        name={name}
      />
    </>
  );
}
