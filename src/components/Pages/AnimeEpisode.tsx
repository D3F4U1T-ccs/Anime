import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Hls from "hls.js";
import VideoPlayer from "./VideoPlayer";

interface Episode {
  number: number;
  url: string;
}

interface Season {
  seasonNumber: number;
  episodes: Episode[];
}

interface Anime {
  _id: string;
  nameRu: string;
  description: string;
  slug: string;
  thumbnail: string;
  rating: number;
  seasons: Season[];
}

export default function AnimeEpisode() {
  const { slug, seasonNumber, episodeNumber } = useParams<{
    slug: string;
    seasonNumber: string;
    episodeNumber: string;
  }>();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodeUrl, setEpisodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // 🔹 Получение данных эпизода
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/anime/${slug}/season-${seasonNumber}/episode-${episodeNumber}`
        );
        if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!data?.anime) {
          setAnime(null);
          setEpisodeUrl(null);
        } else {
          setAnime(data.anime);
          const season = data.anime.seasons.find(
            (s: Season) => s.seasonNumber === Number(seasonNumber)
          );
          const episode = season?.episodes.find(
            (e: Episode) => e.number === Number(episodeNumber)
          );
          setEpisodeUrl(episode?.url || null);
        }
      } catch (err) {
        console.error("Ошибка при загрузке эпизода:", err);
        setErrorMsg("Не удалось загрузить данные эпизода.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [slug, seasonNumber, episodeNumber]);

  // 🔹 Инициализация плеера
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cleanUp = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.onerror = null;
      video.oncanplay = null;
    };

    cleanUp();

    if (!episodeUrl) return;

    video.crossOrigin = "anonymous";
    const lower = episodeUrl.trim().toLowerCase();
    const isM3u8 = lower.endsWith(".m3u8");
    const isTs = lower.endsWith(".ts");
    const isMp4 = lower.endsWith(".mp4");

    try {
      if (isM3u8) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(episodeUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data?.fatal) {
              console.error("HLS fatal error:", data);
              setErrorMsg("Ошибка HLS-потока. Попробуйте обновить страницу.");
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = episodeUrl;
        } else {
          setErrorMsg("Ваш браузер не поддерживает HLS.");
        }
      } else if (isMp4 || isTs) {
        video.src = episodeUrl;
      } else {
        // неизвестное расширение
        video.src = episodeUrl;
      }

      video.onerror = () => {
        const err = video.error;
        console.error("Video error:", err);
        let msg = "Ошибка воспроизведения.";
        if (err) {
          switch (err.code) {
            case err.MEDIA_ERR_ABORTED:
              msg = "Воспроизведение прервано.";
              break;
            case err.MEDIA_ERR_NETWORK:
              msg = "Сетевая ошибка при загрузке видео.";
              break;
            case err.MEDIA_ERR_DECODE:
              msg = "Ошибка декодирования (формат не поддерживается).";
              break;
            case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
              msg = "Источник видео не поддерживается.";
              break;
          }
        }
        setErrorMsg(msg);
      };
    } catch (e) {
      console.error("Ошибка при инициализации видео:", e);
      setErrorMsg("Ошибка инициализации видео.");
    }

    return () => cleanUp();
  }, [episodeUrl]);

  if (loading)
    return <div className="text-center mt-10 text-gray-400">Загрузка...</div>;
  if (!anime)
    return <div className="text-center mt-10 text-red-400">Аниме не найдено</div>;

  const currentSeason = anime.seasons.find(
    (s) => s.seasonNumber === Number(seasonNumber)
  );

  return (
    <div className="max-w-5xl mx-auto mt-[100px] text-white p-4">
      <h1 className="text-3xl font-bold mb-3">{anime.nameRu}</h1>
      <p className="text-gray-400 mb-6">{anime.description}</p>

      {/* 🎬 Плеер */}
      {episodeUrl ? (

        <VideoPlayer  episodeUrl={episodeUrl || undefined} />
      ) : (
        <div className="text-center text-gray-400 mt-10">
          Эпизод не найден или не имеет ссылки.
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 text-sm text-yellow-300">{errorMsg}</div>
      )}


      {/* 📜 Список серий */}
      {currentSeason && (
        <div className="flex flex-wrap gap-2 mt-6">
          {currentSeason.episodes.map((ep) => (
            <Link
              key={ep.number}
              to={`/anime/${slug}/season/${seasonNumber}/episode/${ep.number}`}
              className={`px-4 py-2 rounded-lg border transition-all ${ep.number === Number(episodeNumber)
                ? "bg-blue-600 border-blue-600"
                : "border-gray-600 hover:bg-gray-700"
                }`}
            >
              Серия {ep.number}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
