/**
 * Dolmabahçe — mekânlar: Medhal Salonu, Muayede Salonu (56 sütun, kalem işi kubbe, dev avize, Hereke halısı), koridor,
 * Kristal Merdiven (çift at nalı, kristal korkuluk babaları, cam tavan), Süfera Salonu (avize, yaldızlı kasetli tavan), Atatürk'ün odası.
 * Odalar içe bakan duvarlardan kurulur; kapı açıklıkları duvar parçaları arasında bırakılır. Tekrarlanan her şey (sütun, başlık,
 * basamak, korkuluk babası, tavan kaseti, cam tavan kayıtları) InstancedMesh'tir.
 * Zemin: oyuncunun bulunduğu odada düzlemsel yansıma (drei MeshReflectorMaterial; ReflectionOptimizer), öbür odalarda cilalı mermer.
 * Pencereler: Boğaz tarafından (doğu) soğuk gün ışığı; avizelerden sıcak yapay ışık — renk sıcaklığı karşıtlığı bilinçli.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { CHANDELIER, DOME, ROOMS, STAIR, SUFERA_CHANDELIER, UPPER, stairPoint, type Room } from './palace';
import { brass, crystal, domePaint, gold, goldPlain, hereke, mahogany, marble, velvet, wallPanel } from './LuxuryMaterialSystem';
import { CrystalChandelier, GRAND, SALON } from './CrystalChandelier';
import type { Plan } from './ReflectionOptimizer';
import { flagTex } from '../kiz-kulesi/FerryModel';

const T = Math.PI * 2;
const room = (id: string) => ROOMS.find((r) => r.id === id)!;
type Door = { side: 'n' | 's' | 'e' | 'w'; a: number; b: number; h: number };
const DOORS: Record<string, Door[]> = {
  medhal: [{ side: 'n', a: -2, b: 2, h: 5 }, { side: 's', a: -2, b: 2, h: 5 }],
  muayede: [{ side: 's', a: -2, b: 2, h: 5 }, { side: 'e', a: -23, b: -17, h: 5 }],
  koridor: [{ side: 'w', a: -23, b: -17, h: 5 }, { side: 'e', a: -23, b: -17, h: 5 }],
  merdiven: [{ side: 'w', a: -23, b: -17, h: 5 }],
  sufera: [{ side: 'e', a: -47, b: -41, h: 4.5 }],
  ataturk: [{ side: 'w', a: -47, b: -41, h: 4.5 }],
};

/** İçe bakan duvarlar (kapı açıklıklı); duvar başına alt panel + üst sıva bandı */
function Walls({ r, doors, mat, top }: { r: Room; doors: Door[]; mat: THREE.Material; top: THREE.Material }) {
  const parts: JSX.Element[] = [];
  const sides: [Door['side'], number, number, number, number][] = [['n', r.x0, r.x1, r.z0, 0], ['s', r.x0, r.x1, r.z1, Math.PI], ['w', r.z0, r.z1, r.x0, Math.PI / 2], ['e', r.z0, r.z1, r.x1, -Math.PI / 2]];
  for (const [side, a0, a1, at, rot] of sides) {
    const ds = doors.filter((d) => d.side === side).sort((p, q) => p.a - q.a), cuts: [number, number, number][] = [];   // [a, b, alt yükseklik]
    let a = a0; for (const d of ds) { if (d.a > a) cuts.push([a, d.a, 0]); cuts.push([d.a, d.b, d.h]); a = d.b; } if (a < a1) cuts.push([a, a1, 0]);
    cuts.forEach(([p, q, y0], i) => {
      const len = q - p, mid = (p + q) / 2, h = r.h - y0, pos: [number, number, number] = side === 'n' || side === 's' ? [mid, r.y + y0 + h / 2, at] : [at, r.y + y0 + h / 2, mid];
      const lower = Math.min(h, 3.2 - y0);
      parts.push(<mesh key={`${side}${i}`} position={pos} rotation-y={rot} material={y0 > 0 ? top : mat}><planeGeometry args={[len, h]} /></mesh>);
      if (y0 === 0 && lower > 0) parts.push(<mesh key={`${side}${i}b`} position={side === 'n' || side === 's' ? [mid, r.y + 3.25, at + (side === 'n' ? 0.03 : -0.03)] : [at + (side === 'w' ? 0.03 : -0.03), r.y + 3.25, mid]} rotation-y={rot} material={goldPlain()}><planeGeometry args={[len, 0.1]} /></mesh>);
    });
  }
  return <>{parts}</>;
}
/** Zemin: düzlemsel yansıma (seçili oda) ya da cilalı mermer */
function Floor({ r, reflect, plan, mat }: { r: Room; reflect: boolean; plan: Plan; mat: THREE.Material }) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0, pos: [number, number, number] = [(r.x0 + r.x1) / 2, r.y + 0.001, (r.z0 + r.z1) / 2];
  const m = mat as THREE.MeshPhysicalMaterial;
  if (!reflect) return <mesh rotation-x={-Math.PI / 2} position={pos} material={mat}><planeGeometry args={[w, d]} /></mesh>;
  return (
    <mesh rotation-x={-Math.PI / 2} position={pos}>
      <planeGeometry args={[w, d]} />
      <MeshReflectorMaterial map={m.map ?? undefined} normalMap={m.normalMap ?? undefined} resolution={plan.resolution} blur={plan.blur} mixBlur={0.8} mixStrength={plan.mix} roughness={0.12} metalness={0.05} mirror={0.6} depthScale={0.6} minDepthThreshold={0.7} maxDepthThreshold={1.2} color="#ffffff" />
    </mesh>
  );
}
/** Uzun pencereler: soğuk gün ışığı yayan cam + kadife perdeler (yüz: içeri) */
function Windows({ side, r, at, count, y0 = 1, h = 6, skip }: { side: 'e' | 'w'; r: Room; at: number; count: number; y0?: number; h?: number; skip?: [number, number] }) {
  const glass = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#dcecff').multiplyScalar(1.5), toneMapped: false }), []), curtain = useMemo(() => velvet('#7a1420'), []);
  const zs = Array.from({ length: count }, (_, i) => r.z0 + ((i + 0.5) / count) * (r.z1 - r.z0)).filter((z) => !skip || z < skip[0] - 1.6 || z > skip[1] + 1.6), rot = side === 'e' ? -Math.PI / 2 : Math.PI / 2, d = side === 'e' ? -0.03 : 0.03;
  return (
    <>
      {zs.map((z) => (
        <group key={z} position={[at + d, r.y + y0 + h / 2, z]} rotation-y={rot}>
          <mesh material={glass}><planeGeometry args={[1.7, h]} /></mesh>
          <mesh material={goldPlain()} position={[0, h / 2 + 0.15, 0.02]}><boxGeometry args={[2.2, 0.3, 0.06]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} material={curtain} position={[s * 1.15, -0.2, 0.06]}><boxGeometry args={[0.5, h + 0.6, 0.08]} /></mesh>)}
        </group>
      ))}
    </>
  );
}
/** Kasetli yaldızlı tavan: düz zemin + altın kaset çerçeveleri (instanced) */
function Coffers({ r, step = 2.4, y }: { r: Room; step?: number; y: number }) {
  const mesh = useMemo(() => {
    const nx = Math.floor((r.x1 - r.x0) / step), nz = Math.floor((r.z1 - r.z0) / step), im = new THREE.InstancedMesh(new THREE.TorusGeometry(step * 0.36, 0.06, 4, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4), gold(), nx * nz), M4 = new THREE.Matrix4();
    let k = 0; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) im.setMatrixAt(k++, M4.makeTranslation(r.x0 + (i + 0.5) * ((r.x1 - r.x0) / nx), y - 0.06, r.z0 + (j + 0.5) * ((r.z1 - r.z0) / nz))); return im;
  }, [r, step, y]);
  return <><mesh rotation-x={Math.PI / 2} position={[(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2]}><planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} /><meshStandardMaterial color="#f2e4c6" roughness={0.6} emissive="#5a4426" emissiveIntensity={0.55} /></mesh><primitive object={mesh} /></>;
}

export function PalaceScene({ plan, reflector }: { plan: Plan; reflector: 'medhal' | 'muayede' | 'sufera' | null }) {
  const M = useMemo(() => ({ floor: marble('floor', 8, 8, 0.08), white: marble('white', 1, 3, 0.15), panel: wallPanel(6, 2), top: new THREE.MeshStandardMaterial({ color: '#f0e3cc', roughness: 0.8 }), scag: new THREE.MeshPhysicalMaterial({ color: '#d9a7a0', roughness: 0.15, clearcoat: 0.8 }), parquet: new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.45 }) }), []);
  const carpet = useMemo(() => hereke(plan.tier === 'high'), [plan.tier]), carpetS = useMemo(() => hereke(false), []);
  const mu = room('muayede'), me = room('medhal'), st = room('merdiven'), su = room('sufera'), at = room('ataturk'), ko = room('koridor');
  // Muayede: 56 sütun (her kenarda 14), duvarlardan 3 m içeride; sütun + yaldızlı başlık + kaide
  const cols = useMemo(() => {
    const pts: [number, number][] = []; for (let i = 0; i < 14; i++) { const t = -17 + (i / 13) * 34; pts.push([t, mu.z0 + 3], [t, mu.z1 - 3]); } for (let i = 1; i < 13; i++) { const t = mu.z0 + 3 + (i / 13) * 34; pts.push([mu.x0 + 3, t], [mu.x1 - 3, t]); }
    const shaft = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.46, 10.6, 18), M.scag, pts.length), cap = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.62, 0.42, 0.7, 18), gold(), pts.length * 2), M4 = new THREE.Matrix4();
    pts.forEach(([x, z], i) => { shaft.setMatrixAt(i, M4.makeTranslation(x, 0.5 + 5.3, z)); cap.setMatrixAt(i * 2, M4.makeTranslation(x, 11.15, z)); cap.setMatrixAt(i * 2 + 1, M4.makeTranslation(x, 0.25, z)); });
    return { shaft, cap, n: pts.length };
  }, [mu, M.scag]);
  // dairesel delikli tavan halkası (kubbe oturur)
  const ring = useMemo(() => { const s = new THREE.Shape(); s.moveTo(mu.x0, mu.z0); s.lineTo(mu.x1, mu.z0); s.lineTo(mu.x1, mu.z1); s.lineTo(mu.x0, mu.z1); s.lineTo(mu.x0, mu.z0); const h = new THREE.Path(); h.absarc(DOME.cx, DOME.cz, DOME.r, 0, T, true); s.holes.push(h); return new THREE.ShapeGeometry(s, 64).rotateX(Math.PI / 2); }, [mu]);
  const domeMat = useMemo(() => new THREE.MeshStandardMaterial({ map: domePaint(), side: THREE.BackSide, roughness: 0.7 }), []);
  // Kristal Merdiven: iki kol × 30 basamak, iki kenarda kristal korkuluk babaları, maun küpeşte
  const stair = useMemo(() => {
    const N = STAIR.steps, steps = new THREE.InstancedMesh(new THREE.BoxGeometry(STAIR.width, 0.2, Math.PI * STAIR.r / N + 0.04), marble('white', 1, 1, 0.12), N * 2), M4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const balG = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.07, 0.06], [0.04, 0.14], [0.09, 0.42], [0.05, 0.7], [0.07, 0.78], [0.0, 0.82]].map(([x, y]) => new THREE.Vector2(x, y)), 8);
    const bal = new THREE.InstancedMesh(balG, crystal(plan.transmission), N * 2 * 2 * 2); let k = 0, b = 0; const rails: THREE.Vector3[][] = [[], [], [], []];
    for (const side of [-1, 1] as const) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, p = stairPoint(side, u), th = u * Math.PI, yaw = side > 0 ? th : -th;
      steps.setMatrixAt(k++, M4.compose(new THREE.Vector3(p[0], p[1] - 0.1, p[2]), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1)));
      for (const edge of [-1, 1]) {   // iç ve dış kenar
        const rr = STAIR.r + edge * (STAIR.width / 2 - 0.08);
        for (const f of [0.25, 0.75]) { const uu = (i + f) / N, t2 = uu * Math.PI, x = STAIR.cx + side * rr * Math.sin(t2), z = STAIR.cz + rr * Math.cos(t2), y = UPPER * uu; bal.setMatrixAt(b++, M4.compose(new THREE.Vector3(x, y, z), q.identity(), new THREE.Vector3(1, 1, 1))); }
        rails[(side > 0 ? 2 : 0) + (edge > 0 ? 1 : 0)].push(new THREE.Vector3(STAIR.cx + side * rr * Math.sin(th), UPPER * u + 0.9, STAIR.cz + rr * Math.cos(th)));
      }
    }
    return { steps, bal, rails: rails.map((pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.045, 6)) };
  }, [plan.transmission]);
  const skylight = useMemo(() => { const n = 8, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, st.z1 - st.z0), brass(), n * 2), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < n; i++) { const x = st.x0 + ((i + 0.5) / n) * (st.x1 - st.x0); im.setMatrixAt(i, M4.makeTranslation(x, st.h - 0.05, (st.z0 + st.z1) / 2)); const z = st.z0 + ((i + 0.5) / n) * (st.z1 - st.z0); im.setMatrixAt(n + i, M4.compose(new THREE.Vector3((st.x0 + st.x1) / 2, st.h - 0.05, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, (st.x1 - st.x0) / (st.z1 - st.z0)))); } return im; }, [st]);
  const clock = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(128, 128, 120, 0, T); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; g.stroke(); g.fillStyle = '#2a1a10'; for (let i = 0; i < 12; i++) { const a = (i / 12) * T; g.fillRect(128 + Math.cos(a) * 100 - 3, 128 + Math.sin(a) * 100 - 3, 6, 6); }
    const hand = (a: number, l: number, w: number) => { g.save(); g.translate(128, 128); g.rotate(a); g.fillRect(-w / 2, -l, w, l); g.restore(); };
    hand(((9 + 5 / 60) / 12) * T, 60, 8); hand((5 / 60) * T, 92, 5); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);   // 09.05
  const flag = useMemo(() => new THREE.MeshStandardMaterial({ map: flagTex(), roughness: 0.85 }), []);
  return (
    <group>
      {/* zeminler */}
      <Floor r={me} reflect={reflector === 'medhal' && plan.reflect === 'planar'} plan={plan} mat={M.floor} />
      <Floor r={mu} reflect={reflector === 'muayede' && plan.reflect === 'planar'} plan={plan} mat={M.floor} />
      <Floor r={ko} reflect={false} plan={plan} mat={M.parquet} />
      <Floor r={st} reflect={false} plan={plan} mat={M.floor} />
      <Floor r={su} reflect={reflector === 'sufera' && plan.reflect === 'planar'} plan={plan} mat={M.parquet} />
      <Floor r={at} reflect={false} plan={plan} mat={M.parquet} />
      {/* duvarlar */}
      {ROOMS.map((r) => <Walls key={r.id} r={r} doors={DOORS[r.id]} mat={M.panel} top={M.top} />)}
      {/* Medhal: kasetli tavan, ayna + konsol, şamdan, pencereler */}
      <Coffers r={me} y={me.h} />
      <Windows side="w" r={me} at={me.x0} count={3} h={5} skip={[5.5, 8.5]} /><Windows side="e" r={me} at={me.x1} count={3} h={5} skip={[3.5, 6.5]} />
      <group position={[me.x0 + 0.08, 0, 7]}>
        <mesh position={[0, 3.2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[2.2, 3.4]} /><meshStandardMaterial color="#c8d4dc" metalness={1} roughness={0.04} /></mesh>
        <mesh position={[0.05, 3.2, 0]} rotation-y={Math.PI / 2} material={gold()}><torusGeometry args={[1.5, 0.12, 6, 32]} /></mesh>
        <mesh position={[0.35, 0.9, 0]} material={gold()}><boxGeometry args={[0.6, 0.12, 2.4]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[0.35, 0.45, s * 1]} material={gold()}><cylinderGeometry args={[0.05, 0.08, 0.9, 8]} /></mesh>)}
      </group>
      <group position={[me.x1 - 0.5, 0, 5]}>
        <mesh position={[0, 0.5, 0]} material={mahogany()}><boxGeometry args={[0.7, 1, 1.6]} /></mesh>
        <group position={[0.3, 1, 0]}>
          <mesh material={goldPlain()} position={[0, 0.1, 0]}><cylinderGeometry args={[0.06, 0.12, 0.2, 10]} /></mesh>
          {[-1, 0, 1].map((k) => <group key={k} position={[0, 0.35 + Math.abs(k) * -0.05, k * 0.18]}><mesh material={crystal(plan.transmission)}><octahedronGeometry args={[0.07, 0]} /></mesh><mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.015, 0.015, 0.16, 6]} /><meshStandardMaterial color="#f5efe0" /></mesh><mesh position={[0, 0.22, 0]}><sphereGeometry args={[0.02, 6, 4]} /><meshBasicMaterial color={new THREE.Color('#ffcf80').multiplyScalar(3)} toneMapped={false} /></mesh></group>)}
          {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * T; return <mesh key={i} material={crystal(plan.transmission)} position={[Math.cos(a) * 0.12, 0.25, Math.sin(a) * 0.12]} scale={[0.02, 0.05, 0.02]}><octahedronGeometry args={[1, 0]} /></mesh>; })}
        </group>
      </group>
      {/* Muayede: sütunlar, korniş, tavan halkası, kubbe, pencereler, Hereke, dev avize */}
      <primitive object={cols.shaft} /><primitive object={cols.cap} />
      {([[0, mu.z0 + 3, 34.8, 0], [0, mu.z1 - 3, 34.8, 0], [mu.x0 + 3, -20, 34.8, Math.PI / 2], [mu.x1 - 3, -20, 34.8, Math.PI / 2]] as const).map(([x, z, l, r], i) => <mesh key={i} position={[x, 11.8, z]} rotation-y={r} material={gold()}><boxGeometry args={[l, 0.7, 1]} /></mesh>)}
      <mesh geometry={ring} position={[0, mu.h, 0]}><meshStandardMaterial color="#efe0c4" roughness={0.7} side={THREE.DoubleSide} /></mesh>
      <mesh position={[DOME.cx, DOME.springY, DOME.cz]} material={domeMat}><sphereGeometry args={[DOME.r, 48, 20, 0, T, 0, Math.PI / 2]} /></mesh>
      <mesh position={[DOME.cx, DOME.springY + 0.05, DOME.cz]} rotation-x={Math.PI / 2} material={gold()}><torusGeometry args={[DOME.r, 0.3, 8, 64]} /></mesh>
      <Windows side="w" r={mu} at={mu.x0} count={6} h={8} /><Windows side="e" r={mu} at={mu.x1} count={6} h={8} skip={[-23, -17]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, -20]} material={carpet}><planeGeometry args={[24, 24, plan.tier === 'high' ? 160 : 1, plan.tier === 'high' ? 160 : 1]} /></mesh>
      <CrystalChandelier spec={GRAND} at={[CHANDELIER.x, CHANDELIER.y, CHANDELIER.z]} scale={1} plan={plan} lightIntensity={60} />
      {/* koridor */}
      <Coffers r={ko} y={ko.h} step={2} />
      {/* Kristal Merdiven: basamaklar, kristal babalar, maun küpeşte, pirinç alt küpeşte, üst sahanlık, cam tavan */}
      <primitive object={stair.steps} /><primitive object={stair.bal} />
      {stair.rails.map((g, i) => <mesh key={i} geometry={g} material={mahogany()} />)}
      <mesh position={[STAIR.cx, UPPER - 0.15, st.z0 + 1.8]} material={marble('white', 3, 1, 0.12)}><boxGeometry args={[12, 0.3, 3.6]} /></mesh>
      <mesh position={[STAIR.cx, st.h, (st.z0 + st.z1) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[st.x1 - st.x0, st.z1 - st.z0]} /><meshBasicMaterial color={new THREE.Color('#e4f0ff').multiplyScalar(1.4)} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <primitive object={skylight} />
      <Windows side="e" r={st} at={st.x1} count={3} h={7} y0={4} />
      {/* Süfera Salonu: yaldızlı kasetli tavan, avize, halı, pencereler */}
      <Coffers r={su} y={su.y + su.h} step={2.2} />
      <Windows side="e" r={su} at={su.x1} count={3} h={5.5} skip={[-47, -41]} />
      <mesh rotation-x={-Math.PI / 2} position={[35, UPPER + 0.012, -42]} material={carpetS}><planeGeometry args={[12, 12]} /></mesh>
      <CrystalChandelier spec={SALON} at={[SUFERA_CHANDELIER.x, SUFERA_CHANDELIER.y, SUFERA_CHANDELIER.z]} scale={1} plan={plan} lightIntensity={22} />
      {/* Atatürk'ün odası: sade; Türk bayrağı örtülü yatak, 09.05'i gösteren saat */}
      <mesh position={[at.x1 - 0.05, UPPER + 2.2, -44]} rotation-y={-Math.PI / 2}><circleGeometry args={[0.32, 32]} /><meshStandardMaterial map={clock} roughness={0.5} /></mesh>
      <mesh position={[at.x1 - 0.07, UPPER + 2.2, -44]} rotation-y={-Math.PI / 2} material={goldPlain()}><torusGeometry args={[0.33, 0.03, 6, 32]} /></mesh>
      <group position={[49, UPPER, -46.6]}>
        <mesh position={[0, 0.3, 0]} material={mahogany()}><boxGeometry args={[2.2, 0.6, 1.2]} /></mesh>
        <mesh position={[0, 0.62, 0]} material={flag} rotation-x={-Math.PI / 2}><planeGeometry args={[2.25, 1.25]} /></mesh>
      </group>
    </group>
  );
}
