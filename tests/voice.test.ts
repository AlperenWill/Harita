/** Ortak ses seçici: kadın rehber kadın sesi, erkek rehber erkek sesi alır. */
import { describe, expect, it } from 'vitest';
import { guessGender, pickVoice } from '../src/app/games/shared/voice';

const V = (name: string, lang = 'tr-TR') => ({ name, lang, localService: true });
const WIN = [V('Microsoft Tolga - Turkish (Turkey)'), V('Microsoft Emel Online (Natural) - Turkish (Turkey)'), V('Microsoft Zira', 'en-US')];
describe('Türkçe ses seçimi', () => {
  it('cinsiyet tahmini', () => {
    expect(guessGender('Microsoft Tolga - Turkish')).toBe('male'); expect(guessGender('Yelda')).toBe('female'); expect(guessGender('Google Türkçe')).toBe('female'); expect(guessGender('Bilinmeyen')).toBeNull();
  });
  it('Windows: listede Tolga önce gelse de kadın rehber Emel’i, erkek rehber Tolga’yı alır', () => {
    expect(pickVoice(WIN, 'female')?.name).toContain('Emel'); expect(pickVoice(WIN, 'male')?.name).toContain('Tolga');
  });
  it('yalnız erkek ses varsa yine Türkçe ses döner (perde yükseltilerek kullanılır); Türkçe yoksa null', () => {
    expect(pickVoice([V('Microsoft Tolga')], 'female')?.name).toBe('Microsoft Tolga'); expect(pickVoice([V('Zira', 'en-US')], 'female')).toBeNull();
  });
});
