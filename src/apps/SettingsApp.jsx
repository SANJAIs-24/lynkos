/**
 * SettingsApp.jsx — LynkOS Settings v4.0
 * =========================================
 * Props from Desktop.jsx makeAppProps():
 *   currentWallpaper, setWallpaper, wallpapers
 *   theme, setTheme
 *   taskbarPos, setTaskbarPos
 *   iconSize, setIconSize
 *   pinnedApps, setPinnedApps
 *   user, notify, onClose
 */
import React, { useState } from 'react';
import {
  Palette, Monitor, Layout, Info, ChevronRight, Check,
  AlignLeft, AlignBottom, AlignTop, Sliders, User,
  Keyboard, ToggleLeft, ToggleRight, Download, Upload,
  Trash2, RefreshCw, Save, Shield,
} from 'lucide-react';

const ACCENT  = '#4facfe';
const ACCENT2 = '#00f2fe';

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
  { value:'right',  label:'Right',  icon:<AlignLeft size={15}/> },
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

  /* find which wallpaper name is currently active */
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

  /* ── Tab renderers ── */
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

        <Section title="Accent Color">
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', padding:'4px 0' }}>
            {['#4facfe','#00d2d3','#a29bfe','#fd79a8','#00b894','#fdcb6e','#e17055','#74b9ff'].map(c => (
              <div key={c} onClick={() => setAccentColor(c)} style={{
                width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer',
                border:`3px solid ${accentColor === c ? 'white' : 'transparent'}`,
                boxShadow:accentColor === c ? `0 0 0 2px ${c}` : 'none', transition:'all 0.15s',
              }}/>
            ))}
          </div>
        </Section>
      </>
    ),

    desktop: () => (
      <>
        <Section title="Icons">
          <Row label="Icon Size">
            <div style={{ display:'flex', gap:7 }}>
              {ICON_SIZES.map(s => (
                <Pill key={s.value} label={s.label} active={iconSize === s.value}
                  onClick={() => { setIconSize(s.value); notify('info','Icon Size', s.label); }}/>
              ))}
            </div>
          </Row>
          <Row label="Show Desktop on Click" sub="Click empty area hides windows">
            <Toggle on={true} onChange={() => {}}/>
          </Row>
          <Row label="Snap Icons to Grid" sub="Coming soon">
            <Toggle on={false} onChange={() => notify('info','Grid Snap','Coming soon')}/>
          </Row>
        </Section>
        <Section title="Context Menu">
          <Row label="Show New Folder" sub="Ctrl+N shortcut also works">
            <Toggle on={true} onChange={() => {}}/>
          </Row>
          <Row label="Show New File" sub="Ctrl+Alt+N shortcut also works">
            <Toggle on={true} onChange={() => {}}/>
          </Row>
        </Section>
      </>
    ),

    taskbar: () => (
      <>
        <Section title="Position">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {TASKBAR_POSITIONS.map(p => (
              <div key={p.value} onClick={() => { setTaskbarPos(p.value); notify('success','Taskbar','Moved to '+p.label); }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, cursor:'pointer',
                  background:taskbarPos===p.value?'rgba(79,172,254,0.18)':'rgba(255,255,255,0.05)',
                  border:`1px solid ${taskbarPos===p.value?'rgba(79,172,254,0.45)':'rgba(255,255,255,0.07)'}`,
                  color:taskbarPos===p.value?ACCENT:'rgba(255,255,255,0.75)', transition:'all 0.15s' }}>
                {p.icon}
                <span style={{ fontSize:12, fontWeight:500 }}>{p.label}</span>
                {taskbarPos === p.value && <Check size={11} color={ACCENT} style={{ marginLeft:'auto' }}/>}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Behaviour">
          <Row label="Show Pinned Apps"><Toggle on={true} onChange={() => {}}/></Row>
          <Row label="Show Running Apps"><Toggle on={true} onChange={() => {}}/></Row>
          <Row label="Auto-hide" sub="Coming soon"><Toggle on={false} onChange={() => notify('info','Auto-hide','Coming soon')}/></Row>
        </Section>

        <Section title="System Tray">
          <Row label="Clock &amp; Date"><Toggle on={true} onChange={() => {}}/></Row>
          <Row label="Notifications Bell"><Toggle on={true} onChange={() => {}}/></Row>
          <Row label="Volume"><Toggle on={true} onChange={() => {}}/></Row>
          <Row label="Wi-Fi"><Toggle on={true} onChange={() => {}}/></Row>
          <Row label="Battery"><Toggle on={true} onChange={() => {}}/></Row>
        </Section>
      </>
    ),

    account: () => (
      <>
        <Section title="Profile">
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 0',
            borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width:54, height:54, borderRadius:'50%',
              background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:22, color:'#000', flexShrink:0 }}>
              {(user?.name||'U').charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{user?.name||'LynkOS User'}</div>
              <div style={{ fontSize:12, opacity:0.45, marginTop:2 }}>{user?.email||'user@lynkos.com'}</div>
              <div style={{ fontSize:11, opacity:0.32, marginTop:3, display:'flex', alignItems:'center', gap:4 }}>
                <Shield size={10}/> {user?.role||'Administrator'}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Session">
          <Row label="Save Session" sub="Ctrl+S — saves to localStorage">
            <ActionBtn icon={<Save size={13}/>} label="Save Now"
              onClick={() => notify('success','Session Saved','Use Ctrl+S anytime')}/>
          </Row>
        </Section>

        <Section title="Backup">
          <Row label="Export ZIP" sub="Ctrl+Alt+S — full session backup">
            <ActionBtn icon={<Download size={13}/>} label="Export"
              onClick={() => notify('info','Export','Use Ctrl+Alt+S to download ZIP')}/>
          </Row>
          <Row label="Import ZIP" sub="Ctrl+Alt+I — restore from backup">
            <ActionBtn icon={<Upload size={13}/>} label="Import"
              onClick={() => document.getElementById('lynkos-import')?.click()}/>
          </Row>
        </Section>
      </>
    ),

    system: () => (
      <>
        <Section title="Notifications">
          <Row label="Toast Banners" sub="Pop-up notifications for events">
            <Toggle on={notifToasts} onChange={setNotifToasts}/>
          </Row>
          <Row label="Notification Sounds">
            <Toggle on={notifSound} onChange={setNotifSound}/>
          </Row>
        </Section>

        <Section title="Performance">
          <Row label="Reduce Motion" sub="Disable animations">
            <Toggle on={!animations} onChange={v => setAnimations(!v)}/>
          </Row>
        </Section>

        <Section title="Data">
          <Row label="Virtual File System" sub="Stored in browser IndexedDB">
            <span style={{ fontSize:12, opacity:0.45 }}>~Local</span>
          </Row>
          <Row label="Clear All Data" sub="Wipes VFS + session. Cannot undo.">
            <ActionBtn icon={<Trash2 size={13}/>} label="Clear" danger
              onClick={() => {
                if (confirm('Delete ALL LynkOS data? This cannot be undone.')) {
                  localStorage.clear();
                  indexedDB.deleteDatabase('LynkOS_VFS_v4');
                  notify('warning','Data Cleared','Reload to start fresh');
                }
              }}/>
          </Row>
          <Row label="Reset Settings" sub="Restore defaults (keeps files)">
            <ActionBtn icon={<RefreshCw size={13}/>} label="Reset" onClick={resetAll}/>
          </Row>
        </Section>
      </>
    ),

    shortcuts: () => (
      <>
        {[
          { cat:'Desktop', rows:[
            ['Ctrl+S',       'Save session'],
            ['Ctrl+Alt+S',   'Export session ZIP'],
            ['Ctrl+Alt+I',   'Import session ZIP'],
            ['Ctrl+A',       'Open Notification Panel'],
            ['Ctrl Ctrl',    'Toggle Start Menu'],
            ['Ctrl+N',       'New Folder on desktop'],
            ['Ctrl+Alt+N',   'New File on desktop'],
            ['Ctrl+K',       'Search overlay'],
            ['Ctrl+Shift+A', 'Select all icons'],
            ['Delete',       'Delete selected icons'],
            ['Escape',       'Close all panels'],
          ]},
          { cat:'Windows', rows:[
            ['Ctrl+W', 'Close active window'],
            ['Ctrl+M', 'Minimize active window'],
          ]},
          { cat:'File Manager', rows:[
            ['Ctrl+C / X / V', 'Copy / Cut / Paste'],
            ['Ctrl+A',         'Select all'],
            ['Delete',         'Delete'],
            ['F2',             'Rename'],
            ['F5',             'Refresh'],
            ['Ctrl+N',         'New Folder'],
            ['Ctrl+Shift+N',   'New File'],
            ['Backspace',      'Go up'],
            ['Alt+← / →',      'Navigate history'],
          ]},
          { cat:'Text Editor', rows:[
            ['Ctrl+S', 'Save'],
            ['Ctrl+Z', 'Undo'],
            ['Ctrl+Y', 'Redo'],
            ['Ctrl+F', 'Find'],
          ]},
        ].map(({ cat, rows }) => (
          <Section key={cat} title={cat}>
            {rows.map(([kbd, desc]) => (
              <div key={kbd} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize:12, opacity:0.7 }}>{desc}</span>
                <kbd style={{ fontSize:11, fontFamily:'monospace', padding:'3px 8px', borderRadius:5,
                  background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
                  color:'rgba(255,255,255,0.9)', whiteSpace:'nowrap', marginLeft:12 }}>{kbd}</kbd>
              </div>
            ))}
          </Section>
        ))}
      </>
    ),

    about: () => (
      <>
        <Section title="System">
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0',
            borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:48 }}>🌐</div>
            <div>
              <div style={{ fontWeight:700, fontSize:20 }}>LynkOS</div>
              <div style={{ fontSize:12, opacity:0.45, marginTop:3 }}>Version 4.0 · Desktop Environment</div>
              <div style={{ fontSize:11, opacity:0.3, marginTop:4 }}>React + IndexedDB VFS</div>
            </div>
          </div>
        </Section>

        <Section title="Technical">
          {[
            ['Engine',      'React 18 + Vite'],
            ['Window Mgr',  'react-rnd'],
            ['File System', 'IndexedDB (VFS v4)'],
            ['Storage',     'localStorage + IndexedDB'],
            ['Browser',     navigator.userAgent.split(' ').slice(-1)[0]],
            ['Platform',    navigator.platform || 'Web'],
            ['Language',    navigator.language],
            ['Online',      navigator.onLine ? 'Yes' : 'Offline'],
          ].map(([k,v]) => (
            <Row key={k} label={k}>
              <span style={{ fontSize:12, opacity:0.5, textAlign:'right', maxWidth:220,
                wordBreak:'break-all', marginLeft:12 }}>{v}</span>
            </Row>
          ))}
        </Section>

        <Section title="Installed Apps">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {[['🗂️','File Manager'],['📝','Text Editor'],['🎵','Music Player'],
              ['🌐','Browser'],['📄','PDF Viewer'],['🧮','Calculator'],
              ['🖼️','Image Viewer'],['💻','Terminal']].map(([em,name]) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                background:'rgba(255,255,255,0.04)', borderRadius:7,
                border:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize:18 }}>{em}</span>
                <span style={{ fontSize:12, fontWeight:500 }}>{name}</span>
              </div>
            ))}
          </div>
        </Section>
      </>
    ),
  };

  return (
    <div style={{ height:'100%', display:'flex', background:'rgba(10,10,18,0.97)',
      color:'white', fontFamily:"'Segoe UI Variable',-apple-system,sans-serif" }}>

      {/* Sidebar nav */}
      <div style={{ width:196, background:'rgba(255,255,255,0.025)',
        borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'16px 15px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontWeight:700, fontSize:14 }}>Settings</div>
          <div style={{ fontSize:10, opacity:0.35, marginTop:2 }}>LynkOS v4.0</div>
        </div>

        <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 14px',
                cursor:'pointer', fontSize:12, fontWeight:tab===n.id ? 600 : 400,
                background:tab===n.id ? 'rgba(79,172,254,0.15)' : 'transparent',
                borderLeft:`2px solid ${tab===n.id ? ACCENT : 'transparent'}`,
                color:tab===n.id ? ACCENT : 'rgba(255,255,255,0.70)',
                transition:'all 0.12s' }}
              onMouseEnter={e => { if(tab!==n.id) e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if(tab!==n.id) e.currentTarget.style.background='transparent'; }}
            >
              <span style={{ opacity:tab===n.id ? 1 : 0.58, display:'flex' }}>{n.icon}</span>
              {n.label}
              {tab===n.id && <ChevronRight size={11} style={{ marginLeft:'auto', opacity:0.45 }}/>}
            </div>
          ))}
        </nav>

        <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.06)',
          fontSize:10, opacity:0.25 }}>LynkOS · MIT License</div>
      </div>

      {/* Content area */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        {(tabs[tab] || tabs.about)()}
      </div>

      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        button{font-family:inherit;transition:filter 0.15s}
        button:hover{filter:brightness(1.15)}
      `}</style>
    </div>
  );
}
