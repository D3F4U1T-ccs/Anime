import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

type AnimeCard = {
  _id: string;
  nameRu?: string | null;
  nameEn?: string | null;
  slug: string;
  thumbnail?: string | null;
  seasonsCount?: number;
  episodesCount?: number;
  openingCount?: number; // количество эпизодов с опенингом
  endingCount?: number; // количество эпизодов с эндингом
  rating?: number | null;
  firstAirYear?: number | null;
  genres?: string[];
  types?: string[];
};


function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export default function Openings(): JSX.Element {
  const [items, setItems] = useState<AnimeCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // search (like Home)
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 240);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/anime")
      .then(async (res) => {
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          let body = null;
          if (ct.includes("application/json")) body = await res.json().catch(() => null);
          throw new Error((body && body.message) ? body.message : res.statusText || "Ошибка запроса");
        }
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error("Ожидался JSON, но пришло HTML. Начало: " + text.slice(0, 200));
        }
        return res.json();
      })
      .then((json) => {
        const arr = Array.isArray(json) ? json : [];

        const mapped: AnimeCard[] = arr.map((anime: any) => {
          const seasons = Array.isArray(anime.seasons) ? anime.seasons : [];
          const seasonsCount = seasons.length;

          const episodesCount = seasons.reduce((acc: number, s: any) => {
            if (!s) return acc;
            if (Array.isArray(s.episodes)) return acc + s.episodes.length;
            if (s.episodes && typeof s.episodes === "object") return acc + Object.keys(s.episodes).length;
            return acc;
          }, 0);

          let openingCount = 0;
          let endingCount = 0;

          for (const s of seasons) {
            if (!s || !s.episodes) continue;
            const eps = Array.isArray(s.episodes) ? s.episodes : Object.values(s.episodes || {});
            for (const ep of eps) {
              const hasOpening =
                (ep?.openingStart && String(ep.openingStart).trim() !== "") ||
                (ep?.openingEnd && String(ep.openingEnd).trim() !== "");
              const hasEnding =
                (ep?.endingStart && String(ep.endingStart).trim() !== "") ||
                (ep?.endingEnd && String(ep.endingEnd).trim() !== "");

              if (hasOpening) openingCount++;
              if (hasEnding) endingCount++;
            }
          }

          const firstAirYear =
            Array.isArray(anime.dates) && anime.dates.length > 0
              ? (() => {
                const d = new Date(anime.dates[0]);
                return isNaN(d.getTime()) ? null : d.getFullYear();
              })()
              : null;

          return {
            _id: anime._id,
            nameRu: anime.nameRu ?? null,
            nameEn: anime.nameEn ?? null,
            slug: anime.slug,
            thumbnail: anime.thumbnail ?? null,
            seasonsCount,
            episodesCount,
            openingCount,
            endingCount,
            rating: anime.rating ?? null,
            firstAirYear,
            genres: Array.isArray(anime.genres) ? anime.genres : [],
            types: Array.isArray(anime.types) ? anime.types : [],
          } as AnimeCard;
        });

        setItems(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch /api/anime error:", err);
        setError(String(err?.message || err));
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return items;
    const q = debouncedQuery.toLowerCase();
    return items.filter((a) => {
      const inName =
        (a.nameRu ?? "").toLowerCase().includes(q) ||
        (a.nameEn ?? "").toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q);
      const inGenres = (a.genres ?? []).some((g) => g.toLowerCase().includes(q));
      const inTypes = (a.types ?? []).some((t) => t.toLowerCase().includes(q));
      return inName || inGenres || inTypes;
    });
  }, [items, debouncedQuery]);

  if (loading) return <div className="p-6 mt-6">Загрузка опенингов...</div>;
  if (error) return <div className="p-6 mt-6 text-red-500">Ошибка: {error}</div>;
  if (items.length === 0) return <div className="p-6 mt-6">Опеннингов не найдено.</div>;

  return (
    <div className="max-w-7xl mx-auto mt-16 p-4 sm:p-6"> {/* уменьшил отступ сверху: mt-12 -> mt-6 */}
      <header className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Опенинги / Openings</h1>
          <p className="text-sm text-gray-500 max-w-prose mt-1">Быстро находи эпизоды с OP/ED — адаптивная сетка, квадратные постеры и компактная информация.</p>
        </div>

        {/* Search input (like Home) */}
        <div className="w-full sm:w-auto mt-3 sm:mt-0">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && debouncedQuery) {
                  const first = filtered[0];
                  if (first) navigate(`/anime/${first.slug}`);
                }
              }}
              placeholder="Поиск по названию, жанру или типу..."
              className="w-full sm:w-[360px]  p-2 rounded-lg border border-gray-400 dark:border-gray-700 bg-white/90 dark:bg-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm border border-gray-200 dark:border-gray-600"
                title="Очистить"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-2">{debouncedQuery ? `Результатов: ${filtered.length}` : `Всего: ${items.length}`}</div>
        </div>
      </header>

      <div
        className="
    grid 
    grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 
    gap-6
  "
      >
        {filtered.map((a) => {
          const eps = a.episodesCount ?? 0;
          const ops = a.openingCount ?? 0;
          const eds = a.endingCount ?? 0;
          const opPercent = eps > 0 ? Math.round((ops / eps) * 100) : 0;

          return (
            <article
              key={a._id}
              className="
          relative bg-white dark:bg-gray-900 rounded-2xl shadow hover:shadow-xl
          transition-transform transform hover:-translate-y-1 overflow-hidden
          w-full max-w-[280px] sm:max-w-[420px] md:max-w-none mx-auto
        "
            >
              <Link to={`/Openings/${encodeURIComponent(a.slug)}`} className="block">
                <div className="flex flex-col md:flex-row items-stretch h-full">
                  {/* LEFT: poster — square */}
                  <div className="w-full md:w-48 lg:w-56 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
                      {a.thumbnail ? (
                        <img
                          src={a.thumbnail}
                          alt={a.nameRu || a.nameEn || a.slug}
                          className="w-full h-full object-cover"
                          // rounded corners: top on mobile, left on md+
                          style={{
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 12,
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">Нет изображения</div>
                      )}

                      {/* play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/28 rounded-full p-2">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 3v18l15-9L5 3z" fill="white" />
                          </svg>
                        </div>
                      </div>

                      {/* small badges in corner */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white text-xs font-medium px-2 py-1 rounded">▶ {ops}</div>
                        <div className="inline-flex items-center gap-2 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded">♪ {eds}</div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: info column */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 p-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg md:text-xl font-semibold leading-tight truncate">{a.nameRu || a.nameEn || a.slug}</h2>
                          <div className="text-xs text-gray-400 mt-1 truncate">{a.nameEn ? a.nameEn : a.slug}</div>
                        </div>

                        <div className="text-right ml-2 shrink-0">
                          <div className="text-xs text-gray-400">Рейтинг</div>
                          <div className="font-semibold text-lg">{a.rating ?? "—"}</div>
                          <div className="text-xs text-gray-400 mt-1">{a.firstAirYear ?? "—"}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M21 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="min-w-0">
                            <div className="text-xs text-gray-400">Сезонов</div>
                            <div className="font-medium truncate">{a.seasonsCount ?? 0}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="min-w-0">
                            <div className="text-xs text-gray-400">Эпизодов</div>
                            <div className="font-medium truncate">{a.episodesCount ?? 0}</div>
                          </div>
                        </div>

                        {/* OP / ED counters + coverage */}
                        <div className="flex flex-col items-start gap-1 min-w-0">
                          <div className="text-xs text-gray-400">OP / ED</div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium truncate">OP: {ops}</div>
                            <div className="text-sm font-medium truncate">ED: {eds}</div>
                          </div>
                          <div className="text-xs text-gray-400">{eps > 0 ? `${opPercent}% coverage` : "—"}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${clamp(opPercent)}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 5v14l14-7L5 5z" fill="currentColor" />
                          </svg>
                          Смотреть OP
                        </button>

                        <Link to={`/Openings/${encodeURIComponent(a.slug)}`} className="text-sm px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition">
                          Открыть
                        </Link>
                      </div>

                      <div className="text-xs [@media(max-width:330px)]:hidden text-gray-400">{a.firstAirYear ?? "—"}</div>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
