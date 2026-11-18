/**
 * Topkapı — iç mekânlar: Divan-ı Hümâyun (Kubbealtı) ve Harem (Altın Yol → Valide Sultan Dairesi → hamam).
 * Hazine ayrı dosyada (TreasureRoom.tsx). Yalnızca oyuncunun bulunduğu bölge çizilir.
 *
 * Işık: her odanın kendi sıcaklığı var. Divan: pencerelerden giren beyaz gün ışığı + avize. Altın Yol: kandiller (titrek, sıcak).
 * Valide dairesi: ocak ateşi + pencere ışığı. Hamam: kubbedeki cam gözlerden soğuk ışık + buhar.
 * Parlayan yüzeyler (pencere, kandil, cam göz, ateş) 1'in üzerinde ışıma verir; bloom bunları yumuşakça taşırır.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { DIVAN_IN, HAREM_IN } from './world';
import { carpetMaterial, tileMaterial } from './materials';
import { cobble, marbleFloor, plaster, pointedArchFrame, pointedWindow, withRepeat, woodTex, type Mats } from './kit';

const T = Math.PI * 2;
type WallSpec = { a: [number, number]; b: [number, number] };   // iç yüzü odaya bakan duvar (a→b, oda solda)

/** Kalem işi kubbe içi (canvas): tepede altın göbek, dilimler, madalyonlar, kenarda yazı kuşağı (okunmaz; süs) */
function domePaint(base: string, accent: string) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
  const rg = g.createLinearGradient(0, 0, 0, 60); rg.addColorStop(0, '#f6d77a'); rg.addColorStop(1, '#b8862c'); g.fillStyle = rg; g.fillRect(0, 0, 1024, 56);
  g.strokeStyle = '#d9b456'; g.lineWidth = 6; for (let i = 0; i < 16; i++) { const x = (i / 16) * 1024; g.beginPath(); g.moveTo(x, 56); g.lineTo(x, 226); g.stroke(); }
  for (let i = 0; i < 16; i++) { const x = ((i + 0.5) / 16) * 1024; g.fillStyle = accent; g.beginPath(); g.ellipse(x, 140, 22, 48, 0, 0, T); g.fill(); g.strokeStyle = '#e8c766'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#f2e6c8'; for (let k = 0; k < 6; k++) { const a = (k / 6) * T; g.beginPath(); g.arc(x + Math.cos(a) * 9, 140 + Math.sin(a) * 18, 5, 0, T); g.fill(); } }
  g.fillStyle = '#7a1c22'; g.fillRect(0, 226, 1024, 30); g.fillStyle = '#e2bf5e'; for (let x = 6; x < 1024; x += 14) g.fillRect(x, 233 + ((x / 14) % 3) * 3, 8, 8 + ((x / 7) % 2) * 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/** Boyalı ahşap tavan (göbekli geometrik desen) */
function ceilingPaint() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#5b1f1c'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#d6ad52'; g.lineWidth = 5; g.strokeRect(6, 6, 244, 244);
  g.fillStyle = '#1f4a3c'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * T, r = i % 2 ? 50 : 96; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.fill(); g.stroke();
  g.fillStyle = '#d6ad52'; g.beginPath(); g.arc(128, 128, 22, 0, T); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/** İçe bakan duvar: alt kuşak (çini) + üst (sıva); kapı açıklıkları ayrı çizilir */
function Wall({ w, h, tileH, m, tileRepeat = 1.2, upper }: { w: WallSpec; h: number; tileH: number; m: Mats; tileRepeat?: number; upper?: THREE.Material }) {
  const [ax, az] = w.a, [bx, bz] = w.b, L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
  const tile = useMemo(() => (tileH > 0 ? tileMaterial([L / tileRepeat, tileH / tileRepeat]) : null), [L, tileH, tileRepeat]);
  const up = useMemo(() => { if (upper) return upper; const p = withRepeat(plaster(), L / 3, (h - tileH) / 3); return new THREE.MeshStandardMaterial({ map: p.map, normalMap: p.normal, roughness: 0.9, color: '#f1e6d0' }); }, [upper, L, h, tileH]);
  return (
    <group position={[(ax + bx) / 2, 0, (az + bz) / 2]} rotation-y={yaw}>
      {tile && <mesh position={[0, tileH / 2, 0]} material={tile} receiveShadow><planeGeometry args={[L, tileH]} /></mesh>}
      <mesh position={[0, tileH + (h - tileH) / 2, 0]} material={up}><planeGeometry args={[L, h - tileH]} /></mesh>
      {tileH > 0 && <mesh position={[0, tileH, 0.03]} material={m.gold}><boxGeometry args={[L, 0.08, 0.05]} /></mesh>}
    </group>
  );
}
/** Duvara gömülü, içeriden parlayan pencere (gün ışığı) */
function GlowWindow({ p, yaw, w = 0.9, h = 1.8, color = '#fff2d8', k = 2.2 }: { p: [number, number, number]; yaw: number; w?: number; h?: number; color?: string; k?: number }) {
  const g = useMemo(() => pointedWindow(w, h), [w, h]), f = useMemo(() => pointedArchFrame(w + 0.3, h + 0.25, w, h - w * 0.72, 0.12), [w, h]);
  return (
    <group position={p} rotation-y={yaw}>
      <mesh geometry={g}><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(k)} toneMapped={false} /></mesh>
      <mesh geometry={f} position={[0, 0, 0.05]}><meshStandardMaterial color="#e9dcc2" roughness={0.6} /></mesh>
    </group>
  );
}
/** Sedir: duvar dibinde alçak minder + yaslanma yastıkları */
function Sedir({ x, z, w, d, yaw, color }: { x: number; z: number; w: number; d: number; yaw: number; color: string }) {
  const n = Math.max(1, Math.floor(w / 1.1));
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.4, d]} /><meshStandardMaterial color="#5a3a22" roughness={0.8} /></mesh>
      <mesh position={[0, 0.47, 0]} receiveShadow><boxGeometry args={[w - 0.05, 0.14, d - 0.05]} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>
      {Array.from({ length: n }, (_, i) => <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / n), 0.78, -d / 2 + 0.16]} rotation-x={-0.2} castShadow><boxGeometry args={[w / n - 0.12, 0.5, 0.2]} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>)}
    </group>
  );
}
function Flicker({ p, color, base, range = 0.25, distance = 9 }: { p: [number, number, number]; color: string; base: number; range?: number; distance?: number }) {
  const ref = useRef<THREE.PointLight>(null!), seed = useMemo(() => Math.random() * 100, []);
  useFrame(({ clock }) => { const t = clock.elapsedTime + seed; ref.current.intensity = base * (1 - range / 2 + range * (0.5 + 0.3 * Math.sin(t * 9.1) + 0.2 * Math.sin(t * 23.7))); });
  return <pointLight ref={ref} position={p} color={color} intensity={base} distance={distance} decay={2} />;
}
/** Asma kandil: altın kafes + parlayan cam */
function Lamp({ p, light }: { p: [number, number, number]; light?: { base: number; low: boolean } }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.008, 0.008, 1, 4]} /><meshStandardMaterial color="#6b5226" /></mesh>
      <mesh><sphereGeometry args={[0.12, 12, 8]} /><meshBasicMaterial color={new THREE.Color('#ffb768').multiplyScalar(3)} toneMapped={false} /></mesh>
      <mesh><torusGeometry args={[0.15, 0.012, 4, 12]} /><meshStandardMaterial color="#c99a3a" metalness={1} roughness={0.3} /></mesh>
      {light && !light.low && <Flicker p={[0, -0.1, 0]} color="#ffb060" base={light.base} />}
    </group>
  );
}

/* ================= Divan-ı Hümâyun: Kubbealtı ================= */
export function DivanHall({ m, low }: { m: Mats; low: boolean }) {
  const D = DIVAN_IN, x0 = D.cx - D.hx, x1 = D.cx + D.hx, z0 = D.cz - D.hz, z1 = D.cz + D.hz, WH = 7.5, R = Math.min(D.hx, D.hz) - 0.1;
  const M = useMemo(() => {
    const mf = withRepeat(marbleFloor(), 4, 3);
    const ceil = new THREE.Shape(); ceil.moveTo(x0, z0); ceil.lineTo(x1, z0); ceil.lineTo(x1, z1); ceil.lineTo(x0, z1); const hole = new THREE.Path(); hole.absarc(D.cx, D.cz, R, 0, T, true); ceil.holes.push(hole);
    return { floor: new THREE.MeshStandardMaterial({ map: mf.map, roughness: 0.25 }), dome: new THREE.MeshStandardMaterial({ map: domePaint('#1d3767', '#8f1f2a'), side: THREE.BackSide, roughness: 0.7 }), ceilG: new THREE.ShapeGeometry(ceil, 48).rotateX(Math.PI / 2), ceil: new THREE.MeshStandardMaterial({ color: '#e9dcc0', roughness: 0.8, side: THREE.DoubleSide }), carpet: carpetMaterial([1, 1], !low) };
  }, [x0, x1, z0, z1, D.cx, D.cz, R, low]);
  const grille = useMemo(() => {   // Adalet Kulesi'ne açılan altın kafesli pencere: çapraz çubuk ızgarası
    const bars: THREE.Matrix4[] = [], g = new THREE.BoxGeometry(0.035, 2.4, 0.035), M4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = -6; i <= 6; i++) for (const s of [1, -1]) bars.push(M4.clone().compose(new THREE.Vector3(i * 0.18, 0, 0), q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), s * 0.62), new THREE.Vector3(1, 1, 1)));
    const im = new THREE.InstancedMesh(g, m.gold, bars.length); bars.forEach((b, i) => im.setMatrixAt(i, b)); return im;
  }, [m.gold]);
  const walls: WallSpec[] = [{ a: [x0, z0], b: [x1, z0] }, { a: [x1, z0], b: [x1, z1] }, { a: [x1, z1], b: [x0, z1] }, { a: [x0, z1], b: [x0, z0] }];
  return (
    <group>
      <Environment resolution={32} frames={1}>
        <Lightformer form="rect" intensity={1.2} color="#ffe9c8" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#bcd2ff" position={[8, 3, 0]} scale={[4, 4, 1]} target={[0, 0, 0]} />
      </Environment>
      <hemisphereLight args={['#fff1da', '#4a3624', 0.55]} />
      <directionalLight position={[D.cx + 14, 12, D.cz - 4]} target-position={[D.cx, 0, D.cz]} intensity={1.6} color="#fff3e0" />
      <pointLight position={[D.cx, 4.6, D.cz]} intensity={26} distance={16} decay={1.6} color="#ffd29a" />
      <mesh rotation-x={-Math.PI / 2} position={[D.cx, 0, D.cz]} material={M.floor} receiveShadow><planeGeometry args={[D.hx * 2, D.hz * 2]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[D.cx, 0.01, D.cz]} material={M.carpet} receiveShadow><planeGeometry args={[8, 6, low ? 1 : 64, low ? 1 : 48]} /></mesh>
      {walls.map((w, i) => <Wall key={i} w={w} h={WH} tileH={2.4} m={m} />)}
      <mesh geometry={M.ceilG} material={M.ceil} position={[0, WH, 0]} />
      <mesh position={[D.cx, WH, D.cz]} material={M.dome}><sphereGeometry args={[R, 40, 16, 0, T, 0, Math.PI / 2]} /></mesh>
      <mesh position={[D.cx, WH + 0.02, D.cz]} rotation-x={Math.PI / 2} material={m.gold}><torusGeometry args={[R, 0.08, 6, 48]} /></mesh>
      {/* yüksek pencereler (doğu/batı) */}
      {[-3, 0, 3].flatMap((dz) => [<GlowWindow key={`e${dz}`} p={[x1 - 0.02, 4.4, D.cz + dz]} yaw={-Math.PI / 2} />, <GlowWindow key={`w${dz}`} p={[x0 + 0.02, 4.4, D.cz + dz]} yaw={Math.PI / 2} />])}
      {/* kafesli pencere: kuzey duvar, sedirlerin üstünde */}
      <group position={[D.cx, 5.6, z0 + 0.04]}>
        <mesh position={[0, 0, -0.02]}><planeGeometry args={[2.6, 2.4]} /><meshBasicMaterial color="#1a120a" /></mesh>
        <primitive object={grille} />
        <mesh position={[0, 1.3, 0]} material={m.gold}><boxGeometry args={[2.9, 0.16, 0.1]} /></mesh>
        <mesh position={[0, -1.3, 0]} material={m.gold}><boxGeometry args={[2.9, 0.16, 0.1]} /></mesh>
        {[-1.4, 1.4].map((x) => <mesh key={x} position={[x, 0, 0]} material={m.gold}><boxGeometry args={[0.14, 2.7, 0.1]} /></mesh>)}
      </group>
      {/* sedirler: üç duvar boyunca */}
      <Sedir x={D.cx} z={z0 + 0.55} w={D.hx * 2 - 0.3} d={1.1} yaw={0} color="#9b2b2b" />
      <Sedir x={x0 + 0.55} z={D.cz - 0.6} w={D.hz * 2 - 2.6} d={1.1} yaw={-Math.PI / 2} color="#9b2b2b" />
      <Sedir x={x1 - 0.55} z={D.cz - 0.6} w={D.hz * 2 - 2.6} d={1.1} yaw={Math.PI / 2} color="#9b2b2b" />
      {/* avize: altın halka + kandiller */}
      <group position={[D.cx, 4.8, D.cz]}>
        <mesh rotation-x={Math.PI / 2} material={m.gold}><torusGeometry args={[1.3, 0.04, 6, 32]} /></mesh>
        {Array.from({ length: 12 }, (_, i) => <Lamp key={i} p={[Math.cos((i / 12) * T) * 1.3, -0.15, Math.sin((i / 12) * T) * 1.3]} />)}
        <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.01, 0.01, 5, 4]} /><meshStandardMaterial color="#6b5226" /></mesh>
      </group>
      {/* güney kapısı */}
      <InnerDoor x={D.cx} z={z1 - 0.02} yaw={Math.PI} />
    </group>
  );
}
function InnerDoor({ x, z, yaw, w = 1.5, h = 2.6 }: { x: number; z: number; yaw: number; w?: number; h?: number }) {
  const g = useMemo(() => pointedWindow(w, h), [w, h]), f = useMemo(() => pointedArchFrame(w + 0.6, h + 0.4, w, h - w * 0.72, 0.2), [w, h]);
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <mesh geometry={g}><meshBasicMaterial color={new THREE.Color('#fff0d0').multiplyScalar(1.6)} toneMapped={false} /></mesh>
      <mesh geometry={f} position={[0, 0, 0.06]}><meshStandardMaterial color="#e6d8bd" roughness={0.5} /></mesh>
    </group>
  );
}

/* ================= Harem ================= */
export function Harem({ m, low }: { m: Mats; low: boolean }) {
  const H = HAREM_IN, cE = H.corridorEnd, vE = H.valideEnd, hE = H.hamamEnd, h = H.h;
  const M = useMemo(() => {
    const cb = withRepeat(cobble(), (cE - H.x0) / 2.4, (H.corrHalf * 2) / 2.4), wd = withRepeat(woodTex(), 4, 3), mf = withRepeat(marbleFloor(), 3, 2), ct = ceilingPaint(); ct.repeat.set(7, 5);
    const ct2 = ct.clone(); ct2.repeat.set(13, 1.5); ct2.needsUpdate = true;
    return {
      stone: new THREE.MeshStandardMaterial({ map: cb.map, normalMap: cb.normal, roughness: 0.85, color: '#b5a892' }), wood: new THREE.MeshStandardMaterial({ map: wd.map, roughness: 0.6 }),
      marble: new THREE.MeshStandardMaterial({ map: mf.map, roughness: 0.18 }), wmarble: new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.3 }), ceil: new THREE.MeshStandardMaterial({ map: ct, roughness: 0.7, side: THREE.DoubleSide }),
      ceilC: new THREE.MeshStandardMaterial({ map: ct2, roughness: 0.7, side: THREE.DoubleSide }), carpet: carpetMaterial([1, 1], !low), part: new THREE.MeshStandardMaterial({ color: '#e7dcc6', roughness: 0.85 }),
      hdome: new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.6, side: THREE.BackSide }), hceil: new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.6, side: THREE.DoubleSide }), eye: new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6f4ff').multiplyScalar(2.6), toneMapped: false }),
    };
  }, [cE, H.x0, H.corrHalf, low]);
  const eyes = useMemo(() => {   // hamam kubbesinde yıldız/daire cam gözler (iç yüze yapışık)
    const R = H.hamamHalf - 0.15, g = new THREE.CircleGeometry(0.1, 6), pts: THREE.Matrix4[] = [], M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1);
    for (const [ring, n] of [[0.18, 6], [0.42, 12], [0.68, 18]] as const) for (let i = 0; i < n; i++) { const a = (i / n) * T + ring, el = Math.PI / 2 - ring * (Math.PI / 2) * 1.1, p = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).multiplyScalar(R - 0.02); pts.push(M4.clone().compose(p, q.setFromUnitVectors(up, p.clone().normalize().negate()), new THREE.Vector3(1, 1, 1))); }
    const im = new THREE.InstancedMesh(g, M.eye, pts.length); pts.forEach((p, i) => im.setMatrixAt(i, p)); return im;
  }, [H.hamamHalf, M.eye]);
  const hamamCeil = useMemo(() => { const R = H.hamamHalf - 0.15, s = new THREE.Shape(); s.moveTo(vE, -H.hamamHalf); s.lineTo(hE, -H.hamamHalf); s.lineTo(hE, H.hamamHalf); s.lineTo(vE, H.hamamHalf); const p = new THREE.Path(); p.absarc(vE + 5, 0, R, 0, T, true); s.holes.push(p); return new THREE.ShapeGeometry(s, 40).rotateX(Math.PI / 2); }, [vE, hE, H.hamamHalf]);
  // bölme duvarları (kapı açıklıklı): koridor/Valide ve Valide/hamam
  const partition = (x: number, half: number) => (
    <group key={x}>
      {[-1, 1].map((s) => <mesh key={s} material={M.part} position={[x, h / 2, s * (H.door + (half - H.door) / 2)]} castShadow receiveShadow><boxGeometry args={[0.5, h, half - H.door]} /></mesh>)}
      <mesh material={M.part} position={[x, 2.6 + (h - 2.6) / 2, 0]}><boxGeometry args={[0.5, h - 2.6, H.door * 2]} /></mesh>
      {[-0.26, 0.26].map((o) => <mesh key={o} position={[x + o, 0, 0]} rotation-y={o > 0 ? Math.PI / 2 : -Math.PI / 2}><primitive object={pointedArchFrame(H.door * 2 + 0.5, 2.9, H.door * 2, 2.6 - H.door * 1.45, 0.05)} attach="geometry" /><meshStandardMaterial color="#d8c39a" roughness={0.5} /></mesh>)}
    </group>
  );
  const steam = useRef<THREE.InstancedMesh>(null!);
  const steamTex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }, []);
  const N = low ? 10 : 26, puffs = useMemo(() => Array.from({ length: N }, (_, i) => ({ x: vE + 1 + Math.random() * 9.5, z: (Math.random() - 0.5) * 7, o: i / N })), [N, vE]);
  const _m = useMemo(() => new THREE.Matrix4(), []), _q = useMemo(() => new THREE.Quaternion(), []);
  useFrame(({ clock, camera }) => {
    const im = steam.current; if (!im) return; const t = clock.elapsedTime * 0.06;
    _q.copy(camera.quaternion);
    puffs.forEach((p, i) => { const k = (t + p.o) % 1, s = 0.8 + k * 2.2; im.setMatrixAt(i, _m.compose(new THREE.Vector3(p.x + Math.sin(k * 6 + i) * 0.3, 0.3 + k * 3.6, p.z), _q, new THREE.Vector3(s, s, s))); });
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <Environment resolution={32} frames={1}>
        <Lightformer form="rect" intensity={0.7} color="#ffcf9a" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <hemisphereLight args={['#ffe2bf', '#3a2618', 0.35]} />

      {/* --- Altın Yol: dar taş koridor, kandiller --- */}
      <mesh rotation-x={-Math.PI / 2} position={[(H.x0 + cE) / 2, 0, 0]} material={M.stone} receiveShadow><planeGeometry args={[cE - H.x0, H.corrHalf * 2]} /></mesh>
      <mesh rotation-x={Math.PI / 2} position={[(H.x0 + cE) / 2, h, 0]} material={M.ceilC}><planeGeometry args={[cE - H.x0, H.corrHalf * 2]} /></mesh>
      <Wall w={{ a: [H.x0, -H.corrHalf], b: [cE, -H.corrHalf] }} h={h} tileH={1.7} m={m} tileRepeat={0.9} />
      <Wall w={{ a: [cE, H.corrHalf], b: [H.x0, H.corrHalf] }} h={h} tileH={1.7} m={m} tileRepeat={0.9} />
      <Wall w={{ a: [H.x0, H.corrHalf], b: [H.x0, -H.corrHalf] }} h={h} tileH={0} m={m} />
      <InnerDoor x={H.x0 + 0.02} z={0} yaw={Math.PI / 2} w={1.3} h={2.5} />
      {Array.from({ length: 6 }, (_, i) => { const x = H.x0 + 3 + i * 4.3; return <Lamp key={i} p={[x, 3, 0]} light={i % 2 === 0 ? { base: 3.2, low } : undefined} />; })}
      {low && <pointLight position={[(H.x0 + cE) / 2, 3, 0]} intensity={10} distance={30} color="#ffb060" />}
      {[1104, 1110, 1116, 1122].map((x) => [-1, 1].map((s) => <mesh key={`${x}${s}`} position={[x, 1.9, s * (H.corrHalf - 0.01)]} rotation-y={s > 0 ? Math.PI : 0}><primitive object={pointedWindow(0.5, 0.8)} attach="geometry" /><meshStandardMaterial color="#3a2516" roughness={1} /></mesh>))}
      {partition(cE, H.valideHalf)}

      {/* --- Valide Sultan Dairesi: tam çinili duvarlar, boyalı tavan, ocak, sedir, halı --- */}
      <mesh rotation-x={-Math.PI / 2} position={[(cE + vE) / 2, 0, 0]} material={M.wood} receiveShadow><planeGeometry args={[vE - cE, H.valideHalf * 2]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(cE + vE) / 2 + 0.6, 0.01, 0.4]} material={M.carpet} receiveShadow><planeGeometry args={[8, 5.4, low ? 1 : 64, low ? 1 : 48]} /></mesh>
      <mesh rotation-x={Math.PI / 2} position={[(cE + vE) / 2, h, 0]} material={M.ceil}><planeGeometry args={[vE - cE, H.valideHalf * 2]} /></mesh>
      <Wall w={{ a: [cE, -H.valideHalf], b: [vE, -H.valideHalf] }} h={h} tileH={3.1} m={m} tileRepeat={1} />
      <Wall w={{ a: [vE, H.valideHalf], b: [cE, H.valideHalf] }} h={h} tileH={3.1} m={m} tileRepeat={1} />
      {[-3.1, 3.1].map((z) => <GlowWindow key={z} p={[cE + 7 + z, 3.55, H.valideHalf - 0.02]} yaw={Math.PI} w={0.8} h={0.9} k={1.8} />)}
      {/* ocak: altın yaldızlı külah + ateş */}
      <group position={[cE + 3.4, 0, H.valideHalf - 0.35]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.6, 1, 0.7]} /><meshStandardMaterial color="#e6dccb" roughness={0.5} /></mesh>
        <mesh position={[0, 0.5, -0.36]}><planeGeometry args={[1.1, 0.8]} /><meshBasicMaterial color="#160c06" /></mesh>
        <mesh position={[0, 0.25, -0.25]}><sphereGeometry args={[0.22, 8, 6]} /><meshBasicMaterial color={new THREE.Color('#ff7a2a').multiplyScalar(4)} toneMapped={false} /></mesh>
        <mesh position={[0, 2.4, 0]} material={m.gold} castShadow><coneGeometry args={[0.95, 2.8, 4, 1, false, Math.PI / 4]} /></mesh>
        <Flicker p={[0, 0.45, -1.1]} color="#ff8c3a" base={low ? 2.5 : 3.5} range={0.45} distance={8} />
      </group>
      <Sedir x={(cE + vE) / 2} z={-H.valideHalf + 0.6} w={vE - cE - 1} d={1.2} yaw={0} color="#2f5d8a" />
      {partition(vE, H.valideHalf)}

      {/* --- hamam: mermer, cam gözlü kubbe, göbek taşı, kurna, buhar --- */}
      <mesh rotation-x={-Math.PI / 2} position={[(vE + hE) / 2, 0, 0]} material={M.marble} receiveShadow><planeGeometry args={[hE - vE, H.valideHalf * 2]} /></mesh>
      <Wall w={{ a: [vE, -H.hamamHalf], b: [hE, -H.hamamHalf] }} h={h} tileH={0} m={m} upper={M.wmarble} />
      <Wall w={{ a: [hE, H.hamamHalf], b: [vE, H.hamamHalf] }} h={h} tileH={0} m={m} upper={M.wmarble} />
      <Wall w={{ a: [hE, -H.hamamHalf], b: [hE, H.hamamHalf] }} h={h} tileH={0} m={m} upper={M.wmarble} />
      <mesh geometry={hamamCeil} material={M.hceil} position={[0, h, 0]} />
      <mesh position={[vE + 5, h, 0]} material={M.hdome}><sphereGeometry args={[H.hamamHalf - 0.15, 32, 12, 0, T, 0, Math.PI / 2]} /></mesh>
      <group position={[vE + 5, h, 0]}><primitive object={eyes} /></group>
      <pointLight position={[vE + 5, h + 1.5, 0]} intensity={20} distance={12} decay={1.6} color="#dcecff" />
      <mesh position={[vE + 5, 0.22, 0]} castShadow receiveShadow><cylinderGeometry args={[1.3, 1.35, 0.45, 8]} /><meshStandardMaterial color="#f2ede4" roughness={0.2} /></mesh>
      <group position={[hE - 1, 0, -H.hamamHalf + 0.38]}>
        <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.8, 0.9, 0.55]} /><meshStandardMaterial color="#f4f0e8" roughness={0.2} /></mesh>
        <mesh position={[0, 0.91, 0.04]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.24, 16]} /><meshStandardMaterial color="#6f9fb0" roughness={0.05} metalness={0.3} /></mesh>
        <mesh position={[0, 1.25, -0.22]} rotation-x={0.9} material={m.gold}><cylinderGeometry args={[0.025, 0.035, 0.3, 8]} /></mesh>
      </group>
      <instancedMesh ref={steam} args={[undefined, undefined, N]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} /><meshBasicMaterial map={steamTex} transparent depthWrite={false} opacity={0.35} />
      </instancedMesh>
    </group>
  );
}
