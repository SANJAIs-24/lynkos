import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCommonStyles } from '../styles';
import { API_BASE } from '../tunnel'; // Import the bridge configuration

export default function Verify({ email, theme }) {
  const navigate = useNavigate();
  const styles = getCommonStyles(theme);

  const [otp, setOtp] = useState('');
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

  async function handleVerify(e) {
    e.preventDefault();
    
    if (!email) {
      setMsg('Error: No email provided. Please go back to signup.');
      return;
    }

    setMsg('Verifying with LYNKOS bridge...');
    
    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true' // Bypass LocalTunnel landing page
        },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMsg('Verified successfully! Taking you to login...');
        // Small delay so the user can see the success message
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMsg(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMsg('Network error: Is the tunnel running?');
    }
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 10 }}>Verify Account</h2>
        <p style={{ marginBottom: 25, fontSize: '0.95rem', opacity: 0.8 }}>
          OTP sent to <br />
          <strong style={{ color: theme === 'dark' ? '#9fb7ff' : '#0b5fff' }}>
            {email || 'your email'}
          </strong>
        </p>

        <form onSubmit={handleVerify}>
          <input 
            style={{ 
              ...styles.input, 
              textAlign: 'center', 
              letterSpacing: '4px', 
              fontSize: '1.2rem' 
            }} 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            placeholder="000000"
            maxLength={6}
            required 
          />
          <button 
            style={{ ...styles.button, marginTop: 20, width: '100%' }} 
            type="submit"
          >
            Verify OTP
          </button>
        </form>

        {msg && (
          <p style={{ 
            marginTop: 15, 
            fontWeight: '500',
            fontSize: '14px',
            color: msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') ? '#ff6b6b' : 'inherit'
          }}>
            {msg}
          </p>
        )}

        <div style={{ marginTop: 30, fontSize: '0.9rem' }}>
          <span>Didn't get a code? </span>
          <Link 
            to="/signup" 
            style={{ 
              color: theme === 'dark' ? '#9fb7ff' : '#0b5fff', 
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}