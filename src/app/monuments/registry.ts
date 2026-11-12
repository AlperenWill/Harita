import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { MonumentData, MonumentSceneProps } from './types';
import anitkabir from './data/ankara-anitkabir.json';

/**
 * Anıt kaydı: yeni bir il/anıt eklemek için veri dosyasını ve sahne bileşenini buraya yazmak yeterli.
 * Sahneler lazy() ile ayrı paketlere bölünür; yalnızca etkinleştirilen anıtın kodu indirilir.
 */
export const MONUMENTS: Record<string, { data: MonumentData; Scene: LazyExoticComponent<ComponentType<MonumentSceneProps>> }> = {
  'ankara-anitkabir': {
    data: anitkabir as MonumentData,
    Scene: lazy(() => import('./anitkabir/AnitkabirScene')),
  },
};
