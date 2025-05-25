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
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});