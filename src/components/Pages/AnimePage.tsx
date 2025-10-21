import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

interface Episode {
  number: number;
  url: string;
  title?: string;
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
  // optional age field (если добавишь в модель) — будет отображаться
  ageLimit?: string | number;
}

function formatList(arr?: string[]) {
  if (!arr || arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} и ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")} и ${arr[arr.length - 1]}`;
}

export default function AnimePage() {
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
      .catch((err: any) => {
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

  const totalSeasons = anime.seasons?.length ?? 0;
  const totalEpisodes =
    anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;

  return (
    <div className="mb-10 flex justify-center px-4 mt-[80px]">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-tl from-white via-black to-white  dark:from-white dark:via-black dark:to-white shadow-[0_0_30px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col md:flex-row gap-6 bg-neutral-900/70 rounded-2xl p-6">
            <img
              src={anime.thumbnail}
              alt={anime.nameRu}
              className="w-full md:w-1/3 max-h-[340px] rounded-2xl object-cover shadow-xl border border-black/40"
            />

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                      {anime.nameRu}
                    </h1>
                    <div className="text-sm text-gray-300 mt-1">
                      {anime.nameEn ? `(${anime.nameEn})` : null}
                    </div>
                  </div>

                  {/* Badges: seasons / episodes / age */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-violet-600/20 text-violet-300 text-xs px-3 py-1 rounded-full font-medium">
                        Сезонов: <span className="ml-2 font-semibold text-white">{totalSeasons}</span>
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
                        Серий: <span className="ml-2 font-semibold text-white">{totalEpisodes}</span>
                      </span>
                    </div>

                    { (anime as any).ageLimit || anime.ageLimit ? (
                      <div className="text-xs px-2 py-1 rounded-md bg-red-600/20 text-red-300 font-semibold">
                        Возрастное ограничение: {(anime as any).ageLimit ?? anime.ageLimit}
                      </div>
                    ) : null}
                  </div>
                </div>

                <p className="text-gray-300 mt-4 leading-relaxed">{anime.description}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 bg-white/5 text-white px-3 py-1 rounded-md">
                  <span className="text-yellow-400 font-semibold">⭐ {anime.rating}</span>
                </div>

                {anime.dates?.length > 0 && (
                  <div className="text-sm text-gray-300 bg-white/5 px-3 py-1 rounded-md">
                    📅 {anime.dates.join(", ")}
                  </div>
                )}

                {anime.genres?.length > 0 && (
                  <div className="text-sm text-gray-300 px-3 py-1 rounded-md bg-white/5">
                    🎭 {formatList(anime.genres)}
                  </div>
                )}

                {anime.types?.length > 0 && (
                  <div className="text-sm text-gray-300 px-3 py-1 rounded-md bg-white/5">
                    🧩 {formatList(anime.types)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Episodes section */}
        <h2 className="text-2xl font-bold mt-10 mb-5  dark:text-white">Смотреть:</h2>

        {(!anime.seasons || anime.seasons.length === 0) && (
          <p className="text-gray-400 text-center">Сезонов пока нет</p>
        )}

        <div className="flex flex-col gap-6">
          {anime.seasons?.map((season) => (
            <div key={season.seasonNumber} className="relative rounded-2xl p-[1px] bg-gradient-to-tr from-white via-black to-white  dark:from-white dark:via-black dark:to-white shadow-[0_0_30px_rgba(0,0,0,0.4)]">
              <div className="bg-neutral-900/80 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Сезон {season.seasonNumber}</h3>
                  <div className="text-sm text-gray-300">
                    Серий: <span className="font-medium text-white">{season.episodes.length}</span>
                  </div>
                </div>

                {season.episodes.length === 0 ? (
                  <p className="text-gray-500">Серий пока нет</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                    {season.episodes.map((ep) => (
                      <Link
                        key={ep.number}
                        to={`/anime/${anime.slug}/season/${season.seasonNumber}/episode/${ep.number}`}
                        className="bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white px-3 py-2 rounded-xl text-center font-medium shadow-md shadow-black/40 transition-transform transform hover:scale-[1.04]"
                      >
                        {ep.number}{ep.title ? ` - серия  ` : "" }
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
