/**
 * Kapadokya — balon uçuşu: arazi, rüzgâr katmanları, noktalar (saf; test edilir).
 *
 * Gerçek balon pilotluğu gibi: balonun dümeni yoktur. Pilot yalnızca yükselir (brülör) ya da alçalır (tepe kapağı);
 * farklı yükseklikte rüzgâr farklı yöne eser. Doğru katmanı seçerek gitmek istediğin yere sürüklenirsin.
 * Koordinat: metre; x doğu, z güney, y yukarı. Plan STİLİZEDİR (gerçek mesafeler kısaltılmıştır).
 */
export type V3 = [number, number, number];
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x: number, z: number) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v) + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v; }

export const BOUND = 340;
export const UCHISAR = { x: -170, z: 70, h: 62, r: 34 } as const;
/** Tüf platosu + vadiler (Güvercinlik, Kızılçukur/Güllüdere) + Uçhisar kayası */
export function heightAt(x: number, z: number): number {
  let h = 26 + (noise(x * 0.012, z * 0.012) - 0.5) * 16 + (noise(x * 0.05, z * 0.05) - 0.5) * 4;
  const v1 = Math.abs(z - 40 - 25 * Math.sin(x * 0.012)), v2 = Math.abs(x - 90 - 30 * Math.sin(z * 0.015));   // iki vadi kanalı
  h -= 22 * Math.exp(-((v1 / 38) ** 2)) + 20 * Math.exp(-((v2 / 34) ** 2));
  const ud = Math.hypot(x - UCHISAR.x, z - UCHISAR.z); h = Math.max(h, 26 + UCHISAR.h * Math.exp(-((ud / UCHISAR.r) ** 4)));   // Uçhisar kalesi
  return h;
}

/** Rüzgâr katmanları: [üst sınır (zeminden m), yön (birim xz), hız m/s] — sabah serinliğinde zayıf, yükseldikçe yön değişir */
export const LAYERS = [
  { name: 'Alçak', top: 60, dir: [1, 0] as [number, number], speed: 4.5 },          // doğuya
  { name: 'Orta', top: 140, dir: [-0.6, -0.8] as [number, number], speed: 5 },      // kuzeybatıya
  { name: 'Yüksek', top: 999, dir: [-0.3, 0.95] as [number, number], speed: 6 },    // güneye
];
export const layerAt = (agl: number) => LAYERS.findIndex((l) => agl < l.top);
/** Katman geçişleri yumuşak (±12 m) karışır; sınır dışına çıkınca merkeze doğru hafif bir geri itme */
export function wind(x: number, z: number, agl: number, t = 0): [number, number] {
  let wx = 0, wz = 0, wsum = 0;
  LAYERS.forEach((l, i) => { const lo = i ? LAYERS[i - 1].top : -999, w = Math.max(0, Math.min(1, (agl - lo + 12) / 24)) * Math.max(0, Math.min(1, (l.top - agl + 12) / 24)); wx += l.dir[0] * l.speed * w; wz += l.dir[1] * l.speed * w; wsum += w; });
  wx /= wsum || 1; wz /= wsum || 1;
  const sway = 0.12 * Math.sin(t * 0.05); const c = Math.cos(sway), s = Math.sin(sway); [wx, wz] = [wx * c - wz * s, wx * s + wz * c];
  const r = Math.hypot(x, z); if (r > BOUND) { const k = Math.min(1, (r - BOUND) / 60) * 7; wx -= (x / r) * k; wz -= (z / r) * k; }
  return [wx, wz];
}
export interface Balloon { x: number; y: number; z: number; vy: number }
/** Bir adım: brülör (+1) / kapak (−1) / bekle (0). Balon ağırdır: dikey hız hedefe yavaş yaklaşır (≈2,5 sn), zemine çarpmaz. */
export function step(b: Balloon, input: number, dt: number, t = 0): Balloon {
  const g = heightAt(b.x, b.z), agl = b.y - g, target = input > 0 ? 3.2 : input < 0 ? -3 : agl < 8 ? 0.6 : -0.25;   // beklerken yavaşça alçalır
  const vy = b.vy + (target - b.vy) * (1 - Math.exp(-dt / 2.4)), [wx, wz] = wind(b.x, b.z, agl, t);
  const groundDrag = agl < 3 ? 0.25 : 1;   // yerdeyken sürüklenmez
  let y = Math.min(g + 320, b.y + vy * dt); const ng = heightAt(b.x + wx * dt * groundDrag, b.z + wz * dt * groundDrag); y = Math.max(ng + 1.2, y);
  return { x: b.x + wx * dt * groundDrag, y, z: b.z + wz * dt * groundDrag, vy: y <= ng + 1.21 ? Math.max(0, vy) : vy };
}

/* ---------- uçuş noktaları ---------- */
export interface Spot { id: string; name: string; at: [number, number]; text: string; source: { title: string; url: string } }
const WIKI = (t: string, p: string) => ({ title: `Wikipedia — ${t}`, url: `https://tr.wikipedia.org/wiki/${p}` });
export const SPOTS: Spot[] = [
  { id: 'goreme', name: 'Göreme Açık Hava Müzesi', at: [10, -10], source: WIKI('Göreme Açık Hava Müzesi', 'G%C3%B6reme_A%C3%A7%C4%B1k_Hava_M%C3%BCzesi'),
    text: 'Yumuşak tüf kayaya oyulmuş kiliseler ve manastırlar. İçlerindeki freskler çoğunlukla Orta Bizans dönemine aittir. Alan, 1985’te “Göreme Millî Parkı ve Kapadokya Kayalık Alanları” adıyla UNESCO Dünya Mirası listesine girdi.' },
  { id: 'cavusin', name: 'Çavuşin', at: [150, -90], source: WIKI('Çavuşin', '%C3%87avu%C5%9Fin,_Avanos'),
    text: 'Kayaya oyulmuş eski köy. Yamaçtaki kaya evler ve kilise, insanların yüzyıllarca tüfün içinde nasıl yaşadığını gösterir.' },
  { id: 'pasabag', name: 'Paşabağı', at: [230, -200], source: WIKI('Paşabağları', 'Pa%C5%9Faba%C4%9Flar%C4%B1'),
    text: 'Çok başlıklı peribacalarıyla ünlü vadi. Peribacaları, yanardağ küllerinin oluşturduğu tüfün rüzgâr ve yağmurla aşınmasıyla oluşur; tepedeki daha sert kaya “şapka” alttaki tüfü korur.' },
  { id: 'guvercinlik', name: 'Güvercinlik Vadisi', at: [-60, 40], source: WIKI('Güvercinlik Vadisi', 'G%C3%BCvercinlik_Vadisi'),
    text: 'Kayalara oyulmuş yüzlerce güvercinlik. Köylüler güvercin gübresini bağ ve bahçelerinde gübre olarak kullanırdı.' },
  { id: 'uchisar', name: 'Uçhisar Kalesi', at: [UCHISAR.x, UCHISAR.z], source: WIKI('Uçhisar Kalesi', 'U%C3%A7hisar_Kalesi'),
    text: 'Bölgenin en yüksek noktalarından biri olan, içi oyulmuş dev kaya. Odaları ve tünelleriyle bir zamanlar kale ve sığınak olarak kullanıldı.' },
];
export const START: Balloon = { x: 40, y: heightAt(40, 150) + 1.2, z: 150, vy: 0 };
/** Bir noktanın "görüldü" sayılması: yatayda 55 m içinde ve zeminden 170 m'den alçakta */
export function nearSpot(b: Balloon): Spot | null { for (const s of SPOTS) if (Math.hypot(b.x - s.at[0], b.z - s.at[1]) < 55 && b.y - heightAt(b.x, b.z) < 170) return s; return null; }
