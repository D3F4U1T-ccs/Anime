// src/components/Pages/AnimeEpisode.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

interface Episode {
  number: number;
  url: string;
}

interface Season {
  seasonNumber: number;
  episodes: Episode[];
}

interface Anime {
  _id: string;
  nameRu: string;
  description: string;
  slug: string;
  thumbnail: string;
  rating: number;
  seasons: Season[];
}

export default function AnimeEpisode() {
  const { slug, seasonNumber, episodeNumber } = useParams();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodeUrl, setEpisodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/anime/${slug}/season-${seasonNumber}/episode-${episodeNumber}`
        );
        const data = await res.json();
        console.log("📦 Ответ API:", data);

        if (!data || !data.anime) {
          setAnime(null);
          setEpisodeUrl(null);
          return;
        }

        setAnime(data.anime);

        // 🔹 Найдём текущую серию по номеру
        const season = data.anime.seasons?.find(
          (s: Season) => s.seasonNumber === Number(seasonNumber)
        );
        const episode = season?.episodes?.find(
          (e: Episode) => e.number === Number(episodeNumber)
        );

        // 🔹 Если есть URL — сохраняем, иначе ставим пустой
        setEpisodeUrl(episode?.url || null);
      } catch (err) {
        console.error("Ошибка при загрузке эпизода:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [slug, seasonNumber, episodeNumber]);

  if (loading) return <div className="text-center mt-10 text-gray-400">Загрузка...</div>;
  if (!anime) return <div className="text-center mt-10 text-red-400">Аниме не найдено</div>;

  const season = anime.seasons.find((s) => s.seasonNumber === Number(seasonNumber));

  return (
    <div className="max-w-5xl mx-auto mt-[100px] text-white p-4">
      <h1 className="text-3xl font-bold mb-3">{anime.nameRu}</h1>
      <p className="text-gray-400 mb-6">{anime.description}</p>

      {/* 🎬 Плеер */}
      {episodeUrl ? (
        <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-700">
          <iframe
            src={episodeUrl}
            title={`Episode ${episodeNumber}`}
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        </div>
      ) : (
        <div className="text-center text-gray-400 mt-10">
          Эпизод не найден или не имеет ссылки.
        </div>
      )}

      {/* 🔢 Список серий */}
      {season && (
        <div className="flex flex-wrap gap-2 mt-6">
          {season.episodes.map((ep) => (
            <Link
              key={ep.number}
              to={`/anime/${slug}/season/${seasonNumber}/episode/${ep.number}`}
              className={`px-4 py-2 rounded-lg border transition-all ${
                ep.number === Number(episodeNumber)
                  ? "bg-blue-600 border-blue-600"
                  : "border-gray-600 hover:bg-gray-700"
              }`}
            >
              Серия {ep.number}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
