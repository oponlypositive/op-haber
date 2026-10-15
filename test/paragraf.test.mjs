import { test } from "node:test";
import assert from "node:assert/strict";
import { cumlelereBol, dengeliBoyutlar, metinParagrafla, paragrafBol, paragraflaraBol } from "../lib/paragraf.mjs";
import { yayinYuku } from "../lib/bulut.mjs";
import { cumleSay } from "../lib/dogrula.mjs";

const TR6 = "Belediye ekipleri nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla çalışmaya katıldı. Genç ağaçlar kısa süre sonra yürüyüş yoluna gölge verecek. Parkta herkese açık küçük bir alet kütüphanesi bulunuyor. Bu, insanlar işi paylaştığında neler başarılabileceğinin sade bir örneği. Mahalle sakinleri önümüzdeki ay yeni bir proje için toplanacak.";
const EN5 = "A group of neighbors planted 5000 trees beside the river. Local schools joined the effort with their classes. The young trees will soon give shade to a footpath. The park also has a small tool library that is open to anyone. It is a simple example of what a community can do together.";

test("paragraf: 3 cümle ve altı aynen kalır; uzun paragraf dengeli bölünür (6 -> 3+3, 5 -> 3+2, 4 -> 2+2)", () => {
  assert.equal(paragraflaraBol("Bir. İki cümle burada. Üç tane oldu."), "Bir. İki cümle burada. Üç tane oldu.");
  const t = paragraflaraBol(TR6);
  assert.deepEqual(t.split("\n\n").map(cumleSay), [3, 3]);
  assert.deepEqual(paragraflaraBol(EN5).split("\n\n").map(cumleSay), [3, 2]);
  assert.deepEqual(paragraflaraBol("A bir. B iki. C üç. D dört.").split("\n\n"), ["A bir. B iki.", "C üç. D dört."]);
  assert.deepEqual(dengeliBoyutlar(7), [3, 2, 2]); assert.deepEqual(dengeliBoyutlar(9), [3, 3, 3]); assert.deepEqual(dengeliBoyutlar(10), [3, 3, 2, 2]);
  assert.equal(paragraflaraBol(TR6).replace(/\n\n/g, " "), TR6);                                          // yalnız boşluk türü değişir, kelime kaybı yok
});

test("paragraf: kısaltma, baş harf, sıra sayısı, ondalık sayı ve A.Ş. cümle sonu sayılmaz", () => {
  const m = "Dr. Ayşe Kaya 15. yüzyıl eserlerini inceledi. Prof. Ali Yılmaz da A. Şahin ile birlikte çalıştı. Oran 3.5 olarak ölçüldü. Şirket Örnek A.Ş. adıyla kuruldu. Ekip vb. kaynakları taradı. Sonuçlar yayımlandı.";
  assert.deepEqual(cumlelereBol(m), ["Dr. Ayşe Kaya 15. yüzyıl eserlerini inceledi.", "Prof. Ali Yılmaz da A. Şahin ile birlikte çalıştı.", "Oran 3.5 olarak ölçüldü.", "Şirket Örnek A.Ş. adıyla kuruldu.", "Ekip vb. kaynakları taradı.", "Sonuçlar yayımlandı."]);
  assert.deepEqual(paragraflaraBol(m).split("\n\n").map((p) => cumlelereBol(p).length), [3, 3]);
  assert.equal(cumlelereBol("Prof. Smith met Dr. Jones at St. Mary's. They talked about the U.S. economy. Then they left.").length, 3);
});

test("paragraf: tırnak içi bölünmez", () => {
  const m = "Sanatçı şöyle dedi: “Bu sergi benim için çok özel. Herkesi bekliyorum.” Ardından salonu gezdi. Ziyaretçiler çok beğendi. Sergi pazartesi kapanacak.";
  assert.deepEqual(cumlelereBol(m), ["Sanatçı şöyle dedi: “Bu sergi benim için çok özel. Herkesi bekliyorum.”", "Ardından salonu gezdi.", "Ziyaretçiler çok beğendi.", "Sergi pazartesi kapanacak."]);
  assert.equal(cumlelereBol('He said "Stop. Wait here." Then he left. She stayed.').length, 3);
});

test("paragraf: tarif/oyun blokları, listeler ve etiketli satırlar korunur; diğer paragraflar bölünür", () => {
  const tarif = "Malzemeler: 2 su bardağı un, 1 yumurta, 1 tutam tuz. Yapılışı: Un ve yumurtayı karıştırın. Hamuru dinlendirin. İnce açın. Tavada pişirin. Sıcak servis edin.";
  assert.equal(paragraflaraBol(tarif), tarif);
  const liste = "Yapılışı:\n1. Unu eleyin. İyice karıştırın.\n2. Yumurtayı ekleyin. Yoğurun.\n3. Dinlendirin. Açın. Pişirin.";
  assert.equal(paragraflaraBol(liste), liste);
  const oyun = "Nasıl oynanır: Herkes bir kart çeker. Sırayla kartı okur. Doğru bilen puan alır. Kazanan en çok puanı toplayan olur. İyi eğlenceler.";
  assert.equal(paragraflaraBol(oyun), oyun);
  const karma = `${TR6}\n\n${tarif}`;
  const s = paragraflaraBol(karma).split("\n\n");
  assert.equal(s.length, 3); assert.equal(s.at(-1), tarif);
  const madde = "- Birinci madde burada. İkinci cümle. Üçüncü cümle. Dördüncü cümle.";
  assert.equal(paragraflaraBol(madde), madde);
  assert.equal(paragraflaraBol("Tarif Önerisi:\nİlk cümle. İkinci. Üçüncü. Dördüncü."), "Tarif Önerisi:\nİlk cümle. İkinci. Üçüncü. Dördüncü.");
});

test("paragraf: zaten paragraflı metin korunur; boş/yanlış girdi bozulmaz", () => {
  const m = "Birinci paragraf. İki cümle.\n\nİkinci paragraf. Yine iki.";
  assert.equal(paragraflaraBol(m), m);
  assert.equal(paragraflaraBol(""), ""); assert.equal(paragraflaraBol(undefined), undefined);
  assert.equal(paragrafBol("   "), "   ");
  assert.equal(paragraflaraBol("Tek cümle sonu noktasız"), "Tek cümle sonu noktasız");
});

test("paragraf: metinParagrafla başlığa dokunmaz, değişmeyen nesneyi aynen döner; cümle sayısı toplamı değişmez", () => {
  const kisa = { baslik: "Başlık. Çok. Cümleli. Bir. Başlık.", ozet: "Kısa özet. İki cümle." };
  assert.equal(metinParagrafla(kisa), kisa);
  const uz = metinParagrafla({ baslik: kisa.baslik, ozet: TR6 });
  assert.equal(uz.baslik, kisa.baslik); assert.notEqual(uz.ozet, TR6);
  assert.equal(cumleSay(uz.ozet), cumleSay(TR6));                                                       // toplam metin sınırları (cumleSay 3-9) bozulmaz
  assert.equal(metinParagrafla(null), null);
});

test("paragraf: yayın yükü özetleri paragraflar, başlık ve diğer alanlar aynen", () => {
  const h = { id: "habc", tr: { baslik: "Komşular ağaç dikti", ozet: TR6 }, en: { baslik: "Neighbors plant trees", ozet: EN5 }, kategori: "doga", yer: "Dünya", kaynak: "k", link: "https://a.b/c", zaman: "2026-10-13T08:00:00Z", model: "m" };
  const y = yayinYuku(h, "ab".repeat(32), null).haber;
  assert.deepEqual(y.tr.ozet.split("\n\n").map(cumleSay), [3, 3]); assert.deepEqual(y.en.ozet.split("\n\n").map(cumleSay), [3, 2]);
  assert.equal(y.tr.baslik, "Komşular ağaç dikti");
  assert.equal(h.tr.ozet, TR6);                                                                          // girdi nesnesi değişmez
  const OZEL = "Merhaba! Bugün bir bilmece var. Cevabı düşünün. İpucu verelim. Yanıt yarın gelecek.";
  assert.deepEqual(yayinYuku({ ...h, tr: { baslik: "b", ozet: OZEL } }, "ab".repeat(32), null).haber.tr.ozet.split("\n\n").map(cumleSay), [3, 2]);
});

test("paragraf: önce/sonra örneği (rapor için)", () => {
  const sonra = paragraflaraBol(TR6);
  assert.match(sonra, /bulunuyor\. Bu, insanlar/);   // bölünme noktası: 3. cümleden sonra
  assert.ok(sonra.includes("\n\n"));
});
