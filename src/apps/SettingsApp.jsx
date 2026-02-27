/**
 * SettingsApp.jsx — LynkOS Settings v4.0 (Fixed)
 */
import React, { useState, useEffect } from 'react';
import {
  Palette, Monitor, Layout, Info, ChevronRight, Check,
  AlignLeft, 
  AlignVerticalJustifyEnd as AlignBottom, // Fixed: Aliased modern icon
  AlignVerticalJustifyStart as AlignTop,  // Fixed: Aliased modern icon
  Sliders, User,
  Keyboard, ToggleLeft, ToggleRight, Download, Upload,
  Trash2, RefreshCw, Save, Shield,
} from 'lucide-react';
import { API_BASE } from '../tunnel'; // Integrated your Cloudflare tunnel logic

const ACCENT  = '#4facfe';
const ACCENT2 = '#00f2fe';

// Using your smart tunnel URL for API calls
const API_URL = `${API_BASE}/api`;

const WALLPAPERS_META = {
  'Vanta Waves'  : { thumb:'linear-gradient(135deg,#0f2027,#2c5364)' },
  'Midnight City': { thumb:'linear-gradient(to bottom,#1a1a2e,#0f3460)' },
  'Aurora'       : { thumb:'linear-gradient(135deg,#0d0221,#1abc9c,#6c3483)' },
  'Cyberpunk'    : { thumb:'linear-gradient(135deg,#0a0a0a,#2d0b5e)' },
  'Sunset'       : { thumb:'linear-gradient(to right,#1a1a2e,#e94560,#f5a623)' },
  'Ocean Blue'   : { thumb:'linear-gradient(180deg,#0c0c1d,#0a3d62)' },
  'Lush Nature'  : { thumb:'linear-gradient(135deg,#2d5a27,#1a3a18)', photo:true },
  'Space'        : { thumb:'linear-gradient(135deg,#0a0a15,#1a1a3e)', photo:true },
  'Forest'       : { thumb:'linear-gradient(135deg,#1a3320,#0d1f12)', photo:true },
  'Mountain'     : { thumb:'linear-gradient(135deg,#2c3e50,#3498db)', photo:true },
};

const TASKBAR_POSITIONS = [
  { value:'bottom', label:'Bottom', icon:<AlignBottom size={15}/> },
  { value:'top',    label:'Top',    icon:<AlignTop size={15}/> },
  { value:'left',   label:'Left',   icon:<AlignLeft size={15}/> },
  { value:'right',  label:'Right',  icon:<AlignLeft size={15} style={{transform: 'rotate(180deg)'}}/> },
];

const ICON_SIZES = [
  { value:'small',  label:'Small'  },
  { value:'medium', label:'Medium' },
  { value:'large',  label:'Large'  },
];

const NAV = [
  { id:'appearance', label:'Appearance', icon:<Palette size={15}/> },
  { id:'desktop',    label:'Desktop',    icon:<Monitor size={15}/> },
  { id:'taskbar',    label:'Taskbar',    icon:<Layout size={15}/> },
  { id:'account',    label:'Account',    icon:<User size={15}/> },
  { id:'system',     label:'System',     icon:<Sliders size={15}/> },
  { id:'shortcuts',  label:'Shortcuts',  icon:<Keyboard size={15}/> },
  { id:'about',      label:'About',      icon:<Info size={15}/> },
];

/* ── Atoms ── */
const Section = ({ title, children }) => (
  <div style={{ marginBottom:26 }}>
    <div style={{ fontSize:10, fontWeight:700, opacity:0.4, letterSpacing:'0.1em',
      textTransform:'uppercase', marginBottom:11 }}>{title}</div>
    {children}
  </div>
);

const Row = ({ label, sub, children }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'11px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
    <div>
      <div style={{ fontSize:13, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11, opacity:0.42, marginTop:2 }}>{sub}</div>}
    </div>
    <div style={{ flexShrink:0, marginLeft:16 }}>{children}</div>
  </div>
);

const Toggle = ({ on, onChange }) => (
  <div onClick={() => onChange(!on)} style={{ cursor:'pointer', display:'flex', alignItems:'center' }}>
    {on
      ? <ToggleRight size={26} color={ACCENT}/>
      : <ToggleLeft  size={26} style={{ opacity:0.35 }}/>
    }
  </div>
);

const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:500,
    background:active?`linear-gradient(135deg,${ACCENT},${ACCENT2})`:'rgba(255,255,255,0.08)',
    color:active?'#000':'rgba(255,255,255,0.75)', transition:'all 0.15s',
  }}>{label}</button>
);

const ActionBtn = ({ icon, label, danger, onClick }) => (
  <button onClick={onClick} style={{
    display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:7,
    background:danger?'rgba(255,59,48,0.14)':'rgba(255,255,255,0.07)',
    border:`1px solid ${danger?'rgba(255,59,48,0.35)':'rgba(255,255,255,0.12)'}`,
    color:danger?'#ff5f56':'white', cursor:'pointer', fontSize:12, fontWeight:500,
  }}>{icon}{label}</button>
);

/* ── Main ── */
export default function SettingsApp({
  currentWallpaper, setWallpaper, wallpapers,
  theme, setTheme,
  taskbarPos, setTaskbarPos,
  iconSize, setIconSize,
  user, notify,
}) {
  const [tab, setTab]               = useState('appearance');
  const [notifToasts, setNotifToasts] = useState(true);
  const [notifSound,  setNotifSound]  = useState(false);
  const [animations,  setAnimations]  = useState(true);
  const [accentColor, setAccentColor] = useState(ACCENT);

  const activeWpName = (() => {
    if (!wallpapers || !currentWallpaper) return 'Vanta Waves';
    return Object.keys(wallpapers).find(k => wallpapers[k] === currentWallpaper) || 'Vanta Waves';
  })();

  const pickWallpaper = name => {
    const wp = wallpapers?.[name];
    if (wp) { setWallpaper(wp); notify('success', 'Wallpaper Changed', name); }
  };

  const resetAll = () => {
    if (wallpapers?.['Vanta Waves']) setWallpaper(wallpapers['Vanta Waves']);
    setTaskbarPos('bottom');
    setIconSize('medium');
    setTheme('dark');
    notify('info', 'Settings Reset', 'Defaults restored');
  };

  const tabs = {
    appearance: () => (
      <>
        <Section title="Wallpaper">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(118px,1fr))', gap:9 }}>
            {Object.entries(WALLPAPERS_META).map(([name, meta]) => {
              const active = name === activeWpName;
              return (
                <div key={name} onClick={() => pickWallpaper(name)} style={{
                  borderRadius:8, overflow:'hidden', cursor:'pointer',
                  border:`2px solid ${active ? ACCENT : 'rgba(255,255,255,0.08)'}`,
                  boxShadow:active ? `0 0 0 2px ${ACCENT}44` : 'none', transition:'all 0.15s',
                }}>
                  <div style={{ height:66, background:meta.thumb, backgroundSize:'cover',
                    backgroundPosition:'center', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {meta.photo && <span style={{ fontSize:18, opacity:0.7 }}>🏔️</span>}
                  </div>
                  <div style={{ padding:'5px 8px', background:'rgba(0,0,0,0.45)',
                    fontSize:11, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ opacity:0.85, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                    {active && <Check size={10} color={ACCENT}/>}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
        <Section title="Color Mode">
          <Row label="Theme">
            <div style={{ display:'flex', gap:7 }}>
              {['dark','light','auto'].map(t => (
                <Pill key={t} label={t.charAt(0).toUpperCase()+t.slice(1)}
                  active={theme === t}
                  onClick={() => { setTheme(t); notify('info','Theme', t + ' mode applied'); }}/>
              ))}
            </div>
          </Row>
          <Row label="Animations" sub="Window and transition effects">
            <Toggle on={animations} onChange={v => { setAnimations(v); notify('info','Animations', v?'On':'Off'); }}/>
          </Row>
        </Section>
      </>
    ),
    desktop: () => (
      <Section title="Icons">
        <Row label="Icon Size">
          <div style={{ display:'flex', gap:7 }}>
            {ICON_SIZES.map(s => (
              <Pill key={s.value} label={s.label} active={iconSize === s.value}
                onClick={() => { setIconSize(s.value); notify('info','Icon Size', s.label); }}/>
            ))}
          </div>
        </Row>
      </Section>
    ),
    taskbar: () => (
      <Section title="Position">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {TASKBAR_POSITIONS.map(p => (
            <div key={p.value} onClick={() => { setTaskbarPos(p.value); notify('success','Taskbar','Moved to '+p.label); }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, cursor:'pointer',
                background:taskbarPos===p.value?'rgba(79,172,254,0.18)':'rgba(255,255,255,0.05)',
                border:`1px solid ${taskbarPos===p.value?'rgba(79,172,254,0.45)':'rgba(255,255,255,0.07)'}`,
                color:taskbarPos===p.value?ACCENT:'rgba(255,255,255,0.75)' }}>
              {p.icon}
              <span style={{ fontSize:12, fontWeight:500 }}>{p.label}</span>
              {taskbarPos === p.value && <Check size={11} color={ACCENT} style={{ marginLeft:'auto' }}/>}
            </div>
          ))}
        </div>
      </Section>
    ),
    account: () => (
       <Section title="Profile">
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 0' }}>
            <div style={{ width:54, height:54, borderRadius:'50%', background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:22, color:'#000' }}>
              {(user?.name||'U').charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{user?.name||'LynkOS User'}</div>
              <div style={{ fontSize:12, opacity:0.45 }}>{user?.email||'user@lynkos.com'}</div>
            </div>
          </div>
          <Row label="Backend URL" sub="Current API connectivity">
             <code style={{fontSize: 10, color: ACCENT}}>{API_URL}</code>
          </Row>
       </Section>
    ),
    about: () => (
      <Section title="System">
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0' }}>
          <div style={{ fontSize:48 }}>🌐</div>
          <div>
            <div style={{ fontWeight:700, fontSize:20 }}>LynkOS</div>
            <div style={{ fontSize:12, opacity:0.45 }}>Version 4.0 · Cloud Integrated</div>
          </div>
        </div>
      </Section>
    )
  };

  return (
    <div style={{ height:'100%', display:'flex', background:'rgba(10,10,18,0.97)', color:'white' }}>
      <div style={{ width:196, background:'rgba(255,255,255,0.025)', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 15px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontWeight:700, fontSize:14 }}>Settings</div>
        </div>
        <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 14px', cursor:'pointer', fontSize:12,
                background:tab===n.id ? 'rgba(79,172,254,0.15)' : 'transparent',
                borderLeft:`2px solid ${tab===n.id ? ACCENT : 'transparent'}`,
                color:tab===n.id ? ACCENT : 'rgba(255,255,255,0.70)' }}>
              {n.icon} {n.label}
            </div>
          ))}
        </nav>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        {(tabs[tab] || tabs.about)()}
      </div>
    </div>
  );
}