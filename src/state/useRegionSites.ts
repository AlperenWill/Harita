import { useEffect, useState } from 'react';
import type { HeritageSite, RegionId } from '../data/types';
import { loadRegionSites } from '../data/heritage';

/** Bölge miras verisini lazy-load eder (bölge başına ayrı JS chunk'ı). */
export function useRegionSites(region: RegionId | null): HeritageSite[] | null {
  const [sites, setSites] = useState<{ region: RegionId; list: HeritageSite[] } | null>(null);
  useEffect(() => {
    if (!region) return;
    let alive = true;
    loadRegionSites(region).then((list) => alive && setSites({ region, list }));
    return () => {
      alive = false;
    };
  }, [region]);
  return region && sites?.region === region ? sites.list : null;
}
