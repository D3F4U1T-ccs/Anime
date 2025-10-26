import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const tParam = params.get("t");
  const resumeTime = tParam ? Number(tParam) : undefined;
  const resumePaused = params.get("paused") === "1" || params.get("paused") === "true";

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        const res = await fetch(
          `http://https://anime-1-dv13.onrender.com/api/anime/${slug}/season-${seasonNumber}/episode-${episodeNumber}`
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
    if (nextEpisode) navigate(nextEpisode);
  };

  return (
    <div className="mt-[80px] md:mt-[100px] w-full flex justify-center">
      <div className="w-full max-w-[960px] px-3 sm:px-4 md:px-6">
        <div className="bg-neutral-900/90 rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-6 shadow-lg">

          {/* === HEADER === */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
            <img
              src={anime.thumbnail}
              alt={anime.nameRu}
              className="w-[100px] h-[100px] sm:w-[130px] sm:h-[130px] rounded-full object-cover border-2 border-neutral-700 shadow-md"
            />

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-semibold text-white">
                {anime.nameRu}
              </h1>
              <p className="text-sm sm:text-base text-gray-300 mt-1">
                {episode?.title
                  ? `Серия ${episode.number} — ${episode.title}`
                  : `Серия ${episode?.number}`}
              </p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="bg-neutral-700/70 text-xs text-gray-200 px-3 py-1 rounded-md">
                  Сезон {currentSeason?.seasonNumber ?? 1}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-3 sm:mt-0">
              <button
                onClick={() => prevEpisode && navigate(prevEpisode)}
                disabled={!prevEpisode}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  prevEpisode
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                ◀
              </button>

              <button
                onClick={() => nextEpisode && navigate(nextEpisode)}
                disabled={!nextEpisode}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  nextEpisode
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                ▶
              </button>
            </div>
          </div>

          {/* === VIDEO === */}
          <div className="mt-4 w-full">
            {episodeUrl ? (
              <div className="rounded-lg overflow-hidden">
                <VideoPlayer
                  episodeUrl={episodeUrl}
                  openingStart={episode?.openingStart}
                  openingEnd={episode?.openingEnd}
                  endingStart={episode?.endingStart}
                  endingEnd={episode?.endingEnd}
                  onSkipEnding={handleSkipEnding}
                  hasNextEpisode={!!nextEpisode}
                  animeSlug={slug}
                  animeTitle={anime.nameRu}
                  thumbnail={anime.thumbnail}
                  seasonNumber={Number(seasonNumber)}
                  episodeNumber={Number(episodeNumber)}
                  resumeTime={resumeTime}
                  resumePaused={resumePaused}
                />
              </div>
            ) : (
              <p className="text-gray-400 text-center py-6">
                Эпизод не найден или не имеет ссылки.
              </p>
            )}
          </div>

          {/* === КНОПКИ НИЖЕ === */}
          {errorMsg && (
            <div className="mt-3 text-sm text-yellow-400 text-center">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6">
            <button
              onClick={() => prevEpisode && navigate(prevEpisode)}
              disabled={!prevEpisode}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium transition ${
                prevEpisode
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-gray-700 cursor-not-allowed"
              }`}
            >
              ◀ Предыдущая
            </button>

            <Link
              to={`/anime/${slug}`}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition"
            >
              ℹ Инфо
            </Link>

            <button
              onClick={() => nextEpisode && navigate(nextEpisode)}
              disabled={!nextEpisode}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium transition ${
                nextEpisode
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-gray-700 cursor-not-allowed"
              }`}
            >
              Следующая ▶
            </button>
          </div>

          {/* === DESCRIPTION === */}
          <div className="mt-8 text-gray-300 text-sm sm:text-base leading-relaxed text-center sm:text-left">
            {anime.description}
          </div>
        </div>
      </div>
    </div>
  );
}
