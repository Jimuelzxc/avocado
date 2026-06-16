'use client';

import { useEffect } from 'react';
import { useChatStore, Theme } from '../store/chatStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useChatStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}
