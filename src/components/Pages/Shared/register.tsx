import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // <<< 1. Добавили состояние для подтверждения пароля
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // <<< 3. Добавили проверку на совпадение паролей
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return; // Прерываем выполнение функции, если пароли не совпали
    }

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Письмо для подтверждения отправлено на почту.");
        localStorage.setItem("pendingEmail", email);
        setTimeout(() => navigate("/verification"), 1500);
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-2xl text-gray-600 font-bold text-center mb-2">Register</h2>
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        {success && <div className="text-green-500 text-sm text-center">{success}</div>}
        <input
          type="text"
          placeholder="Username"
          value={name}
          onChange={e => setName(e.target.value)}
          className="px-3 py-2 rounded border text-gray-600  border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="px-3 py-2 rounded border text-gray-600  border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="px-3 py-2 rounded border text-gray-600  border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
        {/* <<< 2. Добавили поле для подтверждения пароля */}
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="px-3 py-2 rounded border text-gray-600  border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
        <button type="submit" className="bg-indigo-500 text-white  hover:bg-indigo-600  font-semibold py-2 rounded transition-colors">Register</button>
      </form>
      <p className="text-sm text-center text-slate-600 dark:text-slate-300 mt-2">
        Уже есть аккаунт?{" "}
        <Link
          to="/login"
          className="text-indigo-500 hover:text-indigo-600 font-medium"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}

export default Register;