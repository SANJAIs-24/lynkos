/**
 * ImageViewer.jsx — LynkOS Image Viewer v4.0
 * =============================================
 * Features:
 *   • Open image from local file (drag & drop OR picker) or VFS
 *   • Gallery mode — browse all images in VFS or opened folder
 *   • Pan (click+drag), Zoom (scroll wheel, pinch, Ctrl+= / Ctrl+-)
 *   • Fit-to-window / actual-size / fill-window modes
 *   • Rotate 90° CW/CCW, Flip horizontal/vertical
 *   • Brightness / Contrast / Saturation / Blur CSS filters
 *   • Fullscreen toggle
 *   • Slideshow (auto-advance, configurable speed)
 *   • Image info panel (name, dimensions, size, type)
 *   • Keyboard navigation (←→ gallery, +/- zoom, R rotate)
 *   • Download image
 *   • Copy image to clipboard (navigator.clipboard)
 *   • Thumbnail strip at the bottom for gallery
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RotateCcw,
  Maximize, Minimize, Download, Upload, FolderOpen, Info, X,
  Play, Pause, FlipHorizontal, FlipVertical, Sliders,
  Copy, Grid, Image as ImageIcon, RefreshCw, Sun,
  Crop, AlignCenter,
} from 'lucide-react';

const ACCENT  = '#4facfe';
const ACCENT2 = '#00f2fe';

const IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','svg','bmp','ico','avif'];

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB';
const clamp   = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* ─── Toolbar button ──────────────────────────────────────────────────────── */
const TBtn = ({ onClick, title, active, disabled, children, danger }) => (
  <button onClick={onClick} title={title} disabled={disabled}
    style={{
      background: active ? 'rgba(79,172,254,0.2)' : 'transparent',
      border: `1px solid ${active ? 'rgba(79,172,254,0.4)' : 'transparent'}`,
      color: disabled ? 'rgba(255,255,255,0.2)' : danger ? '#ff5f56' : active ? ACCENT : 'rgba(255,255,255,0.72)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '4px 7px', borderRadius: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      fontSize: 12, transition: 'all 0.12s', flexShrink: 0,
    }}
    onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
    {children}
  </button>
);
const Div = () => <div style={{ width:1, height:18, background:'rgba(255,255,255,0.1)', margin:'0 3px', flexShrink:0 }}/>;

/* ─── Slider row for filter panel ─────────────────────────────────────────── */
const FilterSlider = ({ label, value, min, max, step = 1, unit = '', onChange, onReset }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, opacity:0.65, marginBottom:4 }}>
      <span>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'monospace' }}>{value}{unit}</span>
        <span style={{ cursor:'pointer', opacity:0.5, fontSize:10 }} onClick={onReset}>↺</span>
      </div>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width:'100%', accentColor: ACCENT }}/>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ImageViewer({ vfs, notify, initialFile, onClose }) {
  // Image data
  const [images,       setImages]       = useState([]);    // gallery array { name, src, size }
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [imgError,     setImgError]     = useState(false);

  // Transform
  const [zoom,         setZoom]         = useState(1);
  const [panX,         setPanX]         = useState(0);
  const [panY,         setPanY]         = useState(0);
  const [rotation,     setRotation]     = useState(0);
  const [flipH,        setFlipH]        = useState(false);
  const [flipV,        setFlipV]        = useState(false);

  // Filters
  const [showFilters,  setShowFilters]  = useState(false);
  const [brightness,   setBrightness]   = useState(100);
  const [contrast,     setContrast]     = useState(100);
  const [saturation,   setSaturation]   = useState(100);
  const [blur,         setBlur]         = useState(0);
  const [invert,       setInvert]       = useState(false);
  const [grayscale,    setGrayscale]    = useState(false);
  const [sepia,        setSepia]        = useState(false);

  // UI state
  const [showInfo,     setShowInfo]     = useState(false);
  const [showThumbbar, setShowThumbbar] = useState(true);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [slideshowOn,  setSlideshowOn]  = useState(false);
  const [slideshowMs,  setSlideshowMs]  = useState(3000);
  const [fitMode,      setFitMode]      = useState('fit'); // 'fit' | 'actual' | 'fill'
  const [imgDims,      setImgDims]      = useState({ w:0, h:0 });

  const containerRef  = useRef(null);
  const imgRef        = useRef(null);
  const isPanning     = useRef(false);
  const panStart      = useRef({ x:0, y:0 });
  const fileInputRef  = useRef(null);
  const slideshowRef  = useRef(null);

  const currentImage = images[currentIdx] || null;

  // ── Load initial file ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialFile) return;
    const src  = initialFile.src || dataUriFromContent(initialFile.content, initialFile.name);
    const name = initialFile.name || 'image';
    const size = initialFile.size || 0;
    setImages([{ name, src, size, path: initialFile.path }]);
    setCurrentIdx(0);
    resetTransform();
  }, [initialFile]); // eslint-disable-line

  const dataUriFromContent = (content, name) => {
    if (!content) return '';
    const ext = (name||'').split('.').pop().toLowerCase();
    const mime = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml', bmp:'image/bmp' }[ext] || 'image/png';
    if (content.startsWith('data:')) return content;
    return `data:${mime};base64,${content}`;
  };

  // ── Open local files ────────────────────────────────────────────────────────
  const handleFileInput = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const imgs = await Promise.all(files.map(f => new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res({ name: f.name, src: ev.target.result, size: f.size, path: null });
      reader.readAsDataURL(f);
    })));
    setImages(imgs);
    setCurrentIdx(0);
    resetTransform();
  };

  const handleDrop = async e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return IMAGE_EXTS.includes(ext);
    });
    if (!files.length) { notify?.('warning', 'No images', 'Drop image files here'); return; }
    const imgs = await Promise.all(files.map(f => new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res({ name: f.name, src: ev.target.result, size: f.size, path: null });
      reader.readAsDataURL(f);
    })));
    setImages(imgs);
    setCurrentIdx(0);
    resetTransform();
  };

  // ── Load from VFS ───────────────────────────────────────────────────────────
  const openFromVfs = async () => {
    if (!vfs) return;
    try {
      const all  = await vfs.search('', '/');
      const imgs = all.filter(f => f.type === 'file' && IMAGE_EXTS.includes(f.name.split('.').pop().toLowerCase()));
      if (!imgs.length) { notify?.('info', 'No Images', 'No image files found in VFS'); return; }
      const mapped = imgs.map(f => ({
        name: f.name, size: f.size || 0, path: f.path,
        src: dataUriFromContent(f.content || '', f.name),
      }));
      setImages(mapped);
      setCurrentIdx(0);
      resetTransform();
      notify?.('success', 'Gallery Loaded', `${mapped.length} image(s) from VFS`);
    } catch (e) { notify?.('error', 'Load Failed', String(e)); }
  };

  // ── Transform helpers ───────────────────────────────────────────────────────
  const resetTransform = () => {
    setZoom(1); setPanX(0); setPanY(0);
    setRotation(0); setFlipH(false); setFlipV(false);
    setFitMode('fit');
  };

  const resetFilters = () => {
    setBrightness(100); setContrast(100); setSaturation(100);
    setBlur(0); setInvert(false); setGrayscale(false); setSepia(false);
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goTo = useCallback(idx => {
    const n = (idx + images.length) % images.length;
    setCurrentIdx(n);
    setImgError(false);
    resetTransform();
  }, [images.length]);

  const prev = () => goTo(currentIdx - 1);
  const next = () => goTo(currentIdx + 1);

  // ── Slideshow ───────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(slideshowRef.current);
    if (slideshowOn && images.length > 1) {
      slideshowRef.current = setInterval(() => setCurrentIdx(i => (i + 1) % images.length), slideshowMs);
    }
    return () => clearInterval(slideshowRef.current);
  }, [slideshowOn, slideshowMs, images.length]);

  // ── Pan (mouse drag) ────────────────────────────────────────────────────────
  const onMouseDown = e => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current  = { x: e.clientX - panX, y: e.clientY - panY };
    e.currentTarget.style.cursor = 'grabbing';
  };
  const onMouseMove = e => {
    if (!isPanning.current) return;
    setPanX(e.clientX - panStart.current.x);
    setPanY(e.clientY - panStart.current.y);
  };
  const onMouseUp = e => {
    isPanning.current = false;
    if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
  };

  // ── Scroll to zoom ──────────────────────────────────────────────────────────
  const onWheel = e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => clamp(z + delta, 0.1, 10));
    setFitMode('custom');
  };

  // ── Fit modes ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !imgDims.w) return;
    const c = containerRef.current;
    const cw = c.clientWidth - 40;
    const ch = c.clientHeight - 40;
    if (fitMode === 'fit') {
      const z = Math.min(cw / imgDims.w, ch / imgDims.h, 1);
      setZoom(z); setPanX(0); setPanY(0);
    } else if (fitMode === 'fill') {
      const z = Math.max(cw / imgDims.w, ch / imgDims.h);
      setZoom(z); setPanX(0); setPanY(0);
    } else if (fitMode === 'actual') {
      setZoom(1); setPanX(0); setPanY(0);
    }
  }, [fitMode, imgDims]);

  const onImgLoad = e => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setImgDims({ w, h });
    setImgError(false);
    // auto fit on load
    if (containerRef.current) {
      const c  = containerRef.current;
      const cw = c.clientWidth  - 40;
      const ch = c.clientHeight - 40;
      setZoom(Math.min(cw / w, ch / h, 1));
    }
  };

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
      if (e.key === 'r' || e.key === 'R') setRotation(r => (r + 90) % 360);
      if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(z => clamp(z + 0.15, 0.1, 10)); setFitMode('custom'); }
      if (ctrl && e.key === '-')  { e.preventDefault(); setZoom(z => clamp(z - 0.15, 0.1, 10)); setFitMode('custom'); }
      if (e.key === '0' && ctrl)  { e.preventDefault(); setFitMode('fit'); }
      if (e.key === 'f')          { setFullscreen(s => !s); }
      if (e.key === 'i')          { setShowInfo(s => !s); }
      if (e.key === ' ')          { e.preventDefault(); setSlideshowOn(s => !s); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }); // eslint-disable-line

  // ── Download ─────────────────────────────────────────────────────────────────
  const downloadImage = () => {
    if (!currentImage) return;
    const a = document.createElement('a');
    a.href = currentImage.src;
    a.download = currentImage.name;
    a.click();
  };

  // ── Copy to clipboard ────────────────────────────────────────────────────────
  const copyImage = async () => {
    if (!currentImage) return;
    try {
      const res  = await fetch(currentImage.src);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      notify?.('success', 'Copied', 'Image copied to clipboard');
    } catch (e) { notify?.('warning', 'Copy Failed', 'Clipboard API not available'); }
  };

  // ── CSS filter string ─────────────────────────────────────────────────────────
  const filterStyle = useMemo(() => {
    const parts = [];
    if (brightness !== 100)  parts.push(`brightness(${brightness}%)`);
    if (contrast   !== 100)  parts.push(`contrast(${contrast}%)`);
    if (saturation !== 100)  parts.push(`saturate(${saturation}%)`);
    if (blur       > 0)      parts.push(`blur(${blur}px)`);
    if (grayscale)           parts.push('grayscale(1)');
    if (sepia)               parts.push('sepia(1)');
    if (invert)              parts.push('invert(1)');
    return parts.join(' ') || 'none';
  }, [brightness, contrast, saturation, blur, grayscale, sepia, invert]);

  const transformStyle = {
    transform: `translate(${panX}px,${panY}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH?-1:1}) scaleY(${flipV?-1:1})`,
    filter: filterStyle,
    transformOrigin: 'center center',
    transition: isPanning.current ? 'none' : 'transform 0.05s',
    maxWidth: 'none', maxHeight: 'none',
    userSelect: 'none', WebkitUserDrag: 'none',
    borderRadius: 2,
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
    display: 'block',
  };

  const hasFilters = brightness!==100||contrast!==100||saturation!==100||blur>0||grayscale||sepia||invert;
  const zoomPct    = Math.round(zoom * 100);

  /* ─── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#111118', color: 'white',
      fontFamily: "'Segoe UI Variable',-apple-system,sans-serif",
      position: 'relative',
    }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '5px 8px', background: 'rgba(0,0,0,0.45)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0, flexWrap: 'wrap', minHeight: 42,
      }}>
        {/* File ops */}
        <TBtn onClick={() => fileInputRef.current?.click()} title="Open image(s)">
          <Upload size={14}/><span style={{ fontSize:11 }}>Open</span>
        </TBtn>
        <TBtn onClick={openFromVfs} title="Browse VFS images">
          <FolderOpen size={14}/>
        </TBtn>
        <TBtn onClick={downloadImage} disabled={!currentImage} title="Download">
          <Download size={14}/>
        </TBtn>
        <TBtn onClick={copyImage} disabled={!currentImage} title="Copy to clipboard">
          <Copy size={14}/>
        </TBtn>
        <Div/>

        {/* Navigation */}
        <TBtn onClick={prev} disabled={images.length < 2} title="Previous (←)">
          <ChevronLeft size={15}/>
        </TBtn>
        <span style={{ fontSize:12, opacity:0.55, minWidth:50, textAlign:'center' }}>
          {images.length > 0 ? `${currentIdx+1} / ${images.length}` : '—'}
        </span>
        <TBtn onClick={next} disabled={images.length < 2} title="Next (→)">
          <ChevronRight size={15}/>
        </TBtn>
        <Div/>

        {/* Zoom */}
        <TBtn onClick={() => { setZoom(z => clamp(z-0.15,0.1,10)); setFitMode('custom'); }} disabled={!currentImage} title="Zoom out (Ctrl+-)">
          <ZoomOut size={14}/>
        </TBtn>
        <span style={{ fontSize:11, opacity:0.55, minWidth:38, textAlign:'center' }}>{zoomPct}%</span>
        <TBtn onClick={() => { setZoom(z => clamp(z+0.15,0.1,10)); setFitMode('custom'); }} disabled={!currentImage} title="Zoom in (Ctrl+=)">
          <ZoomIn size={14}/>
        </TBtn>
        <Div/>

        {/* Fit modes */}
        {[
          { id:'fit',    label:'Fit',  title:'Fit to window (Ctrl+0)' },
          { id:'actual', label:'1:1',  title:'Actual size' },
          { id:'fill',   label:'Fill', title:'Fill window' },
        ].map(m => (
          <TBtn key={m.id} onClick={() => setFitMode(m.id)} active={fitMode===m.id} disabled={!currentImage} title={m.title}>
            <span style={{ fontSize:10, fontWeight:600 }}>{m.label}</span>
          </TBtn>
        ))}
        <Div/>

        {/* Transform */}
        <TBtn onClick={() => setRotation(r => (r - 90 + 360) % 360)} disabled={!currentImage} title="Rotate CCW">
          <RotateCcw size={14}/>
        </TBtn>
        <TBtn onClick={() => setRotation(r => (r + 90) % 360)} disabled={!currentImage} title="Rotate CW (R)">
          <RotateCw size={14}/>
        </TBtn>
        <TBtn onClick={() => setFlipH(v => !v)} active={flipH} disabled={!currentImage} title="Flip horizontal">
          <FlipHorizontal size={14}/>
        </TBtn>
        <TBtn onClick={() => setFlipV(v => !v)} active={flipV} disabled={!currentImage} title="Flip vertical">
          <FlipVertical size={14}/>
        </TBtn>
        <Div/>

        {/* Filters */}
        <TBtn onClick={() => setShowFilters(s => !s)} active={showFilters || hasFilters} disabled={!currentImage} title="Image filters">
          <Sliders size={14}/>
          {hasFilters && <span style={{ fontSize:9, color:ACCENT }}>●</span>}
        </TBtn>
        <TBtn onClick={resetFilters} disabled={!hasFilters} title="Reset filters" danger>
          <RefreshCw size={13}/>
        </TBtn>
        <Div/>

        {/* Slideshow */}
        <TBtn onClick={() => setSlideshowOn(s => !s)} active={slideshowOn} disabled={images.length < 2} title="Slideshow (Space)">
          {slideshowOn ? <Pause size={14}/> : <Play size={14}/>}
        </TBtn>
        <Div/>

        {/* Panels */}
        <TBtn onClick={() => setShowThumbbar(s => !s)} active={showThumbbar} title="Thumbnail strip">
          <Grid size={14}/>
        </TBtn>
        <TBtn onClick={() => setShowInfo(s => !s)} active={showInfo} disabled={!currentImage} title="Image info (I)">
          <Info size={14}/>
        </TBtn>

        {/* Name */}
        {currentImage && (
          <div style={{ marginLeft:'auto', fontSize:11, opacity:0.5,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
            {currentImage.name}
          </div>
        )}
      </div>

      {/* ── Filters panel ── */}
      {showFilters && currentImage && (
        <div style={{
          padding: '12px 16px', background: 'rgba(0,0,0,0.5)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', gap: 24, flexWrap: 'wrap', flexShrink: 0,
        }}>
          <div style={{ minWidth:180, flex:1 }}>
            <FilterSlider label="Brightness" value={brightness} min={0} max={200} unit="%" onChange={setBrightness} onReset={() => setBrightness(100)}/>
            <FilterSlider label="Contrast"   value={contrast}   min={0} max={200} unit="%" onChange={setContrast}   onReset={() => setContrast(100)}/>
          </div>
          <div style={{ minWidth:180, flex:1 }}>
            <FilterSlider label="Saturation" value={saturation} min={0} max={200} unit="%" onChange={setSaturation} onReset={() => setSaturation(100)}/>
            <FilterSlider label="Blur"       value={blur}       min={0} max={20}  step={0.5} unit="px" onChange={setBlur} onReset={() => setBlur(0)}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
            {[
              { label:'Grayscale', on:grayscale, set:setGrayscale },
              { label:'Sepia',     on:sepia,     set:setSepia },
              { label:'Invert',    on:invert,    set:setInvert },
            ].map(f => (
              <label key={f.label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer' }}>
                <input type="checkbox" checked={f.on} onChange={e => f.set(e.target.checked)}
                  style={{ accentColor: ACCENT }}/>
                {f.label}
              </label>
            ))}
          </div>
          <TBtn onClick={resetFilters} title="Reset all filters" danger>
            <RefreshCw size={13}/><span style={{ fontSize:11 }}>Reset</span>
          </TBtn>
        </div>
      )}

      {/* ── Main view area ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* Canvas / image area */}
        <div
          ref={containerRef}
          style={{
            flex:1, overflow:'hidden', position:'relative',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor: currentImage ? 'grab' : 'default',
            background: '#0a0a0f',
          }}
          onMouseDown={currentImage ? onMouseDown : undefined}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={currentImage ? onWheel : undefined}>

          {/* Checkerboard background (shows for transparent images) */}
          <div style={{
            position:'absolute', inset:0, zIndex:0,
            backgroundImage:'linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)',
            backgroundSize:'20px 20px',
            backgroundPosition:'0 0,0 10px,10px -10px,-10px 0',
            opacity:0.4, pointerEvents:'none',
          }}/>

          {/* Empty state */}
          {!currentImage && (
            <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center', gap:16, opacity:0.4, padding:40, textAlign:'center' }}>
              <div style={{ fontSize:80 }}>🖼️</div>
              <div style={{ fontSize:16, fontWeight:600 }}>No Image Loaded</div>
              <div style={{ fontSize:12 }}>Click Open or drag & drop image files</div>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ marginTop:8, padding:'9px 22px', borderRadius:8,
                  background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                  border:'none', color:'#000', fontWeight:700, fontSize:13, cursor:'pointer',
                  display:'flex', alignItems:'center', gap:8 }}>
                <Upload size={15}/>Open Image
              </button>
            </div>
          )}

          {/* Image */}
          {currentImage && !imgError && (
            <img
              ref={imgRef}
              src={currentImage.src}
              alt={currentImage.name}
              onLoad={onImgLoad}
              onError={() => setImgError(true)}
              draggable={false}
              style={{ position:'relative', zIndex:1, ...transformStyle }}
            />
          )}

          {imgError && (
            <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column',
              alignItems:'center', gap:12, color:'#ff5f56', padding:30 }}>
              <ImageIcon size={48}/>
              <div style={{ fontSize:14, fontWeight:600 }}>Cannot Display Image</div>
              <div style={{ fontSize:11, opacity:0.7 }}>{currentImage?.name}</div>
            </div>
          )}

          {/* Navigation arrows overlay */}
          {images.length > 1 && (
            <>
              <button onClick={prev} style={{
                position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                zIndex:10, background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.15)',
                color:'white', borderRadius:'50%', width:38, height:38, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(79,172,254,0.4)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.55)'}>
                <ChevronLeft size={18}/>
              </button>
              <button onClick={next} style={{
                position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                zIndex:10, background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.15)',
                color:'white', borderRadius:'50%', width:38, height:38, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(79,172,254,0.4)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.55)'}>
                <ChevronRight size={18}/>
              </button>
            </>
          )}

          {/* Slideshow indicator */}
          {slideshowOn && (
            <div style={{
              position:'absolute', top:10, left:'50%', transform:'translateX(-50%)',
              zIndex:10, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)',
              border:'1px solid rgba(79,172,254,0.4)', borderRadius:20,
              padding:'4px 14px', fontSize:11, color:ACCENT,
              display:'flex', alignItems:'center', gap:6,
            }}>
              <Play size={10} fill={ACCENT}/>
              Slideshow — {slideshowMs/1000}s
            </div>
          )}
        </div>

        {/* ── Info panel ── */}
        {showInfo && currentImage && (
          <div style={{
            width:220, background:'rgba(0,0,0,0.5)',
            borderLeft:'1px solid rgba(255,255,255,0.07)',
            overflowY:'auto', flexShrink:0, padding:14,
          }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:14,
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              Image Info
              <X size={13} style={{ cursor:'pointer', opacity:0.4 }} onClick={() => setShowInfo(false)}/>
            </div>

            {/* Preview thumbnail */}
            <div style={{ marginBottom:14, borderRadius:6, overflow:'hidden',
              border:'1px solid rgba(255,255,255,0.1)', textAlign:'center' }}>
              <img src={currentImage.src} alt="" style={{ maxWidth:'100%', maxHeight:120, objectFit:'contain' }}/>
            </div>

            {[
              ['Name',       currentImage.name],
              ['Width',      imgDims.w ? `${imgDims.w}px` : '—'],
              ['Height',     imgDims.h ? `${imgDims.h}px` : '—'],
              ['Aspect',     imgDims.w && imgDims.h ? `${(imgDims.w/imgDims.h).toFixed(2)}:1` : '—'],
              ['File Size',  currentImage.size ? fmtSize(currentImage.size) : '—'],
              ['Format',     currentImage.name.split('.').pop().toUpperCase()],
              ['Zoom',       `${zoomPct}%`],
              ['Rotation',   `${rotation}°`],
              ['# in Gallery', images.length],
            ].map(([k,v]) => (
              <div key={k} style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, opacity:0.42, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:12, wordBreak:'break-word' }}>{v}</div>
              </div>
            ))}

            {/* Slideshow speed */}
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:10, opacity:0.42, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Slideshow Speed</div>
              <input type="range" min={1000} max={10000} step={500} value={slideshowMs}
                onChange={e => setSlideshowMs(Number(e.target.value))}
                style={{ width:'100%', accentColor: ACCENT }}/>
              <div style={{ fontSize:11, opacity:0.5, textAlign:'center', marginTop:3 }}>{slideshowMs/1000}s per image</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {showThumbbar && images.length > 1 && (
        <div style={{
          height:90, background:'rgba(0,0,0,0.5)',
          borderTop:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', gap:6,
          overflowX:'auto', padding:'6px 10px', flexShrink:0,
        }}>
          {images.map((img, i) => (
            <div key={i} onClick={() => { setCurrentIdx(i); setImgError(false); resetTransform(); }}
              style={{
                width:64, height:64, borderRadius:5, flexShrink:0,
                overflow:'hidden', cursor:'pointer',
                border:`2px solid ${i===currentIdx?ACCENT:'rgba(255,255,255,0.1)'}`,
                boxShadow:i===currentIdx?`0 0 0 2px ${ACCENT}44`:'none',
                transition:'all 0.12s', background:'rgba(0,0,0,0.3)',
              }}>
              <img src={img.src} alt={img.name}
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            </div>
          ))}
        </div>
      )}

      {/* ── Status bar ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'3px 12px', background:'rgba(0,0,0,0.5)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        fontSize:11, color:'rgba(255,255,255,0.38)', flexShrink:0,
      }}>
        <div style={{ display:'flex', gap:14 }}>
          {currentImage ? (
            <>
              <span>{currentImage.name}</span>
              {imgDims.w > 0 && <span>{imgDims.w} × {imgDims.h}px</span>}
              <span>{zoomPct}%</span>
              {rotation !== 0 && <span>{rotation}° rotated</span>}
              {(flipH || flipV) && <span>Flipped</span>}
            </>
          ) : (
            <span>No image — open a file or drag &amp; drop</span>
          )}
        </div>
        <div style={{ display:'flex', gap:12 }}>
          {hasFilters && <span style={{ color:ACCENT }}>Filters active</span>}
          {slideshowOn && <span style={{ color:ACCENT }}>▶ Slideshow</span>}
          <span>{images.length} image{images.length!==1?'s':''}</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleFileInput}/>

      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        ::-webkit-scrollbar{width:7px;height:7px}
        ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.22)}
        button{font-family:inherit}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,0.12);cursor:pointer;border:none;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:${ACCENT};cursor:pointer}
      `}</style>
    </div>
  );
}