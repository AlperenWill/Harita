/**
 * Pamukkale & Hierapolis — 3B modeller (v2). Ortak manzara kiti (shared/scenery.tsx) ile Troya ve Ani düzeyine çekildi.
 *
 * Traverten yamacı: gerçek basamaklar gibi istiridye kabuğu biçimli, kıvrık kenarlı teraslar. Her terasta düz havuz tabanı, hafif kabarık kenar
 * ve aşağı sarkan perde (damla izli). Suyun çoğu turkuaz; aralarda kurumuş krem bölgeler. Ziyaretçi yolu basamakların içinden yumuşak bir rampa
 * olarak geçer (oyunun yürüme yüksekliği = routeAt; yolun çevresinde yüzey ona uyar).
 * Hierapolis: Antik Havuz (dibinde ve kenarında sütun parçaları), yamaca yaslanan tiyatro ve iki katlı sahne binası, Frontinus Kapısı (iki yuvarlak
 * kule, üç kemer; yol içinden geçer), nekropol (üçgen kapaklı lahitler, ev biçimli mezarlar, tümülüsler).
 * Ölçek ve yerleşim STİLİZEDİR (mesafeler kısaltılmıştır); yapı biçimleri temsilîdir.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { DRY, PLATEAU, ROUTE_LEN, SLOPE_Z0, SLOPE_Z1, SPOTS, heightAt, routeAt } from './terraces';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Öğleden sonra güneşi (batı-güneybatıdan): beyaz perdeler yandan aydınlanır, kabartı okunur */
export const SUN_DIR = new THREE.Vector3(-0.7, 0.55, 0.45).normalize();

/* ===================== traverten basamakları ===================== */
const STEP = 3.0, L = SLOPE_Z1 - SLOPE_Z0, TRAV_HALF = 66;
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
/** k. terasın üst (yokuş yukarı) sınırı: x boyunca kıvrık kenar */
const lipZ = (k: number, x: number) => SLOPE_Z0 + k * STEP + 0.8 * Math.sin(x * 0.31 + k * 1.9) + 0.45 * Math.sin(x * 0.83 + k * 0.7) + 0.25 * Math.sin(x * 1.7 + k * 2.3);
const levelY = (k: number) => PLATEAU * (1 - Math.max(0, Math.min(L, k * STEP)) / L);
/** Rotanın z'deki x'i (tablo) */
const ROUTE_X = (() => { const out = new Map<number, number>(); for (let s = 0; s <= ROUTE_LEN; s += 0.25) { const p = routeAt(s).p; const key = Math.round(p[2] * 4); if (!out.has(key)) out.set(key, p[0]); } return out; })();
const routeXAt = (z: number) => ROUTE_X.get(Math.round(z * 4)) ?? ROUTE_X.get(Math.round(z * 4) + 1) ?? 0;
/** Görsel traverten yüzeyi: { y, t: terastaki konum (0 üst sınır … 1 alt kenar), k: teras no, path: yol ağırlığı } */
export function travertine(x: number, z: number): { y: number; t: number; k: number; path: number } {
  let k = Math.floor((z - SLOPE_Z0) / STEP); for (let i = 0; i < 3; i++) { if (z < lipZ(k, x)) k--; else if (z >= lipZ(k + 1, x)) k++; else break; }
  const a = lipZ(k, x), b = lipZ(k + 1, x), t = Math.max(0, Math.min(1, (z - a) / Math.max(0.5, b - a)));
  const y0 = levelY(k), y1 = levelY(k + 1), rim = 0.14 * Math.exp(-(((t - 0.8) / 0.05) ** 2));
  const drop = t < 0.84 ? 0 : 1 - (1 - (t - 0.84) / 0.16) ** 1.7;   // perde: dışa bombeli iniş
  const dip = t < 0.8 ? 0.22 * Math.sin((Math.PI * t) / 0.8) : 0;   // havuz çanağı: su bunu doldurur
  let y = y0 + rim - dip - (y0 - y1) * drop;
  const edge = THREE.MathUtils.smoothstep(Math.abs(x), TRAV_HALF - 8, TRAV_HALF + 2); y = THREE.MathUtils.lerp(y, heightAt(x, z), edge);   // yanlarda yamaca karışır
  const rx = routeXAt(z), dPath = Math.abs(x - rx), path = 1 - THREE.MathUtils.smoothstep(dPath, 1.3, 2.6);
  if (path > 0) { const ry = (heightAt(x, z - 1.2) + heightAt(x, z) + heightAt(x, z + 1.2)) / 3; y = THREE.MathUtils.lerp(y, ry - 0.02, path); }
  return { y, t, k, path };
}
/** Terasın bu bölümünde su var mı (8 m'lik dilimler; kuru dilimler krem kalır) */
const nearDryPool = (x: number, z: number, pad: number) => DRY.some((d) => Math.hypot(d.at[0] - x, (d.at[1] - z) * 1.25) < d.r + pad);
const wet = (k: number, x: number, z: number) => hash(k, Math.floor((x + 100) / 9)) > 0.12 && !nearDryPool(x, z, 1.5);
/** Kuru havuzun yamaca oturan yüzeyi (leke) ya da su yüzeyi: dairesel parça, köşeleri traverten basamaklarına uyar */
export function patchGeo(cx: number, cz: number, r: number, water: boolean) {
  const g = new THREE.CircleGeometry(r, 40, 0, Math.PI * 2); g.rotateX(-Math.PI / 2); g.scale(1, 1, 0.8);
  const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = cx + p.getX(i), z = cz + p.getZ(i), T = travertine(x, z); p.setY(i, water ? (T.t < 0.8 ? levelY(T.k) + 0.1 : T.y + 0.02) : T.y + 0.04); }
  // köşeler merkeze göre: çağıran grubu (cx, 0, cz)'ye koyar
  g.computeVertexNormals(); return g;
}
/** Damla izli perde dokusu + kabartı */
function dripTex() {
  const n = 256, c = document.createElement('canvas'), h = document.createElement('canvas'); c.width = c.height = h.width = h.height = n; const g = c.getContext('2d')!, hg = h.getContext('2d')!, r = rng(29);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 220; i++) { const x = r() * n, w = 2 + r() * 6, len = 30 + r() * 220, y0 = r() * 60; const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, 'rgba(220,212,192,0)'); gr.addColorStop(0.5, `rgba(205,196,172,${0.2 + r() * 0.3})`); gr.addColorStop(1, 'rgba(240,238,230,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, len);
    hg.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.3})`; hg.fillRect(x, y0, w, len); hg.fillStyle = 'rgba(0,0,0,.3)'; hg.fillRect(x + w, y0, 1.2, len); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '190,180,160' : '255,255,255'},${r() * 0.25})`; g.fillRect(r() * n, r() * n, 2, 2); }
  const mk = (cv: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: mk(c, true), bump: mk(h, false) };
}
export function Travertines({ tier }: { tier: Tier }) {
  const { geo, water } = useMemo(() => {
    const dz = tier === 'high' ? 0.2 : tier === 'medium' ? 0.28 : 0.4, dx = tier === 'high' ? 0.8 : 1.1, x0 = -TRAV_HALF - 4, x1 = TRAV_HALF + 4, z0 = SLOPE_Z0 - 4, z1 = SLOPE_Z1 + 2;
    const nx = Math.round((x1 - x0) / dx), nz = Math.round((z1 - z0) / dz), g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const w = g.clone(), p = g.attributes.position as THREE.BufferAttribute, wp = w.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3), wcol = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(7);
    const white = new THREE.Color('#f2f1ec'), cream = new THREE.Color('#e4dbc8'), dryC = new THREE.Color('#d8cdb4'), pathC = new THREE.Color('#ece6da'), deep = new THREE.Color('#2fa6c0'), shallow = new THREE.Color('#7fd6dc');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), T = travertine(x, z), isWet = wet(T.k, x, z) && T.path < 0.3 && Math.abs(x) < TRAV_HALF - 3;
      p.setY(i, T.y); uv.setXY(i, x / 2.6, z / 5 - T.y / 0.9);
      const curtain = T.t > 0.84 ? 1 : 0;
      c.copy(white).lerp(cream, 0.12 + r() * 0.1 + curtain * 0.08); if (!isWet && T.t < 0.84) c.lerp(dryC, 0.55); if (nearDryPool(x, z, 0.2)) c.lerp(new THREE.Color('#9c8a6c'), 0.6); c.lerp(pathC, T.path * 0.8);
      col.set([c.r, c.g, c.b], i * 3);
      // su: terasın düz bölümünde, kenarın hemen gerisine kadar; perdede ve kuru dilimde suyun altına gizlenir
      const inPool = isWet && T.t < 0.8; wp.setY(i, inPool ? levelY(T.k) + 0.09 : T.y - 0.6);
      c.copy(shallow).lerp(deep, Math.min(1, T.t * 1.25)); wcol.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); w.setAttribute('color', new THREE.BufferAttribute(wcol, 3)); g.computeVertexNormals(); w.computeVertexNormals();
    return { geo: g, water: w };
  }, [tier]);
  const tex = useMemo(() => dripTex(), []);
  return (<group userData={{ noCast: true }}>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.12} roughness={0.55} /></mesh>
    <mesh geometry={water}><meshStandardMaterial vertexColors roughness={0.04} metalness={0.15} transparent opacity={0.9} envMapIntensity={1.2} /></mesh>
  </group>);
}

/* ===================== arazi, ot, ağaç, köy, dağlar ===================== */
/** Yamacın iki yanındaki tepeler: plato kenarına doğru yumuşakça söner (z=0'da basamak olmasın) */
const sideHill = (x: number, z: number) => Math.max(0, Math.abs(x) - 84) * 0.22 * THREE.MathUtils.smoothstep(z, -40, 30);
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 240 : tier === 'medium' ? 190 : 130, g = new THREE.PlaneGeometry(900, 900, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 0);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(7);
    const green = new THREE.Color('#8f9a5c'), olive = new THREE.Color('#7b8a4c'), dry = new THREE.Color('#c2b48a'), field = new THREE.Color('#a6a45e'), white = new THREE.Color('#ece7dc'), plateau = new THREE.Color('#a39f68');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = heightAt(x, z);
      y += sideHill(x, z);   // yamacın iki yanı tepe
      if (z > SLOPE_Z1) y -= (z - SLOPE_Z1) * 0.02;
      if (Math.abs(x) < TRAV_HALF + 2 && z > SLOPE_Z0 - 3 && z < SLOPE_Z1 + 1) y -= 1.5;   // traverten ağının altında kalsın
      if (Math.abs(x - POOL.x) < POOL.w / 2 + 0.6 && Math.abs(z - POOL.z) < POOL.d / 2 + 0.6) y = PLATEAU - 2.2;   // Antik Havuz çukuru
      p.setY(i, y); uv.setXY(i, x / 900 + 0.5, -z / 900 + 0.5);
      const n = Math.sin(x * 0.03 + z * 0.02) * 0.5 + 0.5; c.copy(z < SLOPE_Z0 ? plateau : green).lerp(olive, n * 0.5).lerp(dry, r() * 0.25);
      if (z > SLOPE_Z1 + 40) c.lerp(field, 0.35 + 0.25 * Math.sin(Math.floor(x / 40) * 2.3 + Math.floor(z / 40) * 1.3));   // ovadaki tarlalar
      if (Math.abs(x) < TRAV_HALF + 10 && z > SLOPE_Z0 - 6 && z < SLOPE_Z1 + 4) c.lerp(white, 0.5);   // traverten kenarı
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
const groundY = (x: number, z: number) => heightAt(x, z) + sideHill(x, z) - (z > SLOPE_Z1 ? (z - SLOPE_Z1) * 0.02 : 0);
const onTrav = (x: number, z: number) => Math.abs(x) < TRAV_HALF + 6 && z > SLOPE_Z0 - 6 && z < SLOPE_Z1 + 4;
const nearRoute = (x: number, z: number, d: number) => { for (let s = 0; s <= ROUTE_LEN; s += 3) { const p = routeAt(s).p; if (Math.abs(p[0] - x) + Math.abs(p[2] - z) < d) return true; } return false; };
const TH_AT = SPOTS.find((s) => s.id === 'tiyatro')!.at, TH = { x: TH_AT[0] - 12, z: TH_AT[1] - 12.1 };
/** Spot çevresi, tiyatro ve Antik Havuz alanı: ot/ağaç/kalıntı konmaz */
const nearSpot = (x: number, z: number, d: number) => SPOTS.some((s) => Math.hypot(s.at[0] - x, s.at[1] - z) < d) || Math.hypot(x - TH.x, z - TH.z) < 40 || (Math.abs(x - POOL.x) < POOL.w / 2 + 2 && Math.abs(z - POOL.z) < POOL.d / 2 + 2);

export function Grass({ n }: { n: number }) {
  const tuft = useRef<THREE.InstancedMesh>(null), flower = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(97), o = new THREE.Object3D(), col = new THREE.Color(); let k = 0, f = 0; const nf = Math.floor(n / 6);
    for (let i = 0; i < n * 4 && k < n; i++) { const R = routeAt(r() * ROUTE_LEN).p, x = R[0] + (r() - 0.5) * 120, z = R[2] + (r() - 0.5) * 90;
      if (onTrav(x, z) || nearRoute(x, z, 2.5) || nearSpot(x, z, 0)) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const sc = 0.35 + r() * 0.45; o.scale.set(sc, sc * (0.8 + r() * 0.6), sc); o.updateMatrix(); tuft.current?.setMatrixAt(k, o.matrix); col.setHSL(0.15 + r() * 0.06, 0.3 + r() * 0.15, 0.5 + r() * 0.2); tuft.current?.setColorAt(k, col); k++;
      if (f < nf && r() < 0.2) { o.position.y += 0.45 * sc; o.scale.setScalar(0.035 + r() * 0.025); o.updateMatrix(); flower.current?.setMatrixAt(f, o.matrix); flower.current?.setColorAt(f, col.set(['#e8d24a', '#f2f0ea', '#d75c8a'][Math.floor(r() * 3)])); f++; } }
    for (const [m, c] of [[tuft.current, k], [flower.current, f]] as const) if (m) { m.count = c; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return (<group userData={{ noCast: true }}>
    <instancedMesh ref={tuft} args={[geo, mat, n]} />
    <instancedMesh ref={flower} args={[undefined, undefined, Math.floor(n / 6)]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
  </group>);
}
/** Ağaç türleri tek geometri: kızılçam (uzun gövde, düzensiz taç), zakkum çalısı (pembe çiçekli), servi */
function treeGeo(kind: 'pine' | 'oleander' | 'cypress', seed: number) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const c = new THREE.Color(), col: number[] = []; for (let i = 0; i < g.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g.index ? g.toNonIndexed() : g; };
  const noisy = (g: THREE.BufferGeometry, a: number) => { const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 5.1 + p.getY(i) * 3.7) * Math.cos(p.getZ(i) * 4.3) * a; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } return g; };
  if (kind === 'pine') { parts.push(paint(new THREE.CylinderGeometry(0.18, 0.32, 7, 7).translate(0, 3.5, 0), '#6a4a34', 0.05)); for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1 + r() : 0; parts.push(paint(noisy(new THREE.IcosahedronGeometry(1.5 + r() * 0.7, 1), 0.12).scale(1.1, 0.7, 1.1).translate(Math.cos(a) * d, 5.6 + r() * 2.2, Math.sin(a) * d), '#4d6634', 0.08)); } }
  else if (kind === 'oleander') { for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = r() * 0.8; parts.push(paint(noisy(new THREE.IcosahedronGeometry(i < 3 ? 0.8 + r() * 0.3 : 0.45, 1), 0.15).translate(Math.cos(a) * d, 0.8 + r() * 0.6, Math.sin(a) * d), i < 3 ? '#5f7a40' : '#b9708c', 0.1)); } }
  else { parts.push(paint(new THREE.CylinderGeometry(0.1, 0.15, 1, 6).translate(0, 0.5, 0), '#5a4330', 0.05)); parts.push(paint(noisy(new THREE.SphereGeometry(1, 10, 10), 0.08).scale(1.1, 4.4, 1.1).translate(0, 4.6, 0), '#3e5430', 0.08)); }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
}
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => (['pine', 'oleander', 'cypress'] as const).map((k, i) => ({ k, geo: treeGeo(k, 31 + i) })), []);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]), mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0, 0];
    for (let i = 0; i < n * 6 && cnt.reduce((a, b) => a + b) < n; i++) { const x = (r() - 0.5) * 420, z = -260 + r() * 520; if (onTrav(x, z) || nearRoute(x, z, 4) || nearSpot(x, z, 18)) continue;
      const q = r(), t = z > SLOPE_Z1 + 20 ? (q < 0.5 ? 2 : 0) : q < 0.55 ? 0 : q < 0.85 ? 1 : 2, m = refs.current[t]; if (!m) continue;
      o.position.set(x, groundY(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); m.setMatrixAt(cnt[t]++, o.matrix); }
    // Antik Havuz'un çevresi: zakkum ve çam (gerçekte havuz ağaçlarla çevrili)
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28, x = POOL.x + Math.cos(a) * 19, z = POOL.z + Math.sin(a) * 14, t = i % 2 ? 0 : 2, m = refs.current[t]; if (!m || nearRoute(x, z, 2.5)) continue; o.position.set(x, PLATEAU - 0.2, z); o.scale.setScalar(1); o.updateMatrix(); m.setMatrixAt(cnt[t]++, o.matrix); }
    refs.current.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }); }, [n, kinds]);
  return <group>{kinds.map((k, i) => <instancedMesh key={k.k} ref={(m) => { refs.current[i] = m; }} args={[k.geo, mat, n + 20]} castShadow receiveShadow />)}</group>;
}
/** Aşağıda Pamukkale köyü: beyaz badanalı, kiremit çatılı evler */
export function Village({ n }: { n: number }) {
  const body = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null);
  const roofGeo = useMemo(() => new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0), []);
  useEffect(() => { const r = rng(55), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = (r() - 0.5) * 260, z = SLOPE_Z1 + 30 + r() * 140; if (nearRoute(x, z, 8)) continue;
      const w = 6 + r() * 6, d = 6 + r() * 5, h = 3 + r() * 4, y = groundY(x, z) - 0.2; o.rotation.set(0, Math.round(r() * 3) * 1.5708 + (r() - 0.5) * 0.2, 0);
      o.position.set(x, y, z); o.scale.set(w, h, d); o.updateMatrix(); body.current?.setMatrixAt(k, o.matrix); body.current?.setColorAt(k, c.set(['#f3efe6', '#ece2cf', '#e8d9bd'][Math.floor(r() * 3)]));
      o.position.set(x, y + h, z); o.scale.set(w * 1.08, 1.6 + r(), d * 1.08); o.updateMatrix(); roof.current?.setMatrixAt(k, o.matrix); roof.current?.setColorAt(k, c.set(['#a4553f', '#b4644a', '#9a4e3a'][Math.floor(r() * 3)])); k++; }
    for (const m of [body.current, roof.current]) if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return (<group>
    <instancedMesh ref={body} args={[undefined, undefined, n]} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>
    <instancedMesh ref={roof} args={[roofGeo, undefined, n]} castShadow><meshStandardMaterial roughness={0.85} /></instancedMesh>
  </group>);
}
/** Uzak dağlar: güneydoğuda karlı Honaz Dağı, çevrede Menderes ovasını saran sırtlar */
export function Mountains() {
  const list = useMemo(() => { const r = rng(61), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    out.push({ p: [900, -20, 1500], g: mountainGeo(900, 520, 3, 0.72, '#8f8b72') });   // Honaz
    for (let i = 0; i < 10; i++) { const a = -0.2 + (i / 9) * 3.6, d = 1500 + r() * 600; out.push({ p: [Math.sin(a) * d, -20, Math.cos(a) * d + 400], g: mountainGeo(500 + r() * 300, 160 + r() * 180, 70 + i, 2, '#9a9474') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((m, i) => <mesh key={i} geometry={m.g} position={m.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== Hierapolis ===================== */
export interface Mats { lime: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const mk = (key: string, pal: string[], courses?: [number, number], bw?: [number, number], extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => { const t = stoneTex(key, pal, courses, bw); return weather(new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.3, roughness: 0.92, ...extra })); };
    return {
      lime: mk('hier-lime', ['#d9cfb9', '#cfc4ab', '#ddd3be', '#c7bba1', '#d4c9b1'], [46, 30], [90, 80]),
      marble: mk('hier-marble', ['#e9e4d8', '#e1dbcd', '#ede8de', '#d8d1c1'], [70, 40], [140, 90], { roughness: 0.7 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2b2620', roughness: 1 }),
    };
  }, []);
}
function drum(r0: number, h: number) { const g = new THREE.CylinderGeometry(r0, r0, h, 32, 1), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); if (Math.hypot(x, z) < 1e-3) continue; const k = 1 - 0.05 * Math.abs(Math.sin(a * 10)) ** 0.6; p.setX(i, x * k); p.setZ(i, z * k); } g.computeVertexNormals(); return g; }
/** Antik Havuz: taş kenarlı, berrak turkuaz su; dipte ve kenarda devrik sütunlar, birkaç ayakta sütun */
const AP = SPOTS.find((s) => s.id === 'antik-havuz')!.at, POOL = { x: AP[0] - 17, z: AP[1] - 7, w: 24, d: 16 }   // rotanın batısında, yola 5 m;
export function AntiquePool({ m }: { m: Mats }) {
  const cx = POOL.x, cz = POOL.z, W = POOL.w, D = POOL.d;
  const col = useMemo(() => drum(0.42, 1), []), pieces = useMemo(() => { const r = rng(31); return Array.from({ length: 16 }, () => ({ x: cx - W / 2 + 2 + r() * (W - 4), z: cz - D / 2 + 2 + r() * (D - 4), a: r() * 3, l: 2 + r() * 3, sunk: r() < 0.75 })); }, [cx, cz]);
  return (<group>
    {/* havuz çukuru: taş kenar ve iç duvarlar */}
    {[[0, -D / 2, W + 2, 1], [0, D / 2, W + 2, 1], [-W / 2, 0, 1, D], [W / 2, 0, 1, D]].map(([x, z, w, d], i) => <mesh key={i} geometry={bx(w, 2.2, d, 3)} material={m.lime} position={[cx + x, PLATEAU - 0.9, cz + z]} />)}
    <mesh rotation-x={-Math.PI / 2} position={[cx, PLATEAU - 1.9, cz]}><planeGeometry args={[W, D]} /><meshStandardMaterial color="#8fb7a8" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[cx, PLATEAU - 0.35, cz]}><planeGeometry args={[W - 0.2, D - 0.2]} /><meshStandardMaterial color="#7fd8de" roughness={0.03} metalness={0.1} transparent opacity={0.62} envMapIntensity={1.5} /></mesh>
    {pieces.map((p, i) => <mesh key={i} geometry={col} material={m.marble} position={[p.x, p.sunk ? PLATEAU - 1.5 : PLATEAU - 0.1, p.z]} rotation={[Math.PI / 2, 0, p.a]} scale={[1, p.l, 1]} />)}
    {[[-7, -D / 2 - 1.4], [-2, -D / 2 - 1.4], [3, -D / 2 - 1.4]].map(([x, z], i) => <group key={'s' + i} position={[cx + x, PLATEAU, cz + z]}><mesh geometry={col} material={m.marble} position={[0, 2.4, 0]} scale={[1, 4.8, 1]} /><mesh material={m.marble} position={[0, 5, 0]}><boxGeometry args={[1.3, 0.4, 1.3]} /></mesh></group>)}
    {/* üstü kapalı havuz binası (bugünkü kaplıca yapısı yerine sade bir revak) */}
    <mesh geometry={bx(W + 4, 0.5, 4, 3)} material={m.lime} position={[cx, PLATEAU + 5.4, cz - D / 2 - 1.4]} />
  </group>);
}
/** Tiyatro: yamaca yaslanan yarım daire oturma basamakları (ziyaretçiye açık) ve iki katlı, sütunlu sahne binası */
export function Theatre({ m }: { m: Mats }) {
  const cx = TH.x, cz = TH.z;   // rota orkestra ile sahne arasından geçer: bir yanda basamaklar, öbür yanda sahne cephesi
  const cavea = useMemo(() => { const pts: THREE.Vector2[] = [new THREE.Vector2(10, -0.5), new THREE.Vector2(10, 0)]; for (let i = 0; i < 26; i++) { pts.push(new THREE.Vector2(10 + i * 1.0, (i + 1) * 0.55)); pts.push(new THREE.Vector2(10 + (i + 1) * 1.0, (i + 1) * 0.55)); } pts.push(new THREE.Vector2(36.6, 26 * 0.55)); pts.push(new THREE.Vector2(36.6, -0.6));
    const shape = new THREE.Shape(pts.map((v) => v.clone()));
    const g = new THREE.LatheGeometry(pts.reverse(), 56, 0, Math.PI); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 44, uv.getY(i) * 14);
    // iki uçtaki yan duvar (analemma): basamakların kesiti açık kalmasın
    const capA = new THREE.ShapeGeometry(shape).rotateY(-Math.PI / 2), capB = new THREE.ShapeGeometry(shape).rotateY(Math.PI / 2);
    for (const c of [capA, capB]) { const u = c.attributes.uv as THREE.BufferAttribute, q = c.attributes.position as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, q.getZ(i) / 1.6, q.getY(i) / 1.6); }
    return mergeGeometries([g.toNonIndexed(), capA.toNonIndexed(), capB.toNonIndexed()])!; }, []);
  const col = useMemo(() => drum(0.4, 1), []);
  return (<group position={[cx, PLATEAU, cz]} rotation-y={0.87}>
    {/* oturma basamakları yerel +x'te, sahne binası -x'te; cephesi basamaklara bakar. Yerel x=-1,5 hattı rotadır */}
    <mesh geometry={cavea} material={m.lime} material-side={THREE.DoubleSide} />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}><circleGeometry args={[10, 40]} /><meshStandardMaterial map={m.marble.map} roughness={0.8} /></mesh>
    {/* sahne binası: iki katlı cephe, kapılar, iki sıra sütun */}
    <mesh geometry={bx(3, 12, 32, 3)} material={m.lime} position={[-8.5, 6, 0]} />
    <mesh geometry={bx(3, 1.4, 31, 3)} material={m.marble} position={[-6, 0.7, 0]} />
    {[-10, -5, 0, 5, 10].map((z) => <mesh key={z} material={m.dark} position={[-6.98, 3.4, z]}><boxGeometry args={[0.1, 3.6, z === 0 ? 2.4 : 1.8]} /></mesh>)}
    {[0, 1].flatMap((f) => Array.from({ length: 8 }, (_, i) => <mesh key={`${f}-${i}`} geometry={col} material={m.marble} position={[-5.4, 1.4 + 2.4 + f * 5, -14 + i * 4]} scale={[1, 4.8, 1]} />))}
    {[0, 1].map((f) => <mesh key={'e' + f} geometry={bx(2.2, 0.6, 31, 3)} material={m.marble} position={[-5.6, 6.6 + f * 5, 0]} />)}
  </group>);
}
/** Frontinus Kapısı: iki yuvarlak kule arasında üç kemerli kapı; yol ortadaki kemerden geçer */
export function FrontinusGate({ m }: { m: Mats }) {
  const s = (() => { let best = 0, bd = Infinity; for (let q = 0; q <= ROUTE_LEN; q += 0.5) { const p = routeAt(q).p, d = Math.hypot(p[0] + 40, p[2] + 150); if (d < bd) { bd = d; best = q; } } return best; })();
  const R = routeAt(s), yaw = Math.atan2(R.dir[0], R.dir[1]);
  const arch = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(-14, 0); sh.lineTo(14, 0); sh.lineTo(14, 9); sh.lineTo(-14, 9); sh.closePath(); for (const x of [-7.5, 0, 7.5]) { const h = new THREE.Path(), w = x === 0 ? 2.4 : 2; h.moveTo(x - w, 0); h.lineTo(x - w, 4.6); h.absarc(x, 4.6, w, Math.PI, 0, true); h.lineTo(x + w, 0); h.closePath(); sh.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false }); g.translate(0, 0, -1.5); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); return g; }, []);
  return (<group position={[R.p[0], R.p[1] - 0.05, R.p[2]]} rotation-y={yaw + Math.PI / 2}>
    <mesh geometry={arch} material={m.lime} rotation-y={Math.PI / 2} />
    {[-17.5, 17.5].map((z) => <group key={z} position={[0, 0, z]}><mesh material={m.lime} position={[0, 5.5, 0]}><cylinderGeometry args={[4, 4.3, 11, 24]} /></mesh><mesh material={m.dark} position={[0, 11.2, 0]}><cylinderGeometry args={[4.1, 4.1, 0.4, 24]} /></mesh></group>)}
  </group>);
}
/** Nekropol: üçgen kapaklı lahitler, ev biçimli mezarlar, tümülüsler */
export function Necropolis({ n, m }: { n: number; m: Mats }) {
  const c = SPOTS.find((s) => s.id === 'nekropol')!.at;
  const boxRef = useRef<THREE.InstancedMesh>(null), lidRef = useRef<THREE.InstancedMesh>(null);
  const boxG = useMemo(() => bx(2.4, 1.3, 1.2, 2), []), lidG = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(-0.7, 0); sh.lineTo(0, 0.55); sh.lineTo(0.7, 0); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 2.5, bevelEnabled: false }); g.translate(0, 0, -1.25); g.rotateY(Math.PI / 2); return g; }, []);
  useEffect(() => { const r = rng(41), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 3 && k < n; i++) { const a = r() * 6.28, d = 6 + r() * 50, x = c[0] + Math.cos(a) * d, z = c[1] - 8 + Math.sin(a) * d; if (nearRoute(x, z, 2.5)) continue; const yaw = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.3, y = groundY(x, z), tilt = r() < 0.25 ? 0.35 : 0;
      o.position.set(x, y + 0.65, z); o.rotation.set(0, yaw, 0); o.updateMatrix(); boxRef.current?.setMatrixAt(k, o.matrix); o.position.set(x, y + 1.3, z); o.rotation.set(tilt, yaw, 0); o.updateMatrix(); lidRef.current?.setMatrixAt(k, o.matrix); k++; }
    for (const mm of [boxRef.current, lidRef.current]) if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n, c]);
  return (<group>
    <instancedMesh ref={boxRef} args={[boxG, m.lime, n]} castShadow receiveShadow />
    <instancedMesh ref={lidRef} args={[lidG, m.lime, n]} castShadow receiveShadow />
    {[[-24, -14], [16, -30], [-6, -50]].map(([dx, dz], i) => <group key={i} position={[c[0] + dx, groundY(c[0] + dx, c[1] + dz), c[1] + dz]}>
      <mesh scale={[1, 0.42, 1]}><sphereGeometry args={[7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#9c9a6e" roughness={1} /></mesh>
      <mesh geometry={bx(14.6, 1.2, 14.6, 3)} material={m.lime} position={[0, 0.3, 0]} scale={[1, 1, 1]} visible={false} />
      <mesh material={m.lime} position={[0, 0.6, 0]}><cylinderGeometry args={[7.1, 7.2, 1.2, 28, 1, true]} /></mesh>
    </group>)}
    {[[20, 6], [28, -8], [-30, 8]].map(([dx, dz], i) => <group key={'h' + i} position={[c[0] + dx, groundY(c[0] + dx, c[1] + dz), c[1] + dz]} rotation-y={i * 0.7}>
      <mesh geometry={bx(5, 3.4, 6, 3)} material={m.lime} position={[0, 1.7, 0]} />
      <mesh material={m.lime} position={[0, 3.4, 0]} rotation-y={Math.PI / 4} scale={[1, 0.6, 1]}><coneGeometry args={[4.3, 2.2, 4]} /></mesh>
      <mesh material={m.dark} position={[0, 1.2, 3.01]}><planeGeometry args={[1.1, 1.8]} /></mesh>
    </group>)}
  </group>);
}
/** Platodaki dağınık sütun tamburları ve blok parçaları */
export function Ruins({ m, n }: { m: Mats; n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), col = useMemo(() => drum(0.45, 1.2), []);
  useEffect(() => { const r = rng(83), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 4 && k < n; i++) { const x = (r() - 0.5) * 200, z = -30 - r() * 170; if (nearRoute(x, z, 2.5) || nearSpot(x, z, 14)) continue; o.position.set(x, groundY(x, z) + 0.4, z); o.rotation.set(r() < 0.7 ? Math.PI / 2 : 0, r() * 3, 0); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[col, m.marble, n]} castShadow receiveShadow />;
}
