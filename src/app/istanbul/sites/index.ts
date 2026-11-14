import type { IstanbulSite } from '../types';
import sultanahmet from './sultanahmet-camii.json';
import ayasofya from './ayasofya.json';
import topkapi from './topkapi-sarayi.json';
import suleymaniye from './suleymaniye.json';

/** Yeni bir UNESCO noktası eklemek: sites/ altına JSON + (varsa) EXPERIENCES'a sahne. Ana sistem değişmez. */
export const SITES = [sultanahmet, ayasofya, topkapi, suleymaniye] as IstanbulSite[];
export const SITE_BY_ID = Object.fromEntries(SITES.map((s) => [s.id, s])) as Record<string, IstanbulSite>;
