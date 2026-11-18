/**
 * Topkapı — dış mekân: üç avlu, kapılar, yapılar, bahçeler.
 *
 * Batıdan doğuya: Bâb-ı Hümâyun → birinci avlu (Aya İrini) → Bâbüsselâm (iki külahlı kule) → ikinci avlu (servi yolu, Divan, Adalet Kulesi,
 * mutfaklar ve bacaları) → Bâbüssaâde (saçaklı kapı) → üçüncü avlu (Arz Odası, III. Ahmed Kütüphanesi, Enderun, revaklı Hazine).
 * Plan stilizedir; yapıların yeri ve biçim dili gerçeğe benzetilmiştir, ölçüleri kısaltılmıştır.
 * Tekrarlanan her şey (sütun, kemer, konsol, baca, mazgal, ağaç, lale) InstancedMesh'tir.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Arcade, ConeTower, Dome, Eave, WindowRow, cobble, sbox, grass, marbleFloor, pointedArchFrame, pointedWindow, withRepeat, type Mats } from './kit';
import { BUILDINGS, FOUNTAINS, GATE1_X, GATE2_X, GATE3_COLS, GATE3_X, GATE_HALF, GATE_TOWERS, HAZINE_COLS, PORTICO_COLS, TREES } from './world';
import { tughraTexture } from './materials';

const HAZINE_COLS_R = HAZINE_COLS.map((c) => -c).reverse();   // revak π döndürülür: ön yüzü kuzeye baksın
const Y = new THREE.Vector3(0, 1, 0);
const BASE = new THREE.MeshStandardMaterial({ color: '#8d8270', roughness: 0.9 });

function box(b: { x0: number; x1: number; z0: number; z1: number }, h: number, inset = 0) {
  return { pos: [(b.x0 + b.x1) / 2, h / 2, (b.z0 + b.z1) / 2] as [number, number, number], size: [b.x1 - b.x0 - inset * 2, h, b.z1 - b.z0 - inset * 2] as [number, number, number] };
}
function Block({ b, h, m, inset = 0, base = true }: { b: { x0: number; x1: number; z0: number; z1: number }; h: number; m: THREE.Material; inset?: number; base?: boolean }) {
  const B = box(b, h, inset), S = box(b, 0.9, inset - 0.12);
  return (
    <group>
      <mesh geometry={sbox(...B.size)} position={B.pos} material={m} castShadow receiveShadow />
      {base && <mesh geometry={sbox(...S.size)} position={S.pos} material={BASE} castShadow receiveShadow />}
    </group>
  );
}
/** Kapı yeri: koyu sivri kemerli açıklık + taş çerçeve (yüzü +z ya da −z) */
export function Doorway({ x, z, face, m, w = 1.8, h = 3 }: { x: number; z: number; face: 1 | -1; m: Mats; w?: number; h?: number }) {
  const g = useMemo(() => pointedWindow(w, h), [w, h]), f = useMemo(() => pointedArchFrame(w + 0.9, h + 0.6, w, h - w * 0.72, 0.25), [w, h]);
  return (
    <group position={[x, 0, z + face * 0.02]} rotation={[0, face > 0 ? 0 : Math.PI, 0]}>
      <mesh geometry={g}><meshStandardMaterial color="#120c08" roughness={1} /></mesh>
      <mesh geometry={f} material={m.marble} position={[0, 0, 0.1]} />
    </group>
  );
}

/* ---------- zemin: çimen + kaldırım yollar + mermer döşemeler ---------- */
function Ground() {
  const M = useMemo(() => {
    const g = withRepeat(grass(), 90, 60), c = cobble(), mf = marbleFloor();
    const path = (w: number, d: number) => { const t = withRepeat(c, w / 3, d / 3); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1 }); };
    const pave = (w: number, d: number) => { const t = withRepeat(mf, w / 6, d / 6); return new THREE.MeshStandardMaterial({ map: t.map, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }); };
    return { grass: new THREE.MeshStandardMaterial({ map: g.map, roughness: 0.95, color: '#9fae86' }), path, pave };
  }, []);
  const paths: [number, number, number, number][] = [[-35.5, 0, 169, 6.4], [72, 12, 56, 6], [95, 18.5, 6, 18], [-7, -17, 5, 28], [47, 6, 6, 18]];
  const paves: [number, number, number, number][] = [[-7, -33.8, 40, 6.6], [95.5, 28.3, 31, 5.6], [57, 0, 20, 20], [GATE1_X + 4, 0, 8, 10]];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={M.grass} receiveShadow><planeGeometry args={[420, 280]} /></mesh>
      {paths.map(([x, z, w, d], i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.02, z]} material={M.path(w, d)} receiveShadow><planeGeometry args={[w, d]} /></mesh>)}
      {paves.map(([x, z, w, d], i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.035, z]} material={M.pave(w, d)} receiveShadow><planeGeometry args={[w, d]} /></mesh>)}
    </group>
  );
}

/* ---------- surlar: dış duvar + mazgallar ---------- */
function Walls({ m }: { m: Mats }) {
  const segs: [number, number, number, number][] = [   // cx, cz, sx, sz
    [GATE1_X - 1, -32, 2.4, 46], [GATE1_X - 1, 32, 2.4, 46], [0, -55.2, 240, 2.4], [0, 55.2, 240, 2.4], [119.2, 0, 2.4, 113],
    [GATE2_X, -(54 + GATE_HALF) / 2, 3, 54 - GATE_HALF], [GATE2_X, (54 + GATE_HALF) / 2, 3, 54 - GATE_HALF],
    [GATE3_X, -(54 + GATE_HALF) / 2, 2.4, 54 - GATE_HALF], [GATE3_X, (54 + GATE_HALF) / 2, 2.4, 54 - GATE_HALF],
  ];
  const H = (i: number) => (i < 5 ? 9 : i < 7 ? 7 : 6.2);
  const merlons = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1.1, 1), pts: THREE.Vector3[] = [];
    segs.slice(0, 5).forEach(([cx, cz, sx, sz]) => { const along = sx > sz, L = along ? sx : sz; for (let s = -L / 2 + 1; s < L / 2; s += 2.4) pts.push(new THREE.Vector3(along ? cx + s : cx, 9.55, along ? cz : cz + s)); });
    const im = new THREE.InstancedMesh(g, m.stone, pts.length), M4 = new THREE.Matrix4(); pts.forEach((p, i) => im.setMatrixAt(i, M4.makeTranslation(p.x, p.y, p.z))); im.castShadow = true; return im;
  }, [m.stone]);
  return (
    <group>
      {segs.map(([x, z, sx, sz], i) => (
        <group key={i}>
          <mesh geometry={sbox(sx, H(i), sz)} position={[x, H(i) / 2, z]} material={m.stone} castShadow receiveShadow />
          <mesh geometry={sbox(sx + 0.4, 0.25, sz + 0.4)} position={[x, H(i) + 0.12, z]} material={m.stone} />
        </group>
      ))}
      <primitive object={merlons} />
    </group>
  );
}

/* ---------- kapılar ---------- */
function Gates({ m }: { m: Mats }) {
  const G = useMemo(() => ({
    g1: pointedArchFrame(18, 14, GATE_HALF * 2, 6.2, 6), g1in: pointedArchFrame(10, 11.5, GATE_HALF * 2 + 0.3, 6.2, 0.5),
    g2: pointedArchFrame(7.8, 10, GATE_HALF * 2, 4.6, 3.4), g3: pointedArchFrame(9.4, 8.6, GATE_HALF * 2, 4.2, 2.6),
  }), []);
  const tughra = useMemo(() => new THREE.MeshStandardMaterial({ map: tughraTexture(), transparent: true, metalness: 0.9, roughness: 0.3, emissive: '#6b4a10', emissiveIntensity: 0.25 }), []);
  const cols3 = useMemo(() => { const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.28, 6.6, 12), m.marble, GATE3_COLS.length), M4 = new THREE.Matrix4(); GATE3_COLS.forEach((c, i) => im.setMatrixAt(i, M4.makeTranslation(c.x, 3.3, c.z))); im.castShadow = true; return im; }, [m.marble]);
  return (
    <group>
      {/* Bâb-ı Hümâyun: kalın taş kütle, mermer iç çerçeve, kapalı ahşap kanatlar, üstte stilize tuğra levhası */}
      <group position={[GATE1_X - 2, 0, 0]} rotation-y={Math.PI / 2}>
        <mesh geometry={G.g1} material={m.stone} castShadow receiveShadow />
        <mesh geometry={G.g1in} material={m.marble} position={[0, 0, 3.1]} />
        <mesh position={[0, 14.3, 0]} material={m.stone}><boxGeometry args={[19, 0.6, 6.8]} /></mesh>
        <mesh position={[0, 3.6, -1.5]} material={m.wood}><boxGeometry args={[GATE_HALF * 2, 7.2, 0.3]} /></mesh>
        <mesh position={[0, 9.9, 3.36]} material={tughra}><planeGeometry args={[3.2, 2.4]} /></mesh>
      </group>
      {/* Bâbüsselâm: iki sekizgen kule + sivri külah, aradaki kemerli kapı, önünde geniş saçak */}
      {GATE_TOWERS.map((t, i) => <group key={i} position={[t.x, 0, t.z]}><ConeTower r={3.3} h={11.5} roof={8.5} m={m} /></group>)}
      <group position={[GATE2_X, 0, 0]} rotation-y={Math.PI / 2}><mesh geometry={G.g2} material={m.stone} castShadow receiveShadow /></group>
      <mesh position={[GATE2_X, 10.2, 0]} material={m.stone}><boxGeometry args={[3.8, 0.4, 8.4]} /></mesh>
      <group position={[GATE2_X - 3.2, 7.4, 0]}><Eave w={3.6} d={7} y={0} over={1.1} m={m} /></group>
      {/* Bâbüssaâde: saçaklı, sütunlu kapı */}
      <group position={[GATE3_X, 0, 0]} rotation-y={Math.PI / 2}><mesh geometry={G.g3} material={m.stone} castShadow receiveShadow /></group>
      <primitive object={cols3} />
      <group position={[GATE3_X + 4.4, 6.75, 0]}><Eave w={9.6} d={7.4} y={0} over={1.6} m={m} /></group>
      <mesh position={[GATE3_X + 4.4, 6.55, 0]} material={m.gold}><boxGeometry args={[9.4, 0.18, 7.2]} /></mesh>
    </group>
  );
}

/* ---------- yapılar ---------- */
function Buildings({ m }: { m: Mats }) {
  const brick = useMemo(() => new THREE.MeshStandardMaterial({ map: m.stone.map, normalMap: m.stone.normalMap, color: '#d49a7c', roughness: 0.9 }), [m.stone]);
  const B = BUILDINGS;
  const chimneys = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.55, 0.7, 4.2, 10), n = 10, im = new THREE.InstancedMesh(g, m.stone, n + 4), M4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) im.setMatrixAt(i, M4.makeTranslation(-47 + i * 8.6, 7 + 2.2 + 2.1 + 1.2, 47));
    [52, 70, 88, 106].forEach((x, i) => im.setMatrixAt(n + i, M4.makeTranslation(x, 6.5 + 2, -45))); im.castShadow = true; return im;
  }, [m.stone]);
  const arzCols = useMemo(() => {
    const b = B.arz, pts: [number, number][] = []; for (let i = 0; i < 6; i++) { const t = b.x0 + 0.6 + (i / 5) * (b.x1 - b.x0 - 1.2); pts.push([t, b.z0 + 0.6], [t, b.z1 - 0.6]); const u = b.z0 + 0.6 + (i / 5) * (b.z1 - b.z0 - 1.2); if (i > 0 && i < 5) pts.push([b.x0 + 0.6, u], [b.x1 - 0.6, u]); }
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.26, 5.6, 12), m.marble, pts.length), M4 = new THREE.Matrix4(); pts.forEach(([x, z], i) => im.setMatrixAt(i, M4.makeTranslation(x, 2.8, z))); im.castShadow = true; return im;
  }, [B.arz, m.marble]);
  return (
    <group>
      {/* Aya İrini (Bizans kilisesi, birinci avlu): tuğla gövde, yüksek kasnaklı ana kubbe, doğuda apsis */}
      <Block b={{ x0: -102, x1: -82, z0: -52, z1: -40 }} h={9.5} m={brick} />
      <Block b={{ x0: -104, x1: -102, z0: -50, z1: -42 }} h={6} m={brick} base={false} />
      <mesh position={[-82, 3.5, -46]} material={brick} castShadow><cylinderGeometry args={[3.6, 3.6, 7, 16, 1, false, 0, Math.PI]} /></mesh>
      <group position={[-90, 9.5, -46]}><Dome r={4.6} drum={0.75} m={{ ...m, stone: brick }} windows={12} /></group>
      <group position={[-97, 9.5, -46]}><Dome r={3} drum={0.2} m={{ ...m, stone: brick }} /></group>
      <WindowRow from={-101} to={-83} y={4.5} z={-40} count={6} w={1.1} h={2.6} m={m} />

      {/* Divan-ı Hümâyun: revaklı, üç kubbeli yapı; önünde geniş saçaklı revak */}
      <Block b={B.divan} h={9} m={m.plaster} />
      {[[-17.5, 4.3], [-7, 5.4], [3.5, 4.8]].map(([x, r]) => <group key={x} position={[x, 9, -45.5]}><Dome r={r} drum={0.32} m={m} windows={10} /></group>)}
      <WindowRow from={-21} to={-10} y={2.2} z={-37} count={3} m={m} /><WindowRow from={-4} to={11} y={2.2} z={-37} count={4} m={m} />
      <WindowRow from={-25} to={11} y={6.1} z={-37} count={10} w={0.7} h={1.3} m={m} />
      <Doorway x={-7} z={-37} face={1} m={m} w={2.2} h={3.4} />
      <Doorway x={-24} z={-37} face={1} m={m} />
      <group position={[0, 0, -33]}><Arcade cols={PORTICO_COLS} h={4.2} depth={4} m={m} domes={false} /></group>

      {/* Adalet Kulesi: kare taş gövde + pencereli sekizgen üst gövde + sivri kurşun külah */}
      <Block b={B.adalet} h={16} m={m.stone} />
      <group position={[-32, 16, -49]}>
        <ConeTower r={2.9} h={14} roof={7.5} m={m} />
        {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return <mesh key={i} position={[Math.cos(a) * 2.72, 9, Math.sin(a) * 2.72]} rotation-y={-a + Math.PI / 2} material={m.window}><primitive object={pointedWindow(1, 3.2)} attach="geometry" /></mesh>; })}
      </group>

      {/* Mutfaklar: güney kanadı boyunca; her bölmede kubbe + baca */}
      <Block b={B.mutfak} h={7} m={m.plaster} />
      <mesh geometry={sbox(B.mutfak.x1 - B.mutfak.x0 + 0.4, 0.3, 14.4)} position={[(B.mutfak.x0 + B.mutfak.x1) / 2, 7.15, 47]} material={m.lead} />
      {Array.from({ length: 10 }, (_, i) => <group key={i} position={[-47 + i * 8.6, 7, 47]}><Dome r={3} drum={0.15} m={m} seg={16} alem={false} /></group>)}
      <primitive object={chimneys} />
      <WindowRow from={-50} to={28} y={2.4} z={40} count={14} face={-1} m={m} />
      {[-36, -10, 16].map((x) => <Doorway key={x} x={x} z={40} face={-1} m={m} />)}

      {/* Arz Odası: çevresi sütunlu köşk + geniş saçak */}
      <Block b={B.arz} h={5.6} m={m.marble} inset={1.6} />
      <primitive object={arzCols} />
      <group position={[57, 5.7, 0]}><Eave w={16} d={16} y={0} over={1.8} m={m} /></group>
      <Doorway x={57} z={6.4} face={1} m={m} />

      {/* III. Ahmed Kütüphanesi: mermer köşk + kubbe */}
      <Block b={B.kutuphane} h={6.4} m={m.marble} />
      <group position={[84, 6.4, -10]}><Dome r={4} drum={0.35} m={m} windows={8} /></group>
      <Doorway x={84} z={-4} face={1} m={m} />

      {/* Enderun koğuşları: uzun kanat, saçaklı */}
      <Block b={B.enderun} h={6.5} m={m.plaster} />
      <group position={[81, 6.6, -44]}><Eave w={74} d={20} y={0} over={1.3} m={m} /></group>
      <WindowRow from={45} to={117} y={2.3} z={-34} count={16} m={m} />

      {/* Enderun Hazinesi: taş gövde, üç kubbe, önde kubbeli revak */}
      <Block b={B.hazine} h={7.5} m={m.stone} />
      {[87, 95, 103].map((x) => <group key={x} position={[x, 7.5, 40.5]}><Dome r={4.2} drum={0.3} m={m} windows={8} /></group>)}
      <Doorway x={95} z={31} face={-1} m={m} w={2} h={3.2} />
      <group position={[0, 0, 27.5]} rotation-y={Math.PI}><Arcade cols={HAZINE_COLS_R} h={4} depth={3.5} m={m} domes /></group>
    </group>
  );
}

/* ---------- bahçe: serviler, çınarlar, lale tarhları, şadırvanlar ---------- */
function Garden({ low }: { low: boolean }) {
  const meshes = useMemo(() => {
    const T = TREES(), servi = T.filter((t) => t.kind === 'servi'), cinar = T.filter((t) => t.kind === 'cinar');
    const prof = [[0, 0], [0.55, 0.4], [0.9, 1.8], [0.95, 3.4], [0.8, 5.4], [0.5, 7.4], [0.2, 8.8], [0, 9.4]].map(([x, y]) => new THREE.Vector2(x, y));
    const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: true }), bark = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 });
    const sG = new THREE.LatheGeometry(prof, 9), s = new THREE.InstancedMesh(sG, leaf, servi.length);
    const tG = new THREE.CylinderGeometry(0.3, 0.5, 5.5, 8).translate(0, 2.75, 0), tr = new THREE.InstancedMesh(tG, bark, cinar.length);
    const cG = new THREE.IcosahedronGeometry(1, 1), cr = new THREE.InstancedMesh(cG, leaf, cinar.length * 6);
    const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let sd = 7; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    servi.forEach((t, i) => { s.setMatrixAt(i, M4.compose(new THREE.Vector3(t.x, 0, t.z), q.setFromAxisAngle(Y, r() * 6), new THREE.Vector3(t.s, t.s * (0.9 + r() * 0.25), t.s))); s.setColorAt(i, c.setHSL(0.3 + r() * 0.03, 0.35, 0.17 + r() * 0.05)); });
    let k = 0;
    cinar.forEach((t, i) => {
      tr.setMatrixAt(i, M4.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(t.s * 1.2, t.s, t.s * 1.2)));
      for (let b = 0; b < 6; b++) { const a = (b / 6) * Math.PI * 2 + r(), d = b === 5 ? 0 : 2.2 * t.s, R = (2.4 + r() * 1.2) * t.s;
        cr.setMatrixAt(k, M4.compose(new THREE.Vector3(t.x + Math.cos(a) * d, (5.6 + (b === 5 ? 2.2 : r() * 1.4)) * t.s, t.z + Math.sin(a) * d), q.setFromAxisAngle(Y, r() * 6), new THREE.Vector3(R, R * 0.78, R)));
        cr.setColorAt(k++, c.setHSL(0.22 + r() * 0.05, 0.42, 0.26 + r() * 0.08)); }
    });
    for (const im of [s, tr, cr]) { im.castShadow = true; im.receiveShadow = true; }
    // lale tarhları: ikinci avluda yolun iki yanında ve şadırvan çevresinde (tıklanmaz; üstünden yürünebilir)
    const beds: [number, number, number, number][] = [[-48, -7, 30, 2.2], [-48, 7, 30, 2.2], [-6, -7, 26, 2.2], [-6, 7, 26, 2.2], [24, -7, 18, 2.2], [24, 7, 18, 2.2], [70, -20, 14, 3], [100, 6, 12, 3]];
    const per = low ? 90 : 240, n = beds.length * per, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 4).scale(1, 1.5, 1).translate(0, 0.34, 0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
    const st = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.34, 4).translate(0, 0.17, 0), new THREE.MeshStandardMaterial({ color: '#3f6b2a', roughness: 0.9 }), n);
    const soil = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshStandardMaterial({ color: '#5b4230', roughness: 1 }), beds.length);
    const PAL = ['#d62828', '#f2c12e', '#f4efe6', '#e0559a', '#c2182b'];
    let f = 0; beds.forEach(([cx, cz, w, d], bi) => { soil.setMatrixAt(bi, M4.compose(new THREE.Vector3(cx, 0.03, cz), q.identity(), new THREE.Vector3(w, 1, d)));
      for (let i = 0; i < per; i++) { const p = new THREE.Vector3(cx + (r() - 0.5) * w * 0.94, 0, cz + (r() - 0.5) * d * 0.9), sc = 0.8 + r() * 0.5; M4.compose(p, q.identity(), new THREE.Vector3(sc, sc, sc)); fl.setMatrixAt(f, M4); st.setMatrixAt(f, M4); fl.setColorAt(f, c.set(PAL[Math.floor(r() * (bi % 2 ? 3 : 5))])); f++; } });
    return { s, tr, cr, fl, st, soil };
  }, [low]);
  return (
    <group>
      <primitive object={meshes.s} /><primitive object={meshes.tr} /><primitive object={meshes.cr} />
      <primitive object={meshes.soil} /><primitive object={meshes.st} /><primitive object={meshes.fl} />
      {FOUNTAINS.map((f, i) => <Fountain key={i} x={f.x} z={f.z} r={f.r} />)}
    </group>
  );
}
export function Fountain({ x, z, r }: { x: number; z: number; r: number }) {
  const jet = useRef<THREE.Mesh>(null!);
  const G = useMemo(() => ({ rim: new THREE.LatheGeometry([[r - 0.25, 0], [r, 0], [r + 0.08, 0.6], [r - 0.05, 0.72], [r - 0.25, 0.7]].map(([a, b]) => new THREE.Vector2(a, b)), 28) }), [r]);
  const M = useMemo(() => ({ marble: new THREE.MeshStandardMaterial({ color: '#eae4d8', roughness: 0.3 }), water: new THREE.MeshStandardMaterial({ color: '#2d5b6a', roughness: 0.04, metalness: 0.35 }), spray: new THREE.MeshStandardMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.55, emissive: '#9fc8d8', emissiveIntensity: 0.4, depthWrite: false }) }), []);
  useFrame(({ clock }) => { const t = clock.elapsedTime; jet.current.scale.set(1, 0.92 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13.3) * 0.03, 1); });
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={G.rim} material={M.marble} castShadow receiveShadow />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.55, 0]} material={M.water}><circleGeometry args={[r - 0.2, 28]} /></mesh>
      <mesh position={[0, 0.9, 0]} material={M.marble}><cylinderGeometry args={[0.25, 0.4, 0.9, 8]} /></mesh>
      <mesh position={[0, 1.4, 0]} material={M.marble}><cylinderGeometry args={[0.75, 0.3, 0.22, 16]} /></mesh>
      <mesh ref={jet} position={[0, 1.5, 0]} material={M.spray}><cylinderGeometry args={[0.03, 0.09, 0.9, 6, 1, true]} /></mesh>
    </group>
  );
}

/** Güvercin sürüsü: avlunun üstünde geniş daireler çizer (tek InstancedMesh; kanat çırpma = dikey ölçek salınımı) */
export function Birds({ n, cx = -20, cz = 0, y = 17 }: { n: number; cx?: number; cz?: number; y?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, -0.38, 0.12, 0.05, 0, 0, 0.12, 0, 0, -0.18, 0, 0, 0.12, 0.38, 0.12, 0.05], 3)); g.computeVertexNormals(); return g; }, []);
  const birds = useMemo(() => Array.from({ length: n }, (_, i) => ({ r: 18 + (i % 5) * 3.5, h: y + (i % 4) * 2.2, w: 0.22 + (i % 3) * 0.03, o: i * 0.37, f: 9 + (i % 4) })), [n, y]);
  const M4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, im = ref.current;
    birds.forEach((b, i) => { const a = t * b.w + b.o, x = cx + Math.cos(a) * b.r, z = cz + Math.sin(a) * b.r * 0.6, y = b.h + Math.sin(t * 0.5 + i) * 1.5;
      q.setFromEuler(e.set(0, -a - Math.PI / 2, Math.sin(t * 0.8 + i) * 0.2)); const fl = 0.25 + Math.abs(Math.sin(t * b.f + i)) * 1.1; im.setMatrixAt(i, M4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1.4, fl * 1.4, 1.4))); });
    im.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, undefined, n]} frustumCulled={false}><meshStandardMaterial color="#8d939a" roughness={0.9} side={THREE.DoubleSide} /></instancedMesh>;
}

export function Courtyards({ m, low }: { m: Mats; low: boolean }) {
  return (
    <group>
      <Ground />
      <Walls m={m} />
      <Gates m={m} />
      <Buildings m={m} />
      <Garden low={low} />
      <Birds n={low ? 10 : 24} />
    </group>
  );
}
