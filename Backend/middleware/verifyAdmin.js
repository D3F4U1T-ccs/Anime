// middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function verifyAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Нет токена" });

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: "Пользователь не найден" });
        if (!user.isAdmin) return res.status(403).json({ message: "Нет доступа" });

        req.user = user; // можно использовать дальше
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка проверки администратора" });
    }
}

module.exports = verifyAdmin;
