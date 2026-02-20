import React, { useEffect, useState } from 'react';
import Login from './auth/Login';
import Signup from './auth/Signup';
import Verify from './auth/Verify';
import Forgot from './auth/Forgot';
//import Desktop from './Desktop';
import { getCommonStyles } from './styles';
//import GoogleDrive from './cloud/GoogleDrive';
export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('lynkos_theme') || 'dark'; } catch { return 'dark'; }
  });
  const [screen, setScreen] = useState('welcome');
  const [emailForVerify, setEmailForVerify] = useState('');

  useEffect(() => {
    try { localStorage.setItem('lynkos_theme', theme); } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const styles = getCommonStyles(theme);

  const rootStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 16,
    background: theme === 'dark' ? '#0b0f14' : '#f6f7fb',
    color: theme === 'dark' ? '#e6eef8' : '#0b1220',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial',
    padding: 24,
    
  };

  if (screen === 'welcome') {
    return (
      <div style={rootStyle}>
        <h1 style={{ margin: 0 }}>LYNKOS</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>A lightweight OS-like experience</p>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button
            style={styles.button}
            onClick={() => setScreen('login')}
            aria-label="Continue to Lynkos"
          >
            Continue
          </button>

          <button
            style={styles.smallToggle}
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? 'Dark: ON' : 'Dark: OFF'}
          </button>
        </div>
      </div>
    );
  }

  const commonProps = { go: setScreen, theme, setTheme, setEmailForVerify };

  if (screen === 'login') return <Login {...commonProps} />;
  if (screen === 'signup') return <Signup {...commonProps} />;
  if (screen === 'verify') return <Verify {...commonProps} email={emailForVerify} />;
  if (screen === 'forgot') return <Forgot {...commonProps} />;
  if (screen === 'desktop') {
    return (
      <Desktop {...commonProps} user={{ name: "Your Name", email: emailForVerify }}>
        {/* Google Drive integration inside Desktop */}
        <GoogleDrive userId="123" />
      </Desktop>
    );
  }
  return null;
}