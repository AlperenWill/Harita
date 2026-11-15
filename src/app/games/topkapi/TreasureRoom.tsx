/**
 * Enderun Hazinesi: Kaşıkçı Elması ve Topkapı Hançeri.
 *
 * Neden: Hazine nesneleri küçük ve ayrıntılıdır; etkileyici olan ışıkla ilişkileridir. Bu yüzden burada etkileşim "döndürme"dir:
 * kamera vitrine kendiliğinden yaklaşır (macro), oyuncu nesneyi sürükleyerek ya da iki parmakla 360° çevirir.
 *
 * ELMAS SHADER'I (ışık kırılması taklidi; ışın izleme yok):
 *   1) Yüzeyler düz (flat) normalli fasetlerdir; her faset bakış yönünü kendi normaline göre kırar.
 *   2) Kırılan yön üç kanal için biraz farklı kırılma indisiyle hesaplanır (dağılma/dispersiyon):
 *        d_R = refract(v, n, 1/2.40), d_G = refract(v, n, 1/2.42), d_B = refract(v, n, 1/2.45)
 *      Elmasın indisi ~2,42'dir; kanallar arası fark abartılıdır ki gökkuşağı pırıltısı görünsün.
 *   3) Her yön, sahne yerine prosedürel bir "ışık ortamına" bakar: env(d) = keskin parlak şeritler (vitrin spotları) + loş zemin.
 *      İç yansımayı taklit için yön, faset normaliyle bir kez daha yansıtılıp karıştırılır.
 *   4) Fresnel ile dış yansıma eklenir. Taş döndükçe fasetlerin gördüğü şeritler değişir → renkler kayar.
 * Pil tasarrufunda/düşük kademede shader yerine düz fiziksel malzeme kullanılır (pırıltı kapalı).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { THINGS } from './palace';
import { gold, plaster } from './materials';

const vert = /* glsl */ `varying vec3 vW; varying vec3 vV; void main() { vec4 p = vec4(position, 1.0);
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
#endif
  vec4 w = modelMatrix * p; vW = w.xyz; vV = normalize(w.xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }`;
const frag = /* glsl */ `
varying vec3 vW; varying vec3 vV; uniform float uTime; uniform vec3 uTint;
float env(vec3 d) {                       // prosedürel ışık ortamı: üç keskin şerit + üstten spot + loş taban
  float a = atan(d.z, d.x), s = 0.0;
  s += pow(max(0.0, cos(a * 3.0 + d.y * 4.0)), 24.0) * 2.2;
  s += pow(max(0.0, d.y), 6.0) * 2.6;
  s += pow(max(0.0, sin(a * 7.0 - d.y * 9.0 + 1.3)), 40.0) * 1.6;
  return s * 1.3 + 0.14;
}
void main() {
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));               // faset normali (düz)
  if (dot(n, vV) > 0.0) n = -n;
  vec3 col = vec3(0.0);
  float ior[3]; ior[0] = 2.40; ior[1] = 2.42; ior[2] = 2.45;
  for (int i = 0; i < 3; i++) {
    vec3 d = refract(vV, n, 1.0 / ior[i]);
    d = mix(d, reflect(d, normalize(n + vec3(0.31, 0.17, -0.23))), 0.55);   // iç yansıma taklidi
    col[i] = env(normalize(d));
  }
  float fres = pow(1.0 - max(dot(-vV, n), 0.0), 3.0);
  col = col * uTint + fres * env(reflect(vV, n)) * 0.9;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function gemMaterial(tint: string, fancy: boolean): THREE.Material {
  if (!fancy) return new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.05, metalness: 0, clearcoat: 1, flatShading: true, envMapIntensity: 1.5 });
  return new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Color(tint) } } });
}
/** Armut biçimli taş: az segmentli torna (lathe) → belirgin fasetler */
function pearGeometry() {
  const pts = [[0, -0.5], [0.16, -0.42], [0.3, -0.2], [0.34, 0.02], [0.27, 0.22], [0.15, 0.4], [0.05, 0.5], [0, 0.52]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 9).toNonIndexed();
}

/** Vitrin spotu: soğuk/parlak (hazine ışığı); hedef nesnesi dünya konumuna elle yerleştirilir */
function Spot({ at }: { at: [number, number, number] }) {
  const ref = useRef<THREE.SpotLight>(null!);
  useEffect(() => { ref.current.target.position.set(...at); ref.current.target.updateMatrixWorld(); }, [at]);
  return <spotLight ref={ref} position={[0, 3.9, 0.7]} angle={0.24} penumbra={0.5} intensity={70} distance={6} color="#eaf3ff" />;
}
export function TreasureRoom({ spin, active, fancy }: { spin: React.MutableRefObject<number>; active: React.MutableRefObject<string | null>; fancy: boolean }) {
  const M = useMemo(() => ({ wall: plaster('#4a5468'), floor: plaster('#2b3040', 0.35), velvet: plaster('#3a0f1c', 1), glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.1, roughness: 0.02, depthWrite: false }), gold: gold(),
    diamond: gemMaterial('#f4faff', fancy), small: gemMaterial('#ffffff', fancy), emerald: gemMaterial('#27c46b', fancy), steel: new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 1, roughness: 0.18 }), enamel: new THREE.MeshStandardMaterial({ color: '#1d3f8f', roughness: 0.3 }) }), [fancy]);
  const G = useMemo(() => ({ pear: pearGeometry(), brilliant: new THREE.OctahedronGeometry(0.03, 0), cab: new THREE.IcosahedronGeometry(0.03, 0) }), []);
  const ring = useMemo(() => {   // çevredeki 49 pırlanta: iki sıra
    const m = new THREE.InstancedMesh(G.brilliant, M.small, 49); let k = 0;
    for (const [n, rx, ry] of [[27, 0.115, 0.15], [22, 0.14, 0.18]] as const) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; m.setMatrixAt(k++, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry + 0.01, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(a, a * 2, 0)), new THREE.Vector3(0.5, 0.5, 0.5))); }
    return m;
  }, [G, M.small]);
  const dia = useRef<THREE.Group>(null!), dag = useRef<THREE.Group>(null!);
  const [kas, han] = [THINGS.find((t) => t.id === 'kasikci')!, THINGS.find((t) => t.id === 'hancer')!];
  useFrame((_, dt) => {
    // boşta yavaşça döner; incelenen nesne oyuncunun çevirdiği açıyı izler
    for (const [g, id] of [[dia.current, 'kasikci'], [dag.current, 'hancer']] as const) g.rotation.y = active.current === id ? spin.current : g.rotation.y + dt * 0.35;
  });
  return (
    <group>
      {/* hazine ışığı: soğuk ve parlak */}
      <ambientLight intensity={0.7} color="#d6e6ff" />
      <pointLight position={[0, 3.8, 0.5]} intensity={45} distance={16} decay={1.8} color="#dfeeff" />
      <mesh material={M.floor} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 8]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.2, 0]} material={M.wall}><planeGeometry args={[16, 8]} /></mesh>
      {([[0, -4, 0, 16], [0, 4, Math.PI, 16], [-8, 0, Math.PI / 2, 8], [8, 0, -Math.PI / 2, 8]] as const).map(([x, z, r, w], i) => <mesh key={i} material={M.wall} position={[x, 2.1, z]} rotation={[0, r, 0]}><planeGeometry args={[w, 4.2]} /></mesh>)}
      {[kas, han].map((t) => (
        <group key={t.id} position={[t.pos[0], 0, t.pos[2]]}>
          <mesh material={M.velvet} position={[0, 0.55, 0]}><boxGeometry args={[0.9, 1.1, 0.9]} /></mesh>
          <mesh material={M.glass} position={[0, 1.5, 0]}><boxGeometry args={[0.86, 0.8, 0.86]} /></mesh>
          <Spot at={[t.pos[0], 1.3, t.pos[2]]} />
        </group>
      ))}
      {/* Kaşıkçı Elması: armut biçimli taş + 49 pırlanta */}
      <group ref={dia} position={kas.pos} scale={0.42}>
        <mesh geometry={G.pear} material={M.diamond} scale={[0.33, 0.33, 0.2]} rotation={[0, 0, Math.PI]} />
        <primitive object={ring} />
      </group>
      {/* Topkapı Hançeri: kın (altın, mine), sap (üç zümrüt), uçta zümrüt kapak */}
      <group ref={dag} position={han.pos}>
        <group rotation={[0, 0, 0.5]} scale={0.9}>
          <mesh material={M.gold} position={[0, -0.14, 0]}><coneGeometry args={[0.035, 0.34, 8]} /></mesh>
          <mesh material={M.enamel} position={[0, -0.06, 0.026]}><circleGeometry args={[0.018, 12]} /></mesh>
          <mesh material={M.gold} position={[0, 0.08, 0]}><boxGeometry args={[0.062, 0.2, 0.03]} /></mesh>
          {[0.02, 0.08, 0.14].map((y) => <mesh key={y} material={M.emerald} geometry={G.cab} position={[0, y, 0.02]} scale={[0.85, 1, 0.5]} />)}
          <mesh material={M.emerald} position={[0, 0.2, 0]}><octahedronGeometry args={[0.026, 0]} /></mesh>
          {Array.from({ length: 10 }, (_, i) => <mesh key={i} material={M.small} geometry={G.brilliant} position={[(i % 2 ? 1 : -1) * 0.028, -0.02 + (i >> 1) * 0.045, 0.012]} scale={0.3} />)}
        </group>
      </group>
    </group>
  );
}
