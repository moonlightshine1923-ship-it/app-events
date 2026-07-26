import express from 'express';
import pool from '../config/db.js';
const router = express.Router();

router.get('/event/:eventId', async (req,res)=>{
  const [rows]= await pool.query('SELECT * FROM notifications WHERE event_id=? ORDER BY created_at DESC LIMIT 100',[req.params.eventId]);
  res.json(rows);
});

router.put('/:id/read', async (req,res)=>{
  await pool.query('UPDATE notifications SET is_read=1 WHERE id=?',[req.params.id]);
  res.json({ message:'lu' });
});

router.get('/alerts/hotel', async (req,res)=>{
  const [rows]= await pool.query('SELECT ha.*, rh.numero_chambre, h.nom as hotel_nom FROM hotel_alerts ha JOIN reservations_hotel rh ON rh.id=ha.reservation_id JOIN hotels h ON h.id=rh.hotel_id WHERE ha.is_read=0 ORDER BY ha.created_at DESC');
  res.json(rows);
});

export default router;
