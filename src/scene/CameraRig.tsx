import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { useStore } from '../state/store';
import { loadTopology, provinceFeatures, regionGeometry } from '../geo/topology';
import { worldBounds } from '../geo/shapes';
import { elevationToHeight, toWorld } from '../geo/projection';
import { ELEVATION } from '../data/regions';
import { prefersReducedMotion } from './theme';

const ACTION = CameraControlsImpl.ACTION;

/**
 * Kamera durum makinesi: her hiyerarşi seviyesi (ülke → bölge → il → nokta) için bir hedef
 * hesaplar ve camera-controls'un kritik sönümlü (critically damped) yumuşatmasıyla geçer.
 * Bu, easing eğrisini elle yazmaya gerek bırakmadan, kesintiye uğrayan geçişlerde bile
 * (kullanıcı animasyon sırasında tekrar tıklarsa) sıçramasız hareket sağlar.
 */
export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null!);
  const level = useStore((s) => s.level);
  const region = useStore((s) => s.region);
  const province = useStore((s) => s.province);
  const site = useStore((s) => s.site);
  const size = useThree((s) => s.size);
  const lastInteraction = useRef(0);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // Dokunmatik: tek parmak döndür (swipe-to-rotate), iki parmak pinch-zoom + kaydır
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK;
    c.touches.three = ACTION.TOUCH_TRUCK;
    c.mouseButtons.right = ACTION.TRUCK;
    c.mouseButtons.wheel = ACTION.DOLLY;
    c.dollyToCursor = true;
    const mark = () => (lastInteraction.current = performance.now());
    c.addEventListener('controlstart', mark);
    c.addEventListener('control', mark);
    return () => {
      c.removeEventListener('controlstart', mark);
      c.removeEventListener('control', mark);
    };
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let cancelled = false;
    lastInteraction.current = performance.now(); // geçiş bitmeden otomatik yörünge başlamasın
    c.smoothTime = reduced ? 0.15 : level === 'site' ? 0.85 : 0.6;
    const portrait = size.height > size.width;
    const pad = portrait ? 0.6 : 0.25;

    (async () => {
      const topo = await loadTopology('low');
      if (cancelled) return;
      if (level === 'country') {
        c.minDistance = 20;
        c.maxDistance = 160;
        c.maxPolarAngle = Math.PI * 0.42;
        const [a, b] = toWorld(25.66, 42.11);
        const [cc, d] = toWorld(44.83, 35.81);
        const box = new THREE.Box3(new THREE.Vector3(a, 0, b), new THREE.Vector3(cc, 1, d));
        await Promise.all([
          c.rotateTo(0, 0.6, true),
          c.fitToBox(box, true, { paddingLeft: 2, paddingRight: 2, paddingTop: 6, paddingBottom: portrait ? 4 : 9 }),
        ]);
        return;
      }
      if ((level === 'region' && region) || (level === 'province' && province)) {
        const geom =
          level === 'region'
            ? regionGeometry(topo, region!)
            : provinceFeatures(topo).find((f) => f.properties.name === province)!.geometry;
        const [x0, z0, x1, z1] = worldBounds(geom);
        const box = new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 2.5, z1));
        c.minDistance = 3;
        c.maxDistance = 120;
        c.maxPolarAngle = Math.PI * 0.45;
        // Önce hafif eğik bir açıya dön, sonra kutuya sığdır: kabartma (extrude) okunur kalır
        await Promise.all([
          c.rotateTo(0, level === 'region' ? 0.62 : 0.72, true),
          c.fitToBox(box, true, { paddingLeft: pad * 6, paddingRight: pad * 6, paddingTop: pad * 6, paddingBottom: pad * 10 + (level === 'province' ? 4 : 0) }),
        ]);
        return;
      }
      if (level === 'site' && site) {
        const [x, z] = toWorld(site.coord[0], site.coord[1]);
        const y = elevationToHeight(ELEVATION[site.province]);
        c.minDistance = 1.1;
        c.maxDistance = 9;
        c.maxPolarAngle = Math.PI * 0.47;
        // Sinematik yaklaşım: hedefe hafif yandan ve alçaktan gir
        const az = c.azimuthAngle + 0.6;
        const dist = portrait ? 4.2 : 3.0;
        const camPos = new THREE.Vector3(
          x + Math.sin(az) * dist,
          y + 1.25,
          z + Math.cos(az) * dist,
        );
        await c.setLookAt(camPos.x, camPos.y, camPos.z, x, y + 0.35, z, true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [level, region, province, site, size.width, size.height, reduced]);

  // Keşif modunda kullanıcı dokunmadığında yavaş yörünge
  useFrame((_, dt) => {
    const c = ref.current;
    if (!c || reduced || level !== 'site') return;
    if (performance.now() - lastInteraction.current < 3500) return;
    c.azimuthAngle += dt * 0.12;
  });

  return <CameraControls ref={ref} makeDefault />;
}
