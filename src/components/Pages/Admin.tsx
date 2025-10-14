import { useState } from "react";

function Admin() {
    const [anime, setAnime] = useState({
        name: "",
        date: "",
        rating: "",
        description: "",
        thumbnail: "",
        episodes: "",
        email: "twikitwo3@gmail.com", // твой email для проверки
    });
    const [msg, setMsg] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setAnime({ ...anime, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...anime,
            rating: Number(anime.rating),
            episodes: anime.episodes
                .split(",")
                .map((url, i) => ({ number: i + 1, url: url.trim() })),
        };

        const res = await fetch("http://localhost:5000/api/anime/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        setMsg(data.message || "Ошибка");
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-gray-600 rounded-2xl shadow">
            <h1 className="text-2xl font-bold mb-4 text-center">Админ панель — Добавить аниме</h1>

            <form className="flex bg-gray-600 flex-col gap-3" onSubmit={handleSubmit}>
                <input name="name" placeholder="Название аниме" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
                <input name="date" placeholder="Год выхода" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
                <input name="rating" placeholder="Рейтинг (1-10)" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
                <input name="thumbnail" placeholder="URL постера" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
                <textarea name="description" placeholder="Описание" onChange={handleChange} className="bg-gray-600 border-gray-300 border-2" required />
                <input
                    name="episodes"
                    placeholder="Ссылки на серии через запятую"
                    onChange={handleChange}
                    className="bg-gray-600 border-gray-300 border-2"
                    required
                />
                <button
                    type="submit"
                    className="bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition"
                >
                    Добавить
                </button>
            </form>

            {msg && <p className="text-center mt-4 text-green-600">{msg}</p>}
        </div>
    );
}

export default Admin;
