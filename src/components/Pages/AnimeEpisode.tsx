import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import VideoPlayer from "./VideoPlayer";

interface Episode {
  number: number;
  url: string;
  title?: string;
  openingStart?: string;
  openingEnd?: string;
  endingStart?: string;
  endingEnd?: string;
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
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

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
          setEpisode(null);
        } else {
          setAnime(data.anime);
          const season = data.anime.seasons.find(
            (s: Season) => s.seasonNumber === Number(seasonNumber)
          );
          const ep = season?.episodes.find(
            (e: Episode) => e.number === Number(episodeNumber)
          );
          setEpisode(ep || null);
          setEpisodeUrl(ep?.url || null);
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

  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-500 border-solid"></div>
      </div>
    );

  if (!anime)
    return (
      <div className="text-center mt-[200px] text-red-400 text-lg">
        Аниме не найдено 😢
      </div>
    );

  const currentSeason = anime.seasons.find(
    (s) => s.seasonNumber === Number(seasonNumber)
  );

  const totalEpisodes = currentSeason?.episodes.length || 0;
  const currentEp = Number(episodeNumber);

  const prevEpisode =
    currentEp > 1
      ? `/anime/${slug}/season/${seasonNumber}/episode/${currentEp - 1}`
      : null;

  const nextEpisode =
    currentEp < totalEpisodes
      ? `/anime/${slug}/season/${seasonNumber}/episode/${currentEp + 1}`
      : null;

  const handleSkipEnding = () => {
    if (nextEpisode) {
      navigate(nextEpisode);
    } else {
      // Если нет next, seek сделает плеер сам
    }
  };

  return (
    <div className="mt-[80px] md:mt-[100px] w-full flex justify-center">
      <div className="w-full md:max-w-5xl md:px-4 px-0">
        <div className="bg-neutral-900/90 rounded-none md:rounded-2xl p-3 md:p-6 shadow-lg">
          {/* 🔹 Обложка и заголовок */}
          {/* ---- Новый хедер: обложка слева + центрированный заголовок ---- */}
          <div className="w-full bg-neutral-800/60 border border-neutral-700 rounded-md p-4 flex items-center gap-4">
            {/* Левый блок — круглая обложка */}
            <div className="flex-shrink-0 relative">
              <img
                src={anime.thumbnail}
                alt={anime.nameRu}
                className="w-[96px] h-[96px] md:w-[140px] md:h-[140px] rounded-full object-cover shadow-lg border-2 border-neutral-700"
              />
              {/* Если нужен небольшой тег (например возраст/ранг) — добавь тут, иначе удаляй */}
              {/* <div className="absolute -top-2 -left-2 bg-red-600 text-xs text-white px-2 py-0.5 rounded">18+</div> */}
            </div>

            {/* Центр — заголовок и инфо */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-lg md:text-2xl font-semibold text-white">
                {anime.nameRu}
              </h1>
              <p className="text-sm md:text-base text-gray-300 mt-1">
                {/* Показываем номер и название эпизода, если есть */}
                {episode?.title ? `Серия ${episode.number} — ${episode.title}` : `Серия ${episode?.number}`}
              </p>

              {/* Метаданные / теги (жанр, рейтинг, сезон) */}
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-3">
                {/* пример тега */}
                <span className="bg-neutral-700/60 text-xs text-gray-200 px-3 py-1 rounded-md shadow-sm">
                  Сезон {currentSeason?.seasonNumber ?? 1}
                </span>


              </div>
            </div>

            {/* Правый блок — кнопки навигации (на небольших экранах можно скрыть/перенести) */}
            <div className="flex flex-col items-end gap-2">
              <div className="hidden md:flex gap-2">
                <button
                  onClick={() => prevEpisode && navigate(prevEpisode)}
                  disabled={!prevEpisode}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${prevEpisode ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                >
                  ◀ Пред.
                </button>

                <button
                  onClick={() => nextEpisode && navigate(nextEpisode)}
                  disabled={!nextEpisode}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${nextEpisode ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                >
                  След. ▶
                </button>
              </div>

              {/* мобильный маленький лейбл */}
              <div className="md:hidden text-xs text-gray-400">Сезон {currentSeason?.seasonNumber}</div>
            </div>
          </div>
          {/* ---- /Новый хедер ---- */}


          {/* 🎬 Видео */}
          <div className="mt-4 w-full">
            {episodeUrl ? (
              <VideoPlayer
                episodeUrl={episodeUrl}
                openingStart={episode?.openingStart}
                openingEnd={episode?.openingEnd}
                endingStart={episode?.endingStart}
                endingEnd={episode?.endingEnd}
                onSkipEnding={handleSkipEnding}
                hasNextEpisode={!!nextEpisode}
              />
            ) : (
              <p className="text-gray-400 text-center">
                Эпизод не найден или не имеет ссылки.
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="mt-3 text-sm text-yellow-400 text-center">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 🔘 Кнопки управления */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => prevEpisode && navigate(prevEpisode)}
              disabled={!prevEpisode}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${prevEpisode
                ? "bg-violet-600 hover:bg-violet-700"
                : "bg-gray-700 cursor-not-allowed"
                }`}
            >
              ◀ Предыдущая
            </button>

            <Link
              to={`/anime/${slug}`}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all"
            >
              ℹ Инфо
            </Link>

            <button
              onClick={() => nextEpisode && navigate(nextEpisode)}
              disabled={!nextEpisode}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${nextEpisode
                ? "bg-violet-600 hover:bg-violet-700"
                : "bg-gray-700 cursor-not-allowed"
                }`}
            >
              Следующая ▶
            </button>
          </div>

          {/* 📜 Описание */}
          <div className="mt-8 text-gray-300 text-sm md:text-base leading-relaxed">
            {anime.description}
          </div>
        </div>
      </div>
    </div>
  );
}