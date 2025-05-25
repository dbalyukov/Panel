const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { secret, tokenExpiresIn } = require('../config');

module.exports = {
  hashPassword: async (password) => await bcrypt.hash(password, 10),
  
  comparePasswords: async (inputPassword, hashedPassword) => 
    await bcrypt.compare(inputPassword, hashedPassword),

  generateToken: (user) => jwt.sign(
    { userId: user.id, role: user.role },
    secret,
    { expiresIn: tokenExpiresIn }
  ),

  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

    jwt.verify(token, secret, (err, user) => {
      if (err) return res.status(403).json({ error: 'Недействительный токен' });
      req.user = user;
      next();
    });
  },

  checkRole: (requiredRole) => (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    next();
  }
};