import { Route, Routes, Link, useLocation } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Pages/Shared/Navbar";
import Admin from "./components/Pages/Admin";
import Home from "./components/Pages/Home";
import Contact from "./components/Pages/Contact";
// import Footer from "./components/Pages/Shared/Footer";
import Login from "./components/Pages/Shared/login";
import Register from "./components/Pages/Shared/register";
import Verification from "./components/Pages/Verification";
import ProtectedAdminRoute from "./ProtectedAdminRoute";
import AnimePage from "./components/Pages/AnimePage";

function App() {
  const location = useLocation();
  const simpleHeaderPages = ["/login", "/Login", "/register"];

  return (
    <>
      {/* Если страница логина или регистрации — показываем кнопку "← Home", иначе Navbar */}
      {simpleHeaderPages.includes(location.pathname) ? (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <Link to="/">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full
              bg-gradient-to-tr from-white/70 via-white/10 to-white/40
              text-black
              dark:bg-gradient-to-tr dark:from-black/80 dark:via-black/10 dark:to-black/80
              dark:text-white
              shadow-lg shadow-black/30 dark:shadow-black/70
              hover:brightness-110 transition-all duration-200"
            >
              ← Home
            </button>
          </Link>
        </div>
      ) : (
        <Navbar />
      )}

      {/* Основной контент */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/anime/:slug" element={<AnimePage />} />
        <Route path="/login" element={<Login />} />


        {/* 🔒 защищённая админка */}
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <Admin />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
