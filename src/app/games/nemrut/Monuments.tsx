/**
 * Nemrut — anıtlar: basamaklı kaideler, blok blok örülmüş oturan dev heykeller (başsız gövdeler), yerdeki dev başlar, aslan ve kartal
 * koruyucular, doğu terasında sunak ve ata stelleri, batı terasında el sıkışma stelleri ve Aslan Horoskobu, yazıt parçaları, bilgi tabelası.
 *
 * Heykeller gerçekte de üst üste konmuş büyük kireçtaşı bloklarından oluşur; gövdeler bu yüzden yuvarlatılmış blok kütlelerdir ve
 * yüzeylerinde derz çizgileri görünür (Topkapı kitinin kesme taş dokusu, kireçtaşı tonunda). Başlar ayrıntılıdır: yüz hatları, Pers başlığı
 * (tiara), tanrıçada meyve ve başak tacı, iki tanrıda sakal; bazı burunlar kırıktır. Boya yoktur: bugünkü aşınmış taş gösterilir.
 * "Sanal restorasyon" (ad bulmacası çözülünce): doğu terasının başları gövdelerine kalkar — bir canlandırmadır; gerçek başlar yerde durur.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ashlar, normalFrom, sbox, uvScale, withRepeat } from '../topkapi/kit';
import { FIGURES, STATUE, fallenSpot, statueSpots, type Figure } from './terrain';
import { ALTAR, ANCESTORS, FRAGMENTS, HOROSCOPE, PODIUM, ROCK_INFO, WEST_STELAE, type Stele } from './site';

const T = Math.PI * 2;
export const PODIUM_TOP = 2.4;
function stone(tint = '#d3c6ad', rx = 1, ry = 1) { const a = withRepeat(ashlar(1024), rx, ry); return new THREE.MeshStandardMaterial({ map: a.map, normalMap: a.normal, normalScale: new THREE.Vector2(0.9, 0.9), color: tint, roughness: 0.95 }); }
/** Yuvarlatılmış blok; UV dünya ölçeğinde (taş sıraları her ~4 m'de tekrar) */
const rb = (w: number, h: number, d: number, r = 0.18) => uvScale(new RoundedBoxGeometry(w, h, d, 2, r), Math.max(w, d) / 4, h / 4);
const ni = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const hash = (x: number, y: number, z: number) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

/** Derzsiz, benekli kireçtaşı (başlar için): aşınma lekeleri + liken benekleri */
function mottled() {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d')!, h = document.createElement('canvas'); h.width = h.height = n; const hg = h.getContext('2d')!;
  g.fillStyle = '#cfc2a8'; g.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n); let sd = 17; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1800; i++) { const x = r() * n, y = r() * n, s = 1 + r() * 9, d = r() < 0.5; g.fillStyle = d ? `rgba(90,75,55,${r() * 0.12})` : `rgba(255,248,235,${r() * 0.12})`; g.beginPath(); g.arc(x, y, s, 0, T); g.fill(); hg.fillStyle = d ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)'; hg.beginPath(); hg.arc(x, y, s, 0, T); hg.fill(); }
  for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.6 ? 'rgba(150,140,90,.35)' : 'rgba(60,60,50,.3)'; g.beginPath(); g.arc(r() * n, r() * n, 1 + r() * 3, 0, T); g.fill(); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 3); const nm = normalFrom(h, 2); nm.repeat.set(3, 3); return { map, normal: nm };
}

/* ---------- dev baş ---------- */
export function headGeometry(fig: Figure, seg = 30) {
  const s = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)).scale(0.86, 1.08, 0.94), p = s.attributes.position as THREE.BufferAttribute;
  const broken = fig === 'antiochos' || fig === 'herakles';            // kırık burunlar
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i); let z = p.getZ(i);
    if (z > 0.2) {
      const nose = Math.exp(-(x * x) / 0.012 - ((y + 0.05) ** 2) / 0.09) * (broken ? 0.07 : 0.2), brow = Math.exp(-((y - 0.27) ** 2) / 0.006) * Math.exp(-(x * x) / 0.25) * 0.08;
      const eye = -Math.exp(-((Math.abs(x) - 0.3) ** 2) / 0.012 - ((y - 0.16) ** 2) / 0.006) * 0.08, lid = Math.exp(-((Math.abs(x) - 0.3) ** 2) / 0.02 - ((y - 0.21) ** 2) / 0.002) * 0.03;
      const lips = Math.exp(-(x * x) / 0.05 - ((y + 0.42) ** 2) / 0.004) * 0.05, chin = Math.exp(-(x * x) / 0.08 - ((y + 0.75) ** 2) / 0.03) * 0.08, cheek = Math.exp(-((Math.abs(x) - 0.42) ** 2) / 0.04 - ((y + 0.1) ** 2) / 0.05) * 0.04;
      z += nose + brow + eye + lid + lips + chin + cheek;
    }
    const pit = (hash(Math.round(x * 14), Math.round(y * 14), Math.round(z * 14)) - 0.5) * 0.025;   // aşınma çukurları
    p.setXYZ(i, x * (1 + pit), y, z * (1 + pit));
  }
  const parts: THREE.BufferGeometry[] = [ni(s)];
  if (fig === 'zeus' || fig === 'herakles') {   // sakal: lüleler
    parts.push(ni(new THREE.SphereGeometry(0.6, 18, 12).scale(1.05, 0.95, 0.72).translate(0, -0.72, 0.42)));
    for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI - Math.PI / 2; parts.push(ni(new THREE.SphereGeometry(0.16, 8, 6).translate(Math.sin(a) * 0.52, -0.95 - Math.cos(a) * 0.18, 0.55 + Math.cos(a) * 0.12))); }
  }
  if (fig === 'kommagene') {   // meyve ve başak tacı: bant + meyveler + başak demeti
    parts.push(ni(new THREE.CylinderGeometry(0.86, 0.8, 0.5, 26).translate(0, 0.98, 0)));
    for (let i = 0; i < 14; i++) { const a = (i / 14) * T; parts.push(ni(new THREE.SphereGeometry(0.17 + (i % 3) * 0.03, 8, 6).translate(Math.cos(a) * 0.82, 1.32 + (i % 2) * 0.12, Math.sin(a) * 0.82))); }
    for (let i = 0; i < 7; i++) parts.push(ni(new THREE.ConeGeometry(0.08, 0.6, 5).rotateZ((i - 3) * 0.18).translate((i - 3) * 0.14, 1.75, 0.2)));
    for (const sx of [-1, 1]) parts.push(ni(new THREE.SphereGeometry(0.3, 10, 8).scale(1, 1.8, 0.6).translate(sx * 0.82, -0.2, -0.25)));   // saç bukleleri
  } else {   // Pers tiarası: alın bandı + yüksek, öne kıvrık külah + yanak/ense kapakları
    parts.push(ni(new THREE.CylinderGeometry(0.92, 0.88, 0.36, 26).translate(0, 0.86, 0)));
    const cone = new THREE.ConeGeometry(0.86, 1.7, 26, 6).translate(0, 1.85, -0.05), cp = cone.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), k = Math.max(0, (y - 1.3) / 1.4); cp.setZ(i, cp.getZ(i) + k * k * 0.55); }   // tepe öne eğik
    parts.push(ni(cone));
    for (const sx of [-1, 1]) parts.push(ni(new THREE.BoxGeometry(0.2, 1.25, 0.55).translate(sx * 0.86, 0.12, -0.12)));
    parts.push(ni(new THREE.BoxGeometry(1.5, 1.05, 0.22).translate(0, 0.2, -0.9)));
    for (let i = 0; i < 5; i++) parts.push(ni(new THREE.TorusGeometry(0.1, 0.03, 4, 10).translate((i - 2) * 0.32, 1.3, 0.62 - Math.abs(i - 2) * 0.05)));   // kabartma süs
  }
  const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g;
}

/* ---------- oturan gövde (başsız) ---------- */
function bodyGeometry() {
  const P = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0) => ni(g.rotateX(rx).translate(x, y, z));
  return mergeGeometries([
    P(rb(5, 4.2, 4.4, 0.12), 0, 2.1, -0.7),                    // taht bloğu
    P(rb(5, 2.2, 1.2, 0.12), 0, 5.3, -2.3),                    // taht arkalığı
    P(rb(4.1, 1.4, 2.8, 0.45), 0, 3.6, 1.1),                   // uyluklar (kucak)
    P(rb(1.25, 3.0, 1.35, 0.4), -1.05, 1.5, 2.4), P(rb(1.25, 3.0, 1.35, 0.4), 1.05, 1.5, 2.4),   // baldırlar
    P(rb(1.35, 0.5, 1.9, 0.2), -1.05, 0.25, 2.75), P(rb(1.35, 0.5, 1.9, 0.2), 1.05, 0.25, 2.75), // ayaklar
    P(rb(3.7, 3.4, 2.3, 0.7), 0, 5.7, -0.35),                  // gövde
    P(rb(4.6, 1.1, 2.3, 0.5), 0, 7.2, -0.4),                   // omuzlar
    P(rb(1.05, 2.7, 1.15, 0.45), -2.15, 5.6, -0.2), P(rb(1.05, 2.7, 1.15, 0.45), 2.15, 5.6, -0.2),  // üst kollar
    P(rb(0.95, 0.95, 2.5, 0.4), -1.75, 4.45, 1.0), P(rb(0.95, 0.95, 2.5, 0.4), 1.75, 4.45, 1.0),   // ön kollar dizlerin üstünde
    P(rb(1, 0.8, 0.9, 0.35), -1.6, 4.4, 2.35), P(rb(1, 0.8, 0.9, 0.35), 1.6, 4.4, 2.35),          // eller
    P(new THREE.CylinderGeometry(0.62, 0.7, 0.55, 18), 0, 8.0, -0.4),                                // kırık boyun
  ])!;
}
export const NECK_Y = 8.3;
/** Koruyucular: oturan aslan ve ayakta kartal (yuvarlatılmış kütleler) */
function lionGeometry() {
  const P = (g: THREE.BufferGeometry, x: number, y: number, z: number) => ni(g.translate(x, y, z));
  return mergeGeometries([P(rb(1.7, 1.2, 3.3, 0.5), 0, 0.6, 0), P(rb(1.6, 2.4, 1.6, 0.6), 0, 1.9, 0.9), P(new THREE.IcosahedronGeometry(1.05, 1), 0, 3.25, 1.2), P(new THREE.SphereGeometry(0.62, 14, 10).scale(1, 0.9, 1.2), 0, 3.3, 1.85),
    P(rb(0.5, 2.1, 0.55, 0.2), -0.5, 1.05, 2.1), P(rb(0.5, 2.1, 0.55, 0.2), 0.5, 1.05, 2.1), P(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6).rotateX(1.2), 0, 0.5, -1.9)])!;
}
function eagleGeometry() {
  const P = (g: THREE.BufferGeometry, x: number, y: number, z: number) => ni(g.translate(x, y, z));
  return mergeGeometries([P(rb(1.6, 0.8, 1.6, 0.2), 0, 0.4, 0), P(new THREE.SphereGeometry(0.9, 16, 12).scale(0.9, 1.6, 0.8), 0, 2.2, 0), P(rb(0.35, 2.4, 1.4, 0.15), -0.85, 2.2, -0.1), P(rb(0.35, 2.4, 1.4, 0.15), 0.85, 2.2, -0.1),
    P(new THREE.SphereGeometry(0.5, 14, 10), 0, 3.85, 0.15), P(new THREE.ConeGeometry(0.18, 0.55, 8).rotateX(Math.PI / 2 + 0.5), 0, 3.7, 0.7), P(rb(1.1, 1.2, 0.3, 0.1), 0, 0.9, -0.9)])!;
}

/* ---------- kabartma dokuları (yükseklik → normal haritası) ---------- */
function reliefTex(kind: 'dexiosis' | 'aslan', worn = 0) {
  const W = 256, H = 420, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  g.fillStyle = '#404040'; g.fillRect(0, 0, W, H); g.fillStyle = '#5a5a5a'; g.fillRect(10, 10, W - 20, H - 20); g.fillStyle = '#404040'; g.fillRect(18, 18, W - 36, H - 36);
  g.fillStyle = '#d8d8d8';
  if (kind === 'dexiosis') {
    const fig = (x: number, tall: number, tiara: boolean) => { g.beginPath(); g.ellipse(x, 120, 22, 26, 0, 0, T); g.fill(); if (tiara) { g.beginPath(); g.moveTo(x - 22, 104); g.lineTo(x + 2, 46 - tall); g.lineTo(x + 22, 104); g.fill(); } g.fillRect(x - 30, 146, 60, 150); g.beginPath(); g.moveTo(x - 34, 296); g.lineTo(x + 34, 296); g.lineTo(x + 40, 380); g.lineTo(x - 40, 380); g.fill(); };
    fig(78, 10, true); fig(178, 0, true);
    g.lineWidth = 14; g.strokeStyle = '#e8e8e8'; g.beginPath(); g.moveTo(104, 190); g.quadraticCurveTo(128, 214, 152, 190); g.stroke();   // el sıkışma
  } else {
    g.save(); g.translate(0, 40);
    g.beginPath(); g.ellipse(128, 250, 92, 46, 0, 0, T); g.fill(); g.beginPath(); g.ellipse(214, 200, 34, 40, 0, 0, T); g.fill();   // gövde, baş
    for (const x of [62, 96, 160, 196]) g.fillRect(x - 9, 270, 18, 90);
    g.lineWidth = 9; g.strokeStyle = '#d8d8d8'; g.beginPath(); g.moveTo(40, 240); g.quadraticCurveTo(10, 200, 28, 160); g.stroke();
    g.restore();
    g.fillStyle = '#ffffff';
    const star = (x: number, y: number, r: number, n = 8) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * T, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
    for (const [x, y] of HOROSCOPE.stars) star((x / 100) * W, (y / 100) * H + 40, 6);
    for (const pl of HOROSCOPE.planets) star((pl.at[0] / 100) * W, (pl.at[1] / 100) * H + 30, 15, 16);
    g.beginPath(); g.arc((HOROSCOPE.moon[0] / 100) * W, (HOROSCOPE.moon[1] / 100) * H + 40, 22, 0.6, T - 0.6); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
  }
  if (worn) { let sd = 7 + worn; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 300 * worn; i++) { g.fillStyle = `rgba(64,64,64,${r() * 0.8})`; g.beginPath(); g.arc(r() * W, r() * H, 3 + r() * 14, 0, T); g.fill(); } }
  const n = normalFrom(c, 5), col = document.createElement('canvas'); col.width = W; col.height = H; const cg = col.getContext('2d')!; cg.fillStyle = '#dccfb0'; cg.fillRect(0, 0, W, H); cg.globalAlpha = 0.15; cg.drawImage(c, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; return { map, normal: n };
}
function Stele({ s, mat }: { s: Stele; mat: THREE.MeshStandardMaterial }) {
  return (
    <group position={[s.x, 0, s.z]} rotation-y={Math.PI}>
      <mesh geometry={sbox(2.4, 0.7, 1.1)} material={mat} position={[0, 0.35, 0]} castShadow receiveShadow />
      <mesh position={[0, 0.7 + 1.6, 0]} castShadow receiveShadow material={mat}><boxGeometry args={[1.9, 3.2, 0.45]} /></mesh>
    </group>
  );
}

export function Monuments({ restoreEast, collected, placed, shadows, hi }: { restoreEast: React.MutableRefObject<number>; collected: string[]; placed: string[]; shadows: boolean; hi: boolean }) {
  const M = useMemo(() => ({ stone: stone('#d6c9b0'), podium: stone('#c4b79e'), dark: stone('#b8aa90'), headStone: (() => { const t = mottled(); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95 }); })() }), []);
  const G = useMemo(() => ({ body: bodyGeometry(), lion: lionGeometry(), eagle: eagleGeometry(), heads: Object.fromEntries(FIGURES.map((f) => [f.id, headGeometry(f.id, hi ? 34 : 18)])) as Record<Figure, THREE.BufferGeometry> }), [hi]);
  const reliefs = useMemo(() => {
    const mk = (kind: 'dexiosis' | 'aslan', worn: number) => { const t = reliefTex(kind, worn); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.95 }); };
    return { dex: mk('dexiosis', 0), lion: mk('aslan', 0), anc: [mk('dexiosis', 2), mk('dexiosis', 4)] };
  }, []);
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e7c27a', emissive: '#ffb347', emissiveIntensity: 1.2, roughness: 0.7 }), []);
  const beam = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), []);
  const headRefs = useRef<(THREE.Mesh | null)[]>([]), fragRefs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, r = restoreEast.current, e = r * r * (3 - 2 * r);
    glow.emissiveIntensity = 0.9 + Math.sin(t * 3) * 0.4;
    statueSpots(1).forEach((s, i) => {
      const m = headRefs.current[i]; if (!m) return; const f = fallenSpot(1, i), k = i === 2 ? 1.18 : 1, hh = STATUE.headH * 0.5 * k;
      const gx = f.x, gy = hh * 0.86, tx = s.x - 0.4 * k, ty = PODIUM_TOP + (NECK_Y + 1.05) * k;
      m.position.set(gx + (tx - gx) * e, gy + (ty - gy) * e + Math.sin(e * Math.PI) * 3, f.z + (s.z - f.z) * e);
      m.rotation.set(0, Math.PI / 2 + (1 - e) * f.tilt * 6, f.tilt * (1 - e) * 4);
    });
    FRAGMENTS.forEach((_, i) => { const g = fragRefs.current[i]; if (g) { g.rotation.y = t * 0.8; g.position.y = 0.6 + Math.sin(t * 2 + i) * 0.12; } });
  });
  return (
    <group>
      {([1, -1] as const).map((side) => {
        const rotY = side > 0 ? Math.PI / 2 : -Math.PI / 2, cx = side * (PODIUM.x0 + PODIUM.x1) / 2, L = PODIUM.z * 2;
        return (
          <group key={side}>
            {/* basamaklı kaide: üç sıra */}
            {[0, 1, 2].map((k) => <mesh key={k} geometry={sbox(PODIUM.x1 - PODIUM.x0 - k * 1.4, 0.8, L - k * 2)} material={M.podium} position={[cx - side * k * 0.7, 0.4 + k * 0.8, 0]} castShadow={shadows} receiveShadow />)}
            {statueSpots(side).map((s, i) => { const k = i === 2 ? 1.18 : 1, f = fallenSpot(side, i), hh = STATUE.headH * 0.5 * k;
              return (
                <group key={s.id}>
                  <mesh geometry={G.body} material={M.stone} position={[s.x, PODIUM_TOP, s.z]} rotation-y={rotY} scale={k} castShadow={shadows} receiveShadow />
                  {/* yerdeki baş (doğuda restorasyonda kalkar) */}
                  <mesh ref={side > 0 ? (m) => { headRefs.current[i] = m; } : undefined} geometry={G.heads[s.id]} material={M.headStone} scale={hh}
                    position={[f.x, hh * 0.86, f.z]} rotation={[0, rotY + f.tilt * 6, f.tilt * 4]} castShadow={shadows} receiveShadow />
                  {/* yerleştirilen Pers adı: tahtın önünde parlayan levha */}
                  {side > 0 && placed.some((p) => FRAGMENTS.find((x) => x.id === p)?.god === s.id) && <mesh position={[PODIUM.x1 + 0.06, 0.42, s.z]} rotation-y={rotY} material={glow}><boxGeometry args={[3, 0.5, 0.08]} /></mesh>}
                </group>); })}
            {([['kartal', -3], ['aslan', -4], ['kartal', 3], ['aslan', 4]] as const).map(([kind, i]) => (
              <mesh key={`${kind}${i}`} geometry={kind === 'aslan' ? G.lion : G.eagle} material={M.dark} position={[side * 92.5, PODIUM_TOP, i * STATUE.spacing - Math.sign(i) * 2.2]} rotation-y={rotY} scale={1.25} castShadow={shadows} receiveShadow />
            ))}
          </group>
        );
      })}
      {/* doğu terası: basamaklı sunak + ata stelleri (parçalı) */}
      {[0, 1, 2].map((k) => <mesh key={k} geometry={sbox(ALTAR.half * 2 - k * 1.6, 0.8, ALTAR.half * 2 - k * 1.6)} material={M.podium} position={[ALTAR.x, 0.4 + k * 0.8, ALTAR.z]} castShadow={shadows} receiveShadow />)}
      {ANCESTORS.map(([x, z], i) => { const h = 1.2 + ((i * 7) % 5) * 0.45; return (
        <group key={i} position={[x, 0, z]} rotation={[0, z > 0 ? Math.PI : 0, ((i * 13) % 5 - 2) * 0.03]}>
          <mesh geometry={sbox(2.2, 0.5, 0.9)} material={M.podium} position={[0, 0.25, 0]} receiveShadow />
          <mesh material={reliefs.anc[i % 2]} position={[0, 0.5 + h / 2, 0]} castShadow={shadows} receiveShadow><boxGeometry args={[1.8, h, 0.4]} /></mesh>
        </group>); })}
      {/* batı terası: el sıkışma stelleri + Aslan Horoskobu (kuzeye, terasa bakar) */}
      {WEST_STELAE.map((s) => (
        <group key={s.id}>
          <Stele s={s} mat={M.podium} />
          <mesh position={[s.x, 2.3, s.z - 0.24]} rotation-y={Math.PI} material={s.kind === 'aslan' ? reliefs.lion : reliefs.dex}><planeGeometry args={[1.86, 3.1]} /></mesh>
        </group>
      ))}
      {/* yazıt parçaları: parlayan taş + uzaktan görünen ışık sütunu */}
      {FRAGMENTS.map((f, i) => !collected.includes(f.id) && (
        <group key={f.id} position={[f.at[0], 0, f.at[1]]}>
          <group ref={(g) => { fragRefs.current[i] = g; }}><mesh material={glow} castShadow><dodecahedronGeometry args={[0.45, 0]} /></mesh></group>
          <mesh material={beam} position={[0, 10, 0]}><cylinderGeometry args={[0.3, 0.6, 20, 10, 1, true]} /></mesh>
        </group>
      ))}
      {/* bilgi tabelası */}
      <group position={[ROCK_INFO[0], 0, ROCK_INFO[1]]}>
        {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.7, 0]}><boxGeometry args={[0.1, 1.4, 0.1]} /><meshStandardMaterial color="#4a3826" /></mesh>)}
        <mesh position={[0, 1.35, -0.06]} rotation-x={-0.25}><boxGeometry args={[1.7, 0.9, 0.06]} /><meshStandardMaterial color="#6b5236" /></mesh>
        <mesh position={[0, 1.35, -0.1]} rotation-x={-0.25}><planeGeometry args={[1.55, 0.78]} /><meshStandardMaterial color="#e9dcc0" roughness={0.9} side={THREE.BackSide} /></mesh>
      </group>
    </group>
  );
}
