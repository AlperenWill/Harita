/**
 * Dev heykeller: oturan gövdeler, yere düşmüş başlar, LOD ve köşe rengiyle (vertex color) "restore" geçişi.
 *
 * KÖŞE RENGİ KARIŞIMI: her köşede iki renk saklanır — `color` (bugünkü aşınmış kireçtaşı) ve `restored` (canlandırma rengi).
 * Parça gölgelendiricisinde   c = (1 − a) · c_aşınmış + a · c_canlandırma ,  a = uRestore · maske   hesaplanır.
 * Doku değiştirme yok: tek uniform (uRestore) değişir, geçiş anlıktır ve bellek artmaz. Maske, heykelin yukarısından aşağıya süpüren
 * bir dalgadır: maske = smoothstep(y_dalga − 0,6, y_dalga + 0,6, …) → renk baştan aşağı "akar".
 * Restore ayrıca başları gövdelerine geri taşır (yerdeki konum → omuz üstü, yumuşak eğriyle).
 * ÖNEMLİ: Canlandırma renkleri VARSAYIMSALDIR. Nemrut heykellerinin özgün boyasına dair bu çalışmada kaynak bulunamadı; kırmızı, mavi ve
 * altın tonları bir "nasıl görünmüş olabilir" canlandırmasıdır, arkeolojik rekonstrüksiyon değildir.
 * LOD: teras görünümünde başlar ayrıntılıdır (yüz hatları, sakal, başlık kabartması: ~2,5k üçgen/baş); tümülüs kuş bakışında basit siluet (~120 üçgen).
 * Gölge: sahnede yalnızca bu heykeller gölge üretir ve alır.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STATUE, fallenSpot, statueSpots, type Figure } from './terrain';

const W = new THREE.Color('#b8ad9a');                    // aşınmış kireçtaşı
const PAL = { skin: '#d9a47a', red: '#b3261e', blue: '#1f4fa3', gold: '#e2b23c', white: '#efe9dc', green: '#3b7a4a', dark: '#3a2a22' };
const hash = (x: number, y: number, z: number) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

/** Geometriye iki renk özniteliği yaz: aşınmış (gürültülü gri-bej) ve canlandırma (pick fonksiyonundan) */
function paint(g: THREE.BufferGeometry, pick: (x: number, y: number, z: number) => string) {
  const p = g.attributes.position as THREE.BufferAttribute, a = new Float32Array(p.count * 3), b = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 0.82 + hash(Math.round(x * 6), Math.round(y * 6), Math.round(z * 6)) * 0.3, streak = 1 - Math.max(0, Math.sin(x * 9 + z * 7) - 0.75) * 0.9;
    a[i * 3] = W.r * n * streak; a[i * 3 + 1] = W.g * n * streak; a[i * 3 + 2] = W.b * n * streak * 0.97;
    c.set(pick(x, y, z)); b[i * 3] = c.r; b[i * 3 + 1] = c.g; b[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.setAttribute('restored', new THREE.BufferAttribute(b, 3)); return g;
}
const ni = (g: THREE.BufferGeometry) => { const o = g.index ? g.toNonIndexed() : g; o.deleteAttribute('uv'); return o; };

/** Baş: yüz hatları küre üzerinde yer değiştirmeyle; figüre göre başlık ve sakal. hi = ayrıntılı LOD */
export function headGeometry(fig: Figure, hi: boolean) {
  const seg = hi ? 28 : 6, s = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)).scale(0.86, 1.08, 0.94), p = s.attributes.position as THREE.BufferAttribute;
  if (hi) for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (z > 0.2) {
      const nose = Math.exp(-(x * x) / 0.012 - ((y + 0.05) ** 2) / 0.09) * 0.2, brow = Math.exp(-((y - 0.27) ** 2) / 0.006) * (1 - Math.exp(-(x * x) / 0.01)) * Math.exp(-(x * x) / 0.25) * 0.07;
      const eye = -Math.exp(-((Math.abs(x) - 0.3) ** 2) / 0.012 - ((y - 0.16) ** 2) / 0.006) * 0.07, lips = Math.exp(-(x * x) / 0.05 - ((y + 0.42) ** 2) / 0.004) * 0.05, chin = Math.exp(-(x * x) / 0.08 - ((y + 0.75) ** 2) / 0.03) * 0.08;
      z += nose + brow + eye + lips + chin;
    }
    p.setXYZ(i, x, y, z);
  }
  const parts: THREE.BufferGeometry[] = [ni(s)];
  const bearded = fig === 'zeus' || fig === 'herakles';
  if (bearded) parts.push(ni(new THREE.SphereGeometry(0.62, hi ? 16 : 5, hi ? 10 : 4).scale(1.05, 0.95, 0.75).translate(0, -0.72, 0.42)));
  if (fig === 'kommagene') parts.push(ni(new THREE.CylinderGeometry(0.78, 0.72, 0.7, hi ? 20 : 6).translate(0, 1.15, 0)), ni(new THREE.SphereGeometry(0.95, hi ? 16 : 5, hi ? 8 : 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1).translate(0, 0.72, -0.05)));
  else parts.push(ni(new THREE.ConeGeometry(0.82, 1.5, hi ? 20 : 6).translate(0, 1.5, -0.05)), ni(new THREE.CylinderGeometry(0.9, 0.86, 0.34, hi ? 20 : 6).translate(0, 0.86, 0)));   // Pers tiarası + alın bandı
  if (hi && !bearded) for (const sx of [-1, 1]) parts.push(ni(new THREE.BoxGeometry(0.16, 1.2, 0.5).translate(sx * 0.86, 0.1, -0.1)));   // tiaranın yanak kanatları
  const g = mergeGeometries(parts)!; g.computeVertexNormals();
  const robe = fig === 'antiochos' || fig === 'apollon' ? PAL.blue : fig === 'kommagene' ? PAL.green : PAL.red;
  return paint(g, (x, y, z) => {
    if (y > 0.7) return fig === 'kommagene' ? (Math.sin(x * 9) * Math.sin(z * 9) > 0 ? PAL.gold : PAL.green) : y < 1.05 ? PAL.gold : Math.sin(y * 9) > 0.55 ? PAL.gold : robe;   // başlık: bantlar
    if (bearded && y < -0.38 && z > 0) return PAL.dark;
    if (z > 0.55 && Math.abs(Math.abs(x) - 0.3) < 0.1 && Math.abs(y - 0.16) < 0.06) return PAL.white;     // gözler
    if (z > 0.6 && Math.abs(x) < 0.2 && Math.abs(y + 0.42) < 0.05) return PAL.red;                        // dudak
    return z < -0.3 ? PAL.dark : PAL.skin;
  });
}
/** Oturan gövde: taş bloklardan (taht, dizler, gövde, omuzlar) */
export function bodyGeometry(fig: Figure) {
  const B = (w: number, h: number, d: number, x: number, y: number, z: number) => ni(new THREE.BoxGeometry(w, h, d, 2, 3, 2).translate(x, y, z));
  const g = mergeGeometries([B(4.6, 1.2, 4.4, 0, 0.6, -0.3), B(3.9, 1.6, 2.2, 0, 2, 1), B(4.3, 3.9, 2.9, 0, 3.6, -0.9), B(5, 1.0, 3, 0, 5.9, -0.9), B(1, 2.3, 1.1, -1.35, 1.55, 1.75), B(1, 2.3, 1.1, 1.35, 1.55, 1.75)])!;
  g.computeVertexNormals();
  const robe = fig === 'antiochos' || fig === 'apollon' ? PAL.blue : fig === 'kommagene' ? PAL.green : PAL.red;
  return paint(g, (x, y, z) => (y < 1.25 ? PAL.white : y > 5.4 ? robe : Math.abs(x) < 0.35 && z > 0 ? PAL.gold : Math.sin(y * 2.4) > 0.9 ? PAL.gold : robe));
}
/** Aslan ve kartal: sıranın iki ucundaki koruyucular (stilize bloklar) */
function guardianGeometry(kind: 'aslan' | 'kartal') {
  const B = (w: number, h: number, d: number, x: number, y: number, z: number) => ni(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const g = kind === 'aslan' ? mergeGeometries([B(1.9, 2.6, 3.2, 0, 1.3, 0), B(1.5, 1.5, 1.5, 0, 3.2, 1.1), ni(new THREE.ConeGeometry(0.5, 0.7, 4).translate(0, 3.1, 2.1))])! : mergeGeometries([B(1.6, 3.4, 1.6, 0, 1.7, 0), B(1, 1, 1.1, 0, 3.9, 0.2), ni(new THREE.ConeGeometry(0.28, 0.8, 4).rotateX(Math.PI / 2).translate(0, 3.9, 1))])!;
  g.computeVertexNormals(); return paint(g, (_x, y) => (kind === 'aslan' ? (y > 2.6 ? PAL.gold : '#c98a4a') : y > 3.4 ? PAL.white : '#6b4a2f'));
}

/** Köşe rengi karışımı yapan malzeme. uWave: süpürme dalgasının yüksekliği (dünya y) */
export function restoreMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: false });
  const u = { uRestore: { value: 0 }, uTop: { value: 10 } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 restored;\nvarying vec3 vRestored;\nvarying float vWy;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRestored = restored;\nvec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\nvWy = (modelMatrix * wp4).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRestored;\nvarying float vWy;\nuniform float uRestore;\nuniform float uTop;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // c = (1 − a)·c_aşınmış + a·c_canlandırma;  a: yukarıdan aşağı süpüren dalga
        float wave = uTop + 1.0 - uRestore * (uTop + 2.5);
        float a = smoothstep(wave - 0.6, wave + 0.6, vWy) * step(0.001, uRestore);
        diffuseColor.rgb = mix(diffuseColor.rgb, vRestored, a);`);
  };
  return m;
}

export function Colossi({ side, hi, restore, shadows }: { side: 1 | -1; hi: boolean; restore: React.MutableRefObject<number>; shadows: boolean }) {
  const spots = useMemo(() => statueSpots(side), [side]);
  const mat = useMemo(restoreMaterial, []);
  const bodies = useMemo(() => spots.map((s) => bodyGeometry(s.id)), [spots]);
  const heads = useMemo(() => spots.map((s) => headGeometry(s.id, hi)), [spots, hi]);
  const guard = useMemo(() => ({ aslan: guardianGeometry('aslan'), kartal: guardianGeometry('kartal') }), []);
  useEffect(() => () => { heads.forEach((g) => g.dispose()); }, [heads]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const rotY = side > 0 ? Math.PI / 2 : -Math.PI / 2;      // yüzler tümülüsten dışarı
  useFrame(() => {
    const r = restore.current, e = r * r * (3 - 2 * r); mat.userData.u.uRestore.value = r; mat.userData.u.uTop.value = STATUE.total + 1.5;
    spots.forEach((s, i) => {
      const m = refs.current[i]; if (!m) return; const f = fallenSpot(side, i), k = i === 2 ? 1.18 : 1;
      // baş: yerdeki yerinden omuzların üstüne, yay çizerek
      m.position.set(f.x + (s.x - f.x) * e, STATUE.headH * 0.5 * k + (STATUE.seatH * k + STATUE.headH * 0.55 * k - STATUE.headH * 0.5 * k) * e + Math.sin(e * Math.PI) * 2.2, f.z + (s.z - f.z) * e);
      m.rotation.set(0, rotY, f.tilt * (1 - e) * 4);
    });
  });
  return (
    <group>
      {spots.map((s, i) => { const k = i === 2 ? 1.18 : 1; return (
        <group key={s.id}>
          <mesh geometry={bodies[i]} material={mat} position={[s.x, 0, s.z]} rotation={[0, rotY, 0]} scale={k} castShadow={shadows} receiveShadow={shadows} />
          <mesh ref={(m) => { refs.current[i] = m; }} geometry={heads[i]} material={mat} scale={STATUE.headH * 0.5 * k} castShadow={shadows} receiveShadow={shadows} />
        </group>); })}
      {([['kartal', -3], ['aslan', -4], ['kartal', 3], ['aslan', 4]] as const).map(([k, i]) => (
        <mesh key={`${k}${i}`} geometry={guard[k]} material={mat} position={[side * (92 + 0.5), 0, i * STATUE.spacing - Math.sign(i) * 2.2]} rotation={[0, rotY, 0]} castShadow={shadows} receiveShadow={shadows} />
      ))}
    </group>
  );
}
