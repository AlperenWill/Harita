/**
 * Ortak oyun ayarları (bütün oyunlarda geçerli, tarayıcıda saklanır).
 * Konya / Antalya oyunlarındaki ayarlar sayfasına benzer: grafik kalitesi, ses, ses seviyesi, sesli anlatım, bakış hassasiyeti.
 * Adresteki ?q=low|medium|high her zaman önceliklidir (test ve hata ayıklama için).
 */
import { create } from 'zustand';

export type Quality = 'auto' | 'low' | 'medium' | 'high';
export type Tier = 'low' | 'medium' | 'high';
export interface GameSettings { quality: Quality; muted: boolean; volume: number; tts: boolean; sensitivity: number; battery: boolean }
const KEY = 'miras-oyun-ayarlari';
const DEFAULTS: GameSettings = { quality: 'auto', muted: false, volume: 0.8, tts: true, sensitivity: 1, battery: false };
function load(): GameSettings { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; } }

export const useSettings = create<GameSettings & { set: (p: Partial<GameSettings>) => void }>((set, get) => ({
  ...load(),
  set: (p) => { set(p); try { const { set: _s, ...rest } = { ...get(), ...p }; void _s; localStorage.setItem(KEY, JSON.stringify(rest)); } catch { /* gizli sekme: yalnız bu oturum */ } },
}));

/** Adresle sabitlenmiş kalite (?q=) */
export const urlQuality = (): Tier | null => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? q : null; };
/** Cihaza göre otomatik kalite */
export function autoTier(): Tier { const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
/** Başlangıç kalitesi: adres > kullanıcı seçimi > pil tasarrufu > otomatik */
export function initialTier(s: GameSettings = useSettings.getState()): Tier { return urlQuality() ?? (s.battery ? 'low' : s.quality !== 'auto' ? s.quality : autoTier()); }
/** Kare hızı düşünce kademeyi otomatik indirme yalnız "Otomatik"te açık */
export const adaptive = (s: GameSettings = useSettings.getState()) => !urlQuality() && !s.battery && s.quality === 'auto';
