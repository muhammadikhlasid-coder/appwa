import React from 'react';

export default function LoadingLogo() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '60vh',
      width: '100%',
      animation: 'fadeInUp 0.4s ease'
    }}>
      <div style={{
        position: 'relative',
        width: '80px',
        height: '80px',
        marginBottom: '24px'
      }}>
        {/* Animated Glow Backdrop */}
        <div className="animate-glow" style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px', height: '60px',
          background: 'var(--accent-green)',
          borderRadius: '50%',
          filter: 'blur(24px)',
          opacity: 0.6
        }} />
        
        {/* Pulsing Logo */}
        <img 
          src="/logo.png" 
          alt="Loading..." 
          className="animate-pulse-dot"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 214, 143, 0.3)',
            zIndex: 10
          }} 
        />
      </div>
      
      {/* Loading Text */}
      <div style={{
        fontSize: '12px',
        fontWeight: '700',
        letterSpacing: '0.2em',
        color: 'var(--accent-green)',
        textTransform: 'uppercase',
        animation: 'pulse-dot 2s ease-in-out infinite',
        animationDelay: '0.5s'
      }}>
        Initializing...
      </div>
    </div>
  );
}
