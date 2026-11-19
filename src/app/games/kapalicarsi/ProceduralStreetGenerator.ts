/**
 * Kapalıçarşı — prosedürel sokak üreteci (saf; DOM ve WebGL yok; test edilir).
 *
 * NEDEN IZGARA + RASTGELE KAPSAYAN AĞAÇ + EK DÖNGÜLER?
 *   Gerçek Kapalıçarşı organik bir labirent değil, aşağı yukarı dik açılı bir ızgaradır: ortada Cevahir Bedesteni, doğu–batı
 *   doğrultusunda ana cadde (Kalpakçılar), çevresinde lonca sokakları. Bu yüzden düğümler bir ızgaraya oturur.
 *   1) Rastgele Kruskal ile kapsayan ağaç: her düğüme ulaşılabilirlik GARANTİ (oyuncu hiçbir zaman kapalı bir cebe sıkışmaz).
 *   2) Ana cadde her zaman açık: tanıdık bir omurga, kaybolunca dönülecek yer.
 *   3) Ağaca ek olarak kenarların ~%30'u rastgele açılır → döngüler: "labirent" hissi, ama çıkmaz sokak yığını değil.
 *   Tohum (seed) her girişte değişir; aynı tohum aynı çarşıyı verir (paylaşma ve test için ?seed=).
 * Dükkânlar her sokak kenarının iki yanına modüler "slot"lar olarak dizilir (3,4 m genişlik). Sokaklar lonca mantığıyla
 * adlandırılır: bir sokaktaki dükkânların çoğu aynı zanaattandır (gerçek çarşıda da sokaklar loncaların adını taşır).
 * Koordinat: metre; x doğu, −z kuzey; zemin y = 0.
 */
export type V2 = [number, number];
export type Trade = 'kuyumcu' | 'halici' | 'bakirci' | 'baharatci' | 'lambaci' | 'cinici' | 'antikaci' | 'kumasci';
export const TRADES: Trade[] = ['kuyumcu', 'halici', 'bakirci', 'baharatci', 'lambaci', 'cinici', 'antikaci', 'kumasci'];
export const TRADE_LABEL: Record<Trade, { esnaf: string; plural: string; street: string; sign: string }> = {
  kuyumcu: { esnaf: 'kuyumcu', plural: 'kuyumcular', street: 'Kuyumcular', sign: 'KUYUMCU' },
  halici: { esnaf: 'halıcı', plural: 'halıcılar', street: 'Halıcılar', sign: 'HALI · KİLİM' },
  bakirci: { esnaf: 'bakırcı', plural: 'bakırcılar', street: 'Bakırcılar', sign: 'BAKIRCI' },
  baharatci: { esnaf: 'aktar', plural: 'aktarlar', street: 'Aktarlar', sign: 'AKTAR · BAHARAT' },
  lambaci: { esnaf: 'lambacı', plural: 'lambacılar', street: 'Kandilciler', sign: 'AYDINLATMA' },
  cinici: { esnaf: 'çinici', plural: 'çiniciler', street: 'Çiniciler', sign: 'ÇİNİ · SERAMİK' },
  antikaci: { esnaf: 'antikacı', plural: 'antikacılar', street: 'Aynacılar', sign: 'ANTİKA' },
  kumasci: { esnaf: 'kumaşçı', plural: 'kumaşçılar', street: 'Yağlıkçılar', sign: 'KUMAŞ · YAĞLIK' },
};

/* ---------- tohumlu rastgele (mulberry32: hızlı, 32 bit, tekrarlanabilir) ---------- */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

/* ---------- ölçüler ---------- */
export const GRID = { cols: 8, rows: 6, cell: 13, main: 3 } as const;     // düğüm sayısı ve aralığı; ana cadde düğüm satırı
export const WIDTH = { main: 5, side: 3.6 } as const;
export const SHOP_W = 3.4, SHOP_D = 4, BODY = 0.3, VAULT_H = 6.2;
export const BEDESTEN = { i0: 3, i1: 5, j0: 1, j1: 3 } as const;           // hücre aralığı (düğüm indeksleri): ortadaki Cevahir Bedesteni

export interface Node { id: number; i: number; j: number; x: number; z: number }
export interface Edge { id: number; a: number; b: number; main: boolean; w: number; street: number; gate?: string }
export interface Street { id: number; name: string; trade: Trade; edges: number[]; axis: 'x' | 'z' }
export interface Shop { id: number; edge: number; side: 1 | -1; center: V2; door: V2; facing: number; trade: Trade; owner: string; sign: string; along: V2; normal: V2 }
export interface Esnaf { id: number; shop: number; name: string; trade: Trade; at: V2; yaw: number }
export interface Item { id: string; name: string; desc: string; trades: Trade[]; decoy: string }
export interface Layout {
  seed: number; nodes: (Node | null)[]; edges: Edge[]; streets: Street[]; shops: Shop[]; esnaf: Esnaf[];
  gates: { name: string; at: V2; out: V2 }[]; start: { at: V2; yaw: number; gate: string };
  item: Item; target: number; decoy: number; skylights: V2[]; bounds: { x0: number; x1: number; z0: number; z1: number };
}

export const ITEMS: Item[] = [
  { id: 'anahtar', name: 'antika pirinç anahtar', desc: 'Kulpunda sekiz köşeli yıldız oyması olan, avuç içi büyüklüğünde pirinç bir anahtar.', trades: ['antikaci', 'bakirci'], decoy: 'paslı demir anahtar' },
  { id: 'harita', name: 'eski İstanbul haritası', desc: 'Deri bir kılıfa sarılmış, kenarları yıpranmış rulo hâlinde bir harita.', trades: ['antikaci', 'kumasci'], decoy: 'yeni basılmış turist haritası' },
  { id: 'pusula', name: 'gümüş cep pusulası', desc: 'Kapağında lale kabartması olan, zinciri kopuk gümüş bir cep pusulası.', trades: ['kuyumcu', 'antikaci'], decoy: 'plastik oyuncak pusula' },
  { id: 'kutu', name: 'sedef kakmalı kutu', desc: 'Kapağında sedef yıldızlar olan küçük, koyu ceviz bir mücevher kutusu.', trades: ['antikaci', 'lambaci'], decoy: 'boyalı tahta kutu' },
  { id: 'tespih', name: 'kehribar tespih', desc: 'Otuz üç taneli, bal rengi, gümüş imameli bir kehribar tespih.', trades: ['kuyumcu', 'baharatci'], decoy: 'cam boncuklu tespih' },
];
const NAMES = ['Hüseyin', 'Mehmet', 'Ahmet', 'Ali', 'Hasan', 'Mustafa', 'Yusuf', 'İbrahim', 'Osman', 'Halil', 'Recep', 'Kemal', 'Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice', 'Selim', 'Nuri', 'Rıza', 'Sabri', 'Kadir', 'Arif', 'Levon', 'Agop', 'Niko', 'Davut'];
const GATE_NAMES = { bati: 'Beyazıt Kapısı', dogu: 'Nuruosmaniye Kapısı', kuzey: ['Mahmutpaşa Kapısı', 'Çuhacıhan Kapısı', 'Kürkçüler Kapısı'], guney: ['Kuyumcular Kapısı', 'Çarşıkapı', 'Mercan Kapısı'] };

const nodeId = (i: number, j: number) => j * GRID.cols + i;
const inBedesten = (cx: number, cz: number) => cx > BEDESTEN.i0 && cx < BEDESTEN.i1 && cz > BEDESTEN.j0 && cz < BEDESTEN.j1;   // hücre koordinatı

/** Ana üretici: tohum → tam çarşı düzeni */
export function generate(seed: number): Layout {
  const r = rng(seed), { cols, rows, cell } = GRID, ox = -((cols - 1) * cell) / 2, oz = -((rows - 1) * cell) / 2;
  const nodes: (Node | null)[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) nodes.push(inBedesten(i, j) ? null : { id: nodeId(i, j), i, j, x: ox + i * cell, z: oz + j * cell });
  // aday kenarlar: ızgara komşuları (bedestenin içinden geçenler hariç)
  type C = { a: number; b: number; main: boolean };
  const cand: C[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = nodeId(i, j); if (!nodes[a]) continue;
    if (i + 1 < cols && nodes[nodeId(i + 1, j)] && !inBedesten(i + 0.5, j)) cand.push({ a, b: nodeId(i + 1, j), main: j === GRID.main });
    if (j + 1 < rows && nodes[nodeId(i, j + 1)] && !inBedesten(i, j + 0.5)) cand.push({ a, b: nodeId(i, j + 1), main: false });
  }
  // rastgele Kruskal: ana cadde önce (zorunlu), sonra karışık sırayla; birleşim–bulma ile döngüsüz ağaç + ek döngüler
  const parent = nodes.map((_, k) => k), find = (k: number): number => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  const order = [...cand.filter((c) => c.main), ...cand.filter((c) => !c.main).map((c) => ({ c, k: r() })).sort((p, q) => p.k - q.k).map((p) => p.c)];
  const chosen: C[] = [];
  for (const c of order) { const fa = find(c.a), fb = find(c.b); if (fa !== fb) { parent[fa] = fb; chosen.push(c); } else if (c.main || r() < 0.3) chosen.push(c); }
  const edges: Edge[] = chosen.map((c, k) => ({ id: k, a: c.a, b: c.b, main: c.main, w: c.main ? WIDTH.main : WIDTH.side, street: -1 }));

  // sokaklar: aynı doğrultudaki ardışık kenarlar tek sokak; lonca zanaatı + ad
  const streets: Street[] = [];
  const keyOf = (e: Edge) => { const A = nodes[e.a]!, B = nodes[e.b]!; return A.j === B.j ? `x${A.j}` : `z${A.i}`; };
  const groups = new Map<string, Edge[]>(); for (const e of edges) { const k = keyOf(e); groups.set(k, [...(groups.get(k) ?? []), e]); }
  const used = new Map<Trade, number>();
  for (const [k, list] of groups) {
    list.sort((p, q) => Math.min(p.a, p.b) - Math.min(q.a, q.b));
    // ardışık parçalara böl (aradaki kenar yoksa ayrı sokak)
    let run: Edge[] = [];
    const flush = () => {
      if (!run.length) return; const main = run[0].main, trade: Trade = main ? 'kuyumcu' : pick(r, TRADES.filter((t) => t !== 'kuyumcu' || r() < 0.3));
      const n = (used.get(trade) ?? 0) + 1; used.set(trade, n);
      const name = main ? 'Kalpakçılar Caddesi' : `${TRADE_LABEL[trade].street} ${['Sokağı', 'Aralığı', 'Hanı Sokağı', 'Yolu', 'Kapısı Sokağı'][(n - 1) % 5]}${n > 5 ? ` ${Math.ceil(n / 5)}` : ''}`;
      const s: Street = { id: streets.length, name, trade, edges: run.map((e) => e.id), axis: k[0] === 'x' ? 'x' : 'z' }; streets.push(s); run.forEach((e) => (e.street = s.id)); run = [];
    };
    for (const e of list) { const last = run[run.length - 1]; if (last && Math.max(last.a, last.b) !== Math.min(e.a, e.b)) flush(); run.push(e); }
    flush();
  }

  // dükkânlar: her kenarın iki yanında, kavşaklardan uzakta, bedesten duvarına bakan yan hariç
  const shops: Shop[] = [], nodeHalf = (id: number) => Math.max(...edges.filter((e) => e.a === id || e.b === id).map((e) => e.w)) / 2;
  for (const e of edges) {
    const A = nodes[e.a]!, B = nodes[e.b]!, len = Math.hypot(B.x - A.x, B.z - A.z), d: V2 = [(B.x - A.x) / len, (B.z - A.z) / len], n: V2 = [-d[1], d[0]];
    const s0 = nodeHalf(A.id) + 0.4, s1 = len - nodeHalf(B.id) - 0.4, count = Math.floor((s1 - s0) / SHOP_W), pad = (s1 - s0 - count * SHOP_W) / 2;
    const st = streets[e.street];
    for (const side of [1, -1] as const) {
      const ci = (A.i + B.i) / 2 + (side * n[0]) / 2, cj = (A.j + B.j) / 2 + (side * n[1]) / 2;
      if (inBedesten(ci, cj)) continue;
      for (let k = 0; k < count; k++) {
        const t = s0 + pad + (k + 0.5) * SHOP_W, cx = A.x + d[0] * t, cz = A.z + d[1] * t, off = e.w / 2;
        const trade: Trade = r() < 0.78 ? st.trade : pick(r, TRADES), owner = pick(r, NAMES);
        shops.push({ id: shops.length, edge: e.id, side, center: [cx + n[0] * side * (off + SHOP_D / 2), cz + n[1] * side * (off + SHOP_D / 2)], door: [cx + n[0] * side * (off - 0.75), cz + n[1] * side * (off - 0.75)],
          facing: Math.atan2(n[0] * side, n[1] * side), trade, owner, sign: `${owner.toUpperCase()} · ${TRADE_LABEL[trade].sign}`, along: d, normal: [n[0] * side, n[1] * side] });
      }
    }
  }
  // kapılar: ana caddenin iki ucu + kuzeyde ve güneyde birer kapı (sınır düğümlerinden dışarı uzanan kısa kol)
  const gates: Layout['gates'] = [];
  const mainRow = nodes.filter((nd): nd is Node => !!nd && nd.j === GRID.main), W = mainRow[0], E = mainRow[mainRow.length - 1];
  const addGate = (nd: Node, out: V2, name: string, w: number) => { const id = edges.length; edges.push({ id, a: nd.id, b: -1, main: w === WIDTH.main, w, street: -1, gate: name }); gates.push({ name, at: [nd.x + out[0] * 7, nd.z + out[1] * 7], out }); };
  addGate(W, [-1, 0], GATE_NAMES.bati, WIDTH.main); addGate(E, [1, 0], GATE_NAMES.dogu, WIDTH.main);
  const top = nodes.filter((nd): nd is Node => !!nd && nd.j === 0 && edges.some((e) => e.a === nd.id || e.b === nd.id)), bot = nodes.filter((nd): nd is Node => !!nd && nd.j === rows - 1 && edges.some((e) => e.a === nd.id || e.b === nd.id));
  addGate(pick(r, top), [0, -1], pick(r, GATE_NAMES.kuzey), WIDTH.side); addGate(pick(r, bot), [0, 1], pick(r, GATE_NAMES.guney), WIDTH.side);
  const sg = r() < 0.5 ? gates[0] : gates[1], start = { at: [sg.at[0] - sg.out[0] * 1.5, sg.at[1] - sg.out[1] * 1.5] as V2, yaw: Math.atan2(sg.out[0], sg.out[1]), gate: sg.name };

  // esnaf: her sokakta en az bir, toplamda dükkânların ~%18'i; kapının önünde, sokağa bakar
  const esnaf: Esnaf[] = [];
  for (const st of streets) {
    const list = shops.filter((s) => st.edges.includes(s.edge)); if (!list.length) continue;
    const chosenShops = list.filter((_, k) => k === Math.floor(r() * list.length) || r() < 0.16);
    for (const s of chosenShops) esnaf.push({ id: esnaf.length, shop: s.id, name: s.owner, trade: s.trade, at: [s.door[0] - s.normal[0] * 0.35 + s.along[0] * 0.9, s.door[1] - s.normal[1] * 0.35 + s.along[1] * 0.9], yaw: Math.atan2(-s.normal[0], -s.normal[1]) + Math.PI });
  }
  // hedef ve yem: hedef, eşyanın zanaatlarından birinde ve başlangıçtan uzakta; yem başka bir yerde
  const item = pick(r, ITEMS), far = (s: Shop) => Math.hypot(s.door[0] - start.at[0], s.door[1] - start.at[1]);
  const tPool = shops.filter((s) => item.trades.includes(s.trade) && far(s) > 40);
  const target = (tPool.length ? pick(r, tPool) : shops.reduce((a, b) => (far(b) > far(a) ? b : a))).id;
  const dPool = shops.filter((s) => s.id !== target && Math.hypot(s.door[0] - shops[target].door[0], s.door[1] - shops[target].door[1]) > 30 && far(s) > 25);
  const decoy = (dPool.length ? pick(r, dPool) : shops[(target + 7) % shops.length]).id;
  // tavan açıklıkları (gün ışığı huzmeleri): her kavşağın kubbesinde bir göz + ana caddede aralıklı
  const skylights: V2[] = nodes.filter((nd): nd is Node => !!nd && edges.some((e) => e.a === nd.id || e.b === nd.id)).map((nd) => [nd.x, nd.z]);
  for (const e of edges.filter((e) => e.main && e.b >= 0)) { const A = nodes[e.a]!, B = nodes[e.b]!; skylights.push([(A.x + B.x) / 2, (A.z + B.z) / 2]); }
  return { seed, nodes, edges, streets, shops, esnaf, gates, start, item, target, decoy, skylights, bounds: { x0: ox - 12, x1: -ox + 12, z0: oz - 12, z1: -oz + 12 } };
}

/* ---------- geometri yardımcıları ---------- */
/** Bir kenarın sokak dikdörtgeni (merkez, yön, yarı uzunluk, yarı genişlik); kapı kolu dışarı uzanır */
export function edgeRect(L: Layout, e: Edge) {
  const A = L.nodes[e.a]!;
  if (e.b < 0) { const g = L.gates.find((x) => x.name === e.gate)!; const c: V2 = [(A.x + g.at[0]) / 2, (A.z + g.at[1]) / 2]; return { c, d: g.out, half: Math.hypot(g.at[0] - A.x, g.at[1] - A.z) / 2 + 1, w: e.w / 2 }; }
  const B = L.nodes[e.b]!, len = Math.hypot(B.x - A.x, B.z - A.z);
  return { c: [(A.x + B.x) / 2, (A.z + B.z) / 2] as V2, d: [(B.x - A.x) / len, (B.z - A.z) / len] as V2, half: len / 2, w: e.w / 2 };
}
/** Kavşak kareleri: her düğümde, bağlanan en geniş sokak kadar */
export function nodeSquares(L: Layout): { c: V2; h: number }[] {
  return L.nodes.filter((n): n is Node => !!n).map((n) => { const ws = L.edges.filter((e) => e.a === n.id || e.b === n.id).map((e) => e.w / 2); return ws.length ? { c: [n.x, n.z] as V2, h: Math.max(...ws) } : null; }).filter((q): q is { c: V2; h: number } => !!q);
}
const SQ = new WeakMap<Layout, { c: V2; h: number }[]>();
/** Yürünebilir: bir sokak dikdörtgeninin ya da kavşak karesinin içinde (gövde payıyla) */
export function walkable(L: Layout, x: number, z: number, pad = BODY): boolean {
  for (const e of L.edges) {
    const R = edgeRect(L, e), dx = x - R.c[0], dz = z - R.c[1];
    if (Math.abs(dx * R.d[0] + dz * R.d[1]) <= R.half && Math.abs(-dx * R.d[1] + dz * R.d[0]) <= R.w - pad) return true;
  }
  let sq = SQ.get(L); if (!sq) { sq = nodeSquares(L); SQ.set(L, sq); }
  return sq.some((q) => Math.abs(x - q.c[0]) <= q.h - pad && Math.abs(z - q.c[1]) <= q.h - pad);
}
export function slide(L: Layout, p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(L, x + dx, z)) x += dx; if (walkable(L, x, z + dz)) z += dz; return [x, z]; }
/** Kapıya en yakın dükkân (oyuncu kapının önündeyse) */
export function shopAtDoor(L: Layout, x: number, z: number, r = 1.4): Shop | null {
  let best: Shop | null = null, bd = r;
  for (const s of L.shops) { const d = Math.hypot(s.door[0] - x, s.door[1] - z); if (d < bd) { bd = d; best = s; } }
  return best;
}
export function nearestShop(L: Layout, x: number, z: number): Shop { return L.shops.reduce((a, b) => (Math.hypot(b.door[0] - x, b.door[1] - z) < Math.hypot(a.door[0] - x, a.door[1] - z) ? b : a)); }
export const nearestEsnaf = (L: Layout, x: number, z: number, r = 2.6) => L.esnaf.find((e) => Math.hypot(e.at[0] - x, e.at[1] - z) < r) ?? null;
/** Sokak adı (oyuncunun bulunduğu yer) */
export function streetAt(L: Layout, x: number, z: number): string {
  let best = '', bd = Infinity;
  for (const e of L.edges) { const R = edgeRect(L, e), dx = x - R.c[0], dz = z - R.c[1], u = Math.abs(dx * R.d[0] + dz * R.d[1]), v = Math.abs(-dx * R.d[1] + dz * R.d[0]); if (u <= R.half && v < R.w + 0.5 && v < bd) { bd = v; best = e.gate ?? L.streets[e.street]?.name ?? ''; } }
  return best;
}
/** Sekiz yönlü pusula (x doğu, −z kuzey) */
export function compass(from: V2, to: V2): string {
  const a = Math.atan2(to[0] - from[0], -(to[1] - from[1])), k = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı'][k];
}
export const distanceWord = (d: number) => (d < 18 ? 'çok yakında, birkaç adım ötede' : d < 40 ? 'birkaç sokak ötede' : 'çarşının öbür ucunda');
/** Rastgele tohum (tarayıcıda zaman + rastgele; testte sabit) */
export const freshSeed = () => (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
