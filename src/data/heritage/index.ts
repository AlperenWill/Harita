import type { HeritageSite, RegionId } from '../types';

// Her bölgenin verisi ayrı bir chunk'a bölünür (code-splitting) ve
// yalnızca kullanıcı o bölgeye girdiğinde indirilir.
const loaders: Record<RegionId, () => Promise<{ default: HeritageSite[] }>> = {
  marmara: () => import('./marmara'),
  ege: () => import('./ege'),
  akdeniz: () => import('./akdeniz'),
  icanadolu: () => import('./icanadolu'),
  karadeniz: () => import('./karadeniz'),
  doguanadolu: () => import('./doguanadolu'),
  guneydogu: () => import('./guneydogu'),
};

const cache = new Map<RegionId, Promise<HeritageSite[]>>();

export function loadRegionSites(id: RegionId): Promise<HeritageSite[]> {
  let p = cache.get(id);
  if (!p) {
    p = loaders[id]().then((m) => m.default);
    cache.set(id, p);
  }
  return p;
}
