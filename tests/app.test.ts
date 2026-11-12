import { describe, expect, it } from 'vitest';
import { CITIES, SITES } from '../src/app/data';
import { buildSiteQuiz } from '../src/app/lib/quiz';
import { buildGeneralQuiz } from '../src/app/lib/generalQuiz';
import { localAnswer } from '../src/app/lib/assistant';
import { seeded } from '../src/app/lib/random';

const EXPECTED = 'Adana, Adıyaman, Afyonkarahisar, Ağrı, Amasya, Ankara, Antalya, Artvin, Aydın, Balıkesir, Bartın, Batman, Bayburt, Bilecik, Bingöl, Bitlis, Bolu, Burdur, Bursa, Çanakkale, Çankırı, Çorum, Denizli, Diyarbakır, Düzce, Edirne, Elazığ, Erzincan, Erzurum, Eskişehir, Gaziantep, Giresun, Gümüşhane, Hakkâri, Hatay, Iğdır, Isparta, İstanbul, İzmir, Kahramanmaraş, Karabük, Karaman, Kars, Kastamonu, Kayseri, Kırıkkale, Kırklareli, Kırşehir, Kilis, Kocaeli, Konya, Kütahya, Malatya, Manisa, Mardin, Mersin, Muğla, Muş, Nevşehir, Niğde, Ordu, Osmaniye, Rize, Sakarya, Samsun, Şanlıurfa, Siirt, Sinop, Sivas, Şırnak, Tekirdağ, Tokat, Trabzon, Tunceli, Uşak, Van, Yalova, Yozgat, Zonguldak, Aksaray, Ardahan'.split(', ');

describe('uygulama verisi (turkiye.json)', () => {
  it('istenen 81 ilin tamamı, tekrarsız ve alfabetik', () => {
    const names = CITIES.map((c) => c.name);
    expect(new Set(names).size).toBe(81);
    expect([...names].sort()).toEqual([...EXPECTED].sort());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'tr')));
  });
  it('her ilde en az bir tarihi nokta ve geçerli işaretçi konumu var', () => {
    for (const c of CITIES) {
      expect(c.sites.length, c.name).toBeGreaterThan(0);
      expect(c.center[0]).toBeGreaterThan(25); expect(c.center[0]).toBeLessThan(45);
      expect(c.center[1]).toBeGreaterThan(35.5); expect(c.center[1]).toBeLessThan(42.5);
    }
  });
  it('istenen örnek tarihi noktalar mevcut', () => {
    const names = new Set(SITES.map((s) => s.name));
    for (const n of ['Ayasofya', 'Kız Kulesi', 'Galata Kulesi', 'Topkapı Sarayı', 'Yerebatan Sarnıcı', 'Anıtkabir', 'Ankara Kalesi', 'Augustus Tapınağı',
      'Efes Antik Kenti', 'İzmir Saat Kulesi', 'Bergama (Pergamon)', 'İzmir Agorası', 'Göbeklitepe', 'Halfeti', 'Aspendos Tiyatrosu', 'Hadrian Kapısı',
      'Perge Antik Kenti', 'Termessos', 'Zilkale', 'Rize Kalesi', 'Şenyuva Köprüsü']) expect(names.has(n), n).toBe(true);
    expect([...names].some((n) => n.startsWith('Balıklıgöl'))).toBe(true);
  });
});

describe('oyun sistemi', () => {
  it('her tarihi nokta için 5 soru; her soruda 4 farklı seçenek ve geçerli doğru cevap', () => {
    for (const s of SITES) {
      const qs = buildSiteQuiz(s, 1);
      expect(qs.length, s.id).toBe(5);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(4);
      }
      expect(qs[0].options[qs[0].answer]).toBe(s.city.name);
    }
  });
  it('genel test 20 soru, cevaplar karıştırılsa da doğru kalır', () => {
    const qs = buildGeneralQuiz(seeded(5));
    expect(qs).toHaveLength(20);
    expect(qs[0].options[qs[0].answer]).toBe('Ankara');
    expect(qs[1].options[qs[1].answer]).toBe('81');
  });
});

describe('AI asistan (yerel bilgi tabanı)', () => {
  it('tarihi yer ve şehir sorularını tanır', () => {
    expect(localAnswer('Efes hakkında bilgi').text).toContain('İzmir');
    expect(localAnswer('Kars’ta ne görülür?').text).toContain('Ani');
    expect(localAnswer('vanilyalı dondurma').text).not.toContain('Van (65)');
  });
});

describe('AI asistan — il adı önceliği', () => {
  it('“Ankara” sorusu şehri anlatır, “Ankara Kalesi” sorusu kaleyi', () => {
    expect(localAnswer('Ankara').text.startsWith('Ankara (06)')).toBe(true);
    expect(localAnswer('Ankara Kalesi nedir').text.startsWith('Ankara Kalesi')).toBe(true);
  });
});
