import { CITIES, SITES, type SiteWithCity } from '../data';
import { seeded, shuffle } from './random';

export interface Question {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

const PERIODS = ['Tarih Öncesi', 'Tunç Çağı & Hitit', 'Demir Çağı Krallıkları', 'Klasik & Roma', 'Bizans & Ortaçağ', 'Selçuklu & Beylikler', 'Osmanlı', 'Cumhuriyet', 'Yaşayan Miras'];
const CATEGORIES = ['UNESCO Dünya Mirası', 'Müze', 'Han & Kervansaray', 'Tarihî Köprü', 'Arkeolojik Alan', 'Mimari Yapı', 'Somut Olmayan Miras', 'Kültürel Peyzaj'];

/** Doğru cevap + havuzdan 3 farklı çeldirici → karışık 4 seçenek */
function mc(q: string, correct: string, pool: string[], rnd: () => number, explain?: string): Question | null {
  const distract = shuffle([...new Set(pool.filter((p) => p !== correct))], rnd).slice(0, 3);
  if (distract.length < 3) return null;
  const options = shuffle([correct, ...distract], rnd);
  return { q, options, answer: options.indexOf(correct), explain };
}

/**
 * Bir tarihi nokta için veri setinden otomatik 5 soru üretir.
 * Sorular yalnızca doğrulanmış verideki alanlardan (il, ilçe, dönem, tür, açıklama) türetilir.
 */
export function buildSiteQuiz(site: SiteWithCity, seed: number): Question[] {
  const rnd = seeded(seed);
  const city = site.city;
  const sameRegion = CITIES.filter((c) => c.region === city.region).map((c) => c.name);
  const otherCities = CITIES.map((c) => c.name);
  const qs: (Question | null)[] = [];

  qs.push(mc(`${site.name} hangi ilimizde bulunur?`, city.name, sameRegion.length > 3 ? sameRegion : otherCities, rnd,
    `${site.name}, ${city.regionName} Bölgesi’ndeki ${city.name} ilindedir.`));
  qs.push(mc(`${site.name} hangi döneme aittir?`, site.periodLabel, PERIODS, rnd, site.summary));

  const fact = mc(`Aşağıdakilerden hangisi ${site.name} hakkında doğru bir bilgidir?`, site.didYouKnow,
    SITES.filter((s) => s.city.region !== city.region).map((s) => s.didYouKnow), rnd);
  qs.push(fact);

  if (site.district && site.district !== 'Merkez') {
    const districts = SITES.filter((s) => s.district && s.district !== 'Merkez' && s.district !== site.district).map((s) => s.district!);
    qs.push(mc(`${site.name}, ${city.name} ilinin hangi ilçesindedir?`, site.district, districts, rnd));
  } else {
    qs.push(mc(`${site.name} hangi türde bir miras alanıdır?`, site.categoryLabel, CATEGORIES, rnd, site.summary));
  }

  const sibling = city.sites.find((s) => s.id !== site.id);
  const target = sibling ?? site;
  qs.push(mc(`Aşağıdaki tarihi yerlerden hangisi ${city.name} ilinde bulunur?`, target.name,
    SITES.filter((s) => s.city.id !== city.id).map((s) => s.name), rnd, `${target.name} ${city.name} ilindedir.`));

  return qs.filter((q): q is Question => q !== null);
}
