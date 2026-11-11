import { useEffect, useMemo } from 'react';
import { useStore } from './store';
import { GLOBAL_QUESTS, buildProvinceQuest, buildRegionQuest, isComplete, type Quest } from './quests';
import { REGIONS } from '../data/regions';
import { useRegionSites } from './useRegionSites';

/** Mevcut bağlam için görev listesi: genel + bölge + il. */
export function useContextQuests(): Quest[] {
  const region = useStore((s) => s.region);
  const province = useStore((s) => s.province);
  const sites = useRegionSites(region);
  return useMemo(() => {
    const q: Quest[] = [];
    if (province && sites) q.push(buildProvinceQuest(province, sites.filter((s) => s.province === province)));
    if (region) q.push(buildRegionQuest(region));
    q.push(...GLOBAL_QUESTS);
    return q;
  }, [region, province, sites]);
}

/**
 * Keşif/inceleme her değiştiğinde tüm tanımlı görevleri kontrol eder;
 * yeni tamamlananlar için rozet bildirimi gösterir. İl görevleri, verisi yüklenmiş il için değerlendirilir.
 */
export function useQuestWatcher() {
  const discovered = useStore((s) => s.discovered);
  const inspected = useStore((s) => s.inspected);
  const region = useStore((s) => s.region);
  const province = useStore((s) => s.province);
  const sites = useRegionSites(region);

  useEffect(() => {
    const st = useStore.getState();
    const list = Object.values(discovered);
    const candidates: Quest[] = [...GLOBAL_QUESTS, ...REGIONS.map((r) => buildRegionQuest(r.id))];
    if (province && sites) candidates.push(buildProvinceQuest(province, sites.filter((s) => s.province === province)));
    for (const q of candidates) {
      if (!st.completedQuests.includes(q.id) && isComplete(q, list, inspected)) {
        st.markQuestComplete(q.id);
        // Toast'ı mühür bildiriminden sonra göster
        window.setTimeout(() => useStore.getState().showToast('Rozet kazanıldı', q.title), 1800);
      }
    }
  }, [discovered, inspected, province, sites]);
}
