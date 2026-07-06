# NaijaPlate — guide for AI agents & contributors

Read this before changing anything. It's short and will save you from the
mistakes previous contributors already made.

## What this is

A **zero-build, zero-backend** mobile-first web app: Nigerian–British family
meal planning with batch-cook optimisation and UK supermarket basket
comparison. Three files of vanilla JS/CSS/HTML served statically. All state
lives in `localStorage`. There is deliberately **no framework, no bundler, no
npm** — keep it that way unless the maintainer asks.

Run it: `python -m http.server 8734 -d .` then open http://localhost:8734.

## File map

| File | Role |
|---|---|
| `index.html` | Static shell: tabs, overlay containers (`#modal`, `#onboard`, `#myfoods`). Bump the `?v=N` cache-busters on **every** css/js change. |
| `data.js` | The built-in database: `PRICEBOOK` (ingredient → 4 store prices), `PARTS` (foods), `PAIRS` (main→side pairings), `BATCH` (pot sizes), `BULK_KEYS`, `ONBOARD_GROUPS`. |
| `app.js` | Everything else: state, planner engine, learning, shopping comparison, onboarding, My Foods, online research, food packs. |
| `styles.css` | Mobile-first. CSS vars in `:root`. |

## Non-negotiable conventions

1. **No inline event handlers.** Embedded viewers enforce CSP that silently
   kills `onclick=`. All interactivity uses delegated events:
   `data-act="fnName|arg1|arg2"` (click), `data-chg` (change, value appended
   as last arg), `data-inp` (input). Every handler must be registered in the
   `ACTIONS` object near the bottom of `app.js`. Numeric-looking args are
   auto-cast to numbers.
2. **The component food model.** A food is a *part*: `type: 'main'` (takes a
   side via `PAIRS` and/or a protein via `PROTEIN_PAIRS`), `'protein'`
   (grilled chicken, fried fish…), `'side'` (`solo: true` = can stand alone),
   or `'dish'` (complete plate). A planned meal is a combo id like
   `'jollof_rice+fried_fish+dodo'` (main first; extra parts classified by
   type, any order) resolved by `mealOf(cid)` — never index `PARTS` with a
   combo id directly; build ids with `makeCid(main, protein, side)`. Do NOT
   bake proteins into a main's ingredients — keep them swappable parts.
   User tag overrides live in `foodTags` (localStorage key `tags`, synced):
   per-part meal times (`meals: ['b','l','d']`, empty = never auto-plan),
   audience (`who: 'all'|'adults'|'kids'`) and frequency (`freq: 1–5`,
   3 = neutral, affects both selection weight and within-week repetition
   tolerance) — `effMealsOf()`/`whoOf()`/`freqOf()` must be respected by any
   candidate generation or scoring you touch. Onboarding is list-first:
   step 3 builds `myFoods` with inline `tagControlsHtml()` controls; the
   same controls appear in My Food List for ongoing management.
3. **Plan slots** are `{f: cid}` (family), `{a: cid, k: cid}` (split),
   `{a: cid}` / `{k: cid}` (audience-only, from meal coverage), optionally
   `lo: 'sun-d'` (leftover of that slot's batch). Plans are keyed by ISO
   Monday date in `plans` — use `weekKey(offset)`, never `toISOString()`
   (BST timezone bug, already fixed once).
4. **Learning is additive signals in `prefs`**: `like/dislike/kidFav/adultFav/
   rating/accept/reject`, all keyed by *part id*. Scoring lives in
   `scorePart()` + `comboScore()`. Don't hard-filter foods except dislikes
   and allergens — bias, don't ban.
5. **Prices**: `priceOf(key, storeId)` merges `priceOverrides` (user
   corrections) over `PRICEBOOK`. `null` = store doesn't stock it — the
   comparison engine treats gaps honestly (top-up pricing). Never invent a
   paid price API; the free path is the in-app editor + Trolley.co.uk.
6. **User-grown database**: `customParts` / `customIngredients` are merged
   into `PARTS` / `PRICEBOOK` at boot. Online research uses TheMealDB
   (`themealdb.com/api/json/v1/1/search.php?s=`) — free, no key. Custom part
   ids start `u_`, discovered ingredients `ci_`.
7. **Windows dev environment**: never rewrite files with PowerShell
   `Get-Content/Set-Content` — it corrupts UTF-8 emoji. Use proper editor
   tooling.

## Verifying changes (do this, every time)

1. Serve, open, check the console for errors.
2. Exercise via real bubbling events (`el.dispatchEvent(new MouseEvent('click',
   {bubbles:true}))`) — that's the same path as a user tap through the
   delegation layer.
3. Walk the affected flow end-to-end: onboarding → plan → edit a slot →
   shop scopes (week/bulk/all) → price comparison sanity.
4. Mobile viewport (375px). Nothing may overflow; the bottom tab bar must
   stay clear (`body` has `padding-bottom` for it).

## Easy contribution ideas

- More `PARTS` (amala, semo, gbegiri, banga, fisherman's pie…) + `PAIRS`.
- More `PRICEBOOK` items with realistic UK prices (all four stores).
- Pantry tracking so monthly-bulk doesn't re-suggest owned staples.
- Better measure parsing on TheMealDB import (`strMeasure` → pack fractions).
- i18n (Yoruba, Igbo, Hausa strings).
