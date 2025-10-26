import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Card, CardHeader, CardContent } from "../../ui/card";
import { Separator } from "../../ui/separator";
import { Link, useNavigate } from "react-router-dom";
import RegImg from "../../img/aniyuki-hello-25.gif";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !email || !password || !confirmPassword) {
      setError("❌ Все поля обязательны для заполнения");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("📧 Некорректный адрес электронной почты");
      return;
    }

    if (password.length < 6) {
      setError("🔒 Пароль должен содержать минимум 6 символов");
      return;
    }

    if (password !== confirmPassword) {
      setError("⚠️ Пароли не совпадают");
      return;
    }

    try {
      const res = await fetch("https://anime-1-dv13.onrender.com/api/register", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: username.trim(),
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.message) setError(data.message);
        else if (data.error === "nick_exists") setError("⚠️ Это имя уже занято");
        else if (data.error === "email_exists") setError("📧 Этот email уже зарегистрирован");
        else setError(data.error || "Ошибка регистрации");
        return;
      }

      setSuccess("✅ Письмо для подтверждения отправлено на вашу почту.");
      localStorage.setItem("pendingEmail", email.trim().toLowerCase());
      setTimeout(() => navigate("/Verification"), 1500);
    } catch (err) {
      console.error(err);
      setError("🚫 Ошибка соединения с сервером");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center px-4 relative">
      <div className="rounded-2xl bg-gradient-to-tl from-white/85 via-black/15 to-white/85 p-[2px]">
        <Card className="w-[400px] max-w-md rounded-2xl bg-neutral-400/30 dark:bg-neutral-950/90 shadow-2xl shadow-black/50 backdrop-blur-sm border-0">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-[100px] w-[100px] flex items-center justify-center rounded-full bg-violet-600 overflow-hidden">
                <img
                  src={RegImg}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-neutral-600 dark:text-white">
              Регистрация в AniWorld
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Присоединяйтесь и начните{" "}
              <span className="text-violet-600">своё аниме-путешествие</span>
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Separator className="flex-1 bg-neutral-700" />
              <span className="text-xs text-neutral-500">Заполните поля</span>
              <Separator className="flex-1 bg-neutral-700" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-violet-500/60"
                required
              />
              <Input
                type="email"
                placeholder="Электронная почта"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-violet-500/60"
                required
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-violet-500/60"
                required
              />
              <Input
                type="password"
                placeholder="Подтвердите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-violet-500/60"
                required
              />

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {success && <p className="text-green-500 text-sm text-center">{success}</p>}

              <Button
                type="submit"
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 shadow-md"
              >
                Зарегистрироваться
              </Button>

              <p className="text-sm text-center text-neutral-500">
                Уже есть аккаунт?{" "}
                <Link to="/login" className="text-violet-500 hover:underline font-medium">
                  Войти
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Register;
