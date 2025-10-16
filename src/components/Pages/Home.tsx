import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Anime {
  _id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  date: string;
  rating: number;
  description: string;
  thumbnail: string;
  genres?: string[];
}

function Home() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/anime")
      .then((res) => res.json())
      .then((data) => setAnimeList(data))
      .catch((err) => console.error("Ошибка загрузки аниме:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-xl">
        Загрузка...
      </div>
    );

  return (
    <div className="max-w-[1000px] bg-slate-400 mt-56 mx-auto px-4 sm:px-8 py-10">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 text-center">
        📺 Популярное аниме
      </h1>

      {animeList.length === 0 ? (
        <p className="text-center text-slate-600 dark:text-slate-400">
          Аниме пока нет 😢
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {animeList.map((anime) => (
            <div
              key={anime._id}
              onClick={() => navigate(`/anime/${anime.slug}`)}
              className="cursor-pointer flex flex-col items-center group"
            >
              {/* картинка */}
              <div className="relative z-10 w-52 h-52 rounded-full overflow-hidden shadow-lg">
                <img
                  src={anime.thumbnail}
                  alt={anime.nameEn}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* нижний блок */}
              <div className="-mt-[120px] w-52 bg-white dark:bg-slate-800 rounded-3xl pt-10 pb-6 px-4 text-center shadow-md transition-all duration-300 group-hover:shadow-xl">
                <h2 className="text-lg mt-24 font-bold text-slate-800 dark:text-white truncate">
                  {anime.nameRu}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                  {anime.description}
                </p>
                <div className="flex justify-center items-center gap-3 mt-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold">
                    ★ {anime.rating}
                  </span>
                  <span>{anime.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
