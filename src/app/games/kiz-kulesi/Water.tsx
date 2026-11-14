/**
 * Düşük maliyetli Gerstner dalga shader'ı.
 *  - 3 dalga, tepe noktası shader'ında yer değiştirme + analitik normal (doku yok).
 *  - Köpük yalnızca iki yerde: vapurun burnunda (hızla orantılı) ve adanın kıyısında (kule dibi). Başka yerde köpük yok.
 *  - Ağ, kameranın etrafında ızgara adımına yapışarak taşınır: dalgalar dünya koordinatından hesaplandığı için kaymaz.
 * Maliyet: orta kademede 160×160 ızgara (~51k üçgen), düşük kademede 96×96.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface FoamRefs {
  bow: React.MutableRefObject<THREE.Vector3>;      // vapur burnunun dünya konumu
  bowDir: React.MutableRefObject<THREE.Vector2>;   // vapurun ileri yönü (xz)
  bowAmount: React.MutableRefObject<number>;       // 0..1 (hız)
}
export const ISLAND_R = 17;

const vert = /* glsl */ `
uniform float uTime;
varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
// yön (xz), dalga boyu, diklik
const vec4 W1 = vec4(0.8, 0.6, 18.0, 0.22);
const vec4 W2 = vec4(-0.3, 0.95, 9.0, 0.18);
const vec4 W3 = vec4(0.95, -0.2, 5.0, 0.12);
void gerstner(vec4 w, vec2 p, inout vec3 pos, inout vec3 tan, inout vec3 bin, inout float crest) {
  vec2 d = normalize(w.xy); float k = 6.28318 / w.z; float c = sqrt(9.8 / k); float a = w.w / k;
  float f = k * (dot(d, p) - c * uTime);
  pos += vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  tan += vec3(-d.x * d.x * w.w * sin(f), d.x * w.w * cos(f), -d.x * d.y * w.w * sin(f));
  bin += vec3(-d.x * d.y * w.w * sin(f), d.y * w.w * cos(f), -d.y * d.y * w.w * sin(f));
  crest += max(0.0, sin(f)) * w.w;
}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 pos = wp.xyz, tan = vec3(1, 0, 0), bin = vec3(0, 0, 1); float crest = 0.0;
  gerstner(W1, wp.xz, pos, tan, bin, crest); gerstner(W2, wp.xz, pos, tan, bin, crest); gerstner(W3, wp.xz, pos, tan, bin, crest);
  vNormal = normalize(cross(bin, tan)); vWorld = pos; vCrest = crest;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;

const frag = /* glsl */ `
uniform float uTime; uniform vec3 uSun; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky;
uniform vec3 uBow; uniform vec2 uBowDir; uniform float uBowAmt; uniform float uIslandR;
uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 n = normalize(vNormal), v = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  vec3 col = mix(uDeep, uShallow, clamp(vCrest * 1.8, 0.0, 1.0));
  col = mix(col, uSky, fres * 0.65);
  col += pow(max(dot(reflect(-uSun, n), v), 0.0), 140.0) * vec3(1.0, 0.95, 0.85) * 1.4;
  // köpük: yalnızca vapur burnu ve ada kıyısı
  float pat = noise(vWorld.xz * 0.9 + uTime * 0.6) * 0.6 + noise(vWorld.xz * 2.7 - uTime) * 0.4;
  vec2 rel = vWorld.xz - uBow.xz; float along = dot(rel, uBowDir); float side = abs(dot(rel, vec2(-uBowDir.y, uBowDir.x)));
  // burun: burnun hemen önü ve gövdenin ilk ~10 m'sinde iki yana açılan dalga
  float bow = uBowAmt * (1.0 - smoothstep(0.0, 5.0, length(rel)))
            + uBowAmt * 0.7 * (1.0 - step(0.0, along)) * smoothstep(-10.0, 0.0, along) * (1.0 - smoothstep(0.5, 4.5 - along * 0.15, side));
  float shore = 1.0 - smoothstep(0.0, 4.0, abs(length(vWorld.xz) - uIslandR) * (1.0 + pat));
  float foam = clamp(max(bow, shore) * smoothstep(0.35, 0.75, pat), 0.0, 1.0);
  col = mix(col, vec3(0.95, 0.97, 0.98), foam);
  float fog = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
  gl_FragColor = vec4(mix(col, uFogColor, fog), 1.0);
  #include <colorspace_fragment>
}`;

export function Water({ foam, segments = 160, size = 900, fog = { color: '#cfe0ea', near: 250, far: 1400 }, sun = new THREE.Vector3(0.4, 0.6, -0.7) }: {
  foam: FoamRefs; segments?: number; size?: number; fog?: { color: string; near: number; far: number }; sun?: THREE.Vector3;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const geo = useMemo(() => new THREE.PlaneGeometry(size, size, segments, segments).rotateX(-Math.PI / 2), [size, segments]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 }, uSun: { value: sun.clone().normalize() },
      uDeep: { value: new THREE.Color('#0e4560') }, uShallow: { value: new THREE.Color('#2d8597') }, uSky: { value: new THREE.Color('#bcd6e6') },
      uBow: { value: new THREE.Vector3() }, uBowDir: { value: new THREE.Vector2(0, -1) }, uBowAmt: { value: 0 }, uIslandR: { value: ISLAND_R },
      uFogColor: { value: new THREE.Color(fog.color) }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far },
    },
  }), [sun, fog.color, fog.near, fog.far]);
  const step = size / segments;
  useFrame(({ clock, camera }) => {
    const u = mat.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uBow.value.copy(foam.bow.current); u.uBowDir.value.copy(foam.bowDir.current).normalize(); u.uBowAmt.value = foam.bowAmount.current;
    // ağı kameranın altına, ızgara adımına yapıştırarak taşı (dalgalar dünya koordinatında olduğundan kaymaz)
    mesh.current.position.set(Math.round(camera.position.x / step) * step, 0, Math.round(camera.position.z / step) * step);
  });
  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} />;
}
