'use client';

import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useChatStore((s) => s.theme);
  const fontSize = useChatStore((s) => s.fontSize);
  const fontFamily = useChatStore((s) => s.fontFamily);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-family', fontFamily);
  }, [fontFamily]);

  return <>{children}</>;
}
