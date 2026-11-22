# Munzur Vadisi ve Gözeleri — "Kırk Göze"

Kod: `src/app/games/munzur/`
- `site.ts`: vadi, çay, gözeler, yollar, köprüler, keçiler ve duraklar. Saf veridir, test edilir (`tests/munzur.test.ts`).
- `MunzurModels.tsx`: 3B modeller.
- `MunzurGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü (`shared/hud/Hud.tsx`) kullanır.

## Oyun
Oyuncu vadi tabanındaki yürüyüş yolundan gözelere yürür. İki ahşap köprüyle kıyılar arasında bir döngü yapar ve 7 ayrıntıyı bulur:
1. gözeler
2. kutsal su
3. millî park
4. çiçekli çayır (endemik bitkiler)
5. yaban keçileri
6. Munzur Çayı
7. koruma

Yalnızca yol ve köprüler üzerinde yürünür.

## Kaynaklarda bulunanlar
- **Millî park:** 1971'de ilan edildi; alanı yaklaşık 42 bin hektar (bir kaynakta 42.674 ha). Türkiye'nin en büyük ve en zengin biyolojik çeşitliliğe sahip millî parklarından biri sayılıyor. Avlanmak yasak. [Küre](https://kureansiklopedi.com/tr/detay/munzur-vadisi-milli-parki-6de28), [Wikipedia](https://en.wikipedia.org/wiki/Munzur_Valley_National_Park)
- **Bitkiler:** Yaklaşık 1.500 tür var; 43'ü yalnızca vadiye, 227'si Türkiye'ye özgü. Kaynaklarda sayılar biraz farklı geçiyor. Munzur kardeleni ve Munzur geveni bu endemik türlerden.
- **Yaban hayatı:** Türkiye'de en çok yaban keçisinin yaşadığı bölge. Ayı, kurt ve vaşak da yaşıyor. Çayda alabalık var, kayalıklarda yırtıcı kuşlar yuva yapıyor. [DHA](https://www.dha.com.tr/foto-galeri/munzur-vadisi-milli-parkina-inen-dag-kecileri-dron-kamerasinda-2589179)
- **Gözeler:** Sayıları genellikle 40 civarında veriliyor; bir kaynak 300'den fazla diyor. Alevi inancında kutsal sayılıyor; inanca göre doğal hâlleri değiştirilmemeli. [Ara](https://en.ara.cat/sunday/the-sacred-valley-of-dersim-where-cultural-resistance-and-ecological-reverence-coexist_130_5747100.html), [Duvar English](https://www.duvarenglish.com/locals-protest-government-decision-to-downgrade-protection-status-of-springs-sacred-for-alevi-faith-in-eastern-turkey-news-65193)
- **Tehditler:** Baraj, maden, kaçak avcılık ve gözelerin çevresindeki yapılaşma. Koruma statüsünün düşürülmesi protesto edildi.

Not: Sayfalar çalışma ortamından açılamadı; bilgiler arama sonuçlarındaki özetlerden alındı.
- Çayın Keban Baraj Gölü'ne karıştığı bilgisi genel bilgidir; bu çalışmada ayrıca doğrulanmadı.

## Temsilî olanlar
- Vadinin biçimi ve genişliği, yamaçların yüksekliği.
- Gözelerin sayısı ve yeri (oyunda 10 ağız var), yürüyüş yolu ve köprüler.
- Keçilerin yeri ve sayısı; keçi modeli basit tutuldu.
- Ağaç türleri (söğüt, kavak, meşe) ve çiçek renkleri.
- Millî park tabelası.
