/**
 * Şırnak Cizre — Kırmızı Medrese (Medreseya Sor): "Tuğla Tuğla" (kısa oyun). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Ortada avlu; kuzeyde kubbeli cami, doğu ve batıda öğrenci odaları, batıda türbe, güneyde giriş.
 * Duvarların altı taş, üstü kırmızı tuğla. Mekanik: medrese 1847'den sonra harabeye döndü ve 2020'de başlayan onarımla yeniden açıldı.
 * Avludaki üç tuğla panoda eksik tuğlalar var; her eksik tuğlanın yönünü, panonun örgü desenine bakarak seç. Desenler TEMSİLÎDİR.
 */
export type V2 = [number, number];
export type Dir = '—' | '|' | '/' | '\\';
export const DIRS: Dir[] = ['—', '|', '/', '\\'];
export interface Patch { id: string; name: string; rule: string; at: V2; face: [number, number, number]; rotY: number; cols: number; rows: number; missing: [number, number][]; orient: (c: number, r: number) => Dir }
export const COURT = { x0: -10, x1: 10, z0: -8, z1: 8 };
export const WALL_H = 7.5, STONE_H = 2.6;
export const PATCHES: Patch[] = [
  { id: 'balik', name: 'Balıksırtı örgü', rule: 'Sütunlar sırayla bir sağa, bir sola eğik.', at: [-8.2, -2], face: [COURT.x0, 3.6, -2], rotY: Math.PI / 2, cols: 6, rows: 4, missing: [[1, 1], [4, 2], [2, 3]],
    orient: (c) => (c % 2 ? '/' : '\\') },
  { id: 'dama', name: 'Dama örgü', rule: 'Yatay ve dikey tuğlalar dama tahtası gibi sıralanır.', at: [8.2, 2], face: [COURT.x1, 3.6, 2], rotY: -Math.PI / 2, cols: 6, rows: 4, missing: [[0, 0], [3, 1], [5, 3]],
    orient: (c, r) => ((c + r) % 2 ? '|' : '—') },
  { id: 'zikzak', name: 'Zikzak bant', rule: 'Her sıra bir öncekinin tersine eğilir; yatay bir şerit sırayı böler.', at: [5.5, -6.2], face: [5.5, 3.6, COURT.z0], rotY: 0, cols: 6, rows: 4, missing: [[2, 0], [4, 1], [1, 3]],
    orient: (_c, r) => (r === 2 ? '—' : r % 2 ? '/' : '\\') },
];
export const patchSolved = (p: Patch, picks: Record<string, Dir>) => p.missing.every(([c, r]) => picks[`${p.id}:${c}:${r}`] === p.orient(c, r));
export const PATCH_REACH = 2.4;
export function nearestPatch(x: number, z: number): Patch | null { let b: Patch | null = null, bd = PATCH_REACH; for (const p of PATCHES) { const d = Math.hypot(p.at[0] - x, p.at[1] - z); if (d < bd) { bd = d; b = p; } } return b; }

/* ===================== yürüyüş ===================== */
export const GATE = { w: 3, z0: COURT.z1, z1: COURT.z1 + 2.4 };
export const PLAZA = { x0: -22, x1: 22, z0: GATE.z1, z1: 26 };
export const BOUNDS = { x0: -24, x1: 24, z0: -12, z1: 28 };
const SHELL = { x0: COURT.x0 - 6, x1: COURT.x1 + 6, z0: COURT.z0 - 8, z1: COURT.z1 + 2.4 };
export function walkable(x: number, z: number): boolean {
  const m = 0.35;
  if (x > COURT.x0 + m && x < COURT.x1 - m && z > COURT.z0 + m && z < COURT.z1 + 0.2) return true;
  if (Math.abs(x) < GATE.w / 2 - m && z >= COURT.z1 - 0.2 && z <= GATE.z1 + 0.4) return true;
  if (x > PLAZA.x0 + 1 && x < PLAZA.x1 - 1 && z > PLAZA.z0 + m && z < PLAZA.z1 - 1) return !(x > SHELL.x0 - m && x < SHELL.x1 + m && z < SHELL.z1 + m);
  return false;
}
export const groundY = () => 0;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }
export const SHELL_RECT = SHELL;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  kure: { title: 'Küre Ansiklopedisi — Kırmızı Medrese', url: 'https://kureansiklopedi.com/tr/detay/kirmizi-medrese-8bfcc' },
  artuklu: { title: 'Mardin Artuklu Üniversitesi — Cizre Kırmızı Medrese: mimari, iktidar ve tarih', url: 'https://gcris.artuklu.edu.tr/entities/publication/06f6d23a-4248-4f47-a7c6-95ee071710f7' },
  rudaw: { title: 'Rudaw — Cizre Kırmızı Medrese', url: 'https://rudaw.net/turkish/middleeast/turkey/1211202314' },
  bengu: { title: 'Bengütürk — Cizre restore edilen tarihi yapılarıyla ziyaretçilerini bekliyor', url: 'https://www.benguturk.com/kultur-sanat/cizre-restore-edilen-tarihi-yapilariyla-ziyaretcilerini-bekliyor-110855h' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 2.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('medrese', 'Kırmızı Medrese', 'Medrese', [0, 18], [0, WALL_H + 1.5, COURT.z1 + 2.5],
    'Halk arasında Medreseya Sor, yani Kırmızı Medrese diye anılır; adını kırmızı tuğlalarından alır. Yapımı çoğunlukla Cizre Beyi II. Şeref Han\'a bağlanır; tarihi kaynaklarda 1508 olarak verilse de 14. ya da 15. yüzyıl diyenler de vardır.', SRC.kure, 3.2),
  mk('cami', 'Cami ve kubbe', 'Külliye', [-4, -5.4], [0, 3.6, COURT.z0 - 0.1],
    'Medrese bir külliyedir: avlunun çevresinde cami, öğrencilerin kaldığı ve ders gördüğü bölümler ile yönetim bölümleri bulunur. (Oyundaki oda düzeni ve kubbe ölçüsü temsilîdir.)', SRC.artuklu),
  mk('turbe', 'Türbe', 'Külliye', [-7.5, 5], [COURT.x0 - 0.1, 3, 5],
    'Külliyede bir türbe de vardır. Yerel kaynaklar, Kürt şair Melayê Cizîrî\'nin burada medfun olduğunu anlatır.', SRC.rudaw),
  mk('onarim', 'Harabeden yeniden', 'Onarım', [6.5, 6], [COURT.x1 - 2, 5.5, COURT.z1 - 0.2],
    'Cizre Beyliği 1847\'de kaldırılınca medrese bakımsız kalıp harabeye döndü. Kültür ve Turizm Bakanlığı\'nın 2020\'de başlattığı onarımdan yaklaşık iki buçuk yıl sonra yeniden açıldı.', SRC.bengu),
];
export const CARD_DONE = { id: 'tugla', name: 'Tuğla tuğla', kicker: 'Onarım · 2020–2022',
  text: 'Eksik tuğlaları örgü desenine uyarak yerine koydun. Yapıda kırmızı tuğla, moloz taş ve kesme taş birlikte kullanılmıştır; gerçek onarım yaklaşık iki buçuk yıl sürdü. (Oyundaki örgü desenleri temsilîdir; medresenin gerçek tuğla bezemesi değildir.)', source: SRC.bengu };
export const START: { at: V2; yaw: number } = { at: [0, 23], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
