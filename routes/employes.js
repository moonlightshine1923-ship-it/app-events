import express from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();

router.get('/event/:eventId', async (req,res)=>{
  const [rows]= await pool.query('SELECT * FROM employes WHERE event_id=? ORDER BY poste, nom', [req.params.eventId]);
  res.json(rows);
});

router.post('/', authenticate, async (req,res)=>{
  const { event_id, nom, prenom, poste, poste_custom, telephone, email, tache, lieu_affectation, date_debut, date_fin, salaire_jour, nb_jours, statut_paiement } = req.body;
  if(!event_id||!nom||!prenom||!poste) return res.status(400).json({error:'Champs requis manquants'});
  const [result]= await pool.query(
    `INSERT INTO employes (event_id,nom,prenom,poste,poste_custom,telephone,email,tache,lieu_affectation,date_debut,date_fin,salaire_jour,nb_jours,statut_paiement)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [event_id,nom,prenom,poste,poste_custom||null,telephone||null,email||null,tache||null,lieu_affectation||null,date_debut||null,date_fin||null,salaire_jour||0,nb_jours||1,statut_paiement||'non_paye']
  );
  res.json({ id: result.insertId });
});

router.put('/:id', authenticate, async (req,res)=>{
  const { nom, prenom, poste, poste_custom, telephone, email, tache, lieu_affectation, date_debut, date_fin, salaire_jour, nb_jours, statut_paiement } = req.body;
  await pool.query(
    `UPDATE employes SET nom=?,prenom=?,poste=?,poste_custom=?,telephone=?,email=?,tache=?,lieu_affectation=?,date_debut=?,date_fin=?,salaire_jour=?,nb_jours=?,statut_paiement=? WHERE id=?`,
    [nom,prenom,poste,poste_custom,telephone,email,tache,lieu_affectation,date_debut,date_fin,salaire_jour,nb_jours,statut_paiement,req.params.id]
  );
  res.json({ message:'ok' });
});

router.delete('/:id', authenticate, async (req,res)=>{
  await pool.query('DELETE FROM employes WHERE id=?',[req.params.id]);
  res.json({ message:'supprimé' });
});

export default router;
