'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { href: '/dashboard', label: '홈', icon: '⌂' },
  { href: '/chemistry', label: '궁금한 사람', icon: '◎' },
  { href: '/scenario', label: 'signal', icon: '◈' },
  { href: '/profile', label: '나', icon: '●' },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/') return null;
  if (pathname === '/logout') return null;
  if (pathname.startsWith('/u/')) return null;
  if (pathname.match(/^\/scenario\/[^/]+$/) && pathname !== '/scenario') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm safe-bottom"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/scenario' ? pathname === '/scenario' || pathname.startsWith('/scenario/')
            : tab.href === '/chemistry' ? pathname.startsWith('/chemistry')
            : pathname === tab.href;

          return (
            <Link key={tab.href} href={tab.href}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${isActive ? 'text-white' : 'text-white/25'}`}>
              <span className="text-base mb-0.5">{tab.icon}</span>
              <span className="text-[9px] font-mono tracking-wider">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
