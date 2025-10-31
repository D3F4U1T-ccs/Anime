// Navbar.tsx
import { NavLink } from "react-router-dom";
import { Tv, Music2, LogIn, LogOut, Shield, Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false); // user dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // mobile nav
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(target)) {
        setMobileOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setOpen(false);
    setMobileOpen(false);
  };

  const onNavLinkClick = () => {
    // close mobile menu when user clicks a link (mobile)
    setMobileOpen(false);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 dark:border-neutral-200
        backdrop-blur-md bg-gradient-to-b from-black/60 to-white dark:from-white/20 dark:to-black
        shadow-[0_2px_10px_rgba(0,0,0,0.2)] dark:shadow-[0_2px_10px_rgba(255,255,255,0.05)]
        transform transition-transform duration-500 translate-y-0"
    >
      {/* Ограничиваем контент по ширине, чтобы не было горизонтального overflow */}
      <div className="mx-auto max-w-[1100px] px-4 sm:px-10 py-3 flex items-center justify-between">
        {/* Логотип */}
        <NavLink to="/" className="flex items-center gap-2 text-[16px] font-bold">
          <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform duration-300">
            <h1 className="Logo_text scale-125 " >Flow2Anime</h1>
          </div>
        </NavLink>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLink
            to="/anime"
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
            О Проекте
          </NavLink>

          {/* Auth / user dropdown */}
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
                onClick={() => setOpen((p) => !p)}
                className="flex items-center gap-2 text-[16px] font-semibold text-black dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition"
                aria-haspopup="true"
                aria-expanded={open}
              >
                {user.name}
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700
                    shadow-lg overflow-hidden animate-fadeIn"
                >
                  <div className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800">
                    {user.email}
                  </div>

                  {user.isAdmin && (
                    <NavLink
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-[15px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Shield className="w-4 h-4" /> Админ панель
                    </NavLink>
                  )}

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

          {/* Theme toggle */}
          <ModeToggle />
        </nav>

        {/* Mobile right-side controls: theme toggle + hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <ModeToggle />
          <button
            onClick={() => setMobileOpen((p) => !p)}
            aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={mobileOpen}
            className="p-2 rounded-md bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div
          ref={mobileRef}
          className="md:hidden bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 w-full shadow-md"
        >
          <div className="mx-auto max-w-[1100px] px-4 sm:px-10 py-4 flex flex-col gap-2">
            <NavLink
              to="/anime"
              onClick={onNavLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded-lg font-medium
                 ${isActive ? "text-violet-600 bg-violet-50 dark:bg-neutral-800" : "text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"}`
              }
            >
              <Tv className="w-4 h-4" /> Аниме
            </NavLink>

            <NavLink
              to="/Openings"
              onClick={onNavLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded-lg font-medium
                 ${isActive ? "text-violet-600 bg-violet-50 dark:bg-neutral-800" : "text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"}`
              }
            >
              <Music2 className="w-4 h-4" /> Опенинги
            </NavLink>

            <NavLink
              to="/About"
              onClick={onNavLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded-lg font-medium
                 ${isActive ? "text-violet-600 bg-violet-50 dark:bg-neutral-800" : "text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"}`
              }
            >
              О Проекте
            </NavLink>

            {!user ? (
              <NavLink
                to="/Login"
                onClick={onNavLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2 py-2 rounded-lg font-medium
                   ${isActive ? "text-violet-600 bg-violet-50 dark:bg-neutral-800" : "text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"}`
                }
              >
                <LogIn className="w-4 h-4" /> Логин
              </NavLink>
            ) : (
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <div className="px-2 py-2 text-sm text-neutral-700 dark:text-neutral-300">{user.email}</div>

                {user.isAdmin && (
                  <NavLink
                    to="/admin"
                    onClick={onNavLinkClick}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg font-medium text-green-600 hover:bg-green-50 dark:hover:bg-neutral-800"
                  >
                    <Shield className="w-4 h-4" /> Админ панель
                  </NavLink>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg font-medium text-red-500 hover:bg-red-50 dark:hover:bg-neutral-800"
                >
                  <LogOut className="w-4 h-4" /> Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
