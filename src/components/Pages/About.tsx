import { FaGithub, FaTelegramPlane, FaHeart } from "react-icons/fa";

function About() {
  return (
    <div className="min-h-screen flex flex-col xl:flex-row items-center justify-center gap-16 px-6 py-16 bg-gray-300 dark:bg-gray-800 transition-colors duration-300">
      {/* Блок профиля */}
      <div className="max-w-sm bg-white/70 dark:bg-gray-900/60 backdrop-blur-md rounded-3xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
        <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-indigo-500 shadow-md mb-5">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
          👋 Привет!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm italic">
          Разработчик этого сайта.
        </p>

        <div className="flex justify-center gap-6 mt-6">
          <a
            href="https://t.me/yourtelegram" // вставь свой Telegram
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition"
          >
            <FaTelegramPlane className="text-2xl" /> Telegram
          </a>
          <a
            href="https://github.com/D3F4U1T-ccs" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            <FaGithub className="text-2xl" /> GitHub
          </a>
        </div>
      </div>

      {/* Блок поддержки */}
      <div className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-3">
          💖 Поддержать проект
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-5">
          Если тебе понравился сайт — можешь поддержать проект или написать мне.
        </p>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          Сделано с <FaHeart className="inline text-red-500 mx-1" /> в Узбекистане
        </div>
      </div>
    </div>
  );
}

export default About;
