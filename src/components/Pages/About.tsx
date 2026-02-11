import { FaTelegramPlane, FaUsers, FaServer } from "react-icons/fa";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-start gap-4">
          <div className="flex-none w-14 h-14 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center">
            <FaUsers className="text-indigo-600 dark:text-indigo-300 text-2xl" />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              О проекте
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Этот сайт — простая и быстрая площадка для просмотра аниме.
              Делалось всё с нуля с минимальным бюджетом и максимальным желанием
              довести до рабочего состояния. Здесь нет навязчивой рекламы — только
              удобный просмотр и минимум лишнего.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Что внутри</h3>
            <ul className="mt-3 text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc list-inside">
              <li>Быстрый плеер с поддержкой серий</li>
              <li>Простая навигация по жанрам и релизам</li>
              <li>Полностью бесплатный доступ</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Коротко о команде</h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Это дуэт: я — учащийся 9 класса, разработчик и автор интерфейса; и мой
              надёжный одноклассник, который выступал как админ — помогал с добавлением аниме и советами. Вместе мы сделали этот проект рабочим.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <a
            href="https://t.me/defaults_tgs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900 transition text-sm"
          >
            <FaTelegramPlane /> Контакт (Telegram)
          </a>

          <a
            href="https://t.me/+QSuvRoFyPcI1ZmNi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
          >
            <FaServer /> Чат поддержки
          </a>
        </div>

        <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-4 text-sm text-gray-600 dark:text-gray-400">
          <div>Создано командой: <span className="font-medium text-gray-800 dark:text-gray-100">я (разработчик)</span> &amp; <span className="font-medium text-gray-800 dark:text-gray-100">мой одноклассник (админ)</span>.</div>
          <div className="mt-2">Если есть идеи или баги — пиши в чат, разберёмся.</div>
        </div>
      </div>
    </div>
  );
}
