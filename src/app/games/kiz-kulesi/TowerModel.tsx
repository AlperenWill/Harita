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

const stone = new THREE.MeshStandardMaterial({ color: '#ece4d4', roughness: 0.85 });
const stoneDark = new THREE.MeshStandardMaterial({ color: '#b9ad98', roughness: 0.95 });
const lead = new THREE.MeshStandardMaterial({ color: '#8d9aa2', roughness: 0.45, metalness: 0.25 });
const windowM = new THREE.MeshStandardMaterial({ color: '#2b3b44', roughness: 0.3, metalness: 0.2 });
const wood = new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.8 });
const rock = new THREE.MeshStandardMaterial({ color: '#6f6a60', roughness: 1, flatShading: true });

function Windows({ face, count, y, w = 0.9, h = 1.5, span }: { face: 'n' | 's' | 'e' | 'w'; count: number; y: number; w?: number; h?: number; span: [number, number, number] }) {
  // span: [merkez x/z, uzunluk, yüzeyin konumu]
  const [c, len, at] = span;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = c - len / 2 + ((i + 0.5) / count) * len;
        const pos: [number, number, number] = face === 'n' ? [t, y, at - 0.02] : face === 's' ? [t, y, at + 0.02] : face === 'e' ? [at + 0.02, y, t] : [at - 0.02, y, t];
        const rot = face === 'n' ? Math.PI : face === 's' ? 0 : face === 'e' ? Math.PI / 2 : -Math.PI / 2;
        return <mesh key={i} material={windowM} position={pos} rotation={[0, rot, 0]}><planeGeometry args={[w, h]} /></mesh>;
      })}
    </>
  );
}

export function KizKulesi({ shadows = false, lanternOn = true }: { shadows?: boolean; lanternOn?: boolean }) {
  const rocks = useMemo(() => {
    const g = new THREE.CylinderGeometry(ISLAND.r + 1.2, ISLAND.r + 3.5, 4, 28, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y < 1.9) { const n = 1 + Math.sin(x * 1.7) * 0.06 + Math.cos(z * 2.3) * 0.06; p.setXYZ(i, x * n, y + Math.sin(x * 3 + z) * 0.3, z * n); } }
    g.computeVertexNormals(); return g;
  }, []);
  const bw = BUILDING.x1 - BUILDING.x0, bd = BUILDING.z1 - BUILDING.z0, tw = TOWER.x1 - TOWER.x0, td = TOWER.z1 - TOWER.z0;
  const tcx = (TOWER.x0 + TOWER.x1) / 2, tcz = (TOWER.z0 + TOWER.z1) / 2, th = TOWER.top - ROOF_Y;
  const lantern = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.6 }), []);
  useFrame(({ clock }) => { lantern.emissiveIntensity = lanternOn ? 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.4)) : 0.1; });
  return (
    <group>
      {/* kayalık ada ve rıhtım */}
      <mesh geometry={rocks} material={rock} position={[0, -0.6, 0]} receiveShadow={shadows} />
      <mesh material={stoneDark} position={[0, ISLAND.top - 0.2, 0]} receiveShadow={shadows}><cylinderGeometry args={[ISLAND.r + 0.4, ISLAND.r + 0.6, 0.4, 40]} /></mesh>
      {/* korkuluk duvarı */}
      <mesh material={stone} position={[0, ISLAND.top + 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[ISLAND.r + 0.2, 0.18, 4, 48]} /></mesh>
      {/* ana yapı */}
      <mesh material={stone} position={[(BUILDING.x0 + BUILDING.x1) / 2, ISLAND.top + BUILDING.h / 2, (BUILDING.z0 + BUILDING.z1) / 2]} castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[bw, BUILDING.h, bd]} />
      </mesh>
      <Windows face="s" count={5} y={ISLAND.top + 4.6} span={[0, bw - 2, BUILDING.z1]} />
      <Windows face="n" count={5} y={ISLAND.top + 4.6} span={[0, bw - 2, BUILDING.z0]} />
      <Windows face="e" count={4} y={ISLAND.top + 4.6} span={[0, bd - 2, BUILDING.x1]} />
      <Windows face="w" count={3} y={ISLAND.top + 4.6} span={[-1.5, bd - 4, BUILDING.x0]} />
      {/* kapı (batı yüzü) */}
      <mesh material={wood} position={[BUILDING.x0 - 0.02, ISLAND.top + 1.2, DOOR.z]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.4, 2.4]} /></mesh>
      {/* teras korkuluğu (çatı parapeti) */}
      {([[0, BUILDING.z0, bw, 0], [0, BUILDING.z1, bw, 0], [BUILDING.x0, 0, bd, Math.PI / 2], [BUILDING.x1, 0, bd, Math.PI / 2]] as const).map(([x, z, l, r], i) => (
        <mesh key={i} material={stone} position={[x, ROOF_Y + 0.5, z]} rotation={[0, r, 0]}><boxGeometry args={[l, 1, 0.3]} /></mesh>
      ))}
      <mesh material={stoneDark} position={[0, ROOF_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}><planeGeometry args={[bw - 0.3, bd - 0.3]} /></mesh>
      {/* kule gövdesi */}
      <mesh material={stone} position={[tcx, ROOF_Y + th / 2, tcz]} castShadow={shadows}><boxGeometry args={[tw, th, td]} /></mesh>
      <Windows face="s" count={2} y={ROOF_Y + 5} h={2} span={[tcx, tw - 1, TOWER.z1]} />
      <Windows face="w" count={2} y={ROOF_Y + 5} h={2} span={[tcz, td - 1, TOWER.x0]} />
      <Windows face="e" count={2} y={ROOF_Y + 5} h={2} span={[tcz, td - 1, TOWER.x1]} />
      <mesh material={wood} position={[tcx, ROOF_Y + 1.2, TOWER.z1 + 0.02]}><planeGeometry args={[1.2, 2.3]} /></mesh>
      {/* sekizgen köşk + kurşun külah + alem */}
      <mesh material={stone} position={[tcx, TOWER.top + 1.6, tcz]} castShadow={shadows}><cylinderGeometry args={[2.3, 2.5, 3.2, 8]} /></mesh>
      <mesh material={windowM} position={[tcx, TOWER.top + 1.7, tcz]}><cylinderGeometry args={[2.32, 2.32, 1.6, 8, 1, true]} /></mesh>
      <mesh material={lead} position={[tcx, TOWER.top + 4.6, tcz]} castShadow={shadows}><coneGeometry args={[2.7, 3.2, 8]} /></mesh>
      <mesh material={lead} position={[tcx, TOWER.top + 6.7, tcz]}><cylinderGeometry args={[0.05, 0.1, 1.2, 6]} /></mesh>
      {/* kuzey köşede fener */}
      <group position={[BUILDING.x1 - 1.1, ROOF_Y, BUILDING.z0 + 1.1]}>
        <mesh material={stone} position={[0, 1.6, 0]}><cylinderGeometry args={[0.9, 1, 3.2, 12]} /></mesh>
        <mesh material={lantern} position={[0, 3.8, 0]}><cylinderGeometry args={[0.7, 0.7, 1.2, 12]} /></mesh>
        <mesh material={lead} position={[0, 4.8, 0]}><coneGeometry args={[0.95, 0.9, 12]} /></mesh>
        {lanternOn && <pointLight position={[0, 3.8, 0]} intensity={8} distance={18} color="#ffd27a" />}
      </group>
      {/* iskele ve iskele tahtası */}
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
