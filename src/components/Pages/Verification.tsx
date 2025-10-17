// Verification.tsx

import React, { useState, useEffect, } from "react";
import { Mail, LogIn, Repeat2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MAX_ATTEMPTS = 3;

// Форматирование времени до разблокировки
const formatRemainingTime = (unlocksAt: string) => {
    const unlockDate = new Date(unlocksAt);
    const now = new Date();
    const diffMs = unlockDate.getTime() - now.getTime();
    
    // Учитываем, что может быть меньше минуты, но округляем до целых минут
    if (diffMs <= 0) return "Сейчас";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Убеждаемся, что не показываем "0 ч." если только это не 0 часов и 0 минут (что уже обработано выше)
    const hourPart = hours > 0 ? `${hours} ч. ` : '';
    // Если часов нет, но есть минуты (даже 1), показываем минуты.
    const minutePart = `${minutes} мин.`; 

    return hourPart + minutePart;
};

const Verification: React.FC = () => {
    const [email, setEmail] = useState(() => localStorage.getItem("pendingEmail") || "");
    const [code, setCode] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [step, setStep] = useState<"email" | "code" | "success">(() =>
        localStorage.getItem("pendingEmail") ? "code" : "email"
    );
    const [loading, setLoading] = useState(false);
    
    // 💡 СОСТОЯНИЕ ДЛЯ ЛИМИТА
    const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS); 
    const [unlocksAt, setUnlocksAt] = useState<string | null>(null);

    const navigate = useNavigate();

    // 💡 Новая функция для получения статуса лимита
    const checkAttemptsStatus = async (userEmail: string) => {
        try {
            // Используем тот же эндпоинт, но не отправляем код
            const res = await fetch("http://localhost:5000/api/send-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, checkOnly: true }), 
            });
            const data = await res.json();
            
            if (!res.ok && data.action === "LIMIT_EXCEEDED") {
                setError(data.message);
                setAttemptsRemaining(0);
                setUnlocksAt(data.unlocksAt);
            } else if (data.attemptsRemaining !== undefined) {
                // Если статус 200/OK, получаем попытки
                setAttemptsRemaining(data.attemptsRemaining);
                setUnlocksAt(null); 
            }
        } catch (err) {
            console.error("Не удалось проверить статус попыток:", err);
            // Тут ошибку не ставим, чтобы не сбивать пользователя, т.к. это фоновая проверка
        }
    };

    // 💡 Эффект для автоматической проверки оставшихся попыток и таймера
    useEffect(() => {
        if (step === "code" && email) {
            checkAttemptsStatus(email); 
        }
    }, [step, email]);

    // Таймер для автоматического обновления сообщения о блокировке
    useEffect(() => {
        if (unlocksAt) {
            const timer = setInterval(() => {
                const unlockDate = new Date(unlocksAt);
                if (new Date() >= unlockDate) {
                    clearInterval(timer);
                    setUnlocksAt(null);
                    setError("");
                    checkAttemptsStatus(email); // Сразу проверяем статус после разблокировки
                } else {
                    // Используем фиктивный set для триггера ререндера, чтобы обновить время
                    setError(prev => prev);
                }
            }, 60000); // Обновляем каждую минуту
            return () => clearInterval(timer);
        }
    }, [unlocksAt, email]);


    // Отправка кода
    const handleSendCode = async (_e: React.FormEvent | MouseEvent) => {
        _e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        
        // Быстрая проверка на фронтенде
        if (attemptsRemaining === 0 && unlocksAt) {
            setError(`Превышен лимит. Попробуйте через ${formatRemainingTime(unlocksAt || "")}.`);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/api/send-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
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
                    setError(data.message);
                    setAttemptsRemaining(0); 
                    setUnlocksAt(data.unlocksAt);
                } else {
                    setError(data.message || "Ошибка отправки кода");
                    if (data.attemptsRemaining !== undefined) {
                        setAttemptsRemaining(data.attemptsRemaining);
                    }
                }
            }
        } catch {
            setError("Ошибка соединения с сервером");
        }
        setLoading(false);
    };

    // Проверка кода
    const handleVerify = async (_e: React.FormEvent) => {
        _e.preventDefault();
        setError(""); // <--- Очистка ошибки перед началом
        setMessage("");
        setLoading(true);
        try {
            // 💡 ЭТОТ БЛОК БЫЛ ПРОПУЩЕН, ИЗ-ЗА ЧЕГО ВОЗНИКЛА ОШИБКА
            const res = await fetch("http://localhost:5000/api/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();
            // ----------------------------------------------------

            if (res.ok) {
                setError(""); // УБЕДИТЬСЯ, ЧТО ОШИБКИ НЕТ
                setMessage(data.message || "Почта успешно подтверждена! Теперь вы можете войти.");
                setStep("success");
                localStorage.removeItem("pendingEmail");
                setAttemptsRemaining(MAX_ATTEMPTS); // Сброс
                setUnlocksAt(null);
            } else {
                // Если сервер вернул 4xx, 5xx
                setError(data.message || "Неверный код");
                if (data.attemptsRemaining !== undefined) {
                    setAttemptsRemaining(data.attemptsRemaining);
                }
            }
        } catch {
            setError("Ошибка соединения с сервером");
        }
        setLoading(false);
    };

    // Открыть Gmail
    const openGmail = () => {
        window.open("https://mail.google.com/", "_blank");
    };

    const isSendDisabled = loading || attemptsRemaining === 0;

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 w-full max-w-sm flex flex-col gap-4 items-center">
                <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-white">
                    Подтверждение почты
                </h2>

                <p className="text-sm text-center mb-1 text-gray-500 dark:text-gray-400">
                    Пожалуйста, подтвердите свою почту.
                </p>

                {step === "email" && (
                    <form onSubmit={handleSendCode} className="w-full flex flex-col gap-3">
                        <input
                            type="email"
                            placeholder="Введите email, указанный при регистрации"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="px-3 py-2 rounded border text-gray-600 border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            required
                        />
                        <button
                            type="submit"
                            className="bg-indigo-500 text-white font-semibold py-2 rounded transition-colors hover:bg-indigo-600 disabled:bg-indigo-400"
                            disabled={isSendDisabled}
                        >
                            {loading ? "Отправка..." : "Получить код"}
                        </button>
                    </form>
                )}

                {step === "code" && (
                    <form onSubmit={handleVerify} className="w-full flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="Введите код из письма"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="px-3 py-2 rounded border text-gray-600 border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            required
                        />
                        <button
                            type="submit"
                            className="bg-green-500 text-white font-semibold py-2 rounded transition-colors hover:bg-green-600 disabled:bg-green-400"
                            disabled={loading}
                        >
                            {loading ? "Проверка..." : "Подтвердить"}
                        </button>
                        
                        {/* 💡 БЛОК ОГРАНИЧЕНИЯ ПОПЫТОК */}
                        <div className="flex flex-col gap-2 mt-1">
                            {attemptsRemaining > 0 && (
                                <p className="text-xs text-left text-gray-500 dark:text-gray-400">
                                    Осталось попыток: <span className="font-bold text-indigo-500">{attemptsRemaining} из {MAX_ATTEMPTS}</span>
                                </p>
                            )}
                            {unlocksAt && (
                                <p className="text-xs text-left text-red-500 dark:text-red-400 font-bold flex items-center gap-1">
                                    <Clock size={14} /> 
                                    Лимит исчерпан. Разблокировка через: {formatRemainingTime(unlocksAt)}
                                </p>
                            )}
                            
                            <button
                                type="button"
                                className="text-indigo-500 hover:text-indigo-600 underline text-sm flex items-center gap-1 disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed w-fit"
                                onClick={handleSendCode}
                                disabled={isSendDisabled}
                            >
                                <Repeat2 size={16} />
                                Отправить код ещё раз
                            </button>
                        </div>
                    </form>
                )}

                {step === "success" && (
                    <div className="text-green-600 text-center font-semibold">{message}</div>
                )}

                {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                {message && step !== "success" && (
                    <div className="text-green-500 text-sm text-center">{message}</div>
                )}

                {/* Нижние кнопки */}
                <div className={`flex gap-3 ${step === "success" ? "justify-center" : "justify-center"}`}>
                    
                    <button
                        onClick={openGmail}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                    >
                        <Mail size={18} />
                        Gmail
                    </button>

                    {step === "success" && (
                        <button
                            onClick={() => navigate("/login")}
                            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                        >
                            <LogIn size={18} />
                            Войти
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Verification;