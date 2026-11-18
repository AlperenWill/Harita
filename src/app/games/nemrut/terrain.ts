/**
 * Nemrut — arazi yüksekliği ve yerleşim (saf; test edilir). 1 birim = 1 m; +x doğu, −z kuzey; teras düzlemi y = 0.
 * Tümülüs: kırma taş yığını, ~50 m yükseklik, ~150 m çap (kaynaklarda 49–50 m / 150–152 m). Doğu ve batı terasları tümülüsün iki yanında.
 * Arazi stilizedir: gerçek bir sayısal yükseklik modeli kullanılmadı.
 */
export const TUMULUS = { h: 50, r: 75 } as const;
export const PLATEAU_R = 118;
export const TERRACE_X = 92;                       // heykel sırasının tümülüs merkezine uzaklığı
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x: number, z: number) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v) + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v; }
/** Sırtlı (ridged) fraktal gürültü: keskin dağ sırtları */
export function ridged(x: number, z: number, oct = 4) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < oct; i++) { s += (1 - Math.abs(noise(x * f, z * f) * 2 - 1)) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }
const sstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  // tümülüs: düz yamaçlı koni, tepesi hafif yuvarlak
  const cone = Math.max(0, TUMULUS.h * (1 - r / TUMULUS.r)), tum = cone > TUMULUS.h - 4 ? TUMULUS.h - 4 + (cone - (TUMULUS.h - 4)) * 0.5 : cone;
  // plato dışı: dik yamaçlar, sonra uzak sırtlar
  const fall = sstep(PLATEAU_R, PLATEAU_R + 220, r), rid = ridged(x * 0.004 + 3.1, z * 0.004 - 1.7);
  const slope = -fall * (150 + rid * 190);
  const far = sstep(520, 1400, r) * (rid * 260 + 40);
  const rough = sstep(PLATEAU_R - 6, PLATEAU_R + 40, r) * (noise(x * 0.05, z * 0.05) - 0.5) * 9;
  return tum + slope + far + rough;
}

/** Kaya ve çalı yerleşimi (tohumlu): tümülüs ve heykel sırası dışında, plato ve yamaçlarda */
export function scatter(count: number, seed: number, rMin: number, rMax: number): { x: number; z: number; s: number; rot: number }[] {
  let sd = seed; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); const out: { x: number; z: number; s: number; rot: number }[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 30) {
    const a = r() * Math.PI * 2, d = rMin + Math.sqrt(r()) * (rMax - rMin), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(Math.abs(x) - TERRACE_X) < 9 && Math.abs(z) < 30) continue;        // heykel sırası
    if (Math.abs(x) > TERRACE_X && Math.abs(x) < TERRACE_X + 30 && Math.abs(z) < 44) continue;   // teraslar boş
    out.push({ x, z, s: 0.5 + r() * 1.6, rot: r() * 6.28 });
  }
  return out;
}

/* ---------- heykeller ---------- */
export type Figure = 'antiochos' | 'kommagene' | 'zeus' | 'apollon' | 'herakles';
export const FIGURES: { id: Figure; name: string; text: string }[] = [
  { id: 'antiochos', name: 'Kral I. Antiochos', text: 'Kommagene kralı I. Antiochos (MÖ 69–34) bu kutsal alanı kendisi ve tanrılar için yaptırdı; heykelini tanrıların arasına yerleştirdi.' },
  { id: 'kommagene', name: 'Kommagene (Tykhe)', text: 'Krallığın bereket ve talih tanrıçası; sıradaki tek kadın figür. Başında meyve ve başaklardan bir başlık taşır.' },
  { id: 'zeus', name: 'Zeus-Oromasdes', text: 'Sıranın ortasındaki en büyük figür. Yunan Zeus’u ile Pers Ahura Mazda’sı (Oromasdes) tek bir tanrıda birleşir.' },
  { id: 'apollon', name: 'Apollon-Mithras-Helios-Hermes', text: 'Dört adı birden taşıyan ışık tanrısı; Yunan ve Pers inançlarının Kommagene’deki kaynaşmasının en açık örneği.' },
  { id: 'herakles', name: 'Herakles-Artagnes-Ares', text: 'Güç ve savaş tanrısı; sakallı başı ve omzundaki sopasıyla tanınır.' },
];
export const STATUE = { spacing: 9.2, seatH: 6.4, headH: 2.6, total: 9 } as const;   // oturan heykeller ~8–9 m
/** Bir terastaki heykel yerleri: sıra kuzey–güney doğrultusunda; yüzler tümülüsten dışarı bakar */
export function statueSpots(side: 1 | -1) {
  return FIGURES.map((f, i) => ({ ...f, x: side * TERRACE_X, z: (i - 2) * STATUE.spacing, face: side }));
}
/** Devrilmiş başın bugünkü yeri: heykelin önünde, yerde (başlar zamanla düştü; yeniden gövdelere konmadı) */
export function fallenSpot(side: 1 | -1, i: number): { x: number; z: number; tilt: number } {
  return { x: side * (TERRACE_X + 8.5 + ((i * 37) % 5) * 0.4), z: (i - 2) * STATUE.spacing + (((i * 53) % 7) - 3) * 0.5, tilt: (((i * 29) % 9) - 4) * 0.035 };
}
