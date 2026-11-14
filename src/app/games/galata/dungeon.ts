/**
 * Galata Kulesi — zindan katı: yerleşim ve fener tespiti (saf; test edilir).
 *
 * Neden bu mekanik: 16. yüzyılda kulenin zindan olarak kullanıldığı biliniyor; giriş katını karanlık bir
 * mekân olarak kurgulayıp tek ışık kaynağı olarak el feneri vermek, oyuncuyu yavaş ve dikkatli bakmaya
 * zorlar. Armalar yalnızca fenerin konisi içinde görünür; feneri bir armanın üzerinde kısa süre tutmak onu bulur.
 * Not: Duvardaki armalar kurgusaldır (Ceneviz dönemini anlatan stilize işaretler); kulenin içinde bu
 * konumlarda arma bulunduğu iddia edilmez.
 */
export type V3 = [number, number, number];

/** Kule ölçüleri (yaklaşık; bkz. README "doğrulanamayanlar") */
export const TOWER = { outerR: 8.2, wall: 3.75, height: 66.9, terraceY: 51.65 } as const;
export const INNER_R = TOWER.outerR - TOWER.wall;   // ≈ 4.45 m

/** Zindan: kulenin altında, tonozlu ve dikdörtgene yakın bir geçit (oyunda kurgulanmış) */
export const DUNGEON = { len: 14, wid: 6, h: 4.2, eye: 1.6 } as const;
/** Kamera yalnızca geçidin ekseninde ileri/geri gider */
export const WALK_Z: [number, number] = [DUNGEON.len / 2 - 1.2, -DUNGEON.len / 2 + 2.2];

export interface Crest { id: string; name: string; text: string; pos: V3; normal: V3 }
export const CRESTS: Crest[] = [
  { id: 'haç', name: 'Kırmızı haçlı kalkan', pos: [-DUNGEON.wid / 2 + 0.02, 2.3, 2.4], normal: [1, 0, 0],
    text: 'Beyaz zemin üzerine kırmızı haç Cenova’nın simgesiydi. Galata 13.–15. yüzyıllarda bir Ceneviz kolonisiydi; kule 1348’de bu koloninin surlarının parçası olarak yapıldı.' },
  { id: 'kule', name: 'Kule işaretli kalkan', pos: [DUNGEON.wid / 2 - 0.02, 1.7, -1.6], normal: [-1, 0, 0],
    text: 'Cenevizliler yapıya “Christea Turris” (İsa Kulesi) adını verdi. Kule, daha önceki bir Bizans kulesinin yerine gözetleme ve savunma için inşa edildi.' },
  { id: 'gemi', name: 'Gemi işaretli kalkan', pos: [0.9, 2.6, -DUNGEON.len / 2 + 0.02], normal: [0, 0, 1],
    text: 'Galata’nın gücü denizden geliyordu: liman, Haliç ve Boğaz ticareti. 16. yüzyılda ise kule, Kasımpaşa tersanesinde çalıştırılan esirler için zindan olarak kullanıldı.' },
];
export const FIND_SECONDS = 1.2;
export const BEAM_HALF_ANGLE = 0.2;   // rad (~11,5°): fenerin koni yarı açısı

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);

/** Arma fenerin konisi içinde mi ve yeterince yakın mı? (yön birim vektör olmalı) */
export function inBeam(eye: V3, dir: V3, target: V3, half = BEAM_HALF_ANGLE, range = 13): boolean {
  const d = sub(target, eye), l = len(d);
  if (l > range || l < 0.3) return false;
  return dot(d, dir) / l >= Math.cos(half);
}

/** Feneri armaların üzerinde tutma süresini işler; yeni bulunanları döndürür */
export function trackBeam(hold: Record<string, number>, found: string[], eye: V3, dir: V3, dt: number): { hold: Record<string, number>; newly: string[] } {
  const next: Record<string, number> = {}, newly: string[] = [];
  for (const c of CRESTS) {
    if (found.includes(c.id)) continue;
    const t = inBeam(eye, dir, c.pos) ? (hold[c.id] ?? 0) + dt : Math.max(0, (hold[c.id] ?? 0) - dt * 2);
    if (t >= FIND_SECONDS) newly.push(c.id); else if (t > 0) next[c.id] = t;
  }
  return { hold: next, newly };
}
