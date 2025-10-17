import { Link } from "react-router-dom";
import { ModeToggle } from "@/components/Provider/mode-toggle";
import { useAuth } from "../../../context/AuthContext";
import { useState, useEffect, useRef } from "react";

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
    <nav className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg rounded-b-xl border-b border-slate-200 dark:border-slate-700 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-8 h-8 bg-gradient-to-tr from-indigo-400 via-pink-400 to-yellow-300 rounded-full shadow-md"></span>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight hover:text-indigo-500 transition-colors duration-300 cursor-pointer select-none">
            Dior
          </h1>
        </div>

        <div className="flex items-center gap-6 relative">
          <Link to="/" className="text-slate-700 dark:text-slate-100 font-medium hover:text-indigo-500">
            Home
          </Link>
          <Link to="/contact" className="text-slate-700 dark:text-slate-100 font-medium hover:text-indigo-500">
            Contact
          </Link>

          {!user ? (
            <Link
              to="/login"
              className="text-white bg-indigo-500 hover:bg-indigo-600 font-semibold px-4 py-1 rounded-lg shadow"
            >
              Login
            </Link>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="text-slate-800 dark:text-white font-semibold hover:text-indigo-500"
              >
                {user.name}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border-b dark:border-slate-700">
                    {user.email}
                  </div>

                  {/* 🟢 если админ — показываем пункт меню “Админ панель” */}
                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-slate-700 font-medium transition"
                      onClick={() => setOpen(false)}
                    >
                      Админ панель
                    </Link>
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
    </nav>
  );
}

export default Navbar;
