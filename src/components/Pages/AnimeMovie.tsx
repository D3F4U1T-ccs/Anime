import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import VideoPlayer from "./VideoPlayer";

interface MovieItem {
  name?: string;
  url: string;
}

interface Anime {
  _id: string;
  nameRu: string;
  description: string;
  slug: string;
  thumbnail: string;
  rating: number;
  movies?: MovieItem[];
}

export default function AnimeMovie() {
  const { slug, moviePath } = useParams<{
    slug: string;
    moviePath?: string;
  }>();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [movieUrl, setMovieUrl] = useState<string | null>(null);
  const [movie, setMovie] = useState<MovieItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  // Определяем индекс фильма из URL
  // Если moviePath отсутствует (URL: /anime/:slug/movie) - это первый фильм, index = 0
  // Если moviePath = "movie2", то index = 1
  // Если moviePath = "movie3", то index = 2, и т.д.
  const getMovieIndex = () => {
    if (!moviePath) return 0; // Первый фильм: /anime/:slug/movie
    if (moviePath === "movie") return 0; // Первый фильм: /anime/:slug/movie
    const match = moviePath.match(/movie(\d+)/);
    if (match) return Number(match[1]) - 1;
    return 0;
  };

  const currentMovieIndex = getMovieIndex();

  // Проверяем, что это действительно запрос фильма
  const isValidMovie = !moviePath || moviePath.startsWith("movie");

  // Редиректим на страницу аниме, если это не фильм
  useEffect(() => {
    if (moviePath && !isValidMovie) {
      navigate(`/anime/${slug}`);
    }
  }, [moviePath, isValidMovie, slug, navigate]);

  useEffect(() => {
    // Если это не фильм, не загружаем
    if (moviePath && !isValidMovie) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        // Загружаем данные аниме
        const res = await fetch(
          `https://anime-1-dv13.onrender.com/api/anime/${slug}`
        );
        if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!data) {
          setAnime(null);
          setMovieUrl(null);
          setMovie(null);
        } else {
          setAnime(data);
          
          // Получаем фильм по индексу
          const movies = data.movies || [];
          if (currentMovieIndex >= 0 && currentMovieIndex < movies.length) {
            const selectedMovie = movies[currentMovieIndex];
            setMovie(selectedMovie);
            setMovieUrl(selectedMovie?.url || null);
          } else {
            setMovie(null);
            setMovieUrl(null);
            setErrorMsg("Фильм не найден");
          }
        }
      } catch (err) {
        console.error("Ошибка при загрузке фильма:", err);
        setErrorMsg("Не удалось загрузить данные фильма.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [slug, moviePath, currentMovieIndex, isValidMovie]);

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

  if (!movie || !movieUrl)
    return (
      <div className="text-center mt-[200px] text-red-400 text-lg">
        Фильм не найден 😢
      </div>
    );

  const totalMovies = anime.movies?.length || 0;

  // Навигация между фильмами
  const prevMovie =
    currentMovieIndex > 0
      ? currentMovieIndex === 1
        ? `/anime/${slug}/movie`
        : `/anime/${slug}/movie${currentMovieIndex}`
      : null;

  const nextMovie =
    currentMovieIndex < totalMovies - 1
      ? currentMovieIndex === 0
        ? `/anime/${slug}/movie2`
        : `/anime/${slug}/movie${currentMovieIndex + 2}`
      : null;

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
                {movie.name || `Фильм ${currentMovieIndex + 1}`}
              </p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="bg-emerald-700/70 text-xs text-gray-200 px-3 py-1 rounded-md">
                  Фильм {currentMovieIndex + 1} из {totalMovies}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-3 sm:mt-0">
              <button
                onClick={() => prevMovie && navigate(prevMovie)}
                disabled={!prevMovie}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  prevMovie
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                ◀
              </button>

              <button
                onClick={() => nextMovie && navigate(nextMovie)}
                disabled={!nextMovie}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  nextMovie
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
            {movieUrl ? (
              <div className="rounded-lg overflow-hidden">
                <VideoPlayer
                  episodeUrl={movieUrl}
                  animeSlug={slug || ""}
                  animeTitle={anime.nameRu}
                  thumbnail={anime.thumbnail}
                />
              </div>
            ) : (
              <p className="text-gray-400 text-center py-6">
                Фильм не имеет ссылки.
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
              onClick={() => prevMovie && navigate(prevMovie)}
              disabled={!prevMovie}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium transition ${
                prevMovie
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-gray-700 cursor-not-allowed"
              }`}
            >
              Предыдущий фильм
            </button>

            <Link
              to={`/anime/${slug}`}
              className="w-full sm:w-auto px-4 py-2 text-center rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition"
            >
              Инфо
            </Link>

            <button
              onClick={() => nextMovie && navigate(nextMovie)}
              disabled={!nextMovie}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium transition ${
                nextMovie
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-gray-700 cursor-not-allowed"
              }`}
            >
              Следующий фильм
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

