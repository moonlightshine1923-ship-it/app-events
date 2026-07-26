# Event Manager Algérie - Node.js + Express 5 + MySQL

Application complète de gestion d'événements avec toutes les rubriques demandées:

### Fonctionnalités implémentées

**1. Gestion de base**
- Rubriques / Catégories (couleur, description)
- Événements : titre, thème, emplacement, wilaya (58 wilayas), dates, budget initial, nb personnes, nb invités, exposants, VIP, statut
- Sélection wilaya → liste hôtels disponibles dans cette wilaya (API `/wilayas/:id/hotels` et filtre `/hotels?wilaya_id=`)
- Rubrique hôtels : ajouter vos hôtels manuellement (nom, étoiles, adresse, capacité, prix moyen, contact)

**2. Participants**
- Types : exposant, invite_vip, invite_normal, autre (extensible avec type_custom)
- Email obligatoire pour exposants (demandé)
- Recherche et filtre par type

**3. Exposants**
- Fiche technique, convoqué par, domaine d'activité, superficie demandée, besoins spéciaux
- Paiement : a_payé, méthode (espèces/virement/chèque/versement), montant payé, restant, date
- **Quand on ajoute un exposant, son stand est automatiquement créé** (numéro auto S-001, position grid, statut occupé) - logique transactionnelle

**4. Stands & Plan**
- Tableau stands : numéro, zone, taille, superficie, prix, équipement, statut (libre/reserve/occupe/indisponible), pos_x/y
- Génération automatique plan : vous choisissez rows/cols → crée grille 8 colonnes par défaut
- Plan coloré : libre (gris), réservé (jaune), occupé (vert) - visuel direct places prises / libres
- Légende compteurs

**5. Employés & Équipe**
- Postes : hôtesse_accueil, agent_securite, organisateur, technicien, chauffeur, nettoyage, autre + poste_custom
- Tâches attribuées, lieu d'affectation (Hall A, Entrée VIP...)
- Salaire/jour x nb_jours = salaire_total (colonne générée MySQL) → total global sortants

**6. Finance - Entrants / Sortants**
- Entrants : budget_initial (saisi à création event) + somme exposants payés + somme sponsors
- Sortants : employés (total salaires) + conventions + billets avion + réservations hôtel + restauration (prix_par_personne x nb_personnes)
- Endpoint `/events/:id/finance` calcule balance en temps réel
- Dashboard affiche bilan financier global avec cartes colorées

**7. Restauration**
- Config : nb salles VIP / normales, capacité
- Menus : type (petit_dej, dejeuner, diner, pause_cafe_mat/aprem, cocktail), nom, description, prix/personne, fournisseur
- Affectations : personne + menu + type_salle (vip/normale) + nb_personnes + date
- **VIP automatiquement affectés à liste VIP** : si type personne = invite_vip et pas de salle spécifiée → salle VIP
- Summary et total restauration ajouté au bilan global

**8. Sponsors**
- Types platinium, gold, silver, bronze (badges colorés + tri)
- Montant, logo upload, contact, avantages, statut paiement
- Finance sponsors inclus dans entrants

**9. Conventions (hotel, photographe, traiteur...)**
- Type + fournisseur, titre, montant, montant payé, dates, statut, description, contact
- Upload docs multiples (pdf/doc/images) stockés JSON document_paths
- Total conventions inclus dans sortants

**10. Billets d'avion**
- Par personne invitée, compagnie, num vol aller/retour, aéroports, dates départ/retour, classe, prix, statut, fichier billet upload
- Total billets inclus dans sortants
- Gestion réservation

**11. Réservation Chambres Hôtel**
- Hôtel, type chambre (single/double/triple/suite), numéro, capacité max, prix/nuit, nb nuits, prix_total (generated), dates, statut
- Occupants (table liaison reservation_occupants) - plusieurs personnes par chambre
- **Alerte intelligente** : si on retire une personne d'une chambre double/triple et il ne reste que 1 occupant → crée alerte dans hotel_alerts + notifications : "Changer en single pour diminuer frais"
- API `/reservations/event/:id/alerts` affiche alertes

**12. Programme / Déroulement**
- Jour, heure début/fin, titre, description, type (discours, presentation, pause, atelier, table_ronde, dejeuner, ceremonie...)
- Intervenant : nom, prénom, poste, is_vip, email, thème, salle, ordre
- Upload présentation pdf/ppt/pptx/doc/docx
- Affiché chronologique

**13. Users & Accès**
- Roles : super_admin, admin, manager, finance, viewer
- Permissions JSON extensible (ex: {"events":true,"finance":true})
- JWT auth, Middleware authorize
- Premier super admin via `/auth/first-admin` si 0 users

**14. Journal Audit**
- Table audit_logs : user_id, action (METHOD path), table_name, record_id, old/new values, IP, user_agent
- Middleware audit log sur POST/PUT/DELETE
- Endpoint `/audit-logs?limit=100`
- Section Audit dans frontend

**15. Autres**
- Notifications globales pour alertes hôtel etc
- Uploads dossiers séparés : presentations, billets, conventions, sponsors
- Health check

### Installation

```bash
cd event-manager
npm install
cp .env.example .env
# éditer .env avec vos infos MySQL
```

Créez DB MySQL et initialisez:

```bash
# Option 1 via API après lancement
npm run dev
# POST http://localhost:3000/api/init-db
# puis POST http://localhost:3000/api/auth/first-admin {"username":"admin","email":"admin@dz","password":"admin123"}

# Option 2 manuel
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/seed_wilayas.sql
```

Lancer:

```bash
npm start
# ou dev avec watch
npm run dev
```

Frontend : http://localhost:3000
API : http://localhost:3000/api/health

### Structure API

- POST /api/auth/login, /auth/first-admin, /auth/register (protégé)
- GET /api/wilayas, /wilayas/:id/hotels
- CRUD /api/rubriques, /hotels, /events
- GET /api/events/:id/finance, /events/:id/stats
- CRUD /api/personnes/event/:eventId
- CRUD /api/exposants/event/:eventId (auto stand)
- CRUD /api/stands/event/:eventId + /stands/event/:eventId/generate
- CRUD /api/employes/event/:eventId
- CRUD /api/sponsors/event/:eventId
- Restauration : /restauration/event/:id/config, /menus, /affectations, /summary
- Conventions, billets, reservations, programmes, notifications, audit-logs

### Frontend

SPA Vanilla JS + Bootstrap 5, sidebar, dashboard finance avec cartes, plan stands interactif, tables complètes, modals pour CRUD, gestion token JWT localStorage, toasts.

Toutes les rubriques demandées sont présentes et fonctionnelles.

### Notes Algerie

Wilayas 58 avec codes et noms arabes inclus, seed SQL.

### Sécurité

- bcryptjs hash
- JWT
- Multer file filter 20MB
- CORS + Morgan
- Permissions

Enjoy!
