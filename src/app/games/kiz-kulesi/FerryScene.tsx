/**
 * Bölüm 1 — Vapur yolculuğu (gidiş).
 * Vapur rotada kendiliğinden ilerler (ferry.ts → ferryPose), dalga üstünde sinüslerle sallanır (ferry.ts → bob).
 * Oyuncu ve Can vapurun yerel koordinatlarında, açık baş güvertesinde yürür; güverte sınırı denize düşmeyi engeller.
 * Kamera: birinci şahıs — oyuncunun göz hizasında; bakış serbest, başlangıçta vapurun burnuna (Kız Kulesi'ne) bakar.
 * Kamera, sallanmayan (yalnızca konum + yön) vapur dönüşümüne bağlıdır: dünya sallanır gibi görünmez, vapur sallanır;
 * bu, ekranda deniz tutmasını azaltır.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { DECK, FERRY_SECONDS, bob, clampDeck, ferryPose } from './ferry';
import { Character, CAN, newRig, type RigState } from './NPCController';
import { followTarget, stepToward } from './npc';
import { Water, type FoamRefs } from './Water';
import { KizKulesi, Shores } from './TowerModel';
import { useKiz } from './store';
import { mouthOpen } from './dialogue';
import { fpMove, view } from './input';
import { applyFp } from '../shared/fpLook';

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
  const pose = useMemo(() => new THREE.Object3D(), []), tmp = useMemo(() => new THREE.Vector3(), []);
  const inv = useMemo(() => new THREE.Matrix4(), []);
  const camLocal = useRef(new THREE.Vector3(-0.7, DECK.y + 6.5, -1.5));

  useEffect(() => {
    scene.background = new THREE.Color('#bcd6e6'); scene.fog = new THREE.Fog('#cfe0ea', 300, 2600);
    view.yaw = 0; view.pitch = 0.02;   // burna (kuleye) bakarak başla
    (camera as THREE.PerspectiveCamera).fov = 66; (camera as THREE.PerspectiveCamera).far = 6000; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
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

    // oyuncu: bakış yönüne göre, vapurun yerel düzleminde yürür
    const pl = player.current, m = fpMove();
    if (m) {
      const [nx, nz] = clampDeck(pl.x + m.x * 1.8 * dt, pl.z + m.z * 1.8 * dt);
      pl.speed = dt > 0 ? Math.hypot(nx - pl.x, nz - pl.z) / dt : 0; pl.x = nx; pl.z = nz;
    } else pl.speed = 0;
    pl.yaw = view.yaw;
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

    // kamera: birinci şahıs, güvertede göz hizası; bakış vapurun yönüne göre (vapur dönünce bakış da onunla döner)
    camLocal.current.set(pl.x, DECK.y + 1.62, pl.z).applyMatrix4(pose.matrixWorld);
    applyFp(camera, camLocal.current.x, camLocal.current.y, camLocal.current.z, { yaw: view.yaw + p.yaw, pitch: view.pitch });
  });

  return (
    <group>
      <hemisphereLight args={['#eaf3fb', '#5b6e7a', 1]} />
      <directionalLight position={[120, 160, -80]} intensity={2.2} color="#fff6e6" castShadow={device.shadows} shadow-mapSize={[1024, 1024]} />
      <Water foam={foam} segments={device.water} />
      <group ref={ferry}>
        <FerryModel />
        <Character rig={can} palette={CAN} castShadow={device.shadows} />
      </group>
      <KizKulesi shadows={device.shadows} />
      <Shores blocks={device.blocks} />
    </group>
  );
}
