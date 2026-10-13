// İlk canlı tur sonrası kalite düzeltmeleri: başlık Türkçe karakter tutarlılığı, görsel kontrol tablosu, arşiv elemesi, özet satırı, tazelik.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baslikOnar } from "../lib/turkce.mjs";
import { haberYaz } from "../lib/yaz.mjs";
import { vlDegerlendir, VL_BEKLENEN, arsivMi, sec } from "../lib/gorsel.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { onEleme } from "../lib/on_eleme.mjs";
import { ozetSatiri, redSinifi, turCalistir } from "../hat.mjs";

test("başlık onarımı: gövdeden Türkçe karakter geri gelir", () => {
  const o = baslikOnar("ilk gunde madalya yagmuru", "Genç sporcular ilk günde madalya yağmuru yaşadı.");
  assert.equal(o.baslik, "ilk günde madalya yağmuru");
  assert.equal(o.supheli, false);
  assert.equal(baslikOnar("Ilk Gunde madalya", "Sporcular ilk günde yarıştı.").baslik, "Ilk Günde madalya");
});

test("başlık: gövdede olmayan bozuk kalıp şüpheli, normal ASCII başlık değil", () => {
  assert.equal(baslikOnar("Milli haltercilerden ilk gunde madalya yagmuru", "Genç sporcular madalya aldı. Şampiyona sürüyor.").supheli, true);
  assert.equal(baslikOnar("Okulda ders kitabi ve masa", "Çocuklar okulda kitap okudu.").supheli, false);   // bilinen kalıp yok: yanlış pozitif yok
  assert.equal(baslikOnar("Komşular ağaç dikti", "Komşular ağaç dikti.").supheli, false);               // zaten Türkçe karakterli
  assert.equal(baslikOnar("Yeni park acildi", "Park açıldı. Çocuklar sevindi.").supheli, false);
  assert.equal(baslikOnar("Gunde bir elma", "Ascii govde yalniz").supheli, false);                        // gövdede Türkçe karakter yok: denetim yok
});

const EN = "Young weightlifters from the national team won many medals on the first day of the European Championships held in the capital. The competition drew large crowds to the hall. " +
  "Several athletes set new personal records during the session. Coaches said that months of steady training paid off. The event continues for the rest of the week with more categories.";
const TR_OZET = "Başkentte düzenlenen Avrupa Şampiyonası'nın ilk gününde milli takımın genç halterci sporcuları çok sayıda madalya kazandı. Yarışma salonu büyük ilgi gördü. " +
  "Birkaç sporcu seansta kişisel rekorlarını yeniledi. Antrenörler aylarca süren düzenli çalışmanın karşılığını aldıklarını söyledi. Etkinlik haftanın kalanında yeni kategorilerle sürecek ve takip edilecek.";
const yanit = (trBaslik, ek = {}) => JSON.stringify({ uygun: true, kategori: "spor", yer: "Ankara, Türkiye", gorsel_arama: "weightlifting barbell gym", en: { baslik: "Young lifters win medals", ozet: EN }, tr: { baslik: trBaslik, ozet: TR_OZET }, ...ek });
const KAYNAK = "At the continental weightlifting event in the capital, the youngest members of the national squad collected a surprising pile of medals on opening day. Spectators filled the arena, several lifters beat their own bests, and trainers credited long months of patient preparation. More categories follow until the weekend.";
const aday = { baslik: "Young lifters win medals", ozet: KAYNAK, dil: "en" };

test("haberYaz: bozuk TR başlık modelden bir kez yeniden istenir ve düzelirse yayınlanır", async () => {
  const cevaplar = [yanit("Milli haltercilerden ilk gunde madalya yagmuru"), JSON.stringify({ baslik: "Milli haltercilerden ilk günde madalya yağmuru" })];
  let n = 0;
  const model = { yaz: async () => ({ metin: cevaplar[n++], engellendi: "", saglayici: "t" }) };
  const y = await haberYaz(model, aday, "");
  assert.equal(y.durum, "ok");
  assert.equal(y.haber.tr.baslik, "Milli haltercilerden ilk günde madalya yağmuru");
  assert.equal(n, 2);
  assert.equal(y.haber.gorselAra, "weightlifting barbell gym");
});

test("haberYaz: yeniden istek de bozuksa haber atlanır; gövdeden onarılabiliyorsa ek çağrı yok", async () => {
  let n = 0;
  const bozuk = { yaz: async () => ({ metin: n++ === 0 ? yanit("Milli haltercilerden ilk gunde madalya yagmuru") : JSON.stringify({ baslik: "ilk gunde yagmur" }), engellendi: "" }) };
  const y = await haberYaz(bozuk, aday, "");
  assert.equal(y.durum, "ret");
  assert.match(y.neden, /baslik/);
  assert.equal(n, 2);
  let m = 0;
  const duzgun = { yaz: async () => { m++; return { metin: yanit("Halterciler ilk gunde madalya aldi gunun"), engellendi: "" }; } };
  // gövdede "gününde" var, "gunde" yok: bilinen kalıp ("gunde") kaldığı için yeniden istenir; burada yeniden istek yanıtı da aynı JSON (baslik alanı yok) -> ret
  const y2 = await haberYaz(duzgun, aday, "");
  assert.equal(y2.durum, "ret");
  assert.equal(m, 2);
  // gövdede birebir geçen kelimeler onarılır, ek çağrı yapılmaz
  let k = 0;
  const onarilir = { yaz: async () => { k++; return { metin: yanit("Halterciler ilk gününde sevindi", {}).replace("gününde sevindi", "gununde sevindi"), engellendi: "" }; } };
  const y3 = await haberYaz(onarilir, aday, "");
  assert.equal(y3.durum, "ok");
  assert.equal(y3.haber.tr.baslik, "Halterciler ilk gününde sevindi");
  assert.equal(k, 1);
});

test("görsel kontrol JSON kabul/ret tablosu", () => {
  const tamam = { ...VL_BEKLENEN, kisa_gerekce: "halter bari" };
  assert.equal(vlDegerlendir(JSON.stringify(tamam)).ok, true);
  const ters = { konuya_uygun: false, siyah_beyaz_ya_da_arsiv: true, ciplak_ya_da_uygunsuz: true, taninabilir_yuz_baskin: true, kisi_grubu_poz: true,
    yazi_logo_baskin: true, hassas_simge: true, dusuk_kalite: true, cinsiyet_ya_da_yas_uyumsuz: true };
  for (const [k, v] of Object.entries(ters)) assert.equal(vlDegerlendir(JSON.stringify({ ...tamam, [k]: v })).ok, false, k);
  const eksik = { ...tamam }; delete eksik.cinsiyet_ya_da_yas_uyumsuz;
  assert.equal(vlDegerlendir(JSON.stringify(eksik)).ok, false);
  assert.equal(vlDegerlendir(JSON.stringify({ ...tamam, kisi_grubu_poz: "false" })).ok, false);
  assert.equal(vlDegerlendir("```json\nbozuk").ok, false);
});

test("arşiv elemesi: yıl < 2005, bilinmeyen yıl + 19xx / anahtar kelime", () => {
  assert.equal(arsivMi({ metin: "Weightlifters", yil: 1957 }), true);
  assert.equal(arsivMi({ metin: "Weightlifters", yil: 2019 }), false);
  assert.equal(arsivMi({ metin: "Weightlifters 1956 team", yil: null }), true);
  assert.equal(arsivMi({ metin: "Weightlifters team", yil: null, yilDosya: 1999 }), true);
  assert.equal(arsivMi({ metin: "Barbell in gym", yil: null }), false);
  assert.equal(arsivMi({ metin: "Historic black and white photo of a gym", yil: 2012 }), true);
  assert.equal(arsivMi({ metin: "Vintage barbell", yil: null }), true);
  const a = (metin, yil) => ({ metin, yil, lisans: "CC BY 4.0", w: 1280, h: 800, yaratici: "X", url: metin });
  assert.deepEqual(sec([a("barbell gym old", 1950), a("barbell gym hall", 2020)], ["barbell", "gym"], 5).map((x) => x.url), ["barbell gym hall"]);
});

test("özet satırı biçimi ve red sınıflaması", () => {
  const o = { aday: 40, yeniAday: 30, onElemeGecen: 21, modelCagri: 6, elenen: 3, bekleyenGorsel: 2, bekleyenKaynak: 5, yayinlanan: 1, kota: 0, sureSn: 95, durus: "tamam",
    red: { uygunDegil: 2, rakam: 1, dil: 0, filtre: 0, diger: 0 } };
  assert.equal(ozetSatiri(o), "ozet: taranan=40 yeni=30 onEleme=21 modelCagri=6 modelRed=3(uygunDegil=2,rakam=1,dil=0,filtre=0,diger=0) elenen=3 bekleyenGorsel=2 bekleyenKaynak=5 yayinlanan=1 kota429=0 sure=95s durus=tamam");
  assert.equal(redSinifi("model: uygun değil"), "uygunDegil");
  assert.equal(redSinifi("tr kaynakta olmayan rakam"), "rakam");
  assert.equal(redSinifi("en dil sezgisi tutmadı"), "dil");
  assert.equal(redSinifi("ikinci filtre:x"), "filtre");
  assert.equal(redSinifi("C3 kapısı"), "filtre");
  assert.equal(redSinifi("tr baslik karakter bozuk"), "diger");
});

test("tazelik 24 saat, en yeni önce işlenir", async () => {
  assert.equal(ayarOku({}, []).tazelikSaat, 24);
  const simdi = Date.parse("2026-10-13T12:00:00Z");
  assert.equal(onEleme({ baslik: "Volunteers plant trees", ozet: "x", zaman: "2026-10-12T10:00:00Z" }, { simdi, tazelikSaat: 24 }).ok, false);
  assert.equal(onEleme({ baslik: "Volunteers plant trees", ozet: "x", zaman: "2026-10-12T13:00:00Z" }, { simdi, tazelikSaat: 24 }).ok, true);
  const gorulen = [];
  const model = { yaz: async (_s, g) => { gorulen.push(g.match(/BAŞLIK: (.*)/)[1]); throw new Error("durdur"); } };
  const bulut = { bilinenler: async () => new Map(), isaretle: async () => ({}), yayinla: async () => ({}) };
  const ozet = "Volunteers planted many trees along the river and neighbors shared the work. ".repeat(5);
  const mk = (n, zaman) => ({ baslik: `Garden club turns lot ${n} into meadow`, ozet, link: `https://www.goodnewsnetwork.org/x/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman });
  const f = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
  await turCalistir({ ayar: { ...ayarOku({}, []), geminiBeklemeMs: 0 }, kaynaklar: {}, bulut, model, fetchFn: f, bekleFn: async () => {}, simdi: () => simdi, log: () => {},
    tarama: { adaylar: [mk("alpha", "2026-10-13T01:00:00Z"), mk("bravo", "2026-10-13T10:00:00Z")], hatalar: [] } });
  assert.match(gorulen[0], /bravo/);
});
