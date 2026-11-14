import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020';
import { geoArea, geoContains } from 'd3-geo';
import { GAMES, hasModule } from '../src/games/core/registry';
import { STAGES, Steering, createGame, step, targetPool, blocked, POOL_R, START } from '../src/games/sultanahmet-camii/mechanics';
import { MOTIFS } from '../src/games/sultanahmet-camii/layout';

const schema = JSON.parse(readFileSync('src/games/schema/game-definition.schema.json', 'utf8'));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const raw = JSON.parse(readFileSync('data/raw/istanbul-districts.geojson', 'utf8'));
const fix = (r: any) => (geoArea({ type: 'Polygon', coordinates: r } as any) > 2 * Math.PI ? r.map((x: any) => [...x].reverse()) : r);
const districts = raw.features.map((f: any) => ({ ...f, geometry: f.geometry.type === 'Polygon' ? { ...f.geometry, coordinates: fix(f.geometry.coordinates) } : { ...f.geometry, coordinates: f.geometry.coordinates.map(fix) } }));

describe('oyun tanımları (UNESCO → mekanik şablonu)', () => {
  const dirs = readdirSync('src/games').filter((d) => existsSync(`src/games/${d}/game.json`));
  it('beş yapı, her biri kendi klasöründe', () => expect(dirs.sort()).toEqual(['ayasofya', 'suleymaniye', 'sultanahmet-camii', 'topkapi-sarayi', 'yerebatan-sarnici']));
  it('her game.json JSON Schema’ya uyar ve klasör adı kimlikle aynıdır', () => {
    for (const d of dirs) {
      const g = JSON.parse(readFileSync(`src/games/${d}/game.json`, 'utf8'));
      expect(validate(g), `${d}: ${JSON.stringify(validate.errors)}`).toBe(true);
      expect(g.id).toBe(d);
    }
  });
  it('kayıt: tanımlar toplanır; yalnızca oynanabilir olanların kodu var', () => {
    expect(GAMES).toHaveLength(5);
    for (const g of GAMES) expect(hasModule(g.id), g.id).toBe(g.status === 'playable');
  });
  it('koordinatlar beyan edilen ilçede', () => {
    for (const g of GAMES) expect(districts.find((f: any) => geoContains(f, g.coordinates))?.properties.name, g.id).toBe(g.district);
  });
  it('her oyunun kendi kamera ön ayarı var; serbest kamera yok', () => {
    const presets = GAMES.map((g) => g.transformation.camera.preset);
    expect(new Set(presets).size).toBe(presets.length);
    expect(presets).not.toContain('freecam');
  });
});

describe('Sultanahmet: ışık takibi', () => {
  it('6 aşama, saat sırasıyla; her aşamanın ışık penceresinde bir havuz var', () => {
    expect(STAGES.map((s) => s.motif).sort()).toEqual([...MOTIFS].sort());
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i].from).toBeGreaterThanOrEqual(STAGES[i - 1].from);
    for (const s of STAGES) {
      expect(s.to - s.from, s.motif).toBeGreaterThan(0.2);
      for (let h = s.from; h <= s.to; h += 0.1) expect(targetPool(s, h), `${s.motif} ${h}`).not.toBeNull();
    }
  });
  it('havuzlar oyuncunun durabileceği yerde', () => {
    for (const s of STAGES) { const p = targetPool(s, (s.from + s.to) / 2)!; expect(blocked(p[0], p[2]), s.motif).toBe(false); }
  });
  it('ışığı takip eden oyuncu geri sarma olmadan 6 deseni açar', () => {
    let g = createGame(); const ev: string[] = []; const nav = new Steering();
    for (let i = 0; i < 60 * 60 * 15 && !g.done; i++) {
      const pool = targetPool(STAGES[g.stage], g.hour);
      const r = step(g, pool ? nav.direction(g.avatar, { x: pool[0], z: pool[2] }, 1 / 60) : { x: 0, z: 0 }, 1 / 60); g = r.state; ev.push(...r.events.map((e) => e.type));
    }
    expect(g.done).toBe(true);
    expect(g.revealed).toHaveLength(6);
    expect(ev.filter((e) => e === 'rewind')).toHaveLength(0);
    expect(g.elapsed).toBeLessThan(600);
  });
  it('hareketsiz oyuncu kaybetmez; güneş geri sarılır', () => {
    let g = createGame(); const ev: string[] = [];
    for (let i = 0; i < 60 * 120; i++) { const r = step(g, { x: 0, z: 0 }, 1 / 60); g = r.state; ev.push(...r.events.map((e) => e.type)); }
    expect(g.done).toBe(false);
    expect(ev).toContain('rewind');
    expect(g.stage).toBe(0);
  });
  it('başlangıç noktası serbest, havuz yarıçapı makul', () => { expect(blocked(START.x, START.z)).toBe(false); expect(POOL_R).toBeGreaterThan(1.5); });
});
