const pool = require('../db');
const { hashPassword } = require('../utils/auth');

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('Администратор', 'Редактор', 'Гость') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Создание начального админа
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
    if (users.length === 0) {
      const hashedPassword = await hashPassword('admin123');
      await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin', 'admin@example.com', hashedPassword, 'Администратор']
      );
      console.log('Создан начальный администратор');
    }

    console.log('База данных успешно инициализирована');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка инициализации БД:', error);
    process.exit(1);
  }
}

initDB();