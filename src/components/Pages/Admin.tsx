// Admin.tsx
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

/* ---------------------- Типы ---------------------- */
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
  _id?: string;
  nameRu: string;
  nameEn: string;
  slug: string;
  dates: string[];
  rating: string; // для инпута - строка
  description: string;
  thumbnail: string;
  genres: string[];
  types: string[];
  seasons: Season[];
}

type RecShort = {
  _id: string;
  slug?: string;
  nameRu?: string;
  thumbnail?: string;
};

type RecItem = {
  _id: string; // id рекомендации (в БД)
  anime: RecShort;
};

/* ---------------------- Константы UI ---------------------- */
const GENRES = [
  "Приключения", "Боевик", "Комедия", "Повседневность", "Романтика",
  "Драма", "Фантастика", "Фэнтези", "Мистика", "Детектив", "Триллер", "Психология"
];

const TYPES = [
  "Боевые искусства", "Вампиры", "Военное", "Демоны", "Игры", "История",
  "Космос", "Магия", "Меха", "Музыка", "Самураи", "Сёнен",
  "Спорт", "Суперсила", "Ужасы", "Школа"
];

/* ---------------------- RecommendationPanel (по animeId) ---------------------- */
function RecommendationPanel({ token }: { token: string | null }) {
  const [animeId, setAnimeId] = useState("");
  const [preview, setPreview] = useState<RecShort | null>(null);
  const [list, setList] = useState<RecItem[]>([]);
  const [msgRec, setMsgRec] = useState<string>("");

  const normalizeRecsResponse = (data: any[]): RecItem[] => {
    return data.map((d: any) => {
      if (d && d.anime) {
        return { _id: d._id, anime: { _id: d.anime._id || d.anime._id, slug: d.anime.slug, nameRu: d.anime.nameRu, thumbnail: d.anime.thumbnail } };
      }
      if (d && (d.slug || d.nameRu || d.thumbnail)) {
        return { _id: d._id || d._id, anime: { _id: d._id, slug: d.slug, nameRu: d.nameRu, thumbnail: d.thumbnail } };
      }
      return { _id: d._id || "", anime: { _id: d._id || "", slug: d.slug || "", nameRu: d.nameRu || "", thumbnail: d.thumbnail || "" } };
    });
  };

  const loadRecs = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/recommendations");
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      const data = await res.json();
      setList(normalizeRecsResponse(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Ошибка при загрузке рекомендаций:", err);
      setList([]);
      setMsgRec("Ошибка загрузки рекомендаций");
    }
  };

  useEffect(() => { loadRecs(); }, []);

  const fetchPreview = async () => {
    setMsgRec("");
    setPreview(null);
    const id = animeId.trim();
    if (!id) return setMsgRec("Введите id аниме");
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return setMsgRec("Неверный формат id (ObjectId)");

    try {
      const res = await fetch(`http://localhost:5000/api/anime/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message || `Ошибка ${res.status}`);
      }
      const data = await res.json();
      setPreview({ _id: data._id, slug: data.slug, nameRu: data.nameRu, thumbnail: data.thumbnail });
    } catch (err) {
      console.error(err);
      setMsgRec("Не найдено аниме с таким id");
    }
  };

  const handleAdd = async () => {
    setMsgRec("");
    const id = animeId.trim();
    if (!id) return setMsgRec("Введите id аниме");
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return setMsgRec("Неверный формат id");
    if (!token) return setMsgRec("Нет токена администратора");

    try {
      const res = await fetch("http://localhost:5000/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ animeId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Ошибка ${res.status}`);
      setMsgRec("✅ Рекомендация добавлена");
      setAnimeId("");
      setPreview(null);
      loadRecs();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Ошибка при добавлении";
      setMsgRec("❌ " + message);
    }
  };

  const handleDelete = async (recId: string) => {
    if (!confirm("Удалить рекомендацию?")) return;
    if (!token) {
      alert("Нет токена администратора");
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/recommendations/${recId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message || `Ошибка ${res.status}`);
      }
      setMsgRec("✅ Удалено");
      loadRecs();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Ошибка при удалении";
      setMsgRec("❌ " + message);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-white">Управление рекомендациями (по id)</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <input
            value={animeId}
            onChange={(e) => setAnimeId(e.target.value)}
            placeholder="Вставь anime _id (ObjectId)"
            className="w-full mb-2 p-2 rounded bg-gray-700 border border-gray-600 text-white"
          />
          <div className="flex gap-2 mb-3">
            <button onClick={fetchPreview} type="button" className="flex-1 bg-gray-600 p-2 rounded">Проверить</button>
            <button onClick={handleAdd} type="button" className="flex-1 bg-indigo-500 p-2 rounded">➕ Добавить</button>
          </div>

          {preview && (
            <div className="bg-gray-700 p-3 rounded mb-3">
              <div className="flex items-center gap-3">
                {preview.thumbnail ? (
                  <img src={preview.thumbnail} alt={`Постер ${preview.nameRu}`} className="w-16 h-20 object-cover rounded" />
                ) : (
                  <div className="w-16 h-20 bg-gray-600 rounded flex items-center justify-center text-xs">Нет фото</div>
                )}
                <div>
                  <div className="text-white font-medium">{preview.nameRu}</div>
                  <div className="text-xs text-gray-300">{preview.slug}</div>
                </div>
              </div>
            </div>
          )}

          {msgRec && <p className="mt-3 text-sm text-center text-white">{msgRec}</p>}
        </div>

        <div className="md:col-span-2">
          <h4 className="text-sm text-gray-300 mb-2">Список рекомендаций</h4>
          {list.length === 0 ? (
            <div className="text-gray-400 text-sm">Рекомендации отсутствуют</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {list.map((r) => (
                <div key={r._id} className="bg-gray-700 p-3 rounded flex flex-col items-center relative">
                  {r.anime?.thumbnail ? (
                    <img src={r.anime.thumbnail} alt={r.anime.nameRu} className="w-24 h-32 object-cover rounded mb-2" />
                  ) : (
                    <div className="w-24 h-32 bg-gray-600 rounded mb-2 flex items-center justify-center text-xs text-gray-300">Нет фото</div>
                  )}
                  <div className="text-sm font-medium text-white">{r.anime?.nameRu || "—"}</div>
                  <div className="text-xs text-gray-400 mb-2">{r.anime?.slug || r.anime?._id}</div>
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-500"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------- AnimeManager (редактирование существующих аниме) ---------------------- */
function AnimeManager({ token }: { token: string | null }) {
  const [list, setList] = useState<AnimeData[]>([]);
  const [selected, setSelected] = useState<AnimeData | null>(null);
  const [msg, setMsg] = useState<string>("");

  // поиск
  const [search, setSearch] = useState<string>("");

  const loadList = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/anime");
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      const data = await res.json();
      const mapped = data.map((a: any) => ({
        _id: a._id,
        nameRu: a.nameRu || "",
        nameEn: a.nameEn || "",
        slug: a.slug || "",
        dates: Array.isArray(a.dates) ? a.dates : [""],
        rating: (a.rating ?? 0).toString(),
        description: a.description || "",
        thumbnail: a.thumbnail || "",
        genres: Array.isArray(a.genres) ? a.genres : [],
        types: Array.isArray(a.types) ? a.types : [],
        seasons: Array.isArray(a.seasons) ? a.seasons : [{ seasonNumber: 1, episodes: [] }],
      }));
      setList(mapped);
    } catch (err) {
      console.error("Ошибка загрузки списка аниме:", err);
      setList([]);
    }
  };

  useEffect(() => { loadList(); }, []);

  const selectAnime = (a: AnimeData) => {
    setSelected(JSON.parse(JSON.stringify(a)));
    setMsg("");
  };

  const selSet = (patch: Partial<AnimeData>) => setSelected(prev => prev ? ({ ...prev, ...patch }) : prev);

  const selHandleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (!selected) return;
    if (name === "nameEn") {
      const generatedSlug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      selSet({ nameEn: value, slug: generatedSlug });
    } else if (name === "slug") {
      const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      selSet({ slug: cleaned });
    } else if (name === "rating") {
      selSet({ rating: value });
    } else {
      (selSet as any)({ [name]: value });
    }
  };

  const addSeasonSel = () => {
    if (!selected) return;
    const newSeasons = [...selected.seasons, { seasonNumber: selected.seasons.length + 1, episodes: [] }];
    selSet({ seasons: newSeasons });
  };
  const deleteSeasonSel = (index: number) => {
    if (!selected) return;
    const newSeasons = selected.seasons.filter((_, i) => i !== index).map((s, i) => ({ ...s, seasonNumber: i + 1 }));
    selSet({ seasons: newSeasons });
  };

  const addEpisodeSel = (sIdx: number) => {
    if (!selected) return;
    const newSeasons = [...selected.seasons];
    const newEpisodes = [...newSeasons[sIdx].episodes, { number: newSeasons[sIdx].episodes.length + 1, url: "", title: "", openingStart: "", openingEnd: "", endingStart: "", endingEnd: "" }];
    newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
    selSet({ seasons: newSeasons });
  };

  const deleteEpisodeSel = (sIdx: number, eIdx: number) => {
    if (!selected) return;
    const newSeasons = [...selected.seasons];
    const newEpisodes = [...newSeasons[sIdx].episodes];
    newEpisodes.splice(eIdx, 1);
    const updated = newEpisodes.map((ep, i) => ({ ...ep, number: i + 1 }));
    newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: updated };
    selSet({ seasons: newSeasons });
  };

  const handleEpisodeChangeSel = (sIdx: number, eIdx: number, field: string, value: string) => {
    if (!selected) return;
    const newSeasons = [...selected.seasons];
    const newEpisodes = [...newSeasons[sIdx].episodes];
    newEpisodes[eIdx] = { ...newEpisodes[eIdx], [field]: value } as Episode;
    newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
    selSet({ seasons: newSeasons });
  };

  const saveSelected = async () => {
    if (!selected) return setMsg("Нет выбранного аниме");
    if (!token) return setMsg("Нет токена администратора");
    setMsg("");
    try {
      const body: any = { ...selected, rating: Number(selected.rating) };
      const res = await fetch(`http://localhost:5000/api/anime/${(selected as any)._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Ошибка ${res.status}`);
      setMsg("✅ Сохранено");
      await loadList();
      if (data.anime) setSelected({ ...data.anime, rating: String(data.anime.rating) });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Ошибка при сохранении";
      setMsg("❌ " + message);
    }
  };

  const deleteAnime = async () => {
    if (!selected) return;
    if (!confirm("Удалить аниме?")) return;
    if (!token) return setMsg("Нет токена администратора");
    try {
      const res = await fetch(`http://localhost:5000/api/anime/${(selected as any)._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message || `Ошибка ${res.status}`);
      }
      setMsg("✅ Удалено");
      setSelected(null);
      await loadList();
    } catch (err) {
      console.error(err);
      setMsg("❌ Ошибка удаления");
    }
  };

  // фильтрованный список по поиску (nameRu, nameEn, slug, _id)
  const filteredList = list.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (a.nameRu || "").toLowerCase().includes(q) ||
      (a.nameEn || "").toLowerCase().includes(q) ||
      (a.slug || "").toLowerCase().includes(q) ||
      (a._id || "").toString().toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-white">Управление аниме</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="mb-3 text-sm text-gray-300">Список аниме (клик по карточке — редактировать)</div>

          <input
            type="text"
            placeholder="Поиск по названию, slug или id..."
            className="w-full mb-3 p-2 rounded bg-gray-700 border border-gray-600 text-white"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
          />

          <div className="space-y-2 max-h-[420px] overflow-auto">
            {filteredList.length > 0 ? (
              filteredList.map(a => (
                <div key={(a as any)._id} onClick={() => selectAnime(a)}
                  className="p-2 bg-gray-700 rounded flex items-center gap-3 cursor-pointer hover:border hover:border-indigo-400">
                  <div className="w-12 h-16 bg-gray-600 overflow-hidden rounded">
                    {a.thumbnail ? <img src={a.thumbnail} className="w-full h-full object-cover" alt="" /> : <div className="text-xs text-gray-300 flex items-center justify-center h-full">Нет фото</div>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{a.nameRu}</div>
                    <div className="text-xs text-gray-400">{a.slug || (a as any)._id}</div>
                  </div>
                  <div className="text-sm text-yellow-300">{a.rating}</div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">Аниме не найдено</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {!selected ? (
            <div className="text-gray-300 text-sm">Выберите аниме для редактирования</div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <input name="nameRu" placeholder="Название (RU)" value={selected.nameRu} onChange={selHandleChange}
                  className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white" />
                <input name="rating" placeholder="Рейтинг" value={selected.rating} onChange={selHandleChange}
                  className="w-28 p-2 rounded bg-gray-700 border border-gray-600 text-white" />
              </div>

              <div className="flex gap-2 mb-3">
                <input name="nameEn" placeholder="Название (EN)" value={selected.nameEn} onChange={selHandleChange}
                  className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white" />
                <input name="slug" placeholder="Slug" value={selected.slug} onChange={selHandleChange}
                  className="w-64 p-2 rounded bg-gray-700 border border-gray-600 text-white" />
              </div>

              <input name="thumbnail" placeholder="URL постера" value={selected.thumbnail} onChange={selHandleChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 mb-3 text-white" />

              <textarea name="description" placeholder="Описание" value={selected.description} onChange={selHandleChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 h-24 mb-3 text-white" />

              <div>
                <h4 className="text-sm text-gray-300 mb-2">Сезоны и серии</h4>
                {selected.seasons.map((season, sIdx) => (
                  <div key={sIdx} className="mb-4 p-3 bg-gray-700 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Сезон {season.seasonNumber}</div>
                      <div className="flex gap-2">
                        {selected.seasons.length > 1 && <button type="button" onClick={() => deleteSeasonSel(sIdx)} className="text-sm bg-red-600 px-2 py-1 rounded">Удалить</button>}
                        <button type="button" onClick={() => addEpisodeSel(sIdx)} className="text-sm bg-green-600 px-2 py-1 rounded">+ Серия</button>
                      </div>
                    </div>

                    {season.episodes.map((ep, eIdx) => (
                      <div key={eIdx} className="mb-2">
                        <div className="flex gap-2 items-center">
                          <input placeholder={`Название ${ep.number}-й серии`} value={ep.title || ""} onChange={(e) => {
                            const v = e.target.value;
                            const newSeasons = [...selected.seasons];
                            const newEpisodes = [...newSeasons[sIdx].episodes];
                            newEpisodes[eIdx] = { ...newEpisodes[eIdx], title: v };
                            newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
                            selSet({ seasons: newSeasons });
                          }} className="flex-1 p-2 rounded bg-gray-600 border border-gray-500" />

                          <button type="button" onClick={() => deleteEpisodeSel(sIdx, eIdx)} className="px-2 py-1 bg-red-600 rounded">×</button>
                        </div>

                        <input placeholder={`Ссылка на ${ep.number}-ю серию`} value={ep.url || ""} onChange={(e) => handleEpisodeChangeSel(sIdx, eIdx, 'url', e.target.value)}
                          className="w-full p-2 rounded bg-gray-600 border border-gray-500 mt-2" />

                        <div className="flex flex-col gap-1 mt-2">
                          <label className="text-sm opacity-80">Опенинг:</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="Начало (например: 1:30)" value={ep.openingStart || ""}
                              onChange={(e) => handleEpisodeChangeSel(sIdx, eIdx, 'openingStart', e.target.value)}
                              className="flex-1 p-2 rounded bg-gray-600 border border-gray-500" />
                            <input type="text" placeholder="Конец (например: 2:47)" value={ep.openingEnd || ""}
                              onChange={(e) => handleEpisodeChangeSel(sIdx, eIdx, 'openingEnd', e.target.value)}
                              className="flex-1 p-2 rounded bg-gray-600 border border-gray-500" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 mt-2">
                          <label className="text-sm opacity-80">Эндинг:</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="Начало (например: 20:10)" value={ep.endingStart || ""}
                              onChange={(e) => handleEpisodeChangeSel(sIdx, eIdx, 'endingStart', e.target.value)}
                              className="flex-1 p-2 rounded bg-gray-600 border border-gray-500" />
                            <input type="text" placeholder="Конец (например: 23:10)" value={ep.endingEnd || ""}
                              onChange={(e) => handleEpisodeChangeSel(sIdx, eIdx, 'endingEnd', e.target.value)}
                              className="flex-1 p-2 rounded bg-gray-600 border border-gray-500" />
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                ))}
                <button type="button" onClick={addSeasonSel} className="bg-blue-600 px-3 py-1 rounded mb-3">+ Добавить сезон</button>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={saveSelected} className="bg-indigo-500 px-4 py-2 rounded">Сохранить изменения</button>
                <button onClick={() => { setSelected(null); setMsg(""); }} className="bg-gray-600 px-4 py-2 rounded">Отменить</button>
                <button onClick={deleteAnime} className="bg-red-600 px-4 py-2 rounded">Удалить аниме</button>
              </div>

              {msg && <div className="mt-3 text-sm text-white">{msg}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------- AddAnime (бывший Admin форма добавления) ---------------------- */
function AddAnimeForm({ token }: { token: string | null }) {
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement;

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
      setAnime(prev => ({ ...prev, rating: value }));
    } else {
      setAnime(prev => ({ ...prev, [name]: (value as any) }));
    }
  };

  const toggleGenre = (genre: string) => {
    setAnime(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre],
    }));
  };

  const toggleType = (type: string) => {
    setAnime(prev => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type],
    }));
  };

  const addSeason = () => {
    setAnime(prev => ({ ...prev, seasons: [...prev.seasons, { seasonNumber: prev.seasons.length + 1, episodes: [] }] }));
  };

  const deleteSeason = (index: number) => {
    setAnime(prev => {
      const newSeasons = prev.seasons.filter((_, i) => i !== index);
      return { ...prev, seasons: newSeasons.map((s, i) => ({ ...s, seasonNumber: i + 1 })) };
    });
  };

  const addEpisode = (sIdx: number) => {
    setAnime(prev => {
      const newSeasons = [...prev.seasons];
      const newEpisodes = [...newSeasons[sIdx].episodes];
      newEpisodes.push({ number: newEpisodes.length + 1, url: "", title: "", openingStart: "", openingEnd: "", endingStart: "", endingEnd: "" });
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

  const addDate = () => setAnime(prev => ({ ...prev, dates: [...prev.dates, ""] }));
  const deleteDate = (index: number) => setAnime(prev => ({ ...prev, dates: prev.dates.filter((_, i) => i !== index) }));
  const handleDateChange = (index: number, value: string) => setAnime(prev => { const d = [...prev.dates]; d[index] = value; return { ...prev, dates: d }; });

  const handleEpisodeChange = (sIdx: number, eIdx: number, field: string, value: string) => {
    setAnime(prev => {
      const newSeasons = [...prev.seasons];
      const newEpisodes = [...newSeasons[sIdx].episodes];
      newEpisodes[eIdx] = { ...newEpisodes[eIdx], [field]: value } as Episode;
      newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
      return { ...prev, seasons: newSeasons };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (slugError) return setMsg("❌ Исправь slug");
    if (!anime.slug.trim()) return setMsg("❌ Slug не может быть пустым");
    if (!anime.nameRu.trim() || !anime.nameEn.trim()) return setMsg("❌ Заполни названия");
    if (anime.genres.length === 0) return setMsg("❌ Выбери хотя бы один жанр");

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
      if (!res.ok) throw new Error((data && (data.message || data.error)) || "Ошибка при добавлении");

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
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Ошибка при добавлении";
      setMsg("❌ " + message);
    }
  };

  return (
    <div className="bg-gray-700 p-6 rounded-2xl shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Добавить аниме</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input name="nameRu" placeholder="Название (RU)" value={anime.nameRu} onChange={handleChange}
          className="p-2 rounded bg-gray-800 border border-gray-600" required />

        <input name="nameEn" placeholder="Название (EN)" value={anime.nameEn} onChange={handleChange}
          className="p-2 rounded bg-gray-800 border border-gray-600" required />

        <input name="slug" placeholder="Slug (URL)" value={anime.slug} onChange={handleChange}
          className="p-2 rounded bg-gray-800 border border-gray-600" required />
        {slugError && <p className="text-red-400 text-sm">{slugError}</p>}

        <h3 className="font-semibold mb-2">Годы выхода:</h3>
        {anime.dates.map((d, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input placeholder="Введите год (например 2024 или Онгоинг)" value={d}
              onChange={e => handleDateChange(i, e.target.value)}
              className="flex-1 p-2 rounded bg-gray-800 border border-gray-600" />
            {anime.dates.length > 1 && (
              <button type="button" onClick={() => deleteDate(i)}
                className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm">×</button>
            )}
          </div>
        ))}

        <button type="button" onClick={addDate} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition mb-3">+ Добавить дату</button>

        <h1 className="font-semibold mb-2">Рейтинг:</h1>
        <div className="flex gap-2 items-center">
          <input type="text" name="rating" placeholder="Рейтинг (1–10)" value={anime.rating} onChange={handleChange}
            className="p-2 rounded bg-gray-800 border border-gray-600 flex-1" required />
          <button type="button" onClick={() => setAnime(prev => ({ ...prev, rating: prev.rating.includes(".") ? prev.rating : prev.rating + "." }))}
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 transition">.</button>
        </div>

        <input name="thumbnail" placeholder="URL постера" value={anime.thumbnail} onChange={handleChange}
          className="p-2 rounded bg-gray-800 border border-gray-600" required />

        <textarea name="description" placeholder="Описание" value={anime.description} onChange={handleChange}
          className="p-2 rounded bg-gray-800 border border-gray-600 h-28" required />

        <div>
          <h3 className="font-semibold mb-2">Жанры:</h3>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(genre => (
              <button key={genre} type="button" onClick={() => toggleGenre(genre)}
                className={`px-3 py-1 rounded-full border transition ${anime.genres.includes(genre) ? "bg-indigo-500 border-indigo-400" : "bg-gray-800 border-gray-600 hover:border-indigo-400"}`}>
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Типы:</h3>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(type => (
              <button key={type} type="button" onClick={() => toggleType(type)}
                className={`px-3 py-1 rounded-full border transition ${anime.types.includes(type) ? "bg-green-500 border-green-400" : "bg-gray-800 border-gray-600 hover:border-green-400"}`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mt-4 mb-2">Сезоны и серии:</h3>
          {anime.seasons.map((season, sIdx) => (
            <div key={sIdx} className="mb-6 border border-gray-600 p-4 rounded-lg bg-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold">Сезон {season.seasonNumber}</h4>
                {anime.seasons.length > 1 && (
                  <button type="button" onClick={() => deleteSeason(sIdx)}
                    className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm">Удалить</button>
                )}
              </div>

              {season.episodes.map((ep, eIdx) => (
                <div key={eIdx} className="flex flex-col gap-2 mb-3 border-b border-gray-600 pb-3">
                  <div className="flex items-center gap-2">
                    <input placeholder={`Название ${ep.number}-й серии (необязательно)`} value={ep.title || ""}
                      onChange={(e) => {
                        setAnime(prev => {
                          const newSeasons = [...prev.seasons];
                          const newEpisodes = [...newSeasons[sIdx].episodes];
                          newEpisodes[eIdx] = { ...newEpisodes[eIdx], title: e.target.value };
                          newSeasons[sIdx] = { ...newSeasons[sIdx], episodes: newEpisodes };
                          return { ...prev, seasons: newSeasons };
                        });
                      }}
                      className="flex-1 p-2 rounded bg-gray-700 border border-gray-600" />
                    <button type="button" onClick={() => deleteEpisode(sIdx, eIdx)}
                      className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-sm">×</button>
                  </div>

                  <input placeholder={`Ссылка на ${ep.number}-ю серию`} value={ep.url}
                    onChange={(e) => handleEpisodeChange(sIdx, eIdx, 'url', e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 border border-gray-600" />

                  <div className="flex flex-col gap-1">
                    <label className="text-sm opacity-80">Опенинг:</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Начало (например: 1:30)" value={ep.openingStart || ""}
                        onChange={(e) => handleEpisodeChange(sIdx, eIdx, 'openingStart', e.target.value)}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600" />
                      <input type="text" placeholder="Конец (например: 2:47)" value={ep.openingEnd || ""}
                        onChange={(e) => handleEpisodeChange(sIdx, eIdx, 'openingEnd', e.target.value)}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm opacity-80">Эндинг:</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Начало (например: 20:10)" value={ep.endingStart || ""}
                        onChange={(e) => handleEpisodeChange(sIdx, eIdx, 'endingStart', e.target.value)}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600" />
                      <input type="text" placeholder="Конец (например: 23:10)" value={ep.endingEnd || ""}
                        onChange={(e) => handleEpisodeChange(sIdx, eIdx, 'endingEnd', e.target.value)}
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600" />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" onClick={() => addEpisode(sIdx)} className="bg-green-600 px-3 py-1 rounded hover:bg-green-700 transition">+ Добавить серию</button>
            </div>
          ))}

          <button type="button" onClick={addSeason} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition">+ Добавить сезон</button>
        </div>

        <button type="submit" className="bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition mt-4">Добавить аниме</button>
      </form>

      {msg && <p className="text-center mt-4 text-green-400">{msg}</p>}
    </div>
  );
}

/* ---------------------- Main Admin (страница с левой панелью табов) ---------------------- */
export default function Admin() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // табы: "add" | "manage" | "recs"
  const [activeTab, setActiveTab] = useState<"add" | "manage" | "recs">("add");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch("http://localhost:5000/api/check-admin", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => { if (!res.ok) throw new Error("Нет доступа"); return res.json(); })
      .catch(() => navigate("/"));
  }, [token, navigate]);

  return (
    <div className="max-w-6xl mx-auto mt-[60px] p-6">
      <div className="flex gap-6">
        {/* Левый бар */}
        <div className="w-56 bg-gray-800 p-4 rounded-2xl shadow-md flex flex-col gap-3">
          <h2 className="text-white text-lg font-semibold text-center">Админ панель</h2>

          <button
            onClick={() => setActiveTab("add")}
            className={`text-left px-3 py-2 rounded ${activeTab === "add" ? "bg-indigo-500 text-white" : "bg-gray-700 text-gray-200 hover:bg-gray-700"}`}
          >
            ➕ Добавить аниме
          </button>

          <button
            onClick={() => setActiveTab("manage")}
            className={`text-left px-3 py-2 rounded ${activeTab === "manage" ? "bg-indigo-500 text-white" : "bg-gray-700 text-gray-200 hover:bg-gray-700"}`}
          >
            ⚙️ Управление аниме
          </button>

          <button
            onClick={() => setActiveTab("recs")}
            className={`text-left px-3 py-2 rounded ${activeTab === "recs" ? "bg-indigo-500 text-white" : "bg-gray-700 text-gray-200 hover:bg-gray-700"}`}
          >
            ⭐ Управление рекомендациями
          </button>

          <div className="mt-auto text-xs text-gray-400">Токен: {token ? "Есть" : "Нет"}</div>
        </div>

        {/* Контент */}
        <div className="flex-1">
          {activeTab === "add" && <AddAnimeForm token={token} />}
          {activeTab === "manage" && <AnimeManager token={token} />}
          {activeTab === "recs" && <RecommendationPanel token={token} />}
        </div>
      </div>
    </div>
  );
}
