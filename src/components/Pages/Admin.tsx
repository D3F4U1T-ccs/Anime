import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

interface Episode {
  number: number;
  url: string;
  title?: string;
  openingStart?: string;
  openingEnd?: string;
  endingStart?: string;
  endingEnd?: string;
}

interface Season {
  seasonNumber: number;
  episodes: Episode[];
}

interface AnimeData {
  nameRu: string;
  nameEn: string;
  slug: string;
  dates: string[];
  rating: string; // хранить как строку для инпута
  description: string;
  thumbnail: string;
  genres: string[];
  types: string[];
  seasons: Season[];
}

const GENRES = [
  "Приключения", "Боевик", "Комедия", "Повседневность", "Романтика",
  "Драма", "Фантастика", "Фэнтези", "Мистика", "Детектив", "Триллер", "Психология"
];

const TYPES = [
  "Боевые искусства", "Вампиры", "Военное", "Демоны", "Игры", "История",
  "Космос", "Магия", "Меха", "Музыка", "Самураи", "Сёнен",
  "Спорт", "Суперсила", "Ужасы", "Школа"
];

function Admin() {
  const [anime, setAnime] = useState<AnimeData>({
    nameRu: "",
    nameEn: "",
    slug: "",
    dates: [""],
    rating: "",
    description: "",
    thumbnail: "",
    genres: [],
    types: [],
    seasons: [{ seasonNumber: 1, episodes: [] }],
  });

  const [msg, setMsg] = useState("");
  const [slugError, setSlugError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // 🔒 Проверка администратора
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:5000/api/check-admin", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Нет доступа");
        return res.json();
      })
      .catch(() => navigate("/"));
  }, [token, navigate]);

  // 📝 Обновление полей
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "nameEn") {
      const generatedSlug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setAnime(prev => ({ ...prev, nameEn: value, slug: generatedSlug }));
      setSlugError("");
    } else if (name === "slug") {
      const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (cleaned !== value) {
        setSlugError("❌ Slug может содержать только латиницу, цифры и дефисы");
      } else setSlugError("");
      setAnime(prev => ({ ...prev, slug: cleaned }));
    } else if (name === "rating") {
      setAnime(prev => ({ ...prev, rating: value })); // rating как строка
    } else {
      setAnime(prev => ({ ...prev, [name]: value }));
    }
  };

  // 🎭 Жанры
  const toggleGenre = (genre: string) => {
    setAnime(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  // 📂 Типы
  const toggleType = (type: string) => {
    setAnime(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type],
    }));
  };

  // ➕ Сезоны
  const addSeason = () => {
    setAnime(prev => ({
      ...prev,
      seasons: [
        ...prev.seasons,
        { seasonNumber: prev.seasons.length + 1, episodes: [] },
      ],
    }));
  };

  const deleteSeason = (index: number) => {
    setAnime(prev => {
      const newSeasons = prev.seasons.filter((_, i) => i !== index);
      return {
        ...prev,
        seasons: newSeasons.map((s, i) => ({ ...s, seasonNumber: i + 1 })),
      };
    });
  };

  // ➕ Серии
  const addEpisode = (sIdx: number) => {
    setAnime(prev => {
      const newSeasons = [...prev.seasons];
      const newEpisodes = [...newSeasons[sIdx].episodes];
      newEpisodes.push({
        number: newEpisodes.length + 1,
        url: "",
      });
      newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
      return { ...prev, seasons: newSeasons };
    });
  };

  const deleteEpisode = (sIdx: number, eIdx: number) => {
    setAnime(prev => {
      const newSeasons = [...prev.seasons];
      const newEpisodes = [...newSeasons[sIdx].episodes];
      newEpisodes.splice(eIdx, 1);
      const updatedEpisodes = newEpisodes.map((ep, i) => ({ ...ep, number: i + 1 }));
      newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: updatedEpisodes };
      return { ...prev, seasons: newSeasons };
    });
  };

  // Добавить новую дату
  const addDate = () => {
    setAnime(prev => ({ ...prev, dates: [...prev.dates, ""] }));
  };

  // Удалить конкретную дату
  const deleteDate = (index: number) => {
    setAnime(prev => {
      const updated = prev.dates.filter((_, i) => i !== index);
      return { ...prev, dates: updated };
    });
  };

  // Изменить значение даты
  const handleDateChange = (index: number, value: string) => {
    setAnime(prev => {
      const updated = [...prev.dates];
      updated[index] = value;
      return { ...prev, dates: updated };
    });
  };

  const handleEpisodeChange = (sIdx: number, eIdx: number, value: string) => {
    setAnime(prev => {
      const newSeasons = [...prev.seasons];
      const newEpisodes = [...newSeasons[sIdx].episodes];
      newEpisodes[eIdx] = { ...newEpisodes[eIdx], url: value };
      newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
      return { ...prev, seasons: newSeasons };
    });
  };

  // 📤 Отправка формы
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (slugError) return setMsg("❌ Исправь slug");
    if (!anime.slug.trim()) return setMsg("❌ Slug не может быть пустым");
    if (!anime.nameRu.trim() || !anime.nameEn.trim())
      return setMsg("❌ Заполни названия");
    if (anime.genres.length === 0)
      return setMsg("❌ Выбери хотя бы один жанр");

    try {
      const submitData = { ...anime, rating: Number(anime.rating) };
      const res = await fetch("http://localhost:5000/api/anime/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Ошибка при добавлении");

      setMsg("✅ Аниме успешно добавлено!");
      setAnime({
        nameRu: "",
        nameEn: "",
        slug: "",
        dates: [""],
        rating: "",
        description: "",
        thumbnail: "",
        genres: [],
        types: [],
        seasons: [{ seasonNumber: 1, episodes: [] }],
      });
    } catch (err) {
      console.error(err);
      setMsg("❌ Ошибка при добавлении");
    }
  };

  return (
    <div className="max-w-5xl  mx-auto mt-[150px] p-6 bg-gray-700 text-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Админ панель — Добавить аниме
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input name="nameRu" placeholder="Название (RU)" value={anime.nameRu}
          onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />

        <input name="nameEn" placeholder="Название (EN)" value={anime.nameEn}
          onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />

        <input name="slug" placeholder="Slug (URL)" value={anime.slug}
          onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />
        {slugError && <p className="text-red-400 text-sm">{slugError}</p>}

        <h3 className="font-semibold mb-2">Годы выхода:</h3>
        {anime.dates.map((d, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              placeholder="Введите год (например 2024 или Онгоинг)"
              value={d}
              onChange={e => handleDateChange(i, e.target.value)}
              className="flex-1 p-2 rounded bg-gray-800 border border-gray-600"
            />
            {anime.dates.length > 1 && (
              <button
                type="button"
                onClick={() => deleteDate(i)}
                className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm"
              >
                ×
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addDate}
          className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition mb-3"
        >
          + Добавить дату
        </button>


        <h1 className="font-semibold mb-2">Рейтинг:</h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            name="rating"
            placeholder="Рейтинг (1–10)"
            value={anime.rating}
            onChange={handleChange}
            className="p-2 rounded bg-gray-800 border border-gray-600 flex-1"
            required
          />
          <button
            type="button"
            onClick={() => {
              setAnime(prev => {
                if (!prev.rating.includes(".")) return { ...prev, rating: prev.rating + "." };
                return prev;
              });
            }}
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 transition"
          >
            .
          </button>
        </div>

        <input name="thumbnail" placeholder="URL постера" value={anime.thumbnail}
          onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />

        <textarea name="description" placeholder="Описание" value={anime.description}
          onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600 h-28" required />

        {/* 🎭 Жанры */}
        <div>
          <h3 className="font-semibold mb-2">Жанры:</h3>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(genre => (
              <button
                type="button"
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1 rounded-full border transition ${anime.genres.includes(genre)
                  ? "bg-indigo-500 border-indigo-400"
                  : "bg-gray-800 border-gray-600 hover:border-indigo-400"
                  }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* 🧩 Типы */}
        <div>
          <h3 className="font-semibold mb-2">Типы:</h3>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(type => (
              <button
                type="button"
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1 rounded-full border transition ${anime.types.includes(type)
                  ? "bg-green-500 border-green-400"
                  : "bg-gray-800 border-gray-600 hover:border-green-400"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 📺 Сезоны и серии */}
        <div>
          <h3 className="font-semibold mt-4 mb-2">Сезоны и серии:</h3>
          {anime.seasons.map((season, sIdx) => (
            <div key={sIdx} className="mb-6 border border-gray-600 p-4 rounded-lg bg-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold">Сезон {season.seasonNumber}</h4>
                {anime.seasons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteSeason(sIdx)}
                    className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm"
                  >
                    Удалить
                  </button>
                )}
              </div>

              {season.episodes.map((ep, eIdx) => (
                <div
                  key={eIdx}
                  className="flex flex-col gap-2 mb-3 border-b border-gray-600 pb-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      placeholder={`Название ${ep.number}-й серии (необязательно)`}
                      value={ep.title || ""}
                      onChange={(e) => {
                        setAnime(prev => {
                          const newSeasons = [...prev.seasons];
                          const newEpisodes = [...newSeasons[sIdx].episodes];
                          newEpisodes[eIdx] = { ...newEpisodes[eIdx], title: e.target.value };
                          newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
                          return { ...prev, seasons: newSeasons };
                        });
                      }}
                      className="flex-1 p-2 rounded bg-gray-700 border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => deleteEpisode(sIdx, eIdx)}
                      className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      ×
                    </button>
                  </div>

                  {/* 🔗 Ссылка на серию */}
                  <input
                    placeholder={`Ссылка на ${ep.number}-ю серию`}
                    value={ep.url}
                    onChange={(e) => handleEpisodeChange(sIdx, eIdx, e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                  />

                  {/* 🎵 Опенинг */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm opacity-80">Опенинг:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Начало (например: 1:30)"
                        value={ep.openingStart || ""}
                        onChange={(e) => {
                          setAnime(prev => {
                            const newSeasons = [...prev.seasons];
                            const newEpisodes = [...newSeasons[sIdx].episodes];
                            newEpisodes[eIdx] = { ...newEpisodes[eIdx], openingStart: e.target.value };
                            newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
                            return { ...prev, seasons: newSeasons };
                          });
                        }}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600"
                      />
                      <input
                        type="text"
                        placeholder="Конец (например: 2:47)"
                        value={ep.openingEnd || ""}
                        onChange={(e) => {
                          setAnime(prev => {
                            const newSeasons = [...prev.seasons];
                            const newEpisodes = [...newSeasons[sIdx].episodes];
                            newEpisodes[eIdx] = { ...newEpisodes[eIdx], openingEnd: e.target.value };
                            newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
                            return { ...prev, seasons: newSeasons };
                          });
                        }}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600"
                      />
                    </div>
                  </div>

                  {/* 🎵 Эндинг */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm opacity-80">Эндинг:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Начало (например: 20:10)"
                        value={ep.endingStart || ""}
                        onChange={(e) => {
                          setAnime(prev => {
                            const newSeasons = [...prev.seasons];
                            const newEpisodes = [...newSeasons[sIdx].episodes];
                            newEpisodes[eIdx] = { ...newEpisodes[eIdx], endingStart: e.target.value };
                            newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
                            return { ...prev, seasons: newSeasons };
                          });
                        }}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600"
                      />
                      <input
                        type="text"
                        placeholder="Конец (например: 23:10)"
                        value={ep.endingEnd || ""}
                        onChange={(e) => {
                          setAnime(prev => {
                            const newSeasons = [...prev.seasons];
                            const newEpisodes = [...newSeasons[sIdx].episodes];
                            newEpisodes[eIdx] = { ...newEpisodes[eIdx], endingEnd: e.target.value };
                            newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
                            return { ...prev, seasons: newSeasons };
                          });
                        }}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600"
                      />
                    </div>
                  </div>
                </div>
              ))}




              <button
                type="button"
                onClick={() => addEpisode(sIdx)}
                className="bg-green-600 px-3 py-1 rounded hover:bg-green-700 transition"
              >
                + Добавить серию
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addSeason}
            className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            + Добавить сезон
          </button>
        </div>

        <button
          type="submit"
          className="bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition mt-4"
        >
          Добавить аниме
        </button>
      </form>

      {msg && <p className="text-center mt-4 text-green-400">{msg}</p>}
    </div>
  );
}

export default Admin;