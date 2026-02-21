import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';

export default function Login({ theme }) {
  const navigate = useNavigate();
  const styles = getCommonStyles(theme);
  
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const container = {
    minHeight: '100vh',
    width: '100vw',
    boxSizing: 'border-box', // Prevents padding from breaking width
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
    setMsg('logging in...');
    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id, password })
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/desktop'); 
      } else {
        setMsg(data.error || 'error');
      }
    } catch (err) {
      setMsg('network error');
    }
  }

  return (
    <div style={container}>
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
        <h2>Login</h2>
        
        <label>Username or Email</label>
        <input style={styles.input} value={id} onChange={e=>setId(e.target.value)} />

        <div style={{ marginTop: 15 }}>
          <label>Password</label>
          <input style={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>

        <button style={{ ...styles.button, marginTop: 20 }} type="submit">Login</button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
        <Link to="/forgot" style={styles.ghostButton}>Forgot password</Link>
        <Link to="/signup" style={styles.ghostButton}>Create account</Link>
      </div>
    </div>
  );
}