'use client';

import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    const cookiesToClear = ['signal_user_id', 'signal_user_name', 'signal_ref'];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0`;
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-dim text-sm">
      로그아웃 중...
    </div>
  );
}
