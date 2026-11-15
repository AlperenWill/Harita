/**
 * Ayasofya — sahne. Tümü prosedürel geometri (model dosyası yok); ölçüler hagia.ts'teki yayımlanmış yaklaşık değerlerden.
 * Çizim çağrıları: sütunlar tür başına 1 InstancedMesh (3) + başlıklar 1; 64 pencere 1; ışık huzmeleri 1; ışık havuzları 1;
 * ziyaretçiler 1; kandiller 2. Aşamalı yükleme: stage 0 kabuk (zemin, ayaklar, kubbe) → 1 sütunlar ve galeriler → 2 ayrıntılar.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { AISLE_Z, APEX_Y, APSE, ARCH_Y, DOME_RISE, GALLERY_Y, MIHRAB, MINBAR, NARTHEX, NAVE_X, PEND_R, PIERS, R, RING_Y, columns, domeWindows, shafts, sunVector, tympanumWindows, type V3 } from './hagia';
import { PANELS, goldMosaic, lead, marble, panelTextures, plaster, wood } from './materials';

export type Tier = 'low' | 'medium' | 'high';
const SEG: Record<Tier, number> = { low: 24, medium: 40, high: 64 };

/* ---------- kabuk ---------- */
function pendentiveGeometry(n: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = (i: number, j: number) => { const x = -R + (2 * R * i) / n, z = -R + (2 * R * j) / n; return [x, ARCH_Y + Math.sqrt(Math.max(0, PEND_R * PEND_R - x * x - z * z)), z]; };
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const p = P(i, j); pos.push(...p); uv.push(i / n, j / n); }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const c = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]].map(([a, b]) => { const p = P(a, b); return Math.hypot(p[0], p[2]); });
    if (Math.max(...c) < R) continue;   // kubbe halkasının içi: kubbe örter
    const a = j * (n + 1) + i; idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const scaleUV = (g: THREE.BufferGeometry, sx: number, sy: number) => { const u = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * sx, u.getY(i) * sy); return g; };

export function Shell({ tier, detail }: { tier: Tier; detail: boolean }) {
  const seg = SEG[tier];
  const M = useMemo(() => ({
    domeGold: goldMosaic({ tess: [640, 150], side: THREE.BackSide, detail, lod: [8, 34] }),
    pendGold: goldMosaic({ tess: [220, 220], side: THREE.DoubleSide, detail, lod: [8, 34], color: '#cf9a36' }),
    semiGold: goldMosaic({ tess: [320, 160], side: THREE.BackSide, detail, lod: [8, 34], color: '#c9953a' }),
    floor: marble('floor', [10, 8], 0.16), pier: marble('white', [2, 6], 0.28), revet: marble('white', [8, 3], 0.3),
    plaster: plaster('#a8977a'), plasterDark: plaster('#6a5a47'), ochre: plaster('#9c8663'),
  }), [detail]);
  useMemo(() => { M.revet.side = THREE.DoubleSide; M.plaster.side = THREE.DoubleSide; M.ochre.side = THREE.DoubleSide; }, [M]);
  const G = useMemo(() => {
    const tymp = new THREE.Shape(); tymp.moveTo(-R, 23); tymp.lineTo(R, 23); tymp.lineTo(R, ARCH_Y); tymp.absarc(0, ARCH_Y, R, 0, Math.PI, false); tymp.lineTo(-R, 23);
    const sp = new THREE.Shape(); sp.moveTo(-APSE.r, APSE.springY); sp.lineTo(-APSE.r, ARCH_Y); sp.lineTo(APSE.r, ARCH_Y); sp.lineTo(APSE.r, APSE.springY); sp.absarc(0, APSE.springY, APSE.r, 0, Math.PI, false);
    return {
      dome: new THREE.SphereGeometry(R, seg, Math.round(seg / 3), 0, Math.PI * 2, 0, Math.PI / 2).scale(1, DOME_RISE / R, 1),
      pend: pendentiveGeometry(Math.round(seg * 0.75)),
      semiE: new THREE.SphereGeometry(R, seg, Math.round(seg / 3), Math.PI / 2, Math.PI, 0, Math.PI / 2),
      semiW: new THREE.SphereGeometry(R, seg, Math.round(seg / 3), -Math.PI / 2, Math.PI, 0, Math.PI / 2),
      conch: new THREE.SphereGeometry(APSE.r, 24, 10, Math.PI / 2, Math.PI, 0, Math.PI / 2),
      tymp: new THREE.ShapeGeometry(tymp, seg), spandrel: new THREE.ShapeGeometry(sp, 24),
    };
  }, [seg]);
  const g = APSE.half, dg = 0.13;
  const cyl = (y0: number, y1: number, t0: number, t1: number, mat: THREE.Material, cx: number, key: string) => (
    <mesh key={key} material={mat} position={[cx, (y0 + y1) / 2, 0]}><cylinderGeometry args={[R, R, y1 - y0, Math.max(6, Math.round((seg * (t1 - t0)) / Math.PI)), 1, true, t0, t1 - t0]} /></mesh>
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={M.floor} receiveShadow><planeGeometry args={[2 * NAVE_X + 26, 2 * AISLE_Z]} /></mesh>
      {/* kubbe, kasnak, pandantifler */}
      <mesh geometry={G.dome} material={M.domeGold} position={[0, RING_Y, 0]} />
      <mesh position={[0, RING_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.pier}><torusGeometry args={[R - 0.1, 0.45, 6, seg]} /></mesh>
      <mesh geometry={G.pend} material={M.pendGold} />
      {/* yarım kubbeler ve altlarındaki yarım silindir duvarlar (batıda kapı, doğuda apsis açıklığı) */}
      <mesh geometry={G.semiE} material={M.semiGold} position={[R, ARCH_Y, 0]} />
      <mesh geometry={G.semiW} material={M.semiGold} position={[-R, ARCH_Y, 0]} />
      {cyl(0, 12, 0, Math.PI / 2 - g, M.revet, R, 'e1')}{cyl(0, 12, Math.PI / 2 + g, Math.PI, M.revet, R, 'e2')}
      {cyl(12, ARCH_Y, 0, Math.PI / 2 - g, M.ochre, R, 'e3')}{cyl(12, ARCH_Y, Math.PI / 2 + g, Math.PI, M.ochre, R, 'e4')}
      {cyl(0, 12, Math.PI, 1.5 * Math.PI - dg, M.revet, -R, 'w1')}{cyl(0, 12, 1.5 * Math.PI + dg, 2 * Math.PI, M.revet, -R, 'w2')}
      {cyl(12, ARCH_Y, Math.PI, 2 * Math.PI, M.ochre, -R, 'w3')}{cyl(7.2, 12, 1.5 * Math.PI - dg, 1.5 * Math.PI + dg, M.revet, -R, 'w4')}
      {/* apsis: yarım silindir + konk + alınlık */}
      <mesh material={M.revet} position={[APSE.cx, APSE.springY / 2, 0]}><cylinderGeometry args={[APSE.r, APSE.r, APSE.springY, 24, 1, true, 0, Math.PI]} /></mesh>
      <mesh geometry={G.conch} material={M.semiGold} position={[APSE.cx, APSE.springY, 0]} />
      <mesh geometry={G.spandrel} material={M.ochre} position={[APSE.cx, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      {/* kuzey ve güney: timpanon duvarları */}
      {[-1, 1].map((s) => <mesh key={s} geometry={G.tymp} material={M.ochre} position={[0, 0, s * R]} rotation={[0, s > 0 ? Math.PI : 0, 0]} />)}
      {/* dört büyük ayak */}
      {PIERS.map((p, i) => <mesh key={i} material={M.pier} position={[p[0], ARCH_Y / 2, p[2]]} castShadow><boxGeometry args={[7, ARCH_Y, 6]} /></mesh>)}
      {/* dış duvarlar */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={M.revet} position={[0, 6, s * AISLE_Z]} rotation={[0, s > 0 ? Math.PI : 0, 0]}><planeGeometry args={[2 * NAVE_X, 12]} /></mesh>
          <mesh material={M.plaster} position={[0, 18.5, s * AISLE_Z]} rotation={[0, s > 0 ? Math.PI : 0, 0]}><planeGeometry args={[2 * NAVE_X, 13]} /></mesh>
          {[-1, 1].map((e) => <mesh key={e} material={M.plaster} position={[e * NAVE_X, 12.5, s * (R + AISLE_Z) / 2]} rotation={[0, -e * Math.PI / 2, 0]}><planeGeometry args={[AISLE_Z - R, 25]} /></mesh>)}
        </group>
      ))}
      {/* narteks: karanlık, alçak tavanlı giriş */}
      <mesh position={[(NARTHEX.x0 + NARTHEX.x1) / 2, NARTHEX.h / 2, 0]}><boxGeometry args={[NARTHEX.x1 - NARTHEX.x0, NARTHEX.h, 56]} /><primitive object={useMemo(() => { const m = plaster('#6e5a42'); m.side = THREE.BackSide; return m; }, [])} attach="material" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={M.plasterDark} position={[-32, NARTHEX.h / 2, s * 15.1]}><boxGeometry args={[2.1, NARTHEX.h, 26.2]} /></mesh>)}
      <mesh material={M.plasterDark} position={[-32, 8.35, 0]}><boxGeometry args={[2.1, 2.3, 4]} /></mesh>
    </group>
  );
}

/* ---------- galeriler, kirişler ---------- */
export function Galleries() {
  const stone = useMemo(() => marble('white', [10, 1], 0.35), []);
  const slab = useMemo(() => plaster('#a58a63'), []);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={stone} position={[0, 11.7, s * R]} castShadow><boxGeometry args={[24, 2.6, 1.3]} /></mesh>
          <mesh material={stone} position={[0, 21.8, s * R]}><boxGeometry args={[24, 2.4, 1.2]} /></mesh>
          <mesh material={slab} position={[0, GALLERY_Y - 0.2, s * (R + AISLE_Z) / 2 + s * 0.3]}><boxGeometry args={[2 * NAVE_X, 0.4, AISLE_Z - R - 0.6]} /></mesh>
          <mesh material={slab} position={[0, 24.2, s * (R + AISLE_Z) / 2]}><boxGeometry args={[2 * NAVE_X, 0.4, AISLE_Z - R]} /></mesh>
          <mesh material={stone} position={[0, GALLERY_Y + 0.55, s * (R + 0.45)]}><boxGeometry args={[24, 1.1, 0.25]} /></mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- sütunlar: tür başına tek InstancedMesh ---------- */
export function Columns({ tier }: { tier: Tier }) {
  const cols = useMemo(columns, []);
  const meshes = useMemo(() => {
    const seg = tier === 'low' ? 10 : 18;
    const shaft = scaleUV(new THREE.CylinderGeometry(0.93, 1, 1, seg, 1, true).translate(0, 0.5, 0), 2, 3);
    const out: THREE.InstancedMesh[] = [];
    for (const kind of ['verd', 'porphyry', 'white'] as const) {
      const list = cols.filter((c) => c.kind === kind), m = new THREE.InstancedMesh(shaft, marble(kind, [1, 1], 0.14), list.length);
      list.forEach((c, i) => m.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(...c.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7), new THREE.Vector3(c.r, c.h - 0.9, c.r))));
      m.castShadow = true; out.push(m);
    }
    // başlıklar ve kaideler: tek geometri (sepet başlık ~ kesik koni + abaküs), tek InstancedMesh
    const cap = new THREE.CylinderGeometry(1.75, 1, 0.9, seg, 1).translate(0, 0.45, 0);
    const caps = new THREE.InstancedMesh(cap, marble('white', [2, 1], 0.4), cols.length * 2);
    cols.forEach((c, i) => {
      caps.setMatrixAt(i * 2, new THREE.Matrix4().compose(new THREE.Vector3(c.pos[0], c.pos[1] + c.h - 0.9, c.pos[2]), new THREE.Quaternion(), new THREE.Vector3(c.r, 1, c.r)));
      caps.setMatrixAt(i * 2 + 1, new THREE.Matrix4().compose(new THREE.Vector3(c.pos[0], c.pos[1] + 0.32, c.pos[2]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI), new THREE.Vector3(c.r * 0.8, 0.35, c.r * 0.8)));
    });
    out.push(caps); return out;
  }, [cols, tier]);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
}

/* ---------- pencereler: 40 kubbe + 24 timpanon, tek InstancedMesh; parlaklık güneşe göre ---------- */
export function Windows({ hour }: { hour: number }) {
  const list = useMemo(() => [...domeWindows().map((w) => ({ ...w, size: [1.25, 2.5] as const })), ...tympanumWindows().map((w) => ({ ...w, size: [1.7, 3.1] as const }))], []);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide }), list.length);
    list.forEach((w, i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-w.n[0], -w.n[2]), 0));
      m.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(w.pos[0] - w.n[0] * 0.12, w.pos[1], w.pos[2] - w.n[2] * 0.12), q, new THREE.Vector3(w.size[0], w.size[1], 1)));
      m.setColorAt(i, new THREE.Color(1, 1, 1));
    });
    return m;
  }, [list]);
  useEffect(() => {
    const s = sunVector(hour), day = Math.max(0, Math.min(1, s[1] * 4)), c = new THREE.Color();
    list.forEach((w, i) => {
      const d = Math.max(0, (w.n[0] * s[0] + w.n[1] * s[1] + w.n[2] * s[2]) / Math.hypot(...w.n));
      const k = 0.35 + day * (0.9 + d * 2.6);   // gökyüzü ışığı + doğrudan güneş (bloom eşiğini aşar)
      mesh.setColorAt(i, c.setRGB(k * 1.0, k * (0.9 + 0.06 * day), k * (0.72 + 0.2 * day)));
    });
    mesh.instanceColor!.needsUpdate = true;
  }, [hour, list, mesh]);
  return <primitive object={mesh} />;
}

/* ---------- ışık huzmeleri (god rays), zemin havuzları, toz ---------- */
let _fade: THREE.CanvasTexture | null = null;
const fadeTex = () => { if (_fade) return _fade; const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return (_fade = new THREE.CanvasTexture(c)); };
const MAX_SHAFTS = 64, UP = new THREE.Vector3(0, 1, 0);
export function GodRays({ hour, enabled, motes }: { hour: number; enabled: boolean; motes: boolean }) {
  const { beams, pools } = useMemo(() => {
    const b = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 1.25, 1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffe9c4', alphaMap: fadeTex(), transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, toneMapped: false }), MAX_SHAFTS);
    const p = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffe2ad', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), MAX_SHAFTS);
    b.frustumCulled = p.frustumCulled = false; return { beams: b, pools: p };
  }, []);
  const list = useMemo(() => shafts(hour), [hour]);
  useEffect(() => {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Quaternion(), m = new THREE.Matrix4(), c = new THREE.Color(); let np = 0;
    const use = list.slice().sort((x, y) => y.strength - x.strength).slice(0, MAX_SHAFTS);
    use.forEach((s, i) => {
      a.set(...s.from); b.set(...s.to); d.copy(a).sub(b); const len = d.length();
      q.setFromUnitVectors(UP, d.normalize()); beams.setMatrixAt(i, m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1)));
      beams.setColorAt(i, c.setScalar(0.35 + s.strength * 0.65));
      if (s.to[1] < 0.3) { const el = Math.max(0.2, Math.abs(d.y)); pools.setMatrixAt(np, m.compose(new THREE.Vector3(s.to[0], 0.03, s.to[2]), new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(d.x, d.z)), new THREE.Vector3(1.5, 1, 1.5 / el))); pools.setColorAt(np++, c.setScalar(0.4 + s.strength * 0.6)); }
    });
    beams.count = enabled ? use.length : 0; pools.count = np;
    beams.instanceMatrix.needsUpdate = pools.instanceMatrix.needsUpdate = true; if (beams.instanceColor) beams.instanceColor.needsUpdate = true; if (pools.instanceColor) pools.instanceColor.needsUpdate = true;
  }, [list, beams, pools, enabled]);
  return <group><primitive object={beams} /><primitive object={pools} />{motes && enabled && <Motes />}</group>;
}
/** Huzmelerin içinde süzülen toz: nefin ortasındaki hacimde yavaşça dönen noktalar */
function Motes() {
  const ref = useRef<THREE.Points>(null!);
  const geo = useMemo(() => { const n = 900, a = new Float32Array(n * 3); let s = 9; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < n; i++) a.set([(r() - 0.5) * 44, 1 + r() * 34, (r() - 0.5) * 26], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g; }, []);
  useFrame(({ clock }) => { ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.02) * 0.3; ref.current.position.y = Math.sin(clock.elapsedTime * 0.11) * 0.6; });
  return <points ref={ref} geometry={geo}><pointsMaterial color="#fff2d6" size={0.06} sizeAttenuation transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

/* ---------- mozaik panoları (doku akışı: uzaktan 256 px, yaklaşınca 1024 px) ---------- */
function Panel({ id, pos, rotY, tilt = 0, detail, hiRes }: { id: string; pos: V3; rotY: number; tilt?: number; detail: boolean; hiRes: number }) {
  const { camera } = useThree();
  const [res, setRes] = useState(256);
  const p = PANELS[id];
  const mat = useMemo(() => goldMosaic({ tess: [p.w * 70, p.h * 70], tilt: 0.45, lod: [3, 16], detail }), [p, detail]);
  useEffect(() => { const t = panelTextures(id, res); mat.map = t.map; mat.metalnessMap = t.metal; mat.color.set('#ffffff'); mat.needsUpdate = true; return () => { t.map.dispose(); t.metal.dispose(); }; }, [id, res, mat]);
  const v = useMemo(() => new THREE.Vector3(...pos), [pos]);
  useFrame(() => { if (res < hiRes && camera.position.distanceTo(v) < 16) setRes(hiRes); });
  return <mesh material={mat} position={pos} rotation={[tilt, rotY, 0]}><planeGeometry args={[p.w, p.h]} /></mesh>;
}
export function Mosaics({ detail, tier }: { detail: boolean; tier: Tier }) {
  const hi = tier === 'low' ? 512 : 1024;
  return (
    <group>
      <Panel id="deisis" pos={[-14, GALLERY_Y + 2.75, AISLE_Z - 0.06]} rotY={Math.PI} detail={detail} hiRes={hi} />
      <Panel id="zoe" pos={[NAVE_X - 0.06, GALLERY_Y + 2.7, 19.5]} rotY={-Math.PI / 2} detail={detail} hiRes={hi} />
      <Panel id="komnenos" pos={[NAVE_X - 0.06, GALLERY_Y + 2.7, 25.5]} rotY={-Math.PI / 2} detail={detail} hiRes={hi} />
      <Panel id="apsis" pos={[APSE.cx + APSE.r * 0.72, 23, 0]} rotY={-Math.PI / 2} tilt={0} detail={detail} hiRes={hi} />
      <Panel id="kapi" pos={[-33.08, 8.3, 0]} rotY={-Math.PI / 2} detail={detail} hiRes={hi} />
    </group>
  );
}

/* ---------- Osmanlı eklemeleri, omphalion, ölçek figürleri, kandiller ---------- */
export function Furnishings({ tier }: { tier: Tier }) {
  const M = useMemo(() => ({ white: marble('white', [1, 2], 0.25), gold: new THREE.MeshStandardMaterial({ color: '#d7a640', metalness: 1, roughness: 0.3 }), green: new THREE.MeshStandardMaterial({ color: '#143524', roughness: 0.6 }), wood: wood(), lead: lead(), porph: marble('porphyry', [1, 1], 0.15), verd: marble('verd', [1, 1], 0.15), bronze: new THREE.MeshStandardMaterial({ color: '#5a4630', metalness: 0.8, roughness: 0.45 }) }), []);
  const roundels = useMemo(() => {
    const out: { pos: V3; rot: number }[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push({ pos: [sx * (R - 0.9), 21.5, sz * (R - 0.9)], rot: Math.atan2(-sx, -sz) });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const a = 0.78; out.push({ pos: [sx * (R + Math.cos(a) * (R - 0.6)), 21.5, sz * Math.sin(a) * (R - 0.6)], rot: Math.atan2(-sx * Math.cos(a), -sz * Math.sin(a)) }); }
    return out;
  }, []);
  // ölçek figürleri: 1,70 m boyunda ziyaretçiler (tek InstancedMesh)
  const people = useMemo(() => {
    const spots: [number, number][] = [[-22, 3], [-12, -4], [-6, 5], [2, -7], [5, 2.5], [11, -3], [16, 6], [21, -2], [24, 5], [-2, 10], [8, -10], [-15, 9], [0, -1.5], [18, -8]];
    const g = new THREE.CapsuleGeometry(0.2, 1.05, 3, 8).translate(0, 0.72, 0), m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.9 }), spots.length * 2);
    const head = new THREE.Matrix4(), tones = ['#3a4a63', '#6b3f3a', '#4d5a44', '#2f2f36', '#7a6a55', '#5a4a6e'];
    spots.forEach(([x, z], i) => {
      m.setMatrixAt(i * 2, new THREE.Matrix4().makeTranslation(x, 0, z)); m.setColorAt(i * 2, new THREE.Color(tones[i % tones.length]));
      m.setMatrixAt(i * 2 + 1, head.compose(new THREE.Vector3(x, 1.38, z), new THREE.Quaternion(), new THREE.Vector3(0.62, 0.2, 0.62))); m.setColorAt(i * 2 + 1, new THREE.Color('#d9b594'));
    });
    m.castShadow = true; return m;
  }, []);
  const lamps = useMemo(() => {
    const rings: V3[] = [[-16, 5.2, 0], [0, 5.6, 0], [15, 5.2, 0], [0, 5.2, -9], [0, 5.2, 9]];
    const torus = new THREE.InstancedMesh(new THREE.TorusGeometry(3.2, 0.05, 5, 36).rotateX(Math.PI / 2), M.bronze, rings.length);
    const n = tier === 'low' ? 12 : 20, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }), rings.length * n);
    rings.forEach((r, i) => { torus.setMatrixAt(i, new THREE.Matrix4().makeTranslation(...r)); for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; bulbs.setMatrixAt(i * n + k, new THREE.Matrix4().makeTranslation(r[0] + Math.cos(a) * 3.2, r[1] - 0.15, r[2] + Math.sin(a) * 3.2)); } });
    return { torus, bulbs, rings };
  }, [M.bronze, tier]);
  return (
    <group>
      {/* hat levhaları: yeri ve boyutu; yazı yeniden üretilmedi */}
      {roundels.map((r, i) => (
        <group key={i} position={r.pos} rotation={[0, r.rot, 0]}>
          <mesh material={M.green}><circleGeometry args={[3.75, 40]} /></mesh>
          <mesh material={M.gold} position={[0, 0, 0.02]}><ringGeometry args={[3.5, 3.75, 40]} /></mesh>
        </group>
      ))}
      {/* omphalion: renkli mermer daireler */}
      <group position={[9, 0.02, 8.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={M.white}><planeGeometry args={[5.6, 5.6]} /></mesh>
        <mesh material={M.porph} position={[0, 0, 0.005]}><circleGeometry args={[1.55, 40]} /></mesh>
        {[[-1.9, 1.9], [1.9, 1.9], [-1.9, -1.9], [1.9, -1.9], [0, 2.1], [0, -2.1], [2.1, 0], [-2.1, 0]].map(([x, y], i) => <mesh key={i} material={i % 2 ? M.verd : M.porph} position={[x, y, 0.005]}><circleGeometry args={[i < 4 ? 0.62 : 0.42, 24]} /></mesh>)}
      </group>
      {/* mihrap: apsiste, eksenin biraz güneyinde ve kıbleye dönük */}
      <group position={MIHRAB} rotation={[0, -Math.PI / 2 - 0.22, 0]}>
        <mesh material={M.white} position={[0, 2.6, 0]}><boxGeometry args={[3, 5.2, 0.5]} /></mesh>
        <mesh material={M.gold} position={[0, 2.2, 0.27]}><planeGeometry args={[1.5, 3.6]} /></mesh>
        <mesh material={M.gold} position={[0, 5.9, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.2, 1.5, 4]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} material={M.bronze} position={[s * 2.2, 1.1, 0.6]}><cylinderGeometry args={[0.22, 0.3, 2.2, 10]} /></mesh>)}
      </group>
      {/* minber */}
      <group position={MINBAR} rotation={[0, -Math.PI / 2 - 0.22, 0]}>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} material={M.white} position={[0, 0.3 + i * 0.6, 3.6 - i * 0.8]} castShadow><boxGeometry args={[1.3, 0.6 + i * 0.02, 0.8]} /></mesh>)}
        <mesh material={M.white} position={[0, 2.9, -3.3]} castShadow><boxGeometry args={[1.5, 5.8, 1.5]} /></mesh>
        <mesh material={M.lead} position={[0, 8.1, -3.3]}><coneGeometry args={[1, 3.2, 8]} /></mesh>
        <mesh material={M.gold} position={[0, 9.9, -3.3]}><sphereGeometry args={[0.16, 8, 6]} /></mesh>
      </group>
      {/* İmparator Kapısı: bronz kaplı kanatlar (açık) */}
      {[-1, 1].map((s) => <mesh key={s} material={M.bronze} position={[-33.3, 3.6, s * 2.9]} rotation={[0, s * 0.5, 0]} castShadow><boxGeometry args={[0.16, 7.2, 2]} /></mesh>)}
      <primitive object={people} />
      <primitive object={lamps.torus} /><primitive object={lamps.bulbs} />
      {lamps.rings.slice(0, tier === 'low' ? 1 : 3).map((r, i) => <pointLight key={i} position={[r[0], r[1] - 0.4, r[2]]} color="#ffcf96" intensity={40} distance={22} decay={1.7} />)}
    </group>
  );
}

/* ---------- ışık: güneş + gökyüzü dolgusu + ortam haritası ---------- */
export function Lighting({ hour, shadows, focus }: { hour: number; shadows: boolean; focus: number }) {
  const sun = useRef<THREE.SpotLight>(null!), mih = useRef<THREE.SpotLight>(null!);
  const s = sunVector(hour), day = Math.max(0, Math.min(1, s[1] * 4)), warm = 1 - Math.min(1, s[1] * 1.6);
  const color = useMemo(() => new THREE.Color().setHSL(0.09 + 0.03 * (1 - warm), 0.55 + 0.3 * warm, 0.62 + 0.18 * (1 - warm)), [warm]);
  useEffect(() => {
    // güneş, kubbenin içinden zemine düşen geniş bir demet olarak modellenir (kabuk gölge üretmez; sütunlar ve insanlar üretir)
    sun.current.position.set(s[0] * 70, Math.max(8, s[1] * 70) + 8, s[2] * 70); sun.current.target.position.set(-s[0] * 6, 0, -s[2] * 6); sun.current.target.updateMatrixWorld();
    mih.current.target.position.set(MIHRAB[0], 2.5, MIHRAB[2]); mih.current.target.updateMatrixWorld();
  }, [s]);
  return (
    <group>
      <Environment resolution={64} frames={1} key={Math.round(hour * 2)}>
        <color attach="background" args={['#1a130c']} />
        <Lightformer form="ring" intensity={2.2 * day + 0.3} color="#fff1d8" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={12} />
        <Lightformer form="rect" intensity={3.5 * day} color={color} position={[s[0] * 10, Math.max(2, s[1] * 10), s[2] * 10]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#ffc98a" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
      </Environment>
      <hemisphereLight args={['#ffeed6', '#3a2c1e', 0.2 + day * 0.4]} />
      <ambientLight intensity={0.1} color="#ffd9a8" />
      <spotLight ref={sun} angle={0.42} penumbra={0.8} intensity={day * 9000} distance={170} decay={2} color={color}
        castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} />
      <spotLight ref={mih} position={[MIHRAB[0] - 9, 14, MIHRAB[2] - 1]} angle={0.3} penumbra={0.7} intensity={focus * 900} distance={30} decay={2} color="#ffe0b0" />
      <pointLight position={[-37.5, 6.5, 0]} intensity={14} distance={16} decay={2} color="#ffb877" />
    </group>
  );
}
export { APEX_Y };
