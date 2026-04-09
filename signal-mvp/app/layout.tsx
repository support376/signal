import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Signal — 잠재의식 + 케미 분석',
    template: '%s · Signal',
  },
  description: '잠재의식 측정 + 케미 분석. 진짜 너와 진짜 호환성을 알아봐.',
  openGraph: {
    title: 'Signal — 잠재의식 + 케미 분석',
    description: '진짜 너와 진짜 호환성을 알아봐.',
    siteName: 'Signal',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Signal',
    description: '잠재의식 + 케미 분석',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
