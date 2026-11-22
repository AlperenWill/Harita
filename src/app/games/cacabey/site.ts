/**
 * Cacabey Medresesi (Kırşehir) — "Göğe Açılan Kubbe": meydan, taçkapı, giriş holü, aydınlık fenerli kubbeli orta avlu ve altındaki kuyu-havuz,
 * kuzey eyvanı, yan odalar, kuzeybatı köşesinde minare ve 7 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (meydan, taçkapı), −z kuzey (eyvan). Oyuncu meydanda dolaşır, taçkapıdan girer, kubbenin altında kuyunun çevresinde
 * yürür, eyvana geçer. Ölçüler ve iç düzen TEMSİLÎDİR (docs/CACABEY.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

export const GROUND = 0, FLOOR = 0.22;   // eşik: bir basamak
/** Yapının dış sınırı */
export const BUILDING = { x0: -15, x1: 15, z0: -15, z1: 14 };
/** İç bölümler: giriş holü (taçkapının arkası), kubbeli orta avlu, kuzey eyvanı */
export const ZONES = {
  hol: { x0: -2.4, x1: 2.4, z0: 7.6, z1: 13.4 },
  avlu: { x0: -7, x1: 7, z0: -7, z1: 7 },
  eyvan: { x0: -4, x1: 4, z0: -13.6, z1: -7 },
};
/** Kubbe ve aydınlık feneri; altında kuyu-havuz */
export const DOME = { r: 7, base: FLOOR + 8.4, oculus: 1.3 };
export const WELL = { c: [0, 0] as V2, r: 1.5 };
/** Kuzeybatı köşesindeki silindirik minare */
export const MINARET = { c: [-15.5, -15.5] as V2, r: 1.8, h: 23 };
/** Yan odaların kapıları (avlunun doğu ve batı duvarında; içeri girilmez) */
export const CELL_DOORS: V2[] = [[-7, -4], [-7, 0], [-7, 4], [7, -4], [7, 0], [7, 4]];
/** Meydan (dış dolaşım alanı) */
export const SQUARE = { x0: -40, x1: 40, z0: -26, z1: 44 };

const DOOR = 1.5;
function inside(x: number, z: number): boolean {
  const Z = ZONES, m = 0.3;
  if (inR(Z.hol, x, z, m) || inR(Z.eyvan, x, z, m)) return true;
  if (inR(Z.avlu, x, z, m)) return Math.hypot(x - WELL.c[0], z - WELL.c[1]) > WELL.r + 0.45;
  if (Math.abs(x) < DOOR - 0.2 && z >= Z.avlu.z1 - m && z <= Z.hol.z0 + m) return true;   // hol → avlu kapısı
  if (Math.abs(x) < DOOR + 0.6 && z >= Z.hol.z1 - m && z <= BUILDING.z1 + 0.8) return true;   // taçkapı geçidi
  if (Math.abs(x) < 3.6 && z >= Z.eyvan.z1 - m && z <= Z.avlu.z0 + m) return true;   // eyvan kemeri (avluya açık)
  return false;
}
export const inBuilding = (x: number, z: number, m = 0) => inR(BUILDING, x, z, -m);
export function walkable(x: number, z: number): boolean {
  if (inBuilding(x, z, 0.4)) return inside(x, z);
  if (Math.hypot(x - MINARET.c[0], z - MINARET.c[1]) < MINARET.r + 0.8) return false;
  return inR(SQUARE, x, z, 1);
}
export function groundY(x: number, z: number): number { return inBuilding(x, z, 0.4) && inside(x, z) ? FLOOR : GROUND; }
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  tdv: { title: 'TDV İslâm Ansiklopedisi — Caca Bey Medresesi', url: 'https://islamansiklopedisi.org.tr/caca-bey-medresesi' },
  wiki: { title: 'Wikipedia — Cacabey Madrasa', url: 'https://en.wikipedia.org/wiki/Cacabey_Madrasa' },
  kure: { title: 'Küre Ansiklopedisi — Cacabey ve Gökbilim Medresesi', url: 'https://kureansiklopedi.com/tr/detay/cacabey-ve-gokbilim-medresesi-2581b' },
  istiklal: { title: 'İstiklal — İlk astronomi mektebi Kırşehir Cacabey Medresesi\'nin sırrı', url: 'https://www.istiklal.com.tr/islam/ilk-astronomi-mektebi-kirsehir-cacabey-medresesinin-sirri-1090605h' },
  archnet: { title: 'Archnet — Cacabey Madrasa', url: 'https://archnet.org/sites/2047' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.2): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('tackapi', 'Taçkapı ve yazıt', 'Giriş', [0, 19], [0, 9.2, 14.6],
    'Taçkapıdaki yazıta göre medrese hicrî 671 (1272–73) yılında, Sultan III. Gıyaseddin Keyhüsrev döneminde Kırşehir valisi Nûreddin Cebrâil bin Caca tarafından yaptırıldı. (Bazı kaynaklar 1271–72 verir.)', SRC.tdv),
  mk('vakfiye', 'İki dilli vakfiye', 'Belge', [0, 10.5], [-2.3, 2.4, 10.5],
    'Medresenin 10 Mayıs 1272 tarihli vakfiyesi Arapça ve Moğolca yazılmıştır. Vakfiye, medresenin gelirlerini ve nasıl işletileceğini belirler.', SRC.tdv),
  mk('kubbe', 'Aydınlık feneri', 'Kubbe', [3.6, 3.6], [0, DOME.base + 3, 0],
    'Orta avluyu örten kubbenin tepesinde gökyüzüne açılan bir aydınlık feneri vardır. Kubbenin açıklığından giren ışık ve gökyüzü görüntüsü doğrudan aşağıdaki kuyuya düşer.', SRC.istiklal),
  mk('kuyu', 'Kuyu ve havuz', 'Gözlem', [0, -3.4], [0, 1.6, 0],
    'Avludaki kuyu, medresenin gökbilim çalışmalarında merkezî bir yere sahipti: kubbedeki açıklıktan görünen gökyüzü kuyunun suyuna yansırdı. Gözlemlerin vakit belirleme, takvim hesapları ve kıble tayini için kullanıldığı aktarılır.', SRC.kure),
  mk('eyvan', 'Eyvan ve odalar', 'Medrese', [0, -9.5], [0, 5.4, -13.4],
    'Kapalı avlulu medresenin karşı yüzünde büyük bir eyvan, iki yanda öğrencilerin kaldığı odalar yer alır. Dersler eyvanda ve avluda yapılırdı.', SRC.archnet),
  mk('minare', 'Köşedeki kule', 'Minare', [-12, -19], [MINARET.c[0], 12, MINARET.c[1]],
    'Yapının kuzeybatı köşesinde silindirik bir kule yükselir. Kaynaklar bunu kimi zaman minare, kimi zaman gözlem kulesi olarak anar; işlevi konusunda görüşler ayrılır.', SRC.kure),
  mk('sonra', 'Cephanelikten camiye', 'Bugün', [10, 18], [10, 6, 14.4],
    '19. yüzyılda bir gezgin yapının cephanelik olarak kullanıldığını yazdı; sonraları kısmen camiye dönüştürüldü. Bugün cami olarak kullanılıyor ve ziyarete açık. Bazı yayınlardaki "dünyanın ilk astronomi okulu" nitelemesi tanıtım dilidir; akademik olarak kanıtlanmış değildir.', SRC.wiki),
];
export const START: { at: V2; yaw: number } = { at: [6, 38], yaw: 0.15 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -42, x1: 42, z0: -28, z1: 46 };
