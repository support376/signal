'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { href: '/dashboard', label: '홈', icon: '⌂' },
  { href: '/scenario', label: '시나리오', icon: '◈' },
  { href: '/chemistry', label: '케미', icon: '◎' },
  { href: '/profile', label: '내 정보', icon: '●' },
];

export default function BottomNav() {
  const pathname = usePathname();

  // 숨길 경로: 랜딩, 로그아웃, 공개프로필, 시나리오 채팅 중
  if (pathname === '/') return null;
  if (pathname === '/logout') return null;
  if (pathname.startsWith('/u/')) return null;
  // 시나리오 채팅 중에는 숨김 (시나리오 목록은 보임)
  if (pathname.match(/^\/scenario\/[^/]+$/) && pathname !== '/scenario') return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm safe-bottom"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/scenario'
              ? pathname === '/scenario' || pathname.startsWith('/scenario/')
              : tab.href === '/chemistry'
              ? pathname.startsWith('/chemistry')
              : pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                isActive ? 'text-white' : 'text-white/30'
              }`}
            >
              <span className="text-base mb-0.5">{tab.icon}</span>
              <span className="text-[9px] font-mono uppercase tracking-wider">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
