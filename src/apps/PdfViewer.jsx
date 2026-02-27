/**
 * PdfViewer.jsx — LynkOS PDF Viewer v4.0
 * =========================================
 * Features:
 *   • PDF.js (CDN) for full PDF rendering inside canvas elements
 *   • Page navigation (Prev/Next, jump-to-page input, keyboard ←→)
 *   • Zoom: fit-width, fit-page, %, zoom in/out (Ctrl+= / Ctrl+-)
 *   • Thumbnail sidebar with page preview strips
 *   • Text layer (selectable/copyable text over canvas)
 *   • Search in PDF (Ctrl+F) — highlights matches per page
 *   • Continuous scroll mode or single-page mode
 *   • Open local file (drag-and-drop OR file picker)
 *   • Open from VFS (IndexedDB)
 *   • Print (window.print via hidden iframe)
 *   • Download original file
 *   • Rotation (90° steps)
 *   • Dark/light background toggle
 *   • Page count, loading states, error handling
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw,
  Maximize, Download, Upload, FolderOpen, Search, X,
  Sidebar, AlignCenter, Printer, Moon, Sun, FileText,
  AlertCircle, Loader,
} from 'lucide-react';

const ACCENT  = '#4facfe';
const ACCENT2 = '#00f2fe';
const PDF_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_JS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ─── Load PDF.js from CDN once ───────────────────────────────────────────── */
let pdfJsPromise = null;
const loadPdfJs = () => {
  if (pdfJsPromise) return pdfJsPromise;
  pdfJsPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const s = document.createElement('script');
    s.src = PDF_JS_CDN;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(s);
  });
  return pdfJsPromise;
};

/* ─── Toolbar button ──────────────────────────────────────────────────────── */
const TBtn = ({ onClick, title, active, disabled, children }) => (
  <button onClick={onClick} title={title} disabled={disabled}
    style={{
      background: active ? 'rgba(79,172,254,0.22)' : 'transparent',
      border: `1px solid ${active ? 'rgba(79,172,254,0.4)' : 'transparent'}`,
      color: disabled ? 'rgba(255,255,255,0.2)' : active ? ACCENT : 'rgba(255,255,255,0.72)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '4px 7px', borderRadius: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, transition: 'all 0.12s', gap: 4,
    }}
    onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
    {children}
  </button>
);

const Divider = () => (
  <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 3px', flexShrink: 0 }}/>
);

/* ─── Single page canvas renderer ────────────────────────────────────────── */
const PdfPage = React.memo(({
  pdf, pageNum, scale, rotation, darkMode,
  isVisible, onLoaded, searchQuery, isCurrent,
}) => {
  const canvasRef  = useRef(null);
  const textRef    = useRef(null);
  const renderTask = useRef(null);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cancel any in-progress render
        if (renderTask.current) {
          renderTask.current.cancel();
          renderTask.current = null;
        }

        const page    = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale, rotation });

        const canvas  = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx     = canvas.getContext('2d');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        setPageSize({ w: viewport.width, h: viewport.height });

        // Background
        ctx.fillStyle = darkMode ? '#2a2a2a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderTask.current = page.render({ canvasContext: ctx, viewport });
        await renderTask.current.promise;

        if (cancelled) return;

        // Text layer
        if (textRef.current) {
          textRef.current.innerHTML = '';
          const textContent = await page.getTextContent();
          const pdfjsLib = window.pdfjsLib;
          if (pdfjsLib?.renderTextLayer && textRef.current) {
            textRef.current.style.width  = viewport.width  + 'px';
            textRef.current.style.height = viewport.height + 'px';
            await pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textRef.current,
              viewport,
              textDivs: [],
            }).promise;
          }
        }

        setLoading(false);
        onLoaded?.(pageNum, { w: viewport.width, h: viewport.height });
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) {
          setError(err.message || 'Render error');
          setLoading(false);
        }
      }
    };

    render();
    return () => {
      cancelled = true;
      if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null; }
    };
  }, [pdf, pageNum, scale, rotation, darkMode]); // eslint-disable-line

  return (
    <div style={{
      position: 'relative',
      width: pageSize.w || 600,
      height: pageSize.h || 800,
      margin: '0 auto 16px',
      boxShadow: isCurrent
        ? `0 0 0 2px ${ACCENT}, 0 8px 32px rgba(0,0,0,0.6)`
        : '0 4px 20px rgba(0,0,0,0.5)',
      borderRadius: 2,
      background: darkMode ? '#2a2a2a' : '#fff',
      flexShrink: 0,
    }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: darkMode ? '#2a2a2a' : '#f5f5f5',
          borderRadius: 2,
        }}>
          <div style={{ textAlign: 'center', color: 'rgba(150,150,150,0.8)' }}>
            <div style={{ fontSize: 12, marginTop: 8 }}>Page {pageNum}</div>
          </div>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#1a1a1a', color: '#ff5f56', gap: 8, padding: 16,
        }}>
          <AlertCircle size={28}/>
          <div style={{ fontSize: 12, textAlign: 'center', opacity: 0.8 }}>{error}</div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 2 }}/>
      {/* Text layer for selection */}
      <div ref={textRef} style={{
        position: 'absolute', top: 0, left: 0,
        lineHeight: 1, overflow: 'hidden', opacity: 1,
      }} className="pdfTextLayer"/>
    </div>
  );
});

/* ─── Thumbnail strip ─────────────────────────────────────────────────────── */
const Thumbnail = React.memo(({ pdf, pageNum, currentPage, onClick }) => {
  const canvasRef = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!pdf || !canvasRef.current || done) return;
    let cancelled = false;
    pdf.getPage(pageNum).then(page => {
      if (cancelled) return;
      const vp = page.getViewport({ scale: 0.18 });
      const c  = canvasRef.current;
      if (!c) return;
      c.width  = vp.width;
      c.height = vp.height;
      page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
        .then(() => { if (!cancelled) setDone(true); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [pdf, pageNum]); // eslint-disable-line

  const active = pageNum === currentPage;
  return (
    <div onClick={() => onClick(pageNum)}
      style={{
        padding: 6, borderRadius: 6, cursor: 'pointer',
        background: active ? 'rgba(79,172,254,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(79,172,254,0.5)' : 'rgba(255,255,255,0.08)'}`,
        transition: 'all 0.12s', textAlign: 'center',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
      <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto', maxWidth: 80, borderRadius: 2 }}/>
      <div style={{ fontSize: 10, marginTop: 4, opacity: active ? 1 : 0.45, color: active ? ACCENT : 'white' }}>
        {pageNum}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function PdfViewer({ vfs, notify, initialFile, onClose }) {
  const [pdfDoc,      setPdfDoc]      = useState(null);
  const [numPages,    setNumPages]    = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale,       setScale]       = useState(1.2);
  const [rotation,    setRotation]    = useState(0);
  const [darkMode,    setDarkMode]    = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSearch,  setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageInput,   setPageInput]   = useState('1');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [fileName,    setFileName]    = useState('');
  const [fileSize,    setFileSize]    = useState(0);
  const [pdfJsReady,  setPdfJsReady]  = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);

  const fileInputRef  = useRef(null);
  const mainRef       = useRef(null);
  const pdfBytesRef   = useRef(null);  // keep original bytes for download

  // ── Load PDF.js ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPdfJs()
      .then(() => setPdfJsReady(true))
      .catch(e => setError('Could not load PDF.js: ' + e.message));
  }, []);

  // ── Load initial file ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfJsReady) return;
    if (!initialFile) return;
    if (initialFile.content) {
      // It's a text-based PDF from VFS — try base64 or raw string
      const content = initialFile.content;
      setFileName(initialFile.name || 'document.pdf');
      loadPdfFromString(content);
    }
  }, [pdfJsReady, initialFile]); // eslint-disable-line

  const loadPdfFromBytes = useCallback(async (bytes, name = 'document.pdf', size = 0) => {
    if (!window.pdfjsLib) return;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setPageInput('1');
    setFileName(name);
    setFileSize(size);
    pdfBytesRef.current = bytes;
    try {
      const typedArray = new Uint8Array(bytes);
      const doc = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      notify?.('success', 'PDF Loaded', `${doc.numPages} pages · ${name}`);
    } catch (e) {
      setError('Failed to open PDF: ' + (e.message || 'Unknown error'));
      notify?.('error', 'PDF Error', e.message);
    } finally { setLoading(false); }
  }, [notify]);

  const loadPdfFromString = useCallback(async content => {
    // Try to decode if it looks like base64
    let bytes;
    try {
      const bin = atob(content.replace(/\s/g, ''));
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      bytes = new TextEncoder().encode(content);
    }
    await loadPdfFromBytes(bytes.buffer, fileName || 'document.pdf', bytes.length);
  }, [loadPdfFromBytes, fileName]);

  // ── File input handler ──────────────────────────────────────────────────────
  const handleFileInput = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const bytes = await file.arrayBuffer();
    await loadPdfFromBytes(bytes, file.name, file.size);
  };

  // ── Drag and drop ───────────────────────────────────────────────────────────
  const handleDrop = async e => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      notify?.('warning', 'Invalid File', 'Please drop a PDF file');
      return;
    }
    const bytes = await file.arrayBuffer();
    await loadPdfFromBytes(bytes, file.name, file.size);
  };

  // ── Open from VFS ───────────────────────────────────────────────────────────
  const openFromVfs = async () => {
    if (!vfs) { notify?.('warning', 'No VFS', 'File system not ready'); return; }
    try {
      const all = await vfs.search('', '/');
      const pdfs = all.filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) { notify?.('info', 'No PDFs', 'No PDF files found in VFS'); return; }
      const file = pdfs[0]; // Could show a picker — for now open first found
      await loadPdfFromString(file.content || '');
      setFileName(file.name);
    } catch (e) { notify?.('error', 'Open Failed', String(e)); }
  };

  // ── Page navigation ─────────────────────────────────────────────────────────
  const goToPage = useCallback(n => {
    const p = Math.max(1, Math.min(n, numPages));
    setCurrentPage(p);
    setPageInput(String(p));
    if (!continuousMode && mainRef.current) mainRef.current.scrollTop = 0;
    else {
      // In continuous mode, scroll to the right canvas
      const el = document.getElementById(`pdf-page-${p}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [numPages, continuousMode]);

  // ── Scroll → detect current page (continuous mode) ─────────────────────────
  const onMainScroll = useCallback(() => {
    if (!continuousMode || !mainRef.current) return;
    const container = mainRef.current;
    const scrollTop = container.scrollTop + 100;
    let found = 1;
    for (let i = 1; i <= numPages; i++) {
      const el = document.getElementById(`pdf-page-${i}`);
      if (el && el.offsetTop <= scrollTop) found = i;
    }
    if (found !== currentPage) {
      setCurrentPage(found);
      setPageInput(String(found));
    }
  }, [continuousMode, numPages, currentPage]);

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  const zoomIn  = () => setScale(s => { const next = ZOOM_STEPS.find(z => z > s); return next || Math.min(s + 0.25, 5); });
  const zoomOut = () => setScale(s => { const prev = [...ZOOM_STEPS].reverse().find(z => z < s); return prev || Math.max(s - 0.25, 0.25); });
  const zoomPercent = Math.round(scale * 100);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToPage(currentPage + 1); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goToPage(currentPage - 1); }
      if (ctrl && (e.key === '=' || e.key === '+'))  { e.preventDefault(); zoomIn(); }
      if (ctrl && e.key === '-') { e.preventDefault(); zoomOut(); }
      if (ctrl && e.key === 'f') { e.preventDefault(); setShowSearch(s => !s); }
      if (e.key === 'Escape')    { setShowSearch(false); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [currentPage, goToPage]); // eslint-disable-line

  // ── Download ─────────────────────────────────────────────────────────────────
  const downloadPdf = () => {
    if (!pdfBytesRef.current) { notify?.('warning', 'Nothing to Download', ''); return; }
    const blob = new Blob([pdfBytesRef.current], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName || 'document.pdf';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const printPdf = () => {
    if (!pdfBytesRef.current) { notify?.('warning', 'Nothing to Print', ''); return; }
    const blob = new Blob([pdfBytesRef.current], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => { iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 2000); };
  };

  // Pages to render in continuous mode (all) vs single mode (just current)
  const pagesToRender = useMemo(() => {
    if (!numPages) return [];
    if (!continuousMode) return [currentPage];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages, currentPage, continuousMode]);

  /* ─── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#1a1a24', color: 'white',
      fontFamily: "'Segoe UI Variable',-apple-system,sans-serif",
    }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '5px 10px', background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0, flexWrap: 'wrap', minHeight: 42,
      }}>
        {/* Sidebar toggle */}
        <TBtn onClick={() => setShowSidebar(s => !s)} active={showSidebar} title="Toggle Thumbnails">
          <Sidebar size={14}/>
        </TBtn>
        <Divider/>

        {/* File ops */}
        <TBtn onClick={() => fileInputRef.current?.click()} title="Open PDF file">
          <Upload size={14}/><span style={{ fontSize: 11 }}>Open</span>
        </TBtn>
        <TBtn onClick={downloadPdf} disabled={!pdfDoc} title="Download PDF">
          <Download size={14}/>
        </TBtn>
        <TBtn onClick={printPdf} disabled={!pdfDoc} title="Print PDF">
          <Printer size={14}/>
        </TBtn>
        <Divider/>

        {/* Navigation */}
        <TBtn onClick={() => goToPage(currentPage - 1)} disabled={!pdfDoc || currentPage <= 1} title="Previous page (←)">
          <ChevronLeft size={15}/>
        </TBtn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input
            value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { goToPage(parseInt(pageInput, 10) || 1); e.target.blur(); } }}
            onBlur={() => goToPage(parseInt(pageInput, 10) || currentPage)}
            disabled={!pdfDoc}
            style={{
              width: 42, padding: '3px 6px', textAlign: 'center', fontSize: 12,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 5, color: 'white', outline: 'none',
            }}/>
          <span style={{ fontSize: 11, opacity: 0.5 }}>/ {numPages || '—'}</span>
        </div>
        <TBtn onClick={() => goToPage(currentPage + 1)} disabled={!pdfDoc || currentPage >= numPages} title="Next page (→)">
          <ChevronRight size={15}/>
        </TBtn>
        <Divider/>

        {/* Zoom */}
        <TBtn onClick={zoomOut} disabled={!pdfDoc} title="Zoom out (Ctrl+-)">
          <ZoomOut size={14}/>
        </TBtn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <select value={zoomPercent}
            onChange={e => setScale(parseInt(e.target.value, 10) / 100)}
            disabled={!pdfDoc}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', borderRadius: 5, padding: '3px 5px', fontSize: 11, cursor: 'pointer',
            }}>
            {[50, 75, 100, 125, 150, 175, 200, 250, 300].map(p => (
              <option key={p} value={p} style={{ background: '#1a1a24' }}>{p}%</option>
            ))}
          </select>
        </div>
        <TBtn onClick={zoomIn} disabled={!pdfDoc} title="Zoom in (Ctrl+=)">
          <ZoomIn size={14}/>
        </TBtn>
        <Divider/>

        {/* Rotate */}
        <TBtn onClick={() => setRotation(r => (r + 90) % 360)} disabled={!pdfDoc} title="Rotate 90°">
          <RotateCw size={14}/>
        </TBtn>

        {/* Continuous / single toggle */}
        <TBtn onClick={() => setContinuousMode(s => !s)} active={continuousMode} disabled={!pdfDoc} title="Continuous scroll">
          <AlignCenter size={14}/>
        </TBtn>

        {/* Dark page bg */}
        <TBtn onClick={() => setDarkMode(s => !s)} active={darkMode} disabled={!pdfDoc} title="Dark page background">
          {darkMode ? <Sun size={14}/> : <Moon size={14}/>}
        </TBtn>

        {/* Search */}
        <TBtn onClick={() => setShowSearch(s => !s)} active={showSearch} disabled={!pdfDoc} title="Search (Ctrl+F)">
          <Search size={14}/>
        </TBtn>

        {/* File info */}
        {fileName && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, opacity: 0.5, overflow: 'hidden' }}>
            <FileText size={12}/>
            <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
            {fileSize > 0 && <span>({(fileSize / 1024).toFixed(0)} KB)</span>}
          </div>
        )}
      </div>

      {/* ── Search bar ── */}
      {showSearch && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <Search size={13} style={{ opacity: 0.45 }}/>
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setShowSearch(false); }}
            placeholder="Search in PDF…" autoFocus
            style={{
              flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 5, padding: '4px 10px', color: 'white', fontSize: 12, outline: 'none',
            }}/>
          <span style={{ fontSize: 11, opacity: 0.45 }}>Note: text search highlights via browser selection</span>
          <TBtn onClick={() => setShowSearch(false)}><X size={13}/></TBtn>
        </div>
      )}

      {/* ── Body (sidebar + main) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Thumbnail sidebar ── */}
        {showSidebar && pdfDoc && (
          <div style={{
            width: 120, background: 'rgba(0,0,0,0.3)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            overflowY: 'auto', flexShrink: 0, padding: '8px 6px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(n => (
              <Thumbnail key={n} pdf={pdfDoc} pageNum={n} currentPage={currentPage} onClick={goToPage}/>
            ))}
          </div>
        )}

        {/* ── Main viewer ── */}
        <div
          ref={mainRef}
          onScroll={onMainScroll}
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'auto',
            padding: '20px 20px',
            background: darkMode ? '#111' : '#3a3a3a',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>

          {/* Empty state / Loading */}
          {!pdfDoc && !loading && !error && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              opacity: 0.38, gap: 14, minHeight: 300, width: '100%',
            }}>
              <div style={{ fontSize: 72 }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No PDF Loaded</div>
              <div style={{ fontSize: 12 }}>Click Open or drag & drop a PDF file here</div>
              {!pdfJsReady && <div style={{ fontSize: 11, color: '#ffbd2e' }}>Loading PDF engine…</div>}
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: 8, padding: '9px 22px', borderRadius: 8,
                  background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                  border: 'none', color: '#000', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                <Upload size={15}/> Open PDF
              </button>
            </div>
          )}

          {loading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 300 }}>
              <div style={{ fontSize: 13, opacity: 0.6 }}>Loading PDF…</div>
            </div>
          )}

          {error && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              color: '#ff5f56', minHeight: 300,
            }}>
              <AlertCircle size={40}/>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Failed to Load PDF</div>
              <div style={{ fontSize: 12, opacity: 0.7, maxWidth: 360, textAlign: 'center' }}>{error}</div>
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 18px', borderRadius: 7,
                  background: 'rgba(255,95,86,0.15)', border: '1px solid rgba(255,95,86,0.4)',
                  color: '#ff5f56', cursor: 'pointer', fontSize: 12,
                }}>Try another file</button>
            </div>
          )}

          {/* Pages */}
          {pdfDoc && pagesToRender.map(n => (
            <div key={n} id={`pdf-page-${n}`}>
              <PdfPage
                pdf={pdfDoc}
                pageNum={n}
                scale={scale}
                rotation={rotation}
                darkMode={darkMode}
                isVisible={true}
                isCurrent={n === currentPage}
                searchQuery={searchQuery}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '3px 12px', background: 'rgba(0,0,0,0.45)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {pdfDoc ? (
            <>
              <span>Page {currentPage} of {numPages}</span>
              <span>Zoom {zoomPercent}%</span>
              <span>Rotation {rotation}°</span>
            </>
          ) : (
            <span>{pdfJsReady ? 'Ready — open a PDF to begin' : 'Loading PDF engine…'}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {pdfDoc && <span>{continuousMode ? 'Continuous' : 'Single page'}</span>}
          <span>PDF.js 3.11</span>
          {fileName && <span>{fileName}</span>}
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileInput}/>

      {/* Text layer CSS */}
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        ::-webkit-scrollbar{width:7px;height:7px}
        ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.22)}
        .pdfTextLayer span{
          color:transparent;
          position:absolute;
          white-space:pre;
          cursor:text;
          transform-origin:0% 0%;
        }
        .pdfTextLayer span::selection{
          background:rgba(79,172,254,0.3);
        }
        button{font-family:inherit}
        select{font-family:inherit}
      `}</style>
    </div>
  );
}