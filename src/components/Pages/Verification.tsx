import React, { useState } from "react";


const Verification: React.FC = () => {
	const [email, setEmail] = useState(() => localStorage.getItem("pendingEmail") || "");
	const [code, setCode] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [step, setStep] = useState<"email"|"code"|"success">(() => localStorage.getItem("pendingEmail") ? "code" : "email");
	const [loading, setLoading] = useState(false);

	// Отправить код на email
	const handleSendCode = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setMessage("");
		setLoading(true);
		try {
			const res = await fetch("http://localhost:5000/api/send-code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = await res.json();
			if (res.ok) {
				setMessage("Код отправлен на почту.");
				setStep("code");
				localStorage.setItem("pendingEmail", email);
			} else {
				setError(data.message || "Ошибка отправки кода");
			}
		} catch {
			setError("Ошибка соединения с сервером");
		}
		setLoading(false);
	};

	// Проверить код
		const handleVerify = async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			setMessage("");
			setLoading(true);
			try {
				const res = await fetch("http://localhost:5000/api/verify-code", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, code }),
				});
				const data = await res.json();
				if (res.ok) {
					setMessage("Почта успешно подтверждена! Теперь вы можете войти.");
					setStep("success");
					localStorage.removeItem("pendingEmail");
				} else {
					setError(data.message || "Неверный код");
				}
			} catch {
				setError("Ошибка соединения с сервером");
			}
			setLoading(false);
		};

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh]">
			<div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 w-full max-w-sm flex flex-col gap-4 items-center">
				<h2 className="text-2xl font-bold text-center mb-2 text-gray-700 dark:text-white">Подтвердите вашу почту</h2>
				{step === "email" && (
					<form onSubmit={handleSendCode} className="w-full flex flex-col gap-3">
						<input
							type="email"
							placeholder="Введите email, который вы указали при регистрации"
							value={email}
							onChange={e => setEmail(e.target.value)}
							className="px-3 py-2 rounded border text-gray-600 border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
							required
						/>
						<button type="submit" className="bg-indigo-500 text-white font-semibold py-2 rounded transition-colors" disabled={loading}>
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
							onChange={e => setCode(e.target.value)}
							className="px-3 py-2 rounded border text-gray-600 border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
							required
						/>
						<button type="submit" className="bg-green-500 text-white font-semibold py-2 rounded transition-colors" disabled={loading}>
							{loading ? "Проверка..." : "Подтвердить"}
						</button>
						<button type="button" className="text-indigo-500 underline text-sm" onClick={handleSendCode} disabled={loading}>
							Отправить код ещё раз
						</button>
					</form>
				)}
				{step === "success" && (
					<div className="text-green-600 text-center font-semibold">{message}</div>
				)}
				{error && <div className="text-red-500 text-sm text-center">{error}</div>}
				{message && step !== "success" && <div className="text-green-500 text-sm text-center">{message}</div>}
				<span className="text-4xl">📧</span>
			</div>
		</div>
	);
};

export default Verification;
