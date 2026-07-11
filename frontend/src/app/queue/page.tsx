'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, Activity, Loader2, Ban, ArrowUpRight, Pause, Play, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { api, type QueueStatus, type PendingMessage, type SentMessage } from '@/lib/api';
import LoadingLogo from '@/components/LoadingLogo';

function StatusIcon({ status }: { status: string }) {
  if (status === 'processing') return <Loader2 size={14} color="var(--accent-blue)" className="animate-spin-slow" />;
  if (status === 'queued') return <Clock size={14} color="var(--accent-amber)" />;
  if (status === 'sent') return <CheckCircle2 size={14} color="var(--accent-green)" />;
  if (status === 'failed') return <Ban size={14} color="var(--accent-red)" />;
  return null;
}

export default function QueuePage() {
  const [queueData, setQueueData] = useState<QueueStatus | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testPhone, setTestPhone] = useState('+62812-3456-7890');
  const [testMsg, setTestMsg] = useState('Halo! Ini adalah pesan uji coba dari Safe WA Gateway. Pesan ini dikirim dengan perlindungan Anti-Ban lengkap termasuk ZWC injection dan typing simulator.');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');

  const fetchQueue = useCallback(async () => {
    if (paused) return;
    try {
      const data = await api.getQueueStatus();
      setQueueData(data);
      setError('');
    } catch {
      setError('Backend offline');
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, [paused]);

  useEffect(() => {
    fetchQueue();
    const t = setInterval(fetchQueue, 2000);
    return () => clearInterval(t);
  }, [fetchQueue]);

  const handleSendTest = async () => {
    if (!testPhone || !testMsg) return;
    setSending(true);
    setSendResult('');
    try {
      const sessionRes = await api.getSessions();
      if (sessionRes.sessions.length === 0) {
        throw new Error("Tidak ada sesi WhatsApp. Silakan tambah sesi di menu Sessions.");
      }
      const session_id = sessionRes.sessions[0].id;
      
      const res = await api.sendMessage({ phone: testPhone, message: testMsg, session_id: session_id }) as {
        message_id: string; chunks: number; estimated_delivery_sec: string;
      };
      setSendResult(`[Success] Queued! ID: ${res.message_id} | ${res.chunks} chunk(s) | ETA: ${res.estimated_delivery_sec}s`);
      setTimeout(fetchQueue, 1000);
    } catch (e) {
      setSendResult(`[Error]: ${e instanceof Error ? e.message : 'Backend offline'}`);
    } finally {
      setSending(false);
    }
  };

  const pending: PendingMessage[] = queueData?.pending_messages ?? [];
  const recentSent: SentMessage[] = queueData?.recent_sent ?? [];

  if (loading && !queueData) {
    return <LoadingLogo />;
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Live Queue Monitor</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Real-time · Drip-feed · Max 3 msg/min per session</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={() => setPaused(p => !p)}>
            {paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
          </button>
          <button className="btn-ghost" onClick={fetchQueue}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--accent-red-dim)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <AlertCircle size={14} color="var(--accent-red)" />
          <span style={{ fontSize: '13px', color: 'var(--accent-red)' }}>Backend offline — pastikan uvicorn jalan di port 8000</span>
        </div>
      )}

      {/* Stats */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Processing', value: pending.filter(p => p.status === 'processing').length, color: 'var(--accent-blue)' },
          { label: 'Queued', value: pending.filter(p => p.status === 'queued').length, color: 'var(--accent-amber)' },
          { label: 'Total Sent', value: queueData?.total_sent ?? 0, color: 'var(--accent-green)' },
          { label: 'Failed', value: queueData?.total_failed ?? 0, color: 'var(--accent-red)' },
        ].map((s, i) => (
          <div key={i} className="glass-card animate-fade-in" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</span>
            <span style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{loading ? '…' : s.value}</span>
          </div>
        ))}
      </div>

      {/* Test Send Panel */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px', marginBottom: '16px', animationDelay: '160ms' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Test Send Message</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Phone Number</label>
            <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Message (panjang = auto-chunk)</label>
            <input value={testMsg} onChange={e => setTestMsg(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
          </div>
          <button className="btn-primary" onClick={handleSendTest} disabled={sending} style={{ whiteSpace: 'nowrap' }}>
            {sending ? 'Sending...' : 'Send via Gateway'}
          </button>
        </div>
        {sendResult && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '13px', color: sendResult.startsWith('[Success]') ? 'var(--accent-green)' : 'var(--accent-red)', border: '1px solid var(--border)' }}>
            {sendResult}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Active Queue */}
        <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '200ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Active Queue</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="animate-pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: paused ? 'var(--accent-amber)' : 'var(--accent-green)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{paused ? 'Paused' : 'Live (2s)'}</span>
            </div>
          </div>
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Queue kosong. Gunakan "Test Send" di atas untuk mencoba!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pending.map((item) => (
                <div key={item.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusIcon status={item.status} />
                      <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.phone}</span>
                    </div>
                    <span className={`badge ${item.status === 'processing' ? 'badge-blue' : 'badge-amber'}`}>{item.status}</span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>{item.preview}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{item.chunks} chunk{item.chunks > 1 ? 's' : ''}</span>
                    {item.retries > 0 && <span style={{ color: 'var(--accent-amber)' }}>↩ retry {item.retries}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sent Log */}
        <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '260ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Sent Log</h2>
            <button className="btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>Export <ArrowUpRight size={12} /></button>
          </div>
          {recentSent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Belum ada pesan terkirim.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {recentSent.map((item, i) => (
                <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.to}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sent_at}</span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>{item.text}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge badge-green"><CheckCircle2 size={9} />Sent</span>
                    {item.zwc && <span className="badge badge-purple"><Activity size={9} />ZWC ✓</span>}
                    {item.simulated && <span className="badge badge-amber" style={{ fontSize: '10px' }}>SIM</span>}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {item.chunk} · <span style={{ color: 'var(--accent-green)' }}>{item.delay_ms}ms</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
