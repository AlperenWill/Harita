/**
 * Kapalıçarşı — kalabalık simülasyonu (saf ajan mantığı) + GPU instancing ile çizim.
 *
 * NEDEN SOKAK GRAFI ÜZERİNDE AJAN?
 *   500+ kişi için kuvvet tabanlı (sosyal kuvvet) bir model O(n²) ya da uzamsal ızgara ister; mobilde pahalı. Çarşıda insanlar zaten
 *   sokak boyunca akar: her ajan bir sokak kenarında 1B konumla (t) + şerit kaydırmasıyla (lane) temsil edilir. Güncelleme O(n).
 *
 * AJAN MATEMATİĞİ (her karede, dt saniye):
 *   konum   p = A + d·t + n·lane          (A: kenarın başı, d: birim yön, n: sola dik birim vektör)
 *   ilerleme t ← t + s·v·dt               (s = ±1 yön; v ~ 1,0–1,5 m/sn)
 *   kavşak: t uç noktayı aşınca bağlı kenarlardan biri seçilir; ağırlıklar: düz devam 2, dönüş 1, geri dönüş 0,15 (çıkmazda 1)
 *   vitrin: yürürken her saniye p=0,06 olasılıkla duvara yakın şeride kayıp 2–6 sn durur ve dükkâna döner
 *   sohbet: p=0,02 olasılıkla aynı kenarda 2 m içindeki biriyle birlikte 3–5 sn durur, yüz yüze bakarlar
 *   oyuncudan kaçınma: oyuncu 1,4 m içindeyse şerit oyuncudan uzağa kayar (1,6 m/sn) ve hız yarıya iner
 *   yönelim: yaw ← yaw + Δ·(1 − e^(−10·dt)) (ani dönüş yok)
 *
 * ÇİZİM: iki InstancedMesh (her biri TEK draw call):
 *   - uzak (low-poly siluet, ~90 üçgen) — kalabalığın çoğu
 *   - yakın (ayrıntılı: kollar, saç/başörtüsü, ~600 üçgen) — kameraya en yakın 48 kişi + esnaf
 *   Yürüme animasyonu CPU'da değil VERTEX SHADER'da: her köşenin "parça" kimliği (aPart) var; bacak/kol köşeleri kalça/omuz
 *   ekseninde sin(uTime·ω + faz)·genlik·hareket kadar döndürülür. CPU her karede yalnızca matris + 4 sayı (faz, hareket, ten, başörtüsü) yazar.
 *   Renk: kıyafet = instanceColor; ten ve saç/başörtüsü parça kimliğinden parça gölgelendiricisinde seçilir (doku yok).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, type Layout, type V2 } from './ProceduralStreetGenerator';

export interface Agent { e: number; s: 1 | -1; t: number; lane: number; laneTo: number; v: number; state: 0 | 1 | 2; timer: number; x: number; z: number; yaw: number; phase: number; skin: number; scarf: number; color: THREE.Color; partner: number }
export interface Crowd { agents: Agent[]; adj: Map<number, number[]>; edges: { a: number; b: number; A: V2; B: V2; d: V2; n: V2; len: number; w: number }[] }

const CLOTH = ['#8c2f2a', '#2f4a6b', '#3d5a3a', '#6b4a7a', '#c9a35a', '#2a2a2e', '#7a6a55', '#b8b0a0', '#a0522d', '#1f6f6a', '#d2691e', '#5a5a64', '#e6dccb', '#3a3a52'];
export function createCrowd(L: Layout, n: number, seed: number): Crowd {
  const r = rng(seed ^ 0x9e3779b9), edges = L.edges.filter((e) => e.b >= 0).map((e) => {
    const A = L.nodes[e.a]!, B = L.nodes[e.b]!, len = Math.hypot(B.x - A.x, B.z - A.z), d: V2 = [(B.x - A.x) / len, (B.z - A.z) / len];
    return { a: e.a, b: e.b, A: [A.x, A.z] as V2, B: [B.x, B.z] as V2, d, n: [-d[1], d[0]] as V2, len, w: e.w };
  });
  const adj = new Map<number, number[]>(); edges.forEach((e, k) => { for (const nd of [e.a, e.b]) adj.set(nd, [...(adj.get(nd) ?? []), k]); });
  const total = edges.reduce((s, e) => s + e.len * e.w, 0), agents: Agent[] = [];
  for (let i = 0; i < n; i++) {
    // yoğunluk sokak alanıyla orantılı (geniş ana caddede daha kalabalık)
    let x = r() * total, k = 0; while (k < edges.length - 1 && x > edges[k].len * edges[k].w) { x -= edges[k].len * edges[k].w; k++; }
    const e = edges[k], lane = (r() - 0.5) * (e.w - 1.0);
    agents.push({ e: k, s: r() < 0.5 ? 1 : -1, t: r() * e.len, lane, laneTo: lane, v: 0.95 + r() * 0.55, state: 0, timer: 0, x: 0, z: 0, yaw: 0, phase: r() * 6.28, skin: r(), scarf: r() < 0.3 ? 1 : 0, color: new THREE.Color(CLOTH[Math.floor(r() * CLOTH.length)]).multiplyScalar(0.8 + r() * 0.3), partner: -1 });
  }
  const c = { agents, adj, edges }; stepCrowd(c, 0, null, r); return c;
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export function stepCrowd(c: Crowd, dt: number, player: V2 | null, r: () => number = Math.random) {
  const { agents, edges, adj } = c;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i], e = edges[a.e];
    if (a.state !== 0) { a.timer -= dt; if (a.timer <= 0) { a.state = 0; a.partner = -1; } }
    let v = a.state === 0 ? a.v : 0;
    if (player) {   // oyuncudan kaçınma: şerit kaydır, yavaşla
      const dx = player[0] - a.x, dz = player[1] - a.z, d = Math.hypot(dx, dz);
      if (d < 1.4) { const side = dx * e.n[0] + dz * e.n[1] > 0 ? -1 : 1; a.laneTo = Math.max(-(e.w / 2 - 0.4), Math.min(e.w / 2 - 0.4, a.lane + side * 0.8)); v *= 0.5; }
    }
    if (a.state === 0 && dt > 0) {
      if (r() < 0.06 * dt) { a.state = 1; a.timer = 2 + r() * 4; a.laneTo = Math.sign(a.lane || 1) * (e.w / 2 - 0.55); }   // vitrine bak (şeride yavaşça kayar)
      else if (r() < 0.02 * dt) {   // sohbet: aynı kenarda yakın biri
        for (let j = 0; j < agents.length; j++) { const b = agents[j]; if (j === i || b.e !== a.e || b.state !== 0 || Math.abs(b.t - a.t) > 2) continue; a.state = b.state = 2; a.timer = b.timer = 3 + r() * 2; a.partner = j; b.partner = i; break; }
      }
    }
    a.t += a.s * v * dt;
    if ((a.s > 0 && a.t > e.len) || (a.s < 0 && a.t < 0)) {   // kavşak (yalnızca gidiş yönündeki uç): sonraki kenarı seç
      const node = a.s > 0 ? e.b : e.a, opts = adj.get(node) ?? [a.e], w = opts.map((k) => (k === a.e ? (opts.length === 1 ? 1 : 0.15) : Math.abs(edges[k].d[0] * e.d[0] + edges[k].d[1] * e.d[1]) > 0.9 ? 2 : 1));
      let x = r() * w.reduce((p, q) => p + q, 0), k = 0; while (k < opts.length - 1 && x > w[k]) { x -= w[k]; k++; }
      const ne = edges[opts[k]], px = a.x, pz = a.z; a.e = opts[k]; a.s = ne.a === node ? 1 : -1;
      // süreklilik: mevcut konumu yeni kenarın eksenine izdüşür (dik dönüşte sıçrama olmaz), şerit hedefi sonra yavaşça daralır
      a.t = (px - ne.A[0]) * ne.d[0] + (pz - ne.A[1]) * ne.d[1]; a.lane = (px - ne.A[0]) * ne.n[0] + (pz - ne.A[1]) * ne.n[1];
      a.laneTo = Math.max(-(ne.w / 2 - 0.5), Math.min(ne.w / 2 - 0.5, a.laneTo));
    }
    { const m = 0.8 * dt, dl = a.laneTo - a.lane; a.lane += Math.abs(dl) < m ? dl : Math.sign(dl) * m; }   // şerit değişimi en çok 0,8 m/sn
    const E = edges[a.e]; a.x = E.A[0] + E.d[0] * a.t + E.n[0] * a.lane; a.z = E.A[1] + E.d[1] * a.t + E.n[1] * a.lane;
    const want = a.state === 1 ? Math.atan2(-E.n[0] * Math.sign(a.lane), -E.n[1] * Math.sign(a.lane)) : a.state === 2 && a.partner >= 0 ? Math.atan2(-(agents[a.partner].x - a.x), -(agents[a.partner].z - a.z)) : Math.atan2(-E.d[0] * a.s, -E.d[1] * a.s);
    a.yaw += wrap(want - a.yaw) * (dt > 0 ? 1 - Math.exp(-10 * dt) : 1);
  }
}

/* ---------- geometri: parça kimlikli tek ağ ---------- */
// aPart: 0 kıyafet · 1 ten · 2 sol bacak · 3 sağ bacak · 4 sol kol · 5 sağ kol · 6 saç/başörtüsü
function part(g: THREE.BufferGeometry, id: number) { const o = g.index ? g.toNonIndexed() : g; o.deleteAttribute('uv'); o.setAttribute('aPart', new THREE.Float32BufferAttribute(new Array(o.attributes.position.count).fill(id), 1)); return o; }
export function personGeometry(hi: boolean) {
  const s = hi ? 10 : 6;
  const parts = [
    part(new THREE.CylinderGeometry(0.17, 0.2, 0.62, s).translate(0, 1.18, 0), 0),                       // gövde
    part(new THREE.CylinderGeometry(0.2, 0.17, 0.12, s).translate(0, 0.88, 0), 0),                       // kalça
    part(new THREE.SphereGeometry(0.115, s + 2, hi ? 8 : 4).translate(0, 1.62, 0), 1),                    // baş
    part(new THREE.CylinderGeometry(0.075, 0.06, 0.86, s).translate(-0.09, 0.45, 0), 2),                 // sol bacak
    part(new THREE.CylinderGeometry(0.075, 0.06, 0.86, s).translate(0.09, 0.45, 0), 3),
  ];
  if (hi) parts.push(
    part(new THREE.CylinderGeometry(0.05, 0.045, 0.6, 6).translate(-0.24, 1.15, 0), 4), part(new THREE.CylinderGeometry(0.05, 0.045, 0.6, 6).translate(0.24, 1.15, 0), 5),
    part(new THREE.SphereGeometry(0.05, 6, 4).translate(-0.24, 0.84, 0), 1), part(new THREE.SphereGeometry(0.05, 6, 4).translate(0.24, 0.84, 0), 1),
    part(new THREE.SphereGeometry(0.124, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.63, 0.005), 6),   // saç / başörtüsü
    part(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8).translate(0, 1.5, 0), 1),                          // boyun
    part(new THREE.BoxGeometry(0.1, 0.05, 0.2).translate(-0.09, 0.025, -0.04), 2), part(new THREE.BoxGeometry(0.1, 0.05, 0.2).translate(0.09, 0.025, -0.04), 3),
  );
  else parts.push(part(new THREE.CylinderGeometry(0.21, 0.19, 0.5, 4).translate(0, 1.15, 0), 0));
  const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g;
}
/** Yürüme animasyonu + parça renkleri: MeshStandardMaterial'a gölgelendirici enjeksiyonu */
export function personMaterial(time: { value: number }) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPart; attribute vec4 aParams; uniform float uTime; varying float vPart; varying vec4 vParams;\nvec3 swing(vec3 p, float py, float a){ float c=cos(a), s=sin(a); float y=p.y-py; return vec3(p.x, py + y*c - p.z*s, y*s + p.z*c); }')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPart = aPart; vParams = aParams;
        float ph = uTime * 6.5 + aParams.x, mv = aParams.y;
        float leg = sin(ph) * 0.55 * mv, arm = sin(ph) * 0.45 * mv + sin(uTime * 1.3 + aParams.x) * 0.04;
        if (aPart > 1.5 && aPart < 2.5) transformed = swing(transformed, 0.88, leg);
        else if (aPart > 2.5 && aPart < 3.5) transformed = swing(transformed, 0.88, -leg);
        else if (aPart > 3.5 && aPart < 4.5) transformed = swing(transformed, 1.45, -arm);
        else if (aPart > 4.5 && aPart < 5.5) transformed = swing(transformed, 1.45, arm);
        transformed.y += abs(sin(ph)) * 0.035 * mv;   // adım sekmesi`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vPart; varying vec4 vParams;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 skin = mix(vec3(0.93, 0.74, 0.6), vec3(0.45, 0.3, 0.2), vParams.z);
        if (vPart > 0.5 && vPart < 1.5) diffuseColor.rgb = skin;
        else if (vPart > 1.5 && vPart < 3.5) diffuseColor.rgb = diffuseColor.rgb * 0.35 + vec3(0.04);
        else if (vPart > 3.5 && vPart < 5.5) diffuseColor.rgb *= 0.9;
        else if (vPart > 5.5) diffuseColor.rgb = vParams.w > 0.5 ? diffuseColor.rgb * 0.6 + vec3(0.25, 0.12, 0.15) : vec3(0.08, 0.06, 0.05);`);
  };
  return m;
}
/** Bir InstancedMesh: kapasite kadar örnek; aParams örnek başı özniteliği */
export function crowdMesh(hi: boolean, capacity: number, time: { value: number }) {
  const g = personGeometry(hi); g.setAttribute('aParams', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
  const m = new THREE.InstancedMesh(g, personMaterial(time), capacity); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3); m.frustumCulled = false; m.count = 0; return m;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _y = new THREE.Vector3(0, 1, 0);
export interface Static { x: number; z: number; yaw: number; color: THREE.Color; skin: number; scarf: number; gesture: number }
/**
 * LOD dağıtımı: kameraya en yakın `nearCap` kişi ayrıntılı ağa, kalanlar siluet ağına yazılır. Esnaf (statik) her zaman ayrıntılı.
 * Uzaklık sıralaması tam sıralama değil: önce yarıçap testi (12 m), taşarsa en yakınlar seçilir.
 */
export function writeInstances(c: Crowd, statics: Static[], lo: THREE.InstancedMesh, hi: THREE.InstancedMesh, cam: V2, nearCap: number, t: number) {
  const near: number[] = [], far: number[] = [];
  c.agents.forEach((a, i) => (Math.hypot(a.x - cam[0], a.z - cam[1]) < 12 ? near : far).push(i));
  if (near.length > nearCap) { near.sort((i, j) => Math.hypot(c.agents[i].x - cam[0], c.agents[i].z - cam[1]) - Math.hypot(c.agents[j].x - cam[0], c.agents[j].z - cam[1])); far.push(...near.splice(nearCap)); }
  const put = (mesh: THREE.InstancedMesh, k: number, x: number, z: number, yaw: number, col: THREE.Color, ph: number, mv: number, skin: number, scarf: number) => {
    mesh.setMatrixAt(k, _m.compose(_p.set(x, 0, z), _q.setFromAxisAngle(_y, yaw), _s)); mesh.setColorAt(k, col);
    const P = mesh.geometry.getAttribute('aParams') as THREE.InstancedBufferAttribute; P.setXYZW(k, ph, mv, skin, scarf);
  };
  let k = 0;
  for (const i of near) { const a = c.agents[i]; put(hi, k++, a.x, a.z, a.yaw, a.color, a.phase, a.state === 0 ? 1 : 0.06, a.skin, a.scarf); }
  for (const s of statics) if (k < hi.instanceMatrix.count) put(hi, k++, s.x, s.z, s.yaw, s.color, s.gesture, 0.08 + 0.06 * Math.max(0, Math.sin(t * 0.7 + s.gesture)), s.skin, s.scarf);
  hi.count = k; k = 0;
  for (const i of far) { if (k >= lo.instanceMatrix.count) break; const a = c.agents[i]; put(lo, k++, a.x, a.z, a.yaw, a.color, a.phase, a.state === 0 ? 1 : 0, a.skin, a.scarf); }
  lo.count = k;
  for (const m of [lo, hi]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; (m.geometry.getAttribute('aParams') as THREE.InstancedBufferAttribute).needsUpdate = true; }
  return { near: hi.count, far: lo.count };
}
