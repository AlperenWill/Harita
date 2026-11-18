/**
 * Topkapı — malzemeler (hepsi prosedürel canvas; doku dosyası yok).
 *  - İznik çinisi: camsı sır için MeshPhysicalMaterial clearcoat 1.0, roughness 0.2.
 *  - Halı: desen + yükseklikten normal haritası + displacement (tüy kabarıklığı; düşük kademede displacement kapalı).
 *  - Sedef kakma: koyu ahşap üzerinde sedef parçaları emissive haritayla hafifçe parlar.
 */
import * as THREE from 'three';

const T = Math.PI * 2;
const canvas = (w: number, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; };
const finish = (c: HTMLCanvasElement, rx = 1, ry = 1, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 16; return t; };

function flower(g: CanvasRenderingContext2D, x: number, y: number, s: number, kind: 0 | 1 | 2) {
  g.save(); g.translate(x, y); g.strokeStyle = '#1d6b4a'; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(0, s * 0.45); g.quadraticCurveTo(s * 0.12, 0, 0, -s * 0.1); g.stroke();
  g.fillStyle = '#1d6b4a'; g.beginPath(); g.ellipse(s * 0.12, s * 0.22, s * 0.13, s * 0.045, -0.7, 0, T); g.fill();
  if (kind === 0) { g.fillStyle = '#c2332b'; g.beginPath(); g.moveTo(0, -s * 0.05); g.bezierCurveTo(-s * 0.22, -s * 0.15, -s * 0.12, -s * 0.42, -s * 0.05, -s * 0.45); g.lineTo(0, -s * 0.3); g.lineTo(s * 0.05, -s * 0.45); g.bezierCurveTo(s * 0.12, -s * 0.42, s * 0.22, -s * 0.15, 0, -s * 0.05); g.fill(); }   // lale
  if (kind === 1) { g.fillStyle = '#c2332b'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(0, -s * 0.1); g.lineTo(Math.sin(i * 0.3) * s * 0.3 - s * 0.03, -s * 0.1 - Math.cos(i * 0.3) * s * 0.32); g.lineTo(Math.sin(i * 0.3) * s * 0.3 + s * 0.03, -s * 0.1 - Math.cos(i * 0.3) * s * 0.32); g.fill(); } }   // karanfil
  if (kind === 2) { g.fillStyle = '#1f4fa3'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((i % 2 ? 1 : -1) * s * 0.05, -s * 0.12 - i * s * 0.06, s * 0.04, 0, T); g.fill(); } }   // sümbül
  g.restore();
}
export function tileMaterial(repeat: [number, number]) {
  const [c, g] = canvas(512); g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const x = i * 256 + 128, y = j * 256 + 140; flower(g, x, y, 190, ((i + j * 2) % 3) as 0 | 1 | 2); g.strokeStyle = '#1f4fa3'; g.lineWidth = 5; g.strokeRect(i * 256 + 5, j * 256 + 5, 246, 246); g.fillStyle = '#2aa3a0'; for (const [dx, dy] of [[14, 14], [242, 14], [14, 242], [242, 242]]) { g.beginPath(); g.arc(i * 256 + dx, j * 256 + dy, 9, 0, T); g.fill(); } }
  return new THREE.MeshPhysicalMaterial({ map: finish(c, ...repeat), clearcoat: 1.0, clearcoatRoughness: 0.08, roughness: 0.2, metalness: 0 });
}
export function carpetMaterial(repeat: [number, number], displace: boolean) {
  // Uşak/Anadolu havası: kırmızı zemin, küçük göl motifleri ızgarası, fildişi ve lacivert bordür; ortada madalyon
  const [c, g] = canvas(1024), [h, hg] = canvas(256);
  g.fillStyle = '#8a1f24'; g.fillRect(0, 0, 1024, 1024); hg.fillStyle = '#404040'; hg.fillRect(0, 0, 256, 256);
  const both = (fn: (x: CanvasRenderingContext2D, col: boolean) => void) => { g.save(); g.scale(2, 2); fn(g, true); g.restore(); hg.save(); hg.scale(0.5, 0.5); fn(hg, false); hg.restore(); };
  const oct = (x: CanvasRenderingContext2D, cx: number, cy: number, r: number) => { x.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * T + Math.PI / 8; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); };
  both((x, col) => {
    // bordürler
    x.fillStyle = col ? '#1d2f57' : '#9a9a9a'; x.fillRect(14, 14, 484, 484); x.fillStyle = col ? '#8a1f24' : '#404040'; x.fillRect(52, 52, 408, 408);
    x.strokeStyle = col ? '#efe3c4' : '#d0d0d0'; x.lineWidth = 5; x.strokeRect(20, 20, 472, 472); x.strokeRect(48, 48, 416, 416);
    x.fillStyle = col ? '#efe3c4' : '#c8c8c8'; for (let k = 0; k < 20; k++) for (const [ax, ay, dx, dy] of [[34, 34 + k * 22.5, 0, 1], [478, 34 + k * 22.5, 0, 1], [34 + k * 22.5, 34, 1, 0], [34 + k * 22.5, 478, 1, 0]]) { x.beginPath(); x.moveTo(ax - 6 * dy, ay - 6 * dx); x.lineTo(ax + 6 * dx, ay + 6 * dy); x.lineTo(ax + 6 * dy, ay + 6 * dx); x.lineTo(ax - 6 * dx, ay - 6 * dy); x.fill(); }
    // göl ızgarası
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const cx = 92 + i * 82, cy = 92 + j * 82; if (Math.abs(i - 2) + Math.abs(j - 2) < 2) continue;
      x.fillStyle = col ? ((i + j) % 2 ? '#1d2f57' : '#2d5d4a') : '#8c8c8c'; oct(x, cx, cy, 26); x.fill(); x.fillStyle = col ? '#e6c46a' : '#c0c0c0'; oct(x, cx, cy, 13); x.fill(); x.fillStyle = col ? '#8a1f24' : '#606060'; x.fillRect(cx - 4, cy - 4, 8, 8); }
    // madalyon
    x.fillStyle = col ? '#1d2f57' : '#909090'; x.beginPath(); x.ellipse(256, 256, 112, 84, 0, 0, T); x.fill(); x.strokeStyle = col ? '#e6c46a' : '#c8c8c8'; x.lineWidth = 6; x.stroke();
    x.fillStyle = col ? '#efe3c4' : '#d0d0d0'; x.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * T, r = i % 2 ? 30 : 62; x.lineTo(256 + Math.cos(a) * r * 1.2, 256 + Math.sin(a) * r * 0.9); } x.fill();
    x.fillStyle = col ? '#8a1f24' : '#505050'; x.beginPath(); x.arc(256, 256, 20, 0, T); x.fill();
  });
  let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${r() * 0.06})`; g.fillRect(r() * 1024, r() * 1024, 2, 2); }   // dokuma pürüzü
  for (let i = 0; i < 5000; i++) { hg.fillStyle = `rgba(255,255,255,${r() * 0.25})`; hg.fillRect(r() * 256, r() * 256, 1, 1); }   // tüy pürüzü
  // yükseklik → normal
  const src = hg.getImageData(0, 0, 256, 256).data, [n, ng] = canvas(256), img = ng.createImageData(256, 256), H = (x: number, y: number) => src[(((y + 256) % 256) * 256 + ((x + 256) % 256)) * 4] / 255;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 3, dy = (H(x, y + 1) - H(x, y - 1)) * 3, l = Math.hypot(dx, dy, 1), i = (y * 256 + x) * 4; img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
  ng.putImageData(img, 0, 0);
  return new THREE.MeshStandardMaterial({ map: finish(c, ...repeat), normalMap: finish(n, repeat[0], repeat[1], false), roughness: 0.95, ...(displace ? { displacementMap: finish(h, repeat[0], repeat[1], false), displacementScale: 0.025 } : {}) });
}
/** Sedef kakmalı kapı: emissive harita yalnızca sedef parçalarında */
export function pearlDoorMaterial() {
  const [c, g] = canvas(256, 512), [e, eg] = canvas(256, 512); g.fillStyle = '#3a2416'; g.fillRect(0, 0, 256, 512); eg.fillStyle = '#000'; eg.fillRect(0, 0, 256, 512);
  const star = (x: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * T, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); };
  for (const cy of [110, 256, 402]) { star(g, 128, cy, 62, '#efe9df'); star(eg, 128, cy, 62, '#cfe6ff'); for (const dx of [-84, 84]) { star(g, 128 + dx, cy + 73, 20, '#e8dccb'); star(eg, 128 + dx, cy + 73, 20, '#ffd9ec'); } }
  g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 492);
  return new THREE.MeshStandardMaterial({ map: finish(c), emissiveMap: finish(e), emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.45 });
}
/** Stilize tuğra biçimi: üç dikey çizgi (tuğ), iki iç içe kavis (beyze) ve sağa uzanan kol. Gerçek bir padişahın tuğrası DEĞİLDİR; yazı içermez. */
export function tughraTexture() {
  const [c, g] = canvas(512, 384); g.clearRect(0, 0, 512, 384); g.strokeStyle = '#f2cf6a'; g.lineCap = 'round';
  g.lineWidth = 9; for (const x of [250, 285, 320]) { g.beginPath(); g.moveTo(x, 60); g.quadraticCurveTo(x - 14, 180, x - 30, 290); g.stroke(); }
  g.lineWidth = 8; g.beginPath(); g.ellipse(170, 250, 150, 78, -0.12, 0.3, T - 0.5); g.stroke(); g.beginPath(); g.ellipse(190, 255, 96, 46, -0.12, 0.2, T - 0.4); g.stroke();
  g.beginPath(); g.moveTo(300, 300); g.quadraticCurveTo(420, 290, 495, 240); g.stroke(); g.lineWidth = 12; g.beginPath(); g.moveTo(120, 320); g.lineTo(360, 322); g.stroke();
  return finish(c);
}
export const plaster = (c: string, rough = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
export const gold = () => new THREE.MeshStandardMaterial({ color: '#d8a93f', metalness: 1, roughness: 0.3 });
