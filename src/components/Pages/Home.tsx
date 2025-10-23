// Home.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdDateRange } from "react-icons/md";
import { FaStar, FaLayerGroup, FaListAlt } from "react-icons/fa";
import { IoExtensionPuzzle } from "react-icons/io5";

interface Episode {
  number: number;
}

interface Season {
  seasonNumber: number;
  episodes?: Episode[];
}

interface Anime {
  _id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  dates: string[]; // e.g. ["2021", "2022"] or ["Ongoing"]
  rating: number;
  thumbnail: string;
  genres?: string[];
  types?: string[];
  description?: string;
  seasons?: Season[];
}

function Home() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimeout = useRef<number | null>(null);
  const navigate = useNavigate();

  // search
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<number | null>(null);

  // filters modal
  const [showFilters, setShowFilters] = useState(false);

  // filter selections (applied)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedYearCategory, setSelectedYearCategory] = useState<string | null>(null); // one-of
  const [selectedSort, setSelectedSort] = useState<string>("rating"); // rating | alphabet | episodes | year

  // temp selections in modal (so user can cancel)
  const [tempGenres, setTempGenres] = useState<string[]>([]);
  const [tempTypes, setTempTypes] = useState<string[]>([]);
  const [tempYearCategory, setTempYearCategory] = useState<string | null>(null);
  const [tempSort, setTempSort] = useState<string>("rating");

  // --- визуальные настройки ---
  const POP_POSITION: "top" | "bottom" = "top";
  const INFO_BTN_POS: { top?: string; right?: string; bottom?: string; left?: string } = {
    right: "0.75rem",
    bottom: "0.75rem",
  };
  // --------------------------------------------

  useEffect(() => {
    fetch("http://localhost:5000/api/anime")
      .then((res) => res.json())
      .then((data) => setAnimeList(data))
      .catch((err) => console.error("Ошибка загрузки аниме:", err))
      .finally(() => setLoading(false));
  }, []);

  // ----------  полный справочник жанров/типов (показываем всегда)  ----------
  // Добавь/удали значения по желанию — это список всех опций, которые будут видны в фильтрах,
  // даже если пока нет карточки с таким жанром/типом.
  const ALL_GENRES = [
    "Приключения",
    "Боевик",
    "Комедия",
    "Повседневность",
    "Романтика",
    "Драма",
    "Фантастика",
    "Фэнтези",
    "Мистика",
    "Детектив",
    "Триллер",
    "Психология",
  ];

  const ALL_TYPES = [
    "Боевые искусства",
    "История",
    "Меха",
    "Полиция",
    "Ужасы",
    "Вампиры",
    "Демоны",
    "Космос",
    "Музыка",
    "Самураи",
    "Спорт",
    "Школа",
    "Военное",
    "Игры",
    "Магия",
    "Пародия",
    "Сёнен",
    "Суперсила",
  ];
  //-----------------------------------------------------------------

  // build sets of available genres/types from loaded list (to keep union for suggestions we include ALL_*)
  const availableGenres = useMemo(() => {
    // union: все возможные + те, что есть в базе (уникально и отсортировано)
    const set = new Set<string>(ALL_GENRES);
    animeList.forEach((a) => a.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [animeList]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>(ALL_TYPES);
    animeList.forEach((a) => a.types?.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [animeList]);

  // debounce text query
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 240);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // helper: parse numeric years from a.dates
  const parseYears = (dates?: string[]) => {
    if (!dates || dates.length === 0) return [];
    const years: number[] = [];
    for (const d of dates) {
      const match = d.match(/(19|20)\d{2}/g); // finds 1900-2099
      if (match) {
        for (const m of match) years.push(Number(m));
      }
    }
    return Array.from(new Set(years)).sort((a, b) => a - b);
  };

  // helper: detect 'ongoing' style in dates
  const isOngoing = (dates?: string[]) => {
    if (!dates) return false;
    return dates.some((d) => /ongoing|on-going|онгоинг|онгоин|выпускается/i.test(d) || /\.\.\./.test(d));
  };

  // maps anime to whether it matches a year category string
  const matchYearCategory = (anime: Anime, category: string | null) => {
    if (!category) return true;
    if (category === "Онгоинг") return isOngoing(anime.dates);
    const years = parseYears(anime.dates);
    if (years.length === 0) return false;
    // диапазоны
    if (category === "до 2000") return Math.max(...years) < 2000;
    if (category === "2000-2007") return years.some((y) => y >= 2000 && y <= 2007);
    if (category === "2008-2014") return years.some((y) => y >= 2008 && y <= 2014);
    if (category === "2015-2021") return years.some((y) => y >= 2015 && y <= 2021);
    // single-year categories (если попали на строку "2024" и т.п.)
    const single = Number(category);
    if (!Number.isNaN(single)) return years.includes(single);
    return false;
  };

  // compose filtered list: text search (debounced) + filters
  const filteredList = useMemo(() => {
    let list = animeList.filter((a) => {
      
      // жанры: если выбран хотя бы 1 -> у аниме должен быть хотя бы один из них
      if (selectedGenres.length > 0) {
        if (!a.genres || !a.genres.some((g) => selectedGenres.includes(g))) return false;
      }

      // типы
      if (selectedTypes.length > 0) {
        if (!a.types || !a.types.some((t) => selectedTypes.includes(t))) return false;
      }

      // год
      if (selectedYearCategory) {
        if (!matchYearCategory(a, selectedYearCategory)) return false;
      }

      return true;
    });

    // сортировка
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

  // modal helpers (apply/cancel)
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
    // сразу сбросим применённые фильтры
    setSelectedGenres([]);
    setSelectedTypes([]);
    setSelectedYearCategory(null);
    setSelectedSort("rating");
  };

  const toggleTempGenre = (g: string) => {
    setTempGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  };

  const toggleTempType = (t: string) => {
    setTempTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const yearCategories = [
    "Онгоинг",
    "2025",
    "2024",
    "2023",
    "2022",
    "2015-2021",
    "2008-2014",
    "2000-2007",
    "до 2000",
  ];

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

  // ----- helper: отображаем активные чипы фильтров над списком -----
  const activeChips = [...selectedGenres, ...selectedTypes, selectedYearCategory ? [selectedYearCategory] : []].flat().filter(Boolean) as string[];

  return (

    <div className="max-w-[1100px] mx-auto mt-[300px] bg-gray-200 dark:bg-gray-900  px-4 sm:px-8 py-10">

      <div className="Up_part- bg-gray-200 hidden xl:flex dark:bg-gray-900 absolute w-[1100px] -ml-[32px] -mt-[100px] h-[60px] rounded-t-[100%]" />
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 text-center">Смотреть лучшие аниме</h1>

      {/* Search + Filters */}
      <div className="max-w-[920px] mx-auto mb-6">
        <div className="flex items-center gap-3">
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
              : `Всего: ${animeList.length}`}
          </div>
          <div className="text-gray-500">Нажмите Enter — открыть первый результат</div>
        </div>

        {/* active chips */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((c) => (
              <div
                key={c}
                className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-sm px-3 py-1 rounded-full"
              >
                <span className="text-sm">{c}</span>
                <button
                  onClick={() => {
                    // удаляем чип из применённых фильтров
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

      {/* Filters modal (centered) */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFilters(false)} aria-hidden />

          {/* modal window */}
          <div className="relative z-10 w-[95%] max-w-[980px] bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-lg shadow-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Фильтры</h2>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    resetFilters();
                    // обновим temp чтобы UI тоже очистился
                    setTempGenres([]);
                    setTempTypes([]);
                    setTempYearCategory(null);
                    setTempSort("rating");
                  }}
                  className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
                >
                  Сбросить
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
                  title="Закрыть"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Genres */}
              <div>
                <h3 className="text-md font-medium text-purple-300 mb-2">Жанр</h3>
                <div className="flex flex-col gap-2 max-h-[340px] overflow-auto pr-2">
                  {availableGenres.map((g) => {
                    const selected = tempGenres.includes(g);
                    return (
                      <label
                        key={g}
                        className={`inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded ${selected ? "bg-purple-700/30" : "hover:bg-white/5"}`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleTempGenre(g)}
                          className="w-4 h-4 accent-purple-500"
                        />
                        <span className="truncate">{g}</span>
                        {/* optional: show count or notice if no anime has this genre */}

                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Types */}
              <div>
                <h3 className="text-md font-medium text-purple-300 mb-2">Тип</h3>
                <div className="flex flex-col gap-2 max-h-[340px] overflow-auto pr-2">
                  {availableTypes.map((t) => {
                    const selected = tempTypes.includes(t);
                    return (
                      <label
                        key={t}
                        className={`inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded ${selected ? "bg-purple-700/30" : "hover:bg-white/5"}`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleTempType(t)}
                          className="w-4 h-4 accent-purple-500"
                        />
                        <span className="truncate">{t}</span>

                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Year */}
              <div>
                <h3 className="text-md font-medium text-purple-300 mb-2">Год выпуска</h3>
                <div className="flex flex-col gap-2">
                  {yearCategories.map((yc) => (
                    <label key={yc} className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                      <input
                        type="radio"
                        checked={!!(tempYearCategory === yc)}
                        onChange={() => setTempYearCategory((cur) => (cur === yc ? null : yc))}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span>{yc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-md font-medium text-purple-300 mb-2">Сортировка</h3>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                    <input
                      type="radio"
                      name="sort"
                      checked={!!(tempSort === "rating")}
                      onChange={() => setTempSort("rating")}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span>По рейтингу</span>
                  </label>

                  <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                    <input
                      type="radio"
                      name="sort"
                      checked={!!(tempSort === "alphabet")}
                      onChange={() => setTempSort("alphabet")}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span>По алфавиту</span>
                  </label>

                  <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                    <input
                      type="radio"
                      name="sort"
                      checked={!!(tempSort === "episodes")}
                      onChange={() => setTempSort("episodes")}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span>По кол-ву серий</span>
                  </label>

                  <label className="inline-flex items-center gap-3 text-sm cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                    <input
                      type="radio"
                      name="sort"
                      checked={!!(tempSort === "year")}
                      onChange={() => setTempSort("year")}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span>По году выхода</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
              >
                Отмена
              </button>
              <button
                onClick={() => applyFilters()}
                className="px-4 py-2 rounded bg-gradient-to-br from-purple-600 to-purple-500 text-white text-sm shadow"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* main list */}
      {filteredList.length === 0 ? (
        <div className="max-w-[920px] mx-auto mt-10 text-center">
          <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold">Не удалось найти аниме с выбранными фильтрами 😕</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Попробуйте убрать часть фильтров или выполнить более общий поиск.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredList.map((anime) => {
            const seasonsCount = anime.seasons?.length ?? 0;
            const episodesCount =
              anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;

            return (
              <div
                key={anime._id}
                onClick={() => navigate(`/anime/${anime.slug}`)}
                className="cursor-pointer flex flex-col  items-center group"
              >
                <div className="relative z-10 w-[215px] h-[215px] rounded-full overflow-hidden shadow-lg">
                  <img
                    src={anime.thumbnail}
                    alt={anime.nameEn}
                    className="w-full h-full object-cover scale-110 group-hover:scale-115 transition-transform duration-300"
                  />
                </div>

                <div className="-mt-[120px] w-52 bg-white dark:bg-gray-800 pt-10 px-4 text-center transition-all duration-300 relative ">
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
                      <IoExtensionPuzzle className="text-purple-400 text-sm" />
                      <span className="truncate max-w-[130px]">{anime.types.join(", ")}</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-purple-600/10 text-purple-600 text-xs px-2 py-1 rounded-full">
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
                    onMouseEnter={() => {
                      if (closeTimeout.current) {
                        window.clearTimeout(closeTimeout.current);
                        closeTimeout.current = null;
                      }
                      setOpenId(anime._id);
                    }}
                    onMouseLeave={() => {
                      if (closeTimeout.current) window.clearTimeout(closeTimeout.current);
                      closeTimeout.current = window.setTimeout(() => {
                        setOpenId((cur) => (cur === anime._id ? null : cur));
                        closeTimeout.current = null;
                      }, 160);
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(anime._id);
                      }}
                      className="font-bold w-6 h-6 rounded-full -mb-[12px] bg-purple-700/90 text-white flex items-center justify-center transition-transform"
                    >
                      i
                    </button>

                    {/* модалка-инфо */}
                    <div
                      role="dialog"
                      aria-label={`${anime.nameRu} info`}
                      className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-out ${POP_POSITION === "top" ? "bottom-[130%]" : "top-full mt-2"
                        } w-[360px] p-4 bg-white dark:bg-gray-900 text-sm rounded-lg z-50 border border-gray-200 dark:border-gray-800 shadow-lg ${openId === anime._id ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                        }`}
                      style={{
                        minWidth: 320,
                        maxWidth: 480,
                        maxHeight: "70vh",
                        overflowY: "auto",
                      }}
                    >
                      <h3 className="font-semibold text-base truncate">{anime.nameRu || anime.nameEn}</h3>

                      <div className="mt-2 text-xs leading-5 text-gray-700 dark:text-gray-300 transition-all duration-300" style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
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

                      <div className="mt-3 text-xs text-gray-500 flex justify-between">
                        <span>Рейтинг: <strong className="text-slate-700 dark:text-slate-200">{anime.rating ?? "—"}</strong></span>
                        <span>Сезонов: <strong>{seasonsCount}</strong></span>
                        <span>Серий: <strong>{episodesCount}</strong></span>
                      </div>
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
