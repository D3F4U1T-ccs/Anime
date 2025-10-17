import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdDateRange } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { IoExtensionPuzzle } from "react-icons/io5";
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
              <div className="relative z-10 w-[210px] h-[210px] rounded-full overflow-hidden shadow-lg">
                <img
                  src={anime.thumbnail}
                  alt={anime.nameEn}
                  className="w-full h-full object-cover scale-110 group-hover:scale-115 transition-transform duration-300"
                />
              </div>


              <div className="-mt-[120px] w-52 bg-white dark:bg-slate-800  pt-10 pb-6 px-4 text-center shadow-md transition-all duration-300 group-hover:shadow-xl">
                <h2 className="text-lg mt-24 font-bold text-slate-800 dark:text-white truncate">
                  {anime.nameRu}
                </h2>

                {/* Жанры */}
                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 w-full justify-center">
                    <span className="text-purple-500 text-sm shrink-0">🎭</span>
                    <span className="truncate max-w-[130px]">{anime.genres.join(", ")}</span>
                  </div>
                )}

                {/* Типы */}
                {anime.types && anime.types.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 w-full justify-center">
                    <IoExtensionPuzzle className="text-blue-500 text-sm shrink-0" />
                    <span className="truncate max-w-[130px]">{anime.types.join(", ")}</span>
                  </div>
                )}



                <div className=" absolute flex justify-center overflow-hidden items-center gap-3 mt-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold">
                    <FaStar />{anime.rating}
                  </span>
                  {anime.dates?.length > 0 && (
                    <span className="flex items-center">
                      <MdDateRange className="mr-1" />
                      {anime.dates.length > 2
                        ? `${anime.dates.slice(0, 2).join(", ")}...`
                        : anime.dates.join(", ")}
                    </span>
                  )}


                </div>

              </div>
              <div className="dark:bg-gray-800 bg-white w-52 h-5 adsolute  rounded-b-[100%]   ">
              </div>
            </div>
          ))}
        </div>
      )}


    </div>
  );
}

export default Home;
