const nodemailer = require('nodemailer');

// ── Transporter (Gmail with App Password) ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not real password)
  },
});

// ── Verify connection on startup ──
transporter.verify((err) => {
  if (err) console.error('❌  Email transporter error:', err.message);
  else     console.log('✅  Email transporter ready');
});

module.exports = transporter;