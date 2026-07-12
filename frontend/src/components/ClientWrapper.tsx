'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Keyboard Shortcuts (Inspect, View Source, Save, Print)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
      }
      if (e.ctrlKey) {
        if (e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) e.preventDefault();
        if (e.key === 'U' || e.key === 'u') e.preventDefault();
        if (e.key === 'S' || e.key === 's') e.preventDefault();
        if (e.key === 'P' || e.key === 'p') e.preventDefault();
      }
      if (e.metaKey) {
        if (e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) e.preventDefault();
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="layout-wrapper" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {!isAuthPage && (
        <>
          <div className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
          <div className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`}>
            <Sidebar />
          </div>
        </>
      )}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {!isAuthPage && (
          <div className="mobile-header">
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} color="var(--text-primary)" />
            </button>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Safe WA API</div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
