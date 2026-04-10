'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // 모든 signal 쿠키 삭제
    document.cookie = 'signal_user_id=; path=/; max-age=0';
    document.cookie = 'signal_user_name=; path=/; max-age=0';
    document.cookie = 'signal_ref=; path=/; max-age=0';
    // 랜딩으로
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-dim text-sm">
      로그아웃 중...
    </div>
  );
}
