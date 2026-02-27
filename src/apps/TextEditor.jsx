/**
 * TextEditor.jsx — LynkOS Text Editor v4.0
 * ==========================================
 * Features:
 *   • Multi-tab editing (open multiple files simultaneously)
 *   • Syntax highlighting (JS/JSX/TS, Python, HTML, CSS, JSON, Markdown, plain text)
 *   • Line numbers with current-line highlight
 *   • Find & Replace panel (Ctrl+F / Ctrl+H)
 *   • Go to Line (Ctrl+G)
 *   • VFS save/load — reads & writes to IndexedDB via vfs prop
 *   • New file, Open from VFS, Save, Save As
 *   • Word wrap toggle, font size controls
 *   • Status bar (line/col, word count, encoding)
 *   • Undo/Redo (browser native + tracked)
 *   • Unsaved-changes indicator (• in tab title)
 *   • Keyboard: Ctrl+S save, Ctrl+W close tab, Ctrl+T new tab,
 *               Tab inserts 2 spaces, Ctrl+/ toggle line comment
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus, X, Save, FolderOpen, FileText, Search, RefreshCw,
  ChevronLeft, ChevronRight, AlignLeft, WrapText,
  ZoomIn, ZoomOut, MoreHorizontal, Copy, Clipboard,
  Hash, AlertCircle, CheckCircle, Type, File,
} from 'lucide-react';

const ACCENT  = '#4facfe';
const ACCENT2 = '#00f2fe';

// ── Language detection ────────────────────────────────────────────────────────
const detectLang = filename => {
  if (!filename) return 'text';
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js:'javascript', jsx:'javascript', ts:'javascript', tsx:'javascript',
    py:'python', python:'python',
    html:'html', htm:'html',
    css:'css', scss:'css', less:'css',
    json:'json',
    md:'markdown', markdown:'markdown',
    sh:'shell', bash:'shell',
    sql:'sql',
    xml:'xml',
    yaml:'yaml', yml:'yaml',
    txt:'text',
  };
  return map[ext] || 'text';
};

// ── Syntax tokeniser — returns array of {type, text} per line ────────────────
const tokenise = (line, lang) => {
  if (lang === 'text' || lang === 'shell' || lang === 'sql') return [{ type:'plain', text:line }];

  const tokens = [];
  let rest = line;

  const push = (type, text) => { if (text) tokens.push({ type, text }); };

  const patterns = {
    javascript: [
      { type:'comment',  re:/^(\/\/.*|\/\*[\s\S]*?\*\/)/ },
      { type:'string',   re:/^(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/ },
      { type:'keyword',  re:/^\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|class|extends|import|export|default|from|async|await|try|catch|finally|throw|null|undefined|true|false|this|super|of|in|yield|void|static|get|set|prototype)\b/ },
      { type:'type',     re:/^\b(Array|Object|String|Number|Boolean|Promise|Map|Set|Date|RegExp|Error|Symbol|BigInt|console|Math|JSON|parseInt|parseFloat|isNaN|isFinite|NaN|Infinity)\b/ },
      { type:'number',   re:/^\b(0x[\da-fA-F]+|\d+\.?\d*([eE][+-]?\d+)?)\b/ },
      { type:'func',     re:/^\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/ },
      { type:'operator', re:/^(===|!==|=>|&&|\|\||[+\-*/%=<>!&|^~?:])/ },
      { type:'punct',    re:/^[{}[\]();,.]/ },
    ],
    python: [
      { type:'comment',  re:/^#.*/ },
      { type:'string',   re:/^("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/ },
      { type:'keyword',  re:/^\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|try|except|finally|raise|with|yield|pass|break|continue|lambda|None|True|False|global|nonlocal|del|is|assert|async|await)\b/ },
      { type:'type',     re:/^\b(int|str|float|bool|list|dict|tuple|set|type|len|range|print|input|open|enumerate|zip|map|filter|sorted|reversed|isinstance|issubclass|hasattr|getattr|setattr)\b/ },
      { type:'number',   re:/^\b\d+\.?\d*\b/ },
      { type:'func',     re:/^\b([a-zA-Z_]\w*)(?=\s*\()/ },
      { type:'operator', re:/^(==|!=|<=|>=|[-+*/%=<>&|^~])/ },
      { type:'punct',    re:/^[{}[\]();,.]/ },
    ],
    html: [
      { type:'comment',  re:/^<!--[\s\S]*?-->/ },
      { type:'tag',      re:/^<\/?[a-zA-Z][a-zA-Z0-9-]*/ },
      { type:'attr',     re:/^\b[a-zA-Z_:][a-zA-Z0-9_:.-]*(?=\s*=)/ },
      { type:'string',   re:/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/ },
      { type:'operator', re:/^[<>/=]/ },
    ],
    css: [
      { type:'comment',  re:/^\/\*[\s\S]*?\*\// },
      { type:'string',   re:/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/ },
      { type:'keyword',  re:/^(@media|@keyframes|@import|@font-face|@supports|!important)\b/ },
      { type:'property', re:/^\b[-a-z]+(?=\s*:)/ },
      { type:'value',    re:/^#[0-9a-fA-F]{3,8}\b/ },
      { type:'number',   re:/^\b\d+\.?\d*(px|em|rem|%|vh|vw|deg|s|ms)?\b/ },
      { type:'func',     re:/^\b([a-z-]+)(?=\()/ },
      { type:'selector', re:/^[.#]?[a-zA-Z][a-zA-Z0-9_-]*/ },
      { type:'punct',    re:/^[{};:,]/ },
    ],
    json: [
      { type:'string',   re:/^"(?:[^"\\]|\\.)*"/ },
      { type:'number',   re:/^-?\d+\.?\d*([eE][+-]?\d+)?/ },
      { type:'keyword',  re:/^\b(true|false|null)\b/ },
      { type:'punct',    re:/^[{}[\]:,]/ },
    ],
    markdown: [
      { type:'heading',  re:/^#{1,6}\s.*/ },
      { type:'bold',     re:/^\*\*[^*]+\*\*/ },
      { type:'italic',   re:/^\*[^*]+\*/ },
      { type:'code',     re:/^`[^`]+`/ },
      { type:'link',     re:/^\[([^\]]+)\]\([^)]+\)/ },
      { type:'quote',    re:/^>.*/ },
      { type:'listitem', re:/^[-*+]\s/ },
    ],
    xml: [
      { type:'comment',  re:/^<!--[\s\S]*?-->/ },
      { type:'tag',      re:/^<\/?[a-zA-Z][a-zA-Z0-9:.-]*/ },
      { type:'attr',     re:/^\b[a-zA-Z_:][a-zA-Z0-9_:.-]*(?=\s*=)/ },
      { type:'string',   re:/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/ },
      { type:'operator', re:/^[<>/=]/ },
    ],
    yaml: [
      { type:'comment',  re:/^#.*/ },
      { type:'keyword',  re:/^\b(true|false|null|yes|no)\b/ },
      { type:'key',      re:/^[a-zA-Z_][a-zA-Z0-9_-]*(?=\s*:)/ },
      { type:'string',   re:/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/ },
      { type:'number',   re:/^\b\d+\.?\d*\b/ },
    ],
  };

  const pats = patterns[lang] || [];

  while (rest.length > 0) {
    let matched = false;
    for (const { type, re } of pats) {
      const m = rest.match(re);
      if (m) {
        push(type, m[0]);
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      push('plain', rest[0]);
      rest = rest.slice(1);
    }
  }
  return tokens;
};

// Colour map for token types
const TOKEN_COLORS = {
  comment:  '#6a9955',
  string:   '#ce9178',
  keyword:  '#569cd6',
  type:     '#4ec9b0',
  number:   '#b5cea8',
  func:     '#dcdcaa',
  operator: '#d4d4d4',
  punct:    '#d4d4d4',
  plain:    '#d4d4d4',
  tag:      '#4ec9b0',
  attr:     '#9cdcfe',
  property: '#9cdcfe',
  value:    '#ce9178',
  selector: '#d7ba7d',
  key:      '#9cdcfe',
  heading:  '#569cd6',
  bold:     '#ffffff',
  italic:   '#d4d4d4',
  code:     '#ce9178',
  link:     '#4ec9b0',
  quote:    '#6a9955',
  listitem: '#d4d4d4',
};

// ── Highlighted line renderer ─────────────────────────────────────────────────
const HighlightedLine = React.memo(({ line, lang }) => {
  const tokens = useMemo(() => tokenise(line || '', lang), [line, lang]);
  return (
    <span>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[t.type] || '#d4d4d4' }}>{t.text}</span>
      ))}
    </span>
  );
});

// ── uid helper ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const newTab = (name = 'untitled.txt', content = '') => ({
  id: uid(), name, content, savedContent: content,
  path: null, dirty: false,
  lang: detectLang(name),
  scrollTop: 0, cursorLine: 1, cursorCol: 1,
});

// ═════════════════════════════════════════════════════════════════════════════
export default function TextEditor({ vfs, notify, initialFile, onClose }) {

  const [tabs,       setTabs]       = useState([newTab()]);
  const [activeTab,  setActiveTab]  = useState(0);
  const [wordWrap,   setWordWrap]   = useState(true);
  const [fontSize,   setFontSize]   = useState(14);
  const [showFind,   setShowFind]   = useState(false);
  const [showGoLine, setShowGoLine] = useState(false);
  const [findQ,      setFindQ]      = useState('');
  const [replaceQ,   setReplaceQ]   = useState('');
  const [findCase,   setFindCase]   = useState(false);
  const [findResults,setFindResults]= useState([]);
  const [findIdx,    setFindIdx]    = useState(0);
  const [goLineVal,  setGoLineVal]  = useState('');
  const [showVfsPicker, setShowVfsPicker] = useState(false);
  const [vfsFiles,   setVfsFiles]   = useState([]);

  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const tab = tabs[activeTab] || tabs[0];

  // ── Load initial file ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialFile) return;
    const content = initialFile.content || '';
    const name    = initialFile.name || 'untitled.txt';
    const path    = initialFile.path || null;
    setTabs([{ id:uid(), name, content, savedContent:content, path, dirty:false, lang:detectLang(name), scrollTop:0, cursorLine:1, cursorCol:1 }]);
    setActiveTab(0);
  }, [initialFile]);

  // ── Helpers to mutate active tab ────────────────────────────────────────────
  const updateTab = useCallback((idx, patch) => {
    setTabs(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));
  }, []);

  const setContent = useCallback((val) => {
    setTabs(prev => prev.map((t, i) => i === activeTab
      ? { ...t, content: val, dirty: val !== t.savedContent }
      : t));
  }, [activeTab]);

  // ── Cursor tracking ─────────────────────────────────────────────────────────
  const updateCursor = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const text   = el.value.slice(0, el.selectionStart);
    const lines  = text.split('\n');
    const line   = lines.length;
    const col    = lines[lines.length - 1].length + 1;
    updateTab(activeTab, { cursorLine: line, cursorCol: col });
  }, [activeTab, updateTab]);

  // ── Sync scroll between textarea and line numbers ───────────────────────────
  const syncScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // ── Keyboard shortcuts inside textarea ──────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+S → save
    if (ctrl && e.key === 's') { e.preventDefault(); saveFile(); return; }
    // Ctrl+F → find
    if (ctrl && e.key === 'f') { e.preventDefault(); setShowFind(s => !s); return; }
    // Ctrl+H → find+replace
    if (ctrl && e.key === 'h') { e.preventDefault(); setShowFind(true); return; }
    // Ctrl+G → go to line
    if (ctrl && e.key === 'g') { e.preventDefault(); setShowGoLine(s => !s); return; }
    // Ctrl+W → close tab
    if (ctrl && e.key === 'w') { e.preventDefault(); closeTab(activeTab); return; }
    // Ctrl+T → new tab
    if (ctrl && e.key === 't') { e.preventDefault(); addTab(); return; }
    // Ctrl+/ → toggle comment
    if (ctrl && e.key === '/') {
      e.preventDefault();
      toggleComment();
      return;
    }
    // Tab → insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const el  = textareaRef.current;
      const st  = el.selectionStart;
      const en  = el.selectionEnd;
      const val = el.value;
      const next = val.slice(0, st) + '  ' + val.slice(en);
      setContent(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = st + 2;
      });
      return;
    }
    // Enter → auto-indent
    if (e.key === 'Enter') {
      const el  = textareaRef.current;
      const st  = el.selectionStart;
      const val = el.value;
      const lineStart = val.lastIndexOf('\n', st - 1) + 1;
      const currentLine = val.slice(lineStart, st);
      const indent = currentLine.match(/^(\s*)/)[1];
      const extraIndent = /[{(\[]\s*$/.test(currentLine.trimEnd()) ? '  ' : '';
      e.preventDefault();
      const next = val.slice(0, st) + '\n' + indent + extraIndent + val.slice(el.selectionEnd);
      setContent(next);
      const newPos = st + 1 + indent.length + extraIndent.length;
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = newPos;
      });
    }
  }, [activeTab]); // eslint-disable-line

  const toggleComment = () => {
    const el   = textareaRef.current;
    const val  = el.value;
    const st   = el.selectionStart;
    const lineStart = val.lastIndexOf('\n', st - 1) + 1;
    const lineEnd   = val.indexOf('\n', st);
    const line = val.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const prefix = tab.lang === 'python' ? '# ' : tab.lang === 'html' ? '<!-- ' : '// ';
    const suffix = tab.lang === 'html' ? ' -->' : '';
    const isCommented = line.startsWith(prefix);
    const newLine = isCommented
      ? line.slice(prefix.length, suffix ? line.length - suffix.length : undefined)
      : prefix + line + suffix;
    const newVal = val.slice(0, lineStart) + newLine + val.slice(lineEnd === -1 ? val.length : lineEnd);
    setContent(newVal);
  };

  // ── Find ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!findQ) { setFindResults([]); return; }
    const content = tab.content;
    const flags   = findCase ? 'g' : 'gi';
    const re = new RegExp(findQ.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), flags);
    const results = [];
    let m;
    while ((m = re.exec(content)) !== null) results.push(m.index);
    setFindResults(results);
    setFindIdx(0);
  }, [findQ, findCase, tab?.content]); // eslint-disable-line

  const jumpToFind = idx => {
    const el  = textareaRef.current;
    if (!el || !findResults.length) return;
    const pos = findResults[idx];
    el.focus();
    el.setSelectionRange(pos, pos + findQ.length);
    setFindIdx(idx);
  };

  const doReplace = () => {
    if (!findQ || !findResults.length) return;
    const pos = findResults[findIdx];
    const c   = tab.content;
    setContent(c.slice(0, pos) + replaceQ + c.slice(pos + findQ.length));
  };

  const doReplaceAll = () => {
    if (!findQ) return;
    const flags = findCase ? 'g' : 'gi';
    const re = new RegExp(findQ.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), flags);
    const count = (tab.content.match(re)||[]).length;
    setContent(tab.content.replace(re, replaceQ));
    notify?.('success','Replaced', `${count} occurrence(s) replaced`);
  };

  const goToLine = () => {
    const n  = parseInt(goLineVal, 10);
    if (!n) return;
    const el = textareaRef.current;
    const lines = tab.content.split('\n');
    const target = Math.max(1, Math.min(n, lines.length));
    let pos = 0;
    for (let i = 0; i < target - 1; i++) pos += lines[i].length + 1;
    el.focus();
    el.setSelectionRange(pos, pos);
    updateCursor();
    setShowGoLine(false);
    setGoLineVal('');
  };

  // ── Tab management ────────────────────────────────────────────────────────────
  const addTab = () => {
    const t = newTab();
    setTabs(prev => [...prev, t]);
    setActiveTab(tabs.length);
  };

  const closeTab = idx => {
    const t = tabs[idx];
    if (t.dirty && !confirm(`"${t.name}" has unsaved changes. Close anyway?`)) return;
    if (tabs.length === 1) { setTabs([newTab()]); setActiveTab(0); return; }
    const next = tabs.filter((_, i) => i !== idx);
    setTabs(next);
    setActiveTab(Math.min(idx, next.length - 1));
  };

  // ── VFS operations ────────────────────────────────────────────────────────────
  const saveFile = async () => {
    if (!vfs) { notify?.('warning','No VFS','File system not ready'); return; }
    try {
      if (tab.path) {
        await vfs.updateFile(tab.path, { content: tab.content, size: tab.content.length });
        updateTab(activeTab, { savedContent: tab.content, dirty: false });
        notify?.('success','Saved', tab.name);
      } else {
        // Save As
        const name = prompt('Save as:', tab.name || 'untitled.txt');
        if (!name?.trim()) return;
        const file = await vfs.createFile('/Users/Admin/Documents', name.trim(), tab.content);
        updateTab(activeTab, { name: name.trim(), path: file.path, savedContent: tab.content, dirty: false, lang: detectLang(name.trim()) });
        notify?.('success','Saved', name);
      }
    } catch(e) { notify?.('error','Save Failed', String(e)); }
  };

  const openFromVfs = async () => {
    if (!vfs) return;
    try {
      const results = await vfs.search('', '/');
      const files   = results.filter(f => f.type === 'file');
      setVfsFiles(files);
      setShowVfsPicker(true);
    } catch(e) { notify?.('error','Open Failed', String(e)); }
  };

  const loadVfsFile = async file => {
    const full = await vfs.get(file.path);
    const content = full?.content || '';
    const t = newTab(file.name, content);
    t.path = file.path;
    setTabs(prev => [...prev, t]);
    setActiveTab(tabs.length);
    setShowVfsPicker(false);
    await vfs.addToRecent(file);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const content = tab?.content || '';
    const words   = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars   = content.length;
    const lines   = content.split('\n').length;
    return { words, chars, lines };
  }, [tab?.content]);

  const lineNumbers = useMemo(() => {
    if (!tab) return [];
    return tab.content.split('\n').map((_, i) => i + 1);
  }, [tab?.content]); // eslint-disable-line

  // ── Global keyboard (Ctrl+S outside textarea) ─────────────────────────────
  useEffect(() => {
    const fn = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowFind(s => !s); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      background:'#1e1e2e', color:'#d4d4d4',
      fontFamily:"'Segoe UI Variable',-apple-system,sans-serif" }}>

      {/* ── Menu bar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:2, padding:'4px 8px',
        background:'rgba(0,0,0,0.35)', borderBottom:'1px solid rgba(255,255,255,0.06)',
        flexShrink:0, flexWrap:'wrap' }}>

        {/* File actions */}
        {[
          { icon:<Plus size={13}/>,       tip:'New Tab (Ctrl+T)',   action:addTab },
          { icon:<FolderOpen size={13}/>, tip:'Open from VFS',      action:openFromVfs },
          { icon:<Save size={13}/>,       tip:'Save (Ctrl+S)',      action:saveFile },
        ].map((b,i) => (
          <button key={i} onClick={b.action} title={b.tip}
            style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.65)',
              cursor:'pointer', padding:'4px 6px', borderRadius:4, display:'flex',
              alignItems:'center', gap:4, fontSize:12, transition:'background 0.1s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            {b.icon}
          </button>
        ))}

        <div style={{ width:1, height:16, background:'rgba(255,255,255,0.1)', margin:'0 4px' }}/>

        {/* Search */}
        <button onClick={() => setShowFind(s=>!s)} title="Find (Ctrl+F)"
          style={{ background:showFind?'rgba(79,172,254,0.18)':'transparent', border:'none',
            color:showFind?ACCENT:'rgba(255,255,255,0.65)', cursor:'pointer',
            padding:'4px 6px', borderRadius:4, display:'flex', alignItems:'center',
            fontSize:12, transition:'background 0.1s' }}>
          <Search size={13}/>
        </button>

        <div style={{ width:1, height:16, background:'rgba(255,255,255,0.1)', margin:'0 4px' }}/>

        {/* Font size */}
        <button onClick={() => setFontSize(s=>Math.max(10,s-1))} title="Smaller" style={iconBtn()}>
          <ZoomOut size={13}/>
        </button>
        <span style={{ fontSize:11, opacity:0.55, minWidth:22, textAlign:'center' }}>{fontSize}</span>
        <button onClick={() => setFontSize(s=>Math.min(28,s+1))} title="Larger" style={iconBtn()}>
          <ZoomIn size={13}/>
        </button>

        <div style={{ width:1, height:16, background:'rgba(255,255,255,0.1)', margin:'0 4px' }}/>

        {/* Word wrap */}
        <button onClick={() => setWordWrap(w=>!w)} title="Toggle Word Wrap"
          style={{ ...iconBtn(), color:wordWrap?ACCENT:'rgba(255,255,255,0.65)',
            background:wordWrap?'rgba(79,172,254,0.15)':'transparent' }}>
          <WrapText size={13}/>
        </button>

        {/* Language badge */}
        <div style={{ marginLeft:'auto', fontSize:11, opacity:0.45, padding:'2px 7px',
          background:'rgba(255,255,255,0.05)', borderRadius:4 }}>
          {tab?.lang || 'text'}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', alignItems:'center', background:'rgba(0,0,0,0.25)',
        borderBottom:'1px solid rgba(255,255,255,0.06)', overflowX:'auto',
        flexShrink:0, minHeight:34 }}>
        {tabs.map((t, i) => (
          <div key={t.id} onClick={() => setActiveTab(i)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px 6px 10px',
              cursor:'pointer', whiteSpace:'nowrap', fontSize:12, flexShrink:0,
              borderRight:'1px solid rgba(255,255,255,0.05)',
              background:i===activeTab?'#1e1e2e':'rgba(0,0,0,0.2)',
              borderBottom:i===activeTab?`2px solid ${ACCENT}`:'2px solid transparent',
              color:i===activeTab?'white':'rgba(255,255,255,0.55)',
              transition:'all 0.12s' }}>
            <FileText size={12} style={{ opacity:0.6 }}/>
            <span>{t.dirty ? '• ' : ''}{t.name}</span>
            <X size={11} style={{ opacity:0.4, marginLeft:2 }}
              onClick={e => { e.stopPropagation(); closeTab(i); }}
              onMouseEnter={e => e.currentTarget.style.opacity='1'}
              onMouseLeave={e => e.currentTarget.style.opacity='0.4'}/>
          </div>
        ))}
        <button onClick={addTab} title="New Tab"
          style={{ padding:'6px 10px', background:'transparent', border:'none',
            color:'rgba(255,255,255,0.4)', cursor:'pointer', flexShrink:0 }}>
          <Plus size={13}/>
        </button>
      </div>

      {/* ── Find bar ── */}
      {showFind && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
          background:'rgba(0,0,0,0.4)', borderBottom:'1px solid rgba(255,255,255,0.08)',
          flexShrink:0, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6,
            background:'rgba(255,255,255,0.07)', border:`1px solid ${findQ&&findResults.length===0?'rgba(255,100,100,0.5)':'rgba(255,255,255,0.12)'}`,
            borderRadius:5, padding:'3px 8px', flex:'0 1 200px' }}>
            <Search size={12} style={{ opacity:0.4 }}/>
            <input value={findQ} onChange={e=>setFindQ(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') jumpToFind((findIdx+1)%Math.max(1,findResults.length)); if(e.key==='Escape') setShowFind(false); }}
              placeholder="Find…" autoFocus
              style={{ background:'transparent', border:'none', outline:'none', color:'white', fontSize:12, width:'100%' }}/>
          </div>
          {findResults.length > 0 && (
            <span style={{ fontSize:11, opacity:0.5, whiteSpace:'nowrap' }}>
              {findIdx+1}/{findResults.length}
            </span>
          )}
          <button onClick={() => jumpToFind((findIdx-1+findResults.length)%Math.max(1,findResults.length))} style={iconBtn()} title="Previous">
            <ChevronLeft size={13}/>
          </button>
          <button onClick={() => jumpToFind((findIdx+1)%Math.max(1,findResults.length))} style={iconBtn()} title="Next">
            <ChevronRight size={13}/>
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:6,
            background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:5, padding:'3px 8px', flex:'0 1 180px' }}>
            <input value={replaceQ} onChange={e=>setReplaceQ(e.target.value)}
              placeholder="Replace…"
              style={{ background:'transparent', border:'none', outline:'none', color:'white', fontSize:12, width:'100%' }}/>
          </div>
          <button onClick={doReplace}    style={smallBtn()}>Replace</button>
          <button onClick={doReplaceAll} style={smallBtn()}>All</button>
          <button onClick={() => setFindCase(s=>!s)} title="Case sensitive"
            style={{ ...iconBtn(), background:findCase?'rgba(79,172,254,0.2)':'transparent', color:findCase?ACCENT:'rgba(255,255,255,0.5)' }}>
            Aa
          </button>
          <button onClick={() => setShowFind(false)} style={iconBtn()}><X size={13}/></button>
        </div>
      )}

      {/* ── Go to line ── */}
      {showGoLine && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
          background:'rgba(0,0,0,0.4)', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <span style={{ fontSize:12, opacity:0.6 }}>Go to line:</span>
          <input value={goLineVal} onChange={e=>setGoLineVal(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') goToLine(); if(e.key==='Escape') setShowGoLine(false); }}
            placeholder={`1–${stats.lines}`} autoFocus
            style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
              borderRadius:5, padding:'4px 8px', color:'white', fontSize:12, outline:'none', width:100 }}/>
          <button onClick={goToLine} style={smallBtn()}>Go</button>
          <button onClick={() => setShowGoLine(false)} style={iconBtn()}><X size={13}/></button>
        </div>
      )}

      {/* ── Editor area (line numbers + textarea) ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>

        {/* Line numbers */}
        <div ref={lineNumbersRef} style={{
          width:52, background:'rgba(0,0,0,0.25)', borderRight:'1px solid rgba(255,255,255,0.05)',
          overflowY:'hidden', flexShrink:0, padding:'4px 0',
          fontSize:fontSize, fontFamily:"'Cascadia Code','JetBrains Mono','Fira Code',Consolas,monospace",
          lineHeight:'1.6', userSelect:'none', pointerEvents:'none',
        }}>
          {lineNumbers.map(n => (
            <div key={n} style={{
              textAlign:'right', paddingRight:10, opacity:n===tab?.cursorLine?0.8:0.3,
              background:n===tab?.cursorLine?'rgba(79,172,254,0.07)':'transparent',
              fontSize:fontSize-1,
            }}>{n}</div>
          ))}
        </div>

        {/* Syntax highlight overlay + real textarea */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

          {/* Highlighted code mirror (sits behind textarea) */}
          <pre style={{
            position:'absolute', inset:0, margin:0, padding:'4px 0 4px 12px',
            fontSize:fontSize,
            fontFamily:"'Cascadia Code','JetBrains Mono','Fira Code',Consolas,monospace",
            lineHeight:'1.6', whiteSpace:wordWrap?'pre-wrap':'pre',
            overflowX:wordWrap?'hidden':'auto', overflowY:'hidden',
            color:'transparent', // hidden — only for layout alignment
            pointerEvents:'none', userSelect:'none',
            wordBreak:wordWrap?'break-word':'normal',
          }}>
            {(tab?.content || '').split('\n').map((line, i) => (
              <div key={i} style={{
                background:i+1===tab?.cursorLine?'rgba(79,172,254,0.06)':'transparent',
                minHeight:'1.6em',
              }}>
                <HighlightedLine line={line} lang={tab?.lang || 'text'}/>
              </div>
            ))}
          </pre>

          {/* Actual textarea — transparent so highlight shows through */}
          <textarea
            ref={textareaRef}
            value={tab?.content || ''}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursor}
            onClick={updateCursor}
            onScroll={syncScroll}
            spellCheck={false}
            style={{
              position:'absolute', inset:0, width:'100%', height:'100%',
              margin:0, padding:'4px 0 4px 12px',
              fontSize:fontSize,
              fontFamily:"'Cascadia Code','JetBrains Mono','Fira Code',Consolas,monospace",
              lineHeight:'1.6', whiteSpace:wordWrap?'pre-wrap':'pre',
              overflowX:wordWrap?'hidden':'auto', overflowY:'auto',
              wordBreak:wordWrap?'break-word':'normal',
              background:'transparent',
              color:tab?.lang==='text'?'#d4d4d4':'rgba(0,0,0,0)',
              // Text colour: visible only for plain text (no highlighting overlay)
              caretColor:'#aeafad', border:'none', outline:'none', resize:'none',
            }}
          />
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'3px 12px', background:'rgba(0,0,0,0.4)',
        borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:11,
        color:'rgba(255,255,255,0.42)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:14 }}>
          <span>Ln {tab?.cursorLine}, Col {tab?.cursorCol}</span>
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
          <span>{stats.chars} chars</span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {tab?.dirty && <span style={{ color:'#ffbd2e' }}>● Unsaved</span>}
          <span style={{ cursor:'pointer' }} onClick={() => setShowGoLine(s=>!s)} title="Ctrl+G">
            Go to line
          </span>
          <span>{tab?.lang || 'text'}</span>
          <span>UTF-8</span>
          <span>{wordWrap?'Wrap':'No wrap'}</span>
        </div>
      </div>

      {/* ── VFS file picker modal ── */}
      {showVfsPicker && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)',
          backdropFilter:'blur(6px)', display:'flex', alignItems:'center',
          justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:10, width:420, maxHeight:'70%', display:'flex', flexDirection:'column',
            boxShadow:'0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:600, fontSize:13 }}>Open File from VFS</span>
              <X size={14} style={{ cursor:'pointer', opacity:0.5 }} onClick={() => setShowVfsPicker(false)}/>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:8 }}>
              {vfsFiles.length === 0
                ? <div style={{ padding:20, textAlign:'center', opacity:0.35, fontSize:12 }}>No files found</div>
                : vfsFiles.map(f => (
                  <div key={f.path} onClick={() => loadVfsFile(f)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                      borderRadius:6, cursor:'pointer', fontSize:12, transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <FileText size={14} style={{ opacity:0.55 }}/>
                    <div>
                      <div>{f.name}</div>
                      <div style={{ fontSize:10, opacity:0.4, marginTop:1 }}>{f.path}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        textarea{caret-color:#aeafad}
        ::-webkit-scrollbar{width:7px;height:7px}
        ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2)}
      `}</style>
    </div>
  );
}

/* ── button style helpers ── */
function iconBtn(extra = {}) {
  return {
    background:'transparent', border:'none', color:'rgba(255,255,255,0.58)',
    cursor:'pointer', padding:'4px 6px', borderRadius:4,
    display:'flex', alignItems:'center', fontSize:12,
    transition:'background 0.1s', ...extra,
  };
}
function smallBtn(extra = {}) {
  return {
    background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
    color:'rgba(255,255,255,0.75)', cursor:'pointer', padding:'3px 10px',
    borderRadius:5, fontSize:11, fontWeight:500, ...extra,
  };
}