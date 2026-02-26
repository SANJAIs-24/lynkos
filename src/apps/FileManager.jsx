/**
 * FileManager.jsx — LynkOS File Manager v4.0
 * =============================================
 * Props from Desktop.jsx makeAppProps():
 *   vfs        — VirtualFileSystem instance (IndexedDB)
 *   onOpenFile — open a VFS file in the appropriate app
 *   notify     — show OS notification
 *   onClose    — close this window
 *
 * Keyboard Shortcuts (when focused inside File Manager):
 *   Ctrl+C  Copy          Ctrl+X  Cut      Ctrl+V  Paste
 *   Ctrl+A  Select All    Del     Delete   F2      Rename
 *   F5      Refresh       Ctrl+N  New Folder
 *   Ctrl+Shift+N  New File
 *   Backspace  Go Up      Alt+←  Back     Alt+→  Forward
 *   ↑↓  Navigate items    Enter  Open
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder, FileText, Image, Music, Video, File, Archive,
  ChevronRight, ChevronLeft, Home, HardDrive,
  Download, Upload, Copy, Scissors, Trash2, Edit3,
  FolderPlus, FilePlus, RefreshCw, Search, Grid, List,
  ArrowUp, Info, FolderOpen, Star, Clock, AlertCircle,
  Check, Eye, EyeOff, X, MoreVertical, Package,
} from 'lucide-react';

const ACCENT = '#4facfe';

/* ── Helpers ── */
const formatSize = bytes => {
  if (!bytes || bytes === 0) return '—';
  const k = 1024;
  const u = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + u[Math.min(i, 3)];
};
const formatDate = ts => new Date(ts).toLocaleString(undefined, { dateStyle:'short', timeStyle:'short' });

const getExt = name => (name||'').split('.').pop().toLowerCase();

const FileIcon = ({ item, size=18 }) => {
  if (item.type === 'folder') return <Folder size={size} color="#fbc531"/>;
  const ext = getExt(item.name);
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return <Image size={size} color="#00d2d3"/>;
  if (['mp3','wav','ogg','flac','aac'].includes(ext))         return <Music size={size} color="#e84118"/>;
  if (['mp4','avi','mkv','mov'].includes(ext))                return <Video size={size} color="#9c88ff"/>;
  if (['zip','rar','7z','tar','gz'].includes(ext))            return <Archive size={size} color="#f79f1f"/>;
  if (['txt','md','log'].includes(ext))                       return <FileText size={size} color="#dcdde1"/>;
  if (['js','jsx','ts','tsx','py','html','css','json'].includes(ext)) return <FileText size={size} color="#74b9ff"/>;
  if (ext === 'pdf')                                          return <File size={size} color="#a29bfe"/>;
  return <File size={size} color="#95afc0"/>;
};

/* ── Sidebar link ── */
const SideItem = ({ icon, label, active, onClick }) => (
  <div onClick={onClick}
    style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 14px',
      cursor:'pointer', fontSize:12, borderRadius:5, margin:'1px 6px',
      background:active?'rgba(79,172,254,0.15)':'transparent',
      color:active?ACCENT:'rgba(255,255,255,0.7)', transition:'background 0.1s' }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
    <span style={{ opacity:active?1:0.6, display:'flex' }}>{icon}</span>
    <span>{label}</span>
  </div>
);

/* ── Context menu item ── */
const CItem = ({ icon, label, shortcut, onClick, disabled, danger }) => (
  <div onClick={disabled ? undefined : onClick}
    style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'8px 12px', borderRadius:4, cursor:disabled?'not-allowed':'pointer',
      opacity:disabled?0.35:1, fontSize:13, color:danger?'#ff5f56':'white', transition:'background 0.1s' }}
    onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.background='rgba(255,255,255,0.09)'; }}
    onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; }}>
    <div style={{ display:'flex', alignItems:'center', gap:9 }}>{icon}<span>{label}</span></div>
    {shortcut && <span style={{ fontSize:10, opacity:0.38, marginLeft:18, fontFamily:'monospace' }}>{shortcut}</span>}
  </div>
);
const CDivider = () => <div style={{ height:1, background:'rgba(255,255,255,0.08)', margin:'3px 0' }}/>;

/* ── Floating context menu ── */
const CtxMenu = ({ x, y, children, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 60);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', fn); };
  }, [onClose]);
  const left = Math.min(x, window.innerWidth  - 230);
  const top  = Math.min(y, window.innerHeight - 320);
  return (
    <div ref={ref} style={{ position:'fixed', left, top, zIndex:99999,
      background:'rgba(18,18,28,0.98)', backdropFilter:'blur(16px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:7,
      padding:'4px', minWidth:210, boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
      {children}
    </div>
  );
};

/* ── Properties dialog ── */
const PropsDialog = ({ item, onClose }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:99998 }}
    onClick={onClose}>
    <div onClick={e=>e.stopPropagation()}
      style={{ background:'rgba(18,18,28,0.98)', backdropFilter:'blur(20px)',
        border:'1px solid rgba(255,255,255,0.12)', borderRadius:12,
        width:420, maxHeight:'80vh', overflow:'auto', boxShadow:'0 12px 48px rgba(0,0,0,0.7)' }}>
      <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,0.08)',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700, fontSize:14 }}>Properties — {item.name}</div>
        <X size={16} style={{ cursor:'pointer', opacity:0.45 }} onClick={onClose}/>
      </div>
      <div style={{ padding:'18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
          <div style={{ fontSize:44 }}><FileIcon item={item} size={44}/></div>
          <div>
            <div style={{ fontSize:16, fontWeight:600 }}>{item.name}</div>
            <div style={{ fontSize:11, opacity:0.45, marginTop:2 }}>{item.type === 'folder' ? 'Folder' : getExt(item.name).toUpperCase() + ' File'}</div>
          </div>
        </div>
        {[
          ['Location',    item.parent||'/'],
          ['Size',        item.type==='file' ? formatSize(item.size) : 'Folder'],
          ['Created',     formatDate(item.created)],
          ['Modified',    formatDate(item.modified)],
          ['Permissions', item.permissions||'rw-'],
          ['Owner',       item.owner||'admin'],
          ['Full Path',   item.path],
        ].map(([k,v]) => (
          <div key={k} style={{ display:'flex', marginBottom:10 }}>
            <div style={{ width:110, fontSize:12, opacity:0.55, flexShrink:0 }}>{k}:</div>
            <div style={{ flex:1, fontSize:12, wordBreak:'break-all' }}>{v}</div>
          </div>
        ))}
        {item.content && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:12, opacity:0.55, marginBottom:6 }}>Preview:</div>
            <div style={{ background:'rgba(0,0,0,0.3)', padding:10, borderRadius:6,
              fontSize:11, fontFamily:'monospace', maxHeight:120, overflow:'auto',
              whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
              {item.content.slice(0, 600)}{item.content.length>600?'…':''}
            </div>
          </div>
        )}
        <button onClick={onClose}
          style={{ marginTop:18, width:'100%', padding:'9px', borderRadius:7,
            background:`linear-gradient(135deg,${ACCENT},#00f2fe)`, border:'none',
            color:'#000', fontWeight:700, cursor:'pointer', fontSize:13 }}>OK</button>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
export default function FileManager({ vfs, onOpenFile, notify }) {
  const [currentPath, setCurrentPath] = useState('/Users/Admin/Desktop');
  const [items,        setItems]       = useState([]);
  const [selected,     setSelected]    = useState(new Set());
  const [viewMode,     setViewMode]    = useState('grid');
  const [showHidden,   setShowHidden]  = useState(false);
  const [sortBy,       setSortBy]      = useState('name');
  const [sortOrder,    setSortOrder]   = useState('asc');
  const [searchQ,      setSearchQ]     = useState('');
  const [searchResults,setSearchResults] = useState(null);
  const [history,      setHistory]     = useState(['/Users/Admin/Desktop']);
  const [histIdx,      setHistIdx]     = useState(0);
  const [ctxMenu,      setCtxMenu]     = useState(null);
  const [propsItem,    setPropsItem]   = useState(null);
  const [renameItem,   setRenameItem]  = useState(null);
  const [loading,      setLoading]     = useState(false);

  const fileInputRef  = useRef(null);
  const renameRef     = useRef(null);
  const containerRef  = useRef(null);

  /* ── VFS must be ready ── */
  const ready = !!vfs;

  /* ── Load directory ── */
  const loadDir = useCallback(async path => {
    if (!ready) return;
    setLoading(true);
    try {
      const raw = await vfs.list(path);
      setItems(sort(raw));
      setCurrentPath(path);
      setSelected(new Set());
      setSearchResults(null);
    } catch(e) {
      notify?.('error','File Manager', String(e));
    } finally { setLoading(false); }
  }, [ready, vfs, notify]); // eslint-disable-line

  useEffect(() => { if (ready) loadDir('/Users/Admin/Desktop'); }, [ready]); // eslint-disable-line

  /* ── Sorting ── */
  const sort = useCallback(arr => {
    return [...arr].sort((a,b) => {
      if (a.type==='folder' && b.type!=='folder') return -1;
      if (a.type!=='folder' && b.type==='folder') return  1;
      let cmp = 0;
      if (sortBy==='name') cmp = a.name.localeCompare(b.name);
      else if (sortBy==='size') cmp = (a.size||0)-(b.size||0);
      else if (sortBy==='date') cmp = a.modified-b.modified;
      else if (sortBy==='type') cmp = getExt(a.name).localeCompare(getExt(b.name));
      return sortOrder==='asc' ? cmp : -cmp;
    });
  }, [sortBy, sortOrder]);

  /* re-sort when sort changes */
  useEffect(() => { setItems(p => sort(p)); }, [sortBy, sortOrder, sort]);

  /* ── Navigation ── */
  const navTo = path => {
    loadDir(path);
    const newH = history.slice(0, histIdx+1);
    newH.push(path);
    setHistory(newH);
    setHistIdx(newH.length-1);
  };
  const goBack = () => {
    if (histIdx > 0) { const i=histIdx-1; setHistIdx(i); loadDir(history[i]); }
  };
  const goFwd = () => {
    if (histIdx < history.length-1) { const i=histIdx+1; setHistIdx(i); loadDir(history[i]); }
  };
  const goUp = () => {
    if (currentPath !== '/') {
      const p = currentPath.split('/').slice(0,-1).join('/') || '/';
      navTo(p);
    }
  };

  /* ── Selection ── */
  const clickItem = (item, e) => {
    if (e.ctrlKey || e.metaKey) {
      const ns = new Set(selected);
      ns.has(item.path) ? ns.delete(item.path) : ns.add(item.path);
      setSelected(ns);
    } else if (e.shiftKey && selected.size > 0) {
      const arr = display;
      const lastIdx  = arr.findIndex(i => selected.has(i.path));
      const curIdx   = arr.findIndex(i => i.path === item.path);
      const lo = Math.min(lastIdx, curIdx), hi = Math.max(lastIdx, curIdx);
      setSelected(new Set(arr.slice(lo, hi+1).map(i => i.path)));
    } else {
      setSelected(new Set([item.path]));
    }
  };

  const openItem = async item => {
    if (item.type === 'folder') { navTo(item.path); return; }
    if (vfs) await vfs.addToRecent(item);
    onOpenFile?.(item);
  };

  /* ── CRUD operations ── */
  const refresh = () => loadDir(currentPath);

  const newFolder = async () => {
    const name = prompt('Folder name:', 'New Folder');
    if (!name?.trim()) return;
    try { await vfs.createFolder(currentPath, name.trim()); refresh(); notify?.('success','Created','Folder "'+name+'"'); }
    catch(e) { notify?.('error','Create Failed',String(e)); }
  };

  const newFile = async () => {
    const name = prompt('File name:', 'untitled.txt');
    if (!name?.trim()) return;
    try { await vfs.createFile(currentPath, name.trim(), ''); refresh(); notify?.('success','Created','File "'+name+'"'); }
    catch(e) { notify?.('error','Create Failed',String(e)); }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    for (const p of selected) { try { await vfs.delete(p); } catch{} }
    setSelected(new Set());
    refresh();
    notify?.('info','Deleted',`${selected.size} item(s) removed`);
  };

  const startRename = item => { setRenameItem(item); setCtxMenu(null); };

  const doRename = async newName => {
    if (!renameItem || !newName.trim() || newName === renameItem.name) { setRenameItem(null); return; }
    try { await vfs.rename(renameItem.path, newName.trim()); refresh(); notify?.('success','Renamed',newName); }
    catch(e) { notify?.('error','Rename Failed',String(e)); }
    finally { setRenameItem(null); }
  };

  const copyItem = () => {
    const item = items.find(i => selected.has(i.path));
    if (item) { vfs.clipboard=item; vfs.clipboardOperation='copy'; notify?.('info','Copied',item.name); }
    setCtxMenu(null);
  };
  const cutItem = () => {
    const item = items.find(i => selected.has(i.path));
    if (item) { vfs.clipboard=item; vfs.clipboardOperation='cut'; notify?.('info','Cut',item.name); }
    setCtxMenu(null);
  };
  const paste = async () => {
    if (!vfs.clipboard) return;
    try {
      if (vfs.clipboardOperation==='copy') await vfs.copy(vfs.clipboard.path, currentPath);
      else { await vfs.move(vfs.clipboard.path, currentPath); vfs.clipboard=null; }
      refresh();
    } catch(e) { notify?.('error','Paste Failed',String(e)); }
    setCtxMenu(null);
  };

  const download = async item => {
    if (item.type==='file') {
      const blob = new Blob([item.content||''], { type:'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download=item.name; a.click();
    } else { await vfs.exportZip(item.path); }
    setCtxMenu(null);
  };

  const uploadFiles = () => { fileInputRef.current?.click(); setCtxMenu(null); };
  const handleUpload = async e => {
    for (const f of Array.from(e.target.files||[])) { await vfs.upload(currentPath, f); }
    refresh(); e.target.value='';
    notify?.('success','Uploaded',`${e.target.files?.length} file(s)`);
  };

  const toggleFav = async item => {
    vfs.favorites.has(item.path) ? await vfs.removeFav(item.path) : await vfs.addFav(item.path);
    setItems(p=>[...p]); // force re-render
  };

  const doSearch = async () => {
    if (!searchQ.trim()) { setSearchResults(null); return; }
    setLoading(true);
    try { const r = await vfs.search(searchQ, '/'); setSearchResults(sort(r)); }
    catch{} finally { setLoading(false); }
  };

  const changeSortBy = by => {
    if (sortBy===by) setSortOrder(o=>o==='asc'?'desc':'asc');
    else { setSortBy(by); setSortOrder('asc'); }
  };

  /* ── Context menu openers ── */
  const surfaceCtx = e => {
    e.preventDefault();
    if (!e.target.closest('[data-fmitem]')) {
      setSelected(new Set());
      setCtxMenu({ x:e.clientX, y:e.clientY, type:'surface' });
    }
  };
  const itemCtx = (e, item) => {
    e.preventDefault(); e.stopPropagation();
    if (!selected.has(item.path)) setSelected(new Set([item.path]));
    setCtxMenu({ x:e.clientX, y:e.clientY, type:'item', item });
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const fn = e => {
      if (!containerRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body) return;
      const inField = ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
      if (inField) return;

      if (e.key==='Backspace') { e.preventDefault(); goUp(); }
      else if (e.key==='Delete') { e.preventDefault(); deleteSelected(); }
      else if (e.key==='F2' && selected.size===1) {
        const item=display.find(i=>selected.has(i.path)); if(item) startRename(item);
      }
      else if (e.key==='F5') { e.preventDefault(); refresh(); }
      else if (e.key==='Enter' && selected.size===1) {
        const item=display.find(i=>selected.has(i.path)); if(item) openItem(item);
      }
      else if ((e.ctrlKey||e.metaKey) && e.key==='a') { e.preventDefault(); setSelected(new Set(display.map(i=>i.path))); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='c') { e.preventDefault(); copyItem(); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='x') { e.preventDefault(); cutItem(); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='v') { e.preventDefault(); paste(); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='n' && !e.shiftKey) { e.preventDefault(); newFolder(); }
      else if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key==='N') { e.preventDefault(); newFile(); }
      else if (e.altKey && e.key==='ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.altKey && e.key==='ArrowRight') { e.preventDefault(); goFwd(); }
      else if (e.key==='ArrowDown' || e.key==='ArrowUp') {
        e.preventDefault();
        const arr=display, cur=[...selected][0];
        const idx=arr.findIndex(i=>i.path===cur);
        if (e.key==='ArrowDown' && idx<arr.length-1) setSelected(new Set([arr[idx+1].path]));
        else if (e.key==='ArrowUp' && idx>0) setSelected(new Set([arr[idx-1].path]));
        else if (idx===-1 && arr.length>0) setSelected(new Set([arr[0].path]));
      }
    };
    window.addEventListener('keydown', fn);
    return ()=>window.removeEventListener('keydown', fn);
  }); // eslint-disable-line

  useEffect(()=>{ if(renameItem && renameRef.current){ renameRef.current.focus(); renameRef.current.select(); }},[renameItem]);

  /* ── Computed display items ── */
  const display = (searchResults || items).filter(i=>showHidden||!i.name.startsWith('.'));

  /* ── Breadcrumb ── */
  const pathParts = currentPath.split('/').filter(Boolean);

  /* ── Toolbar button ── */
  const Btn = ({ onClick, disabled, active, title, children }) => (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background:active?'rgba(79,172,254,0.22)':'rgba(255,255,255,0.05)',
      border:`1px solid ${active?'rgba(79,172,254,0.4)':'rgba(255,255,255,0.1)'}`,
      color:active?ACCENT:'white', padding:'5px 9px', borderRadius:5, cursor:disabled?'not-allowed':'pointer',
      display:'flex', alignItems:'center', justifyContent:'center', opacity:disabled?0.3:1, transition:'all 0.15s',
    }}>{children}</button>
  );

  if (!ready) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#1e1e1e', color:'rgba(255,255,255,0.5)', fontSize:14 }}>
      Initialising file system…
    </div>
  );

  return (
    <div ref={containerRef} tabIndex={-1}
      style={{ height:'100%', display:'flex', background:'#1a1a24', color:'white',
        fontFamily:"'Segoe UI Variable',-apple-system,sans-serif", outline:'none', position:'relative' }}
      onContextMenu={surfaceCtx}
      onClick={e=>{ if(e.target===e.currentTarget||e.target===containerRef.current){ setSelected(new Set()); setCtxMenu(null); } }}>

      {/* ── Sidebar ── */}
      <div style={{ width:188, background:'rgba(255,255,255,0.028)', borderRight:'1px solid rgba(255,255,255,0.08)',
        display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'12px 14px 8px', fontSize:11, fontWeight:700, opacity:0.38,
          letterSpacing:'0.08em', textTransform:'uppercase' }}>Quick Access</div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {[
            [<Home size={14}/>,      'Desktop',   '/Users/Admin/Desktop'],
            [<FileText size={14}/>,  'Documents', '/Users/Admin/Documents'],
            [<Download size={14}/>,  'Downloads', '/Users/Admin/Downloads'],
            [<Image size={14}/>,     'Pictures',  '/Users/Admin/Pictures'],
            [<Music size={14}/>,     'Music',     '/Users/Admin/Music'],
            [<Video size={14}/>,     'Videos',    '/Users/Admin/Videos'],
          ].map(([icon,label,path]) => (
            <SideItem key={path} icon={icon} label={label}
              active={currentPath===path && !searchResults}
              onClick={() => navTo(path)}/>
          ))}
          <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'7px 10px' }}/>
          <SideItem icon={<HardDrive size={14}/>} label="This PC"
            active={currentPath==='/' && !searchResults} onClick={() => navTo('/')}/>
          {vfs.favorites.size > 0 && (
            <>
              <div style={{ padding:'8px 14px 4px', fontSize:10, opacity:0.38, textTransform:'uppercase', letterSpacing:'0.08em' }}>Favorites</div>
              {[...vfs.favorites].slice(0,8).map(fpath => (
                <SideItem key={fpath} icon={<Star size={14} color="#fbc531"/>}
                  label={fpath.split('/').pop()}
                  active={currentPath===fpath} onClick={() => navTo(fpath)}/>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Toolbar */}
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 10px',
          background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <Btn onClick={goBack}  disabled={histIdx===0}            title="Back (Alt+←)"><ChevronLeft size={14}/></Btn>
          <Btn onClick={goFwd}   disabled={histIdx===history.length-1} title="Forward (Alt+→)"><ChevronRight size={14}/></Btn>
          <Btn onClick={goUp}    disabled={currentPath==='/'} title="Up (Backspace)"><ArrowUp size={14}/></Btn>
          <Btn onClick={refresh} title="Refresh (F5)"><RefreshCw size={14}/></Btn>

          {/* Breadcrumb */}
          <div style={{ flex:1, display:'flex', alignItems:'center',
            background:'rgba(255,255,255,0.07)', borderRadius:6, padding:'4px 10px',
            fontSize:12, overflow:'hidden', margin:'0 6px' }}>
            <Home size={12} style={{ marginRight:5, flexShrink:0, opacity:0.5 }}/>
            {pathParts.map((part,i) => (
              <React.Fragment key={i}>
                <ChevronRight size={10} style={{ margin:'0 3px', opacity:0.4, flexShrink:0 }}/>
                <span style={{ cursor:'pointer', whiteSpace:'nowrap', opacity:0.85 }}
                  onClick={() => navTo('/'+pathParts.slice(0,i+1).join('/'))}>
                  {part}
                </span>
              </React.Fragment>
            ))}
            {currentPath==='/' && <span style={{ opacity:0.85 }}>Root</span>}
          </div>

          {/* View toggles */}
          <Btn onClick={() => setViewMode('grid')} active={viewMode==='grid'} title="Grid"><Grid size={14}/></Btn>
          <Btn onClick={() => setViewMode('list')} active={viewMode==='list'} title="List"><List size={14}/></Btn>
          <Btn onClick={() => setShowHidden(s=>!s)} active={showHidden} title="Toggle hidden">
            {showHidden?<Eye size={14}/>:<EyeOff size={14}/>}
          </Btn>
        </div>

        {/* Search bar */}
        <div style={{ display:'flex', gap:7, padding:'6px 10px',
          background:'rgba(255,255,255,0.025)', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:7,
            background:'rgba(255,255,255,0.07)', borderRadius:6, padding:'5px 10px' }}>
            <Search size={12} style={{ opacity:0.45 }}/>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') doSearch(); if(e.key==='Escape'){ setSearchQ(''); setSearchResults(null); }}}
              placeholder="Search files…"
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'white', fontSize:12 }}/>
          </div>
          <Btn onClick={doSearch} title="Search">Search</Btn>
          {searchResults && (
            <Btn onClick={() => { setSearchResults(null); setSearchQ(''); }} title="Clear search">
              <X size={13}/>
            </Btn>
          )}
        </div>

        {/* Status bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'4px 12px', fontSize:11, opacity:0.48,
          background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
          <span>
            {searchResults ? `${display.length} results` : `${display.length} items`}
            {selected.size > 0 && ` · ${selected.size} selected`}
            {loading && ' · Loading…'}
          </span>
          <div style={{ display:'flex', gap:12 }}>
            {['name','size','date','type'].map(s => (
              <span key={s} style={{ cursor:'pointer', opacity:sortBy===s?1:0.6 }} onClick={() => changeSortBy(s)}>
                {s.charAt(0).toUpperCase()+s.slice(1)}{sortBy===s&&(sortOrder==='asc'?' ↑':' ↓')}
              </span>
            ))}
          </div>
        </div>

        {/* File area */}
        <div style={{ flex:1, overflow:'auto', padding:10 }}>
          {display.length===0 && !loading && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', height:'100%', opacity:0.3 }}>
              <Folder size={60}/>
              <p style={{ marginTop:12, fontSize:13 }}>
                {searchResults ? 'No results found' : 'This folder is empty'}
              </p>
            </div>
          )}

          {viewMode==='grid' ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))', gap:10 }}>
              {display.map(item => (
                <div key={item.path} data-fmitem="1"
                  onClick={e => clickItem(item, e)}
                  onDoubleClick={() => openItem(item)}
                  onContextMenu={e => itemCtx(e, item)}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center',
                    padding:'10px 6px', borderRadius:7, cursor:'pointer',
                    background:selected.has(item.path)?'rgba(79,172,254,0.2)':'transparent',
                    border:`1px solid ${selected.has(item.path)?'rgba(79,172,254,0.5)':'transparent'}`,
                    transition:'all 0.12s', position:'relative' }}
                  onMouseEnter={e=>{ if(!selected.has(item.path)) e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e=>{ if(!selected.has(item.path)) e.currentTarget.style.background='transparent'; }}>
                  {/* Favorite star */}
                  {vfs.favorites.has(item.path) && (
                    <Star size={10} fill="#fbc531" color="#fbc531" style={{ position:'absolute', top:5, right:5 }}/>
                  )}
                  {/* Icon / rename input */}
                  {renameItem?.path===item.path ? (
                    <>
                      <div style={{ marginBottom:7 }}><FileIcon item={item} size={36}/></div>
                      <input ref={renameRef} defaultValue={item.name}
                        onClick={e=>e.stopPropagation()}
                        onKeyDown={e=>{ if(e.key==='Enter') doRename(e.target.value); if(e.key==='Escape') setRenameItem(null); }}
                        onBlur={e=>doRename(e.target.value)}
                        style={{ width:'100%', background:'rgba(255,255,255,0.1)',
                          border:'1px solid rgba(79,172,254,0.5)', color:'white',
                          borderRadius:4, padding:'2px 5px', fontSize:11, textAlign:'center', outline:'none' }}/>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom:8 }}><FileIcon item={item} size={36}/></div>
                      <div style={{ fontSize:11, textAlign:'center', wordBreak:'break-word', lineHeight:1.25,
                        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {item.name}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.1)', textAlign:'left' }}>
                  {[['Name','name'],['Size','size'],['Modified','date'],['Type','type']].map(([lbl,by]) => (
                    <th key={by} onClick={() => changeSortBy(by)}
                      style={{ padding:'7px 10px', fontWeight:500, cursor:'pointer', opacity:0.75,
                        userSelect:'none', whiteSpace:'nowrap' }}>
                      {lbl}{sortBy===by&&(sortOrder==='asc'?' ↑':' ↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {display.map(item => (
                  <tr key={item.path} data-fmitem="1"
                    onClick={e=>clickItem(item,e)} onDoubleClick={()=>openItem(item)}
                    onContextMenu={e=>itemCtx(e,item)}
                    style={{ background:selected.has(item.path)?'rgba(79,172,254,0.18)':'transparent',
                      cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.1s' }}
                    onMouseEnter={e=>{ if(!selected.has(item.path)) e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e=>{ if(!selected.has(item.path)) e.currentTarget.style.background='transparent'; }}>
                    <td style={{ padding:'7px 10px' }}>
                      {renameItem?.path===item.path ? (
                        <input ref={renameRef} defaultValue={item.name} onClick={e=>e.stopPropagation()}
                          onKeyDown={e=>{ if(e.key==='Enter') doRename(e.target.value); if(e.key==='Escape') setRenameItem(null); }}
                          onBlur={e=>doRename(e.target.value)}
                          style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(79,172,254,0.5)',
                            color:'white', borderRadius:4, padding:'2px 6px', fontSize:12, outline:'none' }}/>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <FileIcon item={item} size={16}/>
                          <span>{item.name}</span>
                          {vfs.favorites.has(item.path) && <Star size={9} fill="#fbc531" color="#fbc531"/>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:'7px 10px', opacity:0.55 }}>
                      {item.type==='file' ? formatSize(item.size) : '—'}
                    </td>
                    <td style={{ padding:'7px 10px', opacity:0.55, whiteSpace:'nowrap' }}>
                      {formatDate(item.modified)}
                    </td>
                    <td style={{ padding:'7px 10px', opacity:0.55 }}>
                      {item.type==='folder' ? 'Folder' : getExt(item.name).toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <CtxMenu x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)}>
          {ctxMenu.type==='item' && ctxMenu.item ? (
            <>
              <CItem icon={<FolderOpen size={13}/>} label="Open"
                onClick={() => { openItem(ctxMenu.item); setCtxMenu(null); }}/>
              <CDivider/>
              <CItem icon={<Star size={13} fill={vfs.favorites.has(ctxMenu.item.path)?'#fbc531':undefined} color="#fbc531"/>}
                label={vfs.favorites.has(ctxMenu.item.path)?'Remove Favourite':'Add Favourite'}
                onClick={() => { toggleFav(ctxMenu.item); setCtxMenu(null); }}/>
              <CItem icon={<Package size={13}/>} label="Export as ZIP"
                onClick={() => { vfs.exportZip(ctxMenu.item.path); setCtxMenu(null); }}/>
              <CItem icon={<Download size={13}/>} label="Download"
                onClick={() => download(ctxMenu.item)}/>
              <CDivider/>
              <CItem icon={<Scissors size={13}/>} label="Cut"   shortcut="Ctrl+X" onClick={cutItem}/>
              <CItem icon={<Copy size={13}/>}     label="Copy"  shortcut="Ctrl+C" onClick={copyItem}/>
              <CItem icon={<Trash2 size={13}/>}   label="Delete" shortcut="Del"  danger onClick={() => { setCtxMenu(null); deleteSelected(); }}/>
              <CDivider/>
              <CItem icon={<Edit3 size={13}/>}    label="Rename" shortcut="F2"   onClick={() => startRename(ctxMenu.item)}/>
              <CItem icon={<Info size={13}/>}     label="Properties"              onClick={() => { setPropsItem(ctxMenu.item); setCtxMenu(null); }}/>
            </>
          ) : (
            <>
              <CItem icon={<Upload size={13}/>}    label="Upload Files"  onClick={uploadFiles}/>
              <CItem icon={<Copy size={13}/>}      label="Paste" shortcut="Ctrl+V" disabled={!vfs.clipboard} onClick={paste}/>
              <CDivider/>
              <CItem icon={<FolderPlus size={13}/>} label="New Folder"  shortcut="Ctrl+N"       onClick={() => { setCtxMenu(null); newFolder(); }}/>
              <CItem icon={<FilePlus size={13}/>}   label="New File"    shortcut="Ctrl+Shift+N" onClick={() => { setCtxMenu(null); newFile(); }}/>
              <CDivider/>
              <CItem icon={<RefreshCw size={13}/>}  label="Refresh" shortcut="F5" onClick={() => { setCtxMenu(null); refresh(); }}/>
              <CItem icon={viewMode==='grid'?<List size={13}/>:<Grid size={13}/>}
                label={`Switch to ${viewMode==='grid'?'List':'Grid'} View`}
                onClick={() => { setViewMode(m=>m==='grid'?'list':'grid'); setCtxMenu(null); }}/>
            </>
          )}
        </CtxMenu>
      )}

      {/* Properties Dialog */}
      {propsItem && <PropsDialog item={propsItem} onClose={() => setPropsItem(null)}/>}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple style={{ display:'none' }} onChange={handleUpload}/>

      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        button{font-family:inherit}
      `}</style>
    </div>
  );
}
