// src/components/Pages/OpeningEpisode.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import OpeningVideoPlayer from "./OpeningVideoPlayer";

type EpisodeRaw = {
  number: number;
  title?: string;
  url?: string;
  openingStart?: string | number;
  openingEnd?: string | number;
  endingStart?: string | number;
  endingEnd?: string | number;
  // другие поля
};

type ApiResponse = {
  anime?: any;
  season?: any;
  episode?: EpisodeRaw;
};

export default function OpeningEpisode(): JSX.Element {
  const params = useParams<{ slug?: string; seasonNumber?: string; episodeNumber?: string }>();
  const { slug, seasonNumber, episodeNumber } = params;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !seasonNumber || !episodeNumber) {
      setError("Неверный URL — отсутствуют параметры.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const urlFetch = `${import.meta.env.MODE === "production"
        ? "https://anime-1-dv13.onrender.com"
        : "http://localhost:5000"
      }/api/anime/${encodeURIComponent(slug)}/season-${encodeURIComponent(
        seasonNumber
      )}/episode-${encodeURIComponent(episodeNumber)}`;

    (async () => {
      try {
        const res = await fetch(urlFetch);
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          let body = null;
          if (ct.includes("application/json")) body = await res.json().catch(() => null);
          throw new Error((body && body.message) ? body.message : res.statusText || "Ошибка запроса");
        }
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error("Ожидался JSON, пришёл иной ответ. Начало: " + text.slice(0, 200));
        }

        const json = (await res.json()) as ApiResponse;
        setData(json);
        setLoading(false);
      } catch (err: any) {
        console.error("Fetch opening episode error:", err);
        setError(String(err?.message || err || "Неизвестная ошибка"));
        setLoading(false);
      }
    })();
  }, [slug, seasonNumber, episodeNumber]);

  if (loading) return <div className="p-6 mt-20">Загрузка эпизода...</div>;
  if (error) return <div className="p-6 mt-20 text-red-500">Ошибка: {error}</div>;
  if (!data || !data.episode) return <div className="p-6 mt-20">Эпизод не найден.</div>;

  const ep = data.episode;
  const anime = data.anime;
  const seasonNum = data.season?.seasonNumber ?? Number(seasonNumber);

  return (
    <div className="max-w-4xl mt-[100px] mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{anime?.nameRu || anime?.nameEn || slug}</h1>
      <div className="text-sm text-gray-500 mb-4">
        Сезон {seasonNum} — Серия {ep.number}
      </div>

      {/* Подключаем OpeningVideoPlayer и передаём оригинальные времена */}
      <OpeningVideoPlayer
        url={ep.url}
        openingStart={ep.openingStart}
        openingEnd={ep.openingEnd}
        endingStart={ep.endingStart}
        endingEnd={ep.endingEnd}
        autoPlayNext={true}
      />

      {ep.title && <div className="mt-4 text-lg font-medium">Название серии: {ep.title}</div>}

      <div className="mt-4">
        <Link to={`/Openings/${encodeURIComponent(slug ?? "")}`} className="text-sm underline">
          ← Назад к Openings
        </Link>
      </div>
    </div>
  );
}
