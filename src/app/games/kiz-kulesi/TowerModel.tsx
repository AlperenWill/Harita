/**
 * Kız Kulesi ve çevresi — prosedürel modeller (GLB yok). Ölçüler yaklaşıktır.
 * Ada: düzensiz kayalık + taş rıhtım; ana yapı (çatısı teras); ortasından yükselen kule, sekizgen köşk ve kurşun külah;
 * kuzey köşede fener. Uzakta iki yaka: batıda Tarihi Yarımada (Ayasofya, Topkapı, Süleymaniye, Galata Kulesi),
 * doğuda Salacak–Üsküdar. Yakaların konumları gerçek koordinatlardan yaklaşık hesaplanır.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BUILDING, DOOR, GANG, ISLAND, PIER, ROOF_Y, TOWER } from './island';
import { makeMats, sbox, scyl, type Mats } from '../topkapi/kit';
import { Flag } from './FerryModel';

const stoneDark = new THREE.MeshStandardMaterial({ color: '#b9ad98', roughness: 0.95 });
const windowM = new THREE.MeshStandardMaterial({ color: '#2b3b44', roughness: 0.3, metalness: 0.2 });
const wood = new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.8 });
const rock = new THREE.MeshStandardMaterial({ color: '#6f6a60', roughness: 1, flatShading: true });

/** Yuvarlak kemerli pencere: koyu cam + taş çerçeve (tek parça şekil, delikli) */
function archGeos(w: number, h: number) {
  const o = w / 2, sp = h - o, glass = new THREE.Shape(); glass.moveTo(-o, 0); glass.lineTo(o, 0); glass.lineTo(o, sp); glass.absarc(0, sp, o, 0, Math.PI, false); glass.lineTo(-o, 0);
  const f = 0.16, frame = new THREE.Shape(); frame.moveTo(-o - f, -f); frame.lineTo(o + f, -f); frame.lineTo(o + f, sp); frame.absarc(0, sp, o + f, 0, Math.PI, false); frame.lineTo(-o - f, -f);
  const hole = new THREE.Path(); hole.moveTo(-o, 0); hole.lineTo(-o, sp); hole.absarc(0, sp, o, Math.PI, 0, true); hole.lineTo(o, 0); hole.lineTo(-o, 0); frame.holes.push(hole);
  return { glass: new THREE.ShapeGeometry(glass, 12), frame: new THREE.ExtrudeGeometry(frame, { depth: 0.1, bevelEnabled: false, curveSegments: 12 }) };
}
/** Bir yüz boyunca kemerli pencere sırası (span: [merkez, uzunluk, yüzeyin konumu]) */
function ArchRow({ face, count, y, w = 0.9, h = 1.7, span, m }: { face: 'n' | 's' | 'e' | 'w'; count: number; y: number; w?: number; h?: number; span: [number, number, number]; m: Mats }) {
  const G = useMemo(() => archGeos(w, h), [w, h]);
  const [c, len, at] = span, rot = face === 'n' ? Math.PI : face === 's' ? 0 : face === 'e' ? Math.PI / 2 : -Math.PI / 2;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = c - len / 2 + ((i + 0.5) / count) * len, d = 0.03;
        const pos: [number, number, number] = face === 'n' ? [t, y, at - d] : face === 's' ? [t, y, at + d] : face === 'e' ? [at + d, y, t] : [at - d, y, t];
        return <group key={i} position={pos} rotation={[0, rot, 0]}><mesh geometry={G.glass} material={m.window} /><mesh geometry={G.frame} material={m.stone} /></group>;
      })}
    </>
  );
}
/** Kurşun kaplı köşk kubbesi: S (ogee) kesitli torna */
function ogee(r: number, h: number) {
  const pts = Array.from({ length: 14 }, (_, i) => { const t = i / 13, k = t < 0.55 ? Math.cos((t / 0.55) * Math.PI * 0.5) * 0.25 + 0.75 : (1 - (t - 0.55) / 0.45) ** 1.6 * 0.75; return new THREE.Vector2(Math.max(0.001, r * k), h * t); });
  return new THREE.LatheGeometry(pts, 8);
}

export function KizKulesi({ shadows = false, lanternOn = true }: { shadows?: boolean; lanternOn?: boolean }) {
  const m = useMemo(() => makeMats(false), []);
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ map: m.plaster.map, normalMap: m.plaster.normalMap, color: '#f6f1e6', roughness: 0.85 }), [m]);
  const rocks = useMemo(() => {
    const g = new THREE.CylinderGeometry(ISLAND.r + 1.2, ISLAND.r + 3.5, 4, 36, 3);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y < 1.9) { const n = 1 + Math.sin(x * 1.7) * 0.07 + Math.cos(z * 2.3) * 0.07 + Math.sin(x * 4.1 + z * 3.3) * 0.03; p.setXYZ(i, x * n, y + Math.sin(x * 3 + z) * 0.35, z * n); } }
    g.computeVertexNormals(); return g;
  }, []);
  const boulders = useMemo(() => {   // dalgakıran kayaları: adanın çevresinde, su hattında
    const n = 70, im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rock, n), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let sd = 7; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2; if (Math.abs(a - Math.PI * 0.62) < 0.32) { i--; continue; }   // iskele önü boş
      const d = ISLAND.r + 2.2 + r() * 2.6, s = 0.7 + r() * 1.3; M4.compose(new THREE.Vector3(Math.cos(a) * d, -0.3 + r() * 0.5, Math.sin(a) * d), q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(s, s * 0.7, s)); im.setMatrixAt(i, M4); }
    return im;
  }, []);
  const bw = BUILDING.x1 - BUILDING.x0, bd = BUILDING.z1 - BUILDING.z0, tw = TOWER.x1 - TOWER.x0, td = TOWER.z1 - TOWER.z0;
  const tcx = (TOWER.x0 + TOWER.x1) / 2, tcz = (TOWER.z0 + TOWER.z1) / 2, th = TOWER.top - ROOF_Y, by = ISLAND.top;
  const lantern = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.6 }), []);
  const door = useMemo(() => archGeos(1.4, 2.6), []);
  const kiosk = useMemo(() => ({ dome: ogee(2.75, 3.6), pil: (() => { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 2.9, 0.42), m.marble, 8), M4 = new THREE.Matrix4(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; im.setMatrixAt(i, M4.makeTranslation(Math.cos(a) * 2.42, 0, Math.sin(a) * 2.42)); } return im; })(),
    win: (() => { const G = archGeos(1.3, 2.1), im = new THREE.InstancedMesh(G.glass, m.window, 8), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; im.setMatrixAt(i, M4.compose(new THREE.Vector3(Math.cos(a) * 2.27, -1.15, Math.sin(a) * 2.27), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2), new THREE.Vector3(1, 1, 1))); } return im; })() }), [m]);
  useFrame(({ clock }) => { lantern.emissiveIntensity = lanternOn ? 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.4)) : 0.1; });
  return (
    <group>
      {/* kayalık ada, dalgakıran kayaları, taş rıhtım ve alçak korkuluk duvarı */}
      <mesh geometry={rocks} material={rock} position={[0, -0.6, 0]} receiveShadow={shadows} />
      <primitive object={boulders} />
      <mesh geometry={scyl(ISLAND.r + 0.6, ISLAND.r + 0.8, 0.5, 48)} material={m.stone} position={[0, ISLAND.top - 0.25, 0]} receiveShadow={shadows} />
      <mesh material={stoneDark} position={[0, ISLAND.top + 0.005, 0]} rotation-x={-Math.PI / 2} receiveShadow={shadows}><circleGeometry args={[ISLAND.r + 0.5, 48]} /></mesh>
      <mesh material={m.stone} position={[0, ISLAND.top + 0.35, 0]}><cylinderGeometry args={[ISLAND.r + 0.45, ISLAND.r + 0.45, 0.7, 48, 1, true]} /></mesh>
      <mesh material={m.stone} position={[0, ISLAND.top + 0.72, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[ISLAND.r + 0.45, 0.12, 4, 48]} /></mesh>
      {/* ana yapı: taş kaide + badanalı duvar + silme */}
      <mesh geometry={sbox(bw, BUILDING.h, bd)} material={wall} position={[(BUILDING.x0 + BUILDING.x1) / 2, by + BUILDING.h / 2, (BUILDING.z0 + BUILDING.z1) / 2]} castShadow={shadows} receiveShadow={shadows} />
      <mesh geometry={sbox(bw + 0.2, 0.8, bd + 0.2)} material={m.stone} position={[0, by + 0.4, 0]} receiveShadow={shadows} />
      <mesh geometry={sbox(bw + 0.5, 0.35, bd + 0.5)} material={m.stone} position={[0, ROOF_Y - 0.15, 0]} castShadow={shadows} />
      <ArchRow face="s" count={5} y={by + 3.2} span={[0, bw - 2, BUILDING.z1]} m={m} />
      <ArchRow face="n" count={5} y={by + 3.2} span={[0, bw - 2, BUILDING.z0]} m={m} />
      <ArchRow face="e" count={4} y={by + 3.2} span={[0, bd - 2, BUILDING.x1]} m={m} />
      <ArchRow face="w" count={3} y={by + 3.2} span={[-1.5, bd - 4, BUILDING.x0]} m={m} />
      {/* kapı (batı yüzü): ahşap kanat + taş kemer */}
      <group position={[BUILDING.x0 - 0.03, by + 0.02, DOOR.z]} rotation-y={-Math.PI / 2}>
        <mesh geometry={door.glass} material={wood} />
        <mesh geometry={door.frame} material={m.stone} />
      </group>
      {/* teras parapeti: alçak duvar + kapak taşı */}
      {([[0, BUILDING.z0, bw, 0], [0, BUILDING.z1, bw, 0], [BUILDING.x0, 0, bd, Math.PI / 2], [BUILDING.x1, 0, bd, Math.PI / 2]] as const).map(([x, z, l, r], i) => (
        <group key={i} position={[x, ROOF_Y, z]} rotation={[0, r, 0]}>
          <mesh geometry={sbox(l, 0.9, 0.3)} material={wall} position={[0, 0.45, 0]} />
          <mesh geometry={sbox(l + 0.3, 0.14, 0.45)} material={m.stone} position={[0, 0.95, 0]} />
        </group>
      ))}
      <mesh material={stoneDark} position={[0, ROOF_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}><planeGeometry args={[bw - 0.3, bd - 0.3]} /></mesh>
      {/* kule: badanalı gövde, köşe taşları, iki kat silme, kemerli pencereler */}
      <mesh geometry={sbox(tw, th, td)} material={wall} position={[tcx, ROOF_Y + th / 2, tcz]} castShadow={shadows} receiveShadow={shadows} />
      {[[TOWER.x0, TOWER.z0], [TOWER.x1, TOWER.z0], [TOWER.x0, TOWER.z1], [TOWER.x1, TOWER.z1]].map(([x, z], i) => <mesh key={i} geometry={sbox(0.45, th, 0.45)} material={m.stone} position={[x, ROOF_Y + th / 2, z]} />)}
      {[ROOF_Y + 3.6, TOWER.top - 0.2].map((y, i) => <mesh key={i} geometry={sbox(tw + 0.5, i ? 0.45 : 0.25, td + 0.5)} material={m.stone} position={[tcx, y, tcz]} castShadow={shadows} />)}
      {[ROOF_Y + 4.6].map((y) => (
        <group key={y}>
          <ArchRow face="s" count={2} y={y} h={2.2} span={[tcx, tw - 1, TOWER.z1]} m={m} />
          <ArchRow face="n" count={2} y={y} h={2.2} span={[tcx, tw - 1, TOWER.z0]} m={m} />
          <ArchRow face="w" count={2} y={y} h={2.2} span={[tcz, td - 1, TOWER.x0]} m={m} />
          <ArchRow face="e" count={2} y={y} h={2.2} span={[tcz, td - 1, TOWER.x1]} m={m} />
        </group>
      ))}
      <ArchRow face="s" count={1} y={ROOF_Y + 0.02} w={1.2} h={2.3} span={[tcx, 1, TOWER.z1]} m={m} />
      {/* sekizgen köşk: köşe ayakları, kemerli camlar, saçak, kurşun kubbe, alem ve bayrak */}
      <group position={[tcx, TOWER.top, tcz]}>
        <mesh geometry={scyl(2.45, 2.55, 0.5, 8)} material={m.stone} position={[0, 0.25, 0]} />
        <mesh material={wall} position={[0, 1.95, 0]}><cylinderGeometry args={[2.25, 2.25, 2.9, 8]} /></mesh>
        <group position={[0, 1.95, 0]}><primitive object={kiosk.pil} /><primitive object={kiosk.win} /></group>
        <mesh material={m.stone} position={[0, 3.5, 0]}><cylinderGeometry args={[2.85, 2.6, 0.3, 8]} /></mesh>
        <mesh geometry={kiosk.dome} material={m.lead} position={[0, 3.62, 0]} castShadow={shadows} />
        <mesh material={m.gold} position={[0, 7.4, 0]}><sphereGeometry args={[0.16, 10, 8]} /></mesh>
        <mesh material={m.iron} position={[0, 8.5, 0]}><cylinderGeometry args={[0.035, 0.05, 2.4, 6]} /></mesh>
        <group position={[0, 9.1, 0]}><Flag w={1.5} h={1} /></group>
      </group>
      {/* kuzey köşede fener */}
      <group position={[BUILDING.x1 - 1.1, ROOF_Y, BUILDING.z0 + 1.1]}>
        <mesh geometry={scyl(0.9, 1, 3.2, 12)} material={wall} position={[0, 1.6, 0]} />
        <mesh material={m.stone} position={[0, 3.25, 0]}><cylinderGeometry args={[1.15, 1.05, 0.2, 12]} /></mesh>
        <mesh material={lantern} position={[0, 3.9, 0]}><cylinderGeometry args={[0.7, 0.7, 1.2, 12]} /></mesh>
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} material={m.iron} position={[Math.cos((i / 6) * Math.PI * 2) * 0.72, 3.9, Math.sin((i / 6) * Math.PI * 2) * 0.72]}><boxGeometry args={[0.06, 1.2, 0.06]} /></mesh>)}
        <mesh material={m.lead} position={[0, 4.85, 0]}><coneGeometry args={[0.95, 0.9, 12]} /></mesh>
        {lanternOn && <pointLight position={[0, 3.8, 0]} intensity={8} distance={18} color="#ffd27a" />}
      </group>
      {/* iskele */}
      <mesh material={wood} position={[(PIER.x0 + PIER.x1) / 2, ISLAND.top - 0.1, (PIER.z0 + PIER.z1) / 2]} receiveShadow={shadows}><boxGeometry args={[PIER.x1 - PIER.x0, 0.2, PIER.z1 - PIER.z0]} /></mesh>
      {[PIER.z0 + 0.2, PIER.z1 - 0.2].map((z) => <mesh key={z} material={wood} position={[(PIER.x0 + PIER.x1) / 2, 0.4, z]}><cylinderGeometry args={[0.15, 0.15, 2.6, 6]} /></mesh>)}
    </group>
  );
}

/** İskele tahtası: güverteden iskeleye açılır (down: 0 = kalkık, 1 = inik; ref, her karede okunur) */
export function Gangboard({ down }: { down: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null!);
  const len = GANG.x1 - GANG.x0 + 0.4, wid = GANG.z1 - GANG.z0;
  useFrame(() => { ref.current.rotation.z = -THREE.MathUtils.lerp(-1.35, 0.55, down.current); });
  return (
    <group ref={ref} position={[GANG.x0, 2.6, (GANG.z0 + GANG.z1) / 2]}>
      <mesh material={wood} position={[len / 2, 0, 0]}><boxGeometry args={[len, 0.08, wid]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={windowM} position={[len / 2, 0.5, (s * wid) / 2]}><boxGeometry args={[len, 0.04, 0.04]} /></mesh>)}
    </group>
  );
}

/* ---------- uzak yakalar ---------- */
const KK: [number, number] = [29.00412, 41.02109];
export function toLocal([lon, lat]: [number, number]): [number, number] {
  return [(lon - KK[0]) * 111320 * Math.cos((KK[1] * Math.PI) / 180), -(lat - KK[1]) * 111320];
}
export const LANDMARKS = {
  ayasofya: toLocal([28.98008, 41.00854]), topkapi: toLocal([28.9834, 41.0115]), suleymaniye: toLocal([28.96403, 41.01611]),
  galata: toLocal([28.97413, 41.02562]), salacak: toLocal([29.0068, 41.0215]),
};
const shoreStone = new THREE.MeshStandardMaterial({ color: '#d9cdb6', roughness: 0.9 });
const domeM = new THREE.MeshStandardMaterial({ color: '#7f8b93', roughness: 0.5, metalness: 0.2 });

function Mosque({ at, r, h, minarets }: { at: [number, number]; r: number; h: number; minarets: number }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh material={shoreStone} position={[0, h / 2, 0]}><boxGeometry args={[r * 4.4, h, r * 4.4]} /></mesh>
      <mesh material={domeM} position={[0, h, 0]}><sphereGeometry args={[r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {Array.from({ length: minarets }, (_, i) => { const a = (i / minarets) * Math.PI * 2 + 0.78; return (
        <group key={i} position={[Math.cos(a) * r * 3, 0, Math.sin(a) * r * 3]}>
          <mesh material={shoreStone} position={[0, h * 0.9, 0]}><cylinderGeometry args={[1.8, 2.2, h * 1.8, 8]} /></mesh>
          <mesh material={domeM} position={[0, h * 1.8 + 3.5, 0]}><coneGeometry args={[2, 7, 8]} /></mesh>
        </group>); })}
    </group>
  );
}
function Blocks({ count, side }: { count: number; side: 'avrupa' | 'asya' }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
    let s = side === 'avrupa' ? 5 : 9; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const tones = ['#ece0c9', '#dbc6a4', '#c99a74', '#f1e8d8', '#bfae98'].map((c) => new THREE.Color(c));
    const mat = new THREE.Matrix4(); let k = 0, guard = 0;
    while (k < count && guard++ < count * 10) {
      let x: number, z: number;
      if (side === 'avrupa') { x = -1350 - r() * 2200; z = -1500 + r() * 3800; if (z > -260 && z < 140 && x < -1700) continue; }   // Haliç ağzı boş
      else { x = 230 + r() * 1800; z = -1600 + r() * 3600; }
      const w = 14 + r() * 26, h = 8 + r() * 18;
      m.setMatrixAt(k, mat.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 3), new THREE.Vector3(w, h, w * (0.6 + r() * 0.6))));
      m.setColorAt(k, tones[Math.floor(r() * tones.length)]); k++;
    }
    m.count = k; return m;
  }, [count, side]);
  return <primitive object={mesh} />;
}
export function Shores({ blocks }: { blocks: number }) {
  return (
    <group>
      {/* kara parçaları: deniz seviyesinin hemen üstünde düz yüzeyler */}
      <mesh position={[-2500, 1, 400]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2400, 4400]} /><meshStandardMaterial color="#b8a88f" roughness={1} /></mesh>
      <mesh position={[1200, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2000, 4400]} /><meshStandardMaterial color="#aea486" roughness={1} /></mesh>
      <Blocks count={Math.round(blocks * 0.6)} side="avrupa" />
      <Blocks count={Math.round(blocks * 0.4)} side="asya" />
      <Mosque at={LANDMARKS.ayasofya} r={15.5} h={40} minarets={4} />
      <Mosque at={LANDMARKS.suleymaniye} r={13.3} h={40} minarets={4} />
      <group position={[LANDMARKS.topkapi[0], 0, LANDMARKS.topkapi[1]]}><mesh material={shoreStone} position={[0, 18, 0]}><boxGeometry args={[70, 36, 50]} /></mesh><mesh material={domeM} position={[0, 46, 0]}><coneGeometry args={[6, 20, 8]} /></mesh></group>
      <group position={[LANDMARKS.galata[0], 0, LANDMARKS.galata[1]]}>
        <mesh material={shoreStone} position={[0, 50, 0]}><cylinderGeometry args={[8, 8.4, 100, 12]} /></mesh>
        <mesh material={domeM} position={[0, 108, 0]}><coneGeometry args={[9, 16, 12]} /></mesh>
      </group>
    </group>
  );
}
