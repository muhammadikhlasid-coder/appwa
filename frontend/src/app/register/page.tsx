'use client';
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { UserPlus, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    
    try {
      await api.register({ username, password });
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
      <div className="animate-spin-slow" style={{ position: 'absolute', width: '400px', height: '400px', background: 'var(--accent-blue-dim)', filter: 'blur(80px)', borderRadius: '50%', top: '-100px', right: '-100px', zIndex: 0, opacity: 0.6 }}></div>
      <div className="animate-spin-slow" style={{ position: 'absolute', width: '300px', height: '300px', background: 'var(--accent-purple-dim)', filter: 'blur(80px)', borderRadius: '50%', bottom: '-50px', left: '-50px', zIndex: 0, opacity: 0.6, animationDirection: 'reverse' }}></div>

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
            background: 'var(--accent-blue-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 20px rgba(74, 155, 235, 0.2)'
          }}>
            <UserPlus size={24} color="var(--accent-blue)" />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Sign up to start using Safe WA Gateway
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

        {success && (
          <div className="animate-fade-in" style={{
            background: 'var(--accent-green-dim)',
            border: '1px solid rgba(39,174,96,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <CheckCircle2 size={15} color="var(--accent-green)" />
            <span style={{ fontSize: '13px', color: 'var(--accent-green)' }}>Account created! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Username</label>
            <input 
              type="text" 
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-premium"
            />
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Password</label>
            <input 
              type="password" 
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-premium"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || success || !username || !password}
            style={{ width: '100%', padding: '12px', marginTop: '8px', justifyContent: 'center' }}
          >
            {loading ? 'Creating Account...' : <><UserPlus size={16} /> Register</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '500' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
