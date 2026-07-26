// Event Manager Algeria - Frontend SPA
const API = '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let currentEventId = localStorage.getItem('currentEventId') || null;
let wilayasCache = [];
let eventsCache = [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function authHeaders(isJson=true){
  const h = {};
  if(isJson) h['Content-Type']='application/json';
  if(token) h['Authorization']='Bearer '+token;
  return h;
}

async function apiFetch(url, opts={}){
  opts.headers = { ...(opts.headers||{}), ...authHeaders(!opts.body || !(opts.body instanceof FormData)) };
  if(opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData)){
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(API+url, opts);
  if(res.status===401){
    logout();
    throw new Error('Non authentifié');
  }
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||'Erreur API');
  return data;
}

function toast(msg, type='success'){
  const c = $('#toastContainer');
  const el = document.createElement('div');
  el.className=`toast align-items-center text-bg-${type} border-0 show mb-2`;
  el.innerHTML=`<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  c.appendChild(el);
  setTimeout(()=>el.remove(),4000);
}

// Auth
async function login(){
  const identifier = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  try{
    const data = await fetch(API+'/auth/login',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: identifier, username: identifier, password })}).then(r=>r.json());
    if(data.error) throw new Error(data.error);
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    $('#loginPage').classList.add('d-none');
    $('#appWrapper').classList.remove('d-none');
    await initApp();
    toast('Bienvenue '+currentUser.username);
  }catch(e){ toast(e.message,'danger'); }
}

function logout(){
  localStorage.removeItem('token');
  token=null;
  $('#appWrapper').classList.add('d-none');
  $('#loginPage').classList.remove('d-none');
}

async function firstAdmin(){
  const u=$('#firstUsername').value, e=$('#firstEmail').value, p=$('#firstPassword').value;
  try{
    const data = await fetch(API+'/auth/first-admin',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,email:e,password:p})}).then(r=>r.json());
    if(data.error) throw new Error(data.error);
    toast('Super admin créé, connectez-vous');
    $('#firstAdminForm').classList.add('d-none');
  }catch(err){ toast(err.message,'danger'); }
}

async function initApp(){
  try{
    currentUser = await apiFetch('/auth/me');
    $('#userDisplay').textContent = currentUser.username+' ('+currentUser.role+')';
  }catch{
    // check if first admin needed
    try{
      const health = await fetch(API+'/health').then(r=>r.json());
    }catch{}
  }
  await loadWilayas();
  await loadEvents();
  await loadRubriques();
  await loadHotels();
  await refreshDashboard();
  // check token
  $('#loginPage').classList.add('d-none');
  $('#appWrapper').classList.remove('d-none');
}

async function loadWilayas(){
  try{
    wilayasCache = await apiFetch('/wilayas');
    const sel = $$('.wilaya-select');
    sel.forEach(s=>{
      s.innerHTML='<option value="">-- Choisir Wilaya --</option>'+ wilayasCache.map(w=>`<option value="${w.id}">${w.code} - ${w.nom}</option>`).join('');
      if(currentEventId){
        // keep
      }
    });
  }catch{}
}

async function loadEvents(){
  try{
    eventsCache = await apiFetch('/events');
    const sel = $('#eventSelector');
    if(sel){
      sel.innerHTML='<option value="">-- Tous / Sélectionner Événement --</option>'+ eventsCache.map(e=>`<option value="${e.id}" ${String(e.id)===String(currentEventId)?'selected':''}>${e.titre} (${e.wilaya_nom||''})</option>`).join('');
    }
    const listEl = $('#eventsTableBody');
    if(listEl){
      listEl.innerHTML = eventsCache.map(ev=>`
        <tr>
          <td><span class="badge bg-primary">${ev.rubrique_nom||'—'}</span> ${ev.titre}<br><small class="text-muted">${ev.theme||''}</small></td>
          <td>${ev.wilaya_nom||''}<br><small>${ev.emplacement||''}</small></td>
          <td>${ev.date_debut||''} → ${ev.date_fin||''}</td>
          <td><span class="badge bg-${ev.statut==='planifie'?'success': ev.statut==='en_cours'?'warning':'secondary'}">${ev.statut}</span></td>
          <td>${ev.total_personnes||0} pers / ${ev.total_exposants||0} exp</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="selectEvent(${ev.id})"><i class="bi bi-eye"></i></button>
            <button class="btn btn-sm btn-outline-secondary" onclick="editEvent(${ev.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent(${ev.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
    if(currentEventId) updateEventBadge();
  }catch(e){ console.error(e); }
}

function selectEvent(id){
  currentEventId=id;
  localStorage.setItem('currentEventId', id);
  updateEventBadge();
  refreshDashboard();
  showSection('dashboard');
  toast('Événement sélectionné');
}
function updateEventBadge(){
  const ev = eventsCache.find(x=>String(x.id)===String(currentEventId));
  if(ev){
    $('#currentEventBadge').textContent=ev.titre;
    $('#currentEventBadge').classList.remove('d-none');
  }
}

async function loadRubriques(){
  try{
    const rubs = await apiFetch('/rubriques');
    $('#rubriquesTableBody').innerHTML = rubs.map(r=>`
      <tr>
        <td><span style="display:inline-block;width:12px;height:12px;background:${r.couleur};border-radius:3px"></span> ${r.nom}</td>
        <td>${r.description||''}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteRubrique(${r.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    const sel = $('#eventRubriqueSelect');
    if(sel) sel.innerHTML='<option value="">-- Rubrique --</option>'+rubs.map(r=>`<option value="${r.id}">${r.nom}</option>`).join('');
  }catch{}
}

async function loadHotels(filterWilaya=null){
  try{
    let url='/hotels';
    if(filterWilaya) url+=`?wilaya_id=${filterWilaya}`;
    const hotels = await apiFetch(url);
    $('#hotelsTableBody').innerHTML = hotels.map(h=>`
      <tr>
        <td>${h.nom}<br><small class="text-muted">${h.etoiles}★ ${h.wilaya_nom||''}</small></td>
        <td>${h.adresse||''}<br>${h.telephone||''}</td>
        <td>${h.capacite||0}</td>
        <td>${h.prix_moyen} DA</td>
        <td>
          <button class="btn btn-sm btn-outline-secondary" onclick="editHotel(${h.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteHotel(${h.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    // also populate hotel select for reservations
    const sel = $$('.hotel-select');
    sel.forEach(s=>{
      s.innerHTML='<option value="">-- Hôtel --</option>'+hotels.map(h=>`<option value="${h.id}">${h.nom} (${h.wilaya_nom})</option>`).join('');
    });
  }catch{}
}

function onWilayaChangeForHotels(){
  const wid = $('#filterHotelWilaya').value;
  loadHotels(wid||null);
}

// Dashboard
async function refreshDashboard(){
  if(!currentEventId){
    $('#dashboardEmpty').classList.remove('d-none');
    $('#dashboardContent').classList.add('d-none');
    return;
  }
  $('#dashboardEmpty').classList.add('d-none');
  $('#dashboardContent').classList.remove('d-none');
  try{
    const finance = await apiFetch(`/events/${currentEventId}/finance`);
    const stats = await apiFetch(`/events/${currentEventId}/stats`);
    // finance
    $('#financeEntrants').textContent = finance.entrants.total.toLocaleString()+' DA';
    $('#financeSortants').textContent = finance.sortants.total.toLocaleString()+' DA';
    $('#financeBalance').textContent = finance.balance.toLocaleString()+' DA';
    $('#financeDetail').innerHTML = `
      <li class="list-group-item d-flex justify-content-between"><span>Budget initial</span><b>${finance.entrants.budget_initial} DA</b></li>
      <li class="list-group-item d-flex justify-content-between"><span>Exposants payés</span><b>${finance.entrants.exposants} DA</b></li>
      <li class="list-group-item d-flex justify-content-between"><span>Sponsors</span><b>${finance.entrants.sponsors} DA</b></li>
      <li class="list-group-item d-flex justify-content-between"><span>Employés</span><b class="text-danger">-${finance.sortants.employes} DA</b></li>
      <li class="list-group-item d-flex justify-content-between"><span>Conventions</span><b class="text-danger">-${finance.sortants.conventions} DA</b></li>
      <li class="list-group-item d-flex justify-content-between"><span>Billets</span><b class="text-danger">-${finance.sortants.billets} DA</b></li>
      <li class="list-group-item d-flex justify-content-between"><span>Hôtels</span><b class="text-danger">-${finance.sortants.hotels} DA</b></li>
      <li class="list-group-item d-flex justify-content-between"><span>Restauration</span><b class="text-danger">-${finance.sortants.restauration} DA</b></li>
    `;
    // stats
    $('#statPersonnes').textContent = (stats.personnes?.total||0);
    $('#statExposants').textContent = (stats.personnes?.exposants||0);
    $('#statVip').textContent = (stats.personnes?.vip||0);
    $('#statStands').textContent = `${stats.stands?.occupes||0}/${stats.stands?.total||0}`;
    $('#statEmployes').textContent = (stats.employes?.total||0);
    $('#statSponsors').textContent = (stats.sponsors?.total||0);

    // load notifications + alerts
    loadNotifications();
    loadHotelAlerts();
    loadExposants();
    loadStandsPlan();
    loadPersonnes();
    loadEmployes();
    loadSponsors();
    loadRestauration();
    loadProgrammes();
    loadConventions();
    loadBillets();
    loadReservations();
    loadAudit();
  }catch(e){ console.error(e); toast(e.message,'danger'); }
}

// Exposants
async function loadExposants(){
  if(!currentEventId) return;
  try{
    const expos = await apiFetch(`/exposants/event/${currentEventId}`);
    $('#exposantsTableBody').innerHTML = expos.map(ex=>`
      <tr>
        <td>${ex.nom} ${ex.prenom}<br><small>${ex.entreprise||''} | ${ex.email||''}</small></td>
        <td>${ex.domaine_activite||''}<br><small>Convoqué par: ${ex.convoque_par||''}</small></td>
        <td><span class="badge bg-${ex.stand_statut==='occupe'?'success':'warning'}">${ex.stand_numero||'—'} ${ex.zone||''}</span></td>
        <td><span class="badge bg-${ex.a_paye?'success':'danger'}">${ex.a_paye?'Payé':'Non payé'}</span><br>${ex.methode_paiement||''} ${ex.montant_paye||0} DA</td>
        <td><button class="btn btn-sm btn-outline-secondary" onclick="viewFicheTech(${ex.id})"><i class="bi bi-file-text"></i></button></td>
      </tr>
    `).join('');
  }catch{}
}

// Personnes
async function loadPersonnes(){
  if(!currentEventId) return;
  try{
    const typeFilter = $('#filterPersonneType')?.value || '';
    let url=`/personnes/event/${currentEventId}`;
    if(typeFilter) url+=`?type=${typeFilter}`;
    const pers = await apiFetch(url);
    $('#personnesTableBody').innerHTML = pers.map(p=>`
      <tr>
        <td><span class="badge bg-${p.type==='exposant'?'primary': p.type==='invite_vip'?'warning text-dark':'info'}">${p.type}</span> ${p.nom} ${p.prenom}</td>
        <td>${p.email||''}<br><small>${p.telephone||''}</small></td>
        <td>${p.entreprise||''} - ${p.poste||''}</td>
        <td>${p.wilaya_nom||''}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePersonne(${p.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    // populate person selects
    const sel = $$('.personne-select');
    sel.forEach(s=>{
      s.innerHTML='<option value="">-- Personne --</option>'+pers.map(p=>`<option value="${p.id}">${p.nom} ${p.prenom} (${p.type})</option>`).join('');
    });
  }catch{}
}

// Stands plan
async function loadStandsPlan(){
  if(!currentEventId) return;
  try{
    const stands = await apiFetch(`/stands/event/${currentEventId}`);
    const grid = $('#standsGrid');
    if(!grid) return;
    if(!stands.length){
      grid.innerHTML='<div class="p-4 text-center text-muted">Aucun stand. Générez un plan automatique.</div>';
      return;
    }
    grid.innerHTML = stands.map(s=>`
      <div class="stand-box ${s.statut}" title="${s.numero} - ${s.taille||''} - ${s.entreprise||''}">
        <strong>${s.numero}</strong>
        <small>${s.statut}</small>
        ${s.nom?`<small class="text-truncate">${s.nom} ${s.prenom||''}</small>`:''}
        ${s.entreprise?`<small>${s.entreprise}</small>`:''}
      </div>
    `).join('');
    $('#standsLegend').innerHTML = `Libres: ${stands.filter(s=>s.statut==='libre').length} | Réservés: ${stands.filter(s=>s.statut==='reserve').length} | Occupés: ${stands.filter(s=>s.statut==='occupe').length} | Total: ${stands.length}`;
  }catch{}
}

// Employes
async function loadEmployes(){
  if(!currentEventId) return;
  try{
    const empl = await apiFetch(`/employes/event/${currentEventId}`);
    $('#employesTableBody').innerHTML = empl.map(e=>`
      <tr>
        <td>${e.nom} ${e.prenom}<br><small>${e.email||''}</small></td>
        <td><span class="badge bg-dark">${e.poste}</span> ${e.poste_custom||''}</td>
        <td>${e.tache||''}<br><small>Lieu: ${e.lieu_affectation||''}</small></td>
        <td>${e.salaire_jour} x ${e.nb_jours} = <b>${e.salaire_total} DA</b></td>
        <td><span class="badge bg-${e.statut_paiement==='paye'?'success': e.statut_paiement==='partiel'?'warning':'danger'}">${e.statut_paiement}</span></td>
      </tr>
    `).join('');
  }catch{}
}

// Sponsors
async function loadSponsors(){
  if(!currentEventId) return;
  try{
    const spons = await apiFetch(`/sponsors/event/${currentEventId}`);
    $('#sponsorsTableBody').innerHTML = spons.map(s=>`
      <tr>
        <td><span class="badge badge-${s.type}">${s.type.toUpperCase()}</span> ${s.nom}</td>
        <td>${s.entreprise||''}<br>${s.contact_nom||''} ${s.contact_email||''}</td>
        <td>${s.montant} DA<br><span class="badge bg-${s.statut_paiement==='paye'?'success':'warning'}">${s.statut_paiement}</span></td>
        <td>${s.avantages||''}</td>
      </tr>
    `).join('');
  }catch{}
}

// Restauration
async function loadRestauration(){
  if(!currentEventId) return;
  try{
    const config = await apiFetch(`/restauration/event/${currentEventId}/config`);
    const menus = await apiFetch(`/restauration/event/${currentEventId}/menus`);
    const affect = await apiFetch(`/restauration/event/${currentEventId}/affectations`);
    const summary = await apiFetch(`/restauration/event/${currentEventId}/summary`);
    $('#restaurationConfig').innerHTML = `
      <div class="row">
        <div class="col-6">Salles VIP: ${config.nb_salles_vip} (cap ${config.capacite_salle_vip})</div>
        <div class="col-6">Salles Normales: ${config.nb_salles_normales} (cap ${config.capacite_salle_normale})</div>
      </div>
    `;
    $('#restaurationMenusBody').innerHTML = menus.map(m=>`
      <tr><td><span class="badge bg-secondary">${m.type_repas}</span> ${m.nom_menu}</td><td>${m.description||''}</td><td>${m.prix_par_personne} DA</td><td>${m.fournisseur||''}</td></tr>
    `).join('');
    $('#restaurationAffectBody').innerHTML = affect.map(a=>`
      <tr><td>${a.nom} ${a.prenom} <span class="badge bg-${a.type==='invite_vip'?'warning':'light text-dark'}">${a.type}</span></td><td><span class="badge bg-${a.type_salle==='vip'?'warning text-dark':'primary'}">${a.type_salle}</span></td><td>${a.nom_menu||''} (${a.type_repas||''})</td><td>${a.prix_par_personne||0} x ${a.nb_personnes}</td></tr>
    `).join('');
    $('#restaurationSummary').innerHTML = `VIP: ${summary.vip} | Normale: ${summary.normale} | Total: ${summary.total} DA`;
  }catch{}
}

// Programme
async function loadProgrammes(){
  if(!currentEventId) return;
  try{
    const prog = await apiFetch(`/programmes/event/${currentEventId}`);
    $('#programmesTableBody').innerHTML = prog.map(p=>`
      <tr>
        <td>${p.jour} ${p.heure_debut}→${p.heure_fin}</td>
        <td><b>${p.titre}</b><br><small>${p.description||''} ${p.theme?'- Thème: '+p.theme:''}</small></td>
        <td>${p.intervenant_nom||''} ${p.intervenant_prenom||''}<br><small>${p.intervenant_poste||''} ${p.intervenant_is_vip?'<span class="badge bg-warning text-dark">VIP</span>':''}</small></td>
        <td>${p.salle||''}</td>
        <td>${p.presentation_file?`<a href="/${p.presentation_file}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark"></i> Voir</a>`:'—'}</td>
      </tr>
    `).join('');
  }catch{}
}

// Conventions
async function loadConventions(){
  if(!currentEventId) return;
  try{
    const conv = await apiFetch(`/conventions/event/${currentEventId}`);
    $('#conventionsTableBody').innerHTML = conv.map(c=>`
      <tr><td><span class="badge bg-dark">${c.type}</span></td><td>${c.fournisseur}<br>${c.titre||''}</td><td>${c.montant} DA (payé ${c.montant_paye})</td><td>${c.statut}</td><td>${(c.document_paths||[]).length} docs</td></tr>
    `).join('');
  }catch{}
}

// Billets
async function loadBillets(){
  if(!currentEventId) return;
  try{
    const billets = await apiFetch(`/billets/event/${currentEventId}`);
    const total = await apiFetch(`/billets/event/${currentEventId}/total`).catch(()=>({total:0}));
    $('#billetsTableBody').innerHTML = billets.map(b=>`
      <tr><td>${b.nom} ${b.prenom} (${b.type})</td><td>${b.compagnie||''} ${b.num_vol_aller||''} ${b.aeroport_depart||''}→${b.aeroport_arrivee||''}</td><td>${b.date_depart||''} / ${b.date_retour||''}</td><td>${b.prix} DA<br><span class="badge bg-info">${b.statut}</span></td></tr>
    `).join('');
    $('#billetsTotal').textContent = `Total: ${total.total||0} DA pour ${total.count||0} billets`;
  }catch{}
}

// Reservations
async function loadReservations(){
  if(!currentEventId) return;
  try{
    const resvs = await apiFetch(`/reservations/event/${currentEventId}`);
    $('#reservationsTableBody').innerHTML = resvs.map(r=>`
      <tr><td>${r.hotel_nom} (${r.wilaya_nom})<br>Ch ${r.numero_chambre||''} ${r.type_chambre} cap ${r.capacite_max}</td><td>${r.date_arrivee||''} → ${r.date_depart||''}<br>${r.nb_nuits} nuits x ${r.prix_nuit} = ${r.prix_nuit*r.nb_nuits} DA</td><td>${r.nb_occupants}/${r.capacite_max} occupants</td><td><span class="badge bg-${r.statut==='confirmee'?'success':'warning'}">${r.statut}</span></td></tr>
    `).join('');
  }catch{}
}

async function loadHotelAlerts(){
  if(!currentEventId) return;
  try{
    const alerts = await apiFetch(`/reservations/event/${currentEventId}/alerts`);
    const container = $('#hotelAlerts');
    if(!container) return;
    if(!alerts.length) container.innerHTML='<div class="text-muted">Aucune alerte</div>';
    else container.innerHTML = alerts.map(a=>`
      <div class="alert alert-warning alert-hotel"><i class="bi bi-exclamation-triangle"></i> ${a.message}<br><small>${new Date(a.created_at).toLocaleString()}</small></div>
    `).join('');
  }catch{}
}

async function loadNotifications(){
  if(!currentEventId) return;
  try{
    const notifs = await apiFetch(`/notifications/event/${currentEventId}`);
    $('#notificationsList').innerHTML = notifs.map(n=>`
      <div class="mb-2 p-2 border rounded bg-white"><small class="text-muted">${new Date(n.created_at).toLocaleString()}</small><br><b>${n.titre||n.type}</b>: ${n.message}</div>
    `).join('') || '<div class="text-muted">Aucune notification</div>';
  }catch{}
}

async function loadAudit(){
  try{
    const logs = await apiFetch(`/audit-logs?limit=100`);
    $('#auditTableBody').innerHTML = logs.map(l=>`
      <tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.username||l.user_id}</td><td>${l.action}</td><td>${l.table_name||''} #${l.record_id||''}</td><td><small>${(l.new_values||'').toString().substring(0,120)}</small></td></tr>
    `).join('');
  }catch{}
}

// CRUD helpers
function showSection(id){
  $$('.content-section').forEach(s=>s.classList.add('d-none'));
  $('#section-'+id).classList.remove('d-none');
  $$('.sidebar .nav-link').forEach(l=>l.classList.remove('active'));
  const active = $(`.sidebar .nav-link[data-section="${id}"]`);
  if(active) active.classList.add('active');
  if(window.innerWidth<992) $('.sidebar').classList.remove('show');
}

// Forms
async function createEvent(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  try{
    const data = await apiFetch('/events','POST', payload);
    toast('Événement créé #'+data.id);
    e.target.reset();
    bootstrap.Modal.getInstance($('#modalEvent')).hide();
    await loadEvents();
    selectEvent(data.id);
  }catch(err){ toast(err.message,'danger'); }
  return false;
}
async function createRubrique(e){
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  try{ await apiFetch('/rubriques',{method:'POST', body:payload}); toast('Rubrique créée'); e.target.reset(); bootstrap.Modal.getInstance($('#modalRubrique')).hide(); loadRubriques(); }catch(err){ toast(err.message,'danger'); }
}
async function createHotel(e){
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  try{ await apiFetch('/hotels',{method:'POST', body:payload}); toast('Hôtel créé'); e.target.reset(); bootstrap.Modal.getInstance($('#modalHotel')).hide(); loadHotels(); }catch(err){ toast(err.message,'danger'); }
}
async function createPersonne(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.event_id = currentEventId;
  try{ await apiFetch('/personnes',{method:'POST', body:payload}); toast('Personne ajoutée'); e.target.reset(); bootstrap.Modal.getInstance($('#modalPersonne')).hide(); loadPersonnes(); }catch(err){ toast(err.message,'danger'); }
}
async function createExposant(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const personne_data = {
    nom: fd.get('nom'), prenom: fd.get('prenom'), email: fd.get('email'), telephone: fd.get('telephone'), entreprise: fd.get('entreprise'), poste: fd.get('poste'), wilaya_id: fd.get('wilaya_id')
  };
  const payload = {
    event_id: currentEventId,
    personne_data,
    fiche_technique: fd.get('fiche_technique'),
    convoque_par: fd.get('convoque_par'),
    domaine_activite: fd.get('domaine_activite'),
    superficie_demandee: fd.get('superficie_demandee'),
    a_paye: fd.get('a_paye')==='on' || fd.get('a_paye')==='1',
    methode_paiement: fd.get('methode_paiement'),
    montant_paye: fd.get('montant_paye'),
    besoins_speciaux: fd.get('besoins_speciaux')
  };
  try{ await apiFetch('/exposants',{method:'POST', body:payload}); toast('Exposant créé + stand auto'); e.target.reset(); bootstrap.Modal.getInstance($('#modalExposant')).hide(); loadExposants(); loadStandsPlan(); loadPersonnes(); }catch(err){ toast(err.message,'danger'); }
}
async function createEmploye(e){
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  payload.event_id=currentEventId;
  try{ await apiFetch('/employes',{method:'POST', body:payload}); toast('Employé ajouté'); e.target.reset(); bootstrap.Modal.getInstance($('#modalEmploye')).hide(); loadEmployes(); }catch(err){ toast(err.message,'danger'); }
}
async function generateStands(){
  const rows = parseInt($('#genRows').value)||5;
  const cols = parseInt($('#genCols').value)||8;
  try{ const r= await apiFetch(`/stands/event/${currentEventId}/generate`,{method:'POST', body:{rows,cols}}); toast(r.message); loadStandsPlan(); }catch(err){ toast(err.message,'danger'); }
}
async function initDb(){
  try{
    const r = await fetch(API+'/init-db',{method:'POST'}).then(r=>r.json());
    if(r.error) throw new Error(r.error);
    toast('Base initialisée - 58 wilayas');
    loadWilayas();
  }catch(err){ toast(err.message,'danger'); }
}
function deleteEvent(id){ if(confirm('Supprimer événement?')) apiFetch('/events/'+id,{method:'DELETE'}).then(()=>{toast('Supprimé'); loadEvents();}); }
function deleteRubrique(id){ if(confirm('Supprimer?')) apiFetch('/rubriques/'+id,{method:'DELETE'}).then(()=>{loadRubriques();}); }
function deleteHotel(id){ if(confirm('Supprimer hôtel?')) apiFetch('/hotels/'+id,{method:'DELETE'}).then(()=>{loadHotels();}); }
function deletePersonne(id){ if(confirm('Supprimer?')) apiFetch('/personnes/'+id,{method:'DELETE'}).then(()=>{loadPersonnes();}); }

// on load
document.addEventListener('DOMContentLoaded',()=>{
  if(token) initApp();
  $('#loginForm')?.addEventListener('submit',(e)=>{ e.preventDefault(); login(); });
  $('#eventSelector')?.addEventListener('change',(e)=>{ if(e.target.value){ selectEvent(e.target.value); }});
  $('#filterHotelWilaya')?.addEventListener('change', onWilayaChangeForHotels);
});

function toggleSidebar(){ $('.sidebar').classList.toggle('show'); }

// Additional handlers for remaining modals
document.addEventListener('DOMContentLoaded', ()=>{
  // Sponsor form (multipart)
  const formSponsor = document.getElementById('formSponsor');
  if(formSponsor){
    formSponsor.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.target);
      fd.append('event_id', currentEventId);
      try{
        const res = await fetch(API+'/sponsors',{method:'POST', headers:{'Authorization':'Bearer '+token}, body: fd});
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);
        toast('Sponsor ajouté');
        bootstrap.Modal.getInstance(document.getElementById('modalSponsor')).hide();
        e.target.reset();
        loadSponsors();
      }catch(err){ toast(err.message,'danger'); }
    });
  }
  // Menu form
  const formMenu = document.getElementById('formMenu');
  if(formMenu){
    formMenu.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(e.target).entries());
      payload.event_id = currentEventId;
      try{
        await apiFetch('/restauration/menus',{method:'POST', body:payload});
        toast('Menu créé');
        bootstrap.Modal.getInstance(document.getElementById('modalMenu')).hide();
        e.target.reset();
        loadRestauration();
      }catch(err){ toast(err.message,'danger'); }
    });
  }
  // Affectation
  const formAffect = document.getElementById('formAffect');
  if(formAffect){
    formAffect.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(e.target).entries());
      payload.event_id = currentEventId;
      // need menu list for select? Populate dynamically when modal opens
      try{
        await apiFetch('/restauration/affectations',{method:'POST', body:payload});
        toast('Affectation créée (VIP auto détecté)');
        bootstrap.Modal.getInstance(document.getElementById('modalRestaurationAffect')).hide();
        loadRestauration();
      }catch(err){ toast(err.message,'danger'); }
    });
    // populate menus select when modal shown
    document.getElementById('modalRestaurationAffect')?.addEventListener('show.bs.modal', async ()=>{
      if(!currentEventId) return;
      const menus = await apiFetch(`/restauration/event/${currentEventId}/menus`).catch(()=>[]);
      const sel = document.getElementById('selectMenuResto');
      if(sel) sel.innerHTML = '<option value="">-- Menu --</option>' + menus.map(m=>`<option value="${m.id}">${m.nom_menu} (${m.type_repas}) ${m.prix_par_personne} DA</option>`).join('');
    });
  }

  // Convention
  const formConv = document.getElementById('formConvention');
  if(formConv){
    formConv.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.target);
      fd.append('event_id', currentEventId);
      try{
        const res = await fetch(API+'/conventions',{method:'POST', headers:{'Authorization':'Bearer '+token}, body: fd});
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);
        toast('Convention ajoutée');
        bootstrap.Modal.getInstance(document.getElementById('modalConvention')).hide();
        e.target.reset();
        loadConventions();
      }catch(err){ toast(err.message,'danger'); }
    });
  }
  // Billet
  const formBillet = document.getElementById('formBillet');
  if(formBillet){
    formBillet.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.target);
      fd.append('event_id', currentEventId);
      try{
        const res = await fetch(API+'/billets',{method:'POST', headers:{'Authorization':'Bearer '+token}, body: fd});
        const data= await res.json();
        if(!res.ok) throw new Error(data.error);
        toast('Billet enregistré - total mis à jour');
        bootstrap.Modal.getInstance(document.getElementById('modalBillet')).hide();
        e.target.reset();
        loadBillets();
      }catch(err){ toast(err.message,'danger'); }
    });
  }
  // Reservation
  const formRes = document.getElementById('formReservation');
  if(formRes){
    formRes.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.target);
      const occupantSelect = document.getElementById('reservationOccupantsSelect');
      const occupant_ids = occupantSelect ? Array.from(occupantSelect.selectedOptions).map(o=>parseInt(o.value)).filter(Boolean) : [];
      const payload = Object.fromEntries(fd.entries());
      payload.event_id = currentEventId;
      payload.occupant_ids = occupant_ids;
      // ensure numbers
      payload.prix_nuit = parseFloat(payload.prix_nuit)||0;
      payload.nb_nuits = parseInt(payload.nb_nuits)||1;
      payload.capacite_max = parseInt(payload.capacite_max)||1;
      try{
        await apiFetch('/reservations',{method:'POST', body:payload});
        toast('Réservation créée');
        bootstrap.Modal.getInstance(document.getElementById('modalReservation')).hide();
        e.target.reset();
        loadReservations();
        loadHotelAlerts();
      }catch(err){ toast(err.message,'danger'); }
    });
  }
});

// Extend loadRestauration to also update dashboard finance after
const originalLoadRestauration = loadRestauration;

