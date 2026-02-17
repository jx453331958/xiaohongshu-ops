import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

/**
 * 直接从 localStorage 读 token，避免 zustand hydration 导致多次变化
 */
function getPersistedToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const router = useRouter();
  const storeToken = useAuthStore((s) => s.token);
  const cachedToken = useRef<string | null>(null);

  // 首次渲染时从 localStorage 读取，之后用 store 值
  if (cachedToken.current === null && typeof window !== 'undefined') {
    cachedToken.current = getPersistedToken();
  }
  // store hydrate 完成后更新 cache
  if (storeToken) {
    cachedToken.current = storeToken;
  }

  const token = cachedToken.current;
  const ready = typeof window !== 'undefined';

  useEffect(() => {
    if (ready && !token) {
      router.replace('/login');
    }
  }, [ready, token, router]);

  return { token, ready: ready && !!token };
}
