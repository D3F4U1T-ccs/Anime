// src/pages/OpeningPage.tsx
import { useEffect, useState } from "react";
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

    // <-- ВАЖНОЕ изменение: берём полные данные из /api/anime/:slug,
    // потому что /api/openings/:slug специально удаляет поля opening*.
    fetch(`/api/anime/${encodeURIComponent(slug)}`)
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

  if (loading) return <div className="p-6 mt-20">Загрузка...</div>;
  if (error) return <div className="p-6 mt-20 text-red-500">Ошибка: {error}</div>;
  if (!anime) return <div className="p-6 mt-20">Аниме не найдено.</div>;

  const totalSeasons = Array.isArray(anime.seasons) ? anime.seasons.length : 0;
  const totalEpisodes = Array.isArray(anime.seasons)
    ? anime.seasons.reduce((sum, s) => sum + (Array.isArray(s.episodes) ? s.episodes.length : 0), 0)
    : 0;

  const thumbnail = anime.thumbnail ?? "/placeholder-thumb.jpg";

  return (
    <div className="max-w-5xl mt-[100px] mx-auto p-6">
      <div className="flex items-start gap-6 mb-6">
        <img
          src={thumbnail}
          alt={anime.nameRu || anime.nameEn || anime.slug}
          className="w-[300px] h-[300px] object-cover rounded-lg shadow-md flex-shrink-0"
        />
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {anime.nameRu}
            {anime.nameEn ? <span className="text-lg font-normal text-gray-400 ml-3">({anime.nameEn})</span> : null}
          </h1>
          {anime.description && <p className="mb-3 text-gray-600 max-w-[720px]">{anime.description}</p>}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div>
              Сезонов: <span className="font-medium text-gray-800 dark:text-gray-200 ml-1">{totalSeasons}</span>
            </div>
            <div>
              Эпизодов: <span className="font-medium text-gray-800 dark:text-gray-200 ml-1">{totalEpisodes}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Array.isArray(anime.seasons) && anime.seasons.length > 0 ? (
          anime.seasons.map((season) => (
            <section key={season.seasonNumber} className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xl font-semibold">Сезон {season.seasonNumber}</div>
                  <div className="text-sm text-gray-500">{season.episodes?.length ?? 0} эпизодов</div>
                </div>

                <div className="text-sm text-gray-400">
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

                    return (
                      <Link
                        key={ep.number}
                        to={`/Openings/${encodeURIComponent(anime.slug)}/season/${season.seasonNumber}/episode/${ep.number}`}
                        className="w-full flex items-center gap-4 p-3 border rounded-lg hover:shadow-md transition"
                        aria-label={`Открыть серию ${ep.number}`}
                      >
                        {/* Left: thumbnail + title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={thumbnail}
                            alt={`thumb ep ${ep.number}`}
                            className="w-20 h-20 object-cover rounded-full flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              Серия {ep.number}
                              {ep.title ? ` — ${ep.title}` : ""}
                            </div>
                            {ep.title && <div className="text-sm text-gray-500 truncate">{ep.title}</div>}
                          </div>
                        </div>

                        {/* Middle: OP/ED badges */}
                        <div className="ml-4 flex-1 flex flex-wrap gap-2 items-center">
                          {opLen !== null ? (
                            <div className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-sm">
                              OP {formatTime(opLen)} ({ep.openingStart} → {ep.openingEnd})
                            </div>
                          ) : (ep.openingStart !== undefined && ep.openingStart !== null && String(ep.openingStart).trim() !== "") || (ep.openingEnd !== undefined && ep.openingEnd !== null && String(ep.openingEnd).trim() !== "") ? (
                            <div className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-sm">
                              OP: {ep.openingStart ?? ep.openingEnd}
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-sm">OP —</div>
                          )}

                          {edLen !== null ? (
                            <div className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                              ED {formatTime(edLen)} ({ep.endingStart} → {ep.endingEnd})
                            </div>
                          ) : (ep.endingStart !== undefined && ep.endingStart !== null && String(ep.endingStart).trim() !== "") || (ep.endingEnd !== undefined && ep.endingEnd !== null && String(ep.endingEnd).trim() !== "") ? (
                            <div className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                              ED: {ep.endingStart ?? ep.endingEnd}
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-sm">ED —</div>
                          )}
                        </div>

                        {/* Right: meta area */}
                        <div className="ml-auto flex items-center gap-3">
                          <div className="text-sm text-gray-400">Сезон {season.seasonNumber}</div>
                          <div className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">Эп. {ep.number}</div>
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
