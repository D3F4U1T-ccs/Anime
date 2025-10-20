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
          <div className="flex flex-col items-center mb-6 text-center">
            <img
              src={anime.thumbnail}
              alt={anime.nameRu}
              className="w-[160px] h-[160px] rounded-full object-cover shadow-md mb-3"
            />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {anime.nameRu}
            </h1>
          </div>
          <h2 className="text-xl text-center text-white font-semibold mt-3">
            {/* {episode?.title || `Серия ${episode?.number}`} */}
          </h2>

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