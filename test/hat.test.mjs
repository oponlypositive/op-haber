import { test } from "node:test";
import assert from "node:assert/strict";
import { ayarOku } from "../lib/ayar.mjs";
import { baglantiOzeti } from "../lib/rss.mjs";
import { yayinYuku, bulutKur } from "../lib/bulut.mjs";
import { KotaDoldu } from "../lib/model.mjs";
import { turCalistir } from "../hat.mjs";

const SIMDI = Date.parse("2026-10-13T12:00:00Z");
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const MODEL_YANITI = JSON.stringify({ uygun: true, kategori: "doga", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const KONULAR = ["Volunteers plant thousands of trees beside Lakeside river", "Students build solar lantern library for village school", "Rescued hedgehog colony returns healthy to meadow", "Retired teachers teach coding to neighborhood children", "Young swimmer breaks regional record with homemade goggles", "Bakery shares free bread with night shift nurses", "Scientists grow coral nursery along restored reef", "Choir of grandparents records album for local hospital", "Cyclists collect thousands of books for rural libraries", "Garden club turns empty lot into butterfly meadow", "Robotics club wins national award with recycling robot", "Fishermen rescue stranded dolphin calf near harbor", "Painters decorate children ward corridors", "Teen inventor designs low cost water filter"];
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, ...ek });
const aday = (n, ek = {}) => ({ baslik: KONULAR[n % KONULAR.length] + ` (${n})`, ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/h/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-13T08:00:00Z", ...ek });

function sahteBulut(onceki = new Map()) {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => onceki, isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; },
    yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } };
}
// sayfa isteği 404 döner (özet yeterli), görsel aramaları taklit edilir
const fetchFn = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
const GORSEL = { sonuc: { gorsel: { sahibi: "X", lisans: "CC BY 4.0", lisans_url: "https://creativecommons.org/licenses/by/4.0/", kaynak_url: "https://commons.wikimedia.org/x", saglayici: "wikimedia" }, b64: "AAAA", tur: "image/jpeg" }, notlar: [] };

test("ayar: varsayılanlar", () => {
  const a = ayarOku({}, ["--kuru"]);
  assert.equal(a.kuru, true);
  assert.equal(a.turBasinaEn, 4);
  assert.equal(a.gorselsizYayin, false);
  assert.equal(a.geminiModel, "gemini-3.5-flash-lite");
  assert.ok(a.guvenilir.includes("positive.news"));
  assert.equal(ayarOku({ GORSELSIZ_YAYIN: "1", TUR_BASINA_EN: "" }, []).gorselsizYayin, true);
});

test("yayın yükü sözleşmesi", () => {
  const h = { id: "habc", tr: { baslik: "t", ozet: "o" }, en: { baslik: "e", ozet: "o" }, kategori: "doga", yer: "Dünya", kaynak: "k", link: "https://a.b/c", zaman: "2026-10-13T08:00:00Z", model: "m" };
  const y = yayinYuku(h, "ab".repeat(32), GORSEL.sonuc);
  assert.equal(y.islem, "yayinla");
  assert.match(y.ozet, /^[0-9a-f]{64}$/);
  assert.equal(y.gorselTur, "image/jpeg");
  assert.equal(y.haber.gorsel.lisans, "CC BY 4.0");
  assert.ok(!("gorselB64" in yayinYuku(h, "ab".repeat(32), null)));
  assert.match(y.haber.id, /^[a-z0-9-]{1,80}$/);
});

test("bulut istemcisi: anahtar başlıkta, 401'de tekrar yok, bilinenler haritası", async () => {
  const cagrilar = [];
  const f = async (url, init) => { cagrilar.push(init); return { ok: true, status: 200, json: async () => ({ kayitlar: [{ ozet: "a".repeat(32), durum: "elendi", deneme: 1 }] }) }; };
  const b = bulutKur({ fnUrl: "https://x.supabase.co/functions/v1/haber-yukle", anahtar: "GIZLI", fetchFn: f });
  const h = await b.bilinenler(["a".repeat(32)]);
  assert.equal(h.get("a".repeat(32)).durum, "elendi");
  assert.equal(cagrilar[0].headers["x-haber-anahtari"], "GIZLI");
  assert.doesNotMatch(cagrilar[0].body, /GIZLI/);
  let n = 0;
  const b401 = bulutKur({ fnUrl: "https://x", anahtar: "k", fetchFn: async () => { n++; return { ok: false, status: 401 }; }, bekleFn: async () => {} });
  await assert.rejects(b401.bilinenler(["a".repeat(32)]), /401/);
  assert.equal(n, 1);
});

test("tur: yeni haber yazılır, görselle yayınlanır, yayinlandi işaretlenir", async () => {
  const bulut = sahteBulut(), model = { yaz: async () => ({ metin: MODEL_YANITI, engellendi: "", saglayici: "taklit" }) };
  const tarama = { adaylar: [aday(1)], hatalar: [] };
  // görsel arama taklidi: gorselBul gerçek çağrı yapmasın diye araFn yerine fetch hep başarısız; bu yüzden GORSELSIZ_YAYIN ile yolu dene
  const o = await turCalistir({ ayar: ayar({ gorselsizYayin: true }), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama });
  assert.equal(o.yayinlanan, 1);
  assert.equal(bulut.k.yayinlar[0].g, null);
  assert.equal(bulut.k.yayinlar[0].ozet, baglantiOzeti(aday(1).link));
  assert.equal(bulut.k.isaretler.at(-1).durum, "yayinlandi");
});

test("tur: görsel yoksa bekliyor_gorsel (yük saklanır), deneme sınırında elendi", async () => {
  const model = { yaz: async () => ({ metin: MODEL_YANITI, engellendi: "", saglayici: "taklit" }) };
  const bulut = sahteBulut();
  const o = await turCalistir({ ayar: ayar(), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [aday(2)], hatalar: [] } });
  assert.equal(o.bekleyenGorsel, 1);
  assert.equal(bulut.k.yayinlar.length, 0);
  const kayit = bulut.k.isaretler.at(-1);
  assert.equal(kayit.durum, "bekliyor_gorsel");
  assert.equal(kayit.deneme, 1);
  assert.ok(kayit.yuk.tr.baslik);
  // 3. denemede (varsayılan üst sınır 3) elenir ve model tekrar çağrılmaz
  let cagri = 0;
  const model2 = { yaz: async () => { cagri++; return { metin: "{}", engellendi: "" }; } };
  const onceki = new Map([[baglantiOzeti(aday(2).link), { ozet: baglantiOzeti(aday(2).link), durum: "bekliyor_gorsel", deneme: 2, yuk: { ...kayit.yuk } }]]);
  const bulut2 = sahteBulut(onceki);
  await turCalistir({ ayar: ayar(), kaynaklar: {}, bulut: bulut2, model: model2, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [aday(2)], hatalar: [] } });
  assert.equal(bulut2.k.isaretler.at(-1).durum, "elendi");
  assert.equal(cagri, 0);
});

test("tur: kota dolunca zarifçe biter, sonraki haberler denenmez", async () => {
  const model = { yaz: async () => { throw new KotaDoldu("429"); } };
  const bulut = sahteBulut();
  const log = [];
  const o = await turCalistir({ ayar: ayar(), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: (m) => log.push(m), tarama: { adaylar: [aday(3), aday(4)], hatalar: [] } });
  assert.equal(o.durus, "kota");
  assert.equal(o.modelCagri, 1);
  assert.ok(log.some((m) => /kota/.test(m)));
});

test("tur: görülenler atlanır, hassas haber elenir, güvenilmeyen tek kaynak bekler", async () => {
  const a1 = aday(5), a2 = aday(6, { baslik: "Mayor opens new park for neighbors" }), a3 = aday(7, { link: "https://bilinmeyen.example/h/7", kaynak: "bilinmeyen" });
  const onceki = new Map([[baglantiOzeti(a1.link), { durum: "yayinlandi", deneme: 0 }]]);
  const bulut = sahteBulut(onceki);
  const model = { yaz: async () => { throw new Error("çağrılmamalı"); } };
  const o = await turCalistir({ ayar: ayar(), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [a1, a2, a3], hatalar: [] } });
  assert.equal(o.yeniAday, 2);
  assert.equal(o.elenen, 1);
  assert.equal(o.bekleyenKaynak, 1);
  assert.equal(o.modelCagri, 0);
  assert.ok(bulut.k.isaretler.some((k) => k.durum === "bekliyor_kaynak"));
});

test("tur: tur başına en çok N yeni haber", async () => {
  const model = { yaz: async () => ({ metin: MODEL_YANITI, engellendi: "", saglayici: "t" }) };
  const bulut = sahteBulut();
  const o = await turCalistir({ ayar: ayar({ turBasinaEn: 2, gorselsizYayin: true }), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {},
    tarama: { adaylar: [aday(10), aday(11), aday(12), aday(13)], hatalar: [] } });
  assert.equal(o.yayinlanan, 2);
  assert.equal(o.durus, "tur-siniri");
});

test("kuru mod: model ve yayın çağrılmaz", async () => {
  const bulut = { bilinenler: async () => new Map(), isaretle: async () => { throw new Error("yok"); }, yayinla: async () => { throw new Error("yok"); } };
  const model = { yaz: async () => { throw new Error("yok"); } };
  const o = await turCalistir({ ayar: ayar({ kuru: true }), kaynaklar: {}, bulut, model, fetchFn, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [aday(20)], hatalar: [] } });
  assert.equal(o.durus, "kuru");
  assert.equal(o.ornekBaslik.length, 1);
});
