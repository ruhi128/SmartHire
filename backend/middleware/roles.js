/**
 * Middleware factory: Restrict route to specific roles.
 * Usage: router.get('/admin-only', auth, roles('admin'), handler)
 *        router.get('/multi-role', auth, roles('admin','recruiter'), handler)
 */
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
    });
  }
  next();
};