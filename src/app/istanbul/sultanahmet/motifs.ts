import * as THREE from 'three';
import type { MotifId } from './layout';

/**
 * Çini motifleri: tarihî bilgi + prosedürel çizim (doku dosyası yok).
 * Metinler genel İznik çini sanatı bilgisidir. Sultanahmet'e özgü doğrulanmış tek motif bilgisi
 * 50'yi aşkın farklı lale deseni olmasıdır; diğerleri İznik repertuvarının yaygın motifleridir.
 */
export const MOTIF_INFO: Record<MotifId, { name: string; text: string; source: { title: string; url: string } }> = {
  lale: { name: 'Lale', text: 'Osmanlı süsleme sanatının en sevilen motifi. Sultanahmet Camii’nin çinilerinde 50’yi aşkın farklı lale deseni bulunduğu belirtilir.',
    source: { title: 'İznik Mavi Çini — İznik çinilerinde lale motifi', url: 'https://iznikmavicini.com/en/blog-detay/iznik-tiles-and-the-artistic-reflections-of-the-tulip-pattern-in-the-ottoman-empire,105' } },
  karanfil: { name: 'Karanfil', text: 'Yelpaze gibi açılan taç yapraklarıyla İznik çinilerinin klasik çiçeklerinden biri; lale ve sümbülle birlikte sıkça kullanılır.',
    source: { title: 'İznik Mavi Çini — İznik çinilerinde çiçek motifleri', url: 'https://iznikmavicini.com/fr/blog-detay/vase-and-basket-culture-in-the-ottoman-empire-floral-motifs-in-iznik-tiles,135' } },
  sumbul: { name: 'Sümbül', text: 'İnce sapı ve çan biçimli küçük çiçekleriyle tanınır. Bahar ve tazeliği simgeleyen motif, klasik dönem İznik bahçe kompozisyonlarında yer alır.',
    source: { title: 'İznik Mavi Çini — İznik çinilerinde çiçek motifleri', url: 'https://iznikmavicini.com/fr/blog-detay/vase-and-basket-culture-in-the-ottoman-empire-floral-motifs-in-iznik-tiles,135' } },
  servi: { name: 'Servi', text: 'Dik ve her zaman yeşil kalan servi ağacı Osmanlı sanatında sonsuzluk ve dinginlikle ilişkilendirilir; çini panolarında çiçeklerle birlikte işlenir.',
    source: { title: 'İznik Mavi Çini — İznik çinilerinde çiçek motifleri', url: 'https://iznikmavicini.com/fr/blog-detay/vase-and-basket-culture-in-the-ottoman-empire-floral-motifs-in-iznik-tiles,135' } },
  hatayi: { name: 'Hatayi', text: 'Çiçeğin yandan ya da üstten görünüşünün stilize edilmesiyle oluşan motif. Adını Orta Asya’daki “Hıtay” bölgesinden aldığı kabul edilir.',
    source: { title: 'Ozge Yildiz, doktora tezi (Harvard, 2024) — Sultan Ahmed Camii bezemesi', url: 'https://dash.harvard.edu/entities/publication/5b0988ad-8804-4571-b3eb-f4cbc2bc7330' } },
  rumi: { name: 'Rumi', text: 'Kıvrımlı, ikiye ayrılan yaprak biçimli stilize motif. Anadolu Selçuklu sanatından Osmanlı’ya uzanan bezeme geleneğinin temel öğelerinden biridir.',
    source: { title: 'Ozge Yildiz, doktora tezi (Harvard, 2024) — Sultan Ahmed Camii bezemesi', url: 'https://dash.harvard.edu/entities/publication/5b0988ad-8804-4571-b3eb-f4cbc2bc7330' } },
};

// İznik paleti: kobalt mavisi, firuze, mercan kırmızısı (bolus), yeşil, beyaz zemin
const C = { white: '#f7f4ec', cobalt: '#1d4e9e', turq: '#2aa3a8', red: '#c23a2e', green: '#3f8a52', line: '#173d78' };

function petal(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, fill: string) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = fill; g.strokeStyle = C.line; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w, -h * 0.3, w * 0.6, -h, 0, -h); g.bezierCurveTo(-w * 0.6, -h, -w, -h * 0.3, 0, 0); g.fill(); g.stroke(); g.restore();
}
function stem(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  g.strokeStyle = C.green; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 14, (y0 + y1) / 2, x1, y1); g.stroke();
}
const DRAW: Record<MotifId, (g: CanvasRenderingContext2D) => void> = {
  lale: (g) => { stem(g, 128, 230, 128, 120); petal(g, 128, 122, 30, 70, 0, C.red); petal(g, 112, 124, 20, 64, -0.35, C.cobalt); petal(g, 144, 124, 20, 64, 0.35, C.cobalt); petal(g, 108, 190, 16, 40, -1.1, C.green); petal(g, 148, 200, 16, 40, 1.1, C.green); },
  karanfil: (g) => { stem(g, 128, 230, 128, 130); for (let i = -3; i <= 3; i++) petal(g, 128, 132, 12, 62, i * 0.28, i % 2 ? C.red : C.cobalt); g.fillStyle = C.turq; g.beginPath(); g.arc(128, 136, 14, 0, 7); g.fill(); },
  sumbul: (g) => { stem(g, 128, 232, 128, 60); for (let i = 0; i < 8; i++) { const y = 70 + i * 18, s = i % 2 ? 1 : -1; g.fillStyle = i % 3 ? C.cobalt : C.turq; g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.ellipse(128 + s * 16, y, 11, 8, s * 0.5, 0, 7); g.fill(); g.stroke(); } },
  servi: (g) => { g.fillStyle = C.green; g.strokeStyle = C.line; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 30); g.bezierCurveTo(176, 110, 170, 190, 128, 214); g.bezierCurveTo(86, 190, 80, 110, 128, 30); g.fill(); g.stroke(); g.fillStyle = '#7a4a2a'; g.fillRect(122, 212, 12, 22); for (let i = 0; i < 5; i++) { g.strokeStyle = C.turq; g.lineWidth = 2; g.beginPath(); g.moveTo(128, 60 + i * 30); g.lineTo(148 - i, 80 + i * 30); g.moveTo(128, 60 + i * 30); g.lineTo(108 + i, 80 + i * 30); g.stroke(); } },
  hatayi: (g) => { for (let i = 0; i < 8; i++) petal(g, 128, 128, 20, 76, (i * Math.PI) / 4, i % 2 ? C.cobalt : C.turq); for (let i = 0; i < 8; i++) petal(g, 128, 128, 12, 44, (i * Math.PI) / 4 + Math.PI / 8, C.red); g.fillStyle = C.white; g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill(); g.strokeStyle = C.line; g.stroke(); },
  rumi: (g) => { g.lineWidth = 3; g.strokeStyle = C.line; for (const s of [-1, 1]) { g.fillStyle = s > 0 ? C.cobalt : C.turq; g.beginPath(); g.moveTo(128, 210); g.bezierCurveTo(128 + s * 90, 190, 128 + s * 96, 70, 128 + s * 30, 50); g.bezierCurveTo(128 + s * 60, 100, 128 + s * 40, 150, 128 + s * 8, 120); g.bezierCurveTo(128 + s * 30, 170, 128 + s * 10, 190, 128, 210); g.fill(); g.stroke(); } petal(g, 128, 112, 14, 60, 0, C.red); },
};

const cache = new Map<string, THREE.CanvasTexture>();
/** Pano dokusu: bordürlü beyaz zemin + motif. found=false ise motif silik çizilir (henüz keşfedilmedi). */
export function motifTexture(m: MotifId, found: boolean): THREE.CanvasTexture {
  const k = m + found;
  if (cache.has(k)) return cache.get(k)!;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = C.white; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = C.cobalt; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242);
  g.strokeStyle = C.turq; g.lineWidth = 4; g.strokeRect(20, 20, 216, 216);
  for (let i = 0; i < 4; i++) { g.save(); g.translate(i % 2 ? 228 : 28, i < 2 ? 28 : 228); g.fillStyle = C.red; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.restore(); }
  g.globalAlpha = found ? 1 : 0.22; DRAW[m](g); g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; cache.set(k, t); return t;
}

/** Duvarların geri kalanı için tekrar eden çini dokusu (keşif dışı, atmosfer) */
let _wall: THREE.CanvasTexture | null = null;
export function wallTileTexture() {
  if (_wall) return _wall;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#eef0f2'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#2b5fae'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 125, 125);
  g.fillStyle = '#2b5fae'; for (let i = 0; i < 4; i++) { g.save(); g.translate(64, 64); g.rotate((i * Math.PI) / 2); g.beginPath(); g.ellipse(0, -26, 9, 22, 0, 0, 7); g.fill(); g.restore(); }
  g.fillStyle = '#2aa3a8'; g.beginPath(); g.arc(64, 64, 9, 0, 7); g.fill();
  g.fillStyle = '#c23a2e'; for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
  _wall = new THREE.CanvasTexture(c); _wall.colorSpace = THREE.SRGBColorSpace; _wall.wrapS = _wall.wrapT = THREE.RepeatWrapping; return _wall;
}
