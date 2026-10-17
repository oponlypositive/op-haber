// Test yardımcısı (2026-10-17): sahte yazım modelleri her aday için AYNI başlığı döndürürdü; "aynı başlıklı haber ikinci kez yayınlanmaz" kuralı (lib/ayni_olay.mjs baslik-ayni)
// bunları artık tekrar sayar. Gerçek model her haber için farklı başlık yazar; burada çıktının başlıklarındaki özne sözcüğü her çağrıda döndürülür.
const EN = ["Neighbors", "Volunteers", "Families", "Students", "Children", "Villagers", "Teachers", "Cyclists", "Walkers", "Gardeners", "Farmers", "Hikers"];
const TR = ["Komşular", "Gönüllüler", "Aileler", "Öğrenciler", "Çocuklar", "Köylüler", "Öğretmenler", "Bisikletçiler", "Yürüyüşçüler", "Bahçıvanlar", "Çiftçiler", "Doğaseverler"];
let sayac = 0;
/** Yazım yanıtı JSON metni -> başlıkları her çağrıda farklı olan aynı yanıt. */
export function baslikCesitle(metin) {
  const k = sayac++ % EN.length;
  return String(metin).replace("Neighbors plant", `${EN[k]} plant`).replace("Komşular nehir", `${TR[k]} nehir`);
}
