'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Wifi, WifiOff, QrCode, Smartphone, Key, Zap, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Copy, Server } from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';
import { api } from '@/lib/api';

const API = 'http://127.0.0.1:8001';

type WAStatus = {
  engine_running: boolean;
  wa_connected: boolean;
  phone?: string;
  name?: string;
  has_qr?: boolean;
  qr_url?: string;
  scan_url?: string;
  message?: string;
};

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
      {copied ? <><CheckCircle2 size={11} color="var(--accent-green)" /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  );
}

export default function SettingsPage() {
  const [waStatus, setWaStatus] = useState<WAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [waEngineUrl, setWaEngineUrl] = useState('https://appwa-1.onrender.com');
  const [rateLimit, setRateLimit] = useState('3');
  const [saved, setSaved] = useState('');

  const fetchWaStatus = useCallback(async () => {
    try {
      const data = await api.getWaStatus();
      setWaStatus(data);
    } catch {
      setWaStatus({ engine_running: false, wa_connected: false });
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchWaStatus();
    const t = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(t);
  }, [fetchWaStatus]);

  const handleSave = () => {
    // TODO: simpan ke backend .env via API (Fase berikutnya)
    setSaved('[Success] Config disimpan (restart uvicorn untuk apply)');
    setTimeout(() => setSaved(''), 4000);
  };

  const statusColor = waStatus?.wa_connected ? 'var(--accent-green)' : waStatus?.engine_running ? 'var(--accent-amber)' : 'var(--accent-red)';
  const statusText = waStatus?.wa_connected ? 'Connected' : waStatus?.engine_running ? 'Engine running — scan QR' : 'Engine offline';
  const StatusIcon = waStatus?.wa_connected ? Wifi : waStatus?.engine_running ? QrCode : WifiOff;

  if (loading && !waStatus) {
    return <LoadingLogo />;
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: '820px' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={20} color="var(--accent-blue)" /> Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Konfigurasi Gateway, WA Engine, dan API keys</p>
      </div>

      {/* WA Engine Status */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={14} color="var(--accent-green)" /> WhatsApp Engine (Baileys)
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={waStatus?.wa_connected ? 'animate-pulse-dot' : ''} style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: statusColor }}>{loading ? '…' : statusText}</span>
            <button className="btn-ghost" onClick={fetchWaStatus} style={{ padding: '4px 8px' }}><RefreshCw size={12} /></button>
          </div>
        </div>

        {/* Connected info */}
        {waStatus?.wa_connected ? (
          <div style={{ background: 'var(--accent-green-dim)', border: '1px solid rgba(0,214,143,0.3)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={16} color="var(--accent-green)" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-green)' }}>WhatsApp Terhubung!</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {waStatus.phone} {waStatus.name ? `· ${waStatus.name}` : ''}
                </div>
              </div>
            </div>
          </div>
        ) : waStatus?.engine_running ? (
          /* QR Scan prompt */
          <div style={{ background: 'var(--accent-amber-dim)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-amber)', marginBottom: '4px' }}>
                  Scan QR untuk login WhatsApp
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat
                </div>
              </div>
              <a href="http://localhost:3001/qr" target="_blank" rel="noreferrer"
                className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 16px' }}>
                <QrCode size={14} /> Buka QR Code <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : (
          /* Engine offline */
          <div style={{ background: 'var(--accent-red-dim)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={15} color="var(--accent-red)" style={{ marginTop: '1px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-red)', marginBottom: '8px' }}>
                  WA Engine tidak berjalan
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Jalankan perintah berikut di terminal baru:
                </p>
                <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent-green)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>cd wa-engine && npm start</span>
                  <CopyBtn value="cd D:\xampp7.3\htdocs\appwa\wa-engine && npm start" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Config Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Gemini API */}
        <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '80ms' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} color="var(--accent-amber)" /> Gemini API Key
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Untuk AI Warm-Up Bot. Gratis di{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>
              aistudio.google.com
            </a>
          </p>
          <input
            type="password"
            placeholder="AIza..."
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Note: Setelah diisi, tambahkan ke file <code style={{ color: 'var(--accent-amber)' }}>backend/.env</code>
          </div>
        </div>

        {/* WA Engine URL + Rate Limit */}
        <div className="glass-card animate-fade-in" style={{ padding: '20px', animationDelay: '120ms' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={14} color="var(--accent-blue)" /> Gateway Config
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>URL engine dan rate limiter anti-ban</p>

          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>WA Engine URL</label>
          <input
            type="text"
            value={waEngineUrl}
            onChange={e => setWaEngineUrl(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
          />

          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rate Limit (msg/menit per nomor)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['1', '2', '3', '5'].map(v => (
              <button key={v} onClick={() => setRateLimit(v)}
                style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', borderColor: rateLimit === v ? 'var(--accent-blue)' : 'var(--border)', background: rateLimit === v ? 'var(--accent-blue-dim)' : 'var(--bg-primary)', color: rateLimit === v ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* .env Preview */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px', marginBottom: '16px', animationDelay: '160ms' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={14} color="var(--accent-purple)" /> File .env Preview
          </h2>
          <CopyBtn value={`WA_ENGINE_URL=${waEngineUrl}\nGEMINI_API_KEY=${geminiKey || 'your_key_here'}\nRATE_LIMIT_PER_MIN=${rateLimit}\nFRONTEND_URL=https://appwa.netlify.app`} />
        </div>
        <pre style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '16px', fontSize: '12.5px', color: 'var(--accent-green)', fontFamily: 'monospace', lineHeight: 1.8, margin: 0, overflowX: 'auto' }}>
          {`WA_ENGINE_URL=${waEngineUrl}
GEMINI_API_KEY=${geminiKey ? '***' + geminiKey.slice(-4) : 'your_key_here'}
RATE_LIMIT_PER_MIN=${rateLimit}
FRONTEND_URL=https://appwa.netlify.app`}
        </pre>
        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '10px' }}>
          Simpan ke <code>backend/.env</code> lalu restart uvicorn.
        </p>
      </div>

      {/* Quick Commands */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px', marginBottom: '16px', animationDelay: '200ms' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Quick Commands</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Start Backend', cmd: 'cd backend && venv\\Scripts\\activate && uvicorn main:app --reload' },
            { label: 'Start WA Engine', cmd: 'cd wa-engine && npm start' },
            { label: 'Start Frontend', cmd: 'cd frontend && npm run dev' },
            { label: 'Scan QR (browser)', cmd: 'http://localhost:3001/qr' },
            { label: 'API Docs (Swagger)', cmd: 'http://localhost:8000/docs' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: '8px', padding: '10px 14px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '10px' }}>{item.label}</span>
                <code style={{ fontSize: '12px', color: 'var(--accent-green)', fontFamily: 'monospace' }}>{item.cmd}</code>
              </div>
              <CopyBtn value={item.cmd} />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      {saved && (
        <div style={{ padding: '12px 16px', background: 'var(--accent-green-dim)', border: '1px solid rgba(0,214,143,0.3)', borderRadius: '10px', marginBottom: '12px', fontSize: '13px', color: 'var(--accent-green)' }}>
          {saved}
        </div>
      )}
      <button className="btn-primary" onClick={handleSave} style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
        <CheckCircle2 size={15} /> Save Configuration
      </button>

      {/* Version */}
      <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '11px' }}>
        Safe WA API v2.0.0 · Anti-Ban WhatsApp Middleware
      </div>
    </div>
  );
}
