import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlayCircle } from "react-icons/fa";

interface Anime {
  _id: string;
  slug: string;
  nameRu: string;
  nameEn?: string;
  thumbnail: string;
  rating?: number;
  genres?: string[];
}

interface LastWatched {
  animeId: string;
  animeSlug: string;
  episode: number;
  currentTime: number; // в секундах
}

/**
 * Предполагаемый формат сохранения в localStorage:
 * localStorage.setItem("lastWatched", JSON.stringify({
 *   animeId: "abc123",
 *   animeSlug: "some-anime",
 *   episode: 3,
 *   currentTime: 145 // секунды
 * }));
 */

function PreHome() {
  const [recommended, setRecommended] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState<8 | 16>(8);
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // прочитать прогресс из localStorage (если есть)
    try {
      const raw = localStorage.getItem("lastWatched");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.animeSlug && parsed.episode != null) {
          setLastWatched(parsed as LastWatched);
        }
      }
    } catch (e) {
      console.warn("Не удалось прочитать lastWatched из localStorage", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    // запрос рекомендаций с сервера; сервер должен отдавать рекомендованные по твоему флагу
    fetch(`http://localhost:5000/api/recommendations?limit=${limit}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Anime[]) => {
        if (!mounted) return;
        setRecommended(data ?? []);
      })
      .catch((err) => {
        console.error("Ошибка загрузки рекомендаций:", err);
        if (mounted) setError("Ошибка загрузки рекомендаций");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [limit]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh] mt-[200px] text-xl">
        <div className="flex flex-row gap-2">
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.3s]" />
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.5s]" />
        </div>
      </div>
    );

  return (
    <div className="max-w-[1100px] mx-auto mt-[300px] bg-transparent px-4 sm:px-8 py-10">
      {/* Заголовок */}
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 text-center">Добро пожаловать</h1>

      {/* Continue watching */}
      {lastWatched && (
        <div className="mb-8 rounded-2xl p-4 bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Продолжить просмотр</h2>

          <div
            className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition"
            onClick={() =>
              navigate(
                `/anime/${lastWatched.animeSlug}/episode/${lastWatched.episode}?t=${Math.floor(
                  lastWatched.currentTime || 0
                )}`
              )
            }
          >
            <div className="relative w-28 h-28 rounded-xl overflow-hidden shadow-md">
              {/* картинка берём из списка рекомендаций, если там есть совпадение по id — иначе пустая */}
              <img
                src={
                  recommended.find((a) => a._id === lastWatched.animeId)?.thumbnail ??
                  `https://via.placeholder.com/320x180?text=${encodeURIComponent(lastWatched.animeSlug)}`
                }
                alt={lastWatched.animeSlug}
                className="object-cover w-full h-full"
              />
              <FaPlayCircle className="absolute text-white/90 text-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div>
              <div className="text-lg font-semibold text-slate-700 dark:text-gray-100">
                {recommended.find((a) => a._id === lastWatched.animeId)?.nameRu ?? lastWatched.animeSlug}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Серия {lastWatched.episode} • {Math.floor((lastWatched.currentTime || 0) / 60)} мин.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Настройки / переключатель 8/16 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Рекомендованные аниме</h2>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Показать:</label>
          <button
            onClick={() => setLimit(8)}
            className={`px-3 py-1 rounded-full text-sm ${limit === 8 ? "bg-indigo-600 text-white" : "bg-white/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
          >
            8
          </button>
          <button
            onClick={() => setLimit(16)}
            className={`px-3 py-1 rounded-full text-sm ${limit === 16 ? "bg-indigo-600 text-white" : "bg-white/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
          >
            16
          </button>
        </div>
      </div>

      {/* Ошибка */}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Сетка рекомендованных */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommended.length === 0 ? (
          <div className="text-center text-gray-500 col-span-full">Рекомендации отсутствуют</div>
        ) : (
          recommended.map((anime) => (
            <div
              key={anime._id}
              onClick={() => navigate(`/anime/${anime.slug}`)}
              className="cursor-pointer flex flex-col items-center group"
            >
              <div className="relative z-10 w-[215px] h-[215px] rounded-full overflow-hidden shadow-lg">
                <img src={anime.thumbnail} alt={anime.nameRu} className="w-full h-full object-cover scale-110 group-hover:scale-115 transition-transform duration-300" />
              </div>

              <div className="-mt-[120px] w-52 bg-white dark:bg-gray-800 pt-10 px-4 text-center transition-all duration-300 relative">
                <h3 className="text-lg mt-24 font-bold text-slate-800 dark:text-white truncate">{anime.nameRu}</h3>

                <div className="flex items-center gap-2 justify-center mt-3">
                  <span className="inline-flex items-center gap-1 bg-indigo-600/10 text-indigo-500 text-xs px-2 py-1 rounded-full">
                    {anime.genres?.[0] ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold text-sm">
                    ⭐ {anime.rating ?? "—"}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 w-52 h-5 rounded-b-[100%]" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PreHome;
