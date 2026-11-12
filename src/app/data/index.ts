import raw from './turkiye.json';

export interface Site {
  id: string;
  name: string;
  district: string | null;
  category: string;
  categoryLabel: string;
  period: string;
  periodLabel: string;
  coord: [number, number];
  summary: string;
  didYouKnow: string;
  wiki: string | null;
}
export interface City {
  id: string;
  name: string;
  plate: number;
  region: string;
  regionName: string;
  center: [number, number];
  summary: string;
  sites: Site[];
}

export const CITIES = (raw as unknown as { cities: City[] }).cities;
export const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));
export const SITES = CITIES.flatMap((c) => c.sites.map((s) => ({ ...s, city: c })));
export const SITE_BY_ID = new Map(SITES.map((s) => [s.id, s]));
export type SiteWithCity = (typeof SITES)[number];


/** Türkçe duyarlı, aksan bağımsız arama anahtarı */
export const norm = (s: string) =>
  s.toLocaleLowerCase('tr').replace(/[çc]/g, 'c').replace(/ğ/g, 'g').replace(/[ıi]/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
