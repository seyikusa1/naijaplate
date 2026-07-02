# 🍚 NaijaPlate

Smart Nigerian–British family meal planner with batch-cooking optimisation and
supermarket basket comparison. Pure static web app — no build step, no backend,
no account. All data stays in your browser (localStorage).

## Run it

```
python -m http.server 8734 -d .
```

Open http://localhost:8734 — or on your phone, http://<your-pc-ip>:8734 (same
Wi-Fi), then **Add to Home Screen** for an app-like feel.

## What it does

- **Component food model** — soups, stews, swallows and sides are independent
  items you rate separately (egusi soup, eba, pounded yam, dodo…). The planner
  combines what you love into logical plates via recommended pairings; pair
  anything unusual yourself (egusi + chips, why not) and it's saved as *your
  combo* for future plans. Every meal card has tap-to-swap "serve with" chips.
- **Onboarding** — household size, kids' spice tolerance, cooking style,
  **meal coverage** (per meal, adults vs kids: every day / weekdays /
  weekends / don't plan — school dinners and work lunches respected in both
  the plan and the shopping list), then a component taste quiz.
  Retake any time from You ▸ taste profile.
- **My food list** (You ▸ Manage my list) — smart-search the whole catalogue
  ("kids breakfast", "nigerian batch", "soup") and curate the foods plans are
  built around. Two modes: *Prefer my list* (priority boost) or *Only my list*
  (strict, with automatic fallback if a meal type runs thin).
- **A database that grows** — every My Food List search also queries the free
  community food database ([TheMealDB](https://www.themealdb.com)) live; one
  tap imports a dish with photo, instructions and ingredients auto-mapped onto
  the price book (unknown ingredients become new priceable entries). Not there
  either? *Teach me it* adds your own family recipe. Share everything as
  **food packs** (You ▸ Community) — copy/paste JSON packs via WhatsApp and
  import packs from family and friends.
- **Plan** — navigate up to **8 weeks ahead** (‹ ›); each week generates on
  demand. Slots split automatically when the adults' pick is too spicy for the
  kids — including leftovers (adults reheat the egusi, kids get a fresh
  kid-friendly meal). Family / Adults / Kids views.
- **Edit one meal, not the week** — tap any planned meal for 👍 Keep /
  ↻ Change / 🗑 Remove. The engine learns from every edit: kept meals score
  up, swapped-away or removed meals score down.
- **Inspire** — cuisine-diverse (Nigerian + British + fusion) suggestions of
  things you've never rated, available globally and per meal slot ("Put it
  here" drops the pick straight into the slot you're editing).
- **Batch cooking** — pick a cooking style:
  - *Fresh every day* — no leftovers
  - *Batch & reuse* — big pots 2–3× a week, ♻ reheat slots between (stew
    Sunday, something else Monday, stew Tuesday — the Naija rhythm)
  - *Minimal cooking* — every pot stretched as far as it keeps
  The planner shows a cooking summary (cooks / reheats / hands-on hours /
  time saved) and batch recommendations ("Mon dinner: big pot of Efo Riro →
  ♻ Tue lunch, Wed lunch"). Shopping quantities scale to pot size.
- **Learning** — ❤️ family, 🧒 kids' favourite, 🧑 adults' favourite, 🙅 never,
  ⭐ ratings. Cuisine affinity + variety penalty reshape future weeks.
- **Shop** — three scopes, each with full Aldi/Tesco/Sainsbury's/Asda
  comparison (best one-stop, ranked totals, two-store smart split):
  - 🧺 **Week top-up** — perishables & fresh food for the selected week
  - 📦 **Monthly bulk** — 4-week forecast of long-life staples (rice, tins,
    frozen, freezable meat, world-food staples) — one big trip a month
  - 🛒 **Full week** — everything in one basket
  Plus standalone items: search the catalogue or add your own with optional
  per-store prices (they join the comparison).

## Price data

`data.js` ships with typical shelf prices (editable in-app — tap ✎, corrections
are remembered). No UK supermarket exposes a public pricing API; cross-check
free via [Trolley.co.uk](https://www.trolley.co.uk).

## Files

- `index.html` — shell + tabs
- `styles.css` — mobile-first design
- `data.js` — price book (4 stores × ~60 items), 30 recipes, batch metadata,
  bulk classification, onboarding dish list
- `app.js` — onboarding, multi-week batch-aware planner, learning engine,
  basket comparison (all events delegated — no inline handlers, CSP-safe)
