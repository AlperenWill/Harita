import { Anchor, Landmark, Mountain, Sun, Trees, Waves, Wheat } from 'lucide-react';

const ICONS = { marmara: Waves, ege: Sun, akdeniz: Anchor, icanadolu: Wheat, karadeniz: Trees, doguanadolu: Mountain, guneydogu: Landmark };

/** Şehir ikonu: bölgesine göre Lucide simgesi */
export function RegionIcon({ region, size = 20 }: { region: string; size?: number }) {
  const Icon = ICONS[region as keyof typeof ICONS] ?? Landmark;
  return <Icon size={size} />;
}
