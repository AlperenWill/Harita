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

export { FerryModel } from './FerryModel';
import { FerryModel } from './FerryModel';

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
  const camLocal = useRef(new THREE.Vector3(-0.7, DECK.y + 6.5, -1.5));

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
      pl.speed = dt > 0 ? Math.hypot(nx - pl.x, nz - pl.z) / dt : 0; if (pl.speed > 0.05) pl.yaw = Math.atan2(-(nx - pl.x), -(nz - pl.z)); pl.x = nx; pl.z = nz;
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
    // yumuşatma vapurun yerel uzayında yapılır: vapur hızlansa ya da kare hızı düşse de kamera güvertenin gerisinde kalmaz
    camLocal.current.lerp(tmp.set(pl.x * 0.6, DECK.y + 5 + 1.5 * z, pl.z + 4 + 3.5 * z), 1 - Math.exp(-dt * 5));
    camera.position.copy(camLocal.current).applyMatrix4(pose.matrixWorld);
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
