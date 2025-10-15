import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

interface Episode {
  number: number;
  url: string;
}

interface Season {
  number: number;
  episodes: Episode[];
}

interface AnimeData {
  nameRu: string;
  nameEn: string;
  slug: string;
  date: string;
  rating: number;
  description: string;
  thumbnail: string;
  tags: string[];
  status: string;
  seasons: Season[];
}

const GENRES = [
  "Приключения", "Боевик", "Комедия", "Повседневность", "Романтика", "Драма",
  "Фантастика", "Фэнтези", "Мистика", "Детектив", "Триллер", "Психология"
];

const STATUSES = [
  "Онгоинг", "2025", "2024", "2023", "2022",
  "2015–2021", "2008–2014", "2000–2007", "до 2000"
];

function Admin() {
  const [anime, setAnime] = useState<AnimeData>({
    nameRu: "",
    nameEn: "",
    slug: "",
    date: "",
    rating: 0,
    description: "",
    thumbnail: "",
    tags: [],
    status: "Онгоинг",
    seasons: [{ number: 1, episodes: [] }]
  });

  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Проверка администратора
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

  // Изменение полей
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setAnime({ ...anime, [e.target.name]: e.target.value });
  };

  // Переключение жанров
  const toggleTag = (tag: string) => {
    setAnime(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Добавить сезон
  const addSeason = () => {
    setAnime(prev => ({
      ...prev,
      seasons: [
        ...prev.seasons,
        { number: prev.seasons.length + 1, episodes: [] },
      ],
    }));
  };

  // Удалить сезон
  const deleteSeason = (seasonIndex: number) => {
    const newSeasons = anime.seasons.filter((_, idx) => idx !== seasonIndex);
    // переустанавливаем номера сезонов
    newSeasons.forEach((s, i) => (s.number = i + 1));
    setAnime({ ...anime, seasons: newSeasons });
  };

  // Добавить серию
  const addEpisode = (seasonIndex: number) => {
    const newSeasons = [...anime.seasons];
    const newEpNum = newSeasons[seasonIndex].episodes.length + 1;
    newSeasons[seasonIndex].episodes.push({ number: newEpNum, url: "" });
    setAnime({ ...anime, seasons: newSeasons });
  };

  // Удалить серию
  const deleteEpisode = (seasonIndex: number, episodeIndex: number) => {
    const newSeasons = [...anime.seasons];
    newSeasons[seasonIndex].episodes = newSeasons[seasonIndex].episodes.filter((_, i) => i !== episodeIndex);
    // переустанавливаем номера серий
    newSeasons[seasonIndex].episodes.forEach((ep, i) => (ep.number = i + 1));
    setAnime({ ...anime, seasons: newSeasons });
  };

  // Изменение URL серии
  const handleEpisodeChange = (seasonIndex: number, episodeIndex: number, value: string) => {
    const newSeasons = [...anime.seasons];
    newSeasons[seasonIndex].episodes[episodeIndex].url = value;
    setAnime({ ...anime, seasons: newSeasons });
  };

  // Отправка
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await fetch("http://localhost:5000/api/anime/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(anime),
      });

      const data = await res.json();
      setMsg(data.message || "Добавлено!");
    } catch (err) {
      console.error(err);
      setMsg("Ошибка при добавлении аниме");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-gray-700 text-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Админ панель — Добавить аниме</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input name="nameRu" placeholder="Название (RU)" value={anime.nameRu} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />
        <input name="nameEn" placeholder="Название (EN)" value={anime.nameEn} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />
        <input name="slug" placeholder="Slug (для URL)" value={anime.slug} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />
        <input name="date" placeholder="Дата выхода" value={anime.date} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />
        <input name="rating" placeholder="Рейтинг (1–10)" value={anime.rating} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />
        <input name="thumbnail" placeholder="URL постера" value={anime.thumbnail} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600" required />
        <textarea name="description" placeholder="Описание" value={anime.description} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600 h-28" required />

        {/* Статус */}
        <select name="status" value={anime.status} onChange={handleChange} className="p-2 rounded bg-gray-800 border border-gray-600">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Жанры */}
        <div>
          <h3 className="font-semibold mb-2">Жанры:</h3>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(tag => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full border transition ${
                  anime.tags.includes(tag)
                    ? "bg-indigo-500 border-indigo-400"
                    : "bg-gray-800 border-gray-600 hover:border-indigo-400"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Сезоны */}
        <div>
          <h3 className="font-semibold mt-4 mb-2">Сезоны и серии:</h3>
          {anime.seasons.map((season, sIdx) => (
            <div key={sIdx} className="mb-6 border border-gray-600 p-4 rounded-lg bg-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold">Сезон {season.number}</h4>
                <button
                  type="button"
                  onClick={() => deleteSeason(sIdx)}
                  className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm"
                >
                  Удалить сезон
                </button>
              </div>

              {season.episodes.map((ep, eIdx) => (
                <div key={eIdx} className="flex items-center gap-2 mb-2">
                  <input
                    placeholder={`Ссылка на ${ep.number}-ю серию`}
                    value={ep.url}
                    onChange={(e) => handleEpisodeChange(sIdx, eIdx, e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => deleteEpisode(sIdx, eIdx)}
                    className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm"
                  >
                    ×
                  </button>
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

        <button type="submit" className="bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition mt-4">
          Добавить аниме
        </button>
      </form>

      {msg && <p className="text-center mt-4 text-green-400">{msg}</p>}
    </div>
  );
}

export default Admin;
