import { NavLink, Link, useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/Provider/mode-toggle";
import { useAuth } from "../../../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { FaRegCircleUser } from "react-icons/fa6";
import { Tv, MessageSquare, LogIn } from "lucide-react";

interface User {
  name: string;
  email: string;
  isAdmin?: boolean;
}

function Navbar() {
  const { user, logout }: { user: User | null; logout: () => void } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

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

  // Если мы на странице логина/регистрации — показываем вместо навбара кнопку назад на главную
  if (isAuthPage) {
    return (
      <div
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full -ml-[600px] mt-[30px] bg-white/10 backdrop-blur-md border border-white/20
                     text-white font-semibold shadow-md hover:scale-[1.03] active:scale-[0.98] transition-transform"
        >
          ← На главную
        </Link>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 w-full z-50 border-b border-neutral-800 dark:border-neutral-200
        backdrop-blur-md bg-gradient-to-b from-black/60 to-white dark:from-white/20 dark:to-black
        shadow-[0_2px_10px_rgba(0,0,0,0.2)] dark:shadow-[0_2px_10px_rgba(255,255,255,0.15)]
        transform transition-transform duration-500 translate-y-0"
    >
      <div className="flex items-center justify-center gap-10 px-10 py-3">
        <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform duration-300">
          <h1 className="font-bold text-[22px] tracking-wide text-black dark:text-white drop-shadow-sm">
            Dior
          </h1>
        </div>

        <div className="flex items-center gap-6 relative">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
              ${
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-black dark:text-white"
              } hover:text-violet-600 dark:hover:text-violet-400`
            }
          >
            <Tv className="w-4 h-4" /> Anime
          </NavLink>

          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
              ${
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-black dark:text-white"
              } hover:text-violet-600 dark:hover:text-violet-400`
            }
          >
            <MessageSquare className="w-4 h-4" /> Contact
          </NavLink>

          {!user ? (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
                ${
                  isActive
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-black dark:text-white"
                } hover:text-violet-600 dark:hover:text-violet-400`
              }
            >
              <LogIn className="w-4 h-4" /> Login
            </NavLink>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 text-[16px] font-semibold transition-colors duration-300
                 text-black dark:text-white hover:text-violet-600 dark:hover:text-violet-400"
              >
                {user.name} <FaRegCircleUser />
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden
                    animate-fadeIn"
                >
                  <div className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border-b dark:border-slate-700">
                    {user.email}
                  </div>

                  {user.isAdmin && (
                    <NavLink
                      to="/admin"
                      className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-slate-700 font-medium transition"
                      onClick={() => setOpen(false)}
                    >
                      Админ панель
                    </NavLink>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 font-medium transition"
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}

          <ModeToggle />
        </div>
      </div>
    </div>
  );
}

export default Navbar;
