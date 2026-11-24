/**
 * Hasankeyf — "Türbeyi Taşı". Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Dicle x boyunca akar (z 0…60). Güney yakada kayalık, mağaralar ve kale; aşağıda El Rızk minaresi.
 * Kuzey yakada düzlük, Zeynel Bey Türbesi ve yokuşla yükselen yol; yolun ucunda yayla üstünde Kültür Park. Köprünün yıkık ayakları
 * nehrin içinde. Uzaklıklar çok kısaltılmıştır (gerçekte türbe yaklaşık 2 km taşındı). Ölçüler ve yerler TEMSİLÎDİR (docs/HASANKEYF.md).
 *
 * Mekanik: türbe tekerlekli taşıyıcı platformun (SPMT) üstündedir; oyuncu platformu yol boyunca sürer. Yokuşta hızlı gidilirse sarsıntı
 * artar; dolarsa platform durur. Parka varınca türbe yerine konur. Sonra baraj gölü yükselir: aşağı kent ve köprü ayakları su altında kalır.
 */
export type V2 = [number, number];
export const RIVER = { z0: 0, z1: 60, y: -2 };
/** Baraj gölünün oyundaki son seviyesi (temsilî) */
export const LAKE_Y = 22;
export const PLATEAU_Y = 32;
/** Kuzey yakada arazi: kıyıda düz, kuzeye doğru yükselen yamaç, yukarıda yayla */
export function terrainY(x: number, z: number): number {
  if (z > -3) return Math.max(RIVER.y - 1.5, -(z + 3) * 0.9);   // kıyı şeridi suya iner
  const t = Math.min(1, Math.max(0, (-z - 90) / 150)), s = t * t * (3 - 2 * t);
  return s * PLATEAU_Y + Math.sin(x * 0.03) * 0.6 * s * (1 - s) * 4;
}
/** Taşıma yolu (kırık çizgi) ve genişliği */
export const ROAD: V2[] = [[50, -25], [44, -70], [18, -110], [-18, -150], [-44, -200], [-40, -245], [-30, -282]];
export const ROAD_W = 14;
export const TOMB0: V2 = [50, -25];
export const PARK = { at: [-30, -290] as V2, r: 26 };
export const PAD: V2 = [-30, -290];
export const TOMB_R = 4.2;
/** Yolun en yakın noktası: uzaklık, yol boyunca konum (m) ve o noktadaki yön */
export function nearestOnRoad(x: number, z: number): { d: number; s: number; dir: V2 } {
  let best = { d: Infinity, s: 0, dir: [0, -1] as V2 }, acc = 0;
  for (let i = 0; i < ROAD.length - 1; i++) { const [ax, az] = ROAD[i], [bx, bz] = ROAD[i + 1], vx = bx - ax, vz = bz - az, L = Math.hypot(vx, vz);
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (L * L))), px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { d, s: acc + t * L, dir: [vx / L, vz / L] }; acc += L; }
  return best;
}
export const ROAD_LEN = ROAD.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - ROAD[i][0], p[1] - ROAD[i][1]), 0);
/** Platform yolda kalmalı (kenarlarda 1,5 m pay) */
export const onRoad = (x: number, z: number) => nearestOnRoad(x, z).d < ROAD_W / 2 - 1.5 || Math.hypot(x - PAD[0], z - PAD[1]) < 9;
/** Sarsıntı: yokuş arttıkça güvenli hız düşer (m/s) */
export const safeSpeed = (slope: number) => Math.max(0.8, 3.2 - Math.abs(slope) * 14);
export const MAX_SPEED = 3.4;

/* ===================== yürüyüş ===================== */
export const BOUNDS = { x0: -150, x1: 150, z0: -330, z1: 0 };
/** Yürünebilir: kuzey yaka (su seviyesinin üstünde), türbenin kendisi hariç */
export function walkable(x: number, z: number, water = RIVER.y, tomb: V2 = TOMB0): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > -2.4) return false;
  if (terrainY(x, z) < water + 0.3) return false;
  if (Math.hypot(x - tomb[0], z - tomb[1]) < TOMB_R + 0.5) return false;
  return true;
}
export const groundY = (x: number, z: number) => terrainY(x, z);
export function slide(p: V2, dx: number, dz: number, water = RIVER.y, tomb: V2 = TOMB0): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z, water, tomb)) x += dx;
  if (walkable(x, z + dz, water, tomb)) z += dz;
  return [x, z];
}

/* ===================== güney yaka (görünür) ===================== */
export const CLIFF = { z: 76, top: 58 };
export const BRIDGE = { x: -72, piers: [10, 30, 50], arch: [30, 50] as [number, number] };
export const MINARET: V2 = [-14, 64.5];

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  kopru: { title: 'Wikipedia — Old Bridge, Hasankeyf', url: 'https://en.wikipedia.org/wiki/Old_Bridge,_Hasankeyf' },
  columbia: { title: 'Columbia MCID — Mapping Mesopotamian Monuments: Hasankeyf', url: 'https://mcid.mcah.columbia.edu/mapping-mesopotamian-monuments/hasankeyf' },
  natgeo: { title: 'National Geographic — Turkey flooding, dams, displaced antiquities', url: 'https://www.nationalgeographic.com/magazine/article/turkey-flooding-dams-displaced-antiquities-mesopotamia' },
  rizk: { title: 'CNN Türk — Hasankeyf\'teki son eser Er-Rızk Camisi taşınıyor', url: 'https://cnnturk.com/turkiye/hasankeyfteki-son-eser-er-rizk-camisi-tasiniyor-1462068' },
  turbe: { title: 'Habertürk — Hasankeyf\'te 552 yıllık Zeynel Bey Türbesi', url: 'https://www.haberturk.com/hasankeyf-te-552-yillik-zeynel-bey-turbesi-turistlerin-ugrak-noktalarindan-3837248' },
  tasima: { title: 'CNN Türk — Tarihi türbe 2 kilometre taşınacak (SPMT)', url: 'https://cnnturk.com/turkiye/tarihi-turbe-2-kilometre-tasinacak-595781' },
  bakan: { title: 'CNN Türk — Bakandan Hasankeyf tarihi eserleri hakkında açıklama', url: 'https://cnnturk.com/turkiye/bakandan-hasankeyf-tarihi-eserleri-hakkinda-onemli-aciklama-651734' },
  npr: { title: 'NPR — Turkish valley home to human settlements for millennia soon will be a lake', url: 'https://www.npr.org/2019/12/01/783932621/turkish-valley-home-to-human-settlements-for-millenia-soon-will-be-a-lake' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('turbe', 'Zeynel Bey Türbesi', 'Türbe', [50, -15], [50, 14, -25],
    'Akkoyunlu hükümdarı Uzun Hasan, 1473\'teki Otlukbeli Savaşı\'nda ölen oğlu Zeynel Bey için bu türbeyi yaptırdı. Dıştan silindirik görünen yapı içten sekizgendir; Orta Asya geleneğini taşıyan bu biçimiyle Anadolu\'da tek örnek sayılır.', SRC.turbe),
  mk('kopru', 'Eski Köprü', 'Köprü', [BRIDGE.x, -7], [BRIDGE.x, 14, 30],
    'Dicle\'nin üstündeki dört kemerli köprüyü Artuklu hükümdarı Fahreddin Kara Arslan yaptırdı. Yüzyıllardır yalnızca yıkık ayakları ve bir kemeri ayakta kalmıştı; ayaklardan ikisi nehrin içindeydi.', SRC.kopru),
  mk('minare', 'El Rızk Camii minaresi', 'Minare', [-14, -7], [MINARET[0], 30, MINARET[1]],
    'Dicle kıyısındaki El Rızk Camii\'nin yaklaşık 600 yıllık minaresi Hasankeyf\'in simgelerindendi. Baraj gölü suları altında kalmasın diye minare bütün olarak taşındı; ardından caminin gövdesi de yeni Kültür Park\'a götürüldü.', SRC.rizk),
  mk('kale', 'Kale ve mağaralar', 'Kayalık', [16, -7], [16, 40, CLIFF.z],
    'Dicle\'nin güneyindeki kalker kayalıkların tepesinde kale, yamaçlarında ise kayaya oyulmuş mağara konutlar vardır. Kaynaklar bu oyma mekânların sayısını 5.000 ile 7.000 arasında verir; bir kısmı yakın zamana kadar depo ya da konut olarak kullanıldı.', SRC.natgeo),
  mk('park', 'Kültür Park', 'Yeni yer', [PARK.at[0] + 14, PARK.at[1] + 10], [PARK.at[0] + 10, PLATEAU_Y + 3, PARK.at[1] + 4],
    'Baraj suları yükselmeden önce Hasankeyf\'in yapılarından bir bölümü, kentin kuzeyinde yüksekte kurulan Kültür Park\'a taşındı: Zeynel Bey Türbesi, Artuklu Hamamı, İmam Abdullah Zaviyesi\'nin türbe bölümü ve minaresi, kalenin Orta Kapısı ve El Rızk Camii bunlar arasındadır.', SRC.bakan, 7),
];
export const CARD_TASIMA = { id: 'tasima', name: 'Türbe yerine kondu', kicker: 'Taşıma · 2017',
  text: 'Zeynel Bey Türbesi 2017\'de, tekerlekli modüler bir taşıyıcı platformun (SPMT) üstüne konarak yaklaşık 2 km uzaklıktaki Kültür Park\'a taşındı. Taşınan yükün yaklaşık 1.100–1.150 ton olduğu bildirildi; bu yöntem Türkiye\'de bir yapıda ilk kez uygulandı. (Oyunda yol çok kısaltıldı.)', source: SRC.tasima };
export const CARD_BARAJ = { id: 'baraj', name: 'Su altındaki kent', kicker: 'Ilısu Barajı · 2019–2020',
  text: 'Ilısu Barajı\'nın göl alanı 2019–2020\'de dolunca Hasankeyf\'in aşağı kenti, Eski Köprü\'nün ayakları ve kıyıdaki yapıların çoğu su altında kaldı. Yeni Hasankeyf yukarıda kuruldu; kayalığın üst kısmı ve kale suyun üstünde kaldı. (Oyundaki su seviyesi temsilîdir; kaynaklar dolma tarihini 2019 ya da 2020 olarak verir.)', source: SRC.npr };
export const START: { at: V2; yaw: number } = { at: [30, -12], yaw: -2.6 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
/** Taşımayı başlatma noktası (türbenin yanında) */
export const DRIVE_AT: V2 = [50, -33];
