/** İshak Paşa motif çizimleri (bulmaca parçaları ve 3B panolar aynı resmi kullanır) */
import { rng } from '../shared/walkKit';
import type { Motif } from './site';

/* ---------- motif çizimleri (canvas): sivri kemerli çerçeve + üstten ışık → parçaların yönü okunur ---------- */
const motifCache = new Map<Motif, string>();
export function motifURL(kind: Motif): string {
  const hit = motifCache.get(kind); if (hit) return hit;
  const N = 240, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d')!, cx = N / 2, cy = N / 2 + 10;
  const bg = g.createLinearGradient(0, 0, 0, N); bg.addColorStop(0, '#f1e2c2'); bg.addColorStop(1, '#c9ab7c'); g.fillStyle = bg; g.fillRect(0, 0, N, N);
  g.strokeStyle = '#7a5532'; g.fillStyle = '#9c7347'; g.lineWidth = 6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(16, N - 14); g.lineTo(16, 92); g.quadraticCurveTo(18, 30, cx, 12); g.quadraticCurveTo(N - 18, 30, N - 16, 92); g.lineTo(N - 16, N - 14); g.closePath(); g.stroke();   // sivri kemer
  g.lineWidth = 4;
  if (kind === 'yildiz') { for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + k * Math.PI / 4; g.lineTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); } g.closePath(); g.stroke(); } g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); g.lineTo(cx + Math.cos(a) * 98, cy + Math.sin(a) * 98); g.stroke(); } }
  if (kind === 'rumi') { for (let i = 0; i < 3; i++) { const y = 70 + i * 55; g.beginPath(); for (let x = 30; x <= N - 30; x += 4) g.lineTo(x, y + Math.sin(x * 0.06 + i) * 14); g.stroke(); for (let x = 50; x < N - 30; x += 46) { g.beginPath(); g.arc(x, y + Math.sin(x * 0.06 + i) * 14 - 10, 9, Math.PI * 0.2, Math.PI * 1.6); g.stroke(); g.beginPath(); g.ellipse(x + 10, y - 22 + Math.sin(x * 0.06 + i) * 14, 6, 11, 0.7, 0, Math.PI * 2); g.fill(); } } }
  if (kind === 'rozet') { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46, 30, 11, a, 0, Math.PI * 2); g.stroke(); } g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cx, cy, 88, 0, Math.PI * 2); g.stroke(); }
  if (kind === 'lale') { g.beginPath(); g.moveTo(cx, N - 22); g.lineTo(cx, 70); g.stroke(); for (let i = 0; i < 3; i++) { const y = 190 - i * 40; [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx + s * 50, y - 10, cx + s * 62, y - 40); g.stroke(); g.beginPath(); g.ellipse(cx + s * 64, y - 48, 9, 16, s * 0.3, 0, Math.PI * 2); g.fill(); }); } g.beginPath(); g.moveTo(cx - 22, 70); g.quadraticCurveTo(cx - 24, 34, cx, 28); g.quadraticCurveTo(cx + 24, 34, cx + 22, 70); g.quadraticCurveTo(cx, 58, cx - 22, 70); g.fill(); }
  if (kind === 'mukarnas') { for (let row = 0; row < 5; row++) { const n = 5 - row, w = 180 / 5, y = 50 + row * 36; for (let i = 0; i < n; i++) { const x = cx - (n * w) / 2 + i * w; g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y + 12); g.quadraticCurveTo(x + w / 2, y - 8, x + w, y + 12); g.lineTo(x + w, y + 30); g.stroke(); g.fillStyle = `rgba(90,60,30,${0.15 + row * 0.08})`; g.fill(); } } g.fillStyle = '#9c7347'; }
  if (kind === 'zincir') { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(48 + i * 48, 70 + j * 44, 26, 0, Math.PI * 2); g.stroke(); } g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill(); }
  const r = rng(kind.length * 31); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(60,40,20,${r() * 0.12})`; g.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
  const url = c.toDataURL(); motifCache.set(kind, url); return url;
}

