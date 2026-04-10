import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Signalogy — 잠재의식 + 케미 분석',
    template: '%s · Signalogy',
  },
  description: '잠재의식 측정 + 케미 분석. 진짜 너의 signal을 읽고, 진짜 호환성을 알아봐.',
  openGraph: {
    title: 'Signalogy — 잠재의식 + 케미 분석',
    description: '진짜 너의 signal을 읽고, 진짜 호환성을 알아봐.',
    siteName: 'Signalogy',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Signalogy',
    description: '잠재의식 + 케미 분석',
  },
};

import ApiDebugPanel from './components/api-debug';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">{children}</div>
        <ApiDebugPanel />
      </body>
    </html>
  );
}
