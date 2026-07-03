/* ============================================================
   NaijaPlate — household sync (Firebase Auth + Firestore)
   - Google sign-in for identity across devices
   - a household = one shared Firestore doc, joined by code
   - last-write-wins replication with live snapshots; the app
     stays fully functional offline / signed-out (localStorage
     remains the source of truth on-device)
   Loaded AFTER app.js; talks to its globals (see AGENTS.md).
   ============================================================ */
/* global firebase, FIREBASE_CONFIG */

const SYNC_KEYS = ['plans', 'prefs', 'checks', 'prices', 'settings', 'extras',
  'customs', 'combos', 'myfoods', 'customparts', 'customing', 'onboarded'];

let sync = {
  user: null,
  hid: store.load('household', null),
  rev: store.load('syncrev', 0),
  status: 'off',          // off | signedout | nohousehold | live | error
  lastSync: null,
  db: null,
  unsub: null,
};
const CLIENT_ID = (() => {
  let c = store.load('client', null);
  if (!c) { c = 'c_' + Math.random().toString(36).slice(2, 10); store.save('client', c); }
  return c;
})();

function syncAvailable() { return !!window.FIREBASE_CONFIG && typeof firebase !== 'undefined'; }

function initSync() {
  if (!syncAvailable()) { sync.status = 'off'; renderAccount(); return; }
  firebase.initializeApp(window.FIREBASE_CONFIG);
  sync.db = firebase.firestore();
  firebase.auth().onAuthStateChanged(u => {
    sync.user = u;
    if (u && sync.hid) attachHousehold();
    else if (u) sync.status = 'nohousehold';
    else { detachHousehold(); sync.status = 'signedout'; }
    renderAccount();
  });
}

/* ---------- auth ---------- */
function signIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(() => firebase.auth().signInWithRedirect(provider));
}

function signOutSync() {
  detachHousehold();
  firebase.auth().signOut();
  toast('Signed out — this device keeps its local copy');
}

/* ---------- household ---------- */
function householdCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

let collecting = false;
function collectState() {
  collecting = true;           // saveAll fires onStateSaved — don't re-schedule a push for our own snapshot
  try { saveAll(); } finally { collecting = false; }
  const state = {};
  for (const k of SYNC_KEYS) state[k] = store.load(k, null);
  return state;
}

function createHousehold() {
  if (!sync.user) return;
  const code = householdCode();
  sync.rev = Date.now();
  sync.db.collection('households').doc(code).set({
    created: new Date().toISOString(),
    createdBy: sync.user.displayName || sync.user.email,
    state: JSON.stringify(collectState()),
    rev: sync.rev, client: CLIENT_ID,
  }).then(() => {
    sync.hid = code;
    store.save('household', code); store.save('syncrev', sync.rev);
    attachHousehold();
    renderAccount();
    toast(`Household created — share code ${code} with the family 🏠`);
  }).catch(() => { sync.status = 'error'; renderAccount(); });
}

function joinHousehold() {
  const code = ($('#hh-code')?.value || '').trim().toUpperCase();
  if (!sync.user || code.length < 6) { toast('Enter the 8-character household code'); return; }
  sync.db.collection('households').doc(code).get().then(snap => {
    if (!snap.exists) { toast('No household found with that code'); return; }
    sync.hid = code;
    store.save('household', code);
    const d = snap.data();
    if (d && d.state) applyRemote(d, true);   // joining device adopts the household's data
    attachHousehold();
    renderAccount();
    toast('Joined the household — everything is now shared 🏠');
  }).catch(() => toast('Could not reach the household — check your connection'));
}

function leaveHousehold() {
  detachHousehold();
  sync.hid = null;
  store.save('household', null);
  sync.status = sync.user ? 'nohousehold' : 'signedout';
  renderAccount();
  toast('Left the household — your data stays on this device');
}

function attachHousehold() {
  detachHousehold();
  if (!sync.hid || !sync.db) return;
  sync.status = 'live';
  sync.unsub = sync.db.collection('households').doc(sync.hid).onSnapshot(snap => {
    const d = snap.data();
    if (!d || !d.state) return;
    if (d.client === CLIENT_ID || d.rev <= sync.rev) return;
    applyRemote(d);
  }, () => { sync.status = 'error'; renderAccount(); });
}

function detachHousehold() {
  if (sync.unsub) { sync.unsub(); sync.unsub = null; }
}

/* ---------- replication ---------- */
let pushTimer = null;
function schedulePush() {
  if (collecting || !sync.user || !sync.hid || !sync.db) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushState, 1200);
}

function pushState() {
  if (!sync.user || !sync.hid || !sync.db) return;
  sync.rev = Date.now();
  store.save('syncrev', sync.rev);
  sync.db.collection('households').doc(sync.hid).set({
    state: JSON.stringify(collectState()),
    rev: sync.rev, client: CLIENT_ID,
    updatedBy: sync.user.displayName || sync.user.email,
  }, { merge: true }).then(() => {
    sync.lastSync = new Date();
    if (sync.status !== 'live') { sync.status = 'live'; }
    renderAccount();
  }).catch(() => { sync.status = 'error'; renderAccount(); });
}

function applyRemote(d, adopting = false) {
  let state;
  try { state = JSON.parse(d.state); } catch { return; }
  sync.rev = d.rev || Date.now();
  store.save('syncrev', sync.rev);
  // write through to localStorage, then rebind the app's in-memory globals
  for (const k of SYNC_KEYS) if (state[k] !== null && state[k] !== undefined) store.save(k, state[k]);
  plans = store.load('plans', {});
  prefs = { like: {}, dislike: {}, rating: {}, cooked: {}, kidFav: {}, adultFav: {}, accept: {}, reject: {}, ...store.load('prefs', {}) };
  checks = store.load('checks', {});
  priceOverrides = store.load('prices', {});
  extras = store.load('extras', {});
  customs = store.load('customs', []);
  userCombos = store.load('combos', []);
  myFoods = store.load('myfoods', {});
  customParts = store.load('customparts', {});
  customIngredients = store.load('customing', {});
  Object.assign(PARTS, customParts);
  Object.assign(PRICEBOOK, customIngredients);
  const s = store.load('settings', {});
  settings = { adults: 2, kids: 2, kidSpice: 1, splitMode: 'auto', cookStyle: 'batch', excludeAllergens: [], ...s };
  settings.coverage = { b: { adults: 'all', kids: 'all' }, l: { adults: 'all', kids: 'all' }, d: { adults: 'all', kids: 'all' }, ...(s.coverage || {}) };
  settings.poolMode = settings.poolMode || 'boost';
  for (const k in comboCache) delete comboCache[k];
  plan = plans[weekKey(weekOffset)] || null;
  if (!plan) plan = ensureWeek(weekOffset);
  if (store.load('onboarded', false)) $('#onboard').classList.remove('open');
  renderPlanner(); renderShopping(); renderRecipes(); renderYou();
  sync.lastSync = new Date();
  sync.status = 'live';
  renderAccount();
  if (!adopting) toast(`Synced from ${d.updatedBy || 'the household'} ☁️`);
}

/* app.js calls this after every save */
window.onStateSaved = schedulePush;

/* ---------- account UI (You tab) ---------- */
function renderAccount() {
  const el = $('#account-content');
  if (!el) return;
  if (!syncAvailable()) {
    el.innerHTML = `<div class="card">
      <h2 class="section" style="margin-top:0">☁️ Household sync</h2>
      <p class="muted">Share one plan, one shopping list and one taste profile across everyone's phones — ticks in the supermarket appear on the other phone live. Needs a one-off free setup (see SYNC-SETUP.md in the repo).</p>
    </div>`;
    return;
  }
  if (!sync.user) {
    el.innerHTML = `<div class="card">
      <h2 class="section" style="margin-top:0">☁️ Household sync</h2>
      <p class="muted">Sign in once on each device and your plans, lists and preferences stay together.</p>
      <button class="btn btn-primary" style="width:100%" data-act="signIn">🔐 Continue with Google</button>
    </div>`;
    return;
  }
  if (!sync.hid) {
    el.innerHTML = `<div class="card">
      <h2 class="section" style="margin-top:0">☁️ Household sync</h2>
      <p class="muted">Signed in as <b>${sync.user.displayName || sync.user.email}</b>. Now create your household (first device) or join with the family code (other devices).</p>
      <button class="btn btn-green" style="width:100%;margin-bottom:10px" data-act="createHousehold">＋ Create our household</button>
      <div class="week-toolbar" style="margin:0">
        <input class="inp" id="hh-code" placeholder="FAMILY CODE" maxlength="8"
          style="flex:1;font:inherit;font-size:.9rem;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:#fff;text-transform:uppercase;letter-spacing:2px">
        <button class="btn btn-ghost" data-act="joinHousehold">Join</button>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px" data-act="signOutSync">Sign out</button>
    </div>`;
    return;
  }
  const when = sync.lastSync ? sync.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  el.innerHTML = `<div class="card">
    <h2 class="section" style="margin-top:0">☁️ Household sync</h2>
    <div class="setting-row" style="padding-top:0"><div><div class="sl">${sync.user.displayName || sync.user.email}</div>
      <div class="sd">${sync.status === 'live' ? `✅ Live · last synced ${when}` : sync.status === 'error' ? '⚠️ Sync error — will retry on next change' : 'Connecting…'}</div></div></div>
    <div class="setting-row"><div><div class="sl">Family code</div><div class="sd">Others: sign in with Google, then Join with this code</div></div>
      <button class="btn btn-ghost btn-sm" data-act="copyHouseholdCode" style="letter-spacing:2px;font-weight:800">${sync.hid} 📋</button></div>
    <div class="week-toolbar" style="margin-top:10px">
      <button class="btn btn-ghost btn-sm" data-act="leaveHousehold">Leave household</button>
      <button class="btn btn-ghost btn-sm" data-act="signOutSync">Sign out</button>
    </div>
  </div>`;
}

function copyHouseholdCode() {
  const ok = () => toast('Code copied — send it to the family');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(sync.hid).then(ok, () => fallbackCopy(sync.hid, ok));
  else fallbackCopy(sync.hid, ok);
}

/* register actions + boot */
Object.assign(ACTIONS, { signIn, signOutSync, createHousehold, joinHousehold, leaveHousehold, copyHouseholdCode });
try { initSync(); } catch (e) { console.error('sync init failed', e); }
