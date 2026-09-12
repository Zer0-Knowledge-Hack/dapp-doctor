'use client';

import { useEffect } from 'react';

/** Registers the shell worker only in production, so local reloads stay fast. */
export function PwaRegister(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js');
  }, []);
  return null;
}
