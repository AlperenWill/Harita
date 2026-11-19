/**
 * Klasik İstanbul şehir hatları vapuru (stilize, prosedürel; GLB yok). Vapurun yerel koordinatında: −z baş, güverte y = DECK.y.
 *
 * Gövde: 41 enine kesitten örülen tek ağ ("loft"). Her kesit U biçimlidir (güverte kenarı → su hattı → sintine dönümü → omurga);
 * baş tarafta daralır ve yükselir (şiyer), kıç yuvarlaktır. Renk yüksekliğe göre köşe rengiyle verilir: su hattı altında kırmızı
 * zehirli boya, üstünde lacivert borda, güverte hizasında beyaz kuşak.
 * Üst yapı: yuvarlatılmış salon (pencere sıraları InstancedMesh), üst güverte, köprüüstü (çepeçevre cam), baca (sarı gövde, siyah bilezik),
 * filikalar, can simitleri, direk ve kıçta dalgalanan Türk bayrağı. Açık baş güvertesi (oyuncunun yürüdüğü yer) eskisiyle aynı boyuttadır.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DECK } from './ferry';

const L0 = -15.5, L1 = 15.5;
/** Yarı genişlik: başta sivri (eliptik daralma), kıçta yuvarlak */
const halfBeam = (z: number) => (z < -4 ? 3.6 * Math.sqrt(Math.max(0, 1 - ((z + 4) / 11.5) ** 2)) : z > 12 ? 3.6 * Math.sqrt(Math.max(0, 1 - ((z - 12) / 3.5) ** 2)) : 3.6);
/** Güverte kenarı yüksekliği: başa doğru yükselir */
const sheer = (z: number) => DECK.y + Math.max(0, (-z - 5) / 10.5) ** 2 * 0.9 + Math.max(0, (z - 11) / 4.5) ** 2 * 0.25;

function hullGeometry() {
  // kesit profili: (genişlik oranı, y); y = null → güverte kenarı (şiyer)
  const N = 41, prof: [number, number | null][] = [[1, null], [1, DECK.y - 0.75], [0.985, 0.12], [0.94, -0.25], [0.8, -0.6], [0.5, -0.85], [0, -0.95]];
  const half = [...prof, ...prof.slice(0, -1).reverse().map(([w, y]) => [-w, y] as [number, number | null])], ring = half.length;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const navy = new THREE.Color('#1c2a3a'), red = new THREE.Color('#8e2b22'), white = new THREE.Color('#f1efe8');
  for (let i = 0; i < N; i++) {
    const z = L0 + ((L1 - L0) * i) / (N - 1), b = Math.max(0.02, halfBeam(z)), top = sheer(z);
    for (const [w, yy] of half) { const y = yy ?? top, c = y < 0.15 ? red : y > top - 0.45 ? white : navy; pos.push(w * b, y, z); col.push(c.r, c.g, c.b); }
  }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < ring - 1; j++) { const a = i * ring + j, b = a + 1, d = a + ring, e = d + 1; idx.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Tahta güverte dokusu (kalaslar) */
function plankTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d')!; let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 256; y += 16) { const t = 140 + r() * 30; g.fillStyle = `rgb(${t},${t * 0.74},${t * 0.5})`; g.fillRect(0, y, 256, 16); g.fillStyle = 'rgba(40,25,10,.55)'; g.fillRect(0, y + 15, 256, 1.5); for (let k = 0; k < 2; k++) g.fillRect(r() * 256, y, 1.5, 15); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,35,15' : '255,230,190'},${r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 6 + r() * 20, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 7); t.rotation = Math.PI / 2; t.anisotropy = 8; return t;
}
/** Türk bayrağı (oranlar TS 4374'e yakın, stilize): kırmızı zemin, beyaz hilal ve yıldız */
export function flagTex() {
  const W = 300, H = 200, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  g.fillStyle = '#e30a17'; g.fillRect(0, 0, W, H);
  const G = H, cx = G / 2;   // hilal merkezi bayrak genişliğinin G/2'sinde
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, H / 2, G / 4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e30a17'; g.beginPath(); g.arc(cx + G * 0.0625, H / 2, G * 0.2, 0, Math.PI * 2); g.fill();
  // yıldız: çevrel çemberi G/4 çapında; merkezi iç hilal çemberinin merkezinden G/3 + G/8 uzakta; bir ucu hilale bakar
  const sx = cx + G * 0.0625 + G / 3 + G / 8, r = G / 8; g.fillStyle = '#ffffff'; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = Math.PI + (i * Math.PI) / 5, rr = i % 2 ? r * 0.382 : r; g.lineTo(sx + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); }
  g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Dalgalanan bayrak: köşeler her karede sinüsle bükülür */
export function Flag({ w = 1.5, h = 1 }: { w?: number; h?: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const geo = useMemo(() => new THREE.PlaneGeometry(w, h, 12, 4).translate(w / 2, 0, 0), [w, h]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.8 }), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  useFrame(({ clock }) => {
    const p = geo.attributes.position as THREE.BufferAttribute, t = clock.elapsedTime;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], k = x / w; p.setZ(i, Math.sin(x * 3.2 - t * 6 + y) * 0.16 * k); p.setY(i, y - k * k * 0.08); }
    p.needsUpdate = true; geo.computeVertexNormals();
  });
  return <mesh ref={ref} geometry={geo} material={mat} />;
}

const M = {
  hull: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.45 }),
  cream: new THREE.MeshStandardMaterial({ color: '#e8e1cf', roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: '#203845', roughness: 0.08, metalness: 0.6 }),
  funnel: new THREE.MeshStandardMaterial({ color: '#e7b53a', roughness: 0.45 }),
  black: new THREE.MeshStandardMaterial({ color: '#16181a', roughness: 0.6 }),
  rail: new THREE.MeshStandardMaterial({ color: '#f4f4ef', roughness: 0.35, metalness: 0.4 }),
  orange: new THREE.MeshStandardMaterial({ color: '#f26a1b', roughness: 0.6 }),
  wood: new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.7 }),
};

export function FerryModel() {
  const G = useMemo(() => {
    const deck = new THREE.Shape();   // açık güverte (eski şekil korunur: oyuncunun yürüdüğü alan)
    deck.moveTo(0, 15.2); deck.quadraticCurveTo(3.4, 10, 3.4, 4); deck.lineTo(3.4, -12); deck.quadraticCurveTo(3.2, -14.8, 0, -15.2); deck.quadraticCurveTo(-3.2, -14.8, -3.4, -12); deck.lineTo(-3.4, 4); deck.quadraticCurveTo(-3.4, 10, 0, 15.2);
    const railPts = (side: number) => Array.from({ length: 25 }, (_, i) => { const z = -15 + (i / 24) * 10.5; return new THREE.Vector3(side * Math.max(0.05, halfBeam(z) - 0.25), sheer(z) - DECK.y, z); });
    const rails = [1, -1].flatMap((s) => { const cv = new THREE.CatmullRomCurve3(railPts(s)); return [new THREE.TubeGeometry(cv, 40, 0.04, 6), new THREE.TubeGeometry(cv, 40, 0.025, 5).translate(0, -0.5, 0)]; });
    const stanch = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 5).translate(0, 0.52, 0), M.rail, 30); let k = 0; const M4 = new THREE.Matrix4();
    for (const s of [1, -1]) for (let i = 0; i < 15; i++) { const z = -14.4 + i * 0.68; stanch.setMatrixAt(k++, M4.makeTranslation(s * Math.max(0.1, halfBeam(z) - 0.25), sheer(z) - DECK.y, z)); }
    // salon pencereleri: iki yanda 13'er + ön cephede 5 (yuvarlatılmış dikdörtgen)
    const wg = new RoundedBoxGeometry(0.9, 0.85, 0.06, 2, 0.12), wins = new THREE.InstancedMesh(wg, M.glass, 13 * 2 + 5 + 18), q = new THREE.Quaternion(); k = 0;
    for (const s of [1, -1]) for (let i = 0; i < 13; i++) wins.setMatrixAt(k++, M4.compose(new THREE.Vector3(s * 3.42, 1.45, -3.6 + i * 1.22), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
    for (let i = 0; i < 5; i++) wins.setMatrixAt(k++, M4.compose(new THREE.Vector3(-2.4 + i * 1.2, 1.45, -4.92), q.identity(), new THREE.Vector3(1, 1, 1)));
    for (const s of [1, -1]) for (let i = 0; i < 9; i++) wins.setMatrixAt(k++, M4.compose(new THREE.Vector3(s * 2.32, 3.75, 0.4 + i * 1.05), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(0.75, 0.7, 1)));   // üst salon
    return { hull: hullGeometry(), deck: new THREE.ShapeGeometry(deck, 16).rotateX(-Math.PI / 2), plank: new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.8 }), rails, stanch, wins,
      salon: new RoundedBoxGeometry(6.8, 2.6, 17, 3, 0.35), upper: new RoundedBoxGeometry(4.6, 1.7, 9.6, 3, 0.3), bridge: new RoundedBoxGeometry(5.2, 1.6, 2.6, 3, 0.35), boat: new THREE.CapsuleGeometry(0.55, 3.2, 4, 10).rotateX(Math.PI / 2).scale(1, 0.55, 1) };
  }, []);
  return (
    <group>
      <mesh geometry={G.hull} material={M.hull} castShadow receiveShadow />
      <mesh geometry={G.deck} material={G.plank} position={[0, DECK.y + 0.01, 0]} receiveShadow />
      {/* baş güvertesi korkuluğu: iki boru + dikmeler (şiyere uyar) */}
      {G.rails.map((g, i) => <mesh key={i} geometry={g} material={M.rail} position={[0, DECK.y + 1.05, 0]} />)}
      <primitive object={G.stanch} position={[0, DECK.y, 0]} />
      {/* baş güvertesi: babalar, ırgat, can simitleri */}
      {[-1, 1].map((s) => <mesh key={`b${s}`} material={M.black} position={[s * 1.6, DECK.y + 0.25, -11.5]}><cylinderGeometry args={[0.16, 0.18, 0.5, 10]} /></mesh>)}
      <mesh material={M.black} position={[0, DECK.y + 0.35, -13]}><cylinderGeometry args={[0.35, 0.35, 0.7, 12]} /></mesh>
      {/* salon (ana güverte), pencereler, giriş kapıları */}
      <mesh geometry={G.salon} material={M.white} position={[0, DECK.y + 1.3, 3.6]} castShadow receiveShadow />
      <primitive object={G.wins} position={[0, DECK.y, 0]} />
      {[-1, 1].map((s) => <mesh key={`d${s}`} material={M.cream} position={[s * 1.6, DECK.y + 1.05, -4.93]}><planeGeometry args={[0.9, 2.05]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`r${s}`} material={M.orange} position={[s * 2.95, DECK.y + 1.5, -4.98]}><torusGeometry args={[0.32, 0.08, 8, 18]} /></mesh>)}
      {/* üst güverte: döşeme + korkuluk, üst salon, köprüüstü */}
      <mesh material={M.white} position={[0, DECK.y + 2.72, 4.2]} castShadow><boxGeometry args={[7.3, 0.22, 19.4]} /></mesh>
      {[-1, 1].map((s) => <mesh key={`u${s}`} material={M.rail} position={[s * 3.55, DECK.y + 3.3, 4.2]}><boxGeometry args={[0.05, 0.05, 19]} /></mesh>)}
      <mesh geometry={G.upper} material={M.white} position={[0, DECK.y + 3.65, 4.6]} castShadow />
      <mesh geometry={G.bridge} material={M.white} position={[0, DECK.y + 3.65, -2.2]} castShadow />
      <mesh material={M.glass} position={[0, DECK.y + 3.95, -3.52]}><boxGeometry args={[4.6, 0.75, 0.05]} /></mesh>
      {[-1, 1].map((s) => <mesh key={`w${s}`} material={M.glass} position={[s * 2.62, DECK.y + 3.95, -2.2]} rotation-y={Math.PI / 2}><boxGeometry args={[2.1, 0.75, 0.05]} /></mesh>)}
      <mesh material={M.white} position={[0, DECK.y + 4.55, -2.2]}><boxGeometry args={[5.6, 0.16, 3]} /></mesh>
      {/* filikalar (üst güverte yanlarında) */}
      {[-1, 1].map((s) => <mesh key={`l${s}`} geometry={G.boat} material={M.orange} position={[s * 2.9, DECK.y + 3.3, 8.6]} />)}
      {/* baca: hafif eğik, sarı gövde + siyah bilezik */}
      <group position={[0, DECK.y + 4.4, 5.4]} rotation-x={0.1}>
        <mesh material={M.funnel} scale={[0.82, 1, 1]} castShadow><cylinderGeometry args={[0.95, 1.08, 3, 20]} /></mesh>
        <mesh material={M.black} position={[0, 1.75, 0]} scale={[0.82, 1, 1]}><cylinderGeometry args={[0.97, 0.95, 0.6, 20]} /></mesh>
      </group>
      {/* direk (köprüüstü üstünde) ve kıçta bayrak direği + Türk bayrağı */}
      <mesh material={M.rail} position={[0, DECK.y + 6.2, -2.2]}><cylinderGeometry args={[0.05, 0.07, 3.2, 6]} /></mesh>
      <mesh material={M.rail} position={[0, DECK.y + 3.4, 14.4]}><cylinderGeometry args={[0.04, 0.05, 2.6, 6]} /></mesh>
      <group position={[0, DECK.y + 4.35, 14.4]} rotation-y={Math.PI / 2}><Flag w={1.4} h={0.93} /></group>
    </group>
  );
}
