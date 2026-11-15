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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
/** Halı: düz turkuaz zemin üzerinde çok hafif saf çizgileri ve hav dokusu (512² canvas, dosya yok) */
function carpetMaterial() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = '#2A9D8F'; g.fillRect(0, 0, 512, 512);   // referans rengi
  let sd = 21; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,40,40,.05)'; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.fillStyle = 'rgba(15,90,84,.55)'; g.fillRect(0, 0, 512, 5); g.fillStyle = 'rgba(233,196,106,.35)'; g.fillRect(0, 6, 512, 1.5);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 50); t.anisotropy = 16;
  return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.6, metalness: 0, sheen: 0.25, sheenColor: new THREE.Color('#2A9D8F'), sheenRoughness: 0.6, envMapIntensity: 0.35 });
}
const scaleUV = (g: THREE.BufferGeometry, sx: number, sy: number) => { const u = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * sx, u.getY(i) * sy); return g; };

export function Shell({ tier, detail }: { tier: Tier; detail: boolean }) {
  const seg = SEG[tier];
  const M = useMemo(() => ({
    domeGold: goldMosaic({ tess: [640, 150], side: THREE.BackSide, detail, lod: [8, 34], pattern: 1 }),
    pendGold: goldMosaic({ tess: [220, 220], side: THREE.DoubleSide, detail, lod: [8, 34], color: '#cf9a36' }),
    semiGold: goldMosaic({ tess: [320, 160], side: THREE.BackSide, detail, lod: [8, 34], color: '#c9953a', pattern: 2 }),
    floor: marble('floor', [3, 8], 0.16), carpet: carpetMaterial(), pier: marble('white', [2, 6], 0.28), revet: marble('white', [8, 3], 0.3),
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
      {/* zemin: içeride turkuaz halı (#2A9D8F, roughness 0,6); narteks mermer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, 0, 0]} material={M.carpet} receiveShadow><planeGeometry args={[2 * NAVE_X + 9, 2 * AISLE_Z]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-38, 0, 0]} material={M.floor}><planeGeometry args={[10, 2 * AISLE_Z]} /></mesh>
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
      <mesh position={[(NARTHEX.x0 + NARTHEX.x1) / 2, NARTHEX.h / 2, 0]}><boxGeometry args={[NARTHEX.x1 - NARTHEX.x0, NARTHEX.h, 56]} /><primitive object={useMemo(() => { const m = plaster('#6e5a42'); m.side = THREE.BackSide; const none = new THREE.MeshBasicMaterial({ visible: false }); return [none, none, m, m, m, m]; }, [])} attach="material" /></mesh>
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
      mesh.setColorAt(i, c.setRGB(k * 0.878, k * 0.969, k * 0.98));   // #E0F7FA
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
      new THREE.MeshBasicMaterial({ color: '#e0f7fa', alphaMap: fadeTex(), transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, toneMapped: false }), MAX_SHAFTS);
    const p = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#d6f3f7', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), MAX_SHAFTS);
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
  const mat = useMemo(() => goldMosaic({ tess: [p.w * 70, p.h * 70], tilt: 0.45, lod: [1.5, 7], detail }), [p, detail]);
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
    // gövde (bacaklar, gövde, kollar) tek birleşik geometri; ten (baş, eller) ayrı — 2 InstancedMesh, kişi başı ~330 üçgen
    const leg = (s: number) => new THREE.CapsuleGeometry(0.075, 0.68, 2, 6).translate(s * 0.1, 0.42, 0), arm = (s: number) => new THREE.CapsuleGeometry(0.055, 0.5, 2, 6).rotateZ(s * 0.12).translate(s * 0.26, 1.12, 0);
    const body = mergeGeometries([leg(-1), leg(1), new THREE.CapsuleGeometry(0.17, 0.42, 3, 8).scale(1, 1, 0.7).translate(0, 1.15, 0), arm(-1), arm(1)])!;
    const hand = (s: number) => new THREE.SphereGeometry(0.05, 6, 4).translate(s * 0.3, 0.82, 0);
    const skin = mergeGeometries([new THREE.SphereGeometry(0.115, 10, 8).translate(0, 1.58, 0), new THREE.CylinderGeometry(0.045, 0.05, 0.1, 6).translate(0, 1.45, 0), hand(-1), hand(1)])!;
    const b = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.9 }), spots.length), k = new THREE.InstancedMesh(skin, new THREE.MeshStandardMaterial({ roughness: 0.8 }), spots.length);
    const tones = ['#3a4a63', '#6b3f3a', '#4d5a44', '#2f2f36', '#7a6a55', '#5a4a6e'], skins = ['#d9b594', '#c99272', '#e6c7a8', '#a9764f'];
    spots.forEach((_, i) => { b.setColorAt(i, new THREE.Color(tones[i % tones.length])); k.setColorAt(i, new THREE.Color(skins[i % skins.length])); });
    b.castShadow = true; return { b, k, spots };
  }, []);
  // bekleme (idle) animasyonu: her figür kendi fazında hafifçe salınır ve ağırlık aktarır
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    people.spots.forEach(([x, z], i) => {
      e.set(Math.sin(t * 0.9 + i * 1.7) * 0.025, i * 2.4 + Math.sin(t * 0.23 + i) * 0.35, Math.sin(t * 0.6 + i * 0.9) * 0.03); q.setFromEuler(e);
      m.compose(p.set(x, Math.sin(t * 1.3 + i) * 0.006, z), q, one); people.b.setMatrixAt(i, m); people.k.setMatrixAt(i, m);
    });
    people.b.instanceMatrix.needsUpdate = people.k.instanceMatrix.needsUpdate = true;
  });
  const lamps = useMemo(() => {
    // geniş çaplı, alçak asılı, üç halkalı avizeler; ampuller emissive (ton eşleme dışı, bloom eşiğinin üstünde)
    const centers: V3[] = [[-17, 4.6, 0], [0, 5, 0], [16, 4.6, 0], [0, 4.6, -9.5], [0, 4.6, 9.5], [-9, 4.4, -8], [-9, 4.4, 8], [9, 4.4, -8], [9, 4.4, 8]];
    const tiers: [number, number, number][] = [[4.6, 0, tier === 'low' ? 16 : 34], [3.1, 0.5, tier === 'low' ? 10 : 22], [1.6, 1, tier === 'low' ? 6 : 12]];   // yarıçap, yükseklik farkı, ampul
    const per = tiers.reduce((n, t) => n + t[2], 0);
    const torus = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.012, 5, 48).rotateX(Math.PI / 2), M.bronze, centers.length * tiers.length);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 0.9), toneMapped: false }), centers.length * per);
    const chains = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4).translate(0, 0.5, 0), M.bronze, centers.length);
    let bi = 0;
    centers.forEach((c, i) => {
      chains.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(c[0], c[1] + 1, c[2]), new THREE.Quaternion(), new THREE.Vector3(1, 22, 1)));
      tiers.forEach(([rad, dy, n], k) => {
        torus.setMatrixAt(i * tiers.length + k, new THREE.Matrix4().compose(new THREE.Vector3(c[0], c[1] + dy, c[2]), new THREE.Quaternion(), new THREE.Vector3(rad, 4, rad)));
        for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2 + k; bulbs.setMatrixAt(bi++, new THREE.Matrix4().makeTranslation(c[0] + Math.cos(a) * rad, c[1] + dy - 0.14, c[2] + Math.sin(a) * rad)); }
      });
    });
    return { torus, bulbs, chains, rings: centers };
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
      <primitive object={people.b} /><primitive object={people.k} />
      <primitive object={lamps.torus} /><primitive object={lamps.bulbs} /><primitive object={lamps.chains} />
      {lamps.rings.slice(0, tier === 'low' ? 1 : 5).map((r, i) => <pointLight key={i} position={[r[0], r[1] - 0.4, r[2]]} color="#FFD700" intensity={14} distance={22} decay={1.7} />)}
    </group>
  );
}

/* ---------- ışık: güneş + gökyüzü dolgusu + ortam haritası ---------- */
export function Lighting({ hour, shadows, focus, outside }: { hour: number; shadows: boolean; focus: number; outside: boolean }) {
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
        <color attach="background" args={['#4a3a28']} />
        {[0, 1, 2, 3].map((i) => <Lightformer key={i} form="rect" intensity={0.9 + day * 0.8} color="#ffd9a6" position={[Math.cos(i * Math.PI / 2) * 10, 3, Math.sin(i * Math.PI / 2) * 10]} scale={[8, 8, 1]} target={[0, 0, 0]} />)}
        <Lightformer form="ring" intensity={2.2 * day + 0.3} color="#fff1d8" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={12} />
        <Lightformer form="rect" intensity={3.5 * day} color={color} position={[s[0] * 10, Math.max(2, s[1] * 10), s[2] * 10]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#ffc98a" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
      </Environment>
      <hemisphereLight args={['#E0F7FA', '#5a4a1e', 0.18 + day * 0.4]} />
      <ambientLight intensity={0.22} color="#FFD700" />
      {/* dış mekân güneşi: yalnızca avludayken (gölgesiz olduğu için içeride duvarlardan geçerdi) */}
      {outside && <directionalLight position={[s[0] * 100, Math.max(20, s[1] * 100), s[2] * 100]} intensity={1.6 + day * 1.6} color={color} />}
      <spotLight ref={sun} angle={0.42} penumbra={0.8} intensity={day * 3800} distance={170} decay={2} color="#E0F7FA"
        castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} />
      <spotLight ref={mih} position={[MIHRAB[0] - 9, 14, MIHRAB[2] - 1]} angle={0.3} penumbra={0.7} intensity={focus * 900} distance={30} decay={2} color="#ffe0b0" />
      <pointLight position={[-37.5, 6.5, 0]} intensity={14} distance={16} decay={2} color="#ffb877" />
    </group>
  );
}

/* ---------- dış mekân: avlu, batı cephesi, kurşun kubbe, minareler, ağaçlar, çit, şadırvan ---------- */
export function Exterior({ tier }: { tier: Tier }) {
  const M = useMemo(() => ({ wall: plaster('#c98a6a'), stone: marble('floor', [14, 10], 0.6), lead: lead(), white: plaster('#e6dccb'), wood: wood(), leaf: new THREE.MeshStandardMaterial({ color: '#3f6a3a', roughness: 1, flatShading: true }), iron: new THREE.MeshStandardMaterial({ color: '#23201d', roughness: 0.6, metalness: 0.5 }) }), []);
  const X = NARTHEX.x0 - 0.5;
  // kutu yüz sırası: +x, −x, +y, −y, +z, −z. İçeriden görünecek yüzler (alt yüz, narteks tarafındaki batı yüzü) çizilmez.
  const open = useMemo(() => { const none = new THREE.MeshBasicMaterial({ visible: false }); return { main: [M.wall, none, M.wall, none, M.wall, M.wall], upper: [M.wall, M.wall, M.wall, none, M.wall, M.wall] }; }, [M]);
  const inst = useMemo(() => {
    const tree = mergeGeometries([new THREE.CylinderGeometry(0.18, 0.26, 2.4, 6).translate(0, 1.2, 0).toNonIndexed(), new THREE.IcosahedronGeometry(1.9, 0).scale(1, 1.25, 1).translate(0, 4.1, 0)])!;
    let sd = 4; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const spots: [number, number, number][] = []; while (spots.length < (tier === 'low' ? 12 : 26)) { const x = -100 + r() * 52, z = -46 + r() * 92; if (Math.abs(z) < 7 || (x > -66 && Math.abs(z) < 12)) continue; spots.push([x, z, 0.8 + r() * 0.7]); }
    const trees = new THREE.InstancedMesh(tree, M.leaf, spots.length);
    spots.forEach(([x, z, k], i) => trees.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), new THREE.Vector3(k, k, k))));
    // çit: yolun iki yanında dikmeler + iki yatay ray
    const posts: number[] = []; for (let x = -100; x <= -48; x += 2) posts.push(x);
    const fence = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1.1, 0.08).translate(0, 0.55, 0), M.iron, posts.length * 2);
    posts.forEach((x, i) => { fence.setMatrixAt(i * 2, new THREE.Matrix4().makeTranslation(x, 0, -5.2)); fence.setMatrixAt(i * 2 + 1, new THREE.Matrix4().makeTranslation(x, 0, 5.2)); });
    return { trees, fence };
  }, [M, tier]);
  const seg = SEG[tier];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-75, -0.02, 0]} material={M.stone}><planeGeometry args={[70, 130]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={M.iron} position={[-74, 1, s * 5.2]}><boxGeometry args={[52, 0.05, 0.05]} /></mesh>)}
      {/* batı cephesi: kapı açıklığı (4 × 7,2 m) */}
      {[-1, 1].map((s) => <mesh key={s} material={M.wall} position={[X, 6, s * 16.3]}><boxGeometry args={[1, 12, 28.6]} /></mesh>)}
      <mesh material={M.wall} position={[X, 9.6, 0]}><boxGeometry args={[1, 4.8, 4]} /></mesh>
      <mesh material={M.lead} position={[(NARTHEX.x0 + NARTHEX.x1) / 2 - 0.5, 12.1, 0]}><boxGeometry args={[NARTHEX.x1 - NARTHEX.x0 + 1.4, 0.4, 61.4]} /></mesh>
      {[-1, 1].map((s) => <mesh key={`k${s}`} material={M.wood} position={[X - 0.7, 3.6, s * 2.6]} rotation={[0, s * 0.55, 0]}><boxGeometry args={[0.14, 7.2, 1.9]} /></mesh>)}
      {/* ana kütle: dıştan görünen duvarlar (içeriden arka yüzler çizilmez) */}
      <mesh material={open.main} position={[0, 13, 0]}><boxGeometry args={[66.4, 26, 2 * AISLE_Z + 1.2]} /></mesh>
      <mesh material={M.wall} position={[-33.2, 19, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[2 * AISLE_Z + 1.2, 14]} /></mesh>
      {/* gövde kütlesi ve kurşun kaplı kubbeler (dıştan) */}
      <mesh material={open.upper} position={[0, 33, 0]}><boxGeometry args={[2 * R + 8, 15, 2 * R + 8]} /></mesh>
      <mesh material={M.lead} position={[0, RING_Y - 0.5, 0]} scale={[1, DOME_RISE / R, 1]}><sphereGeometry args={[R + 0.9, seg, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh material={M.lead} position={[-R, ARCH_Y, 0]}><sphereGeometry args={[R + 0.8, seg, 12, -Math.PI / 2, Math.PI, 0, Math.PI / 2]} /></mesh>
      {/* dört minare */}
      {[[-40, -36], [-40, 36], [38, -34], [38, 34]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={M.white} position={[0, 28, 0]}><cylinderGeometry args={[1.9, 2.5, 56, 12]} /></mesh>
          <mesh material={M.white} position={[0, 44, 0]}><cylinderGeometry args={[3, 3, 1.2, 12]} /></mesh>
          <mesh material={M.lead} position={[0, 61, 0]}><coneGeometry args={[2.2, 10, 12]} /></mesh>
        </group>
      ))}
      {/* şadırvan */}
      <group position={[-58, 0, -15]}>
        <mesh material={M.white} position={[0, 0.5, 0]}><cylinderGeometry args={[3.2, 3.4, 1, 12]} /></mesh>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} material={M.white} position={[Math.cos(i * Math.PI / 4) * 3.6, 2.2, Math.sin(i * Math.PI / 4) * 3.6]}><cylinderGeometry args={[0.14, 0.14, 4.4, 6]} /></mesh>)}
        <mesh material={M.lead} position={[0, 5.4, 0]}><coneGeometry args={[4.6, 2.2, 8]} /></mesh>
      </group>
      <primitive object={inst.trees} /><primitive object={inst.fence} />
    </group>
  );
}
/** İç–dış geçiş: bölge değişince arka plan ve sis yoğunluğu anında değişir */
export function Atmosphere({ outside }: { outside: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(outside ? '#a9c9e8' : '#0d0906');
    scene.fog = new THREE.FogExp2(outside ? '#c4d8ea' : '#1a120b', outside ? 0.0045 : 0.0012);
    return () => { scene.fog = null; };
  }, [scene, outside]);
  return null;
}
export { APEX_Y };
