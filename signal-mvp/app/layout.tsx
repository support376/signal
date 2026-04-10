import './globals.css';
import type { Metadata } from 'next';
import ApiDebugPanel from './components/api-debug';
import BottomNav from './components/bottom-nav';

export const metadata: Metadata = {
  title: { default: 'Signalogy — 잠재의식 + 케미 분석', template: '%s · Signalogy' },
  description: '잠재의식 측정 + 케미 분석. 진짜 너의 signal을 읽고, 진짜 호환성을 알아봐.',
  openGraph: { title: 'Signalogy — 잠재의식 + 케미 분석', description: '진짜 너의 signal을 읽고, 진짜 호환성을 알아봐.', siteName: 'Signalogy', type: 'website' },
  twitter: { card: 'summary', title: 'Signalogy', description: '잠재의식 + 케미 분석' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <div className="min-h-screen pb-16">{children}</div>
        <BottomNav />
        <ApiDebugPanel />
      </body>
    </html>
  );
}
