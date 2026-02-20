import React, { useState } from 'react';
import { getCommonStyles } from '../styles';

export default function Verify({ go, email, theme }) {
  const styles = getCommonStyles(theme);
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState('');

  async function handleVerify(e) {
    e.preventDefault();
    setMsg('verifying...');
    try {
      const res = await fetch('http://localhost:5000/verify-otp', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('verified');
        go('login');
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
      <h2>Verify Account</h2>
      <p>OTP sent to <strong>{email}</strong></p>
      <form onSubmit={handleVerify}>
        <input style={styles.input} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit OTP" />
        <div>
          <button style={{ ...styles.button, marginTop: 12 }} type="submit">Verify</button>
        </div>
      </form>
      <p style={{ marginTop: 12 }}>{msg}</p>
    </div>
  );
}
