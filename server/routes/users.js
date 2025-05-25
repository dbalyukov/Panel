const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, checkRole } = require('../utils/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT id, name, email, role 
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

// Другие методы (PUT, DELETE) аналогично...

module.exports = router;