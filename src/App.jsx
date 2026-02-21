import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Login from './auth/Login';
import Signup from './auth/Signup';
import Verify from './auth/Verify';
import Forgot from './auth/Forgot';
import { getCommonStyles } from './styles';

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('lynkos_theme') || 'dark'; } catch { return 'dark'; }
  });
  const [emailForVerify, setEmailForVerify] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    try { localStorage.setItem('lynkos_theme', theme); } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const styles = getCommonStyles(theme);

  const rootStyle = {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    background: theme === 'dark' ? '#0b0f14' : '#f6f7fb',
    color: theme === 'dark' ? '#e6eef8' : '#0b1220',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box'
  };

  return (
    <div style={rootStyle}>
      <Routes>
        {/* Welcome Screen */}
        <Route path="/" element={
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '3rem', letterSpacing: '2px' }}>LYNKOS</h1>
            <p style={{ margin: '8px 0 24px 0', opacity: 0.85 }}>A lightweight OS-like experience</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button style={styles.button} onClick={() => navigate('/login')}>
                Continue
              </button>
              <button style={styles.smallToggle} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>
          </div>
        } />

        {/* Auth Routes */}
        <Route path="/login" element={<Login theme={theme} setEmailForVerify={setEmailForVerify} />} />
        <Route path="/signup" element={<Signup theme={theme} setEmailForVerify={setEmailForVerify} />} />
        <Route path="/verify" element={<Verify theme={theme} email={emailForVerify} />} />
        <Route path="/forgot" element={<Forgot theme={theme} setEmailForVerify={setEmailForVerify} />} />

        {/* Redirect unknown URLs back to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}