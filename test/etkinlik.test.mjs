import { test } from "node:test";
import assert from "node:assert/strict";
import { ETKINLIK_TURLERI, SEHIRLER, etkinlikAdayi, etkinlikAyniMi, etkinlikDefterKaydi, etkinlikDefteriTemizle, etkinlikDogrula, etkinlikSuresiDoldu, etkinlikYukuGecerli, sehirKanonik, tarihAnlari, yerleriBul } from "../lib/etkinlik.mjs";
import { onEleme } from "../lib/on_eleme.mjs";
import { haberYaz, istemKur, girdiHazirla } from "../lib/yaz.mjs";
import { yayinYuku, bulutKur } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { baglantiOzeti } from "../lib/rss.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";
import { readFileSync } from "node:fs";

const SIMDI = Date.parse("2026-10-15T09:00:00Z");
const ZAMAN = "2026-10-13T08:00:00Z";
const BASLIK = "Meşk Sergisi 14-29 Ekim'de SEKA'da açılıyor";
const KAYNAK_TR = `${BASLIK}\nİzmit'teki SEKA Kâğıt Müzesi'nde Meşk Sergisi 14-29 Ekim tarihleri arasında sanatseverlerle buluşacak. Sergi kapsamında hat sanatı örnekleri sergilenecek. Giriş ücretsizdir. Sergi her gün gezilebilecek ve atölye çalışmaları yapılacak. Sanat tarihçileri ziyaretçilere eserleri tanıtacak.\nSergi alanı geniş bir salonda kurulacak.`;
const YAZ = "Meşk Sergisi İzmit SEKA Kâğıt Müzesi hat sanatı Meshk Exhibition";
const H = (ek = {}) => ({ ad: "Meşk Sergisi", sehir: "Kocaeli", mekan: "SEKA Kâğıt Müzesi", baslangic: "2026-10-14", bitis: "2026-10-29", tur: "sergi", ucretsiz: true, ...ek });
const B = (ek = {}) => ({ kaynak: KAYNAK_TR, kaynakBaslik: BASLIK, yazilan: YAZ, yayinZamani: ZAMAN, simdi: SIMDI, dil: "tr", ...ek });
const dog = (ham, ek) => etkinlikDogrula(ham, B(ek));

test("etkinlik: tarih aralığı + ilçe->il + mekan + ücretsiz kanıtlı -> tam etkinlik", () => {
  const r = dog(H());
  assert.equal(r.neden, "");
  assert.deepEqual(r.etkinlik, { ad: "Meşk Sergisi", sehir: "Kocaeli", mekan: "SEKA Kâğıt Müzesi", baslangic: "2026-10-14", bitis: "2026-10-29", tur: "sergi", ucretsiz: true });
  assert.ok(etkinlikYukuGecerli(r.etkinlik));
});

test("etkinlik: model yok / boş nesne -> sessiz (neden boş); bozuk biçim -> bicim", () => {
  assert.deepEqual(dog(undefined), { etkinlik: null, neden: "" });
  assert.deepEqual(dog({}), { etkinlik: null, neden: "" });
  assert.equal(dog(H({ ad: "x" })).neden, "bicim");
  assert.equal(dog(H({ ad: "Meşk Sergisi!" })).neden, "bicim");
});

test("etkinlik: '29 Ekim'e kadar' -> başlangıç bugün (süren sergi); başlangıç boş olsa da", () => {
  const kay = "Gökyüzü Hikâyeleri Sergisi 29 Ekim'e kadar Ankara'da CerModern'de izlenebilecek. Sergide fotoğraflar ve çizimler yer alıyor ve herkes gezebilecek.";
  const yaz = "Gökyüzü Hikâyeleri Sergisi Ankara CerModern";
  const ham = { ad: "Gökyüzü Hikâyeleri Sergisi", sehir: "Ankara", mekan: "CerModern", baslangic: "2026-10-15", bitis: "2026-10-29", tur: "sergi" };
  const r = etkinlikDogrula(ham, B({ kaynak: kay, kaynakBaslik: "Gökyüzü Hikâyeleri Sergisi 29 Ekim'e kadar", yazilan: yaz }));
  assert.equal(r.neden, ""); assert.equal(r.etkinlik.baslangic, "2026-10-15"); assert.equal(r.etkinlik.bitis, "2026-10-29"); assert.equal(r.etkinlik.mekan, "CerModern");
  const r2 = etkinlikDogrula({ ...ham, baslangic: undefined }, B({ kaynak: kay, kaynakBaslik: "x", yazilan: yaz }));
  assert.equal(r2.etkinlik.baslangic, "2026-10-15");
  // bitiş geçmişteyse etkinlik yok
  assert.equal(etkinlikDogrula({ ...ham, bitis: "2026-10-10" }, B({ kaynak: kay.replace("29 Ekim", "10 Ekim"), kaynakBaslik: "x", yazilan: yaz })).etkinlik, null);
});

test("etkinlik: İngilizce biçimler (October 14 to October 29, Oct 14–29, 14 October)", () => {
  const yaz = "Lines of Light Pera Museum Istanbul";
  const ham = { ad: "Lines of Light", sehir: "İstanbul", mekan: "Pera Museum", baslangic: "2026-10-14", bitis: "2026-10-29", tur: "sergi", ucretsiz: true };
  for (const t of ["The Lines of Light exhibition runs from October 14 to October 29 at the Pera Museum in Istanbul. Free admission.",
    "Lines of Light opens at Pera Museum in Istanbul on Oct 14–29. Admission is free.", "Lines of Light is on view at the Pera Museum, Istanbul, 14-29 October 2026. Free entry for everyone."]) {
    const r = etkinlikDogrula(ham, B({ kaynak: t, kaynakBaslik: "Lines of Light", yazilan: yaz, dil: "en" }));
    assert.equal(r.neden, "", t); assert.equal(r.etkinlik.bitis, "2026-10-29"); assert.equal(r.etkinlik.ucretsiz, true); assert.equal(r.etkinlik.mekan, "Pera Museum");
  }
  // "until October 29": yalnız bitiş
  const u = etkinlikDogrula({ ...ham, baslangic: "2026-10-15" }, B({ kaynak: "Lines of Light is on view at the Pera Museum in Istanbul until October 29.", kaynakBaslik: "x", yazilan: yaz, dil: "en" }));
  assert.equal(u.etkinlik.baslangic, "2026-10-15"); assert.equal(u.etkinlik.bitis, "2026-10-29");
});

test("etkinlik: sayısal tarih (14.10.2026) ve tek günlük konser; saat yalnız kaynakta tek ve açıksa", () => {
  const kay = "Kadıköy'de Moda Sahnesi'nde Caz Gecesi konseri 21.10.2026 tarihinde saat 20.30'da başlayacak. Sanatçılar sahne alacak.";
  const ham = { ad: "Caz Gecesi", sehir: "İstanbul", mekan: "Moda Sahnesi", baslangic: "2026-10-21", saat: "20:30", tur: "konser" };
  const yaz = "Caz Gecesi Moda Sahnesi Kadıköy";
  const r = etkinlikDogrula(ham, B({ kaynak: kay, kaynakBaslik: "Caz Gecesi", yazilan: yaz }));
  assert.equal(r.neden, ""); assert.equal(r.etkinlik.sehir, "İstanbul"); assert.equal(r.etkinlik.saat, "20:30"); assert.equal(r.etkinlik.bitis, undefined);
  assert.equal(etkinlikDogrula({ ...ham, saat: "21:00" }, B({ kaynak: kay, kaynakBaslik: "Caz Gecesi", yazilan: yaz })).etkinlik.saat, undefined);      // kaynakta olmayan saat atılır
  const iki = kay.replace("saat 20.30'da", "saat 19.00'da; kapılar 18:00'de açılır, konser 20:30'da");
  assert.equal(etkinlikDogrula(ham, B({ kaynak: iki, kaynakBaslik: "Caz Gecesi", yazilan: yaz })).etkinlik.saat, undefined);                           // belirsiz (birden çok saat)
  const saatsiz = kay.replace(" saat 20.30'da", "");
  assert.equal(etkinlikDogrula(ham, B({ kaynak: saatsiz, kaynakBaslik: "Caz Gecesi", yazilan: yaz })).etkinlik.saat, undefined);
  const pm = etkinlikDogrula({ ...ham, saat: "20:00" }, B({ kaynak: "Jazz Night concert in Kadıköy, Istanbul on October 21 at 8 pm at Moda Sahnesi.", kaynakBaslik: "Jazz Night", yazilan: "Caz Gecesi Moda Sahnesi", dil: "en", }));
  assert.equal(pm.neden, "ad");                                      // ad ("Caz Gecesi") İngilizce kaynakta yok -> reddedilir
});

test("etkinlik: ücretsiz yalnız açık ifade varsa; ücretli işaret varsa atılır", () => {
  assert.equal(dog(H()).etkinlik.ucretsiz, true);
  assert.equal(dog(H(), { kaynak: KAYNAK_TR.replace("Giriş ücretsizdir. ", "") }).etkinlik.ucretsiz, undefined);
  assert.equal(dog(H(), { kaynak: KAYNAK_TR + " Bilet fiyatı 150 TL." }).etkinlik.ucretsiz, undefined);
  assert.equal(dog(H({ ucretsiz: false })).etkinlik.ucretsiz, undefined);
});

test("etkinlik: mekan kaynakta geçmiyorsa yalnız mekan atılır; adı sehir olan mekan atılır", () => {
  const r = dog(H({ mekan: "Zorlu PSM" }));
  assert.equal(r.etkinlik.mekan, undefined); assert.equal(r.etkinlik.baslangic, "2026-10-14");
  assert.equal(dog(H({ mekan: "İzmit" })).etkinlik.mekan, undefined);
});

test("etkinlik: şehir kaynakta yoksa ya da model uydurduysa etkinlik tümden atılır", () => {
  assert.equal(dog(H({ sehir: "Ankara" })).neden, "sehir");
  assert.equal(dog(H({ sehir: "Berlin" })).neden, "sehir");
  assert.equal(dog(H({ sehir: "" })).neden, "sehir");
  assert.equal(dog(H(), { kaynak: KAYNAK_TR.replaceAll("İzmit", "Gebze") }).etkinlik.sehir, "Kocaeli");   // başka ilçe de aynı ile bağlanır
  assert.equal(dog(H(), { kaynak: KAYNAK_TR.replaceAll("İzmit", "oradaki") }).neden, "sehir");
});

test("etkinlik: tarih kanıtsız / çelişkili / çok ileri / çok uzun -> atılır", () => {
  assert.equal(dog(H({ baslangic: "2026-10-16", bitis: "2026-10-30" })).neden, "tarih");           // kaynaktaki 14-29 ile uyuşmuyor
  assert.equal(dog(H({ bitis: "2026-10-28" })).neden, "celiski");                                  // başlangıç kanıtlı, bitiş kaynak aralığıyla çelişiyor
  assert.equal(dog(H({ baslangic: "2026-13-40" })).neden, "tarih");
  const uzak = KAYNAK_TR.replaceAll("14-29 Ekim", "15 Aralık");
  assert.equal(dog(H({ baslangic: "2026-12-15", bitis: undefined }), { kaynak: uzak }).neden, "cok-ileri");   // 61 gün sonra
  const uzun = "Sergi İzmit'te SEKA Kâğıt Müzesi'nde 20 Ekim'den 28 Şubat'a kadar sürecek; Meşk Sergisi.";
  assert.equal(dog(H({ baslangic: "2026-10-20", bitis: "2027-02-28" }), { kaynak: uzun }).neden, "uzun");
  // bitiş modelden gelir ama kaynak bitişi kanıtlamıyorsa: yalnız bitiş atılır
  const r = dog(H({ baslangic: "2026-10-20", bitis: "2026-10-31" }), { kaynak: KAYNAK_TR.replace("14-29 Ekim", "20 Ekim") });
  assert.equal(r.etkinlik.baslangic, "2026-10-20"); assert.equal(r.etkinlik.bitis, undefined);
});

test("etkinlik: geçmiş etkinlik ve sonuç haberi", () => {
  const gecmis = "Meşk Sergisi İzmit'teki SEKA Kâğıt Müzesi'nde 3-8 Ekim tarihlerinde açıktı ve sona erdi. Binlerce kişi sergiyi gezdi.";
  assert.equal(dog(H({ baslangic: "2026-10-03", bitis: "2026-10-08" }), { kaynak: gecmis }).etkinlik, null);
  const sonuc = "Ankara'da 11 Ekim'de yapılan koşuda Ali Veli birinci oldu. Yarışa 400 sporcu katıldı ve koşu sorunsuz tamamlandı.";
  const r = etkinlikDogrula({ ad: "Ankara Koşusu", sehir: "Ankara", baslangic: "2026-10-11", tur: "spor" }, B({ kaynak: sonuc, kaynakBaslik: "Ankara Koşusu", yazilan: "Ankara Koşusu" }));
  assert.equal(r.etkinlik, null);
  const sonuc2 = "Ankara Koşusu Ankara'da 20 Ekim'de yapıldı. Ali Veli birinci oldu.";                       // yıl yok: en yakın gelecek yıl 60 günü aşar; ayrıca geçmiş fiil
  assert.equal(etkinlikDogrula({ ad: "Ankara Koşusu", sehir: "Ankara", baslangic: "2026-10-20", tur: "spor" }, B({ kaynak: sonuc2, kaynakBaslik: "Ankara Koşusu", yazilan: "Ankara Koşusu" })).neden, "gecmis");
});

test("etkinlik: derleme (başlık ya da çok sayıda tarih/şehir) ve çevrimiçi etkinlik", () => {
  assert.equal(dog(H(), { kaynakBaslik: "Bu hafta sonu İstanbul'da neler var?" }).neden, "derleme");
  assert.equal(dog(H(), { kaynakBaslik: "İstanbul etkinlik takvimi: 12 etkinlik" }).neden, "derleme");
  const cok = KAYNAK_TR + " Aynı günlerde 17 Ekim'de konser olacak. Ayrıca 3 Kasım'da tiyatro, 10 Kasım'da söyleşi ve 25 Kasım'da festival var.";
  assert.equal(dog(H(), { kaynak: cok }).neden, "derleme");
  assert.equal(dog(H(), { kaynak: KAYNAK_TR + " Ayrıca 17 Ekim'de konser, 3 Kasım'da söyleşi de var." }).neden, "");      // iki ek tarih derleme sayılmaz
  const sehirler = KAYNAK_TR + " Sergi İstanbul, Ankara, Bursa ve Antalya'da da gezecek.";
  assert.equal(dog(H(), { kaynak: sehirler }).neden, "derleme");
  assert.equal(dog(H(), { kaynak: KAYNAK_TR + " Söyleşiler çevrimiçi yapılacak." }).neden, "cevrimici");
  assert.equal(dog(H(), { kaynak: KAYNAK_TR + " The talk is an online event on Zoom." }).neden, "cevrimici");
});

test("etkinlik: ad -- kaynakta olmayan özel ad ya da yazılan metinde karşılığı olmayan ad reddedilir; din/siyaset adı reddedilir", () => {
  assert.equal(dog(H({ ad: "Bahar Işıkları Sergisi" })).neden, "ad");
  assert.equal(dog(H(), { yazilan: "Başka bir haber metni" }).neden, "ad");
  assert.equal(dog(H({ ad: "sergi" })).neden, "ad");                                 // yalnız genel sözcük
  assert.equal(dog(H(), { yasakFn: () => [{ kural: "C3" }] }).neden, "konu");
});

test("etkinlik: tür -- geçersiz ya da metinle uyuşmayan tür düzeltilir", () => {
  assert.equal(dog(H({ tur: "party" })).etkinlik.tur, "sergi");
  assert.equal(dog(H({ tur: "konser" })).etkinlik.tur, "sergi");
  assert.equal(dog(H({ tur: "diger" })).etkinlik.tur, "diger");
  assert.deepEqual(ETKINLIK_TURLERI, ["sergi", "konser", "tiyatro", "festival", "soylesi", "atolye", "spor", "diger"]);
});

test("etkinlik: yıl dönümü (Aralık'ta duyurulan Ocak etkinliği) ve yıl sonu aralığı", () => {
  const sim = Date.parse("2026-12-22T09:00:00Z"), zaman = "2026-12-20T08:00:00Z";
  const kay = "Yeni Yıl Tiyatro Festivali İzmir'de 10 Ocak'ta başlıyor. Festival Konak yakınındaki salonlarda oyunlar sunacak. Biletler ücretli.";
  const ham = { ad: "Yeni Yıl Tiyatro Festivali", sehir: "İzmir", baslangic: "2027-01-10", tur: "festival" };
  const r = etkinlikDogrula(ham, { kaynak: kay, kaynakBaslik: "Yeni Yıl Tiyatro Festivali", yazilan: "Yeni Yıl Tiyatro Festivali İzmir", yayinZamani: zaman, simdi: sim });
  assert.equal(r.neden, ""); assert.equal(r.etkinlik.baslangic, "2027-01-10");
  assert.equal(etkinlikDogrula({ ...ham, baslangic: "2026-01-10" }, { kaynak: kay, kaynakBaslik: "x", yazilan: "Yeni Yıl Tiyatro Festivali", yayinZamani: zaman, simdi: sim }).etkinlik, null);   // yanlış yıl
  const aralik = "Kış Sergisi Bursa'da 20 Aralık - 5 Ocak arasında açık olacak. Kış Sergisi herkese açık.";
  const r2 = etkinlikDogrula({ ad: "Kış Sergisi", sehir: "Bursa", baslangic: "2026-12-20", bitis: "2027-01-05", tur: "sergi" }, { kaynak: aralik, kaynakBaslik: "Kış Sergisi", yazilan: "Kış Sergisi Bursa", yayinZamani: "2026-12-10T08:00:00Z", simdi: Date.parse("2026-12-21T09:00:00Z") });
  assert.equal(r2.neden, ""); assert.equal(r2.etkinlik.bitis, "2027-01-05");
});

test("tarihAnlari: biçimler", () => {
  const al = (m, dil) => tarihAnlari(m, { dil }).map((x) => `${x.g}.${x.a}${x.y ? "." + x.y : ""}${x.kadar ? "k" : ""}`);
  assert.deepEqual(al("14 Ekim"), ["14.10"]);
  assert.deepEqual(al("14-29 Ekim 2026"), ["14.10.2026", "29.10.2026"].map((x, i) => (i === 0 ? "14.10.2026" : x)));
  assert.deepEqual(al("14 Ekim ile 29 Ekim arasında"), ["14.10", "29.10"]);
  assert.deepEqual(al("29 Ekim'e kadar"), ["29.10k"]);
  assert.deepEqual(al("14 Ekim'den 29 Ekim'e kadar"), ["14.10", "29.10k"]);
  assert.deepEqual(al("EKİM 3 ve 4 NİSAN"), ["3.4", "4.4"].slice(0, 2).map((x) => x));
  assert.deepEqual(al("October 14", "en"), ["14.10"]);
  assert.deepEqual(al("Oct 14–29", "en"), ["14.10", "29.10"]);
  assert.deepEqual(al("until October 29, 2026", "en"), ["29.10.2026k"]);
  assert.deepEqual(al("14.10.2026"), ["14.10.2026"]);
  assert.deepEqual(al("2026-10-14"), ["14.10.2026"]);
  assert.deepEqual(al("10/11/2026", "en"), []);                                         // İngilizce kaynakta gün/ay belirsiz: kanıt sayılmaz
  assert.deepEqual(al("1,5 milyon ve 20:30'da"), []);
});

test("etkinlik: SEHIRLER ve yer eşleştirme", () => {
  assert.equal(SEHIRLER.length, 81); assert.equal(new Set(SEHIRLER).size, 81);
  for (const s of ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep", "Kocaeli", "Mersin", "Eskişehir", "Trabzon", "Samsun", "Muğla"]) assert.ok(SEHIRLER.includes(s), s);
  assert.equal(sehirKanonik("istanbul"), "İstanbul"); assert.equal(sehirKanonik("Çankaya"), "Ankara"); assert.equal(sehirKanonik("Bodrum"), "Muğla"); assert.equal(sehirKanonik("Izmir"), "İzmir"); assert.equal(sehirKanonik("Berlin"), "");
  assert.deepEqual([...new Set(yerleriBul("Kadıköy'de ve Çankaya'da, ayrıca ağrı kesici ve van aracı").map((y) => y.il))].sort(), ["Ankara", "İstanbul"]);   // küçük harfli "ağrı"/"van" il sayılmaz
  assert.deepEqual(yerleriBul("Fatih Akın söyleşisi"), []);
});

test("etkinlik: ön eleme -- eski duyuru ama etkinlik gelecekte -> aday kalır; yalnız seçenek açıkken", () => {
  const eski = { baslik: "Meşk Sergisi 14-29 Ekim'de açılıyor", ozet: "", zaman: "2026-10-09T08:00:00Z", dil: "tr", alan: "sanat" };      // 6 gün eski
  assert.equal(onEleme(eski, { simdi: SIMDI }).neden, "eski");
  assert.equal(onEleme(eski, { simdi: SIMDI, etkinlikTazelikSaat: 336 }).ok, true);
  assert.equal(etkinlikAdayi(eski, SIMDI), true);
  assert.equal(onEleme({ ...eski, baslik: "Sanat dünyasından yeni haberler" }, { simdi: SIMDI, etkinlikTazelikSaat: 336 }).neden, "eski");              // etkinlik değil
  assert.equal(onEleme({ ...eski, baslik: "Meşk Sergisi 1-5 Ekim'de açıldı" }, { simdi: SIMDI, etkinlikTazelikSaat: 336 }).neden, "eski");             // tarih geçmişte
  assert.equal(onEleme({ ...eski, zaman: "2026-09-20T08:00:00Z" }, { simdi: SIMDI, etkinlikTazelikSaat: 336 }).neden, "eski");                        // pencereyi aşan eski duyuru
  assert.equal(onEleme({ ...eski, zaman: "2026-10-15T08:30:00Z" }, { simdi: SIMDI }).ok, true);                                                     // taze aday etkilenmez
});

test("etkinlik: tekrar denetimi ve defter", () => {
  const e = { ad: "Meşk Sergisi", sehir: "Kocaeli", baslangic: "2026-10-14", bitis: "2026-10-29" };
  assert.equal(etkinlikAyniMi(e, { ...e, ad: "Meşk sergisi" }), true);
  assert.equal(etkinlikAyniMi(e, { ...e, ad: "SEKA'da Meşk Sergisi" }), true);                       // ortak ayırt edici sözcük
  assert.equal(etkinlikAyniMi(e, { ...e, ad: "Resim Sergisi" }), false);
  assert.equal(etkinlikAyniMi(e, { ...e, sehir: "Ankara" }), false);
  assert.equal(etkinlikAyniMi(e, { ...e, baslangic: "2026-10-15" }), false);
  const kayit = etkinlikDefterKaydi(e);
  assert.equal(etkinlikAyniMi(e, kayit), true);
  assert.equal(etkinlikDefteriTemizle([kayit, { ...kayit, e: "2026-10-01" }, { bozuk: 1 }], SIMDI).length, 1);
  assert.equal(etkinlikSuresiDoldu({ baslangic: "2026-10-01" }, SIMDI), true); assert.equal(etkinlikSuresiDoldu({ baslangic: "2026-10-01", bitis: "2026-10-15" }, SIMDI), false);
});

test("etkinlik: yayın yükü -- geçerli etkinlik taşınır, bozuk etkinlik yüke girmez", () => {
  const h = { id: "habc", tr: { baslik: "t", ozet: "o" }, en: { baslik: "e", ozet: "o" }, kategori: "mahalle", yer: "Dünya", kaynak: "k", link: "https://a.b/c", zaman: ZAMAN, model: "m" };
  const e = { ad: "Meşk Sergisi", sehir: "Kocaeli", baslangic: "2026-10-14", bitis: "2026-10-29", tur: "sergi" };
  assert.deepEqual(yayinYuku({ ...h, etkinlik: e }, "ab".repeat(32), null).haber.etkinlik, e);
  assert.ok(!("etkinlik" in yayinYuku(h, "ab".repeat(32), null).haber));
  assert.ok(!("etkinlik" in yayinYuku({ ...h, etkinlik: { ...e, tur: "party" } }, "ab".repeat(32), null).haber));
  assert.ok(!("etkinlik" in yayinYuku({ ...h, etkinlik: { ...e, bitis: "2027-06-01" } }, "ab".repeat(32), null).haber));
});

// ---------------------------------------------------------------- yazım + hat entegrasyonu (sahte model)
const EN = "The Meshk Exhibition will open its doors at the SEKA Paper Museum in Izmit and will stay open until 29 October. It is the first time that the works of this calligraphy tradition are shown in the city in one place. Visitors can walk through the rooms, and the entry is free for all of them. Art historians will also introduce the works to the guests, and the museum has planned workshops for the public.";
const TR = "Meşk Sergisi, İzmit'teki SEKA Kâğıt Müzesi'nde 29 Ekim'e kadar sanatseverleri ağırlayacak. Hat geleneğinden seçilen eserler ilk kez bu şehirde bir arada görülecek. Ziyaretçiler salonları gezebilecek ve giriş herkes için ücretsiz olacak. Sanat tarihçileri eserleri konuklara tanıtacak ve müze halk için atölye çalışmaları hazırladı.";
const YANIT = (ek = {}) => JSON.stringify({ uygun: true, kategori: "mahalle", yer: "İzmit, Türkiye", alt_konu: "topluluk-projesi", en: { baslik: "Meshk Exhibition opens in Izmit", ozet: EN }, tr: { baslik: "Meşk Sergisi İzmit'te sanatseverlerle buluşuyor", ozet: TR }, etkinlik: H(), ...ek });
const ADAY = (n = 1, ek = {}) => ({ baslik: BASLIK, ozet: KAYNAK_TR.split("\n")[1] + " " + "Sergi alanı geniş bir salonda kurulacak ve her yaştan ziyaretçi gelecek. ".repeat(2), link: `https://www.kocaelihaber.example/h/${n}`, kaynak: "kocaelihaber.example", dil: "tr", zaman: ZAMAN, alan: "mahalle", kaynakGuvenilir: true, ...ek });

test("yaz: etkinlik açıkken yazım çıktısında doğrulanmış etkinlik döner; kapalıyken alan yok; ret nedeni raporlanır", async () => {
  const model = (metin) => ({ yaz: async () => ({ metin, engellendi: "", saglayici: "taklit" }) });
  const ac = await haberYaz(model(YANIT()), ADAY(), "", { etkinlik: true, simdi: SIMDI });
  assert.equal(ac.durum, "ok", ac.neden);
  assert.equal(ac.haber.etkinlik.sehir, "Kocaeli"); assert.equal(ac.haber.etkinlik.bitis, "2026-10-29"); assert.equal(ac.haber.etkinlik.ucretsiz, true);
  const kapali = await haberYaz(model(YANIT()), ADAY(), "", { simdi: SIMDI });
  assert.equal(kapali.durum, "ok"); assert.ok(!("etkinlik" in kapali.haber));
  const ret = await haberYaz(model(YANIT({ etkinlik: H({ sehir: "Ankara" }) })), ADAY(), "", { etkinlik: true, simdi: SIMDI });
  assert.equal(ret.durum, "ok"); assert.ok(!("etkinlik" in ret.haber)); assert.equal(ret.etkinlikRet, "sehir");     // haber yayınlanır, etkinlik atılır
  const yok = await haberYaz(model(YANIT({ etkinlik: undefined })), ADAY(), "", { etkinlik: true, simdi: SIMDI });
  assert.ok(!("etkinlik" in yok.haber)); assert.ok(!("etkinlikRet" in yok));
  assert.match(istemKur("sanat"), /ETKİNLİK \(isteğe bağlı\)/); assert.match(istemKur("sanat"), /"etkinlik": \{\.\.\.\}/);
  assert.match(girdiHazirla(ADAY(), "", { simdi: SIMDI }), /BUGÜN: 2026-10-15 · YAYIN TARİHİ: 2026-10-13/);
  assert.doesNotMatch(girdiHazirla(ADAY(), ""), /BUGÜN/);
});

function sahteBulut(ek = {}) {
  const k = { yayinlar: [], isaretler: [], durum: new Map() };
  return { k, bilinenler: async () => new Map(), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; },
    yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; },
    durumOku: async (an) => new Map(an.filter((a) => k.durum.has(a)).map((a) => [a, k.durum.get(a)])), durumYaz: async (an, d) => { k.durum.set(an, d); return true; }, ...ek };
}
const fetchFn = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ...ek });
const tur = (bulut, model, adaylar, ayarEk = {}) => turCalistir({ ayar: ayar(ayarEk), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar, hatalar: [] } });

test("hat: etkinlikli haber yayınlanır, özet satırında etkinlik=1; aynı etkinlik ikinci kez yayınlanmaz (tur içi ve sonraki tur)", async () => {
  const model = { yaz: async () => ({ metin: YANIT(), engellendi: "", saglayici: "taklit" }) };
  const bulut = sahteBulut();
  const o = await tur(bulut, model, [ADAY(1), ADAY(2, { baslik: "Meşk Sergisi İzmit'te açılıyor: 14-29 Ekim" })]);
  assert.equal(bulut.k.yayinlar.length, 1);
  assert.equal(o.etkinlik, 1);
  assert.equal(bulut.k.yayinlar[0].h.etkinlik.ad, "Meşk Sergisi");
  assert.match(ozetSatiri(o), / etkinlik=1 /);
  assert.ok(bulut.k.durum.get("etkinlik:defter").k.length === 1);
  // sonraki tur: kalıcı defter aynı etkinliği engeller
  const bulut2 = sahteBulut(); bulut2.k.durum = bulut.k.durum;
  const o2 = await tur(bulut2, model, [ADAY(3, { baslik: "Meşk Sergisi SEKA'da sanatseverlerle buluşuyor" })]);
  assert.equal(bulut2.k.yayinlar.length, 0); assert.equal(o2.etkinlik, 0); assert.equal(o2.etkinlikRet.tekrar, 1);
  assert.match(ozetSatiri(o2), / etkinlikRet=tekrar:1/);
});

test("hat: etkinlik kanıtlanamazsa haber yine yayınlanır, etkinlikRet sayılır; ETKINLIK=0 ile kapanır", async () => {
  const model = { yaz: async () => ({ metin: YANIT({ etkinlik: H({ sehir: "Ankara" }) }), engellendi: "", saglayici: "taklit" }) };
  const bulut = sahteBulut();
  const o = await tur(bulut, model, [ADAY(1)]);
  assert.equal(bulut.k.yayinlar.length, 1); assert.ok(!("etkinlik" in bulut.k.yayinlar[0].h)); assert.deepEqual(o.etkinlikRet, { sehir: 1 }); assert.match(ozetSatiri(o), / etkinlik=0 etkinlikRet=sehir:1/);
  const bulut2 = sahteBulut();
  const o2 = await tur(bulut2, { yaz: async () => ({ metin: YANIT(), engellendi: "", saglayici: "taklit" }) }, [ADAY(1, { zaman: "2026-10-15T08:00:00Z" })], { etkinlik: false });      // seçenek kapalıyken eski duyuru da elenir: taze aday kullanılır
  assert.ok(!("etkinlik" in bulut2.k.yayinlar[0].h)); assert.equal(o2.etkinlik, 0);
  assert.equal(ayarOku({}, []).etkinlik, true); assert.equal(ayarOku({ ETKINLIK: "0" }, []).etkinlik, false); assert.equal(ayarOku({}, []).etkinlikTazelikSaat, 336); assert.equal(ayarOku({ ETKINLIK_TAZELIK_SAAT: "48" }, []).etkinlikTazelikSaat, 48);
});

test("kaynaklar: en çok 12 etkinlik sorgusu, 7 günlük pencere, ajans yasağı korunur", () => {
  const j = JSON.parse(readFileSync(new URL("../kaynaklar.json", import.meta.url), "utf8"));
  const q = j.gnews.filter((x) => x.etkinlik);
  assert.ok(q.length >= 1 && q.length <= 12);
  for (const x of q) { assert.equal(x.pencere, "7d"); assert.ok(!x.tazelik_saat); assert.ok(x.alan === undefined || x.alan === "sanat"); assert.ok(!/\b(aa|dha|iha)\b|anadolu ajansı/i.test(x.sorgu)); }
  assert.equal(new Set(j.gnews.map((x) => x.sorgu)).size, j.gnews.length);                      // yinelenen sorgu yok
});
