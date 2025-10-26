// VideoPlayer.tsx
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

interface VideoPlayerProps {
  episodeUrl?: string;
  openingStart?: string;
  openingEnd?: string;
  endingStart?: string;
  endingEnd?: string;
  onSkipEnding: () => void;
  hasNextEpisode: boolean;

  animeSlug?: string;
  animeTitle?: string;
  thumbnail?: string;
  seasonNumber?: number;
  episodeNumber?: number;

  resumeTime?: number;
  resumePaused?: boolean;
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

/* localStorage helpers */
const STORAGE_KEY = "recentlyWatched_v1";
type RecentlyWatchedItem = {
  id: string;
  animeSlug?: string;
  animeTitle?: string;
  thumbnail?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeUrl?: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
};

function readRecentlyWatched(): RecentlyWatchedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyWatchedItem[];
  } catch {
    return [];
  }
}

function writeRecentlyWatched(list: RecentlyWatchedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { }
}

function addOrUpdateRecentlyWatched(item: RecentlyWatchedItem, cap = 8) {
  const list = readRecentlyWatched();
  const filtered = list.filter((i) => i.id !== item.id);
  filtered.unshift(item);
  const sliced = filtered.slice(0, cap);
  writeRecentlyWatched(sliced);
}

/* Component */
export default function VideoPlayer({
  episodeUrl,
  openingStart,
  openingEnd,
  endingStart,
  endingEnd,
  onSkipEnding,
  hasNextEpisode,

  animeSlug,
  animeTitle,
  thumbnail,
  seasonNumber,
  episodeNumber,

  resumeTime,
  resumePaused,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const volumeSliderRef = useRef<HTMLInputElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // UI state
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
  const [currentQuality, setCurrentQuality] = useState<number | "auto" | null>("auto");

  // Skip UI state
  const [showOpeningSkip, setShowOpeningSkip] = useState(false);
  const [showEndingSkip, setShowEndingSkip] = useState(false);
  const [hasSkippedOpening, setHasSkippedOpening] = useState(false);
  const [hasSkippedEnding, setHasSkippedEnding] = useState(false);

  const [progressTooltipTime, setProgressTooltipTime] = useState("");
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  // helpers / refs
  const hideTimeout = useRef<number | null>(null);
  const tooltipTimeout = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null); // если metadata ещё не пришёл
  const resumeShouldPauseRef = useRef<boolean>(false);
  const lastSavedAtRef = useRef<number>(0);
  const seekRetryRef = useRef<number | null>(null);
  const savedNextRef = useRef<boolean>(false); // флаг: уже записали следующую серию

  // seconds
  const openingStartSec = convertTimeToSeconds(openingStart);
  const openingEndSec = convertTimeToSeconds(openingEnd);
  const endingStartSec = convertTimeToSeconds(endingStart);
  const endingEndSec = convertTimeToSeconds(endingEnd);

  const hasOpening =
    openingStartSec !== null &&
    openingEndSec !== null &&
    openingStartSec < openingEndSec;
  const hasEnding =
    endingStartSec !== null &&
    endingEndSec !== null &&
    endingStartSec < endingEndSec;

  const buildId = (s?: number, e?: number) => {
    const sNum = s ?? seasonNumber;
    const eNum = e ?? episodeNumber;
    if (!animeSlug || sNum == null || eNum == null) return null;
    return `${animeSlug}|s${sNum}|e${eNum}`;
  };

  // -----------------------
  // Init HLS
  // -----------------------
  useEffect(() => {
    if (!episodeUrl || !videoRef.current) return;
    const video = videoRef.current;

    // decide initial seek: resumeTime prop > storage value (if any)
    let initialSeek: number | null = null;
    if (resumeTime !== undefined && resumeTime !== null) {
      initialSeek = resumeTime;
      if (resumePaused) resumeShouldPauseRef.current = true;
    } else {
      const id = buildId();
      if (id) {
        const stored = readRecentlyWatched().find((i) => i.id === id);
        if (stored && typeof stored.currentTime === "number" && stored.currentTime > 0) {
          initialSeek = stored.currentTime;
        }
      }
    }
    if (initialSeek !== null) pendingSeekRef.current = initialSeek;

    // destroy previous
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch { }
      hlsRef.current = null;
    }

    const proxiedUrl = `https://anime-1-dv13.onrender.com/${encodeURIComponent(episodeUrl)}`;


    const hls = new Hls({ backBufferLength: Infinity });
    hlsRef.current = hls;

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

    const onError = (_evt: any, data: any) => {
      try {
        if (data?.fatal) {
          console.warn("HLS fatal error, trying recoverMediaError...", data);
          hls.recoverMediaError();
        }
      } catch (err) {
        console.error("HLS error handler failed:", err);
      }
    };

    const updateProgress = () => {
      if (!video.duration || !isFinite(video.duration)) return;
      setProgress((video.currentTime / video.duration) * 100);
      setDuration(video.duration);
      setCurrentTime(video.currentTime);

      const now = Date.now();
      if (now - lastSavedAtRef.current > 5000) {
        lastSavedAtRef.current = now;
        saveProgressToStorage(video.currentTime, video.duration);
      }

      // show opening/ending skip UI as before
      if (hasOpening && !hasSkippedOpening) {
        if (video.currentTime >= openingStartSec! && video.currentTime < openingEndSec!) {
          setShowOpeningSkip(true);
        } else if (video.currentTime >= openingEndSec!) {
          setShowOpeningSkip(false);
          setHasSkippedOpening(true);
        } else {
          setShowOpeningSkip(false);
        }
      } else {
        setShowOpeningSkip(false);
      }

      if (hasEnding && !hasSkippedEnding) {
        if (video.currentTime >= endingStartSec! && video.currentTime < endingEndSec!) {
          setShowEndingSkip(true);
        } else if (video.currentTime >= endingEndSec!) {
          setShowEndingSkip(false);
          setHasSkippedEnding(true);
        } else {
          setShowEndingSkip(false);
        }
      } else {
        setShowEndingSkip(false);
      }

      // === new: если есть следующая серия и осталось <= 60s, — записать следующую серию в storage ===
      if (hasNextEpisode && video.duration && isFinite(video.duration) && !savedNextRef.current) {
        const remaining = video.duration - video.currentTime;
        if (remaining <= 60) {
          // compute next episode number (simple +1)
          if (episodeNumber != null && seasonNumber != null && animeSlug) {
            const nextEp = episodeNumber + 1;
            saveNextEpisodeToStorage(nextEp);
            savedNextRef.current = true;
          }
        }
      }
    };

    // robust seek function: tries immediately and retries until success or timeout
    const applyPendingSeekRobust = (targetSec: number) => {
      if (seekRetryRef.current) {
        window.clearInterval(seekRetryRef.current);
        seekRetryRef.current = null;
      }
      try {
        video.currentTime = Math.min(video.duration || targetSec, Math.max(0, targetSec));
      } catch { }
      if (Math.abs((video.currentTime || 0) - targetSec) < 0.6) {
        return;
      }
      let attempts = 0;
      const maxAttempts = 12;
      seekRetryRef.current = window.setInterval(() => {
        attempts += 1;
        try {
          if (!isNaN(video.duration) && isFinite(video.duration)) {
            video.currentTime = Math.min(video.duration, Math.max(0, targetSec));
          } else {
            video.currentTime = Math.max(0, targetSec);
          }
        } catch { }
        const cur = video.currentTime || 0;
        if (Math.abs(cur - targetSec) < 0.6 || attempts >= maxAttempts) {
          if (seekRetryRef.current) {
            window.clearInterval(seekRetryRef.current);
            seekRetryRef.current = null;
          }
        }
      }, 250) as unknown as number;
    };

    const onLoadedMeta = () => {
      if (pendingSeekRef.current !== null) {
        const t = pendingSeekRef.current;
        pendingSeekRef.current = null;
        applyPendingSeekRobust(t);
        if (resumePaused) resumeShouldPauseRef.current = true;
      }
      updateProgress();
    };

    hls.on(Hls.Events.MANIFEST_PARSED, onManifest);
    hls.on(Hls.Events.ERROR, onError);

    hls.attachMedia(video);
    hls.loadSource(proxiedUrl);

    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("loadedmetadata", onLoadedMeta);

    return () => {
      try {
        hls.off(Hls.Events.MANIFEST_PARSED, onManifest);
        hls.off(Hls.Events.ERROR, onError);
        hls.destroy();
      } catch { }
      video.removeEventListener("timeupdate", updateProgress);
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      if (seekRetryRef.current) {
        window.clearInterval(seekRetryRef.current);
        seekRetryRef.current = null;
      }
      if (hlsRef.current === hls) hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeUrl, openingStartSec, openingEndSec, endingStartSec, endingEndSec, resumeTime, resumePaused]);

  // after seeked - pause if needed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      if (resumeShouldPauseRef.current) {
        video.pause();
        setIsPlaying(false);
        resumeShouldPauseRef.current = false;
      }
    };
    video.addEventListener("seeked", handler);
    return () => video.removeEventListener("seeked", handler);
  }, []);

  // ensure playbackRate applied
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // keep playing after seek if was playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleSeeked = () => {
      if (isPlaying) {
        video.play().catch(() => { });
      }
    };
    video.addEventListener("seeked", handleSeeked);
    return () => video.removeEventListener("seeked", handleSeeked);
  }, [isPlaying]);

  // play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => { });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // volume
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

  // seeking helpers
  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (isNaN(video.duration) || !isFinite(video.duration)) {
      pendingSeekRef.current = seconds;
      try {
        hlsRef.current?.startLoad();
      } catch { }
      return;
    }
    video.currentTime = Math.min(video.duration, Math.max(0, seconds));
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video || isNaN(video.duration) || !isFinite(video.duration)) return;
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + seconds));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    seekTo(newTime);
    setProgress(parseFloat(e.target.value));
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const left = (parseFloat(e.target.value) / 100) * rect.width;
      setProgressTooltipLeft(left);
      setProgressTooltipTime(`${formatTime(newTime)} / ${formatTime(duration)}`);
      setShowProgressTooltip(true);
    }
  };

  // tooltip helpers
  const updateProgressTooltipFromClientX = (clientX: number) => {
    if (!progressRef.current || !containerRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const hoverProgress = (x / rect.width) * 100;
    const hoverTime = duration > 0 ? (hoverProgress / 100) * duration : 0;
    const leftRelativeToContainer = x + rect.left - containerRect.left;
    setProgressTooltipLeft(leftRelativeToContainer);
    setProgressTooltipTime(`${formatTime(hoverTime)} / ${formatTime(duration)}`);
    setShowProgressTooltip(true);
  };

  const handlePointerDownOnProgress = (e: React.PointerEvent<HTMLInputElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingProgress(true);
    updateProgressTooltipFromClientX(e.clientX);

    const onWindowPointerUp = (_ev: PointerEvent) => {
      setIsDraggingProgress(false);
      setTimeout(() => setShowProgressTooltip(false), 300);
      window.removeEventListener("pointerup", onWindowPointerUp);
    };
    window.addEventListener("pointerup", onWindowPointerUp);
  };

  const handlePointerMoveOnProgress = (e: React.PointerEvent<HTMLInputElement>) => {
    updateProgressTooltipFromClientX(e.clientX);
  };

  const handlePointerLeaveProgress = () => {
    if (!isDraggingProgress) setShowProgressTooltip(false);
  };

  // skip handlers
  const handleSkipOpening = () => {
    const video = videoRef.current;
    if (!video || openingEndSec === null) return;
    const wasPlaying = !video.paused;
    seekTo(openingEndSec);
    if (wasPlaying) video.play().catch(() => { });
    setShowOpeningSkip(false);
    setHasSkippedOpening(true);
  };

  const handleSkipEnding = () => {
    const video = videoRef.current;
    if (hasNextEpisode) {
      // перед навигацией — сохраним следующую серию в storage (если еще не записали)
      if (!savedNextRef.current && episodeNumber != null) {
        saveNextEpisodeToStorage(episodeNumber + 1);
        savedNextRef.current = true;
      }
      onSkipEnding();
      return;
    }
    if (!video || endingEndSec === null) return;
    const wasPlaying = !video.paused;
    seekTo(endingEndSec);
    if (wasPlaying) video.play().catch(() => { });
    setShowEndingSkip(false);
    setHasSkippedEnding(true);
  };

  // quality switching
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

  // keyboard controls
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
  }, [volume, isMuted, isPlaying]);

  // hide controls timer
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

  // double click (seek small)
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

  /* Save progress */
  const saveProgressToStorage = (curTime: number, dur: number | null | undefined) => {
    const id = buildId();
    if (!id) return;
    const videoDur =
      dur && dur > 0 ? dur : (videoRef.current && isFinite(videoRef.current.duration) ? videoRef.current.duration : 0);
    const safeCur = Math.max(0, Math.min(videoDur > 0 ? videoDur : Number.MAX_SAFE_INTEGER, curTime || 0));
    const item: RecentlyWatchedItem = {
      id,
      animeSlug,
      animeTitle,
      thumbnail,
      seasonNumber,
      episodeNumber,
      episodeUrl,
      currentTime: safeCur,
      duration: videoDur || 0,
      updatedAt: Date.now(),
    };
    addOrUpdateRecentlyWatched(item, 8);
  };

  // save on unload/unmount
  useEffect(() => {
    const onBeforeUnload = () => {
      const video = videoRef.current;
      if (!video) return;
      saveProgressToStorage(video.currentTime, isFinite(video.duration) ? video.duration : 0);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      const video = videoRef.current;
      if (video) {
        saveProgressToStorage(video.currentTime, isFinite(video.duration) ? video.duration : 0);
      }
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeSlug, seasonNumber, episodeNumber, animeTitle, thumbnail]);

  // save on pause/ended
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPause = () => saveProgressToStorage(video.currentTime, isFinite(video.duration) ? video.duration : 0);
    const onEnded = () => saveProgressToStorage(video.currentTime, isFinite(video.duration) ? video.duration : 0);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [animeSlug, seasonNumber, episodeNumber]);

  /* Save next episode to storage (new) */
  const saveNextEpisodeToStorage = (nextEpisodeNum: number) => {
    if (!animeSlug || seasonNumber == null || nextEpisodeNum == null) return;
    const videoDur = videoRef.current && isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
    // Desired start time for next episode — попробуем взять endingStart (текущий) или fallback duration-10
    const endingStartForSave = endingStartSec ?? Math.max(0, (videoDur > 0 ? videoDur - 10 : 0));
    const nextId = buildId(seasonNumber, nextEpisodeNum);
    if (!nextId) return;
    const item: RecentlyWatchedItem = {
      id: nextId,
      animeSlug,
      animeTitle,
      thumbnail,
      seasonNumber,
      episodeNumber: nextEpisodeNum,
      episodeUrl: undefined,
      currentTime: Math.max(0, endingStartForSave || 0),
      duration: 0, // unknown for next episode, will update later when user opens it
      updatedAt: Date.now(),
    };
    addOrUpdateRecentlyWatched(item, 8);
  };

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
          className="absolute bottom-[85px] transform -translate-x-1/2 bg-white/90 text-black px-2 py-1 text-sm rounded shadow-md pointer-events-none z-50"
        >
          {progressTooltipTime}
        </div>
      )}

      {showOpeningSkip && (
        <button
          onClick={handleSkipOpening}
          className="absolute bottom-20 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-opacity duration-300 opacity-100"
        >
          Пропустить опенинг
        </button>
      )}

      {showEndingSkip && (
        <button
          onClick={handleSkipEnding}
          className="absolute bottom-20 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-opacity duration-300 opacity-100"
        >
          {hasNextEpisode ? "Следующая серия" : "Пропустить эндинг"}
        </button>
      )}

      <div
        className={`absolute bottom-0 left-0 w-full px-3 pb-2 sm:px-4 sm:pb-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"
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
            onPointerDown={handlePointerDownOnProgress}
            onPointerMove={handlePointerMoveOnProgress}
            onPointerUp={() => {
              setTimeout(() => {
                if (!isDraggingProgress) setShowProgressTooltip(false);
              }, 300);
            }}
            onMouseMove={(e) => {
              if (!isDraggingProgress) {
                updateProgressTooltipFromClientX(e.clientX);
              }
            }}
            onMouseLeave={handlePointerLeaveProgress}
            className="w-full accent-white cursor-pointer drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
          />
        </div>

        {/* === Контролы адаптивные === */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between text-white mt-2 gap-2 sm:gap-3">
          {/* Левая часть */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
            <button onClick={togglePlay} className="p-2 hover:text-white/80 transition">
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
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
              className="w-20 sm:w-28 accent-white drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]"
            />
          </div>

          {/* Правая часть */}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 text-sm">
            <span className="text-xs sm:text-sm text-gray-300 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="relative">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="p-2 hover:text-white/80 transition"
              >
                <Settings size={18} />
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-black/90 text-white rounded-lg p-3 w-40 text-sm space-y-2 z-50 shadow-lg">
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
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
