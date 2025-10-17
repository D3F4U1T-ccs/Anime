import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
// 💡 Импортируем иконку для красоты
import { MailCheck } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  // 💡 НОВОЕ СОСТОЯНИЕ: для модального окна верификации
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setShowVerificationModal(false); // Сбрасываем модальное окно

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.action === "VERIFY_REQUIRED") {
          // 💡 ИЗМЕНЕНИЕ: НЕ перенаправляем, а показываем модальное окно
          localStorage.setItem("pendingEmail", email);
          setShowVerificationModal(true);
          setMsg(""); // Убираем сообщение об ошибке, так как будет модальное окно
          return;
        }

        throw new Error(data.message);
      }

      // Успешный вход
      login(data.user);
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (err: any) {
      setMsg(err.message || "Ошибка входа");
    }
  };

  // 💡 ФУНКЦИЯ ДЛЯ ПЕРЕНАПРАВЛЕНИЯ
  const redirectToVerification = () => {
    setShowVerificationModal(false); // Закрыть модальное окно
    navigate("/verification"); // Перейти на страницу
  }

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      {/* 💡 Модальное окно */}
      {showVerificationModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-700 p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <MailCheck size={48} className="text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Требуется подтверждение!</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Ваш аккаунт не подтвержден. Пожалуйста, подтвердите свою почту.
            </p>
            <button
              onClick={redirectToVerification}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded transition-colors w-full"
            >
              Перейти к подтверждению
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        {/* ... (остальные поля формы) ... */}
        <h2 className="text-2xl font-bold text-center mb-2">Login</h2>
        {msg && <div className="text-red-500 text-sm text-center">{msg}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded border text-gray-700 border-slate-300 focus:ring-2 focus:ring-indigo-400"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 rounded border text-gray-700 border-slate-300 focus:ring-2 focus:ring-indigo-400"
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