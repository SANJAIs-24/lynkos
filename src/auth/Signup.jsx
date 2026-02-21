import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';

export default function Signup({ theme, setEmailForVerify }) {
  const navigate = useNavigate(); // Hook for navigation
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
    setMsg('Creating account...');
    try {
      const res = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        setEmailForVerify(email); // Set the email for the verify screen
        navigate('/verify');      // Go to the verify route
      } else {
        setMsg(data.error || 'Signup failed');
      }
    } catch (err) {
      setMsg('Network error. Is the server running?');
    }
  }

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ marginBottom: 20 }}>Create Account</h2>
        
        <div>
          <label>Username</label><br />
          <input 
            style={styles.input} 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <label>Email</label><br />
          <input 
            style={styles.input} 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <label>Password</label><br />
          <input 
            style={styles.input} 
            type="password" 
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

      {msg && <p style={{ marginTop: 16, color: '#ff4d4d' }}>{msg}</p>}

      <p style={{ marginTop: 20, fontSize: '0.9rem' }}>
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