import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

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
  slug: string;
  nameRu: string;
  nameEn: string;
  dates: string[];
  rating: number;
  description: string;
  thumbnail: string;
  seasons: Season[];
  genres: string[];
  types: string[];
}

function AnimePage() {
  const { slug } = useParams();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setError("❌ Неверный URL — отсутствует slug");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`http://localhost:5000/api/anime/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `Ошибка ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data) throw new Error("Аниме не найдено");
        setAnime(data);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Ошибка при загрузке:", err);
        setError(err.message || "Ошибка при загрузке аниме");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [slug]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-white animate-bounce"></div>
          <div className="w-3 h-3 rounded-full bg-white animate-bounce [animation-delay:-.3s]"></div>
          <div className="w-3 h-3 rounded-full bg-white animate-bounce [animation-delay:-.5s]"></div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="text-center mt-[200px] text-red-400 text-lg">
        {error}
      </div>
    );

  if (!anime)
    return <div className="text-center mt-10 text-slate-400">Аниме не найдено</div>;

  return (
    <div className=" mb-10 flex justify-center px-4 mt-[100px]">
      <div className="w-full max-w-5xl">
        {/* Карточка с градиентом и стеклом */}
        <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-tl from-white via-black to-white  dark:from-white dark:via-black dark:to-white shadow-[0_0_30px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col md:flex-row gap-6 bg-neutral-900/60 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl p-6">
            <img
              src={anime.thumbnail}
              alt={anime.nameRu}
              className="w-full md:w-1/3 rounded-2xl object-cover shadow-lg shadow-black/60"
            />
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                {anime.nameRu}{" "}
                <span className="text-gray-400 text-lg font-medium">
                  ({anime.nameEn})
                </span>
              </h1>
              <p className="text-gray-300 leading-relaxed">{anime.description}</p>
              <p className="text-yellow-400 font-semibold text-lg">⭐ {anime.rating}</p>

              {anime.dates?.length > 0 && (
                <p className="text-gray-400 text-sm">
                  📅 {anime.dates.join(", ")}
                </p>
              )}
              {anime.genres?.length > 0 && (
                <p className="text-gray-400 text-sm">
                  🎭 Жанры: {anime.genres.join(", ")}
                </p>
              )}
              {anime.types?.length > 0 && (
                <p className="text-gray-400 text-sm">
                  🧩 Типы: {anime.types.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Секции с эпизодами */}
        <h2 className="text-2xl font-bold mt-10 mb-5 text-white">Серии</h2>

        {(!anime.seasons || anime.seasons.length === 0) && (
          <p className="text-gray-400 text-center">Сезонов пока нет</p>
        )}

        {anime.seasons?.map((season) => (
          <div
            key={season.seasonNumber}
            className="  relative mt-6 rounded-2xl p-[0.5px] bg-gradient-to-tl from-white via-black to-white  dark:from-white dark:via-black dark:to-white shadow-[0_0_30px_rgba(0,0,0,0.4)]"
          >
            <div className="bg-neutral-900/80  dark:bg-neutral-900/90 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4 text-white">
                Сезон {season.seasonNumber}
              </h3>

              {season.episodes.length === 0 ? (
                <p className="text-gray-500">Серий пока нет</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                  {season.episodes.map((ep) => (
                    <Link
                      key={ep.number}
                      to={`/anime/${anime.slug}/season/${season.seasonNumber}/episode/${ep.number}`}
                      className="bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-center font-medium shadow-md shadow-black/40 transition-transform transform hover:scale-[1.05]"
                    >
                      {ep.number} серия
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnimePage;
