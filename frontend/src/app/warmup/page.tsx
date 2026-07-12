'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Flame, Bot, MessageSquare, Calendar, TrendingUp, Play, Pause, CheckCircle2, Clock, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { api, type WarmupStatus, type WarmupSession } from '@/lib/api';
import LoadingLogo from '@/components/LoadingLogo';

export default function WarmupPage() {
  const [warmupData, setWarmupData] = useState<WarmupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState('');
  const [intensity, setIntensity] = useState<'gentle' | 'normal' | 'aggressive'>('gentle');

  const fetchWarmup = useCallback(async () => {
    try {
      const data = await api.getWarmupStatus();
      setWarmupData(data);
      setError('');
    } catch {
      setError('Backend offline — pastikan uvicorn jalan di port 8000');
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchWarmup();
    const t = setInterval(fetchWarmup, 10000);
    return () => clearInterval(t);
  }, [fetchWarmup]);

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult('');
    try {
      const res = await api.triggerWarmup() as { status: string; active_sessions: number };
      setTriggerResult(`[Success] Warm-up cycle triggered! Active: ${res.active_sessions} session(s)`);
      setTimeout(fetchWarmup, 2000);
    } catch {
      setTriggerResult('[Error] Gagal trigger — backend offline?');
    } finally {
      setTriggering(false);
    }
  };

  const sessions: WarmupSession[] = warmupData?.active ?? [];
  const geminiEnabled = warmupData?.gemini_enabled ?? false;

  const intensityOpts = [
    { key: 'gentle', label: 'Gentle', desc: '3–5 chats/day', color: 'var(--accent-green)' },
    { key: 'normal', label: 'Normal', desc: '6–10 chats/day', color: 'var(--accent-blue)' },
    { key: 'aggressive', label: 'Aggressive', desc: '12–15 chats/day', color: 'var(--accent-amber)' },
  ];

  const chatSamples = [
    { from: 'bot_a', msg: 'Hai, gimana kabarnya hari ini?', time: '10:11' },
    { from: 'target', msg: 'Baik banget! lagi santai. Kamu?', time: '10:13' },
    { from: 'bot_a', msg: 'Alhamdulillah, baru selesai makan siang hehe', time: '10:15' },
    { from: 'target', msg: 'Wah enak dong, makan apa?', time: '10:17' },
    { from: 'bot_a', msg: 'Nasi padang favorit. Btw, udah nonton film terbaru?', time: '10:20' },
  ];

  if (loading && !warmupData) {
    return <LoadingLogo />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="header-actions animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Auto Warm-Up</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>AI-powered bot chatter untuk naikkan Trust Score nomor baru</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={() => window.location.reload()}><RefreshCw size={13} /> Refresh</button>
          <button className="btn-primary" onClick={handleTrigger} disabled={triggering}>
            {triggering ? '⏳ Running...' : <><Play size={14} /> Trigger Cycle Now</>}
          </button>
        </div>
      </div>

      {/* Error/Result Banner */}
      {error && (
        <div style={{ background: 'var(--accent-red-dim)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <AlertCircle size={14} color="var(--accent-red)" /><span style={{ fontSize: '13px', color: 'var(--accent-red)' }}>{error}</span>
        </div>
      )}
      {triggerResult && !error && (
        <div style={{ background: triggerResult.startsWith('[Success]') ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: `1px solid ${triggerResult.startsWith('[Success]') ? 'rgba(0,214,143,0.3)' : 'rgba(242,90,90,0.3)'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: triggerResult.startsWith('[Success]') ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {triggerResult}
        </div>
      )}

      {/* Gemini Status */}
      <div className="glass-card animate-fade-in" style={{ padding: '14px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animationDelay: '60ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={14} color={geminiEnabled ? 'var(--accent-green)' : 'var(--accent-amber)'} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Gemini AI Engine: {geminiEnabled
              ? <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>Active ✓</span>
              : <span style={{ color: 'var(--accent-amber)', fontWeight: '600' }}>Not configured — set GEMINI_API_KEY di .env</span>}
          </span>
        </div>
        {!geminiEnabled && (
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            style={{ fontSize: '12px', color: 'var(--accent-blue)', textDecoration: 'none' }}>Get API Key →</a>
        )}
      </div>

      {/* How It Works */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px', marginBottom: '20px', animationDelay: '100ms' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} color="var(--accent-amber)" /> How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { icon: Bot, label: '1. Register Number', desc: 'Hubungkan nomor WA baru ke gateway', color: 'var(--accent-blue)' },
            { icon: MessageSquare, label: '2. AI Chatter Active', desc: 'Gemini generate percakapan santai otomatis', color: 'var(--accent-purple)' },
            { icon: Calendar, label: '3. 7-Day Program', desc: 'Volume pesan naik bertahap per hari', color: 'var(--accent-amber)' },
            { icon: TrendingUp, label: '4. Trust Score ↑', desc: 'Nomor lulus → siap broadcast penuh', color: 'var(--accent-green)' },
          ].map(({ icon: Icon, label, desc, color }, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color.replace('var(', '').replace(')', '')}1a` }}>
                <Icon size={15} color={color} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="warmup-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Sessions from API */}
          <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '140ms' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Active Warm-Up Sessions</h2>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</p>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Tidak ada sesi warm-up aktif.<br />
                <span style={{ fontSize: '12px' }}>Tambah sesi baru di halaman Sessions dan aktifkan warm-up.</span>
              </div>
            ) : sessions.map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '38px', height: '38px', background: 'var(--accent-amber-dim)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Flame size={18} color="var(--accent-amber)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>{s.phone}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s.phase} phase</div>
                    </div>
                  </div>
                  <span className={`badge ${s.is_graduated ? 'badge-green' : 'badge-amber'}`}>
                    {s.is_graduated ? <><CheckCircle2 size={10} />Graduated</> : <><Flame size={10} />Day {s.day} of 7</>}
                  </span>
                </div>
                {/* Day Progress */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {Array.from({ length: 7 }).map((_, d) => (
                      <div key={d} style={{ flex: 1, height: '6px', borderRadius: '4px', background: d < s.day ? 'var(--accent-amber)' : 'var(--border)', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round((s.day / 7) * 100)}% complete</div>
                </div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'Chats Today', value: `${s.chats_today}/${s.max_today}`, color: 'var(--text-primary)' },
                    { label: 'Trust Score', value: `${s.trust_score}%`, color: s.trust_score >= 70 ? 'var(--accent-green)' : s.trust_score >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)' },
                    { label: 'Total Chats', value: String(s.total_chats), color: 'var(--accent-blue)' },
                  ].map((stat, j) => (
                    <div key={j} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Intensity Config */}
          <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '200ms' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Chat Intensity</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {intensityOpts.map(opt => (
                <button key={opt.key} onClick={() => setIntensity(opt.key as typeof intensity)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', borderColor: intensity === opt.key ? opt.color : 'var(--border)', background: intensity === opt.key ? `rgba(0,0,0,0.15)` : 'var(--bg-primary)' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: intensity === opt.key ? opt.color : 'var(--text-secondary)' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Chat Preview */}
        <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '200ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Sample AI Chat</h2>
            <span className={`badge ${geminiEnabled ? 'badge-green' : 'badge-amber'}`}>
              {geminiEnabled ? <><CheckCircle2 size={9} />Gemini Active</> : <><Clock size={9} />Fallback Mode</>}
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            {geminiEnabled ? 'Percakapan di-generate real-time oleh Gemini AI' : 'Mode fallback — set GEMINI_API_KEY untuk AI real'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {chatSamples.map((chat, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: chat.from === 'bot_a' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', lineHeight: 1.5,
                  background: chat.from === 'bot_a' ? 'var(--accent-blue-dim)' : 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: chat.from === 'bot_a' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{chat.msg}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '3px' }}>{chat.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={11} color="var(--accent-amber)" />
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Scheduler: setiap <span style={{ color: 'var(--accent-amber)', fontWeight: '600' }}>30 menit</span> auto-run
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
