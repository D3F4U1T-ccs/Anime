// middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function verifyAdmin(req, res, next) {
    try {
        // 1) читаем токен: поддерживаем заголовок Bearer и опционально query/cookie
        const authHeader = req.headers.authorization || "";
        let token = null;

        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) return res.status(401).json({ message: "Нет токена" });

        // 2) проверяем токен и аккуратно обрабатываем ошибки (expired / invalid)
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // Разные статусы для удобной диагностики на фронте
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Токен истёк", code: "TOKEN_EXPIRED" });
            }
            return res.status(401).json({ message: "Неверный токен", code: "TOKEN_INVALID" });
        }

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Неверный токен" });
        }

        // 3) находим пользователя и проверяем isAdmin
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: "Пользователь не найден" });
        if (!user.isAdmin) return res.status(403).json({ message: "Нет доступа" });

        // 4) кладём полезную информацию в req.user
        req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
        };

        // если нужно — можно объявить новый access-token в res.locals
        next();
    } catch (err) {
        console.error("verifyAdmin error:", err);
        // 500 только при реальной ошибке сервера
        res.status(500).json({ message: "Ошибка проверки администратора" });
    }
};
