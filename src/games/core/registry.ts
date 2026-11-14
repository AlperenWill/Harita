import type { ComponentType } from 'react';
import type { GameDefinition, GameProps } from './types';

/**
 * Oyun kaydı: src/games/<id>/game.json dosyaları derleme anında toplanır (yeni klasör = haritada yeni yapı).
 * Oynanabilir oyunların kodu (index.tsx) ayrı paketlere bölünür ve yalnızca o oyun açılınca indirilir.
 */
const defs = import.meta.glob<GameDefinition>('../*/game.json', { eager: true, import: 'default' });
const modules = import.meta.glob<{ default: ComponentType<GameProps> }>('../*/index.tsx');

export const GAMES: GameDefinition[] = Object.values(defs).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
export const GAME_BY_ID: Record<string, GameDefinition> = Object.fromEntries(GAMES.map((g) => [g.id, g]));
export const hasModule = (id: string) => `../${id}/index.tsx` in modules;
export const loadGame = (id: string) => modules[`../${id}/index.tsx`]!();
