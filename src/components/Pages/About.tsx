import { FaTelegramPlane } from "react-icons/fa";

export default function About() {
  return (
    <div className="min-h-screen bg-gray-100 mt-3 dark:bg-gray-900 text-slate-800 dark:text-gray-200 px-6 py-16 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white/70 dark:bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-3xl font-extrabold mb-6 text-center text-indigo-600 dark:text-indigo-400">
          О проекте
        </h1>

        <p className="text-[15px] leading-relaxed whitespace-pre-line text-gray-800 dark:text-gray-200">
          Я — обычный ученик 9 класса, который однажды решил попробовать сделать свой сайт для просмотра аниме.
          Раньше я думал, что создание сайта — это что-то очень сложное, но как оказалось, если действительно хочешь —
          всё возможно.

          Бюджет проекта был нулевой, поэтому всё приходилось делать самому — от кода до мелких деталей. Иногда
          не хватало мотивации, но были ночи, когда я просто не мог оторваться от компьютера, потому что очень
          хотел довести всё до конца. В итоге, вы сейчас читаете этот текст, а значит, я действительно смог сделать то,
          что задумал.

          Да, возможно, сайт покажется кому-то простым или даже скучным, но для меня — это не просто проект,
          а результат моих стараний и желания научиться чему-то новому. Это мой первый по-настоящему завершённый
          и рабочий сайт, которым я искренне горжусь.

          Моим вдохновением стал сайт jut.su — именно с него всё началось. Когда jut.su стал “плюсом”, я больше не
          мог смотреть аниме, и тогда решил, что создам свой собственный сайт, где всё будет бесплатно.
          Конечно, часть дизайна я подсмотрел у jut.su — если вы это читаете, простите 😅 — но я старался добавить
          и что-то своё, чтобы сайт имел душу и был не просто копией, а чем-то личным.

          Сейчас сайт полностью бесплатный, без рекламы и лишних ограничений. Я просто хотел, чтобы каждый мог
          зайти, посмотреть любимое аниме и приятно провести время. Кто знает, может, со временем я тоже добавлю
          платные функции, если проект вырастет, но пока — просто наслаждайтесь тем, что есть 🌸

          Если вам понравилось то, что я сделал — спасибо. Это значит, что мой труд был не зря. Если хотите, вы можете
          поддержать проект или просто написать мне — я всегда открыт для общения и идей.
        </p>

        <div className="flex justify-center gap-8 mt-10">
          <a
            href="https://t.me/defaults_tgs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition"
          >
            <FaTelegramPlane className="text-xl" /> Telegram
          </a>
          <a
            href="https://t.me/+QSuvRoFyPcI1ZmNi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-700 hover:text-blue-600 transition"
          >
            <FaTelegramPlane className="text-xl" /> Telegram - чат
          </a>


        </div>

        <div className="text-center mt-8 text-gray-600 dark:text-gray-400 text-sm">
          С уважением, разработчик 💻
        </div>
      </div>
    </div>
  );
}
