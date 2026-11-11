import { feature, merge } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { REGIONS } from '../data/regions';
import type { RegionId } from '../data/types';

export type Lod = 'low' | 'high';
export type ProvinceTopology = Topology<{ provinces: GeometryCollection<{ name: string }> }>;
export type ProvinceFeature = Feature<Polygon | MultiPolygon, { name: string }>;

const cache = new Map<Lod, Promise<ProvinceTopology>>();

/** LOD'a göre TopoJSON'u indirir. "high" yalnızca bir bölgeye girildiğinde (veya boşta) istenir. */
export function loadTopology(lod: Lod): Promise<ProvinceTopology> {
  let p = cache.get(lod);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/tr-${lod}.topo.json`).then((r) => {
      if (!r.ok) throw new Error(`Harita verisi yüklenemedi (${lod})`);
      return r.json();
    });
    cache.set(lod, p);
  }
  return p;
}

export function provinceFeatures(topo: ProvinceTopology): ProvinceFeature[] {
  const fc = feature(topo, topo.objects.provinces) as unknown as { features: ProvinceFeature[] };
  return fc.features;
}

/** Bir bölgenin illerini topolojik olarak birleştirir: paylaşılan iç sınırlar yok olur. */
export function regionGeometry(topo: ProvinceTopology, id: RegionId): MultiPolygon {
  const names = new Set(REGIONS.find((r) => r.id === id)!.provinces);
  const geoms = topo.objects.provinces.geometries.filter((g) => names.has((g.properties as { name: string }).name));
  return merge(topo, geoms as never) as MultiPolygon;
}
