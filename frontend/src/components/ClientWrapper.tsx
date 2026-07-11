'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Keyboard Shortcuts (Inspect, View Source, Save, Print)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Ctrl combinations
      if (e.ctrlKey) {
        // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Inspect/Console/Element)
        if (e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
        }
        // Ctrl+U (View Source)
        if (e.key === 'U' || e.key === 'u') {
          e.preventDefault();
        }
        // Ctrl+S (Save)
        if (e.key === 'S' || e.key === 's') {
          e.preventDefault();
        }
        // Ctrl+P (Print)
        if (e.key === 'P' || e.key === 'p') {
          e.preventDefault();
        }
      }
      
      // Cmd combinations (for Mac)
      if (e.metaKey) {
        if (e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
        }
        if (e.key === 'U' || e.key === 'u') e.preventDefault();
        if (e.key === 'S' || e.key === 's') e.preventDefault();
        if (e.key === 'P' || e.key === 'p') e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {!isAuthPage && <Sidebar />}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
      </main>
    </div>
  );
}
