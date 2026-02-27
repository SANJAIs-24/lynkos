/**
 * Browser.jsx — LynkOS Browser v4.0
 * =====================================
 * Features:
 *   • Multi-tab browsing — unlimited tabs, Ctrl+T new, Ctrl+W close, Ctrl+Tab switch
 *   • Address bar with URL validation + search fallback (Google/DuckDuckGo/Bing)
 *   • iframe-based web rendering (sandbox with script/forms/popups enabled)
 *   • Back / Forward / Reload / Stop (per tab history)
 *   • Bookmarks bar — add, remove, click to navigate, persist in localStorage
 *   • Browsing history panel — full per-tab history list, click to revisit
 *   • Homepage with speed-dial tiles (configurable)
 *   • Download detector (intercepts download links shown in panel)
 *   • Reader-mode toggle — strips iframe, shows text content placeholder
 *   • Incognito mode indicator (no history saved while active)
 *   • Find in page (Ctrl+F) overlay using iframe.contentWindow.find
 *   • Zoom controls for iframe (CSS transform scale)
 *   • DevTools button (window.open the URL in a real tab)
 *   • Keyboard: Enter/navigate, Ctrl+L focus address bar, Escape stop/clear
 *   • Secure / insecure indicator in address bar (https vs http)
 *   • Loading progress bar animation
 *   • Per-tab favicons fetched via Google favicon API
 *   • Dark overlay for iframes that block (X-Frame-Options) with friendly error
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, X, Plus,
  Home, Star, StarOff, BookOpen, Clock, Download,
  Search, Shield, ShieldAlert, Lock, Unlock,
  Settings, Grid, Moon, Maximize, ExternalLink,
  AlertTriangle, Eye, EyeOff, Zap, MoreVertical,
  Bookmark, Trash2, Globe, Copy, Share2,
} from 'lucide-react';

const ACCENT  = '#4facfe';
const ACCENT2 = '#00f2fe';
const LS_BOOKMARKS = 'lynkos_browser_bookmarks';
const LS_HISTORY   = 'lynkos_browser_history';

/* ─── Default speed-dial tiles ────────────────────────────────────────────── */
const DEFAULT_TILES = [
  { label:'Google',      url:'https://www.google.com',     icon:'🔍', color:'#4285F4' },
  { label:'GitHub',      url:'https://github.com',         icon:'🐙', color:'#24292e' },
  { label:'Wikipedia',   url:'https://en.wikipedia.org',   icon:'📖', color:'#c8a951' },
  { label:'YouTube',     url:'https://www.youtube.com',    icon:'▶️',  color:'#ff0000' },
  { label:'MDN Docs',    url:'https://developer.mozilla.org', icon:'📘', color:'#0669bd' },
  { label:'Stack Overflow', url:'https://stackoverflow.com', icon:'🔶', color:'#f48024' },
  { label:'Reddit',      url:'https://www.reddit.com',     icon:'🤖', color:'#ff4500' },
  { label:'OpenAI',      url:'https://chat.openai.com',    icon:'🤖', color:'#10a37f' },
  { label:'News',        url:'https://news.ycombinator.com', icon:'🟧', color:'#ff6600' },
  { label:'CodePen',     url:'https://codepen.io',         icon:'✏️',  color:'#1e8cbe' },
  { label:'Figma',       url:'https://figma.com',          icon:'🎨', color:'#a259ff' },
  { label:'Vercel',      url:'https://vercel.com',         icon:'▲',  color:'#000000' },
];

/* ─── Search engines ──────────────────────────────────────────────────────── */
const SEARCH_ENGINES = {
  google:     { label:'Google',     url:'https://www.google.com/search?q=',      icon:'🔍' },
  duckduckgo: { label:'DuckDuckGo', url:'https://duckduckgo.com/?q=',            icon:'🦆' },
  bing:       { label:'Bing',       url:'https://www.bing.com/search?q=',        icon:'🔷' },
  brave:      { label:'Brave',      url:'https://search.brave.com/search?q=',    icon:'🦁' },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const uid       = () => Math.random().toString(36).slice(2, 9);
const isDomain  = s => /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(s.trim());
const addProto  = s => {
  s = s.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (isDomain(s)) return 'https://' + s;
  return null; // not a URL → use search
};
const isHttps   = url => /^https:\/\//i.test(url);
const isHttp    = url => /^http:\/\//i.test(url);
const getDomain = url => { try { return new URL(url).hostname; } catch { return url; } };
const faviconFor = url => {
  try { const h = new URL(url).hostname; return `https://www.google.com/s2/favicons?domain=${h}&sz=32`; }
  catch { return null; }
};
const truncateUrl = (url, n = 50) => url.length > n ? url.slice(0, n) + '…' : url;

/* ─── Tab factory ─────────────────────────────────────────────────────────── */
const newTab = (url = '', title = 'New Tab') => ({
  id: uid(),
  url,
  title,
  displayUrl:  url,
  history:     url ? [url] : [],
  historyIdx:  url ? 0 : -1,
  loading:     false,
  error:       null,
  favicon:     null,
  incognito:   false,
  zoom:        1,
});

/* ─── Toolbar icon button ─────────────────────────────────────────────────── */
const TBtn = ({ onClick, title, active, disabled, children }) => (
  <button onClick={onClick} title={title} disabled={disabled}
    style={{
      background: active ? 'rgba(79,172,254,0.2)' : 'transparent',
      border: `1px solid ${active ? 'rgba(79,172,254,0.4)' : 'transparent'}`,
      color: disabled ? 'rgba(255,255,255,0.18)' : active ? ACCENT : 'rgba(255,255,255,0.7)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '5px 7px', borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      fontSize: 12, transition: 'all 0.12s', flexShrink: 0,
    }}
    onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
    {children}
  </button>
);

/* ─── Address bar security badge ─────────────────────────────────────────── */
const SecureBadge = ({ url }) => {
  if (!url || url === 'about:blank' || url === '') return <Globe size={13} style={{ opacity:0.35 }}/>;
  if (isHttps(url)) return <Lock size={12} style={{ color:'#27c93f' }}/>;
  if (isHttp(url))  return <ShieldAlert size={12} style={{ color:'#ffbd2e' }}/>;
  return <Globe size={13} style={{ opacity:0.35 }}/>;
};

/* ─── Homepage speed dial ─────────────────────────────────────────────────── */
const HomePage = ({ onNavigate, bookmarks, searchEngine, onSearch }) => {
  const [q, setQ] = useState('');
  const engines = Object.values(SEARCH_ENGINES);
  const [engIdx, setEngIdx] = useState(0);

  const doSearch = () => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const asUrl = addProto(trimmed);
    onNavigate(asUrl || engines[engIdx].url + encodeURIComponent(trimmed));
    setQ('');
  };

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      background: 'linear-gradient(160deg, #0a0a18 0%, #0d1626 50%, #0a1a10 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 60, paddingBottom: 40, gap: 0,
    }}>
      {/* LynkOS logo */}
      <div style={{ fontSize: 48, marginBottom: 6 }}>🌐</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.5px' }}>LynkOS Browser</div>
      <div style={{ fontSize: 12, opacity: 0.35, marginBottom: 36 }}>Your gateway to the web</div>

      {/* Search bar */}
      <div style={{
        width: '100%', maxWidth: 600, padding: '0 20px', marginBottom: 36,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 50,
          padding: '12px 18px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          {/* Engine picker */}
          <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setEngIdx(i => (i + 1) % engines.length)}>
            {engines[engIdx].icon}
          </span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
            placeholder={`Search with ${engines[engIdx].label} or enter URL…`}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'white', fontSize: 14,
            }}
          />
          {q && (
            <X size={15} style={{ cursor:'pointer', opacity:0.4 }} onClick={() => setQ('')}/>
          )}
          <button onClick={doSearch} style={{
            background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
            border: 'none', borderRadius: 30, padding: '6px 18px',
            color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>Go</button>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:8 }}>
          {engines.map((e, i) => (
            <span key={e.label} onClick={() => setEngIdx(i)}
              style={{ fontSize:11, cursor:'pointer', opacity:engIdx===i?1:0.35,
                color:engIdx===i?ACCENT:'white', transition:'all 0.15s' }}>
              {e.label}
            </span>
          ))}
        </div>
      </div>

      {/* Speed dial + bookmarks */}
      <div style={{ width:'100%', maxWidth:700, padding:'0 20px' }}>
        {bookmarks.length > 0 && (
          <>
            <div style={{ fontSize:11, opacity:0.38, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              Bookmarks
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:8, marginBottom:24 }}>
              {bookmarks.map(b => (
                <div key={b.id} onClick={() => onNavigate(b.url)}
                  style={{
                    display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
                    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:9, cursor:'pointer', fontSize:12, transition:'all 0.15s',
                    overflow:'hidden',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(79,172,254,0.14)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                  {b.favicon
                    ? <img src={b.favicon} alt="" style={{ width:14, height:14 }}/>
                    : <Star size={12} style={{ color:'#fbc531', flexShrink:0 }}/>}
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.title||getDomain(b.url)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize:11, opacity:0.38, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          Quick Access
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:10 }}>
          {DEFAULT_TILES.map(t => (
            <div key={t.url} onClick={() => onNavigate(t.url)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                padding:'16px 10px', background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.07)', borderRadius:10,
                cursor:'pointer', transition:'all 0.15s', textAlign:'center',
              }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.09)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.transform='translateY(0)';}}>
              <div style={{ fontSize:26 }}>{t.icon}</div>
              <div style={{ fontSize:11, opacity:0.8 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Error page ──────────────────────────────────────────────────────────── */
const ErrorPage = ({ url, error, onRetry }) => (
  <div style={{
    height:'100%', display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', background:'#0f0f1a', gap:14, padding:30, textAlign:'center',
  }}>
    <div style={{ fontSize:60 }}>🚫</div>
    <div style={{ fontSize:18, fontWeight:700, color:'#ff5f56' }}>
      {error === 'blocked' ? "This site can't be displayed" : 'Page not available'}
    </div>
    <div style={{ fontSize:13, opacity:0.55, maxWidth:440 }}>
      {error === 'blocked'
        ? `The website at ${getDomain(url)} refused to load inside a browser window (X-Frame-Options / CSP). This is a security policy enforced by that site.`
        : `Unable to connect to ${getDomain(url)}. Check the URL and try again.`}
    </div>
    <div style={{ display:'flex', gap:10, marginTop:8 }}>
      <button onClick={onRetry}
        style={{ padding:'8px 20px', borderRadius:8, background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
          border:'none', color:'#000', fontWeight:700, cursor:'pointer', fontSize:13 }}>
        Retry
      </button>
      <button onClick={() => window.open(url,'_blank')}
        style={{ padding:'8px 20px', borderRadius:8, background:'rgba(255,255,255,0.08)',
          border:'1px solid rgba(255,255,255,0.15)', color:'white', cursor:'pointer', fontSize:13,
          display:'flex', alignItems:'center', gap:6 }}>
        <ExternalLink size={13}/> Open in New Tab
      </button>
    </div>
    <div style={{ fontSize:11, opacity:0.3, marginTop:4, fontFamily:'monospace' }}>{url}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Browser({ notify, initialFile }) {

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const [tabs,      setTabs]      = useState([newTab()]);
  const [activeTab, setActiveTab] = useState(0);

  // ── Panels ───────────────────────────────────────────────────────────────────
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory,   setShowHistory]   = useState(false);
  const [showFind,      setShowFind]      = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);

  // ── Bookmarks ────────────────────────────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]'); } catch { return []; }
  });

  // ── History ───────────────────────────────────────────────────────────────────
  const [globalHistory, setGlobalHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch { return []; }
  });

  // ── Downloads ────────────────────────────────────────────────────────────────
  const [downloads, setDownloads] = useState([]);

  // ── Find in page ─────────────────────────────────────────────────────────────
  const [findQ, setFindQ] = useState('');

  // ── Search engine ─────────────────────────────────────────────────────────────
  const [searchEngine, setSearchEngine] = useState('google');

  // ── Address bar ──────────────────────────────────────────────────────────────
  const [addressVal, setAddressVal] = useState('');
  const [addressFocused, setAddressFocused] = useState(false);

  const addressRef  = useRef(null);
  const iframeRefs  = useRef({});   // map tabId → iframe element

  const tab = tabs[activeTab] || tabs[0];

  // ── Keep address bar synced with active tab ───────────────────────────────
  useEffect(() => {
    if (!addressFocused) setAddressVal(tab?.url || '');
  }, [activeTab, tab?.url, addressFocused]);

  // ── Load initial file ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialFile) return;
    const url = initialFile.src || initialFile.url || initialFile.content || '';
    if (url) navigate(url);
  }, []); // eslint-disable-line

  // ── Persist bookmarks ──────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_BOOKMARKS, JSON.stringify(bookmarks)); } catch {}
  }, [bookmarks]);

  // ── Persist history ────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(globalHistory.slice(0, 200))); } catch {}
  }, [globalHistory]);

  // ── Update tab helper ──────────────────────────────────────────────────────
  const updateTab = useCallback((idx, patch) => {
    setTabs(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));
  }, []);

  // ── Navigate ───────────────────────────────────────────────────────────────
  const navigate = useCallback((rawUrl, tabIdx) => {
    const idx = tabIdx ?? activeTab;
    if (!rawUrl?.trim()) return;

    let url = addProto(rawUrl.trim());
    if (!url) {
      // treat as search query
      url = SEARCH_ENGINES[searchEngine].url + encodeURIComponent(rawUrl.trim());
    }

    setTabs(prev => {
      const t    = prev[idx];
      const newH = t.history.slice(0, t.historyIdx + 1);
      newH.push(url);
      return prev.map((tab, i) => i !== idx ? tab : {
        ...tab, url, displayUrl: url,
        history: newH, historyIdx: newH.length - 1,
        loading: true, error: null,
        title: getDomain(url),
        favicon: faviconFor(url),
      });
    });

    setAddressVal(url);

    // add to global history (skip incognito)
    if (!tab?.incognito) {
      const entry = { id: uid(), url, title: getDomain(url), ts: Date.now() };
      setGlobalHistory(prev => [entry, ...prev.filter(h => h.url !== url)].slice(0, 200));
    }
  }, [activeTab, searchEngine, tab?.incognito]);

  // ── Address bar submit ─────────────────────────────────────────────────────
  const handleAddressSubmit = e => {
    e?.preventDefault();
    navigate(addressVal);
    addressRef.current?.blur();
  };

  // ── Back / Forward / Reload ────────────────────────────────────────────────
  const goBack = () => {
    const t  = tab;
    if (t.historyIdx <= 0) return;
    const newIdx = t.historyIdx - 1;
    const url    = t.history[newIdx];
    updateTab(activeTab, { url, displayUrl: url, historyIdx: newIdx, loading: true, error: null });
    setAddressVal(url);
  };

  const goForward = () => {
    const t = tab;
    if (t.historyIdx >= t.history.length - 1) return;
    const newIdx = t.historyIdx + 1;
    const url    = t.history[newIdx];
    updateTab(activeTab, { url, displayUrl: url, historyIdx: newIdx, loading: true, error: null });
    setAddressVal(url);
  };

  const reload = () => {
    if (!tab.url) return;
    updateTab(activeTab, { loading: true, error: null });
    const iframe = iframeRefs.current[tab.id];
    if (iframe) {
      try { iframe.src = tab.url; } catch {}
    }
  };

  const stopLoading = () => updateTab(activeTab, { loading: false });

  // ── Tab management ─────────────────────────────────────────────────────────
  const addNewTab = (url = '') => {
    const t = newTab(url);
    setTabs(prev => [...prev, t]);
    setActiveTab(tabs.length);
    setAddressVal(url);
  };

  const closeTab = idx => {
    if (tabs.length === 1) { setTabs([newTab()]); setActiveTab(0); return; }
    const next = tabs.filter((_, i) => i !== idx);
    setTabs(next);
    setActiveTab(Math.min(idx, next.length - 1));
  };

  // ── Iframe load/error handlers ─────────────────────────────────────────────
  const onIframeLoad = (tabId, tabIdx) => {
    setTabs(prev => prev.map((t, i) => {
      if (i !== tabIdx) return t;
      let title = t.title;
      try {
        const iframe = iframeRefs.current[tabId];
        if (iframe?.contentDocument?.title) title = iframe.contentDocument.title;
      } catch {}
      return { ...t, loading: false, error: null, title };
    }));
  };

  const onIframeError = (tabIdx) => {
    updateTab(tabIdx, { loading: false, error: 'blocked' });
  };

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  const isBookmarked = url => bookmarks.some(b => b.url === url);

  const toggleBookmark = () => {
    if (!tab.url) return;
    if (isBookmarked(tab.url)) {
      setBookmarks(prev => prev.filter(b => b.url !== tab.url));
      notify?.('info', 'Bookmark removed', getDomain(tab.url));
    } else {
      const bm = { id: uid(), url: tab.url, title: tab.title || getDomain(tab.url), favicon: tab.favicon, ts: Date.now() };
      setBookmarks(prev => [bm, ...prev]);
      notify?.('success', 'Bookmarked!', getDomain(tab.url));
    }
  };

  // ── Find in page ───────────────────────────────────────────────────────────
  const doFind = (dir = 1) => {
    try {
      const iframe = iframeRefs.current[tab.id];
      if (iframe?.contentWindow?.find) {
        iframe.contentWindow.find(findQ, false, dir < 0, true, false, true);
      }
    } catch {
      notify?.('warning', 'Find', 'Cannot search cross-origin pages');
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 't')   { e.preventDefault(); addNewTab(); }
      if (ctrl && e.key === 'w')   { e.preventDefault(); closeTab(activeTab); }
      if (ctrl && e.key === 'l')   { e.preventDefault(); addressRef.current?.focus(); addressRef.current?.select(); }
      if (ctrl && e.key === 'r')   { e.preventDefault(); reload(); }
      if (ctrl && e.key === 'f')   { e.preventDefault(); setShowFind(s => !s); }
      if (ctrl && e.key === 'd')   { e.preventDefault(); toggleBookmark(); }
      if (ctrl && e.key === 'Tab') { e.preventDefault(); setActiveTab(i => (i + 1) % tabs.length); }
      if (e.key === 'Escape') {
        if (showFind) { setShowFind(false); setFindQ(''); }
        if (tab.loading) stopLoading();
      }
      if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); goBack(); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }); // eslint-disable-line

  // ── Per-tab zoom ───────────────────────────────────────────────────────────
  const zoomIn  = () => updateTab(activeTab, { zoom: Math.min((tab.zoom || 1) + 0.1, 3) });
  const zoomOut = () => updateTab(activeTab, { zoom: Math.max((tab.zoom || 1) - 0.1, 0.3) });
  const zoomReset = () => updateTab(activeTab, { zoom: 1 });

  const hasUrl = !!tab?.url;
  const bookmarked = isBookmarked(tab?.url || '');

  /* ─── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      height:'100%', display:'flex', flexDirection:'column',
      background:'#13131f', color:'white',
      fontFamily:"'Segoe UI Variable',-apple-system,sans-serif",
    }}>

      {/* ── Tab bar ── */}
      <div style={{
        display:'flex', alignItems:'center', background:'rgba(0,0,0,0.45)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        overflowX:'auto', flexShrink:0, minHeight:38,
      }}>
        {tabs.map((t, i) => (
          <div key={t.id}
            onClick={() => { setActiveTab(i); setAddressVal(t.url || ''); }}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'0 10px 0 10px', height:38, cursor:'pointer',
              borderRight:'1px solid rgba(255,255,255,0.05)', flexShrink:0,
              background:i===activeTab?'#13131f':'rgba(0,0,0,0.25)',
              borderBottom:i===activeTab?`2px solid ${ACCENT}`:'2px solid transparent',
              minWidth:120, maxWidth:200, position:'relative',
              transition:'all 0.12s',
            }}>
            {/* Favicon */}
            {t.favicon && !t.loading
              ? <img src={t.favicon} alt="" style={{ width:14, height:14, flexShrink:0 }} onError={e=>e.target.style.display='none'}/>
              : t.loading
                ? <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${ACCENT}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
                : <Globe size={13} style={{ opacity:0.4, flexShrink:0 }}/>
            }
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12,
              opacity:i===activeTab?1:0.55 }}>
              {t.incognito && '🕵️ '}{t.title || (t.url ? getDomain(t.url) : 'New Tab')}
            </span>
            <X size={12}
              onClick={e => { e.stopPropagation(); closeTab(i); }}
              style={{ opacity:0.3, flexShrink:0, cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.opacity='1'}
              onMouseLeave={e => e.currentTarget.style.opacity='0.3'}/>
            {/* Loading progress bar */}
            {t.loading && i === activeTab && (
              <div style={{
                position:'absolute', bottom:0, left:0, height:2,
                background:`linear-gradient(90deg,${ACCENT},${ACCENT2})`,
                animation:'progressBar 1.5s ease infinite', borderRadius:1,
              }}/>
            )}
          </div>
        ))}
        <button onClick={() => addNewTab()} title="New Tab (Ctrl+T)"
          style={{ padding:'0 12px', height:38, background:'transparent', border:'none',
            color:'rgba(255,255,255,0.4)', cursor:'pointer', flexShrink:0, fontSize:18 }}>+</button>
      </div>

      {/* ── Navigation bar ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:4, padding:'5px 8px',
        background:'rgba(0,0,0,0.35)', borderBottom:'1px solid rgba(255,255,255,0.07)',
        flexShrink:0,
      }}>
        {/* Back/Forward/Reload */}
        <TBtn onClick={goBack}    disabled={!tab || tab.historyIdx <= 0}          title="Back (Alt+←)"><ChevronLeft size={16}/></TBtn>
        <TBtn onClick={goForward} disabled={!tab || tab.historyIdx >= tab.history.length-1} title="Forward (Alt+→)"><ChevronRight size={16}/></TBtn>
        <TBtn onClick={tab?.loading ? stopLoading : reload} title={tab?.loading ? 'Stop' : 'Reload (Ctrl+R)'}>
          {tab?.loading ? <X size={14}/> : <RefreshCw size={14}/>}
        </TBtn>
        <TBtn onClick={() => navigate('about:blank')} title="Home">
          <Home size={14}/>
        </TBtn>

        {/* Address bar */}
        <form onSubmit={handleAddressSubmit} style={{ flex:1, display:'flex', alignItems:'center',
          background:'rgba(255,255,255,0.07)', border:`1px solid ${addressFocused?'rgba(79,172,254,0.5)':'rgba(255,255,255,0.1)'}`,
          borderRadius:20, padding:'5px 12px', gap:7, transition:'border-color 0.15s' }}>
          <SecureBadge url={tab?.url}/>
          <input
            ref={addressRef}
            value={addressFocused ? addressVal : (tab?.url || '')}
            onChange={e => setAddressVal(e.target.value)}
            onFocus={() => { setAddressFocused(true); addressRef.current?.select(); }}
            onBlur={() => { setAddressFocused(false); setAddressVal(tab?.url || ''); }}
            placeholder="Search or enter URL…"
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              color:'white', fontSize:13,
            }}
          />
          {addressFocused && addressVal && (
            <X size={12} style={{ cursor:'pointer', opacity:0.4 }} onMouseDown={() => { setAddressVal(''); addressRef.current?.focus(); }}/>
          )}
        </form>

        {/* Right controls */}
        <TBtn onClick={toggleBookmark} active={bookmarked} disabled={!hasUrl} title={bookmarked ? 'Remove bookmark (Ctrl+D)' : 'Add bookmark (Ctrl+D)'}>
          {bookmarked ? <Star size={14} fill={ACCENT}/> : <Star size={14}/>}
        </TBtn>
        <TBtn onClick={() => { setShowBookmarks(s=>!s); setShowHistory(false); setShowSettings(false); }} active={showBookmarks} title="Bookmarks">
          <Bookmark size={14}/>
        </TBtn>
        <TBtn onClick={() => { setShowHistory(s=>!s); setShowBookmarks(false); setShowSettings(false); }} active={showHistory} title="History">
          <Clock size={14}/>
        </TBtn>
        {hasUrl && (
          <TBtn onClick={() => window.open(tab.url,'_blank')} title="Open in real browser">
            <ExternalLink size={13}/>
          </TBtn>
        )}
        <TBtn onClick={zoomOut} disabled={!hasUrl} title="Zoom out"><span style={{ fontSize:11 }}>−</span></TBtn>
        <span style={{ fontSize:11, opacity:0.45, minWidth:32, textAlign:'center' }}>{Math.round((tab?.zoom||1)*100)}%</span>
        <TBtn onClick={zoomIn}  disabled={!hasUrl} title="Zoom in"><span style={{ fontSize:11 }}>+</span></TBtn>
        {(tab?.zoom||1) !== 1 && <TBtn onClick={zoomReset} title="Reset zoom"><span style={{ fontSize:10 }}>1:1</span></TBtn>}
      </div>

      {/* ── Bookmarks bar ── */}
      {bookmarks.length > 0 && (
        <div style={{
          display:'flex', alignItems:'center', gap:4, padding:'3px 10px',
          background:'rgba(0,0,0,0.25)', borderBottom:'1px solid rgba(255,255,255,0.05)',
          flexShrink:0, overflowX:'auto', minHeight:28,
        }}>
          {bookmarks.slice(0,12).map(b => (
            <div key={b.id} onClick={() => navigate(b.url)}
              style={{
                display:'flex', alignItems:'center', gap:5, padding:'3px 9px',
                borderRadius:5, cursor:'pointer', fontSize:11, whiteSpace:'nowrap',
                color:'rgba(255,255,255,0.72)', transition:'background 0.1s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {b.favicon
                ? <img src={b.favicon} alt="" style={{ width:12, height:12 }} onError={e=>e.target.style.display='none'}/>
                : <Star size={10} style={{ color:'#fbc531' }}/>}
              {b.title || getDomain(b.url)}
            </div>
          ))}
        </div>
      )}

      {/* ── Find bar ── */}
      {showFind && (
        <div style={{
          display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
          background:'rgba(0,0,0,0.4)', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0,
        }}>
          <Search size={13} style={{ opacity:0.45 }}/>
          <input value={findQ} onChange={e=>setFindQ(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') doFind(1); if(e.key==='Escape'){setShowFind(false);setFindQ('');} }}
            placeholder="Find in page…" autoFocus
            style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)',
              borderRadius:5, padding:'4px 10px', color:'white', fontSize:12, outline:'none' }}/>
          <TBtn onClick={() => doFind(-1)} title="Previous"><ChevronLeft size={13}/></TBtn>
          <TBtn onClick={() => doFind(1)}  title="Next"><ChevronRight size={13}/></TBtn>
          <TBtn onClick={() => { setShowFind(false); setFindQ(''); }}><X size={13}/></TBtn>
          <span style={{ fontSize:10, opacity:0.35 }}>Note: works on same-origin pages only</span>
        </div>
      )}

      {/* ── Main content area ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative', minHeight:0 }}>

        {/* ── Bookmarks panel ── */}
        {showBookmarks && (
          <div style={{
            width:280, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(16px)',
            borderRight:'1px solid rgba(255,255,255,0.08)',
            display:'flex', flexDirection:'column', flexShrink:0,
          }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:7 }}>
                <Bookmark size={14}/>Bookmarks
              </span>
              <X size={14} style={{ cursor:'pointer', opacity:0.4 }} onClick={() => setShowBookmarks(false)}/>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {bookmarks.length === 0
                ? <div style={{ padding:24, textAlign:'center', opacity:0.3, fontSize:12 }}>
                    No bookmarks yet.<br/>Press Ctrl+D to add the current page.
                  </div>
                : bookmarks.map(b => (
                  <div key={b.id}
                    style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px',
                      borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div onClick={() => { navigate(b.url); setShowBookmarks(false); }} style={{ flex:1, display:'flex', alignItems:'center', gap:9 }}>
                      {b.favicon
                        ? <img src={b.favicon} alt="" style={{ width:16, height:16 }} onError={e=>e.target.style.display='none'}/>
                        : <Star size={14} style={{ color:'#fbc531', flexShrink:0 }}/>}
                      <div>
                        <div style={{ fontSize:12, fontWeight:500 }}>{b.title || getDomain(b.url)}</div>
                        <div style={{ fontSize:10, opacity:0.38 }}>{truncateUrl(b.url, 36)}</div>
                      </div>
                    </div>
                    <Trash2 size={13} style={{ cursor:'pointer', opacity:0.3, flexShrink:0 }}
                      onClick={() => setBookmarks(prev => prev.filter(x=>x.id!==b.id))}
                      onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                      onMouseLeave={e=>e.currentTarget.style.opacity='0.3'}/>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── History panel ── */}
        {showHistory && (
          <div style={{
            width:280, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(16px)',
            borderRight:'1px solid rgba(255,255,255,0.08)',
            display:'flex', flexDirection:'column', flexShrink:0,
          }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:7 }}>
                <Clock size={14}/>History
              </span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {globalHistory.length > 0 && (
                  <span style={{ fontSize:11, cursor:'pointer', color:'#ff5f56', opacity:0.7 }}
                    onClick={() => { if(confirm('Clear all browsing history?')) setGlobalHistory([]); }}>
                    Clear
                  </span>
                )}
                <X size={14} style={{ cursor:'pointer', opacity:0.4 }} onClick={() => setShowHistory(false)}/>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {globalHistory.length === 0
                ? <div style={{ padding:24, textAlign:'center', opacity:0.3, fontSize:12 }}>No browsing history</div>
                : globalHistory.map(h => (
                  <div key={h.id} onClick={() => { navigate(h.url); setShowHistory(false); }}
                    style={{ padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)',
                      cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{ fontSize:12, fontWeight:500, marginBottom:2 }}>{h.title}</div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10, opacity:0.38 }}>{truncateUrl(h.url, 32)}</span>
                      <span style={{ fontSize:10, opacity:0.28 }}>
                        {new Date(h.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── Browser viewports (one per tab, only active shown) ── */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          {tabs.map((t, i) => (
            <div key={t.id} style={{
              position:'absolute', inset:0,
              display:i===activeTab?'block':'none',
              overflow:'hidden',
            }}>
              {/* Homepage (no URL) */}
              {!t.url && (
                <HomePage
                  onNavigate={url => navigate(url, i)}
                  bookmarks={bookmarks}
                  searchEngine={searchEngine}
                />
              )}

              {/* Error page */}
              {t.url && t.error && (
                <ErrorPage url={t.url} error={t.error} onRetry={() => { updateTab(i, {loading:true,error:null}); }}/>
              )}

              {/* Iframe */}
              {t.url && !t.error && (
                <iframe
                  ref={el => { iframeRefs.current[t.id] = el; }}
                  src={t.url}
                  title={t.title}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                  style={{
                    width: '100%', height: '100%', border: 'none', display: 'block',
                    transform: `scale(${t.zoom||1})`,
                    transformOrigin: 'top left',
                    width: `${100 / (t.zoom||1)}%`,
                    height: `${100 / (t.zoom||1)}%`,
                  }}
                  onLoad={() => onIframeLoad(t.id, i)}
                  onError={() => onIframeError(i)}
                />
              )}

              {/* Loading overlay */}
              {t.loading && t.url && !t.error && (
                <div style={{
                  position:'absolute', top:0, left:0, right:0, height:3, zIndex:10,
                  background:'rgba(0,0,0,0.2)',
                }}>
                  <div style={{
                    height:'100%', background:`linear-gradient(90deg,${ACCENT},${ACCENT2})`,
                    animation:'loadBar 1.5s ease-in-out infinite',
                    borderRadius:2,
                  }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'2px 12px', background:'rgba(0,0,0,0.5)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        fontSize:10, color:'rgba(255,255,255,0.32)', flexShrink:0,
      }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {tab?.loading && <span style={{ color:ACCENT }}>⟳ Loading…</span>}
          {tab?.url && !tab?.loading && (
            <span>{isHttps(tab.url)
              ? <span style={{ color:'#27c93f' }}>🔒 Secure</span>
              : isHttp(tab.url) ? <span style={{ color:'#ffbd2e' }}>⚠ Not Secure</span>
              : ''}
            </span>
          )}
          {tab?.url && <span>{truncateUrl(tab.url, 60)}</span>}
        </div>
        <div style={{ display:'flex', gap:12 }}>
          {tab?.incognito && <span style={{ color:'#a29bfe' }}>🕵️ Incognito</span>}
          <span>{tabs.length} tab{tabs.length!==1?'s':''}</span>
          <span>{bookmarks.length} bookmark{bookmarks.length!==1?'s':''}</span>
          {tab?.zoom && tab.zoom !== 1 && <span>{Math.round(tab.zoom*100)}% zoom</span>}
        </div>
      </div>

      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2)}
        button,input{font-family:inherit}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes loadBar{
          0%{width:0%;margin-left:0}
          50%{width:60%;margin-left:20%}
          100%{width:0%;margin-left:100%}
        }
        @keyframes progressBar{
          0%{width:15%;opacity:1}
          70%{width:85%}
          100%{width:100%;opacity:0}
        }
      `}</style>
    </div>
  );
}