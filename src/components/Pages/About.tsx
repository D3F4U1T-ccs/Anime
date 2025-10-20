import { FaGithub, FaTelegramPlane, FaHeart } from "react-icons/fa";

function About() {
  return (
    <div className="min-h-screen flex md:flex-col gap-20  xl:flex-row items-center justify-center px-6 py-16 bg-gray-300 dark:bg-gray-800 text-center transition-colors duration-300">
      {/* Верхний блок с информацией */}
      <div className="max-w-2xl bg-white/70 dark:bg-gray-900/60 backdrop-blur-md rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white mb-4">
          👋 Привет! Я — Диёрбек
        </h1>

        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          Я обычный парень из Узбекистана 🇺🇿, который увлёкся созданием этого сайта для
          любителей аниме. Работал над ним один — от идеи и дизайна до кода и адаптации под телефоны.
          <br />
          <br />
          Мне хотелось сделать уютное место, где можно смотреть, искать и открывать новое аниме.
        </p>

        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-500 shadow-md">
            <img
              src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
              alt="Author avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm italic">
          “Каждая строка кода — маленький шаг к мечте.”
        </p>
      </div>

      {/* Блок поддержки */}
      <div className="mt-10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-6 sm:p-8 max-w-md w-full">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-3">
          💖 Поддержать автора
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-5">
          Если тебе понравился сайт — можно поддержать проект или просто написать пару тёплых слов 😊
        </p>

        <div className="flex items-center justify-center gap-6">
          <a
            href="https://t.me/yourtelegram" // вставь сюда свой Telegram
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition"
          >
            <FaTelegramPlane className="text-2xl" /> Telegram
          </a>
          <a
            href="https://github.com/yourgithub" // вставь сюда свой GitHub
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            <FaGithub className="text-2xl" /> GitHub
          </a>
        </div>

        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Сделано с <FaHeart className="inline text-red-500 mx-1" /> в Узбекистане
        </div>
      </div>
    </div>
  );
}

export default About;
