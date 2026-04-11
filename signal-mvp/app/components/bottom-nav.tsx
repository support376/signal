'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const TABS = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/chemistry', label: 'Chemistry', icon: '◎' },
  { href: '/scenario', label: 'Signal', icon: '◈' },
  { href: '/profile', label: 'More', icon: '≡' },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button onClick={toggle} className="flex-none px-2 py-2.5 text-dim" aria-label="테마 전환">
      <span className="text-lg">{dark ? '☀' : '☾'}</span>
    </button>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/logout') return null;
  if (pathname.startsWith('/u/')) return null;
  if (pathname.match(/^\/scenario\/[^/]+$/) && pathname !== '/scenario') return null;
  if (pathname.startsWith('/daily/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-line safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/scenario' ? pathname === '/scenario' || pathname.startsWith('/scenario/')
            : tab.href === '/chemistry' ? pathname.startsWith('/chemistry')
            : pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex-1 flex flex-col items-center py-2.5 ${isActive ? 'text-fg' : 'text-faint'}`}>
              <span className="text-xl mb-0.5">{tab.icon}</span>
              <span className="text-[11px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
        <ThemeToggle />
      </div>
    </nav>
  );
}
