// Verification.tsx
import React, { useEffect, useState } from "react";
import { Mail, LogIn, Repeat2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

const MAX_ATTEMPTS = 3;

const formatRemainingTime = (unlocksAt: string) => {
  const unlockDate = new Date(unlocksAt);
  const now = new Date();
  const diffMs = unlockDate.getTime() - now.getTime();
  if (diffMs <= 0) return "Сейчас";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const hourPart = hours > 0 ? `${hours} ч. ` : "";
  const minutePart = `${minutes} мин.`;
  return hourPart + minutePart;
};

const Verification: React.FC = () => {
  const [email, setEmail] = useState<string>(() => localStorage.getItem("pendingEmail") || "");
  const [code, setCode] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<"email" | "code" | "success">(
    () => (localStorage.getItem("pendingEmail") ? "code" : "email")
  );
  const [loading, setLoading] = useState<boolean>(false);

  // лимит
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(MAX_ATTEMPTS);
  const [unlocksAt, setUnlocksAt] = useState<string | null>(null);

  const navigate = useNavigate();

  // проверка статуса попыток (фоново)
  const checkAttemptsStatus = async (userEmail: string) => {
    try {
      const res = await fetch(`https://anime-1-dv13.onrender.com/api/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, checkOnly: true }),
      });
      const data = await res.json();
      if (!res.ok && data.action === "LIMIT_EXCEEDED") {
        setAttemptsRemaining(0);
        setUnlocksAt(data.unlocksAt || null);
        setError(data.message || "Лимит превышен");
      } else if (data.attemptsRemaining !== undefined) {
        setAttemptsRemaining(data.attemptsRemaining);
        setUnlocksAt(null);
        // не затираем message/error здесь
      }
    } catch (err) {
      // Фоновая проверка — не мешаем UX ошибкой
      console.error("checkAttemptsStatus error:", err);
    }
  };

  useEffect(() => {
    if (step === "code" && email) checkAttemptsStatus(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, email]);

  // таймер обновления разблокировки
  useEffect(() => {
    if (!unlocksAt) return;
    const t = setInterval(() => {
      if (new Date() >= new Date(unlocksAt)) {
        clearInterval(t);
        setUnlocksAt(null);
        setError("");
        if (email) checkAttemptsStatus(email);
      } else {
        // триггер ререндер (можно оставить пустую операцию)
        setError((p) => p);
      }
    }, 60000); // каждую минуту
    return () => clearInterval(t);
  }, [unlocksAt, email]);

  // Отправка кода (и повторная отправка)
  const handleSendCode = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    setError("");
    setMessage("");
    setLoading(true);

    if (attemptsRemaining === 0 && unlocksAt) {
      setError(`Превышен лимит. Попробуйте через ${formatRemainingTime(unlocksAt)}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`https://anime-1-dv13.onrender.com/api/send-code`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Код отправлен на почту.");
        setStep("code");
        localStorage.setItem("pendingEmail", email);
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
          setUnlocksAt(null);
        }
      } else {
        if (data.action === "LIMIT_EXCEEDED") {
          setError(data.message || "Лимит превышен");
          setAttemptsRemaining(0);
          setUnlocksAt(data.unlocksAt || null);
        } else {
          setError(data.message || "Ошибка отправки кода");
          if (data.attemptsRemaining !== undefined) setAttemptsRemaining(data.attemptsRemaining);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  // Проверка кода
  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`https://anime-1-dv13.onrender.com/api/verify-code`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Почта успешно подтверждена!");
        setStep("success");
        localStorage.removeItem("pendingEmail");
        setAttemptsRemaining(MAX_ATTEMPTS);
        setUnlocksAt(null);
      } else {
        setError(data.message || "Неверный код");
        if (data.attemptsRemaining !== undefined) setAttemptsRemaining(data.attemptsRemaining);
      }
    } catch (err) {
      console.error(err);
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const openGmail = () => window.open("https://mail.google.com/", "_blank");
  const isSendDisabled = loading || attemptsRemaining === 0;

  return (
    <div className="flex h-screen items-center justify-center px-4 relative">
      {/* Градиентный бордер как в Register.tsx */}
      <div className="rounded-2xl bg-gradient-to-tl from-white/85 via-black/15 to-white/85 p-[2px]">
        <Card className="w-[400px] max-w-md rounded-2xl bg-neutral-400/30 dark:bg-neutral-950/90 shadow-2xl shadow-black/50 backdrop-blur-sm border-0">
          <CardHeader className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-neutral-700 dark:text-white">
              Подтверждение почты
            </h1>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Separator className="flex-1 bg-neutral-700" />
              <span className="text-xs text-neutral-500">follow the steps</span>
              <Separator className="flex-1 bg-neutral-700" />
            </div>

            {step === "email" && (
              <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                <Input
                  type="email"
                  placeholder="Введите email, указанный при регистрации"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-violet-500/60"
                  required
                />
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 shadow-md"
                  disabled={isSendDisabled}
                >
                  {loading ? "Отправка..." : "Получить код"}
                </Button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleVerify} className="flex flex-col gap-3">
                <Input
                  type="text"
                  placeholder="Введите код из письма"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rounded-xl bg-neutral-400/40 dark:bg-neutral-900 border-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-violet-500/60"
                  required
                />

                <Button
                  type="submit"
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 shadow-md"
                  disabled={loading}
                >
                  {loading ? "Проверка..." : "Подтвердить"}
                </Button>

                <div className="flex flex-col gap-2">
                  {attemptsRemaining > 0 && (
                    <p className="text-xs text-left text-neutral-400">
                      Осталось попыток:{" "}
                      <span className="font-bold text-violet-500">
                        {attemptsRemaining} из {MAX_ATTEMPTS}
                      </span>
                    </p>
                  )}

                  {unlocksAt && (
                    <p className="text-xs text-left text-red-500 font-semibold flex items-center gap-1">
                      <Clock size={14} />
                      Разблокировка через: {formatRemainingTime(unlocksAt)}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleSendCode(e as any)}
                    disabled={isSendDisabled}
                    className="text-violet-500 hover:text-violet-600 underline text-sm flex items-center gap-2 w-fit disabled:text-neutral-400 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    <Repeat2 size={16} />
                    Отправить код ещё раз
                  </button>
                </div>
              </form>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-green-500 font-medium text-center">{message || "Готово"}</p>
                <Button
                  onClick={() => navigate("/login")}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 shadow-md flex items-center gap-2"
                >
                  <LogIn size={18} />
                  Войти
                </Button>
              </div>
            )}

            {/* Сообщения */}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {message && step !== "success" && (
              <p className="text-green-500 text-sm text-center">{message}</p>
            )}

            {/* Кнопка открытия Gmail (если не успешно) */}
            {step !== "success" && (
              <div className="flex justify-center">
                <Button
                  onClick={openGmail}
                  className="rounded-xl bg-red-500 hover:bg-red-600 shadow-md flex items-center gap-2"
                >
                  <Mail size={18} />
                  Gmail
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Verification;
