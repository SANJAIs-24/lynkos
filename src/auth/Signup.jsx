import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';
import { API_BASE } from '../tunnel'; // Import the bridge configuration

export default function Signup({ theme, setEmailForVerify }) {
  const navigate = useNavigate(); 
  const styles = getCommonStyles(theme);

  // State Management
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('Connecting to LYNKOS bridge...');
    
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true' // Vital for LocalTunnel compatibility
        },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setEmailForVerify(email); // Pass email to the parent state for the Verify screen
        navigate('/verify');      // Proceed to OTP verification
      } else {
        setMsg(data.error || 'Signup failed');
      }
    } catch (err) {
      console.error("Signup error:", err);
      setMsg('Network error: Is the Python server and Tunnel running?');
    }
  }

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Create Account</h2>
        
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: '14px' }}>Username</label>
          <input 
            style={styles.input} 
            placeholder="Choose a username"
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
          />
        </div>

        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: '14px' }}>Email</label>
          <input 
            style={styles.input} 
            type="email" 
            placeholder="name@example.com"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div style={{ marginBottom: 15 }}>
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
          style={{ ...styles.button, marginTop: 24, width: '100%' }} 
          type="submit"
        >
          Sign Up
        </button>
      </form>

      {msg && (
        <p style={{ 
          marginTop: 16, 
          fontSize: '14px',
          textAlign: 'center',
          color: msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') ? '#ff6b6b' : 'inherit' 
        }}>
          {msg}
        </p>
      )}

      <p style={{ marginTop: 20, fontSize: '0.9rem', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link 
          to="/login" 
          style={{ 
            color: theme === 'dark' ? '#9fb7ff' : '#0b5fff', 
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Login
        </Link>
      </p>
    </div>
  );
}