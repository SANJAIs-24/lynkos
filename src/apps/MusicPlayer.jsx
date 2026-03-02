import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  List, Music, Disc, Shuffle, Repeat
} from 'lucide-react';

const ACCENT = '#00ff41'; // Matrix Green
const BG_DARK = 'rgba(10, 15, 25, 0.95)';

export default function MusicPlayer({ vfs, notify, initialFile }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);

  const audioRef = useRef(new Audio());
  const progressRef = useRef(null);

  // ─── 1. SAFE VFS SCANNER ───
  useEffect(() => {
    // CRITICAL FIX: Guard against undefined vfs or root
    if (!vfs || !vfs.root || !vfs.root.children) return;

    const audioFiles = [];
    const scan = (nodes) => {
      if (!nodes) return;
      Object.entries(nodes).forEach(([name, node]) => {
        // Check if it's an audio file
        if (node.type === 'file' && /\.(mp3|wav|ogg)$/i.test(name)) {
          audioFiles.push({ name, ...node });
        } 
        // Recursively scan directories
        else if (node.type === 'dir' && node.children) {
          scan(node.children);
        }
      });
    };

    scan(vfs.root.children);
    setPlaylist(audioFiles);

    // Handle "Open With" from Desktop
    if (initialFile && /\.(mp3|wav|ogg)$/i.test(initialFile.name)) {
      playTrack(initialFile);
    }
  }, [vfs, initialFile]);

  // ─── 2. AUDIO LOGIC ───
  const playTrack = (track) => {
    const url = track.content || track.src || track.url;
    if (!url) return notify?.('error', 'Audio System', 'Source data missing');
    
    audioRef.current.src = url;
    audioRef.current.play().catch(err => {
      console.error("Playback failed:", err);
      notify?.('error', 'Playback Blocked', 'Browser requires user interaction first.');
    });
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!currentTrack && playlist.length > 0) return playTrack(playlist[0]);
    if (!currentTrack) return;

    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => nextTrack();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnd);
    audio.volume = volume;

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnd);
    };
  }, [volume, playlist, currentTrack, isShuffle]);

  const nextTrack = () => {
    if (playlist.length === 0) return;
    let nextIdx;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * playlist.length);
    } else {
      const currIdx = playlist.findIndex(t => t.name === currentTrack?.name);
      nextIdx = (currIdx + 1) % playlist.length;
    }
    playTrack(playlist[nextIdx]);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    const currIdx = playlist.findIndex(t => t.name === currentTrack?.name);
    const prevIdx = (currIdx - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIdx]);
  };

  const handleSeek = (e) => {
    if (!duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const fmtTime = (s) => {
    if (isNaN(s) || s === Infinity) return "0:00";
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    return `${m}:${rs < 10 ? '0' : ''}${rs}`;
  };

  // ─── 3. LOADING GUARD UI ───
  if (!vfs || !vfs.root) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f19', color: ACCENT }}>
        <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
          <Disc size={40} className="spin-anim" style={{ marginBottom: 15, opacity: 0.5 }} />
          <div style={{ fontSize: 11, letterSpacing: '2px' }}>MOUNTING_AUDIO_ENGINE...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: BG_DARK, color: '#fff', fontFamily: 'monospace',
      border: '1px solid rgba(0, 255, 65, 0.2)', overflow: 'hidden'
    }}>
      
      {/* Visualizer Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', opacity: 0.05 }}>
          <Disc size={260} className={isPlaying ? 'spin-anim' : ''} style={{ color: ACCENT }} />
        </div>

        {/* Animated Bars */}
        <div style={{ display: 'flex', gap: 4, height: 50, alignItems: 'flex-end', marginBottom: 20, zIndex: 2 }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} className={isPlaying ? 'bar-anim' : ''} style={{
              width: 8, background: ACCENT, borderRadius: '2px',
              animationDelay: `${i * 0.12}s`, height: isPlaying ? '30%' : '10%',
              boxShadow: `0 0 10px ${ACCENT}aa`
            }} />
          ))}
        </div>

        <div style={{ textAlign: 'center', zIndex: 2, padding: '0 20px' }}>
          <div style={{ fontSize: 16, color: ACCENT, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase' }}>
            {currentTrack?.name || "IDLE_SYSTEM"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, letterSpacing: '1px' }}>LYNKOS_MP_CORE_V4</div>
        </div>
      </div>

      {/* Control Section */}
      <div style={{ background: 'rgba(0,0,0,0.6)', padding: '20px', borderTop: '1px solid rgba(0, 255, 65, 0.1)' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
          <span style={{ fontSize: 10, opacity: 0.5, width: 35 }}>{fmtTime(progress)}</span>
          <div 
            ref={progressRef}
            onClick={handleSeek}
            style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
            <div style={{ width: `${(progress / (duration || 1)) * 100}%`, height: '100%', background: ACCENT, borderRadius: 2, boxShadow: `0 0 8px ${ACCENT}` }} />
          </div>
          <span style={{ fontSize: 10, opacity: 0.5, width: 35 }}>{fmtTime(duration)}</span>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <Shuffle 
              size={18} 
              onClick={() => setIsShuffle(!isShuffle)} 
              style={{ cursor: 'pointer', color: isShuffle ? ACCENT : '#fff', opacity: isShuffle ? 1 : 0.3 }} 
            />
            <SkipBack size={22} onClick={prevTrack} style={{ cursor: 'pointer' }} />
            <button 
              onClick={togglePlay}
              style={{ 
                width: 50, height: 50, borderRadius: '50%', border: `1px solid ${ACCENT}`, 
                background: isPlaying ? 'transparent' : ACCENT, 
                color: isPlaying ? ACCENT : '#000', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" style={{ marginLeft: 4 }} />}
            </button>
            <SkipForward size={22} onClick={nextTrack} style={{ cursor: 'pointer' }} />
            <Repeat size={18} style={{ opacity: 0.3, cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Volume2 size={16} style={{ opacity: 0.4 }} />
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ width: 70, accentColor: ACCENT, cursor: 'pointer' }}
            />
            <List 
              size={20} 
              onClick={() => setShowPlaylist(!showPlaylist)} 
              style={{ cursor: 'pointer', color: showPlaylist ? ACCENT : '#fff', marginLeft: 10 }} 
            />
          </div>
        </div>
      </div>

      {/* Playlist Drawer */}
      {showPlaylist && (
        <div style={{ 
          height: 180, background: 'rgba(0,0,0,0.8)', overflowY: 'auto',
          borderTop: '1px solid rgba(0, 255, 65, 0.2)'
        }}>
          {playlist.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', opacity: 0.2, fontSize: 11 }}>
              NO_AUDIO_DATA_FOUND_IN_VFS
            </div>
          ) : (
            playlist.map((track, i) => (
              <div 
                key={i}
                onDoubleClick={() => playTrack(track)}
                style={{
                  padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 15,
                  fontSize: 11, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: currentTrack?.name === track.name ? 'rgba(0, 255, 65, 0.08)' : 'transparent',
                  color: currentTrack?.name === track.name ? ACCENT : '#ccc',
                  transition: 'background 0.2s'
                }}>
                <Music size={14} style={{ opacity: 0.4 }} />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.name}
                </span>
                {currentTrack?.name === track.name && (
                  <div style={{ fontSize: 9, border: `1px solid ${ACCENT}`, padding: '1px 4px', borderRadius: 3 }}>
                    {isPlaying ? 'RUNNING' : 'PAUSED'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-anim { animation: spin 12s linear infinite; }
        @keyframes barGrowth {
          0%, 100% { height: 15%; }
          50% { height: 90%; }
        }
        .bar-anim { animation: barGrowth 0.8s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${ACCENT}; }
      `}</style>
    </div>
  );
}