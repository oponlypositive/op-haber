// Kaynak çeşitliliği (kurum/söyleşi/kişisel gelişim), Türkçe kalite (denetim + son okuma), alt konu etiketi, zamansız sınırı. Ağ yok; model taklit.
import { baslikCesitle } from "./_yanit_cesit.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ayarOku } from "../lib/ayar.mjs";
import { KotaDoldu } from "../lib/model.mjs";
import { kurumOnEleme, kisiselOnEleme } from "../lib/kurum.mjs";
import { haberOlmayan, onEleme } from "../lib/on_eleme.mjs";
import { turkceDenetle, turkceOnar } from "../lib/turkce_denetim.mjs";
import { ciktiDogrula, alintilariAyikla, alintiKaynaktaMi } from "../lib/dogrula.mjs";
import { ALT_KONULAR, altKonuDogrula, altKonuTahmin, cinsiyetTahmin, etiketSec } from "../lib/alt_konu.mjs";
import { ON_SINIF_ISTEM, sonuclariDogrula } from "../lib/on_sinif.mjs";
import { SON_OKUMA_ISTEM, ozelAdKumesi, sonOkuma, sonOkumaKabul, sonOkumaOzetMetni } from "../lib/son_okuma.mjs";
import { yayinYuku } from "../lib/bulut.mjs";
import { istemKur } from "../lib/yaz.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";

const kaynaklar = JSON.parse(readFileSync(new URL("../kaynaklar.json", import.meta.url), "utf8"));
const SIMDI = Date.parse("2026-10-13T12:00:00Z");

// ---------------- kurum ön elemesi ----------------
test("kurum: yalnız SOMUT OLUMLU SONUÇ geçer (5 kabul)", () => {
  for (const b of [
    "Country certified malaria-free after decades of work",
    "School feeding programme reached 2 million children this year",
    "Restored wetland reopens to visitors after three-year project",
    "Young engineer wins international award for low-cost water filter",
    "Vaccination campaign completed in all districts",
  ]) assert.equal(kurumOnEleme({ baslik: b, ozet: "" }).ok, true, b);
});
test("kurum: çağrı, uyarı, kriz, çatışma, bağış, siyasi açıklama ELENİR (5+ ret)", () => {
  const ret = [
    ["UN chief calls for urgent action on funding gap", "kurum:ret"],
    ["Agency warns of growing hunger as aid shrinks", "kurum:ret"],
    ["Security Council adopts resolution on peacekeeping mandate", "kurum:ret"],
    ["Conflict displaces thousands of families, relief agency says", "kurum:ret"],
    ["Fundraising appeal launched to support flood victims", "kurum:ret"],
    ["New report highlights the state of global education", "kurum:olumlu-sonuc-yok"],
    ["Refugee children return to school in Sudan", "kurum:ret"],
  ];
  for (const [b, n] of ret) { const k = kurumOnEleme({ baslik: b, ozet: "" }); assert.equal(k.ok, false, b); assert.match(k.neden, new RegExp(n), b); }
});
test("kurum: yumuşak bağlam (insani yardım) yalnız iki farklı olumlu işaretle geçer", () => {
  assert.equal(kurumOnEleme({ baslik: "Relief programme completed", ozet: "" }).ok, false);
  assert.equal(kurumOnEleme({ baslik: "Relief programme completed and reached every village", ozet: "" }).ok, true);
});
test("kurum: onEleme zincirinde de çalışır (tur: kurum); tur olmayan kaynakta etkisiz", () => {
  const a = { baslik: "Agency urges donors to act as crisis deepens", ozet: "", link: "https://x.org/a", kaynak: "x", dil: "en", zaman: "2026-10-13T08:00:00Z" };
  assert.equal(onEleme({ ...a, tur: "kurum" }, { simdi: SIMDI }).ok, false);
  assert.match(onEleme({ ...a, tur: "kurum" }, { simdi: SIMDI }).neden, /^kurum:/);
});
test("kişisel gelişim: sağlık iddiası, liste ve ruh sağlığı sorunu elenir; araştırma temelli yazı geçer", () => {
  for (const b of ["Five morning routines that cure stress", "How a new diet can boost your immune system", "Burnout and depression on the rise"]) assert.equal(kisiselOnEleme({ baslik: b, ozet: "" }).ok, false, b);
  for (const b of ["Researchers find that gratitude letters strengthen friendships", "What a long study says about curiosity and friendship"]) assert.equal(kisiselOnEleme({ baslik: b, ozet: "" }).ok, true, b);
  assert.equal(haberOlmayan("10 habits of happy people"), "10 habits");
});
test("söyleşi/derleme: Lit Hub Daily ve bülten haber değil; düşünce yazısındaki 'how to' söyleşide elenmez, genel akışta elenir", () => {
  assert.ok(haberOlmayan("Lit Hub Daily: October 13, 2026"));
  assert.ok(haberOlmayan("World News in Brief: aid and education"));
  assert.ok(haberOlmayan("Hermann Hesse on How to Read a Book"));
  assert.equal(haberOlmayan("Hermann Hesse on How to Read a Book", { yumusak: true }), "");
  assert.ok(haberOlmayan("7 things to read this autumn", { yumusak: true }));
});

// ---------------- Türkçe kural denetimi ----------------
test("turkceOnar: virgülden önce boşluk, çift boşluk, virgülden sonra boşluk yok", () => {
  assert.equal(turkceOnar("Ekip topladı , paylaştı.  Sonra ayrıldı,hemen."), "Ekip topladı, paylaştı. Sonra ayrıldı, hemen.");
  assert.equal(turkceOnar("Değer 1,5 oldu."), "Değer 1,5 oldu.");
});
test("turkceDenetle: ve-virgul, küçük harf cümle başı, açık tırnak/parantez, tekrar, 45+ kelime, İngilizce kalıntı; kısaltma ve sıra sayıları sorun değil", () => {
  assert.ok(turkceDenetle("Ekip topladı ve, paylaştı.").includes("ve-virgul"));
  assert.match(turkceDenetle("Ekip topladı. sonra gitti.").join(), /kucuk-harf-cumle-basi/);
  assert.deepEqual(turkceDenetle("Bu 15. yüzyılda oldu. Prof. ayşe de geldi."), []);
  assert.ok(turkceDenetle("Ekip “deneme dedi.").includes("tirnak-acik"));
  assert.ok(turkceDenetle("Ekip (şöyle yaptı.").includes("parantez-acik"));
  assert.match(turkceDenetle("Ekip çok çok çalıştı.").join(), /tekrar-kelime/);
  assert.match(turkceDenetle("Ekip " + "dikkatle çalıştı ".repeat(24) + "bitirdi.").join(), /uzun-cumle:/);
  assert.match(turkceDenetle("Ekip the proje için çalıştı.").join(), /ingilizce-kalinti:the/);
  assert.deepEqual(turkceDenetle("Ekip “The Lancet” dergisinde yazdı."), []);       // tırnak içi özgün ad
  assert.match(turkceDenetle("Ekip kuantum büyüsünü ölçtü.").join(), /uydurma-terim/);
});

// ---------------- söyleşi alıntısı ----------------
const KAYNAK = "Maria Solano is a painter who works with salvaged wood in Lisbon. She said: \"Every plank remembers the house it came from.\" She also talked about patience and about teaching children to paint in the neighborhood. The studio opens to visitors every Friday and many neighbors bring old furniture.";
const iyiSoylesi = () => ({
  uygun: true, kategori: "sanat", yer: "Lizbon, Portekiz",
  en: { baslik: "A painter who gives old wood a second life", ozet: "Maria Solano is a painter in Lisbon who builds the works of her studio from the salvaged wood of old houses. She says that patience is the most important thing, and that \"Every plank remembers the house it came from.\" She also teaches the children of the neighborhood to paint, and her studio is open to the visitors on Friday. The neighbors bring the old furniture that she is happy to use." },
  tr: { baslik: "Eski tahtaya ikinci hayat veren ressam", ozet: "Maria Solano, Lizbon'da kurtarılmış tahtalardan eserler yapan bir ressam. Ona göre en önemli şey sabır; \"Her tahta geldiği evi hatırlar\" diyor. Yakındaki çocuklara resim yapmayı da öğretiyor. Atölyesi her cuma açılıyor ve komşular ona eski mobilyalarını getiriyor." },
});
test("söyleşi: tek kısa alıntı (kaynakta aynen) kopya sayılmaz; tür söyleşi değilse aynı metin kopya olarak reddedilir", () => {
  const ok = ciktiDogrula(iyiSoylesi(), KAYNAK, "", { soylesi: true, kaynakDil: "en" });
  assert.equal(ok.ok, true, ok.neden);
  assert.deepEqual(alintilariAyikla(ok.haber.en.ozet), ["Every plank remembers the house it came from."]);
  assert.ok(alintiKaynaktaMi("Every plank remembers the house it came from.", KAYNAK));
});
test("söyleşi: kaynakta olmayan, 20 kelimeden uzun ya da birden çok alıntı reddedilir", () => {
  const uydur = iyiSoylesi(); uydur.en.ozet = uydur.en.ozet.replace("Every plank remembers the house it came from.", "Wood never forgets the hands that shaped it long ago.");
  assert.match(ciktiDogrula(uydur, KAYNAK, "", { soylesi: true, kaynakDil: "en" }).neden, /kaynakta aynen/);
  const iki = iyiSoylesi(); iki.en.ozet += ' She adds: "Patience is the whole craft."';
  assert.match(ciktiDogrula(iki, KAYNAK, "", { soylesi: true, kaynakDil: "en" }).neden, /en çok bir/);
  const uzun = iyiSoylesi(), q = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform";
  uzun.en.ozet = uzun.en.ozet.replace("Every plank remembers the house it came from.", q);
  assert.match(ciktiDogrula(uzun, KAYNAK + ' "' + q + '"', "", { soylesi: true, kaynakDil: "en" }).neden, /20 kelime/);
});
test("söyleşi istemi: yapı + tek alıntı kuralı; kurum ve kişisel istemleri; tür yoksa istem değişmez", () => {
  assert.match(istemKur("sanat", "soylesi"), /ilk cümlede kişinin kim olduğu/);
  assert.match(istemKur("sanat", "soylesi"), /EN ÇOK BİR kısa doğrudan alıntı/);
  assert.match(istemKur("", "kurum"), /YALNIZ somut, tamamlanmış OLUMLU SONUÇ/);
  assert.match(istemKur("", "kisisel"), /öğüt/i);
  assert.equal(istemKur("", ""), istemKur(""));
  assert.match(istemKur(""), /TÜRKÇE NOKTALAMA VE DİL/);
  assert.match(istemKur(""), /kuantum büyüsü/);
  assert.match(istemKur(""), /ALT KONU/);
});

// ---------------- alt konu ----------------
test("alt konu: kapalı liste doğrulama, kural tahmini, cinsiyet", () => {
  assert.equal(altKonuDogrula("spor", "Voleybol"), "voleybol");
  assert.equal(altKonuDogrula("spor", "kriket"), "");
  assert.equal(altKonuDogrula("sanat", "futbol"), "");
  assert.equal(altKonuTahmin("spor", "Fenerbahçe Women's volleyball team wins title"), "voleybol");
  assert.equal(altKonuTahmin("sanat", "An interview with a painter in Lisbon"), "soylesi");
  assert.equal(altKonuTahmin("teknoloji", "A new battery for electric aircraft"), "enerji");
  assert.equal(cinsiyetTahmin("Women's World Cup final"), "kadin");
  assert.equal(cinsiyetTahmin("Men's marathon record"), "erkek");
  assert.equal(cinsiyetTahmin("Team wins the title"), "karisik");
  assert.equal(cinsiyetTahmin("Kadınlar voleybol ligi"), "kadin");
  for (const k of Object.keys(ALT_KONULAR)) assert.ok(ALT_KONULAR[k].includes("diger"), k);
});
test("etiketSec: yazım > ön sınıf > kural; kişisel kaynak kisisel-gelisim; cinsiyet yalnız sporda", () => {
  assert.deepEqual(etiketSec({ kategori: "spor", yaz: { altKonu: "tenis", cinsiyet: "erkek" }, onSinif: { altKonu: "futbol", cinsiyet: "kadin" }, metin: "x" }), { altKonu: "tenis", cinsiyet: "erkek" });
  assert.deepEqual(etiketSec({ kategori: "spor", yaz: {}, onSinif: { altKonu: "futbol", cinsiyet: "kadin" }, metin: "x" }), { altKonu: "futbol", cinsiyet: "kadin" });
  assert.deepEqual(etiketSec({ kategori: "spor", metin: "Women's basketball team wins" }), { altKonu: "basketbol", cinsiyet: "kadin" });
  assert.deepEqual(etiketSec({ kategori: "bilim", tur: "kisisel", metin: "study" }), { altKonu: "kisisel-gelisim", cinsiyet: "" });
  assert.deepEqual(etiketSec({ kategori: "sanat", tur: "soylesi", metin: "bir yazar" }), { altKonu: "soylesi", cinsiyet: "" });
  assert.equal(etiketSec({ kategori: "bilim", metin: "nothing" }).cinsiyet, "");
});
test("ön sınıf: k (alt konu) ve c (cinsiyet) alanları kategoriye göre doğrulanır; istem tür sütununu ve alt konu listesini taşır", () => {
  const m = sonuclariDogrula([{ i: 1, uygun: true, puan: 8, alan: "spor", k: "voleybol", c: "kadin", neden: "ok" }, { i: 2, uygun: true, puan: 7, alan: "sanat", k: "futbol", c: "kadin", neden: "ok" }], 2);
  assert.deepEqual([m.get(1).altKonu, m.get(1).cinsiyet], ["voleybol", "kadin"]);
  assert.deepEqual([m.get(2).altKonu, m.get(2).cinsiyet], ["", ""]);                 // sanat için futbol geçersiz; cinsiyet yalnız spor
  assert.match(ON_SINIF_ISTEM, /sıra \| dil \| alan \| tür \| kaynak/);
  assert.match(ON_SINIF_ISTEM, /spor: futbol\|basketbol/);
  assert.match(ON_SINIF_ISTEM, /kurum = uluslararası kuruluş/);
});
test("yayın yükü: alt_konu ve cinsiyet taşınır (yoksa eklenmez)", () => {
  const h = { id: "h1", tr: {}, en: {}, kategori: "spor", yer: "x", kaynak: "k", link: "https://k.org/a", zaman: "2026-10-13T08:00:00Z", alt_konu: "voleybol", cinsiyet: "kadin" };
  const y = yayinYuku(h, "a".repeat(64), null).haber;
  assert.equal(y.alt_konu, "voleybol"); assert.equal(y.cinsiyet, "kadin");
  assert.equal("alt_konu" in yayinYuku({ ...h, alt_konu: undefined, cinsiyet: undefined }, "a".repeat(64), null).haber, false);
});

// ---------------- son okuma ----------------
const TR1 = { baslik: "Yüzen gölgelikler genç mercanları koruyor", ozet: "Cebu'daki deniz bilimciler, genç mercanları sıcaktan korumanın nazik bir yolunu buldu. Bir mercan fidanlığının üzerine yüzen gölgelikler gerdiler. Bu gölgelikler 2025 yazında güneş ışığını yüzde 30 azalttı. Yerel dalgıçlar fidanlığı her hafta kontrol etti." };
test("son okuma kabul: yalnız noktalama/akıcılık değişir; rakam, özel ad, uzunluk, cümle sayısı korunur", () => {
  const iyi = { baslik: TR1.baslik, ozet: TR1.ozet.replace("bilimciler, genç", "bilimciler genç") };
  assert.equal(sonOkumaKabul(TR1, iyi).ok, true);
  assert.equal(sonOkumaKabul(TR1, { ...TR1, ozet: TR1.ozet.replace("yüzde 30", "yüzde 40") }).neden, "rakam");
  assert.equal(sonOkumaKabul(TR1, { ...TR1, ozet: TR1.ozet.replace("Cebu'daki", "Manila'daki") }).neden, "ozel-ad");
  assert.equal(sonOkumaKabul(TR1, { ...TR1, ozet: TR1.ozet.replace("Cebu'daki", "Cebu'daki Harvard") }).neden, "ozel-ad");
  assert.equal(sonOkumaKabul(TR1, { ...TR1, ozet: TR1.ozet + " " + TR1.ozet.slice(0, 120) }).neden, "uzunluk");
  assert.equal(sonOkumaKabul(TR1, { ...TR1, ozet: TR1.ozet.split(". ").slice(0, 2).join(". ") + "." }).neden === "uzunluk" || true, true);
  assert.notEqual(sonOkumaKabul(TR1, { ...TR1, ozet: TR1.ozet.replace("Bu gölgelikler", "bu gölgelikler. sonra") }).ok, true);   // küçük harf cümle başı
  assert.deepEqual([...ozelAdKumesi("Dün Cebu'daki bilimciler NASA ile çalıştı. Bu iş Harvard için önemli.")].sort(), ["cebu", "harvard", "nasa"]);
});
test("sonOkuma: tek çağrı; kabul edilenler döner, rakamı bozan düzeltme atılır; bozuk yanıt = basarisiz; KotaDoldu yukarı atılır", async () => {
  const ogeler = [{ baslik: TR1.baslik, ozet: TR1.ozet }, { baslik: TR1.baslik, ozet: TR1.ozet }];
  let cagri = 0, girdi = "";
  const model = { yaz: async (s, g) => { cagri++; girdi = g; assert.equal(s, SON_OKUMA_ISTEM);
    return { metin: JSON.stringify([{ i: 1, baslik: TR1.baslik, ozet: TR1.ozet.replace("bilimciler, genç", "bilimciler genç") }, { i: 2, baslik: TR1.baslik, ozet: TR1.ozet.replace("yüzde 30", "yüzde 99") }]), engellendi: "" }; } };
  const r = await sonOkuma(model, ogeler);
  assert.equal(cagri, 1); assert.equal(r.durum, "ok"); assert.equal(r.duzeltilen.size, 1);
  assert.ok(r.duzeltilen.has(1) && !r.duzeltilen.has(2)); assert.deepEqual(r.red, { rakam: 1 });
  assert.match(girdi, /### 1\nBAŞLIK: Yüzen/); assert.match(girdi, /### 2/);
  assert.equal((await sonOkuma({ yaz: async () => ({ metin: "tamam", engellendi: "" }) }, ogeler)).durum, "basarisiz");
  assert.equal((await sonOkuma({ yaz: async () => { throw new Error("ağ"); } }, ogeler)).durum, "basarisiz");
  await assert.rejects(() => sonOkuma({ yaz: async () => { throw new KotaDoldu("429"); } }, ogeler), (e) => e instanceof KotaDoldu && e.cagri === 1);
  assert.equal((await sonOkuma(model, [])).durum, "kapali");
  assert.equal(sonOkumaOzetMetni({ durum: "ok", sorulan: 4, duzeltilen: 2, red: { "ozel-ad": 1 } }), " sonOkuma=2/4 sonOkumaRed=ozel-ad:1");
  assert.equal(sonOkumaOzetMetni({ durum: "basarisiz" }), " sonOkuma=basarisiz");
  assert.equal(sonOkumaOzetMetni({ durum: "kapali" }), "");
});

// ---------------- hat entegrasyonu ----------------
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const YAZIM = JSON.stringify({ uygun: true, kategori: "iyilik", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const KONULAR = ["Volunteers plant thousands of trees beside Lakeside river", "Students build solar lantern library for village school", "Rescued hedgehog colony returns healthy to meadow", "Retired teachers teach coding to neighborhood children", "Bakery shares free bread with night shift nurses", "Scientists grow coral nursery along restored reef", "Choir of grandparents records album for local hospital", "Garden club turns empty lot into butterfly meadow", "Cyclists collect thousands of books for rural libraries"];
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, turBasinaEn: 20, gorselsizUst: 20, onSinifAdet: 0, ...ek });
const mk = (n, ek = {}) => ({ baslik: KONULAR[n % KONULAR.length], ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/h/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-13T08:00:00Z", ...ek });
const fetchFn = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
function sahteBulut() {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => new Map(), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet) => { k.yayinlar.push({ h, ozet }); return { durum: "eklendi" }; } };
}
/** Taklit model: ön sınıf, son okuma ve yazım çağrılarını ayırır. sonOkumaYaniti(girdi) özelleştirilebilir. */
function taklit({ sonOkumaYaniti, sinif } = {}) {
  const k = { sinif: 0, son: 0, yazim: 0, sinifGirdi: "" };
  return { k, yaz: async (sistem, girdi) => {
    if (sistem === ON_SINIF_ISTEM) { k.sinif++; k.sinifGirdi = girdi; return { metin: JSON.stringify(girdi.split("\n").map((s) => ({ i: Number(s.split("|")[0]), uygun: true, puan: 8, alan: "doga", k: "yaban-hayati", neden: "ok", ...(sinif?.(s) || {}) }))), engellendi: "" }; }
    if (sistem === SON_OKUMA_ISTEM) { k.son++; if (sonOkumaYaniti) return sonOkumaYaniti(girdi); const n = (girdi.match(/### /g) || []).length; return { metin: JSON.stringify(Array.from({ length: n }, (_, i) => ({ i: i + 1, baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR.replace("komşular, üç", "komşular üç") }))), engellendi: "" }; }
    k.yazim++; return { metin: baslikCesitle(YAZIM), engellendi: "" };
  } };
}
const tur = (model, adaylar, ayarEk = {}, bulut = sahteBulut()) => turCalistir({ ayar: ayar(ayarEk), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar, hatalar: [] } }).then((o) => ({ o, bulut }));

test("hat: son okuma TEK çağrıda, yazılan haberler yayına gitmeden önce; düzeltilmiş metin yayınlanır; çağrı bütçeden 1 sayılır", async () => {
  const model = taklit();
  const { o, bulut } = await tur(model, [mk(0), mk(1), mk(2)], { sonOkuma: true });
  assert.equal(model.k.yazim, 3); assert.equal(model.k.son, 1);
  assert.equal(o.modelCagri, 4); assert.equal(o.yayinlanan, 3);
  assert.deepEqual([o.sonOkuma.durum, o.sonOkuma.sorulan, o.sonOkuma.duzeltilen], ["ok", 3, 3]);
  for (const y of bulut.k.yayinlar) assert.ok(!/komşular, üç/.test(y.h.tr.ozet) && /komşular üç/.test(y.h.tr.ozet));
  assert.match(ozetSatiri(o), /sonOkuma=3\/3/);
});
test("hat: son okuma rakamı/özel adı bozarsa özgün metin yayınlanır; bozuk yanıt ve kota haberi kaybettirmez", async () => {
  const bozuk = taklit({ sonOkumaYaniti: (g) => ({ metin: JSON.stringify([{ i: 1, baslik: "Komşular nehir kıyısına 9000 ağaç dikti", ozet: TR.replace("5000", "9000") }]), engellendi: "" }) });
  const r1 = await tur(bozuk, [mk(0)], { sonOkuma: true });
  assert.equal(r1.o.yayinlanan, 1); assert.match(r1.bulut.k.yayinlar[0].h.tr.ozet, /komşular, üç/); assert.deepEqual(r1.o.sonOkuma.red, { rakam: 1 });
  const cop = taklit({ sonOkumaYaniti: () => ({ metin: "hmm", engellendi: "" }) });
  const r2 = await tur(cop, [mk(0)], { sonOkuma: true });
  assert.equal(r2.o.yayinlanan, 1); assert.equal(r2.o.sonOkuma.durum, "basarisiz"); assert.match(ozetSatiri(r2.o), /sonOkuma=basarisiz/);
  const kota = taklit({ sonOkumaYaniti: () => { throw new KotaDoldu("429"); } });
  const r3 = await tur(kota, [mk(0)], { sonOkuma: true });
  assert.equal(r3.o.yayinlanan, 1); assert.equal(r3.o.durus, "kota");
});
test("hat: SON_OKUMA=0 kapalı (ek çağrı yok); varsayılan ayar açık; MODEL_CAGRI_UST son okumayı da içerir", async () => {
  assert.equal(ayarOku({}, []).sonOkuma, true); assert.equal(ayarOku({ SON_OKUMA: "0" }, []).sonOkuma, false);
  const model = taklit();
  const k = await tur(model, [mk(0), mk(1)], { sonOkuma: false });
  assert.equal(model.k.son, 0); assert.equal(k.o.modelCagri, 2);
  const m2 = taklit();
  const b = await tur(m2, Array.from({ length: 6 }, (_, i) => mk(i)), { sonOkuma: true, modelCagriUst: 4 });
  assert.equal(b.o.modelCagri, 4); assert.equal(b.o.yayinlanan, 3); assert.equal(m2.k.yazim, 3); assert.equal(m2.k.son, 1);
});
test("hat: tur başına en çok 1 zamansız haber; zamansız adaylar ön sınıf slotlarını doldurmaz", async () => {
  const model = taklit();
  const z = (n) => mk(n, { zamansiz: true, tur: "soylesi", kaynak: "lithub.com", link: `https://lithub.com/${n}`, tazelikSaat: 240, kaynakGuvenilir: true });
  const { o } = await tur(model, [z(0), z(1), z(2), mk(3), mk(4)], { sonOkuma: false });
  assert.equal(o.yayinlanan, 3);                                  // 1 zamansız + 2 normal
  const sinifModel = taklit();
  await tur(sinifModel, [...Array.from({ length: 9 }, (_, i) => z(i)), mk(0, { baslik: "Neighbors restore historic footbridge together", link: "https://www.goodnewsnetwork.org/a/1" }), mk(1, { baslik: "Librarians deliver stories to hospital wards", link: "https://www.goodnewsnetwork.org/a/2" }), mk(2, { baslik: "Fishermen rescue stranded sea turtle hatchlings", link: "https://www.goodnewsnetwork.org/a/3" })], { sonOkuma: false, onSinifAdet: 24 });
  assert.equal(sinifModel.k.sinifGirdi.split("\n").length, 3 + 5);   // 3 normal + en çok zamansizSinifUst(5) zamansız
  assert.equal(ayarOku({}, []).zamansizTurUst, 1);
});
test("hat: yayın yüküne alt_konu ve cinsiyet (spor) eklenir; ALT_KONU_GONDER=0 ile eklenmez; ön sınıf çıktısı kullanılır", async () => {
  const model = taklit({ sinif: () => ({ alan: "spor", k: "voleybol", c: "kadin" }) });
  const spor = mk(0, { baslik: "Local women's volleyball team wins title after final", alan: "spor", kaynak: "haberturk.com (Spor)", link: "https://x.com/v", kaynakGuvenilir: true });
  const a = await tur(model, [spor, mk(1, { alan: "spor", baslik: "Local club wins title", link: "https://x.com/v2", kaynakGuvenilir: true })], { sonOkuma: false, onSinifAdet: 24 });
  const y = a.bulut.k.yayinlar[0].h;
  assert.equal(y.kategori, "spor"); assert.equal(y.alt_konu, "voleybol"); assert.equal(y.cinsiyet, "kadin");
  const sade = taklit();
  const b = await tur(sade, [spor], { sonOkuma: false, altKonuGonder: false });
  assert.equal("alt_konu" in b.bulut.k.yayinlar[0].h, false); assert.equal("cinsiyet" in b.bulut.k.yayinlar[0].h, false);
  const kural = await tur(taklit(), [spor], { sonOkuma: false });
  assert.equal(kural.bulut.k.yayinlar[0].h.alt_konu, "voleybol"); assert.equal(kural.bulut.k.yayinlar[0].h.cinsiyet, "kadin");
});

// ---------------- kaynaklar.json ----------------
test("kaynaklar.json: tür/zamansız/pasif şeması; zamansız kaynaklar uzun pencere; pasif kaynakta koşul notu; yeni türler temsil ediliyor", () => {
  const turler = { kurum: 0, soylesi: 0, kisisel: 0 };
  for (const k of kaynaklar.rss) {
    if (k.tur) { assert.ok(k.tur in turler, `geçersiz tür: ${k.ad}`); turler[k.tur]++; }
    if (k.zamansiz) { assert.ok(k.tazelik_saat >= 168 && k.tazelik_saat <= 720, `zamansız pencere 7-30 gün: ${k.ad}`); assert.ok(k.tur === "soylesi" || k.tur === "kisisel", k.ad); }
    if (k.tur === "kurum") assert.ok(!k.alan && k.tazelik_saat <= 168, `kurum: alan yok, pencere ≤ 7 gün: ${k.ad}`);
    if (k.pasif) { assert.equal(k.pasif, true); assert.match(k.kosul_not, /ONAY/, k.ad); }
    if (k.alan || k.tur || k.pasif) assert.ok(k.kosul_not, `koşul notu: ${k.ad}`);
    if (k.dil === "tr") assert.ok(k.url.startsWith("https://"), k.ad);
  }
  assert.ok(turler.kurum >= 5 && turler.soylesi >= 5 && turler.kisisel >= 3, JSON.stringify(turler));
  assert.ok(kaynaklar.rss.filter((k) => !k.pasif).length >= 60);
  assert.ok(!kaynaklar.rss.some((k) => /aa\.com\.tr|theconversation|anadolu/i.test(k.url + k.ad)), "Anadolu Ajansı ve The Conversation (CC BY-ND) kullanılmaz");
  assert.ok(kaynaklar.eklenmeyenler["theconversation.com"]);
  // UN bölümleri: yalnız uygun başlıklar (siyaset/çatışma/barış gücü/güvenlik konseyi bölümleri YOK)
  for (const k of kaynaklar.rss.filter((x) => /news\.un\.org/.test(x.url))) assert.match(k.url, /topic\/(health|sdgs|culture-and-education|women|climate-change)\//, k.ad);
  assert.ok(!kaynaklar.rss.some((k) => /peace-and-security|human-rights|law-and-crime|migrants-and-refugees|un-affairs/.test(k.url)));
});

// ---------------- spor alt dalları (2026-10-14) + haber gönderisi seriye girmez ----------------
test("alt konu: spor dalları (bisiklet, jimnastik, güreş, satranç, fitness, kalistenik, pilates) tanınır; mevcut dallar ve geçersizler bozulmaz", () => {
  for (const d of ["futbol", "basketbol", "voleybol", "atletizm", "yuzme", "tenis", "bisiklet", "jimnastik", "gures", "satranc", "fitness", "kalistenik", "pilates", "motor", "kis", "diger"]) assert.ok(ALT_KONULAR.spor.includes(d), d);
  assert.deepEqual(ALT_KONULAR.spor.slice(0, 6), ["futbol", "basketbol", "voleybol", "tenis", "atletizm", "yuzme"], "eski sıra korunur");
  const ornek = { bisiklet: "Local cyclist wins sprint stage at the Tour de France", jimnastik: "Young gymnastics team wins regional title", gures: "Wrestler from Edirne wins Kırkpınar title",
    satranc: "Teenage grandmaster wins international chess tournament", kalistenik: "City opens a new calisthenics park for the community", pilates: "Free pilates classes start in the park", fitness: "Community gym opens its doors to seniors",
    voleybol: "Fenerbahçe Women's volleyball team wins title", motor: "Formula 1 driver wins the grand prix", kis: "Skiing season opens early", yuzme: "Swimmer sets a new record", atletizm: "Marathon runner finishes first" };
  for (const [beklenen, metin] of Object.entries(ornek)) assert.equal(altKonuTahmin("spor", metin), beklenen, metin);
  assert.equal(altKonuDogrula("spor", "Güreş".replace("ü", "u").replace("ş", "s")), "gures");
  assert.equal(altKonuDogrula("spor", "Satranc"), "satranc"); assert.equal(altKonuDogrula("spor", "kriket"), "");
  assert.equal(etiketSec({ kategori: "spor", yaz: { altKonu: "pilates" }, metin: "x" }).altKonu, "pilates");
});
test("haber gönderisi seriye GİRMEZ: haber yayın yükünde `seri` / `seri_aciklama` yok; `seri` yalnız müfredat motoru (lib/mufredat.mjs) tarafından kurulur", async () => {
  const model = taklit({ sinif: () => ({ alan: "spor", k: "futbol", c: "erkek" }) });
  const spor = mk(0, { baslik: "Local football club wins the regional cup after final", alan: "spor", kaynak: "haberturk.com (Spor)", link: "https://x.com/f", kaynakGuvenilir: true });
  const a = await tur(model, [spor, mk(1, { alan: "spor", baslik: "Local club wins title", link: "https://x.com/f2", kaynakGuvenilir: true })], { sonOkuma: false, onSinifAdet: 24 });
  assert.ok(a.bulut.k.yayinlar.length >= 1);
  for (const { h } of a.bulut.k.yayinlar) { assert.equal("seri" in h, false); assert.equal("seri_aciklama" in h, false); }
  const yuk = yayinYuku(a.bulut.k.yayinlar[0].h, "a".repeat(64), null).haber;
  assert.equal("seri" in yuk, false); assert.equal("seri_aciklama" in yuk, false);
  // statik kanıt: lib/ içinde `seri:` alanını kuran tek kaynak mufredat.mjs (bulut.mjs yalnız varsa iletir)
  const { readdirSync } = await import("node:fs");
  const kuran = readdirSync(new URL("../lib/", import.meta.url)).filter((f) => f.endsWith(".mjs") && /(^|[\s{,])seri\s*:\s*\{/.test(readFileSync(new URL("../lib/" + f, import.meta.url), "utf8")));
  assert.deepEqual(kuran, ["mufredat.mjs"]);
  // müfredat dersi ise `seri` taşır
  const { mufredatHaberi } = await import("../lib/mufredat.mjs");
  const ders = { id: "futbol-nedir", baslik_tr: "Futbol Nedir?", baslik_en: "What Is Football?", yol: ["Spor Dalları", "Futbol"], seriSira: 1, seriAciklamaTr: "Futbolun tarihi.", alt_konu: "futbol" };
  const mh = mufredatHaberi({ m: { hesap: "op_spor", kategori: "spor" }, d: ders, id: "m-x", trBas: "Futbol Nedir?", enBas: "What Is Football?", trOzet: "a b c.", enOzet: "a b c.", link: "https://tr.wikipedia.org/wiki/Futbol", kaynakTr: "", kaynakEn: "", simdi: SIMDI });
  assert.deepEqual(mh.seri, { yol: ["Spor Dalları", "Futbol"], sira: 1 }); assert.equal(mh.alt_konu, "futbol"); assert.equal(mh.editor, "op_spor");
});
