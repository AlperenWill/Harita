/**
 * Troya — 3B modeller (v2). Ortak manzara kiti (shared/scenery.tsx: taş dokusu, dip kirlenmesi, zemin ayrıntısı, ot kartları,
 * gölgeli güneş, bulut) ile Ani ve İshak Paşa düzeyine çekildi.
 *
 * Neler temsilîdir (plan STİLİZEDİR, ölçüler yaklaşıktır):
 *  - Troya VI surları: eğimli (şevli) kesme kireçtaşı duvar, birkaç metrede bir sığ dikey kırık (Troya VI surlarının tipik "ofset"leri), yıkık üst kenar.
 *  - Doğu kulesi: şevli kare kule kaidesi.
 *  - Troya II: taş temel + kerpiç duvar kalıntılı megaronlar, taş döşeli rampa.
 *  - Schliemann yarması: katman bantlı toprak duvarlar, dipte Troya I duvarları, kenarında ahşap seyir korkuluğu.
 *  - Athena Tapınağı (Troya VIII): mermer blok krepis, yivli sütun tamburları, başlık ve arşitrav parçaları.
 *  - Odeon (Troya IX): yarım daire oturma basamakları, orkestra döşemesi, sahne binası kalıntısı.
 *  - Tahta at: 1970'lerden kalma modern kopyanın temsilî modeli.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { LAYERS, MOUND, ROUTE_LEN, STOPS, TRENCH, heightAt, routeAt } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Öğleden sonra güneşi (güneybatıdan): uzun, okunaklı gölgeler */
export const SUN_DIR = new THREE.Vector3(-0.62, 0.5, 0.6).normalize();

/* ---------- malzemeler ---------- */
export interface Mats { lime: THREE.MeshStandardMaterial; limeDark: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; brick: THREE.MeshStandardMaterial; flag: THREE.MeshStandardMaterial; rubble: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; woodDark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const mk = (key: string, pal: string[], courses?: [number, number], bw?: [number, number], extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => { const t = stoneTex(key, pal, courses, bw); return weather(new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.3, roughness: 0.94, ...extra })); };
    return {
      // Troya VI kireçtaşı: sıcak bej, iri ve düzgün bloklar
      lime: mk('troy-lime', ['#c8b48e', '#bfa983', '#cdb995', '#b9a47e', '#c4ae88'], [44, 30], [90, 80]),
      limeDark: mk('troy-limed', ['#a8936e', '#9e8966', '#b09b75', '#97825f'], [30, 26], [50, 60]),
      marble: mk('troy-marble', ['#d9d2c3', '#cfc7b6', '#ddd6c8', '#c8bfad', '#d4ccbb'], [70, 40], [140, 90], { roughness: 0.7 }),
      brick: mk('troy-brick', ['#b89670', '#ad8b66', '#c19f78', '#a88663'], [14, 4], [34, 10]),   // kerpiç
      flag: mk('troy-flag', ['#9c9286', '#a89d90', '#8f857a', '#b0a597'], [46, 36], [50, 60]),     // rampa döşemesi
      rubble: mk('troy-rubble', ['#8f7c62', '#9a8669', '#857358', '#a28e70'], [18, 16], [22, 26]),  // moloz taş (Troya I–II)
      wood: new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.85 }),
      woodDark: new THREE.MeshStandardMaterial({ color: '#4a2e18', roughness: 0.9 }),
    };
  }, []);
}
function plankTex() { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!, r = rng(19); for (let x = 0; x < 64; x += 16) { const v = 120 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.66 | 0},${v * 0.4 | 0})`; g.fillRect(x, 0, 16, 256); g.fillStyle = 'rgba(30,15,5,.6)'; g.fillRect(x, 0, 1.5, 256); for (let k = 0; k < 20; k++) { g.fillStyle = `rgba(40,20,8,${r() * 0.25})`; g.fillRect(x + 2 + r() * 12, r() * 256, 1, 20 + r() * 60); } } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
/** Geometrinin UV'lerini ölçekle (doku metre başına tekrar etsin) */
function scaleUV(g: THREE.BufferGeometry, k: number) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); return g; }

/* ---------- arazi ---------- */
/** Rotaya en yakın mesafe (patika rengi ve ot yerleşimi için) */
const ROUTE_PTS = (() => { const out: [number, number][] = []; for (let s = 0; s <= ROUTE_LEN; s += 2) { const p = routeAt(s).p; out.push([p[0], p[2]]); } return out; })();
function routeDist(x: number, z: number) { let d = Infinity; for (const [px, pz] of ROUTE_PTS) { const e = (px - x) ** 2 + (pz - z) ** 2; if (e < d) d = e; } return Math.sqrt(d); }

/** Yarmanın çevresindeki sık örgülü arazi yaması: ana arazinin 3,5 m'lik ağı yarmanın dik kenarını rampaya çevirirdi */
const PATCH = { x0: TRENCH.x - 15, x1: TRENCH.x + 15, z0: TRENCH.z0 - 10, z1: TRENCH.z1 + 10 };
const inPatch = (x: number, z: number, inset: number) => x > PATCH.x0 + inset && x < PATCH.x1 - inset && z > PATCH.z0 + inset && z < PATCH.z1 - inset;
function terrainGeo(w: number, d: number, nw: number, nd: number, cx: number, cz: number, hide: boolean) {
  const g = new THREE.PlaneGeometry(w, d, nw, nd); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(3);
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 900 + 0.5, -p.getZ(i) / 900 + 0.5);   // dünya koordinatlı UV: yama ile ana arazi aynı doku ölçeğinde
  const grass = new THREE.Color('#a3a25c'), dry = new THREE.Color('#c6b27c'), green = new THREE.Color('#8a9650'), dirt = new THREE.Color('#b8986a'), path = new THREE.Color('#c9ad80'), field = new THREE.Color('#b9a25e');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, hide && inPatch(x, z, 4) ? y - 4 : y);   // yamanın altında kalan kaba ağ gizlenir
    const n = Math.sin(x * 0.035 + z * 0.021) * 0.5 + 0.5, m = Math.sin(x * 0.012) * Math.cos(z * 0.015);
    c.copy(grass).lerp(dry, n * 0.55 + r() * 0.2).lerp(green, Math.max(0, m) * 0.45);
    if (Math.hypot(x, z * 1.15) > 150) c.lerp(field, 0.35 + 0.25 * Math.sin(Math.floor(x / 60) * 3.1 + Math.floor(z / 60) * 1.7));   // ovadaki tarlalar
    c.lerp(dirt, Math.min(1, y / MOUND.h * 1.2) * 0.55);   // höyük: kazı toprağı
    if (Math.abs(x - TRENCH.x) < TRENCH.w / 2 && z > TRENCH.z0 && z < TRENCH.z1) c.copy(dirt).multiplyScalar(0.8);
    const rd = Math.hypot(x, z * 1.15) < 140 ? routeDist(x, z) : 99; if (rd < 2.4) c.lerp(path, 1 - rd / 2.4 * 0.6);   // ziyaretçi patikası
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 260 : tier === 'medium' ? 200 : 140; return terrainGeo(900, 900, N, N, 0, 0, true); }, [tier]);
  const patch = useMemo(() => terrainGeo(PATCH.x1 - PATCH.x0, PATCH.z1 - PATCH.z0, 60, 100, (PATCH.x0 + PATCH.x1) / 2, (PATCH.z0 + PATCH.z1) / 2, false), []);
  const tex = useMemo(() => groundTex(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.map, bumpMap: tex.bump, bumpScale: 0.25, roughness: 1 }), [tex]);
  return <group userData={{ noCast: true }}><mesh geometry={geo} material={mat} receiveShadow /><mesh geometry={patch} material={mat} receiveShadow /></group>;
}
/* ---------- bitki örtüsü ---------- */
/** Üç ağaç türü tek birleşik geometri olarak: meşe (yuvarlak taç), fıstık çamı (şemsiye taç), servi */
function treeGeo(kind: 'oak' | 'pine' | 'cypress', seed: number) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, jitter: number) => { const c = new THREE.Color(), col: number[] = []; for (let i = 0; i < g.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * jitter); col.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g; };
  const noisy = (g: THREE.BufferGeometry, amp: number) => { const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 5.1 + p.getY(i) * 3.7) * Math.cos(p.getZ(i) * 4.3)) * amp; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; };
  if (kind === 'oak') {
    parts.push(paint(new THREE.CylinderGeometry(0.22, 0.34, 3.2, 7).translate(0, 1.6, 0), '#5a4330', 0.06));
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, d = i === 0 ? 0 : 1.2 + r() * 1.4, s = 1.6 + r() * 0.9; parts.push(paint(noisy(new THREE.IcosahedronGeometry(s, 1), 0.12).scale(1, 0.85, 1).translate(Math.cos(a) * d, 3.6 + r() * 1.4, Math.sin(a) * d), '#5b6c38', 0.08)); }
  } else if (kind === 'pine') {
    parts.push(paint(new THREE.CylinderGeometry(0.22, 0.36, 6, 7).translate(0, 3, 0).rotateZ(0.06), '#6a4a34', 0.05));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + r(), d = i === 0 ? 0 : 1.6; parts.push(paint(noisy(new THREE.SphereGeometry(2.2, 10, 7), 0.12).scale(1.25, 0.55, 1.25).translate(Math.cos(a) * d, 6.2 + r() * 0.6, Math.sin(a) * d), '#46602f', 0.07)); }
  } else {
    parts.push(paint(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6).translate(0, 0.6, 0), '#5a4330', 0.05));
    parts.push(paint(noisy(new THREE.SphereGeometry(1, 10, 10), 0.08).scale(1.1, 4.2, 1.1).translate(0, 4.4, 0), '#3e5430', 0.08));
  }
  const g = mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p)); g.computeVertexNormals(); return g;
}
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => (['oak', 'pine', 'cypress'] as const).map((k, i) => ({ k, geo: treeGeo(k, 31 + i) })), []);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  useEffect(() => {
    const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0, 0], col = new THREE.Color();
    for (let i = 0; i < n * 5 && cnt.reduce((a, b) => a + b) < n; i++) {
      const a = r() * Math.PI * 2, d = 80 + Math.pow(r(), 0.8) * 300, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (x < -280) continue;   // batıda deniz kıyısı açık kalsın
      const q = r(), t = q < 0.6 ? 0 : q < 0.82 ? 1 : 2, m = refs.current[t]; if (!m) continue;
      o.position.set(x, heightAt(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.6); o.updateMatrix(); m.setMatrixAt(cnt[t], o.matrix); m.setColorAt(cnt[t], col.setScalar(0.85 + r() * 0.3)); cnt[t]++;
    }
    // girişteki ve patika boyundaki birkaç ağaç (gölgeleri yola düşer)
    const near: [number, number, number][] = [[92, 58, 0], [64, 66, 0], [58, 40, 1], [-24, -70, 0], [30, -70, 2], [36, -64, 2], [-62, -20, 1], [-70, 10, 0]];
    for (const [x, z, t] of near) { const m = refs.current[t]; if (!m) continue; o.position.set(x, heightAt(x, z) - 0.1, z); o.rotation.set(0, x, 0); o.scale.setScalar(1); o.updateMatrix(); m.setMatrixAt(cnt[t], o.matrix); m.setColorAt(cnt[t], col.setScalar(1)); cnt[t]++; }
    refs.current.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); });
  }, [n, kinds]);
  return <group>{kinds.map((k, i) => <instancedMesh key={k.k} ref={(m) => { refs.current[i] = m; }} args={[k.geo, mat, n + 8]} castShadow receiveShadow />)}</group>;
}
/** Kuru ot tutamları ve gelincik/papatya */
export function Grass({ n }: { n: number }) {
  const tuft = useRef<THREE.InstancedMesh>(null), flower = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useGrassCards();
  useEffect(() => {
    const r = rng(97), o = new THREE.Object3D(), col = new THREE.Color(); let k = 0, f = 0; const nf = Math.floor(n / 5);
    for (let i = 0; i < n * 4 && k < n; i++) {
      const R = routeAt(r() * ROUTE_LEN).p, x = R[0] + (r() - 0.5) * 70, z = R[2] + (r() - 0.5) * 70;
      if (routeDist(x, z) < 2.2) continue; if (Math.abs(x - TRENCH.x) < TRENCH.w / 2 + 0.5 && z > TRENCH.z0 - 0.5 && z < TRENCH.z1 + 0.5) continue;
      o.position.set(x, heightAt(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const sc = 0.7 + r() * 0.9; o.scale.set(sc, sc * (0.8 + r() * 0.6), sc); o.updateMatrix(); tuft.current?.setMatrixAt(k, o.matrix); col.setHSL(0.12 + r() * 0.05, 0.32 + r() * 0.15, 0.6 + r() * 0.2); tuft.current?.setColorAt(k, col); k++;
      if (f < nf && r() < 0.25) { o.position.y += 0.45 * sc; o.scale.setScalar(0.06 + r() * 0.04); o.updateMatrix(); flower.current?.setMatrixAt(f, o.matrix); flower.current?.setColorAt(f, col.set(['#d7372f', '#d7372f', '#f2f0ea', '#e8c63a'][Math.floor(r() * 4)])); f++; }
    }
    for (const [m, c] of [[tuft.current, k], [flower.current, f]] as const) if (m) { m.count = c; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
  }, [n]);
  return (<group userData={{ noCast: true }}>
    <instancedMesh ref={tuft} args={[geo, mat, n]} />
    <instancedMesh ref={flower} args={[undefined, undefined, Math.floor(n / 5)]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
  </group>);
}
/** Höyükte dağınık taş parçaları */
export function Rubble({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(83), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 3 && k < n; i++) { const a = r() * Math.PI * 2, d = 10 + r() * 62, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.87; if (routeDist(x, z) < 2) continue; o.position.set(x, heightAt(x, z) + 0.05, z); o.rotation.set(r(), r() * 3, r()); o.scale.set(0.25 + r() * 0.5, 0.18 + r() * 0.3, 0.25 + r() * 0.45); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow receiveShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#b3a284" roughness={1} flatShading /></instancedMesh>;
}
/** Uzak tepeler (Kaz Dağları yönü) ve batıda Ege / Çanakkale Boğazı ağzı */
export function Horizon() {
  const hills = useMemo(() => { const r = rng(55), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = []; for (let i = 0; i < 12; i++) { const a = -0.4 + (i / 11) * 3.6, d = 950 + r() * 450; out.push({ p: [Math.sin(a) * d * 0.9 + 200, -6, -Math.cos(a) * d], g: mountainGeo(320 + r() * 260, 70 + r() * 110, 60 + i, 2, '#a49a77') }); } return out; }, []);
  const sea = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = rng(5); g.fillStyle = '#4d7f9c'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(220,240,250,${r() * 0.25})`; g.fillRect(r() * 128, r() * 128, 6 + r() * 16, 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 160); return t; }, []);
  return (<group userData={{ noCast: true }}>
    {hills.map((h, i) => <mesh key={i} geometry={h.g} position={h.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[-760, 0.3, 0]}><planeGeometry args={[900, 2600]} /><meshStandardMaterial map={sea} roughness={0.3} metalness={0.05} /></mesh>
  </group>);
}

/* ---------- Troya VI surları ve doğu kulesi ---------- */
/** Şevli duvar parçası: alt kalın, üst ince (Troya VI surlarının belirgin eğimi); dış yüz +x */
function batter(len: number, h: number, base: number, top: number) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(base, 0); s.lineTo(top, h); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(-base * 0.6, 0, -len / 2); return scaleUV(g, 0.25);
}
const WALL_A0 = -0.9, WALL_A1 = 0.75, WALL_R = 50;
const TOWER = (() => { const g = new THREE.CylinderGeometry(4.6, 5.6, 6.4, 4, 1).rotateY(Math.PI / 4); g.translate(0, 3.2, 0); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6.5, uv.getY(i) * 1.6); return g; })();
export function Walls({ m }: { m: Mats }) {
  const inner = useMemo(() => [bx(5, 1.2, 0.7, 3), bx(0.7, 1.2, 5, 3)], []);
  const segs = useMemo(() => {
    const r = rng(71), out: { x: number; z: number; yaw: number; h: number; off: number; g: THREE.BufferGeometry; gap: boolean }[] = [];
    let i = 0; for (let a = WALL_A0; a <= WALL_A1; a += 0.085, i++) {
      const off = Math.floor(i / 2) % 2 ? 0.35 : 0, R = WALL_R + off, x = Math.cos(a) * R, z = Math.sin(a) * R * 0.87;
      const rd = routeDist(x, z), gap = rd < 4, h = 2.6 + r() * 1.8 - (rd < 9 ? 1.2 : 0);   // patikanın surları kestiği yerde geçit; iki yanı alçak
      out.push({ x, z, yaw: Math.atan2(-Math.sin(a), 0.87 * Math.cos(a)), h, off, g: batter(4.6, h, 3.6, 1.8), gap });
    }
    return out;
  }, []);
  return (<group>
    {segs.filter((s) => !s.gap).map((s, i) => <mesh key={i} geometry={s.g} material={m.lime} position={[s.x, heightAt(s.x, s.z) - 1.2, s.z]} rotation-y={s.yaw} />)}
    {/* doğu kulesi: şevli kare kaide + üstte iç bölmeler */}
    <group position={[54, heightAt(54, 6) - 1.4, 6]} rotation-y={-0.12}>
      <mesh geometry={TOWER} material={m.lime} />
      {[[-1.6, 0], [1.6, 0], [0, -1.6]].map(([x, z], i) => <mesh key={i} geometry={x === 0 ? inner[0] : inner[1]} material={m.limeDark} position={[x, 7, z]} />)}
    </group>
    {/* surların içinde Troya VI ev temelleri */}
    {[[34, -10, 0.4], [30, 14, -0.3], [38, 24, 0.9]].map(([x, z, a], i) => <group key={i} position={[x, heightAt(x, z), z]} rotation-y={a}>
      {[[0, 3, 9, 0.8], [0, -3, 9, 0.8], [-4.5, 0, 0.8, 6.8], [4.5, 0, 0.8, 6.8]].map(([px, pz, w, d], k) => <mesh key={k} geometry={bx(w, 0.9 + (k % 2) * 0.4, d, 3)} material={m.limeDark} position={[px, 0.35, pz]} />)}
    </group>)}
  </group>);
}

/* ---------- Troya II: megaronlar ve rampa ---------- */
export function Megaron({ m }: { m: Mats }) {
  const y = heightAt(12, -50), halls = useMemo(() => [{ x: 0, z: 0, l: 18, w: 8 }, { x: -12, z: 4, l: 12, w: 6.5 }, { x: 10, z: 6, l: 10, w: 6 }], []);
  return (<group position={[12, y, -50]} rotation-y={0.35}>
    {halls.map((h, i) => <group key={i} position={[h.x, 0, h.z]}>
      {/* taş temel + kerpiç üst duvar (yer yer yıkık); ön tarafta antae (duvar uçları) ile açık giriş */}
      {[[0, h.w / 2, h.l, 1.0], [0, -h.w / 2, h.l, 1.0], [h.l / 2, 0, 1.0, h.w], [-h.l * 0.1, 0, 0.9, h.w]].map(([px, pz, a, b], k) => <group key={k}>
        <mesh geometry={bx(a, 0.9, b, 3)} material={m.rubble} position={[px, 0.35, pz]} />
        <mesh geometry={bx(a * (k === 3 ? 0.6 : 0.92), 0.6 + ((i + k) % 3) * 0.5, b * 0.8, 2)} material={m.brick} position={[px, 0.8 + (0.3 + ((i + k) % 3) * 0.25), pz]} />
      </group>)}
      <mesh position={[-h.l * 0.25, 0.18, 0]}><cylinderGeometry args={[1.1, 1.1, 0.2, 18]} /><meshStandardMaterial color="#7a6650" roughness={1} /></mesh>{/* ocak */}
    </group>)}
    {/* taş döşeli rampa (Troya II kapısına çıkar) + yan duvarlar */}
    <group position={[2, 0, -6]} rotation={[0, 0.25, 0]}>
      <mesh geometry={bx(5.2, 0.6, 12, 2.5)} material={m.flag} rotation-x={0.17} position={[0, 0.9, 0]} />
      {[-3, 3].map((x) => <mesh key={x} geometry={bx(0.9, 1.6, 12, 3)} material={m.rubble} rotation-x={0.17} position={[x, 1.3, 0]} />)}
    </group>
  </group>);
}

/* ---------- Schliemann yarması ---------- */
function layerTex() {
  const N = 512, c = document.createElement('canvas'), b = document.createElement('canvas'); c.width = b.width = N; c.height = b.height = N; const g = c.getContext('2d')!, h = b.getContext('2d')!, r = rng(9);
  h.fillStyle = '#777'; h.fillRect(0, 0, N, N); g.fillStyle = `#${new THREE.Color(LAYERS[LAYERS.length - 1].color).lerp(new THREE.Color('#8a7458'), 0.35).getHexString()}`; g.fillRect(0, 0, N, N);   // en üst katman rengi (boş kalan yer siyah görünmesin)
  const n = LAYERS.length; let y = N;
  LAYERS.forEach((l, i) => { const hh = N / n * (0.8 + r() * 0.4), col = new THREE.Color(l.color).lerp(new THREE.Color('#8a7458'), 0.35); g.fillStyle = `#${col.getHexString()}`;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= N; x += 16) g.lineTo(x, y - hh + Math.sin(x * 0.03 + i) * 6 + (r() - 0.5) * 5); g.lineTo(N, y); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(70,50,32,.25)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= N; x += 16) g.lineTo(x, y - hh + Math.sin(x * 0.03 + i) * 6); g.stroke();   // katman sınırı (yanık / yıkım tabakası)
    y -= hh; });
  for (let i = 0; i < 520; i++) { const x = r() * N, yy = r() * N, s = 2 + r() * 7; const v = r(); g.fillStyle = v < 0.5 ? `rgba(70,55,40,${0.3 + r() * 0.3})` : `rgba(210,195,170,${0.3 + r() * 0.3})`; g.beginPath(); g.ellipse(x, yy, s, s * 0.7, r() * 3, 0, Math.PI * 2); g.fill(); h.fillStyle = '#9a9a9a'; h.beginPath(); h.ellipse(x, yy, s, s * 0.7, 0, 0, Math.PI * 2); h.fill(); }   // gömülü taşlar
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${r() * 0.12})`; g.fillRect(r() * N, r() * N, 1.5, 1.5); }
  for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(60,45,30,.08)'; g.fillRect(r() * N, 0, 1 + r() * 2, N); }   // kazı izleri (dikey)
  const mk = (cv: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: mk(c, true), bump: mk(b, false) };
}
export function Trench({ m }: { m: Mats }) {
  const t = useMemo(() => layerTex(), []), len = TRENCH.z1 - TRENCH.z0, bot = MOUND.h - TRENCH.d;
  // kazı yüzleri: alt kenar yarmanın dibinde, üst kenar höyüğün o noktadaki yüzeyinde (eğimi izler, dışarı taşmaz)
  const faces = useMemo(() => {
    const mk = (a: [number, number], b: [number, number], seg: number) => {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [], rows = 8, r = rng(4), w = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / w, nz = (b[0] - a[0]) / w;
      for (let i = 0; i <= seg; i++) { const u = i / seg, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, ox = x + nx * 0.6, oz = z + nz * 0.6, topY = Math.max(bot + 0.5, heightAt(ox, oz) + 0.05);
        for (let k = 0; k <= rows; k++) { const v = k / rows, j = k > 0 && k < rows ? (r() - 0.5) * 0.18 : 0; pos.push(x + nx * j, bot + (topY - bot) * v, z + nz * j); uv.push((u * w) / 10, v); } }
      for (let i = 0; i < seg; i++) for (let k = 0; k < rows; k++) { const p0 = i * (rows + 1) + k, p1 = p0 + rows + 1; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    const xl = TRENCH.x - TRENCH.w / 2, xr = TRENCH.x + TRENCH.w / 2;
    return [mk([xl, TRENCH.z1], [xl, TRENCH.z0], 40), mk([xr, TRENCH.z0], [xr, TRENCH.z1], 40), mk([xl, TRENCH.z0], [xr, TRENCH.z0], 10), mk([xr, TRENCH.z1], [xl, TRENCH.z1], 10)];
  }, [bot]);
  const railPosts = useMemo(() => Array.from({ length: 11 }, (_, i) => { const x = TRENCH.x + TRENCH.w / 2 + 0.7, z = TRENCH.z0 + (i * len) / 10; return [x, heightAt(x + 0.5, z), z] as [number, number, number]; }), [len]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.12, roughness: 1, side: THREE.DoubleSide }), [t]);
  return (<group>
    {faces.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}
    <mesh rotation-x={-Math.PI / 2} position={[TRENCH.x, bot + 0.02, (TRENCH.z0 + TRENCH.z1) / 2]} receiveShadow><planeGeometry args={[TRENCH.w, len]} /><meshStandardMaterial color="#8d7656" roughness={1} /></mesh>
    {/* dipte Troya I duvarları (balıksırtı örgülü moloz taş) */}
    {[[-2, -30, 6, 0.2], [1.5, -21, 5, -0.15], [-1, -13, 4, 0.4], [2.6, -34, 3, 1.3]].map(([x, z, w, a], i) => <mesh key={i} geometry={bx(w, 1.1, 0.9, 2)} material={m.rubble} position={[x, bot + 0.55, z]} rotation-y={a} />)}
    {/* doğu kenarında ahşap seyir korkuluğu: her direk kendi zeminine oturur, küpeşte direkleri izler */}
    {railPosts.map(([x, y, z], i) => <group key={i}>
      <mesh material={m.woodDark} position={[x, y + 0.5, z]}><boxGeometry args={[0.1, 1, 0.1]} /></mesh>
      {i > 0 && [0.95, 0.5].map((h) => { const [, py, pz] = railPosts[i - 1], dz = z - pz, dy = y - py, l = Math.hypot(dz, dy); return <mesh key={h} material={m.wood} position={[x, (y + py) / 2 + h, (z + pz) / 2]} rotation-x={-Math.atan2(dy, dz)}><boxGeometry args={[0.08, 0.1, l]} /></mesh>; })}
    </group>)}
  </group>);
}

/* ---------- Athena Tapınağı (Troya VIII) ---------- */
function drumGeo(r0: number, h: number) { const g = new THREE.CylinderGeometry(r0, r0, h, 40, 1), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z); if (rr < 1e-3) continue; const k = 1 - 0.045 * Math.pow(Math.abs(Math.sin(a * 10)), 0.6); p.setX(i, x * k); p.setZ(i, z * k); } g.computeVertexNormals(); return scaleUV(g, 1); }
export function Temple({ m }: { m: Mats }) {
  const TX = -42, TZ = 19, y = heightAt(TX, TZ), r = useMemo(() => rng(17), []);
  const drum = useMemo(() => drumGeo(0.55, 1.1), []), cap = useMemo(() => new THREE.CylinderGeometry(0.75, 0.55, 0.35, 24), []);
  const blocks = useMemo(() => { const out: [number, number, number, number][] = []; for (let x = -9; x < 9; x += 1.8) for (let z = -5.5; z < 5.5; z += 1.4) if (r() > 0.22) out.push([x + 0.9, z + 0.7, 0.55 + r() * 0.08, r() * 0.06]); return out; }, [r]);
  const scattered = useMemo(() => Array.from({ length: 16 }, () => ({ x: -11 + r() * 22, z: -8 + r() * 16, a: r() * 3, kind: r() < 0.65 ? 0 : r() < 0.5 ? 1 : 2 })), [r]);
  const blockG = useMemo(() => bx(1.74, 1, 1.34, 2), []);
  return (<group position={[TX, y, TZ]} rotation-y={0.08}>
    {/* krepis: iki basamak + üst döşeme blokları (bazıları eksik) */}
    <mesh geometry={useMemo(() => bx(21, 0.5, 14, 3), [])} material={m.limeDark} position={[0, 0.05, 0]} />
    <mesh geometry={useMemo(() => bx(19.5, 0.45, 12.5, 3), [])} material={m.marble} position={[0, 0.5, 0]} />
    {blocks.map(([x, z, h, tilt], i) => <mesh key={i} geometry={blockG} material={m.marble} position={[x, 0.72 + h * 0.25, z]} scale={[1, h, 1]} rotation-z={tilt} />)}
    {/* ayakta kalan sütun dibi ve iki tambur: köşede tapınağın ölçeği okunsun */}
    {[[-8, -5, 3], [-4.6, -5, 1], [8, -5, 2], [-8, 5, 1]].map(([x, z, n], i) => <group key={i} position={[x, 1.0, z]}>{Array.from({ length: n }, (_, k) => <mesh key={k} geometry={drum} material={m.marble} position={[0, 0.55 + k * 1.1, 0]} rotation-y={k} />)}{n === 3 && <mesh geometry={cap} material={m.marble} position={[0, 3.5, 0]} />}</group>)}
    {/* devrik tamburlar, başlık ve arşitrav parçaları */}
    {scattered.map((d, i) => <mesh key={`s${i}`} geometry={d.kind === 0 ? drum : d.kind === 1 ? cap : blockG} material={m.marble} position={[d.x, (Math.abs(d.x) > 10 || Math.abs(d.z) > 7 ? 0.5 : 1.1), d.z]} rotation={d.kind === 0 ? [Math.PI / 2, 0, d.a] : [0.1, d.a, 0]} scale={d.kind === 2 ? [1.6, 0.8, 0.9] : 1} />)}
  </group>);
}

/* ---------- Odeon ve meclis binası (Troya IX) ---------- */
export function Odeon({ m }: { m: Mats }) {
  const x0 = -62, z0 = -46, y = heightAt(x0, z0);
  const cavea = useMemo(() => {
    // yarım daire oturma basamakları: her sıra 0,45 m yükselir, 0,8 m geriler; doku metreye göre
    const pts: THREE.Vector2[] = [new THREE.Vector2(6, -0.4), new THREE.Vector2(6, 0)]; for (let i = 0; i < 11; i++) { pts.push(new THREE.Vector2(6 + i * 0.8, (i + 1) * 0.45)); pts.push(new THREE.Vector2(6 + (i + 1) * 0.8, (i + 1) * 0.45)); } pts.push(new THREE.Vector2(6 + 11 * 0.8 + 0.6, 11 * 0.45)); pts.push(new THREE.Vector2(6 + 11 * 0.8 + 0.6, -0.5));
    const g = new THREE.LatheGeometry(pts.reverse(), 48, -Math.PI / 2, Math.PI); return scaleUV(g, 3);
  }, []);
  const map = useMemo(() => { const t = (m.lime.map as THREE.Texture).clone(); t.repeat.set(10, 1); t.needsUpdate = true; return t; }, [m]);
  const seatMat = useMemo(() => weather(new THREE.MeshStandardMaterial({ map, bumpMap: m.lime.bumpMap, bumpScale: 0.25, roughness: 0.95, side: THREE.DoubleSide })), [map, m]);
  return (<group position={[x0, y - 0.4, z0]} rotation-y={-Math.PI / 2}>
    <mesh geometry={cavea} material={seatMat} />
    {/* orkestra: yarım daire döşeme */}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}><circleGeometry args={[6, 40, Math.PI, Math.PI]} /><meshStandardMaterial map={m.flag.map} bumpMap={m.flag.bumpMap} bumpScale={0.2} roughness={0.95} /></mesh>
    {/* sahne binası kalıntısı: kapı açıklıklı alçak duvar + kaide */}
    {[-6, -2.2, 2.2, 6].map((x, i) => <mesh key={i} geometry={bx(2.8, 2.2 + (i % 2) * 0.9, 1.2, 3)} material={m.lime} position={[x, 1.1, -2.6]} />)}
    <mesh geometry={bx(15, 0.6, 3.4, 3)} material={m.limeDark} position={[0, 0.3, -2.4]} />
    {/* meclis binası (buleuterion) temeli: yanda kare plan */}
    <group position={[-22, 0.4, -6]}>{[[0, 6, 13, 1], [0, -6, 13, 1], [6, 0, 1, 12], [-6, 0, 1, 12]].map(([px, pz, w, d], k) => <mesh key={k} geometry={bx(w, 1.2 + (k % 2) * 0.6, d, 3)} material={m.lime} position={[px, 0.6, pz]} />)}</group>
  </group>);
}

/* ---------- tahta at (modern kopya, temsilî) ---------- */
export function Horse({ m }: { m: Mats }) {
  const y = heightAt(80, 44), body = useMemo(() => { const g = new THREE.CapsuleGeometry(1.9, 5.2, 6, 14); g.rotateZ(Math.PI / 2); g.scale(1, 1.05, 0.95); return g; }, []);
  const wood = m.wood, dark = m.woodDark;
  return (<group position={[80, y, 44]} rotation-y={-0.8}>
    <mesh material={wood} position={[0, 1.1, 0]}><boxGeometry args={[9.5, 0.5, 4.2]} /></mesh>
    {[-3.4, 3.4].flatMap((x) => [-2.2, 2.2].map((z) => <mesh key={`${x}${z}`} material={dark} position={[x, 0.9, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.9, 0.9, 0.35, 20]} /></mesh>))}
    {[[-2.8, -1.1, 0.12], [-2.8, 1.1, 0.12], [2.6, -1.1, -0.1], [2.6, 1.1, -0.1]].map(([x, z, a], i) => <mesh key={i} material={wood} position={[x, 3.3, z]} rotation-z={a}><cylinderGeometry args={[0.32, 0.42, 4.2, 10]} /></mesh>)}
    <mesh geometry={body} material={wood} position={[0, 6.9, 0]} />
    <mesh material={wood} position={[3.9, 8.6, 0]} rotation-z={-0.75}><cylinderGeometry args={[0.95, 1.25, 3.6, 12]} /></mesh>
    <mesh material={wood} position={[5.0, 10.6, 0]} rotation-z={-0.35}><cylinderGeometry args={[0.8, 0.95, 2.4, 12]} /></mesh>
    <mesh material={wood} position={[6.1, 11.4, 0]} rotation-z={-1.25}><capsuleGeometry args={[0.7, 1.9, 4, 10]} /></mesh>
    {[-0.35, 0.35].map((z) => <mesh key={z} material={wood} position={[5.4, 12.5, z]} rotation-z={-0.2}><coneGeometry args={[0.22, 0.8, 6]} /></mesh>)}
    {[0, 1, 2, 3].map((i) => <mesh key={i} material={dark} position={[4.0 + i * 0.45, 9.3 + i * 0.75, 0]} rotation-z={-0.6}><boxGeometry args={[0.25, 0.9, 0.5]} /></mesh>)}
    {[-1.5, 1.5].map((z) => <mesh key={z} position={[6.4, 11.7, z * 0.32]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#120a04" /></mesh>)}
    <mesh material={dark} position={[-4.9, 6.2, 0]} rotation-z={0.5}><coneGeometry args={[0.45, 3.4, 8]} /></mesh>
    {[-1.8, 0, 1.8].map((x) => <mesh key={x} position={[x, 7.3, 1.82]}><boxGeometry args={[0.9, 0.7, 0.05]} /><meshStandardMaterial color="#1e1208" /></mesh>)}
    <group position={[-1.2, 0, 2.9]} rotation-x={0.42}>{[-0.45, 0.45].map((x) => <mesh key={x} material={dark} position={[x, 3.6, 0]}><boxGeometry args={[0.12, 6.4, 0.12]} /></mesh>)}{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <mesh key={k} material={dark} position={[0, 0.9 + k * 0.75, 0]}><boxGeometry args={[0.9, 0.08, 0.1]} /></mesh>)}</group>
  </group>);
}

/* ---------- durak tabelaları ---------- */
export function Signs({ m }: { m: Mats }) {
  return <group>{STOPS.map((s) => { const R = routeAt(s.s), nx = -R.dir[1], nz = R.dir[0], x = R.p[0] + nx * 2.2, z = R.p[2] + nz * 2.2; return (
    <group key={s.id} position={[x, heightAt(x, z), z]} rotation-y={Math.atan2(R.dir[0], R.dir[1]) + Math.PI / 2}>
      {[-0.35, 0.35].map((dx) => <mesh key={dx} material={m.woodDark} position={[dx, 0.5, 0]}><boxGeometry args={[0.08, 1, 0.08]} /></mesh>)}
      <mesh position={[0, 1.05, 0]} rotation-x={-0.35}><boxGeometry args={[1.0, 0.6, 0.05]} /><meshStandardMaterial color="#5a4632" roughness={0.8} /></mesh>
      <mesh position={[0, 1.06, -0.03]} rotation-x={-0.35}><planeGeometry args={[0.86, 0.46]} /><meshStandardMaterial color="#efe6d2" roughness={0.9} /></mesh>
    </group>); })}</group>;
}
