import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  VolumeX,
  Volume1,
  Volume2,
  Maximize,
  Settings,
} from "lucide-react";

type Props = {
  url?: string;
  openingStart?: string | number | null;
  openingEnd?: string | number | null;
  endingStart?: string | number | null;
  endingEnd?: string | number | null;
  autoPlayNext?: boolean;
  proxyPrefix?: string; // optional proxy prefix
  hasNextEpisode?: boolean;
  onSkipToNextEpisode?: () => void;
};

function parseTimeMaybe(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  const s = String(value).trim();
  if (s === "") return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p))) return null;
    let seconds = 0;
    if (parts.length >= 1) seconds += parts[parts.length - 1];
    if (parts.length >= 2) seconds += parts[parts.length - 2] * 60;
    if (parts.length >= 3) seconds += parts[parts.length - 3] * 3600;
    return seconds;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function OpeningVideoPlayer({
  url,
  openingStart,
  openingEnd,
  endingStart,
  endingEnd,
  autoPlayNext = true,
  proxyPrefix,

}: Props): JSX.Element {
  // parse segment times
  const openStart = parseTimeMaybe(openingStart);
  const openEnd = parseTimeMaybe(openingEnd);
  const endStart = parseTimeMaybe(endingStart);
  const endEnd = parseTimeMaybe(endingEnd);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const volumeRef = useRef<HTMLInputElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // states
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"opening" | "ending">("opening");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0); // percent inside current segment 0..100
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);
  const [volumeTooltipLeft, setVolumeTooltipLeft] = useState<number | null>(null);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [progressTooltipLeft, setProgressTooltipLeft] = useState<number | null>(null);
  const [progressTooltipTime, setProgressTooltipTime] = useState("");
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [qualities, setQualities] = useState<number[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number | "auto" | null>("auto");

  const pendingSeekRef = useRef<number | null>(null);
  const tooltipTimeout = useRef<number | null>(null);
  const hideTimeout = useRef<number | null>(null);

  // derived for current segment
  const curStart = mode === "opening" ? openStart : endStart;
  const curEnd = mode === "opening" ? openEnd : endEnd;
  const curSegLen = curStart !== null && curEnd !== null ? curEnd - curStart : 0;

  // validate inputs
  useEffect(() => {
    setError(null);
    if (!url) {
      setError("Ошибка: не указан URL видео.");
      return;
    }
    if (openStart === null || openEnd === null || !(openStart < openEnd)) {
      setError("Ошибка: неверно заданы времена опенинга.");
      return;
    }
    if (endStart === null || endEnd === null || !(endStart < endEnd)) {
      setError("Ошибка: неверно заданы времена эндинга.");
      return;
    }
  }, [url, openStart, openEnd, endStart, endEnd]);

  // Init HLS / native source and set to segment start on metadata
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // cleanup previous
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }

    if (!url) return;

    const isHls = /\.m3u8($|\?)/i.test(url);
    const loadUrl = proxyPrefix ? `${proxyPrefix}${encodeURIComponent(url)}` : url;

    if (isHls) {
      const hls = new Hls({ backBufferLength: 30 });
      hlsRef.current = hls;

      const onManifest = (_evt: any, data: any) => {
        try {
          const heights: number[] = (data?.levels || []).map((l: any) => Number(l.height)).filter((h: number) => !isNaN(h) && h > 0);
          const uniq = Array.from(new Set(heights)).sort((a, b) => a - b);
          setQualities(uniq);
          setCurrentQuality(uniq.length ? "auto" : null);
        } catch {
          setQualities([]);
          setCurrentQuality(null);
        }
      };

      const onError = (_evt: any, data: any) => {
        try { if (data?.fatal) hls.recoverMediaError(); } catch (err) { console.error(err); }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, onManifest);
      hls.on(Hls.Events.ERROR, onError);
      hls.attachMedia(v);
      hls.loadSource(loadUrl);
    } else {
      v.src = loadUrl;
    }

    const onLoadedMeta = () => {
      // enforce starting inside the configured segment
      if (curStart !== null && curEnd !== null) {
        try {
          if (v.currentTime < curStart || v.currentTime >= curEnd) v.currentTime = curStart;
        } catch {}
      }
      // consume pending seek if any
      if (pendingSeekRef.current !== null) {
        const t = pendingSeekRef.current; pendingSeekRef.current = null;
        try { v.currentTime = t; } catch {}
      }
      setProgressPct(0);
    };

    v.addEventListener("loadedmetadata", onLoadedMeta);

    return () => {
      try { if (hlsRef.current) hlsRef.current.destroy(); } catch {}
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      if (hlsRef.current) hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // timeupdate handler - enforce clamp to segment and update percent inside segment
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      if (curStart === null || curEnd === null) return;
      // clamp left side
      if (v.currentTime < curStart) {
        try { v.currentTime = curStart; } catch {}
        return;
      }
      // reached or passed segment end
      if (v.currentTime >= curEnd) {
        v.pause();
        setIsPlaying(false);
        // autoPlayNext behaviour: if we were playing opening and allowed to auto-play next
        if (autoPlayNext && mode === "opening") {
          setMode("ending");
          try { v.currentTime = endStart ?? v.currentTime; v.play().catch(() => {}); setIsPlaying(true); } catch {}
          return;
        }
        setProgressPct(100);
        return;
      }

      // update percent inside current segment (0..100)
      const pct = ((v.currentTime - curStart) / (curEnd - curStart)) * 100;
      setProgressPct(Math.max(0, Math.min(100, pct)));
      setCurrentTime(v.currentTime);
    };

    const onSeeking = () => {
      if (curStart === null || curEnd === null) return;
      if (v.currentTime < curStart) try { v.currentTime = curStart; } catch {}
      else if (v.currentTime > curEnd) try { v.currentTime = curEnd; } catch {}
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [curStart, curEnd, mode, autoPlayNext, endStart]);

  // play/pause that respects current segment
  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v || curStart === null || curEnd === null) return;
    if (v.paused) {
      try { if (v.currentTime < curStart || v.currentTime >= curEnd) v.currentTime = curStart; } catch {}
      try { await v.play(); setIsPlaying(true); } catch {}
    } else {
      v.pause(); setIsPlaying(false);
    }
  };



  // Seeking inside segment via percent 0..100
  const handleSeekPct = (pct: number) => {
    const v = videoRef.current; if (!v || curStart === null || curEnd === null) return;
    const t = curStart + ((curEnd - curStart) * (pct / 100));
    try { v.currentTime = t; } catch { pendingSeekRef.current = t; }
    setProgressPct(pct);
  };

  // Volume / mute
  const toggleMute = () => {
    const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); if (v.muted) setVolume(0); else setVolume(Math.max(0.05, volume));
  };
  const setVol = (val: number) => { const v = videoRef.current; if (!v) return; const vv = Math.max(0, Math.min(1, val)); v.volume = vv; setVolume(vv); setMuted(vv === 0); };

  // keyboard controls (with russian layout helpers)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current; if (!v) return;
      if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
      let key = e.key.toLowerCase();
      if (key === "а") key = "f"; // russian a -> f
      if (key === "ь") key = "m"; // russian ь -> m
      switch (key) {
        case "arrowright": {
          // seek +10s but clamp to segment
          const delta = 10; const target = Math.min(curEnd ?? Infinity, v.currentTime + delta);
          try { v.currentTime = Math.min(target, curEnd ?? target); } catch {}
          break;
        }
        case "arrowleft": {
          const delta = 10; const target = Math.max(curStart ?? 0, v.currentTime - delta);
          try { v.currentTime = Math.max(target, curStart ?? 0); } catch {}
          break;
        }
        case "arrowup": setVol(Math.min(1, volume + 0.05)); e.preventDefault(); break;
        case "arrowdown": setVol(Math.max(0, volume - 0.05)); e.preventDefault(); break;
        case "f": toggleFullscreen(); break;
        case "m": if (muted || volume === 0) setVol(1); else setVol(0); break;
        case " ": e.preventDefault(); togglePlay(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [volume, muted, curStart, curEnd, volume]);

  // progress tooltip helpers (segment-relative times)
  const updateProgressTooltipFromClientX = (clientX: number) => {
    if (!progressRef.current || !containerRef.current || curStart === null || curEnd === null) return;
    const rect = progressRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    let x = clientX - rect.left; x = Math.max(0, Math.min(rect.width, x));
    const hoverPct = (x / rect.width) * 100;
    const hoverTimeAbsolute = curStart + (hoverPct / 100) * (curEnd - curStart);
    const hoverTimeSeg = hoverTimeAbsolute - curStart; // relative to segment start
    setProgressTooltipLeft(x + rect.left - containerRect.left);
    setProgressTooltipTime(`${formatTime(hoverTimeSeg)} / ${formatTime(curEnd - curStart)}`);
    setShowProgressTooltip(true);
  };

  const handlePointerDownOnProgress = (e: React.PointerEvent<HTMLInputElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingProgress(true);
    updateProgressTooltipFromClientX(e.clientX);
    const onWindowUp = () => { setIsDraggingProgress(false); setTimeout(() => setShowProgressTooltip(false), 300); window.removeEventListener("pointerup", onWindowUp); };
    window.addEventListener("pointerup", onWindowUp);
  };
  const handlePointerMoveOnProgress = (e: React.PointerEvent<HTMLInputElement>) => updateProgressTooltipFromClientX(e.clientX);
  const handlePointerLeaveProgress = () => { if (!isDraggingProgress) setShowProgressTooltip(false); };

  // volume tooltip position helper
  const setVideoVolume = (v: number, showTip = true) => {
    const vv = Math.min(1, Math.max(0, v)); setVol(vv);
    if (showTip) {
      setShowVolumeTooltip(true); if (tooltipTimeout.current) window.clearTimeout(tooltipTimeout.current); tooltipTimeout.current = window.setTimeout(() => setShowVolumeTooltip(false), 800);
    }
    if (volumeRef.current && containerRef.current) {
      const s = volumeRef.current; const rect = s.getBoundingClientRect(); const percent = vv; const x = rect.left + percent * rect.width; const c = containerRef.current.getBoundingClientRect(); setVolumeTooltipLeft(x - c.left);
    }
  };

  // quality switching
  const changeQuality = (height: number | "auto") => { const hls = hlsRef.current; if (!hls) return; if (height === "auto") { hls.currentLevel = -1; setCurrentQuality("auto"); return; } const idx = hls.levels.findIndex((l: any) => l.height === height); if (idx >= 0) { hls.currentLevel = idx; setCurrentQuality(height); } };

  const renderVolumeIcon = () => { if (muted || volume === 0) return <VolumeX size={22} />; if (volume < 0.8) return <Volume1 size={22} />; return <Volume2 size={22} />; };

  const toggleFullscreen = async () => { if (!containerRef.current) return; try { if (!document.fullscreenElement) { await containerRef.current.requestFullscreen(); setIsFullscreen(true); } else { await document.exitFullscreen(); setIsFullscreen(false); } } catch {} };

  // hide controls timer
  useEffect(() => {
    const resetTimer = () => { setShowControls(true); if (hideTimeout.current) window.clearTimeout(hideTimeout.current); hideTimeout.current = window.setTimeout(() => setShowControls(false), isFullscreen ? 2000 : 1500); };
    const container = containerRef.current; if (!container) return; container.addEventListener("mousemove", resetTimer); container.addEventListener("touchstart", resetTimer); resetTimer(); return () => { container.removeEventListener("mousemove", resetTimer); container.removeEventListener("touchstart", resetTimer); if (hideTimeout.current) window.clearTimeout(hideTimeout.current); };
  }, [isFullscreen]);

  // apply playbackRate
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackRate; }, [playbackRate]);

  // double-click behaviour: left -5s, right +5s, center - fullscreen
  const handleDoubleClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = (e.currentTarget as HTMLVideoElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      try { (videoRef.current as HTMLVideoElement).currentTime = Math.max(curStart ?? 0, (videoRef.current as HTMLVideoElement).currentTime - 5); } catch {}
    } else if (x > (rect.width / 3) * 2) {
      try { (videoRef.current as HTMLVideoElement).currentTime = Math.min(curEnd ?? Infinity, (videoRef.current as HTMLVideoElement).currentTime + 5); } catch {}
    } else {
      toggleFullscreen();
    }
  };

  // single toggle-mode button (switch segment and jump to its start, do NOT auto-play)
  const toggleModeButton = () => {
    const newMode = mode === "opening" ? "ending" : "opening";
    setMode(newMode);
    const v = videoRef.current;
    const newStart = newMode === "opening" ? openStart : endStart;
    if (!v || newStart === null) return;
    try {
      v.currentTime = newStart;
      v.pause();
      setIsPlaying(false);
      setProgressPct(0);
    } catch {}
  };

  return (
    <div ref={containerRef} className={`relative bg-black rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${isFullscreen ? "w-screen h-screen" : "w-full max-w-3xl aspect-video"}`}>
      <video ref={videoRef} playsInline className="absolute top-0 left-0 w-full h-full object-contain cursor-pointer" onClick={togglePlay} onDoubleClick={handleDoubleClick} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />

      {/* volume tooltip */}
      {showVolumeTooltip && volumeTooltipLeft !== null && (
        <div style={{ left: volumeTooltipLeft }} className="absolute bottom-20 transform -translate-x-1/2 bg-white/90 text-black px-2 py-1 text-sm rounded shadow-md pointer-events-none">{Math.round(volume * 100)}%</div>
      )}

      {/* progress tooltip */}
      {showProgressTooltip && progressTooltipLeft !== null && (
        <div style={{ left: progressTooltipLeft }} className="absolute bottom-[85px] transform -translate-x-1/2 bg-white/90 text-black px-2 py-1 text-sm rounded shadow-md pointer-events-none z-50">{progressTooltipTime}</div>
      )}

      {/* controls overlay */}
      <div className={`absolute bottom-0 left-0 w-full px-4 pb-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="relative">
          <input ref={progressRef} type="range" min={0} max={100} step={0.1} value={progressPct} onChange={(e) => handleSeekPct(Number(e.target.value))} onPointerDown={handlePointerDownOnProgress} onPointerMove={handlePointerMoveOnProgress} onPointerUp={() => { setTimeout(() => { if (!isDraggingProgress) setShowProgressTooltip(false); }, 300); }} onMouseMove={(e) => { if (!isDraggingProgress) updateProgressTooltipFromClientX(e.clientX); }} onMouseLeave={handlePointerLeaveProgress} className="w-full accent-white cursor-pointer drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]" />
        </div>

        <div className="flex items-center justify-between text-white mt-2">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2 hover:text-white/80 transition">{isPlaying ? <Pause size={22} /> : <Play size={22} />}</button>
            <button onClick={() => toggleMute()} className="p-2 hover:text-white/80 transition">{renderVolumeIcon()}</button>

            <input ref={volumeRef} type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => setVideoVolume(parseFloat(e.target.value))} className="w-28 accent-white drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]" />
          </div>

          <div className="flex items-center gap-3 relative">
            <span className="text-sm text-gray-300">{formatTime(Math.max(0, currentTime - (curStart ?? 0)))} / {formatTime(curSegLen)}</span>

            <div className="relative">
              <button onClick={() => setShowSettings((s) => !s)} className="p-2 hover:text-white/80 transition"><Settings size={20} /></button>
              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-black/90 text-white rounded-lg p-3 w-44 text-sm space-y-2 z-50 shadow-lg">
                  <div>
                    <p className="text-gray-400 mb-1">Скорость</p>
                    {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                      <button key={r} onClick={() => setPlaybackRate(r)} className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${playbackRate === r ? "text-white font-medium" : ""}`}>{r}x</button>
                    ))}
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Качество</p>
                    <button onClick={() => changeQuality("auto")} className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${currentQuality === "auto" ? "text-white font-medium" : ""}`}>Auto</button>
                    {qualities.map((q) => (
                      <button key={q} onClick={() => changeQuality(q)} className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${currentQuality === q ? "text-white font-medium" : ""}`}>{q}p</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="p-2 hover:text-white/80 transition"><Maximize size={20} /></button>
          </div>
        </div>
      </div>

      {/* top left: label */}
      <div className="absolute top-3 left-3 text-white">
        <div className="text-sm font-semibold">{mode === "opening" ? "Opening" : "Ending"}</div>
        {curStart !== null && curEnd !== null && <div className="text-xs text-gray-300">{`${formatTime(curStart)} → ${formatTime(curEnd)} (${formatTime(curSegLen)})`}</div>}
      </div>

      {/* top-right quick actions (hidden with controls) */}
      <div className={`absolute top-3 right-3 flex gap-2 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button onClick={() => { if (curStart !== null) { try { (videoRef.current as HTMLVideoElement).currentTime = curStart; } catch {} (videoRef.current as HTMLVideoElement).play().catch(() => {}); setMode(mode); setIsPlaying(true); } }} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Play {mode === "opening" ? "Opening" : "Ending"}</button>
        <button onClick={toggleModeButton} className="px-3 py-1 rounded bg-gray-700 text-white text-sm">{mode === "opening" ? "Показать Ending" : "Показать Opening"}</button>
      </div>

      {/* small center status */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-300">{error ?? ""}</div>

    </div>
  );
}
