import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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

  if (loading) return <div className="text-center mt-[400px] text-lg">
    <div className="flex justify-center mt-[300px] flex-row gap-2">
      <div className="w-3 h-3 rounded-full bg-black dark:bg-white animate-bounce"></div>
      <div
        className="w-3 h-3 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.3s]"
      ></div>
      <div
        className="w-3 h-3 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.5s]"
      ></div>
    </div>
  </div>;
  if (error) return <div className="text-center mt-[300px] [text-shadow:0.5px_0.5px_2px_black] text-red-500">{error}</div>;
  if (!anime) return <div className="text-center mt-10   text-slate-500">Аниме не найдено</div>;

  return (
    <div className="max-w-5xl mx-auto mt-[100px] p-6 text-white">
      <div className="flex flex-col md:flex-row gap-6 bg-gray-800  p-4 shadow-lg">
        <img
          src={anime.thumbnail}
          alt={anime.nameRu}
          className="w-full md:w-1/3 rounded-xl object-cover shadow-md"
        />
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold">
            {anime.nameRu}{" "}
            <span className="text-gray-400 text-lg">({anime.nameEn})</span>
          </h1>
          <p className="text-gray-300">{anime.description}</p>
          <p className="text-yellow-400 font-semibold">⭐ {anime.rating}</p>
          {anime.dates?.length > 0 && (
            <p className="text-gray-400 text-sm">
              📅 {anime.dates.join(", ")}
            </p>
          )}

          {anime.genres?.length > 0 && (
            <p className="text-gray-400 text-sm">🎭 Жанры: {anime.genres.join(", ")}</p>
          )}

          {anime.types?.length > 0 && (
            <p className="text-gray-400 text-sm">🧩 Типы: {anime.types.join(", ")}</p>
          )}

        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Серии</h2>

      {(!anime.seasons || anime.seasons.length === 0) && (
        <p className="text-gray-400">Сезонов пока нет</p>
      )}

      {anime.seasons?.map((season) => (
        <div
          key={season.seasonNumber}
          className="mb-6 border border-gray-700 p-4 rounded-lg bg-gray-900"
        >
          <h3 className="text-xl font-semibold mb-3">
            Сезон {season.seasonNumber}
          </h3>

          {season.episodes.length === 0 ? (
            <p className="text-gray-500">Серий пока нет</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
              {season.episodes.map((ep) => (
                <a
                  key={ep.number}
                  href={ep.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-center transition"
                >
                  {ep.number} серия
                </a>
              ))}
            </div>
          )}
        </div>
      ))}

    </div>

  );
}

export default AnimePage;
