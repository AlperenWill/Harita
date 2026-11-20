/**
 * Ortak görüntü cilası (Efes, Kapadokya, Pamukkale, Troya).
 *  - Ortam yansıması: dosyasız, drei Lightformer'larla bir kerelik ortam küpü (gök + güneş tarafı + sıcak zemin sekmesi).
 *    Mermer, su ve cilalı yüzeyler gökyüzünü yansıtır; düz, "plastik" görünüm azalır.
 *  - Yüksek kademe: N8AO ortam gölgelemesi (köşe/dip kararması: alçak çokgenli modellere derinlik verir) + SMAA + hafif bloom + vinyet.
 *  - Orta kademe: SMAA + hafif bloom + vinyet (AO yok: telefonda pahalı).
 *  - Düşük kademe / pil tasarrufu: son işlem yok.
 */
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export function SkyEnvironment({ sky = '#cfe3ee', sun = '#fff1d8', ground = '#b9a57c', sunDir = [1, 0.6, 0.4] as [number, number, number] }) {
  return (
    <Environment resolution={64} frames={1}>
      <color attach="background" args={[sky]} />
      <Lightformer form="rect" intensity={0.6} color={sky} position={[0, 30, 0]} rotation-x={Math.PI / 2} scale={[80, 80, 1]} />
      <Lightformer form="circle" intensity={2} color={sun} position={[sunDir[0] * 30, sunDir[1] * 30, sunDir[2] * 30]} scale={10} />
      <Lightformer form="rect" intensity={0.3} color={ground} position={[0, -10, 0]} rotation-x={-Math.PI / 2} scale={[80, 80, 1]} />
    </Environment>
  );
}

export function Polish({ tier, saver = false, ao = 1.6 }: { tier: 'low' | 'medium' | 'high'; saver?: boolean; ao?: number }) {
  if (tier === 'low' || saver) return null;
  return (
    <EffectComposer multisampling={0}>
      {tier === 'high' ? <N8AO halfRes aoRadius={2.2} distanceFalloff={1.2} intensity={ao} quality="performance" /> : <></>}
      <SMAA />
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.3} intensity={0.35} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette darkness={0.32} offset={0.32} />
    </EffectComposer>
  );
}
