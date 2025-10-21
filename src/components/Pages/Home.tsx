import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdDateRange } from "react-icons/md";
import { FaStar, FaLayerGroup, FaListAlt } from "react-icons/fa";
import { IoExtensionPuzzle } from "react-icons/io5";

interface Anime {
  _id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  dates: string[];
  rating: number;
  thumbnail: string;
  genres?: string[];
  types?: string[];
  description?: string;
  seasons?: { seasonNumber: number; episodes?: { number: number }[] }[];
}

function Home() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimeout = useRef<number | null>(null);
  const navigate = useNavigate();

  // --- настройки ---
  const POP_POSITION: "top" | "bottom" = "top";

  const INFO_BTN_POS: { top?: string; right?: string; bottom?: string; left?: string } = {
    right: "0.75rem",
    bottom: "0.75rem",
  };
  // ------------------

  useEffect(() => {
    fetch("http://localhost:5000/api/anime")
      .then((res) => res.json())
      .then((data) => setAnimeList(data))
      .catch((err) => console.error("Ошибка загрузки аниме:", err))
      .finally(() => setLoading(false));
  }, []);

  const openPopover = (id: string) => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setOpenId(id);
  };

  const closePopoverWithDelay = (id: string, delay = 160) => {
    if (closeTimeout.current) window.clearTimeout(closeTimeout.current);
    closeTimeout.current = window.setTimeout(() => {
      setOpenId((cur) => (cur === id ? null : cur));
      closeTimeout.current = null;
    }, delay);
  };

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
    <div className="max-w-[1100px] mx-auto mt-[300px] bg-gray-300 dark:bg-gray-600 px-4 sm:px-8 py-10">
      <div className="Up_part- bg-gray-300 hidden xl:flex dark:bg-gray-600 absolute w-[1100px] -ml-[32px] -mt-[100px] h-[60px] rounded-t-[100%]" />
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 text-center">Аниме</h1>

      {animeList.length === 0 ? (
        <p className="text-center text-slate-600 dark:text-slate-400">Аниме пока нет 😢</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {animeList.map((anime) => {
            const seasonsCount = anime.seasons?.length ?? 0;
            const episodesCount =
              anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;

            return (
              <div key={anime._id} className="flex flex-col items-center group">
                <div className="relative z-10 w-[215px] h-[215px] rounded-full overflow-hidden">
                  <img
                    src={anime.thumbnail}
                    alt={anime.nameEn}
                    className="w-full h-full object-cover scale-110 group-hover:scale-115 transition-transform duration-300"
                  />
                </div>

                <div className="-mt-[120px] w-52 bg-white dark:bg-gray-800 pt-10 px-4 text-center transition-all duration-300 relative">
                  <h2 className="text-lg mt-24 font-bold text-slate-800 dark:text-white truncate">
                    {anime.nameRu}
                  </h2>

                  {anime.genres && anime.genres.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 justify-center">
                      <span className="text-purple-500 text-sm">🎭</span>
                      <span className="truncate max-w-[130px]">{anime.genres.join(", ")}</span>
                    </div>
                  )}

                  {anime.types && anime.types.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 justify-center">
                      <IoExtensionPuzzle className="text-blue-500 text-sm" />
                      <span className="truncate max-w-[130px]">{anime.types.join(", ")}</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-indigo-600/10 text-indigo-500 text-xs px-2 py-1 rounded-full">
                        <FaLayerGroup className="text-sm" /> {seasonsCount} <span className="text-gray-500">сез.</span>
                      </span>

                      <span className="inline-flex items-center gap-1 bg-emerald-600/10 text-emerald-600 text-xs px-2 py-1 rounded-full">
                        <FaListAlt className="text-sm" /> {episodesCount} <span className="text-gray-500">сер.</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold">
                        <FaStar /> {anime.rating}
                      </span>
                      {anime.dates?.length > 0 && (
                        <span className="flex items-center text-xs text-gray-500">
                          <MdDateRange className="mr-1" />
                          {anime.dates.length > 2 ? `${anime.dates.slice(0, 2).join(", ")}...` : anime.dates.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* --- info wrapper --- */}
                  <div
                    style={{ position: "absolute", zIndex: 40, ...INFO_BTN_POS }}
                    aria-hidden={false}
                    onMouseEnter={() => openPopover(anime._id)}
                    onMouseLeave={() => closePopoverWithDelay(anime._id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPopover(anime._id);
                      }}
                      className="font-bold w-5 h-5 rounded-full -mb-[12px] bg-gray-950/25 dark:bg-gray-950/40 text-white flex items-center justify-center transition-transform"
                    >
                      i
                    </button>

                    {/* модалка */}
                    <div
                      role="dialog"
                      aria-label={`${anime.nameRu} info`}
                      className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-out ${
                        POP_POSITION === "top" ? "bottom-[130%]" : "top-full mt-2"
                      } w-[360px] p-4 bg-white dark:bg-gray-900 text-sm rounded-lg z-50 border border-gray-200 dark:border-gray-800 shadow-lg ${
                        openId === anime._id ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                      }`}
                      style={{
                        minWidth: 320,
                        maxWidth: 480,
                        maxHeight: "70vh",
                        overflowY: "auto",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="font-semibold text-base truncate">
                        {anime.nameRu || anime.nameEn}
                      </h3>

                      <div
                        className="mt-2 text-xs leading-5 text-gray-700 dark:text-gray-300 transition-all duration-300"
                        style={{
                          whiteSpace: "pre-wrap",
                          lineHeight: "1.5",
                        }}
                      >
                        <p>{anime.description ?? "Описание отсутствует"}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {anime.genres?.slice(0, 8).map((g) => (
                          <span key={g} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                            {g}
                          </span>
                        ))}
                        {anime.types?.slice(0, 4).map((t) => (
                          <span key={t} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 text-xs text-gray-500 flex justify-between">
                        <span>
                          Рейтинг: <strong className="text-slate-700 dark:text-slate-200">{anime.rating ?? "—"}</strong>
                        </span>
                        <span>Сезонов: <strong>{seasonsCount}</strong></span>
                        <span>Серий: <strong>{episodesCount}</strong></span>
                      </div>

                      <button
                        onClick={() => navigate(`/anime/${anime.slug}`)}
                        className="mt-3 text-xs text-blue-500 hover:underline"
                      >
                        Перейти к аниме →
                      </button>
                    </div>
                  </div>
                  {/* --- end info --- */}
                </div>

                <div className="bg-white dark:bg-gray-800 w-52 h-5 rounded-b-[100%]" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Home;
