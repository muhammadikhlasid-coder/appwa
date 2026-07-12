'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Smartphone, ListOrdered,
  Flame, Settings, Shield, Zap, ChevronRight, QrCode, Aperture, LogOut
} from 'lucide-react';
import { api } from '@/lib/api';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/sessions', icon: Smartphone, label: 'Sessions' },
  { href: '/queue', icon: ListOrdered, label: 'Live Queue' },
  { href: '/warmup', icon: Flame, label: 'Auto Warm-Up' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [waStatus, setWaStatus] = useState<{ connected: boolean; phone?: string; engine_running?: boolean } | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const d = await api.getWaStatus();
        setWaStatus({ connected: d.wa_connected, phone: d.phone, engine_running: d.engine_running });
      } catch {
        setWaStatus({ connected: false, engine_running: false });
      }
    };
    check();
    const t = setInterval(check, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      gap: '4px',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: '8px 12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px',
          background: '#0d0f14',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 214, 143, 0.3)',
          overflow: 'hidden'
        }}>
          <img src="/logo.png" alt="Safe WA API Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>Safe WA API</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Anti-Ban Gateway</div>
        </div>
      </div>

      {/* Nav label */}
      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '0 12px', marginBottom: '4px' }}>PLATFORM</div>

      {/* Nav Links */}
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span style={{ flex: 1 }}>{label}</span>
            {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
          </Link>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status Indicator — live */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div className={waStatus?.engine_running ? 'animate-glow' : ''} style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: waStatus?.engine_running ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)',
            transition: 'background 0.3s',
          }} />
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {waStatus?.engine_running ? 'Engine Online' : 'Engine Offline'}
          </span>
        </div>
        {waStatus?.engine_running ? (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sistem Gateway aktif</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={11} color="var(--accent-amber)" />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tidak Terhubung</span>
          </div>
        )}
      </div>

      {/* Settings */}
      <Link href="/settings" className="nav-link">
        <Settings size={16} />
        <span>Settings</span>
      </Link>

      {/* Logout */}
      <button 
        onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          window.location.href = '/login';
        }}
        className="nav-link"
        style={{ 
          color: 'var(--accent-red)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          marginTop: '2px'
        }}
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>

      {/* Developer Credit */}
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
        Developer by <strong>M IKHLAS</strong>
      </div>
    </aside>
  );
}
