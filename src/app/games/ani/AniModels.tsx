/**
 * Ani — 3B modeller (temsilî, ölçekli değil).
 * Ortak yaklaşım: dokular metre başına ölçeklenir (bx → dünya ölçekli UV), kırmızı/siyah tüf ve bazalt;
 * Ani mimarisinin tanınır öğeleri: kör kemer dizileri (ince çift sütun + kemer), cephedeki derin üçgen nişler,
 * sivri kemerli pencereler, konik külahlı kasnaklar, yıkık köşeler ve moloz.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GORGE_DEPTH, ROUTE_LEN, WALL_Z, edgeDist, heightAt, routeAt } from './site';
import { bicolorTex, rng, type Tier } from '../shared/walkKit';
import { archGeo, bx, gable, groundTex, stoneTex, useGrassCards, vNicheGeo, weather } from '../shared/scenery';
export { Sun, Clouds } from '../shared/scenery';
export const SUN_DIR = new THREE.Vector3(-0.84, 0.42, -0.2).normalize();

export interface Mats { red: THREE.Material; dark: THREE.Material; pale: THREE.Material; wall: THREE.Material; hole: THREE.Material; trim: THREE.Material; roof: THREE.Material; checker: THREE.Material }
export function useMats(): Mats {
  return useMemo(() => {
    const mk = (key: string, pal: string[], courses?: [number, number], bw?: [number, number], extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => { const t = stoneTex(key, pal, courses, bw); return weather(new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.35, roughness: 0.93, ...extra }), -GORGE_DEPTH); };
    const RED = ['#8e5543', '#955b47', '#874f3e', '#9c6450', '#82503f', '#90584a'], MIX = [...RED, ...RED, '#a5806a', '#5a4038'];   // çoğunluk kırmızı tüf; arada açık ve koyu blok
    return {
      red: mk('red', MIX), dark: mk('dark', ['#4a3833', '#523e37', '#45342f', '#5a453d']), pale: mk('pale', ['#b8967a', '#c4a487', '#a9876c'], [34, 20], [90, 90]), wall: mk('wall', RED, [44, 34], [80, 90]),
      hole: new THREE.MeshStandardMaterial({ color: '#140d0a', roughness: 1, side: THREE.DoubleSide }), trim: weather(new THREE.MeshStandardMaterial({ color: '#b98d70', roughness: 0.85 }), -GORGE_DEPTH),
      roof: mk('roof', ['#5d4238', '#6b4c40', '#54392f'], [22, 10], [40, 30]), checker: new THREE.MeshStandardMaterial({ map: bicolorTex(43, '#a8735a', '#2f2321', 'checker'), roughness: 0.9 }),
    };
  }, []);
}
/** Kör kemer dizisi: `len` boyunca n kemer, cepheye (yerel +z yönüne) bakan */
function Arcade({ len, h, n, m }: { len: number; h: number; n: number; m: Mats }) {
  const sp = len / n, col = useMemo(() => new THREE.CylinderGeometry(0.13, 0.15, h, 6), [h]), arc = useMemo(() => new THREE.TorusGeometry(sp / 2 - 0.15, 0.13, 5, 12, Math.PI), [sp]);
  return <group>{Array.from({ length: n + 1 }, (_, i) => -len / 2 + i * sp).map((x, i) => <group key={i}>
    {[-0.17, 0.17].map((d) => <mesh key={d} geometry={col} material={m.trim} position={[x + (i === 0 ? 0.17 : i === n ? -0.17 : d), h / 2, 0.12]} />)}
    {i < n && <mesh geometry={arc} material={m.trim} position={[x + sp / 2, h, 0.12]} />}
  </group>)}</group>;
}

/* ---------- arazi ---------- */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 280 : tier === 'medium' ? 210 : 140, g = new THREE.PlaneGeometry(1100, 1100, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 60);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), steppe = new THREE.Color('#a9a565'), dry = new THREE.Color('#c8b884'), green = new THREE.Color('#8d9a58'), rock = new THREE.Color('#6a4c40'), basalt = new THREE.Color('#3f3432'), r = rng(5);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z), e = edgeDist(x, z); p.setY(i, y);
      const n = Math.sin(x * 0.03 + z * 0.02) * 0.5 + 0.5; c.copy(steppe).lerp(dry, n * 0.6 + r() * 0.25).lerp(green, Math.max(0, Math.sin(x * 0.011) * Math.cos(z * 0.013)) * 0.5);
      if (e < 1.5 && y < -1.5 && y > -GORGE_DEPTH + 3.2) { const band = Math.sin(y * 0.9) > 0.3 ? basalt : rock; c.copy(band).lerp(rock, r() * 0.3); }   // kanyon duvarı
      else if (e < 0 && y <= -GORGE_DEPTH + 3.2) c.lerp(green, 0.5).lerp(rock, 0.2);   // kanyon tabanı ve kıyılar
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Kanyon dibindeki Arpaçay: akıntı izli su şeridi */
export function River() {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = rng(77); g.fillStyle = '#5d8c8c'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(230,245,240,${r() * 0.35})`; g.fillRect(r() * 128, r() * 128, 10 + r() * 20, 1.2); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(() => { let raf = 0; const loop = () => { if (ref.current?.map) ref.current.map.offset.y -= 0.0008; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, []);
  return <mesh rotation-x={-Math.PI / 2} position={[0, -GORGE_DEPTH + 1.2, 0]}><planeGeometry args={[2400, 2400]} /><meshStandardMaterial ref={ref} map={tex} roughness={0.25} metalness={0.1} /></mesh>;
}
/** Bozkır otu tutamları ve kır çiçekleri */
export function Grass({ n }: { n: number }) {
  const tuft = useRef<THREE.InstancedMesh>(null), flower = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(97), o = new THREE.Object3D(), col = new THREE.Color(); let k = 0, f = 0; const nf = Math.floor(n / 6);
    for (let i = 0; i < n * 4 && k < n; i++) { const near = r() < 0.7, s0 = r() * ROUTE_LEN, rp = routeAt(s0).p; const x = near ? rp[0] + (r() - 0.5) * 60 : (r() - 0.5) * 320, z = near ? rp[2] + (r() - 0.5) * 60 : -210 + r() * 520;
      if (edgeDist(x, z) < 1) continue; let onPath = false; for (let s = Math.max(0, s0 - 40); s < Math.min(ROUTE_LEN, s0 + 40) && near; s += 4) { const p = routeAt(s).p; if (Math.abs(p[0] - x) + Math.abs(p[2] - z) < 3) { onPath = true; break; } } if (onPath) continue;
      o.position.set(x, heightAt(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const sc = 0.7 + r() * 0.9; o.scale.set(sc, sc * (0.8 + r() * 0.6), sc); o.updateMatrix(); tuft.current?.setMatrixAt(k, o.matrix); col.setHSL(0.11 + r() * 0.05, 0.3 + r() * 0.18, 0.62 + r() * 0.2); tuft.current?.setColorAt(k, col); k++;
      if (f < nf && r() < 0.2) { o.position.y += 0.5 * sc; o.scale.setScalar(0.07 + r() * 0.05); o.updateMatrix(); flower.current?.setMatrixAt(f, o.matrix); flower.current?.setColorAt(f, col.set(['#e8d24a', '#f2f0ea', '#b77cc0', '#d9534f'][Math.floor(r() * 4)])); f++; } }
    for (const [m, cnt] of [[tuft.current, k], [flower.current, f]] as const) if (m) { m.count = cnt; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return (<group userData={{ noCast: true }}>
    <instancedMesh ref={tuft} args={[geo, mat, n]} userData={{ noCast: true }} />
    <instancedMesh ref={flower} args={[undefined, undefined, Math.floor(n / 6)]} userData={{ noCast: true }}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
  </group>);
}

/* ---------- surlar ve Aslanlı Kapı ---------- */
export function Walls({ m }: { m: Mats }) {
  const lion = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d')!; g.fillStyle = '#c2a084'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#8a6650'; g.lineWidth = 8; g.strokeRect(6, 6, 244, 148);
    g.fillStyle = '#7d5a46'; g.shadowColor = 'rgba(40,20,10,.7)'; g.shadowOffsetX = 3; g.shadowOffsetY = 4; g.beginPath(); g.ellipse(120, 92, 62, 26, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(186, 70, 24, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.9 + i * 0.25; g.beginPath(); g.arc(186 + Math.cos(a) * 26, 70 + Math.sin(a) * 26, 8, 0, Math.PI * 2); g.fill(); }
    [70, 96, 146, 168].forEach((x) => g.fillRect(x, 104, 11, 38)); g.lineWidth = 7; g.strokeStyle = '#7d5a46'; g.beginPath(); g.moveTo(60, 90); g.bezierCurveTo(26, 70, 30, 30, 50, 34); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  const cross = useMemo(() => { const s = new THREE.Shape(); const a = 0.35, b = 1.1; s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, -a); s.lineTo(b, -a); s.lineTo(b, a); s.lineTo(a, a); s.lineTo(a, b); s.lineTo(-a, b); s.lineTo(-a, a); s.lineTo(-b, a); s.lineTo(-b, -a); s.lineTo(-a, -a); s.closePath(); return new THREE.ShapeGeometry(s); }, []);
  const parts = useMemo(() => { const r = rng(17), out: { x: number; w: number; h: number; row: number }[] = [];
    for (const row of [0, 1]) for (const [a, b] of [[-152, -5], [5, 152]]) for (let x = a; x < b; x += 6) { const e = Math.min(b, x + 6), ruin = r(); out.push({ x: (x + e) / 2, w: e - x + 0.02, h: (row ? 7 : 11) * (ruin < 0.2 ? 0.45 + r() * 0.3 : 0.85 + r() * 0.15), row }); }
    return out; }, []);
  const towers = [-140, -112, -84, -56, -28, 28, 56, 84, 112, 140];
  return (<group>
    {parts.map((p, i) => <mesh key={i} geometry={bx(p.w, p.h, p.row ? 2.2 : 3)} material={p.row ? m.red : m.wall} position={[p.x, heightAt(p.x, WALL_Z) + p.h / 2 - 0.5, WALL_Z - p.row * 14]} />)}
    {towers.map((x, i) => { const h = i % 3 === 1 ? 10 : 15; return <group key={x} position={[x, heightAt(x, WALL_Z) - 0.5, WALL_Z - 2.5]}>
      <mesh material={m.wall} position={[0, h / 2, 0]}><cylinderGeometry args={[4.4, 4.8, h, 18, 1, false, Math.PI / 2, Math.PI]} /></mesh>
      <mesh material={m.dark} position={[0, h * 0.62, 0]}><cylinderGeometry args={[4.62, 4.62, 1.2, 18, 1, true, Math.PI / 2, Math.PI]} /></mesh>
      {i % 2 === 0 && <mesh geometry={cross} material={m.dark} position={[0, h * 0.4, -4.75]} rotation-y={Math.PI} />}
      <mesh geometry={archGeo(0.6, 1.5)} material={m.hole} position={[0, h * 0.8, -4.85]} rotation-y={Math.PI} />
    </group>; })}
    {/* Aslanlı Kapı: iki kule, kemerli geçit, aslan kabartması */}
    {[-6.5, 6.5].map((x) => <group key={x} position={[x, 0, WALL_Z - 3]}><mesh geometry={bx(5, 16, 9)} material={m.dark} position={[0, 7.5, 0]} /><mesh material={m.dark} position={[0, 7.5, -4.5]}><cylinderGeometry args={[2.5, 2.7, 16, 14, 1, false, Math.PI / 2, Math.PI]} /></mesh></group>)}
    <mesh geometry={bx(8, 5, 9)} material={m.red} position={[0, 12.5, WALL_Z - 3]} />
    <mesh position={[0, 10.05, WALL_Z - 3]} rotation-x={Math.PI / 2}><cylinderGeometry args={[4, 4, 9, 16, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#6e4a3c" side={THREE.DoubleSide} roughness={1} /></mesh>
    <mesh position={[0, 12.6, WALL_Z - 7.53]} rotation-y={Math.PI}><planeGeometry args={[3.8, 2.4]} /><meshStandardMaterial map={lion} roughness={0.9} /></mesh>
  </group>);
}

/* ---------- Katedral: yıkık kuzeybatı köşesi, çöken kubbenin kasnak izi, kör kemerler, üçgen nişler ---------- */
export function Cathedral({ m }: { m: Mats }) {
  const y = heightAt(20, 4), L = 26, W = 18, H = 13;
  const rubble = useMemo(() => { const r = rng(5), out: [number, number, number, number, number][] = []; for (let i = 0; i < 40; i++) out.push([-L / 2 + 1 + r() * 7, r() * 1.5, -W / 2 + 1 + r() * 7, 0.5 + r() * 1.2, r() * 3]); return out; }, []);
  return (<group position={[20, y - 0.3, 4]}>
    <mesh geometry={bx(L + 1.2, 1, W + 1.2)} material={m.pale} position={[0, 0.5, 0]} />
    {/* gövde: güney yarı tam, kuzey yarının batı köşesi (8×8) yıkık */}
    <mesh geometry={bx(L, H, W / 2)} material={m.red} position={[0, H / 2 + 1, W / 4]} />
    <mesh geometry={bx(L - 8, H, W / 2)} material={m.red} position={[4, H / 2 + 1, -W / 4]} />
    {[[-L / 2 + 0.6, 5, -W / 4 - 1, 1.2, 8], [-L / 2 + 0.6, 2.6, -W / 2 + 1, 1.2, 2], [-L / 2 + 4, 4, -W / 2 + 0.6, 8, 1.2]].map(([x, h, z, w, d], i) => <mesh key={i} geometry={bx(w, h, d)} material={m.red} position={[x, h / 2 + 1, z]} />)}
    {/* yıkık köşenin kesit yüzü (iç kemer izi) */}
    <mesh geometry={archGeo(4, 9, false)} material={m.hole} position={[-L / 2 + 7.99, 1, -W / 4]} rotation-y={-Math.PI / 2} />
    {rubble.map(([x, yy, z, s, a], i) => <mesh key={i} material={m.red} position={[x, 1 + yy * 0.4, z]} rotation={[a, a * 2, 0]} scale={s}><dodecahedronGeometry args={[0.8, 0]} /></mesh>)}
    {/* çatılar: doğu-batı ve kuzey-güney beşikler, ortada kasnak kalıntısı */}
    <mesh geometry={gable(10, 3.4, L - 0.01)} material={m.roof} position={[0, H + 1, 0]} rotation-y={Math.PI / 2} />
    <mesh geometry={gable(10, 3.4, W)} material={m.roof} position={[0, H + 1, 0]} />
    <mesh material={m.red} position={[0, H + 4.6, 0]}><cylinderGeometry args={[5, 5.2, 2.2, 20, 1, true, 0.4, Math.PI * 1.45]} /></mesh>
    <mesh material={m.red} position={[0, H + 3.3, 0]}><cylinderGeometry args={[5.4, 5.4, 0.6, 20]} /></mesh>
    {/* güney cephesi: kör kemerler, iki üçgen niş, sivri pencereler, kapı */}
    <group position={[0, 1, W / 2 + 0.01]}><Arcade len={L - 1} h={9.5} n={9} m={m} />
      {[-4.2, 4.2].map((x) => <mesh key={x} geometry={vNicheGeo(1.3, 8.6)} material={m.hole} position={[x, 0.6, 0.02]} />)}
      {[-9.5, 0, 9.5].map((x) => <mesh key={x} geometry={archGeo(1.1, 3.2)} material={m.hole} position={[x, 6, 0.03]} />)}
      <mesh geometry={archGeo(2.2, 4.4)} material={m.hole} position={[-1.5 + 1.5, 0, 0.03]} /></group>
    {/* doğu cephesi: iki derin üçgen niş + pencere */}
    <group position={[L / 2 + 0.01, 1, 0]} rotation-y={Math.PI / 2}><Arcade len={W - 1} h={9.5} n={7} m={m} />
      {[-3.4, 3.4].map((x) => <mesh key={x} geometry={vNicheGeo(1.5, 9.4)} material={m.hole} position={[x, 0.6, 0.02]} />)}
      <mesh geometry={archGeo(1.2, 3.6)} material={m.hole} position={[0, 6.4, 0.03]} /></group>
    {/* batı cephesi (güney yarısı ayakta): kapı ve pencere */}
    <group position={[-L / 2 - 0.01, 1, W / 4]} rotation-y={-Math.PI / 2}><mesh geometry={archGeo(2.4, 4.8)} material={m.hole} position={[0, 0, 0.02]} /><mesh geometry={archGeo(1.1, 3)} material={m.hole} position={[0, 7, 0.02]} /></group>
  </group>);
}

/* ---------- Ebul Menuçehr Camii: harim, kanyona bakan kemerler, sekizgen minare ve yazı kuşağı ---------- */
export function Mosque({ m }: { m: Mats }) {
  const y = heightAt(112, 62);
  return (<group position={[112, y - 0.3, 62]} rotation-y={-0.3}>
    <mesh geometry={bx(16, 1, 13)} material={m.pale} position={[0, 0.5, 0]} />
    <mesh geometry={bx(15, 8, 12)} material={m.red} position={[0, 5, 0]} />
    <mesh geometry={bx(15.6, 0.6, 12.6)} material={m.dark} position={[0, 9.2, 0]} />
    {[-5, 0, 5].map((z) => <mesh key={z} geometry={archGeo(2.6, 5)} material={m.hole} position={[7.51, 1, z]} rotation-y={Math.PI / 2} />)}
    {[-4.5, 0, 4.5].map((x) => <mesh key={x} geometry={archGeo(1.2, 2.4)} material={m.hole} position={[x, 5, 6.01]} />)}
    <mesh material={m.checker} position={[-7.51, 7.6, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[11, 1.4]} /></mesh>
    <mesh geometry={archGeo(2, 4)} material={m.hole} position={[-7.53, 1, 0]} rotation-y={-Math.PI / 2} />
    <group position={[-6, 1, -5.5]}>
      <mesh material={m.dark} position={[0, 1.6, 0]}><cylinderGeometry args={[2.4, 2.4, 3.2, 8]} /></mesh>
      <mesh material={m.red} position={[0, 12, 0]}><cylinderGeometry args={[1.55, 1.85, 18, 8]} /></mesh>
      <mesh material={m.checker} position={[0, 16.5, 0]}><cylinderGeometry args={[1.62, 1.62, 1.6, 8]} /></mesh>
      <mesh material={m.dark} position={[0, 9, 0]}><cylinderGeometry args={[1.75, 1.75, 0.5, 8]} /></mesh>
      <mesh material={m.dark} position={[0, 21.2, 0]}><cylinderGeometry args={[1.45, 1.6, 0.6, 8]} /></mesh>
    </group>
  </group>);
}

/* ---------- Tigran Honents: haç planlı, dört beşik çatı, kör kemerli kasnak ve şemsiye külah, yıkık narteks ---------- */
export function Tigran({ m }: { m: Mats }) {
  const y = heightAt(92, 142);
  return (<group position={[92, y - 0.3, 142]} rotation-y={0.4}>
    <mesh geometry={bx(11, 1, 15)} material={m.pale} position={[0, 0.5, 0]} />
    <mesh geometry={bx(8, 8, 13)} material={m.red} position={[0, 5, 0]} />
    <mesh geometry={bx(12, 7, 6)} material={m.red} position={[0, 4.5, 0]} />
    <mesh geometry={gable(8.4, 2.2, 13.2)} material={m.roof} position={[0, 9, 0]} />
    <mesh geometry={gable(6.4, 2, 12.2)} material={m.roof} position={[0, 8, 0]} rotation-y={Math.PI / 2} />
    <mesh material={m.red} position={[0, 11.6, 0]}><cylinderGeometry args={[2.6, 2.6, 3.6, 12]} /></mesh>
    {Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2 + Math.PI / 12).map((a, i) => <mesh key={i} geometry={archGeo(0.9, 2.2, false)} material={i % 3 === 0 ? m.hole : m.dark} position={[Math.sin(a) * 2.62, 10.3, Math.cos(a) * 2.62]} rotation-y={a} />)}
    <mesh material={m.roof} position={[0, 14.3, 0]}><coneGeometry args={[3.1, 2.4, 12]} /></mesh>
    {[1, -1].map((s) => <group key={s} position={[0, 1, s * 6.51]} rotation-y={s > 0 ? 0 : Math.PI}><Arcade len={7.4} h={6} n={5} m={m} /><mesh geometry={archGeo(1.4, 3)} material={m.hole} position={[0, 0, 0.03]} /></group>)}
    {[1, -1].map((s) => <group key={s} position={[s * 6.01, 1, 0]} rotation-y={s * Math.PI / 2}><Arcade len={5.4} h={5.5} n={3} m={m} /><mesh geometry={archGeo(0.8, 2.2)} material={m.hole} position={[0, 2.6, 0.03]} /></group>)}
    {/* batıdaki yıkık narteks: alçak duvar diplerinde */}
    {[[-3.5, 9.5, 0.9, 5], [3.5, 9.5, 0.9, 5], [0, 12, 7.9, 0.9]].map(([x, z, w, d], i) => <mesh key={i} geometry={bx(w, 1.6 + i * 0.7, d)} material={m.red} position={[x, 1.3, z]} />)}
  </group>);
}

/* ---------- Kurtarıcı (Prkiç) Kilisesi: yarısı ayakta yuvarlak kilise — manzara öğesi ---------- */
export function HalfChurch({ m }: { m: Mats }) {
  const y = heightAt(42, -82);
  return (<group position={[42, y - 0.3, -82]} rotation-y={-0.6}>
    <mesh material={m.red} position={[0, 7, 0]}><cylinderGeometry args={[6, 6.2, 14, 19, 1, true, 0, Math.PI]} /></mesh>
    <mesh position={[0, 7, 0]}><cylinderGeometry args={[5.2, 5.2, 14, 19, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#5b3d33" side={THREE.BackSide} /></mesh>
    <mesh material={m.red} position={[0, 15, 0]}><cylinderGeometry args={[4.2, 4.6, 2.4, 19, 1, true, 0, Math.PI]} /></mesh>
    <mesh material={m.roof} position={[0, 17.2, 0]}><coneGeometry args={[4.4, 3, 19, 1, true, 0, Math.PI]} /></mesh>
    {[0.5, 1.5, 2.6].map((a) => <mesh key={a} geometry={archGeo(1, 2.6)} material={m.hole} position={[Math.sin(a) * 6.22, 9, Math.cos(a) * 6.22]} rotation-y={a} />)}
    {Array.from({ length: 14 }, (_, i) => <mesh key={i} material={m.red} position={[(i % 5) * 1.6 - 3, 0.4, -2 - Math.floor(i / 5) * 1.4]} rotation={[i, i * 2, 0]}><dodecahedronGeometry args={[0.7, 0]} /></mesh>)}
  </group>);
}
/** Abuğamrents: on iki kenarlı küçük yuvarlak kilise — manzara öğesi */
export function RoundChurch({ m }: { m: Mats }) {
  const y = heightAt(-48, 44);
  return (<group position={[-48, y - 0.3, 44]}>
    <mesh material={m.red} position={[0, 4, 0]}><cylinderGeometry args={[4.4, 4.6, 8, 12]} /></mesh>
    {Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2).map((a, i) => <mesh key={i} geometry={vNicheGeo(0.9, 5)} material={m.hole} position={[Math.sin(a) * 4.42, 1.5, Math.cos(a) * 4.42]} rotation-y={a} />)}
    <mesh material={m.red} position={[0, 9.2, 0]}><cylinderGeometry args={[2.4, 2.4, 2.4, 12]} /></mesh>
    <mesh material={m.roof} position={[0, 11.6, 0]}><coneGeometry args={[2.8, 2.4, 12]} /></mesh>
    <mesh material={m.roof} position={[0, 8.2, 0]}><coneGeometry args={[4.7, 1.2, 12]} /></mesh>
  </group>);
}
/** Ateşgede olarak anılan yapının sütun kalıntıları — manzara öğesi */
export function Columns({ m }: { m: Mats }) {
  const y = heightAt(-34, -22);
  return (<group position={[-34, y - 0.2, -22]}>
    <mesh geometry={bx(9, 0.8, 9)} material={m.pale} position={[0, 0.4, 0]} />
    {[[-3, -3, 5.5], [3, -3, 2.2], [-3, 3, 3.4], [3, 3, 6]].map(([x, z, h], i) => <mesh key={i} material={m.pale} position={[x, 0.8 + h / 2, z]}><cylinderGeometry args={[0.55, 0.6, h, 10]} /></mesh>)}
  </group>);
}

/* ---------- Arpaçay Köprüsü ve Kız Kalesi ---------- */
export function Bridge({ m }: { m: Mats }) {
  return (<group position={[116, -GORGE_DEPTH, 236]} rotation-y={1.2}>
    {[-13, 13].map((x) => <group key={x}><mesh geometry={bx(8, 18, 8)} material={m.dark} position={[x, 9, 0]} /><mesh geometry={bx(8.6, 1, 8.6)} material={m.red} position={[x, 18.2, 0]} /></group>)}
    {[-1, 1].map((s) => <mesh key={s} geometry={bx(7, 2.2, 8)} material={m.dark} position={[s * 7.4, 19.5, 0]} rotation-z={s * 0.5} />)}
    <group position={[-19, 18, 0]}><mesh geometry={bx(5, 5, 6)} material={m.red} position={[0, 2.5, 0]} /><mesh geometry={archGeo(1.6, 3)} material={m.hole} position={[2.51, 0, 0]} rotation-y={Math.PI / 2} /></group>
  </group>);
}
export function MaidenCastle({ m }: { m: Mats }) {
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5e4339', roughness: 1, flatShading: true }), []);
  const rockGeo = useMemo(() => { const g = new THREE.CylinderGeometry(8, 17, 30, 11, 4); const p = g.attributes.position as THREE.BufferAttribute, r = rng(61); for (let i = 0; i < p.count; i++) { const k = 0.82 + r() * 0.36; p.setXYZ(i, p.getX(i) * k, p.getY(i) + (r() - 0.5) * 1.5, p.getZ(i) * k); } g.computeVertexNormals(); return g; }, []);
  return (<group position={[24, -GORGE_DEPTH, 336]}>
    <mesh geometry={rockGeo} material={rockMat} position={[0, 15, 0]} />
    <group position={[0, 30, 0]}>
      <mesh geometry={bx(4.5, 4, 5.5)} material={m.red} position={[0, 2, 0]} /><mesh geometry={gable(4.7, 1.4, 5.7)} material={m.roof} position={[0, 4, 0]} />
      <mesh material={m.red} position={[0, 5.4, 0]}><cylinderGeometry args={[1.3, 1.3, 1.6, 10]} /></mesh><mesh material={m.roof} position={[0, 6.9, 0]}><coneGeometry args={[1.6, 1.4, 10]} /></mesh>
      <mesh geometry={archGeo(1, 2)} material={m.hole} position={[0, 0, 2.76]} />
      {[[-5, 2, 3], [5.5, -1, 2], [0, -6, 2.4]].map(([x, z, h], i) => <mesh key={i} geometry={bx(i === 2 ? 8 : 1, h, i === 2 ? 1 : 7)} material={m.red} position={[x, h / 2 - 0.5, z]} />)}
    </group>
  </group>);
}

/* ---------- platoya dağılmış küçük kilise kalıntıları ve moloz ---------- */
const KEEP_OUT: [number, number][] = [[20, 4], [112, 62], [92, 142], [42, -82], [-48, 44], [-34, -22]];
export function Ruins({ m, n }: { m: Mats; n: number }) {
  const list = useMemo(() => { const r = rng(71), out: { x: number; z: number; h: number; a: number; kind: number }[] = []; let k = 0;
    while (out.length < n && k++ < 600) { const x = (r() - 0.5) * 240, z = -120 + r() * 380; if (edgeDist(x, z) < 12 || KEEP_OUT.some(([a, b]) => Math.hypot(a - x, b - z) < 26) || out.some((o) => Math.hypot(o.x - x, o.z - z) < 18)) continue;
      let ok = true; for (let s = 0; s < ROUTE_LEN; s += 6) { const p = routeAt(s).p; if (Math.hypot(p[0] - x, p[2] - z) < 16) { ok = false; break; } } if (ok) out.push({ x, z, h: 3 + r() * 5, a: r() * 3, kind: Math.floor(r() * 3) }); }
    return out; }, [n]);
  return (<group>{list.map((b, i) => <group key={i} position={[b.x, heightAt(b.x, b.z) - 0.3, b.z]} rotation-y={b.a}>
    {b.kind === 0 && <><mesh geometry={bx(6, b.h, 8)} material={m.red} position={[0, b.h / 2, 0]} /><mesh geometry={gable(6.2, 1.8, 8.2)} material={m.roof} position={[0, b.h, 0]} /><mesh material={m.red} position={[0, b.h + 2.3, 0]}><cylinderGeometry args={[1.5, 1.5, 1.6, 10]} /></mesh><mesh material={m.roof} position={[0, b.h + 3.7, 0]}><coneGeometry args={[1.8, 1.4, 10]} /></mesh><mesh geometry={archGeo(1.2, 2.4)} material={m.hole} position={[0, 0.2, 4.01]} /></>}
    {b.kind === 1 && <><mesh geometry={bx(6, b.h, 0.9)} material={m.red} position={[0, b.h / 2, -3.6]} /><mesh geometry={bx(0.9, b.h * 0.6, 7)} material={m.red} position={[-2.6, b.h * 0.3, 0]} /><mesh geometry={archGeo(1.2, b.h * 0.6)} material={m.hole} position={[0, 0, -3.14]} /></>}
    {b.kind === 2 && <><mesh material={m.red} position={[0, b.h / 2, 0]}><cylinderGeometry args={[3, 3.2, b.h, 12, 1, true, 0, Math.PI * 1.3]} /></mesh><mesh geometry={bx(2.4, 0.8, 2)} material={m.red} position={[3.4, 0.4, 1]} /></>}
  </group>)}</group>);
}
export function Rubble({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(83), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 3 && k < n; i++) { const x = (r() - 0.5) * 300, z = -140 + r() * 420; if (edgeDist(x, z) < 2) continue; o.position.set(x, heightAt(x, z) + 0.1, z); o.rotation.set(r(), r() * 3, r()); o.scale.set(0.4 + r() * 0.9, 0.3 + r() * 0.5, 0.4 + r() * 0.8); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[undefined, undefined, n]}><dodecahedronGeometry args={[0.8, 1]} /><meshStandardMaterial color="#8a6050" roughness={1} flatShading /></instancedMesh>;
}
/** Uzak tepeler (sınırın öte yakası): ufku kapatır */
export function FarHills() {
  const list = useMemo(() => { const r = rng(55), out: [number, number, number, number, boolean][] = []; for (let i = 0; i < 14; i++) { const a = -0.9 + (i / 13) * 3.4, d = 900 + r() * 500; out.push([Math.sin(a) * d, -Math.cos(a) * d * 0.6 + 200, 40 + r() * 70, 380 + r() * 320, i === 5]); } return out; }, []);
  return <group>{list.map(([x, z, h, rad, snow], i) => <group key={i} position={[x, -20, z]}><mesh position={[0, h / 2, 0]}><coneGeometry args={[rad, h, 9]} /><meshStandardMaterial color="#a99d78" roughness={1} /></mesh>{snow && <mesh position={[0, h * 0.85, 0]}><coneGeometry args={[rad * 0.3, h * 0.3, 9]} /><meshStandardMaterial color="#f2f4f6" flatShading /></mesh>}</group>)}</group>;
}
