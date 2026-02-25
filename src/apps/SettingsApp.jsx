/**
 * SettingsApp.jsx
 * ─────────────────
 * Full implementation goes here.
 * Props received from Desktop.jsx:
 *   vfs, setVfs, theme, notify, onOpenFile, onOpenApp, onClose, initialFile, user
 *   (SettingsApp also: currentWallpaper, setWallpaper, setTheme, setTaskbarPos, setIconSize, wallpapers, pinnedApps, setPinnedApps)
 */

import React from 'react';

export default function SettingsApp(props) {
  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d14', color:'rgba(255,255,255,0.5)', flexDirection:'column', gap:12 }}>
      <span style={{ fontSize:48 }}>⚙️</span>
      <span style={{ fontSize:14 }}>SettingsApp — implementation pending</span>
      <span style={{ fontSize:11, opacity:0.4 }}>See apps/SettingsApp.jsx</span>
    </div>
  );
}