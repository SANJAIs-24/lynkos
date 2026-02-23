import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';
import { API_BASE } from '../tunnel'; // Import the bridge configuration

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
    setMsg('Requesting OTP via LYNKOS bridge...');
    try {
      const res = await fetch(`${API_BASE}/forgot`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true' // Bypass LocalTunnel landing page
        },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMsg('OTP sent to your email.');
        setStage(1);
        if (setEmailForVerify) setEmailForVerify(email);
      } else {
        setMsg(data.error || 'Request failed');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMsg('Network error: Is the tunnel running?');
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setMsg('Resetting password...');
    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true' 
        },
        body: JSON.stringify({ email, otp, password: newPass })
      });

      const data = await res.json();

      if (res.ok) {
        setMsg('Password reset successful! Redirecting...');
        setTimeout(() => navigate('/login'), 2000); 
      } else {
        setMsg(data.error || 'Reset failed');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMsg('Network error.');
    }
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Recover Account</h2>

        {stage === 0 ? (
          <form onSubmit={requestOtp}>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '14px' }}>Email Address</label>
              <input 
                style={styles.input} 
                type="email"
                placeholder="name@example.com"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <button style={{ ...styles.button, marginTop: 16, width: '100%' }} type="submit">
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '14px' }}>OTP Code</label>
              <input 
                style={styles.input} 
                placeholder="Enter 6-digit code"
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                required 
              />
            </div>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '14px' }}>New Password</label>
              <input 
                style={styles.input} 
                type="password" 
                placeholder="••••••••"
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

        {msg && (
          <p style={{ 
            marginTop: 15, 
            fontSize: '14px', 
            textAlign: 'center',
            color: msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') ? '#ff6b6b' : 'inherit'
          }}>
            {msg}
          </p>
        )}

        <div style={{ marginTop: 25, borderTop: '1px solid rgba(128,128,128,0.2)', paddingTop: 15, textAlign: 'center' }}>
          <Link 
            to="/login" 
            style={{ 
              color: theme === 'dark' ? '#9fb7ff' : '#0b5fff', 
              textDecoration: 'none',
              fontSize: '13px'
            }}
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}