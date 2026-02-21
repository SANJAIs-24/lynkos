import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';

export default function Forgot({ setEmailForVerify, theme }) {
  const navigate = useNavigate();
  const styles = getCommonStyles(theme);

  // State Management
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [stage, setStage] = useState(0); // 0 = Request OTP, 1 = Reset Password
  const [msg, setMsg] = useState('');

  const containerStyle = {
    minHeight: '100vh',
    width: '100vw',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: theme === 'dark' ? '#0b0f14' : '#f6f7fb',
    color: theme === 'dark' ? '#e6eef8' : '#0b1220',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  async function requestOtp(e) {
    e.preventDefault();
    setMsg('Requesting OTP...');
    try {
      const res = await fetch('http://localhost:5000/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('OTP sent to your email.');
        setStage(1);
        setEmailForVerify(email);
      } else {
        setMsg(data.error || 'Request failed');
      }
    } catch (err) {
      setMsg('Network error.');
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setMsg('Resetting...');
    try {
      const res = await fetch('http://localhost:5000/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password: newPass })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Password reset successful!');
        setTimeout(() => navigate('/login'), 2000); // Redirect after success
      } else {
        setMsg(data.error || 'Reset failed');
      }
    } catch (err) {
      setMsg('Network error.');
    }
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ marginBottom: 20 }}>Recover Account</h2>

        {stage === 0 ? (
          <form onSubmit={requestOtp}>
            <label>Email Address</label>
            <input 
              style={styles.input} 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
            <button style={{ ...styles.button, marginTop: 16, width: '100%' }} type="submit">
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <label>OTP Code</label>
            <input 
              style={styles.input} 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
              required 
            />
            
            <div style={{ marginTop: 15 }}>
              <label>New Password</label>
              <input 
                style={styles.input} 
                type="password" 
                value={newPass} 
                onChange={e => setNewPass(e.target.value)} 
                required 
              />
            </div>
            
            <button style={{ ...styles.button, marginTop: 20, width: '100%' }} type="submit">
              Reset Password
            </button>
          </form>
        )}

        {msg && <p style={{ marginTop: 15, fontSize: '0.9rem', opacity: 0.9 }}>{msg}</p>}

        <div style={{ marginTop: 25, borderTop: '1px solid rgba(128,128,128,0.2)', paddingTop: 15 }}>
          <Link 
            to="/login" 
            style={{ 
              color: theme === 'dark' ? '#9fb7ff' : '#0b5fff', 
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}