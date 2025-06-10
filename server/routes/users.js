const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, checkRole, hashPassword, comparePasswords } = require('../utils/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT id, name, email, role, created_at, updated_at 
      FROM users 
      ORDER BY name
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, checkRole('Администратор'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await hashPassword(password);
    
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role) 
       VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, role]
    );
    
    const [newUser] = await pool.query(
      `SELECT id, name, email, role 
       FROM users WHERE id = ?`,
      [result.insertId]
    );
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [users] = await pool.query(
      `SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?`,
      [userId]
    );
    if (!users.length) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Необходимо указать старый и новый пароль' });
    }
    // Получаем текущий хэш пароля
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const user = users[0];
    // Проверяем старый пароль
    const isMatch = await comparePasswords(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Старый пароль неверен' });
    }
    // Обновляем пароль
    const hashedPassword = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, checkRole('Администратор'), async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const { id } = req.params;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
      [name, email, role, id]
    );
    const [updatedUser] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    if (!updatedUser.length) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(updatedUser[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, checkRole('Администратор'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;