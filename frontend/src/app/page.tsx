'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, MessageSquare, Shield, Users, TrendingUp, Clock, CheckCircle2, ArrowUpRight, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { api, type DashboardStats } from '@/lib/api';
import LoadingLogo from '@/components/LoadingLogo';

function statusBadge(s: string) {
  if (s === 'sent') return <span className="badge badge-green"><CheckCircle2 size={10} />Sent</span>;
  if (s === 'queued') return <span className="badge badge-amber"><Clock size={10} />Queued</span>;
  if (s === 'processing') return <span className="badge badge-blue"><Activity size={10} />Processing</span>;
  return null;
}

export default function DashboardPage() {
  const [apiStats, setApiStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setApiStats(data);
      setApiOnline(true);
      setLastRefresh(new Date().toLocaleTimeString('id-ID'));
    } catch {
      setApiOnline(false);
    } finally {
      // Simulate slightly longer loading for aesthetic appeal
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 5000);
    return () => clearInterval(t);
  }, [fetchStats]);

  const statCards = [
    {
      label: 'Active Sessions', icon: Users,
      value: apiStats ? String(apiStats.active_sessions) : '—',
      delta: apiStats ? `+${apiStats.warming_sessions} warming` : '…',
      accent: 'var(--accent-blue)', accentDim: 'var(--accent-blue-dim)',
    },
    {
      label: 'Messages Sent', icon: MessageSquare,
      value: apiStats ? apiStats.messages_sent_today.toLocaleString() : '—',
      delta: apiStats ? `${apiStats.total_sent} delivered` : '…',
      accent: 'var(--accent-green)', accentDim: 'var(--accent-green-dim)',
    },
    {
      label: 'Success Rate', icon: Shield,
      value: apiStats ? `${apiStats.success_rate}%` : '—',
      delta: '↑ stable',
      accent: 'var(--accent-purple)', accentDim: 'var(--accent-purple-dim)',
    },
    {
      label: 'In Queue', icon: Activity,
      value: apiStats ? String(apiStats.queue_depth) : '—',
      delta: apiStats ? `${apiStats.total_failed} failed` : '…',
      accent: 'var(--accent-amber)', accentDim: 'var(--accent-amber-dim)',
    },
  ];

  const middleware = (apiStats?.middleware ?? {}) as Record<string, boolean | string>;

  if (loading && !apiStats) {
    return <LoadingLogo />;
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Dashboard Overview
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {apiOnline
                ? <><Wifi size={12} color="var(--accent-green)" /><span style={{ fontSize: '12px', color: 'var(--accent-green)' }}>API Online</span></>
                : <><WifiOff size={12} color="var(--accent-red)" /><span style={{ fontSize: '12px', color: 'var(--accent-red)' }}>API Offline — start uvicorn</span></>
              }
            </div>
            {lastRefresh && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· Updated {lastRefresh}</span>}
            {apiStats?.gemini_configured && <span className="badge badge-purple" style={{ fontSize: '10px' }}>Gemini ✓</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn-primary" onClick={() => window.location.href = '/sessions'}>
            <TrendingUp size={14} /> + Add Session
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: `${i * 60}ms`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '38px', height: '38px', background: s.accentDim, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={s.accent} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600' }}>{s.delta}</span>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: loading ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>

        {/* Activity Log */}
        <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '280ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Message Activity Log</h2>
            <button className="btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>View All <ArrowUpRight size={12} /></button>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>Phone</th><th>Preview</th><th>Status</th><th>Delay</th></tr>
            </thead>
            <tbody>
              {(apiStats?.recent_sent?.length
                ? apiStats.recent_sent
                : [{ sent_at: '—', to: '—', text: 'No messages yet.', delay_ms: null }]
              ).map((log, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>{log.sent_at}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{log.to}</td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.text}</td>
                  <td>{statusBadge('sent')}</td>
                  <td style={{ color: 'var(--accent-green)', fontFamily: 'monospace' }}>
                    {log.delay_ms ? `${log.delay_ms}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Queue Stats */}
          <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '340ms' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Queue Status</h2>
              <span className="badge badge-blue">{apiStats?.queue_depth ?? 0} pending</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {[
                { label: 'Total Queued', value: apiStats?.total_queued ?? 0, color: 'var(--text-primary)' },
                { label: 'Total Sent', value: apiStats?.total_sent ?? 0, color: 'var(--accent-green)' },
                { label: 'Failed', value: apiStats?.total_failed ?? 0, color: 'var(--accent-red)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Anti-Ban Status */}
          <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '400ms' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Anti-Ban Middleware</h2>
            {[
              { label: 'ZWC Injector', key: 'zwc_injector' },
              { label: 'Auto Chunker', key: 'auto_chunker' },
              { label: 'Typing Sim', key: 'typing_simulator' },
              { label: 'Rate Limiter', key: 'rate_limiter' },
              { label: 'Proxy Pool', key: 'proxy_manager' },
            ].map((item, i) => {
              const val = middleware[item.key];
              const active = val === true;
              const label = typeof val === 'string' ? val : active ? 'ACTIVE' : 'PENDING';
              const color = active ? 'var(--accent-green)' : typeof val === 'string' ? 'var(--accent-blue)' : 'var(--accent-amber)';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className={active ? 'animate-pulse-dot' : ''} style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '11px', fontWeight: '600', color }}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
