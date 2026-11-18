/**
 * Topkapı — doku ve mimari parça kiti (hepsi prosedürel; dosya yok).
 *
 * Dokular canvas'ta üretilir ve yükseklikten Sobel ile normal haritası çıkarılır; tüm dokularda anizotropi 16 ve mipmap.
 * Mimari parçalar gerçek Osmanlı saray dilinin öğeleridir: kurşun kaplı kubbe + alem, sivri kemerli revak (sütunlar ve kemerler
 * InstancedMesh), geniş ahşap saçak (altında konsollar), külahlı kule, mutfak bacası, pencere sıraları.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

const T = Math.PI * 2;
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function cv(n: number, m = n) { const c = document.createElement('canvas'); c.width = n; c.height = m; return [c, c.getContext('2d')!] as const; }
function tex(c: HTMLCanvasElement, srgb: boolean) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
/** yükseklik canvas'ından normal haritası */
function normalFrom(h: HTMLCanvasElement, k: number) {
  const n = h.width, m = h.height, src = h.getContext('2d')!.getImageData(0, 0, n, m).data, [c, g] = cv(n, m), img = g.createImageData(n, m), H = (x: number, y: number) => src[(((y + m) % m) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < m; y++) for (let x = 0; x < n; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4; img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); return tex(c, false);
}
type Pair = { map: THREE.Texture; normal: THREE.Texture };
const cache = new Map<string, Pair>();
const once = (k: string, f: () => Pair) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k)!; };

/** Kesme taş duvar (açık kireçtaşı, düzgün sıralar) */
export const ashlar = (n = 512) => once(`ashlar${n}`, () => {
  const [c, g] = cv(n), [h, hg] = cv(n), r = rng(3), rows = 8, rh = n / rows;
  g.fillStyle = '#a99d88'; g.fillRect(0, 0, n, n); hg.fillStyle = '#303030'; hg.fillRect(0, 0, n, n);
  for (let y = 0; y < rows; y++) { let x = -(y % 2) * (n / 6); while (x < n) { const w = n / 3.2 + (r() - 0.5) * n / 10, t = 196 + (r() - 0.5) * 22, gap = n / 170;
    for (const ox of [0, x + w > n ? -n : 9999]) { if (ox === 9999) continue; g.fillStyle = `rgb(${t},${t - 6},${t - 18})`; g.fillRect(x + gap + ox, y * rh + gap, w - gap * 2, rh - gap * 2); const gr = hg.createLinearGradient(0, y * rh, 0, y * rh + rh); gr.addColorStop(0, '#bbb'); gr.addColorStop(0.5, '#d8d8d8'); gr.addColorStop(1, '#a8a8a8'); hg.fillStyle = gr; hg.fillRect(x + gap + ox, y * rh + gap, w - gap * 2, rh - gap * 2); }
    x += w; } }
  for (let i = 0; i < n * n / 40; i++) { const x = r() * n, y = r() * n, a = r() * 0.1; g.fillStyle = r() < 0.5 ? `rgba(70,60,45,${a})` : `rgba(255,250,240,${a})`; g.fillRect(x, y, 2, 2); hg.fillStyle = `rgba(0,0,0,${a})`; hg.fillRect(x, y, 2, 2); }
  return { map: tex(c, true), normal: normalFrom(h, 2) };
});
/** Badanalı sıva (hafif lekeli beyaz) */
export const plaster = () => once('plaster', () => {
  const n = 256, [c, g] = cv(n), [h, hg] = cv(n), r = rng(5); g.fillStyle = '#eee6d6'; g.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 2500; i++) { const x = r() * n, y = r() * n, s = 2 + r() * 8; g.fillStyle = `rgba(${r() < 0.5 ? '150,135,110' : '255,255,250'},${r() * 0.06})`; g.beginPath(); g.arc(x, y, s, 0, T); g.fill(); hg.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},.05)`; hg.fillRect(x, y, s, s); }
  return { map: tex(c, true), normal: normalFrom(h, 0.8) };
});
/** Kurşun levha (kubbe ve çatı): şeritler + hafif oksit */
export const leadTex = () => once('lead', () => {
  const n = 256, [c, g] = cv(n), [h, hg] = cv(n), r = rng(9); g.fillStyle = '#8b979d'; g.fillRect(0, 0, n, n); hg.fillStyle = '#909090'; hg.fillRect(0, 0, n, n);
  for (let x = 0; x < n; x += n / 16) { g.fillStyle = 'rgba(40,50,55,.35)'; g.fillRect(x, 0, 2, n); hg.fillStyle = '#e0e0e0'; hg.fillRect(x, 0, 3, n); }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '220,230,232' : '60,70,74'},${r() * 0.08})`; g.fillRect(r() * n, r() * n, 3, 3); }
  return { map: tex(c, true), normal: normalFrom(h, 1.4) };
});
/** Çimen */
export const grass = () => once('grass', () => {
  const n = 256, [c, g] = cv(n), r = rng(13); g.fillStyle = '#5d7a3c'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) { const t = r(); g.fillStyle = t < 0.4 ? 'rgba(120,150,70,.5)' : t < 0.8 ? 'rgba(60,85,35,.45)' : 'rgba(170,170,90,.35)'; g.fillRect(r() * n, r() * n, 1.5, 3); }
  const t = tex(c, true); return { map: t, normal: t };
});
/** Kaldırım taşı (yollar) */
export const cobble = () => once('cobble', () => {
  const n = 512, [c, g] = cv(n), [h, hg] = cv(n), r = rng(21); g.fillStyle = '#6f6658'; g.fillRect(0, 0, n, n); hg.fillStyle = '#202020'; hg.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += 32) for (let x = (y / 32) % 2 ? -16 : 0; x < n; x += 32) { const t = 150 + (r() - 0.5) * 40; g.fillStyle = `rgb(${t},${t - 8},${t - 20})`; g.beginPath(); g.ellipse(x + 16, y + 16, 13 + r() * 2, 12 + r() * 2, r(), 0, T); g.fill(); const gr = hg.createRadialGradient(x + 16, y + 16, 1, x + 16, y + 16, 15); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#555'); hg.fillStyle = gr; hg.beginPath(); hg.ellipse(x + 16, y + 16, 13, 12, 0, 0, T); hg.fill(); }
  return { map: tex(c, true), normal: normalFrom(h, 3) };
});
/** Mermer döşeme (kareler, damarlı) */
export const marbleFloor = () => once('marble', () => {
  const n = 512, [c, g] = cv(n), r = rng(31); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const t = 228 - ((x + y) % 2) * 26 + (r() - 0.5) * 8; g.fillStyle = `rgb(${t},${t - 4},${t - 10})`; g.fillRect(x * 128, y * 128, 128, 128); g.strokeStyle = 'rgba(120,110,100,.25)'; g.lineWidth = 1.2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x * 128 + r() * 128, y * 128); g.bezierCurveTo(x * 128 + r() * 128, y * 128 + 40, x * 128 + r() * 128, y * 128 + 90, x * 128 + r() * 128, y * 128 + 128); g.stroke(); } g.strokeStyle = 'rgba(90,80,70,.5)'; g.lineWidth = 2; g.strokeRect(x * 128, y * 128, 128, 128); }
  const t = tex(c, true); return { map: t, normal: t };
});
/** Ahşap (saçak altı, kapılar) */
export const woodTex = () => once('wood', () => {
  const n = 256, [c, g] = cv(n), r = rng(41); g.fillStyle = '#6b4526'; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '40,24,12' : '150,100,60'},${r() * 0.25})`; g.fillRect(0, y, n, 1 + r() * 2); }
  const t = tex(c, true); return { map: t, normal: t };
});

export function withRepeat(p: Pair, rx: number, ry: number) { const map = p.map.clone(), normal = p.normal.clone(); map.repeat.set(rx, ry); normal.repeat.set(rx, ry); map.needsUpdate = normal.needsUpdate = true; return { map, normal }; }
export type Mats = ReturnType<typeof makeMats>;
export function makeMats(hi: boolean) {
  const a = withRepeat(ashlar(hi ? 1024 : 512), 1, 1), p = plaster(), l = leadTex(), w = woodTex();
  return {
    stone: new THREE.MeshStandardMaterial({ map: a.map, normalMap: a.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.88 }),
    plaster: new THREE.MeshStandardMaterial({ map: p.map, normalMap: p.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.92 }),
    lead: new THREE.MeshStandardMaterial({ map: l.map, normalMap: l.normal, color: '#cfd6da', roughness: 0.42, metalness: 0.55 }),
    marble: new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.22, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({ map: w.map, roughness: 0.7 }),
    woodDark: new THREE.MeshStandardMaterial({ map: w.map, color: '#8a6a52', roughness: 0.65 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d7a73c', metalness: 1, roughness: 0.28 }),
    window: new THREE.MeshStandardMaterial({ color: '#1e2a30', roughness: 0.15, metalness: 0.6 }),
    iron: new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.55, metalness: 0.6 }),
  };
}

/* ---------- geometri yardımcıları ---------- */
/** Dünya ölçekli UV: doku her `s` metrede bir tekrar eder (büyük duvarda taşlar gerilmez) */
const geoCache = new Map<string, THREE.BufferGeometry>();
export function sbox(w: number, h: number, d: number, s = 4) {
  const k = `b${w},${h},${d},${s}`; let g = geoCache.get(k); if (g) return g;
  g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // +x −x +y −y +z −z
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
  geoCache.set(k, g); return g;
}
export function scyl(rt: number, rb: number, h: number, seg: number, s = 4) {
  const k = `c${rt},${rb},${h},${seg},${s}`; let g = geoCache.get(k); if (g) return g;
  g = new THREE.CylinderGeometry(rt, rb, h, seg); uvScale(g, (Math.PI * 2 * Math.max(rt, rb)) / s, h / s); geoCache.set(k, g); return g;
}
export function uvScale<G extends THREE.BufferGeometry>(g: G, su: number, sv: number): G { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; return g; }
/** Sivri (Osmanlı) kemer çerçevesi: dikdörtgen panodan sivri kemerli açıklık oyulmuş, kalınlık d */
export function pointedArchFrame(w: number, h: number, open: number, springY: number, d: number) {
  // delik yerine U biçimli tek çokgen: açıklık tabana kadar iner (üçgenlemede delik–kenar teması sorunu olmaz)
  const o = open / 2, s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-o, 0); s.lineTo(-o, springY);
  s.quadraticCurveTo(-o * 0.95, springY + o * 1.05, 0, springY + o * 1.45); s.quadraticCurveTo(o * 0.95, springY + o * 1.05, o, springY);
  s.lineTo(o, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  return uvScale(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -d / 2), 0.25, 0.25);
}
/** Sivri kemerli pencere / niş (koyu) */
export function pointedWindow(w: number, h: number) {
  const s = new THREE.Shape(), o = w / 2, sp = h - o * 1.4; s.moveTo(-o, 0); s.lineTo(-o, sp); s.quadraticCurveTo(-o * 0.95, sp + o, 0, h); s.quadraticCurveTo(o * 0.95, sp + o, o, sp); s.lineTo(o, 0); s.lineTo(-o, 0); return new THREE.ShapeGeometry(s, 8);
}
/** Alem (kubbe tepesi): top + hilal */
export function Alem({ y, s = 1, m }: { y: number; s?: number; m: Mats }) {
  return (
    <group position={[0, y, 0]} scale={s}>
      <mesh material={m.gold} position={[0, 0.5, 0]}><cylinderGeometry args={[0.05, 0.08, 1, 6]} /></mesh>
      {[1.1, 1.45].map((yy) => <mesh key={yy} material={m.gold} position={[0, yy, 0]}><sphereGeometry args={[0.16, 10, 8]} /></mesh>)}
      <mesh material={m.gold} position={[0, 2, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.3, 0.06, 6, 16, Math.PI * 1.3]} /></mesh>
    </group>
  );
}
/** Kubbe: kasnak (pencereli) + kurşun yarım küre + alem */
export function Dome({ r, y = 0, drum = 0.6, m, seg = 24, windows = 0, alem = true }: { r: number; y?: number; drum?: number; m: Mats; seg?: number; windows?: number; alem?: boolean }) {
  const dh = r * drum;
  const win = useMemo(() => pointedWindow(r * 0.18, dh * 0.62), [r, dh]);
  return (
    <group position={[0, y, 0]}>
      {drum > 0 && <mesh geometry={scyl(r * 1.02, r * 1.05, dh, seg)} material={m.stone} position={[0, dh / 2, 0]} castShadow receiveShadow />}
      {Array.from({ length: windows }, (_, i) => { const a = (i / windows) * T; return <mesh key={i} geometry={win} material={m.window} position={[Math.cos(a) * r * 1.035, dh * 0.18, Math.sin(a) * r * 1.035]} rotation={[0, -a + Math.PI / 2, 0]} />; })}
      <mesh material={m.lead} position={[0, dh, 0]} castShadow><sphereGeometry args={[r, seg, Math.round(seg / 2), 0, T, 0, Math.PI / 2]} /></mesh>
      <mesh material={m.lead} position={[0, dh, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r * 1.04, r * 0.035, 6, seg]} /></mesh>
      {alem && <Alem y={dh + r * 0.98} s={Math.max(0.6, r / 4)} m={m} />}
    </group>
  );
}
/** Külahlı kule: sekizgen gövde + kurşun külah + alem */
export function ConeTower({ r, h, roof, m }: { r: number; h: number; roof: number; m: Mats }) {
  return (
    <group>
      <mesh geometry={scyl(r, r * 1.04, h, 8)} material={m.stone} position={[0, h / 2, 0]} castShadow receiveShadow />
      <mesh material={m.stone} position={[0, h + 0.3, 0]}><cylinderGeometry args={[r * 1.12, r * 1.12, 0.6, 8]} /></mesh>
      <mesh material={m.lead} position={[0, h + 0.6 + roof / 2, 0]} castShadow><coneGeometry args={[r * 1.15, roof, 8]} /></mesh>
      <Alem y={h + 0.6 + roof - 0.2} s={0.8} m={m} />
    </group>
  );
}
/** kırma çatı: köşeleri ±1/√2'de duran kare piramit (yükseklik 1, taban y=−0.5) */
const HIP = new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4);
/** Geniş ahşap saçak: kurşunla örtülü eğimli çatı + altında sık konsollar (InstancedMesh) */
export function Eave({ w, d, y, over = 1.6, m }: { w: number; d: number; y: number; over?: number; m: Mats }) {
  const W = w + over * 2, D = d + over * 2;
  const brackets = useMemo(() => {
    const g = new THREE.BoxGeometry(0.14, 0.22, over + 0.3), n = Math.round(W / 0.6) * 2 + Math.round(D / 0.6) * 2, im = new THREE.InstancedMesh(g, m.woodDark, n), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let k = 0;
    for (let i = 0; i < Math.round(W / 0.6); i++) for (const s of [-1, 1]) { const x = -W / 2 + 0.3 + i * 0.6; im.setMatrixAt(k++, M4.compose(new THREE.Vector3(x, -0.25, s * (d / 2 + over / 2)), q.identity(), new THREE.Vector3(1, 1, 1))); }
    for (let i = 0; i < Math.round(D / 0.6); i++) for (const s of [-1, 1]) { const z = -D / 2 + 0.3 + i * 0.6; im.setMatrixAt(k++, M4.compose(new THREE.Vector3(s * (w / 2 + over / 2), -0.25, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1))); }
    im.count = k; return im;
  }, [W, D, w, d, over, m.woodDark]);
  return (
    <group position={[0, y, 0]}>
      <mesh material={m.wood} position={[0, -0.05, 0]} receiveShadow><boxGeometry args={[W, 0.12, D]} /></mesh>
      {/* kırma çatı: alçak piramit (kurşun) */}
      <mesh geometry={HIP} material={m.lead} position={[0, 0.55, 0]} scale={[W / Math.SQRT2, Math.min(2.2, 0.9 + Math.min(W, D) * 0.06), D / Math.SQRT2]} castShadow />
      <primitive object={brackets} />
    </group>
  );
}
/**
 * Revak: sütunlar (InstancedMesh) + sivri kemerler (InstancedMesh) + her bölmenin üstünde küçük kubbe ya da saçak.
 * x ekseni boyunca; z = 0 hattında, ön yüz +z.
 */
export function Arcade({ cols, h = 4.2, depth = 3.2, m, domes = true }: { cols: number[]; h?: number; depth?: number; m: Mats; domes?: boolean }) {
  const span = cols.length > 1 ? cols[1] - cols[0] : 4;
  const { columns, arches, caps } = useMemo(() => {
    const open = span - 0.55, archH = 0.12 + (open / 2) * 1.45 + 0.45;
    const colG = new THREE.CylinderGeometry(0.26, 0.3, h, 14), cap = new THREE.BoxGeometry(0.85, 0.35, 0.85), arch = pointedArchFrame(span, archH, open, 0.12, 0.55);
    const c = new THREE.InstancedMesh(colG, m.marble, cols.length), k = new THREE.InstancedMesh(cap, m.stone, cols.length * 2), a = new THREE.InstancedMesh(arch, m.stone, cols.length - 1);
    const M4 = new THREE.Matrix4();
    cols.forEach((x, i) => { c.setMatrixAt(i, M4.makeTranslation(x, h / 2, 0)); k.setMatrixAt(i * 2, M4.makeTranslation(x, h + 0.17, 0)); k.setMatrixAt(i * 2 + 1, M4.makeTranslation(x, 0.17, 0)); });
    for (let i = 0; i < cols.length - 1; i++) a.setMatrixAt(i, M4.makeTranslation((cols[i] + cols[i + 1]) / 2, h + 0.34, 0));
    c.castShadow = a.castShadow = true; c.receiveShadow = a.receiveShadow = true; return { columns: c, arches: a, caps: k };
  }, [cols, h, span, m.marble, m.stone]);
  const w = cols[cols.length - 1] - cols[0] + 1, top = h + 0.34 + 0.12 + ((span - 0.55) / 2) * 1.45 + 0.45;
  return (
    <group>
      <primitive object={columns} /><primitive object={caps} /><primitive object={arches} />
      {/* revak tavanı ve üstü */}
      <mesh geometry={sbox(w, 0.3, depth + 0.6)} material={m.stone} position={[(cols[0] + cols[cols.length - 1]) / 2, top - 0.15, -depth / 2]} receiveShadow castShadow />
      {domes ? cols.slice(0, -1).map((x, i) => <group key={i} position={[(x + cols[i + 1]) / 2, top, -depth / 2]}><Dome r={span * 0.38} drum={0.18} m={m} seg={14} /></group>)
        : <group position={[(cols[0] + cols[cols.length - 1]) / 2, top + 0.2, -depth / 2]}><Eave w={w} d={depth + 0.6} y={0} over={1.2} m={m} /></group>}
    </group>
  );
}
/** Duvar üzerinde pencere sırası (koyu sivri kemerli nişler, tek InstancedMesh) */
export function WindowRow({ from, to, y, z, count, w = 1, h = 2, face = 1, m }: { from: number; to: number; y: number; z: number; count: number; w?: number; h?: number; face?: 1 | -1; m: Mats }) {
  const mesh = useMemo(() => { const g = pointedWindow(w, h), im = new THREE.InstancedMesh(g, m.window, count), M4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), face > 0 ? 0 : Math.PI);
    for (let i = 0; i < count; i++) im.setMatrixAt(i, M4.compose(new THREE.Vector3(from + ((i + 0.5) / count) * (to - from), y, z + face * 0.03), q, new THREE.Vector3(1, 1, 1))); return im; }, [from, to, y, z, count, w, h, face, m.window]);
  return <primitive object={mesh} />;
}
