'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  open: boolean;
  onClose: () => void;
  slug: string;
  name: string;
}

export default function ShareModal({ open, onClose, slug, name }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/u/${slug}` : `/u/${slug}`;
    setShareUrl(url);
    QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#e8ecf3', light: '#0b0d12' } })
      .then(setQrDataUrl)
      .catch((e) => console.error(e));
  }, [open, slug]);

  if (!open) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} — Signal`,
          text: `Signal에서 ${name}와 케미 분석 해봐`,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled — silent
      }
    } else {
      copyLink();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-line rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">내 Signal 공유</h2>
          <button onClick={onClose} className="text-dim hover:text-fg text-xl leading-none">
            ×
          </button>
        </div>

        {qrDataUrl ? (
          <div className="bg-bg p-4 rounded-xl mb-4">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-full h-auto rounded-lg"
            />
          </div>
        ) : (
          <div className="bg-bg h-72 rounded-xl mb-4 flex items-center justify-center text-dim text-sm">
            QR 생성 중...
          </div>
        )}

        <div className="bg-bg border border-line rounded-lg p-3 mb-3 break-all text-xs font-mono text-dim">
          {shareUrl}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copyLink}
            className="py-3 bg-bg border border-line rounded-lg text-sm hover:border-accent transition"
          >
            {copied ? '✓ 복사됨' : '🔗 링크 복사'}
          </button>
          <button
            onClick={nativeShare}
            className="py-3 bg-accent text-bg rounded-lg text-sm font-semibold hover:bg-accent2 transition"
          >
            📤 공유하기
          </button>
        </div>

        <p className="text-xs text-dim text-center mt-4 leading-relaxed">
          QR 보여주면 즉시 너와 케미 분석. 카톡·인스타·SMS 어디든 공유 가능.
        </p>
      </div>
    </div>
  );
}
