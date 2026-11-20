/**
 * Efes — sahne: zemin, caddeler, sütun dizileri, Celsus Kütüphanesi, Hadrian Tapınağı, Trajan Çeşmesi, Odeon, Büyük Tiyatro,
 * Yamaç Evler, Arkadiane ve antik liman. Hepsi prosedürel (dosya yok). Her yapı üç parça kümesinden oluşur:
 *   ortak (bugün de ayakta) · yalnız-sağlam (Zaman Penceresi açılınca belirir) · yalnız-harabe (pencere açılınca çözülür).
 * Geçiş, Zil Kale'deki çözülme gölgelendiricisidir (zilkale/HistoryLayerMorphing.morphMaterial).
 * Stilizedir: oranlar yaklaşık, ölçüler kısaltılmış; "sağlam hâl" bir canlandırmadır.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { morphMaterial } from '../zilkale/HistoryLayerMorphing';
import { normalFrom } from '../topkapi/kit';
import { CELSUS, HADRIAN, HARBOR_X, ODEON, THEATRE, TERRACE, TRAJAN, colonnade, groundY, routeAt, ROUTE_LEN } from './site';

export type U = Record<string, { value: number }>;
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function cv(n: number) { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')!] as const; }
function tex(c: HTMLCanvasElement, rep = 1, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }

/** Yıpranmış beyaz mermer: damarlar + lekeler; yükseklikten normal */
function marbleTex() {
  const n = 256, [c, g] = cv(n), [h, hg] = cv(n), r = rng(3); g.fillStyle = '#e9e3d6'; g.fillRect(0, 0, n, n); hg.fillStyle = '#c0c0c0'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(120,115,105,${0.08 + r() * 0.15})`; g.lineWidth = 0.6 + r() * 1.4; g.beginPath(); let x = r() * n, y = r() * n; g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (r() - 0.5) * 60; y += r() * 40; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 2500; i++) { const a = r() * 0.12, x = r() * n, y = r() * n; g.fillStyle = r() < 0.6 ? `rgba(150,130,100,${a})` : `rgba(255,255,250,${a})`; g.fillRect(x, y, 2, 2); hg.fillStyle = `rgba(0,0,0,${a * 2})`; hg.fillRect(x, y, 2, 2); }
  return { map: tex(c), normal: normalFrom(h, 1.5) };
}
/** Büyük mermer döşeme taşları (cadde) */
function pavingTex() {
  const n = 256, [c, g] = cv(n), r = rng(9); g.fillStyle = '#8f8676'; g.fillRect(0, 0, n, n);
  let y = 0; while (y < n) { const rh = 40 + r() * 30; let x = -r() * 50; while (x < n) { const w = 50 + r() * 60, v = 200 + r() * 35 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(x + 2, y + 2, w - 4, rh - 4); x += w; } y += rh; }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(80,70,55,${r() * 0.15})`; g.fillRect(r() * n, r() * n, 2, 2); }
  return tex(c);
}
function grassTex() { const n = 128, [c, g] = cv(n), r = rng(5); g.fillStyle = '#b7a46a'; g.fillRect(0, 0, n, n); for (let i = 0; i < 2500; i++) { const v = r(); g.fillStyle = v < 0.4 ? '#9a8c55' : v < 0.7 ? '#c9b67c' : '#7f8a4c'; g.fillRect(r() * n, r() * n, 1 + r() * 2, 2 + r() * 3); } return tex(c, 1); }

export function useMats(u: U, saver: boolean) {
  return useMemo(() => {
    const m = marbleTex(), base = new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normal, roughness: 0.62, color: '#f2ece0' });
    const stone = new THREE.MeshStandardMaterial({ map: m.map, roughness: 0.85, color: '#d8ccb4' }), tile = new THREE.MeshStandardMaterial({ color: '#b5603e', roughness: 0.8 });
    const water = new THREE.MeshStandardMaterial({ color: '#6fb3bf', roughness: 0.15, metalness: 0.1 });
    const of = (id: string) => ({ intact: morphMaterial(base, u[id], 'intact', saver, undefined, `ef-${id}`), ruin: morphMaterial(stone, u[id], 'ruin', saver, undefined, `ef-${id}r`), roof: morphMaterial(tile, u[id], 'intact', saver, undefined, `ef-${id}t`), water: morphMaterial(water, u[id], 'intact', saver, undefined, `ef-${id}w`) });
    return { base, stone, common: base, ...Object.fromEntries(['odeon', 'trajan', 'hadrian', 'yamac', 'celsus', 'tiyatro', 'arkadiane', 'all'].map((k) => [k, of(k)])) } as unknown as Record<'base' | 'stone' | 'common', THREE.MeshStandardMaterial> & Record<string, { intact: THREE.Material; ruin: THREE.Material; roof: THREE.Material; water: THREE.Material }>;
  }, [u, saver]);
}
const COL = new THREE.CylinderGeometry(0.36, 0.42, 1, 12); COL.translate(0, 0.5, 0);
const CAP = new THREE.BoxGeometry(1.0, 0.32, 1.0);

/** Bir sütun (yerel tabanı y=0): gövde + başlık */
function Column({ h, m, cap = true, r = 1 }: { h: number; m: THREE.Material; cap?: boolean; r?: number }) {
  return (<group><mesh geometry={COL} material={m} scale={[r, h, r]} />{cap && <mesh geometry={CAP} material={m} position={[0, h + 0.16, 0]} scale={[r, 1, r]} />}<mesh material={m} position={[0, 0.12, 0]} scale={[r, 1, r]}><boxGeometry args={[0.95, 0.24, 0.95]} /></mesh></group>);
}

/* ---------- zemin, tepeler, caddeler ---------- */
/** Arazi: cadde eğimi + Panayır (kuzeydoğu) ve Bülbül (güney) dağları; tiyatro ve odeonun çevresi düzlenir (yapılar gömülmesin) */
export function hillY(x: number, z: number) {
  let y = groundY(Math.min(x, 110), Math.max(z, -13)) - 0.3;
  y += 40 * Math.exp(-(((x - 70) / 70) ** 2 + ((z + 150) / 45) ** 2)) + 30 * Math.exp(-(((x - 40) / 90) ** 2 + ((z - 80) / 35) ** 2)) + 18 * Math.max(0, (x - 120) / 60);
  if (Math.abs(z + 102) < 9 && x < 10) y = Math.min(y, -0.3);   // Arkadiane düz
  for (const [cx, cz, r] of [[THEATRE.x, THEATRE.z, THEATRE.r + 6], [ODEON.x, ODEON.z, ODEON.r + 4]]) { const d = Math.hypot(x - cx, z - cz); if (d < r + 12) y = Math.min(y, groundY(cx, cz) - 0.3 + Math.max(0, d - r) * 0.8); }
  return Math.max(-0.3, y);
}
export function Ground() {
  const g = useMemo(() => grassTex(), []), pav = useMemo(() => pavingTex(), []);
  const street = useMemo(() => {   // rota boyunca 9 m'lik döşeme şeridi (üçgen yönü yukarı)
    const pos: number[] = [], uv: number[] = [], idx: number[] = []; let row = 0;
    for (let s = 0; s <= ROUTE_LEN; s += 1) { const R = routeAt(s), nx = -R.dir[1], nz = R.dir[0], w = 4.6; for (const sd of [-1, 1]) { const x = R.p[0] + nx * w * sd, z = R.p[2] + nz * w * sd; pos.push(x, groundY(x, z) + 0.04, z); uv.push(sd * 0.5 + 0.5, s / 5); }
      if (row++) { const k = pos.length / 3 - 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }, []);
  const ground = useMemo(() => { const geo = new THREE.PlaneGeometry(520, 360, 104, 72); geo.rotateX(-Math.PI / 2); geo.translate(-40, 0, -50); const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, hillY(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals(); const t = g.clone(); t.repeat.set(60, 40); t.needsUpdate = true; return { geo, t }; }, [g]);
  const plaza = useMemo(() => { const t = pav.clone(); t.repeat.set(6, 6); t.needsUpdate = true; return t; }, [pav]);
  const pavS = useMemo(() => { const t = pav.clone(); t.repeat.set(2, 1); t.needsUpdate = true; return t; }, [pav]);
  return (
    <group>
      <mesh geometry={ground.geo}><meshStandardMaterial map={ground.t} roughness={1} color="#d9cfa8" /></mesh>
      <mesh geometry={street}><meshStandardMaterial map={pavS} roughness={0.8} polygonOffset polygonOffsetFactor={-2} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-2, 0.03, 2]}><planeGeometry args={[30, 26]} /><meshStandardMaterial map={plaza} roughness={0.8} polygonOffset polygonOffsetFactor={-1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(HARBOR_X + 6) / 2, 0.03, -102]}><planeGeometry args={[-HARBOR_X + 6, 11]} /><meshStandardMaterial map={plaza} roughness={0.8} polygonOffset polygonOffsetFactor={-1} /></mesh>
    </group>
  );
}
/** Selvi ve zeytin ağaçları (instanced) */
export function Trees({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), ref2 = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(17), o = new THREE.Object3D(); let a = 0, b = 0;
    for (let i = 0; i < n * 3 && (a < n || b < n); i++) { const x = -60 + r() * 200, z = -170 + r() * 230; if (Math.abs(z) < 12 && x > 0 || (Math.abs(x - 8) < 12 && z < 0 && z > -100) || Math.abs(z + 102) < 10 || Math.hypot(x - THEATRE.x, z - THEATRE.z) < 62 || Math.hypot(x - ODEON.x, z - ODEON.z) < 24 || Math.hypot(x + 4, z - 2) < 20) continue;
      const y = hillY(x, z) - 0.4, s = 0.8 + r() * 0.6;   // biraz gömülü: kaba arazi ağında havada kalmasın
      o.position.set(x, y, z); o.scale.set(s, s * (0.9 + r() * 0.4), s); o.rotation.set(0, r() * 6, 0); o.updateMatrix();
      if (r() < 0.5 && a < n) ref.current?.setMatrixAt(a++, o.matrix); else if (b < n) ref2.current?.setMatrixAt(b++, o.matrix); }
    for (const [m, c] of [[ref.current, a], [ref2.current, b]] as const) if (m) { m.count = c; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  const cyp = useMemo(() => { const g = new THREE.ConeGeometry(0.9, 9, 7); g.translate(0, 4.8, 0); return g; }, []), oli = useMemo(() => { const g = new THREE.IcosahedronGeometry(2.2, 0); g.scale(1.2, 0.8, 1.2); g.translate(0, 2.6, 0); return g; }, []);
  return (<><instancedMesh ref={ref} args={[cyp, undefined, n]}><meshStandardMaterial color="#3f5a35" roughness={0.9} flatShading /></instancedMesh><instancedMesh ref={ref2} args={[oli, undefined, n]}><meshStandardMaterial color="#7f8f5c" roughness={0.9} flatShading /></instancedMesh></>);
}

/* ---------- sütun dizileri: harabe (kırık boylar) ↔ sağlam (tam boy + başlık + üst kiriş) ---------- */
export function Colonnades({ M }: { M: ReturnType<typeof useMats> }) {
  const list = useMemo(colonnade, []);
  const ruinRef = useRef<THREE.InstancedMesh>(null), fullRef = useRef<THREE.InstancedMesh>(null), capRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D();
    list.forEach(([x, z], i) => { const y = groundY(x, z); o.position.set(x, y, z); o.rotation.set(0, 0, 0);
      o.scale.set(1, 0.4 + r() * (r() < 0.25 ? 4.6 : 1.4), 1); o.updateMatrix(); ruinRef.current?.setMatrixAt(i, o.matrix);
      o.scale.set(1, 5.6, 1); o.updateMatrix(); fullRef.current?.setMatrixAt(i, o.matrix);
      o.position.y = y + 5.76; o.scale.set(1, 1, 1); o.updateMatrix(); capRef.current?.setMatrixAt(i, o.matrix); });
    for (const m of [ruinRef.current, fullRef.current, capRef.current]) if (m) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } }, [list]);
  return (<>
    <instancedMesh ref={ruinRef} args={[COL, M.all.ruin, list.length]} />
    <instancedMesh ref={fullRef} args={[COL, M.all.intact, list.length]} />
    <instancedMesh ref={capRef} args={[CAP, M.all.intact, list.length]} />
  </>);
}

/* ---------- Celsus Kütüphanesi (cephe doğuya bakar) ---------- */
export function Celsus({ M }: { M: ReturnType<typeof useMats> }) {
  const { x, z, w, h } = CELSUS, c = M.celsus, cols = [-8.4, -6, -2.4, 0, 2.4, 6, 8.4].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 2}>
      {/* basamaklar + podyum (ortak) */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <mesh key={i} material={M.common} position={[0, 0.11 + i * 0.22, 3.6 - i * 0.32]}><boxGeometry args={[w - 1.5 - i * 0.2, 0.22, 1.0]} /></mesh>)}
      {/* bugün ayakta olan iki katlı cephe (1970'lerde yeniden kuruldu) */}
      <mesh material={M.common} position={[0, h / 2 + 1.9, -1.4]}><boxGeometry args={[w, h, 0.9]} /></mesh>
      {[-1, 0, 1].map((k) => <mesh key={k} position={[k * 4.6, 4.2, -0.94]}><boxGeometry args={[1.9, 4, 0.05]} /><meshStandardMaterial color="#3a332b" /></mesh>)}
      {[-1, 0, 1].map((k) => <mesh key={`w${k}`} position={[k * 4.6, 10.6, -0.94]}><boxGeometry args={[1.5, 2.6, 0.05]} /><meshStandardMaterial color="#3a332b" /></mesh>)}
      {cols.map((cx) => <group key={cx} position={[cx, 1.98, 0.3]}><Column h={6.2} m={M.common} /></group>)}
      {[-7.2, -1.2, 1.2, 7.2].map((cx) => <mesh key={cx} material={M.common} position={[cx, 8.75, 0.3]}><boxGeometry args={[3.2, 0.8, 1.4]} /></mesh>)}
      {cols.map((cx) => <group key={`u${cx}`} position={[cx * 0.82, 9.15, 0.2]}><Column h={4.6} m={M.common} r={0.85} /></group>)}
      <mesh material={M.common} position={[0, 14.2, 0.2]}><boxGeometry args={[w - 1, 0.7, 1.4]} /></mesh>
      {/* alt kattaki dört nişte kadın heykelleri (bugün yerindekiler kopyadır): kaide + dökümlü giysi + baş */}
      {[-7.2, -2.3, 2.3, 7.2].map((sx) => <group key={sx} position={[sx, 1.98, -0.55]}>
        <mesh material={M.common} position={[0, 0.25, 0]}><boxGeometry args={[1.0, 0.5, 0.7]} /></mesh>
        <mesh material={M.common} position={[0, 1.65, 0]}><cylinderGeometry args={[0.26, 0.42, 2.3, 10]} /></mesh>
        <mesh material={M.common} position={[0, 3.0, 0]}><sphereGeometry args={[0.2, 10, 8]} /></mesh>
        <mesh position={[0, 1.8, -0.36]}><boxGeometry args={[1.2, 3.4, 0.05]} /><meshStandardMaterial color="#5b5247" /></mesh>
      </group>)}
      {/* sağlam hâl: arka okuma salonu, çatı, alınlıklar */}
      <mesh material={c.intact} position={[0, 8.5, -9]}><boxGeometry args={[w, 15, 15]} /></mesh>
      <mesh material={c.roof} position={[0, 16.8, -9]} rotation-y={Math.PI / 4} scale={[1, 1, 0.75]}><coneGeometry args={[15, 3.2, 4]} /></mesh>
      {[-4.6, 4.6].map((px) => <mesh key={px} material={c.intact} position={[px, 15.4, 0.2]} rotation-z={Math.PI / 2}><cylinderGeometry args={[1.2, 1.2, 3.2, 3, 1, false, 0, Math.PI]} /></mesh>)}
      {/* harabe hâl: arkadaki yıkık duvar kalıntıları ve moloz */}
      {[[-8, -6, 3], [6, -12, 2], [-2, -15, 1.4], [9, -5, 1.2]].map(([px, pz, ph], i) => <mesh key={i} material={c.ruin} position={[px, ph / 2, pz]}><boxGeometry args={[4 + i, ph, 1.2]} /></mesh>)}
    </group>
  );
}

/* ---------- Hadrian Tapınağı (cephe güneye) ---------- */
export function Hadrian({ M }: { M: ReturnType<typeof useMats> }) {
  const y = groundY(HADRIAN.x, HADRIAN.z), c = M.hadrian;
  return (
    <group position={[HADRIAN.x, y, HADRIAN.z]}>
      <mesh material={M.common} position={[0, 0.4, 0]}><boxGeometry args={[9, 0.8, 6]} /></mesh>
      {[-3.2, -1.1, 1.1, 3.2].map((x) => <group key={x} position={[x, 0.8, 2.6]}><Column h={4.6} m={M.common} r={0.8} /></group>)}
      {/* kemer: yarım halka */}
      <mesh material={M.common} position={[0, 5.6, 2.6]}><torusGeometry args={[1.25, 0.32, 8, 16, Math.PI]} /></mesh>
      <mesh material={M.common} position={[-2.15, 5.7, 2.6]}><boxGeometry args={[2.1, 0.6, 0.9]} /></mesh>
      <mesh material={M.common} position={[2.15, 5.7, 2.6]}><boxGeometry args={[2.1, 0.6, 0.9]} /></mesh>
      <mesh material={c.intact} position={[0, 4, -1]}><boxGeometry args={[7, 6.4, 5]} /></mesh>
      <mesh material={c.intact} position={[0, 7.4, 2.6]} rotation-x={Math.PI / 2}><cylinderGeometry args={[3.8, 3.8, 0.9, 3, 1, false, -Math.PI / 2, Math.PI]} /></mesh>
      <mesh material={c.roof} position={[0, 7.6, -0.6]} rotation-y={Math.PI / 4} scale={[1, 1, 1.4]}><coneGeometry args={[5.4, 2, 4]} /></mesh>
      <mesh material={c.ruin} position={[-2.4, 0.9, -1.6]}><boxGeometry args={[3, 1.8, 1]} /></mesh>
    </group>
  );
}

/* ---------- Trajan Çeşmesi (cephe kuzeye) ---------- */
export function Trajan({ M }: { M: ReturnType<typeof useMats> }) {
  const y = groundY(TRAJAN.x, TRAJAN.z), c = M.trajan;
  return (
    <group position={[TRAJAN.x, y, TRAJAN.z]} rotation-y={Math.PI}>
      <mesh material={M.common} position={[0, 0.6, 0]}><boxGeometry args={[14, 1.2, 2]} /></mesh>
      {[-5, 5].map((x) => <group key={x} position={[x, 1.2, 0]}><Column h={5} m={M.common} r={0.8} /></group>)}
      {[-3, -1, 1, 3].map((x) => <group key={x} position={[x, 1.2, 0]}><Column h={5} m={c.intact} r={0.8} /></group>)}
      <mesh material={c.intact} position={[0, 7, 0]}><boxGeometry args={[14, 0.8, 2]} /></mesh>
      {[-4.5, -1.5, 1.5, 4.5].map((x) => <group key={`u${x}`} position={[x, 7.4, 0]}><Column h={3.6} m={c.intact} r={0.7} /></group>)}
      <mesh material={c.intact} position={[0, 11.4, 0]}><boxGeometry args={[12, 0.7, 2]} /></mesh>
      <mesh material={c.intact} position={[0, 6, -2]}><boxGeometry args={[14, 12, 1]} /></mesh>
      {/* imparator heykeli (temsilî) */}
      <mesh material={c.intact} position={[0, 4.3, -0.4]}><cylinderGeometry args={[0.5, 0.65, 2.8, 8]} /></mesh>
      <mesh material={c.intact} position={[0, 6.0, -0.4]}><sphereGeometry args={[0.38, 10, 8]} /></mesh>
      {/* havuz suyu */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 1.15, 2.6]} material={c.water}><planeGeometry args={[12, 2.6]} /></mesh>
      <mesh material={M.common} position={[0, 0.6, 4]}><boxGeometry args={[12.6, 1.2, 0.4]} /></mesh>
      <mesh material={c.ruin} position={[2, 0.4, 1.4]} rotation-y={0.4}><boxGeometry args={[2.4, 0.8, 0.7]} /></mesh>
    </group>
  );
}

/* ---------- Odeon ve Büyük Tiyatro (basamaklı oturma yeri: döndürülmüş basamak profili) ---------- */
function caveaGeo(r0: number, rows: number, tread: number, rise: number, from = 0) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(r0 + from * tread, from * rise)];
  for (let i = from; i < rows; i++) { pts.push(new THREE.Vector2(r0 + i * tread, (i + 1) * rise)); pts.push(new THREE.Vector2(r0 + (i + 1) * tread, (i + 1) * rise)); }
  pts.push(new THREE.Vector2(r0 + rows * tread, from * rise - 0.01));
  return new THREE.LatheGeometry(pts, 40, 0, Math.PI);
}
export function Theatre({ M, at, r, rows, low, id, stage }: { M: ReturnType<typeof useMats>; at: [number, number]; r: number; rows: number; low: number; id: string; stage: number }) {
  const y = groundY(at[0], at[1]), c = M[id], tread = (r - 6) / rows, rise = tread * 0.55;
  const g1 = useMemo(() => caveaGeo(6, low, tread, rise), [tread, rise, low]), g2 = useMemo(() => caveaGeo(6, rows, tread, rise, low), [tread, rise, rows, low]);
  return (
    <group position={[at[0], y, at[1]]}>
      <mesh geometry={g1} material={M.common} />
      <mesh geometry={g2} material={c.intact} />
      <mesh geometry={g2} material={c.ruin} scale={[1, 0.35, 1]} />
      {/* sahne binası: alt kat bugün de var, üst katlar sağlam hâlde */}
      <mesh material={M.common} position={[-stage * 0.45, 1.6, 0]}><boxGeometry args={[3, 3.2, stage]} /></mesh>
      <mesh material={c.intact} position={[-stage * 0.45, 3.2 + stage * 0.12, 0]}><boxGeometry args={[3, stage * 0.24, stage]} /></mesh>
      {Array.from({ length: Math.round(stage / 3) }, (_, i) => <group key={i} position={[-stage * 0.45 + 1.8, 0, -stage / 2 + 1.5 + i * 3]}><Column h={3.1} m={c.intact} r={0.7} /></group>)}
      {id === 'odeon' && <mesh material={c.roof} position={[0, rows * rise + 2.2, 0]} rotation-y={Math.PI / 4}><coneGeometry args={[r * 1.05, 4, 4]} /></mesh>}
    </group>
  );
}

/* ---------- Yamaç Evler: yamaçta basamaklanan evler ---------- */
export function Terrace({ M }: { M: ReturnType<typeof useMats> }) {
  const c = M.yamac, y0 = groundY(TERRACE.x, 0);
  return (
    <group position={[TERRACE.x, y0, TERRACE.z]}>
      {[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => {
        const x = (col - 1) * 9, z = row * 8, y = row * 3;
        return (
          <group key={`${row}${col}`} position={[x, y, z]}>
            <mesh material={M.stone} position={[0, 0.8, 0]}><boxGeometry args={[8.4, 1.6, 7.4]} /></mesh>
            <mesh material={c.intact} position={[0, 3, 0]}><boxGeometry args={[8.2, 2.8, 7.2]} /></mesh>
            <mesh material={c.roof} position={[0, 5.1, 0]} rotation-y={Math.PI / 4} scale={[1, 1, 0.88]}><coneGeometry args={[6.1, 1.6, 4]} /></mesh>
            <mesh material={c.ruin} position={[1.5, 2, 1]}><boxGeometry args={[3, 0.8, 0.5]} /></mesh>
          </group>
        );
      }))}
    </group>
  );
}

/* ---------- Arkadiane sonu: antik liman (sağlam hâlde deniz ve gemi) ---------- */
export function Harbor({ M, u }: { M: ReturnType<typeof useMats>; u: { value: number } }) {
  const sea = useMemo(() => morphMaterial(new THREE.MeshStandardMaterial({ color: '#3f86a6', roughness: 0.2, metalness: 0.1 }), u, 'intact', false, undefined, 'ef-sea'), [u]);
  const field = useMemo(() => morphMaterial(new THREE.MeshStandardMaterial({ color: '#9fa167', roughness: 1 }), u, 'ruin', false, undefined, 'ef-field'), [u]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[HARBOR_X - 160, 0.06, -102]} material={sea}><planeGeometry args={[320, 300]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[HARBOR_X - 160, 0.08, -102]} material={field}><planeGeometry args={[320, 300]} /></mesh>
      {/* liman kapısı */}
      {[-1, 1].map((k) => <mesh key={k} material={M.common} position={[HARBOR_X + 4, 3, -102 + k * 5]}><boxGeometry args={[1.6, 6, 1.6]} /></mesh>)}
      <mesh material={M.arkadiane.intact} position={[HARBOR_X + 4, 6.6, -102]}><boxGeometry args={[1.6, 1.2, 11.6]} /></mesh>
      {/* gemi (temsilî) */}
      <group position={[HARBOR_X - 30, 0, -112]}>
        <mesh material={M.arkadiane.roof} position={[0, 0.8, 0]} scale={[1, 0.5, 0.3]}><sphereGeometry args={[6, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /></mesh>
        <mesh material={M.arkadiane.intact} position={[0, 5, 0]}><cylinderGeometry args={[0.15, 0.2, 8, 6]} /></mesh>
        <mesh material={M.arkadiane.intact} position={[0, 6, 0]}><boxGeometry args={[0.1, 4, 5]} /></mesh>
      </group>
    </group>
  );
}
