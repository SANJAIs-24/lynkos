import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Login from './auth/Login';
import Signup from './auth/Signup';
import Verify from './auth/Verify';
import Forgot from './auth/Forgot';
import Desktop from './Desktop'; // Import the Desktop component
import { getCommonStyles } from './styles';
import { API_BASE, API_HEADERS } from './tunnel'; 

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('lynkos_theme') || 'dark'; } catch { return 'dark'; }
  });
  
  const [emailForVerify, setEmailForVerify] = useState('');
  const [isBackendOnline, setIsBackendOnline] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // Used to detect if we are on the desktop

  // Check if current route is desktop to disable the centering wrapper
  const isDesktopMode = location.pathname === '/desktop';

  useEffect(() => {
    try { localStorage.setItem('lynkos_theme', theme); } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch(`${API_BASE}/login`, { 
      method: 'OPTIONS', 
      headers: API_HEADERS 
    }) 
      .then(() => setIsBackendOnline(true))
      .catch(() => setIsBackendOnline(false));
  }, []);

  const styles = getCommonStyles(theme);

  // Layout for Auth/Landing Pages
  const authWrapperStyle = {
    minHeight: '100vh', 
    width: '100vw', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexDirection: 'column', 
    position: 'relative',
    background: theme === 'dark' ? '#0b0f14' : '#f6f7fb',
    color: theme === 'dark' ? '#e6eef8' : '#0b1220',
    fontFamily: 'system-ui, sans-serif', 
    margin: 0, 
    padding: 0, 
    boxSizing: 'border-box',
    overflow: 'hidden'
  };

  // Layout for the actual OS (Desktop)
  const desktopWrapperStyle = {
    minHeight: '100vh',
    width: '100vw',
    margin: 0,
    padding: 0,
    overflow: 'hidden'
  };

  return (
    <div style={isDesktopMode ? desktopWrapperStyle : authWrapperStyle}>
      
      {/* Only show system status and logo on non-desktop pages */}
      {!isDesktopMode && (
        <div style={{ 
          position: 'absolute', 
          top: 20, 
          right: 20, 
          fontSize: '12px',
          padding: '5px 10px',
          borderRadius: '20px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(128,128,128,0.2)',
          zIndex: 10
        }}>
          System: {isBackendOnline === null ? "⏳ Checking..." : isBackendOnline ? "🟢 Online" : "🔴 Offline"}
        </div>
      )}

      <Routes>
        {/* Landing Page */}
        <Route path="/" element={
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '3.5rem', fontWeight: '800', letterSpacing: '-1px' }}>LYNKOS</h1>
            <p style={{ opacity: 0.6, marginTop: 10 }}>OS Architecture Active</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 30, justifyContent: 'center' }}>
              <button style={styles.button} onClick={() => navigate('/login')}>Enter System</button>
              <button 
                style={styles.smallToggle} 
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              >
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

        {/* The OS Desktop Route */}
        <Route path="/desktop" element={<Desktop />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}