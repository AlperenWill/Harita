import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SAFE_BUMP_INSTALLED, SAFE_BUMP_PARS, installSafeBump } from '../src/app/games/shared/safeBump';

describe('Güvenli kabartma gölgelendiricisi', () => {
  it('three sürümünün parçası beklenen imzayı taşıyor ve yama uygulanıyor', () => {
    expect(SAFE_BUMP_INSTALLED).toBe(true);
    expect(installSafeBump()).toBe(true);
    expect((THREE.ShaderChunk as unknown as Record<string, string>).bumpmap_pars_fragment).toBe(SAFE_BUMP_PARS);
  });
  it('sıfır türevde ve sıfır sonuç vektöründe yüzey normaline döner', () => {
    expect(SAFE_BUMP_PARS).toMatch(/dot\( dpx, dpx \) < 1e-20 \|\| dot\( dpy, dpy \) < 1e-20 \) return surf_norm;/);
    expect(SAFE_BUMP_PARS).toMatch(/l2 > 1e-12 \? n \* inversesqrt\( l2 \) : surf_norm/);
    expect(SAFE_BUMP_PARS).not.toMatch(/normalize\( dFdx/);
  });
  it('ortak modüller yamayı yüklüyor (kabartma kullanan her oyun bunlardan birini içe aktarır)', () => {
    for (const f of ['src/app/games/shared/scenery.tsx', 'src/app/games/shared/Polish.tsx']) expect(readFileSync(f, 'utf8')).toContain("import './safeBump';");
  });
});
