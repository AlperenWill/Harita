import * as THREE from 'three';

export const PALETTE = {
  bg: '#191512',
  sea: '#1b2729',
  cini: '#4fb3a9', // çini turkuazı — vurgu
  cobalt: '#3a63a8',
  saffron: '#d9a441',
  stone: '#cfc3b0',
  sideDark: 0.62, // yan yüzlerin üst yüze göre koyuluk çarpanı
};

const tmp = new THREE.Color();
export function shade(hex: string, k: number): THREE.Color {
  return tmp.set(hex).clone().multiplyScalar(k);
}

/** İllerin bölge renginden küçük açıklık sapmaları: sınırların hem çizgiyle hem tonla okunması için. */
export function provinceTint(regionHex: string, index: number): THREE.Color {
  const c = new THREE.Color(regionHex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const jitter = (((index * 37) % 7) - 3) * 0.022;
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + jitter, 0, 1));
  return c;
}

let _stone: THREE.CanvasTexture | null = null;
/**
 * Prosedürel taş dokusu (tek seferlik 128px canvas): PBR malzemelerde map + roughnessMap.
 * Harici görsel indirmeden "taş" hissi verir; modeller GPU'da tek doku paylaşır.
 */
export function stoneTexture(): THREE.CanvasTexture {
  if (_stone) return _stone;
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // kaba blok derzleri + ince gren
      const joint = y % 32 < 2 || (x + (Math.floor(y / 32) % 2) * 16) % 48 < 2 ? 0.72 : 1;
      const v = (200 + rnd() * 45) * joint;
      img.data[i] = v;
      img.data[i + 1] = v * 0.97;
      img.data[i + 2] = v * 0.92;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  _stone = new THREE.CanvasTexture(cv);
  _stone.wrapS = _stone.wrapT = THREE.RepeatWrapping;
  _stone.colorSpace = THREE.SRGBColorSpace;
  return _stone;
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isCoarse = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
