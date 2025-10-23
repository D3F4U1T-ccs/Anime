import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { MailCheck } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Card, CardHeader, CardContent } from "../../ui/card";
import { Separator } from "../../ui/separator";
import LogImg from "../../img/10106181308166125.gif";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setShowVerificationModal(false);

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.action === "VERIFY_REQUIRED") {
          localStorage.setItem("pendingEmail", email);
          setShowVerificationModal(true);
          setMsg("");
          return;
        }

        throw new Error(data.message);
      }

      login(data.user);
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (err: any) {
      setMsg(err.message || "Ошибка входа");
    }
  };

  const redirectToVerification = () => {
    setShowVerificationModal(false);
    navigate("/verification");
  };

  return (
    <div className="flex h-screen items-center justify-center px-4">
      {/* 💡 Модальное окно */}
      {showVerificationModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-700 p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <MailCheck size={48} className="text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
              Требуется подтверждение!
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Ваш аккаунт не подтверждён. Пожалуйста, подтвердите свою почту.
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

      <div className="rounded-2xl bg-gradient-to-tl from-white/85 via-black/15 to-white/85 p-[2px]">
        <Card className="w-[400px] max-w-md rounded-2xl bg-neutral-400/30 dark:bg-neutral-950/90 shadow-2xl shadow-black/50 backdrop-blur-sm border-0">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-[100px] w-[100px] flex items-center justify-center rounded-full bg-violet-600 overflow-hidden">
                <img
                  src={LogImg}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-neutral-600 dark:text-white">
              Вход в AniWorld
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              С возвращением!{" "}
              <span className="text-violet-600">Продолжи</span> своё аниме-путешествие 
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {msg && <p className="text-red-500 text-sm text-center">{msg}</p>}

            <div className="flex items-center gap-2">
              <Separator className="flex-1 bg-neutral-700" />
              <span className="text-xs text-neutral-500">Введите данные</span>
              <Separator className="flex-1 bg-neutral-700" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                type="email"
                placeholder="Электронная почта"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-500"
                required
              />

              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-500"
                required
              />

              <Button
                type="submit"
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 shadow-md"
              >
                Войти
              </Button>

              <p className="text-sm text-center text-neutral-500">
                Нет аккаунта?{" "}
                <Link
                  to="/register"
                  className="text-violet-500 hover:underline font-medium"
                >
                  Зарегистрироваться
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;
