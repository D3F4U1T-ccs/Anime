import { NavLink } from "react-router-dom";
import { Tv, Music2, LogIn, LogOut, Shield } from "lucide-react";
import { ModeToggle } from "../../Provider/mode-toggle";
import { useAuth } from "../../../context/AuthContext";
import { useState, useRef, useEffect } from "react";

interface User {
  name: string;
  email: string;
  isAdmin?: boolean;
}

function Navbar() {
  const { user, logout }: { user: User | null; logout: () => void } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
  };

  return (
    <div
      className="fixed top-0 w-full z-50 border-b border-neutral-800 dark:border-neutral-200
        backdrop-blur-md bg-gradient-to-b from-black/60 to-white dark:from-white/20 dark:to-black
        shadow-[0_2px_10px_rgba(0,0,0,0.2)] dark:shadow-[0_2px_10px_rgba(255,255,255,0.15)]
        transform transition-transform duration-500 translate-y-0"
    >
      <div className="flex items-center justify-between px-10 py-3">
        {/* 🌀 Логотип */}

        <NavLink
          to="/"
          className="flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300"
        > <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform duration-300">
            <h1 className="font-bold text-[22px] tracking-wide text-black dark:text-white drop-shadow-sm select-none">
              AniWorld
            </h1>
          </div>
        </NavLink>

        {/* 🔗 Навигация */}
        <div className="flex items-center gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
              ${isActive ? "text-violet-600 dark:text-violet-400" : "text-black dark:text-white"} hover:text-violet-600 dark:hover:text-violet-400`
            }
          >
            <Tv className="w-4 h-4" /> Аниме
          </NavLink>

          <NavLink
            to="/Openings"
            className={({ isActive }) =>
              `flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
              ${isActive ? "text-violet-600 dark:text-violet-400" : "text-black dark:text-white"} hover:text-violet-600 dark:hover:text-violet-400`
            }
          >
            <Music2 className="w-4 h-4" /> Опенинги
          </NavLink>
          <NavLink
            to="/About"
            className={({ isActive }) =>
              `flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
              ${isActive ? "text-violet-600 dark:text-violet-400" : "text-black dark:text-white"} hover:text-violet-600 dark:hover:text-violet-400`
            }
          >
            Обо мне
          </NavLink>


          {/* 👤 Авторизация */}
          {!user ? (
            <NavLink
              to="/Login"
              className={({ isActive }) =>
                `flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
                ${isActive ? "text-violet-600 dark:text-violet-400" : "text-black dark:text-white"} hover:text-violet-600 dark:hover:text-violet-400`
              }
            >
              <LogIn className="w-4 h-4" /> Логин
            </NavLink>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 text-[16px] font-semibold text-black dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition"
              >
                {user.name}
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700
                    shadow-lg overflow-hidden animate-fadeIn"
                >
                  <div className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800">
                    {user.email}
                  </div>

                  {/* 🛡️ Админ-панель */}
                  {user.isAdmin && (
                    <NavLink
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-[15px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Shield className="w-4 h-4" /> Админ панель
                    </NavLink>
                  )}

                  {/* 🚪 Выход */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-[15px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-neutral-800 transition"
                  >
                    <LogOut className="w-4 h-4" /> Выйти
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 🌗 Переключатель темы */}
          <ModeToggle />
        </div>
      </div>
    </div>
  );
}

export default Navbar;
