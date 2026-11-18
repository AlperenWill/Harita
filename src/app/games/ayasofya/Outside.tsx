/**
 * Ayasofya — dış mekân: avlu, dış narteks revakı, batı cephesi, payandalı ana kütle, pencereli timpanon duvarları,
 * 40 pencereli kasnak + kurşun kubbe + alem, yarım kubbeler, şerefeli dört minare, şadırvan, bahçe.
 * Topkapı'nın mimari kitini (kubbe, revak, pencere, dünya ölçekli UV) kullanır. Biçimler stilizedir; ölçüler yaklaşıktır.
 * İç mekân (HagiaScene) aynı koordinatlarda; dış kütlenin iç tarafa bakan yüzleri çizilmez.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { Alem, Arcade, WindowRow, cobble, grass, makeMats, pointedWindow, sbox, scyl, uvScale, withRepeat, type Mats } from '../topkapi/kit';
import { Birds } from '../topkapi/Courtyards';
import { AISLE_Z, ARCH_Y, DOME_RISE, DOME_WINDOWS, NARTHEX, R, RING_Y, APEX_Y } from './hagia';
import { DOOR_HALF, FACADE_X, PORTICO_COLS, PORTICO_X, SADIRVAN, YARD, yardTrees } from './walk';

const Y = new THREE.Vector3(0, 1, 0);
/** Ayasofya'nın dış sıvası: sıcak toprak/pembe tonu, ince kat silmeleri, hafif lekeler (4 m'de bir tekrar) */
function facadeTex() {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d')!;
  g.fillStyle = '#e3b48e'; g.fillRect(0, 0, n, n); let sd = 9; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,70,40' : '255,230,200'},${r() * 0.07})`; g.beginPath(); g.arc(r() * n, r() * n, 2 + r() * 10, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(255,236,210,.55)'; g.fillRect(0, 0, n, 10); g.fillStyle = 'rgba(90,50,30,.25)'; g.fillRect(0, 10, n, 3);
  for (let y = 40; y < n; y += 64) { g.fillStyle = 'rgba(160,96,62,.18)'; g.fillRect(0, y, n, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
/** z ekseni boyunca pencere sütunu (batı/doğu yüzleri için), yüz −x ya da +x */
function WinCol({ x, y, from, to, count, w = 1.2, h = 2.4, face, m }: { x: number; y: number; from: number; to: number; count: number; w?: number; h?: number; face: 1 | -1; m: Mats }) {
  const mesh = useMemo(() => { const g = pointedWindow(w, h), im = new THREE.InstancedMesh(g, m.window, count), M4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(Y, face > 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let i = 0; i < count; i++) im.setMatrixAt(i, M4.compose(new THREE.Vector3(x + face * 0.03, y, from + ((i + 0.5) / count) * (to - from)), q, new THREE.Vector3(1, 1, 1))); return im; }, [x, y, from, to, count, w, h, face, m.window]);
  return <primitive object={mesh} />;
}
/** Payanda: tabanı geniş, yukarı daralan eğik kütle (Osmanlı döneminde eklenen destekler) */
function buttressGeo() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(5.2, 0); s.lineTo(5.2, 5); s.lineTo(1.4, 23); s.lineTo(0, 23); s.lineTo(0, 0);
  return uvScale(new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: false }).translate(0, 0, -2), 0.25, 0.25);
}

function Ground() {
  const M = useMemo(() => {
    const c = withRepeat(cobble(), 22, 37), g = withRepeat(grass(), 18, 15);
    return { pave: new THREE.MeshStandardMaterial({ map: c.map, normalMap: c.normal, roughness: 0.9, color: '#d6cfc2' }), grass: new THREE.MeshStandardMaterial({ map: g.map, roughness: 0.95, color: '#9fae86', polygonOffset: true, polygonOffsetFactor: -1 }), far: new THREE.MeshStandardMaterial({ color: '#8a8a72', roughness: 1 }), soil: new THREE.MeshStandardMaterial({ color: '#5b4230', roughness: 1 }) };
  }, []);
  const W = YARD.x1 - YARD.x0;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 0]} material={M.far} receiveShadow><planeGeometry args={[700, 700]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(YARD.x0 + YARD.x1) / 2, -0.02, 0]} material={M.pave} receiveShadow><planeGeometry args={[W, YARD.z * 2]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} rotation-x={-Math.PI / 2} position={[-77, 0.0, s * 30]} material={M.grass} receiveShadow><planeGeometry args={[54, 44]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`b${s}`} position={[-77, 0.04, s * 7.6]} material={M.soil}><boxGeometry args={[54, 0.08, 1.4]} /></mesh>)}
    </group>
  );
}
function Flowers({ low }: { low: boolean }) {
  const meshes = useMemo(() => {
    const per = low ? 160 : 420, n = per * 2, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 4).scale(1, 1.5, 1).translate(0, 0.34, 0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
    const st = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.34, 4).translate(0, 0.17, 0), new THREE.MeshStandardMaterial({ color: '#3f6b2a', roughness: 0.9 }), n);
    const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), PAL = ['#d62828', '#f2c12e', '#f4efe6', '#e0559a'];
    let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) { const s = i < per ? -1 : 1, p = new THREE.Vector3(-104 + r() * 54, 0.06, s * (7.6 + (r() - 0.5) * 1.2)), k = 0.8 + r() * 0.5; M4.compose(p, q, new THREE.Vector3(k, k, k)); fl.setMatrixAt(i, M4); st.setMatrixAt(i, M4); fl.setColorAt(i, c.set(PAL[Math.floor(r() * 4)])); }
    return { fl, st };
  }, [low]);
  return <><primitive object={meshes.st} /><primitive object={meshes.fl} /></>;
}
function Trees() {
  const meshes = useMemo(() => {
    const T = yardTrees(), servi = T.filter((t) => t.kind === 'servi'), cinar = T.filter((t) => t.kind === 'cinar');
    const prof = [[0, 0], [0.55, 0.4], [0.9, 1.8], [0.95, 3.4], [0.8, 5.4], [0.5, 7.4], [0.2, 8.8], [0, 9.4]].map(([x, y]) => new THREE.Vector2(x, y));
    const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: true }), bark = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 });
    const s = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 9), leaf, servi.length), tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.5, 5.5, 8).translate(0, 2.75, 0), bark, cinar.length), cr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leaf, cinar.length * 6);
    const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let sd = 11; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    servi.forEach((t, i) => { s.setMatrixAt(i, M4.compose(new THREE.Vector3(t.x, 0, t.z), q.setFromAxisAngle(Y, r() * 6), new THREE.Vector3(t.s, t.s * (0.9 + r() * 0.25), t.s))); s.setColorAt(i, c.setHSL(0.3 + r() * 0.03, 0.35, 0.17 + r() * 0.05)); });
    let k = 0;
    cinar.forEach((t, i) => { tr.setMatrixAt(i, M4.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(t.s * 1.2, t.s, t.s * 1.2)));
      for (let b = 0; b < 6; b++) { const a = (b / 6) * Math.PI * 2 + r(), d = b === 5 ? 0 : 2.2 * t.s, Rr = (2.4 + r() * 1.2) * t.s; cr.setMatrixAt(k, M4.compose(new THREE.Vector3(t.x + Math.cos(a) * d, (5.6 + (b === 5 ? 2.2 : r() * 1.4)) * t.s, t.z + Math.sin(a) * d), q.setFromAxisAngle(Y, r() * 6), new THREE.Vector3(Rr, Rr * 0.78, Rr))); cr.setColorAt(k++, c.setHSL(0.22 + r() * 0.05, 0.42, 0.26 + r() * 0.08)); } });
    for (const im of [s, tr, cr]) { im.castShadow = true; im.receiveShadow = true; }
    return { s, tr, cr };
  }, []);
  return <><primitive object={meshes.s} /><primitive object={meshes.tr} /><primitive object={meshes.cr} /></>;
}
/** Şerefeli minare: kaide, ince gövde, iki şerefe (balkon + korkuluk), kurşun kalem külah, alem */
function Minaret({ x, z, m }: { x: number; z: number; m: Mats }) {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={sbox(5.4, 9, 5.4)} material={m.stone} position={[0, 4.5, 0]} castShadow receiveShadow />
      <mesh geometry={scyl(1.7, 2.3, 48, 16)} material={m.plaster} position={[0, 9 + 24, 0]} castShadow />
      {[30, 44].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh material={m.plaster} position={[0, -0.7, 0]}><cylinderGeometry args={[2.9, 1.8, 1.4, 16]} /></mesh>
          <mesh material={m.plaster}><cylinderGeometry args={[3, 3, 0.35, 16]} /></mesh>
          <mesh material={m.iron} position={[0, 0.6, 0]}><cylinderGeometry args={[2.95, 2.95, 1, 16, 1, true]} /></mesh>
        </group>
      ))}
      <mesh geometry={scyl(1.45, 1.7, 6, 16)} material={m.plaster} position={[0, 57 + 3, 0]} />
      <mesh material={m.lead} position={[0, 63 + 5, 0]} castShadow><coneGeometry args={[1.9, 10, 16]} /></mesh>
      <Alem y={72.6} s={1} m={m} />
    </group>
  );
}
function Sadirvan({ m }: { m: Mats }) {
  const cols = useMemo(() => { const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.18, 3.6, 10), m.marble, 8), M4 = new THREE.Matrix4(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; im.setMatrixAt(i, M4.makeTranslation(Math.cos(a) * 3.9, 1.8 + 0.9, Math.sin(a) * 3.9)); } im.castShadow = true; return im; }, [m.marble]);
  return (
    <group position={[SADIRVAN.x, 0, SADIRVAN.z]}>
      <mesh material={m.marble} position={[0, 0.45, 0]} castShadow receiveShadow><cylinderGeometry args={[4.3, 4.4, 0.9, 8]} /></mesh>
      <mesh material={m.marble} position={[0, 1.4, 0]}><cylinderGeometry args={[2.4, 2.6, 1.3, 8]} /></mesh>
      <mesh material={m.iron} position={[0, 1.7, 0]}><cylinderGeometry args={[2.62, 2.62, 1.4, 8, 1, true]} /></mesh>
      <primitive object={cols} />
      <mesh material={m.wood} position={[0, 4.55, 0]}><cylinderGeometry args={[5.6, 5.6, 0.2, 8]} /></mesh>
      <mesh material={m.lead} position={[0, 5.6, 0]} castShadow><coneGeometry args={[5.8, 2.2, 8]} /></mesh>
      <Alem y={6.5} s={0.7} m={m} />
    </group>
  );
}

export function Outside({ hi, low }: { hi: boolean; low: boolean }) {
  const m = useMemo(() => makeMats(hi), [hi]);
  const W = useMemo(() => { const t = facadeTex(); const wall = new THREE.MeshStandardMaterial({ map: t, roughness: 0.88 }), none = new THREE.MeshBasicMaterial({ visible: false });
    return { wall, none, main: [wall, none, wall, none, wall, wall], upper: [wall, wall, wall, none, wall, wall], bG: buttressGeo() }; }, []);
  const drum = useMemo(() => {   // kasnak: 40 pencere + aralarında payanda dişleri
    const rr = R + 1.05, win = new THREE.InstancedMesh(pointedWindow(1.3, 2.6), m.window, DOME_WINDOWS), rib = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 3.4, 1.4), W.wall, DOME_WINDOWS), M4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < DOME_WINDOWS; i++) { const a = ((i + 0.5) / DOME_WINDOWS) * Math.PI * 2, b = (i / DOME_WINDOWS) * Math.PI * 2;
      win.setMatrixAt(i, M4.compose(new THREE.Vector3(Math.cos(a) * (rr + 0.02), RING_Y - 0.6, Math.sin(a) * (rr + 0.02)), q.setFromAxisAngle(Y, -a + Math.PI / 2), new THREE.Vector3(1, 1, 1)));
      rib.setMatrixAt(i, M4.compose(new THREE.Vector3(Math.cos(b) * (rr + 0.5), RING_Y + 0.5, Math.sin(b) * (rr + 0.5)), q.setFromAxisAngle(Y, -b), new THREE.Vector3(1, 1, 1))); }
    rib.castShadow = true; return { win, rib };
  }, [m.window, W.wall]);
  const X = FACADE_X, sideW = AISLE_Z + 0.6 - DOOR_HALF;
  return (
    <group>
      <Ground />
      {/* avlu duvarı: batıda kapılı alçak duvar, kuzey/güneyde yan duvarlar */}
      {[-1, 1].map((s) => <mesh key={`w${s}`} geometry={sbox(2, 3.6, YARD.z - 4)} material={m.stone} position={[YARD.x0 - 1, 1.8, s * (YARD.z + 4) / 2]} castShadow receiveShadow />)}
      {[-1, 1].map((s) => <mesh key={`s${s}`} geometry={sbox(YARD.x1 - YARD.x0 + 2, 3.6, 2)} material={m.stone} position={[(YARD.x0 + YARD.x1) / 2, 1.8, s * (YARD.z + 1)]} castShadow receiveShadow />)}

      {/* dış narteks revakı (batı) */}
      <group position={[PORTICO_X, 0, 0]} rotation-y={-Math.PI / 2}><Arcade cols={PORTICO_COLS} h={4.6} depth={3.3} m={m} domes={false} /></group>

      {/* batı cephesi: kapı açıklığı + iki sıra pencere + üst kat */}
      {[-1, 1].map((s) => <mesh key={s} geometry={sbox(1, 13, sideW)} material={W.wall} position={[X, 6.5, s * (DOOR_HALF + sideW / 2)]} castShadow receiveShadow />)}
      <mesh geometry={sbox(1, 5.6, DOOR_HALF * 2)} material={W.wall} position={[X, 13 - 2.8, 0]} />
      {[-1, 1].map((s) => <WinCol key={`f${s}`} x={X - 0.5} y={7.4} from={s * 4} to={s * 28} count={6} face={-1} m={m} />)}
      {[-1, 1].map((s) => <mesh key={`k${s}`} material={m.wood} position={[X - 0.65, 3.6, s * 1.75]} rotation={[0, s * 0.55, 0]}><boxGeometry args={[0.14, 7.2, 1.8]} /></mesh>)}
      <mesh geometry={sbox(NARTHEX.x1 - NARTHEX.x0 + 1.4, 0.45, 2 * AISLE_Z + 1.4)} material={m.lead} position={[(NARTHEX.x0 + NARTHEX.x1) / 2 - 0.5, 13.2, 0]} />
      <mesh geometry={sbox(1, 13, 2 * AISLE_Z + 1.2)} material={W.wall} position={[-33.5, 19.9, 0]} />
      <WinCol x={-34} y={15} from={-24} to={24} count={9} w={1.4} h={3} face={-1} m={m} />

      {/* ana kütle (iç tarafa bakan yüzler çizilmez) + pencere sıraları + payandalar */}
      <mesh geometry={sbox(66.4, 26, 2 * AISLE_Z + 1.2)} material={W.main} position={[0, 13, 0]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <WindowRow from={-30} to={30} y={4.2} z={s * (AISLE_Z + 0.6)} count={14} w={1.2} h={2.6} face={s as 1 | -1} m={m} />
          <WindowRow from={-30} to={30} y={16.5} z={s * (AISLE_Z + 0.6)} count={14} w={1.4} h={3.2} face={s as 1 | -1} m={m} />
          {[-24, -9, 9, 24].map((x) => <mesh key={x} geometry={W.bG} material={W.wall} position={[x, 0, s * (AISLE_Z + 0.6)]} rotation-y={s > 0 ? -Math.PI / 2 : Math.PI / 2} castShadow receiveShadow />)}
        </group>
      ))}
      <WinCol x={33.2} y={5} from={-26} to={26} count={10} face={1} m={m} />
      {/* üst kütle: timpanon duvarları (7 + 5 pencere) */}
      <mesh geometry={sbox(2 * R + 8, 15, 2 * R + 8)} material={W.upper} position={[0, 33.5, 0]} castShadow />
      {[-1, 1].map((s) => (
        <group key={`t${s}`}>
          <WindowRow from={-12.25} to={12.25} y={28} z={s * (R + 4)} count={7} w={1.5} h={3.4} face={s as 1 | -1} m={m} />
          <WindowRow from={-8.75} to={8.75} y={33.6} z={s * (R + 4)} count={5} w={1.5} h={3.4} face={s as 1 | -1} m={m} />
          <mesh geometry={sbox(2 * R + 8.6, 0.5, 0.9)} material={W.wall} position={[0, 41.2, s * (R + 4.1)]} />
        </group>
      ))}
      {/* kubbe: kasnak + pencereler + kurşun kubbe + alem; yarım kubbeler */}
      <mesh geometry={scyl(R + 1.05, R + 1.2, 4.2, 48)} material={W.wall} position={[0, RING_Y - 0.4, 0]} castShadow />
      <primitive object={drum.win} /><primitive object={drum.rib} />
      <mesh material={m.lead} position={[0, RING_Y + 1.6, 0]} scale={[1, DOME_RISE / R, 1]} castShadow><sphereGeometry args={[R + 1, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <Alem y={APEX_Y + 2.4} s={2.2} m={m} />
      {[-1, 1].map((s) => <mesh key={`h${s}`} material={m.lead} position={[s * R, ARCH_Y + 0.4, 0]} castShadow><sphereGeometry args={[R + 0.9, 40, 12, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2]} /></mesh>)}
      {/* eksedra yarım kubbeleri (köşelerde, küçük) */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`e${sx}${sz}`} material={m.lead} position={[sx * (R + 6), 26.2, sz * 9]} castShadow><sphereGeometry args={[5.4, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>))}

      {[[-40, -36], [-40, 36], [38, -34], [38, 34]].map(([x, z], i) => <Minaret key={i} x={x} z={z} m={m} />)}
      <Sadirvan m={m} />
      <Trees />
      <Flowers low={low} />
      <Birds n={low ? 10 : 22} cx={-10} cz={0} y={62} />
    </group>
  );
}
