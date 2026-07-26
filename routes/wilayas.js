import express from 'express';
import pool from '../config/db.js';
const router = express.Router();

router.get('/', async (req,res)=>{
  const [rows] = await pool.query('SELECT * FROM wilayas ORDER BY id');
  res.json(rows);
});

router.get('/:id/hotels', async (req,res)=>{
  const [rows] = await pool.query('SELECT h.*, w.nom as wilaya_nom FROM hotels h JOIN wilayas w ON w.id=h.wilaya_id WHERE h.wilaya_id=? ORDER BY h.nom', [req.params.id]);
  res.json(rows);
});

export default router;
