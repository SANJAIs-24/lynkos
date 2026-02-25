import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';
import { API_BASE } from '../tunnel'; 

export default function Login({ theme }) {
  const navigate = useNavigate();
  const styles = getCommonStyles(theme);
  
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  // We removed the 'container' style here because App.jsx now 
  // wraps this component in a perfectly centered flexbox.
  const formWrapper = {
    width: '100%',
    maxWidth: 360,
    padding: '20px',
    boxSizing: 'border-box'
  };

  async function handleLogin(e) {
    e.preventDefault();
    setMsg('Connecting to LYNKOS bridge...');
    
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true' 
        },
        body: JSON.stringify({ id, password })
      });

      const data = await res.json();

      if (res.ok) {
        setMsg('Success! Booting LYNKOS...');
        
        // Save user session to localStorage so Desktop.jsx can read it
        localStorage.setItem('lynkos_user', JSON.stringify(data.user || { name: id }));
        
        // Give the user a moment to see the success message
        setTimeout(() => navigate('/desktop'), 1000); 
      } else {
        setMsg(data.error || 'Login failed');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMsg('Network error: Is the Python server and Tunnel running?');
    }
  }

  return (
    <div style={formWrapper}>
      <form onSubmit={handleLogin}>
        <h2 style={{ marginBottom: 20, textAlign: 'center', letterSpacing: '-1px' }}>Login</h2>
        
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: '14px', opacity: 0.8 }}>Username or Email</label>
          <input 
            style={styles.input} 
            placeholder="Enter ID"
            value={id} 
            onChange={e => setId(e.target.value)} 
            required
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: '14px', opacity: 0.8 }}>Password</label>
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
          Login to System
        </button>
      </form>

      {msg && (
        <p style={{ 
          marginTop: 20, 
          fontSize: '13px', 
          color: msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') ? '#ff6b6b' : '#4facfe',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          {msg}
        </p>
      )}

      <div style={{ 
        marginTop: 30, 
        display: 'flex', 
        gap: 15, 
        justifyContent: 'center',
        borderTop: '1px solid rgba(128,128,128,0.1)',
        paddingTop: 20
      }}>
        <Link to="/forgot" style={{ color: theme === 'dark' ? '#9fb7ff' : '#0b5fff', fontSize: '13px', textDecoration: 'none' }}>
          Forgot password?
        </Link>
        <Link to="/signup" style={{ color: theme === 'dark' ? '#9fb7ff' : '#0b5fff', fontSize: '13px', textDecoration: 'none' }}>
          Create account
        </Link>
      </div>
    </div>
  );
}