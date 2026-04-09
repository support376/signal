import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signal — Internal MVP',
  description: '잠재의식 측정 + 케미 분석',
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
