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
    QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#111111', light: '#ffffff' } })
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
          title: `${name}와의 케미를 확인해봐 — Signalogy`,
          text: `${name}가 너와의 케미를 보고 싶어해. 15분만 하면 둘의 결과가 나와.`,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-fg/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-bg border border-line rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-fg">상대에게 보내기</h2>
          <button onClick={onClose} className="text-dim hover:text-fg text-xl leading-none">
            ×
          </button>
        </div>

        {qrDataUrl ? (
          <div className="bg-card p-4 rounded-xl mb-4">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-full h-auto rounded-lg"
            />
          </div>
        ) : (
          <div className="bg-card h-72 rounded-xl mb-4 flex items-center justify-center text-dim text-sm">
            QR 생성 중...
          </div>
        )}

        <div className="bg-card border border-line rounded-lg p-3 mb-3 break-all text-xs text-dim">
          {shareUrl}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copyLink}
            className="py-3 bg-card border border-line rounded-lg text-sm hover:border-accent"
          >
            {copied ? '✓ 복사됨' : '링크 복사'}
          </button>
          <button
            onClick={nativeShare}
            className="py-3 bg-accent text-bg rounded-lg text-sm font-semibold hover:bg-accent2"
          >
            공유하기
          </button>
        </div>

        <p className="text-xs text-faint text-center mt-4 leading-relaxed">
          상대가 이 링크로 15분만 하면<br />둘의 진짜 케미가 열려.
        </p>
      </div>
    </div>
  );
}
