/**
 * Settings App for LynkOS
 */

// import React, { useState } from 'react';
// import { Cloud, Palette, Info } from 'lucide-react';
// import axios from 'axios';
// import './Apps.css';

// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
import React, { useState } from 'react';
import { Cloud, Palette, Info } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../tunnel'; // Import our smart URL switcher
import './Apps.css';

// Use the smart URL from tunnel.js
const API_URL = `${API_BASE}/api`;
const WALLPAPERS = {
  "Vanta Waves": "vanta",
  "Midnight City": "linear-gradient(to bottom, #232526, #414345)",
  "Ocean Blue": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "Sunset": "linear-gradient(to right, #fa709a 0%, #fee140 100%)"
};

const Settings = ({ currentWallpaper, setWallpaper, theme, setTheme }) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [driveConnected, setDriveConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const connectGoogleDrive = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/oauth/start`, {
        withCredentials: true
      });
      
      const authUrl = response.data.auth_url;
      const popup = window.open(authUrl, 'Google Drive Auth', 'width=600,height=700');
      
      // Check if popup closed
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          checkConnectionStatus();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to connect Drive:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/oauth/status`, {
        withCredentials: true
      });
      setDriveConnected(response.data.connected);
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  React.useEffect(() => {
    checkConnectionStatus();
  }, []);

  return (
    <div className="app-container">
      <div className="settings-sidebar">
        <button 
          className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          <Palette size={18} />
          Appearance
        </button>
        <button 
          className={`settings-tab ${activeTab === 'cloud' ? 'active' : ''}`}
          onClick={() => setActiveTab('cloud')}
        >
          <Cloud size={18} />
          Cloud Storage
        </button>
        <button 
          className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <Info size={18} />
          About
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h3>Personalization</h3>
            <p className="settings-subtitle">Choose your desktop background</p>
            
            <div className="wallpaper-grid">
              {Object.keys(WALLPAPERS).map(name => (
                <div 
                  key={name}
                  onClick={() => setWallpaper(name)}
                  className={`wallpaper-option ${currentWallpaper === name ? 'selected' : ''}`}
                  style={{
                    background: WALLPAPERS[name] === 'vanta' 
                      ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' 
                      : WALLPAPERS[name],
                    backgroundSize: 'cover'
                  }}
                >
                  <span className="wallpaper-name">{name}</span>
                  {currentWallpaper === name && (
                    <div className="wallpaper-checkmark">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cloud' && (
          <div className="settings-section">
            <h3>Google Drive Integration</h3>
            <p className="settings-subtitle">
              Connect your Google Drive to save desktop state and files
            </p>

            {driveConnected ? (
              <div className="connection-status connected">
                <Cloud size={24} />
                <div>
                  <strong>Connected to Google Drive</strong>
                  <p>Your desktop state is being synced</p>
                </div>
              </div>
            ) : (
              <div className="connection-status disconnected">
                <Cloud size={24} />
                <div>
                  <strong>Not Connected</strong>
                  <p>Connect to enable cloud features</p>
                </div>
                <button 
                  onClick={connectGoogleDrive}
                  disabled={loading}
                  className="connect-btn"
                >
                  {loading ? 'Connecting...' : 'Connect Drive'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="settings-section">
            <h3>System Information</h3>
            
            <div className="about-info">
              <div className="info-row">
                <span>OS</span>
                <strong>LynkOS v1.0</strong>
              </div>
              <div className="info-row">
                <span>Browser</span>
                <strong>{navigator.userAgent.split(' ').slice(-2).join(' ')}</strong>
              </div>
              <div className="info-row">
                <span>Storage</span>
                <strong>IndexedDB + Google Drive</strong>
              </div>
              <div className="info-row">
                <span>Theme</span>
                <strong>{theme}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
