const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, is_active, email_verified')
      .eq('id', decoded.id)
      .maybeSingle();

    if (error) {
      console.error('Authentication account lookup failed:', error.message);
      return res.status(503).json({ error: 'Unable to verify account. Please try again.' });
    }

    if (!user || !user.is_active || user.email_verified !== true) {
      return res.status(401).json({ error: 'Account unavailable. Please log in again.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in.' });
  }
};