/** Gün döngüsü yardımcıları: saat biçimi ve 0–24 sarma. */
export const clock = (h: number) => { const m = Math.round((((h % 24) + 24) % 24) * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export const wrapHour = (h: number) => ((h % 24) + 24) % 24;
