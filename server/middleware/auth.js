import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'imv2_default_secret';

/**
 * Sign a JWT token with the given payload.
 * @param {object} payload - { userId, email, workspaceId?, role? }
 * @returns {string} signed JWT (24h expiry)
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Express middleware: verify Bearer token from Authorization header.
 * Sets req.user = { userId, email, workspaceId, role }.
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      workspaceId: decoded.workspaceId || null,
      role: decoded.role || null,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

/**
 * Returns middleware that checks req.user.role against the allowed roles.
 * Must be used AFTER verifyToken.
 * @param  {...string} roles - e.g. 'admin', 'gestionnaire'
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit — rôle insuffisant' });
    }
    next();
  };
}
