/* ============================================================
   NaijaPlate — data: UK supermarket price book + component food model
   Food is modelled as independent PARTS (mains, sides, standalone
   dishes). The planner combines mains + sides via PAIRS. Prices are
   typical July-2026 shelf prices (editable in-app). null = not stocked.
   ============================================================ */

const STORES = [
  { id: 'aldi',  name: 'Aldi',        color: '#00549f' },
  { id: 'tesco', name: 'Tesco',       color: '#00539f' },
  { id: 'sains', name: "Sainsbury's", color: '#f06c00' },
  { id: 'asda',  name: 'Asda',        color: '#68a51c' },
];

const PRICEBOOK = {
  rice:        { name: 'Long-grain rice',       cat: 'Store cupboard', pack: '1kg',    aldi: 0.95, tesco: 1.10, sains: 1.15, asda: 1.05 },
  basmati:     { name: 'Basmati rice',          cat: 'Store cupboard', pack: '1kg',    aldi: 1.65, tesco: 1.85, sains: 1.90, asda: 1.75 },
  spaghetti:   { name: 'Spaghetti',             cat: 'Store cupboard', pack: '500g',   aldi: 0.28, tesco: 0.41, sains: 0.45, asda: 0.38 },
  pasta:       { name: 'Penne pasta',           cat: 'Store cupboard', pack: '500g',   aldi: 0.28, tesco: 0.41, sains: 0.45, asda: 0.38 },
  flour:       { name: 'Plain flour',           cat: 'Store cupboard', pack: '1.5kg',  aldi: 0.75, tesco: 0.90, sains: 0.95, asda: 0.85 },
  oats:        { name: 'Porridge oats',         cat: 'Store cupboard', pack: '1kg',    aldi: 0.90, tesco: 1.10, sains: 1.20, asda: 1.00 },
  weetabix:    { name: 'Wheat biscuits cereal',  cat: 'Store cupboard', pack: '24pk',  aldi: 2.20, tesco: 2.50, sains: 2.60, asda: 2.35 },
  bread:       { name: 'Bread loaf',            cat: 'Bakery',         pack: '800g',   aldi: 0.45, tesco: 0.75, sains: 0.80, asda: 0.74 },
  beans_tin:   { name: 'Baked beans',           cat: 'Store cupboard', pack: '415g tin', aldi: 0.30, tesco: 0.45, sains: 0.50, asda: 0.40 },
  plum_tom:    { name: 'Plum tomatoes',         cat: 'Store cupboard', pack: '400g tin', aldi: 0.35, tesco: 0.45, sains: 0.47, asda: 0.40 },
  puree:       { name: 'Tomato purée',          cat: 'Store cupboard', pack: '200g',   aldi: 0.45, tesco: 0.60, sains: 0.65, asda: 0.55 },
  veg_oil:     { name: 'Vegetable oil',         cat: 'Store cupboard', pack: '1L',     aldi: 1.30, tesco: 1.50, sains: 1.60, asda: 1.40 },
  palm_oil:    { name: 'Palm oil',              cat: 'World foods',    pack: '500ml',  aldi: null, tesco: 2.80, sains: 3.00, asda: 2.50 },
  stock_cubes: { name: 'Stock cubes (Maggi-style)', cat: 'Store cupboard', pack: '12pk', aldi: 0.90, tesco: 1.40, sains: 1.50, asda: 1.20 },
  curry_pwd:   { name: 'Curry powder',          cat: 'Store cupboard', pack: '80g',    aldi: 0.60, tesco: 0.85, sains: 0.90, asda: 0.80 },
  thyme:       { name: 'Dried thyme',           cat: 'Store cupboard', pack: 'jar',    aldi: 0.50, tesco: 0.70, sains: 0.75, asda: 0.65 },
  suya_spice:  { name: 'Suya spice (yaji)',     cat: 'World foods',    pack: '100g',   aldi: null, tesco: 2.75, sains: null, asda: 2.50 },
  peanut_b:    { name: 'Peanut butter',         cat: 'Store cupboard', pack: '340g',   aldi: 1.10, tesco: 1.40, sains: 1.50, asda: 1.30 },
  gravy:       { name: 'Gravy granules',        cat: 'Store cupboard', pack: '200g',   aldi: 0.55, tesco: 0.80, sains: 0.85, asda: 0.70 },
  honey:       { name: 'Honey',                 cat: 'Store cupboard', pack: '340g',   aldi: 1.35, tesco: 1.50, sains: 1.60, asda: 1.40 },
  coconut_mlk: { name: 'Coconut milk',          cat: 'Store cupboard', pack: '400ml tin', aldi: 0.85, tesco: 1.00, sains: 1.10, asda: 0.95 },
  tuna:        { name: 'Tuna chunks',           cat: 'Store cupboard', pack: '4x145g', aldi: 2.60, tesco: 3.00, sains: 3.20, asda: 2.80 },
  sweetcorn:   { name: 'Sweetcorn',             cat: 'Store cupboard', pack: '325g tin', aldi: 0.45, tesco: 0.60, sains: 0.65, asda: 0.55 },

  yam:         { name: 'Puna yam',              cat: 'World foods',    pack: 'per kg', aldi: null, tesco: 2.90, sains: 3.10, asda: 2.50 },
  plantain:    { name: 'Plantain',              cat: 'World foods',    pack: 'each',   aldi: null, tesco: 0.75, sains: 0.80, asda: 0.60 },
  garri:       { name: 'Garri',                 cat: 'World foods',    pack: '1.5kg',  aldi: null, tesco: 3.50, sains: null, asda: 3.00 },
  pyam_flour:  { name: 'Pounded yam flour',     cat: 'World foods',    pack: '1.5kg',  aldi: null, tesco: 4.50, sains: 4.75, asda: 4.00 },
  egusi:       { name: 'Egusi (melon seed)',    cat: 'World foods',    pack: '500g',   aldi: null, tesco: 4.00, sains: 4.25, asda: 3.75 },
  crayfish:    { name: 'Ground crayfish',       cat: 'World foods',    pack: '100g',   aldi: null, tesco: 2.50, sains: null, asda: 2.20 },
  dried_fish:  { name: 'Smoked/dried fish',     cat: 'World foods',    pack: '200g',   aldi: null, tesco: 3.80, sains: null, asda: 3.50 },
  be_beans:    { name: 'Black-eyed beans',      cat: 'World foods',    pack: '500g',   aldi: null, tesco: 1.60, sains: 1.70, asda: 1.40 },
  scotch_b:    { name: 'Scotch bonnet peppers', cat: 'Fresh produce',  pack: '100g',   aldi: null, tesco: 0.90, sains: 0.95, asda: 0.80 },
  okra:        { name: 'Okra',                  cat: 'Fresh produce',  pack: '300g',   aldi: null, tesco: 1.80, sains: 2.00, asda: 1.60 },
  tilapia:     { name: 'Frozen tilapia',        cat: 'World foods',    pack: '1kg',    aldi: null, tesco: 4.50, sains: null, asda: 4.00 },

  chicken:     { name: 'Whole chicken',         cat: 'Meat & fish',    pack: '~1.5kg', aldi: 3.50, tesco: 3.90, sains: 4.20, asda: 3.70 },
  thighs:      { name: 'Chicken thighs',        cat: 'Meat & fish',    pack: '1kg',    aldi: 2.30, tesco: 2.60, sains: 2.75, asda: 2.50 },
  chick_brst:  { name: 'Chicken breast',        cat: 'Meat & fish',    pack: '600g',   aldi: 3.30, tesco: 3.70, sains: 3.90, asda: 3.50 },
  mince:       { name: 'Beef mince',            cat: 'Meat & fish',    pack: '500g',   aldi: 2.50, tesco: 2.80, sains: 3.00, asda: 2.70 },
  stew_beef:   { name: 'Diced stewing beef',    cat: 'Meat & fish',    pack: '500g',   aldi: 3.40, tesco: 3.80, sains: 4.00, asda: 3.60 },
  sausages:    { name: 'Pork sausages',         cat: 'Meat & fish',    pack: '8pk',    aldi: 1.80, tesco: 2.20, sains: 2.40, asda: 2.00 },
  turkey:      { name: 'Turkey wings/drumsticks', cat: 'Meat & fish',  pack: '1kg',    aldi: null, tesco: 3.50, sains: 3.60, asda: 3.20 },
  fish_fngr:   { name: 'Fish fingers',          cat: 'Frozen',         pack: '10pk',   aldi: 1.40, tesco: 1.75, sains: 1.90, asda: 1.60 },
  white_fish:  { name: 'White fish fillets',    cat: 'Frozen',         pack: '4pk',    aldi: 2.80, tesco: 3.20, sains: 3.50, asda: 3.00 },

  eggs:        { name: 'Eggs',                  cat: 'Dairy & eggs',   pack: '12pk',   aldi: 2.10, tesco: 2.40, sains: 2.50, asda: 2.25 },
  milk:        { name: 'Milk',                  cat: 'Dairy & eggs',   pack: '2L',     aldi: 1.20, tesco: 1.25, sains: 1.30, asda: 1.25 },
  butter:      { name: 'Butter',                cat: 'Dairy & eggs',   pack: '250g',   aldi: 1.70, tesco: 1.90, sains: 2.00, asda: 1.80 },
  cheese:      { name: 'Mature cheddar',        cat: 'Dairy & eggs',   pack: '400g',   aldi: 2.50, tesco: 2.90, sains: 3.10, asda: 2.70 },

  potatoes:    { name: 'White potatoes',        cat: 'Fresh produce',  pack: '2.5kg',  aldi: 1.30, tesco: 1.50, sains: 1.60, asda: 1.40 },
  sweet_pot:   { name: 'Sweet potatoes',        cat: 'Fresh produce',  pack: '1kg',    aldi: 0.90, tesco: 1.10, sains: 1.20, asda: 1.00 },
  onions:      { name: 'Onions',                cat: 'Fresh produce',  pack: '1kg',    aldi: 0.75, tesco: 0.85, sains: 0.95, asda: 0.80 },
  garlic:      { name: 'Garlic',                cat: 'Fresh produce',  pack: 'bulb',   aldi: 0.69, tesco: 0.79, sains: 0.80, asda: 0.75 },
  ginger:      { name: 'Fresh ginger',          cat: 'Fresh produce',  pack: '100g',   aldi: 0.50, tesco: 0.60, sains: 0.65, asda: 0.55 },
  tomatoes:    { name: 'Fresh tomatoes',        cat: 'Fresh produce',  pack: '6pk',    aldi: 0.85, tesco: 0.95, sains: 1.00, asda: 0.90 },
  peppers:     { name: 'Bell peppers',          cat: 'Fresh produce',  pack: '3pk',    aldi: 1.15, tesco: 1.65, sains: 1.70, asda: 1.50 },
  carrots:     { name: 'Carrots',               cat: 'Fresh produce',  pack: '1kg',    aldi: 0.40, tesco: 0.50, sains: 0.55, asda: 0.45 },
  broccoli:    { name: 'Broccoli',              cat: 'Fresh produce',  pack: 'head',   aldi: 0.45, tesco: 0.55, sains: 0.60, asda: 0.50 },
  bananas:     { name: 'Bananas',               cat: 'Fresh produce',  pack: '1kg',    aldi: 0.78, tesco: 0.85, sains: 0.90, asda: 0.80 },
  spinach:     { name: 'Spinach (frozen)',      cat: 'Frozen',         pack: '500g',   aldi: 1.00, tesco: 1.25, sains: 1.30, asda: 1.10 },
  peas:        { name: 'Garden peas (frozen)',  cat: 'Frozen',         pack: '1kg',    aldi: 0.95, tesco: 1.20, sains: 1.30, asda: 1.10 },
  mixed_veg:   { name: 'Mixed veg (frozen)',    cat: 'Frozen',         pack: '1kg',    aldi: 0.90, tesco: 1.10, sains: 1.20, asda: 1.00 },
  oven_chips:  { name: 'Oven chips',            cat: 'Frozen',         pack: '1.5kg',  aldi: 1.15, tesco: 1.50, sains: 1.60, asda: 1.35 },

  tortillas:   { name: 'Tortilla wraps',        cat: 'Bakery',         pack: '8pk',    aldi: 0.69, tesco: 0.90, sains: 0.95, asda: 0.85 },
  burger_buns: { name: 'Burger buns',           cat: 'Bakery',         pack: '6pk',    aldi: 0.49, tesco: 0.65, sains: 0.70, asda: 0.60 },
  naan:        { name: 'Naan breads',           cat: 'Bakery',         pack: '2pk',    aldi: 0.69, tesco: 0.90, sains: 0.95, asda: 0.85 },
  garlic_brd:  { name: 'Garlic baguette',       cat: 'Frozen',         pack: 'each',   aldi: 0.39, tesco: 0.55, sains: 0.60, asda: 0.50 },
  pizza_base:  { name: 'Pizza bases',           cat: 'Bakery',         pack: '2pk',    aldi: 0.79, tesco: 1.00, sains: 1.10, asda: 0.95 },
  lasagne_sh:  { name: 'Lasagne sheets',        cat: 'Store cupboard', pack: '500g',   aldi: 0.55, tesco: 0.75, sains: 0.80, asda: 0.70 },
  noodles:     { name: 'Egg noodles',           cat: 'Store cupboard', pack: '250g',   aldi: 0.65, tesco: 0.85, sains: 0.90, asda: 0.75 },
  soy_sauce:   { name: 'Soy sauce',             cat: 'Store cupboard', pack: '150ml',  aldi: 0.59, tesco: 0.85, sains: 0.90, asda: 0.80 },
  curry_paste: { name: 'Curry paste (tikka/korma)', cat: 'Store cupboard', pack: '290g jar', aldi: 0.99, tesco: 1.30, sains: 1.40, asda: 1.20 },
  kidney_bns:  { name: 'Kidney beans',          cat: 'Store cupboard', pack: '400g tin', aldi: 0.30, tesco: 0.45, sains: 0.50, asda: 0.40 },
  couscous:    { name: 'Couscous',              cat: 'Store cupboard', pack: '500g',   aldi: 0.60, tesco: 0.80, sains: 0.85, asda: 0.75 },
  lettuce:     { name: 'Lettuce',               cat: 'Fresh produce',  pack: 'each',   aldi: 0.49, tesco: 0.60, sains: 0.65, asda: 0.55 },
  cucumber:    { name: 'Cucumber',              cat: 'Fresh produce',  pack: 'each',   aldi: 0.49, tesco: 0.62, sains: 0.65, asda: 0.60 },
  coleslaw:    { name: 'Coleslaw',              cat: 'Fresh produce',  pack: '300g',   aldi: 0.55, tesco: 0.70, sains: 0.75, asda: 0.65 },
  mushrooms:   { name: 'Mushrooms',             cat: 'Fresh produce',  pack: '250g',   aldi: 0.85, tesco: 1.05, sains: 1.10, asda: 0.95 },
  bacon:       { name: 'Smoked bacon',          cat: 'Meat & fish',    pack: '300g',   aldi: 1.65, tesco: 1.95, sains: 2.10, asda: 1.85 },
  gizzard:     { name: 'Chicken gizzards',      cat: 'World foods',    pack: '500g',   aldi: null, tesco: 1.80, sains: null, asda: 1.60 },
  ogbono:      { name: 'Ground ogbono',         cat: 'World foods',    pack: '100g',   aldi: null, tesco: 2.80, sains: null, asda: 2.50 },
  elubo:       { name: 'Yam flour (elubo/amala)', cat: 'World foods',  pack: '1.5kg',  aldi: null, tesco: 4.00, sains: null, asda: 3.60 },
  banga:       { name: 'Palm nut concentrate',  cat: 'World foods',    pack: '400g tin', aldi: null, tesco: 2.20, sains: null, asda: 2.00 },
};

const BULK_KEYS = new Set([
  'rice', 'basmati', 'spaghetti', 'pasta', 'flour', 'oats', 'weetabix', 'beans_tin',
  'plum_tom', 'puree', 'veg_oil', 'palm_oil', 'stock_cubes', 'curry_pwd', 'thyme',
  'suya_spice', 'peanut_b', 'gravy', 'honey', 'coconut_mlk', 'tuna', 'sweetcorn',
  'garri', 'pyam_flour', 'egusi', 'crayfish', 'dried_fish', 'be_beans', 'tilapia',
  'chicken', 'thighs', 'chick_brst', 'mince', 'stew_beef', 'sausages',
  'fish_fngr', 'white_fish', 'spinach', 'peas', 'mixed_veg', 'oven_chips', 'butter',
  'lasagne_sh', 'noodles', 'soy_sauce', 'curry_paste', 'kidney_bns', 'couscous',
  'ogbono', 'elubo', 'banga', 'gizzard', 'pizza_base', 'garlic_brd', 'turkey', 'bacon',
]);

/* ============================================================
   PARTS — independent food items.
   type: 'main' (needs/loves a side), 'side' (accompanies a main;
   solo:true can stand alone), 'dish' (complete plate on its own).
   kid: 0–3 appeal. spice: 0–3. health: 1–5.
   ing: [pricebookKey, packsUsed, displayNote?]
   ============================================================ */

const PARTS = {
  /* ---------- Nigerian mains (soups, stews, proteins) ---------- */
  egusi_soup: { name: 'Egusi Soup', emoji: '🥣', grad: ['#c7901d', '#7a4e08'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 1, spice: 2, mins: 60, kcal: 430, protein: 34, health: 3, allergens: [],
    desc: 'Rich melon-seed soup with spinach, beef and smoked fish.',
    ing: [['egusi', 0.5, '250g ground'], ['palm_oil', 0.3], ['spinach', 1], ['stew_beef', 1], ['dried_fish', 0.5], ['crayfish', 0.3], ['scotch_b', 0.5], ['onions', 0.2], ['stock_cubes', 0.2]],
    steps: ['Season and boil beef until tender; keep the stock.', 'Fry onion in palm oil, add ground egusi mixed with a little water; fry in lumps 10 min.', 'Add beef stock gradually, then beef, smoked fish, crayfish and pepper; simmer 15 min.', 'Stir in spinach for the last 5 minutes.'] },

  efo_soup: { name: 'Efo Riro', emoji: '🥬', grad: ['#2e7d32', '#124d16'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 1, spice: 3, mins: 55, kcal: 350, protein: 32, health: 4, allergens: [],
    desc: 'Yoruba spinach stew, deeply savoury with peppers, assorted meat and crayfish.',
    ing: [['spinach', 2, '1kg'], ['palm_oil', 0.3], ['stew_beef', 1], ['dried_fish', 0.5], ['crayfish', 0.3], ['peppers', 1], ['scotch_b', 1], ['onions', 0.3], ['stock_cubes', 0.2]],
    steps: ['Blend peppers, scotch bonnet and onion coarsely; boil down until thick.', 'Boil seasoned beef until tender.', 'Fry the pepper blend in palm oil ~10 min, add crayfish, meat and fish; simmer.', 'Squeeze water from spinach, stir through for 5 min — don’t overcook.'] },

  okra_soup: { name: 'Okra Soup', emoji: '🌿', grad: ['#4d8a2f', '#20520f'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 1, spice: 2, mins: 45, kcal: 300, protein: 30, health: 4, allergens: [],
    desc: 'Fresh "draw" soup with okra, smoked fish and beef — light and nourishing.',
    ing: [['okra', 1], ['palm_oil', 0.2], ['stew_beef', 0.8], ['dried_fish', 0.5], ['crayfish', 0.2], ['scotch_b', 0.5], ['onions', 0.2], ['stock_cubes', 0.2]],
    steps: ['Grate or finely chop okra.', 'Boil seasoned beef; keep stock.', 'Warm palm oil, add stock, meat, fish, crayfish and pepper; simmer 10 min.', 'Add okra and cook 5–7 min so it keeps its draw.'] },

  red_stew: { name: 'Red Pepper Stew', emoji: '🍅', grad: ['#c23b22', '#701608'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 2, spice: 2, mins: 50, kcal: 260, protein: 6, health: 3, allergens: [],
    desc: 'The Sunday staple — deep red pepper base. Pair it with any protein and side you fancy.',
    tip: 'Kids version: ladle theirs out before the scotch bonnet goes in.',
    ing: [['plum_tom', 2], ['peppers', 0.7], ['scotch_b', 0.5], ['onions', 0.3], ['puree', 0.5], ['veg_oil', 0.3], ['stock_cubes', 0.2], ['thyme', 0.1]],
    steps: ['Blend tomatoes, peppers, scotch bonnet and onion; boil down.', 'Fry the blend in hot oil with purée until it darkens and oil rises to the top.', 'Season well; simmer with your chosen protein for the last 10 min.'] },

  pepper_soup: { name: 'Chicken Pepper Soup', emoji: '🍲', grad: ['#b3541e', '#6e2a08'], cuisine: 'ng', type: 'main',
    meals: ['d'], kid: 0, spice: 3, mins: 45, kcal: 320, protein: 35, health: 5, allergens: [],
    desc: 'Light, fiery, aromatic broth — the Nigerian cure for a cold English evening.',
    ing: [['chicken', 1], ['scotch_b', 1], ['ginger', 0.5], ['garlic', 0.5], ['onions', 0.2], ['stock_cubes', 0.2], ['thyme', 0.1]],
    steps: ['Cut chicken into pieces, season with salt, stock cube and half the aromatics.', 'Cover with water and simmer 25 min.', 'Add blended scotch bonnet, ginger and garlic; simmer 10 more min.'] },

  ewa_beans: { name: 'Ewa Riro (Stewed Beans)', emoji: '🫘', grad: ['#a8442a', '#5f1c0b'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 2, spice: 1, mins: 55, kcal: 380, protein: 22, health: 4, allergens: [],
    desc: 'Soft beans stewed in palm oil and crayfish — honest, hearty, cheap.',
    ing: [['be_beans', 1], ['palm_oil', 0.3], ['onions', 0.3], ['scotch_b', 0.3, 'adults'], ['crayfish', 0.2], ['stock_cubes', 0.2]],
    steps: ['Boil beans until very soft (pressure cooker = 25 min).', 'Fry onion in palm oil, add crayfish and pepper.', 'Fold through the beans; mash slightly and simmer 10 min.'] },

  curry_stew: { name: 'Coconut Curry Chicken', emoji: '🍛', grad: ['#c56a1e', '#7c3a08'], cuisine: 'fusion', type: 'main',
    meals: ['d'], kid: 3, spice: 1, mins: 45, kcal: 430, protein: 32, health: 5, allergens: [],
    desc: 'Creamy coconut curry-stew with sweet potato — gentle for kids, layered for adults.',
    ing: [['thighs', 1], ['sweet_pot', 1], ['coconut_mlk', 1], ['curry_pwd', 0.3], ['plum_tom', 1], ['onions', 0.2], ['ginger', 0.5], ['garlic', 0.5], ['spinach', 0.5]],
    steps: ['Brown chicken thighs; soften onion, ginger and garlic with curry powder.', 'Add tomatoes, coconut milk and sweet potato chunks; simmer 25 min.', 'Stir in spinach. Adults: finish with chopped scotch bonnet.'] },

  naija_bol: { name: 'Obe Ata Mince Sauce', emoji: '🍝', grad: ['#ad2f1d', '#5f0f06'], cuisine: 'fusion', type: 'main',
    meals: ['d'], kid: 3, spice: 1, mins: 40, kcal: 340, protein: 28, health: 3, allergens: [],
    desc: 'Bolognese built on Nigerian red pepper stew — the best of both kitchens.',
    ing: [['mince', 1], ['plum_tom', 1], ['peppers', 0.7], ['scotch_b', 0.3, 'adults'], ['onions', 0.2], ['puree', 0.3], ['stock_cubes', 0.1]],
    steps: ['Blend tomatoes, peppers and onion; fry the blend down like stew base.', 'Brown mince, combine and simmer 15 min.', 'Kids’ pot: ladle out before the scotch bonnet goes in.'] },

  suya: { name: 'Beef Suya Skewers', emoji: '🍢', grad: ['#8c2f1b', '#4a1006'], cuisine: 'ng', type: 'main',
    meals: ['d'], kid: 2, spice: 2, mins: 35, kcal: 430, protein: 40, health: 4, allergens: ['peanut'],
    desc: 'Smoky grilled beef rolled in spicy yaji peanut spice, with fresh onion and tomato.',
    tip: 'Kid skewers: dust lightly after grilling instead of a full coat.',
    ing: [['stew_beef', 1, 'thin-sliced'], ['suya_spice', 0.7], ['veg_oil', 0.1], ['onions', 0.2], ['tomatoes', 0.5]],
    steps: ['Slice beef thin, thread onto soaked skewers.', 'Oil lightly, coat generously with suya spice; rest 30 min.', 'Grill hot 4–5 min a side.', 'Dust again with yaji; serve with sliced onion and tomato.'] },

  jollof_rice: { name: 'Jollof Rice', emoji: '🍚', grad: ['#e2542c', '#a31f0e'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 3, spice: 2, mins: 55, kcal: 420, protein: 9, health: 3, allergens: [],
    desc: 'The party classic — smoky one-pot tomato rice. Combine with chicken, fish, turkey… whatever the day calls for.',
    tip: 'Kids version: hold the scotch bonnet back and blend it into the adults’ portion at the end.',
    ing: [['rice', 0.5, '500g rice'], ['plum_tom', 2], ['puree', 0.5], ['peppers', 1], ['scotch_b', 0.5, 'to taste'], ['onions', 0.3], ['stock_cubes', 0.2], ['thyme', 0.1], ['curry_pwd', 0.2], ['veg_oil', 0.1]],
    steps: ['Blend tomatoes, red pepper, onion and scotch bonnet; boil the blend down until thick.', 'Fry onion in oil, add purée and cook 5 min.', 'Add the pepper blend, stock and spices; simmer 10 min.', 'Stir in washed rice, cover with foil + lid and steam on low ~30 min.', 'Let the bottom catch slightly for the smoky party flavour.'] },

  fried_rice_ng: { name: 'Nigerian Fried Rice', emoji: '🍛', grad: ['#c9a227', '#7c5f0b'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 3, spice: 1, mins: 45, kcal: 400, protein: 8, health: 3, allergens: [],
    desc: 'Golden curried rice with mixed veg — jollof’s milder party twin. Add your protein of choice.',
    ing: [['rice', 0.5], ['mixed_veg', 0.5], ['curry_pwd', 0.3], ['stock_cubes', 0.2], ['onions', 0.2], ['veg_oil', 0.1]],
    steps: ['Parboil rice with curry powder and stock until just underdone.', 'Stir-fry veg with onion, add rice in batches, tossing on high heat.', 'Steam 5 min on low before serving.'] },

  egg_sauce: { name: 'Egg Sauce', emoji: '🍳', grad: ['#d9a441', '#8f5e0c'], cuisine: 'ng', type: 'main',
    meals: ['b'], kid: 2, spice: 1, mins: 15, kcal: 210, protein: 16, health: 4, allergens: ['egg'],
    desc: 'Scrambled tomato-pepper eggs — the Naija breakfast anchor.',
    ing: [['eggs', 0.5, '6 eggs'], ['tomatoes', 0.7], ['onions', 0.2], ['scotch_b', 0.3, 'adults'], ['veg_oil', 0.1]],
    steps: ['Soften onion and tomato in oil (chilli in the adults’ pan).', 'Add beaten eggs, scramble gently.'] },

  akara: { name: 'Akara (Bean Fritters)', emoji: '🥯', grad: ['#c07820', '#8a4a06'], cuisine: 'ng', type: 'main',
    meals: ['b'], kid: 2, spice: 1, mins: 40, kcal: 320, protein: 16, health: 3, allergens: [],
    desc: 'Crispy bean fritters — the Saturday-morning breakfast of champions.',
    ing: [['be_beans', 0.7], ['onions', 0.2], ['scotch_b', 0.3, 'optional'], ['veg_oil', 0.3]],
    steps: ['Peel soaked beans, blend with onion (chilli for adults) into a fluffy batter.', 'Whisk air into the batter — the secret to light akara.', 'Deep-fry spoonfuls until golden brown.'] },

  fish_fingers_m: { name: 'Fish Fingers', emoji: '🐠', grad: ['#2d6fa3', '#123c61'], cuisine: 'uk', type: 'main',
    meals: ['l', 'd'], kid: 3, spice: 0, mins: 20, kcal: 260, protein: 18, health: 3, allergens: ['fish', 'gluten'],
    desc: 'The reliable kid-pleaser, oven-baked until crunchy.',
    ing: [['fish_fngr', 1], ['peas', 0.3]],
    steps: ['Oven-bake fish fingers ~15 min, turning once.', 'Simmer peas with a knob of butter.'] },

  sausages_m: { name: 'Sausages & Onion Gravy', emoji: '🌭', grad: ['#875a2b', '#4c2e0c'], cuisine: 'uk', type: 'main',
    meals: ['d'], kid: 3, spice: 0, mins: 30, kcal: 380, protein: 20, health: 2, allergens: [],
    desc: 'Bangers with proper slow-fried onion gravy.',
    ing: [['sausages', 1], ['onions', 0.3], ['gravy', 0.3], ['peas', 0.3]],
    steps: ['Oven-bake sausages 25 min.', 'Slow-fry sliced onions, add gravy.', 'Simmer peas.'] },

  /* ---------- Proteins (combine with any main that takes one) ---------- */
  grilled_chicken: { name: 'Grilled Chicken', emoji: '🍗', grad: ['#a06a2c', '#5c360c'], cuisine: 'ng', type: 'protein',
    kid: 3, spice: 0, mins: 35, kcal: 290, protein: 28, health: 4, allergens: [],
    desc: 'Well-seasoned thighs, grilled until the skin crisps.',
    ing: [['thighs', 1]],
    steps: ['Season thighs generously (salt, stock cube, thyme, a little curry powder).', 'Grill or roast at 200°C ~30 min until crisp and cooked through.'] },

  fried_fish: { name: 'Fried Fish (Tilapia)', emoji: '🐟', grad: ['#2d6fa3', '#123c61'], cuisine: 'ng', type: 'protein',
    kid: 2, spice: 0, mins: 25, kcal: 260, protein: 30, health: 4, allergens: ['fish'],
    desc: 'Crispy fried tilapia — the classic partner to stew and rice.',
    ing: [['tilapia', 1], ['veg_oil', 0.2]],
    steps: ['Season fish inside and out; rest 10 min.', 'Fry in hot oil until deep golden and crisp on both sides.'] },

  peppered_turkey: { name: 'Peppered Turkey', emoji: '🦃', grad: ['#8c2f1b', '#4a1006'], cuisine: 'ng', type: 'protein',
    kid: 1, spice: 2, mins: 45, kcal: 320, protein: 34, health: 4, allergens: [],
    desc: 'Soft-boiled turkey wings tossed in fiery pepper sauce.',
    ing: [['turkey', 1], ['scotch_b', 0.3], ['onions', 0.2], ['stock_cubes', 0.1]],
    steps: ['Boil seasoned turkey until tender.', 'Fry or grill until edges crisp.', 'Toss through a quick scotch-bonnet and onion sauce.'] },

  fried_beef: { name: 'Fried Beef', emoji: '🥩', grad: ['#6b3226', '#38150d'], cuisine: 'ng', type: 'protein',
    kid: 2, spice: 0, mins: 30, kcal: 300, protein: 32, health: 3, allergens: [],
    desc: 'Stew-seasoned beef, boiled then fried the Naija way.',
    ing: [['stew_beef', 1]],
    steps: ['Boil seasoned beef until tender; keep the stock for your stew.', 'Fry until browned at the edges.'] },

  boiled_eggs: { name: 'Boiled Eggs', emoji: '🥚', grad: ['#c9a227', '#7c5f0b'], cuisine: 'ng', type: 'protein',
    kid: 3, spice: 0, mins: 12, kcal: 140, protein: 12, health: 4, allergens: ['egg'],
    desc: 'The budget protein — great with stew, beans or jollof.',
    ing: [['eggs', 0.5, '6 eggs']],
    steps: ['Boil 8–10 min, cool in cold water, peel.'] },

  /* ---------- Sides & swallows ---------- */
  pounded_yam: { name: 'Pounded Yam', emoji: '🫓', grad: ['#e0c07a', '#9c7a2e'], cuisine: 'ng', type: 'side',
    kid: 2, spice: 0, mins: 15, kcal: 320, protein: 4, health: 3, allergens: [],
    desc: 'Smooth, stretchy swallow — the king of soup companions.',
    ing: [['pyam_flour', 0.4]],
    steps: ['Whisk pounded-yam flour into simmering water until smooth and stretchy.'] },

  eba: { name: 'Eba (Garri)', emoji: '🟤', grad: ['#caa25a', '#8a6420'], cuisine: 'ng', type: 'side',
    kid: 2, spice: 0, mins: 10, kcal: 300, protein: 2, health: 3, allergens: [],
    desc: 'Quick garri swallow — ten minutes, zero fuss.',
    ing: [['garri', 0.3]],
    steps: ['Pour garri into hot water, turn with a wooden spoon until firm.'] },

  white_rice: { name: 'White Rice', emoji: '🍚', grad: ['#d8d3c4', '#9b9480'], cuisine: 'ng', type: 'side',
    kid: 3, spice: 0, mins: 20, kcal: 260, protein: 5, health: 3, allergens: [],
    desc: 'Fluffy long-grain rice.',
    ing: [['rice', 0.5]],
    steps: ['Rinse rice, boil in salted water until fluffy; steam 5 min off heat.'] },

  dodo: { name: 'Dodo (Fried Plantain)', emoji: '🍌', grad: ['#d9a02b', '#8f5e08'], cuisine: 'ng', type: 'side',
    kid: 3, spice: 0, mins: 15, kcal: 240, protein: 2, health: 3, allergens: [],
    desc: 'Sweet, caramelised plantain — vanishes first, every time.',
    ing: [['plantain', 3, '3 ripe'], ['veg_oil', 0.2]],
    steps: ['Slice ripe plantain on the diagonal.', 'Fry in hot oil until deep golden; drain and salt lightly.'] },

  boiled_yam: { name: 'Boiled Yam', emoji: '🍠', grad: ['#d98e2b', '#94510a'], cuisine: 'ng', type: 'side',
    kid: 2, spice: 0, mins: 25, kcal: 250, protein: 3, health: 4, allergens: [],
    desc: 'Soft-boiled yam slices — perfect under sauce or soup.',
    ing: [['yam', 1, '1kg']],
    steps: ['Peel, slice and boil yam in salted water until fork-tender.'] },

  chips_side: { name: 'Oven Chips', emoji: '🍟', grad: ['#c99b3a', '#8a6410'], cuisine: 'uk', type: 'side',
    kid: 3, spice: 0, mins: 25, kcal: 310, protein: 4, health: 2, allergens: [],
    desc: 'Crunchy oven chips.',
    ing: [['oven_chips', 0.7]],
    steps: ['Bake at 220°C ~25 min, turning once.'] },

  mash: { name: 'Buttery Mash', emoji: '🥔', grad: ['#cfc39a', '#8f8258'], cuisine: 'uk', type: 'side',
    kid: 3, spice: 0, mins: 25, kcal: 230, protein: 4, health: 3, allergens: ['milk'],
    desc: 'Smooth mashed potato with butter and milk.',
    ing: [['potatoes', 0.5], ['butter', 0.2], ['milk', 0.1]],
    steps: ['Boil potatoes until tender; mash with butter, milk, salt.'] },

  spag_side: { name: 'Spaghetti', emoji: '🍝', grad: ['#d9b23a', '#94710a'], cuisine: 'uk', type: 'side',
    kid: 3, spice: 0, mins: 15, kcal: 280, protein: 9, health: 3, allergens: ['gluten'],
    desc: 'Al dente spaghetti.',
    ing: [['spaghetti', 1]],
    steps: ['Boil in well-salted water; keep a splash of pasta water for the sauce.'] },

  bread_side: { name: 'Soft Bread (Agege-style)', emoji: '🍞', grad: ['#c2913a', '#7c560f'], cuisine: 'ng', type: 'side',
    kid: 3, spice: 0, mins: 2, kcal: 180, protein: 6, health: 2, allergens: ['gluten'],
    desc: 'Soft white bread for stuffing and mopping.',
    ing: [['bread', 0.5]],
    steps: ['Slice thick. That’s it.'] },

  moimoi: { name: 'Moi Moi', emoji: '🫘', grad: ['#b0562c', '#6b2a10'], cuisine: 'ng', type: 'side', solo: true,
    meals: ['b', 'l'], kid: 2, spice: 1, mins: 70, kcal: 300, protein: 20, health: 5, allergens: ['egg'],
    desc: 'Steamed bean pudding — soft, protein-packed, great warm or in lunchboxes.',
    ing: [['be_beans', 0.7], ['peppers', 0.5], ['scotch_b', 0.2, 'optional'], ['onions', 0.2], ['eggs', 0.3, '4 eggs'], ['veg_oil', 0.1]],
    steps: ['Soak and peel black-eyed beans.', 'Blend with peppers and onion to a smooth batter; season, add oil.', 'Pour into ramekins, drop in boiled-egg slices.', 'Steam 45–50 min until set. Kids’ cups: skip the scotch bonnet.'] },

  /* ---------- Complete dishes ---------- */
  asaro: { name: 'Asaro (Yam Porridge)', emoji: '🍠', grad: ['#d98e2b', '#94510a'], cuisine: 'ng', type: 'dish',
    meals: ['l', 'd'], kid: 2, spice: 1, mins: 50, kcal: 520, protein: 14, health: 4, allergens: [],
    desc: 'Yam simmered soft in a gentle pepper-palm sauce, lightly mashed. Comfort in a bowl.',
    ing: [['yam', 1.5, '1.5kg'], ['palm_oil', 0.2], ['plum_tom', 1], ['peppers', 0.3], ['scotch_b', 0.3, 'to taste'], ['onions', 0.2], ['crayfish', 0.2], ['stock_cubes', 0.2], ['spinach', 0.5]],
    steps: ['Peel and cube yam; blend tomatoes, pepper and onion.', 'Boil yam in the blend with water, stock and crayfish until fork-soft.', 'Add palm oil, mash roughly so some chunks remain.', 'Fold in spinach at the end.'] },

  cottage: { name: 'Cottage Pie', emoji: '🥧', grad: ['#8a6a3b', '#4f3714'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 70, kcal: 610, protein: 32, health: 3, allergens: ['milk'],
    desc: 'Savoury beef mince under golden mashed potato — proper weeknight comfort.',
    ing: [['mince', 1], ['potatoes', 0.5], ['carrots', 0.3], ['onions', 0.2], ['peas', 0.3], ['gravy', 0.3], ['butter', 0.3], ['milk', 0.1], ['cheese', 0.2]],
    steps: ['Brown mince with onion and diced carrot; add gravy and simmer 15 min.', 'Boil and mash potatoes with butter and milk.', 'Layer mince, peas, then mash; rough up the top.', 'Scatter cheese, bake 25 min at 200°C.'] },

  roast: { name: 'Sunday Roast Chicken', emoji: '🍗', grad: ['#a06a2c', '#5c360c'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 100, kcal: 680, protein: 42, health: 3, allergens: ['milk', 'gluten'],
    desc: 'Roast chicken, crispy potatoes, veg and gravy — with Yorkshire puddings, obviously.',
    ing: [['chicken', 1], ['potatoes', 0.6], ['carrots', 0.5], ['broccoli', 1], ['gravy', 0.3], ['flour', 0.2], ['eggs', 0.2], ['milk', 0.2], ['veg_oil', 0.1]],
    steps: ['Roast seasoned chicken ~70 min at 190°C; rest well.', 'Parboil potatoes, roast in hot oil until crunchy.', 'Bake Yorkshires in smoking-hot oil 20 min — no peeking.', 'Steam veg, make gravy from the juices.'] },

  spagbol: { name: 'Spaghetti Bolognese', emoji: '🍝', grad: ['#a33327', '#5e120c'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 45, kcal: 590, protein: 30, health: 3, allergens: ['gluten'],
    desc: 'The school-night hero. Hidden-veg friendly if you blend the sauce.',
    ing: [['mince', 1], ['spaghetti', 1], ['plum_tom', 2], ['puree', 0.3], ['onions', 0.2], ['garlic', 0.5], ['carrots', 0.2, 'grated'], ['cheese', 0.2]],
    steps: ['Brown mince with onion, garlic and grated carrot.', 'Add tomatoes and purée; simmer 20+ min.', 'Cook spaghetti; toss with the sauce.', 'Top with grated cheddar.'] },

  fishchips: { name: 'Oven Fish & Chips', emoji: '🐠', grad: ['#2d6fa3', '#123c61'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 40, kcal: 560, protein: 28, health: 3, allergens: ['fish', 'gluten'],
    desc: 'Friday classic done in the oven — crispy fillets, chunky chips, mushy peas.',
    ing: [['white_fish', 1], ['oven_chips', 0.7], ['peas', 0.4], ['flour', 0.1], ['bread', 0.2, 'crumbed'], ['eggs', 0.2]],
    steps: ['Coat fillets in flour, egg, then breadcrumbs.', 'Bake fish and chips at 220°C ~25 min.', 'Simmer and crush peas with butter.'] },

  toad: { name: 'Toad in the Hole', emoji: '🌭', grad: ['#96652f', '#54340e'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 50, kcal: 620, protein: 26, health: 2, allergens: ['gluten', 'egg', 'milk'],
    desc: 'Sausages baked in giant Yorkshire pudding batter with onion gravy.',
    ing: [['sausages', 1], ['flour', 0.2], ['eggs', 0.3], ['milk', 0.3], ['gravy', 0.3], ['onions', 0.3], ['peas', 0.3], ['veg_oil', 0.1]],
    steps: ['Brown sausages in a roasting tin.', 'Whisk a smooth batter; rest it.', 'Pour batter around hot sausages; bake 30 min at 210°C.', 'Serve with onion gravy and peas.'] },

  jackets: { name: 'Jacket Potatoes, Beans & Cheese', emoji: '🥔', grad: ['#7a5a33', '#453012'], cuisine: 'uk', type: 'dish',
    meals: ['l', 'd'], kid: 3, spice: 0, mins: 75, kcal: 480, protein: 18, health: 4, allergens: ['milk'],
    desc: 'Crispy-skinned jackets with molten beans and cheddar. Cheap-as-chips tea.',
    ing: [['potatoes', 0.5, '4 large'], ['beans_tin', 2], ['cheese', 0.4], ['butter', 0.2]],
    steps: ['Prick potatoes, rub with oil and salt; bake 70 min at 200°C.', 'Warm beans.', 'Split, butter, load with beans and cheddar.'] },

  pastabake: { name: 'Chicken & Broccoli Pasta Bake', emoji: '🧀', grad: ['#c48a2a', '#7e520a'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 45, kcal: 570, protein: 34, health: 3, allergens: ['gluten', 'milk'],
    desc: 'Creamy, cheesy tray of pasta the whole table agrees on.',
    ing: [['pasta', 1], ['chick_brst', 1], ['broccoli', 1], ['milk', 0.3], ['flour', 0.1], ['butter', 0.3], ['cheese', 0.5]],
    steps: ['Cook pasta and broccoli together for the last 3 min.', 'Pan-fry diced chicken.', 'Make a cheese sauce; combine, top with cheese, grill until bubbling.'] },

  tunapasta: { name: 'Tuna Sweetcorn Pasta', emoji: '🥫', grad: ['#3a7ca5', '#174a6b'], cuisine: 'uk', type: 'dish',
    meals: ['l'], kid: 2, spice: 0, mins: 20, kcal: 480, protein: 30, health: 4, allergens: ['fish', 'gluten'],
    desc: '15-minute store-cupboard lunch that always gets eaten.',
    ing: [['pasta', 0.7], ['tuna', 0.5], ['sweetcorn', 1], ['cheese', 0.2]],
    steps: ['Cook pasta.', 'Stir through tuna, sweetcorn and a little pasta water.', 'Top with cheese; grill 5 min if fancy.'] },

  fullenglish: { name: 'Full English (Weekend)', emoji: '🍳', grad: ['#9c4a24', '#57230a'], cuisine: 'uk', type: 'dish',
    meals: ['b'], kid: 3, spice: 0, mins: 30, kcal: 720, protein: 32, health: 2, allergens: ['egg', 'gluten'],
    desc: 'Sausages, eggs, beans, toast and grilled tomatoes. Saturday sorted.',
    ing: [['sausages', 1], ['eggs', 0.5], ['beans_tin', 2], ['bread', 0.5], ['tomatoes', 0.5], ['butter', 0.2]],
    steps: ['Grill sausages and halved tomatoes.', 'Warm beans; fry or scramble eggs.', 'Toast, butter, assemble the fry-up.'] },

  porridge: { name: 'Banana Honey Porridge', emoji: '🥣', grad: ['#b08a3e', '#6d5211'], cuisine: 'uk', type: 'dish',
    meals: ['b'], kid: 3, spice: 0, mins: 12, kcal: 340, protein: 12, health: 5, allergens: ['milk'],
    desc: 'Creamy oats with sliced banana and a honey swirl — school-morning fuel.',
    ing: [['oats', 0.3], ['milk', 0.4], ['bananas', 0.5], ['honey', 0.2]],
    steps: ['Simmer oats in milk 5–7 min, stirring.', 'Top with banana coins and honey.'] },

  weetabix: { name: 'Cereal, Fruit & Toast', emoji: '🥛', grad: ['#a5762e', '#63430e'], cuisine: 'uk', type: 'dish',
    meals: ['b'], kid: 3, spice: 0, mins: 8, kcal: 310, protein: 11, health: 4, allergens: ['gluten', 'milk'],
    desc: 'The zero-effort school-run breakfast: wheat biscuits, banana, buttered toast.',
    ing: [['weetabix', 0.3], ['milk', 0.3], ['bananas', 0.5], ['bread', 0.4], ['butter', 0.2]],
    steps: ['Bowl, biscuits, milk, sliced banana.', 'Toast and butter the bread.'] },

  eggybread: { name: 'Eggy Bread & Beans', emoji: '🍞', grad: ['#c2913a', '#7c560f'], cuisine: 'uk', type: 'dish',
    meals: ['b'], kid: 3, spice: 0, mins: 15, kcal: 420, protein: 18, health: 3, allergens: ['egg', 'gluten'],
    desc: 'French toast, British style — golden fried bread with beans.',
    ing: [['bread', 0.5], ['eggs', 0.4], ['beans_tin', 1], ['butter', 0.2]],
    steps: ['Whisk eggs with a pinch of salt.', 'Soak bread slices, fry in butter until golden.', 'Serve with warmed beans.'] },

  plantainpancakes: { name: 'Plantain Pancakes', emoji: '🥞', grad: ['#c98f2e', '#8a570c'], cuisine: 'fusion', type: 'dish',
    meals: ['b'], kid: 3, spice: 0, mins: 25, kcal: 390, protein: 12, health: 4, allergens: ['egg', 'gluten', 'milk'],
    desc: 'Fluffy pancakes made with overripe plantain — naturally sweet, no sugar needed.',
    ing: [['plantain', 2, 'very ripe'], ['flour', 0.15], ['eggs', 0.2], ['milk', 0.2], ['honey', 0.2], ['butter', 0.1]],
    steps: ['Mash plantain smooth; whisk in eggs, milk, then flour.', 'Fry small rounds in butter, flip once.', 'Stack, drizzle with honey.'] },

  suyawrap: { name: 'Suya Chicken Wraps', emoji: '🌯', grad: ['#a34a1e', '#5e2408'], cuisine: 'fusion', type: 'dish',
    meals: ['l', 'd'], kid: 2, spice: 1, mins: 30, kcal: 520, protein: 36, health: 4, allergens: ['peanut', 'gluten'],
    desc: 'Grilled suya-spiced chicken, crunchy salad and yoghurt in a warm wrap.',
    ing: [['chick_brst', 1], ['suya_spice', 0.5], ['bread', 0.5, 'or tortillas'], ['tomatoes', 0.5], ['onions', 0.2], ['peppers', 0.3]],
    steps: ['Coat chicken strips in oil and suya spice; grill until charred at the edges.', 'Warm the wraps; slice the salad.', 'Assemble — mild for kids, extra yaji for adults.'] },

  plantaintacos: { name: 'Fish Finger & Dodo Tacos', emoji: '🌮', grad: ['#c77e24', '#8a4c08'], cuisine: 'fusion', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 25, kcal: 510, protein: 24, health: 3, allergens: ['fish', 'gluten'],
    desc: 'The kids’ favourite mash-up: crispy fish fingers + sweet fried plantain in soft tacos.',
    ing: [['fish_fngr', 1], ['plantain', 3], ['bread', 0.5, 'or soft tacos'], ['tomatoes', 0.5], ['sweetcorn', 1], ['veg_oil', 0.1]],
    steps: ['Oven-cook the fish fingers.', 'Fry ripe plantain coins until golden.', 'Load tacos with fish, dodo, sweetcorn and tomato. Adults: add hot sauce.'] },

  /* ---------- world & British mains (take a protein / side) ---------- */
  stir_fry: { name: 'Veg Stir-Fry', emoji: '🥡', grad: ['#2f7d5c', '#12432f'], cuisine: 'world', type: 'main',
    meals: ['l', 'd'], kid: 2, spice: 0, mins: 25, kcal: 260, protein: 8, health: 5, allergens: [],
    desc: 'Crunchy wok-fried veg in a garlic-ginger-soy glaze — fast, fresh, endlessly flexible.',
    ing: [['peppers', 0.7], ['mushrooms', 1], ['carrots', 0.3], ['onions', 0.2], ['garlic', 0.5], ['ginger', 0.5], ['soy_sauce', 0.5], ['veg_oil', 0.1]],
    steps: ['Slice all the veg thin; mix soy, garlic and ginger for the sauce.', 'Get the pan smoking hot; stir-fry veg 3–4 min, keeping the crunch.', 'Add the sauce for the final minute, tossing to coat.'] },

  curry_night: { name: 'Creamy Curry Sauce', emoji: '🍛', grad: ['#b6741e', '#6e4208'], cuisine: 'world', type: 'main',
    meals: ['d'], kid: 3, spice: 1, mins: 35, kcal: 340, protein: 8, health: 3, allergens: ['milk'],
    desc: 'A gentle tikka-style curry sauce the whole table agrees on — pick your protein.',
    tip: 'Adults: rescue it from mildness with fresh chilli at the table.',
    ing: [['curry_paste', 0.7], ['plum_tom', 1], ['coconut_mlk', 1], ['onions', 0.3], ['garlic', 0.5], ['ginger', 0.5], ['veg_oil', 0.1]],
    steps: ['Soften onion, garlic and ginger; fry the curry paste 2 min until fragrant.', 'Add tomatoes and coconut milk; simmer 15 min until rich.', 'Add your cooked protein for the last 5 minutes.'] },

  fajitas: { name: 'Sizzling Fajitas', emoji: '🫔', grad: ['#b3401e', '#5f1d08'], cuisine: 'world', type: 'main',
    meals: ['d'], kid: 3, spice: 1, mins: 25, kcal: 420, protein: 12, health: 4, allergens: ['gluten'],
    desc: 'Build-your-own night: charred peppers and onions in warm tortillas. Zero arguments.',
    ing: [['peppers', 1], ['onions', 0.4], ['tortillas', 1], ['curry_pwd', 0.2, 'fajita spice mix'], ['veg_oil', 0.1], ['tomatoes', 0.5], ['cheese', 0.3]],
    steps: ['Slice peppers and onions; toss with the spice mix and oil.', 'Sear in a screaming-hot pan until charred at the edges.', 'Warm the tortillas; let everyone build their own with cheese and salsa.'] },

  chilli_con: { name: 'Chilli con Carne', emoji: '🌶', grad: ['#8f2a1a', '#4a0f06'], cuisine: 'world', type: 'main',
    meals: ['d'], kid: 2, spice: 1, mins: 50, kcal: 420, protein: 30, health: 4, allergens: [],
    desc: 'Slow-simmered beef and bean chilli — mild for the table, hot sauce for the brave.',
    ing: [['mince', 1], ['kidney_bns', 2], ['plum_tom', 2], ['onions', 0.3], ['garlic', 0.5], ['puree', 0.3], ['curry_pwd', 0.2, 'cumin & paprika'], ['scotch_b', 0.2, 'adults, optional']],
    steps: ['Brown the mince with onion and garlic.', 'Add spices, tomatoes, purée and beans; simmer low for 30+ min.', 'Kids’ portions out before any extra chilli goes in.'] },

  /* ---------- more Nigerian mains ---------- */
  ogbono_soup: { name: 'Ogbono Soup', emoji: '🥣', grad: ['#7a5a24', '#42300c'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 1, spice: 2, mins: 55, kcal: 420, protein: 32, health: 4, allergens: [],
    desc: 'The silky draw soup — ground ogbono with assorted meat and smoked fish.',
    ing: [['ogbono', 1], ['palm_oil', 0.3], ['stew_beef', 1], ['dried_fish', 0.5], ['crayfish', 0.3], ['scotch_b', 0.5], ['spinach', 0.5], ['stock_cubes', 0.2]],
    steps: ['Boil seasoned beef until tender; keep the stock.', 'Off the heat, whisk ogbono into warm palm oil until smooth.', 'Add stock gradually, stirring — it thickens and draws.', 'Add meat, fish, crayfish and pepper; simmer 10 min. Greens in last.'] },

  edikaikong: { name: 'Edikaikong (Vegetable Soup)', emoji: '🥬', grad: ['#256b35', '#0d3a18'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 1, spice: 2, mins: 60, kcal: 390, protein: 34, health: 5, allergens: [],
    desc: 'Calabar’s pride — a dense, barely-any-liquid soup of greens, meat and fish.',
    ing: [['spinach', 2, '1kg mixed greens'], ['palm_oil', 0.4], ['stew_beef', 1], ['dried_fish', 0.5], ['crayfish', 0.3], ['scotch_b', 0.5], ['onions', 0.2], ['stock_cubes', 0.2]],
    steps: ['Boil seasoned meat until tender with very little water.', 'Add palm oil, crayfish, fish and pepper; simmer 5 min.', 'Pile in the squeezed greens; steam 5–7 min. It should be thick, not watery.'] },

  ayamase: { name: 'Ayamase (Ofada Stew)', emoji: '🫑', grad: ['#3f6b1e', '#1c3a08'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 0, spice: 3, mins: 70, kcal: 460, protein: 30, health: 3, allergens: [],
    desc: 'The green designer stew — bleached palm oil, green peppers, assorted meat. Serious business.',
    ing: [['peppers', 2, 'green ones'], ['scotch_b', 1], ['palm_oil', 0.5], ['stew_beef', 1], ['onions', 0.3], ['crayfish', 0.2], ['stock_cubes', 0.2], ['eggs', 0.3, 'boiled, optional']],
    steps: ['Blend green peppers and scotch bonnet coarsely; boil down until dry-ish.', 'Bleach the palm oil (well-ventilated kitchen!), then fry onions in it.', 'Fry the pepper blend 15 min; add meats and crayfish; simmer until the oil rises.'] },

  banga_soup: { name: 'Banga Soup', emoji: '🍲', grad: ['#9a4a14', '#521f04'], cuisine: 'ng', type: 'main',
    meals: ['l', 'd'], kid: 1, spice: 2, mins: 50, kcal: 440, protein: 30, health: 3, allergens: ['fish'],
    desc: 'Delta classic — palm nut soup with fish and beef, deep and aromatic.',
    ing: [['banga', 1], ['tilapia', 0.5], ['stew_beef', 0.7], ['dried_fish', 0.3], ['crayfish', 0.2], ['scotch_b', 0.5], ['stock_cubes', 0.2]],
    steps: ['Dissolve the palm nut concentrate in hot water; simmer 10 min.', 'Add boiled beef, fish, crayfish and pepper.', 'Simmer until it thickens and the oil surfaces. Best with starch or eba.'] },

  /* ---------- world & British complete dishes ---------- */
  lasagne: { name: 'Family Lasagne', emoji: '🍝', grad: ['#a13a20', '#571508'], cuisine: 'world', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 80, kcal: 640, protein: 34, health: 3, allergens: ['gluten', 'milk'],
    desc: 'Layers of rich ragù, white sauce and pasta — the tray that silences a table.',
    ing: [['mince', 1], ['lasagne_sh', 0.5], ['plum_tom', 2], ['onions', 0.3], ['garlic', 0.5], ['milk', 0.3], ['flour', 0.1], ['butter', 0.3], ['cheese', 0.5]],
    steps: ['Make the ragù: brown mince, add tomatoes, simmer 20 min.', 'Make a white sauce with butter, flour and milk.', 'Layer ragù, sheets and sauce; top with cheese.', 'Bake 35 min at 190°C until golden and bubbling.'] },

  carbonara: { name: 'Spaghetti Carbonara', emoji: '🥓', grad: ['#b08a3e', '#63430e'], cuisine: 'world', type: 'dish',
    meals: ['d'], kid: 2, spice: 0, mins: 20, kcal: 610, protein: 28, health: 2, allergens: ['gluten', 'egg', 'milk'],
    desc: '20-minute silk: bacon, eggs and cheese emulsified into glossy pasta.',
    ing: [['spaghetti', 1], ['bacon', 1], ['eggs', 0.3, '3 eggs + 1 yolk'], ['cheese', 0.3], ['garlic', 0.3]],
    steps: ['Fry the bacon crisp; cook the spaghetti.', 'Whisk eggs with cheese and black pepper.', 'Off the heat, toss pasta with bacon, then the egg mix + a splash of pasta water — keep it moving until silky.'] },

  pizza_night: { name: 'Homemade Pizza Night', emoji: '🍕', grad: ['#c24a24', '#6b1d08'], cuisine: 'world', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 30, kcal: 580, protein: 24, health: 2, allergens: ['gluten', 'milk'],
    desc: 'Everyone tops their own — the Friday night the kids ask for by name.',
    ing: [['pizza_base', 1], ['plum_tom', 1], ['puree', 0.3], ['cheese', 0.6], ['peppers', 0.3], ['mushrooms', 0.5]],
    steps: ['Simmer tomatoes and purée into a quick sauce.', 'Sauce the bases; let everyone build their own.', 'Bake 10–12 min at 220°C until the cheese blisters.'] },

  burgers: { name: 'Homemade Burgers', emoji: '🍔', grad: ['#8a5a2b', '#4c2e0c'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 30, kcal: 620, protein: 32, health: 2, allergens: ['gluten', 'milk'],
    desc: 'Smashed patties, melted cheese, soft buns — better than the drive-thru.',
    ing: [['mince', 1], ['burger_buns', 1], ['cheese', 0.3], ['lettuce', 0.5], ['tomatoes', 0.5], ['onions', 0.2]],
    steps: ['Season mince, shape loose balls.', 'Smash into a hot pan; 2–3 min a side, cheese on at the flip.', 'Toast the buns; stack with lettuce, tomato and onion.'] },

  fish_pie: { name: 'Fish Pie', emoji: '🐟', grad: ['#2d6fa3', '#123c61'], cuisine: 'uk', type: 'dish',
    meals: ['d'], kid: 2, spice: 0, mins: 70, kcal: 560, protein: 34, health: 4, allergens: ['fish', 'milk'],
    desc: 'Flaky fish in creamy sauce under buttery mash — cold-evening armour.',
    ing: [['white_fish', 1], ['potatoes', 0.6], ['milk', 0.4], ['butter', 0.4], ['flour', 0.1], ['peas', 0.3], ['cheese', 0.2]],
    steps: ['Poach the fish in the milk; keep the milk.', 'Make a sauce from butter, flour and the poaching milk; fold in fish and peas.', 'Top with mash and cheese; bake 30 min at 200°C.'] },

  katsu: { name: 'Chicken Katsu Curry', emoji: '🍱', grad: ['#c9942a', '#7c560a'], cuisine: 'world', type: 'dish',
    meals: ['d'], kid: 3, spice: 0, mins: 40, kcal: 680, protein: 38, health: 3, allergens: ['gluten', 'egg'],
    desc: 'Crispy breaded chicken over rice with that sweet, gentle katsu sauce.',
    ing: [['chick_brst', 1], ['flour', 0.15], ['eggs', 0.2], ['bread', 0.3, 'crumbed'], ['curry_paste', 0.5], ['coconut_mlk', 0.5], ['rice', 0.4], ['veg_oil', 0.2]],
    steps: ['Flatten the chicken; coat in flour, egg, breadcrumbs.', 'Shallow-fry until deeply golden; rest, then slice.', 'Simmer curry paste with coconut milk into a smooth sauce.', 'Slice over rice, pour the sauce.'] },

  /* ---------- more proteins & sides ---------- */
  peppered_gizzard: { name: 'Peppered Gizzard', emoji: '🍗', grad: ['#8c2f1b', '#4a1006'], cuisine: 'ng', type: 'protein',
    kid: 1, spice: 2, mins: 40, kcal: 240, protein: 26, health: 4, allergens: [],
    desc: 'Party staple — tender gizzards tossed in fiery pepper sauce.',
    ing: [['gizzard', 1], ['peppers', 0.3], ['scotch_b', 0.3], ['onions', 0.2], ['veg_oil', 0.1]],
    steps: ['Boil seasoned gizzards until tender; fry until golden.', 'Toss through a quick fried pepper-onion sauce.'] },

  amala_side: { name: 'Amala', emoji: '🟤', grad: ['#5a3a1e', '#2e1b08'], cuisine: 'ng', type: 'side',
    kid: 2, spice: 0, mins: 12, kcal: 300, protein: 3, health: 3, allergens: [],
    desc: 'Smooth, dark yam-flour swallow — ogbono and ewedu’s best friend.',
    ing: [['elubo', 0.3]],
    steps: ['Whisk yam flour into boiling water; turn until smooth, dark and stretchy.'] },

  noodles_side: { name: 'Egg Noodles', emoji: '🍜', grad: ['#c9a227', '#7c5f0b'], cuisine: 'world', type: 'side',
    kid: 3, spice: 0, mins: 8, kcal: 280, protein: 9, health: 3, allergens: ['gluten', 'egg'],
    desc: 'Springy noodles with a splash of soy.',
    ing: [['noodles', 1], ['soy_sauce', 0.3]],
    steps: ['Boil 4 min, drain, toss with soy sauce.'] },

  salad_side: { name: 'Crunchy Salad', emoji: '🥗', grad: ['#3f8a3f', '#1c4f1c'], cuisine: 'world', type: 'side',
    kid: 2, spice: 0, mins: 8, kcal: 60, protein: 2, health: 5, allergens: [],
    desc: 'Lettuce, cucumber and tomato — the freshness on the side.',
    ing: [['lettuce', 1], ['cucumber', 1], ['tomatoes', 0.5]],
    steps: ['Chop everything, dress with a little oil and salt.'] },

  coleslaw_side: { name: 'Coleslaw', emoji: '🥕', grad: ['#c98f2e', '#8a570c'], cuisine: 'uk', type: 'side',
    kid: 2, spice: 0, mins: 2, kcal: 150, protein: 2, health: 3, allergens: ['egg', 'milk'],
    desc: 'Creamy slaw — jollof and suya’s cooling partner.',
    ing: [['coleslaw', 1]],
    steps: ['Spoon it out. Done.'] },

  couscous_side: { name: 'Fluffy Couscous', emoji: '🌾', grad: ['#b08a3e', '#63430e'], cuisine: 'world', type: 'side',
    kid: 2, spice: 0, mins: 8, kcal: 220, protein: 7, health: 4, allergens: ['gluten'],
    desc: 'Five-minute grains that soak up any stew.',
    ing: [['couscous', 0.4], ['stock_cubes', 0.1]],
    steps: ['Pour over hot stock, cover 5 min, fluff with a fork.'] },

  naan_side: { name: 'Warm Naan', emoji: '🫓', grad: ['#c9942a', '#7c560a'], cuisine: 'world', type: 'side',
    kid: 3, spice: 0, mins: 5, kcal: 260, protein: 7, health: 2, allergens: ['gluten', 'milk'],
    desc: 'Pillowy naan for scooping up curry.',
    ing: [['naan', 1]],
    steps: ['Warm in the oven or a dry pan; brush with butter.'] },

  garlic_bread_side: { name: 'Garlic Bread', emoji: '🥖', grad: ['#a5762e', '#63430e'], cuisine: 'uk', type: 'side',
    kid: 3, spice: 0, mins: 12, kcal: 280, protein: 6, health: 2, allergens: ['gluten', 'milk'],
    desc: 'Crispy, buttery, gone in seconds.',
    ing: [['garlic_brd', 1]],
    steps: ['Bake from frozen ~10–12 min at 200°C.'] },
};

/* ---- recommended pairings: main → sides that make sense, best first ---- */
const PAIRS = {
  egusi_soup:    ['pounded_yam', 'eba', 'white_rice'],
  efo_soup:      ['eba', 'pounded_yam', 'white_rice'],
  okra_soup:     ['eba', 'pounded_yam'],
  red_stew:      ['white_rice', 'boiled_yam', 'spag_side', 'dodo'],
  pepper_soup:   ['boiled_yam', 'white_rice'],
  ewa_beans:     ['dodo', 'bread_side', 'white_rice'],
  curry_stew:    ['white_rice', 'dodo'],
  naija_bol:     ['spag_side', 'white_rice'],
  suya:          ['chips_side', 'dodo'],
  jollof_rice:   ['dodo', 'moimoi'],
  fried_rice_ng: ['dodo', 'moimoi'],
  egg_sauce:     ['boiled_yam', 'bread_side', 'dodo'],
  akara:         ['bread_side'],
  fish_fingers_m:['chips_side', 'mash', 'dodo'],
  sausages_m:    ['mash', 'chips_side'],
  stir_fry:      ['noodles_side', 'white_rice'],
  curry_night:   ['white_rice', 'naan_side', 'couscous_side'],
  fajitas:       ['salad_side', 'coleslaw_side'],
  chilli_con:    ['white_rice', 'garlic_bread_side', 'couscous_side'],
  ogbono_soup:   ['amala_side', 'pounded_yam', 'eba'],
  edikaikong:    ['pounded_yam', 'eba', 'white_rice'],
  ayamase:       ['white_rice', 'boiled_yam'],
  banga_soup:    ['eba', 'white_rice', 'pounded_yam'],
};

/* ---- proteins that make sense with each main (best first).
   The planner picks by your preferences; swap freely on the meal card. ---- */
const PROTEIN_PAIRS = {
  jollof_rice:   ['grilled_chicken', 'fried_fish', 'peppered_turkey', 'fried_beef', 'boiled_eggs', 'peppered_gizzard'],
  fried_rice_ng: ['grilled_chicken', 'fried_fish', 'peppered_turkey', 'fried_beef', 'peppered_gizzard'],
  red_stew:      ['fried_fish', 'grilled_chicken', 'peppered_turkey', 'fried_beef', 'boiled_eggs'],
  ewa_beans:     ['fried_fish', 'boiled_eggs', 'grilled_chicken'],
  asaro:         ['grilled_chicken', 'fried_fish'],
  stir_fry:      ['grilled_chicken', 'fried_beef', 'fried_fish', 'boiled_eggs'],
  curry_night:   ['grilled_chicken', 'fried_fish', 'fried_beef'],
  fajitas:       ['grilled_chicken', 'fried_beef'],
};

/* ---- batch cooking: one big pot of the MAIN covers N meals, keeps D days ---- */
const BATCH = {
  egusi_soup:   { covers: 3, keeps: 5 },
  efo_soup:     { covers: 3, keeps: 4 },
  okra_soup:    { covers: 2, keeps: 3 },
  red_stew:     { covers: 3, keeps: 5 },
  pepper_soup:  { covers: 2, keeps: 3 },
  ewa_beans:    { covers: 2, keeps: 4 },
  curry_stew:   { covers: 2, keeps: 4 },
  naija_bol:    { covers: 2, keeps: 3 },
  jollof_rice:  { covers: 2, keeps: 3 },
  fried_rice_ng:{ covers: 2, keeps: 3 },
  moimoi:       { covers: 3, keeps: 5 },
  asaro:        { covers: 2, keeps: 3 },
  cottage:      { covers: 2, keeps: 3 },
  spagbol:      { covers: 2, keeps: 3 },
  pastabake:    { covers: 2, keeps: 2 },
  ogbono_soup:  { covers: 3, keeps: 5 },
  edikaikong:   { covers: 3, keeps: 4 },
  ayamase:      { covers: 3, keeps: 5 },
  banga_soup:   { covers: 3, keeps: 4 },
  chilli_con:   { covers: 2, keeps: 3 },
  curry_night:  { covers: 2, keeps: 3 },
  lasagne:      { covers: 2, keeps: 3 },
  fish_pie:     { covers: 2, keeps: 3 },
};

/* ---- onboarding starter picks: balanced across cuisines, grouped by USE ---- */
const ONBOARD_GROUPS = [
  { title: 'Breakfasts', ids: ['porridge', 'weetabix', 'eggybread', 'fullenglish', 'plantainpancakes', 'akara', 'egg_sauce', 'moimoi'] },
  { title: 'Quick & family dinners', ids: ['spagbol', 'pastabake', 'fishchips', 'jackets', 'fish_fingers_m', 'burgers', 'pizza_night', 'carbonara', 'tunapasta', 'fajitas', 'stir_fry'] },
  { title: 'Comfort & batch cooking', ids: ['cottage', 'roast', 'toad', 'lasagne', 'fish_pie', 'chilli_con', 'curry_night', 'katsu', 'curry_stew', 'naija_bol'] },
  { title: 'Nigerian favourites', ids: ['jollof_rice', 'egusi_soup', 'efo_soup', 'red_stew', 'ogbono_soup', 'ewa_beans', 'asaro', 'suya', 'pounded_yam', 'eba', 'amala_side', 'dodo'] },
];

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const MEALS = ['b', 'l', 'd'];
const MEAL_NAMES = { b: 'Breakfast', l: 'Lunch', d: 'Dinner' };
const CUISINE_NAMES = { ng: 'Nigerian', uk: 'British', fusion: 'Fusion' };
