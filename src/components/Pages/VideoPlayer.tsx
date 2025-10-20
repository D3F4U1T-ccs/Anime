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
  openingStart?: string;
  openingEnd?: string;
  endingStart?: string;
  endingEnd?: string;
  onSkipEnding: () => void;
  hasNextEpisode: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function convertTimeToSeconds(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

export default function VideoPlayer({
  episodeUrl,
  openingStart,
  openingEnd,
  endingStart,
  endingEnd,
  onSkipEnding,
  hasNextEpisode,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const volumeSliderRef = useRef<HTMLInputElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [volumeTooltipLeft, setVolumeTooltipLeft] = useState<number | null>(null);
  const [progressTooltipLeft, setProgressTooltipLeft] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [qualities, setQualities] = useState<number[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number | "auto" | null>(
    "auto"
  );

  const [showOpeningSkip, setShowOpeningSkip] = useState(false);
  const [showEndingSkip, setShowEndingSkip] = useState(false);
  const [hasSkippedOpening, setHasSkippedOpening] = useState(false);
  const [hasSkippedEnding, setHasSkippedEnding] = useState(false);

  const [progressTooltipTime, setProgressTooltipTime] = useState("");

  const hideTimeout = useRef<number | null>(null);
  const tooltipTimeout = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const openingStartSec = convertTimeToSeconds(openingStart);
  const openingEndSec = convertTimeToSeconds(openingEnd);
  const endingStartSec = convertTimeToSeconds(endingStart);
  const endingEndSec = convertTimeToSeconds(endingEnd);

  const hasOpening = openingStartSec !== null && openingEndSec !== null && openingStartSec < openingEndSec;
  const hasEnding = endingStartSec !== null && endingEndSec !== null && endingStartSec < endingEndSec;

  // -----------------------
  // HLS init + qualities
  // -----------------------
  useEffect(() => {
    if (!episodeUrl || !videoRef.current) return;
    const video = videoRef.current;
    const proxiedUrl = `http://localhost:5000/proxy?url=${encodeURIComponent(
      episodeUrl
    )}`;

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    const hls = new Hls({
      backBufferLength: Infinity, // Фикс: держать весь буфер для seek без сброса
    });
    hlsRef.current = hls;
    hls.loadSource(proxiedUrl);
    hls.attachMedia(video);

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
      setCurrentTime(video.currentTime);

      if (hasOpening && !hasSkippedOpening) {
        if (video.currentTime >= openingStartSec! && video.currentTime < openingEndSec!) {
          setShowOpeningSkip(true);
        } else if (video.currentTime >= openingEndSec!) {
          setShowOpeningSkip(false);
          setHasSkippedOpening(true);
        }
      }

      if (hasEnding && !hasSkippedEnding) {
        if (video.currentTime >= endingStartSec! && video.currentTime < endingEndSec!) {
          setShowEndingSkip(true);
        } else if (video.currentTime >= endingEndSec!) {
          setShowEndingSkip(false);
          setHasSkippedEnding(true);
        }
      }
    };

    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("loadedmetadata", updateProgress);

    return () => {
      try {
        hls.off(Hls.Events.MANIFEST_PARSED, onManifest);
        hls.destroy();
      } catch {}
      video.removeEventListener("timeupdate", updateProgress);
      video.removeEventListener("loadedmetadata", updateProgress);
    };
  }, [episodeUrl, hasOpening, hasEnding, hasSkippedOpening, hasSkippedEnding, openingStartSec, openingEndSec, endingStartSec, endingEndSec]);

  // -----------------------
  // Listener для seeked event (фикс паузы после seek)
  // -----------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleSeeked = () => {
      if (isPlaying) {
        video.play().catch(console.error);
      }
    };

    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [isPlaying]);

  // -----------------------
  // apply playbackRate
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
  // volume
  // -----------------------
  const setVideoVolume = (v: number, showTip = true) => {
    const newVol = Math.min(2, Math.max(0, +v));
    setVolume(newVol);

    if (showTip) {
      setShowVolumeTooltip(true);
      if (tooltipTimeout.current) window.clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = window.setTimeout(() => setShowVolumeTooltip(false), 800);
    }

    if (videoRef.current) {
      videoRef.current.volume = Math.min(1, newVol);
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }

    if (volumeSliderRef.current && containerRef.current) {
      const s = volumeSliderRef.current;
      const rect = s.getBoundingClientRect();
      const percent = Math.min(1, Math.max(0, newVol / 2));
      const x = rect.left + percent * rect.width;
      const containerRect = containerRef.current.getBoundingClientRect();
      setVolumeTooltipLeft(x - containerRect.left);
    }
  };

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
  // fullscreen
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
  // keyboard controls
  // -----------------------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();

      let key = e.key.toLowerCase();
      if (key === "а") key = "f";
      if (key === "ь") key = "m";

      switch (key) {
        case "arrowright":
          seekBy(10);
          break;
        case "arrowleft":
          seekBy(-10);
          break;
        case "arrowup":
          setVideoVolume(volume + 0.05);
          e.preventDefault();
          break;
        case "arrowdown":
          setVideoVolume(volume - 0.05);
          e.preventDefault();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          if (isMuted || volume === 0) setVideoVolume(1);
          else setVideoVolume(0);
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [volume, isMuted]);

  // -----------------------
  // hide controls
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
    container.addEventListener("touchstart", resetTimer);

    resetTimer();

    return () => {
      container.removeEventListener("mousemove", resetTimer);
      container.removeEventListener("touchstart", resetTimer);
      if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
    };
  }, [isFullscreen]);

  // -----------------------
  // double click
  // -----------------------
  const handleDoubleClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) seekBy(-5);
    else if (x > (rect.width / 3) * 2) seekBy(5);
    else toggleFullscreen();
  };

  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={22} />;
    if (volume < 0.8) return <Volume1 size={22} />;
    return <Volume2 size={22} />;
  };

  const changeQuality = (height: number | "auto") => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (height === "auto") {
      hls.currentLevel = -1;
      setCurrentQuality("auto");
      return;
    }
    const idx = hls.levels.findIndex((l: any) => l.height === height);
    if (idx >= 0) {
      hls.currentLevel = idx;
      setCurrentQuality(height);
    }
  };

  // -----------------------
  // Handlers для skip кнопок (удалил mediaSeeking)
  // -----------------------
  const handleSkipOpening = () => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (video && openingEndSec !== null) {
      const wasPlaying = !video.paused;
      video.currentTime = openingEndSec;
      if (hls) {
        hls.startLoad();
      }
      if (wasPlaying) {
        video.play().catch((err) => console.error("Play after seek failed:", err));
      }
      setShowOpeningSkip(false);
      setHasSkippedOpening(true);
    }
  };

  const handleSkipEnding = () => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (hasNextEpisode) {
      onSkipEnding();
    } else if (video && endingEndSec !== null) {
      const wasPlaying = !video.paused;
      video.currentTime = endingEndSec;
      if (hls) {
        hls.startLoad();
      }
      if (wasPlaying) {
        video.play().catch((err) => console.error("Play after seek failed:", err));
      }
      setShowEndingSkip(false);
      setHasSkippedEnding(true);
    }
  };

  // -----------------------
  // Tooltip для прогресс-бара
  // -----------------------
  const handleProgressHover = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!progressRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hoverProgress = (x / rect.width) * 100;
    const hoverTime = (hoverProgress / 100) * duration;
    setProgressTooltipTime(`${formatTime(hoverTime)} / ${formatTime(duration)}`);
    setProgressTooltipLeft(x);
    setShowProgressTooltip(true);
  };

  const handleProgressLeave = () => {
    setShowProgressTooltip(false);
  };

  // -----------------------
  // render
  // -----------------------
  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${isFullscreen ? "w-screen h-screen" : "w-full max-w-[1000px] aspect-video"
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

      {/* Volume tooltip */}
      {showVolumeTooltip && volumeTooltipLeft !== null && (
        <div
          style={{ left: volumeTooltipLeft }}
          className="absolute bottom-20 transform -translate-x-1/2 bg-white/90 text-black px-2 py-1 text-sm rounded shadow-md pointer-events-none"
        >
          {Math.round(volume * 100)}%
        </div>
      )}

      {/* Progress tooltip */}
      {showProgressTooltip && progressTooltipLeft !== null && (
        <div
          style={{ left: progressTooltipLeft }}
          className="absolute top-[-32px] transform -translate-x-1/2 bg-white/90 text-black px-2 py-1 text-sm rounded shadow-md pointer-events-none z-50"
        >
          {progressTooltipTime}
        </div>
      )}

      {/* Кнопка пропуска опенинга (подняли) */}
      {showOpeningSkip && (
        <button
          onClick={handleSkipOpening}
          className="absolute bottom-20 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-opacity duration-300 opacity-100"
        >
          Пропустить опенинг
        </button>
      )}

      {/* Кнопка пропуска эндинга (подняли) */}
      {showEndingSkip && (
        <button
          onClick={handleSkipEnding}
          className="absolute bottom-20 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-opacity duration-300 opacity-100"
        >
          {hasNextEpisode ? "Следующая серия" : "Пропустить эндинг"}
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 w-full px-4 pb-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        <div className="relative">
          <input
            ref={progressRef}
            type="range"
            min="0"
            max="100"
            value={progress}
            step="0.1"
            onChange={handleSeek}
            onMouseMove={handleProgressHover}
            onMouseLeave={handleProgressLeave}
            className="w-full accent-white cursor-pointer drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
          />
        </div>

        <div className="flex items-center justify-between text-white mt-2">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2 hover:text-white/80 transition">
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>

            <button onClick={toggleMute} className="p-2 hover:text-white/80 transition">
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
              className="w-28 accent-white drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]"
            />
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Дисплей времени */}
            <span className="text-sm text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="relative">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="p-2 hover:text-white/80 transition"
              >
                <Settings size={20} />
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-black/90 text-white rounded-lg p-3 w-44 text-sm space-y-2 z-50 shadow-lg">
                  <div>
                    <p className="text-gray-400 mb-1">Скорость</p>
                    {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                      <button
                        key={r}
                        onClick={() => setPlaybackRate(r)}
                        className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${playbackRate === r ? "text-white font-medium" : ""
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
                      className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${currentQuality === "auto" ? "text-white font-medium" : ""
                        }`}
                    >
                      Auto
                    </button>
                    {qualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => changeQuality(q)}
                        className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${currentQuality === q ? "text-white font-medium" : ""
                          }`}
                      >
                        {q}p
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="p-2 hover:text-white/80 transition">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}