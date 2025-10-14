import { useEffect, useState } from "react";

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

function Home() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/anime")
      .then((res) => res.json())
      .then((data) => setAnimeList(data))
      .catch((err) => console.error("Ошибка загрузки аниме:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="flex justify-center items-center min-h-[60vh] text-xl">Загрузка...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6 text-center">
        📺 Популярное аниме
      </h1>

      {animeList.length === 0 ? (
        <p className="text-center text-slate-600 dark:text-slate-400">
          Пока нет добавленных аниме 😢
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {animeList.map((anime) => (
            <div
              key={anime._id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transform transition hover:-translate-y-1 hover:shadow-xl"
            >
              <img
                src={anime.thumbnail}
                alt={anime.name}
                className="w-full h-56 object-cover"
              />
              <div className="p-4 flex flex-col gap-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                  {anime.name}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {anime.description}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-yellow-500 font-semibold">
                    ⭐ {anime.rating}
                  </span>
                  <span className="text-xs text-slate-500">{anime.date}</span>
                </div>
                <button
                  className="mt-3 bg-indigo-500 text-white rounded-lg py-2 hover:bg-indigo-600 transition"
                  onClick={() => (window.location.href = `/anime/${anime._id}`)}
                >
                  Смотреть
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
