/**
 * Topkapı — figürler. Kız Kulesi'nin iskeletli karakteri (Character) Osmanlı kıyafetiyle giydirilir:
 * uzun kaftan + kuşak + yaka şeridi, başlık (kavuk, sarık, börk, yemeni) ve sakal. Kıyafetler dönem havası verir; birebir kıyafet
 * rekonstrüksiyonu değildir. Rehber Hasan Efendi kurgusal bir saray kâtibidir.
 * Arka plan figürleri: duranlar (oyuncu yaklaşınca başını çevirir), konuşanlar (dudak + el hareketi) ve döngüsel yolda yürüyenler.
 * Uzaktaki figürler çizilmez (55 m); düşük kademede "minTier" figürleri hiç eklenmez.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Character, newRig, type Palette } from '../kiz-kulesi/NPCController';
import { EXTRAS, type Extra, type Role, type Zone } from './world';

export const HASAN: Palette = { skin: '#d6a47e', hair: '#2b1f18', top: '#2c5a4a', pants: '#2c2a26', shoes: '#6b3d22', kaftan: '#2c5a4a', sash: '#d8b25a', trim: '#c99a3a', hat: 'kavuk', hatColor: '#f4f0e6', beard: '#3b2b22' };
export const VISITOR: Palette = { skin: '#c99272', hair: '#151515', top: '#2f8f83', pants: '#3a3a42', shoes: '#e9e6df' };

const ROLE: Record<Role, Palette[]> = {
  muhafiz: [{ skin: '#c8946e', hair: '#1c1410', top: '#8e2a22', pants: '#3a2a22', shoes: '#c9a24a', kaftan: '#8e2a22', sash: '#262626', trim: '#d1a645', hat: 'bork', hatColor: '#efe9de', beard: '#2a1d16' }],
  vezir: [
    { skin: '#e0b08c', hair: '#c9c4bb', top: '#ece4cf', pants: '#ece4cf', shoes: '#d9b25a', kaftan: '#ece4cf', sash: '#2f6b4a', trim: '#d1a645', hat: 'kavuk', hatColor: '#fbf8f1', beard: '#dcd8d0' },
    { skin: '#cf9e7a', hair: '#3a2c22', top: '#7d2a3a', pants: '#3a1a22', shoes: '#d9b25a', kaftan: '#7d2a3a', sash: '#e6d6a8', trim: '#d1a645', hat: 'kavuk', hatColor: '#fbf8f1', beard: '#8a8278' },
    { skin: '#d8a985', hair: '#2a2018', top: '#2f5d43', pants: '#1f3a2a', shoes: '#d9b25a', kaftan: '#2f5d43', sash: '#c9a24a', trim: '#e7c66a', hat: 'kavuk', hatColor: '#f6f3ec', beard: '#5a4a3c' },
  ],
  hizmetkar: [{ skin: '#c48c66', hair: '#1f1510', top: '#6b5a46', pants: '#3b3024', shoes: '#4a3424', kaftan: '#6b5a46', sash: '#a4462c', hat: 'sarik', hatColor: '#e9e3d6' },
    { skin: '#d3a07c', hair: '#2a1b12', top: '#4a5a72', pants: '#2b3342', shoes: '#4a3424', kaftan: '#4a5a72', sash: '#c9a24a', hat: 'sarik', hatColor: '#efe9dc' }],
  asci: [{ skin: '#cf9a76', hair: '#2a1b12', top: '#efe8da', pants: '#8a7a64', shoes: '#4a3424', kaftan: '#efe8da', sash: '#7a4a2a', hat: 'sarik', hatColor: '#f7f3ea', beard: '#3a2a20' }],
  hanim: [{ skin: '#e6bb98', hair: '#2a1a12', top: '#d97a9a', pants: '#a54a6a', shoes: '#c9a24a', kaftan: '#d97a9a', sash: '#f2d27a', trim: '#f2d27a', hat: 'yemeni', hatColor: '#f6e9dc' },
    { skin: '#e0b28e', hair: '#3a2416', top: '#5a7fbf', pants: '#33507f', shoes: '#c9a24a', kaftan: '#5a7fbf', sash: '#efe0b8', trim: '#e9cf86', hat: 'yemeni', hatColor: '#e9c8d6' }],
  aga: [{ skin: '#6e4a36', hair: '#120c08', top: '#3a2f6b', pants: '#221c40', shoes: '#c9a24a', kaftan: '#3a2f6b', sash: '#d1a645', trim: '#d1a645', hat: 'sarik', hatColor: '#f4efe4' }],
  katip: [{ skin: '#d6a47e', hair: '#2b1f18', top: '#6a4a2a', pants: '#2c2a26', shoes: '#6b3d22', kaftan: '#6a4a2a', sash: '#e6d6a8', hat: 'sarik', hatColor: '#f4f0e6', beard: '#2b1f18' }],
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function Extra({ e, i, player }: { e: Extra; i: number; player: React.MutableRefObject<{ x: number; z: number }> }) {
  const rig = useRef(newRig(e.at[0], e.at[1], e.yaw)), root = useRef<THREE.Group>(null!);
  const st = useRef({ k: 1, pause: 0, chat: 2 + i * 1.7 });
  const pal = ROLE[e.role][i % ROLE[e.role].length];
  const look = useMemo(() => new THREE.Vector3(), []), pt = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }, raw) => {
    const dt = Math.min(raw, 0.05), r = rig.current, s = st.current, t = clock.elapsedTime;
    root.current.visible = camera.position.distanceTo(new THREE.Vector3(r.x, 1, r.z)) < 55;
    if (!root.current.visible) return;
    if (e.path) {
      if (s.pause > 0) { s.pause -= dt; r.speed = 0; }
      else {
        const [tx, tz] = e.path[s.k], dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz), v = 1.15 + (i % 3) * 0.1;
        if (d < 0.2) { s.k = (s.k + 1) % e.path.length; if (s.k === 0 || s.k === Math.floor(e.path.length / 2)) s.pause = 1.5 + (i % 4); }
        else { const st2 = Math.min(d, v * dt); r.x += (dx / d) * st2; r.z += (dz / d) * st2; r.speed = v; r.yaw += wrap(Math.atan2(-dx, -dz) - r.yaw) * (1 - Math.exp(-dt * 8)); }
      }
    }
    // oyuncu yakınsa başını çevirir
    const pd = Math.hypot(player.current.x - r.x, player.current.z - r.z);
    r.look = pd < 6 ? look.set(player.current.x, 1.6, player.current.z) : null;
    // konuşanlar: aralıklı "sohbet" (dudak + jest); söz yok, yalnızca canlılık
    if (e.talk) {
      s.chat -= dt; const on = s.chat > 0 && s.chat < 3.2; if (s.chat < -2.5) s.chat = 3.2 + ((i * 7) % 5);
      r.talking = on; r.mouth = on ? Math.max(0, Math.sin(t * 13 + i) * 0.5 + Math.sin(t * 7.3) * 0.4) : 0;
      r.point = on && Math.sin(t * 0.7 + i) > 0.4 ? pt.set(r.x - Math.sin(r.yaw) * 2 + 1, 1.3, r.z - Math.cos(r.yaw) * 2) : null;
    }
  });
  return <group ref={root}><Character rig={rig} palette={pal} /></group>;
}

/** Bu bölgedeki figürler */
export function Extras({ zone, low, player }: { zone: Zone; low: boolean; player: React.MutableRefObject<{ x: number; z: number }> }) {
  const list = useMemo(() => EXTRAS.filter((e) => e.zone === zone && (!low || !e.minTier)), [zone, low]);
  return <group>{list.map((e, i) => <Extra key={e.id} e={e} i={i} player={player} />)}</group>;
}
