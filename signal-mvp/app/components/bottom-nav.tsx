'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const TABS = [
  { href: '/dashboard', label: '홈', icon: '⌂', activeIcon: '⌂' },
  { href: '/scenario', label: '시나리오', icon: '◈', activeIcon: '◈' },
  { href: '/chemistry', label: '케미', icon: '◎', activeIcon: '◎' },
  { href: '/profile', label: '내 정보', icon: '○', activeIcon: '●' },
] as const;

// 이 경로에서는 탭 숨김
const HIDDEN_PATHS = ['/', '/logout', '/u/'];

export default function BottomNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const uid = document.cookie.match(/(^|;\s*)signal_user_id=([^;]+)/)?.[2];
    setLoggedIn(!!uid);
  }, [pathname]);

  // 숨길 조건: 비로그인, 랜딩, 로그아웃, 공개프로필, 시나리오 채팅 중
  if (!loggedIn) return null;
  if (HIDDEN_PATHS.some((p) => pathname === p || (p.endsWith('/') && pathname.startsWith(p)))) return null;
  // 시나리오 채팅 중일 때는 탭 숨김 (scenario/xxx 인데 vector가 아닌 경우)
  if (pathname.match(/^\/scenario\/[^/]+$/) && !pathname.includes('/vector')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-bg/90 backdrop-blur-md safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/scenario'
              ? pathname.startsWith('/scenario')
              : tab.href === '/chemistry'
              ? pathname.startsWith('/chemistry')
              : pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-3 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                isActive ? 'text-accent' : 'text-dim/60 hover:text-dim'
              }`}
            >
              <span className="text-lg mb-0.5">{isActive ? tab.activeIcon : tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
