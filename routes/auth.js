import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authenticate, authorize, isPrivilegedRole } from '../middleware/auth.js';

const router = express.Router();

// Register first super_admin or admin creates users
router.post('/register', authenticate, authorize('super_admin','admin'), async (req,res)=>{
  const { username, email, password, role, permissions } = req.body;
  if(!username||!email||!password) return res.status(400).json({error:'Champs requis manquants'});
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      'INSERT INTO users (username,email,password_hash,role,permissions) VALUES (?,?,?,?,?)',
      [username,email,hash,role||'manager', JSON.stringify(permissions||{})]
    );
    res.json({ id: result.insertId, message:'Utilisateur créé' });
  } catch(e){
    res.status(400).json({ error:e.message });
  }
});

// public first super admin creation if no users
router.post('/first-admin', async (req,res)=>{
  const [cnt] = await pool.query('SELECT COUNT(*) as c FROM users');
  if(cnt[0].c>0) return res.status(403).json({error:'Admin existe déjà'});
  const { username,email,password } = req.body;
  const hash = await bcrypt.hash(password,10);
  const [result]= await pool.query('INSERT INTO users (username,email,password_hash,role,permissions) VALUES (?,?,?,?,?)',
    [username,email,hash,'super_admin', JSON.stringify({all:true})]);
  res.json({ id: result.insertId, message:'Super admin créé' });
});

router.post('/login', async (req,res)=>{
  const { email, username, password } = req.body;
  const identifier = email || username;
  if(!identifier||!password) return res.status(400).json({error:'Identifiants manquants'});
  const [rows] = await pool.query('SELECT * FROM users WHERE email=? OR username=? LIMIT 1',[identifier,identifier]);
  if(!rows.length) return res.status(401).json({error:'Utilisateur non trouvé'});
  const user = rows[0];
  if(!user.is_active) return res.status(403).json({error:'Compte désactivé'});
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(401).json({error:'Mot de passe incorrect'});
  const token = jwt.sign({ id:user.id, role:user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN||'7d' });
  res.json({ token, user: { id:user.id, username:user.username, email:user.email, role:user.role, permissions:user.permissions }});
});

router.get('/me', authenticate, async (req,res)=>{
  res.json(req.user);
});

router.get('/users', authenticate, authorize('super_admin','admin'), async (req,res)=>{
  const [users] = await pool.query('SELECT id,username,email,role,permissions,is_active,created_at FROM users ORDER BY id DESC');
  res.json(users);
});

router.put('/users/:id', authenticate, authorize('super_admin','admin'), async (req,res)=>{
  const { role, permissions, is_active } = req.body;
  await pool.query('UPDATE users SET role=?, permissions=?, is_active=? WHERE id=?',[role, JSON.stringify(permissions||{}), is_active?1:0, req.params.id]);
  res.json({ message:'Mis à jour' });
});

router.delete('/users/:id', authenticate, authorize('super_admin'), async (req,res)=>{
  // Strict: only a genuine super_admin may delete users (normalize role check).
  if(!isPrivilegedRole(req.user.role)) return res.status(403).json({ error:'Réservé au super admin' });
  await pool.query('DELETE FROM users WHERE id=?',[req.params.id]);
  res.json({ message:'Supprimé' });
});

export default router;