/**
 * Ortak manzara parçaları (Ani, İshak Paşa): dünya ölçekli UV'li kutu, kemer/niş silüetleri, 512 px taş dokusu,
 * dip kirlenmesi gölgelendiricisi, zemin ayrıntı dokusu, ot kartları, gölgeli güneş ve bulutlar.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { rng, type Tier } from './walkKit';

/* ---------- yardımcılar ---------- */
/** Dünya ölçekli UV'li kutu: doku her yüzde `s` metrede bir tekrar eder (uzun duvarlar gerilmez) */
export function bx(w: number, h: number, d: number, s = 4) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (uv.getX(k) * dims[f][0]) / s, (uv.getY(k) * dims[f][1]) / s); }
  return g;
}
/** Üçgen prizma çatı: mahya +y, uzunluk z boyunca */
export function gable(w: number, h: number, len: number) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); return g;
}
/** Kemerli açıklık silüeti (düz, koyu): pointed = sivri kemer */
export function archGeo(w: number, h: number, pointed = true) {
  const s = new THREE.Shape(), r = w / 2, sp = h - r; s.moveTo(-r, 0); s.lineTo(-r, sp);
  if (pointed) { s.quadraticCurveTo(-r, sp + r * 0.9, 0, sp + r * 1.25); s.quadraticCurveTo(r, sp + r * 0.9, r, sp); } else s.absarc(0, sp, r, Math.PI, 0, true);
  s.lineTo(r, 0); s.closePath(); return new THREE.ShapeGeometry(s, 6);
}
/** Cephedeki derin üçgen niş (Ani kiliselerinin tipik öğesi): üstü yarım daire kapanan dar, koyu kama */
export function vNicheGeo(w: number, h: number) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); s.closePath(); return new THREE.ShapeGeometry(s, 8); }

/* ---------- taş dokusu (512 px, metre başına ~128 px) ----------
 * Her blok kendi tonunda; ince, düşük karşıtlıklı derz; kenarlarda ışık/gölge; benek, yosun-leke ve dikey yağmur izi.
 * Ayrı gri tonlu kabartma haritası: derz derin, blok yüzü hafif pürüzlü. */
const texCache = new Map<string, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture }>();
export function stoneTex(key: string, palette: string[], courses: [number, number] = [40, 30], blockW: [number, number] = [70, 80]) {
  const hit = texCache.get(key); if (hit) return hit;
  const N = 512, c = document.createElement('canvas'), b = document.createElement('canvas'); c.width = c.height = b.width = b.height = N;
  const g = c.getContext('2d')!, h = b.getContext('2d')!, r = rng(key.split('').reduce((a, ch) => a + ch.charCodeAt(0) * 7, 3));
  g.fillStyle = '#6e5044'; g.fillRect(0, 0, N, N); h.fillStyle = '#202020'; h.fillRect(0, 0, N, N);
  let y = 0; while (y < N) { const ch = Math.min(N - y, courses[0] + r() * courses[1]); let x = -r() * blockW[0];
    while (x < N) { const w = blockW[0] + r() * blockW[1], col = new THREE.Color(palette[Math.floor(r() * palette.length)]); col.offsetHSL((r() - 0.5) * 0.015, (r() - 0.5) * 0.05, (r() - 0.5) * 0.05);
      const draw = (xx: number) => { g.fillStyle = `#${col.getHexString()}`; g.fillRect(xx + 1, y + 1, w - 2, ch - 2);
        g.fillStyle = 'rgba(255,240,220,.10)'; g.fillRect(xx + 1.5, y + 1.5, w - 3, 3); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(xx + 1.5, y + ch - 5, w - 3, 3.5);
        const v = 150 + r() * 50 | 0; h.fillStyle = `rgb(${v},${v},${v})`; h.fillRect(xx + 2, y + 2, w - 4, ch - 4);
        if (r() < 0.25) { g.fillStyle = 'rgba(30,20,15,.35)'; g.beginPath(); g.arc(xx + r() * w, y + (r() < 0.5 ? 2 : ch - 2), 3 + r() * 6, 0, Math.PI * 2); g.fill(); h.fillStyle = '#303030'; h.beginPath(); h.arc(xx + r() * w, y + 2, 3 + r() * 5, 0, Math.PI * 2); h.fill(); } };   // kırık kenar
      draw(x); if (x + w > N) draw(x - N); x += w; }
    y += ch; }
  for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${r() * 0.18})` : `rgba(255,245,230,${r() * 0.12})`; const s = 1 + r() * 2.2; g.fillRect(r() * N, r() * N, s, s); h.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.25})`; h.fillRect(r() * N, r() * N, s, s); }
  for (let i = 0; i < 26; i++) { const x = r() * N, len = 60 + r() * 220, gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(25,18,14,.16)'); gr.addColorStop(1, 'rgba(25,18,14,0)'); g.fillStyle = gr; g.save(); g.translate(x, r() * N * 0.6); g.fillRect(0, 0, 3 + r() * 8, len); g.restore(); }   // yağmur izi
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '110,115,70' : '170,160,120'},${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * N, r() * N, 10 + r() * 30, 6 + r() * 18, r() * 3, 0, Math.PI * 2); g.fill(); }   // liken lekeleri
  const mk = (cv: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const out = { map: mk(c, true), bump: mk(b, false) }; texCache.set(key, out); return out;
}
/** Dip kirlenmesi + geniş ölçekli ton dalgası: aynı doku tekrarını kırar, yapıyı zemine oturtur */
export function weather(mat: THREE.MeshStandardMaterial, deepBase = -1000) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <map_fragment>', `#include <map_fragment>
      float baseY = vWPos.y > -15.0 ? 0.0 : ${deepBase.toFixed(1)};
      float grime = 1.0 - 0.38 * (1.0 - smoothstep(0.0, 2.2, vWPos.y - baseY));
      float wave = 0.9 + 0.1 * sin(vWPos.x * 0.21 + sin(vWPos.z * 0.17) * 2.0) * sin(vWPos.y * 0.33 + vWPos.z * 0.05);
      diffuseColor.rgb *= grime * wave;`);
  };
  return mat;
}
/** Zemin ayrıntısı: kuru ot lifleri, toprak lekeleri, çakıl (tekrarlanan, köşe renkleriyle çarpılır) */
export function groundTex() {
  const N = 512, c = document.createElement('canvas'), b = document.createElement('canvas'); c.width = c.height = b.width = b.height = N; const g = c.getContext('2d')!, h = b.getContext('2d')!, r = rng(321);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, N, N); h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,120,90' : '235,235,225'},${0.15 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * N, r() * N, 20 + r() * 60, 12 + r() * 40, r() * 3, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 5200; i++) { const x = r() * N, y = r() * N, l = 4 + r() * 10, a = -Math.PI / 2 + (r() - 0.5) * 1.2, v = r(); g.strokeStyle = v < 0.5 ? `rgba(70,75,30,${0.25 + r() * 0.3})` : `rgba(255,250,210,${0.2 + r() * 0.3})`; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); h.strokeStyle = v < 0.5 ? 'rgba(40,40,40,.5)' : 'rgba(220,220,220,.5)'; h.beginPath(); h.moveTo(x, y); h.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); h.stroke(); }
  for (let i = 0; i < 500; i++) { const x = r() * N, y = r() * N, s = 1.5 + r() * 3.5; g.fillStyle = `rgba(${90 + r() * 60 | 0},${80 + r() * 40 | 0},${70 + r() * 30 | 0},.7)`; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); h.fillStyle = '#e0e0e0'; h.beginPath(); h.arc(x, y, s, 0, Math.PI * 2); h.fill(); }
  const mk = (cv: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(240, 240); t.anisotropy = 8; return t; };
  return { map: mk(c, true), bump: mk(b, false) };
}
/** Ot kartları: alfa kesimli üç kesişen düzlem; normal yukarı (arka yüz kararmaz) */
export function useGrassCards() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d')!, r = rng(13);
    for (let i = 0; i < 46; i++) { const x = 10 + r() * 108, hgt = 50 + r() * 72, lean = (r() - 0.5) * 34, v = 0.6 + r() * 0.5; g.strokeStyle = `rgb(${150 * v | 0},${145 * v | 0},${70 * v | 0})`; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + lean * 0.3, 128 - hgt * 0.6, x + lean, 128 - hgt); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const a = new THREE.PlaneGeometry(1.0, 0.55); a.translate(0, 0.275, 0); const b2 = a.clone().rotateY(Math.PI / 2), c2 = a.clone().rotateY(Math.PI / 4);
    const merged = new THREE.BufferGeometry(); const parts = [a, b2, c2]; const pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = []; let off = 0;
    for (const p of parts) { pos.push(...(p.attributes.position.array as Float32Array)); uv.push(...(p.attributes.uv.array as Float32Array)); for (let i = 0; i < p.attributes.position.count; i++) nor.push(0, 1, 0); idx.push(...Array.from(p.index!.array as Uint16Array, (x) => x + off)); off += p.attributes.position.count; }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); merged.setIndex(idx);
    const mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 });
    mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);'); };   // arka yüz de yukarı bakan normali kullanır: kararmaz
    return { geo: merged, mat };   // normal yukarı: kartlar zeminle aynı ışığı alır, kart kenarı görünmez
  }, []);
}
/* ---------- güneş, gölge, bulut ---------- */
/** Gölgeli güneş: gölge kamerası oyuncuyu izler (±75 m), böylece küçük bir gölge haritası yeter */
export function Sun({ tier, dir, intensity = 7.5, color = '#ffe2bd' }: { tier: Tier; dir: THREE.Vector3; intensity?: number; color?: string }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  useEffect(() => { const l = ref.current; if (!l) return; const cam = l.shadow.camera as THREE.OrthographicCamera; cam.left = cam.bottom = -75; cam.right = cam.top = 75; cam.near = 10; cam.far = 420; cam.updateProjectionMatrix(); l.shadow.bias = -0.0005; l.shadow.normalBias = 0.05; }, []);
  useFrame(({ camera }) => { const l = ref.current; if (!l) return; const f = camera.getWorldDirection(_v).multiplyScalar(35); l.target.position.set(camera.position.x + f.x, camera.position.y, camera.position.z + f.z); l.position.copy(l.target.position).addScaledVector(dir, 200); l.target.updateMatrixWorld(); });
  const size = tier === 'high' ? 2048 : 1024;
  return <directionalLight ref={ref} intensity={intensity} color={color} castShadow={tier !== 'low'} shadow-mapSize-width={size} shadow-mapSize-height={size} />;
}
const _v = new THREE.Vector3();
/** Yumuşak bulut kümeleri (kamera yönüne dönen düz kartlar) */
export function Clouds() {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d')!, r = rng(8); for (let i = 0; i < 22; i++) { const x = 40 + r() * 176, y = 50 + r() * 40, rad = 18 + r() * 34, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  const list = useMemo(() => { const r = rng(44); return Array.from({ length: 14 }, () => { const a = r() * Math.PI * 2, d = 700 + r() * 700; return { p: [Math.sin(a) * d, 180 + r() * 160, Math.cos(a) * d] as [number, number, number], s: 260 + r() * 300 }; }); }, []);
  return <group>{list.map((c, i) => <sprite key={i} position={c.p} scale={[c.s, c.s * 0.45, 1]}><spriteMaterial map={tex} transparent depthWrite={false} fog={false} opacity={0.85} /></sprite>)}</group>;
}


/** Dağ: gürültülü dönel profil, sırtlar ve köşe renkleriyle kar örtüsü (snow: karın başladığı yükseklik oranı) */
export function mountainGeo(R: number, H: number, seed: number, snow: number, low = '#9a8e78') { const r = rng(seed), pts: THREE.Vector2[] = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(R * (1 - t) ** 1.35 + 0.01, H * t)); }
    const g = new THREE.LatheGeometry(pts, 64); const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), rockC = new THREE.Color('#7d7a7e'), snowC = new THREE.Color('#f5f7fa'), lowC = new THREE.Color(low);
    const ridges = Array.from({ length: 9 }, () => [r() * Math.PI * 2, 0.04 + r() * 0.06]);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); let k = 1; for (const [ra, amp] of ridges) k += amp * Math.cos((a - ra) * 3) * Math.sin(y / H * Math.PI); p.setXYZ(i, x * k, y, z * k);
      const t = y / H, sn = THREE.MathUtils.smoothstep(t + 0.06 * Math.sin(a * 7), snow - 0.05, snow + 0.05); c.copy(lowC).lerp(rockC, Math.min(1, t * 2.5)).lerp(snowC, sn); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
