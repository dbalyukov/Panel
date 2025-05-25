const express = require('express');
const router = express.Router();
const pool = require('../db');
const { generateToken, comparePasswords } = require('../utils/auth');

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [login]
    );

    if (!users.length) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const user = users[0];
    const isMatch = await comparePasswords(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const token = generateToken(user);
    const { password: _, ...userData } = user;

    res.json({ 
      token,
      user: userData,
      expiresIn: 24 * 60 * 60 // 24 часа в секундах
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;