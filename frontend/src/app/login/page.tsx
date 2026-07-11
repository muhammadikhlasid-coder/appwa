'use client';
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await api.login({ username, password });
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('username', res.username);
      window.location.href = '/'; // redirect to dashboard and trigger reload
    } catch (err: any) {
      setError(err.message === 'Unauthorized' ? 'Invalid credentials' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      zIndex: 10,
      overflow: 'hidden'
    }}>
      <div className="bg-grid-pattern"></div>
      
      {/* Decorative Blobs */}
      <div className="animate-spin-slow" style={{ position: 'absolute', width: '400px', height: '400px', background: 'var(--accent-green-dim)', filter: 'blur(80px)', borderRadius: '50%', top: '-100px', left: '-100px', zIndex: 0, opacity: 0.6 }}></div>
      <div className="animate-spin-slow" style={{ position: 'absolute', width: '300px', height: '300px', background: 'var(--accent-blue-dim)', filter: 'blur(80px)', borderRadius: '50%', bottom: '-50px', right: '-50px', zIndex: 0, opacity: 0.6, animationDirection: 'reverse' }}></div>

      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'var(--accent-green-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 20px rgba(39, 174, 96, 0.2)'
          }}>
            <ShieldCheck size={24} color="var(--accent-green)" />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Sign in to access Safe WA Gateway
          </p>
        </div>

        {error && (
          <div className="animate-fade-in" style={{
            background: 'var(--accent-red-dim)',
            border: '1px solid rgba(242,90,90,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <AlertCircle size={15} color="var(--accent-red)" />
            <span style={{ fontSize: '13px', color: 'var(--accent-red)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Username</label>
            <input 
              type="text" 
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-premium"
            />
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Password</label>
            <input 
              type="password" 
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-premium"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || !username || !password}
            style={{ width: '100%', padding: '12px', marginTop: '8px', justifyContent: 'center' }}
          >
            {loading ? 'Authenticating...' : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '500' }}>Create Account</Link>
        </div>
      </div>
    </div>
  );
}
