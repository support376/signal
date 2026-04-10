'use client';

import { useState } from 'react';

interface Props {
  userId: string;
  initialName: string;
  initialBio: string;
  initialInstagram: string;
  initialSlug: string;
  initialLinkType: 'personal' | 'creator';
  initialLinkPrice: number;
  gender: string;
}

export default function ProfileEditor({
  userId, initialName, initialBio, initialInstagram, initialSlug, initialLinkType, initialLinkPrice, gender,
}: Props) {
  const [bio, setBio] = useState(initialBio);
  const [instagram, setInstagram] = useState(initialInstagram);
  const [linkType, setLinkType] = useState(initialLinkType);
  const [linkPrice, setLinkPrice] = useState(initialLinkPrice);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bio, instagram, link_type: linkType, link_price: linkPrice }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <section className="mb-6">
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg font-mono text-white/60">
          {initialName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold">{initialName}</p>
          <p className="text-xs text-white/25 font-mono">@{initialSlug} {gender === 'M' ? '♂' : gender === 'F' ? '♀' : ''}</p>
        </div>
      </div>

      {/* 편집 필드 */}
      <div className="space-y-4">
        {/* Bio */}
        <div>
          <label className="text-[10px] text-white/20 font-mono">한 줄 소개</label>
          <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="나를 한 줄로"
            maxLength={100}
            className="w-full mt-1 px-4 py-3 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white focus:border-white/20 focus:outline-none placeholder:text-white/15" />
        </div>

        {/* Instagram */}
        <div>
          <label className="text-[10px] text-white/20 font-mono">Instagram</label>
          <div className="flex items-center mt-1">
            <span className="px-3 py-3 bg-white/[0.02] border border-r-0 border-white/8 rounded-l-xl text-xs text-white/20">@</span>
            <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))} placeholder="instagram_handle"
              className="flex-1 px-3 py-3 bg-white/[0.03] border border-white/8 rounded-r-xl text-sm text-white font-mono focus:border-white/20 focus:outline-none placeholder:text-white/15" />
          </div>
          {instagram && (
            <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-white/20 hover:text-white/40 mt-1 inline-block font-mono">
              instagram.com/{instagram} ↗
            </a>
          )}
        </div>

        {/* 링크 유형 */}
        <div>
          <label className="text-[10px] text-white/20 font-mono">프로필 유형</label>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setLinkType('personal')}
              className={`flex-1 p-3 border rounded-xl text-xs transition ${
                linkType === 'personal' ? 'border-white/25 text-white bg-white/5' : 'border-white/8 text-white/25'
              }`}>
              <p className="font-medium">Personal</p>
              <p className="text-[10px] text-white/20 mt-0.5">$1 · 승인 필요</p>
            </button>
            <button type="button" onClick={() => setLinkType('creator')}
              className={`flex-1 p-3 border rounded-xl text-xs transition ${
                linkType === 'creator' ? 'border-white/25 text-white bg-white/5' : 'border-white/8 text-white/25'
              }`}>
              <p className="font-medium">Creator</p>
              <p className="text-[10px] text-white/20 mt-0.5">가격 자유 · 공개</p>
            </button>
          </div>
        </div>

        {/* Creator 가격 */}
        {linkType === 'creator' && (
          <div>
            <label className="text-[10px] text-white/20 font-mono">케미 1회 가격 ($)</label>
            <input type="number" value={linkPrice} onChange={(e) => setLinkPrice(Math.max(1, Number(e.target.value) || 1))}
              min={1} max={100}
              className="w-full mt-1 px-4 py-3 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white font-mono focus:border-white/20 focus:outline-none" />
            <p className="text-[10px] text-white/15 mt-1 font-mono">팬이 이 가격으로 너와의 케미를 볼 수 있어.</p>
          </div>
        )}

        {/* 저장 */}
        <button onClick={save} disabled={saving}
          className={`w-full py-3 border rounded-xl text-sm transition ${
            saved ? 'border-white/20 text-white/60' : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
          }`}>
          {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
        </button>
      </div>
    </section>
  );
}
