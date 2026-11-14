/**
 * Sultanahmet — kamera: serbest kamera YOK.
 *  1) Sinematik yol: avlunun üstünden harimin kapısına süzülen önceden tanımlı rota (dokunarak atlanabilir).
 *  2) Üçüncü şahıs takip: kamera karakterin arkasında sabit uzaklıkta durur ve her zaman hedef ışık havuzunu da
 *     kadraja alacak şekilde konumlanır (karakter → havuz doğrultusunun gerisinde). Bakış hedefe doğru kayar.
 * Oyuncunun kamera üzerinde hiçbir kontrolü yoktur; hareket girdileri bu kameranın yönüne göre yorumlanır.
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { COURT, HALL } from './layout';

const INTRO_SECONDS = 7;
const INTRO = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-170, 85, 110),
  new THREE.Vector3(-115, 40, 45),
  new THREE.Vector3(COURT.x - 10, 14, 6),
  new THREE.Vector3(-HALL.len / 2 - 6, 5, 0),
  new THREE.Vector3(-HALL.len / 2 + 4, 6.5, 0),
]);
const INTRO_LOOK = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-20, 15, 0), new THREE.Vector3(-25, 12, 0), new THREE.Vector3(-HALL.len / 2, 6, 0), new THREE.Vector3(0, 3, 0), new THREE.Vector3(10, 2, 0),
]);

const DIST = 7.5, HEIGHT = 10, LOOK_BIAS = 0.35, WALL_MARGIN = 3.5;
const ease = (t: number) => t * t * (3 - 2 * t);

export interface CameraRefs {
  avatar: React.MutableRefObject<{ x: number; z: number }>;
  target: React.MutableRefObject<THREE.Vector3 | null>;
  /** Kameranın yatay bakış açısı (radyan): joystick girdisi buna göre dünyaya çevrilir */
  yaw: React.MutableRefObject<number>;
}

export function useLightTrackingCamera({ avatar, target, yaw }: CameraRefs, intro: boolean, onIntroEnd: () => void, reduced: boolean) {
  const { camera } = useThree();
  const t = useRef(0);
  const ended = useRef(false);
  const dir = useRef(new THREE.Vector2(-1, 0));      // karakterden kameraya doğru yatay yön
  const pos = useRef(new THREE.Vector3()), look = useRef(new THREE.Vector3());

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (intro && !ended.current && !reduced) {
      t.current += dt / INTRO_SECONDS;
      const k = ease(Math.min(1, t.current));
      camera.position.copy(INTRO.getPoint(k)); camera.lookAt(INTRO_LOOK.getPoint(k));
      pos.current.copy(camera.position); look.current.copy(INTRO_LOOK.getPoint(k));
      if (t.current >= 1) { ended.current = true; onIntroEnd(); }
      return;
    }
    if (intro && !ended.current) { ended.current = true; onIntroEnd(); }
    const a = avatar.current, tg = target.current;
    // kamera, karakteri ve hedef havuzu aynı kadrajda tutar: havuzun tersi yönde, karakterin gerisinde
    // ve harimin ortasına doğru çekilir: panolar duvarlarda olduğundan kamera içeriden duvara bakar, duvarı sıyırmaz
    if (tg) {
      const away = new THREE.Vector2(a.x - tg.x, a.z - tg.z), inward = new THREE.Vector2(-a.x, -a.z);
      const w = Math.min(1, inward.length() / 12);
      const goal = (away.length() > 2.5 ? away.normalize().multiplyScalar(0.5) : dir.current.clone().multiplyScalar(0.5))
        .add(inward.normalize().multiplyScalar(0.8 * w)).normalize();
      dir.current.lerp(goal, 1 - Math.exp(-dt * 1.5)).normalize();
    }
    const want = new THREE.Vector3(a.x + dir.current.x * DIST, HEIGHT, a.z + dir.current.y * DIST);
    // harim duvarlarının dışına çıkmasın
    const lx = HALL.len / 2 - HALL.wall - WALL_MARGIN, lz = HALL.wid / 2 - HALL.wall - WALL_MARGIN;
    const cx = THREE.MathUtils.clamp(want.x, -lx, lx), cz = THREE.MathUtils.clamp(want.z, -lz, lz);
    // duvara dayandıysa kamera geri gidemediği kadar yükselir: karakter ve havuz kadrajda kalır, duvar ekranı kaplamaz
    want.y += Math.hypot(want.x - cx, want.z - cz) * 1.2; want.x = cx; want.z = cz;
    const lookAt = new THREE.Vector3(a.x, 1.2, a.z);
    if (tg) lookAt.lerp(new THREE.Vector3(tg.x, 0.5, tg.z), LOOK_BIAS);
    const k = 1 - Math.exp(-dt * 3);
    pos.current.lerp(want, k); look.current.lerp(lookAt, k);
    camera.position.copy(pos.current); camera.lookAt(look.current);
    yaw.current = Math.atan2(look.current.x - pos.current.x, look.current.z - pos.current.z);
  });
  /** Sinematik girişi atla */
  return () => { t.current = 1; };
}
