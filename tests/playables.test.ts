/** Oynanabilir yerler listesi (haritanın tek kaynağı) tutarlı mı? */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { PLAYABLES } from '../src/data/playables';
import { REGION_OF_PROVINCE } from '../src/data/regions';
import marmara from '../src/data/heritage/marmara';
import ege from '../src/data/heritage/ege';
import akdeniz from '../src/data/heritage/akdeniz';
import icanadolu from '../src/data/heritage/icanadolu';
import karadeniz from '../src/data/heritage/karadeniz';
import doguanadolu from '../src/data/heritage/doguanadolu';
import guneydogu from '../src/data/heritage/guneydogu';

const sites = new Map([marmara, ege, akdeniz, icanadolu, karadeniz, doguanadolu, guneydogu].flat().map((s) => [s.id, s]));
const app = readFileSync('src/app/App.tsx', 'utf8');

describe('oynanabilir yerler', () => {
  it('her kayıt miras verisindeki bir noktaya bağlı; il ve konum tutuyor; kimlikler tekil', () => {
    expect(new Set(PLAYABLES.map((p) => p.id)).size).toBe(PLAYABLES.length);
    for (const p of PLAYABLES) {
      const s = sites.get(p.id); expect(s, p.id).toBeDefined();
      expect(s!.province, p.id).toBe(p.province); expect(REGION_OF_PROVINCE[p.province], p.id).toBeDefined();
      expect(Math.abs(s!.coord[0] - p.coord[0]) + Math.abs(s!.coord[1] - p.coord[1]), p.id).toBeLessThan(0.01);
    }
  });
  it('her oyunun açılacağı yer gerçekten var (uygulama rotası ya da public/ dosyası)', () => {
    for (const p of PLAYABLES) {
      if (p.kind === 'static') expect(existsSync(`public/${p.path}`), p.path).toBe(true);
      else if (p.path.startsWith('anit/')) expect(app).toContain('path="anit/:id"');
      else expect(app, p.path).toContain(`path="${p.path}"`);
    }
  });
});
