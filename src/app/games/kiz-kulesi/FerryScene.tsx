/**
 * Bölüm 1 — Vapur yolculuğu (gidiş).
 * Vapur rotada kendiliğinden ilerler (ferry.ts → ferryPose), dalga üstünde sinüslerle sallanır (ferry.ts → bob).
 * Oyuncu ve Can vapurun yerel koordinatlarında, açık baş güvertesinde yürür; güverte sınırı denize düşmeyi engeller.
 * Kamera: sabit üçüncü şahıs — oyuncunun arkasında ve yukarısında, vapurun burnu yönüne (yani Kız Kulesi'ne) bakar.
 * Kamera, sallanmayan (yalnızca konum + yön) vapur dönüşümüne bağlıdır: dünya sallanır gibi görünmez, vapur sallanır;
 * bu, ekranda deniz tutmasını azaltır. Kullanıcı yalnızca yakınlaştırıp uzaklaştırabilir.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { DECK, FERRY_SECONDS, bob, clampDeck, ferryPose } from './ferry';
import { Character, CAN, PLAYER, newRig, type RigState } from './NPCController';
import { followTarget, stepToward } from './npc';
import { Water, type FoamRefs } from './Water';
import { KizKulesi, Shores } from './TowerModel';
import { useKiz } from './store';
import { mouthOpen } from './dialogue';
import { walk } from './input';

const hullM = new THREE.MeshStandardMaterial({ color: '#1f2b38', roughness: 0.6 });
const whiteM = new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.55 });
const deckM = new THREE.MeshStandardMaterial({ color: '#9b7a57', roughness: 0.85 });
const glassM = new THREE.MeshStandardMaterial({ color: '#33505f', roughness: 0.2, metalness: 0.3 });
const funnelM = new THREE.MeshStandardMaterial({ color: '#e7b53a', roughness: 0.5 });
const blackM = new THREE.MeshStandardMaterial({ color: '#191919', roughness: 0.6 });
const railM = new THREE.MeshStandardMaterial({ color: '#e9e9e4', roughness: 0.4, metalness: 0.3 });

/** Klasik İstanbul vapuru silueti (stilize): koyu gövde, beyaz üst yapı, sarı-siyah baca */
export function FerryModel() {
  const hull = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -15.5); s.quadraticCurveTo(3.6, -10, 3.6, -4); s.lineTo(3.6, 12); s.quadraticCurveTo(3.4, 15, 0, 15.5); s.quadraticCurveTo(-3.4, 15, -3.6, 12);
    s.lineTo(-3.6, -4); s.quadraticCurveTo(-3.6, -10, 0, -15.5);
    return new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, DECK.y, 0);
  }, []);
  const deck = useMemo(() => {
    // şekil y'si = -z: rotateX(-π/2) sonrası yüz yukarı bakar ve burun -z'de kalır
    const s = new THREE.Shape();
    s.moveTo(0, 15.2); s.quadraticCurveTo(3.4, 10, 3.4, 4); s.lineTo(3.4, -12); s.quadraticCurveTo(3.2, -14.8, 0, -15.2); s.quadraticCurveTo(-3.2, -14.8, -3.4, -12); s.lineTo(-3.4, 4); s.quadraticCurveTo(-3.4, 10, 0, 15.2);
    return new THREE.ShapeGeometry(s, 12).rotateX(-Math.PI / 2);
  }, []);
  const rails = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, z = -15 + u * 10.5, x = z < -4 ? 3.3 * Math.sqrt(Math.max(0, 1 - ((z + 4) / 11.2) ** 2)) : 3.3; pts.push(new THREE.Vector3(x, 0, z)); }
    const right = new THREE.CatmullRomCurve3(pts), left = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(-p.x, 0, p.z)));
    return [new THREE.TubeGeometry(right, 40, 0.035, 5), new THREE.TubeGeometry(left, 40, 0.035, 5)];
  }, []);
  return (
    <group>
      <mesh geometry={hull} material={hullM} position={[0, -0.01, 0]} />
      <mesh material={whiteM} position={[0, DECK.y - 0.5, 0]}><boxGeometry args={[7.25, 0.35, 22]} /></mesh>
      <mesh geometry={deck} material={deckM} position={[0, DECK.y + 0.01, 0]} />
      {rails.map((g, i) => <mesh key={i} geometry={g} material={railM} position={[0, DECK.y + 1.05, 0]} />)}
      {rails.map((g, i) => <mesh key={`b${i}`} geometry={g} material={railM} position={[0, DECK.y + 0.55, 0]} />)}
      {/* salon: güvertenin arka kısmı kapalı; pencereli */}
      <mesh material={whiteM} position={[0, DECK.y + 1.3, 3.6]}><boxGeometry args={[6.8, 2.6, 17]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={glassM} position={[s * 3.41, DECK.y + 1.5, 3.6]} rotation={[0, s * Math.PI / 2, 0]}><planeGeometry args={[15, 1]} /></mesh>)}
      <mesh material={glassM} position={[0, DECK.y + 1.5, -4.91]} rotation={[0, Math.PI, 0]}><planeGeometry args={[5.6, 1]} /></mesh>
      {/* üst güverte ve köprüüstü */}
      <mesh material={whiteM} position={[0, DECK.y + 2.75, 4.5]}><boxGeometry args={[7.2, 0.3, 19]} /></mesh>
      <mesh material={whiteM} position={[0, DECK.y + 3.8, -2.2]}><boxGeometry args={[4.6, 1.8, 3]} /></mesh>
      <mesh material={glassM} position={[0, DECK.y + 4, -3.72]} rotation={[0, Math.PI, 0]}><planeGeometry args={[4.2, 0.8]} /></mesh>
      {/* baca */}
      <mesh material={funnelM} position={[0, DECK.y + 4.4, 5]}><cylinderGeometry args={[0.9, 1.05, 3, 14]} /></mesh>
      <mesh material={blackM} position={[0, DECK.y + 6.2, 5]}><cylinderGeometry args={[0.92, 0.9, 0.7, 14]} /></mesh>
      {/* direk */}
      <mesh material={railM} position={[0, DECK.y + 5.5, -2.2]}><cylinderGeometry args={[0.05, 0.06, 3.5, 6]} /></mesh>
    </group>
  );
}

const KULE_WORLD = new THREE.Vector3(0, 14, 0);

export default function FerryScene({ device, onArrive }: { device: { shadows: boolean; water: number; blocks: number }; onArrive: () => void }) {
  const { camera, scene } = useThree();
  const ferry = useRef<THREE.Group>(null!);
  const player = useRef<RigState>(newRig(-1.2, -9, 0));
  const can = useRef<RigState>(newRig(0.6, -8.4, 0));
  const t0 = useRef<number | null>(null), arrived = useRef(false);
  const foam: FoamRefs = { bow: useRef(new THREE.Vector3()), bowDir: useRef(new THREE.Vector2(0, -1)), bowAmount: useRef(0) };
  const pose = useMemo(() => new THREE.Object3D(), []), tmp = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), []);
  const inv = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    scene.background = new THREE.Color('#bcd6e6'); scene.fog = new THREE.Fog('#cfe0ea', 300, 2600);
    (camera as THREE.PerspectiveCamera).fov = 55; (camera as THREE.PerspectiveCamera).far = 6000; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    return () => { scene.fog = null; };
  }, [camera, scene]);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), t = clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const u = (t - t0.current) / FERRY_SECONDS, p = ferryPose(u), k = u >= 1 ? 0.25 : 1, b = bob(t, k);
    // vapur: konum + yön (kamera için sallanmasız) ve sallanma (görsel)
    pose.position.set(p.x, 0, p.z); pose.rotation.set(0, p.yaw, 0); pose.updateMatrixWorld();
    ferry.current.position.set(p.x, b.heave, p.z);
    ferry.current.rotation.set(b.pitch, p.yaw, b.roll, 'YXZ');
    // köpük: burun noktası ve hız
    tmp.set(0, 0, -15.5).applyMatrix4(pose.matrixWorld); foam.bow.current.copy(tmp);
    foam.bowDir.current.set(-Math.sin(p.yaw), -Math.cos(p.yaw)); foam.bowAmount.current = Math.min(1, p.speed * 0.9);
    if (u >= 1 && !arrived.current) { arrived.current = true; onArrive(); }

    // oyuncu: joystick → vapur yerel ekseni (kamera burna baktığı için yukarı = -z)
    const pl = player.current, len = Math.hypot(walk.x, walk.y);
    if (len > 0.08) {
      const sp = 1.8 * Math.min(1, len);
      const [nx, nz] = clampDeck(pl.x + (walk.x / Math.max(1, len)) * sp * dt, pl.z + (walk.y / Math.max(1, len)) * sp * dt);
      pl.speed = Math.hypot(nx - pl.x, nz - pl.z) / dt; if (pl.speed > 0.05) pl.yaw = Math.atan2(-(nx - pl.x), -(nz - pl.z)); pl.x = nx; pl.z = nz;
    } else pl.speed = 0;
    pl.y = DECK.y; pl.wind = 1;

    // Can: oyuncunun yanında (beside); konuşurken oyuncuya ya da kuleye döner
    const c = can.current, st = useKiz.getState(), pb = st.playback, now = performance.now() / 1000;
    const line = pb ? pb.dialogue.lines[pb.line] : null;
    const tg = followTarget('beside', c, pl, 0);
    const [tx, tz] = clampDeck(tg.x, tg.z);
    const s = stepToward(c, { x: tx, z: tz }, dt);
    c.x = s.pos.x; c.z = s.pos.z; c.speed = s.speed; c.y = DECK.y; c.wind = 1;
    // kule ve oyuncunun vapur yerel koordinatı (işaret ve bakış için)
    inv.copy(ferry.current.matrixWorld).invert();
    const towerLocal = tmp.copy(KULE_WORLD).applyMatrix4(inv).clone();
    const face = (x: number, z: number) => Math.atan2(-(x - c.x), -(z - c.z));
    c.talking = !!line; c.mouth = mouthOpen(pb, now);
    c.point = line?.anim === 'point' && line.lookAt === 'tower' ? towerLocal : null;
    c.look = line ? new THREE.Vector3(pl.x, DECK.y + 1.6, pl.z) : null;
    if (s.yaw !== null) c.yaw = s.yaw;
    else if (line) { const want = c.point ? face(towerLocal.x, towerLocal.z) : face(pl.x, pl.z); c.yaw += (((want - c.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * (1 - Math.exp(-dt * 4)); }

    // kamera: oyuncunun arkasında ve köprüüstünün üzerinde (üst yapının içine girmez), burna (kuleye) bakar; yalnızca yakınlaştırma
    const z = st.zoom;
    tmp.set(pl.x * 0.6, DECK.y + 5 + 1.5 * z, pl.z + 4 + 3.5 * z).applyMatrix4(pose.matrixWorld);
    camera.position.lerp(tmp, 1 - Math.exp(-dt * 5));
    look.set(pl.x * 0.4, DECK.y + 1.2, pl.z - 9).applyMatrix4(pose.matrixWorld);
    camera.lookAt(look);
  });

  return (
    <group>
      <hemisphereLight args={['#eaf3fb', '#5b6e7a', 1]} />
      <directionalLight position={[120, 160, -80]} intensity={2.2} color="#fff6e6" castShadow={device.shadows} shadow-mapSize={[1024, 1024]} />
      <Water foam={foam} segments={device.water} />
      <group ref={ferry}>
        <FerryModel />
        <Character rig={player} palette={PLAYER} castShadow={device.shadows} />
        <Character rig={can} palette={CAN} castShadow={device.shadows} />
      </group>
      <KizKulesi shadows={device.shadows} />
      <Shores blocks={device.blocks} />
    </group>
  );
}
