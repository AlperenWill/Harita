/**
 * Prosedürel taş dokusu (1024×1024) ve ondan türetilen normal haritası — dosya yok, 0 bayt indirme.
 * Kule gövdesi kaba yontu taş sıralarından oluşur; doku bu sıraları ve taşların yüzey pürüzünü taklit eder.
 */
import * as THREE from 'three';

let cache: { map: THREE.CanvasTexture; normal: THREE.CanvasTexture } | null = null;

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function stoneTextures(size = 1024) {
  if (cache) return cache;
  const r = rng(11);
  const col = document.createElement('canvas'), hei = document.createElement('canvas');
  col.width = col.height = hei.width = hei.height = size;
  const c = col.getContext('2d')!, h = hei.getContext('2d')!;
  c.fillStyle = '#8f8576'; c.fillRect(0, 0, size, size);
  h.fillStyle = '#202020'; h.fillRect(0, 0, size, size);         // derz: alçak
  const rows = 12, rh = size / rows;
  for (let y = 0; y < rows; y++) {
    let x = -r() * 80;
    while (x < size) {
      const w = 70 + r() * 120, g = 4;
      const tone = 150 + (r() - 0.5) * 36, warm = r() * 14;
      c.fillStyle = `rgb(${tone + warm},${tone + warm * 0.6 - 4},${tone - 14})`;
      c.fillRect(x + g, y * rh + g, w - g * 2, rh - g * 2);
      // taş yüzeyi: ortası biraz kabarık, kenarları yuvarlatılmış
      const grd = h.createRadialGradient(x + w / 2, y * rh + rh / 2, 4, x + w / 2, y * rh + rh / 2, Math.max(w, rh) * 0.7);
      grd.addColorStop(0, '#d8d8d8'); grd.addColorStop(1, '#8a8a8a');
      h.fillStyle = grd; h.fillRect(x + g, y * rh + g, w - g * 2, rh - g * 2);
      // dikiş yerinde yatay sarmalama için taşı diğer kenara da çiz
      if (x + w > size) { c.fillRect(x + g - size, y * rh + g, w - g * 2, rh - g * 2); h.fillRect(x + g - size, y * rh + g, w - g * 2, rh - g * 2); }
      x += w;
    }
  }
  // pürüz ve leke
  for (let i = 0; i < 26000; i++) {
    const x = r() * size, y = r() * size, a = r() * 0.12;
    c.fillStyle = r() < 0.5 ? `rgba(40,34,28,${a})` : `rgba(235,225,205,${a})`; c.fillRect(x, y, 2, 2);
    h.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.12)'; h.fillRect(x, y, 2, 2);
  }
  // yükseklik → normal (Sobel)
  const src = h.getImageData(0, 0, size, size).data, out = c.createImageData(size, size), o = out.data;
  const H = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  const k = 2.2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * k;
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    o[i] = ((-dx / l) * 0.5 + 0.5) * 255; o[i + 1] = ((dy / l) * 0.5 + 0.5) * 255; o[i + 2] = ((1 / l) * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  const nc = document.createElement('canvas'); nc.width = nc.height = size; nc.getContext('2d')!.putImageData(out, 0, 0);
  const map = new THREE.CanvasTexture(col), normal = new THREE.CanvasTexture(nc);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return (cache = { map, normal });
}

/** Stilize arma çizimi (kurgusal; bkz. dungeon.ts) */
export function crestTexture(id: string): THREE.CanvasTexture {
  const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#6f6556'; g.fillRect(0, 0, s, s);
  const shield = new Path2D('M40 30 H216 V120 C216 190 160 222 128 236 C96 222 40 190 40 120 Z');
  g.fillStyle = '#e9e1cf'; g.fill(shield); g.lineWidth = 8; g.strokeStyle = '#3a3128'; g.stroke(shield);
  g.save(); g.clip(shield);
  g.fillStyle = '#b3261e';
  if (id === 'haç') { g.fillRect(108, 20, 40, 230); g.fillRect(30, 92, 200, 40); }
  if (id === 'kule') { g.fillRect(100, 80, 56, 130); g.beginPath(); g.moveTo(92, 82); g.lineTo(128, 40); g.lineTo(164, 82); g.fill(); g.fillStyle = '#e9e1cf'; g.fillRect(120, 110, 16, 26); }
  if (id === 'gemi') { g.beginPath(); g.moveTo(60, 160); g.lineTo(196, 160); g.lineTo(172, 196); g.lineTo(84, 196); g.fill(); g.fillRect(124, 60, 8, 100); g.beginPath(); g.moveTo(134, 66); g.lineTo(184, 140); g.lineTo(134, 140); g.fill(); }
  g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
