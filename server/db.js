const mysql = require('mysql2/promise');
const { db } = require('./config');

const pool = mysql.createPool({
  host: db.host,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Проверка подключения
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  });

// Обработка ошибок пула соединений
pool.on('error', (err) => {
  console.error('Unexpected error on idle connection', err);
  process.exit(-1);
});

module.exports = pool;