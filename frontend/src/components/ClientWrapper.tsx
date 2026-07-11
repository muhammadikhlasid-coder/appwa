'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {!isAuthPage && <Sidebar />}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
      </main>
    </div>
  );
}
