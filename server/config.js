module.exports = {
  secret: process.env.JWT_SECRET || 'your_strong_secret_key_32_chars_min',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'panel_user',
    password: process.env.DB_PASSWORD || 'your_db_password',
    database: process.env.DB_NAME || 'cloud_panel'
  },
  port: process.env.PORT || 3001,
  tokenExpiresIn: '24h'
};