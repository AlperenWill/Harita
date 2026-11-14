import type { DeviceProfile } from './device';

/** src/games/<id>/game.json — şema: src/games/schema/game-definition.schema.json */
export type CameraPreset = 'cinematic-path' | 'locked-orbit' | 'first-person-walkthrough' | 'static-wide-pan' | 'third-person-tracking' | 'underwater-drift';
export interface GameDefinition {
  id: string;
  unescoId: string;
  name: string;
  kind: 'cami' | 'saray' | 'muze' | 'sarnic';
  district: string;
  coordinates: [number, number];
  status: 'playable' | 'research';
  unesco: { property: string; inscribed: number; component: string };
  summary: string;
  research: { constructionPeriod: string; architect: string; patron?: string; uniqueFeatures: string[]; restorationHistory: string[]; unverified?: string[] };
  transformation: {
    uniqueFeature: string; mechanic: string; mechanicType: string; winCondition: string;
    camera: { preset: CameraPreset; notes: string }; gestures: string[]; targetEmotion: string; avoidElements: string[];
  };
  budget: { maxAssetMB: number; targetFps: number; assetMB?: number };
  atmosphere: { light: string; ambient: AmbientPreset };
  fallback: { wikiTitle: string; narration: string };
  sources: { title: string; url: string; type: string }[];
}
export type AmbientPreset = 'courtyard-water' | 'dome-hum' | 'garden-birds' | 'cistern-drips';

/**
 * Her oyun modülü (src/games/<id>/index.tsx) bu sözleşmeyle varsayılan dışa aktarım yapar.
 * Oyun mantığı, kamera ve arayüz tamamen modülün içindedir; çekirdekle yalnızca bu props'larla konuşur.
 */
export interface GameProps {
  def: GameDefinition;
  device: DeviceProfile;
  /** Kazanma koşulu sağlandığında; bulgular Keşif Günlüğü'ne yazılır */
  onComplete: (finds: string[]) => void;
  /** Oyun içindeki tekil keşifler (ör. bir motif) */
  onFind: (key: string) => void;
  onExit: () => void;
}
