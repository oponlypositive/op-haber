// SAHİP KARARLARI 2026-10-16: (1) teknoloji kapalı, (2) görsel zorunlu kategoriler genişledi (doga, tarih, astroloji), (3) spor görsel branş uyumu + kişi haberinde yanlış takım/oyuncu fotoğrafı yok
// + aynı olay denetimi (kişi + olgu), (4) astroloji hesabı (op_astroloji, eğlence/kültür çerçevesi), (5) OP Astronomi görünen adı, (6) özet satırı. Ağ yok: sahte fetch/model/bulut.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ayarOku } from "../lib/ayar.mjs";
import { ALANLAR, ALAN_ADLARI, VARSAYILAN_ALAN_KOTALARI, alanOnEleme, kategoriKapaliMi, kotaAyristir } from "../lib/alanlar.mjs";
import { HABER_KATEGORILERI, KATEGORILER, ciktiDogrula, EMOJI } from "../lib/dogrula.mjs";
import { ISTEM, haberYaz, redKodu } from "../lib/yaz.mjs";
import { ON_SINIF_ISTEM, sonuclariDogrula } from "../lib/on_sinif.mjs";
import { gnewsAdres, kaynaklariTara } from "../lib/rss.mjs";
import { baglantiOzeti } from "../lib/rss.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";
import { BOT_ALANLARI, KAPALI_HESAPLAR, ASTROLOJI_NOTU, botAlani, botYanitDogrula, hesapKapaliMi, soruTara } from "../lib/bot_yanit_kural.mjs";
import { GORSEL_ZORUNLU_KATEGORILER, gorselZorunluMu } from "../lib/gorsel_zorunlu.mjs";
import { ASTROLOJI_YASAK, DERS_ISTEMI, UZMANLIK, dersDogrula, dersHazirla, dersleriDuzle, mufredatDogrula, mufredatHaberi, mufredatlariYukle, sabitNedeni, sonNotluOzet, uzmanlikMetni } from "../lib/mufredat.mjs";
import { BRANS_IPUCLARI, bransCelisiyor, haberBransi, sporKisiHaberi } from "../lib/gorsel_spor.mjs";
import { gorselBul, ozneSec, VL_OZNE_BEKLENEN } from "../lib/gorsel.mjs";
import { adayImzasi, ayniOlayMi } from "../lib/ayni_olay.mjs";

const SIMDI = Date.parse("2026-10-16T09:00:00Z");
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const yanit = (kategori) => JSON.stringify({ uygun: true, kategori, yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, onSinifAdet: 0, ...ek });
const aday = (n, ek = {}) => ({ baslik: `Volunteers plant thousands of trees beside Lakeside river (${n})`, ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/k/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-16T06:00:00Z", ...ek });
function sahteBulut() {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => new Map(), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } };
}
const fetch404 = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}), text: async () => "" });
const sayacliModel = (metin) => { const m = { yazim: 0, yaz: async (s, g, sec = {}) => { if (!sec.resim) m.yazim++; return { metin, engellendi: "", saglayici: "taklit" }; } }; return m; };
const tur = (bulut, model, adaylar, ek = {}) => turCalistir({ ayar: ayar(ek), kaynaklar: {}, bulut, model, fetchFn: fetch404, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar, hatalar: [] } });
const kaynaklar = JSON.parse(readFileSync(fileURLToPath(new URL("../kaynaklar.json", import.meta.url)), "utf8"));

// ================================================================ 1) TEKNOLOJİ KAPALI
test("teknoloji: alan tablosu, kota ve kategori listeleri teknolojiyi taşımaz; kapalı alan adayı alan ön elemesinde 'kategori-kapali'", () => {
  assert.ok(!("teknoloji" in ALANLAR) && !ALAN_ADLARI.includes("teknoloji"));
  assert.ok(!("teknoloji" in VARSAYILAN_ALAN_KOTALARI));
  assert.equal(kotaAyristir("teknoloji:9,spor:2").teknoloji, undefined);
  assert.ok(!HABER_KATEGORILERI.includes("teknoloji") && !KATEGORILER.includes("teknoloji"));
  assert.ok(kategoriKapaliMi("teknoloji") && !kategoriKapaliMi("bilim"));
  assert.deepEqual(alanOnEleme({ alan: "teknoloji", baslik: "Engineers build a solar powered sensor", ozet: "" }), { ok: false, neden: "alan:kategori-kapali" });
  assert.doesNotMatch(ISTEM, /\|teknoloji\|/);                              // model kategori listesinde yok
  assert.match(ISTEM, /teknoloji haberi KABUL EDİLMEZ/);
  assert.doesNotMatch(ON_SINIF_ISTEM, /bilim\|teknoloji/);
});

test("teknoloji: model yine 'teknoloji' derse haber ELENİR (kategori-kapali, kalıcı, tek çağrı); bilime KAYDIRILMAZ", async () => {
  const v = ciktiDogrula({ uygun: true, kategori: "teknoloji" }, "x");
  assert.deepEqual([v.ok, v.neden, v.kalici], [false, "kategori-kapali", true]);
  assert.equal(redKodu("kategori-kapali"), "kategori-kapali");
  assert.equal(redKodu("kategori geçersiz"), "kategori");
  const model = sayacliModel(yanit("teknoloji"));
  const y = await haberYaz(model, { baslik: "Engineers build a solar powered sensor", ozet: OZET_KAYNAK, dil: "en" }, "");
  assert.equal(y.durum, "ret"); assert.equal(y.neden, "kategori-kapali"); assert.equal(y.kalici, true); assert.equal(model.yazim, 1);
  // hat: elenir, yayınlanmaz, kategoriKapali sayılır, özet satırında görünür
  const bulut = sahteBulut();
  const o = await tur(bulut, sayacliModel(yanit("teknoloji")), [aday(1)]);
  assert.equal(o.yayinlanan, 0); assert.equal(bulut.k.yayinlar.length, 0);
  assert.equal(o.kategoriKapali, 1); assert.equal(o.redKodlari["kategori-kapali"], 1);
  assert.match(bulut.k.isaretler.at(-1).neden, /kategori-kapali/); assert.equal(bulut.k.isaretler.at(-1).durum, "elendi");
  assert.match(ozetSatiri(o), / kategoriKapali=1/);
});

test("teknoloji: kaynaktan sızan teknoloji alanlı aday ön elemede elenir (model çağrılmaz); pasif kaynaklar HİÇ taranmaz", async () => {
  const bulut = sahteBulut(), model = sayacliModel(yanit("bilim"));
  const o = await tur(bulut, model, [aday(2, { alan: "teknoloji", baslik: "Engineers build a solar powered sensor for farms" })]);
  assert.equal(model.yazim, 0); assert.equal(o.yayinlanan, 0); assert.equal(o.kategoriKapali, 1); assert.equal(o.elenen, 1);
  assert.match(bulut.k.isaretler.at(-1).neden, /on-eleme:alan:kategori-kapali/);
  // kaynaklar.json: tüm teknoloji kaynakları pasif + koşul notu; taramada istek yok
  const tekRss = kaynaklar.rss.filter((k) => k.alan === "teknoloji"), tekGn = kaynaklar.gnews.filter((k) => k.alan === "teknoloji");
  assert.ok(tekRss.length >= 9 && tekGn.length >= 4);
  for (const k of [...tekRss, ...tekGn]) { assert.equal(k.pasif, true, k.ad || k.sorgu); assert.equal(k.kosul_not, "2026-10-16 sahip: teknoloji sistemden çıkarıldı. SAHİP ONAYI GEREKİR"); }
  const istenen = [];
  const f = async (u) => { istenen.push(String(u)); return { ok: false, status: 404, headers: new Headers(), text: async () => "", json: async () => ({}) }; };
  await kaynaklariTara(kaynaklar, { fetchFn: f, bekleMs: 0, gnewsGrup: 1, bingAcik: false });
  for (const k of tekRss) assert.ok(!istenen.includes(k.url), `pasif RSS çekilmedi: ${k.ad}`);
  for (const k of tekGn) assert.ok(!istenen.includes(gnewsAdres(k.sorgu, { pencere: k.pencere || "1d" })), `pasif Google News sorgusu çekilmedi: ${k.sorgu}`);
  const aktif = kaynaklar.rss.find((k) => !k.pasif);
  assert.ok(istenen.includes(aktif.url), "pasif olmayan kaynak taranır");
});

test("teknoloji: ön sınıf 'alan: teknoloji' derse aday yazıma girmeden elenir (kategori-kapali)", () => {
  const m = sonuclariDogrula([{ i: 1, uygun: true, puan: 9, alan: "teknoloji", neden: "ok" }, { i: 2, uygun: true, puan: 7, alan: "bilim", neden: "ok" }], 2);
  assert.deepEqual(m.get(1), { uygun: false, puan: 0, alan: "", altKonu: "", cinsiyet: "", neden: "kategori-kapali" });
  assert.equal(m.get(2).uygun, true);
});

test("teknoloji: op_teknoloji bot alanı tablodan çıktı; etiketlenirse hesap-kapali; op_gokbilim görünen adı OP Astronomi", () => {
  assert.equal(BOT_ALANLARI.op_teknoloji, undefined);
  assert.ok(KAPALI_HESAPLAR.has("op_teknoloji") && hesapKapaliMi("@OP_Teknoloji") && !hesapKapaliMi("op_bilim"));
  assert.equal(BOT_ALANLARI.op_gokbilim.adTr, "OP Astronomi"); assert.equal(BOT_ALANLARI.op_gokbilim.adEn, "OP Astronomy");
});

// ================================================================ 2) GÖRSEL ZORUNLU kategoriler genişledi
test("görsel zorunlu: doga, tarih, astroloji eklendi; haber (doga) görselsiz YAYINLANMAZ, bekliyor_gorsel", async () => {
  assert.deepEqual([...GORSEL_ZORUNLU_KATEGORILER].sort(), ["astroloji", "doga", "mutfak", "muzik", "oyun", "resim", "sanat", "tarih"]);
  const model = sayacliModel(yanit("doga")), bulut = sahteBulut();
  const o = await tur(bulut, model, [aday(3)]);                         // gorselsizYayin varsayılan açık olsa bile zorunlu kategori bekler
  assert.equal(bulut.k.yayinlar.length, 0); assert.equal(o.gorselsiz, 0);
  const k = bulut.k.isaretler.at(-1);
  assert.equal(k.durum, "bekliyor_gorsel"); assert.equal(k.deneme, 1); assert.equal(k.yuk.kategori, "doga");
  assert.deepEqual(o.gorselZorunlu, { bekletilen: 1, atlanan: 0 });
  // başka kategori (iyilik) hâlâ görselsiz çıkabilir
  const b2 = sahteBulut(), o2 = await tur(b2, sayacliModel(yanit("iyilik")), [aday(4)]);
  assert.equal(b2.k.yayinlar.length, 1); assert.equal(o2.gorselsiz, 1);
});

test("görsel zorunlu: tarih (Rönesans/Antik) ve astroloji müfredat dersi görselsizse hazırlanmaz (gorsel-yok, bekletme yolu)", async () => {
  for (const kategori of ["tarih", "astroloji", "doga"]) {
    const m = { hesap: "op_test", kategori, gunlukUst: 2, seriler: [{ yol: ["Seri"], aciklama_tr: "Açıklama", aciklama_en: "Description", dersler: [{ id: "d0", baslik_tr: "Ders", baslik_en: "Lesson", tur: "bilgi", kaynak: { wiki_en: "X" }, sabit: { tr: "Bu metin sabit ve yeterince uzun bir Türkçe ders metnidir, görsel yoksa yayınlanmaz.", en: "This fixed text is long enough for a lesson and is never published without a picture." }, gorsel: null }] }] };
    const d = dersleriDuzle(m)[0];
    const r = await dersHazirla({ m, d, kimlik: { id: "m-d0", ozet: "ab" }, model: null, fetchFn: fetch404, cagriHakki: 3, bekleFn: async () => {}, simdi: SIMDI });
    assert.equal(r.ok, false, kategori); assert.equal(r.neden, "gorsel-yok"); assert.equal(r.gorselYok, true); assert.equal(r.kalici, false);
  }
});

// ================================================================ 3) SPOR: görsel branş uyumu + kişi haberi + aynı olay
const FUTBOL = { kategori: "spor", alt_konu: "futbol", en: { baslik: "Kelechi Iheanacho breaks the goal record in Turkey", ozet: "The striker scored again in the Super Lig." }, tr: { baslik: "Kelechi Iheanacho Türkiye'de gol rekorunu kırdı", ozet: "Forvet Süper Lig'de yine gol attı." } };
test("branş: Commons dosyası başka branşı gösteriyorsa (TBSL, BSL, EuroLeague, voleybol, hentbol) futbol haberine konmaz; aynı branş ya da ipucu yok geçer", () => {
  const BURSA = "Berkay Candan 32 Bursaspor MB TBSL 2022.jpg Bursaspor Basketbol players";
  assert.equal(bransCelisiyor(BURSA, FUTBOL), "basketbol");
  assert.equal(bransCelisiyor("File:Fenerbahçe Beko EuroLeague 2021.jpg", FUTBOL), "basketbol");
  assert.equal(bransCelisiyor("Sultanlar Ligi VakıfBank volleyball match", FUTBOL), "voleybol");
  assert.equal(bransCelisiyor("Turkey women's handball team EHF Euro", FUTBOL), "hentbol");
  assert.equal(bransCelisiyor("Bursaspor football team Süper Lig 2020", FUTBOL), "");           // aynı branş
  assert.equal(bransCelisiyor("Bursaspor Timsah Park stadium", FUTBOL), "");                      // ipucu yok: görsel denetimi karar verir
  assert.equal(bransCelisiyor("Bursaspor football and basketball joint photo", FUTBOL), "");      // ikisi de geçiyor: belirsiz, geçer
  // ters yön ve diğer branşlar
  const BASKET = { kategori: "spor", alt_konu: "basketbol", en: { baslik: "Fenerbahce wins EuroLeague game", ozet: "x" }, tr: { baslik: "Fenerbahçe kazandı", ozet: "x" } };
  assert.equal(bransCelisiyor("Galatasaray football team Süper Lig", BASKET), "futbol");
  assert.equal(bransCelisiyor("Fenerbahçe Beko EuroLeague", BASKET), "");
  // spor dışı haber ya da branşı bilinmeyen haber: denetim yok
  assert.equal(bransCelisiyor(BURSA, { kategori: "sanat", en: { baslik: "x", ozet: "y" } }), "");
  assert.equal(bransCelisiyor(BURSA, { kategori: "spor", alt_konu: "diger", en: { baslik: "Local sports day", ozet: "Children ran" }, tr: { baslik: "", ozet: "" } }), "");
  // alt_konu yoksa metinden branş bulunur
  assert.equal(haberBransi({ kategori: "spor", en: { baslik: "Galatasaray beat Besiktas in the derby football match", ozet: "" }, tr: { baslik: "", ozet: "" } }), "futbol");
  assert.ok(BRANS_IPUCLARI.basketbol.test("tbsl") && !BRANS_IPUCLARI.futbol.test("tbsl"));
});

const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const fImg = async () => ({ ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer });
const cand = (ek) => ({ baslik: "x.jpg", metin: "x", lisans: "CC BY-SA 4.0", w: 1280, h: 850, yil: 2019, yaratici: "Foto", url: "https://u/" + Math.random(), kaynak_url: "https://c/wiki", saglayici: "wikimedia", ...ek });
const vlOk = () => ({ sorular: [], yaz: async function (s, g) { this.sorular.push(g); return { metin: JSON.stringify({ ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" }) }; } });

test("branş: özne araması (ozneSec) başka branşın takım/oyuncu fotoğrafını ELER", () => {
  const basket = cand({ baslik: "Berkay Candan 32 Bursaspor MB TBSL 2022.jpg", metin: "Berkay Candan 32 Bursaspor MB TBSL 2022.jpg Bursaspor Basketbol" });
  const futbol = cand({ baslik: "Bursaspor football team 2020.jpg", metin: "Bursaspor football team 2020.jpg" });
  const ozne = { ad: "Bursaspor", tur: "kurum" };
  assert.equal(ozneSec([basket, futbol], ozne, 3).length, 2);                                   // haber verilmezse eski davranış
  assert.deepEqual(ozneSec([basket, futbol], ozne, 3, FUTBOL).map((x) => x.baslik), ["Bursaspor football team 2020.jpg"]);
});

test("branş: görsel planında kulüp (kurum) adayının Wikidata/Commons görseli başka branştaysa REDDEDİLİR; futbol görseli kabul edilir", async () => {
  const haber = { ...FUTBOL, yer: "Bursa, Türkiye", gorselAdaylari: [{ tur: "kurum", ad_en: "Bursaspor" }] };
  const wdFn = async () => ({ durum: "ok", varlik: { etiket: "Bursaspor", aciklama: "Turkish sports club", gorselAdi: "Berkay Candan 32 Bursaspor MB TBSL 2022.jpg", logoAdi: "", spor: true } });
  const dosyaBasket = async () => [cand({ baslik: "Berkay Candan 32 Bursaspor MB TBSL 2022.jpg", metin: "Berkay Candan 32 Bursaspor MB TBSL 2022.jpg Bursaspor Basketbol", url: "https://u/candan" })];
  const m1 = vlOk();
  const r1 = await gorselBul(haber, { model: m1, wdFn, dosyaFn: dosyaBasket, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.equal(r1.sonuc, null); assert.equal(m1.sorular.length, 0, "başka branşın görseli model denetimine bile gitmez");
  const dosyaFutbol = async () => [cand({ baslik: "Bursaspor football team 2020.jpg", metin: "Bursaspor football team 2020.jpg", url: "https://u/futbol" })];
  const m2 = vlOk();
  const r2 = await gorselBul(haber, { model: m2, wdFn, dosyaFn: dosyaFutbol, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.ok(r2.sonuc?.ozne); assert.equal(m2.sorular.length, 1);
  // basketbol haberinde ise aynı Candan görseli KABUL edilir (branş uyuyor)
  const m3 = vlOk();
  const r3 = await gorselBul({ ...haber, alt_konu: "basketbol", en: { baslik: "Bursaspor wins EuroLeague game", ozet: "x" } }, { model: m3, wdFn, dosyaFn: dosyaBasket, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.ok(r3.sonuc?.ozne);
});

test("kişi haberi (Iheanacho): kişinin kendi fotoğrafı yoksa takım/oyuncu fotoğrafı KONMAZ, nötr spor görseli aranmaz; görselsiz sonuç", async () => {
  const haber = { ...FUTBOL, yer: "Türkiye", gorselAra: "football stadium", gorselOzne: { ad: "Kelechi Iheanacho", tur: "kisi" },
    gorselAdaylari: [{ tur: "kisi", ad_en: "Kelechi Iheanacho" }, { tur: "kurum", ad_en: "Bursaspor" }] };
  assert.equal(sporKisiHaberi(haber), true);
  assert.equal(sporKisiHaberi({ ...haber, gorselAdaylari: [{ tur: "kurum", ad_en: "Bursaspor" }, { tur: "kisi", ad_en: "Kelechi Iheanacho" }] }), false);   // asıl özne takım
  assert.equal(sporKisiHaberi({ ...haber, kategori: "sanat" }), false);
  const wdCagri = [], araCagri = [];
  const wdFn = async (a) => { wdCagri.push(a.tur); return a.tur === "kisi" ? { durum: "yok", neden: "wikidata eşleşmesi yok" } : { durum: "ok", varlik: { etiket: "Bursaspor", aciklama: "club", gorselAdi: "Bursaspor football team 2020.jpg", logoAdi: "", spor: true } }; };
  const model = vlOk();
  const r = await gorselBul(haber, { model, wdFn, dosyaFn: async () => [cand({ baslik: "Bursaspor football team 2020.jpg", metin: "Bursaspor football team 2020.jpg" })], araFn: async (q, t) => { araCagri.push(t); return []; }, fetchFn: fImg, bekleFn: async () => {}, vlUst: 4 });
  assert.equal(r.sonuc, null);
  assert.deepEqual(wdCagri, ["kisi"], "kurum (takım) adayı sorulmadı");
  assert.ok(araCagri.includes("ozne"), "kişinin kendi adıyla Commons araması yapıldı");
  assert.ok(!araCagri.includes("gercek") && !araCagri.includes("gercek_ov") && !araCagri.includes("yedek"), "nötr arama yok");
  assert.equal(model.sorular.length, 0);
  assert.ok(r.notlar.some((n) => /KİŞİ haberinde takım|nötr spor görseli aranmaz|takım öznesi aranmaz/.test(n)));
  // kişinin kendi fotoğrafı bulunursa o kullanılır
  const wd2 = async (a) => (a.tur === "kisi" ? { durum: "ok", varlik: { etiket: "Kelechi Iheanacho", aciklama: "Nigerian footballer", gorselAdi: "Kelechi Iheanacho 2019.jpg", logoAdi: "", spor: true } } : { durum: "yok", neden: "yok" });
  const m2 = vlOk();
  const r2 = await gorselBul({ ...haber, gorselAdaylari: [{ tur: "kisi", ad_en: "Kelechi Iheanacho" }] }, { model: m2, wdFn: wd2, dosyaFn: async () => [cand({ baslik: "Kelechi Iheanacho 2019.jpg", metin: "Kelechi Iheanacho 2019.jpg" })], araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 4 });
  assert.ok(r2.sonuc?.ozne);
  // takım/kulüp haberi (asıl özne kurum) serbest kalır
  const m3 = vlOk();
  const r3 = await gorselBul({ ...FUTBOL, en: { baslik: "Bursaspor win the derby", ozet: "x" }, gorselAdaylari: [{ tur: "kurum", ad_en: "Bursaspor" }] }, { model: m3, wdFn, dosyaFn: async () => [cand({ baslik: "Bursaspor football team 2020.jpg", metin: "Bursaspor football team 2020.jpg" })], araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 4 });
  assert.ok(r3.sonuc?.ozne);
});

// canlı örnek 2026-10-16: aynı olay iki başlıkla iki kez yayınlandı
const IH_1 = { baslik: "Kelechi Iheanacho Türkiye'de gol rekorunu kırdı", ozet: "Nijeryalı forvet Kelechi Iheanacho, Sivasspor formasıyla attığı 41. golle Süper Lig'de yabancı oyuncuların gol rekorunu kırdı. Rekor, yıllardır korunan bir sayıydı." };
const IH_2 = { baslik: "Kelechi Iheanacho Türk futbol tarihine geçti", ozet: "Forvet Kelechi Iheanacho, ligde Antalyaspor karşısında 41 gol sayısına ulaşarak Hatayspor'un Brezilyalı oyuncusunu geride bıraktı. Başarısını takım arkadaşlarıyla kutladı." };
test("aynı olay: tek kişi adı + ortak olgu (gol sayısı) farklı sözcüklerle yazılmış iki haberi yakalar; aynı oyuncunun farklı maçları ve farklı olgular ayrı kalır", () => {
  const ayni = (a, b, s) => ayniOlayMi(adayImzasi(a), adayImzasi(b), s);
  const r = ayni(IH_1, IH_2);
  assert.deepEqual([r.ayni, r.neden], [true, "kisi+olgu"]);
  assert.deepEqual([ayni(IH_1, IH_2, { ham: true }).ayni], [true]);                               // ham aday yolunda da
  // ortak içerik sözcükleri (olgu sayısı yok): kişi + içerik kökü örtüşmesi
  const A = { baslik: "Mario Balotelli Süper Lig tarihinin en hızlı golünü attı", ozet: "Balotelli, derbinin ilk dakikalarında topu ağlara gönderdi ve ligin en hızlı gol tarihine imzasını attı. Taraftarlar stadyumda tezahürat yaptı." };
  const B = { baslik: "Mario Balotelli ligin gol hızı rekorunu geçti", ozet: "Derbinin ilk dakikalarında topu ağlara gönderen Balotelli, ligin en hızlı gol tarihine imzasını attı. Stadyumdaki taraftarlar tezahürat yaptı." };
  assert.equal(ayni(A, B).ayni, true);
  // YANLIŞ POZİTİFLER: aynı oyuncunun farklı maçları
  const M1 = { baslik: "Kelechi Iheanacho Rizespor karşısında iki gol attı", ozet: "Iheanacho, pazar günü oynanan maçta Rizespor'un ağlarını iki kez havalandırdı. Takımı 3-1 kazandı." };
  const M2 = { baslik: "Kelechi Iheanacho Konyaspor maçında asist yaptı", ozet: "Iheanacho, cumartesi günkü karşılaşmada takım arkadaşının golünü hazırladı ve maç 2-0 bitti." };
  assert.equal(ayni(M1, M2).ayni, false);
  const M3 = { baslik: "Kelechi Iheanacho sözleşmesini uzattı", ozet: "Forvet Kelechi Iheanacho, kulübüyle yeni bir sözleşme imzaladı ve gelecek sezon da takımda kalacak." };
  assert.equal(ayni(IH_1, M3).ayni, false);                                                       // aynı kişi, farklı olgu
  assert.equal(ayni(M1, M3).ayni, false);
  // farklı kişi, aynı rekor sayısı: kişi adı ortak değil
  const DIGER = { baslik: "Edin Dzeko Süper Lig'de 41 gol sayısına ulaştı", ozet: "Dzeko, ligde attığı 41. golle yabancı oyuncular arasında üst sıraya yükseldi." };
  assert.equal(ayni(IH_1, DIGER).ayni, false);
  // aynı kişi, aynı sayı ama skorlar çelişir (farklı maçlar)
  const S1 = { baslik: "Kelechi Iheanacho 10. golünü attı", ozet: "Iheanacho, Rizespor'u 3-1 yendikleri maçta 10 gol sayısına ulaştı." };
  const S2 = { baslik: "Kelechi Iheanacho 10 gole ulaştı", ozet: "Iheanacho, Konyaspor'u 2-0 yendikleri maçta 10 gol sayısına ulaştı." };
  assert.equal(ayni(S1, S2).ayni, false);
});

// ================================================================ 4) ASTROLOJİ
test("op_astroloji müfredatı: şema geçerli, >= 60 ders, hepsi görselli (Commons dosyası) ve Vikipedi kaynaklı; yol 1-3; seriler beklenen başlıklar altında", async () => {
  const { harita, hatalar } = await mufredatlariYukle();
  assert.deepEqual(hatalar, []);
  const m = harita.get("op_astroloji");
  assert.ok(m, "dosya yüklendi");
  assert.deepEqual(mufredatDogrula(m), []);
  assert.equal(m.kategori, "astroloji");
  assert.ok(m.dersler.length >= 60, `ders sayısı ${m.dersler.length}`);
  const ust = new Set(m.dersler.map((d) => d.yol[0]));
  for (const s of ["Astrolojinin Tarihi", "On İki Burç", "Takımyıldız Mitleri", "Gezegenler ve Semboller", "Astroloji ve Sanat"]) assert.ok(ust.has(s), s);
  for (const d of m.dersler) {
    assert.ok(d.gorsel?.dosya && /\.(jpe?g|png)$/i.test(d.gorsel.dosya), `görsel zorunlu kategori: ders görselli olmalı (${d.id})`);
    assert.ok(d.sabit || d.kaynak?.wiki_en || d.kaynak?.wiki_tr, d.id);
    assert.ok(d.yol.length >= 1 && d.yol.length <= 3);
  }
  // 12 burç dersi var
  for (const b of ["koc", "boga", "ikizler", "yengec", "aslan", "basak", "terazi", "akrep", "yay", "oglak", "kova", "balik"]) assert.ok(m.dersler.some((d) => d.id === `${b}-burcu`), `${b} burcu`);
  assert.ok(m.dersler.filter((d) => d.yol[0] === "Takımyıldız Mitleri").length >= 20);
  // gönderi metinleri eğlence/kültür dilinde; sabit dersler filtreden geçer
  for (const d of m.dersler) {
    assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en} ${d.odak_tr || ""}`, ASTROLOJI_YASAK, d.id);
    if (d.sabit) { assert.equal(sabitNedeni(d.sabit), "", d.id); assert.doesNotMatch(`${d.sabit.tr} ${d.sabit.en}`, ASTROLOJI_YASAK, d.id); }
  }
  assert.deepEqual(m.son_not, { tr: "Astroloji eğlence amaçlıdır; bilimsel bir öngörü değildir.", en: "Astrology is for entertainment only; it is not a scientific prediction." });
  assert.ok(gorselZorunluMu(m.kategori));
  assert.equal(EMOJI.astroloji, "🌙");
});

test("astroloji: uzmanlık tablosu, ders istemi hesaba özel kural taşır; kehanet/tavsiye dili ders doğrulamasında reddedilir; günlük burç notu yok", () => {
  assert.equal(UZMANLIK.op_astroloji, "astroloji tarihi ve mitoloji anlatıcısı (eğlence/kültür çerçevesinde)");
  assert.equal(uzmanlikMetni({ hesap: "op_astroloji" }), UZMANLIK.op_astroloji);
  const m = { hesap: "op_astroloji", kategori: "astroloji", istem_eki: "ASTROLOJİ BİLİM DEĞİLDİR: test eki" };
  const d = { baslik_tr: "Koç burcu", odak_tr: "Koç burcunu anlat." };
  assert.match(DERS_ISTEMI(m, d, "On İki Burç › Ateş Burçları"), /HESABA ÖZEL KURAL: ASTROLOJİ BİLİM DEĞİLDİR: test eki/);
  assert.doesNotMatch(DERS_ISTEMI({ hesap: "op_felsefe", kategori: "felsefe" }, d, "x"), /HESABA ÖZEL KURAL/);
  const KAYNAK = "Aries is the first astrological sign in the zodiac and spans the 0th to 30th degree of celestial longitude. Under the tropical zodiac the Sun transits this sign between March 21 and April 19 on average. Aries is one of the three fire signs, together with Leo and Sagittarius. Its symbol is the ram. The sign is named after the constellation Aries, and the zodiac has twelve signs in all. ".repeat(2);
  const iyi = { uygun: true, tr: { ozet: "Koç, zodyağın ilk burcudur ve Güneş bu bölgeden ortalama 21 Mart ile 19 Nisan arasında geçer. Geleneksel olarak ateş burçları arasında sayılır ve simgesi koçtur. Burç, adını Koç takımyıldızından alır. Zodyakta toplam on iki burç bulunur." }, en: { ozet: "Tradition places Aries at the start of the zodiac, and the Sun moves through it from about March 21 to April 19. Old lists count it among the fire signs and draw a ram as its emblem. Its name comes from a constellation of the same name, and twelve signs make up the whole circle." }, gorsel_adaylari: [] };
  assert.equal(dersDogrula(iyi, KAYNAK, { kategori: "astroloji" }).ok, true);
  const kotu = (tr, en) => dersDogrula({ ...iyi, tr: { ozet: tr }, en: { ozet: en } }, KAYNAK, { kategori: "astroloji" });
  const TR3 = "Koç, zodyağın ilk burcudur ve simgesi koçtur. Burç, adını Koç takımyıldızından alır. Zodyakta toplam on iki burç bulunur.";
  const EN3 = "Tradition places Aries at the start of the zodiac and draws a ram as its emblem. Its name comes from a constellation of the same name. Twelve signs make up the whole circle.";
  assert.match(kotu(TR3 + " Burcunuz bugün size şans getirir.", EN3).neden, /astroloji: kehanet\/tavsiye dili/);
  assert.match(kotu(TR3 + " Bu burç kehanet gücüne sahiptir.", EN3).neden, /astroloji/);
  assert.match(kotu(TR3, EN3 + " Your horoscope says you will find love this week.").neden, /astroloji/);
  assert.equal(kotu(TR3, EN3).ok, true);                                                         // temiz metin geçer
  // sağlık/para/ilişki tavsiyesi yok vurgusu istemde
  assert.match(m.istem_eki, /ASTROLOJİ BİLİM DEĞİLDİR/);
});

test("astroloji: her gönderinin metni SONUNDA eğlence notu (TR/EN), kaynak satırı notun ardından; uzun gövde kısalır, not ve kaynak kesilmez; diğer hesaplarda not yok", () => {
  const NOT = { tr: "Astroloji eğlence amaçlıdır; bilimsel bir öngörü değildir.", en: "Astrology is for entertainment only; it is not a scientific prediction." };
  const m = { hesap: "op_astroloji", kategori: "astroloji", son_not: NOT };
  const d = { yol: ["On İki Burç", "Ateş Burçları"], seriSira: 2, seriAciklamaTr: "" };
  const h = mufredatHaberi({ m, d, id: "m-koc-abc123", trBas: "Koç burcu", enBas: "Aries", trOzet: "Koç, zodyağın ilk burcudur.", enOzet: "Aries is the first sign.", link: "https://tr.wikipedia.org/wiki/Koç", kaynakTr: "Kaynak: Vikipedi · Koç", kaynakEn: "Source: Wikipedia · Aries", simdi: SIMDI });
  assert.equal(h.tr.ozet, `Koç, zodyağın ilk burcudur.\n\n${NOT.tr}\n\nKaynak: Vikipedi · Koç`);
  assert.equal(h.en.ozet, `Aries is the first sign.\n\n${NOT.en}\n\nSource: Wikipedia · Aries`);
  assert.equal(h.kategori, "astroloji"); assert.equal(h.editor, "op_astroloji");
  const uzun = sonNotluOzet("Çok uzun bir gövde. ".repeat(300), "Kaynak: Vikipedi · Koç", NOT.tr);
  assert.ok(uzun.length <= 2300 && uzun.endsWith(`${NOT.tr}\n\nKaynak: Vikipedi · Koç`), "not ve kaynak satırı korunur");
  const baska = mufredatHaberi({ m: { hesap: "op_felsefe", kategori: "felsefe" }, d, id: "m-x-abc123", trBas: "B", enBas: "B", trOzet: "Metin.", enOzet: "Text.", link: "https://x.example", kaynakTr: "Kaynak: Vikipedi", kaynakEn: "Source: Wikipedia", simdi: SIMDI });
  assert.equal(baska.tr.ozet, "Metin.\n\nKaynak: Vikipedi");
});

test("astroloji bot: alan tablosunda eğlence çerçevesi; soru yanıtına eğlence notu kod tarafından eklenir; tahmin isteyen soruya not + olumlu genel yanıt, kehanet dili ret", () => {
  const a = botAlani("op_astroloji");
  assert.equal(a.adTr, "OP Astroloji"); assert.match(a.not, /BİLİM DEĞİLDİR/); assert.match(a.not, /kehanet/);
  const q = { dil: "tr", soran: "ayse", bot: "op_astroloji" };
  const d = botYanitDogrula("Koç burcu geleneksel olarak ateş elementiyle ve cesaretle anılır, simgesi koçtur.", q);
  assert.equal(d.ok, true); assert.ok(d.metin.endsWith(ASTROLOJI_NOTU.tr), d.metin);
  const qe = botYanitDogrula("Aries is traditionally linked with the fire element and the symbol of the ram.", { ...q, dil: "en" });
  assert.equal(qe.ok, true); assert.ok(qe.metin.endsWith(ASTROLOJI_NOTU.en));
  assert.equal(botYanitDogrula("Koç burcu ateş elementiyle anılır. " + ASTROLOJI_NOTU.tr, q).metin.split(ASTROLOJI_NOTU.tr).length, 2, "not zaten varsa ikinci kez eklenmez");
  assert.equal(botYanitDogrula("Koç burcu ateş elementiyle anılır, simgesi koçtur.", { ...q, bot: "op_felsefe" }).metin.includes("Astroloji"), false, "başka hesaba not eklenmez");
  assert.equal(soruTara("@op_astroloji bu hafta bana ne olacak?", { bot: "op_astroloji" }).ok, true);   // soru taraması geçer; yanıt genel/olumlu ya da model 'atla' der
});

test("özet satırı: kategoriKapali=N ve müfredat ilerlemesi (op_astroloji) mevcut mufredat= parçasında görünür", () => {
  const s = ozetSatiri({ aday: 3, yeniAday: 2, onElemeGecen: 1, modelCagri: 0, elenen: 2, kategoriKapali: 2, red: {}, redKodlari: { "kategori-kapali": 2 }, ozel: { mufredatOzet: "op_astroloji:3/105,op_antik:10/80", calisan: [], atlanan: [] } });
  assert.match(s, / kategoriKapali=2/);
  assert.match(s, / mufredat=op_astroloji:3\/105,op_antik:10\/80/);
});
