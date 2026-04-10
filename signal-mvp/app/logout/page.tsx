'use client';

import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    // 모든 signal 쿠키 삭제 (두 가지 방법 모두 적용)
    const cookiesToClear = ['signal_user_id', 'signal_user_name', 'signal_ref'];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0`;
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

    // Next.js router 대신 window.location으로 풀 리로드 (캐시 우회)
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-dim text-sm">
      로그아웃 중...
    </div>
  );
}
