import React, { useState } from 'react';
import { getCommonStyles } from '../styles';

export default function Login({ go, theme }) {
  const styles = getCommonStyles(theme);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const container = {
    minHeight: '100vh',
    padding: 24,
    background: theme === 'dark' ? '#0b0f14' : '#f6f7fb',
    color: theme === 'dark' ? '#e6eef8' : '#0b1220',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial'
  };

  async function handleLogin(e) {
    e.preventDefault();
    setMsg('logging in...');
    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id, password })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('welcome ' + data.username);
        go('desktop');
      } else {
        setMsg(data.error || 'error');
      }
    } catch (err) {
      setMsg('network error');
    }
  }

  return (
    <div style={container}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div style={{ maxWidth: 360 }}>
          <label>Username or Email</label><br />
          <input style={styles.input} value={id} onChange={e=>setId(e.target.value)} />
        </div>

        <div style={{ marginTop: 10, maxWidth: 360 }}>
          <label>Password</label><br />
          <input style={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <button style={styles.button} type="submit">Login</button>
        </div>
      </form>

      <p style={{ marginTop: 12 }}>{msg}</p>

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => go('forgot')} style={styles.ghostButton}>Forgot password</button>
        <button onClick={() => go('signup')} style={styles.ghostButton}>Create account</button>
      </div>
    </div>
  );
}
