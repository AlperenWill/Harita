import { useMemo } from 'react';
import * as THREE from 'three';
import { Detailed, useGLTF } from '@react-three/drei';
import type { HeritageSite } from '../../data/types';
import { stoneTexture } from '../theme';

export type ModelKind =
  | 'mosque' | 'portal' | 'basilica' | 'temple' | 'mound' | 'pillars'
  | 'bridge' | 'caravanserai' | 'rockfacade' | 'colonnade' | 'motif' | 'landscape';

/** Kategori + dönemden prosedürel model tipi türetilir. */
export function modelKindFor(s: HeritageSite): ModelKind {
  if (s.category === 'somut-olmayan') return 'motif';
  if (s.category === 'kopru') return 'bridge';
  if (s.category === 'han') return 'caravanserai';
  if (s.category === 'kultur-peyzaji') return 'landscape';
  switch (s.period) {
    case 'prehistorik': return s.id === 'gobeklitepe' || s.id === 'karahantepe' ? 'pillars' : 'mound';
    case 'tunc': return 'mound';
    case 'demir': return 'rockfacade';
    case 'antik': return 'temple';
    case 'bizans': return 'basilica';
    case 'selcuklu': return 'portal';
    case 'osmanli': return 'mosque';
    case 'cumhuriyet': return 'colonnade';
    default: return 'landscape';
  }
}

/** Her model tipinde "kayıp mimari detay"ın yerleştiği nokta (model yerel koordinatı) */
export const HOTSPOT: Record<ModelKind, [number, number, number]> = {
  mosque: [0.26, 0.62, 0.0],
  portal: [0, 0.34, 0.21],
  basilica: [0, 0.5, 0.0],
  temple: [0, 0.38, 0.2],
  mound: [0.05, 0.22, 0.12],
  pillars: [0.12, 0.28, 0.1],
  bridge: [0, 0.2, 0.06],
  caravanserai: [0, 0.22, 0.25],
  rockfacade: [0, 0.3, 0.16],
  colonnade: [0, 0.3, 0.22],
  motif: [0, 0.55, 0],
  landscape: [0.12, 0.3, 0.05],
};

interface Mats { stone: THREE.Material; dark: THREE.Material; accent: THREE.Material; earth: THREE.Material; wood: THREE.Material }

function useMats(): Mats {
  return useMemo(() => {
    const tex = stoneTexture();
    // PBR: tamamen mat taş, hafif metalik çini, sıcak toprak. flatShading low-poly estetiğini korur.
    const stone = new THREE.MeshStandardMaterial({ color: '#d8cbb6', map: tex, roughnessMap: tex, roughness: 0.92, metalness: 0, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: '#8f8273', roughness: 0.95, flatShading: true });
    const accent = new THREE.MeshStandardMaterial({ color: '#3f9c96', roughness: 0.32, metalness: 0.25, flatShading: true });
    const earth = new THREE.MeshStandardMaterial({ color: '#b48a67', roughness: 1, flatShading: true });
    const wood = new THREE.MeshStandardMaterial({ color: '#8a5f3e', roughness: 0.8, flatShading: true });
    return { stone, dark, accent, earth, wood };
  }, []);
}

/** detail: 0 = yakın (yüksek), 1 = orta, 2 = uzak (düşük poligon) */
function seg(detail: number, hi: number, lo: number) {
  return Math.max(3, Math.round(detail === 0 ? hi : detail === 1 ? (hi + lo) / 2 : lo));
}

function Build({ kind, detail, m }: { kind: ModelKind; detail: number; m: Mats }) {
  const r = seg(detail, 24, 6);
  switch (kind) {
    case 'mosque':
      return (
        <group>
          <mesh material={m.stone} position={[0, 0.12, 0]}><boxGeometry args={[0.46, 0.24, 0.46]} /></mesh>
          <mesh material={m.dark} position={[0, 0.27, 0]}><cylinderGeometry args={[0.17, 0.2, 0.06, r]} /></mesh>
          <mesh material={m.dark} position={[0, 0.3, 0]}><sphereGeometry args={[0.19, r, Math.max(3, r / 2), 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          {[-1, 1].map((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} material={m.dark} position={[sx * 0.16, 0.24, sz * 0.16]}><sphereGeometry args={[0.06, Math.max(4, r / 2), 4, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          )))}
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * 0.29, 0, -0.2]}>
              <mesh material={m.stone} position={[0, 0.34, 0]}><cylinderGeometry args={[0.028, 0.034, 0.68, Math.max(6, r / 2)]} /></mesh>
              <mesh material={m.stone} position={[0, 0.52, 0]}><cylinderGeometry args={[0.048, 0.048, 0.02, 8]} /></mesh>
              <mesh material={m.accent} position={[0, 0.75, 0]}><coneGeometry args={[0.032, 0.14, Math.max(6, r / 2)]} /></mesh>
            </group>
          ))}
        </group>
      );
    case 'portal':
      return (
        <group>
          <mesh material={m.stone} position={[0, 0.14, -0.05]}><boxGeometry args={[0.6, 0.28, 0.4]} /></mesh>
          <mesh material={m.stone} position={[0, 0.22, 0.17]}><boxGeometry args={[0.24, 0.44, 0.08]} /></mesh>
          <mesh material={m.dark} position={[0, 0.17, 0.215]}><boxGeometry args={[0.1, 0.24, 0.01]} /></mesh>
          {/* mukarnas yarım kubbe */}
          <mesh material={m.accent} position={[0, 0.31, 0.2]} rotation={[Math.PI / 2, 0, 0]}><sphereGeometry args={[0.07, seg(detail, 10, 4), 4, 0, Math.PI]} /></mesh>
          <mesh material={m.dark} position={[0.18, 0.36, -0.12]}><cylinderGeometry args={[0.09, 0.09, 0.16, seg(detail, 10, 5)]} /></mesh>
          <mesh material={m.dark} position={[0.18, 0.49, -0.12]}><coneGeometry args={[0.1, 0.12, seg(detail, 10, 5)]} /></mesh>
        </group>
      );
    case 'basilica':
      return (
        <group>
          <mesh material={m.stone} position={[0, 0.12, 0]}><boxGeometry args={[0.62, 0.24, 0.34]} /></mesh>
          <mesh material={m.stone} position={[0, 0.12, 0]}><boxGeometry args={[0.3, 0.24, 0.56]} /></mesh>
          <mesh material={m.stone} position={[0, 0.3, 0]}><cylinderGeometry args={[0.11, 0.11, 0.14, seg(detail, 12, 6)]} /></mesh>
          <mesh material={m.earth} position={[0, 0.37, 0]}><sphereGeometry args={[0.11, r, Math.max(3, r / 2), 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh material={m.earth} position={[0.31, 0.12, 0]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 0.24, r, 1, false, 0, Math.PI]} /></mesh>
        </group>
      );
    case 'temple': {
      const cols = detail === 2 ? 4 : 6;
      return (
        <group>
          <mesh material={m.stone} position={[0, 0.03, 0]}><boxGeometry args={[0.66, 0.06, 0.42]} /></mesh>
          {Array.from({ length: cols }).map((_, i) =>
            [-1, 1].map((sz) => (
              <mesh key={`${i}${sz}`} material={m.stone} position={[-0.27 + (i * 0.54) / (cols - 1), 0.19, sz * 0.16]}>
                <cylinderGeometry args={[0.025, 0.028, 0.26, seg(detail, 10, 4)]} />
              </mesh>
            )),
          )}
          <mesh material={m.stone} position={[0, 0.34, 0]}><boxGeometry args={[0.66, 0.05, 0.42]} /></mesh>
          {/* yıkık köşe: bir sütun devrilmiş */}
          <mesh material={m.dark} position={[0.38, 0.04, 0.24]} rotation={[0, 0.4, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.028, 0.24, 6]} /></mesh>
          <mesh material={m.earth} position={[0, 0.4, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.001, 0.24, 0.66, 3, 1]} />
          </mesh>
        </group>
      );
    }
    case 'mound':
      return (
        <group>
          <mesh material={m.earth} position={[0, 0, 0]}><sphereGeometry args={[0.42, r, Math.max(3, r / 3), 0, Math.PI * 2, 0, Math.PI / 2.6]} /></mesh>
          {/* kazı açması */}
          <mesh material={m.dark} position={[0.05, 0.16, 0.12]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.24, 0.05, 0.16]} /></mesh>
          {Array.from({ length: detail === 2 ? 2 : 5 }).map((_, i) => (
            <mesh key={i} material={m.stone} position={[-0.04 + i * 0.045, 0.2, 0.12]}><boxGeometry args={[0.03, 0.04, 0.12]} /></mesh>
          ))}
        </group>
      );
    case 'pillars':
      return (
        <group>
          <mesh material={m.earth} position={[0, 0.02, 0]}><cylinderGeometry args={[0.45, 0.5, 0.04, r]} /></mesh>
          {Array.from({ length: detail === 2 ? 5 : 9 }).map((_, i, a) => {
            const t = (i / a.length) * Math.PI * 2;
            return (
              <group key={i} position={[Math.cos(t) * 0.32, 0, Math.sin(t) * 0.32]} rotation={[0, -t, 0]}>
                <mesh material={m.stone} position={[0, 0.13, 0]}><boxGeometry args={[0.03, 0.22, 0.07]} /></mesh>
                <mesh material={m.stone} position={[0, 0.26, 0]}><boxGeometry args={[0.04, 0.04, 0.14]} /></mesh>
              </group>
            );
          })}
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * 0.08, 0, 0]}>
              <mesh material={m.stone} position={[0, 0.2, 0]}><boxGeometry args={[0.04, 0.36, 0.1]} /></mesh>
              <mesh material={m.stone} position={[0, 0.4, 0]}><boxGeometry args={[0.05, 0.06, 0.2]} /></mesh>
            </group>
          ))}
        </group>
      );
    case 'bridge': {
      const arches = 3;
      return (
        <group>
          {Array.from({ length: arches }).map((_, i) => (
            <mesh key={i} material={m.stone} position={[-0.3 + i * 0.3, 0.0, 0]}>
              <torusGeometry args={[0.13, 0.035, 4, seg(detail, 12, 5), Math.PI]} />
            </mesh>
          ))}
          <mesh material={m.stone} position={[0, 0.17, 0]}><boxGeometry args={[0.96, 0.04, 0.09]} /></mesh>
          {Array.from({ length: arches + 1 }).map((_, i) => (
            <mesh key={i} material={m.stone} position={[-0.45 + i * 0.3, 0.07, 0]}><boxGeometry args={[0.07, 0.16, 0.09]} /></mesh>
          ))}
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.5]} />
            <meshStandardMaterial color="#2f6f73" roughness={0.15} metalness={0.3} transparent opacity={0.8} />
          </mesh>
        </group>
      );
    }
    case 'caravanserai':
      return (
        <group>
          {/* avlu çevresi */}
          <mesh material={m.stone} position={[0, 0.1, -0.2]}><boxGeometry args={[0.6, 0.2, 0.1]} /></mesh>
          <mesh material={m.stone} position={[-0.25, 0.1, 0.02]}><boxGeometry args={[0.1, 0.2, 0.36]} /></mesh>
          <mesh material={m.stone} position={[0.25, 0.1, 0.02]}><boxGeometry args={[0.1, 0.2, 0.36]} /></mesh>
          <mesh material={m.stone} position={[-0.17, 0.1, 0.2]}><boxGeometry args={[0.26, 0.2, 0.08]} /></mesh>
          <mesh material={m.stone} position={[0.17, 0.1, 0.2]}><boxGeometry args={[0.26, 0.2, 0.08]} /></mesh>
          {/* taç kapı */}
          <mesh material={m.stone} position={[0, 0.15, 0.22]}><boxGeometry args={[0.16, 0.3, 0.06]} /></mesh>
          <mesh material={m.dark} position={[0, 0.11, 0.252]}><boxGeometry args={[0.07, 0.16, 0.01]} /></mesh>
          {/* köşk mescit */}
          <mesh material={m.dark} position={[0, 0.08, 0]}><boxGeometry args={[0.1, 0.16, 0.1]} /></mesh>
          {[[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.24], [0.3, 0.24]].map(([px, pz], i) => (
            <mesh key={i} material={m.stone} position={[px, 0.11, pz]}><cylinderGeometry args={[0.045, 0.05, 0.22, seg(detail, 8, 4)]} /></mesh>
          ))}
        </group>
      );
    case 'rockfacade':
      return (
        <group>
          <mesh material={m.earth} position={[0, 0.2, -0.06]}><dodecahedronGeometry args={[0.32, detail === 0 ? 1 : 0]} /></mesh>
          <mesh material={m.stone} position={[0, 0.25, 0.17]}><boxGeometry args={[0.3, 0.32, 0.04]} /></mesh>
          <mesh material={m.stone} position={[0, 0.44, 0.17]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.21, 0.21, 0.04]} /></mesh>
          {detail < 2 && Array.from({ length: 4 }).map((_, i) => (
            <mesh key={i} material={m.dark} position={[0, 0.14 + i * 0.06, 0.195]}><boxGeometry args={[0.26, 0.012, 0.01]} /></mesh>
          ))}
          <mesh material={m.dark} position={[0, 0.16, 0.195]}><boxGeometry args={[0.07, 0.12, 0.01]} /></mesh>
        </group>
      );
    case 'colonnade':
      return (
        <group>
          <mesh material={m.stone} position={[0, 0.04, 0]}><boxGeometry args={[0.8, 0.08, 0.5]} /></mesh>
          <mesh material={m.stone} position={[0, 0.2, 0]}><boxGeometry args={[0.5, 0.24, 0.3]} /></mesh>
          {Array.from({ length: detail === 2 ? 5 : 9 }).map((_, i, a) => (
            <mesh key={i} material={m.stone} position={[-0.24 + (i * 0.48) / (a.length - 1), 0.21, 0.17]}><boxGeometry args={[0.025, 0.26, 0.025]} /></mesh>
          ))}
          <mesh material={m.stone} position={[0, 0.35, 0.02]}><boxGeometry args={[0.56, 0.04, 0.38]} /></mesh>
        </group>
      );
    case 'motif':
      return (
        <group>
          <mesh material={m.stone} position={[0, 0.03, 0]}><cylinderGeometry args={[0.36, 0.4, 0.06, seg(detail, 16, 8)]} /></mesh>
          {/* sekiz köşeli yıldız: iki dönük kare */}
          {[0, Math.PI / 4].map((rot) => (
            <mesh key={rot} material={m.accent} position={[0, 0.07, 0]} rotation={[0, rot, 0]}><boxGeometry args={[0.32, 0.02, 0.32]} /></mesh>
          ))}
          <mesh material={m.wood} position={[0, 0.3, 0]}><cylinderGeometry args={[0.02, 0.02, 0.44, 6]} /></mesh>
          <mesh material={m.accent} position={[0, 0.55, 0]}><icosahedronGeometry args={[0.07, detail === 0 ? 1 : 0]} /></mesh>
        </group>
      );
    case 'landscape':
    default:
      return (
        <group>
          {[[0, 0, 0.3, 0.42], [0.25, 0.08, 0.2, 0.3], [-0.24, -0.1, 0.22, 0.36], [0.05, -0.25, 0.16, 0.26]].map(([px, pz, rad, h], i) => (
            <mesh key={i} material={i % 2 ? m.earth : m.stone} position={[px, h / 2, pz]}><coneGeometry args={[rad * 0.6, h, seg(detail, 9, 4)]} /></mesh>
          ))}
          <mesh material={m.dark} position={[0.12, 0.1, 0.22]}><boxGeometry args={[0.12, 0.1, 0.1]} /></mesh>
        </group>
      );
  }
}

/**
 * LOD: drei <Detailed> mesafeye göre üç detay seviyesi arasında geçiş yapar.
 * site.model tanımlıysa Draco sıkıştırılmış GLB yüklenir (useGLTF Draco çözücüsünü
 * yalnızca ilk sıkıştırılmış model istendiğinde indirir).
 */
export function SiteModel({ site, kind }: { site: HeritageSite; kind: ModelKind }) {
  const m = useMats();
  if (site.model) return <GltfModel url={site.model} />;
  return (
    <Detailed distances={[0, 6, 14]}>
      <Build kind={kind} detail={0} m={m} />
      <Build kind={kind} detail={1} m={m} />
      <Build kind={kind} detail={2} m={m} />
    </Detailed>
  );
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, true);
  return <primitive object={scene} />;
}
