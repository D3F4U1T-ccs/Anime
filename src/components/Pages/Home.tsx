// Home.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MdDateRange } from "react-icons/md";
import { FaStar, FaLayerGroup, FaListAlt } from "react-icons/fa";
import { IoExtensionPuzzle } from "react-icons/io5";
import Img from "../img/1682325835_papik-pro-p-stiker-privet-anime-vektor-14.png";
import Logo from "../img/logo.png"
interface Episode { number: number; }
interface Season { seasonNumber: number; episodes?: Episode[]; }
interface MovieItem {
  name?: string;
  url: string;
}
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
  seasons?: Season[];
  movies?: MovieItem[];
}

function Home() {
  // main data
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  // pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0); // last loaded page (0-based)
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // popover info (left as before)
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverTriggerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [popoverSide, setPopoverSide] = useState<Record<string, "left" | "right" | "center">>({});

  const navigate = useNavigate();

  // search
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // filters modal
  const [showFilters, setShowFilters] = useState(false);

  // filter selections (applied)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedYearCategory, setSelectedYearCategory] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<string>("rating");

  // temp selections in modal
  const [tempGenres, setTempGenres] = useState<string[]>([]);
  const [tempTypes, setTempTypes] = useState<string[]>([]);
  const [tempYearCategory, setTempYearCategory] = useState<string | null>(null);
  const [tempSort, setTempSort] = useState<string>("rating");

  // visual
  const POP_POSITION: "top" | "bottom" = "top";
  const INFO_BTN_POS: { top?: string; right?: string; bottom?: string; left?: string } = {
    right: "0.75rem",
    bottom: "0.75rem",
  };

  // helper: parse numeric years from a.dates
  const parseYears = (dates?: string[]) => {
    if (!dates || dates.length === 0) return [];
    const years: number[] = [];
    for (const d of dates) {
      const match = d.match(/(19|20)\d{2}/g);
      if (match) {
        for (const m of match) years.push(Number(m));
      }
    }
    return Array.from(new Set(years)).sort((a, b) => a - b);
  };

  const isOngoing = (dates?: string[]) => {
    if (!dates) return false;
    return dates.some((d) => /ongoing|on-going|онгоинг|онгоин|выпускается/i.test(d) || /\.\.\./.test(d));
  };

  const matchYearCategory = (anime: Anime, category: string | null) => {
    if (!category) return true;
    if (category === "Онгоинг") return isOngoing(anime.dates);
    const years = parseYears(anime.dates);
    if (years.length === 0) return false;
    if (category === "до 2000") return Math.max(...years) < 2000;
    if (category === "2000-2007") return years.some((y) => y >= 2000 && y <= 2007);
    if (category === "2008-2014") return years.some((y) => y >= 2008 && y <= 2014);
    if (category === "2015-2021") return years.some((y) => y >= 2015 && y <= 2021);
    const single = Number(category);
    if (!Number.isNaN(single)) return years.includes(single);
    return false;
  };

  // ---------- pagination fetch ----------
  const fetchPage = async (p: number, replace = false) => {
    // cancel previous
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const offset = p * PAGE_SIZE;
    setLoadingMore(true);
    try {
      // try API with limit/offset params (server may accept or ignore)
      const url = `https://anime-1-dv13.onrender.com/api/anime?limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("unexpected response");

      // if server returned more than page size or exactly page size, assume pagination works
      if (Array.isArray(data)) {
        // if server ignored params and returned ALL on first page, detect it:
        if (p === 0 && data.length > PAGE_SIZE) {
          // server probably returned all items — use it and stop pagination
          setAnimeList(data);
          setHasMore(false);
          setPage(0);
        } else {
          setAnimeList((prev) => (replace ? data : [...prev, ...data]));
          // if returned < PAGE_SIZE -> no more
          if (data.length < PAGE_SIZE) setHasMore(false);
          else setHasMore(true);
          setPage(p);
        }
      }
    } catch (err) {
      // fallback: if first page failed with params, try without params (get full list)
      if (p === 0) {
        try {
          const r2 = await fetch("/api/anime", { signal: controller.signal });
          if (r2.ok) {
            const all = await r2.json();
            if (Array.isArray(all)) {
              setAnimeList(all);
              setHasMore(false);
              setPage(0);
            }
          }
        } catch (e) {
          console.error("fetch fallback failed", e);
        }
      } else {
        console.error("Ошибка загрузки страницы", p, err);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      abortRef.current = null;
    }
  };

  // initial load (first page)
  useEffect(() => {
    setLoading(true);
    setAnimeList([]);
    setPage(0);
    setHasMore(true);
    fetchPage(0, true);
    // cleanup abort on unmount
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only once on mount

  // intersection observer for auto "infinite" loading
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadingMore && hasMore) {
            fetchPage(page + 1);
          }
        });
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loadingMore]);

  // debounce text query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 240);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ---------- filters availability ----------
  const ALL_GENRES = [
    "Приключения", "Боевик", "Комедия", "Повседневность", "Романтика",
    "Драма", "Фантастика", "Фэнтези", "Мистика", "Детектив", "Триллер", "Психология", "Экшен"
  ];
  const ALL_TYPES = [
    "Боевые искусства", "Вампиры", "Военное", "Демоны", "Игры", "История",
    "Космос", "Магия", "Меха", "Музыка", "Самураи", "Сёнен",
    "Спорт", "Суперсила", "Ужасы", "Школа", "Исэкай"
  ];

  const availableGenres = useMemo(() => {
    const set = new Set<string>(ALL_GENRES);
    animeList.forEach((a) => a.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [animeList]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>(ALL_TYPES);
    animeList.forEach((a) => a.types?.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [animeList]);

  // compose filtered list (client-side filtering on loaded items)
  const filteredList = useMemo(() => {
    let list = animeList.filter((a) => {
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        const inName =
          (a.nameRu ?? "").toLowerCase().includes(q) || (a.nameEn ?? "").toLowerCase().includes(q);
        const inGenres = a.genres?.some((g) => g.toLowerCase().includes(q)) ?? false;
        const inTypes = a.types?.some((t) => t.toLowerCase().includes(q)) ?? false;
        if (!inName && !inGenres && !inTypes) return false;
      }

      if (selectedGenres.length > 0) {
        if (!a.genres) return false;
        const hasAll = selectedGenres.every((g) => a.genres!.includes(g));
        if (!hasAll) return false;
      }

      if (selectedTypes.length > 0) {
        if (!a.types) return false;
        const hasAllT = selectedTypes.every((t) => a.types!.includes(t));
        if (!hasAllT) return false;
      }

      if (selectedYearCategory) {
        if (!matchYearCategory(a, selectedYearCategory)) return false;
      }

      return true;
    });

    // sorting
    if (selectedSort === "rating") {
      list = list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (selectedSort === "alphabet") {
      list = list.sort((x, y) => (x.nameRu ?? x.nameEn ?? "").localeCompare(y.nameRu ?? y.nameEn ?? ""));
    } else if (selectedSort === "episodes") {
      const episodesCount = (x: Anime) => x.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;
      list = list.sort((a, b) => episodesCount(b) - episodesCount(a));
    } else if (selectedSort === "year") {
      const maxYear = (x: Anime) => {
        const ys = parseYears(x.dates);
        if (ys.length === 0) return 0;
        return Math.max(...ys);
      };
      list = list.sort((a, b) => maxYear(b) - maxYear(a));
    }

    return list;
  }, [animeList, debouncedQuery, selectedGenres, selectedTypes, selectedYearCategory, selectedSort]);

  // modal helpers
  const openFilters = () => {
    setTempGenres(selectedGenres.slice());
    setTempTypes(selectedTypes.slice());
    setTempYearCategory(selectedYearCategory);
    setTempSort(selectedSort);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setSelectedGenres(tempGenres.slice());
    setSelectedTypes(tempTypes.slice());
    setSelectedYearCategory(tempYearCategory);
    setSelectedSort(tempSort);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTempGenres([]);
    setTempTypes([]);
    setTempYearCategory(null);
    setTempSort("rating");
    setSelectedGenres([]);
    setSelectedTypes([]);
    setSelectedYearCategory(null);
    setSelectedSort("rating");
    setQuery("");
    // Note: we don't re-fetch server here — we keep loaded items but clear client filters & search
  };

  const toggleTempGenre = (g: string) => setTempGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const toggleTempType = (t: string) => setTempTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const yearCategories = ["Онгоинг", "2025", "2024", "2023", "2022", "2015-2021", "2008-2014", "2000-2007", "до 2000"];

  if (loading && animeList.length === 0)
    return (
      <div className="flex justify-center items-center min-h-[60vh] mt-[200px] text-xl">
        <div className="flex flex-row gap-2">
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.3s]" />
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.5s]" />
        </div>
      </div>
    );

  const activeChips = [...selectedGenres, ...selectedTypes, selectedYearCategory ? [selectedYearCategory] : []].flat().filter(Boolean) as string[];

  return (
    <div className="">
      <div className=" hidden z-50  xl:flex items-center justify-center mt-[100px]">

        <img src={Logo} className=" z-40 w-[400px] " alt="" />

      </div>
      <div className="max-w-[1100px] mx-auto mt-[100px] xl:mt-[30px] bg-gray-200 dark:bg-gray-900  px-4 sm:px-8 py-10">
        <div className="Up_part- bg-gray-200 hidden xl:flex dark:bg-gray-900 absolute w-[1100px] -ml-[32px] -mt-[100px] h-[60px] rounded-t-[100%]" />
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 text-center">Смотреть лучшие аниме</h1>

        {/* Search + Filters */}
        <div className="max-w-[920px] mx-auto mb-6">
          <div className="flex flex-wrap items-center gap-3">

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && debouncedQuery) {
                  const first = filteredList[0];
                  if (first) navigate(`/anime/${first.slug}`);
                }
              }}
              placeholder="Поиск аниме по названию, жанру или типу..."
              className="flex-1 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm focus:outline-none focus:ring-[1px] focus:ring-purple-500"
            />

            {query && (
              <button
                onClick={() => setQuery("")}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm border border-gray-200 dark:border-gray-700"
                title="Очистить"
              >
                ✕
              </button>
            )}

            <button
              onClick={openFilters}
              className="px-4 py-2 rounded-lg text-sm bg-gradient-to-br from-purple-600 to-purple-500 text-white shadow-lg hover:opacity-95 transition"
              title="Фильтры"
            >
              Фильтры
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
            <div>
              {debouncedQuery || selectedGenres.length > 0 || selectedTypes.length > 0 || selectedYearCategory
                ? `Результатов: ${filteredList.length}`
                : `Всего загружено: ${animeList.length}`}
            </div>
            <div className="text-gray-500">Нажмите Enter — открыть первый результат</div>
          </div>

          {/* active chips */}
          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeChips.map((c) => (
                <div key={c} className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-sm px-3 py-1 rounded-full">
                  <span className="text-sm">{c}</span>
                  <button
                    onClick={() => {
                      if (selectedGenres.includes(c)) setSelectedGenres((s) => s.filter((x) => x !== c));
                      if (selectedTypes.includes(c)) setSelectedTypes((s) => s.filter((x) => x !== c));
                      if (selectedYearCategory === c) setSelectedYearCategory(null);
                    }}
                    className="text-xs px-1"
                    aria-label={`Удалить фильтр ${c}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters modal (adaptive): bottom-sheet on small screens, centered modal on md+ */}
        {
          showFilters && (
            <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowFilters(false)} aria-hidden />
              <div className="absolute inset-0 flex items-end md:items-center justify-center">
                <div className="relative z-10 w-full md:w-[95%] md:max-w-[980px] bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-t-lg md:rounded-lg shadow-2xl p-4 md:p-6 border border-gray-700 max-h-[85vh] overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-white">Фильтры</h2>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => {
                          resetFilters();
                          setTempGenres([]);
                          setTempTypes([]);
                          setTempYearCategory(null);
                          setTempSort("rating");
                        }}
                        className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
                      >
                        Сбросить
                      </button>
                      <button onClick={() => setShowFilters(false)} className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600" title="Закрыть">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 overflow-auto pr-2" style={{ maxHeight: "60vh" }}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="[@media(max-width:770px)]:bg-gray-500/40 p-2" >
                        <h3 className="text-md font-medium text-purple-300 mb-2">Жанр</h3>
                        <div className="flex flex-col gap-2 max-h-[340px] overflow-auto pr-2">
                          {availableGenres.map((g) => {
                            const selected = tempGenres.includes(g);
                            return (
                              <label key={g} className={`inline-flex items-center gap-3 text-sm cursor-pointer [@media(max-width:770px)]:bg-gray-500/40 p-2 px-2 py-1 rounded ${selected ? "bg-purple-700/30" : "hover:bg-white/5"}`}>
                                <input type="checkbox" checked={!!selected} onChange={() => toggleTempGenre(g)} className="w-4 h-4 accent-purple-500" />
                                <span className="truncate">{g}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="[@media(max-width:770px)]:bg-gray-500/40 p-2" >
                        <h3 className="text-md font-medium text-purple-300 mb-2">Тип</h3>
                        <div className="flex flex-col gap-2 max-h-[340px] overflow-auto pr-2">
                          {availableTypes.map((t) => {
                            const selected = tempTypes.includes(t);
                            return (
                              <label key={t} className={`inline-flex items-center [@media(max-width:770px)]:bg-gray-500/40 p-2 gap-3 text-sm cursor-pointer px-2 py-1 rounded ${selected ? "bg-purple-700/30" : "hover:bg-white/5"}`}>
                                <input type="checkbox" checked={!!selected} onChange={() => toggleTempType(t)} className="w-4 h-4 accent-purple-500" />
                                <span className="truncate">{t}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-md font-medium text-purple-300 mb-2">Год выпуска</h3>
                        <div className="flex flex-col gap-2">
                          {yearCategories.map((yc) => (
                            <label key={yc} className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                              <input type="radio" checked={!!(tempYearCategory === yc)} onChange={() => setTempYearCategory((cur) => (cur === yc ? null : yc))} className="w-4 h-4 accent-purple-500" />
                              <span>{yc}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-md font-medium text-purple-300 mb-2">Сортировка</h3>
                        <div className="flex flex-col gap-2">
                          <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                            <input type="radio" name="sort" checked={!!(tempSort === "rating")} onChange={() => setTempSort("rating")} className="w-4 h-4 accent-purple-500" />
                            <span>По рейтингу</span>
                          </label>

                          <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                            <input type="radio" name="sort" checked={!!(tempSort === "alphabet")} onChange={() => setTempSort("alphabet")} className="w-4 h-4 accent-purple-500" />
                            <span>По алфавиту</span>
                          </label>

                          <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                            <input type="radio" name="sort" checked={!!(tempSort === "episodes")} onChange={() => setTempSort("episodes")} className="w-4 h-4 accent-purple-500" />
                            <span>По кол-ву серий</span>
                          </label>

                          <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                            <input type="radio" name="sort" checked={!!(tempSort === "year")} onChange={() => setTempSort("year")} className="w-4 h-4 accent-purple-500" />
                            <span>По году выхода</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-6">
                    <div className="flex items-center justify-end gap-3  fixed left-0 right-0 bottom-0 md:relative md:bg-transparent bg-gradient-to-t from-black/40 to-transparent p-4 md:p-0">
                      <div className="flex-1 md:flex-none md:mr-4 text-left md:text-right">
                        <div className="text-xs [@media(max-width:770px)]:hidden6ч text-gray-300 md:hidden">Прокрутите, чтобы выбрать; нажмите Применить.</div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setShowFilters(false)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">Отмена</button>
                        <button onClick={() => applyFilters()} className="px-4 py-2 rounded bg-gradient-to-br from-purple-600 to-purple-500 text-white text-sm shadow">Применить</button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )
        }

        {/* main list */}
        {
          filteredList.length === 0 ? (
            <div role="status" aria-live="polite" className="max-w-[920px] mx-auto mt-10 flex flex-col md:flex-row items-center gap-6 px-4">
              <img src={Img} alt="Аниме-девушка машет рукой — ничего не найдено" loading="lazy" className="w-56 h-44 sm:w-64 sm:h-52 md:w-64 md:h-52 object-contain -mt-6" />

              <div className="text-center md:text-left flex-1">
                <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold">Не удалось найти аниме с выбранными фильтрами 😕</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Попробуйте убрать часть фильтров или выполнить более общий поиск.</p>

                <div className="mt-4">
                  <button onClick={() => resetFilters()} className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm shadow">Сбросить фильтры</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 [@media(max-width:480px)]:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredList.map((anime) => {
                  const seasonsCount = anime.seasons?.length ?? 0;
                  const episodesCount = anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;
                  const moviesCount = anime.movies?.length ?? 0;
                  const hasEpisodes = episodesCount > 0;
                  const hasMovies = moviesCount > 0;

                  // popover pos: kept simple (you had popoverSide logic earlier; kept as-is)
                  const side = popoverSide[anime._id] ?? "center";
                  const verticalPos = POP_POSITION === "top" ? "bottom-[130%]" : "top-full mt-2";
                  const positionClass =
                    side === "center"
                      ? `left-1/2 transform -translate-x-1/2 ${verticalPos}`
                      : side === "right"
                        ? `left-full ml-2 ${verticalPos}`
                        : `right-full mr-2 ${verticalPos}`;

                  return (
                    <div key={anime._id} onClick={() => navigate(`/anime/${anime.slug}`)} className="cursor-pointer flex flex-col items-center group">
                      <div className="relative z-10 w-[215px] h-[215px]  rounded-full overflow-hidden shadow-lg">
                        <img src={anime.thumbnail} alt={anime.nameEn} className="w-full h-full bg-white/90 dark:bg-gray-800 object-cover scale-110 group-hover:scale-115 transition-transform duration-300" />
                      </div>

                      <div className="-mt-[120px] w-52 bg-white dark:bg-gray-800 pt-10 px-4 text-center transition-all duration-300 relative min-h-[280px] flex flex-col">
                        <h2 className="text-lg mt-24 font-bold text-slate-800 dark:text-white truncate">{anime.nameRu}</h2>

                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 justify-center min-h-[20px]">
                          {anime.genres && anime.genres.length > 0 ? (
                            <>
                              <span className="text-purple-500 text-sm">🎭</span>
                              <span className="truncate max-w-[130px]">{anime.genres.join(", ")}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-400 text-sm">🎭</span>
                              <span className="text-gray-400 text-xs">Нет жанров</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 justify-center min-h-[20px]">
                          {anime.types && anime.types.length > 0 ? (
                            <>
                              <IoExtensionPuzzle className="text-purple-400 text-sm" />
                              <span className="truncate max-w-[130px]">{anime.types.join(", ")}</span>
                            </>
                          ) : (
                            <>
                              <IoExtensionPuzzle className="text-gray-400 text-sm" />
                              <span className="text-gray-400 text-xs">Нет типов</span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-2 mt-3">
                          <div className="flex items-center gap-2 min-h-[28px]">
                            {hasEpisodes && (
                              <>
                                <span className="inline-flex items-center gap-1 bg-purple-600/10 text-purple-600 text-xs px-2 py-1 rounded-full">
                                  <FaLayerGroup className="text-sm" /> {seasonsCount} <span className="text-gray-500">сез.</span>
                                </span>

                                <span className="inline-flex items-center gap-1 bg-emerald-600/10 text-emerald-600 text-xs px-2 py-1 rounded-full">
                                  <FaListAlt className="text-sm" /> {episodesCount} <span className="text-gray-500">сер.</span>
                                </span>
                              </>
                            )}
                            {hasMovies && (
                              <span className="inline-flex items-center gap-1 bg-emerald-600/10 text-emerald-600 text-xs px-2 py-1 rounded-full">
                                <FaListAlt className="text-sm" /> Фильмов: <span className="text-gray-500">{moviesCount}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 min-h-[24px] justify-center">
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

                        {/* info button & popover simplified to previous approach (non-fixed) */}
                        <div
                          ref={(el) => (popoverTriggerRefs.current[anime._id] = el)}
                          style={{ position: "absolute", zIndex: 40, ...INFO_BTN_POS }}
                          aria-hidden={false}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            // compute side quickly
                            try {
                              const rect = (popoverTriggerRefs.current[anime._id])!.getBoundingClientRect();
                              const centerX = rect.left + rect.width / 2;
                              const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                              const side = centerX < vw / 2 ? "right" : "left";
                              setPopoverSide((prev) => ({ ...prev, [anime._id]: side }));
                            } catch { }
                            setOpenId(anime._id);
                          }}
                          onMouseLeave={() => {
                            if (closeTimeout.current) clearTimeout(closeTimeout.current);
                            closeTimeout.current = setTimeout(() => setOpenId((cur) => (cur === anime._id ? null : cur)), 160);
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(anime._id);
                            }}
                            className="font-bold -mr-2 w-5 h-5 text-[14px] rounded-full -mb-[12px] bg-purple-700/90 text-white flex items-center justify-center transition-transform"
                          >
                            i
                          </button>

                          <div
                            role="dialog"
                            aria-label={`${anime.nameRu} info`}
                            className={`absolute ${positionClass} w-[360px] p-4 bg-white dark:bg-gray-900 text-sm rounded-lg z-50 border border-gray-200 dark:border-gray-800 shadow-lg ${openId === anime._id ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
                            style={{ minWidth: 320, maxWidth: 480, maxHeight: "70vh", overflowY: "auto" }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={() => {
                              if (closeTimeout.current) {
                                clearTimeout(closeTimeout.current);
                                closeTimeout.current = null;
                              }
                              setOpenId(anime._id);
                            }}
                            onMouseLeave={() => {
                              if (closeTimeout.current) clearTimeout(closeTimeout.current);
                              closeTimeout.current = setTimeout(() => setOpenId((cur) => (cur === anime._id ? null : cur)), 160);
                            }}
                          >
                            <h3 className="font-semibold text-base truncate">{anime.nameRu || anime.nameEn}</h3>

                            <div className="mt-2 text-xs leading-5 text-gray-700 dark:text-gray-300 transition-all duration-300" style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                              <p>{anime.description ?? "Описание отсутствует"}</p>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1">
                              {anime.genres?.slice(0, 8).map((g) => (<span key={g} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">{g}</span>))}
                              {anime.types?.slice(0, 4).map((t) => (<span key={t} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">{t}</span>))}
                            </div>

                            <div className="mt-3 text-xs text-gray-500 flex justify-between">
                              <span>Рейтинг: <strong className="text-slate-700 dark:text-slate-200">{anime.rating ?? "—"}</strong></span>
                              {hasEpisodes && (
                                <>
                                  <span>Сезонов: <strong>{seasonsCount}</strong></span>
                                  <span>Серий: <strong>{episodesCount}</strong></span>
                                </>
                              )}
                              {hasMovies && (
                                <span>Фильмов: <strong>{moviesCount}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* end info */}
                      </div>

                      <div className="bg-white dark:bg-gray-800 w-52 h-5 rounded-b-[100%]" />
                    </div>
                  );
                })}
              </div>

              {/* Load more area */}
              <div className="mt-8 flex flex-col items-center gap-3">
                {loadingMore && <div className="text-sm text-gray-600">Загрузка...</div>}
                {!loadingMore && hasMore && (
                  <button onClick={() => fetchPage(page + 1)} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm shadow">
                    Загрузить ещё
                  </button>
                )}
                {!hasMore && <div className="text-xs text-gray-500">Больше нет данных</div>}
                {/* invisible sentinel for intersection observer */}
                <div ref={loadMoreRef} style={{ width: 1, height: 1 }} />
              </div>
            </>
          )
        }
      </div >
      {/* bottom_part */}
      <div className=" flex items-center justify-center">

        <div className="hidden xl:block">
          <div className=" md:block sm:hidden w-[1100px] bg-gray-200 h-[80px] dark:bg-gray-900 rounded-b-[100%]">

          </div>


          <div className="md:block sm:hidden absolute -mt-10 -z-10 rounded-b-xl w-[1100px] bg-gray-600 h-[100px]  dark:bg-gray-800">

          </div>

          <div className="h-full flex items-center justify-center">
            <div className="w-[1040px] mt-[20px] px-4 flex items-center justify-between text-xs">
              <div className="text-gray-100/80">© {new Date().getFullYear()} Flow2Anime</div>
              <div className="flex gap-8 ">

                <Link
                  to="/anime"
                  className="text-xs  font-medium text-gray-200/90 hover:text-violet-400 transition-colors"
                >
                  Аниме
                </Link>

                <Link
                  to="/Openings"
                  className="text-xs font-medium text-gray-200/90 hover:text-violet-400 transition-colors"
                >
                  Опенинги
                </Link>

                <Link
                  to="/About"
                  className="text-xs font-medium text-gray-200/90 hover:text-violet-400 transition-colors"
                >
                  О Проекте
                </Link>

              </div>
            </div>
          </div>
        </div>

      </div>
      {/* bottom_part */}
    </div>
  );
}

export default Home;
