/**
 * Paylaşılan arka plan figürleri (Kız Kulesi'nin iskeletli karakteriyle): duranlar (oyuncu yaklaşınca başını çevirir),
 * sohbet edenler (dudak + jest; söz yok, yalnızca canlılık) ve döngüsel yolda yürüyenler. 55 m'den uzaktakiler çizilmez.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Character, newRig, type Palette } from '../kiz-kulesi/NPCController';
import type { V2 } from './nav';

export interface Walker { id: string; at: V2; yaw: number; y?: number; path?: V2[]; talk?: boolean; palette: Palette; speed?: number }
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const _v = new THREE.Vector3();

function Person({ e, i, player }: { e: Walker; i: number; player: React.MutableRefObject<{ x: number; y?: number; z: number }> }) {
  const rig = useRef(Object.assign(newRig(e.at[0], e.at[1], e.yaw), { y: e.y ?? 0 })), root = useRef<THREE.Group>(null!);
  const st = useRef({ k: 1, pause: 0, chat: 2 + i * 1.7 });
  const look = useMemo(() => new THREE.Vector3(), []), pt = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }, raw) => {
    const dt = Math.min(raw, 0.05), r = rig.current, s = st.current, t = clock.elapsedTime;
    root.current.visible = camera.position.distanceTo(_v.set(r.x, r.y + 1, r.z)) < 55;
    if (!root.current.visible) return;
    if (e.path) {
      if (s.pause > 0) { s.pause -= dt; r.speed = 0; }
      else {
        const [tx, tz] = e.path[s.k], dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz), v = e.speed ?? 1.15 + (i % 3) * 0.1;
        if (d < 0.2) { s.k = (s.k + 1) % e.path.length; if (s.k === 0 || s.k === Math.floor(e.path.length / 2)) s.pause = 1.5 + (i % 4); }
        else { const st2 = Math.min(d, v * dt); r.x += (dx / d) * st2; r.z += (dz / d) * st2; r.speed = v; r.yaw += wrap(Math.atan2(-dx, -dz) - r.yaw) * (1 - Math.exp(-dt * 8)); }
      }
    }
    const p = player.current, same = Math.abs((p.y ?? 0) - r.y) < 2, pd = Math.hypot(p.x - r.x, p.z - r.z);
    r.look = same && pd < 6 ? look.set(p.x, r.y + 1.6, p.z) : null;
    if (e.talk) {
      s.chat -= dt; const on = s.chat > 0 && s.chat < 3.2; if (s.chat < -2.5) s.chat = 3.2 + ((i * 7) % 5);
      r.talking = on; r.mouth = on ? Math.max(0, Math.sin(t * 13 + i) * 0.5 + Math.sin(t * 7.3) * 0.4) : 0;
      r.point = on && Math.sin(t * 0.7 + i) > 0.4 ? pt.set(r.x - Math.sin(r.yaw) * 2 + 1, r.y + 1.3, r.z - Math.cos(r.yaw) * 2) : null;
    }
  });
  return <group ref={root}><Character rig={rig} palette={e.palette} /></group>;
}

export function Crowd({ list, player }: { list: Walker[]; player: React.MutableRefObject<{ x: number; y?: number; z: number }> }) {
  return <group>{list.map((e, i) => <Person key={e.id} e={e} i={i} player={player} />)}</group>;
}
