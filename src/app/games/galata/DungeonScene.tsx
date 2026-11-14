/**
 * Galata Kulesi — 1. bölüm: Zindan (Ceneviz armaları).
 *
 * Neden: Karanlık ve tek bir el feneri, oyuncuyu yavaş bakmaya ve mekânı "okumaya" zorlar. Armalar duvara
 * neredeyse görünmez biçimde işlenmiştir; yalnızca fenerin konisi içinde ortaya çıkar (özel fener shader'ı).
 * Kamera: birinci şahıs, kilitli bakış — yalnızca geçidin ekseninde ileri/geri; oyuncu kamerayı değil,
 * yalnızca feneri yönlendirir (fare / parmak sürükleme). Gölgeler kapalı: tek spot ışığı ve çok düşük ortam ışığı.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CRESTS, DUNGEON, BEAM_HALF_ANGLE, WALK_Z, trackBeam, type V3 } from './dungeon';
import { crestTexture } from './textures';
import { scaledUV, useStoneMaterial } from './TowerExterior';

export interface DungeonInput {
  /** Fenerin ekran üzerindeki hedefi (NDC, -1..1) */
  aim: React.MutableRefObject<{ x: number; y: number }>;
  /** İleri (+1) / geri (-1) */
  move: React.MutableRefObject<number>;
}

/** Fener shader'ı: arma boyası yalnızca koninin içinde görünür, dışında duvar rengine karışır */
function useRevealMaterial(id: string, beam: { pos: THREE.Vector3; dir: THREE.Vector3 }) {
  return useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ map: crestTexture(id), roughness: 0.85, transparent: false });
    const uniforms = {
      uBeamPos: { value: beam.pos }, uBeamDir: { value: beam.dir },
      uCosIn: { value: Math.cos(BEAM_HALF_ANGLE * 0.8) }, uCosOut: { value: Math.cos(BEAM_HALF_ANGLE * 1.9) },
      uWall: { value: new THREE.Color('#5f574c') },
    };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform vec3 uBeamPos;\nuniform vec3 uBeamDir;\nuniform float uCosIn;\nuniform float uCosOut;\nuniform vec3 uWall;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float reveal = smoothstep(uCosOut, uCosIn, dot(normalize(vWPos - uBeamPos), uBeamDir));
          diffuseColor.rgb = mix(uWall, diffuseColor.rgb, reveal);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * reveal * 0.18;');
    };
    return mat;
  }, [id, beam]);
}

function Crest({ id, pos, normal, found, beam }: { id: string; pos: V3; normal: V3; found: boolean; beam: { pos: THREE.Vector3; dir: THREE.Vector3 } }) {
  const mat = useRevealMaterial(id, beam);
  const ring = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.04); });
  const rotY = normal[0] > 0 ? Math.PI / 2 : normal[0] < 0 ? -Math.PI / 2 : 0;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh material={mat}><planeGeometry args={[0.95, 0.95]} /></mesh>
      {found && <mesh ref={ring} position={[0, 0, 0.01]}><ringGeometry args={[0.62, 0.68, 40]} /><meshBasicMaterial color="#f2c46b" toneMapped={false} /></mesh>}
    </group>
  );
}

export default function DungeonScene({ input, found, open, onHold, onFind }: {
  input: DungeonInput; found: string[]; open: boolean;
  onHold: (progress: Record<string, number>) => void; onFind: (id: string) => void;
}) {
  const { camera, scene } = useThree();
  const wall = useStoneMaterial('#8a8173');
  const floorMat = useStoneMaterial('#6b6257');
  const vaultMat = useMemo(() => { const m = wall.clone(); m.side = THREE.BackSide; return m; }, [wall]);
  const beam = useMemo(() => ({ pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1) }), []);
  const spot = useRef<THREE.SpotLight>(null!);
  const z = useRef(WALK_Z[0]);
  const hold = useRef<Record<string, number>>({});
  const foundRef = useRef(found); foundRef.current = found;
  const W = DUNGEON.wid / 2, L = DUNGEON.len / 2, H = DUNGEON.h;

  const geos = useMemo(() => ({
    side: scaledUV(new THREE.PlaneGeometry(DUNGEON.len, H), DUNGEON.len / 3, H / 3),
    end: scaledUV(new THREE.PlaneGeometry(DUNGEON.wid, H), DUNGEON.wid / 3, H / 3),
    floor: scaledUV(new THREE.PlaneGeometry(DUNGEON.wid, DUNGEON.len), DUNGEON.wid / 2, DUNGEON.len / 2),
    vault: scaledUV(new THREE.CylinderGeometry(W, W, DUNGEON.len, 24, 1, true, Math.PI / 2, Math.PI), 3, DUNGEON.len / 3),
    cap: new THREE.CircleGeometry(W, 24, 0, Math.PI),
  }), [W, H]);

  useEffect(() => {
    scene.background = new THREE.Color('#050404'); scene.fog = new THREE.Fog('#050404', 4, 16);
    camera.position.set(0, DUNGEON.eye, z.current); camera.rotation.set(0, 0, 0);
    (camera as THREE.PerspectiveCamera).fov = 62; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    return () => { scene.fog = null; };
  }, [camera, scene]);

  const ray = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    // yalnızca ileri/geri; bakış sabit (-z)
    z.current = THREE.MathUtils.clamp(z.current - input.move.current * dt * 1.6, WALK_Z[1], WALK_Z[0]);
    camera.position.set(0, DUNGEON.eye + Math.sin(z.current * 2.2) * 0.025, z.current);
    camera.rotation.set(0, 0, 0);
    // fener: ekrandaki hedef noktadan çıkan ışın yönü
    ray.set(input.aim.current.x, input.aim.current.y, 0.5).unproject(camera).sub(camera.position).normalize();
    beam.dir.lerp(ray, 1 - Math.exp(-dt * 14)).normalize();
    beam.pos.copy(camera.position).add(new THREE.Vector3(0.18, -0.25, 0));
    spot.current.position.copy(beam.pos);
    spot.current.target.position.copy(beam.pos).add(beam.dir);
    spot.current.target.updateMatrixWorld();
    const r = trackBeam(hold.current, foundRef.current, beam.pos.toArray() as V3, beam.dir.toArray() as V3, dt);
    hold.current = r.hold; onHold(r.hold);
    r.newly.forEach(onFind);
  });

  return (
    <group>
      <ambientLight intensity={0.035} color="#8fa3c0" />
      <spotLight ref={spot} intensity={55} distance={18} decay={2} angle={BEAM_HALF_ANGLE * 2.1} penumbra={0.55} color="#ffe2b0" castShadow={false} />
      <mesh geometry={geos.floor} material={floorMat} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={geos.side} material={wall} position={[-W, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={geos.side} material={wall} position={[W, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <mesh geometry={geos.end} material={wall} position={[0, H / 2, L]} rotation={[0, Math.PI, 0]} />
      <mesh geometry={geos.end} material={wall} position={[0, H / 2, -L]} />
      {/* tonoz */}
      <mesh geometry={geos.vault} material={vaultMat} position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={geos.cap} material={wall} position={[0, H, -L]} />
      <mesh geometry={geos.cap} material={wall} position={[0, H, L]} rotation={[0, Math.PI, 0]} />
      {CRESTS.map((c) => <Crest key={c.id} id={c.id} pos={c.pos} normal={c.normal} found={found.includes(c.id)} beam={beam} />)}
      {/* merdivene açılan kapı: tüm armalar bulununca aydınlanır */}
      <group position={[-1.6, 0, -L + 0.03]}>
        <mesh position={[0, 1.15, 0]}><planeGeometry args={[1.1, 2.3]} /><meshBasicMaterial color={open ? '#f0c27a' : '#0d0b09'} toneMapped={false} /></mesh>
        {open && <pointLight position={[0, 1.2, 0.6]} intensity={6} distance={6} color="#ffcf8a" />}
      </group>
    </group>
  );
}
