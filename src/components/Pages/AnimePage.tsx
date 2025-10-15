import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Episode {
  number: number;
  url: string;
}

interface Anime {
  _id: string;
  name: string;
  date: string;
  rating: number;
  description: string;
  thumbnail: string;
  episodes: Episode[];
}

function AnimePage() {
  const { id } = useParams();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:5000/api/anime/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Аниме не найдено");
        return res.json();
      })
      .then((data) => setAnime(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center mt-10 text-lg">Загрузка...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;
  if (!anime) return null;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <img
          src={anime.thumbnail}
          alt={anime.name}
          className="w-full md:w-1/3 rounded-xl shadow-lg object-cover"
        />
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{anime.name}</h1>
          <p className="text-slate-600 dark:text-slate-300">{anime.description}</p>
          <p className="text-yellow-500 font-semibold">⭐ {anime.rating}</p>
          <p className="text-slate-500 text-sm">📅 {anime.date}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4 text-slate-800 dark:text-white">
        Серии
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {anime.episodes.map((ep) => (
          <a
            key={ep.number}
            href={ep.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-500 text-white p-3 rounded-lg hover:bg-indigo-600 text-center transition"
          >
            Смотреть {ep.number}-ю серию
          </a>
        ))}
      </div>
    </div>
  );
}

export default AnimePage;
