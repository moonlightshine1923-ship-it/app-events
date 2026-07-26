import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!users.length || !users[0].is_active) return res.status(401).json({ error: 'Utilisateur invalide' });
    req.user = users[0];
    // parse permissions if string
    if (typeof req.user.permissions === 'string') {
      try { req.user.permissions = JSON.parse(req.user.permissions); } catch { req.user.permissions = {}; }
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide', details: e.message });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
    if (roles.length && !roles.includes(req.user.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
};

// Permission check granular
export const checkPermission = (permKey) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin' || req.user.role === 'admin') return next();
    const perms = req.user.permissions || {};
    if (perms[permKey] || perms['all']) return next();
    return res.status(403).json({ error: `Permission ${permKey} requise` });
  };
};
