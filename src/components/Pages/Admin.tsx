import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

// Типы для аниме
interface Episode {
  number: number;
  url: string;
}

interface AnimeData {
  name: string;
  date: string;
  rating: number;
  description: string;
  thumbnail: string;
  episodes: Episode[];
}

function Admin() {
  const [anime, setAnime] = useState({
    name: "",
    date: "",
    rating: "",
    description: "",
    thumbnail: "",
    episodes: "",
  });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Проверка, залогинен ли пользователь и админ ли он
  useEffect(() => {
    if (!token) {
      navigate("/login"); // редирект на логин, если нет токена
      return;
    }

    fetch("http://localhost:5000/api/check-admin", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error("Нет доступа");
        return res.json();
      })
      .catch(() => navigate("/")); // редирект на главную, если не админ
  }, [token, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAnime({ ...anime, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");

    const payload: AnimeData = {
      name: anime.name,
      date: anime.date,
      rating: Number(anime.rating),
      description: anime.description,
      thumbnail: anime.thumbnail,
      episodes: anime.episodes
        .split(",")
        .map((url, i) => ({ number: i + 1, url: url.trim() })),
    };

    try {
      const res = await fetch("http://localhost:5000/api/anime/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setMsg(data.message || "Ошибка");
    } catch (err) {
      console.error(err);
      setMsg("Ошибка при добавлении аниме");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-gray-600 rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">Админ панель — Добавить аниме</h1>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input name="name" placeholder="Название аниме" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
        <input name="date" placeholder="Год выхода" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
        <input name="rating" placeholder="Рейтинг (1-10)" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
        <input name="thumbnail" placeholder="URL постера" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
        <textarea name="description" placeholder="Описание" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
        <input name="episodes" placeholder="Ссылки на серии через запятую" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
        <button type="submit" className="bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition">Добавить</button>
      </form>
      {msg && <p className="text-center mt-4 text-green-600">{msg}</p>}
    </div>
  );
}

export default Admin;
