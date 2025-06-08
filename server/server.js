require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const { port } = require('./config');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet());

// Serve static files
app.use(express.static('client'));

// Лимитер запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // лимит запросов
});
app.use(limiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Health check
app.get('/health', (req, res) => res.sendStatus(200));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Неверные учетные данные' });
  }
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Страница не найдена' });
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});