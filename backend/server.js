require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security Middleware ──
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Global Rate Limiter ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Stricter Auth Rate Limiter ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ── Routes ──
app.use('/api/auth',         authLimiter, require('./routes/auth'));
app.use('/api/students',     require('./routes/students'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/aptitude',     require('./routes/aptitude'));
app.use('/api/dsa',          require('./routes/dsa'));
app.use('/api/mockoa',       require('./routes/mockoa'));
app.use('/api/interview',    require('./routes/interview'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/code',         require('./routes/code'));
app.use('/api/companyoa', require('./routes/companyoa'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/upload', require('./routes/upload'));

// ── Health Check ──
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date() })
);

// ── 404 Handler ──
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅  Server running on http://localhost:${PORT}`)
);
