'use client';

import { useState } from 'react';

interface Props {
  userId: string;
  initialEnabled: boolean;
  hasVector: boolean;
}

export default function FingerprintToggle({ userId, initialEnabled, hasVector }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (!hasVector) return;
    setSaving(true);
    try {
      const next = !enabled;
      const r = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fingerprint_enabled: next }),
      });
      if (r.ok) setEnabled(next);
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-fg">인격지문 로그인</p>
        <p className="text-[10px] text-faint mt-0.5">
          {hasVector
            ? '켜면 로그인할 때 성격 기반 인증이 필요해'
            : '시나리오를 완료하면 사용 가능'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving || !hasVector}
        className={`w-12 h-7 rounded-full relative disabled:opacity-30 ${
          enabled ? 'bg-accent' : 'bg-line'
        }`}
      >
        <span className={`block w-5 h-5 rounded-full bg-bg absolute top-1 transition-all ${
          enabled ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  );
}
