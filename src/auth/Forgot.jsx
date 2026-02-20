// FE/src/Forgot.jsx
import React, { useState } from 'react';
import { getCommonStyles } from '../styles';

export default function Forgot({ go, setEmailForVerify, theme }) {
  const styles = getCommonStyles(theme);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [stage, setStage] = useState(0);
  const [msg, setMsg] = useState('');

  async function requestOtp(e) {
    e.preventDefault();
    setMsg('requesting otp...');
    try {
      const res = await fetch('http://localhost:5000/forgot', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('otp_sent');
        setStage(1);
        setEmailForVerify(email);
      } else {
        setMsg(data.error || 'error');
      }
    } catch (err) {
      setMsg('network error');
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setMsg('resetting...');
    try {
      const res = await fetch('http://localhost:5000/reset-password', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, otp, password: newPass })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('password_reset');
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
      <h2>Recover Account</h2>

      {stage === 0 && (
        <form onSubmit={requestOtp}>
          <label>Email</label><br />
          <input style={styles.input} value={email} onChange={e=>setEmail(e.target.value)} />
          <div><button style={{ ...styles.button, marginTop: 12 }} type="submit">Send OTP</button></div>
        </form>
      )}

      {stage === 1 && (
        <form onSubmit={resetPassword}>
          <label>OTP</label><br />
          <input style={styles.input} value={otp} onChange={e=>setOtp(e.target.value)} />
          <label style={{ marginTop: 8 }}>New Password</label><br />
          <input style={styles.input} type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} />
          <div><button style={{ ...styles.button, marginTop: 12 }} type="submit">Reset Password</button></div>
        </form>
      )}

      <p style={{ marginTop: 12 }}>{msg}</p>
    </div>
  );
}
