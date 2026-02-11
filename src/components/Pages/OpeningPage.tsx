// src/pages/OpeningPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

type Episode = {
  number: number;
  title?: string;
  url?: string;
  openingStart?: string | number | null;
  openingEnd?: string | number | null;
  endingStart?: string | number | null;
  endingEnd?: string | number | null;
};

type Season = {
  seasonNumber: number;
  episodes: Episode[];
};

type Anime = {
  _id: string;
  nameRu?: string;
  nameEn?: string;
  slug: string;
  thumbnail?: string;
  seasons?: Season[];
  description?: string;
};

function parseTimeMaybe(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  const s = String(value).trim();
  if (s === "") return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p))) return null;
    let seconds = 0;
    if (parts.length >= 1) seconds += parts[parts.length - 1];
    if (parts.length >= 2) seconds += parts[parts.length - 2] * 60;
    if (parts.length >= 3) seconds += parts[parts.length - 3] * 3600;
    return seconds;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function OpeningPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
// ready
    fetch(`https://anime-1-dv13.onrender.com/api/anime/${encodeURIComponent(slug)}`)

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
        setAnime(json);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Fetch /api/anime/:slug error:", err);
        setError(String(err?.message || err));
        setLoading(false);
      });
  }, [slug]);

  const totals = useMemo(() => {
    if (!anime || !Array.isArray(anime.seasons)) return { seasons: 0, episodes: 0, openings: 0, endings: 0, opCoverage: 0 };
    let sCount = 0;
    let eCount = 0;
    let opCount = 0;
    let edCount = 0;

    for (const s of anime.seasons) {
      if (!s) continue;
      sCount++;
      const eps = Array.isArray(s.episodes) ? s.episodes : [];
      eCount += eps.length;
      for (const ep of eps) {
        const hasOpening = (ep?.openingStart && String(ep.openingStart).trim() !== "") || (ep?.openingEnd && String(ep.openingEnd).trim() !== "");
        const hasEnding = (ep?.endingStart && String(ep.endingStart).trim() !== "") || (ep?.endingEnd && String(ep.endingEnd).trim() !== "");
        if (hasOpening) opCount++;
        if (hasEnding) edCount++;
      }
    }

    const opCoverage = eCount > 0 ? Math.round((opCount / eCount) * 100) : 0;
    return { seasons: sCount, episodes: eCount, openings: opCount, endings: edCount, opCoverage };
  }, [anime]);

  if (loading) return <div className="p-6 mt-20">Загрузка...</div>;
  if (error) return <div className="p-6 mt-20 text-red-500">Ошибка: {error}</div>;
  if (!anime) return <div className="p-6 mt-20">Аниме не найдено.</div>;

  const thumbnail = anime.thumbnail ?? "/placeholder-thumb.jpg";

  return (
    <div className="max-w-5xl mt-[80px] mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6">
        <div className="flex-shrink-0">
          <img
            src={thumbnail}
            alt={anime.nameRu || anime.nameEn || anime.slug}
            className="w-32 h-32 sm:w-48 sm:h-48 md:w-72 md:h-72 object-cover rounded-lg shadow-md"
            style={{ aspectRatio: "1/1" }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 truncate">
            {anime.nameRu}
            {anime.nameEn ? <span className="text-base font-normal text-gray-500 ml-2">({anime.nameEn})</span> : null}
          </h1>

          {anime.description && <p className="mb-3 text-sm text-gray-600 dark:text-gray-300 max-w-prose">{anime.description}</p>}

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded">
              <strong className="font-semibold mr-1">{totals.seasons}</strong> сезонов
            </div>

            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded">
              <strong className="font-semibold mr-1">{totals.episodes}</strong> серий
            </div>

            <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded">
              <strong className="font-semibold text-indigo-700 dark:text-indigo-200 mr-1">{totals.openings}</strong> OP
            </div>

            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded">
              <strong className="font-semibold text-green-700 dark:text-green-200 mr-1">{totals.endings}</strong> ED
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-gray-100 dark:bg-neutral-800">
              OP coverage: <strong className="ml-1">{totals.opCoverage}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Seasons & episodes */}
      <div className="space-y-6">
        {Array.isArray(anime.seasons) && anime.seasons.length > 0 ? (
          anime.seasons.map((season) => (
            <section key={season.seasonNumber} className="bg-white dark:bg-gray-900 rounded-lg p-3 sm:p-4 shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">Сезон {season.seasonNumber}</div>
                  <div className="text-sm text-gray-500">{season.episodes?.length ?? 0} эпизодов</div>
                </div>

                <div className="text-sm">
                  {season.episodes && season.episodes.length > 0 ? (
                    <Link
                      to={`/Openings/${encodeURIComponent(anime.slug)}/season/${season.seasonNumber}/episode/${season.episodes[0].number}`}
                      className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition"
                    >
                      Открыть сезон
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {season.episodes && season.episodes.length > 0 ? (
                  season.episodes.map((ep) => {
                    const opStart = parseTimeMaybe(ep.openingStart ?? null);
                    const opEnd = parseTimeMaybe(ep.openingEnd ?? null);
                    const edStart = parseTimeMaybe(ep.endingStart ?? null);
                    const edEnd = parseTimeMaybe(ep.endingEnd ?? null);
                    const opLen = opStart !== null && opEnd !== null ? opEnd - opStart : null;
                    const edLen = edStart !== null && edEnd !== null ? edEnd - edStart : null;

                    const hasOpening =
                      (ep.openingStart && String(ep.openingStart).trim() !== "") ||
                      (ep.openingEnd && String(ep.openingEnd).trim() !== "");
                    const hasEnding =
                      (ep.endingStart && String(ep.endingStart).trim() !== "") ||
                      (ep.endingEnd && String(ep.endingEnd).trim() !== "");

                    return (
                      <Link
                        key={ep.number}
                        to={`/Openings/${encodeURIComponent(anime.slug)}/season/${season.seasonNumber}/episode/${ep.number}`}
                        className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:shadow-md transition min-w-0"
                        aria-label={`Открыть серию ${ep.number}`}
                      >
                        {/* Left: thumbnail + title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-neutral-800">
                            <img src={thumbnail} alt={`thumb ep ${ep.number}`} className="w-full h-full object-cover" />
                          </div>

                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              Серия {ep.number}
                              {ep.title ? ` — ${ep.title}` : ""}
                            </div>
                            {ep.title && <div className="text-sm text-gray-500 truncate">{ep.title}</div>}
                          </div>
                        </div>

                        {/* Middle: OP/ED badges (теперь адаптивные) */}
                        <div className="flex flex-wrap gap-2 items-start ml-2 sm:flex-1 sm:items-center min-w-0">
                          {hasOpening ? (
                            opLen !== null ? (
                              <div className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-sm break-words max-w-full">
                                OP {formatTime(opLen)} ({String(ep.openingStart)} → {String(ep.openingEnd)})
                              </div>
                            ) : (
                              <div className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-sm break-words max-w-full">
                                OP: {String(ep.openingStart ?? ep.openingEnd)}
                              </div>
                            )
                          ) : (
                            <div className="px-2 py-1 bg-gray-50 text-gray-400 rounded text-sm">OP —</div>
                          )}

                          {hasEnding ? (
                            edLen !== null ? (
                              <div className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm break-words max-w-full">
                                ED {formatTime(edLen)} ({String(ep.endingStart)} → {String(ep.endingEnd)})
                              </div>
                            ) : (
                              <div className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm break-words max-w-full">
                                ED: {String(ep.endingStart ?? ep.endingEnd)}
                              </div>
                            )
                          ) : (
                            <div className="px-2 py-1 bg-gray-50 text-gray-400 rounded text-sm">ED —</div>
                          )}
                        </div>

                        {/* Right: meta */}
                        <div className="text-xs text-gray-400 self-end sm:self-center sm:ml-auto shrink-0">
                          Сезон {season.seasonNumber} · <span className="px-2 py-1 bg-gray-100 rounded">Эп. {ep.number}</span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-gray-500">Эпизоды не найдены</div>
                )}

              </div>
            </section>
          ))
        ) : (
          <div className="text-gray-500">Сезонов не найдено.</div>
        )}
      </div>
    </div>
  );
}
