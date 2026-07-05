/* ============================================================
   NaijaPlate — app logic (component food model)
   - parts (mains / sides / dishes) liked INDEPENDENTLY
   - planner proposes logical main+side combos; custom pairings
     are remembered as "your combos"
   - onboarding: household, meal coverage (adults vs kids,
     weekday/weekend), cooking style, component taste quiz
   - multi-week batch-cook planner, override + inspire features
   - shopping: weekly top-up vs monthly bulk, 4-store comparison
   All state in localStorage. No backend, no tracking.
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- event delegation (CSP-safe: no inline handlers) ---------- */
const cast = a => (/^-?\d+(\.\d+)?$/.test(a) ? Number(a) : a);
function dispatch(attr) {
  return e => {
    const el = e.target.closest(`[${attr}]`);
    if (!el) return;
    const [fn, ...args] = el.getAttribute(attr).split('|');
    if (typeof ACTIONS[fn] !== 'function') return;
    if (attr === 'data-act') { e.stopPropagation(); ACTIONS[fn](...args.map(cast)); }
    else {
      const val = el.type === 'checkbox' ? el.checked : el.value;
      ACTIONS[fn](...args.map(cast), typeof val === 'string' && attr === 'data-chg' ? cast(val) : val);
    }
  };
}
document.addEventListener('click', dispatch('data-act'));
document.addEventListener('change', dispatch('data-chg'));
document.addEventListener('input', dispatch('data-inp'));

/* ---------- state ---------- */
const store = {
  load(k, d) { try { return JSON.parse(localStorage.getItem('np_' + k)) ?? d; } catch { return d; } },
  save(k, v) { localStorage.setItem('np_' + k, JSON.stringify(v)); },
};

let prefs = { like: {}, dislike: {}, rating: {}, cooked: {}, kidFav: {}, adultFav: {}, accept: {}, reject: {}, ...store.load('prefs', {}) };
prefs.accept = prefs.accept || {}; prefs.reject = prefs.reject || {};
let myFoods = store.load('myfoods', {});      // curated pool: {partId: true}
let foodTags = store.load('tags', {});        // your overrides: {partId: {meals:['b','l'], who:'all'|'adults'|'kids'}}

/* ---------- user-grown database ----------
   customParts: foods researched online or taught by the user.
   customIngredients: ingredients discovered during research that the
   built-in price book doesn't know (price them via the ✎ editor). */
let customParts = store.load('customparts', {});
let customIngredients = store.load('customing', {});
Object.assign(PARTS, customParts);
Object.assign(PRICEBOOK, customIngredients);
CUISINE_NAMES.world = 'World';
let checks = store.load('checks', {});
let priceOverrides = store.load('prices', {});
let extras = store.load('extras', {});
let customs = store.load('customs', []);
let userCombos = store.load('combos', []);   // ['ewa_beans+white_rice', ...] pairings the user invented
let settings = {
  adults: 2, kids: 2, kidSpice: 1, splitMode: 'auto', cookStyle: 'batch', excludeAllergens: [],
  ...store.load('settings', {}),
};
settings.coverage = {
  b: { adults: 'all', kids: 'all' }, l: { adults: 'all', kids: 'all' }, d: { adults: 'all', kids: 'all' },
  ...(settings.coverage || {}),
};
settings.poolMode = settings.poolMode || 'boost';   // boost = my list preferred | strict = only my list

let plans = store.load('plans', null) || {};
let weekOffset = 0;
const MAX_WEEKS = 8;
let plan = null;
let planView = 'family';
let shopScope = 'week';

const saveAll = () => {
  store.save('plans', plans); store.save('prefs', prefs); store.save('checks', checks);
  store.save('prices', priceOverrides); store.save('settings', settings);
  store.save('extras', extras); store.save('customs', customs); store.save('combos', userCombos);
  store.save('myfoods', myFoods); store.save('customparts', customParts); store.save('customing', customIngredients);
  store.save('tags', foodTags);
  window.onStateSaved?.();   // household sync hook (sync.js)
};

/* ---------- migration from the pre-component model ---------- */
const PREF_MIGRATE = {
  jollof: 'jollof_rice', egusi: 'egusi_soup', eforiro: 'efo_soup', okra: 'okra_soup',
  stewrice: 'red_stew', friedrice: 'fried_rice_ng', ewa: 'ewa_beans', peppersoup: 'pepper_soup',
  sweetpotstew: 'curry_stew', naijabol: 'naija_bol', bangers: 'sausages_m', yamegg: 'egg_sauce',
};
for (const map of [prefs.like, prefs.dislike, prefs.rating, prefs.kidFav, prefs.adultFav, prefs.cooked]) {
  for (const old in PREF_MIGRATE) if (map[old] !== undefined) { map[PREF_MIGRATE[old]] = map[old]; delete map[old]; }
}

/* ---------- your tags: when & who a food is for ---------- */
function effMealsOf(id) {
  const t = foodTags[id];
  if (t && Array.isArray(t.meals)) return t.meals;          // your override (may be empty = never auto-plan)
  return PARTS[id]?.meals || ['l', 'd'];
}
function whoOf(id) { return foodTags[id]?.who || null; }

/* ---------- combo resolver ----------
   A meal id is 'main' or 'main+part+part' where extra parts are a side
   and/or a protein (classified by type, any order). */
const comboCache = {};
function mealOf(cid) {
  if (comboCache[cid]) return comboCache[cid];
  const ids = String(cid).split('+');
  const M = PARTS[ids[0]];
  if (!M) return null;
  let S = null, sId = null, P = null, pId = null;
  for (const x of ids.slice(1)) {
    const part = PARTS[x];
    if (!part) return null;
    if (part.type === 'protein') { P = part; pId = x; }
    else { S = part; sId = x; }
  }
  const extras = [P, S].filter(Boolean);
  const meal = {
    id: cid, mainId: ids[0], sideId: sId, proteinId: pId, main: M, side: S, prot: P,
    name: [M.name, P && P.name, S && S.name].filter(Boolean).join(' + '),
    emoji: M.emoji, grad: M.grad, cuisine: M.cuisine,
    meals: effMealsOf(ids[0]),
    kid: Math.min(M.kid, ...extras.map(e => e.kid)),
    spice: Math.max(M.spice, ...extras.map(e => e.spice)),
    mins: extras.length ? Math.max(M.mins, ...extras.map(e => e.mins)) + 5 : M.mins,
    kcal: M.kcal + extras.reduce((a, e) => a + e.kcal, 0),
    protein: M.protein + extras.reduce((a, e) => a + e.protein, 0),
    health: extras.length ? Math.round([M, ...extras].reduce((a, x) => a + x.health, 0) / (1 + extras.length)) : M.health,
    allergens: [...new Set([M, ...extras].flatMap(x => x.allergens))],
    desc: M.desc, tip: M.tip, img: M.img || null,
    ing: [M, ...extras].flatMap(x => x.ing),
  };
  comboCache[cid] = meal;
  return meal;
}

function makeCid(mainId, proteinId, sideId) {
  return [mainId, proteinId, sideId].filter(Boolean).join('+');
}

/* drop stored plans referencing ids that no longer resolve */
for (const wk in plans) {
  const bad = Object.values(plans[wk]).some(s => [s.f, s.a, s.k].filter(Boolean).some(cid => !mealOf(cid)));
  if (bad) delete plans[wk];
}

/* ---------- week helpers ---------- */
function mondayOf(d) { const x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); x.setHours(0, 0, 0, 0); return x; }
function weekKey(off) {
  const m = mondayOf(new Date()); m.setDate(m.getDate() + off * 7);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d) { return `${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function weekDates(off) {
  const [y, mo, da] = weekKey(off).split('-').map(Number);
  return DAYS.map((_, i) => new Date(y, mo - 1, da + i));
}
function weekLabel(off) {
  if (off === 0) return 'This week';
  if (off === 1) return 'Next week';
  const [y, mo, da] = weekKey(off).split('-').map(Number);
  return 'Week of ' + fmtDate(new Date(y, mo - 1, da));
}

/* ---------- preference engine (part level) ---------- */
function cuisineAffinity() {
  const w = { ng: 1, uk: 1, fusion: 1, world: 1 };
  const feed = id => { if (PARTS[id]) w[PARTS[id].cuisine] += 1.2; };
  for (const id in prefs.like) if (prefs.like[id]) feed(id);
  for (const id in prefs.kidFav) if (prefs.kidFav[id]) feed(id);
  for (const id in prefs.adultFav) if (prefs.adultFav[id]) feed(id);
  for (const id in prefs.rating) if (PARTS[id]) w[PARTS[id].cuisine] += (prefs.rating[id] - 3) * 0.6;
  const max = Math.max(w.ng, w.uk, w.fusion);
  for (const k in w) w[k] = Math.max(0.3, w[k] / max);
  return w;
}

function scorePart(p, id, { forKids = false, recentIds = [], preferBatch = false, quick = false } = {}) {
  if (prefs.dislike[id]) return -999;
  let s = 10;
  if (prefs.like[id]) s += 8;
  if (forKids && prefs.kidFav[id]) s += 7;
  if (!forKids && prefs.adultFav[id]) s += 5;
  if (prefs.rating[id]) s += (prefs.rating[id] - 3) * 3;
  s += cuisineAffinity()[p.cuisine] * 6;
  s += p.health * 0.8;
  if (forKids) {
    s += p.kid * 4;
    if (p.spice > settings.kidSpice) s -= 20;
  }
  if (preferBatch && BATCH[id]) s += 4;
  if (quick) s -= p.mins * 0.06;
  if (myFoods[id]) s += 6;                                        // on your curated list
  const who = whoOf(id);                                          // your audience tag beats inference
  if (who === 'kids') s += forKids ? 8 : -12;
  else if (who === 'adults') s += forKids ? -18 : 6;
  else if (who === 'all') s += 3;
  s += Math.min(6, (prefs.accept[id] || 0) * 1.5);                // meals you kept in the plan
  s -= Math.min(8, (prefs.reject[id] || 0) * 1.5);                // meals you swapped away / removed
  const rep = recentIds.filter(x => x === id).length;
  s -= rep * 25;
  return s;
}

function comboScore(cid, opts = {}) {
  const m = mealOf(cid);
  if (!m) return -999;
  if (settings.excludeAllergens.some(a => m.allergens.includes(a))) return -999;
  let s = scorePart(m.main, m.mainId, opts);
  if (s < -100) return -999;
  if (m.side) {
    const ss = scorePart(m.side, m.sideId, { ...opts, recentIds: [] });
    if (ss < -100) return -999;              // disliked side kills the combo
    s += ss * 0.45 + (userCombos.includes(cid) ? 5 : 3);
  }
  if (m.prot) {
    const ps = scorePart(m.prot, m.proteinId, opts);
    if (ps < -100) return -999;              // disliked protein kills the combo
    s += ps * 0.35;
  }
  const sameCuisineRun = (opts.recentIds || []).slice(-2).filter(x => PARTS[x]?.cuisine === m.cuisine).length;
  s -= sameCuisineRun * 2;
  s += Math.random() * 4;
  return s;
}

function candidateMeals(mealType, { ignorePool = false } = {}) {
  const strict = settings.poolMode === 'strict' && Object.keys(myFoods).some(k => myFoods[k]) && !ignorePool;
  const out = [];
  for (const [id, p] of Object.entries(PARTS)) {
    const inMeal = effMealsOf(id).includes(mealType);            // your meal-time tags rule here
    if (strict && !myFoods[id] && p.type !== 'side') continue;   // strict mode: mains/dishes from your list only
    if (p.type === 'dish' || (p.type === 'side' && p.solo)) { if (inMeal) out.push(id); }
    else if (p.type === 'main' && inMeal) {
      const sides = PAIRS[id] || [];
      if (!sides.length) out.push(id);
      else for (const s of sides) out.push(id + '+' + s);
    }
  }
  for (const c of userCombos) {
    const m = mealOf(c);
    if (m && m.meals.includes(mealType) && !out.includes(c) && (!strict || myFoods[m.mainId])) out.push(c);
  }
  // strict list too thin for this meal type → fall back to everything rather than starve the plan
  if (strict && out.length < 2) return candidateMeals(mealType, { ignorePool: true });
  return out;
}

/* attach the best-scoring protein to a main that takes one (variety-aware) */
function withProtein(cid, opts = {}) {
  const m = mealOf(cid);
  if (!m || m.proteinId) return cid;
  const prots = PROTEIN_PAIRS[m.mainId] || [];
  if (!prots.length) return cid;
  const ranked = prots.map(p => [scorePart(PARTS[p], p, opts), p]).sort((a, b) => b[0] - a[0]);
  if (!ranked.length || ranked[0][0] < -100) return cid;
  return makeCid(m.mainId, ranked[0][1], m.sideId);
}

function pickMeal(mealType, opts = {}) {
  const ranked = candidateMeals(mealType).map(c => [comboScore(c, opts), c]).sort((a, b) => b[0] - a[0]);
  return ranked.length && ranked[0][0] > -100 ? withProtein(ranked[0][1], opts) : null;
}

function kidOkMeal(cid) {
  const m = mealOf(cid);
  return m && (m.kid >= 2 || prefs.kidFav[m.mainId] || whoOf(m.mainId) === 'kids') && m.spice <= settings.kidSpice;
}

function defaultCombo(mainId) {
  const sides = PAIRS[mainId] || [];
  const bestSide = sides.length ? sides.map(s => [scorePart(PARTS[s], s), s]).sort((a, b) => b[0] - a[0])[0][1] : null;
  return withProtein(makeCid(mainId, null, bestSide));
}

/* ---------- weekly plan generation ---------- */
function covAllows(v, isWknd) { return v === 'all' || (v === 'weekday' && !isWknd) || (v === 'weekend' && isWknd); }

function freshFor(mealType, recent, opts, forKids) {
  const cid = pickMeal(mealType, { ...opts, forKids, recentIds: recent });
  if (cid) {
    const m = mealOf(cid);
    recent.push(m.mainId);
    if (m.proteinId) recent.push(m.proteinId);   // vary the protein across the week too
  }
  return cid;
}

function buildWeekPlan() {
  const recent = [];
  const newPlan = {};
  const pool = [];
  const style = settings.cookStyle || 'batch';
  const useLeftovers = style !== 'daily';
  const cov = settings.coverage;

  DAYS.forEach((day, di) => {
    const isWknd = di >= 5;
    for (const mealType of MEALS) {
      const key = `${day}-${mealType}`;
      const inA = covAllows(cov[mealType].adults, isWknd);
      const inK = settings.kids > 0 && covAllows(cov[mealType].kids, isWknd);
      if (!inA && !inK) continue;

      // leftovers (lunch/dinner only). If the batch is too spicy for the kids,
      // adults still get the leftover and the kids get a fresh kid-friendly pick.
      if (useLeftovers && mealType !== 'b') {
        const cand = pool.find(p => p.left > 0 && di <= p.expires && p.lastDi < di &&
          (style === 'minimal' || mealType === 'l' || di - p.lastDi >= 2) &&
          (inA || kidOkMeal(p.cid)));
        if (cand) {
          if (inA && inK) {
            if (kidOkMeal(cand.cid)) newPlan[key] = { f: cand.cid, lo: cand.srcKey };
            else {
              const kidCid = freshFor(mealType, recent, {}, true);
              newPlan[key] = kidCid ? { a: cand.cid, k: kidCid, lo: cand.srcKey } : { a: cand.cid, lo: cand.srcKey };
            }
          } else if (inA) newPlan[key] = { a: cand.cid, lo: cand.srcKey };
          else newPlan[key] = { k: cand.cid, lo: cand.srcKey };
          cand.left--; cand.lastDi = di;
          continue;
        }
      }

      // fresh cook
      const opts = { preferBatch: useLeftovers && mealType === 'd', quick: mealType === 'l' && useLeftovers };
      let slot = null;
      if (inA && inK) {
        const cid = freshFor(mealType, recent, opts, false);
        if (!cid) continue;
        if (settings.splitMode === 'family' || kidOkMeal(cid)) slot = { f: cid };
        else {
          const kidCid = freshFor(mealType, recent, opts, true);
          slot = kidCid && kidCid !== cid ? { a: cid, k: kidCid } : { f: cid };
        }
      } else if (inA) {
        const cid = freshFor(mealType, recent, opts, false);
        if (cid) slot = { a: cid };
      } else {
        const cid = freshFor(mealType, recent, opts, true);
        if (cid) slot = { k: cid };
      }
      if (!slot) continue;
      newPlan[key] = slot;
      const mainId = mealOf(slot.f || slot.a || slot.k).mainId;
      if (useLeftovers && BATCH[mainId] && mealType === 'd') {
        pool.push({ srcKey: key, cid: slot.f || slot.a || slot.k, left: BATCH[mainId].covers - 1, expires: di + BATCH[mainId].keeps, lastDi: di });
      }
    }
  });
  return newPlan;
}

function ensureWeek(off) {
  const k = weekKey(off);
  if (!plans[k]) { plans[k] = buildWeekPlan(); store.save('plans', plans); }
  return plans[k];
}

function generateWeek() {
  plans[weekKey(weekOffset)] = buildWeekPlan();
  plan = plans[weekKey(weekOffset)];
  if (weekOffset === 0) checks = {};
  saveAll();
  renderPlanner(); renderShopping();
  toast(`${weekLabel(weekOffset)} planned around your tastes 🍽️`);
}

function weekNav(d) {
  weekOffset = Math.max(0, Math.min(MAX_WEEKS - 1, weekOffset + d));
  plan = ensureWeek(weekOffset);
  renderPlanner(); renderShopping();
}

/* ---------- planner rendering ---------- */
const MEAL_ICONS = { b: '☀️', l: '🥪', d: '🌙' };

function slotRecipes(slot) {
  if (!slot) return [];
  if (slot.f) return [{ id: slot.f, who: 'all' }];
  const out = [];
  if (slot.a) out.push({ id: slot.a, who: 'adults' });
  if (slot.k) out.push({ id: slot.k, who: 'kids' });
  return out;
}

function thumbStyle(m) {
  return m.img ? `background:url('${m.img}/preview') center/cover,linear-gradient(135deg,${m.grad[0]},${m.grad[1]})`
    : `background:linear-gradient(135deg,${m.grad[0]},${m.grad[1]})`;
}
function emo(m) { return m.img ? '' : m.emoji; }

function cookStats(p) {
  let cooks = 0, reheats = 0, mins = 0;
  const reuse = {};
  for (const k in p) {
    const slot = p[k];
    if (slot.lo) { reheats++; mins += 10; (reuse[slot.lo] = reuse[slot.lo] || []).push(k); }
    else { cooks++; mins += Math.max(...slotRecipes(slot).map(x => mealOf(x.id).mins)); }
  }
  return { cooks, reheats, mins, reuse };
}

function renderPlanner() {
  const dates = weekDates(weekOffset);
  const todayIdx = weekOffset === 0 ? (new Date().getDay() + 6) % 7 : -1;
  $('#week-nav').innerHTML = `
    <button class="wn-btn" data-act="weekNav|-1" ${weekOffset === 0 ? 'disabled' : ''}>‹</button>
    <div class="wn-label"><b>${weekLabel(weekOffset)}</b><span>${fmtDate(dates[0])} – ${fmtDate(dates[6])}</span></div>
    <button class="wn-btn" data-act="weekNav|1" ${weekOffset >= MAX_WEEKS - 1 ? 'disabled' : ''}>›</button>`;

  const st = cookStats(plan || {});
  const savedH = ((st.reheats * 45) / 60).toFixed(1);
  const batchLines = Object.entries(st.reuse).map(([src, uses]) => {
    const s = plan[src]; if (!s) return '';
    const m = mealOf(s.f || s.a || s.k);
    const [sd, sm] = src.split('-');
    const useTxt = uses.map(u => { const [d, mm] = u.split('-'); return `${DAY_NAMES[d].slice(0, 3)} ${MEAL_NAMES[mm].toLowerCase()}`; }).join(', ');
    return `<div class="batch-line"><span class="mini" style="${thumbStyle(m)}">${m.emoji}</span>
      <span><b>${DAY_NAMES[sd].slice(0, 3)} ${MEAL_NAMES[sm].toLowerCase()}</b>: big pot of ${m.main.name} → ♻ ${useTxt}</span></div>`;
  }).join('');
  $('#cook-plan').innerHTML = (plan && Object.keys(plan).length) ? `
    <div class="cook-card">
      <div class="cook-stats">
        <div><b>${st.cooks}</b><span>cooks</span></div>
        <div><b>${st.reheats}</b><span>♻ reheats</span></div>
        <div><b>${Math.round(st.mins / 60 * 10) / 10}h</b><span>hands-on</span></div>
        ${st.reheats ? `<div><b>~${savedH}h</b><span>saved</span></div>` : ''}
      </div>
      ${batchLines ? `<div class="batch-lines">${batchLines}</div>` : ''}
    </div>` : '';

  const el = $('#planner-days');
  el.innerHTML = DAYS.map((day, di) => {
    const isWknd = di >= 5;
    const rows = MEALS.map(mealType => {
      const key = `${day}-${mealType}`;
      const slot = plan?.[key];
      const inA = covAllows(settings.coverage[mealType].adults, isWknd);
      const inK = settings.kids > 0 && covAllows(settings.coverage[mealType].kids, isWknd);
      if (!slot) {
        if (!inA && !inK) return ''; // meal not planned for anyone — hide the row
        return `<div class="slot empty" data-act="openPicker|${key}|${inA ? (inK ? 'f' : 'a') : 'k'}">
          <div class="meal-label">${MEAL_ICONS[mealType]}</div>
          <div class="info"><div class="rname">Tap to plan ${MEAL_NAMES[mealType].toLowerCase()}…</div></div></div>`;
      }
      const loBadge = slot.lo ? `<span class="lo-badge">♻</span>` : '';
      const loSub = slot.lo ? `Leftovers · ♻ batch from ${DAY_NAMES[slot.lo.split('-')[0]].slice(0, 3)} · 10 min reheat` : null;

      // figure out what to show for the current view
      let cid = null, badge = '', who = 'f';
      if (planView === 'adults') { cid = slot.f || slot.a; who = slot.f ? 'f' : 'a'; }
      else if (planView === 'kids') { cid = slot.f || slot.k; who = slot.f ? 'f' : 'k'; }
      else if (slot.f) { cid = slot.f; }
      else if (slot.a && slot.k) { /* split render below */ }
      else { cid = slot.a || slot.k; who = slot.a ? 'a' : 'k'; badge = slot.a ? 'ADULTS' : 'KIDS'; }

      if (planView !== 'family' && !cid) {
        return `<div class="slot empty"><div class="meal-label">${MEAL_ICONS[mealType]}</div>
          <div class="info"><div class="rname">Not planned for ${planView}</div></div></div>`;
      }
      if (cid) {
        const m = mealOf(cid);
        if (planView !== 'family' && !slot.f) badge = planView === 'kids' ? 'KIDS' : 'ADULTS';
        return `<div class="slot" data-act="openRecipe|${cid}|${key}|${who}">
          <div class="meal-label">${MEAL_ICONS[mealType]}</div>
          <div class="thumb" style="${thumbStyle(m)}">${m.emoji}${loBadge}</div>
          <div class="info"><div class="rname">${m.name}</div>
            <div class="rsub">${loSub || `${CUISINE_NAMES[m.cuisine]} · ${m.mins} min · ${m.kcal} kcal`}</div></div>
          ${badge ? `<span class="split-badge">${badge}</span>` : ''}
          <button class="swap" data-act="openPicker|${key}|${who}" title="Swap">↻</button>
        </div>`;
      }
      const a = mealOf(slot.a), k = mealOf(slot.k);
      return `<div class="slot" data-act="openRecipe|${slot.a}|${key}|a">
        <div class="meal-label">${MEAL_ICONS[mealType]}</div>
        <div class="split-row">
          <div class="split-line"><span class="who">Adults</span><span class="mini" style="${thumbStyle(a)}">${a.emoji}</span><span class="rname">${a.name}${slot.lo ? ' ♻' : ''}</span></div>
          <div class="split-line" data-act="openRecipe|${slot.k}|${key}|k"><span class="who">Kids</span><span class="mini" style="${thumbStyle(k)}">${k.emoji}</span><span class="rname">${k.name}${slot.lo ? ' ♻' : ''}</span></div>
        </div>
        <span class="split-badge">SPLIT</span>
        <button class="swap" data-act="openPicker|${key}|a" title="Swap">↻</button>
      </div>`;
    }).join('');
    const todayTag = di === todayIdx ? '<span class="today-tag">TODAY</span>' : '';
    return `<div class="day-card"><div class="day-head">${DAY_NAMES[day]} <span class="day-date">${fmtDate(dates[di])}</span> ${todayTag}</div>${rows}</div>`;
  }).join('');
}

/* ---------- recipe browsing (parts) ---------- */
let activeFilter = 'all';
const TYPE_LABEL = { main: '', side: 'side', dish: '' };
function kidOkPart(p, id) { return (p.kid >= 2 || prefs.kidFav[id]) && p.spice <= settings.kidSpice; }

function renderRecipes() {
  const q = ($('#recipe-search')?.value || '').toLowerCase();
  const list = Object.entries(PARTS).filter(([id, p]) => {
    if (activeFilter === 'ng' || activeFilter === 'uk' || activeFilter === 'fusion') { if (p.cuisine !== activeFilter) return false; }
    if (activeFilter === 'kids' && !kidOkPart(p, id)) return false;
    if (activeFilter === 'healthy' && p.health < 4) return false;
    if (activeFilter === 'quick' && p.mins > 35) return false;
    if (activeFilter === 'batch' && !BATCH[id]) return false;
    if (activeFilter === 'sides' && p.type !== 'side') return false;
    if (activeFilter === 'protein' && p.type !== 'protein') return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => scorePart(b[1], b[0]) - scorePart(a[1], a[0]));
  $('#recipe-grid').innerHTML = list.map(([id, p]) => `
    <div class="rcard" data-act="openRecipe|${p.type === 'main' ? defaultCombo(id) : id}">
      <div class="hero" style="${thumbStyle(p)}">${emo(p)}</div>
      ${prefs.like[id] ? '<div class="fav">❤️</div>' : ''}
      <div class="body">
        <div class="rname">${p.name}</div>
        <div class="meta">
          <span class="pill pill-${p.cuisine}">${CUISINE_NAMES[p.cuisine]}</span>
          ${p.type === 'side' ? '<span class="kidmark">🍽 side</span>' : ''}
          ${BATCH[id] ? '<span class="kidmark">♻</span>' : ''}
          <span class="kidmark">${p.kid >= 2 ? '👧' : ''}</span>
        </div>
      </div>
    </div>`).join('') || '<div class="empty-state"><div class="big">🍳</div>No food matches — try another filter.</div>';
}

function setFilter(f) {
  activeFilter = f;
  $$('.filters button').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  renderRecipes();
}

/* ---------- recipe / combo modal ---------- */
let modalCtx = null;
function dots(n, max, cls) {
  return `<span class="hdots">${Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'on-' + cls : ''}"></span>`).join('')}</span>`;
}

function openRecipe(cid, slotKey, who) {
  const m = mealOf(cid);
  if (!m) return;
  modalCtx = {
    cid, slotKey: slotKey || null, who: who || null,
    moreSides: modalCtx?.cid === cid ? modalCtx.moreSides : false,
    moreProts: modalCtx?.cid === cid ? modalCtx.moreProts : false,
  };
  const id = m.mainId;
  const rating = prefs.rating[id] || 0;
  const b = BATCH[id];
  const isPairable = m.main.type === 'main' && PAIRS[id];
  const allSides = Object.entries(PARTS).filter(([, p]) => p.type === 'side').map(([sid]) => sid);
  const sideChoices = modalCtx.moreSides ? allSides : (PAIRS[id] || []);
  const allProts = Object.entries(PARTS).filter(([, p]) => p.type === 'protein').map(([pid]) => pid);
  const protRecommended = PROTEIN_PAIRS[id] || [];
  const protChoices = modalCtx.moreProts ? allProts : protRecommended;
  const takesProtein = m.main.type === 'main' && (protRecommended.length || m.proteinId);
  const plannable = m.main.type !== 'protein' && (m.main.type !== 'side' || m.main.solo);
  const eff = effMealsOf(id);
  const whoTag = whoOf(id);
  $('#modal-content').innerHTML = `
    <div class="m-hero" style="${m.img ? `background:url('${m.img}') center/cover` : thumbStyle(m)}">${emo(m)}
      <button class="m-close" data-act="closeModal">✕</button></div>
    <div class="m-body">
      <span class="pill pill-${m.cuisine}">${CUISINE_NAMES[m.cuisine]}</span>
      ${b ? `<span class="pill pill-fusion">♻ 1 pot ≈ ${b.covers} meals · keeps ${b.keeps} days</span>` : ''}
      <h3>${m.name}</h3>
      <div class="m-desc">${m.desc}</div>
      ${takesProtein ? `
        <div class="serve-with"><span class="sw-label">🍖 Protein — your choice</span>
          <div class="chiplist">
            ${protChoices.map(p => `<span class="chip ${m.proteinId === p ? 'love' : ''}" data-act="swapProt|${id}|${p}">${PARTS[p].emoji} ${PARTS[p].name}</span>`).join('')}
            <span class="chip ${!m.proteinId ? 'love' : ''}" data-act="swapProt|${id}|_none">none</span>
            ${modalCtx.moreProts ? '' : `<span class="chip" data-act="moreProts">＋ more…</span>`}
          </div>
        </div>` : ''}
      ${isPairable ? `
        <div class="serve-with"><span class="sw-label">Serve with</span>
          <div class="chiplist">
            ${sideChoices.map(s => `<span class="chip ${m.sideId === s ? 'love' : ''}" data-act="swapSide|${id}|${s}">${PARTS[s].emoji} ${PARTS[s].name}</span>`).join('')}
            <span class="chip ${!m.sideId ? 'love' : ''}" data-act="swapSide|${id}|_none">just the main</span>
            ${modalCtx.moreSides ? '' : `<span class="chip" data-act="moreSides">＋ more…</span>`}
          </div>
          ${m.sideId && !(PAIRS[id] || []).includes(m.sideId) ? '<div class="muted" style="margin-top:4px">✨ your own combo — saved for future plans</div>' : ''}
        </div>` : ''}
      ${plannable ? `
        <div class="serve-with"><span class="sw-label">🏷 Plan this for</span>
          <div class="chiplist">
            ${MEALS.map(mt => `<span class="chip ${eff.includes(mt) ? 'love' : ''}" data-act="tagMeal|${id}|${mt}">${MEAL_ICONS[mt]} ${MEAL_NAMES[mt]}</span>`).join('')}
          </div>
          <div class="chiplist" style="margin-top:6px">
            ${[['all', '👨‍👩‍👧‍👦 Everyone'], ['adults', '🧑 Adults'], ['kids', '🧒 Kids']].map(([v, l]) =>
              `<span class="chip ${whoTag === v ? 'love' : ''}" data-act="tagWho|${id}|${v}">${l}</span>`).join('')}
          </div>
          ${eff.length === 0 ? '<div class="muted" style="margin-top:4px">⚠ No meal times ticked — I\'ll never auto-plan this (you can still add it by hand).</div>' : ''}
        </div>` : ''}
      <div class="healthbar">
        <div class="hstat"><div class="v">${m.kcal}</div><div class="k">kcal</div></div>
        <div class="hstat"><div class="v">${m.protein}g</div><div class="k">protein</div></div>
        <div class="hstat"><div class="v">${dots(m.health, 5, 'good')}</div><div class="k">health</div></div>
        <div class="hstat"><div class="v">${m.spice ? dots(m.spice, 3, 'hot') : '—'}</div><div class="k">spice</div></div>
      </div>
      ${m.allergens.length ? `<div class="allergens">${m.allergens.map(a => `<span class="allergen">⚠ ${a}</span>`).join('')}</div>` : ''}
      ${m.tip ? `<div class="tipbox">💡 ${m.tip}</div>` : ''}
      ${b ? `<div class="tipbox">♻ <b>Batch it:</b> double the pot of ${m.main.name} and it covers ~${b.covers} family meals. Fridge ${b.keeps} days, or freeze half.</div>` : ''}
      <h2 class="section">Ingredients <span class="muted">${m.mins} min · serves the family</span></h2>
      <ul class="ing-list">${m.ing.map(([k, q, note]) => {
        const it = PRICEBOOK[k];
        return `<li><span>${it.name}</span><span class="qty">${note || fmtQty(q, it.pack)}</span></li>`;
      }).join('')}</ul>
      <h2 class="section">Method${(m.side || m.prot) ? ` — ${m.main.name}` : ''}</h2>
      <ol class="steps">${m.main.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      ${m.prot ? `<h2 class="section">— ${m.prot.name}</h2><ol class="steps">${m.prot.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
      ${m.side ? `<h2 class="section">— ${m.side.name}</h2><ol class="steps">${m.side.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
      <div class="stars" id="stars">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= rating ? 'on' : ''}" data-act="rate|${id}|${i}">⭐</span>`).join('')}</div>
      <div class="react-row">
        <button class="btn btn-ghost ${prefs.like[id] ? 'on-like' : ''}" data-act="toggleLike|${id}">❤️ We love this</button>
        <button class="btn btn-ghost ${prefs.dislike[id] ? 'on-dislike' : ''}" data-act="toggleDislike|${id}">🙅 Not for us</button>
      </div>
      <div class="react-row">
        <button class="btn btn-ghost ${prefs.kidFav[id] ? 'on-like' : ''}" data-act="toggleKidFav|${id}">🧒 Kids' favourite</button>
        <button class="btn btn-ghost ${prefs.adultFav[id] ? 'on-like' : ''}" data-act="toggleAdultFav|${id}">🧑 Adults' favourite</button>
      </div>
      <button class="btn btn-ghost ${myFoods[id] ? 'on-like' : ''}" style="width:100%;margin-top:8px" data-act="toggleMyFood|${id}">${myFoods[id] ? '✓ On my food list' : '📌 Add to my food list'}</button>
      ${slotKey ? `
      <div class="react-row" style="margin-top:12px">
        <button class="btn btn-green" data-act="keepSlot|${slotKey}">👍 Keep it</button>
        <button class="btn btn-ghost" data-act="openPicker|${slotKey}|${who || 'f'}">↻ Change</button>
        <button class="btn btn-ghost" style="color:#a52222" data-act="removeSlot|${slotKey}">🗑 Remove</button>
      </div>` : !plannable ? '' : `<button class="btn btn-primary" style="width:100%;margin-top:10px" data-act="quickAdd|${cid}">＋ Add to this week</button>`}
    </div>`;
  $('#modal').classList.add('open');
}

function moreSides() { if (modalCtx) { modalCtx.moreSides = true; const c = modalCtx; openRecipe(c.cid, c.slotKey, c.who); } }
function moreProts() { if (modalCtx) { modalCtx.moreProts = true; const c = modalCtx; openRecipe(c.cid, c.slotKey, c.who); } }

/* swap one component of the current combo, keep the rest, update the plan slot */
function applyComboSwap(cid) {
  if (!mealOf(cid)) return;
  const ctx = modalCtx || {};
  if (ctx.slotKey && ctx.who && plan) {
    const slot = plan[ctx.slotKey] || {};
    slot[ctx.who] = cid;
    if (slot.f && ctx.who !== 'f') delete slot.f;
    plan[ctx.slotKey] = slot;
    saveAll(); renderPlanner(); renderShopping();
  }
  modalCtx = { ...ctx, cid };
  openRecipe(cid, ctx.slotKey, ctx.who);
}

function swapSide(mainId, sideId) {
  const cur = mealOf(modalCtx?.cid || mainId);
  const cid = makeCid(mainId, cur?.proteinId, sideId === '_none' ? null : sideId);
  if (sideId !== '_none' && !(PAIRS[mainId] || []).includes(sideId)) {
    const pairCid = mainId + '+' + sideId;
    if (!userCombos.includes(pairCid)) { userCombos.push(pairCid); saveAll(); toast('✨ New combo saved — it joins your recommendations'); }
  }
  applyComboSwap(cid);
}

function swapProt(mainId, protId) {
  const cur = mealOf(modalCtx?.cid || mainId);
  const cid = makeCid(mainId, protId === '_none' ? null : protId, cur?.sideId);
  if (protId !== '_none' && !(PROTEIN_PAIRS[mainId] || []).includes(protId)) toast('✨ Unusual pairing — love it');
  applyComboSwap(cid);
}

/* your tags: which meals + who a food is planned for */
function clearComboCacheFor(id) {
  for (const k in comboCache) if (k.split('+')[0] === id) delete comboCache[k];
}
function tagMeal(id, mt) {
  const t = foodTags[id] = foodTags[id] || {};
  const cur = t.meals ? [...t.meals] : [...effMealsOf(id)];
  const i = cur.indexOf(mt);
  if (i >= 0) cur.splice(i, 1); else cur.push(mt);
  t.meals = MEALS.filter(x => cur.includes(x));   // keep canonical b,l,d order
  clearComboCacheFor(id);
  saveAll();
  const c = modalCtx || {};
  openRecipe(c.cid || id, c.slotKey, c.who);
  renderRecipes();
}
function tagWho(id, v) {
  const t = foodTags[id] = foodTags[id] || {};
  if (t.who === v) delete t.who; else t.who = v;
  if (!Object.keys(t).length) delete foodTags[id];
  saveAll();
  const c = modalCtx || {};
  openRecipe(c.cid || id, c.slotKey, c.who);
  renderRecipes(); renderYou();
}

function fmtQty(q, pack) {
  if (q >= 1) return `${q} × ${pack}`;
  return `${Math.round(q * 100)}% of ${pack}`;
}

function refreshAfterReact(id) {
  saveAll();
  const c = modalCtx || {};
  openRecipe(c.cid || id, c.slotKey, c.who);
  renderRecipes(); renderYou();
}
function rate(id, n) { prefs.rating[id] = n; refreshAfterReact(id); }
function toggleLike(id) { prefs.like[id] = !prefs.like[id]; if (prefs.like[id]) delete prefs.dislike[id]; refreshAfterReact(id); }
function toggleDislike(id) { prefs.dislike[id] = !prefs.dislike[id]; if (prefs.dislike[id]) { delete prefs.like[id]; delete prefs.kidFav[id]; delete prefs.adultFav[id]; } refreshAfterReact(id); }
function toggleKidFav(id) { prefs.kidFav[id] = !prefs.kidFav[id]; if (prefs.kidFav[id]) delete prefs.dislike[id]; refreshAfterReact(id); }
function toggleAdultFav(id) { prefs.adultFav[id] = !prefs.adultFav[id]; if (prefs.adultFav[id]) delete prefs.dislike[id]; refreshAfterReact(id); }

function quickAdd(cid) {
  const m = mealOf(cid);
  if (!m) return;
  if (m.main.type === 'main' && !m.sideId && PAIRS[m.mainId]?.length) cid = defaultCombo(m.mainId);
  else if (m.main.type === 'main') cid = withProtein(cid);
  const mealType = m.meals.includes('d') ? 'd' : m.meals[0];
  plan = ensureWeek(weekOffset);
  const free = DAYS.find(d => !plan[`${d}-${mealType}`]) || 'mon';
  const key = `${free}-${mealType}`;
  const cur = plan[key];
  if (cur && cur.k && !cur.f && !kidOkMeal(cid)) plan[key] = { a: cid, k: cur.k };
  else if (settings.kids > 0 && !kidOkMeal(cid) && settings.splitMode === 'auto') {
    const kidCid = pickMeal(mealType, { forKids: true });
    plan[key] = kidCid && kidCid !== cid ? { a: cid, k: kidCid } : { f: cid };
  } else plan[key] = { f: cid };
  saveAll(); renderPlanner(); renderShopping(); closeModal();
  toast(`${m.name} → ${DAY_NAMES[free]} ${MEAL_NAMES[mealType].toLowerCase()} (${weekLabel(weekOffset).toLowerCase()})`);
  switchTab('plan');
}

/* ---------- slot picker (override) ---------- */
function openPicker(slotKey, who) {
  const mealType = slotKey.split('-')[1];
  const forKids = who === 'k';
  const ranked = candidateMeals(mealType)
    .map(c => [comboScore(c, { forKids }), c])
    .filter(([s]) => s > -100)
    .sort((a, b) => b[0] - a[0]);
  $('#modal-content').innerHTML = `
    <div class="m-body" style="padding-top:20px;position:relative">
      <button class="m-close" data-act="closeModal" style="position:absolute;top:12px;right:12px">✕</button>
      <h3>Pick ${MEAL_NAMES[mealType].toLowerCase()} · ${DAY_NAMES[slotKey.split('-')[0]]}</h3>
      <p class="muted" style="margin:4px 0 10px">${forKids ? 'Kid-friendly picks first.' : 'Sorted by what your family loves.'} Tap any pick to swap its side afterwards.</p>
      <div class="week-toolbar" style="margin-bottom:10px">
        <button class="btn btn-green" data-act="surpriseSlot|${slotKey}|${who}">🎲 Surprise me</button>
        <button class="btn btn-ghost" data-act="openInspire|${slotKey}|${who}">✨ Inspire me</button>
      </div>
      <div class="pick-list">
        ${ranked.map(([s, c], i) => {
          const m = mealOf(c);
          return `
          <div class="pick" data-act="assignSlot|${slotKey}|${who}|${c}">
            <div class="thumb" style="${thumbStyle(m)}">${m.emoji}</div>
            <div class="pi"><div class="rname">${m.name}</div>
              <div class="rsub">${CUISINE_NAMES[m.cuisine]} · ${m.mins} min ${BATCH[m.mainId] ? '· ♻' : ''} ${userCombos.includes(c) ? '· ✨ your combo' : ''} ${m.spice > settings.kidSpice ? '· 🌶 spicy' : ''}</div></div>
            ${i < 3 ? '<span class="score-tag">★ great match</span>' : ''}
          </div>`;
        }).join('')}
      </div>
      ${plan?.[slotKey] ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px" data-act="clearSlot|${slotKey}">Clear this slot</button>` : ''}
    </div>`;
  $('#modal').classList.add('open');
}

function surpriseSlot(slotKey, who) {
  const mealType = slotKey.split('-')[1];
  const top = candidateMeals(mealType)
    .map(c => [comboScore(c, { forKids: who === 'k' }), c])
    .filter(([s]) => s > -100)
    .sort((a, b) => b[0] - a[0]).slice(0, 8);
  if (!top.length) return;
  const [, cid] = top[Math.floor(Math.random() * top.length)];
  assignSlot(slotKey, who, cid);
  toast(`🎲 ${mealOf(cid).name} it is!`);
}

/* acceptance learning: keeping a proposal is a vote for it; swapping it away
   or deleting it is a quiet vote against */
function slotMains(slot) { return slotRecipes(slot).map(x => mealOf(x.id)?.mainId).filter(Boolean); }
function recordAccept(slot) { for (const id of slotMains(slot)) prefs.accept[id] = (prefs.accept[id] || 0) + 1; }
function recordReject(slot) { for (const id of slotMains(slot)) prefs.reject[id] = (prefs.reject[id] || 0) + 1; }

function keepSlot(slotKey) {
  if (plan?.[slotKey]) { recordAccept(plan[slotKey]); saveAll(); }
  closeModal();
  toast('👍 Noted — more like this coming');
}

function removeSlot(slotKey) {
  if (plan?.[slotKey]) { recordReject(plan[slotKey]); delete plan[slotKey]; }
  saveAll(); renderPlanner(); renderShopping(); closeModal();
  toast('Removed — I\'ll suggest it less');
}

function assignSlot(slotKey, who, cid) {
  plan = ensureWeek(weekOffset);
  const cur = plan[slotKey];
  // swapping away an auto-proposed meal is a gentle rejection of the old pick
  if (cur) {
    const oldCid = who === 'f' ? (cur.f || cur.a) : cur[who];
    const oldMain = oldCid && mealOf(oldCid)?.mainId;
    const newMain = mealOf(cid)?.mainId;
    if (oldMain && oldMain !== newMain) prefs.reject[oldMain] = (prefs.reject[oldMain] || 0) + 1;
  }
  if (who === 'f') {
    if (settings.kids > 0 && settings.splitMode === 'auto' && !kidOkMeal(cid)) {
      const kidCid = pickMeal(slotKey.split('-')[1], { forKids: true });
      plan[slotKey] = kidCid && kidCid !== cid ? { a: cid, k: kidCid } : { f: cid };
      if (plan[slotKey].k) toast(`Added kid option: ${mealOf(plan[slotKey].k).name}`);
    } else plan[slotKey] = { f: cid };
  } else if (who === 'a') plan[slotKey] = cur?.k || cur?.f ? { a: cid, k: cur.k || cur.f } : { a: cid };
  else plan[slotKey] = cur?.a || cur?.f ? { a: cur.a || cur.f, k: cid } : { k: cid };
  if (plan[slotKey].a && plan[slotKey].a === plan[slotKey].k) plan[slotKey] = { f: plan[slotKey].a };
  saveAll(); renderPlanner(); renderShopping(); closeModal();
}

function clearSlot(key) {
  if (plan?.[key]) { recordReject(plan[key]); delete plan[key]; }
  saveAll(); renderPlanner(); renderShopping(); closeModal();
}
function closeModal() { $('#modal').classList.remove('open'); modalCtx = null; }

/* ---------- inspire me: things you haven't tried ----------
   Deliberately spans ALL cuisines (one Nigerian, one British, one fusion when
   possible). With slot context it slots the pick straight into that meal. */
function openInspire(slotKey, who) {
  slotKey = slotKey || ''; who = who || '';
  const mealType = slotKey ? slotKey.split('-')[1] : null;
  const tried = new Set([
    ...Object.keys(prefs.like), ...Object.keys(prefs.dislike), ...Object.keys(prefs.rating),
    ...Object.keys(prefs.kidFav), ...Object.keys(prefs.adultFav),
  ]);
  let novel = Object.entries(PARTS)
    .filter(([id, p]) => !tried.has(id) && (p.type !== 'side' || p.solo) &&
      !settings.excludeAllergens.some(a => p.allergens.includes(a)) &&
      (!mealType || (p.meals || []).includes(mealType)) &&
      (who !== 'k' || kidOkPart(p, id)));
  // guarantee cuisine spread: one from each cuisine first, then fill randomly
  const shuffled = novel.sort(() => Math.random() - 0.5);
  const picks = [];
  for (const c of ['ng', 'uk', 'fusion']) {
    const hit = shuffled.find(([id, p]) => p.cuisine === c && !picks.includes(id) && !picks.some(x => x[0] === id));
    if (hit) picks.push(hit);
  }
  for (const e of shuffled) { if (picks.length >= 3) break; if (!picks.some(x => x[0] === e[0])) picks.push(e); }
  const tryAct = (id, p) => {
    const cid = p.type === 'main' ? defaultCombo(id) : id;
    return slotKey ? `assignSlot|${slotKey}|${who || 'f'}|${cid}` : `quickAdd|${cid}`;
  };
  $('#modal-content').innerHTML = `
    <div class="m-body" style="padding-top:20px;position:relative">
      <button class="m-close" data-act="closeModal" style="position:absolute;top:12px;right:12px">✕</button>
      <h3>✨ Try something new${slotKey ? ` · ${DAY_NAMES[slotKey.split('-')[0]]} ${MEAL_NAMES[mealType].toLowerCase()}` : ''}</h3>
      <p class="muted" style="margin:4px 0 14px">Across all cuisines, things you haven't rated yet — break the routine, then tell me what the family thought.</p>
      ${picks.length ? picks.map(([id, p]) => `
        <div class="pick" style="align-items:flex-start">
          <div class="thumb" style="${thumbStyle(p)}">${p.emoji}</div>
          <div class="pi">
            <div class="rname">${p.name} <span class="pill pill-${p.cuisine}" style="margin-left:4px">${CUISINE_NAMES[p.cuisine]}</span></div>
            <div class="rsub" style="white-space:normal;margin:2px 0 8px">${p.desc}</div>
            <div class="week-toolbar" style="margin:0">
              <button class="btn btn-green btn-sm" data-act="${tryAct(id, p)}">＋ ${slotKey ? 'Put it here' : 'Try it this week'}</button>
              <button class="btn btn-ghost btn-sm" data-act="openRecipe|${p.type === 'main' ? defaultCombo(id) : id}">View</button>
            </div>
          </div>
        </div>`).join('') : '<div class="empty-state"><div class="big">🏆</div>You\'ve rated everything — a true foodie family!</div>'}
      ${picks.length ? `<button class="btn btn-ghost" style="width:100%;margin-top:6px" data-act="openInspire|${slotKey}|${who}">🔀 Show me different ones</button>` : ''}
    </div>`;
  $('#modal').classList.add('open');
}

/* ---------- shopping ---------- */
function priceOf(key, storeId) {
  const o = priceOverrides[key]?.[storeId];
  if (o !== undefined) return o;
  return PRICEBOOK[key][storeId];
}
function pricesFor(key) {
  const p = {};
  for (const s of STORES) p[s.id] = priceOf(key, s.id);
  return p;
}

/* audience-aware ingredient need; batch-cooked slots scaled by reuse */
function needFromPlan(p) {
  const need = {};
  const reuse = {};
  const A = settings.adults, K = settings.kids * 0.6;
  for (const k in p) if (p[k].lo) reuse[p[k].lo] = (reuse[p[k].lo] || 0) + 1;
  for (const k in p) {
    const slot = p[k];
    if (slot.lo) continue;
    const mult = 1 + 0.8 * (reuse[k] || 0);
    for (const { id, who } of slotRecipes(slot)) {
      const fac = Math.max(0.4, (who === 'all' ? A + K : who === 'adults' ? A : K) / 3.2);
      const m = mealOf(id);
      if (!m) continue;
      for (const [key, q] of m.ing) need[key] = (need[key] || 0) + q * mult * fac;
    }
  }
  return need;
}

function buildBasket() {
  let items = [];
  if (shopScope === 'bulk') {
    const need = {};
    for (let off = 0; off < 4; off++) {
      const n = needFromPlan(ensureWeek(off));
      for (const k in n) need[k] = (need[k] || 0) + n[k];
    }
    items = Object.entries(need).filter(([k]) => BULK_KEYS.has(k)).map(([key, q]) => ({
      key, ...PRICEBOOK[key], packs: Math.max(1, Math.ceil(q)), src: 'plan', prices: pricesFor(key),
    }));
  } else {
    const need = needFromPlan(plan || {});
    const merged = {};
    for (const key in need) {
      if (shopScope === 'week' && BULK_KEYS.has(key)) continue;
      merged[key] = { plan: Math.max(1, Math.ceil(need[key])), extra: 0 };
    }
    for (const key in extras) {
      if (!extras[key]) continue;
      merged[key] = merged[key] || { plan: 0, extra: 0 };
      merged[key].extra += extras[key];
    }
    items = Object.entries(merged).map(([key, n]) => ({
      key, ...PRICEBOOK[key], packs: n.plan + n.extra,
      src: n.plan ? (n.extra ? 'both' : 'plan') : 'extra',
      prices: pricesFor(key),
    }));
    for (const c of customs) {
      const hasPrice = STORES.some(s => c.prices?.[s.id] != null);
      items.push({
        key: c.id, name: c.name, cat: 'Your own items', pack: 'each', packs: c.qty,
        src: 'custom', prices: c.prices || {}, unpriced: !hasPrice,
      });
    }
  }
  items.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  return items;
}

function bulkHiddenCount() {
  const need = needFromPlan(plan || {});
  return Object.keys(need).filter(k => BULK_KEYS.has(k)).length;
}

function compareStores(items) {
  const priced = items.filter(it => !it.unpriced);
  const res = STORES.map(st => {
    let total = 0; const missing = [];
    for (const it of priced) {
      const p = it.prices[st.id];
      if (p == null) missing.push(it);
      else total += p * it.packs;
    }
    let topUp = 0;
    for (const it of missing) {
      const alts = STORES.map(s2 => it.prices[s2.id]).filter(p => p != null);
      if (alts.length) topUp += Math.min(...alts) * it.packs;
    }
    return { ...st, total, missing, effective: total + topUp };
  }).sort((a, b) => a.effective - b.effective);

  let bestSplit = null;
  for (let i = 0; i < STORES.length; i++) for (let j = i + 1; j < STORES.length; j++) {
    const A = STORES[i], B = STORES[j];
    let sum = 0, ok = true; let aCount = 0, bCount = 0;
    for (const it of priced) {
      const pa = it.prices[A.id], pb = it.prices[B.id];
      if (pa == null && pb == null) { ok = false; break; }
      if (pb == null || (pa != null && pa <= pb)) { sum += pa * it.packs; aCount++; }
      else { sum += pb * it.packs; bCount++; }
    }
    if (ok && (!bestSplit || sum < bestSplit.sum)) bestSplit = { a: A, b: B, sum, aCount, bCount };
  }
  return { ranking: res, bestSplit };
}

function setShopScope(s) { shopScope = s; renderShopping(); }

function renderShopping() {
  const items = buildBasket();
  const el = $('#shop-content');
  const bulkEnd = weekDates(3)[6];
  const scopeBar = `
    <div class="view-toggle" style="margin:0 0 10px">
      <button class="${shopScope === 'week' ? 'active' : ''}" data-act="setShopScope|week">🧺 Week top-up</button>
      <button class="${shopScope === 'bulk' ? 'active' : ''}" data-act="setShopScope|bulk">📦 Monthly bulk</button>
      <button class="${shopScope === 'all' ? 'active' : ''}" data-act="setShopScope|all">🛒 Full week</button>
    </div>
    <p class="muted" style="margin:0 2px 12px;line-height:1.45">${
      shopScope === 'week' ? `Perishables &amp; fresh food for <b>${weekLabel(weekOffset).toLowerCase()}</b>. ${bulkHiddenCount()} long-life staples live in 📦 Monthly bulk.` :
      shopScope === 'bulk' ? `Forecast of long-life staples for the <b>next 4 weeks</b> — until ${fmtDate(bulkEnd)}. One big trip, then only fresh top-ups weekly.` :
      `Everything needed for <b>${weekLabel(weekOffset).toLowerCase()}</b> in one basket.`}</p>`;
  const toolbar = `<div class="week-toolbar" style="margin-bottom:12px">
      <button class="btn btn-primary" data-act="openAddModal">＋ Add items</button>
      <button class="btn btn-ghost" data-act="switchTab|plan">📅 Meal plan</button>
    </div>`;

  if (!items.length) {
    el.innerHTML = toolbar + scopeBar + `<div class="empty-state"><div class="big">🛒</div>Nothing in this view yet.<br>Add items above, or plan meals and the<br>ingredients + price comparison appear here.</div>`;
    return;
  }
  const { ranking, bestSplit } = compareStores(items);
  const complete = ranking.filter(s => !s.missing.length);
  const win = complete[0] || [...ranking].sort((a, b) => a.missing.length - b.missing.length || a.effective - b.effective)[0];
  const worst = ranking[ranking.length - 1];
  const saving = worst.effective - win.effective;
  const splitSaves = bestSplit ? win.effective - bestSplit.sum : 0;
  const unpricedCount = items.filter(it => it.unpriced).length;

  let html = toolbar + scopeBar + `
    <div class="winner-card">
      <div class="wc-label">🏆 Best ${shopScope === 'bulk' ? 'bulk-shop (4 weeks)' : 'one-stop this week'}</div>
      <div class="wc-store">${win.name}</div>
      <div class="wc-total">£${win.effective.toFixed(2)} for the full basket</div>
      <div class="wc-note">${win.missing.length
        ? `⚠ No store stocks everything — ${win.name} has the fewest gaps (${win.missing.map(m => m.name).join(', ')} priced at the cheapest alternative).`
        : `Everything on your list in one trip. You save <b>£${saving.toFixed(2)}</b> vs the priciest full option (${worst.name}).`}</div>
    </div>
    <div class="store-rank">
      ${ranking.map(s => {
        const diff = s.effective - win.effective;
        const delta = s.id === win.id ? 'best one-stop' : (diff >= 0 ? '+£' + diff.toFixed(2) : '−£' + (-diff).toFixed(2) + ' but gaps');
        return `
        <div class="store-row ${s.id === win.id ? 'best' : ''}">
          <span class="dot" style="background:${s.color}"></span>
          <span class="sname">${s.name}${s.missing.length ? `<div class="missing">${s.missing.length} item${s.missing.length > 1 ? 's' : ''} not stocked (incl. top-up)</div>` : ''}</span>
          <span class="total">£${s.effective.toFixed(2)}</span>
          <span class="delta">${delta}</span>
        </div>`;
      }).join('')}
    </div>`;

  if (bestSplit && splitSaves > 0.5) {
    html += `<div class="splitbox">✂️ <b>Smart split:</b> shop at <b>${bestSplit.a.name}</b> (${bestSplit.aCount} items) + <b>${bestSplit.b.name}</b> (${bestSplit.bCount} items) and the basket drops to <b>£${bestSplit.sum.toFixed(2)}</b> — another <b>£${splitSaves.toFixed(2)}</b> saved if the trip's worth it.</div>`;
  }
  if (unpricedCount) html += `<div class="splitbox">ℹ️ ${unpricedCount} of your own item${unpricedCount > 1 ? 's have' : ' has'} no prices yet, so ${unpricedCount > 1 ? 'they are' : 'it is'} on the list but left out of the store totals. Tap ✎ to add prices.</div>`;

  let cat = '';
  html += `<h2 class="section">Your list <button class="btn btn-ghost btn-sm" data-act="copyList">📋 Copy</button></h2>`;
  for (const it of items) {
    if (it.cat !== cat) { cat = it.cat; html += `<div class="shop-cat">${cat}</div>`; }
    const best = STORES.map(s => ({ s, p: it.prices[s.id] })).filter(x => x.p != null).sort((a, b) => a.p - b.p)[0];
    const done = checks[it.key];
    const removable = it.src === 'extra' || it.src === 'custom';
    const ctls = removable
      ? ` <span class="qty-ctl"><button data-act="bumpItem|${it.key}|-1">−</button><button data-act="bumpItem|${it.key}|1">＋</button><button class="rm" data-act="removeItem|${it.key}">✕</button></span>`
      : (it.src === 'both' ? ` <span class="qty-ctl"><button data-act="bumpItem|${it.key}|-1">−</button><button data-act="bumpItem|${it.key}|1">＋</button></span>` : '');
    const srcNote = it.src === 'plan' ? 'meal plan' : it.src === 'both' ? 'meal plan + added' : 'added by you';
    html += `
      <div class="shop-item">
        <input type="checkbox" ${done ? 'checked' : ''} data-chg="toggleCheck|${it.key}">
        <div class="si ${done ? 'done' : ''}"><div class="n">${it.name}</div><div class="q">${it.packs} × ${it.pack} · ${srcNote}${ctls}</div></div>
        <div class="bestprice" data-act="togglePriceEdit|${it.key}">
          ${best ? `<div class="p">£${(best.p * it.packs).toFixed(2)}</div><div class="s" style="color:${best.s.color}">${best.s.name} ✎</div>` : '<div class="p">— ✎</div>'}
        </div>
      </div>
      <div class="price-editor" id="pe-${it.key}" style="display:none">
        ${STORES.map(s => {
          const p = it.prices[s.id];
          const fn = it.src === 'custom' ? 'setCustomPrice' : 'setPrice';
          return `<div><label>${s.name}</label><input type="number" step="0.01" min="0" placeholder="n/a" value="${p ?? ''}" data-chg="${fn}|${it.key}|${s.id}"></div>`;
        }).join('')}
      </div>`;
  }
  html += `<p class="muted" style="margin:14px 2px 4px;line-height:1.5">💡 Prices are typical shelf prices — tap any price to correct it from this week's shop or the <a href="https://www.trolley.co.uk" target="_blank" rel="noopener">Trolley.co.uk</a> app (free), and NaijaPlate remembers your corrections.</p>`;
  el.innerHTML = html;
}

/* ---------- standalone shopping items ---------- */
function openAddModal(query = '') {
  const q = String(query).toLowerCase();
  const catalog = Object.entries(PRICEBOOK)
    .filter(([, v]) => !q || v.name.toLowerCase().includes(q))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));
  $('#modal-content').innerHTML = `
    <div class="m-body" style="padding-top:20px;position:relative">
      <button class="m-close" data-act="closeModal" style="position:absolute;top:12px;right:12px">✕</button>
      <h3>Add to shopping list</h3>
      <input class="inp" id="add-search" placeholder="🔍 Search the catalogue…" value="${String(query).replace(/"/g, '&quot;')}" data-inp="searchAdd"
        style="width:100%;font:inherit;font-size:.9rem;padding:11px 14px;border:1.5px solid var(--line);border-radius:14px;margin:10px 0;background:#fff">
      <div class="pick-list">
        ${catalog.map(([key, v]) => {
          const best = STORES.map(s => priceOf(key, s.id)).filter(p => p != null);
          const inList = extras[key] ? ` · in list ×${extras[key]}` : '';
          return `<div class="pick" data-act="addExtra|${key}">
            <div class="thumb" style="background:linear-gradient(135deg,var(--green),var(--green-dark));font-size:1rem;color:#fff">🛒</div>
            <div class="pi"><div class="rname">${v.name}</div><div class="rsub">${v.pack} · from £${best.length ? Math.min(...best).toFixed(2) : '?'}${inList}</div></div>
            <span class="score-tag">＋ add</span>
          </div>`;
        }).join('') || '<p class="muted" style="margin:6px 0 12px">Nothing in the catalogue matches.</p>'}
      </div>
      <h2 class="section">Can't find it? Add your own</h2>
      <div class="card" style="margin-bottom:20px">
        <input class="inp" id="custom-name" placeholder="Item name, e.g. Nappies size 5" ${q ? `value="${String(query).replace(/"/g, '&quot;')}"` : ''}
          style="width:100%;font:inherit;font-size:.9rem;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:#fff">
        <div class="price-editor" style="display:grid;border:none;padding-top:10px">
          ${STORES.map(s => `<div><label>${s.name} £</label><input type="number" step="0.01" min="0" placeholder="opt." id="cp-${s.id}"></div>`).join('')}
        </div>
        <button class="btn btn-green" style="width:100%;margin-top:10px" data-act="addCustom">＋ Add my item</button>
      </div>
    </div>`;
  $('#modal').classList.add('open');
}

function searchAdd(v) {
  openAddModal(v);
  const i = $('#add-search');
  if (i) { i.focus(); i.selectionStart = i.selectionEnd = i.value.length; }
}

function addExtra(key) {
  extras[key] = (extras[key] || 0) + 1;
  saveAll(); renderShopping();
  toast(`${PRICEBOOK[key].name} added to list`);
  openAddModal($('#add-search')?.value || '');
}

function addCustom() {
  const name = $('#custom-name').value.trim();
  if (!name) { toast('Give the item a name first'); return; }
  const prices = {};
  for (const s of STORES) {
    const v = $('#cp-' + s.id).value;
    prices[s.id] = v === '' ? null : parseFloat(v);
  }
  customs.push({ id: 'c_' + Date.now(), name, qty: 1, prices });
  saveAll(); renderShopping(); closeModal();
  toast(`${name} added to list`);
}

function bumpItem(key, d) {
  const c = customs.find(x => x.id === key);
  if (c) { c.qty = Math.max(1, c.qty + d); }
  else if (extras[key] != null) {
    extras[key] = Math.max(0, extras[key] + d);
    if (!extras[key]) { delete extras[key]; delete checks[key]; }
  } else if (d > 0) extras[key] = 1;
  saveAll(); renderShopping();
}

function removeItem(key) {
  const i = customs.findIndex(x => x.id === key);
  if (i >= 0) customs.splice(i, 1); else delete extras[key];
  delete checks[key];
  saveAll(); renderShopping();
}

function toggleCheck(key) { checks[key] = !checks[key]; saveAll(); renderShopping(); }
function togglePriceEdit(key) { const e = $('#pe-' + key); if (e) e.style.display = e.style.display === 'none' ? 'grid' : 'none'; }
function setPrice(key, storeId, val) {
  priceOverrides[key] = priceOverrides[key] || {};
  priceOverrides[key][storeId] = val === '' ? null : parseFloat(val);
  saveAll(); renderShopping();
}
function setCustomPrice(id, storeId, val) {
  const c = customs.find(x => x.id === id);
  if (!c) return;
  c.prices = c.prices || {};
  c.prices[storeId] = val === '' ? null : parseFloat(val);
  saveAll(); renderShopping();
}

function copyList() {
  const items = buildBasket();
  const { ranking } = compareStores(items);
  const scopeName = shopScope === 'bulk' ? 'monthly bulk (4 wks)' : shopScope === 'week' ? 'weekly top-up' : 'full week';
  let txt = `🛒 NaijaPlate ${scopeName} — best shop: ${ranking[0]?.name || '?'} £${ranking[0]?.effective.toFixed(2) || '0'}\n\n`;
  let cat = '';
  for (const it of items) {
    if (it.cat !== cat) { cat = it.cat; txt += `\n${cat.toUpperCase()}\n`; }
    txt += `${checks[it.key] ? '✓' : '○'} ${it.name} — ${it.packs} × ${it.pack}\n`;
  }
  const ok = () => toast('List copied — paste into WhatsApp/Notes');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(txt).then(ok, () => fallbackCopy(txt, ok));
  } else fallbackCopy(txt, ok);
}

function fallbackCopy(txt, ok) {
  const ta = document.createElement('textarea');
  ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); ok(); } catch { toast('Copy not supported — screenshot instead'); }
  ta.remove();
}

/* ---------- onboarding ---------- */
let ob = { step: 0, choices: {} };
const COV_OPTS = [['all', 'Every day'], ['weekday', 'Weekdays'], ['weekend', 'Weekends'], ['none', "Don't plan"]];

function startOnboarding() {
  ob = { step: 0, choices: {} };
  for (const g of ONBOARD_GROUPS) for (const id of g.ids) {
    if (prefs.dislike[id]) ob.choices[id] = 'no';
    else if (prefs.like[id]) ob.choices[id] = 'all';
    else if (prefs.kidFav[id]) ob.choices[id] = 'kids';
    else if (prefs.adultFav[id]) ob.choices[id] = 'adults';
  }
  renderOnboarding();
  $('#onboard').classList.add('open');
}

function covSelect(mealType, aud) {
  return `<select class="inp" data-chg="setCoverage|${mealType}|${aud}">
    ${COV_OPTS.map(([v, l]) => `<option value="${v}" ${settings.coverage[mealType][aud] === v ? 'selected' : ''}>${l}</option>`).join('')}
  </select>`;
}

function renderOnboarding() {
  const el = $('#onboard');
  if (ob.step === 0) {
    el.innerHTML = `<div class="ob-wrap">
      <div class="ob-hero">🍚</div>
      <h2>Welcome to NaijaPlate</h2>
      <p class="muted" style="margin:6px 0 18px;line-height:1.5">90 seconds of setup and every meal plan, batch-cook schedule and shopping list is shaped around <b>your</b> family.</p>
      <div class="card" style="text-align:left">
        <h2 class="section" style="margin-top:0">Who's eating?</h2>
        <div class="setting-row"><div class="sl">Adults</div>
          <div class="stepper"><button data-act="obBump|adults|-1">−</button><span class="val">${settings.adults}</span><button data-act="obBump|adults|1">＋</button></div></div>
        <div class="setting-row"><div class="sl">Kids</div>
          <div class="stepper"><button data-act="obBump|kids|-1">−</button><span class="val">${settings.kids}</span><button data-act="obBump|kids|1">＋</button></div></div>
        <div class="setting-row"><div class="sl">Kids' spice tolerance</div>
          <select class="inp" data-chg="setSetting|kidSpice">
            ${[['0', 'None 🚫🌶'], ['1', 'Mild 🌶'], ['2', 'Medium 🌶🌶'], ['3', 'Naija-strong 🌶🌶🌶']].map(([v, l]) => `<option value="${v}" ${settings.kidSpice == v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
      </div>
      <div class="card" style="text-align:left">
        <h2 class="section" style="margin-top:0">How do you like to cook?</h2>
        ${[['daily', '🍳 Fresh every day', 'A different meal each time, no leftovers.'],
           ['batch', '♻ Batch &amp; reuse', 'Big pots 2–3× a week, smart reheats between. Recommended.'],
           ['minimal', '⏱ Minimal cooking', 'Cook as rarely as possible — maximise every pot.']]
          .map(([v, t, d]) => `<div class="ob-style ${settings.cookStyle === v ? 'sel' : ''}" data-act="obStyle|${v}"><b>${t}</b><span>${d}</span></div>`).join('')}
      </div>
      <button class="btn btn-primary" style="width:100%" data-act="obStep|1">Next — which meals? →</button>
    </div>`;
  } else if (ob.step === 1) {
    el.innerHTML = `<div class="ob-wrap">
      <h2 style="margin-top:8px">Which meals should I plan?</h2>
      <p class="muted" style="margin:6px 0 14px;line-height:1.5">School lunches? Work canteen? Weekend-only fry-ups? Tell me who needs what, and I'll only plan (and shop for) those meals.</p>
      <div class="card" style="text-align:left">
        ${MEALS.map(mt => `
          <div class="cov-row">
            <b>${MEAL_ICONS[mt]} ${MEAL_NAMES[mt]}</b>
            <div class="cov-grid">
              <div><label>Adults</label>${covSelect(mt, 'adults')}</div>
              <div><label>Kids</label>${covSelect(mt, 'kids')}</div>
            </div>
          </div>`).join('')}
      </div>
      <p class="muted" style="margin:0 0 14px;font-size:.74rem">e.g. kids on school dinners → Kids' lunch = "Weekends". You can change this any time in You ▸ Household.</p>
      <div class="week-toolbar">
        <button class="btn btn-ghost" data-act="obStep|0">← Back</button>
        <button class="btn btn-primary" data-act="obStep|2">Next — your tastes →</button>
      </div>
    </div>`;
  } else {
    el.innerHTML = `<div class="ob-wrap">
      <h2 style="margin-top:8px">Who enjoys what?</h2>
      <p class="muted" style="margin:6px 0 14px;line-height:1.5">Each item is asked <b>on its own</b> — soups, swallows and sides separately. The planner combines what you love into sensible plates (and you can invent your own combos later).</p>
      ${ONBOARD_GROUPS.map(g => `
        <h2 class="section" style="text-align:left">${g.title}</h2>
        ${g.ids.map(id => {
          const p = PARTS[id]; const c = ob.choices[id];
          return `<div class="ob-food" data-ob="${id}">
            <div class="thumb" style="${thumbStyle(p)}">${p.emoji}</div>
            <div class="ob-fi"><div class="rname">${p.name}</div>
              <div class="ob-chips">
                ${[['all', '👨‍👩‍👧‍👦 Everyone'], ['adults', '🧑 Adults'], ['kids', '🧒 Kids'], ['no', '🙅 No']]
                  .map(([v, l]) => `<button class="ob-chip ${c === v ? 'sel' : ''}" data-act="obChoice|${id}|${v}">${l}</button>`).join('')}
              </div></div>
          </div>`;
        }).join('')}`).join('')}
      <div class="week-toolbar" style="margin-top:14px">
        <button class="btn btn-ghost" data-act="obStep|1">← Back</button>
        <button class="btn btn-primary" data-act="finishOnboarding">Build my plan ✨</button>
      </div>
    </div>`;
  }
  $('#onboard').scrollTop = 0;
}

function obBump(k, d) { settings[k] = Math.max(k === 'adults' ? 1 : 0, Math.min(8, settings[k] + d)); saveAll(); renderOnboarding(); }
function obStyle(v) { settings.cookStyle = v; saveAll(); renderOnboarding(); }
function obStep(n) { ob.step = n; renderOnboarding(); }
function setCoverage(mealType, aud, v) { settings.coverage[mealType][aud] = v; saveAll(); }

function obChoice(id, v) {
  ob.choices[id] = ob.choices[id] === v ? undefined : v;
  const card = $(`.ob-food[data-ob="${id}"]`);
  if (card) $$('.ob-chip', card).forEach(b => b.classList.toggle('sel', b.getAttribute('data-act').endsWith('|' + (ob.choices[id] || '§'))));
}

function finishOnboarding() {
  for (const id in ob.choices) {
    const v = ob.choices[id];
    if (!v) continue;
    delete prefs.like[id]; delete prefs.dislike[id]; delete prefs.kidFav[id]; delete prefs.adultFav[id];
    if (v === 'all') { prefs.like[id] = true; prefs.kidFav[id] = true; prefs.adultFav[id] = true; }
    else if (v === 'adults') prefs.adultFav[id] = true;
    else if (v === 'kids') prefs.kidFav[id] = true;
    else if (v === 'no') prefs.dislike[id] = true;
  }
  store.save('onboarded', true);
  saveAll();
  $('#onboard').classList.remove('open');
  plans[weekKey(weekOffset)] = buildWeekPlan();
  plan = plans[weekKey(weekOffset)];
  saveAll();
  renderPlanner(); renderShopping(); renderRecipes(); renderYou();
  toast('Your week is planned — and it learns as you react 💚');
}

/* ---------- my food list (curated planning pool) ---------- */
let myFoodsQuery = '';

function toggleMyFood(id) {
  if (myFoods[id]) delete myFoods[id]; else myFoods[id] = true;
  saveAll();
  if ($('#myfoods').classList.contains('open')) renderMyFoods();
  if (modalCtx) openRecipe(modalCtx.cid, modalCtx.slotKey, modalCtx.who);
  renderYou();
}

let mfTimer = null;
let mfOnline = { q: '', state: 'idle', results: [] };

function searchMyFoods(v) {
  myFoodsQuery = v;
  clearTimeout(mfTimer);
  if (v.trim().length >= 3) {
    if (mfOnline.q !== v.trim()) mfOnline = { q: v.trim(), state: 'loading', results: [] };
    mfTimer = setTimeout(() => onlineSearch(v.trim()), 400);
  } else mfOnline = { q: '', state: 'idle', results: [] };
  renderMyFoods();
  mfRefocus();
}

function mfRefocus() {
  const i = $('#mf-search');
  if (i) { i.focus(); i.selectionStart = i.selectionEnd = i.value.length; }
}

/* ---------- online research: TheMealDB (free community food database) ---------- */
async function onlineSearch(q) {
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q));
    const data = await res.json();
    if (myFoodsQuery.trim() !== q) return; // user typed on — stale response
    mfOnline = { q, state: 'done', results: (data.meals || []).slice(0, 8) };
  } catch {
    mfOnline = { q, state: 'error', results: [] };
  }
  if ($('#myfoods').classList.contains('open')) { renderMyFoods(); mfRefocus(); }
}

/* map a TheMealDB ingredient name onto the price book; order matters (specific first) */
const ING_SKIP = ['water', 'salt', 'black pepper', 'white pepper', 'sugar', 'vinegar', 'lemon', 'lime', 'wine', 'ice'];
const ING_MATCH = [
  ['puree', ['tomato puree', 'tomato purée', 'tomato paste']],
  ['plum_tom', ['chopped tomato', 'tinned tomato', 'canned tomato', 'plum tomato']],
  ['sweet_pot', ['sweet potato']], ['potatoes', ['potato']],
  ['palm_oil', ['palm oil']], ['coconut_mlk', ['coconut milk', 'coconut cream']],
  ['peanut_b', ['peanut butter']],
  ['veg_oil', ['vegetable oil', 'sunflower oil', 'olive oil', 'oil']],
  ['scotch_b', ['scotch bonnet', 'habanero', 'chilli', 'chili', 'cayenne']],
  ['peppers', ['bell pepper', 'green pepper', 'red pepper', 'capsicum']],
  ['chick_brst', ['chicken breast', 'chicken fillet']],
  ['thighs', ['chicken thigh', 'chicken leg', 'chicken drumstick']],
  ['chicken', ['whole chicken', 'chicken']],
  ['mince', ['minced beef', 'ground beef', 'beef mince', 'minced meat']],
  ['stew_beef', ['beef', 'steak', 'brisket', 'lamb', 'goat', 'oxtail']],
  ['sausages', ['sausage']],
  ['white_fish', ['cod', 'haddock', 'white fish', 'sea bass', 'pollock']],
  ['tuna', ['tuna']], ['tilapia', ['tilapia']],
  ['eggs', ['egg']],
  ['cheese', ['cheddar', 'parmesan', 'mozzarella', 'cheese']],
  ['butter', ['butter']], ['milk', ['milk', 'cream', 'yogurt', 'yoghurt']],
  ['basmati', ['basmati']], ['rice', ['rice']],
  ['spaghetti', ['spaghetti', 'linguine']],
  ['pasta', ['penne', 'macaroni', 'fusilli', 'lasagne', 'pasta']],
  ['flour', ['flour', 'breadcrumb', 'cornstarch', 'corn flour']],
  ['bread', ['bread', 'baguette', 'tortilla', 'pitta']],
  ['oats', ['oats', 'oatmeal']],
  ['beans_tin', ['baked beans']],
  ['be_beans', ['black-eyed', 'black eyed', 'kidney bean', 'butter bean', 'beans']],
  ['onions', ['onion', 'shallot', 'leek']],
  ['garlic', ['garlic']], ['ginger', ['ginger']],
  ['tomatoes', ['tomato']], ['carrots', ['carrot']], ['broccoli', ['broccoli']],
  ['spinach', ['spinach', 'kale', 'cabbage']],
  ['peas', ['peas']], ['sweetcorn', ['sweetcorn', 'corn']],
  ['plantain', ['plantain']], ['yam', ['yam']], ['bananas', ['banana']],
  ['honey', ['honey', 'golden syrup']],
  ['stock_cubes', ['stock', 'bouillon']],
  ['curry_pwd', ['curry', 'turmeric', 'cumin', 'coriander', 'paprika', 'garam masala']],
  ['thyme', ['thyme', 'oregano', 'rosemary', 'bay lea', 'parsley', 'basil', 'mixed herbs']],
  ['gravy', ['gravy']],
  ['crayfish', ['crayfish']], ['dried_fish', ['smoked fish', 'stockfish']],
  ['egusi', ['egusi', 'melon seed']], ['garri', ['garri', 'gari']],
];

function matchIngredient(name) {
  const n = name.toLowerCase();
  if (ING_SKIP.some(s => n.includes(s))) return 'skip';
  for (const [key, terms] of ING_MATCH) if (terms.some(t => n.includes(t))) return key;
  return null;
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
const CAT_EMOJI = { Beef: '🥩', Chicken: '🍗', Dessert: '🍰', Lamb: '🍖', Pasta: '🍝', Pork: '🥓', Seafood: '🦐', Side: '🥗', Starter: '🥣', Vegan: '🥬', Vegetarian: '🥗', Breakfast: '🍳', Goat: '🍖', Miscellaneous: '🍲' };
const IMPORT_GRADS = [['#8a5a2b', '#4c2e0c'], ['#a34a1e', '#5e2408'], ['#2d6fa3', '#123c61'], ['#4d8a2f', '#20520f'], ['#ad2f1d', '#5f0f06']];

function importMeal(idx) {
  const meal = mfOnline.results[idx];
  if (!meal) return;
  const id = 'u_' + meal.idMeal;
  if (PARTS[id]) { toast('Already in your database'); return; }
  const ing = [];
  const allergens = new Set();
  let spicy = false;
  for (let i = 1; i <= 20; i++) {
    const name = (meal['strIngredient' + i] || '').trim();
    if (!name) continue;
    const measure = (meal['strMeasure' + i] || '').trim();
    const n = name.toLowerCase();
    if (/egg/.test(n)) allergens.add('egg');
    if (/milk|cheese|butter|cream|yogurt/.test(n)) allergens.add('milk');
    if (/flour|bread|pasta|spaghetti|noodle|wheat/.test(n)) allergens.add('gluten');
    if (/fish|tuna|prawn|shrimp|cod|haddock|salmon|anchov/.test(n)) allergens.add('fish');
    if (/peanut/.test(n)) allergens.add('peanut');
    if (/chilli|chili|cayenne|scotch bonnet|habanero/.test(n)) spicy = true;
    const key = matchIngredient(name);
    if (key === 'skip') continue;
    if (key) ing.push([key, 0.3, measure || undefined]);
    else {
      const ciKey = 'ci_' + slug(name);
      if (!PRICEBOOK[ciKey]) {
        customIngredients[ciKey] = { name, cat: 'Other groceries', pack: 'item', aldi: null, tesco: null, sains: null, asda: null };
        PRICEBOOK[ciKey] = customIngredients[ciKey];
      }
      ing.push([ciKey, 1, measure || undefined]);
    }
  }
  let steps = (meal.strInstructions || '').split(/\r?\n+/).map(s => s.replace(/^\s*(STEP\s*)?\d+[.)]?\s*/i, '').trim()).filter(s => s.length > 10);
  if (steps.length < 2) steps = (meal.strInstructions || '').split(/(?<=\.)\s+/).map(s => s.trim()).filter(s => s.length > 10);
  steps = steps.slice(0, 10);
  const part = {
    name: meal.strMeal, emoji: CAT_EMOJI[meal.strCategory] || '🍲',
    grad: IMPORT_GRADS[meal.strMeal.length % IMPORT_GRADS.length],
    cuisine: meal.strArea === 'British' ? 'uk' : 'world',
    type: 'dish', meals: meal.strCategory === 'Breakfast' ? ['b'] : ['l', 'd'],
    kid: spicy ? 1 : 2, spice: spicy ? 2 : 0, mins: 45, kcal: 520, protein: 28, health: 3,
    allergens: [...allergens],
    desc: `${meal.strArea || 'World'} ${(meal.strCategory || 'dish').toLowerCase()} — imported from the community food database.`,
    ing, steps: steps.length ? steps : ['Cook following the original recipe.'],
    img: meal.strMealThumb || null, custom: true,
  };
  customParts[id] = part;
  PARTS[id] = part;
  myFoods[id] = true;
  saveAll();
  renderMyFoods(); mfRefocus(); renderRecipes(); renderYou();
  toast(`${meal.strMeal} imported — recipe, photo & ingredients added 🌐`);
}

/* ---------- teach it manually (when the food database doesn't know it) ---------- */
function openManualFood(prefill = '') {
  $('#modal-content').innerHTML = `
    <div class="m-body" style="padding-top:20px;position:relative">
      <button class="m-close" data-act="closeModal">✕</button>
      <h3>✍️ Teach me a food</h3>
      <p class="muted" style="margin:4px 0 12px">Not in the food database? Add it yourself — it becomes plannable straight away and you can share it in a food pack.</p>
      <div class="card">
        <input class="inp" id="man-name" placeholder="Name, e.g. Grandma's ogbono" value="${String(prefill).replace(/"/g, '&quot;')}"
          style="width:100%;font:inherit;font-size:.9rem;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:#fff;margin-bottom:10px">
        <div class="cov-grid" style="margin-bottom:10px">
          <div><label>Cuisine</label><select class="inp" id="man-cuisine" style="width:100%">
            <option value="ng">Nigerian</option><option value="uk">British</option>
            <option value="fusion">Fusion</option><option value="world">World</option></select></div>
          <div><label>Spice</label><select class="inp" id="man-spice" style="width:100%">
            <option value="0">Not spicy</option><option value="1">Mild</option>
            <option value="2">Spicy</option><option value="3">Very spicy</option></select></div>
        </div>
        <div class="cov-grid" style="margin-bottom:10px">
          <div><label>Meals</label><select class="inp" id="man-meals" style="width:100%">
            <option value="l,d">Lunch &amp; dinner</option><option value="d">Dinner only</option>
            <option value="b">Breakfast</option><option value="b,l,d">Any meal</option></select></div>
          <div><label>Kids like it?</label><select class="inp" id="man-kid" style="width:100%">
            <option value="3">Love it</option><option value="2" selected>It's fine</option>
            <option value="1">Adults' thing</option></select></div>
        </div>
        <button class="btn btn-green" style="width:100%" data-act="saveManualFood">＋ Add to my foods</button>
      </div>
    </div>`;
  $('#modal').classList.add('open');
}

function saveManualFood() {
  const name = $('#man-name').value.trim();
  if (!name) { toast('Give it a name first'); return; }
  const spice = parseInt($('#man-spice').value);
  const id = 'u_m_' + slug(name) + '_' + Date.now().toString(36);
  const part = {
    name, emoji: '🍲', grad: IMPORT_GRADS[name.length % IMPORT_GRADS.length],
    cuisine: $('#man-cuisine').value, type: 'dish',
    meals: $('#man-meals').value.split(','),
    kid: parseInt($('#man-kid').value), spice, mins: 45, kcal: 500, protein: 25, health: 3,
    allergens: [], desc: 'A family recipe you taught NaijaPlate.',
    ing: [], steps: ['Cook it the way your family knows and loves.'], custom: true,
  };
  customParts[id] = part; PARTS[id] = part; myFoods[id] = true;
  saveAll(); closeModal();
  renderMyFoods(); renderRecipes(); renderYou();
  toast(`${name} added — it can be planned right away ✍️`);
}

function removeCustomPart(id) {
  if (!customParts[id]) return;
  const name = PARTS[id]?.name || id;
  delete customParts[id]; delete PARTS[id]; delete myFoods[id];
  delete prefs.like[id]; delete prefs.dislike[id]; delete prefs.kidFav[id]; delete prefs.adultFav[id];
  userCombos = userCombos.filter(c => mealOf(c) && !c.startsWith(id));
  for (const k in comboCache) if (k.split('+')[0] === id) delete comboCache[k];
  for (const wk in plans) for (const sk in plans[wk]) {
    const s = plans[wk][sk];
    if ([s.f, s.a, s.k].filter(Boolean).some(c => String(c).split('+')[0] === id)) delete plans[wk][sk];
  }
  saveAll();
  renderMyFoods(); mfRefocus(); renderRecipes(); renderPlanner(); renderShopping(); renderYou();
  toast(`${name} removed from your database`);
}

/* ---------- community food packs (share via WhatsApp / notes) ---------- */
function openPacks() {
  const nParts = Object.keys(customParts).length;
  $('#modal-content').innerHTML = `
    <div class="m-body" style="padding-top:20px;position:relative">
      <button class="m-close" data-act="closeModal">✕</button>
      <h3>📦 Food packs</h3>
      <p class="muted" style="margin:4px 0 12px">Grow the database together: export your researched &amp; taught foods and your own combos as a pack, share it with family and friends, and import theirs.</p>
      <div class="card">
        <div class="sl" style="font-weight:700;font-size:.86rem">Your pack</div>
        <div class="muted" style="margin:2px 0 10px">${nParts} custom food${nParts === 1 ? '' : 's'} · ${userCombos.length} combo${userCombos.length === 1 ? '' : 's'} · ${Object.keys(customIngredients).length} new ingredient${Object.keys(customIngredients).length === 1 ? '' : 's'}</div>
        <button class="btn btn-green" style="width:100%" data-act="exportPack">📋 Copy my food pack</button>
      </div>
      <div class="card">
        <div class="sl" style="font-weight:700;font-size:.86rem">Import a pack</div>
        <textarea id="pack-in" placeholder="Paste a NaijaPlate food pack here…"
          style="width:100%;font:inherit;font-size:.78rem;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:#fff;min-height:90px;margin:8px 0"></textarea>
        <button class="btn btn-primary" style="width:100%" data-act="importPack">⬇ Import pack</button>
      </div>
    </div>`;
  $('#modal').classList.add('open');
}

function exportPack() {
  const pack = JSON.stringify({ naijaplate_pack: 1, parts: customParts, ingredients: customIngredients, combos: userCombos });
  const ok = () => toast('Pack copied — paste it to family & friends 📦');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(pack).then(ok, () => fallbackCopy(pack, ok));
  else fallbackCopy(pack, ok);
}

function importPack() {
  let pack;
  try { pack = JSON.parse($('#pack-in').value); } catch { toast('That doesn\'t look like a food pack'); return; }
  if (!pack || pack.naijaplate_pack !== 1) { toast('That doesn\'t look like a food pack'); return; }
  let nP = 0, nC = 0;
  for (const [k, v] of Object.entries(pack.ingredients || {})) {
    if (!PRICEBOOK[k] && v && v.name) { customIngredients[k] = v; PRICEBOOK[k] = v; }
  }
  for (const [id, p] of Object.entries(pack.parts || {})) {
    if (!PARTS[id] && p && p.name && p.type) {
      p.custom = true;
      customParts[id] = p; PARTS[id] = p; myFoods[id] = true; nP++;
    }
  }
  for (const c of pack.combos || []) {
    if (typeof c === 'string' && mealOf(c) && !userCombos.includes(c)) { userCombos.push(c); nC++; }
  }
  saveAll(); closeModal();
  renderRecipes(); renderYou();
  toast(nP || nC ? `Imported ${nP} food${nP === 1 ? '' : 's'} + ${nC} combo${nC === 1 ? '' : 's'} 🎉` : 'Nothing new in that pack');
}

function setPoolMode(v) { settings.poolMode = v; saveAll(); toast(v === 'strict' ? 'Plans now come from your list only' : 'Your list gets priority, everything stays available'); }

function openMyFoods() { myFoodsQuery = ''; renderMyFoods(); $('#myfoods').classList.add('open'); }
function closeMyFoods() { $('#myfoods').classList.remove('open'); renderYou(); }

/* smart search: matches name, cuisine, type, meal and description */
function mfMatch(id, p, q) {
  if (!q) return true;
  const hay = [
    p.name, CUISINE_NAMES[p.cuisine], p.type,
    (p.meals || []).map(m => MEAL_NAMES[m]).join(' '),
    p.desc || '', BATCH[id] ? 'batch leftovers' : '', p.kid >= 2 ? 'kids kid-friendly' : '',
  ].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

function renderMyFoods() {
  const q = myFoodsQuery;
  const mine = Object.keys(myFoods).filter(id => myFoods[id] && PARTS[id]);
  const results = Object.entries(PARTS).filter(([id, p]) => mfMatch(id, p, q))
    .sort((a, b) => (myFoods[b[0]] ? 1 : 0) - (myFoods[a[0]] ? 1 : 0) || a[1].name.localeCompare(b[1].name));
  $('#myfoods').innerHTML = `<div class="ob-wrap" style="text-align:left">
    <div class="week-nav" style="margin-bottom:14px">
      <button class="wn-btn" data-act="closeMyFoods">‹</button>
      <div class="wn-label"><b>🍲 My food list</b><span>${mine.length ? mine.length + ' foods I plan around' : 'foods you want me to plan with'}</span></div>
      <span style="width:38px"></span>
    </div>
    <div class="card">
      <div class="setting-row" style="padding-top:0"><div><div class="sl">How to use the list</div><div class="sd">Strict = plan only from my list (falls back if a meal has too few options)</div></div>
        <select class="inp" data-chg="setPoolMode">
          <option value="boost" ${settings.poolMode === 'boost' ? 'selected' : ''}>Prefer my list</option>
          <option value="strict" ${settings.poolMode === 'strict' ? 'selected' : ''}>Only my list</option>
        </select></div>
    </div>
    <input class="inp" id="mf-search" placeholder="🔍 Smart search — try 'kids breakfast', 'nigerian batch', 'soup'…" value="${q.replace(/"/g, '&quot;')}" data-inp="searchMyFoods"
      style="width:100%;font:inherit;font-size:.9rem;padding:11px 14px;border:1.5px solid var(--line);border-radius:14px;margin:2px 0 12px;background:#fff">
    <div class="pick-list">
      ${results.map(([id, p]) => `
        <div class="pick" style="cursor:default">
          <div class="thumb" style="${thumbStyle(p)}" data-act="openRecipe|${p.type === 'main' ? defaultCombo(id) : id}">${emo(p)}</div>
          <div class="pi" data-act="openRecipe|${p.type === 'main' ? defaultCombo(id) : id}" style="cursor:pointer">
            <div class="rname">${p.name}</div>
            <div class="rsub">${CUISINE_NAMES[p.cuisine]}${p.type === 'side' ? ' · side' : ''}${BATCH[id] ? ' · ♻' : ''}${p.kid >= 2 ? ' · 👧' : ''}${p.custom ? ' · 🌐 yours' : ''}</div>
          </div>
          <button class="btn btn-sm ${myFoods[id] ? 'btn-green' : 'btn-ghost'}" data-act="toggleMyFood|${id}">${myFoods[id] ? '✓ On list' : '＋ Add'}</button>
          ${p.custom ? `<button class="btn btn-ghost btn-sm" style="color:#a52222" data-act="removeCustomPart|${id}">✕</button>` : ''}
        </div>`).join('') || (q ? '' : '<p class="muted">Start typing to search your foods and the online food database.</p>')}
    </div>
    ${q.trim().length >= 3 ? `
      <h2 class="section">🌐 From the free food database</h2>
      ${mfOnline.state === 'loading' ? '<p class="muted">Searching TheMealDB (community food database)…</p>' : ''}
      ${mfOnline.state === 'error' ? '<p class="muted">Couldn\'t reach the food database — check your connection, or teach it to me below.</p>' : ''}
      ${mfOnline.state === 'done' && !mfOnline.results.length ? '<p class="muted">The food database doesn\'t know this one — teach it to me below and it becomes part of your database.</p>' : ''}
      <div class="pick-list">
        ${(mfOnline.results || []).map((meal, i) => {
          const imported = !!PARTS['u_' + meal.idMeal];
          return `<div class="pick" style="cursor:default">
            <div class="thumb" style="background:url('${meal.strMealThumb}/preview') center/cover"></div>
            <div class="pi"><div class="rname">${meal.strMeal}</div>
              <div class="rsub">${meal.strArea || 'World'} · ${meal.strCategory || 'dish'} · full recipe + photo</div></div>
            <button class="btn btn-sm ${imported ? 'btn-green' : 'btn-ghost'}" ${imported ? '' : `data-act="importMeal|${i}"`}>${imported ? '✓ Imported' : '⬇ Import'}</button>
          </div>`;
        }).join('')}
      </div>
      <button class="btn btn-ghost" style="width:100%;margin:6px 0 20px" data-act="openManualFood|${q.replace(/\|/g, ' ').replace(/"/g, '&quot;')}">✍️ Not there? Teach me "${q.replace(/</g, '&lt;')}" myself</button>
    ` : `<button class="btn btn-ghost" style="width:100%;margin:10px 0 20px" data-act="openManualFood|">✍️ Teach me a food of my own</button>`}
  </div>`;
}

/* ---------- you / settings ---------- */
function renderYou() {
  const aff = cuisineAffinity();
  const total = aff.ng + aff.uk + aff.fusion;
  const named = ids => ids.map(id => PARTS[id]).filter(Boolean);
  const loved = Object.keys(prefs.like).filter(id => prefs.like[id] && PARTS[id]);
  const kidF = Object.keys(prefs.kidFav).filter(id => prefs.kidFav[id] && !prefs.like[id] && PARTS[id]);
  const adultF = Object.keys(prefs.adultFav).filter(id => prefs.adultFav[id] && !prefs.like[id] && PARTS[id]);
  const noped = Object.keys(prefs.dislike).filter(id => prefs.dislike[id] && PARTS[id]);
  const rated = Object.keys(prefs.rating).length + loved.length + noped.length + kidF.length + adultF.length;
  $('#taste-content').innerHTML = `
    <div class="card">
      <h2 class="section" style="margin-top:0">Your taste profile</h2>
      <p class="muted">${rated ? `Learned from ${rated} reaction${rated > 1 ? 's' : ''} — every ❤️, 🧒, 🧑 and ⭐ sharpens the plan.` : 'React to foods and NaijaPlate learns what your family loves.'}</p>
      <div class="taste-bars">
        ${['ng', 'uk', 'fusion'].map(c => `
          <div class="tb"><div class="tl"><span>${CUISINE_NAMES[c]}</span><span>${Math.round(aff[c] / total * 100)}%</span></div>
          <div class="bar"><i style="width:${aff[c] / total * 100}%;background:${c === 'ng' ? 'var(--green)' : c === 'uk' ? '#1f4e8c' : 'var(--orange)'}"></i></div></div>`).join('')}
      </div>
      ${loved.length ? `<div class="muted" style="margin-top:8px">Family favourites</div><div class="chiplist">${named(loved).map(p => `<span class="chip love">${p.emoji} ${p.name}</span>`).join('')}</div>` : ''}
      ${kidF.length ? `<div class="muted" style="margin-top:8px">Kids love</div><div class="chiplist">${named(kidF).map(p => `<span class="chip love">🧒 ${p.name}</span>`).join('')}</div>` : ''}
      ${adultF.length ? `<div class="muted" style="margin-top:8px">Adults love</div><div class="chiplist">${named(adultF).map(p => `<span class="chip love">🧑 ${p.name}</span>`).join('')}</div>` : ''}
      ${noped.length ? `<div class="muted" style="margin-top:8px">Off the menu</div><div class="chiplist">${named(noped).map(p => `<span class="chip nope">${p.name}</span>`).join('')}</div>` : ''}
      ${userCombos.length ? `<div class="muted" style="margin-top:8px">Your own combos</div><div class="chiplist">${userCombos.map(c => { const m = mealOf(c); return m ? `<span class="chip love">✨ ${m.name}</span>` : ''; }).join('')}</div>` : ''}
      <div class="week-toolbar" style="margin-top:12px">
        <button class="btn btn-ghost btn-sm" data-act="startOnboarding">🔄 Retake the quiz</button>
        <button class="btn btn-ghost btn-sm" data-act="openInspire||">✨ Inspire me</button>
      </div>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">🍲 My food list</h2>
      <p class="muted">${Object.keys(myFoods).filter(k => myFoods[k]).length
        ? `${Object.keys(myFoods).filter(k => myFoods[k]).length} foods on your list — ${settings.poolMode === 'strict' ? 'plans come from these only' : 'these get priority in every plan'}.`
        : 'Curate the foods you want plans built around — smart search the whole catalogue and add your staples.'}</p>
      ${Object.keys(myFoods).filter(k => myFoods[k] && PARTS[k]).length ? `<div class="chiplist" style="margin-bottom:10px">${Object.keys(myFoods).filter(k => myFoods[k] && PARTS[k]).slice(0, 12).map(id => `<span class="chip love">${PARTS[id].emoji} ${PARTS[id].name}</span>`).join('')}</div>` : ''}
      <button class="btn btn-primary btn-sm" data-act="openMyFoods">Manage my list →</button>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">📦 Community &amp; growth</h2>
      <p class="muted">The database grows with you: search My Food List and anything missing is looked up in the free online food database (recipe, photo, ingredients auto-imported) — or teach it your own family recipes. Then share everything as a food pack.</p>
      <button class="btn btn-ghost btn-sm" data-act="openPacks">📦 Share / import food packs</button>
    </div>`;

  $('#settings-content').innerHTML = `
    <div class="card">
      <h2 class="section" style="margin-top:0">Household</h2>
      <div class="setting-row"><div><div class="sl">Adults</div></div>
        <div class="stepper"><button data-act="bump|adults|-1">−</button><span class="val">${settings.adults}</span><button data-act="bump|adults|1">＋</button></div></div>
      <div class="setting-row"><div><div class="sl">Kids</div></div>
        <div class="stepper"><button data-act="bump|kids|-1">−</button><span class="val">${settings.kids}</span><button data-act="bump|kids|1">＋</button></div></div>
      <div class="setting-row"><div><div class="sl">Kids' spice tolerance</div></div>
        <select class="inp" data-chg="setSetting|kidSpice">
          <option value="0" ${settings.kidSpice === 0 ? 'selected' : ''}>None 🚫🌶</option>
          <option value="1" ${settings.kidSpice === 1 ? 'selected' : ''}>Mild 🌶</option>
          <option value="2" ${settings.kidSpice === 2 ? 'selected' : ''}>Medium 🌶🌶</option>
          <option value="3" ${settings.kidSpice === 3 ? 'selected' : ''}>Naija-strong 🌶🌶🌶</option>
        </select></div>
      <div class="setting-row"><div><div class="sl">Cooking style</div><div class="sd">Batch &amp; reuse = big pots, fewer cooks, ♻ reheats</div></div>
        <select class="inp" data-chg="setSetting|cookStyle">
          <option value="daily" ${settings.cookStyle === 'daily' ? 'selected' : ''}>Fresh every day</option>
          <option value="batch" ${settings.cookStyle === 'batch' ? 'selected' : ''}>Batch &amp; reuse</option>
          <option value="minimal" ${settings.cookStyle === 'minimal' ? 'selected' : ''}>Minimal cooking</option>
        </select></div>
      <div class="setting-row"><div><div class="sl">Meal planning style</div><div class="sd">Auto = separate kids' meal when adults' pick is too spicy</div></div>
        <select class="inp" data-chg="setSetting|splitMode">
          <option value="auto" ${settings.splitMode === 'auto' ? 'selected' : ''}>Auto split</option>
          <option value="family" ${settings.splitMode === 'family' ? 'selected' : ''}>One family meal</option>
        </select></div>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">Which meals to plan</h2>
      ${MEALS.map(mt => `
        <div class="cov-row">
          <b>${MEAL_ICONS[mt]} ${MEAL_NAMES[mt]}</b>
          <div class="cov-grid">
            <div><label>Adults</label>${covSelect(mt, 'adults')}</div>
            <div><label>Kids</label>${covSelect(mt, 'kids')}</div>
          </div>
        </div>`).join('')}
      <p class="muted" style="font-size:.72rem;margin-top:6px">Changes apply when you next tap ✨ Plan this week.</p>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">Avoid allergens</h2>
      <div class="chiplist">${['egg', 'milk', 'gluten', 'fish', 'peanut'].map(a =>
        `<span class="chip ${settings.excludeAllergens.includes(a) ? 'nope' : ''}" style="cursor:pointer" data-act="toggleAllergen|${a}">${settings.excludeAllergens.includes(a) ? '🚫 ' : ''}${a}</span>`).join('')}</div>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">Data</h2>
      <div class="setting-row"><div><div class="sl">Reset learned preferences</div></div><button class="btn btn-ghost btn-sm" data-act="resetPrefs">Reset</button></div>
      <div class="setting-row"><div><div class="sl">Reset price corrections</div></div><button class="btn btn-ghost btn-sm" data-act="resetPrices">Reset</button></div>
    </div>`;
}

function bump(k, d) { settings[k] = Math.max(k === 'adults' ? 1 : 0, Math.min(8, settings[k] + d)); saveAll(); renderYou(); renderShopping(); }
function setSetting(k, v) {
  settings[k] = v; saveAll(); renderYou();
  if (k === 'cookStyle') toast('Tap ✨ Plan this week to re-plan with the new style');
}
function toggleAllergen(a) {
  const i = settings.excludeAllergens.indexOf(a);
  if (i >= 0) settings.excludeAllergens.splice(i, 1); else settings.excludeAllergens.push(a);
  saveAll(); renderYou(); renderRecipes();
}
function resetPrefs() { prefs = { like: {}, dislike: {}, rating: {}, cooked: {}, kidFav: {}, adultFav: {}, accept: {}, reject: {} }; userCombos = []; saveAll(); renderYou(); renderRecipes(); toast('Preferences reset'); }
function resetPrices() { priceOverrides = {}; saveAll(); renderShopping(); toast('Prices back to defaults'); }

/* ---------- tabs & misc ---------- */
function switchTab(name) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  $$('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo({ top: 0 });
}
function setPlanView(v) {
  planView = v;
  $$('.view-toggle button[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  renderPlanner();
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- action registry ---------- */
const ACTIONS = {
  switchTab, setPlanView, generateWeek, weekNav, openRecipe, openPicker, assignSlot, clearSlot,
  closeModal, rate, toggleLike, toggleDislike, toggleKidFav, toggleAdultFav, quickAdd,
  swapSide, moreSides, swapProt, moreProts, tagMeal, tagWho, surpriseSlot, openInspire, keepSlot, removeSlot,
  toggleMyFood, openMyFoods, closeMyFoods, searchMyFoods, setPoolMode,
  importMeal, openManualFood, saveManualFood, removeCustomPart, openPacks, exportPack, importPack,
  toggleCheck, togglePriceEdit, setPrice, setCustomPrice, copyList, openAddModal, addExtra,
  addCustom, bumpItem, removeItem, bump, setSetting, setCoverage, toggleAllergen, resetPrefs, resetPrices,
  setFilter, searchAdd, renderRecipes, setShopScope,
  startOnboarding, obBump, obStyle, obStep, obChoice, finishOnboarding,
};

/* ---------- boot ---------- */
try {
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  plan = ensureWeek(weekOffset);
  renderPlanner(); renderShopping(); renderRecipes(); renderYou();
  if (!store.load('onboarded', false)) startOnboarding();
} catch (err) {
  document.body.insertAdjacentHTML('beforeend',
    `<div style="position:fixed;inset:auto 12px 100px 12px;background:#a52222;color:#fff;padding:12px 16px;border-radius:14px;font-size:.85rem;z-index:999">Something went wrong loading NaijaPlate: ${err.message}. Try a hard refresh (pull down / Ctrl+Shift+R).</div>`);
  console.error(err);
}
