import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdDateRange } from "react-icons/md";
import { FaStar, FaLayerGroup, FaListAlt } from "react-icons/fa";
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
  seasons?: { seasonNumber: number; episodes?: { number: number }[] }[]; // добавлено
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
      <div className="flex justify-center items-center min-h-[60vh] mt-[200px] text-xl">
        <div className="flex flex-row gap-2">
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.3s]"></div>
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.5s]"></div>
        </div>
      </div>
    );

  return (

    <div className="max-w-[1100px] mx-auto mt-[300px] bg-gray-300 dark:bg-gray-600 px-4 sm:px-8 py-10">
      <div className="Up_part- bg-gray-300  hidden xl:flex    dark:bg-gray-600 absolute w-[1100px] -ml-[32px] -mt-[100px] h-[60px] rounded-t-[100%] ">
      </div>
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 text-center">
        Аниме
      </h1>

      {animeList.length === 0 ? (
        <p className="text-center text-slate-600 dark:text-slate-400">Аниме пока нет 😢</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {animeList.map((anime) => {
            const seasonsCount = anime.seasons?.length ?? 0;
            const episodesCount =
              anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;

            return (
              <div
                key={anime._id}
                onClick={() => navigate(`/anime/${anime.slug}`)}
                className="cursor-pointer flex flex-col items-center group"
              >
                <div className="relative z-10 w-[215px] h-[215px] rounded-full overflow-hidden shadow-lg">
                  <img
                    src={anime.thumbnail}
                    alt={anime.nameEn}
                    className="w-full h-full object-cover scale-110 group-hover:scale-115 transition-transform duration-300"
                  />
                </div>

                <div className="-mt-[120px] w-52 bg-white dark:bg-gray-800 pt-10  px-4 text-center shadow-md transition-all duration-300 group-hover:shadow-xl">
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

                  {/* Счётчики сезонов/серий и рейтинг/даты */}
                  <div className="flex flex-col items-center gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-indigo-600/10 text-indigo-500 text-xs px-2 py-1 rounded-full">
                        <FaLayerGroup className="text-sm" /> <span className="font-medium">{seasonsCount}</span>
                        <span className="text-xs ml-1 text-gray-500">сез.</span>
                      </span>

                      <span className="inline-flex items-center gap-1 bg-emerald-600/10 text-emerald-600 text-xs px-2 py-1 rounded-full">
                        <FaListAlt className="text-sm" /> <span className="font-medium">{episodesCount}</span>
                        <span className="text-xs ml-1 text-gray-500">сер.</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold">
                        <FaStar />{anime.rating}
                      </span>
                      {anime.dates?.length > 0 && (
                        <span className="flex items-center text-xs text-gray-500">
                          <MdDateRange className="mr-1" />
                          {anime.dates.length > 2 ? `${anime.dates.slice(0, 2).join(", ")}...` : anime.dates.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 w-52 h-5 rounded-b-[100%]"></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Home;