/**
 * Yerebatan — sahne: 336 sütun (tek InstancedMesh = 1 çizim çağrısı), tonozlu tavan, platformlar, su, sis ve ışık.
 *
 * Işık: ortam çok karanlık. Her sütunun dibinde turuncu/kırmızı bir ışık kaynağı var gibi görünür: aslında suya düşen 336
 * toplamalı parıltı (1 InstancedMesh) + sütun shader'ında yükseklikle sönen turuncu öz ışıma. Gerçek ışık hesabı yalnızca
 * oyuncuya en yakın N sütunda yapılır (N kademeye göre 4/6/8 nokta ışığı; ışık havuzu her 0,25 sn'de yeniden atanır).
 * Sis: üstel sis (FogExp2). Uzaktaki sütunlar sisin içinde kaybolur; kameranın uzak düzlemi sise göre kısaltılır
 * (düşük kademede sis daha yoğun → daha az görünen geometri, daha kısa uzak düzlem).
 *
 * Su shader matematiği (MeshReflectorMaterial = düzlemsel yansıma + normal haritası melezi):
 *   1) Su düzlemine göre aynalanmış sanal bir kamerayla sahne düşük çözünürlüklü bir hedefe çizilir (düzlemsel yansıma).
 *   2) Su yüzeyinde her piksel bu dokuyu ekran uzayındaki konumundan okur: uv = projeksiyon(p)
 *   3) Dalga: prosedürel normal haritası (dosya değil, açılışta gürültüden üretilir) zamanla kaydırılır; normalin xy
 *      bileşeni okuma noktasını bozar: uv' = uv + n.xy · distortion → yansıma titrer.
 *   4) Renk = mix(suyun koyu rengi, yansıma, mixStrength) — sığ açıda yansıma baskın, dik bakınca koyu su.
 * Düşük kademede yansıma kapatılır; yalnızca normal haritalı koyu su kalır.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CEILING_Y, COLUMN, COLUMNS, DECK_Y, GRID, POIS, SIZE, WALKWAYS, colX, rowZ } from './cistern';

export type Tier = 'low' | 'medium' | 'high';
export const FOG: Record<Tier, { density: number; far: number; lights: number; reflect: number }> = {
  low: { density: 0.075, far: 34, lights: 4, reflect: 0 },
  medium: { density: 0.055, far: 48, lights: 6, reflect: 256 },
  high: { density: 0.042, far: 64, lights: 8, reflect: 512 },
};
const FOG_COLOR = '#140b07';

/* ---------- prosedürel dokular ---------- */
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function heightToNormal(h: Uint8ClampedArray, n: number, strength: number) {
  const out = new Uint8ClampedArray(n * n * 4), H = (x: number, y: number) => h[((((y + n) % n) * n) + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    out[i] = (-dx / l * 0.5 + 0.5) * 255; out[i + 1] = (dy / l * 0.5 + 0.5) * 255; out[i + 2] = (1 / l * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return out;
}
const toTex = (data: Uint8ClampedArray, n: number, srgb = false) => {
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
};
/** 1K taş: dikey damarlı mermer/kireçtaşı gövde; yükseklikten normal haritası (dikişsiz tekrar) */
export function stoneTextures(n = 1024) {
  const r = rng(17), col = new Uint8ClampedArray(n * n * 4), hei = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    // tüm frekanslar 2π'nin tam katı → doku her iki yönde dikişsiz tekrar eder
    const T = Math.PI * 2, u = (x / n) * T, v = (y / n) * T;
    const vein = Math.sin(u * 6 + Math.sin(v * 1) * 3 + Math.sin(v * 5) * 0.6) * 0.5 + 0.5;
    const grain = (Math.sin(u * 140 + v * 47) + Math.sin(u * 27 - v * 210)) * 0.25;
    const base = 150 + vein * 30 + grain * 18 + Math.sin(v * 3 + u) * 6 + (r() - 0.5) * 14, i = (y * n + x) * 4;
    col[i] = base + 6; col[i + 1] = base - 4; col[i + 2] = base - 16; col[i + 3] = 255;
    const h = 128 + vein * 50 + grain * 40 + (r() - 0.5) * 30; hei[i] = hei[i + 1] = hei[i + 2] = h; hei[i + 3] = 255;
  }
  return { map: toTex(col, n, true), normal: toTex(heightToNormal(hei, n, 2.5), n) };
}
/** Tuğla (tavan tonozları ve duvarlar) */
function brickTextures(n = 512) {
  const r = rng(5), col = new Uint8ClampedArray(n * n * 4), hei = new Uint8ClampedArray(n * n * 4), bh = n / 16, bw = n / 6;
  for (let y = 0; y < n; y++) {
    const row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0, jy = y % bh < 3;
    for (let x = 0; x < n; x++) {
      const jx = (x + off) % bw < 3, i = (y * n + x) * 4, joint = jx || jy, t = joint ? 70 : 120 + ((Math.floor((x + off) / bw) * 7 + row * 13) % 9) * 6 + (r() - 0.5) * 16;
      col[i] = t + 22; col[i + 1] = t - 2; col[i + 2] = t - 22; col[i + 3] = 255; hei[i] = hei[i + 1] = hei[i + 2] = joint ? 40 : 170 + (r() - 0.5) * 30; hei[i + 3] = 255;
    }
  }
  return { map: toTex(col, n, true), normal: toTex(heightToNormal(hei, n, 2), n) };
}
/** Su normali: üst üste binen iki ölçekte yumuşak gürültü (tekrarlanabilir dokuda dikişsiz) */
export function waterNormal(n = 256) {
  const hei = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x / n) * Math.PI * 2, v = (y / n) * Math.PI * 2;
    const h = Math.sin(u * 3 + Math.sin(v * 2) * 1.5) * 0.35 + Math.sin(v * 5 + Math.cos(u * 4) * 1.2) * 0.25 + Math.sin((u + v) * 7) * 0.12;
    const i = (y * n + x) * 4; hei[i] = hei[i + 1] = hei[i + 2] = 128 + h * 100; hei[i + 3] = 255;
  }
  return toTex(heightToNormal(hei, n, 3), n);
}

/* ---------- sütun geometrisi: kaide + gövde + başlık birleşik (tek InstancedMesh) ---------- */
function columnGeometry(seg: number) {
  const shaft = new THREE.CylinderGeometry(COLUMN.r * 0.92, COLUMN.r, COLUMN.top - COLUMN.bottom, seg, 1, true).translate(0, (COLUMN.top + COLUMN.bottom) / 2, 0);
  const capital = new THREE.CylinderGeometry(0.72, COLUMN.r * 0.95, 0.75, seg, 1).translate(0, COLUMN.top + 0.37, 0);
  const abacus = new THREE.BoxGeometry(1.2, 0.22, 1.2).translate(0, COLUMN.top + 0.86, 0);
  const torus = new THREE.TorusGeometry(COLUMN.r + 0.03, 0.06, 4, seg).rotateX(Math.PI / 2).translate(0, 0.15, 0);
  const parts = [shaft, capital, abacus, torus].map((g) => g.toNonIndexed());
  // gövde dokusu dikeyde 3 kez tekrar etsin
  const uv = parts[0].attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 3);
  return mergeGeometries(parts)!;
}

export function Columns({ tier }: { tier: Tier }) {
  const { map, normal } = useMemo(() => stoneTextures(tier === 'low' ? 512 : 1024), [tier]);
  const geo = useMemo(() => columnGeometry(tier === 'low' ? 10 : 16), [tier]);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map, normalMap: normal, roughness: 0.75, metalness: 0, color: '#e8d9c4' });
    // Sahte alttan aydınlatma: her sütunun dibindeki spot ışığının gövdeye vuran turuncu parıltısı.
    // emissive += turuncu · exp(-1,1·y) · (0,35 + 0,65·yanal bakış) — 336 sütun için ek ışık hesabı yok.
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.42, 0.14) * exp(-1.1 * max(vY, 0.0)) * 0.55 * diffuseColor.rgb;');
    };
    return m;
  }, [map, normal]);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, COLUMNS.length);
    const tavus = POIS.find((p) => p.id === 'tavus-gozu')!;
    let k = 0; const r = rng(23), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    for (const [x, z] of COLUMNS) {
      // Tavus Gözü sütunu ayrı çizilir (özel doku); burada sıfır ölçek
      const hide = Math.abs(x - tavus.pos[0]) < 0.01 && Math.abs(z - tavus.pos[2]) < 0.01;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
      m.setMatrixAt(k++, new THREE.Matrix4().compose(v.set(x, 0, z), q, hide ? s.set(0, 0, 0) : s.set(1, 0.97 + r() * 0.06, 1)));
    }
    m.castShadow = false; m.receiveShadow = false;   // gölge yalnızca Medusa başları ve giriş kapısında
    return m;
  }, [geo, mat]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <primitive object={mesh} />;
}

/** Tavus Gözü (Ağlayan) sütun: gövdesi göz/gözyaşı kabartmalı */
export function HensEyeColumn() {
  const p = POIS.find((x) => x.id === 'tavus-gozu')!;
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d')!;
    g.fillStyle = '#8f8676'; g.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 46) for (let x = (y / 46) % 2 ? 0 : 32; x < 256; x += 64) {
      g.fillStyle = '#6f675a'; g.beginPath(); g.ellipse(x + 16, y + 20, 20, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a69c8a'; g.beginPath(); g.ellipse(x + 16, y + 20, 8, 6, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(40,30,20,.5)'; g.beginPath(); g.moveTo(x + 16, y + 34); g.quadraticCurveTo(x + 22, y + 42, x + 16, y + 44); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t;
  }, []);
  return (
    <mesh position={[p.pos[0], (COLUMN.top + COLUMN.bottom) / 2, p.pos[2]]}>
      <cylinderGeometry args={[COLUMN.r * 0.95, COLUMN.r * 1.02, COLUMN.top - COLUMN.bottom, 16, 1, true]} />
      <meshStandardMaterial map={tex} roughness={0.35} metalness={0.05} color="#d8cbb7" />
    </mesh>
  );
}

/** Tavan: her hücrede tuğla bir çapraz tonoz (yaklaşık: basık kubbe) — tek InstancedMesh */
export function Vaults({ tier }: { tier: Tier }) {
  const { map, normal } = useMemo(() => brickTextures(), []);
  const mesh = useMemo(() => {
    const g = new THREE.SphereGeometry(1, tier === 'low' ? 8 : 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ map, normalMap: normal, roughness: 0.95, side: THREE.BackSide, color: '#b69c82' });
    const cells: [number, number][] = [];
    for (let i = -1; i < GRID.cols; i++) for (let j = -1; j < GRID.rows; j++) cells.push([colX(i) + GRID.dx / 2, rowZ(j) + GRID.dz / 2]);
    const m = new THREE.InstancedMesh(g, mat, cells.length);
    cells.forEach(([x, z], k) => m.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(x, COLUMN.top + 0.95, z), new THREE.Quaternion(), new THREE.Vector3(GRID.dx * 0.72, 1.1, GRID.dz * 0.72))));
    return m;
  }, [map, normal, tier]);
  return <primitive object={mesh} />;
}

export function Walls() {
  const { map, normal } = useMemo(() => brickTextures(), []);
  const mats = useMemo(() => [SIZE.len, SIZE.wid].map((w) => {
    const m = new THREE.MeshStandardMaterial({ map: map.clone(), normalMap: normal.clone(), roughness: 0.95, color: '#9a8270' });
    m.map!.repeat.set(w / 6, (CEILING_Y + 1.5) / 6); m.normalMap!.repeat.copy(m.map!.repeat); m.map!.needsUpdate = m.normalMap!.needsUpdate = true; return m;
  }), [map, normal]);
  const h = CEILING_Y + 1.5, y = h / 2 - 1.3;
  return (
    <group>
      <mesh material={mats[0]} position={[0, y, -SIZE.wid / 2]}><planeGeometry args={[SIZE.len, h]} /></mesh>
      <mesh material={mats[0]} position={[0, y, SIZE.wid / 2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[SIZE.len, h]} /></mesh>
      <mesh material={mats[1]} position={[-SIZE.len / 2, y, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[SIZE.wid, h]} /></mesh>
      <mesh material={mats[1]} position={[SIZE.len / 2, y, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[SIZE.wid, h]} /></mesh>
      <mesh position={[0, CEILING_Y + 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[SIZE.len, SIZE.wid]} /><meshBasicMaterial color="#0b0605" /></mesh>
    </group>
  );
}

/** Ahşap ziyaretçi platformları + korkuluklar */
export function Walkways() {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.7 }), []);
  const rail = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1c14', roughness: 0.6, metalness: 0.3 }), []);
  return (
    <group>
      {WALKWAYS.map((r, i) => {
        const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, long = w > d;
        return (
          <group key={i}>
            <mesh material={wood} position={[cx, DECK_Y - 0.08, cz]}><boxGeometry args={[w, 0.16, d]} /></mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} material={rail} position={long ? [cx, DECK_Y + 0.95, cz + s * (d / 2 - 0.05)] : [cx + s * (w / 2 - 0.05), DECK_Y + 0.95, cz]}>
                <boxGeometry args={long ? [w, 0.06, 0.06] : [0.06, 0.06, d]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ---------- ışık: 336 sahte ışık (instanced) + oyuncuya yakın N gerçek ışık ---------- */
export function ColumnLights({ tier, player }: { tier: Tier; player: React.MutableRefObject<{ x: number; z: number }> }) {
  const glows = useMemo(() => {
    // sütun dibinde suya düşen ışık: yumuşak kenarlı radyal parıltı (tek InstancedMesh, toplamalı)
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const disc = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2);
    const gm = new THREE.MeshBasicMaterial({ color: '#ff7a2e', alphaMap: new THREE.CanvasTexture(c), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const a = new THREE.InstancedMesh(disc, gm, COLUMNS.length);
    COLUMNS.forEach(([x, z], k) => a.setMatrixAt(k, new THREE.Matrix4().makeTranslation(x, 0.02, z)));
    return a;
  }, []);
  const pool = useRef<THREE.PointLight[]>([]);
  const n = FOG[tier].lights;
  const last = useRef(0);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.25) return; last.current = clock.elapsedTime;
    const p = player.current;
    const near = COLUMNS.map(([x, z], i) => ({ i, d: (x - p.x) ** 2 + (z - p.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, n);
    near.forEach(({ i }, k) => { const L = pool.current[k]; if (L) L.position.set(COLUMNS[i][0] + 0.5, 0.35, COLUMNS[i][1] + 0.3); });
  });
  return (
    <group>
      <primitive object={glows} />
      {Array.from({ length: n }, (_, k) => <pointLight key={k} ref={(l) => { if (l) pool.current[k] = l; }} color="#ff7a32" intensity={9} distance={7.5} decay={1.8} />)}
    </group>
  );
}

export function Water({ tier }: { tier: Tier }) {
  const normal = useMemo(() => { const t = waterNormal(); t.repeat.set(SIZE.len / 6, SIZE.wid / 6); return t; }, []);
  const res = FOG[tier].reflect;
  useFrame((_, dt) => { normal.offset.x += dt * 0.012; normal.offset.y += dt * 0.007; });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}><planeGeometry args={[SIZE.len, SIZE.wid]} /><meshBasicMaterial color="#060403" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[SIZE.len, SIZE.wid]} />
        {res > 0 ? (
          <MeshReflectorMaterial resolution={res} mirror={0.6} mixBlur={1.2} blur={[180, 60]} mixStrength={2.4} mixContrast={1.1}
            depthScale={0} minDepthThreshold={0.9} maxDepthThreshold={1} color="#1a100b" metalness={0.4} roughness={0.35}
            normalMap={normal} normalScale={new THREE.Vector2(0.35, 0.35)} distortionMap={normal} distortion={0.25} />
        ) : (
          <meshStandardMaterial color="#1a100b" metalness={0.6} roughness={0.25} normalMap={normal} normalScale={new THREE.Vector2(0.5, 0.5)} />
        )}
      </mesh>
    </group>
  );
}

/** Sis: kademeye göre yoğunluk + uzak düzlem */
export function CisternFog({ tier }: { tier: Tier }) {
  const { scene, camera } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(FOG_COLOR);
    scene.fog = new THREE.FogExp2(FOG_COLOR, FOG[tier].density);
    const c = camera as THREE.PerspectiveCamera; c.far = FOG[tier].far; c.near = 0.05; c.updateProjectionMatrix();
    return () => { scene.fog = null; };
  }, [scene, camera, tier]);
  return <ambientLight intensity={0.05} color="#ffb48a" />;
}
