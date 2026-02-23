import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';
import { API_BASE } from '../tunnel'; // Import the bridge configuration

export default function Login({ theme }) {
  const navigate = useNavigate();
  const styles = getCommonStyles(theme);
  
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const container = {
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

  async function handleLogin(e) {
    e.preventDefault();
    setMsg('Connecting to LYNKOS backend...');
    
    try {
      // We use the dynamic API_BASE (localhost or LocalTunnel)
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // This header bypasses the LocalTunnel "friendly reminder" page
          'Bypass-Tunnel-Reminder': 'true' 
        },
        body: JSON.stringify({ id, password })
      });

      const data = await res.json();

      if (res.ok) {
        setMsg('Success! Redirecting...');
        // Store username or token if needed before navigating
        navigate('/desktop'); 
      } else {
        // Handle specific errors from your app.py (e.g., 'invalid_credentials')
        setMsg(data.error || 'Login failed');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMsg('Network error: Is the Python server and Tunnel running?');
    }
  }

  return (
    <div style={container}>
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Login</h2>
        
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: '14px' }}>Username or Email</label>
          <input 
            style={styles.input} 
            placeholder="Enter ID"
            value={id} 
            onChange={e => setId(e.target.value)} 
            required
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: '14px' }}>Password</label>
          <input 
            style={styles.input} 
            type="password" 
            placeholder="••••••••"
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required
          />
        </div>

        <button 
          style={{ ...styles.button, marginTop: 20, width: '100%' }} 
          type="submit"
        >
          Login
        </button>
      </form>

      {msg && (
        <p style={{ 
          marginTop: 15, 
          fontSize: '14px', 
          color: msg.includes('error') ? '#ff6b6b' : 'inherit',
          textAlign: 'center'
        }}>
          {msg}
        </p>
      )}

      <div style={{ marginTop: 25, display: 'flex', gap: 15, justifyContent: 'center' }}>
        <Link to="/forgot" style={{ ...styles.ghostButton, fontSize: '13px', textDecoration: 'none' }}>
          Forgot password?
        </Link>
        <Link to="/signup" style={{ ...styles.ghostButton, fontSize: '13px', textDecoration: 'none' }}>
          Create account
        </Link>
      </div>
    </div>
  );
}