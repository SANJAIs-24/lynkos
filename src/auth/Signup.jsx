import React, { useState } from 'react';
import { getCommonStyles } from '../styles';

export default function Signup({ go, setEmailForVerify, theme }) {
  const styles = getCommonStyles(theme);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('sending...');
    try {
      const res = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailForVerify(email);
        go('verify');
      } else {
        setMsg(data.error || 'error');
      }
    } catch (err) {
      setMsg('network error');
    }
  }

  const container = {
    minHeight: '100vh',
    padding: 24,
    background: theme === 'dark' ? '#0b0f14' : '#f6f7fb',
    color: theme === 'dark' ? '#e6eef8' : '#0b1220',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial'
  };

  return (
    <div style={container}>
      <h2>Create account</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label><br />
          <input style={styles.input} value={username} onChange={e=>setUsername(e.target.value)} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Email</label><br />
          <input style={styles.input} value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Password</label><br />
          <input style={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button style={{ ...styles.button, marginTop: 12 }} type="submit">Create account</button>
      </form>

      <p style={{ marginTop: 12 }}>{msg}</p>

      <p>
        Already have an account? <button onClick={() => go('login')} style={{ background: 'transparent', border: 'none', color: theme === 'dark' ? '#9fb7ff' : '#0b5fff', cursor: 'pointer' }}>Login</button>
      </p>
    </div>
  );
}
