import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      login(data.user);
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (err: any) {
      setMsg(err.message || "Ошибка входа");
    }
  };

  return (
    <div className="min-h-[100vh] flex items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-gray-800 text-white px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 animate-fadeIn">
        <h2 className="text-3xl font-extrabold text-center mb-6 tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Вход в аккаунт
        </h2>

        {msg && (
          <div className="text-red-400 text-sm text-center mb-4">{msg}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Введите Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400
              focus:ring-2 focus:ring-white focus:outline-none transition-all"
            required
          />

          <input
            type="password"
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400
              focus:ring-2 focus:ring-white focus:outline-none transition-all"
            required
          />

          <button
            type="submit"
            className="mt-2 bg-gradient-to-r from-white to-gray-400 text-black font-bold py-2.5 rounded-lg
              shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Войти
          </button>
        </form>

        <p className="text-sm text-center text-gray-400 mt-5">
          Нет аккаунта?{" "}
          <Link
            to="/register"
            className="text-white font-semibold hover:text-gray-300 transition-colors"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
