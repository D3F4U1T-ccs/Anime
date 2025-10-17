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
    <div className="flex justify-center items-center min-h-[60vh]">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-center mb-2">Login</h2>
        {msg && <div className="text-red-500 text-sm text-center">{msg}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-indigo-400"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-indigo-400"
          required
        />

        <button
          type="submit"
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 rounded transition-colors"
        >
          Login
        </button>

        {/* Ссылка на регистрацию */}
        <p className="text-sm text-center text-slate-600 dark:text-slate-300 mt-2">
          Нет аккаунта?{" "}
          <Link
            to="/register"
            className="text-indigo-500 hover:text-indigo-600 font-medium"
          >
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
