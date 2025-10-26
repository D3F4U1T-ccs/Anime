// PreHome.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdDateRange } from "react-icons/md";
import { FaStar, FaLayerGroup, FaListAlt } from "react-icons/fa";
import { IoExtensionPuzzle } from "react-icons/io5";
import Img from "../img/hello-aniyuki.gif"
type Episode = { number: number; url?: string };
type Season = { seasonNumber: number; episodes?: Episode[] };

type Anime = {
  _id: string;
  slug?: string;
  nameRu?: string;
  nameEn?: string;
  dates?: string[];
  rating?: number;
  thumbnail?: string;
  genres?: string[];
  types?: string[];
  description?: string;
  seasons?: Season[];
};

type RecItem = {
  _id: string;
  anime: Anime;
};

type RecentlyWatchedItem = {
  id: string;
  animeSlug?: string;
  animeTitle?: string;
  thumbnail?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeUrl?: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
};

const STORAGE_KEY = "recentlyWatched_v1";
const MAX_RECENTS = 8;

function safeParseStorage(): RecentlyWatchedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyWatchedItem[];
  } catch {
    return [];
  }
}

/**
 * Dedupe: keep only newest record per anime (by animeSlug or id prefix),
 * sort by updatedAt desc and cap to MAX_RECENTS.
 * Also write deduped array back to storage to remove duplicates.
 */
function dedupeStorageAndReadUnique(): RecentlyWatchedItem[] {
  const raw = safeParseStorage();
  const map = new Map<string, RecentlyWatchedItem>();
  for (const item of raw) {
    const key = item.animeSlug ?? (item.id.split("|")[0] || item.id);
    const exist = map.get(key);
    if (!exist || (item.updatedAt || 0) > (exist.updatedAt || 0)) {
      map.set(key, item);
    }
  }
  const unique = Array.from(map.values());
  unique.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const sliced = unique.slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sliced));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch { }
  return sliced;
}

function writeStorage(list: RecentlyWatchedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch { }
}

function removeFromStorageById(id: string) {
  const list = safeParseStorage();
  const filtered = list.filter((it) => it.id !== id);
  writeStorage(filtered);
}

function formatTimeShort(seconds?: number) {
  if (seconds == null || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PreHome() {
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recently, setRecently] = useState<RecentlyWatchedItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // For old-style popover on recommendation cards:
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const popoverTriggerRefs = useRef<Record<string, HTMLDivElement | null>>({}); // <-- new
  const [popoverSide, setPopoverSide] = useState<Record<string, "left" | "right" | "center">>({}); // <-- new

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.MODE === "production"
      ? "https://anime-1-dv13.onrender.com"
      : "http://localhost:5000"
      }/api/recommendations`)

      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setRecs([]);
          return;
        }
        const normalized: RecItem[] = data.map((item: any) => {
          if (item && item.anime) return { _id: item._id, anime: item.anime as Anime };
          return { _id: item._id ?? item._id ?? "", anime: (item as Anime) };
        });
        setRecs(normalized);
      })
      .catch((err) => {
        console.error("Ошибка загрузки рекомендаций:", err);
        setRecs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const uniq = dedupeStorageAndReadUnique();
    setRecently(uniq);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const up = dedupeStorageAndReadUnique();
        setRecently(up);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // close menus when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const nodes = Object.values(menuRefs.current);
      const target = e.target as Node;
      for (const node of nodes) {
        if (node && node.contains(target)) return;
      }
      setOpenMenuId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // openPopover updated: compute side based on trigger element position
  const openPopover = (id: string) => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }

    // determine side: if trigger center is left half of viewport -> show popover to the right
    try {
      const el = popoverTriggerRefs.current[id];
      if (el) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const side = centerX < vw / 2 ? "right" : "left";
        setPopoverSide((prev) => ({ ...prev, [id]: side }));
      } else {
        setPopoverSide((prev) => ({ ...prev, [id]: "center" }));
      }
    } catch {
      setPopoverSide((prev) => ({ ...prev, [id]: "center" }));
    }

    setOpenPopoverId(id);
  };

  const closePopoverWithDelay = (id: string, delay = 160) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    closeTimeout.current = setTimeout(() => {
      setOpenPopoverId((cur) => (cur === id ? null : cur));
      closeTimeout.current = null;
    }, delay);
  };

  const handleCardClick = (it: RecentlyWatchedItem) => {
    const slug = it.animeSlug;
    const season = it.seasonNumber;
    const episode = it.episodeNumber;
    const cur = Math.floor(it.currentTime || 0);
    if (!slug || season == null || episode == null) {
      if (it.episodeUrl) {
        window.location.href = it.episodeUrl;
      }
      return;
    }
    navigate(`/anime/${slug}/season/${season}/episode/${episode}?t=${cur}&paused=1`);
  };

  const handleDelete = (id: string) => {
    removeFromStorageById(id);
    setRecently((prev) => prev.filter((p) => p.id !== id));
    setOpenMenuId(null);
  };

  const POP_POSITION: "top" | "bottom" = "top";
  const INFO_BTN_POS = { right: "0.75rem", bottom: "0.75rem" };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] mt-[200px] text-xl">
        <div className="flex flex-row gap-2">
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.3s]" />
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.5s]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto mt-[300px] bg-gray-200 dark:bg-gray-900 px-4 sm:px-8 py-10">
      <div className="Up_part- bg-gray-200 hidden xl:flex dark:bg-gray-900 absolute w-[1100px] -ml-[32px] -mt-[100px] h-[60px] rounded-t-[100%]" />

      {/* Welcome panel (показывается, когда нет недавно просмотренных) */}
      {recently.length === 0 && (
        <section className="mb-8">
          <div className=" overflow-hidden ">
            <div className="bg-gradient-to-r  from-slate-300 dark:from-slate-800 via-violet-100/20  dark:via-violet-800/10  p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 [@media(max-width:709px)]:rounded-tr-[200px] rounded-tl-[200px]  text-white">
              <div className="flex items-center justify-center [@media(max-width:640px)]:w-56   [@media(max-width:640px)]:h-56 w-28 h-28 rounded-full bg-white/10 overflow-hidden flex-shrink-0 shadow-md">
                <img
                  src={Img}
                  alt="Avatar"
                  className="w-full  h-full object-cover"
                />
              </div>


              <div className="flex-1 min-w-0">
                <h2 className="text-3xl font-bold  text-black/90  dark:text-white/90 leading-tight ">Добро пожаловать</h2>
                <p
                  className="mt-2 text-sm  text-black/90  dark:text-white/90"
                  style={{ lineHeight: 1.7 }}
                >
                  Спасибо, что зашли на мой сайт и нашли время прочитать это сообщение.
                  Этот проект я создавал с душой и желанием сделать что-то по-настоящему интересное.
                  Изначально задумывалось многое, но, поскольку бюджета вобще не было, не всё удалось реализовать сразу.

                  Тем не менее, над сайтом работал всего один человек — и я искренне надеюсь,
                  что вы найдёте здесь что-то, что вам понравится.

                  <span className="block mt-3 font-semibold  text-black/90  dark:text-white/90">С уважением, разработчик 💻</span>
                </p>



                <p className="mt-3  text-black/90  dark:text-white/90 text-sm">
                  Хотите узнать больше о проекте?{" "}
                  <button
                    onClick={() => navigate("/about")}
                    className="font-semibold underline underline-offset-2 hover:text-gray-500 dark:hover:text-gray-400 "
                    aria-label="Больше информации о проекте"
                  >
                    Больше инфы
                  </button>
                </p>
              </div>

              <div className="w-[200px] [@media(max-width:900px)]:w-[000px]  "></div>
            </div>

            <div className="bg-white rounded-b-2xl dark:bg-gray-800 p-3 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
              <div>Локальная история просмотра сохраняется в браузере.</div>
              <div className="text-right">
                Можно перейти в{" "}
                <button onClick={() => navigate("/about")} className="text-indigo-600 font-medium underline">
                  О проекте
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Continue watching */}
      {recently.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white"> Продолжить просмотр</h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  writeStorage([]);
                  setRecently([]);
                }}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition"
              >
                Очистить
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {recently.slice(0, MAX_RECENTS).map((it) => {
              const slug = it.animeSlug;
              const season = it.seasonNumber;
              const episode = it.episodeNumber;
              const thumb = it.thumbnail ?? "/placeholder.jpg";
              const title = it.animeTitle ?? slug ?? "Аниме";
              const pct = it.duration ? Math.round((it.currentTime / it.duration) * 100) : 0;
              const label = `Сезон ${season} · Серия ${episode}`;
              const idForMenu = it.id;
              const menuOpen = openMenuId === idForMenu;

              return (
                <article key={it.id} className="relative rounded-2xl overflow-hidden">
                  <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-900 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg transition">
                    {/* Poster */}
                    <div
                      className="relative z-10 w-28 h-28 rounded-full overflow-hidden flex-shrink-0"
                      onClick={() => handleCardClick(it)}
                      role="button"
                      aria-label={`Перейти к ${title}`}
                    >
                      <img src={thumb} alt={title} className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0" onClick={() => handleCardClick(it)}>
                      <div className="text-lg font-semibold text-slate-800 dark:text-white truncate">{title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{label}</div>

                      <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-slate-800 dark:text-white">{formatTimeShort(it.currentTime)}</span>
                        <span className="text-gray-500 dark:text-gray-400"> / {formatTimeShort(it.duration)}</span>
                        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">·</span>
                        <span className="ml-2 font-medium text-slate-800 dark:text-white">{pct}%</span>
                      </div>

                      <div className="mt-4 [@media(max-width:830px)]:block flex gap-3">
                        <button
                          onClick={() => handleCardClick(it)}
                          className="px-4  py-2 rounded-md bg-violet-600   hover:bg-violet-700 text-white text-sm transition"
                        >
                          Продолжить
                        </button>

                        <button
                          onClick={() => {
                            if (slug && season != null && episode != null) {
                              navigate(`/anime/${slug}/season/${season}/episode/${episode}`);
                            } else if (it.episodeUrl) {
                              window.location.href = it.episodeUrl;
                            }
                          }}
                          className="px-4 py-2 rounded-md bg-gray-100 [@media(max-width:830px)]:mt-5 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-slate-800 dark:text-white transition"
                        >
                          Открыть серию
                        </button>
                      </div>
                    </div>

                    {/* Three-dots menu */}
                    <div
                      className={
                        // На больших экранах — обычное позиционирование;
                        // на экранах <=640px — помещаем кнопку в верхний правый угол карточки.
                        "relative self-start ml-auto sm:ml-0 [@media(max-width:640px)]:absolute [@media(max-width:640px)]:right-4 [@media(max-width:640px)]:top-4"
                      }
                    >
                      <div ref={(el) => (menuRefs.current[idForMenu] = el)}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((cur) => (cur === idForMenu ? null : idForMenu));
                          }}
                          className="w-6 h-6 rounded-full bg-gray-800/30 dark:bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800/80 transition"
                          title="Параметры"
                          aria-haspopup="true"
                          aria-expanded={menuOpen}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-90">
                            <circle cx="5" cy="12" r="1.6" fill="white" />
                            <circle cx="12" cy="12" r="1.6" fill="white" />
                            <circle cx="19" cy="12" r="1.6" fill="white" />
                          </svg>
                        </button>

                        {menuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40 overflow-hidden"
                          >
                            <button
                              onClick={() => handleDelete(it.id)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommendations (old-style cards) */}
      <div className="mt-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-5 text-center">🎯 Рекомендуем посмотреть</h2>

        <div className="grid grid-cols-2 [@media(max-width:480px)]:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recs.length === 0 ? (
            <div className="col-span-full text-center text-gray-400">Рекомендаций пока нет 😢</div>
          ) : (
            recs.map((r) => {
              const anime = r.anime ?? ({} as Anime);
              const dates = anime.dates ?? [];
              const seasonsCount = anime.seasons?.length ?? 0;
              const episodesCount =
                anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;
              const idForPopover = anime._id ?? r._id;
              const title = anime.nameRu ?? anime.nameEn ?? "—";

              // side for this id (if set)
              const side = popoverSide[String(idForPopover)] ?? "center";

              // build position classes for popover depending on computed side
              const verticalPos = POP_POSITION === "top" ? "bottom-[130%]" : "top-full mt-2";
              const positionClass =
                side === "center"
                  ? `left-1/2 transform -translate-x-1/2 ${verticalPos}`
                  : side === "right"
                    ? `left-full ml-2 ${verticalPos}` // place popover to the right of trigger
                    : `right-full mr-2 ${verticalPos}`; // place popover to the left of trigger

              return (
                <div
                  key={r._id}
                  className="cursor-pointer flex flex-col items-center group relative"
                  onClick={() => navigate(`/anime/${anime.slug ?? anime._id ?? r._id}`)}
                >
                  <div className="relative z-10 w-[215px] h-[215px] rounded-full overflow-hidden">
                    <img
                      src={anime.thumbnail ?? "/placeholder.jpg"}
                      alt={anime.nameEn ?? anime.nameRu ?? "poster"}
                      className="w-full h-full object-cover scale-110 group-hover:scale-115 transition-transform duration-300"
                    />
                  </div>

                  <div className="-mt-[120px] w-52 bg-white dark:bg-gray-800 pt-10 px-4 text-center transition-all duration-300 relative ">
                    <h2 className="text-lg mt-24 font-bold text-slate-800 dark:text-white truncate">
                      {title}
                    </h2>

                    {anime.genres && anime.genres.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300 mt-1 justify-center">
                        <span className="text-purple-500 text-sm">🎭</span>
                        <span className="truncate max-w-[130px]">{anime.genres.join(", ")}</span>
                      </div>
                    )}

                    {anime.types && anime.types.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-300 mt-1 justify-center">
                        <IoExtensionPuzzle className="text-blue-500 text-sm" />
                        <span className="truncate max-w-[130px]">{anime.types.join(", ")}</span>
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-2 mt-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 bg-indigo-600/10 text-indigo-500 text-xs px-2 py-1 rounded-full">
                          <FaLayerGroup className="text-sm" /> {seasonsCount} <span className="text-gray-500 dark:text-gray-300">сез.</span>
                        </span>

                        <span className="inline-flex items-center gap-1 bg-emerald-600/10 text-emerald-600 text-xs px-2 py-1 rounded-full">
                          <FaListAlt className="text-sm" /> {episodesCount} <span className="text-gray-500 dark:text-gray-300">сер.</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold">
                          <FaStar /> {anime.rating ?? "—"}
                        </span>

                        {dates.length > 0 && (
                          <span className="flex items-center text-xs text-gray-500  dark:text-gray-300">
                            <MdDateRange className="mr-1" />
                            {dates.length > 2 ? `${dates.slice(0, 2).join(", ")}...` : dates.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* info (i) */}
                    <div
                      // make this div the trigger reference for popover positioning
                      ref={(el) => (popoverTriggerRefs.current[String(idForPopover)] = el)}
                      style={{ position: "absolute", zIndex: 40, ...INFO_BTN_POS }}
                      aria-hidden={false}
                      onMouseEnter={(e) => { e.stopPropagation(); openPopover(String(idForPopover)); }}
                      onMouseLeave={() => closePopoverWithDelay(String(idForPopover))}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); openPopover(String(idForPopover)); }}
                        className="font-bold w-5 h-5 rounded-full -mb-[12px] bg-gray-950/25 dark:bg-gray-950/40 text-white flex items-center justify-center transition-transform"
                      >
                        i
                      </button>

                      {/* popover dialog */}
                      <div
                        role="dialog"
                        aria-label={`${anime.nameRu ?? anime.nameEn} info`}
                        className={`absolute ${positionClass} w-[360px] p-4 bg-white dark:bg-gray-900 text-sm rounded-lg z-50 border border-gray-200 dark:border-gray-800 shadow-lg ${openPopoverId === String(idForPopover) ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
                        style={{ minWidth: 320, maxWidth: 480, maxHeight: "70vh", overflowY: "auto" }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => openPopover(String(idForPopover))}
                        onMouseLeave={() => closePopoverWithDelay(String(idForPopover))}
                      >
                        <h3 className="font-semibold text-base truncate text-slate-800 dark:text-white">
                          {anime.nameRu ?? anime.nameEn}
                        </h3>

                        <div className="mt-2 text-xs leading-5 text-gray-700 dark:text-gray-300 transition-all duration-300" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                          <p>{anime.description ?? "Описание отсутствует"}</p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {anime.genres?.slice(0, 8).map((g) => (
                            <span key={g} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">{g}</span>
                          ))}
                          {anime.types?.slice(0, 4).map((t) => (
                            <span key={t} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">{t}</span>
                          ))}
                        </div>

                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                          <div>
                            Рейтинг: <strong className="text-slate-700 dark:text-slate-200">{anime.rating ?? "—"}</strong>
                          </div>
                          <div>Сезонов: <strong>{seasonsCount}</strong></div>
                          <div>Серий: <strong>{episodesCount}</strong></div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setOpenPopoverId(null); }} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-800 text-sm">Закрыть</button>
                          <button onClick={(e) => { e.stopPropagation(); setOpenPopoverId(null); navigate(`/anime/${anime.slug ?? anime._id ?? r._id}`); }} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Перейти →</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 w-52 h-5 rounded-b-[100%]" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
