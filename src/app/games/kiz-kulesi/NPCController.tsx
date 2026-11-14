/**
 * Can — NPC karakteri, animasyon durum makinesi ve takip davranışı.
 *
 * Neden bu davranış: Can bir rehber, bir oyun karakteri değil. Oyuncunun yolunu kesmemeli, kaybolmamalı ve
 * konuşurken neyi anlattığını göstermeli. Bu yüzden:
 *   - vapurda oyuncunun yanında yürür (beside), adada önden gider ve oyuncu geride kalınca bekler (lead),
 *     dar merdivende arkadan gelir (behind) — görüşü kapatmaz;
 *   - konuşurken yüzünü oyuncuya döner, dudakları yazılan harfe göre açılıp kapanır (sesli harf = açık);
 *   - bir yerden bahsederken (kule, taş, manzara) kolunu oraya uzatır (point).
 * Durumlar: idle, walk, talk, point (npc.ts). Ağırlıklar yumuşakça karıştırılır; yürürken konuşabilir.
 * Rüzgâr: atkı ve saç tutamı sinüsle dalgalanır (vapurda güçlü, içeride kapalı).
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DIM, buildGeometries } from './rig';
import { ZERO, blend, desiredState, type Weights } from './npc';

export interface RigState {
  x: number; y: number; z: number; yaw: number; speed: number;
  talking: boolean; mouth: number;
  /** Gösterilen hedef (karakterle aynı koordinat uzayında); null = gösterme */
  point: THREE.Vector3 | null;
  /** Bakılan nokta (baş döner); null = ileri */
  look: THREE.Vector3 | null;
  wind: number;
}
export const newRig = (x = 0, z = 0, yaw = 0): RigState => ({ x, y: 0, z, yaw, speed: 0, talking: false, mouth: 0, point: null, look: null, wind: 0 });

export interface Palette { skin: string; hair: string; top: string; topStripe?: string; pants: string; shoes: string; scarf?: string }
export const CAN: Palette = { skin: '#e2b48d', hair: '#3b2a20', top: '#f4f1ea', topStripe: '#1f3d6b', pants: '#2b3445', shoes: '#5a3a26', scarf: '#F04448' };
export const PLAYER: Palette = { skin: '#c99272', hair: '#151515', top: '#2f8f83', pants: '#3a3a42', shoes: '#e9e6df' };

/** 512×512 kıyafet dokusu (çizgili denizci tişörtü) — uzaktan görüneceği için daha büyüğüne gerek yok */
function topTexture(p: Palette) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = p.top; g.fillRect(0, 0, 512, 512);
  if (p.topStripe) { g.fillStyle = p.topStripe; for (let y = 40; y < 512; y += 64) g.fillRect(0, y, 512, 22); }
  else { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(236, 0, 40, 512); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(300, 120, 90, 60); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const lerp = THREE.MathUtils.lerp;
const _v = new THREE.Vector3();

/** Karakter: kemik gruplarını RigState'e göre her karede canlandırır */
export function Character({ rig, palette, castShadow = false }: { rig: React.MutableRefObject<RigState>; palette: Palette; castShadow?: boolean }) {
  const G = useMemo(buildGeometries, []);
  const M = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.8 }),
    hair: new THREE.MeshStandardMaterial({ color: palette.hair, roughness: 0.9 }),
    top: new THREE.MeshStandardMaterial({ map: topTexture(palette), roughness: 0.85 }),
    pants: new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.9 }),
    shoes: new THREE.MeshStandardMaterial({ color: palette.shoes, roughness: 0.7 }),
    scarf: new THREE.MeshStandardMaterial({ color: palette.scarf ?? palette.top, roughness: 0.9, side: THREE.DoubleSide }),
    dark: new THREE.MeshBasicMaterial({ color: '#1b1210' }),
    mouth: new THREE.MeshBasicMaterial({ color: '#5a1d1d' }),
  }), [palette]);

  const root = useRef<THREE.Group>(null!), hips = useRef<THREE.Group>(null!), chest = useRef<THREE.Group>(null!), head = useRef<THREE.Group>(null!), jaw = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!), legR = useRef<THREE.Group>(null!);
  const shL = useRef<THREE.Group>(null!), shR = useRef<THREE.Group>(null!), elL = useRef<THREE.Group>(null!), elR = useRef<THREE.Group>(null!);
  const scarf = useRef<THREE.Group[]>([]);
  const w = useRef<Weights>({ ...ZERO });
  const phase = useRef(0);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), t = clock.elapsedTime, r = rig.current;
    const moving = r.speed > 0.25;
    w.current = blend(w.current, desiredState({ speaking: r.talking, pointing: !!r.point, speed: r.speed }), moving, dt);
    const W = w.current;
    phase.current += dt * (2.2 + r.speed * 2.6) * (moving ? 1 : 0.0);
    const ph = phase.current, sw = Math.sin(ph);

    root.current.position.set(r.x, r.y, r.z);
    root.current.rotation.y = r.yaw;
    // idle: nefes + ağırlık aktarımı; walk: adım zıplaması
    hips.current.position.y = DIM.hip + W.walk * Math.abs(Math.cos(ph)) * 0.035 + W.idle * Math.sin(t * 1.3) * 0.006;
    hips.current.rotation.z = W.idle * Math.sin(t * 0.5) * 0.02;
    chest.current.rotation.x = W.idle * Math.sin(t * 1.4) * 0.02 + W.walk * 0.04 + W.talk * Math.sin(t * 1.9) * 0.03;
    chest.current.rotation.y = W.walk * sw * 0.08;
    legL.current.rotation.x = W.walk * sw * 0.6; legR.current.rotation.x = -W.walk * sw * 0.6;

    // kollar: yürüme salınımı + konuşma el hareketleri
    const talkL = 0.35 + 0.25 * Math.sin(t * 2.3), talkR = 0.45 + 0.3 * Math.sin(t * 1.7 + 1);
    shL.current.rotation.set(lerp(-sw * 0.45 * W.walk, talkL, W.talk), 0, -0.12 - W.talk * 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3)), 'YXZ');
    elL.current.rotation.x = 0.15 + W.talk * (0.9 + 0.3 * Math.sin(t * 2.6));
    const baseR = lerp(sw * 0.45 * W.walk, talkR, W.talk), elBase = 0.15 + W.talk * (0.8 + 0.35 * Math.sin(t * 2.1 + 2));
    // point: sağ kol hedefe uzanır (omuz YXZ: önce yaw sonra pitch)
    let pYaw = 0, pPitch = 0;
    if (r.point) {
      _v.copy(r.point).sub(new THREE.Vector3(r.x, r.y + DIM.hip + DIM.torso, r.z));
      const c = Math.cos(-r.yaw), s = Math.sin(-r.yaw), lx = _v.x * c + _v.z * s, lz = -_v.x * s + _v.z * c;
      pYaw = THREE.MathUtils.clamp(Math.atan2(-lx, -lz), -1.1, 1.1);
      pPitch = THREE.MathUtils.clamp(Math.atan2(_v.y, Math.hypot(lx, lz)), -0.6, 0.9);
    }
    shR.current.rotation.set(lerp(baseR, Math.PI / 2 + pPitch, W.point), lerp(0, pYaw, W.point), lerp(0.12, 0, W.point), 'YXZ');
    elR.current.rotation.x = lerp(elBase, 0, W.point);

    // baş: konuşurken bakılan noktaya döner; çene = dudak senkronu
    let hy = 0;
    if (r.look) { _v.copy(r.look).sub(root.current.position); const c = Math.cos(-r.yaw), s = Math.sin(-r.yaw); hy = THREE.MathUtils.clamp(Math.atan2(-(_v.x * c + _v.z * s), -(-_v.x * s + _v.z * c)), -0.9, 0.9); }
    head.current.rotation.y += (hy - head.current.rotation.y) * (1 - Math.exp(-dt * 6));
    head.current.rotation.x = W.talk * Math.sin(t * 3.1) * 0.05 - W.point * 0.05;
    jaw.current.rotation.x = r.mouth * 0.38;

    // rüzgâr: atkı zinciri
    scarf.current.forEach((g, i) => { if (g) g.rotation.x = -0.35 - r.wind * (0.6 + Math.sin(t * 7 + i * 1.3) * 0.35) * (i + 1) * 0.5; });
  });

  return (
    <group ref={root}>
      <group ref={hips}>
        <group ref={legL} position={[-0.1, 0, 0]}><mesh geometry={G.leg} material={M.pants} castShadow={castShadow} /><mesh geometry={G.shoe} material={M.shoes} /></group>
        <group ref={legR} position={[0.1, 0, 0]}><mesh geometry={G.leg} material={M.pants} castShadow={castShadow} /><mesh geometry={G.shoe} material={M.shoes} /></group>
        <group ref={chest}>
          <mesh geometry={G.torso} material={M.top} castShadow={castShadow} />
          <group position={[0, DIM.torso + 0.02, 0]}>
            <mesh geometry={G.neck} material={M.skin} position={[0, 0.03, 0]} />
            {palette.scarf && (
              <>
                <mesh geometry={G.collar} material={M.scarf} position={[0, -0.01, 0]} />
                {/* atkının uçları: üç halkalı zincir, sırtta rüzgârla dalgalanır */}
                <group position={[0.04, -0.01, 0.07]}>
                  <group ref={(g) => { if (g) scarf.current[0] = g; }}><mesh geometry={G.scarf} material={M.scarf} />
                    <group position={[0, -0.16, 0]} ref={(g) => { if (g) scarf.current[1] = g; }}><mesh geometry={G.scarf} material={M.scarf} />
                      <group position={[0, -0.16, 0]} ref={(g) => { if (g) scarf.current[2] = g; }}><mesh geometry={G.scarf} material={M.scarf} /></group>
                    </group>
                  </group>
                </group>
              </>
            )}
            <group ref={head} position={[0, 0.2, 0]}>
              <mesh geometry={G.head} material={M.skin} castShadow={castShadow} />
              <mesh geometry={G.hair} material={M.hair} position={[0, 0.02, 0.01]} rotation={[-0.25, 0, 0]} />
              {[-1, 1].map((s) => <mesh key={s} geometry={G.eye} material={M.dark} position={[s * 0.052, 0.025, -0.135]} />)}
              {[-1, 1].map((s) => <mesh key={`b${s}`} geometry={G.brow} material={M.hair} position={[s * 0.052, 0.062, -0.14]} rotation={[0, 0, s * -0.12]} />)}
              <mesh geometry={G.nose} material={M.skin} position={[0, -0.005, -0.155]} />
              <mesh geometry={G.mouthTop} material={M.mouth} position={[0, -0.058, -0.142]} />
              {/* çene "kemiği": dudak senkronunda aşağı döner, içi koyu ağız görünür */}
              <group ref={jaw} position={[0, -0.06, -0.12]}>
                <mesh geometry={G.mouthIn} material={M.mouth} position={[0, 0, -0.022]} />
                <mesh geometry={G.jaw} material={M.skin} position={[0, -0.005, 0]} />
              </group>
            </group>
          </group>
          {/* omuz → dirsek → el */}
          <group ref={shL} position={[-0.23, DIM.torso - 0.06, 0]}>
            <mesh geometry={G.upper} material={M.top} />
            <group ref={elL} position={[0, -DIM.upper, 0]}><mesh geometry={G.fore} material={M.skin} /><mesh geometry={G.hand} material={M.skin} position={[0, -DIM.fore, 0]} /></group>
          </group>
          <group ref={shR} position={[0.23, DIM.torso - 0.06, 0]}>
            <mesh geometry={G.upper} material={M.top} />
            <group ref={elR} position={[0, -DIM.upper, 0]}>
              <mesh geometry={G.fore} material={M.skin} />
              <group position={[0, -DIM.fore, 0]}><mesh geometry={G.hand} material={M.skin} /><mesh geometry={G.finger} material={M.skin} rotation={[-Math.PI / 2, 0, 0]} /></group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
