'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Smartphone, Plus, QrCode, Wifi, WifiOff, Flame, RefreshCw, MoreVertical, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import { api, type Session } from '@/lib/api';
import LoadingLogo from '@/components/LoadingLogo';

function TrustBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--accent-green)' : score >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div style={{ height: '100%', borderRadius: '10px', width: `${score}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: '600', color, minWidth: '28px' }}>{score}%</span>
    </div>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', instance_name: '', enable_warmup: true });
  const [submitting, setSubmitting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions);
      setError('');
    } catch {
      setError('Backend offline — pastikan uvicorn berjalan di port 8000');
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const t = setInterval(fetchSessions, 5000);
    return () => clearInterval(t);
  }, [fetchSessions]);

  const handleAddSession = async () => {
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    try {
      await api.addSession({ ...form, instance_name: form.instance_name || form.name.toLowerCase().replace(/ /g, '_') });
      await fetchSessions();
      setShowModal(false);
      setForm({ name: '', phone: '', instance_name: '', enable_warmup: true });
    } catch (e) {
      alert('Gagal menambah sesi: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (id: string, name: string) => {
    if (!confirm(`Hapus sesi "${name}" secara permanen?`)) return;
    try {
      await api.deleteSession(id);
      await fetchSessions();
    } catch (e) {
      alert('Gagal menghapus sesi: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const currentSessions = sessions ?? [];
  const total = currentSessions.length;
  const connected = currentSessions.filter(s => s.status === 'connected').length;
  const warming = currentSessions.filter(s => s.status === 'warming').length;
  const disconnected = currentSessions.filter(s => s.status === 'disconnected').length;

  if (loading && !sessions) {
    return <LoadingLogo />;
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Sessions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Manage your WhatsApp numbers & connections</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={fetchSessions}><RefreshCw size={13} /> Refresh</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add New Number</button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ background: 'var(--accent-red-dim)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={15} color="var(--accent-red)" />
          <span style={{ fontSize: '13px', color: 'var(--accent-red)' }}>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: total, color: 'var(--accent-blue)' },
          { label: 'Connected', value: connected, color: 'var(--accent-green)' },
          { label: 'Warming Up', value: warming, color: 'var(--accent-amber)' },
          { label: 'Disconnected', value: disconnected, color: 'var(--accent-red)' },
        ].map((s, i) => (
          <div key={i} className="glass-card animate-fade-in" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{s.label}</span>
            <span style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{loading ? '…' : s.value}</span>
          </div>
        ))}
      </div>

      {/* Sessions Table */}
      <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'visible', animationDelay: '200ms' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>All Sessions</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Live data from API · refresh 5s</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name / Phone</th><th>Status</th><th>Trust Score</th><th>Sent Today</th><th>Proxy</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading sessions...</td></tr>
            ) : currentSessions.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No sessions yet. Click "Add New Number" to start.</td></tr>
            ) : currentSessions.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: s.status === 'connected' ? 'var(--accent-green-dim)' : s.status === 'warming' ? 'var(--accent-amber-dim)' : 'rgba(255,255,255,0.04)',
                    }}>
                      <Smartphone size={15} color={s.status === 'connected' ? 'var(--accent-green)' : s.status === 'warming' ? 'var(--accent-amber)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{s.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{s.phone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {s.status === 'connected' && <span className="badge badge-green"><Wifi size={10} />Connected</span>}
                  {s.status === 'warming' && <span className="badge badge-amber"><Flame size={10} />Warming Up</span>}
                  {s.status === 'disconnected' && <span className="badge badge-red"><WifiOff size={10} />Offline</span>}
                </td>
                <td><TrustBar score={s.trust} /></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{s.sent_today.toLocaleString()}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{s.proxy}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', position: 'relative' }}>
                    {s.status === 'disconnected'
                      ? <button className="btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => window.open('http://localhost:3001/qr', 'qr_window', 'width=400,height=500')}><QrCode size={11} /> Pair</button>
                      : <button className="btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setSelectedSession(s)}><ShieldCheck size={11} /> Details</button>}
                    <button 
                      className="btn-ghost" 
                      style={{ fontSize: '11px', padding: '4px 8px', background: openDropdownId === s.id ? 'var(--bg-card)' : '' }} 
                      onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === s.id ? null : s.id); }}
                    >
                      <MoreVertical size={11} />
                    </button>
                    {openDropdownId === s.id && (
                      <>
                        <div 
                          style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} 
                        />
                        <div className="animate-fade-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', zIndex: 50, boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
                          <button 
                            onClick={() => { setOpenDropdownId(null); handleDeleteSession(s.id, s.name); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%', background: 'transparent', border: 'none', color: 'var(--accent-red)', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-red-dim)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash2 size={13} /> Delete Session
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedSession(null)}>
          <div className="glass-card animate-fade-in" style={{ padding: '28px', width: '420px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--accent-green)" /> Session Details
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Name</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}>{selectedSession.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Phone</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}>{selectedSession.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Status</span>
                <span>
                  {selectedSession.status === 'connected' && <span className="badge badge-green">Connected</span>}
                  {selectedSession.status === 'warming' && <span className="badge badge-amber">Warming Up</span>}
                  {selectedSession.status === 'disconnected' && <span className="badge badge-red">Offline</span>}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Trust Score</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}>{selectedSession.trust}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sent Today</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}>{selectedSession.sent_today}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Auto Warm-up</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}>{selectedSession.warmup ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Proxy</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', fontFamily: 'monospace' }}>{selectedSession.proxy}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Session ID</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '11px', fontFamily: 'monospace' }}>{selectedSession.id}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setSelectedSession(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}>
          <div className="glass-card animate-fade-in" style={{ padding: '28px', width: '420px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>Add New Session</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>Connect a new WhatsApp number to the gateway.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {([['Session Name', 'name', 'e.g. ITSM Notifier'], ['WhatsApp Number', 'phone', '+62 8xx-xxxx-xxxx']] as const).map(([label, key, placeholder]) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '6px' }}>{label}</label>
                  <input type="text" placeholder={placeholder}
                    value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                <input type="checkbox" id="warmup_toggle" checked={form.enable_warmup}
                  onChange={e => setForm(f => ({ ...f, enable_warmup: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="warmup_toggle" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Enable Auto Warm-Up (recommended for new numbers)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddSession} disabled={submitting}>
                {submitting ? 'Adding...' : <><QrCode size={14} /> Add Session</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
