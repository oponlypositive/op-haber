# op-haber

Only Positive (OP) uygulaması için otomatik iyi haber hattı. GitHub Actions her 10 dakikada bir çalışır; yalnız mutlu ve umut veren haberleri seçer, kendi cümleleriyle Türkçe ve İngilizce yazar, lisanslı bir görsel bulur ve OP'nin Supabase arka ucuna editör gönderisi olarak iletir. Ücretsiz katmanlarla çalışacak şekilde tasarlanmıştır.

## Nasıl çalışır

1. **Tara:** `kaynaklar.json` içindeki RSS akışları (kaynak başına tek istek) ve Bing News RSS sorguları.
2. **Görülenleri ele:** bağlantının sha256 özeti Supabase'deki `haber_gorulen` tablosuna sorulur (Actions koşusu durumsuzdur).
3. **Ön eleme (modelsiz):** son 24 saat (`TAZELIK_SAAT`) dışındakiler, hassas konular (siyaset, din, etnik kimlik, savaş/suç, afet/salgın, kamu kurumu icraatı) ve kaba dil elenir.
4. **Doğrulama:** `GUVENILIR_KAYNAKLAR` listesindeki siteler tek kaynakla geçer; diğerleri başka bir sitede aynı olayı anlatan ikinci bir haber bulunana kadar bekler (en çok `KAYNAK_DENEME_UST` tur).
5. **Kaynak sayfası:** `robots.txt` saygılı, zaman aşımlı ve boyut sınırlı düz metin. Engel varsa sayfa kullanılmaz.
6. **Yazım:** tek Gemini çağrısı hem uygunluğu hem TR/EN metni (5-8 cümle) üretir. Kod ayrıca doğrular: kaynakta olmayan rakam yok, cümle sayısı, bağlantı/markdown/emoji/ünlem yok, kaynaktan kopya yok, dil sezgisi, ikinci içerik filtresi.
7. **Görsel:** Wikimedia Commons ve Openverse (yalnız CC0, CC BY, CC BY-SA, kamu malı); olmazsa Pixabay (anahtar varsa). Aday modelle ayrıca denetlenir (konu uygun mu, yazı/logo baskın mı, tanınabilir yüz, din/siyaset simgesi, kalite). Uygun görsel yoksa haber bekler ve sonraki turlarda yeniden denenir (`GORSEL_DENEME_UST`, varsayılan 3 tur); hâlâ yoksa atlanır. `GORSELSIZ_YAYIN=1` ile görselsiz yayın açılabilir (varsayılan kapalı).
8. **Yayın:** `haber-yukle` Edge Function'ına gönderilir; o da ikinci filtreyi çalıştırır, görseli depolamaya yükler ve haberi uygun editör hesabı adına yazar.

Tur başına en çok `TUR_BASINA_EN` (varsayılan 6) yeni haber yayınlanır. Model kotası (429) dolarsa tur zarifçe biter. Günlüğe haber başlığı ya da gizli değer yazılmaz; her tur tek bir özet satırı basar.

## Gerekli gizli değerler

GitHub'da: **Settings → Secrets and variables → Actions → New repository secret**.

| Ad | Zorunlu | Açıklama |
|---|---|---|
| `GEMINI_API_KEY` | evet | Google AI Studio ücretsiz anahtarı |
| `HABER_YUKLE_ANAHTARI` | evet | `haber-yukle` fonksiyonundaki aynı değer (en az 32 karakter) |
| `SUPABASE_FN_URL` | evet | `haber-yukle` fonksiyonunun tam adresi (`https://<proje>.supabase.co/functions/v1/haber-yukle`) |
| `PIXABAY_API_KEY` | hayır | yedek görsel kaynağı |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | hayır | yedek metin modeli (Cloudflare Workers AI) |

Gizli olmayan ayarlar **Variables** sekmesinden verilir: `GEMINI_MODEL` (varsayılan `gemini-3.5-flash-lite`), `YEDEK_MODEL` (örn. `@cf/meta/llama-3.1-8b-instruct`; tanımlı değilse yedek atlanır), `GORSELSIZ_YAYIN`, `GUVENILIR_KAYNAKLAR` (virgülle site adları), `TUR_BASINA_EN`.

## Yerel çalıştırma

Gerekli: Node 20 veya üstü. Kurulum gerekmez.

```
node hat.mjs --kuru     # kaynakları okur; model ve yayın yapılmaz
node --test             # ağsız testler
```

`--kuru` yalnız salt okuma yapar (kaynak başına tek istek) ve örnek başlıkları gösterir.

## Doğrulanmayanlar

- Model kimliği `gemini-3.5-flash-lite` Google'ın model listesinde ve ücretsiz katman tablosunda görüldü; ücretsiz dakikalık/günlük sınırlar sayfalardan okunamadı. Bu yüzden çağrılar arası bekleme (`GEMINI_BEKLEME_MS`) ayarlanabilir.
- `generateContent` istek biçimi ve `x-goog-api-key` başlığı yaygın kullanımdan alındı; belge sayfaları örnekleri yalnız `?key=` ve yeni Interactions API ile gösterdi. İlk gerçek çalıştırmada kontrol edilmeli.
- Cloudflare Workers AI yolu (`/accounts/{id}/ai/run/{model}`) doğrulandı; `messages` gövdesi ve `result.response` yanıtı belgedeki örneğe göre `prompt` biçiminin eşdeğeri olarak kullanıldı, doğrulanmadı.
- Türkçe metin kalitesi otomatik doğrulanamaz (yalnız basit dil sezgisi var); ilk haftada örnekler elle okunmalıdır.

## Zamanlanmış işlerin kapanması

GitHub, herkese açık depolarda 60 gün boyunca depo etkinliği olmazsa zamanlanmış iş akışlarını kapatır. Hangi eylemlerin "etkinlik" sayıldığı ve iş akışı koşularının sayılıp sayılmadığı resmi belgede tanımlı değildir; API ile yeniden etkinleştirmenin sayacı sıfırladığı doğrulanmadı. Bu yüzden otomatik bir "canlı tut" adımı eklenmedi. Önerilen yol: ayda bir depoya küçük bir commit atmak (örneğin README'ye tarih notu) ya da kapanma e-postası geldiğinde **Actions → haber → Enable workflow** demek.

## Kaynaklar ve koşullar

- Kaynaklar: iyi haber siteleri (goodnewsnetwork.org, positive.news, optimistdaily.com, reasonstobecheerful.world) ve Bing News RSS sorguları. Türkçe iyi haber kaynakları için `kaynaklar.json` içinde boş bir `tr_adaylar` listesi var; yeni kaynak **sahip onayıyla eklenecek**. Google News RSS kullanılmaz. Bing News RSS koşulları ayrıca gözden geçirilmelidir; kapatmak için `BING=0`.
- Yalnız kendi cümlelerimiz yayınlanır; kaynaktan alıntı ya da kopya yoktur. Her habere kaynak bağlantısı eklenir.
- Görseller: yalnız CC0, CC BY, CC BY-SA, kamu malı (yedekte Pixabay lisansı). Yaratıcı, lisans ve kaynak adresi her görselle birlikte saklanır ve uygulamada gösterilir. NC/ND lisanslar ve haber sitesi fotoğrafları kullanılmaz.
- Kullanılan belgeler: <https://ai.google.dev/gemini-api/docs/models>, <https://ai.google.dev/gemini-api/docs/pricing>, <https://ai.google.dev/api/generate-content>, <https://developers.cloudflare.com/workers-ai/get-started/rest-api/>, <https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow>.
