/**
 * Desktop.jsx — LynkOS Core Desktop Environment v4.0
 * ====================================================
 *
 * KEYBOARD SHORTCUTS:
 *   Ctrl+S          → Save session to localStorage
 *   Ctrl+Alt+S      → Export session as ZIP
 *   Ctrl+Alt+I      → Import session ZIP
 *   Ctrl+A          → Open/close Notification Panel (Android-style)
 *   Ctrl (×2)       → Double-tap Ctrl → Toggle Start Menu
 *   Ctrl+N          → New Folder dialog on desktop
 *   Ctrl+Alt+N      → New File dialog on desktop
 *   Ctrl+K / ⌘K     → Search overlay
 *   Ctrl+W          → Close active window
 *   Ctrl+M          → Minimize active window
 *   Ctrl+Shift+A    → Select all desktop icons
 *   Delete          → Delete selected desktop icons
 *   Escape          → Close all panels / overlays
 *   F5              → Refresh
 *
 * ARCHITECTURE:
 *   - VirtualFileSystem (IndexedDB) initialised here, passed to all apps
 *   - Apps live in ./apps/*.jsx  (FileManager, TextEditor, SettingsApp …)
 *   - All OS chrome (taskbar, windows, overlays) lives in this file only
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
  FolderPlus, FilePlus, Power, Lock, Palette,
  Maximize, Minimize, HardDrive, Cloud, UploadCloud, DownloadCloud,
  Layers, XSquare, File, Image as ImageIcon, Music,
  Pin, PinOff, Bell, BellOff, Sun, Bluetooth, Airplay,
  LayoutGrid, Save, FolderOpen, AlertCircle, CheckCircle,
  AlertTriangle, Copy, Inbox, Clock,
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

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL FILE SYSTEM  (IndexedDB backend — shared across all apps)
// ═══════════════════════════════════════════════════════════════════════════════
export class VirtualFileSystem {
  constructor() {
    this.dbName   = 'LynkOS_VFS_v4';
    this.db       = null;
    this.clipboard          = null;
    this.clipboardOperation = null;
    this.favorites   = new Set();
    this.recentFiles = [];
    this._ready = this._initDB();
  }

  _initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 2);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        Promise.all([this._loadFavorites(), this._loadRecent()]).then(resolve);
      };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          const s = db.createObjectStore('files', { keyPath: 'path' });
          s.createIndex('parent',   'parent',   { unique: false });
          s.createIndex('type',     'type',     { unique: false });
          s.createIndex('modified', 'modified', { unique: false });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
    });
  }

  async _ready_() { if (!this.db) await this._ready; }

  /* ── bootstrap default folder tree ── */
  async initializeFileSystem() {
    await this._ready_();
    const now  = Date.now();
    const dirs = [
      ['/',                        null,               'root'],
      ['/Users',                   '/',                'root'],
      ['/Users/Admin',             '/Users',           'admin'],
      ['/Users/Admin/Desktop',     '/Users/Admin',     'admin'],
      ['/Users/Admin/Documents',   '/Users/Admin',     'admin'],
      ['/Users/Admin/Downloads',   '/Users/Admin',     'admin'],
      ['/Users/Admin/Pictures',    '/Users/Admin',     'admin'],
      ['/Users/Admin/Music',       '/Users/Admin',     'admin'],
      ['/Users/Admin/Videos',      '/Users/Admin',     'admin'],
      ['/System',                  '/',                'root'],
      ['/mnt',                     '/',                'root'],
    ];

    const tx    = this.db.transaction(['files'], 'readwrite');
    const store = tx.objectStore('files');

    const put = (obj) => new Promise((res) => {
      const r = store.get(obj.path);
      r.onsuccess = () => { if (!r.result) store.add(obj); res(); };
    });

    for (const [path, parent, owner] of dirs) {
      await put({ path, name: path.split('/').pop() || '/', type: 'folder', parent, size: 0, created: now, modified: now, permissions: parent ? 'rwx' : 'rwx', owner });
    }

    // seed readme
    const readmePath = '/Users/Admin/Documents/readme.txt';
    await put({
      path: readmePath, name: 'readme.txt', type: 'file',
      parent: '/Users/Admin/Documents',
      content: `Welcome to LynkOS v4!\n\nKeyboard Shortcuts (File Manager):\n  Ctrl+C  Copy\n  Ctrl+X  Cut\n  Ctrl+V  Paste\n  Ctrl+A  Select All\n  Del     Delete\n  F2      Rename\n  F5      Refresh\n  Ctrl+N  New Folder\n  Backspace  Go Up\n\nDesktop Shortcuts:\n  Ctrl+S        Save Session\n  Ctrl+Alt+S    Export ZIP\n  Ctrl+Alt+I    Import ZIP\n  Ctrl+A        Notifications\n  Ctrl+Ctrl     Start Menu\n  Ctrl+N        New Folder\n  Ctrl+Alt+N    New File`,
      size: 500, created: now, modified: now, permissions: 'rw-', owner: 'admin',
    });

    return new Promise(res => { tx.oncomplete = res; });
  }

  /* ── CRUD ── */
  async list(parent) {
    await this._ready_();
    return new Promise((res, rej) => {
      const tx = this.db.transaction(['files'], 'readonly');
      const idx = tx.objectStore('files').index('parent');
      const r   = idx.getAll(parent);
      r.onsuccess = () => res(r.result || []);
      r.onerror   = () => rej(r.error);
    });
  }

  async get(path) {
    await this._ready_();
    return new Promise((res, rej) => {
      const r = this.db.transaction(['files'], 'readonly').objectStore('files').get(path);
      r.onsuccess = () => res(r.result || null);
      r.onerror   = () => rej(r.error);
    });
  }

  async createFolder(parent, name) {
    await this._ready_();
    const path   = parent === '/' ? `/${name}` : `${parent}/${name}`;
    const folder = { path, name, type:'folder', parent, size:0, created:Date.now(), modified:Date.now(), permissions:'rwx', owner:'admin' };
    return new Promise((res, rej) => {
      const r = this.db.transaction(['files'], 'readwrite').objectStore('files').add(folder);
      r.onsuccess = () => res(folder);
      r.onerror   = () => rej(r.error);
    });
  }

  async createFile(parent, name, content = '') {
    await this._ready_();
    const path = parent === '/' ? `/${name}` : `${parent}/${name}`;
    const file = { path, name, type:'file', parent, content, size:content.length, created:Date.now(), modified:Date.now(), permissions:'rw-', owner:'admin' };
    return new Promise((res, rej) => {
      const r = this.db.transaction(['files'], 'readwrite').objectStore('files').add(file);
      r.onsuccess = () => { this.addToRecent(file); res(file); };
      r.onerror   = () => rej(r.error);
    });
  }

  async updateFile(path, updates) {
    const item = await this.get(path);
    if (!item) return null;
    const updated = { ...item, ...updates, modified: Date.now() };
    return new Promise((res, rej) => {
      const r = this.db.transaction(['files'], 'readwrite').objectStore('files').put(updated);
      r.onsuccess = () => res(updated);
      r.onerror   = () => rej(r.error);
    });
  }

  async delete(path) {
    const item = await this.get(path);
    if (!item) return;
    if (item.type === 'folder') {
      const children = await this.list(path);
      for (const c of children) await this.delete(c.path);
    }
    return new Promise((res, rej) => {
      const r = this.db.transaction(['files'], 'readwrite').objectStore('files').delete(path);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  async rename(oldPath, newName) {
    const item  = await this.get(oldPath);
    if (!item) return null;
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    await this.delete(oldPath);
    const newItem = { ...item, path: newPath, name: newName, modified: Date.now() };
    return new Promise((res, rej) => {
      const r = this.db.transaction(['files'], 'readwrite').objectStore('files').add(newItem);
      r.onsuccess = () => res(newItem);
      r.onerror   = () => rej(r.error);
    });
  }

  async copy(srcPath, destParent) {
    const src = await this.get(srcPath);
    if (!src) return null;
    let name = src.name, counter = 1;
    let newPath = destParent === '/' ? `/${name}` : `${destParent}/${name}`;
    while (await this.get(newPath)) {
      const ext  = name.includes('.') ? '.' + name.split('.').pop() : '';
      const base = ext ? name.slice(0, -ext.length) : name;
      name    = `${base} (${counter++})${ext}`;
      newPath = destParent === '/' ? `/${name}` : `${destParent}/${name}`;
    }
    const newItem = { ...src, path: newPath, name, parent: destParent, created: Date.now(), modified: Date.now() };
    const tx = this.db.transaction(['files'], 'readwrite');
    await new Promise((res, rej) => { const r = tx.objectStore('files').add(newItem); r.onsuccess = res; r.onerror = () => rej(r.error); });
    if (src.type === 'folder') {
      const children = await this.list(srcPath);
      for (const c of children) await this.copy(c.path, newPath);
    }
    return newItem;
  }

  async move(srcPath, destParent) {
    const copied = await this.copy(srcPath, destParent);
    await this.delete(srcPath);
    return copied;
  }

  async upload(parent, file) {
    const content = await file.text().catch(() => '');
    return this.createFile(parent, file.name, content);
  }

  async exportZip(path) {
    const zip = new JSZip();
    const item = await this.get(path);
    if (!item) return;
    const add = async (p, zf) => {
      const it = await this.get(p);
      if (it.type === 'file') { zf.file(it.name, it.content || ''); }
      else { const f = zf.folder(it.name); const ch = await this.list(p); for (const c of ch) await add(c.path, f); }
    };
    if (item.type === 'folder') { const ch = await this.list(path); for (const c of ch) await add(c.path, zip); }
    else zip.file(item.name, item.content || '');
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${item.name}.zip`);
  }

  async search(query, root = '/') {
    const results = [];
    const walk = async (p) => {
      const items = await this.list(p);
      for (const it of items) {
        if (it.name.toLowerCase().includes(query.toLowerCase())) results.push(it);
        if (it.type === 'folder') await walk(it.path);
      }
    };
    await walk(root);
    return results;
  }

  async dirSize(path) {
    const item = await this.get(path);
    if (!item) return 0;
    if (item.type === 'file') return item.size || 0;
    let total = 0;
    const ch = await this.list(path);
    for (const c of ch) total += await this.dirSize(c.path);
    return total;
  }

  /* ── Favorites & Recents ── */
  async addFav(path)    { this.favorites.add(path);    await this._saveMeta('favorites', [...this.favorites]); }
  async removeFav(path) { this.favorites.delete(path); await this._saveMeta('favorites', [...this.favorites]); }
  async addToRecent(item) {
    this.recentFiles = [item, ...this.recentFiles.filter(f => f.path !== item.path)].slice(0, 20);
    await this._saveMeta('recent', this.recentFiles);
  }
  async _saveMeta(key, value) {
    await this._ready_();
    const tx = this.db.transaction(['meta'], 'readwrite');
    tx.objectStore('meta').put({ key, value });
  }
  async _loadFavorites() {
    await this._ready_();
    return new Promise(res => {
      const r = this.db.transaction(['meta'], 'readonly').objectStore('meta').get('favorites');
      r.onsuccess = () => { if (r.result) this.favorites = new Set(r.result.value); res(); };
      r.onerror = res;
    });
  }
  async _loadRecent() {
    await this._ready_();
    return new Promise(res => {
      const r = this.db.transaction(['meta'], 'readonly').objectStore('meta').get('recent');
      r.onsuccess = () => { if (r.result) this.recentFiles = r.result.value || []; res(); };
      r.onerror = res;
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const ACCENT       = '#4facfe';
const ACCENT2      = '#00f2fe';
const DARK_GLASS   = 'rgba(12,12,20,0.90)';
const SESSION_KEY  = 'lynkos_v4_session';
const NOTIF_KEY    = 'lynkos_v4_notifs';
const AUTO_SAVE_MS = 30_000;
const TASKBAR_H    = 48;
const TASKBAR_W    = 56;

const WALLPAPERS = {
  'Vanta Waves'  : 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
  'Midnight City': 'linear-gradient(to bottom,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
  'Aurora'       : 'linear-gradient(135deg,#0d0221 0%,#0a3d62 30%,#1abc9c 70%,#6c3483 100%)',
  'Cyberpunk'    : 'linear-gradient(135deg,#0a0a0a 0%,#1a0533 40%,#2d0b5e 70%,#ff006615 100%)',
  'Sunset'       : 'linear-gradient(to right,#1a1a2e 0%,#16213e 30%,#e94560 70%,#f5a623 100%)',
  'Ocean Blue'   : 'linear-gradient(180deg,#0c0c1d 0%,#0a3d62 50%,#1abc9c30 100%)',
  'Lush Nature'  : "url('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1950&q=80')",
  'Space'        : "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=2072&q=80')",
  'Forest'       : "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2072&q=80')",
  'Mountain'     : "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2072&q=80')",
};

const APP_REGISTRY = {
  filemanager : { id:'filemanager', title:'File Manager',  emoji:'🗂️', component:FileManager,   w:920, h:640, minW:620, minH:420, color:'#4facfe' },
  texteditor  : { id:'texteditor',  title:'Text Editor',   emoji:'📝', component:TextEditor,    w:920, h:660, minW:520, minH:420, color:'#a8edea' },
  musicplayer : { id:'musicplayer', title:'Music Player',  emoji:'🎵', component:MusicPlayer,   w:420, h:560, minW:340, minH:400, color:'#e1b12c' },
  browser     : { id:'browser',     title:'Browser',       emoji:'🌐', component:Browser,       w:1100,h:720, minW:700, minH:500, color:'#00a8ff' },
  settings    : { id:'settings',    title:'Settings',      emoji:'⚙️', component:SettingsApp,   w:860, h:640, minW:600, minH:500, color:'#dcdde1' },
  pdf         : { id:'pdf',         title:'PDF Viewer',    emoji:'📄', component:PdfViewer,     w:960, h:720, minW:600, minH:500, color:'#9c88ff' },
  calculator  : { id:'calculator',  title:'Calculator',    emoji:'🧮', component:CalculatorApp, w:320, h:520, minW:320, minH:480, color:'#ffeaa7' },
  imageviewer : { id:'imageviewer', title:'Image Viewer',  emoji:'🖼️', component:ImageViewer,   w:820, h:640, minW:500, minH:420, color:'#00d2d3' },
  terminal    : { id:'terminal',    title:'Terminal',      emoji:'💻', component:Terminal,      w:780, h:500, minW:500, minH:350, color:'#00ff00' },
};

const EXT_MAP = {
  mp3:'musicplayer', wav:'musicplayer', ogg:'musicplayer', flac:'musicplayer', aac:'musicplayer',
  jpg:'imageviewer', jpeg:'imageviewer', png:'imageviewer', gif:'imageviewer', webp:'imageviewer', svg:'imageviewer',
  txt:'texteditor',  md:'texteditor',   js:'texteditor',  jsx:'texteditor', ts:'texteditor',
  json:'texteditor', html:'texteditor', css:'texteditor', py:'texteditor',  java:'texteditor',
  pdf:'pdf',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const uid   = () => `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
const clamp = (v,lo,hi) => Math.min(Math.max(v,lo),hi);
const tsLabel = ts => {
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return format(new Date(ts),'dd/MM HH:mm');
};

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

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

/* ── Inline name-input dialog ── */
const InlineDialog = ({ title, placeholder, defaultValue = '', confirmLabel = 'Create', onConfirm, onCancel }) => {
  const [val, setVal] = useState(defaultValue);
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 40); }, []);

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:99998 }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'rgba(16,16,26,0.98)', backdropFilter:'blur(24px)',
          border:'1px solid rgba(255,255,255,0.14)', borderRadius:12,
          padding:'26px 24px', minWidth:330, boxShadow:'0 24px 64px rgba(0,0,0,0.75)' }}
      >
        <div style={{ fontWeight:700, fontSize:15, marginBottom:16, color:'white' }}>{title}</div>
        <input
          ref={ref} value={val} onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(val.trim()); if (e.key === 'Escape') onCancel(); }}
          style={{ width:'100%', background:'rgba(255,255,255,0.09)', border:'1px solid rgba(255,255,255,0.18)',
            borderRadius:7, padding:'10px 13px', color:'white', fontSize:13, outline:'none', marginBottom:16 }}
        />
        <div style={{ display:'flex', gap:9, justifyContent:'flex-end' }}>
          <button onClick={onCancel}
            style={{ padding:'7px 18px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500,
              background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)', color:'white' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(val.trim())}
            style={{ padding:'7px 18px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600,
              background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`, border:'none', color:'#000' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Context Menu ── */
const CtxMenu = ({ items, x, y, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => window.addEventListener('mousedown', fn), 60);
    return () => { clearTimeout(t); window.removeEventListener('mousedown', fn); };
  }, [onClose]);

  const realN = items.filter(i => i !== 'sep').length;
  const sepN  = items.length - realN;
  const estH  = realN * 36 + sepN * 9 + 10;
  const left  = Math.min(x, window.innerWidth  - 235);
  const top   = Math.min(y, window.innerHeight - estH - 10);

  return (
    <div ref={ref} style={{ position:'fixed', left, top, zIndex:99999 }}>
      <div style={{ background:'rgba(14,14,24,0.98)', backdropFilter:'blur(28px)',
        border:'1px solid rgba(255,255,255,0.12)', borderRadius:9, padding:'4px 0',
        minWidth:218, boxShadow:'0 10px 44px rgba(0,0,0,0.7)' }}>
        {items.map((item, i) => {
          if (item === 'sep') return <div key={i} style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'3px 0' }}/>;
          return (
            <div key={i}
              onClick={() => { if (!item.disabled) { item.action?.(); onClose(); } }}
              style={{ padding:'8px 14px', fontSize:13, cursor:item.disabled ? 'default' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                opacity:item.disabled ? 0.35 : 1, color:item.danger ? '#ff5f56' : 'white',
                transition:'background 0.1s' }}
              onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background='rgba(79,172,254,0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; }}
            >
              <span style={{ display:'flex', alignItems:'center', gap:9 }}>
                {item.icon && <span style={{ opacity:0.65, display:'flex' }}>{item.icon}</span>}
                {item.label}
              </span>
              {item.kbd && <span style={{ fontSize:10, opacity:0.32, fontFamily:'monospace', marginLeft:18 }}>{item.kbd}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Toast pop-up ── */
const Toast = ({ notif, onDismiss }) => {
  const palette = { success:'#27c93f', error:'#ff5f56', warning:'#ffbd2e', info:ACCENT };
  const icons   = { success:<CheckCircle size={14}/>, error:<AlertCircle size={14}/>, warning:<AlertTriangle size={14}/>, info:<Bell size={14}/> };
  const c = palette[notif.type] || ACCENT;
  return (
    <div style={{ background:'rgba(14,14,24,0.97)', backdropFilter:'blur(20px)',
      border:`1px solid ${c}28`, borderLeft:`3px solid ${c}`, borderRadius:8,
      padding:'10px 13px', minWidth:265, maxWidth:355,
      boxShadow:'0 4px 22px rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-start', gap:9,
      animation:'toastIn 0.22s ease' }}>
      <span style={{ color:c, marginTop:1, flexShrink:0 }}>{icons[notif.type]}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:1 }}>{notif.title}</div>
        {notif.message && <div style={{ fontSize:11, opacity:0.62 }}>{notif.message}</div>}
      </div>
      <X size={12} onClick={() => onDismiss(notif.id)}
        style={{ cursor:'pointer', opacity:0.38, marginTop:2, flexShrink:0 }}/>
    </div>
  );
};

/* ── Notification Panel (Android-style slide from top-right) ── */
const NotifPanel = ({ history, onClear, onClearOne, onClose, taskbarPos }) => {
  const palette = { success:'#27c93f', error:'#ff5f56', warning:'#ffbd2e', info:ACCENT };
  const icons   = { success:<CheckCircle size={14}/>, error:<AlertCircle size={14}/>, warning:<AlertTriangle size={14}/>, info:<Bell size={14}/> };
  const top   = taskbarPos === 'top'    ? TASKBAR_H     : 0;
  const right = taskbarPos === 'right'  ? TASKBAR_W     : 0;
  const br    = top === 0 ? '0 0 16px 16px' : '16px 16px 0 0';

  return (
    <div style={{ position:'fixed', top, right, width:390, maxHeight:'72vh',
      background:'rgba(8,8,18,0.98)', backdropFilter:'blur(36px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:br,
      boxShadow:'0 12px 56px rgba(0,0,0,0.7)', zIndex:9998,
      display:'flex', flexDirection:'column', animation:'panelSlide 0.26s ease' }}>

      {/* Header */}
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between',
        borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <span style={{ fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
          <Inbox size={16} style={{ opacity:0.7 }}/>
          Notifications
          {history.length > 0 && (
            <span style={{ background:ACCENT, color:'#000', borderRadius:10,
              fontSize:10, padding:'1px 7px', fontWeight:700 }}>{history.length}</span>
          )}
        </span>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {history.length > 0 && (
            <button onClick={onClear}
              style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.42)',
                cursor:'pointer', fontSize:11, padding:'3px 8px', borderRadius:5 }}>
              Clear all
            </button>
          )}
          <X size={15} style={{ cursor:'pointer', opacity:0.45 }} onClick={onClose}/>
        </div>
      </div>

      {/* Notification list */}
      <div style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
        {history.length === 0 ? (
          <div style={{ padding:'44px 20px', textAlign:'center', opacity:0.32 }}>
            <BellOff size={38} style={{ margin:'0 auto 12px', display:'block' }}/>
            <div style={{ fontSize:13 }}>No notifications</div>
          </div>
        ) : (
          [...history].reverse().map(n => {
            const c = palette[n.type] || ACCENT;
            return (
              <div key={n.id}
                style={{ padding:'11px 14px', display:'flex', alignItems:'flex-start', gap:11,
                  borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <div style={{ width:32, height:32, borderRadius:'50%',
                  background:`${c}1c`, border:`1px solid ${c}38`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, color:c }}>
                  {icons[n.type]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{n.title}</div>
                  {n.message && <div style={{ fontSize:11, opacity:0.58, marginTop:2, wordBreak:'break-word' }}>{n.message}</div>}
                  <div style={{ fontSize:10, opacity:0.32, marginTop:4,
                    display:'flex', alignItems:'center', gap:4 }}>
                    <Clock size={9}/>{tsLabel(n.ts)}
                  </div>
                </div>
                <X size={12} onClick={() => onClearOne(n.id)}
                  style={{ cursor:'pointer', opacity:0.28, flexShrink:0, marginTop:4 }}/>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div style={{ padding:'9px 14px', borderTop:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', gap:7, fontSize:10, opacity:0.38 }}>
        <Bell size={11}/> Ctrl+A to toggle · Esc to close
      </div>
    </div>
  );
};

/* ── Quick Settings ── */
const QuickSettings = ({ onClose, volume, setVolume, brightness, setBrightness, wifi, setWifi, cloudSync, setCloudSync, notify, taskbarPos }) => {
  const bottom = taskbarPos === 'bottom' ? TASKBAR_H + 8 : 8;
  const right  = taskbarPos === 'right'  ? TASKBAR_W + 8 : 8;
  return (
    <div style={{ position:'fixed', bottom, right, width:315,
      background:'rgba(8,8,18,0.98)', backdropFilter:'blur(30px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:13,
      padding:18, zIndex:9998, boxShadow:'0 10px 44px rgba(0,0,0,0.65)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontWeight:700, fontSize:13 }}>Quick Settings</span>
        <X size={14} style={{ cursor:'pointer', opacity:0.42 }} onClick={onClose}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:14 }}>
        {[
          { icon: wifi ? <Wifi size={15}/> : <WifiOff size={15}/>,           label:'Wi-Fi',      on:wifi,      toggle:()=>setWifi(w=>!w) },
          { icon:<Bluetooth size={15}/>,                                       label:'Bluetooth',  on:false,     toggle:()=>notify('info','Bluetooth','Coming soon') },
          { icon: cloudSync ? <Cloud size={15}/> : <HardDrive size={15}/>,    label:'Cloud Sync', on:cloudSync, toggle:()=>setCloudSync(c=>!c) },
          { icon:<Airplay size={15}/>,                                         label:'Airplay',    on:false,     toggle:()=>notify('info','AirPlay','Coming soon') },
        ].map((t,i) => (
          <div key={i} onClick={t.toggle} style={{ display:'flex', alignItems:'center', gap:7,
            padding:'9px 11px', borderRadius:8, cursor:'pointer', fontSize:12,
            background:t.on?'rgba(79,172,254,0.22)':'rgba(255,255,255,0.05)',
            border:`1px solid ${t.on?'rgba(79,172,254,0.45)':'rgba(255,255,255,0.07)'}`,
            color:t.on?ACCENT:'rgba(255,255,255,0.65)', transition:'all 0.15s' }}>
            {t.icon}<span>{t.label}</span>
          </div>
        ))}
      </div>
      {[
        { label:'Volume',     icon:<Volume2 size={12}/>, value:volume,     set:setVolume },
        { label:'Brightness', icon:<Sun size={12}/>,     value:brightness, set:setBrightness },
      ].map((s,i) => (
        <div key={i} style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, opacity:0.58, marginBottom:4 }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>{s.icon}{s.label}</span>
            <span>{s.value}%</span>
          </div>
          <input type="range" min={0} max={100} value={s.value}
            onChange={e => s.set(+e.target.value)} style={{ width:'100%', accentColor:ACCENT }}/>
        </div>
      ))}
    </div>
  );
};

/* ── Calendar Popover ── */
const CalendarPopover = ({ date, taskbarPos }) => {
  const [view, setView] = useState(new Date(date.getFullYear(), date.getMonth(), 1));
  const bottom = taskbarPos === 'bottom' ? TASKBAR_H + 8 : 8;
  const right  = taskbarPos === 'right'  ? TASKBAR_W + 8 : 8;
  const firstDay    = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  const isToday = d => d && d === date.getDate() && view.getMonth() === date.getMonth() && view.getFullYear() === date.getFullYear();
  return (
    <div style={{ position:'fixed', bottom, right, width:264,
      background:'rgba(8,8,18,0.98)', backdropFilter:'blur(30px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:13,
      padding:17, zIndex:9998, boxShadow:'0 10px 44px rgba(0,0,0,0.65)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:13 }}>
        <ChevronLeft size={14} style={{ cursor:'pointer', opacity:0.58 }}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth()-1, 1))}/>
        <span style={{ fontWeight:700, fontSize:13 }}>{format(view,'MMMM yyyy')}</span>
        <ChevronRight size={14} style={{ cursor:'pointer', opacity:0.58 }}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth()+1, 1))}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:10, opacity:0.38, padding:'3px 0', fontWeight:600 }}>{d}</div>
        ))}
        {cells.map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:12, padding:'5px 2px', borderRadius:5,
            background:isToday(d)?ACCENT:'transparent',
            color:isToday(d)?'#000':d?'white':'transparent',
            fontWeight:isToday(d)?700:400 }}>{d||''}</div>
        ))}
      </div>
    </div>
  );
};

/* ── Power Menu ── */
const PowerMenu = ({ onClose }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.62)',
    backdropFilter:'blur(7px)', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:99998 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background:'rgba(8,8,18,0.98)', backdropFilter:'blur(32px)',
      border:'1px solid rgba(255,255,255,0.12)', borderRadius:15,
      padding:'28px 22px', minWidth:258, boxShadow:'0 24px 64px rgba(0,0,0,0.75)' }}>
      <h3 style={{ margin:'0 0 18px', textAlign:'center', fontSize:15, fontWeight:700 }}>Power Options</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {[
          { icon:<Lock size={17}/>,    label:'Lock',      bg:'rgba(255,255,255,0.08)', bd:'rgba(255,255,255,0.12)', action:onClose },
          { icon:<RotateCw size={17}/>,label:'Restart',   bg:'rgba(255,255,255,0.08)', bd:'rgba(255,255,255,0.12)', action:() => window.location.reload() },
          { icon:<Power size={17}/>,   label:'Shut Down', bg:'rgba(255,59,48,0.18)',   bd:'rgba(255,59,48,0.35)', tc:'#ff5f56', action:() => { if(confirm('Shut down LynkOS?')) window.close(); } },
        ].map((o,i) => (
          <button key={i} onClick={o.action}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              padding:'11px 18px', background:o.bg, border:`1px solid ${o.bd}`,
              color:o.tc||'white', borderRadius:8, cursor:'pointer', fontSize:13,
              fontWeight:500, transition:'filter 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.filter='brightness(1.22)'}
            onMouseLeave={e => e.currentTarget.style.filter='brightness(1)'}
          >{o.icon}{o.label}</button>
        ))}
        <button onClick={onClose}
          style={{ padding:'7px', background:'transparent', border:'none',
            color:'rgba(255,255,255,0.32)', cursor:'pointer', fontSize:12, marginTop:2 }}>Cancel</button>
      </div>
    </div>
  </div>
);

/* ── Search Overlay ── */
const SearchOverlay = ({ onClose, openApp }) => {
  const [q, setQ] = useState('');
  const inputRef  = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const results = useMemo(() => {
    const all = Object.values(APP_REGISTRY);
    return q.trim() ? all.filter(a => a.title.toLowerCase().includes(q.toLowerCase())) : all;
  }, [q]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.70)', backdropFilter:'blur(12px)',
      display:'flex', flexDirection:'column', alignItems:'center', paddingTop:100, zIndex:99997 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:555, padding:'0 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11,
          background:'rgba(14,14,24,0.99)', backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.15)', borderRadius:13,
          padding:'13px 18px', marginBottom:8, boxShadow:'0 24px 64px rgba(0,0,0,0.7)' }}>
          <Search size={17} style={{ opacity:0.4, flexShrink:0 }}/>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search apps…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'white', fontSize:15 }}
            onKeyDown={e => { if(e.key==='Escape') onClose(); if(e.key==='Enter'&&results[0]){ openApp(results[0].id); onClose(); } }}/>
          <kbd style={{ fontSize:10, opacity:0.3, border:'1px solid rgba(255,255,255,0.18)', borderRadius:4, padding:'2px 6px' }}>ESC</kbd>
        </div>
        <div style={{ background:'rgba(14,14,24,0.99)', backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.08)', borderRadius:11, overflow:'hidden',
          boxShadow:'0 18px 52px rgba(0,0,0,0.6)' }}>
          {results.slice(0,8).map((app,i) => (
            <div key={app.id} onClick={() => { openApp(app.id); onClose(); }}
              style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 15px',
                cursor:'pointer', fontSize:13,
                borderBottom:i<results.length-1?'1px solid rgba(255,255,255,0.04)':'none',
                transition:'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(79,172,254,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <span style={{ fontSize:20 }}>{app.emoji}</span>
              <span>{app.title}</span>
              <span style={{ marginLeft:'auto', fontSize:10, opacity:0.26 }}>App</span>
            </div>
          ))}
          {results.length === 0 && <div style={{ padding:'18px', textAlign:'center', opacity:0.28, fontSize:13 }}>No results</div>}
        </div>
      </div>
    </div>
  );
};

/* ── Start Menu ── */
const smBtnStyle = {
  display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
  background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.13)',
  color:'white', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:500,
};

const SmAppIcon = ({ app, pinned, onOpen, onTogglePin }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onOpen}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5,
        padding:'10px 4px', borderRadius:8, cursor:'pointer', position:'relative',
        background:hov?'rgba(255,255,255,0.09)':'transparent', transition:'background 0.12s' }}>
      <span style={{ fontSize:26 }}>{app.emoji}</span>
      <span style={{ fontSize:10, textAlign:'center', opacity:0.82, lineHeight:1.2, wordBreak:'break-word' }}>{app.title}</span>
      {hov && (
        <div onClick={e => { e.stopPropagation(); onTogglePin(); }}
          style={{ position:'absolute', top:4, right:4, opacity:0.52 }} title={pinned?'Unpin':'Pin'}>
          {pinned ? <PinOff size={10}/> : <Pin size={10}/>}
        </div>
      )}
    </div>
  );
};

const StartMenu = ({ onClose, openApp, user, onSettings, onPower, pinnedApps, setPinnedApps, taskbarPos }) => {
  const [tab, setTab] = useState('pinned');
  const allApps = Object.values(APP_REGISTRY);
  const bottom  = taskbarPos === 'bottom' ? TASKBAR_H + 6 : 'auto';
  const top     = taskbarPos === 'top'    ? TASKBAR_H + 6 : 'auto';
  const togglePin = id => setPinnedApps(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  return (
    <div style={{ position:'fixed', bottom, top, left:'50%', transform:'translateX(-50%)',
      width:610, background:'rgba(6,6,16,0.98)', backdropFilter:'blur(36px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:15,
      boxShadow:'0 -10px 56px rgba(0,0,0,0.72)', overflow:'hidden', zIndex:9997 }}>
      {/* User row */}
      <div style={{ padding:'15px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:'50%',
          background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:700, fontSize:16, color:'#000', flexShrink:0 }}>
          {user.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight:600, fontSize:13 }}>{user.name}</div>
          <div style={{ fontSize:11, opacity:0.42 }}>{user.role}</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:7 }}>
          <button onClick={onSettings} style={smBtnStyle}><Settings size={12}/>Settings</button>
          <button onClick={onPower}    style={{...smBtnStyle, borderColor:'rgba(255,59,48,0.38)', color:'#ff5f56'}}>
            <Power size={12}/>Power
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {['pinned','all'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'9px',
            background:'transparent', border:'none',
            color:tab===t?'white':'rgba(255,255,255,0.36)',
            fontSize:12, fontWeight:tab===t?600:400, cursor:'pointer',
            borderBottom:tab===t?`2px solid ${ACCENT}`:'2px solid transparent',
            transition:'all 0.15s' }}>
            {t==='pinned' ? '📌 Pinned' : '🔠 All Apps'}
          </button>
        ))}
      </div>
      {/* Grid */}
      <div style={{ padding:15, overflowY:'auto', maxHeight:345 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
          {(tab==='pinned' ? allApps.filter(a=>pinnedApps.includes(a.id)) : allApps).map(app => (
            <SmAppIcon key={app.id} app={app}
              pinned={pinnedApps.includes(app.id)}
              onOpen={() => { openApp(app.id); onClose(); }}
              onTogglePin={() => togglePin(app.id)}/>
          ))}
          {tab==='pinned' && pinnedApps.length===0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', opacity:0.28, fontSize:12, padding:'20px 0' }}>
              No pinned apps — go to All Apps to pin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Traffic Light button ── */
const TL = ({ color, title, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width:12, height:12, borderRadius:'50%', background:color,
        cursor:'pointer', flexShrink:0,
        filter:hov?'brightness(1.3)':'brightness(0.88)', transition:'filter 0.1s' }}/>
  );
};

/* ── Window Frame ── */
const WindowFrame = ({ win, isActive, onFocus, onClose, onMin, onMax, children, taskbarPos, onCtxMenu, onMoved, onResized }) => {
  const maxW = (taskbarPos==='left'||taskbarPos==='right') ? window.innerWidth  - TASKBAR_W : window.innerWidth;
  const maxH = (taskbarPos==='top' ||taskbarPos==='bottom')? window.innerHeight - TASKBAR_H : window.innerHeight;
  const maxX = taskbarPos==='left' ? TASKBAR_W : 0;
  const maxY = taskbarPos==='top'  ? TASKBAR_H : 0;
  return (
    <Rnd
      position={win.isMax ? {x:maxX,y:maxY} : {x:win.x,y:win.y}}
      size={win.isMax ? {width:maxW,height:maxH} : {width:win.w,height:win.h}}
      minWidth={win.minW} minHeight={win.minH}
      bounds="window"
      disableDragging={win.isMax}
      enableResizing={!win.isMax ? { bottom:true,bottomLeft:true,bottomRight:true,left:true,right:true,top:true,topLeft:true,topRight:true } : false}
      dragHandleClassName="wdrag"
      style={{ zIndex:win.z }}
      onDragStart={onFocus}
      onDragStop={(_,d) => { if (!win.isMax) onMoved(d.x, d.y); }}
      onResizeStart={onFocus}
      onResizeStop={(_,__,ref,___,pos) => { if (!win.isMax) onResized(parseInt(ref.style.width), parseInt(ref.style.height), pos.x, pos.y); }}
    >
      <div onClick={onFocus} onContextMenu={onCtxMenu}
        style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column',
          background:DARK_GLASS, backdropFilter:'blur(26px) saturate(180%)',
          borderRadius:win.isMax?0:11,
          border:isActive?'1px solid rgba(79,172,254,0.32)':'1px solid rgba(255,255,255,0.07)',
          boxShadow:isActive?'0 22px 64px rgba(0,0,0,0.72),0 0 0 1px rgba(79,172,254,0.06)':'0 4px 26px rgba(0,0,0,0.52)',
          overflow:'hidden', transition:'border 0.15s,box-shadow 0.15s' }}>
        {/* Title bar */}
        <div className="wdrag" style={{ height:36, minHeight:36, flexShrink:0,
          background:isActive?'rgba(79,172,254,0.05)':'rgba(255,255,255,0.022)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 12px', cursor:win.isMax?'default':'move', userSelect:'none' }}>
          <span style={{ fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:7, opacity:isActive?0.95:0.5 }}>
            <span style={{ fontSize:14 }}>{APP_REGISTRY[win.appId]?.emoji}</span>
            {win.title}
          </span>
          <div style={{ display:'flex', gap:7 }}>
            <TL color="#ffbd2e" title="Minimize"                       onClick={e => { e.stopPropagation(); onMin(); }}/>
            <TL color="#27c93f" title={win.isMax?'Restore':'Maximize'} onClick={e => { e.stopPropagation(); onMax(); }}/>
            <TL color="#ff5f56" title="Close"                          onClick={e => { e.stopPropagation(); onClose(); }}/>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex:1, overflow:'hidden', position:'relative', minHeight:0 }}>
          {children}
        </div>
      </div>
    </Rnd>
  );
};

/* ── Desktop Icon ── */
const DesktopIcon = ({ ic, selected, size, onSingleClick, onDoubleClick, onContextMenu, onDragStop }) => {
  const app  = APP_REGISTRY[ic.id];
  const px   = { small:54, medium:68, large:84 }[size];
  const emsz = { small:22, medium:30, large:40 }[size];
  const fsz  = { small:10, medium:11, large:13 }[size];
  return (
    <Rnd position={{ x:ic.x, y:ic.y }} size={{ width:px, height:px+28 }}
      enableResizing={false} bounds="parent" dragHandleClassName="ihdl"
      onDragStop={(_,d) => onDragStop(d.x, d.y)}>
      <div className="ihdl" onClick={onSingleClick} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}
        style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer',
          padding:4, borderRadius:7, userSelect:'none',
          background:selected?'rgba(79,172,254,0.24)':'transparent',
          border:`1px solid ${selected?'rgba(79,172,254,0.48)':'transparent'}`,
          transition:'background 0.1s' }}>
        <span style={{ fontSize:emsz, lineHeight:1, filter:'drop-shadow(0 2px 7px rgba(0,0,0,0.75))' }}>
          {app?.emoji || (ic.isFolder ? '📁' : '📄')}
        </span>
        <span style={{ fontSize:fsz, textAlign:'center', lineHeight:1.25, maxWidth:'100%',
          textShadow:'0 1px 5px rgba(0,0,0,0.95)', wordBreak:'break-word',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {ic.label}
        </span>
      </div>
    </Rnd>
  );
};

/* ── Taskbar ── */
const Taskbar = ({
  position, windows, activeId,
  startOpen, onStart, onSearch,
  time, onClockClick, volume,
  onQuickSettings, onPower,
  pinnedApps, openApp, onWindowClick,
  unreadCount, onNotifPanel,
}) => {
  const isVert = position === 'left' || position === 'right';
  const barStyle = {
    position:'fixed', background:'rgba(5,5,13,0.94)', backdropFilter:'blur(22px)',
    zIndex:9995, display:'flex', alignItems:'center',
    ...(isVert ? {
      top:0, [position]:0, bottom:0, width:TASKBAR_W, flexDirection:'column', padding:'8px 0',
      borderRight:position==='left'?'1px solid rgba(255,255,255,0.065)':undefined,
      borderLeft: position==='right'?'1px solid rgba(255,255,255,0.065)':undefined,
    } : {
      left:0, right:0, height:TASKBAR_H, flexDirection:'row', padding:'0 10px', gap:3,
      borderTop:   position==='bottom'?'1px solid rgba(255,255,255,0.065)':undefined,
      borderBottom:position==='top'   ?'1px solid rgba(255,255,255,0.065)':undefined,
      ...(position==='bottom'?{bottom:0}:{top:0}),
    }),
  };
  const runningIds = [...new Set(windows.map(w => w.appId))];
  const dockIds    = [...new Set([...pinnedApps, ...runningIds])];

  return (
    <div style={barStyle}>
      {/* Start */}
      <button onClick={onStart} style={{ background:startOpen?'rgba(79,172,254,0.22)':'transparent',
        border:'none', color:'white', cursor:'pointer', borderRadius:7,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:isVert?'7px':'6px 10px', margin:isVert?'0 0 6px':'0 5px 0 0',
        transition:'background 0.15s', flexShrink:0 }}>
        <LayoutGrid size={17}/>
      </button>
      {/* Search */}
      {!isVert && (
        <button onClick={onSearch} style={{ background:'rgba(255,255,255,0.055)',
          border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.42)',
          cursor:'pointer', padding:'4px 12px', borderRadius:16,
          display:'flex', alignItems:'center', gap:6, fontSize:12,
          marginRight:8, flexShrink:0, transition:'all 0.15s' }}>
          <Search size={12}/>Search…
          <kbd style={{ fontSize:9, opacity:0.3, border:'1px solid rgba(255,255,255,0.15)', borderRadius:3, padding:'1px 5px', marginLeft:3 }}>⌘K</kbd>
        </button>
      )}
      {!isVert && <div style={{ width:1, height:18, background:'rgba(255,255,255,0.07)', marginRight:6, flexShrink:0 }}/>}
      {/* Dock */}
      <div style={{ flex:isVert?undefined:1, display:'flex', alignItems:'center',
        flexDirection:isVert?'column':'row', gap:isVert?2:1, overflow:'hidden', minWidth:0 }}>
        {dockIds.map(appId => {
          const app   = APP_REGISTRY[appId];
          if (!app) return null;
          const wins  = windows.filter(w => w.appId === appId);
          const isAct = wins.some(w => w.id === activeId && !w.isMin);
          const hasWin= wins.length > 0;
          return (
            <div key={appId} title={app.title}
              onClick={() => {
                if (!hasWin) { openApp(appId); return; }
                const w = wins[0];
                if (w.isMin || w.id !== activeId) onWindowClick(w.id);
                else onWindowClick(w.id);
              }}
              style={{ position:'relative', display:'flex', alignItems:'center', gap:6,
                padding:isVert?'7px':'4px 10px', borderRadius:7, cursor:'pointer', flexShrink:0,
                background:isAct?'rgba(79,172,254,0.17)':'transparent',
                border:`1px solid ${isAct?'rgba(79,172,254,0.34)':'transparent'}`,
                maxWidth:isVert?undefined:150, transition:'all 0.12s' }}
              onMouseEnter={e => { if(!isAct) e.currentTarget.style.background='rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if(!isAct) e.currentTarget.style.background='transparent'; }}>
              <span style={{ fontSize:16, flexShrink:0, opacity:hasWin?1:0.42 }}>{app.emoji}</span>
              {!isVert && <span style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis',
                whiteSpace:'nowrap', opacity:hasWin?0.9:0.42 }}>{app.title}</span>}
              {hasWin && (
                <div style={{ position:'absolute', bottom:isVert?2:1, left:'50%', transform:'translateX(-50%)',
                  width:wins.length>1?12:4, height:3, borderRadius:2,
                  background:isAct?ACCENT:'rgba(255,255,255,0.28)', transition:'all 0.15s' }}/>
              )}
            </div>
          );
        })}
      </div>
      {/* System Tray (horizontal) */}
      {!isVert && (
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, marginLeft:4 }}>
          <div onClick={onNotifPanel} style={{ position:'relative', cursor:'pointer', display:'flex', alignItems:'center', opacity:0.62 }}>
            <Bell size={14}/>
            {unreadCount > 0 && (
              <div style={{ position:'absolute', top:-5, right:-5, width:14, height:14,
                borderRadius:'50%', background:'#ff5f56', fontSize:9, fontWeight:700,
                color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
          <div onClick={onQuickSettings} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', opacity:0.6 }}>
            <Wifi size={13}/>
            {volume===0?<VolumeX size={13}/>:volume<50?<Volume size={13}/>:<Volume2 size={13}/>}
            <Battery size={13}/>
          </div>
          <div style={{ width:1, height:17, background:'rgba(255,255,255,0.1)' }}/>
          <div onClick={onClockClick} style={{ textAlign:'right', lineHeight:1.2, cursor:'pointer', userSelect:'none', flexShrink:0 }}>
            <div style={{ fontWeight:600, fontSize:12 }}>{format(time,'HH:mm')}</div>
            <div style={{ fontSize:10, opacity:0.4 }}>{format(time,'dd/MM/yy')}</div>
          </div>
          {/* Show desktop strip */}
          <div style={{ width:3, height:30, background:'rgba(255,255,255,0.06)', cursor:'pointer', borderRadius:2, marginLeft:2 }}
            title="Show Desktop"
            onMouseEnter={e => e.currentTarget.style.background=ACCENT}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}/>
        </div>
      )}
      {/* Vertical tray */}
      {isVert && (
        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', alignItems:'center', gap:7, paddingBottom:8 }}>
          <div onClick={onNotifPanel} style={{ position:'relative', cursor:'pointer', opacity:0.58, padding:5 }}>
            <Bell size={14}/>
            {unreadCount > 0 && <div style={{ position:'absolute', top:1, right:1, width:8, height:8, borderRadius:'50%', background:'#ff5f56' }}/>}
          </div>
          <button onClick={onClockClick} style={{ background:'transparent', border:'none',
            color:'rgba(255,255,255,0.44)', cursor:'pointer', fontSize:10, padding:3, lineHeight:1.3, textAlign:'center' }}>
            {format(time,'HH')}<br/>{format(time,'mm')}
          </button>
          <button onClick={onPower} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:5 }}>
            <Power size={13}/>
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DESKTOP
// ═══════════════════════════════════════════════════════════════════════════════
export default function Desktop() {

  // ── Core state ──────────────────────────────────────────────────────────────
  const [windows,       setWindows]       = useState([]);
  const [activeId,      setActiveId]      = useState(null);
  const [wallpaper,     setWallpaper]     = useState(WALLPAPERS['Vanta Waves']);
  const [theme,         setTheme]         = useState('dark');
  const [taskbarPos,    setTaskbarPos]    = useState('bottom');
  const [iconSize,      setIconSize]      = useState('medium');
  const [desktopIcons,  setDesktopIcons]  = useState(defaultIcons);
  const [selectedIcons, setSelectedIcons] = useState([]);
  const [pinnedApps,    setPinnedApps]    = useState(['filemanager','browser','texteditor','terminal','settings']);

  // ── Panels ──────────────────────────────────────────────────────────────────
  const [startOpen,     setStartOpen]     = useState(false);
  const [ctxMenu,       setCtxMenu]       = useState(null);
  const [powerOpen,     setPowerOpen]     = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [showCal,       setShowCal]       = useState(false);
  const [showQS,        setShowQS]        = useState(false);
  const [showNotifPanel,setShowNotifPanel]= useState(false);

  // ── Dialogs ─────────────────────────────────────────────────────────────────
  const [newFolderDlg, setNewFolderDlg] = useState(false);
  const [newFileDlg,   setNewFileDlg]   = useState(false);

  // ── Notifications ────────────────────────────────────────────────────────────
  const [liveToasts,   setLiveToasts]   = useState([]);
  const [notifHistory, setNotifHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
  });
  const [unreadCount,  setUnreadCount]  = useState(0);

  // ── System ───────────────────────────────────────────────────────────────────
  const [volume,     setVolume]     = useState(70);
  const [brightness, setBrightness] = useState(100);
  const [wifi,       setWifi]       = useState(true);
  const [cloudSync,  setCloudSync]  = useState(true);
  const [time,       setTime]       = useState(new Date());

  const [user] = useState({ name:'LynkOS User', email:'user@lynkos.com', role:'Administrator' });

  // ── VFS (shared across all apps) ────────────────────────────────────────────
  const [vfs, setVfs] = useState(null);
  useEffect(() => {
    const fs = new VirtualFileSystem();
    fs.initializeFileSystem().then(() => setVfs(fs));
  }, []);

  const topZ        = useRef(100);
  const autoSaveRef = useRef(null);
  const lastCtrl    = useRef(0);      // double-ctrl detection

  // ── Clock ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Session load ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadState(); }, []);

  // ── Auto-save ────────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(saveState, AUTO_SAVE_MS);
    return () => clearInterval(autoSaveRef.current);
  });

  // ── close all panels ─────────────────────────────────────────────────────────
  const closeAllPanels = useCallback(() => {
    setCtxMenu(null); setStartOpen(false); setSearchOpen(false);
    setShowCal(false); setShowQS(false); setShowNotifPanel(false);
  }, []);

  // ── Notify ────────────────────────────────────────────────────────────────────
  const notify = useCallback((type, title, message = '') => {
    const id  = uid();
    const ts  = Date.now();
    const rec = { id, type, title, message, ts };

    setLiveToasts(p => [...p, rec]);
    setTimeout(() => setLiveToasts(p => p.filter(n => n.id !== id)), 5500);

    setNotifHistory(prev => {
      const next = [rec, ...prev].slice(0, 100);
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setUnreadCount(c => c + 1);
  }, []);

  const dismissToast   = useCallback(id => setLiveToasts(p => p.filter(n => n.id !== id)), []);
  const clearNotifOne  = useCallback(id => setNotifHistory(p => { const n=p.filter(x=>x.id!==id); try{localStorage.setItem(NOTIF_KEY,JSON.stringify(n));}catch{} return n; }), []);
  const clearAllNotifs = useCallback(() => { setNotifHistory([]); try{localStorage.removeItem(NOTIF_KEY);}catch{} }, []);
  const openNotifPanel = useCallback(() => {
    setShowNotifPanel(s => !s);
    setUnreadCount(0);
    setStartOpen(false); setShowCal(false); setShowQS(false);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = async (e) => {
      const tag     = document.activeElement?.tagName;
      const inField = ['INPUT','TEXTAREA','SELECT'].includes(tag);

      // ── Double Ctrl → Start Menu ──
      if (e.key === 'Control') {
        const now = Date.now();
        if (now - lastCtrl.current < 420) {
          setStartOpen(s => !s);
          setShowCal(false); setShowQS(false); setShowNotifPanel(false);
        }
        lastCtrl.current = now;
        return;
      }

      // ── Escape ──
      if (e.key === 'Escape') { closeAllPanels(); return; }

      // ── Delete (no modifier) ──
      if (e.key === 'Delete' && !inField && !e.ctrlKey && selectedIcons.length > 0) {
        e.preventDefault();
        setDesktopIcons(p => p.filter(i => !selectedIcons.includes(i.id)));
        setSelectedIcons([]);
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      // ── Ctrl+A  → Notification Panel  ──
      if (e.key === 'a' && !e.shiftKey && !e.altKey && !inField) {
        e.preventDefault(); openNotifPanel(); return;
      }
      // ── Ctrl+Shift+A → Select all desktop icons ──
      if (e.key === 'A' && e.shiftKey && !e.altKey && !inField) {
        e.preventDefault(); setSelectedIcons(desktopIcons.map(i => i.id)); return;
      }
      // ── Ctrl+K → Search ──
      if (e.key === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault(); setSearchOpen(s => !s); return;
      }
      // ── Ctrl+S → Save session ──
      if (e.key === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault(); saveState(); notify('success','Session Saved','Saved to local storage'); return;
      }
      // ── Ctrl+Alt+S → Export ZIP ──
      if (e.key === 's' && e.altKey && !e.shiftKey) {
        e.preventDefault(); await exportZip(); return;
      }
      // ── Ctrl+Alt+I → Import ZIP ──
      if (e.key === 'i' && e.altKey && !e.shiftKey) {
        e.preventDefault(); document.getElementById('lynkos-import')?.click(); return;
      }
      // ── Ctrl+N → New Folder ──
      if (e.key === 'n' && !e.shiftKey && !e.altKey && !inField) {
        e.preventDefault(); setNewFolderDlg(true); return;
      }
      // ── Ctrl+Alt+N → New File ──
      if (e.key === 'n' && e.altKey && !e.shiftKey && !inField) {
        e.preventDefault(); setNewFileDlg(true); return;
      }
      // ── Ctrl+W → Close active window ──
      if (e.key === 'w' && !e.altKey) {
        e.preventDefault(); if (activeId) closeWin(activeId); return;
      }
      // ── Ctrl+M → Minimize active window ──
      if (e.key === 'm' && !e.altKey) {
        e.preventDefault(); if (activeId) toggleMin(activeId); return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, desktopIcons, selectedIcons, closeAllPanels, openNotifPanel]);

  // ── Window management ─────────────────────────────────────────────────────────
  const openApp = useCallback((appId, initialFile = null, forceNew = false) => {
    const app = APP_REGISTRY[appId];
    if (!app) return;

    if (!forceNew && !initialFile) {
      const ex = windows.find(w => w.appId === appId);
      if (ex) { focusWin(ex.id); return; }
    }

    topZ.current += 1;
    const id     = `${appId}_${uid()}`;
    const offset = (windows.length % 8) * 26;
    const vw = window.innerWidth, vh = window.innerHeight;
    const tbW = (taskbarPos==='left'||taskbarPos==='right') ? TASKBAR_W : 0;
    const tbH = (taskbarPos==='top' ||taskbarPos==='bottom')? TASKBAR_H : 0;
    const tbX = taskbarPos==='left' ? TASKBAR_W : 0;
    const tbY = taskbarPos==='top'  ? TASKBAR_H : 0;
    const winW = Math.min(app.w, vw - tbW - 40);
    const winH = Math.min(app.h, vh - tbH - 40);
    const winX = clamp(tbX + 60 + offset, tbX + 10, vw - tbW - winW - 10);
    const winY = clamp(tbY + 40 + offset, tbY + 10, vh - tbH - winH - 10);

    setWindows(prev => [...prev, {
      id, appId, title: app.title,
      x:winX, y:winY, w:winW, h:winH,
      minW:app.minW, minH:app.minH,
      z:topZ.current, isMin:false, isMax:false, initialFile,
    }]);
    setActiveId(id);
    closeAllPanels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windows, taskbarPos, closeAllPanels]);

  const closeWin = useCallback(id => {
    setWindows(p => {
      const next = p.filter(w => w.id !== id);
      setActiveId(prev => {
        if (prev !== id) return prev;
        const vis = next.filter(w => !w.isMin);
        return vis.length ? vis[vis.length-1].id : null;
      });
      return next;
    });
  }, []);

  const focusWin = useCallback(id => {
    topZ.current += 1;
    setActiveId(id);
    setWindows(p => p.map(w => w.id === id ? { ...w, z:topZ.current, isMin:false } : w));
  }, []);

  const toggleMin = useCallback(id => {
    setWindows(p => {
      const wasMin = p.find(w => w.id === id)?.isMin;
      const next   = p.map(w => w.id === id ? { ...w, isMin:!w.isMin } : w);
      if (!wasMin) {
        setActiveId(prev => {
          if (prev !== id) return prev;
          const vis = next.filter(w => w.id !== id && !w.isMin);
          return vis.length ? vis[vis.length-1].id : null;
        });
      }
      return next;
    });
  }, []);

  const toggleMax    = useCallback(id => setWindows(p => p.map(w => w.id===id?{...w,isMax:!w.isMax}:w)), []);
  const moveWin      = useCallback((id,x,y)      => setWindows(p => p.map(w => w.id===id?{...w,x,y}:w)), []);
  const resizeWin    = useCallback((id,ww,hh,x,y)=> setWindows(p => p.map(w => w.id===id?{...w,w:ww,h:hh,x,y}:w)), []);
  const closeAllWins = useCallback(() => { setWindows([]); setActiveId(null); }, []);
  const minAllWins   = useCallback(() => setWindows(p => p.map(w => ({...w,isMin:true}))), []);
  const showDesktop  = useCallback(() => {
    const anyVis = windows.some(w => !w.isMin);
    anyVis ? minAllWins() : setWindows(p => p.map(w => ({...w,isMin:false})));
  }, [windows, minAllWins]);

  const openFile = useCallback(file => {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    openApp(EXT_MAP[ext] || 'texteditor', file, true);
  }, [openApp]);

  // ── Desktop new folder/file ────────────────────────────────────────────────────
  const createDesktopFolder = useCallback(name => {
    if (!name) return;
    const newId = `folder_${uid()}`;
    setDesktopIcons(p => [...p, { id:newId, label:name, x:230, y:22, isFolder:true }]);
    notify('success','Folder Created', `"${name}" added to desktop`);
    // Also create in VFS
    if (vfs) vfs.createFolder('/Users/Admin/Desktop', name).catch(() => {});
    setNewFolderDlg(false);
  }, [notify, vfs]);

  const createDesktopFile = useCallback(name => {
    if (!name) return;
    if (vfs) {
      vfs.createFile('/Users/Admin/Desktop', name, '').then(file => {
        openApp('texteditor', { ...file, vfsFile:true }, true);
        notify('success','New File', `"${name}" created and opened`);
      }).catch(() => openApp('texteditor', null, true));
    } else {
      openApp('texteditor', null, true);
      notify('success','New File', 'Text Editor opened');
    }
    setNewFileDlg(false);
  }, [notify, vfs, openApp]);

  // ── Session persistence ────────────────────────────────────────────────────────
  const getState = useCallback(() => ({
    version:'4.0', ts:Date.now(),
    wallpaper, theme, taskbarPos, iconSize, pinnedApps,
    desktopIcons: desktopIcons.map(({ id,label,x,y }) => ({ id,label,x,y })),
  }), [wallpaper, theme, taskbarPos, iconSize, pinnedApps, desktopIcons]);

  const saveState = useCallback(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(getState())); }
    catch(e) { console.warn('save failed', e); }
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
        const map = Object.fromEntries(s.desktopIcons.map(ic => [ic.id, ic]));
        setDesktopIcons(prev => prev.map(ic => map[ic.id] ? { ...ic, ...map[ic.id] } : ic));
      }
      notify('info','Welcome back','Session restored');
    } catch(e) { console.warn('load failed', e); }
  }, [notify]);

  const exportZip = useCallback(async () => {
    try {
      const zip = new JSZip();
      zip.file('state.json',    JSON.stringify(getState(), null, 2));
      zip.file('metadata.json', JSON.stringify({ date:new Date().toISOString(), user:user.name, version:'4.0' }, null, 2));
      const blob = await zip.generateAsync({ type:'blob' });
      saveAs(blob, `lynkos-${format(new Date(),'yyyy-MM-dd-HHmmss')}.zip`);
      notify('success','Exported','Session backup downloaded');
    } catch(e) { notify('error','Export Failed', String(e)); }
  }, [getState, user, notify]);

  const importZip = useCallback(async file => {
    try {
      const zip = await (new JSZip()).loadAsync(file);
      const f   = zip.file('state.json');
      if (f) {
        const s = JSON.parse(await f.async('text'));
        if (s.wallpaper)    setWallpaper(s.wallpaper);
        if (s.theme)        setTheme(s.theme);
        if (s.taskbarPos)   setTaskbarPos(s.taskbarPos);
        if (s.iconSize)     setIconSize(s.iconSize);
        if (s.pinnedApps)   setPinnedApps(s.pinnedApps);
        if (s.desktopIcons) {
          const map = Object.fromEntries(s.desktopIcons.map(ic => [ic.id, ic]));
          setDesktopIcons(prev => prev.map(ic => map[ic.id] ? { ...ic, ...map[ic.id] } : ic));
        }
        notify('success','Imported','Session restored from backup');
      } else { notify('warning','Import','No state.json found in ZIP'); }
    } catch(e) { notify('error','Import Failed', String(e)); }
  }, [notify]);

  // ── Context menus ─────────────────────────────────────────────────────────────
  const closeCtx = useCallback(() => setCtxMenu(null), []);

  const desktopCtx = useCallback(e => {
    e.preventDefault();
    setCtxMenu({ x:e.clientX, y:e.clientY, items:[
      { icon:<RefreshCw size={13}/>,    label:'Refresh',           action:() => notify('info','Refreshed','') },
      { icon:<Palette size={13}/>,      label:'Personalize',       action:() => openApp('settings') },
      'sep',
      { icon:<Layers size={13}/>,       label:'Show Desktop',      action:showDesktop },
      { icon:<LayoutGrid size={13}/>,   label:`Icon Size: ${iconSize}`,
        action:() => setIconSize(s=>({small:'medium',medium:'large',large:'small'})[s]) },
      'sep',
      { icon:<FolderPlus size={13}/>,   label:'New Folder',        kbd:'Ctrl+N',     action:() => setNewFolderDlg(true) },
      { icon:<FilePlus size={13}/>,     label:'New Text File',     kbd:'Ctrl+Alt+N', action:() => setNewFileDlg(true) },
      'sep',
      { icon:<Save size={13}/>,         label:'Save Session',      kbd:'Ctrl+S',     action:() => { saveState(); notify('success','Saved',''); } },
      { icon:<DownloadCloud size={13}/>,label:'Export ZIP',        kbd:'Ctrl+Alt+S', action:exportZip },
      { icon:<UploadCloud size={13}/>,  label:'Import Backup',     kbd:'Ctrl+Alt+I', action:() => document.getElementById('lynkos-import')?.click() },
    ]});
  }, [iconSize, openApp, showDesktop, saveState, exportZip, notify]);

  const iconCtx = useCallback((e, iconId) => {
    e.preventDefault(); e.stopPropagation();
    if (!selectedIcons.includes(iconId)) setSelectedIcons([iconId]);
    setCtxMenu({ x:e.clientX, y:e.clientY, items:[
      { icon:<FolderOpen size={13}/>, label:'Open',      action:() => { openApp(iconId); setSelectedIcons([]); } },
      'sep',
      { icon:<Edit3 size={13}/>,      label:'Rename',    action:() => notify('info','Rename','Double-click to rename') },
      { icon:<Copy size={13}/>,       label:'Copy',      action:() => notify('info','Copied','') },
      { icon:<Trash2 size={13}/>,     label:'Delete',    danger:true,
        action:() => { setDesktopIcons(p=>p.filter(ic=>!selectedIcons.includes(ic.id))); setSelectedIcons([]); } },
      'sep',
      { icon:<Info size={13}/>,       label:'Properties',action:() => notify('info','Properties',`App: ${APP_REGISTRY[iconId]?.title||iconId}`) },
    ]});
  }, [selectedIcons, openApp, notify]);

  const windowCtx = useCallback((e, winId) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x:e.clientX, y:e.clientY, items:[
      { icon:<Maximize size={13}/>, label:'Maximize',     action:() => toggleMax(winId) },
      { icon:<Minimize size={13}/>, label:'Minimize',     action:() => toggleMin(winId) },
      { icon:<X size={13}/>,        label:'Close',        danger:true, action:() => closeWin(winId) },
      'sep',
      { icon:<XSquare size={13}/>,  label:'Close All',    action:closeAllWins },
      { icon:<Minimize size={13}/>, label:'Minimize All', action:minAllWins },
    ]});
  }, [toggleMax, toggleMin, closeWin, closeAllWins, minAllWins]);

  // ── App props factory ─────────────────────────────────────────────────────────
  const makeAppProps = useCallback(win => ({
    // VFS — full file system access for apps that need it
    vfs,
    // Appearance settings (SettingsApp can change these)
    currentWallpaper:wallpaper,  setWallpaper,
    wallpapers:WALLPAPERS,
    theme,                        setTheme,
    taskbarPos,                   setTaskbarPos,
    iconSize,                     setIconSize,
    pinnedApps,                   setPinnedApps,
    // User & system
    user,
    notify,
    // Inter-app communication
    onOpenFile: openFile,
    onOpenApp:  openApp,
    onClose:    () => closeWin(win.id),
    // File payload (e.g. double-clicking a file in File Manager)
    initialFile: win.initialFile,
  }), [vfs, wallpaper, theme, taskbarPos, iconSize, pinnedApps, user, notify, openFile, openApp, closeWin]);

  // ── Background ────────────────────────────────────────────────────────────────
  const bgStyle = useMemo(() => {
    const isUrl = wallpaper.startsWith('url(');
    return isUrl
      ? { backgroundImage:wallpaper, backgroundSize:'cover', backgroundPosition:'center' }
      : { background:wallpaper };
  }, [wallpaper]);

  // ── Desktop area click ────────────────────────────────────────────────────────
  const onDesktopClick = e => {
    if (e.target === e.currentTarget) setSelectedIcons([]);
    closeAllPanels();
  };

  // ── VFS loading state ─────────────────────────────────────────────────────────
  if (!vfs) {
    return (
      <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', color:'white', fontFamily:'system-ui' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:18 }}>🌐</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>LynkOS</div>
          <div style={{ fontSize:12, opacity:0.5 }}>Initialising file system…</div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position:'fixed', inset:0, overflow:'hidden',
        fontFamily:"'Segoe UI Variable','SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        color:'white', userSelect:'none', ...bgStyle }}
      onClick={onDesktopClick}
      onContextMenu={desktopCtx}
    >
      {/* Brightness overlay */}
      {brightness < 100 && (
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:99999,
          background:`rgba(0,0,0,${(100-brightness)/100*0.78})` }}/>
      )}

      {/* Desktop icon area (inset away from taskbar) */}
      <div style={{
        position:'absolute',
        top:   taskbarPos==='top'    ? TASKBAR_H : 0,
        bottom:taskbarPos==='bottom' ? TASKBAR_H : 0,
        left:  taskbarPos==='left'   ? TASKBAR_W : 0,
        right: taskbarPos==='right'  ? TASKBAR_W : 0,
        overflow:'hidden', pointerEvents:'none',
      }}>
        <div style={{ position:'relative', width:'100%', height:'100%', pointerEvents:'all' }}>
          {desktopIcons.map(ic => (
            <DesktopIcon
              key={ic.id} ic={ic} size={iconSize}
              selected={selectedIcons.includes(ic.id)}
              onSingleClick={e => {
                e.stopPropagation();
                if (e.ctrlKey||e.metaKey) setSelectedIcons(p => p.includes(ic.id)?p.filter(x=>x!==ic.id):[...p,ic.id]);
                else setSelectedIcons([ic.id]);
              }}
              onDoubleClick={() => openApp(ic.id)}
              onContextMenu={e => iconCtx(e, ic.id)}
              onDragStop={(x,y) => setDesktopIcons(p => p.map(i => i.id===ic.id?{...i,x,y}:i))}
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
            isActive={activeId === win.id}
            onFocus={() => focusWin(win.id)}
            onClose={() => closeWin(win.id)}
            onMin={() => toggleMin(win.id)}
            onMax={() => toggleMax(win.id)}
            taskbarPos={taskbarPos}
            onCtxMenu={e => windowCtx(e, win.id)}
            onMoved={(x,y)        => moveWin(win.id, x, y)}
            onResized={(w,h,x,y)  => resizeWin(win.id, w, h, x, y)}
          >
            <Comp {...makeAppProps(win)}/>
          </WindowFrame>
        );
      })}

      {/* Taskbar */}
      <Taskbar
        position={taskbarPos}
        windows={windows}
        activeId={activeId}
        startOpen={startOpen}
        onStart={() => { setStartOpen(s=>!s); setShowCal(false); setShowQS(false); setShowNotifPanel(false); }}
        onSearch={() => setSearchOpen(true)}
        time={time}
        onClockClick={() => { setShowCal(s=>!s); setShowQS(false); setStartOpen(false); setShowNotifPanel(false); }}
        volume={volume}
        onQuickSettings={() => { setShowQS(s=>!s); setShowCal(false); setStartOpen(false); setShowNotifPanel(false); }}
        onPower={() => setPowerOpen(true)}
        pinnedApps={pinnedApps}
        openApp={openApp}
        onWindowClick={id => {
          const w = windows.find(x => x.id === id);
          if (!w) return;
          if (w.isMin || w.id !== activeId) focusWin(id);
          else toggleMin(id);
        }}
        unreadCount={unreadCount}
        onNotifPanel={openNotifPanel}
      />

      {/* ── Overlays ── */}

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

      {showCal && <CalendarPopover date={time} taskbarPos={taskbarPos}/>}

      {powerOpen && <PowerMenu onClose={() => setPowerOpen(false)}/>}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} openApp={openApp}/>}

      {/* Android-style Notification Panel */}
      {showNotifPanel && (
        <NotifPanel
          history={notifHistory}
          onClear={clearAllNotifs}
          onClearOne={clearNotifOne}
          onClose={() => setShowNotifPanel(false)}
          taskbarPos={taskbarPos}
        />
      )}

      {/* Context menu */}
      {ctxMenu && <CtxMenu items={ctxMenu.items} x={ctxMenu.x} y={ctxMenu.y} onClose={closeCtx}/>}

      {/* Live toast stack */}
      <div style={{ position:'fixed',
        top:  taskbarPos==='top'   ? TASKBAR_H+8 : 12,
        right:taskbarPos==='right' ? TASKBAR_W+8 : 12,
        zIndex:99996, display:'flex', flexDirection:'column', gap:6,
        pointerEvents:'none', maxWidth:385 }}>
        {liveToasts.map(n => (
          <div key={n.id} style={{ pointerEvents:'all' }}>
            <Toast notif={n} onDismiss={dismissToast}/>
          </div>
        ))}
      </div>

      {/* New Folder dialog */}
      {newFolderDlg && (
        <InlineDialog title="📁 New Folder" placeholder="Folder name…" defaultValue="New Folder"
          onConfirm={createDesktopFolder} onCancel={() => setNewFolderDlg(false)}/>
      )}

      {/* New File dialog */}
      {newFileDlg && (
        <InlineDialog title="📄 New File" placeholder="File name…" defaultValue="untitled.txt"
          onConfirm={createDesktopFile} onCancel={() => setNewFileDlg(false)}/>
      )}

      {/* Hidden ZIP import input */}
      <input id="lynkos-import" type="file" accept=".zip" style={{ display:'none' }}
        onChange={e => { const f=e.target.files[0]; if(f) importZip(f); e.target.value=''; }}/>

      {/* Global CSS */}
      <style>{`
        @keyframes toastIn   { from{opacity:0;transform:translateX(16px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes panelSlide{ from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
        *,*::before,*::after { box-sizing:border-box; }
        ::-webkit-scrollbar       { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.13); border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.22); }
        button,input,select,textarea { font-family:inherit; }
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);cursor:pointer;outline:none;border:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:${ACCENT};cursor:pointer}
      `}</style>
    </div>
  );
}
