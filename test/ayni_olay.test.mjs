// "Aynı olay" denetimi (lib/ayni_olay.mjs) + hat entegrasyonu (tur içi, geçmişe karşı) + bulut.sonYayinlar. Ağ yok; model ve bulut taklit.
// Gerçek örnekler canlı 2026-10-14: aynı maç iki yayıncıdan iki kez yayınlandı (Fenerbahçe-Zalgiris 99-80, Sabah FK-Slavia Prag 2-0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { adayImzasi, ayniOlayBul, ayniOlayImza, ayniOlayMi, haberImzasi } from "../lib/ayni_olay.mjs";
import { sonYayinlar } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";

const FB_HURRIYET = { baslik: "Fenerbahçe, EuroLeague'de Zalgiris karşısında kazandı", ozet: "Fenerbahçe, EuroLeague'in 5. haftasında konuk ettiği Zalgiris'i 99-80 mağlup etti. Sarı-lacivertli ekip, bu sonuçla ligdeki 4. galibiyetine ulaştı. Zalgiris ise turnuvadaki 3. yenilgisini aldı. Başantrenör Sarunas Jasikevicius, güçlü bir rakibe karşı galip geldikleri için memnun olduklarını belirtti." };
const FB_NTV = { baslik: "Fenerbahçe Tarfin, evinde Zalgiris Kaunas'ı mağlup etti", ozet: "Fenerbahçe Tarfin, EuroLeague'in 5. haftasında Zalgiris Kaunas'ı 99-80 yendi. Maç sonunda Jasikevicius oyuncularını tebrik etti." };
const SABAH_HURRIYET = { baslik: "Sabah'tan Şampiyonlar Ligi'nde tarihi zafer", ozet: "Azerbaycan temsilcisi Sabah FK, Slavia Prag'ı 2-0 yenerek ilk kez katıldığı organizasyonda büyük bir sonuç aldı." };
const SABAH_NTV = { baslik: "Sabah FK'den Slavia Prag karşısında tarihi galibiyet", ozet: "Sabah FK, UEFA Şampiyonlar Ligi'nin 2. haftasında Slavia Prag'ı 2-0 mağlup etti. Bakü'de oynanan karşılaşmada golleri 49. dakikada Parris ve 88. dakikada Mickels kaydetti." };

test("özel ad çıkarımı: ek/kesme/aksan ayıklanır, genel sözcükler ve sıradan cümle başı sözcükleri ad sayılmaz", () => {
  const i = adayImzasi(FB_HURRIYET);
  assert.ok(i.adlar.has("zalgiris") && i.adlar.has("fenerbahce") && i.adlar.has("jasikevicius"));       // "Zalgiris'i" -> "zalgiris", "Fenerbahçe" -> "fenerbahce"
  assert.ok(!i.adlar.has("euroleague") && !i.adlar.has("sari"));          // genel yarışma adı, cümle başı sıradan sözcük
  assert.deepEqual([...i.skorlar], ["80-99"]);
  const l = adayImzasi({ baslik: "Researchers in Lisbon find new coral", ozet: "Researchers in Lisbon say the coral grows fast. Neighbors and friends cheered." });
  assert.deepEqual([...l.adlar], ["lisbon"]);                                                             // "Researchers"/"Neighbors" cümle başı sıradan sözcük
  const t = adayImzasi({ baslik: "Local Team Wins Historic Cup Final Again", ozet: "The side beat Rivertown FC in the final." });
  assert.ok(!t.adlar.has("historic") && !t.adlar.has("wins") && t.adlar.has("rivertown"));              // İngilizce Title Case başlıktaki sözcükler kesin ad sayılmaz
});

test("sayılar: skor sırasız (99-80 = 80-99), yıl ve küçük sayı sayılmaz, 22.950 = 22,950", () => {
  const i = ayniOlayImza([{ baslik: "A", ozet: "Final 2026 yılında 5 hafta sürdü, 22.950 kişi izledi, skor 3-1, set 25-22, tarih 2024-25." }]);
  assert.deepEqual([...i.skorlar].sort(), ["1-3", "22-25"]);
  assert.deepEqual([...i.sayilar], ["22950"]);
  assert.deepEqual([...adayImzasi({ baslik: "x", ozet: "22,950 spectators, 99–80 win" }).skorlar], ["80-99"]);
});

test("AYNI olay: farklı sözcüklerle yazılmış aynı maç (Fenerbahçe-Zalgiris 99-80, Sabah-Slavia 2-0)", () => {
  const a = ayniOlayMi(adayImzasi(FB_HURRIYET), adayImzasi(FB_NTV));
  assert.deepEqual([a.ayni, a.neden], [true, "ad+skor"]);
  const s = ayniOlayMi(adayImzasi(SABAH_HURRIYET), adayImzasi(SABAH_NTV));
  assert.equal(s.ayni, true);
  // skor yazılmamışsa da (yüksek ad örtüşmesi): iki ortak ad, küçük küme tümüyle ortak
  const x = { baslik: "Fenerbahçe, Zalgiris'i yendi", ozet: "Fenerbahçe, konuk ettiği rakibi yendi." }, y = { baslik: "Zalgiris Kaunas, Fenerbahçe deplasmanında kaybetti", ozet: "Konuk ekip direnemedi." };
  assert.equal(ayniOlayMi(adayImzasi(x), adayImzasi(y)).neden, "ad-oran");
  assert.equal(ayniOlayMi(adayImzasi(x), adayImzasi(y), { ham: true }).ayni, false);                   // ham aday: oran yolu için en az 3 ortak ad
});

test("yazılmış TR+EN haber imzası: iki dil birleşir, İngilizce yazımla da eşleşir", () => {
  const h1 = { tr: { baslik: "Fenerbahçe, Zalgiris'i 99-80 yendi", ozet: "Fenerbahçe, EuroLeague'de Zalgiris'i konuk etti ve 99-80 kazandı. Takım memnun." }, en: { baslik: "Fenerbahce beat Zalgiris 99-80", ozet: "Fenerbahce hosted Zalgiris in the EuroLeague and won 99-80, a result the squad welcomed." } };
  const h2 = { tr: { baslik: "Fenerbahçe Tarfin, Zalgiris Kaunas'ı mağlup etti", ozet: "Fenerbahçe Tarfin, Zalgiris Kaunas'ı evinde 99-80 yendi." }, en: { baslik: "Fenerbahce Tarfin defeat Zalgiris Kaunas", ozet: "Fenerbahce Tarfin beat Zalgiris Kaunas 99-80 at home." } };
  assert.equal(ayniOlayMi(haberImzasi(h1), haberImzasi(h2)).ayni, true);
  assert.equal(ayniOlayBul(haberImzasi(h2), [{ imza: haberImzasi(h1) }]) !== null, true);
  assert.equal(ayniOlayBul(haberImzasi(h2), []), null);
});

test("yanlış pozitif tuzakları: aynı takımın iki farklı maçı, aynı kurumun iki haberi, aynı şehirde iki etkinlik, ortak tek ad", () => {
  const ayni = (a, b) => ayniOlayMi(adayImzasi(a), adayImzasi(b));
  // aynı takımın iki farklı maçı (skorlar çelişir)
  const g1 = { baslik: "Galatasaray, Barcelona'ya 4-1 yenildi", ozet: "Galatasaray, RAMS Park'ta Barcelona'ya karşı 4-1 geride kaldı. Hansi Flick takımından memnun." };
  const g2 = { baslik: "Galatasaray liderliğe yükseldi", ozet: "Sahasında Kasımpaşa'yı 3-1 mağlup eden Galatasaray, 16 puana ulaştı." };
  assert.equal(ayni(g1, g2).ayni, false);
  // iki sözcüklü kulüp adı (Fenerbahçe Beko) + farklı rakipler: skor çelişir; skor yoksa oran yetmez
  const f1 = { baslik: "Fenerbahçe Beko, Olympiacos'u 85-70 yendi", ozet: "Fenerbahçe Beko evinde kazandı." };
  const f2 = { baslik: "Fenerbahçe Beko, Real Madrid'i 91-88 geçti", ozet: "Fenerbahçe Beko deplasmanda kazandı." };
  assert.deepEqual([ayni(f1, f2).ayni, ayni(f1, f2).neden], [false, "skor-celisir"]);
  const f3 = { baslik: "Fenerbahçe Beko, Olympiacos'u yendi", ozet: "" }, f4 = { baslik: "Fenerbahçe Beko, Real Madrid'i geçti", ozet: "" };
  assert.equal(ayni(f3, f4).ayni, false);
  // aynı kurumun iki farklı haberi
  const k1 = { baslik: "İstanbul Modern'de Picasso sergisi açıldı", ozet: "İstanbul Modern, Picasso'nun grafik işlerini bir araya getiren sergiyi ziyarete açtı." };
  const k2 = { baslik: "İstanbul Modern çocuklar için atölye düzenliyor", ozet: "İstanbul Modern'in eğitim birimi, Cumartesi günleri çocuklara seramik atölyesi sunacak." };
  assert.equal(ayni(k1, k2).ayni, false);
  // aynı şehirde iki farklı etkinlik
  const e1 = { baslik: "30. İstanbul Tiyatro Festivali Lacrima ile başlıyor", ozet: "İstanbul Tiyatro Festivali, ENKA Vakfı'ndaki gösterimle başlıyor." };
  const e2 = { baslik: "İstanbul'da Bisiklet Festivali başladı", ozet: "Kadıköy'de başlayan festivalde 3000 kişi pedal çevirdi." };
  assert.equal(ayni(e1, e2).ayni, false);
  // ortak tek özel ad, ortak skor olsa bile (farklı sporlar)
  const v1 = { baslik: "Galatasaray Ziraat Bankkart'ı 3-1 yendi", ozet: "Galatasaray voleybolda kupayı aldı." }, v2 = { baslik: "Galatasaray Kasımpaşa'yı 3-1 yendi", ozet: "Galatasaray futbolda liderliğe oturdu." };
  assert.equal(ayni(v1, v2).ayni, false);
  // sıradan cümle başı sözcüğü + aynı şehir: aynı olay değil
  const r1 = { baslik: "Researchers in Lisbon find new coral species", ozet: "Researchers in Lisbon say the coral grows quickly." }, r2 = { baslik: "Researchers in Lisbon map a medieval street", ozet: "Researchers in Lisbon published the map this week." };
  assert.equal(ayni(r1, r2).ayni, false);
});

// ---------------- hat entegrasyonu ----------------
const SIMDI = Date.parse("2026-10-14T12:00:00Z");
const FILLER_EN = "The home side led from the opening minutes and kept a steady rhythm through the third quarter. Fans in the hall stayed loud until the final whistle. The coach praised the players for their focus and their patience during difficult stretches of the night.";
const FILLER_TR = "Ev sahibi takım ilk dakikalardan itibaren öne geçti ve üçüncü periyot boyunca düzenli bir tempo tuttu. Salondaki taraftarlar son düdüğe kadar coşkuyla destek verdi. Antrenör oyuncularını odaklanma ve sabırları için tebrik etti.";
const CIKTI_EN = "Supporters filled the arena and cheered every basket. The visiting players struggled to find space in the second half. Afterwards the staff thanked the crowd for the support and looked ahead to the next fixture.";
const CIKTI_TR = "Taraftarlar salonu doldurdu ve her sayıyı alkışladı. Konuk oyuncular ikinci yarıda boş alan bulmakta zorlandı. Maçın ardından ekip, desteği için seyirciye teşekkür etti ve gözünü bir sonraki karşılaşmaya çevirdi.";
const yanit = (trB, enB, adlarTr, adlarEn) => JSON.stringify({ uygun: true, kategori: "spor", yer: "Dünya", en: { baslik: enB, ozet: `${adlarEn} ${CIKTI_EN}` }, tr: { baslik: trB, ozet: `${adlarTr} ${CIKTI_TR}` } });
const KAYNAK_A = "Fenerbahçe won the game against Zalgiris in the EuroLeague and the final score was 99-80 after a strong third quarter from the home side. " + FILLER_EN;
const KAYNAK_B = "Zalgiris Kaunas lost at Fenerbahçe Tarfin in the EuroLeague and the final score was 99-80 after a strong third quarter from the home side. " + FILLER_EN;
const ADAY_A = { baslik: "Fenerbahçe beat Zalgiris in the EuroLeague", ozet: KAYNAK_A, link: "https://www.goodnewsnetwork.org/a/1", kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-14T08:00:00Z" };
const ADAY_B = { baslik: "Zalgiris Kaunas lose at Fenerbahçe Tarfin", ozet: KAYNAK_B, link: "https://www.goodnewsnetwork.org/a/2", kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-14T08:05:00Z" };
const YANIT_A = yanit("Fenerbahçe, Zalgiris'i yendi", "Fenerbahçe beat Zalgiris at home", "Fenerbahçe, EuroLeague'de Zalgiris'i 99-80 yendi.", "Fenerbahçe beat Zalgiris 99-80 in the EuroLeague.");
const YANIT_B = yanit("Zalgiris Kaunas, Fenerbahçe Tarfin'e kaybetti", "Zalgiris Kaunas lose in Istanbul", "Zalgiris Kaunas, Fenerbahçe Tarfin deplasmanında 99-80 geride kaldı.", "Zalgiris Kaunas lost at Fenerbahçe Tarfin 99-80.");
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ozelAcik: false, onSinifAdet: 0, turBasinaEn: 10, gorselsizUst: 10, ...ek });
const fetchFn = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
function bulutKur(gecmis) {
  const k = { yayin: [], isaret: [], gecmisCagri: 0 };
  const b = { k, kota: async () => new Map(), bilinenler: async () => new Map(), isaretle: async (l) => { k.isaret.push(...l); return {}; }, yayinla: async (h) => { k.yayin.push(h); return { durum: "eklendi" }; } };
  if (gecmis !== undefined) b.sonYayinlar = async () => { k.gecmisCagri++; if (gecmis instanceof Error) throw gecmis; return gecmis; };
  return b;
}
function modelKur(yanitlar) {
  const k = { yazim: 0 };
  return { k, yaz: async (sistem, girdi) => { k.yazim++; const m = /BAŞLIK: (.*)/.exec(girdi)?.[1] || ""; return { metin: yanitlar.find(([re]) => re.test(m))?.[1] ?? yanitlar[0][1], engellendi: "" }; } };
}
const YAN_A = " The game was led by Wade Baldwin and Nigel Hayes while Sarunas Jasikevicius praised Tarik Biberovic after the buzzer.";
const YAN_B = " The visitors were led by Tomas Masiulis and Mantas Kalnietis while Arturas Gudaitis and Rokas Giedraitis tried to keep the margin small.";
const calis = async (bulut, model, adaylar, ayarEk = {}) => { const o = await turCalistir({ ayar: ayar(ayarEk), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar, hatalar: [] } }); if (process.env.DBG) console.log(JSON.stringify({ red: o.red, kodlar: o.redKodlari, durus: o.durus })); return o; };

test("hat: aynı turda aynı olay iki kez yayınlanmaz (kesin denetim, yazımdan sonra); ayniOlay=1 özet satırında", async () => {
  // ham metinlerde çok sayıda yan ad var (ortak ad oranı düşük): ham denetim geçer, ikinci aday YAZILIR; yazılmış kısa TR+EN metinlerde oran yüksek: kesin denetim eler
  const bulut = bulutKur(), model = modelKur([[/Fenerb/, YANIT_A], [/Zalgiris/, YANIT_B]]);
  const o = await calis(bulut, model, [{ ...ADAY_A, ozet: KAYNAK_A + YAN_A }, { ...ADAY_B, ozet: KAYNAK_B + YAN_B }]);
  assert.equal(model.k.yazim, 2);
  assert.equal(o.yayinlanan, 1); assert.equal(bulut.k.yayin.length, 1);
  assert.equal(o.ayniOlay, 1);
  assert.ok(bulut.k.isaret.some((x) => x.durum === "elendi" && x.neden === "ayni-olay:tur"));
  assert.match(ozetSatiri(o), / ayniOlay=1 /);
});

test("hat: ham aday metni de aynı olayı gösteriyorsa ikinci aday YAZILMAZ (model çağrısı israf olmaz)", async () => {
  const bulut = bulutKur(), model = modelKur([[/Fenerb/, YANIT_A], [/Zalgiris/, YANIT_B]]);
  const o = await calis(bulut, model, [{ ...ADAY_A }, { ...ADAY_B }]);
  assert.equal(model.k.yazim, 1);                                                                       // ikinci aday için yazım çağrısı yok
  assert.equal(o.yayinlanan, 1); assert.equal(o.ayniOlay, 1);
  assert.ok(bulut.k.isaret.some((x) => x.neden === "ayni-olay:ham-tur"));
});

test("hat: son yayınlananlara karşı (bulut.sonYayinlar) aynı olay elenir; geçmiş okunamazsa tur aksamaz", async () => {
  const gecmis = [{ kategori: "spor", baslik: FB_HURRIYET.baslik, ozet: FB_HURRIYET.ozet, zaman: "2026-10-13T22:48:25+00:00" }, { kategori: "felsefe", baslik: "Fenerbahçe Zalgiris", ozet: "99-80", zaman: "2026-10-13T20:00:00+00:00" }];
  const b1 = bulutKur(gecmis), m1 = modelKur([[/./, YANIT_B]]);
  const o1 = await calis(b1, m1, [{ ...ADAY_B }]);
  assert.equal(o1.yayinlanan, 0); assert.equal(o1.ayniOlay, 1); assert.equal(m1.k.yazim, 0); assert.equal(b1.k.gecmisCagri, 1);
  assert.ok(b1.k.isaret.some((x) => x.neden === "ayni-olay:ham-gecmis"));
  const b2 = bulutKur(new Error("ağ yok")), m2 = modelKur([[/./, YANIT_B]]);
  const o2 = await calis(b2, m2, [{ ...ADAY_B }]);
  assert.equal(o2.yayinlanan, 1); assert.equal(o2.ayniOlay, 0);
  const b3 = bulutKur(), m3 = modelKur([[/./, YANIT_B]]);                                              // sonYayinlar tanımsız (eski sözleşme / kapalı)
  assert.equal((await calis(b3, m3, [{ ...ADAY_B }])).yayinlanan, 1);
  const b4 = bulutKur(gecmis), m4 = modelKur([[/./, YANIT_B]]);                                        // AYNI_OLAY=0
  assert.equal((await calis(b4, m4, [{ ...ADAY_B }], { ayniOlay: false })).yayinlanan, 1);
  assert.equal(b4.k.gecmisCagri, 0);
});

test("hat: farklı olaylar (aynı takımın iki farklı maçı) ikisi de yayınlanır", async () => {
  const bulut = bulutKur(), model = modelKur([[/Fenerb/, YANIT_A], [/Galatasaray/, yanit("Galatasaray Kasımpaşa'yı yendi", "Galatasaray beat Kasimpasa", "Galatasaray, Kasımpaşa'yı 3-1 yendi.", "Galatasaray beat Kasimpasa 3-1.")]]);
  const g = { baslik: "Galatasaray beat Kasimpasa to take the lead", ozet: "Galatasaray beat Kasimpasa 3-1 at home and took the lead in the table after the seventh week of the league season. " + FILLER_EN, link: "https://www.goodnewsnetwork.org/a/3", kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-14T08:10:00Z" };
  const o = await calis(bulut, model, [{ ...ADAY_A }, g]);
  assert.equal(o.yayinlanan, 2); assert.equal(o.ayniOlay, 0);
});

test("bulut.sonYayinlar: yalnız haber gönderileri ve pencere içindekiler, sayfalama, kapalı/hatalı durumda []", async () => {
  const o = (zaman, haber = true, metin = "Başlık\n\nÖzet metni.") => ({ zaman, haber, kategori: "spor", metin });
  const saat = (s) => new Date(SIMDI - s * 3600_000).toISOString();
  const sayfa1 = Array.from({ length: 120 }, (_, i) => o(saat(1 + i * 0.1)));
  const cagrilar = [];
  const fetchFn = async (url, init) => { const g = JSON.parse(init.body); cagrilar.push(g); return { ok: true, status: 200, json: async () => ({ ogeler: g.p_once ? [o(saat(40)), o(saat(60)), o(saat(50), false)] : sayfa1 }) }; };
  const r = await sonYayinlar({ url: "https://x.example/rest/v1/rpc/akis", anahtar: "pk", saat: 48, simdi: SIMDI, fetchFn });
  assert.equal(cagrilar.length, 2); assert.equal(cagrilar[1].p_once, sayfa1[119].zaman);
  assert.equal(r.length, 121);                                                                           // 120 + 40 saat önceki 1; 60 saat önceki pencere dışı, haber olmayan elendi
  assert.deepEqual([r[0].baslik, r[0].ozet, r[0].kategori], ["Başlık", "Özet metni.", "spor"]);
  assert.deepEqual(await sonYayinlar({ url: "", anahtar: "pk", fetchFn }), []);
  assert.deepEqual(await sonYayinlar({ url: "http://x.example/akis", anahtar: "pk", fetchFn }), []);   // yalnız https
  assert.deepEqual(await sonYayinlar({ url: "https://x.example/akis", anahtar: "", fetchFn }), []);
  assert.deepEqual(await sonYayinlar({ url: "https://x.example/akis", anahtar: "pk", fetchFn: async () => { throw new Error("ağ"); } }), []);
  assert.deepEqual(await sonYayinlar({ url: "https://x.example/akis", anahtar: "pk", fetchFn: async () => ({ ok: false, status: 503 }) }), []);
});

test("ayarlar: AYNI_OLAY, OP_AKIS_URL/ANAHTAR, HAYVAN_REZERV varsayılanları ve kapatma", () => {
  const v = ayarOku({}, []);
  assert.deepEqual([v.ayniOlay, v.ayniOlaySaat, v.akisUrl, v.akisAnahtar, v.hayvanRezerv], [true, 48, "", "", 2]);
  const e = ayarOku({ AYNI_OLAY: "0", AYNI_OLAY_SAAT: "24", OP_AKIS_URL: " https://x.example/akis ", OP_AKIS_ANAHTAR: "pk", HAYVAN_REZERV: "0" }, []);
  assert.deepEqual([e.ayniOlay, e.ayniOlaySaat, e.akisUrl, e.akisAnahtar, e.hayvanRezerv], [false, 24, "https://x.example/akis", "pk", 0]);
});
