import { useEffect, useRef, useState } from "react";
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

interface VideoPlayerProps {
  episodeUrl?: string;
}

export default function VideoPlayer({ episodeUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const volumeSliderRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1); // 0..2 (visual up to 200%)
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [qualities, setQualities] = useState<number[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number | "auto" | null>(
    "auto"
  );

  const hideTimeout = useRef<number | null>(null);
  const tooltipTimeout = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // -----------------------
  // HLS init + qualities
  // -----------------------
  useEffect(() => {
    if (!episodeUrl || !videoRef.current) return;
    const video = videoRef.current;
    const proxiedUrl = `http://localhost:5000/proxy?url=${encodeURIComponent(
      episodeUrl
    )}`;

    // destroy previous
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    const hls = new Hls();
    hlsRef.current = hls;
    hls.loadSource(proxiedUrl);
    hls.attachMedia(video);

    // get levels (filter out 0 heights and duplicates)
  const onManifest = (_event: unknown, data: any) => {
  try {
    const heights: number[] = (data?.levels || [])
      .map((l: any) => Number(l.height))
      .filter((h: number) => !isNaN(h) && h > 0);

    const uniq = Array.from(new Set(heights)).sort((a, b) => a - b);
    setQualities(uniq);
    setCurrentQuality(uniq.length ? "auto" : null);
  } catch {
    setQualities([]);
    setCurrentQuality(null);
  }
};


    hls.on(Hls.Events.MANIFEST_PARSED, onManifest);

    const updateProgress = () => {
      if (!video.duration || !isFinite(video.duration)) return;
      setProgress((video.currentTime / video.duration) * 100);
      setDuration(video.duration);
    };

    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("loadedmetadata", updateProgress);

    // cleanup
    return () => {
      try {
        hls.off(Hls.Events.MANIFEST_PARSED, onManifest);
        hls.destroy();
      } catch {}
      video.removeEventListener("timeupdate", updateProgress);
      video.removeEventListener("loadedmetadata", updateProgress);
    };
  }, [episodeUrl]);

  // -----------------------
  // apply playbackRate to video element
  // -----------------------
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // -----------------------
  // play/pause
  // -----------------------
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // -----------------------
  // volume (visual up to 2.0)
  // actual HTMLMediaElement.volume goes up to 1.0
  // -----------------------
  const setVideoVolume = (v: number, showTip = true) => {
    const newVol = Math.min(2, Math.max(0, +v));
    setVolume(newVol);
    if (showTip) {
      setShowTooltip(true);
      if (tooltipTimeout.current) window.clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = window.setTimeout(() => setShowTooltip(false), 800);
    }

    if (videoRef.current) {
      // video element volume max is 1. We reflect >1 visually (gain would be needed to actually increase).
      videoRef.current.volume = Math.min(1, newVol);
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }

    // tooltip positioning: compute based on slider geometry
    if (volumeSliderRef.current) {
      const s = volumeSliderRef.current;
      const rect = s.getBoundingClientRect();
      const percent = Math.min(1, Math.max(0, (newVol / 2))); // slider range 0..2
      const x = rect.left + percent * rect.width;
      // position relative to containerRef
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        setTooltipLeft(x - containerRect.left);
      } else {
        setTooltipLeft(x);
      }
    }
  };

  // mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
    if (videoRef.current.muted) setVolume(0);
    else setVideoVolume(Math.max(0.05, volume), false);
  };

  // -----------------------
  // seek
  // -----------------------
  const seekBy = (seconds: number) => {
    if (!videoRef.current || !isFinite(videoRef.current.duration)) return;
    const video = videoRef.current;
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + seconds));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = newTime;
    setProgress(parseFloat(e.target.value));
  };

  // -----------------------
  // fullscreen toggle
  // -----------------------
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // -----------------------
  // keyboard shortcuts
  // -----------------------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      // prevent page scroll on volume arrows
      if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();

      switch (e.key.toLowerCase()) {
        case "arrowright":
          seekBy(10);
          break;
        case "arrowleft":
          seekBy(-10);
          break;
        case "arrowup":
          setVideoVolume(volume + 0.05);
          break;
        case "arrowdown":
          setVideoVolume(volume - 0.05);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          toggleMute();
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [volume]);

  // -----------------------
  // hide controls on inactivity
  // -----------------------
  useEffect(() => {
    const resetTimer = () => {
      setShowControls(true);
      if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
      hideTimeout.current = window.setTimeout(() => {
        setShowControls(false);
      }, isFullscreen ? 2000 : 1500);
    };

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousemove", resetTimer);
    // also show controls on touchstart
    container.addEventListener("touchstart", resetTimer);

    resetTimer();

    return () => {
      container.removeEventListener("mousemove", resetTimer);
      container.removeEventListener("touchstart", resetTimer);
      if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
    };
  }, [isFullscreen]);

  // -----------------------
  // double click areas
  // -----------------------
  const handleDoubleClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) seekBy(-5);
    else if (x > (rect.width / 3) * 2) seekBy(5);
    else toggleFullscreen();
  };

  // -----------------------
  // volume icon helper
  // -----------------------
  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={22} />;
    if (volume < 0.8) return <Volume1 size={22} />;
    return <Volume2 size={22} />;
  };

  // -----------------------
  // change quality (auto | specific height)
  // -----------------------
  const changeQuality = (height: number | "auto") => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (height === "auto") {
      hls.currentLevel = -1; // auto
      setCurrentQuality("auto");
      return;
    }
    // find index for that height (first match)
    const idx = hls.levels.findIndex((l: any) => l.height === height);
    if (idx >= 0) {
      hls.currentLevel = idx;
      setCurrentQuality(height);
    }
  };

  // -----------------------
  // render
  // -----------------------
  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
        isFullscreen ? "w-screen h-screen" : "w-full max-w-[1000px] aspect-video"
      }`}
    >
      <video
        ref={videoRef}
        playsInline
        className="absolute top-0 left-0 w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={handleDoubleClick}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Tooltip громкости (позиционируется над слайдером) */}
      {showTooltip && tooltipLeft !== null && (
        <div
          style={{ left: tooltipLeft }}
          className="absolute bottom-20 transform -translate-x-1/2 bg-black/85 text-white px-2 py-1 text-sm rounded pointer-events-none"
        >
          {Math.round(volume * 100)}%
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 w-full px-4 pb-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* progress */}
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          step="0.1"
          onChange={handleSeek}
          className="w-full accent-yellow-400 cursor-pointer"
        />

        <div className="flex items-center justify-between text-white mt-2">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2 hover:text-yellow-400 transition">
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>

            <button onClick={toggleMute} className="p-2 hover:text-yellow-400 transition">
              {renderVolumeIcon()}
            </button>

            <input
              ref={volumeSliderRef}
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
              className="w-28 accent-yellow-400"
            />
          </div>

          <div className="flex items-center gap-3 relative">
            {/* settings visible in both modes now */}
            <div className="relative">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="p-2 hover:text-yellow-400 transition"
              >
                <Settings size={20} />
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-black/90 text-white rounded-lg p-3 w-44 text-sm space-y-2 z-50">
                  <div>
                    <p className="text-gray-400 mb-1">Скорость</p>
                    {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                      <button
                        key={r}
                        onClick={() => setPlaybackRate(r)}
                        className={`block w-full text-left px-2 py-1 rounded hover:bg-yellow-400/20 ${
                          playbackRate === r ? "text-yellow-400" : ""
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-gray-400 mb-1">Качество</p>
                    <button
                      onClick={() => changeQuality("auto")}
                      className={`block w-full text-left px-2 py-1 rounded hover:bg-yellow-400/20 ${
                        currentQuality === "auto" ? "text-yellow-400" : ""
                      }`}
                    >
                      Auto
                    </button>
                    {qualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => changeQuality(q)}
                        className={`block w-full text-left px-2 py-1 rounded hover:bg-yellow-400/20 ${
                          currentQuality === q ? "text-yellow-400" : ""
                        }`}
                      >
                        {q}p
                      </button>
                    ))}
                    {qualities.length === 0 && (
                      <div className="text-gray-500 text-sm px-2">Нет уровней</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="p-2 hover:text-yellow-400 transition">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
