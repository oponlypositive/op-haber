// 2026-10-14 GÖRSEL YÖNETMENİ: görsel planı (gorsel_adaylari), Wikidata/Commons araması, kurum/logo/kişi kuralları, süre tavanı, günlük kırılımı. Ağsız (fetch taklit).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ayarOku } from "../lib/ayar.mjs";
import { ISTEM } from "../lib/yaz.mjs";
import { ciktiDogrula } from "../lib/dogrula.mjs";
import { adaylariAyikla, adGeciyor, baglamOrtusme, logoLisansOk, wikidataBul, commonsDosyalari } from "../lib/gorsel_aday.mjs";
import { gorselBul, vlDegerlendir, VL_OZNE_BEKLENEN } from "../lib/gorsel.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";

const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const vlOzneOk = { ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" };
const yanit = (o) => ({ metin: JSON.stringify(o) });
const bekle = async () => {};

// ---------------------------------------------------------------- taklit dünya (Wikidata + Commons + görsel indirme)
const claims = ({ sinif = [], p18 = "", p154 = "", spor = false } = {}) => ({
  P31: sinif.map((id) => ({ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: { id } } } })),
  ...(p18 ? { P18: [{ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: p18 } } }] } : {}),
  ...(p154 ? { P154: [{ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: p154 } } }] } : {}),
  ...(spor ? { P641: [{ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: { id: "Q2736" } } } }] } : {}),
});
const sayfa = (baslik, { lisans = "CC BY-SA 4.0", yil = "2019", aciklama = "", kat = "", mime = "image/jpeg", w = 1280, h = 853, ek = {} } = {}) => ({
  title: "File:" + baslik,
  imageinfo: [{ url: "https://upload.wikimedia.org/o/" + baslik, thumburl: "https://upload.wikimedia.org/t/" + baslik, thumbwidth: w, thumbheight: h, width: 4000, height: 2600, mime,
    descriptionurl: "https://commons.wikimedia.org/wiki/File:" + baslik,
    extmetadata: { LicenseShortName: { value: lisans }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" }, Artist: { value: "Foto Sahibi" }, ImageDescription: { value: aciklama }, Categories: { value: kat }, DateTimeOriginal: { value: yil }, ...ek } }],
});
const katla = (t) => String(t).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
/** dunya: { varliklar: [{id, label, aciklama, sinif, p18, p154, spor, takma?}], dosyalar: {ad: sayfa}, commonsArama: {sorgu: [sayfa]} } */
function sahteFetch(dunya) {
  const cagrilar = [];
  const f = async (url, o) => {
    const u = new URL(String(url)); cagrilar.push(String(url));
    const json = (g) => ({ ok: true, status: 200, headers: new Headers(), json: async () => g });
    if (u.host === "www.wikidata.org") {
      const p = u.searchParams;
      if (p.get("action") === "wbsearchentities") {
        const ara = katla(p.get("search"));
        return json({ search: (dunya.varliklar || []).filter((v) => katla(v.label) === ara || (v.takma || []).some((t) => katla(t) === ara)).map((v) => ({ id: v.id, label: v.label, description: v.aciklama,
          match: { type: katla(v.label) === ara ? "label" : "alias", text: katla(v.label) === ara ? v.label : (v.takma || []).find((t) => katla(t) === ara) } })) });
      }
      if (p.get("action") === "wbgetentities") {
        const e = {}; for (const id of p.get("ids").split("|")) { const v = dunya.varliklar.find((x) => x.id === id); if (v) e[id] = { claims: claims(v) }; }
        return json({ entities: e });
      }
    }
    if (u.host === "commons.wikimedia.org") {
      const p = u.searchParams;
      if (p.get("titles")) return json({ query: { pages: Object.fromEntries(p.get("titles").split("|").map((t, i) => [i, (dunya.dosyalar || {})[t.replace(/^File:/, "")]]).filter(([, s]) => s)) } });
      if (p.get("gsrsearch")) { const q = p.get("gsrsearch").replace(/ filetype:bitmap$/, "").replace(/"/g, ""); return json({ query: { pages: Object.fromEntries(((dunya.commonsArama || {})[q] || []).map((s, i) => [i, s])) } }); }
    }
    if (u.host === "upload.wikimedia.org") return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer };
    return { ok: false, status: 404, headers: new Headers(), json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  f.cagrilar = cagrilar;
  return f;
}
const modelKur = (cevap = vlOzneOk) => { const sorular = []; return { sorular, yaz: async (s, g) => { sorular.push(g); return yanit(typeof cevap === "function" ? cevap(g, sorular.length) : cevap); } }; };
const haber = (ek = {}) => ({ en: { baslik: "Es Devlin opens a new show at the Design Museum", ozet: "The stage designer filled the gallery with light." }, tr: { baslik: "", ozet: "" }, yer: "Londra, Birleşik Krallık", gorselAra: "stage lights", ...ek });

// ---------------------------------------------------------------- plan doğrulama
test("plan doğrulama: metinde geçmeyen ad atılır, kişi tam ad ister, Latin dışı/kopya/fazla atılır, en çok 5, sehir yalnız metinde geçiyorsa kalır", () => {
  const havuz = "Es Devlin opened an exhibition at the Design Museum in London. Silicon carbide wafers were shown. Princeton Plasma Physics Laboratory also took part. SEKA Kağıt Müzesi Kocaeli.";
  const s = adaylariAyikla([
    { tur: "kisi", ad_en: "Es Devlin" },
    { tur: "kisi", ad_en: "Devlin" },                                       // tek kelimelik kişi: atılır
    { tur: "mekan", ad_en: "Design Museum", sehir: "London" },
    { tur: "mekan", ad_en: "Louvre Museum" },                               // metinde yok: uydurma
    { tur: "nesne", ad_en: "silicon carbide" },
    { tur: "nesne", ad_en: "Silicon Carbide" },                             // kopya
    { tur: "kurum", ad_en: "Princeton Plasma Physics Laboratory" },
    { tur: "mekan", ad_en: "SEKA Paper Museum", ad_tr: "SEKA Kağıt Müzesi" },   // EN ad metinde yok ama TR ad var: kabul
    { tur: "mekan", ad_en: "东京塔" },                                        // Latin dışı
    { tur: "garip", ad_en: "Design Museum" },                               // geçersiz tür
    { tur: "konum", ad_en: "Kocaeli", sehir: "Atlantis" },                  // sehir metinde yok: sehir düşer, aday kalır (ama 5 sınırı)
  ], havuz);
  assert.deepEqual(s.map((x) => x.ad_en), ["Es Devlin", "Design Museum", "silicon carbide", "Princeton Plasma Physics Laboratory", "SEKA Paper Museum"]);
  assert.equal(s[1].sehir, "London"); assert.equal(s[4].ad_tr, "SEKA Kağıt Müzesi");
  assert.equal(adaylariAyikla("bozuk", havuz).length, 0);
  assert.equal(adaylariAyikla([{ tur: "Kişi", ad_en: "Es Devlin" }, { tur: "yer", ad_en: "Design Museum" }], havuz).map((x) => x.tur).join(), "kisi,mekan");   // takma türler
  assert.equal(adGeciyor("Es Devlin", "Es Devlin'in sergisi"), true); assert.equal(adGeciyor("Es Devlin", "Devlin sergisi"), false);
});

test("ciktiDogrula: gorsel_adaylari haber nesnesine yalnız metinde geçenlerle girer; alan yoksa haber eskisi gibi; istem planı ister", () => {
  assert.match(ISTEM, /gorsel_adaylari/); assert.match(ISTEM, /SIRALI/); assert.match(ISTEM, /kisi\|eser\|mekan\|nesne\|kurum\|konum/);
  const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. It is a simple example of what a community can do together when people share the work and the time.";
  const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
  const kaynak = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. Neighbors and local schools shared the work and a small tool library now serves the park. 5000";
  const d = (ek) => ({ uygun: true, kategori: "iyilik", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR }, ...ek });
  const v = ciktiDogrula(d({ gorsel_adaylari: [{ tur: "konum", ad_en: "Lakeside" }, { tur: "mekan", ad_en: "Eiffel Tower" }] }), kaynak, "Trees");
  assert.equal(v.ok, true, v.neden);
  assert.deepEqual(v.haber.gorselAdaylari, [{ tur: "konum", ad_en: "Lakeside" }]);
  assert.equal("gorselAdaylari" in ciktiDogrula(d({}), kaynak, "Trees").haber, false);
  assert.equal("gorselAdaylari" in ciktiDogrula(d({ gorsel_adaylari: [{ tur: "mekan", ad_en: "Eiffel Tower" }] }), kaynak, "Trees").haber, false);
});

// ---------------------------------------------------------------- Wikidata eşleşmesi
test("wikidataBul: kesin eşleşme P18 verir; kişi insan olmalı; aynı adlı çok varlık bağlamla ayrılır, ayrılamazsa REDDEDİLİR; eşleşme yoksa 'yok'", async () => {
  const dunya = { varliklar: [
    { id: "Q1", label: "Es Devlin", aciklama: "British stage designer", sinif: ["Q5"], p18: "Es Devlin in Studio.jpg" },
    { id: "Q2", label: "John Smith", aciklama: "English football player", sinif: ["Q5"], p18: "A.jpg" },
    { id: "Q3", label: "John Smith", aciklama: "American physician and researcher", sinif: ["Q5"], p18: "B.jpg" },
    { id: "Q4", label: "Design Museum", aciklama: "art museum in London, England", sinif: [], p18: "Design Museum.jpg" },
    { id: "Q5x", label: "Design Museum", aciklama: "museum in Holon, Israel", sinif: [], p18: "Holon.jpg" },
    { id: "Q6", label: "Mercury", aciklama: "disambiguation page", sinif: ["Q4167410"] },
    { id: "Q7", label: "Elton Lane", aciklama: "village", sinif: [] },
  ] };
  const f = sahteFetch(dunya);
  const a = await wikidataBul({ tur: "kisi", ad_en: "Es Devlin" }, "Es Devlin stage designer exhibition", { fetchFn: f });
  assert.equal(a.durum, "ok"); assert.equal(a.varlik.gorselAdi, "Es Devlin in Studio.jpg");
  // kişi için insan olmayan varlık: tür uyumsuz
  assert.equal((await wikidataBul({ tur: "kisi", ad_en: "Elton Lane" }, "Elton Lane", { fetchFn: f })).durum, "tur");
  // kurum/mekan için insan reddedilir
  assert.equal((await wikidataBul({ tur: "mekan", ad_en: "Es Devlin" }, "x", { fetchFn: f })).durum, "tur");
  // anlam ayrımı sayfası
  assert.equal((await wikidataBul({ tur: "nesne", ad_en: "Mercury" }, "mercury", { fetchFn: f })).durum, "tur");
  // iki John Smith: bağlam "physician researcher" -> Q3; bağlam yok -> belirsiz (YANLIŞ KİŞİ YOK)
  const secili = await wikidataBul({ tur: "kisi", ad_en: "John Smith" }, "A physician and researcher John Smith found a new therapy", { fetchFn: f });
  assert.equal(secili.durum, "ok"); assert.equal(secili.varlik.id, "Q3");
  assert.equal((await wikidataBul({ tur: "kisi", ad_en: "John Smith" }, "John Smith helped neighbors plant trees", { fetchFn: f })).durum, "belirsiz");
  // iki Design Museum: şehir ipucu Londra'yı seçer; ipucu yoksa belirsiz
  assert.equal((await wikidataBul({ tur: "mekan", ad_en: "Design Museum", sehir: "London" }, "exhibition", { fetchFn: f })).varlik.id, "Q4");
  assert.equal((await wikidataBul({ tur: "mekan", ad_en: "Design Museum" }, "exhibition", { fetchFn: f })).durum, "belirsiz");
  assert.equal((await wikidataBul({ tur: "mekan", ad_en: "Hiç Olmayan Yer" }, "x", { fetchFn: f })).durum, "yok");
  // tek eşleşen ünlü kişi ama haber bağlamıyla ilgisiz (özel kişi aynı adı taşıyor): reddedilir
  assert.equal((await wikidataBul({ tur: "kisi", ad_en: "Es Devlin" }, "A local baker named Es Devlin opened a shop", { fetchFn: f })).durum, "baglam");
  assert.ok(baglamOrtusme("British stage designer", "stage design exhibition") >= 1);
  // ağ hatası = hata (sessiz görselsiz), atmaz
  assert.equal((await wikidataBul({ tur: "kisi", ad_en: "Es Devlin" }, "x", { fetchFn: async () => { throw new Error("ağ yok"); } })).durum, "hata");
});

// ---------------------------------------------------------------- 5 gerçek örnek (altın benzeri)
const DUNYA = { varliklar: [
  { id: "Q10", label: "Es Devlin", aciklama: "British stage designer", sinif: ["Q5"], p18: "Es Devlin in Studio.jpg" },
  { id: "Q11", label: "Design Museum", aciklama: "art museum in London, England", sinif: [], p18: "Design Museum (2).jpg", p154: "Design Museum wordmark.svg" },
  { id: "Q12", label: "Princeton Plasma Physics Laboratory", aciklama: "national laboratory in Princeton, New Jersey", sinif: [], p18: "PPPL aerial.jpg" },
  { id: "Q13", label: "silicon carbide", aciklama: "chemical compound", sinif: [], p18: "Siliciumcarbid.jpg" },
  { id: "Q14", label: "Tohoku University", aciklama: "university in Sendai, Japan", sinif: [], p18: "Kawauchi campus.jpg" },
  { id: "Q15", label: "SEKA Paper Museum", aciklama: "Museum in Turkey", sinif: [], p18: "SEKA Kağıt Müzesi.jpg", takma: ["SEKA Kâğıt Müzesi"] },
  { id: "Q16", label: "Galatasaray S.K.", aciklama: "Turkish sports club", sinif: [], takma: ["Galatasaray"], p154: "Galatasaray logo.svg", spor: true },
  { id: "Q17", label: "Atatürk Olympic Stadium", aciklama: "stadium in Istanbul, Turkey", sinif: [], p18: "Ataturk Olympic Stadium.jpg" },
], dosyalar: {
  "Es Devlin in Studio.jpg": sayfa("Es Devlin in Studio.jpg", { aciklama: "Es Devlin stage designer in her studio", yil: "2018" }),
  "Design Museum (2).jpg": sayfa("Design Museum (2).jpg", { aciklama: "Design Museum Kensington London", kat: "Design Museum" }),
  "PPPL aerial.jpg": sayfa("PPPL aerial.jpg", { aciklama: "Princeton Plasma Physics Laboratory campus Princeton New Jersey", yil: "2016" }),
  "Siliciumcarbid.jpg": sayfa("Siliciumcarbid.jpg", { aciklama: "silicon carbide crystals", yil: "2012" }),
  "Kawauchi campus.jpg": sayfa("Kawauchi campus.jpg", { aciklama: "Tohoku University Kawauchi campus Sendai", yil: "2022" }),
  "SEKA Kağıt Müzesi.jpg": sayfa("SEKA Kağıt Müzesi.jpg", { aciklama: "SEKA Kağıt Müzesi Kocaeli İzmit", yil: "2021" }),
  "Ataturk Olympic Stadium.jpg": sayfa("Ataturk Olympic Stadium.jpg", { aciklama: "Atatürk Olympic Stadium Istanbul", yil: "2020" }),
  "Design Museum wordmark.svg": sayfa("Design Museum wordmark.svg", { lisans: "Public domain", mime: "image/svg+xml", w: 1280, h: 400, ek: { UsageTerms: { value: "Public domain" }, Restrictions: { value: "trademarked" } } }),
  "Galatasaray logo.svg": sayfa("Galatasaray logo.svg", { lisans: "Public domain", mime: "image/svg+xml" }),
} };

const GERCEK = [
  ["Es Devlin sergisi: sanatçı fotoğrafı (kişi) ilk aday", haber(), [{ tur: "kisi", ad_en: "Es Devlin" }, { tur: "mekan", ad_en: "Design Museum", sehir: "London" }], "kisi", "Es Devlin in Studio.jpg"],
  ["Es Devlin sergisi: sanatçı bulunamazsa müze (mekan)", haber({ en: { baslik: "Exhibition by Es Devlin opens at the Design Museum", ozet: "The show fills the gallery in London." } }), [{ tur: "kisi", ad_en: "Hiç Bulunmayan Kişi" }, { tur: "mekan", ad_en: "Design Museum", sehir: "London" }], "mekan", "Design Museum (2).jpg"],
  ["Princeton Plasma Physics Laboratory: kurum binası (eski 'kurum öznesi aranmaz' yasağı kalktı, tam eşleşmeyle)", haber({ en: { baslik: "Princeton Plasma Physics Laboratory researchers tame plasma", ozet: "The team reports a steadier fusion experiment." }, yer: "ABD", gorselOzne: { ad: "Princeton Plasma Physics Laboratory", tur: "kurum" } }), [{ tur: "kurum", ad_en: "Princeton Plasma Physics Laboratory" }], "kurum", "PPPL aerial.jpg"],
  ["Tohoku Üniversitesi silisyum karbür: malzeme (nesne) kuruma tercih edildiğinde", haber({ en: { baslik: "Tohoku University team improves silicon carbide chips", ozet: "The material tolerates more heat." }, yer: "Sendai, Japonya", gorselOzne: { ad: "Tohoku University", tur: "kurum" } }), [{ tur: "nesne", ad_en: "silicon carbide" }, { tur: "kurum", ad_en: "Tohoku University" }], "nesne", "Siliciumcarbid.jpg"],
  ["SEKA Kâğıt Müzesi: ressam sergisi mekânı (TR ad)", haber({ en: { baslik: "Painter opens exhibition at SEKA Paper Museum", ozet: "The show runs in Kocaeli." }, yer: "Kocaeli, Türkiye" }), [{ tur: "kisi", ad_en: "Ahmet Ressam" }, { tur: "mekan", ad_en: "SEKA Kağıt Müzesi", ad_tr: "SEKA Kağıt Müzesi" }], "mekan", "SEKA Kağıt Müzesi.jpg"],
  ["Maç haberi: stat fotoğrafı (kulüp armasına gidilmez)", haber({ en: { baslik: "Galatasaray win at Ataturk Olympic Stadium", ozet: "A big night in Istanbul." }, yer: "İstanbul, Türkiye" }), [{ tur: "kurum", ad_en: "Galatasaray" }, { tur: "mekan", ad_en: "Ataturk Olympic Stadium" }], "mekan", "Ataturk Olympic Stadium.jpg"],
];
for (const [ad, h, adaylar, beklenenTur, dosya] of GERCEK) {
  test(`altın benzeri: ${ad}`, async () => {
    const f = sahteFetch(DUNYA), m = modelKur();
    const r = await gorselBul({ ...h, gorselAdaylari: adaylar }, { model: m, fetchFn: f, bekleFn: bekle, vlUst: 3 });
    assert.ok(r.sonuc, r.notlar.join(" | "));
    assert.equal(r.sonuc.adayTur, beklenenTur);
    assert.ok(r.sonuc.gorsel.kaynak_url.includes("commons.wikimedia.org/wiki/File:" + dosya), r.sonuc.gorsel.kaynak_url);
    assert.ok(r.sonuc.gorsel.lisans && r.sonuc.gorsel.sahibi && r.sonuc.gorsel.lisans_url, "atıf bilgisi tam");
    assert.ok(m.sorular.length <= 2, `vl çağrısı ${m.sorular.length}`);
    assert.ok(!r.sonuc.gorsel.marka);
  });
}

test("sıra: ilk uygun aday kullanılır, sonrakiler aranmaz; kurum adayı eski kurum yasağına takılmaz ama yanlış kurum (başka üniversite) ASLA", async () => {
  const f = sahteFetch(DUNYA), m = modelKur();
  const r = await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Es Devlin" }, { tur: "mekan", ad_en: "Design Museum", sehir: "London" }] }, { model: m, fetchFn: f, bekleFn: bekle });
  assert.equal(r.sonuc.adayTur, "kisi");
  assert.ok(!f.cagrilar.some((u) => /Design\+Museum/.test(u) && /wbsearchentities/.test(u)), "ikinci aday Wikidata'da aranmadı");
  // Ankara etkinliği + başka üniversite: Wikidata'da o ada TAM eşleşme yok -> görsel yok; Commons'ta başka kurum adlı dosya kullanılmaz
  const f2 = sahteFetch({ ...DUNYA, commonsArama: { "Hacettepe University": [sayfa("IUPUI lecture hall.jpg", { aciklama: "IUPUI lecture hall university auditorium Indianapolis" })] } });
  const r2 = await gorselBul({ en: { baslik: "Hacettepe University hosts science day in Ankara", ozet: "Students joined." }, tr: { baslik: "", ozet: "" }, yer: "Ankara, Türkiye", gorselAdaylari: [{ tur: "kurum", ad_en: "Hacettepe University" }] }, { model: modelKur(), fetchFn: f2, bekleFn: bekle });
  assert.equal(r2.sonuc, null);
  assert.equal(r2.retKodlari["p.yok"], 1);
});

test("yer çelişkisi: Wikidata'nın görseli haberde geçmeyen başka kurum/şehir adı taşıyorsa elenir (IUPUI olayı)", async () => {
  const dunya = { varliklar: [{ id: "Q20", label: "Ankara Science Hall", aciklama: "hall in Ankara", sinif: [], p18: "Hall.jpg" }], dosyalar: { "Hall.jpg": sayfa("Hall.jpg", { aciklama: "lecture hall at Indiana University Indianapolis", kat: "Indiana University" }) } };
  const r = await gorselBul({ en: { baslik: "Ankara Science Hall hosts fair", ozet: "A fair." }, tr: { baslik: "", ozet: "" }, yer: "Ankara, Türkiye", gorselAdaylari: [{ tur: "mekan", ad_en: "Ankara Science Hall" }] }, { model: modelKur(), fetchFn: sahteFetch(dunya), bekleFn: bekle });
  assert.equal(r.sonuc, null); assert.equal(r.retKodlari["p.yer-celiski"], 1);
});

test("görsel denetimi atlanmaz: hassas simge / çıplaklık / özne yok -> aday reddedilir, sıradaki denenir", async () => {
  const f = sahteFetch(DUNYA);
  const m = modelKur((g, n) => (n === 1 ? { ...vlOzneOk, hassas_simge: true } : vlOzneOk));
  const r = await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Es Devlin" }, { tur: "mekan", ad_en: "Design Museum", sehir: "London" }] }, { model: m, fetchFn: f, bekleFn: bekle, vlUst: 3 });
  assert.equal(r.sonuc.adayTur, "mekan"); assert.equal(r.retKodlari["p.vl-simge"], 1);
  const m2 = modelKur({ ...vlOzneOk, ozne_eslesiyor: false });
  const r2 = await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Es Devlin" }] }, { model: m2, fetchFn: sahteFetch(DUNYA), bekleFn: bekle, vlUst: 3 });
  assert.equal(r2.sonuc, null); assert.equal(r2.retKodlari["p.vl-ozne-yok"], 1);
  assert.match(m.sorular[0], /Wikidata/);          // P18 görseli için dar soru; güvenlik alanları aynen sorulur
  for (const alan of ["ciplak_ya_da_uygunsuz", "hassas_simge", "dusuk_kalite", "siyah_beyaz_ya_da_arsiv", "yazi_logo_baskin"]) assert.match(m.sorular[0], new RegExp(`"${alan}"`));
});

test("vl bütçesi: plan en çok vlUst-1 denetim harcar (nötr yola hak kalır); tek kesin eşleşmede 1 denetim", async () => {
  const m = modelKur({ ...vlOzneOk, ozne_eslesiyor: false });
  await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Es Devlin" }, { tur: "mekan", ad_en: "Design Museum", sehir: "London" }, { tur: "nesne", ad_en: "silicon carbide" }] }, { model: m, fetchFn: sahteFetch(DUNYA), bekleFn: bekle, vlUst: 3 });
  assert.equal(m.sorular.length, 2);
  const m1 = modelKur();
  await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Es Devlin" }] }, { model: m1, fetchFn: sahteFetch(DUNYA), bekleFn: bekle, vlUst: 3 });
  assert.equal(m1.sorular.length, 1);
});

test("modelin gorselAra terimi planın son adayı olarak Wikidata'da aranır; plan yoksa Wikidata'ya hiç gidilmez (eski davranış)", async () => {
  const f = sahteFetch(DUNYA);
  const r = await gorselBul({ ...haber({ gorselAra: "silicon carbide" }), gorselAdaylari: [{ tur: "kisi", ad_en: "Hiç Bulunmayan Kişi" }] }, { model: modelKur(), fetchFn: f, bekleFn: bekle });
  assert.equal(r.sonuc?.adayTur, "nesne");
  const f2 = sahteFetch(DUNYA);
  await gorselBul(haber(), { model: modelKur(), fetchFn: f2, bekleFn: bekle, araFn: async () => [] });
  assert.ok(!f2.cagrilar.some((u) => u.includes("wikidata.org")));
  const f3 = sahteFetch(DUNYA);
  await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Es Devlin" }] }, { model: modelKur(), fetchFn: f3, bekleFn: bekle, araFn: async () => [], plan: false });
  assert.ok(!f3.cagrilar.some((u) => u.includes("wikidata.org")), "plan:false -> Wikidata yok");
});

test("P18 yoksa Commons aramasına düşer: ad dosya başlığında geçmeli, eski sıkı özne sorusu kullanılır", async () => {
  const dunya = { varliklar: [{ id: "Q30", label: "Sekapark", aciklama: "tram stop in İzmit", sinif: [] }],
    commonsArama: { Sekapark: [sayfa("Sekapark panorama.jpg", { aciklama: "Sekapark İzmit Kocaeli" }), sayfa("Baska yer.jpg", { aciklama: "unrelated bridge" })] } };
  const m = modelKur();
  const r = await gorselBul({ en: { baslik: "Painter shows work near Sekapark", ozet: "Kocaeli." }, tr: { baslik: "", ozet: "" }, yer: "Kocaeli, Türkiye", gorselAdaylari: [{ tur: "mekan", ad_en: "Sekapark" }] }, { model: m, fetchFn: sahteFetch(dunya), bekleFn: bekle });
  assert.equal(r.sonuc.adayTur, "mekan");
  assert.doesNotMatch(m.sorular[0], /Wikidata \/ Wikimedia Commons lists/);
  assert.match(m.sorular[0], /ONLY if the image really shows/);
});

// ---------------------------------------------------------------- kişi güvencesi
test("kişi: tam ad + insan + bağlam yoksa fotoğraf YOK (yanlış kişi görselsizden kötü); arşiv (eski) fotoğraf elenir", async () => {
  const dunya = { varliklar: [{ id: "Q40", label: "Ali Veli", aciklama: "Turkish footballer", sinif: ["Q5"], p18: "Ali Veli.jpg" }], dosyalar: { "Ali Veli.jpg": sayfa("Ali Veli.jpg", { aciklama: "Ali Veli", yil: "1962" }) } };
  const h = { en: { baslik: "Ali Veli, a local teacher, wins a science prize", ozet: "He teaches physics." }, tr: { baslik: "", ozet: "" }, yer: "Ankara, Türkiye", gorselAdaylari: [{ tur: "kisi", ad_en: "Ali Veli" }] };
  const r = await gorselBul(h, { model: modelKur(), fetchFn: sahteFetch(dunya), bekleFn: bekle });
  assert.equal(r.sonuc, null); assert.equal(r.retKodlari["p.baglam"], 1);
  const h2 = { ...h, en: { baslik: "Footballer Ali Veli wins an award", ozet: "The Turkish footballer was honoured." } };
  const r2 = await gorselBul(h2, { model: modelKur(), fetchFn: sahteFetch(dunya), bekleFn: bekle });
  assert.equal(r2.sonuc, null, "1962 tarihli (arşiv) kişi fotoğrafı elenir"); assert.equal(r2.retKodlari["p.gorsel-yok"], 1);
});

test("lisans: lisansOk dışı (ör. non-free / NC) Wikidata görseli kullanılmaz", async () => {
  const dunya = { varliklar: [{ id: "Q50", label: "Nova Lab", aciklama: "laboratory in Berlin", sinif: [], p18: "Nova.jpg" }], dosyalar: { "Nova.jpg": sayfa("Nova.jpg", { lisans: "CC BY-NC 4.0", aciklama: "Nova Lab Berlin" }) } };
  const r = await gorselBul({ en: { baslik: "Nova Lab in Berlin builds a sensor", ozet: "x" }, tr: { baslik: "", ozet: "" }, yer: "Berlin", gorselAdaylari: [{ tur: "kurum", ad_en: "Nova Lab" }] }, { model: modelKur(), fetchFn: sahteFetch(dunya), bekleFn: bekle });
  assert.equal(r.sonuc, null); assert.equal(r.retKodlari["p.gorsel-yok"], 1);
});

// ---------------------------------------------------------------- logo
test("logo: varsayılan KAPALI; açıkken yalnız kamu malı/CC0 + non-free değil + kulüp/siyasi/devlet kurumu değil; lisansa 'marka' notu eklenir", async () => {
  const haberDM = { en: { baslik: "Design Museum announces new season", ozet: "Programme news." }, tr: { baslik: "", ozet: "" }, yer: "Londra", gorselAdaylari: [{ tur: "kurum", ad_en: "Design Museum", sehir: "London" }] };
  const yalnizLogo = { ...DUNYA, dosyalar: { ...DUNYA.dosyalar } }; delete yalnizLogo.dosyalar["Design Museum (2).jpg"];   // bina fotoğrafı yok: son çare logo
  const kapali = await gorselBul(haberDM, { model: modelKur(), fetchFn: sahteFetch(yalnizLogo), bekleFn: bekle });
  assert.equal(kapali.sonuc, null);
  const acik = await gorselBul(haberDM, { model: modelKur(), fetchFn: sahteFetch(yalnizLogo), bekleFn: bekle, logoIzin: true });
  assert.ok(acik.sonuc, acik.notlar.join("|"));
  assert.equal(acik.sonuc.adayTur, "logo"); assert.equal(acik.sonuc.gorsel.marka, true); assert.match(acik.sonuc.gorsel.lisans, /^Public domain \(marka logosu\)$/);
  assert.match(acik.sonuc.gorsel.lisans, /^(cc0|pdm|public domain|pd\b)/i);          // Edge Function LISANS_OK ile uyumlu
  // non-free / fair use / telifli: asla
  for (const ek of [{ lisans: "Non-free logo", ek: {} }, { lisans: "Public domain", ek: { NonFree: { value: "true" } } }, { lisans: "Public domain", ek: { Copyrighted: { value: "True" } } }, { lisans: "CC BY-SA 4.0", ek: {} }, { lisans: "Fair use", ek: {} }, { lisans: "Public domain", ek: { UsageTerms: { value: "Non-free logo, fair use" } } }]) {
    const d = { ...yalnizLogo, dosyalar: { ...yalnizLogo.dosyalar, "Design Museum wordmark.svg": sayfa("Design Museum wordmark.svg", { mime: "image/svg+xml", ...ek }) } };
    const r = await gorselBul(haberDM, { model: modelKur(), fetchFn: sahteFetch(d), bekleFn: bekle, logoIzin: true });
    assert.equal(r.sonuc, null, JSON.stringify(ek));
  }
  assert.equal(logoLisansOk({ lisans: "Public domain", lisansAyrinti: { nonFree: false, telifli: false, kullanim: "Public domain" } }), true);
  assert.equal(logoLisansOk({ lisans: "CC BY 4.0" }), false);
  // spor kulübü armasi: özgür görünse bile HİÇ
  const kulup = await gorselBul({ en: { baslik: "Galatasaray sign a player", ozet: "News." }, tr: { baslik: "", ozet: "" }, yer: "İstanbul", gorselAdaylari: [{ tur: "kurum", ad_en: "Galatasaray" }] }, { model: modelKur(), fetchFn: sahteFetch(DUNYA), bekleFn: bekle, logoIzin: true });
  assert.equal(kulup.sonuc, null);
  // mantık: devlet kurumu logosu da yok (TÜBİTAK)
  const tub = { varliklar: [{ id: "Q60", label: "TÜBİTAK", aciklama: "Turkish government agency", sinif: [], p154: "TUBITAK logo.svg" }], dosyalar: { "TUBITAK logo.svg": sayfa("TUBITAK logo.svg", { lisans: "Public domain", mime: "image/svg+xml" }) } };
  const rt = await gorselBul({ en: { baslik: "TÜBİTAK funds a project", ozet: "x" }, tr: { baslik: "", ozet: "" }, yer: "Ankara", gorselAdaylari: [{ tur: "kurum", ad_en: "TÜBİTAK" }] }, { model: modelKur(), fetchFn: sahteFetch(tub), bekleFn: bekle, logoIzin: true });
  assert.equal(rt.sonuc, null);
});

test("logo görsel denetimi: yazı/logo baskınlığı engel değil ama uygunsuz/hassas simge/özne yok engel", () => {
  const ok = { ozne_eslesiyor: true, ciplak_ya_da_uygunsuz: false, hassas_simge: false, dusuk_kalite: false, yazi_logo_baskin: true, siyah_beyaz_ya_da_arsiv: true };
  assert.equal(vlDegerlendir(JSON.stringify(ok), { ozne: true, logo: true }).ok, true);
  assert.equal(vlDegerlendir(JSON.stringify({ ...ok, hassas_simge: true }), { ozne: true, logo: true }).ok, false);
  assert.equal(vlDegerlendir(JSON.stringify(ok), { ozne: true }).ok, false);            // normal özne yolunda logo baskınlığı ret
});

// ---------------------------------------------------------------- süre tavanı
test("süre tavanı: haber başına görsel arama süresi aşılınca arama durur (sureAsildi), sonuc null; aşılmadıkça etkisiz", async () => {
  let t = 0;
  const simdi = () => t;
  const f = sahteFetch(DUNYA);
  const yavas = async (...a) => { t += 20_000; return f(...a); };         // her ağ çağrısı 20 sn
  const r = await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Hiç Bulunmayan 1" }, { tur: "kisi", ad_en: "Hiç Bulunmayan 2" }, { tur: "kisi", ad_en: "Hiç Bulunmayan 3" }, { tur: "mekan", ad_en: "Design Museum", sehir: "London" }] },
    { model: modelKur(), fetchFn: yavas, bekleFn: bekle, simdi, sureSn: 45 });
  assert.equal(r.sonuc, null); assert.equal(r.sureAsildi, true); assert.ok(r.notlar.includes("görsel süre tavanı"));
  assert.ok(f.cagrilar.length <= 4, `ağ çağrısı ${f.cagrilar.length}`);
  t = 0;
  const hizli = await gorselBul({ ...haber(), gorselAdaylari: [{ tur: "kisi", ad_en: "Es Devlin" }] }, { model: modelKur(), fetchFn: f, bekleFn: bekle, simdi, sureSn: 45 });
  assert.ok(hizli.sonuc); assert.equal(hizli.sureAsildi, false);
  // eski (planı olmayan) yolda da tavan geçerli
  t = 0;
  const eski = await gorselBul(haber({ gorselOzne: { ad: "Es Devlin", tur: "kisi" } }), { model: modelKur(), fetchFn: yavas, bekleFn: bekle, simdi, sureSn: 30, araFn: async (q, tur) => { t += 20_000; return []; } });
  assert.equal(eski.sureAsildi, true); assert.equal(eski.sonuc, null);
});

// ---------------------------------------------------------------- ayar
test("ayar: görsel yönetmeni varsayılanları ve sınırları (ortam değişkeniyle)", () => {
  const v = ayarOku({}, []);
  assert.equal(v.gorselSureSn, 50); assert.equal(v.gorselTurSureSn, 300); assert.equal(v.gorselPlan, true); assert.equal(v.gorselLogo, false);
  assert.equal(v.vlUst, 3); assert.equal(v.turSureSn, 780);
  const k = ayarOku({ GORSEL_SURE_SN: "5", GORSEL_TUR_SURE_SN: "9999", GORSEL_PLAN: "0", GORSEL_LOGO: "1" }, []);
  assert.deepEqual([k.gorselSureSn, k.gorselTurSureSn, k.gorselPlan, k.gorselLogo], [10, 780, false, true]);
  assert.equal(ayarOku({ GORSEL_LOGO: "" }, []).gorselLogo, false);
});

// ---------------------------------------------------------------- hat: günlük kırılımı + tur tavanı
const SIMDI = Date.parse("2026-10-13T12:00:00Z");
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const MODEL_YANITI = JSON.stringify({ uygun: true, kategori: "iyilik", yer: "Lakeside, Dünya", gorsel_adaylari: [{ tur: "konum", ad_en: "Lakeside" }], en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const ayarHat = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ...ek });
const adayHat = (n) => ({ baslik: `Volunteers plant thousands of trees beside Lakeside river (${n})`, ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/h/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-13T08:00:00Z" });
const bulutKur = () => { const k = { yayinlar: [], isaretler: [] }; return { k, bilinenler: async () => new Map(), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, g }); return { durum: "eklendi" }; } }; };
const lakeDunya = { varliklar: [{ id: "Q70", label: "Lakeside", aciklama: "lakeside town park river", sinif: [], p18: "Lakeside park.jpg" }], dosyalar: { "Lakeside park.jpg": sayfa("Lakeside park.jpg", { aciklama: "Lakeside park river trees" }) } };

test("hat: plan görseli yayına girer, özet satırında gorselTur ve gorselSure görünür; model tek çağrıda planı üretir (ek çağrı yok)", async () => {
  const bulut = bulutKur();
  let cagri = 0, vl = 0;
  const model = { yaz: async (s, g, o) => { if (o?.resim) { vl++; return yanit(vlOzneOk); } cagri++; return { metin: MODEL_YANITI, engellendi: "", saglayici: "taklit" }; } };
  let t = SIMDI; const simdi = () => t;
  const fetchFn = sahteFetch(lakeDunya);
  const f2 = async (...a) => { t += 3000; return fetchFn(...a); };
  const o = await turCalistir({ ayar: ayarHat(), kaynaklar: {}, bulut, model, fetchFn: f2, bekleFn: bekle, simdi, log: () => {}, tarama: { adaylar: [adayHat(1)], hatalar: [] } });
  assert.equal(o.yayinlanan, 1); assert.equal(cagri, 1); assert.equal(vl, 1);
  assert.equal(bulut.k.yayinlar[0].g.adayTur, "konum");
  assert.deepEqual(o.gorselTur, { konum: 1 });
  assert.ok(o.gorselSureMs > 0);
  const satir = ozetSatiri(o);
  assert.match(satir, / gorselTur=konum:1 /); assert.match(satir, / gorselSure=\d+s /);
});

test("hat: tur görsel süresi (GORSEL_TUR_SURE_SN) dolunca kalan haberler görsel aranmadan görselsiz kuyruk kuralıyla ilerler", async () => {
  const bulut = bulutKur(), model = { yaz: async () => ({ metin: MODEL_YANITI, engellendi: "", saglayici: "taklit" }) };
  const fetchFn = sahteFetch(lakeDunya);
  const o = await turCalistir({ ayar: ayarHat({ gorselTurSureSn: 0, gorselsizYayin: true, gorselsizUst: 3 }), kaynaklar: {}, bulut, model, fetchFn, bekleFn: bekle, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [adayHat(1)], hatalar: [] } });
  assert.equal(o.yayinlanan, 1); assert.equal(bulut.k.yayinlar[0].g, null); assert.equal(o.gorselSureAsim, 1);
  assert.ok(!fetchFn.cagrilar.some((u) => u.includes("wikidata")), "görsel araması yapılmadı");
  assert.match(ozetSatiri(o), / gorselSureAsim=1 /);
  // gorselsizUst aşılmışsa bekliyor_gorsel (eski kural)
  const bulut2 = bulutKur();
  const o2 = await turCalistir({ ayar: ayarHat({ gorselTurSureSn: 0, gorselsizYayin: true, gorselsizUst: 0 }), kaynaklar: {}, bulut: bulut2, model, fetchFn, bekleFn: bekle, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [adayHat(2)], hatalar: [] } });
  assert.equal(o2.yayinlanan, 0); assert.equal(o2.bekleyenGorsel, 1);
});

test("özet satırı: görsel alanları yoksa eski satır değişmez", () => {
  const o = { aday: 1, yeniAday: 1, onElemeGecen: 1, elenen: 0, bekleyenGorsel: 0, bekleyenKaynak: 0, yayinlanan: 1, kota: 0, sureSn: 3, durus: "tamam", modelCagri: 2, red: {}, redKodlari: {} };
  assert.doesNotMatch(ozetSatiri(o), /gorselTur|gorselSure/);
  assert.match(ozetSatiri({ ...o, gorselTur: { kisi: 1, mekan: 2, kaynak: 1 }, gorselSureMs: 41_400, gorselSureAsim: 2 }), / gorselTur=kisi:1,mekan:2,kaynak:1 gorselSure=41s gorselSureAsim=2/);
});

test("commonsDosyalari: svg yalnız izinliyse (logo) alınır; jpeg/png normal", async () => {
  const f = sahteFetch(DUNYA);
  assert.equal((await commonsDosyalari(["Design Museum wordmark.svg"], { fetchFn: f })).length, 0);
  assert.equal((await commonsDosyalari(["Design Museum wordmark.svg"], { fetchFn: f, svgIzin: true, ek: true })).length, 1);
  assert.equal((await commonsDosyalari(["Es Devlin in Studio.jpg"], { fetchFn: f })).length, 1);
});

test("yer çelişkisi: Turkey/Türkiye aynı yer sayılır (haberde Türkiye, dosyada Turkey); başka ülke hâlâ çelişki", async () => {
  const { yerCelisiyor } = await import("../lib/gorsel.mjs");
  assert.equal(yerCelisiyor({ metin: "Science hall, Ankara, Turkey" }, "Ankara Türkiye fair"), "");
  assert.equal(yerCelisiyor({ metin: "Science hall, Ankara, Turkey" }, "Ankara fair, Turkey"), "");
  assert.notEqual(yerCelisiyor({ metin: "Science hall, Berlin, Germany" }, "Ankara Türkiye fair"), "");
});
