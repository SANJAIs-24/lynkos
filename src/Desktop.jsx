/**
 * Desktop.jsx — LynkOS Core Desktop Environment v2.1
 * ====================================================
 * Single file for ALL OS-level functionality.
 * Apps live in ./apps/*.jsx and receive props via makeAppProps().
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Folder, FileText, Globe, Settings, Volume2, Volume, VolumeX,
  Battery, Wifi, WifiOff, Search, X, ChevronLeft, ChevronRight,
  Trash2, Edit3, Info, RefreshCw, RotateCw,
  FolderPlus, FilePlus,
  Power, Lock, Palette,
  Maximize, Minimize, HardDrive, Cloud, UploadCloud, DownloadCloud,
  Layers, XSquare,
  File, Image as ImageIcon, Music,
  Pin, PinOff, Bell, Sun,
  Bluetooth, Airplay,
  LayoutGrid, Save, FolderOpen,
  AlertCircle, CheckCircle, AlertTriangle,
  Copy,
} from 'lucide-react';

// ─── App imports ──────────────────────────────────────────────────────────────
import FileManager   from './apps/FileManager.jsx';
import TextEditor    from './apps/TextEditor.jsx';
import MusicPlayer   from './apps/MusicPlayer.jsx';
import Browser       from './apps/Browser.jsx';
import SettingsApp   from './apps/SettingsApp.jsx';
import PdfViewer     from './apps/PdfViewer.jsx';
import CalculatorApp from './apps/Calculator.jsx';
import ImageViewer   from './apps/ImageViewer.jsx';
import Terminal      from './apps/Terminal.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT       = '#4facfe';
const DARK_GLASS   = 'rgba(14, 14, 22, 0.85)';
const SESSION_KEY  = 'lynkos_v2_session';
const AUTO_SAVE_MS = 30_000;
const TASKBAR_H    = 46;
const TASKBAR_W    = 52;

const WALLPAPERS = {
  'Vanta Waves'  : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'Midnight City': 'linear-gradient(to bottom, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'Aurora'       : 'linear-gradient(135deg, #0d0221 0%, #0a3d62 30%, #1abc9c 70%, #6c3483 100%)',
  'Cyberpunk'    : 'linear-gradient(135deg, #0a0a0a 0%, #1a0533 40%, #2d0b5e 70%, #ff006620 100%)',
  'Sunset'       : 'linear-gradient(to right, #1a1a2e 0%, #16213e 30%, #e94560 70%, #f5a623 100%)',
  'Ocean Blue'   : 'linear-gradient(180deg, #0c0c1d 0%, #0a3d62 50%, #1abc9c40 100%)',
  'Lush Nature'  : "url('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1950&q=80')",
  'Space'        : "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=2072&q=80')",
  'Forest'       : "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2072&q=80')",
  'Mountain'     : "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2072&q=80')",
};

// ─── App Registry ─────────────────────────────────────────────────────────────
const APP_REGISTRY = {
  filemanager : { id:'filemanager', title:'File Manager',  emoji:'🗂️',  component:FileManager,   w:900,  h:620, minW:600, minH:400, color:'#4facfe' },
  texteditor  : { id:'texteditor',  title:'Text Editor',   emoji:'📝',  component:TextEditor,    w:900,  h:640, minW:500, minH:400, color:'#a8edea' },
  musicplayer : { id:'musicplayer', title:'Music Player',  emoji:'🎵',  component:MusicPlayer,   w:420,  h:560, minW:340, minH:400, color:'#e1b12c' },
  browser     : { id:'browser',     title:'Browser',       emoji:'🌐',  component:Browser,       w:1100, h:720, minW:700, minH:500, color:'#00a8ff' },
  settings    : { id:'settings',    title:'Settings',      emoji:'⚙️',  component:SettingsApp,   w:860,  h:640, minW:600, minH:500, color:'#dcdde1' },
  pdf         : { id:'pdf',         title:'PDF Viewer',    emoji:'📄',  component:PdfViewer,     w:960,  h:720, minW:600, minH:500, color:'#9c88ff' },
  calculator  : { id:'calculator',  title:'Calculator',    emoji:'🧮',  component:CalculatorApp, w:320,  h:520, minW:320, minH:480, color:'#ffeaa7' },
  imageviewer : { id:'imageviewer', title:'Image Viewer',  emoji:'🖼️',  component:ImageViewer,   w:800,  h:620, minW:500, minH:400, color:'#00d2d3' },
  terminal    : { id:'terminal',    title:'Terminal',      emoji:'💻',  component:Terminal,      w:780,  h:500, minW:500, minH:350, color:'#00ff00' },
};

const EXT_MAP = {
  mp3:'musicplayer', wav:'musicplayer', ogg:'musicplayer', flac:'musicplayer',
  jpg:'imageviewer', jpeg:'imageviewer', png:'imageviewer', gif:'imageviewer', webp:'imageviewer',
  txt:'texteditor', md:'texteditor', js:'texteditor', jsx:'texteditor', ts:'texteditor',
  json:'texteditor', html:'texteditor', css:'texteditor', py:'texteditor',
  pdf:'pdf',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid   = () => `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
const clamp = (v,lo,hi) => Math.min(Math.max(v,lo),hi);

const defaultIcons = () => [
  { id:'filemanager', label:'My PC',       x:20,  y:20  },
  { id:'texteditor',  label:'Text Editor', x:20,  y:130 },
  { id:'musicplayer', label:'Music',       x:20,  y:240 },
  { id:'browser',     label:'Browser',     x:20,  y:350 },
  { id:'settings',    label:'Settings',    x:20,  y:460 },
  { id:'calculator',  label:'Calculator',  x:120, y:20  },
  { id:'pdf',         label:'PDF Viewer',  x:120, y:130 },
  { id:'imageviewer', label:'Images',      x:120, y:240 },
  { id:'terminal',    label:'Terminal',    x:120, y:350 },
];

// ─── Context Menu ─────────────────────────────────────────────────────────────
const CtxMenu = ({ items, x, y, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => window.addEventListener('mousedown', fn), 60);
    return () => { clearTimeout(t); window.removeEventListener('mousedown', fn); };
  }, [onClose]);

  const numSep = items.filter(i => i === 'sep').length;
  const numItems = items.length - numSep;
  const estH = numItems * 36 + numSep * 9 + 10;
  const left = Math.min(x, window.innerWidth  - 230);
  const top  = Math.min(y, window.innerHeight - estH - 10);

  return (
    <div ref={ref} style={{ position:'fixed', left, top, zIndex:99999, pointerEvents:'all' }}>
      <div style={{
        background:'rgba(18,18,28,0.97)', backdropFilter:'blur(24px)',
        border:'1px solid rgba(255,255,255,0.12)', borderRadius:8,
        padding:'4px 0', minWidth:210,
        boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
      }}>
        {items.map((item, i) => {
          if (item === 'sep') return <div key={i} style={{ height:1, background:'rgba(255,255,255,0.08)', margin:'3px 0' }} />;
          return (
            <div key={i}
              onClick={() => { if (!item.disabled) { item.action?.(); onClose(); } }}
              style={{
                padding:'8px 14px', fontSize:13,
                cursor: item.disabled ? 'default' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                opacity: item.disabled ? 0.35 : 1,
                color: item.danger ? '#ff5f56' : 'white',
                transition:'background 0.1s',
              }}
              onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background='rgba(79,172,254,0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; }}
            >
              <span style={{ display:'flex', alignItems:'center', gap:9 }}>
                {item.icon && <span style={{ opacity:0.65, display:'flex' }}>{item.icon}</span>}
                {item.label}
              </span>
              {item.kbd && <span style={{ fontSize:10, opacity:0.35, fontFamily:'monospace', marginLeft:16 }}>{item.kbd}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ notif, onDismiss }) => {
  const palette = { success:'#27c93f', error:'#ff5f56', warning:'#ffbd2e', info:ACCENT };
  const icons   = { success:<CheckCircle size={15}/>, error:<AlertCircle size={15}/>, warning:<AlertTriangle size={15}/>, info:<Bell size={15}/> };
  const c = palette[notif.type] || ACCENT;
  return (
    <div style={{
      background:'rgba(18,18,28,0.97)', backdropFilter:'blur(20px)',
      border:`1px solid ${c}35`, borderLeft:`3px solid ${c}`,
      borderRadius:8, padding:'11px 14px', minWidth:280, maxWidth:380,
      boxShadow:'0 4px 20px rgba(0,0,0,0.45)',
      display:'flex', alignItems:'flex-start', gap:10,
      animation:'toastIn 0.2s ease',
    }}>
      <span style={{ color:c, marginTop:1 }}>{icons[notif.type]}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{notif.title}</div>
        <div style={{ fontSize:12, opacity:0.7 }}>{notif.message}</div>
      </div>
      <X size={13} onClick={() => onDismiss(notif.id)} style={{ cursor:'pointer', opacity:0.4, marginTop:2, flexShrink:0 }} />
    </div>
  );
};

// ─── Quick Settings ───────────────────────────────────────────────────────────
const QuickSettings = ({ onClose, volume, setVolume, brightness, setBrightness, wifi, setWifi, cloudSync, setCloudSync, notify, taskbarPos }) => {
  const bottom = taskbarPos === 'bottom' ? TASKBAR_H + 8 : 8;
  const right  = taskbarPos === 'right'  ? TASKBAR_W + 8 : 8;
  return (
    <div style={{
      position:'fixed', bottom:bottom, right:right, width:320,
      background:'rgba(14,14,22,0.97)', backdropFilter:'blur(28px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:12,
      padding:18, zIndex:9998, boxShadow:'0 8px 40px rgba(0,0,0,0.55)',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontWeight:700, fontSize:13 }}>Quick Settings</span>
        <X size={15} style={{ cursor:'pointer', opacity:0.45 }} onClick={onClose} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:14 }}>
        {[
          { icon: wifi ? <Wifi size={16}/> : <WifiOff size={16}/>, label:'Wi-Fi',      on:wifi,      toggle:()=>setWifi(w=>!w) },
          { icon:<Bluetooth size={16}/>,                            label:'Bluetooth',  on:false,     toggle:()=>notify('info','Bluetooth','Coming soon') },
          { icon: cloudSync ? <Cloud size={16}/> : <HardDrive size={16}/>, label:'Cloud Sync', on:cloudSync, toggle:()=>setCloudSync(c=>!c) },
          { icon:<Airplay size={16}/>,                              label:'Airplay',    on:false,     toggle:()=>notify('info','AirPlay','Coming soon') },
        ].map((t,i) => (
          <div key={i} onClick={t.toggle} style={{
            display:'flex', alignItems:'center', gap:7, padding:'9px 11px',
            background: t.on ? 'rgba(79,172,254,0.2)' : 'rgba(255,255,255,0.05)',
            border:`1px solid ${t.on ? 'rgba(79,172,254,0.4)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius:8, cursor:'pointer', fontSize:12,
            color: t.on ? ACCENT : 'rgba(255,255,255,0.65)',
            transition:'all 0.15s',
          }}>
            {t.icon}<span>{t.label}</span>
          </div>
        ))}
      </div>
      {[
        { label:'Volume',     icon:<Volume2 size={13}/>, value:volume,     set:setVolume },
        { label:'Brightness', icon:<Sun size={13}/>,     value:brightness, set:setBrightness },
      ].map((s,i) => (
        <div key={i} style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, opacity:0.6, marginBottom:5 }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>{s.icon}{s.label}</span>
            <span>{s.value}%</span>
          </div>
          <input type="range" min={0} max={100} value={s.value} onChange={e=>s.set(+e.target.value)} style={{ width:'100%', accentColor:ACCENT }} />
        </div>
      ))}
    </div>
  );
};

// ─── Calendar Popover ─────────────────────────────────────────────────────────
const CalendarPopover = ({ date, taskbarPos }) => {
  const [view, setView] = useState(new Date(date.getFullYear(), date.getMonth(), 1));
  const bottom = taskbarPos === 'bottom' ? TASKBAR_H + 8 : 8;
  const right  = taskbarPos === 'right'  ? TASKBAR_W + 8 : 8;

  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const isToday = (d) =>
    d && d === date.getDate() &&
    view.getMonth() === date.getMonth() &&
    view.getFullYear() === date.getFullYear();

  return (
    <div style={{
      position:'fixed', bottom:bottom, right:right, width:260,
      background:'rgba(14,14,22,0.97)', backdropFilter:'blur(28px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:12,
      padding:16, zIndex:9998, boxShadow:'0 8px 40px rgba(0,0,0,0.55)',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <ChevronLeft size={15} style={{ cursor:'pointer', opacity:0.6 }}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth()-1, 1))} />
        <span style={{ fontWeight:700, fontSize:13 }}>{format(view,'MMMM yyyy')}</span>
        <ChevronRight size={15} style={{ cursor:'pointer', opacity:0.6 }}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth()+1, 1))} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:10, opacity:0.4, padding:'3px 0', fontWeight:600 }}>{d}</div>
        ))}
        {cells.map((d,i) => (
          <div key={i} style={{
            textAlign:'center', fontSize:12, padding:'5px 2px', borderRadius:5,
            background: isToday(d) ? ACCENT : 'transparent',
            color: isToday(d) ? '#000' : d ? 'white' : 'transparent',
            fontWeight: isToday(d) ? 700 : 400,
          }}>{d || ''}</div>
        ))}
      </div>
    </div>
  );
};

// ─── Power Menu ───────────────────────────────────────────────────────────────
const PowerMenu = ({ onClose }) => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
    backdropFilter:'blur(6px)', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:99998,
  }} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{
      background:'rgba(14,14,22,0.97)', backdropFilter:'blur(30px)',
      border:'1px solid rgba(255,255,255,0.12)', borderRadius:14,
      padding:'28px 22px', minWidth:260,
      boxShadow:'0 20px 60px rgba(0,0,0,0.7)',
    }}>
      <h3 style={{ margin:'0 0 18px', textAlign:'center', fontSize:15, fontWeight:600 }}>Power Options</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {[
          { icon:<Lock size={18}/>,    label:'Lock',       action:()=>onClose(),               color:'rgba(255,255,255,0.07)' },
          { icon:<RotateCw size={18}/>,label:'Restart',    action:()=>window.location.reload(), color:'rgba(255,255,255,0.07)' },
          { icon:<Power size={18}/>,   label:'Shut Down',  action:()=>{ if(confirm('Shut down LynkOS?')) window.close(); },
            color:'rgba(255,59,48,0.15)', border:'rgba(255,59,48,0.3)', textColor:'#ff5f56' },
        ].map((o,i) => (
          <button key={i} onClick={o.action} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            padding:'11px 18px', background:o.color,
            border:`1px solid ${o.border||'rgba(255,255,255,0.1)'}`,
            color:o.textColor||'white', borderRadius:8,
            cursor:'pointer', fontSize:13, fontWeight:500, transition:'filter 0.15s',
          }}
          onMouseEnter={e=>e.currentTarget.style.filter='brightness(1.2)'}
          onMouseLeave={e=>e.currentTarget.style.filter='brightness(1)'}
          >{o.icon}{o.label}</button>
        ))}
        <button onClick={onClose} style={{ padding:'8px', background:'transparent', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12, marginTop:2 }}>Cancel</button>
      </div>
    </div>
  </div>
);

// ─── Search Overlay ───────────────────────────────────────────────────────────
const SearchOverlay = ({ onClose, openApp }) => {
  const [q, setQ] = useState('');
  const inputRef  = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const results = useMemo(() => {
    const all = Object.values(APP_REGISTRY);
    return q.trim() ? all.filter(a => a.title.toLowerCase().includes(q.toLowerCase())) : all;
  }, [q]);

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
      backdropFilter:'blur(10px)',
      display:'flex', flexDirection:'column', alignItems:'center',
      paddingTop:110, zIndex:99997,
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:580, padding:'0 16px' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:11,
          background:'rgba(18,18,28,0.98)', backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.14)', borderRadius:12,
          padding:'13px 18px', marginBottom:8,
          boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
        }}>
          <Search size={18} style={{ opacity:0.45, flexShrink:0 }} />
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search apps…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'white', fontSize:15 }}
            onKeyDown={e => {
              if (e.key==='Escape') onClose();
              if (e.key==='Enter' && results[0]) { openApp(results[0].id); onClose(); }
            }}
          />
          <kbd style={{ fontSize:10, opacity:0.35, border:'1px solid rgba(255,255,255,0.18)', borderRadius:4, padding:'2px 6px' }}>ESC</kbd>
        </div>
        <div style={{
          background:'rgba(18,18,28,0.98)', backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.09)', borderRadius:10, overflow:'hidden',
          boxShadow:'0 16px 50px rgba(0,0,0,0.5)',
        }}>
          {results.slice(0,8).map((app,i) => (
            <div key={app.id} onClick={() => { openApp(app.id); onClose(); }}
              style={{
                display:'flex', alignItems:'center', gap:11, padding:'11px 16px',
                cursor:'pointer', fontSize:13,
                borderBottom: i<results.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition:'background 0.1s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(79,172,254,0.14)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <span style={{ fontSize:20 }}>{app.emoji}</span>
              <span>{app.title}</span>
              <span style={{ marginLeft:'auto', fontSize:10, opacity:0.3 }}>App</span>
            </div>
          ))}
          {results.length===0 && <div style={{ padding:'18px', textAlign:'center', opacity:0.35, fontSize:13 }}>No results</div>}
        </div>
      </div>
    </div>
  );
};

// ─── Start Menu ───────────────────────────────────────────────────────────────
const smBtn = {
  display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
  color:'white', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:500,
};

const SmAppIcon = ({ app, pinned, onOpen, onTogglePin }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={onOpen}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:5,
        padding:'10px 4px', borderRadius:8, cursor:'pointer', position:'relative',
        background: hov ? 'rgba(255,255,255,0.08)' : 'transparent', transition:'background 0.12s',
      }}
    >
      <span style={{ fontSize:26 }}>{app.emoji}</span>
      <span style={{ fontSize:10, textAlign:'center', opacity:0.8, lineHeight:1.2, wordBreak:'break-word' }}>{app.title}</span>
      {hov && (
        <div onClick={e=>{ e.stopPropagation(); onTogglePin(); }}
          style={{ position:'absolute', top:4, right:4, opacity:0.55 }}
          title={pinned?'Unpin':'Pin'}
        >
          {pinned ? <PinOff size={10}/> : <Pin size={10}/>}
        </div>
      )}
    </div>
  );
};

const StartMenu = ({ onClose, openApp, user, onSettings, onPower, pinnedApps, setPinnedApps, taskbarPos }) => {
  const [tab, setTab] = useState('pinned');
  const allApps = Object.values(APP_REGISTRY);
  const bottom  = taskbarPos==='bottom' ? TASKBAR_H+6 : 'auto';
  const top     = taskbarPos==='top'    ? TASKBAR_H+6 : 'auto';

  const togglePin = (id) => setPinnedApps(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  return (
    <div style={{
      position:'fixed', bottom:bottom, top:top, left:'50%', transform:'translateX(-50%)',
      width:600, background:'rgba(10,10,18,0.97)', backdropFilter:'blur(32px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:14,
      boxShadow:'0 -8px 50px rgba(0,0,0,0.65)', overflow:'hidden', zIndex:9997,
    }}>
      {/* User header */}
      <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:38, height:38, borderRadius:'50%',
          background:`linear-gradient(135deg, ${ACCENT}, #00f2fe)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:700, fontSize:16, color:'#000', flexShrink:0,
        }}>{user.name.charAt(0)}</div>
        <div>
          <div style={{ fontWeight:600, fontSize:13 }}>{user.name}</div>
          <div style={{ fontSize:11, opacity:0.45 }}>{user.role}</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:7 }}>
          <button onClick={onSettings} style={smBtn}><Settings size={12}/>Settings</button>
          <button onClick={onPower} style={{...smBtn, borderColor:'rgba(255,59,48,0.35)', color:'#ff5f56'}}><Power size={12}/>Power</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {['pinned','all'].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1, padding:'9px', background:'transparent', border:'none',
            color: tab===t ? 'white' : 'rgba(255,255,255,0.38)',
            fontSize:12, fontWeight: tab===t ? 600 : 400, cursor:'pointer',
            borderBottom: tab===t ? `2px solid ${ACCENT}` : '2px solid transparent',
            transition:'all 0.15s',
          }}>{t==='pinned' ? '📌 Pinned' : '🔠 All Apps'}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ padding:16, overflowY:'auto', maxHeight:340 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
          {(tab==='pinned' ? allApps.filter(a=>pinnedApps.includes(a.id)) : allApps).map(app => (
            <SmAppIcon key={app.id} app={app}
              pinned={pinnedApps.includes(app.id)}
              onOpen={()=>{ openApp(app.id); onClose(); }}
              onTogglePin={()=>togglePin(app.id)}
            />
          ))}
          {tab==='pinned' && pinnedApps.length===0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', opacity:0.35, fontSize:12, padding:'20px 0' }}>
              No pinned apps — go to "All Apps" to pin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Traffic Light Button ─────────────────────────────────────────────────────
const TL = ({ color, title, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick} title={title}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        width:12, height:12, borderRadius:'50%',
        background:color, cursor:'pointer', flexShrink:0,
        filter: hov ? 'brightness(1.25)' : 'brightness(0.9)',
        transition:'filter 0.1s',
      }}
    />
  );
};

// ─── Window Frame ─────────────────────────────────────────────────────────────
const WindowFrame = ({ win, isActive, onFocus, onClose, onMin, onMax, children, taskbarPos, onCtxMenu, onMoved, onResized }) => {
  const maxW = (taskbarPos==='left'||taskbarPos==='right') ? window.innerWidth  - TASKBAR_W : window.innerWidth;
  const maxH = (taskbarPos==='top' ||taskbarPos==='bottom')? window.innerHeight - TASKBAR_H : window.innerHeight;
  const maxX = taskbarPos==='left' ? TASKBAR_W : 0;
  const maxY = taskbarPos==='top'  ? TASKBAR_H : 0;

  const pos  = win.isMax ? { x:maxX, y:maxY }         : { x:win.x, y:win.y };
  const size = win.isMax ? { width:maxW, height:maxH } : { width:win.w, height:win.h };

  return (
    <Rnd
      position={pos}
      size={size}
      minWidth={win.minW}
      minHeight={win.minH}
      bounds="window"
      disableDragging={win.isMax}
      enableResizing={!win.isMax ? {
        bottom:true, bottomLeft:true, bottomRight:true,
        left:true, right:true, top:true, topLeft:true, topRight:true,
      } : false}
      dragHandleClassName="wdrag"
      style={{ zIndex:win.z }}
      onDragStart={onFocus}
      onDragStop={(_, d) => { if (!win.isMax) onMoved(d.x, d.y); }}
      onResizeStart={onFocus}
      onResizeStop={(_, __, ref, ___, position) => {
        if (!win.isMax) onResized(parseInt(ref.style.width), parseInt(ref.style.height), position.x, position.y);
      }}
    >
      <div
        onClick={onFocus}
        onContextMenu={onCtxMenu}
        style={{
          width:'100%', height:'100%',
          display:'flex', flexDirection:'column',
          background:DARK_GLASS,
          backdropFilter:'blur(24px) saturate(180%)',
          borderRadius: win.isMax ? 0 : 10,
          border: isActive
            ? '1px solid rgba(79,172,254,0.3)'
            : '1px solid rgba(255,255,255,0.07)',
          boxShadow: isActive
            ? '0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(79,172,254,0.08)'
            : '0 4px 24px rgba(0,0,0,0.45)',
          overflow:'hidden',
          transition:'border 0.15s, box-shadow 0.15s',
        }}
      >
        {/* Title bar */}
        <div className="wdrag" style={{
          height:36, minHeight:36, flexShrink:0,
          background: isActive ? 'rgba(79,172,254,0.05)' : 'rgba(255,255,255,0.025)',
          borderBottom:'1px solid rgba(255,255,255,0.065)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 12px',
          cursor: win.isMax ? 'default' : 'move',
          userSelect:'none',
        }}>
          <span style={{ fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:7, opacity:isActive?0.95:0.55 }}>
            <span style={{ fontSize:14 }}>{APP_REGISTRY[win.appId]?.emoji}</span>
            {win.title}
          </span>
          <div style={{ display:'flex', gap:7 }}>
            <TL color="#ffbd2e" title="Minimize" onClick={e=>{ e.stopPropagation(); onMin(); }} />
            <TL color="#27c93f" title={win.isMax?'Restore':'Maximize'} onClick={e=>{ e.stopPropagation(); onMax(); }} />
            <TL color="#ff5f56" title="Close"    onClick={e=>{ e.stopPropagation(); onClose(); }} />
          </div>
        </div>

        {/* App content — CRITICAL: flex:1 + minHeight:0 ensures app fills remaining space */}
        <div style={{ flex:1, overflow:'hidden', position:'relative', minHeight:0 }}>
          {children}
        </div>
      </div>
    </Rnd>
  );
};

// ─── Desktop Icon ─────────────────────────────────────────────────────────────
const DesktopIcon = ({ ic, selected, size, onSingleClick, onDoubleClick, onContextMenu, onDragStop }) => {
  const app  = APP_REGISTRY[ic.id];
  const px   = { small:54, medium:68, large:82 }[size];
  const emsz = { small:22, medium:30, large:40 }[size];
  const fsz  = { small:10, medium:11, large:12 }[size];

  return (
    <Rnd
      position={{ x:ic.x, y:ic.y }}
      size={{ width:px, height:px+28 }}
      enableResizing={false}
      bounds="parent"
      dragHandleClassName="ihdl"
      onDragStop={(_, d) => onDragStop(d.x, d.y)}
    >
      <div
        className="ihdl"
        onClick={onSingleClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{
          width:'100%', height:'100%',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          gap:4, cursor:'pointer', padding:4, borderRadius:6,
          background: selected ? 'rgba(79,172,254,0.22)' : 'transparent',
          border:`1px solid ${selected ? 'rgba(79,172,254,0.45)' : 'transparent'}`,
          transition:'background 0.1s',
          userSelect:'none',
        }}
      >
        <span style={{ fontSize:emsz, lineHeight:1, filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
          {app?.emoji || '📁'}
        </span>
        <span style={{
          fontSize:fsz, textAlign:'center', lineHeight:1.25,
          textShadow:'0 1px 4px rgba(0,0,0,0.9)',
          maxWidth:'100%', wordBreak:'break-word',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
          overflow:'hidden',
        }}>{ic.label}</span>
      </div>
    </Rnd>
  );
};

// ─── Taskbar ──────────────────────────────────────────────────────────────────
const Taskbar = ({
  position, windows, activeId,
  startOpen, onStart, onSearch,
  time, onClockClick,
  volume, onQuickSettings,
  onPower, pinnedApps, openApp, onWindowClick,
  notifications,
}) => {
  const isVert = position==='left' || position==='right';

  const barStyle = {
    position:'fixed',
    background:'rgba(8,8,16,0.92)',
    backdropFilter:'blur(20px)',
    zIndex:9995,
    display:'flex',
    alignItems:'center',
    ...(isVert ? {
      top:0, [position]:0, bottom:0,
      width:TASKBAR_W, flexDirection:'column',
      padding:'8px 0',
      borderRight: position==='left' ? '1px solid rgba(255,255,255,0.07)' : undefined,
      borderLeft:  position==='right'? '1px solid rgba(255,255,255,0.07)' : undefined,
    } : {
      left:0, right:0, height:TASKBAR_H,
      flexDirection:'row', padding:'0 10px', gap:4,
      borderTop:    position==='bottom' ? '1px solid rgba(255,255,255,0.07)' : undefined,
      borderBottom: position==='top'    ? '1px solid rgba(255,255,255,0.07)' : undefined,
      ...(position==='bottom' ? { bottom:0 } : { top:0 }),
    }),
  };

  const runningIds = [...new Set(windows.map(w=>w.appId))];
  const dockIds    = [...new Set([...pinnedApps, ...runningIds])];

  return (
    <div style={barStyle}>

      {/* Start */}
      <button onClick={onStart} style={{
        background: startOpen ? 'rgba(79,172,254,0.2)' : 'transparent',
        border:'none', color:'white', cursor:'pointer', borderRadius:6,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding: isVert ? '7px' : '6px 10px',
        margin: isVert ? '0 0 6px' : '0 6px 0 0',
        transition:'background 0.15s', flexShrink:0,
      }}>
        <LayoutGrid size={18}/>
      </button>

      {/* Search */}
      {!isVert && (
        <button onClick={onSearch} style={{
          background:'rgba(255,255,255,0.055)', border:'1px solid rgba(255,255,255,0.08)',
          color:'rgba(255,255,255,0.45)', cursor:'pointer',
          padding:'4px 13px', borderRadius:18,
          display:'flex', alignItems:'center', gap:6, fontSize:12,
          marginRight:8, flexShrink:0, transition:'all 0.15s',
        }}>
          <Search size={13}/>Search…
          <kbd style={{ fontSize:9, opacity:0.35, border:'1px solid rgba(255,255,255,0.15)', borderRadius:3, padding:'1px 5px', marginLeft:3 }}>⌘K</kbd>
        </button>
      )}

      {!isVert && <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)', marginRight:6, flexShrink:0 }}/>}

      {/* Dock */}
      <div style={{
        flex: isVert ? undefined : 1,
        display:'flex', alignItems:'center',
        flexDirection: isVert ? 'column' : 'row',
        gap: isVert ? 2 : 1,
        overflow:'hidden',
        minWidth:0,
      }}>
        {dockIds.map(appId => {
          const app   = APP_REGISTRY[appId];
          if (!app) return null;
          const wins  = windows.filter(w=>w.appId===appId);
          const isAct = wins.some(w=>w.id===activeId && !w.isMin);
          const hasWin= wins.length > 0;

          return (
            <div key={appId} title={app.title}
              onClick={() => {
                if (!hasWin) { openApp(appId); return; }
                const w = wins[0];
                if (w.isMin || w.id!==activeId) onWindowClick(w.id);
                else onWindowClick(w.id);
              }}
              style={{
                position:'relative',
                display:'flex', alignItems:'center', gap:6,
                padding: isVert ? '7px' : '4px 10px',
                borderRadius:6, cursor:'pointer', flexShrink:0,
                background: isAct ? 'rgba(79,172,254,0.16)' : 'transparent',
                border:`1px solid ${isAct ? 'rgba(79,172,254,0.32)' : 'transparent'}`,
                maxWidth: isVert ? undefined : 150,
                transition:'all 0.12s',
              }}
              onMouseEnter={e=>{ if(!isAct) e.currentTarget.style.background='rgba(255,255,255,0.07)'; }}
              onMouseLeave={e=>{ if(!isAct) e.currentTarget.style.background='transparent'; }}
            >
              <span style={{ fontSize:17, flexShrink:0, opacity:hasWin?1:0.45 }}>{app.emoji}</span>
              {!isVert && (
                <span style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:hasWin?0.9:0.45 }}>
                  {app.title}
                </span>
              )}
              {hasWin && (
                <div style={{
                  position:'absolute',
                  bottom: isVert ? 2 : 1,
                  left:'50%', transform:'translateX(-50%)',
                  width: wins.length>1 ? 12 : 4, height:3, borderRadius:2,
                  background: isAct ? ACCENT : 'rgba(255,255,255,0.35)',
                  transition:'all 0.15s',
                }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* System tray (horizontal) */}
      {!isVert && (
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, marginLeft:4 }}>
          <div onClick={onQuickSettings} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', opacity:0.65 }}>
            <Wifi size={13}/>
            {volume===0 ? <VolumeX size={13}/> : volume<50 ? <Volume size={13}/> : <Volume2 size={13}/>}
            <Battery size={13}/>
          </div>
          <div style={{ width:1, height:18, background:'rgba(255,255,255,0.1)' }}/>
          <div onClick={onClockClick} style={{ textAlign:'right', lineHeight:1.2, cursor:'pointer', userSelect:'none', flexShrink:0 }}>
            <div style={{ fontWeight:600, fontSize:12 }}>{format(time,'HH:mm')}</div>
            <div style={{ fontSize:10, opacity:0.42 }}>{format(time,'dd/MM/yy')}</div>
          </div>
          {/* Show desktop hot strip */}
          <div style={{ width:3, height:32, background:'rgba(255,255,255,0.07)', cursor:'pointer', borderRadius:2, marginLeft:2 }}
            title="Show Desktop"
            onMouseEnter={e=>e.currentTarget.style.background=ACCENT}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
          />
        </div>
      )}

      {/* Vertical tray */}
      {isVert && (
        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', alignItems:'center', gap:8, paddingBottom:8 }}>
          <button onClick={onClockClick} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:10, padding:4, lineHeight:1.3, textAlign:'center' }}>
            {format(time,'HH')}<br/>{format(time,'mm')}
          </button>
          <button onClick={onPower} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.45)', cursor:'pointer', padding:6 }}>
            <Power size={14}/>
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Desktop ─────────────────────────────────────────────────────────────
export default function Desktop() {

  const [windows,       setWindows]       = useState([]);
  const [activeId,      setActiveId]      = useState(null);
  const [wallpaper,     setWallpaper]     = useState(WALLPAPERS['Vanta Waves']);
  const [theme,         setTheme]         = useState('dark');
  const [taskbarPos,    setTaskbarPos]    = useState('bottom');
  const [iconSize,      setIconSize]      = useState('medium');
  const [desktopIcons,  setDesktopIcons]  = useState(defaultIcons);
  const [selectedIcons, setSelectedIcons] = useState([]);
  const [pinnedApps,    setPinnedApps]    = useState(['filemanager','browser','texteditor','terminal','settings']);

  const [startOpen,  setStartOpen]  = useState(false);
  const [ctxMenu,    setCtxMenu]    = useState(null);
  const [powerOpen,  setPowerOpen]  = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showCal,    setShowCal]    = useState(false);
  const [showQS,     setShowQS]     = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [volume,        setVolume]        = useState(70);
  const [brightness,    setBrightness]    = useState(100);
  const [wifi,          setWifi]          = useState(true);
  const [cloudSync,     setCloudSync]     = useState(true);
  const [time,          setTime]          = useState(new Date());

  const [user] = useState({ name:'LynkOS User', email:'user@lynkos.com', role:'Administrator' });
  const [vfs,  setVfs]  = useState(null);

  const topZ      = useRef(100);
  const autoSaveT = useRef(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Session load on mount
  useEffect(() => { loadState(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save
  useEffect(() => {
    clearInterval(autoSaveT.current);
    autoSaveT.current = setInterval(saveState, AUTO_SAVE_MS);
    return () => clearInterval(autoSaveT.current);
  }); // intentionally runs every render (captures fresh state via saveState closure)

  // Keyboard shortcuts
  useEffect(() => {
    const fn = async (e) => {
      const inField = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
      if (e.key==='Escape') { closeAllPanels(); return; }
      if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); setSearchOpen(s=>!s); return; }
      if ((e.ctrlKey||e.metaKey) && !e.shiftKey && !e.altKey && e.key==='s') { e.preventDefault(); saveState(); notify('success','Saved','Session saved'); return; }
      if ((e.ctrlKey||e.metaKey) && e.key==='w') { e.preventDefault(); if(activeId) closeWin(activeId); return; }
      if ((e.ctrlKey||e.metaKey) && e.key==='m') { e.preventDefault(); if(activeId) toggleMin(activeId); return; }
      if ((e.ctrlKey||e.metaKey) && e.key==='a' && !inField) { e.preventDefault(); setSelectedIcons(desktopIcons.map(i=>i.id)); return; }
      if (e.key==='Delete' && !inField && selectedIcons.length>0) { e.preventDefault(); setDesktopIcons(p=>p.filter(i=>!selectedIcons.includes(i.id))); setSelectedIcons([]); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [activeId, desktopIcons, selectedIcons]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAllPanels = () => {
    setCtxMenu(null); setStartOpen(false);
    setSearchOpen(false); setShowCal(false); setShowQS(false);
  };

  // ── Notifications ──
  const notify = useCallback((type, title, message) => {
    const id = uid();
    setNotifications(p => [...p, { id, type, title, message }]);
    setTimeout(() => setNotifications(p => p.filter(n=>n.id!==id)), 5000);
  }, []);

  const dismissNotif = useCallback((id) => setNotifications(p=>p.filter(n=>n.id!==id)), []);

  // ── Window management ──
  const openApp = useCallback((appId, initialFile=null, forceNew=false) => {
    const app = APP_REGISTRY[appId];
    if (!app) return;

    if (!forceNew && !initialFile) {
      const existing = windows.find(w=>w.appId===appId);
      if (existing) { focusWin(existing.id); return; }
    }

    topZ.current += 1;
    const id = `${appId}_${uid()}`;
    const offset = (windows.length % 8) * 26;
    const vw = window.innerWidth, vh = window.innerHeight;
    const tbW = (taskbarPos==='left'||taskbarPos==='right') ? TASKBAR_W : 0;
    const tbH = (taskbarPos==='top' ||taskbarPos==='bottom') ? TASKBAR_H : 0;
    const tbX = taskbarPos==='left' ? TASKBAR_W : 0;
    const tbY = taskbarPos==='top'  ? TASKBAR_H : 0;

    const winW = Math.min(app.w, vw - tbW - 40);
    const winH = Math.min(app.h, vh - tbH - 40);
    const winX = clamp(tbX + 60 + offset, tbX + 10, vw - tbW - winW - 10);
    const winY = clamp(tbY + 40 + offset, tbY + 10, vh - tbH - winH - 10);

    setWindows(prev => [...prev, {
      id, appId, title:app.title,
      x:winX, y:winY, w:winW, h:winH,
      minW:app.minW, minH:app.minH,
      z:topZ.current, isMin:false, isMax:false,
      initialFile,
    }]);
    setActiveId(id);
    closeAllPanels();
  }, [windows, taskbarPos]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeWin = useCallback((id) => {
    setWindows(p => {
      const next = p.filter(w=>w.id!==id);
      setActiveId(prev => {
        if (prev !== id) return prev;
        const vis = next.filter(w=>!w.isMin);
        return vis.length ? vis[vis.length-1].id : null;
      });
      return next;
    });
  }, []);

  const focusWin = useCallback((id) => {
    topZ.current += 1;
    setActiveId(id);
    setWindows(p => p.map(w => w.id===id ? { ...w, z:topZ.current, isMin:false } : w));
  }, []);

  const toggleMin = useCallback((id) => {
    setWindows(p => {
      const next = p.map(w => w.id===id ? { ...w, isMin:!w.isMin } : w);
      const wasMin = p.find(w=>w.id===id)?.isMin;
      if (!wasMin) {
        setActiveId(prev => {
          if (prev !== id) return prev;
          const vis = next.filter(w=>w.id!==id && !w.isMin);
          return vis.length ? vis[vis.length-1].id : null;
        });
      }
      return next;
    });
  }, []);

  const toggleMax = useCallback((id) => {
    setWindows(p => p.map(w => w.id===id ? { ...w, isMax:!w.isMax } : w));
  }, []);

  const moveWin   = useCallback((id, x, y)          => setWindows(p=>p.map(w=>w.id===id?{...w,x,y}:w)), []);
  const resizeWin = useCallback((id, ww, hh, x, y)  => setWindows(p=>p.map(w=>w.id===id?{...w,w:ww,h:hh,x,y}:w)), []);
  const closeAllWins = useCallback(() => { setWindows([]); setActiveId(null); }, []);
  const minAllWins   = useCallback(() => setWindows(p=>p.map(w=>({...w,isMin:true}))), []);

  const showDesktop = useCallback(() => {
    const anyVis = windows.some(w=>!w.isMin);
    anyVis ? minAllWins() : setWindows(p=>p.map(w=>({...w,isMin:false})));
  }, [windows, minAllWins]);

  const openFile = useCallback((file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    openApp(EXT_MAP[ext] || 'texteditor', file, true);
  }, [openApp]);

  // ── Persistence ──
  const getState = useCallback(() => ({
    version:'2.1', ts:Date.now(),
    wallpaper, theme, taskbarPos, iconSize, pinnedApps,
    desktopIcons: desktopIcons.map(({ id,label,x,y })=>({ id,label,x,y })),
  }), [wallpaper, theme, taskbarPos, iconSize, pinnedApps, desktopIcons]);

  const saveState = useCallback(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(getState())); }
    catch(e) { console.warn('save failed',e); }
  }, [getState]);

  const loadState = useCallback(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.wallpaper)    setWallpaper(s.wallpaper);
      if (s.theme)        setTheme(s.theme);
      if (s.taskbarPos)   setTaskbarPos(s.taskbarPos);
      if (s.iconSize)     setIconSize(s.iconSize);
      if (s.pinnedApps)   setPinnedApps(s.pinnedApps);
      if (s.desktopIcons) {
        const map = Object.fromEntries(s.desktopIcons.map(ic=>[ic.id,ic]));
        setDesktopIcons(prev => prev.map(ic => map[ic.id] ? { ...ic, ...map[ic.id] } : ic));
      }
      notify('info','Welcome back','Session restored');
    } catch(e) { console.warn('load failed',e); }
  }, [notify]);

  const exportZip = useCallback(async () => {
    try {
      const zip = new JSZip();
      zip.file('state.json', JSON.stringify(getState(),null,2));
      zip.file('meta.json',  JSON.stringify({ date:new Date().toISOString(), user:user.name },null,2));
      const blob = await zip.generateAsync({ type:'blob' });
      saveAs(blob, `lynkos-${format(new Date(),'yyyy-MM-dd-HHmmss')}.zip`);
      notify('success','Exported','Backup downloaded');
    } catch(e) { notify('error','Export failed',String(e)); }
  }, [getState, user, notify]);

  // ── Context menus ──
  const closeCtx = useCallback(() => setCtxMenu(null), []);

  const desktopCtx = useCallback((e) => {
    e.preventDefault();
    setCtxMenu({ x:e.clientX, y:e.clientY, items:[
      { icon:<RefreshCw size={13}/>,    label:'Refresh',          action:()=>notify('info','Refreshed','') },
      { icon:<Palette size={13}/>,      label:'Personalize',      action:()=>openApp('settings') },
      'sep',
      { icon:<Layers size={13}/>,       label:'Show Desktop',     action:showDesktop },
      { icon:<LayoutGrid size={13}/>,   label:`Icon Size: ${iconSize}`, action:()=>setIconSize(s=>({small:'medium',medium:'large',large:'small'})[s]) },
      'sep',
      { icon:<FolderPlus size={13}/>,   label:'New Folder',       action:()=>notify('info','New Folder','Coming soon') },
      { icon:<FilePlus size={13}/>,     label:'New Text File',    action:()=>openApp('texteditor') },
      'sep',
      { icon:<Save size={13}/>,         label:'Save Session',     kbd:'Ctrl+S', action:()=>{ saveState(); notify('success','Saved','Session saved'); } },
      { icon:<DownloadCloud size={13}/>, label:'Export ZIP',      kbd:'Ctrl+Alt+S', action:exportZip },
      { icon:<UploadCloud size={13}/>,   label:'Import Backup',   action:()=>document.getElementById('lynkos-import')?.click() },
    ]});
  }, [iconSize, openApp, showDesktop, saveState, exportZip, notify]);

  const iconCtx = useCallback((e, iconId) => {
    e.preventDefault(); e.stopPropagation();
    if (!selectedIcons.includes(iconId)) setSelectedIcons([iconId]);
    setCtxMenu({ x:e.clientX, y:e.clientY, items:[
      { icon:<FolderOpen size={13}/>, label:'Open',   action:()=>{ openApp(iconId); setSelectedIcons([]); } },
      'sep',
      { icon:<Edit3 size={13}/>,      label:'Rename',  action:()=>notify('info','Rename','Coming soon') },
      { icon:<Copy size={13}/>,       label:'Copy',    action:()=>notify('info','Copied','') },
      { icon:<Trash2 size={13}/>,     label:'Delete',  danger:true, action:()=>{
        setDesktopIcons(p=>p.filter(ic=>!selectedIcons.includes(ic.id)));
        setSelectedIcons([]);
      }},
      'sep',
      { icon:<Info size={13}/>,       label:'Properties', action:()=>notify('info','Properties','Coming soon') },
    ]});
  }, [selectedIcons, openApp, notify]);

  const windowCtx = useCallback((e, winId) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x:e.clientX, y:e.clientY, items:[
      { icon:<Maximize size={13}/>, label:'Maximize',    action:()=>toggleMax(winId) },
      { icon:<Minimize size={13}/>, label:'Minimize',    action:()=>toggleMin(winId) },
      { icon:<X size={13}/>,        label:'Close',       danger:true, action:()=>closeWin(winId) },
      'sep',
      { icon:<XSquare size={13}/>,  label:'Close All',   action:closeAllWins },
      { icon:<Minimize size={13}/>, label:'Minimize All',action:minAllWins },
    ]});
  }, [toggleMax, toggleMin, closeWin, closeAllWins, minAllWins]);

  // ── App props ──
  const makeAppProps = useCallback((win) => ({
    vfs, setVfs,
    currentWallpaper: wallpaper, setWallpaper,
    wallpapers: WALLPAPERS,
    theme, setTheme,
    taskbarPos, setTaskbarPos,
    iconSize, setIconSize,
    pinnedApps, setPinnedApps,
    user, notify,
    onOpenFile: openFile,
    onOpenApp:  openApp,
    onClose:    () => closeWin(win.id),
    initialFile: win.initialFile,
  }), [vfs, wallpaper, theme, taskbarPos, iconSize, pinnedApps, user, notify, openFile, openApp, closeWin]);

  const bgStyle = useMemo(() => {
    const isUrl = wallpaper.startsWith('url(');
    return isUrl
      ? { backgroundImage:wallpaper, backgroundSize:'cover', backgroundPosition:'center' }
      : { background:wallpaper };
  }, [wallpaper]);

  const onDesktopClick = (e) => {
    if (e.target === e.currentTarget) setSelectedIcons([]);
    closeAllPanels();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position:'fixed', inset:0,
        overflow:'hidden',
        fontFamily:"'Segoe UI Variable','SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        color:'white', userSelect:'none',
        ...bgStyle,
      }}
      onClick={onDesktopClick}
      onContextMenu={desktopCtx}
    >
      {/* Brightness overlay */}
      {brightness < 100 && (
        <div style={{
          position:'fixed', inset:0, pointerEvents:'none', zIndex:99999,
          background:`rgba(0,0,0,${(100-brightness)/100*0.75})`,
        }}/>
      )}

      {/* Desktop icon area — inset to avoid taskbar overlap */}
      <div style={{
        position:'absolute',
        top:    taskbarPos==='top'    ? TASKBAR_H : 0,
        bottom: taskbarPos==='bottom' ? TASKBAR_H : 0,
        left:   taskbarPos==='left'   ? TASKBAR_W : 0,
        right:  taskbarPos==='right'  ? TASKBAR_W : 0,
        overflow:'hidden',
        pointerEvents:'none', // let Rnd handle its own events
      }}>
        <div style={{ position:'relative', width:'100%', height:'100%', pointerEvents:'all' }}>
          {desktopIcons.map(ic => (
            <DesktopIcon
              key={ic.id} ic={ic} size={iconSize}
              selected={selectedIcons.includes(ic.id)}
              onSingleClick={(e) => {
                e.stopPropagation();
                if (e.ctrlKey||e.metaKey) setSelectedIcons(p=>p.includes(ic.id)?p.filter(x=>x!==ic.id):[...p,ic.id]);
                else setSelectedIcons([ic.id]);
              }}
              onDoubleClick={() => openApp(ic.id)}
              onContextMenu={(e) => iconCtx(e, ic.id)}
              onDragStop={(x,y) => setDesktopIcons(p=>p.map(i=>i.id===ic.id?{...i,x,y}:i))}
            />
          ))}
        </div>
      </div>

      {/* Windows */}
      {windows.map(win => {
        if (win.isMin) return null;
        const Comp = APP_REGISTRY[win.appId]?.component;
        if (!Comp) return null;
        return (
          <WindowFrame
            key={win.id} win={win}
            isActive={activeId===win.id}
            onFocus={()  => focusWin(win.id)}
            onClose={()  => closeWin(win.id)}
            onMin={()    => toggleMin(win.id)}
            onMax={()    => toggleMax(win.id)}
            taskbarPos={taskbarPos}
            onCtxMenu={(e) => windowCtx(e, win.id)}
            onMoved={(x,y)       => moveWin(win.id,x,y)}
            onResized={(w,h,x,y) => resizeWin(win.id,w,h,x,y)}
          >
            <Comp {...makeAppProps(win)} />
          </WindowFrame>
        );
      })}

      {/* Taskbar */}
      <Taskbar
        position={taskbarPos}
        windows={windows}
        activeId={activeId}
        startOpen={startOpen}
        onStart={() => { setStartOpen(s=>!s); setShowCal(false); setShowQS(false); }}
        onSearch={() => setSearchOpen(true)}
        time={time}
        onClockClick={() => { setShowCal(s=>!s); setShowQS(false); setStartOpen(false); }}
        volume={volume}
        onQuickSettings={() => { setShowQS(s=>!s); setShowCal(false); setStartOpen(false); }}
        onPower={() => setPowerOpen(true)}
        pinnedApps={pinnedApps}
        openApp={openApp}
        onWindowClick={(id) => {
          const w = windows.find(x=>x.id===id);
          if (!w) return;
          if (w.isMin || w.id!==activeId) focusWin(id);
          else toggleMin(id);
        }}
        notifications={notifications}
      />

      {/* Overlays */}
      {startOpen && (
        <StartMenu
          onClose={() => setStartOpen(false)}
          openApp={openApp} user={user}
          onSettings={() => { openApp('settings'); setStartOpen(false); }}
          onPower={() => { setPowerOpen(true); setStartOpen(false); }}
          pinnedApps={pinnedApps} setPinnedApps={setPinnedApps}
          taskbarPos={taskbarPos}
        />
      )}

      {showQS && (
        <QuickSettings
          onClose={() => setShowQS(false)}
          volume={volume}         setVolume={setVolume}
          brightness={brightness} setBrightness={setBrightness}
          wifi={wifi}             setWifi={setWifi}
          cloudSync={cloudSync}   setCloudSync={setCloudSync}
          notify={notify}         taskbarPos={taskbarPos}
        />
      )}

      {showCal && <CalendarPopover date={time} taskbarPos={taskbarPos} />}

      {powerOpen && <PowerMenu onClose={() => setPowerOpen(false)} />}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} openApp={openApp} />}

      {ctxMenu && <CtxMenu items={ctxMenu.items} x={ctxMenu.x} y={ctxMenu.y} onClose={closeCtx} />}

      {/* Notifications */}
      <div style={{
        position:'fixed',
        top:   taskbarPos==='top'   ? TASKBAR_H+8 : 12,
        right: taskbarPos==='right' ? TASKBAR_W+8 : 12,
        zIndex:99996,
        display:'flex', flexDirection:'column', gap:7,
        pointerEvents:'none', maxWidth:400,
      }}>
        {notifications.map(n => (
          <div key={n.id} style={{ pointerEvents:'all' }}>
            <Toast notif={n} onDismiss={dismissNotif} />
          </div>
        ))}
      </div>

      {/* Hidden import input */}
      <input id="lynkos-import" type="file" accept=".zip" style={{ display:'none' }}
        onChange={e => { e.target.value=''; }} />

      {/* Global styles */}
      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }
        *, *::before, *::after { box-sizing:border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.14); border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.24); }
        button,input,select,textarea { font-family:inherit; }
        input[type=range] { -webkit-appearance:none; appearance:none; height:4px; border-radius:2px; background:rgba(255,255,255,0.1); cursor:pointer; outline:none; border:none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:13px; height:13px; border-radius:50%; background:${ACCENT}; cursor:pointer; }
      `}</style>
    </div>
  );
}