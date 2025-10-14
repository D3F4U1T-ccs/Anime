const User = require("../models/User");

async function verifyAdmin(req, res, next) {
  try {
    const email = req.body.email; // получаем email из запроса
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    if (!user.isAdmin) return res.status(403).json({ message: "Нет доступа" });

    next();
  } catch (err) {
    res.status(500).json({ message: "Ошибка проверки администратора" });
  }
}

module.exports = verifyAdmin;
