/**
 * İç mekânlar: Divan-ı Hümâyun → Harem koridoru → Valide Sultan Dairesi → hamam.
 *
 * Portal ayıklama: `visible` listesindeki odalar tam ayrıntıyla, diğerleri tek kutuluk yer tutucu olarak çizilir (TopkapiGame her karede
 * palace.visibleRooms ile hesaplar). Böylece aynı anda en fazla 2–3 odanın ışığı, çinisi ve eşyası bellekte ve çizimde olur.
 * Işık sıcaklığı odaya göre: Divan beyaz/resmî (~4800 K), koridor ve Valide dairesi sarı/sıcak (~2400–2900 K), hamam süt beyazı.
 * Koridor: dar görüş açısı ve hafif titrek kamera (TopkapiGame uygular) + mum titremesi burada. Hamam: buhar (sis + yükselen sprite'lar)
 * ve kurnada sabun köpüğü; pil tasarrufunda buhar kapanır.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DOOR, ROOMS, type Room, type RoomId } from './palace';
import { carpetMaterial, gold, pearlDoorMaterial, plaster, tileMaterial } from './materials';

type Tier = 'low' | 'medium' | 'high';
const len = (r: Room) => r.x1 - r.x0, mid = (r: Room) => (r.x0 + r.x1) / 2;

/** Kapı açıklıklı uç duvar: iki yan parça + lento */
function EndWall({ x, halfW, h, mat, door }: { x: number; halfW: number; h: number; mat: THREE.Material; door: boolean }) {
  if (!door) return <mesh material={mat} position={[x, h / 2, 0]}><boxGeometry args={[0.3, h, halfW * 2]} /></mesh>;
  const side = halfW - DOOR.w / 2;
  return (
    <group>
      {[-1, 1].map((s) => <mesh key={s} material={mat} position={[x, h / 2, s * (DOOR.w / 2 + side / 2)]}><boxGeometry args={[0.3, h, side]} /></mesh>)}
      <mesh material={mat} position={[x, (h + DOOR.h) / 2, 0]}><boxGeometry args={[0.3, h - DOOR.h, DOOR.w]} /></mesh>
    </group>
  );
}
/** Tavan: kubbeli odalarda ortası dairesel açıklıklı */
function Ceiling({ r, mat, hole }: { r: Room; mat: THREE.Material; hole?: number }) {
  const geo = useMemo(() => { const s = new THREE.Shape(); const w = (r.x1 - r.x0) / 2, d = r.halfW; s.moveTo(-w, -d); s.lineTo(w, -d); s.lineTo(w, d); s.lineTo(-w, d); s.lineTo(-w, -d); if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); } return new THREE.ShapeGeometry(s, 32); }, [r, hole]);
  return <mesh geometry={geo} material={mat} rotation={[Math.PI / 2, 0, 0]} position={[(r.x0 + r.x1) / 2, r.h, 0]} />;
}
function Shell({ r, wall, floor, ceil, first, last, hole }: { r: Room; wall: THREE.Material; floor: THREE.Material; ceil: THREE.Material; first: boolean; last: boolean; hole?: number }) {
  return (
    <group>
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} position={[mid(r), 0, 0]}><planeGeometry args={[len(r), r.halfW * 2, 48, 24]} /></mesh>
      <Ceiling r={r} mat={ceil} hole={hole} />
      {[-1, 1].map((s) => <mesh key={s} material={wall} position={[mid(r), r.h / 2, s * r.halfW]} rotation={[0, s > 0 ? Math.PI : 0, 0]}><planeGeometry args={[len(r), r.h]} /></mesh>)}
      {/* her oda iki uç duvarını da kendi çizer (komşu oda yer tutucuyken boşluk kalmasın); 0,2 m içeride, komşununkiyle çakışmaz */}
      <EndWall x={r.x0 + 0.2} halfW={r.halfW} h={r.h} mat={wall} door={!first} />
      <EndWall x={r.x1 - 0.2} halfW={r.halfW} h={r.h} mat={wall} door={!last} />
    </group>
  );
}
/** Oturan figür: kaftan + sarık (stilize) */
function Seated({ pos, rot, robe }: { pos: [number, number, number]; rot: number; robe: string }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.45, 0]}><coneGeometry args={[0.42, 0.9, 10]} /><meshStandardMaterial color={robe} roughness={0.8} /></mesh>
      <mesh position={[0, 1.02, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#d9b594" /></mesh>
      <mesh position={[0, 1.2, 0]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.2, 10, 8]} /><meshStandardMaterial color="#f2efe6" roughness={0.9} /></mesh>
    </group>
  );
}

function Divan({ r }: { r: Room }) {
  const M = useMemo(() => ({ wall: plaster('#efe7d6'), floor: plaster('#cfc4ae', 0.5), sofa: plaster('#8c2a2a'), gold: gold(), lattice: new THREE.MeshStandardMaterial({ color: '#d8a93f', metalness: 1, roughness: 0.35 }) }), []);
  const bars = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 1.5, 0.035), M.lattice, 22); let k = 0; for (let i = 0; i < 11; i++) { for (const a of [0.6, -0.6]) m.setMatrixAt(k++, new THREE.Matrix4().compose(new THREE.Vector3(-1 + i * 0.2, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a)), new THREE.Vector3(1, 1, 1))); } return m; }, [M.lattice]);
  const behind = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { (behind.current.material as THREE.MeshBasicMaterial).color.setScalar(0.5 + 0.12 * Math.sin(clock.elapsedTime * 0.8)); });
  return (
    <group>
      <Shell r={r} wall={M.wall} floor={M.floor} ceil={M.wall} first last={false} hole={4.6} />
      <mesh position={[mid(r), r.h, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[4.6, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e9dcc0" side={THREE.BackSide} roughness={0.8} /></mesh>
      {/* sedirler: üç duvar boyunca */}
      {[-1, 1].map((s) => <mesh key={s} material={M.sofa} position={[mid(r), 0.3, s * (r.halfW - 0.6)]}><boxGeometry args={[len(r) - 2, 0.6, 1.1]} /></mesh>)}
      {/* kafesli pencere (kuzey duvarı, yüksekte): altın kafes + ardında loş bir oda */}
      <group position={[7, 5.2, -r.halfW + 0.06]}>
        <mesh ref={behind} position={[0, 0, -0.03]}><planeGeometry args={[2.2, 1.5]} /><meshBasicMaterial color="#5a4630" /></mesh>
        <primitive object={bars} position={[0, 0, 0.02]} />
        <mesh material={M.gold} position={[0, 0, 0.03]}><ringGeometry args={[1.32, 1.42, 4, 1, Math.PI / 4]} /></mesh>
      </group>
      {/* vezirler (stilize, sessiz figürler; sesleri AudioManager'da konumlu uğultu) */}
      <Seated pos={[4, 0.6, r.halfW - 0.7]} rot={Math.PI} robe="#2f5a44" /><Seated pos={[7, 0.6, r.halfW - 0.7]} rot={Math.PI} robe="#6b2f3a" /><Seated pos={[10, 0.6, r.halfW - 0.7]} rot={Math.PI} robe="#2f3f6b" />
      <Seated pos={[5.5, 0.6, -r.halfW + 0.7]} rot={0} robe="#5a4a2a" /><Seated pos={[9, 0.6, -r.halfW + 0.7]} rot={0} robe="#3a3a44" />
      <pointLight position={[mid(r), 5.5, 0]} color={r.light} intensity={60} distance={18} decay={1.8} />
    </group>
  );
}
function Corridor({ r, tiles }: { r: Room; tiles: THREE.Material }) {
  const M = useMemo(() => ({ wall: plaster('#b79f7c'), floor: plaster('#6b5a48', 0.7), door: pearlDoorMaterial(), flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.6), toneMapped: false }) }), []);
  const lights = useRef<THREE.PointLight[]>([]);
  useFrame(({ clock }) => lights.current.forEach((l, i) => { if (l) l.intensity = 5.5 + Math.sin(clock.elapsedTime * 9 + i * 2.1) * 0.9 + Math.sin(clock.elapsedTime * 23 + i) * 0.4; }));
  return (
    <group>
      <Shell r={r} wall={M.wall} floor={M.floor} ceil={M.wall} first={false} last={false} />
      {[-1, 1].map((s) => <mesh key={s} material={tiles} position={[mid(r), 0.8, s * (r.halfW - 0.01)]} rotation={[0, s > 0 ? Math.PI : 0, 0]}><planeGeometry args={[len(r), 1.6]} /></mesh>)}
      {/* sedef kakmalı kapı kanadı (açık, duvara yaslı) */}
      <mesh material={M.door} position={[r.x0 + 0.75, 1.25, 1.02]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.3, 2.5]} /></mesh>
      {[0.25, 0.75].map((u, i) => (
        <group key={i} position={[r.x0 + len(r) * u, 2.2, (i % 2 ? 1 : -1) * (r.halfW - 0.12)]}>
          <mesh material={M.flame}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
          <pointLight ref={(l) => { if (l) lights.current[i] = l; }} color={r.light} distance={9} decay={1.6} />
        </group>
      ))}
    </group>
  );
}
function Valide({ r, tiles, tier }: { r: Room; tiles: THREE.Material; tier: Tier }) {
  const M = useMemo(() => ({ floor: plaster('#5a4636', 0.6), carpet: carpetMaterial([1, 1], tier !== 'low'), sofa: plaster('#2f5a52'), gold: gold(), glass: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.1, 0.7), toneMapped: false }), ceil: plaster('#7a2b2b') }), [tier]);
  return (
    <group>
      <Shell r={r} wall={tiles} floor={M.floor} ceil={M.ceil} first={false} last={false} />
      <mesh material={M.carpet} rotation={[-Math.PI / 2, 0, 0]} position={[mid(r), 0.02, 0]}><planeGeometry args={[8, 5.5, tier === 'low' ? 1 : 96, tier === 'low' ? 1 : 64]} /></mesh>
      {/* ocak: yaldızlı konik davlumbaz */}
      <group position={[mid(r), 0, -r.halfW + 0.5]}><mesh material={M.gold} position={[0, 2.9, 0]}><coneGeometry args={[0.95, 2.6, 8]} /></mesh><mesh position={[0, 0.8, 0]}><boxGeometry args={[1.6, 1.6, 0.6]} /><meshStandardMaterial color="#e8e0d0" /></mesh></group>
      <mesh material={M.sofa} position={[mid(r), 0.3, r.halfW - 2.4]}><boxGeometry args={[6, 0.6, 1.1]} /></mesh>
      {[-3, 0, 3].map((dx) => <mesh key={dx} material={M.glass} position={[mid(r) + dx, 4.4, -r.halfW + 0.02]}><planeGeometry args={[0.9, 1.2]} /></mesh>)}
      <pointLight position={[mid(r), 4.4, 0]} color={r.light} intensity={34} distance={15} decay={1.8} />
    </group>
  );
}
/** Buhar: yükselen, kameraya dönük yarı saydam bulutlar (toplamalı değil; yumuşak alfa) */
function Steam({ r, count }: { r: Room; count: number }) {
  const mat = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.5 }); }, []);
  const ref = useRef<THREE.Group>(null!);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: r.x0 + 1 + ((i * 7.31) % (len(r) - 2)), z: -r.halfW + 0.6 + ((i * 3.77) % (r.halfW * 2 - 1.2)), sp: 0.18 + (i % 5) * 0.05, ph: i * 1.3, s: 1.4 + (i % 4) * 0.5 })), [r, count]);
  useFrame(({ clock }) => ref.current.children.forEach((c, i) => { const d = seeds[i], y = ((clock.elapsedTime * d.sp + d.ph) % 1) * r.h; c.position.set(d.x + Math.sin(clock.elapsedTime * 0.3 + d.ph) * 0.4, y, d.z); c.scale.setScalar(d.s * (0.6 + y / r.h)); (c as THREE.Sprite).material.opacity = 0.45 * Math.sin((y / r.h) * Math.PI); }));
  return <group ref={ref}>{seeds.map((_, i) => <sprite key={i} material={mat.clone()} />)}</group>;
}
function Hamam({ r, steam, tier }: { r: Room; steam: boolean; tier: Tier }) {
  const M = useMemo(() => ({ marble: new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.25 }), wall: new THREE.MeshStandardMaterial({ color: '#dedad0', roughness: 0.35 }), gold: gold(), eye: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.7, 1.4), toneMapped: false }), water: new THREE.MeshStandardMaterial({ color: '#9fc9cf', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8 }) }), []);
  const foam = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }), 60); let s = 3; const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 60; i++) { const a = rr() * Math.PI * 2, d = 0.28 + rr() * 0.1, k = 0.5 + rr(); m.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * d, 0.02 + rr() * 0.06, Math.sin(a) * d), new THREE.Quaternion(), new THREE.Vector3(k, k, k))); } return m; }, []);
  const eyes = useMemo(() => Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, rad = i % 2 ? 2.2 : 1.2; return [Math.cos(a) * rad, Math.sin(a) * rad] as const; }), []);
  return (
    <group>
      <Shell r={r} wall={M.wall} floor={M.marble} ceil={M.wall} first={false} last hole={3.2} />
      <mesh position={[mid(r), r.h, 0]} scale={[1, 0.7, 1]}><sphereGeometry args={[3.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e6e2d8" side={THREE.BackSide} roughness={0.5} /></mesh>
      {eyes.map(([x, z], i) => <mesh key={i} material={M.eye} position={[mid(r) + x, r.h + 0.7 * Math.sqrt(Math.max(0, 3.2 * 3.2 - x * x - z * z)) - 0.08, z]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.09, 10]} /></mesh>)}
      {/* göbek taşı */}
      <mesh material={M.marble} position={[mid(r) - 1, 0.25, 0.4]}><cylinderGeometry args={[1.4, 1.5, 0.5, 8]} /></mesh>
      {/* kurna: mermer tekne, pirinç musluk, su ve sabun köpüğü */}
      <group position={[50.5, 0, -r.halfW + 0.55]}>
        <mesh material={M.marble} position={[0, 0.42, 0]}><cylinderGeometry args={[0.46, 0.34, 0.6, 12]} /></mesh>
        <mesh material={M.water} position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.4, 16]} /></mesh>
        <group position={[0, 0.7, 0]}><primitive object={foam} /></group>
        <mesh material={M.gold} position={[0, 1.15, -0.4]} rotation={[Math.PI / 2.6, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.4, 8]} /></mesh>
        <mesh material={M.marble} position={[0, 1.6, -0.5]}><boxGeometry args={[1.2, 1.9, 0.12]} /></mesh>
      </group>
      {steam && <Steam r={r} count={tier === 'low' ? 0 : tier === 'medium' ? 14 : 26} />}
      <pointLight position={[mid(r), 4, 0]} color={r.light} intensity={28} distance={13} decay={1.8} />
    </group>
  );
}

export function InteriorRooms({ visible, tier, steam }: { visible: RoomId[]; tier: Tier; steam: boolean }) {
  const tiles = useMemo(() => tileMaterial([6, 3]), []), tilesLow = useMemo(() => tileMaterial([18, 1.6]), []);
  const ph = useMemo(() => plaster('#6a5d4d'), []);
  return (
    <group>
      <ambientLight intensity={0.12} color="#ffe2b8" />
      {ROOMS.map((r) => !visible.includes(r.id)
        // yer tutucu: tek kutu (içten görünür), ışık ve eşya yok
        ? <mesh key={r.id} position={[mid(r), r.h / 2, 0]} material={ph}><boxGeometry args={[len(r), r.h, r.halfW * 2]} /><meshStandardMaterial attach="material" color="#6a5d4d" side={THREE.BackSide} /></mesh>
        : r.id === 'divan' ? <Divan key={r.id} r={r} /> : r.id === 'koridor' ? <Corridor key={r.id} r={r} tiles={tilesLow} /> : r.id === 'valide' ? <Valide key={r.id} r={r} tiles={tiles} tier={tier} /> : <Hamam key={r.id} r={r} steam={steam} tier={tier} />)}
    </group>
  );
}
