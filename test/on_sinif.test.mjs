// Toplu ön sınıflandırma: istem/ayrıştırma, yeniden deneme + yedek yol, sıralama, hat entegrasyonu, çağrı bütçesi ve özet satırı. Ağ yok; model taklit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ayarOku } from "../lib/ayar.mjs";
import { KotaDoldu, ModelHatasi } from "../lib/model.mjs";
import { ON_SINIF_ISTEM, diziAyikla, nedenKodu, onSinifAsamasi, onSinifGirdi, onSinifKarar, onSinifOzetMetni, onSinifla, sonuclariDogrula } from "../lib/on_sinif.mjs";
import { girdiHazirla } from "../lib/yaz.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";

const SIMDI = Date.parse("2026-10-13T12:00:00Z");
const yanit = (dizi) => ({ metin: JSON.stringify(dizi), engellendi: "" });
const adaylar = (n, ek = {}) => Array.from({ length: n }, (_, i) => ({ baslik: `Baslik ${i + 1}`, ozet: "Kisa ozet. ".repeat(40), kaynak: "goodnewsnetwork.org", dil: "en", onPuan: 50 - i, ...ek }));

test("girdi: numaralı satırlar, özet en çok 300 karakter, satır sonu ve ayırıcı temizlenir", () => {
  const g = onSinifGirdi([{ baslik: "A | B\nC", ozet: "x".repeat(900), kaynak: "pozitif.org", dil: "tr", alan: "spor" }, { baslik: "D", ozet: "", kaynak: "k", dil: "en" }]).split("\n");
  assert.equal(g.length, 2);
  const [no, dil, alan, kaynak, baslik, ozet] = g[0].split("|");
  assert.deepEqual([no, dil, alan, kaynak, baslik], ["1", "TR", "spor", "pozitif.org", "A / B C"]);
  assert.equal(ozet.length, 300);
  assert.match(g[1], /^2\|EN\|-\|k\|D\|$/);
  assert.match(ON_SINIF_ISTEM, /SADECE JSON dizisi/);
});

test("diziAyikla: çit, dış metin, sarmalayıcı, sondaki virgül, dize içi satır sonu; bozuksa null", () => {
  assert.equal(diziAyikla('```json\n[{"i":1,"uygun":true}]\n```').length, 1);
  assert.equal(diziAyikla('Tamam: [{"i":1,"uygun":true},{"i":2,"uygun":false,},]').length, 2);
  assert.equal(diziAyikla('{"sonuc":[{"i":1,"uygun":true}]}').length, 1);
  assert.equal(diziAyikla('[{"i":1,"neden":"a\nb"}]').length, 1);
  assert.equal(diziAyikla("hiç json yok"), null);
  assert.equal(diziAyikla('[{"i":1,'), null);
});

test("sonuclariDogrula: geçersiz öğeler atlanır, puan sıkıştırılır, neden koda iner, yarıdan azı geçerliyse null", () => {
  const m = sonuclariDogrula([{ i: 1, uygun: true, puan: 14, alan: "doga", neden: "ok" }, { i: 2, uygun: false, puan: 9, alan: "yok", neden: "Liste yazısı" }, { i: 2, uygun: true }, { i: 9, uygun: true }, { i: 3, uygun: "evet" }, { i: 4, uygun: true, puan: "x" }], 4);
  assert.deepEqual(m.get(1), { uygun: true, puan: 10, alan: "doga", neden: "ok" });
  assert.deepEqual(m.get(2), { uygun: false, puan: 0, alan: "", neden: "liste" });
  assert.equal(m.get(4).puan, 5);                                                  // sayı değil: uygunsa orta puan
  assert.equal(m.has(3) || m.has(9), false);
  assert.equal(sonuclariDogrula([{ i: 1, uygun: true, puan: 8 }], 4), null);
  assert.equal(nedenKodu("Siyasi içerik"), "siyaset");
  assert.equal(nedenKodu("tavsiye / ipucu"), "liste");
  assert.equal(nedenKodu("bilinmeyen başlık parçası"), "diger");
});

test("onSinifKarar: uygun değil, eşik altı, geçen, yanıtsız", () => {
  assert.deepEqual(onSinifKarar({ uygun: false, puan: 0, alan: "", neden: "siyaset" }, 6), { gec: false, neden: "siyaset" });
  assert.deepEqual(onSinifKarar({ uygun: true, puan: 5, alan: "doga", neden: "ok" }, 6), { gec: false, neden: "dusuk-puan" });
  assert.equal(onSinifKarar({ uygun: true, puan: 6, alan: "doga", neden: "ok" }, 6).gec, true);
  assert.equal(onSinifKarar(undefined, 6).gec, true);
});

test("onSinifla: bozuk JSON'da bir kez yeniden dener; iki kez bozuksa basarisiz (2 çağrı); hata da aynı", async () => {
  let n = 0;
  const iyi = [{ i: 1, uygun: true, puan: 7, alan: "doga", neden: "ok" }, { i: 2, uygun: false, puan: 0, neden: "reklam" }, { i: 3, uygun: true, puan: 8, alan: "bilim", neden: "ok" }];
  const r1 = await onSinifla({ yaz: async () => (++n === 1 ? { metin: "bozuk {", engellendi: "" } : yanit(iyi)) }, adaylar(3));
  assert.equal(r1.durum, "ok"); assert.equal(r1.cagri, 2); assert.equal(r1.sonuc.size, 3);
  const r2 = await onSinifla({ yaz: async () => ({ metin: "hiç", engellendi: "" }) }, adaylar(3));
  assert.deepEqual([r2.durum, r2.cagri], ["basarisiz", 2]);
  const r3 = await onSinifla({ yaz: async () => { throw new ModelHatasi("HTTP 500"); } }, adaylar(3));
  assert.deepEqual([r3.durum, r3.cagri], ["basarisiz", 2]);
  const r4 = await onSinifla({ yaz: async () => ({ metin: "", engellendi: "SAFETY" }) }, adaylar(3));
  assert.equal(r4.durum, "basarisiz");
  await assert.rejects(onSinifla({ yaz: async () => { throw new KotaDoldu("429"); } }, adaylar(3)), (e) => e instanceof KotaDoldu && e.cagri === 1);
});

test("onSinifAsamasi: eler, puana göre sıralar, dokunulmazlar başta, kuyruk ve yanıtsızlar sonda; özet sayıları", async () => {
  const a = adaylar(8);
  a[0].dokun = true;                                                              // saklı yük gibi: sınıflanmaz
  const model = { yaz: async (_s, g) => {
    assert.equal(g.split("\n").length, 4);                                        // adet=4: dokunulmaz hariç ilk 4
    return yanit([{ i: 1, uygun: true, puan: 6, alan: "doga", neden: "ok" }, { i: 2, uygun: false, puan: 0, neden: "liste" }, { i: 3, uygun: true, puan: 9, alan: "bilim", neden: "ok" }]);   // 4. aday yanıtsız
  } };
  const s = await onSinifAsamasi({ model, islenecek: a, adet: 4, esik: 6, dokunma: (x) => x.dokun, alanArdaArdaUst: 2 });
  assert.deepEqual(s.sirali.map((x) => x.baslik), ["Baslik 1", "Baslik 4", "Baslik 2", "Baslik 5", "Baslik 6", "Baslik 7", "Baslik 8"]);
  assert.deepEqual(s.elenenler.map((e) => [e.aday.baslik, e.neden]), [["Baslik 3", "liste"]]);
  assert.deepEqual(s.ozet, { durum: "ok", sorulan: 4, gecen: 2, red: { liste: 1 }, cagri: 1 });
  assert.equal(s.sirali[1].onSinif.puan, 9);
  assert.equal(onSinifOzetMetni(s.ozet), " onSinif=2/4 onSinifRed=liste:1");
});

test("onSinifAsamasi: az aday ya da kapalı = çağrı yok; başarısızlık = sınıflandırmasız eski sıra", async () => {
  const cagrilar = [];
  const model = { yaz: async () => { cagrilar.push(1); return { metin: "hayır", engellendi: "" }; } };
  assert.equal((await onSinifAsamasi({ model, islenecek: adaylar(2), adet: 24, esik: 6 })).ozet.durum, "kapali");
  assert.equal((await onSinifAsamasi({ model, islenecek: adaylar(9), adet: 0, esik: 6 })).ozet.durum, "kapali");
  assert.equal(cagrilar.length, 0);
  const a = adaylar(5);
  const s = await onSinifAsamasi({ model, islenecek: a, adet: 24, esik: 6 });
  assert.equal(s.ozet.durum, "yedek"); assert.equal(s.ozet.cagri, 2); assert.deepEqual(s.sirali, a); assert.equal(s.elenenler.length, 0);
  assert.equal(onSinifOzetMetni(s.ozet), " onSinif=yedek");
  assert.equal(onSinifOzetMetni({ durum: "kapali" }), "");
});

test("yazım istemi: ön sınıftan geçen adayda ipucu satırı var, uygun=false emniyeti duruyor; geçmeyende yok", () => {
  const g = girdiHazirla({ baslik: "B", ozet: "O", dil: "en", onSinif: { puan: 8 } }, "");
  assert.match(g, /ÖN SINIF: uygun bulundu \(puan 8\/10\)/);
  assert.match(g, /ihlal varsa uygun=false/);
  assert.doesNotMatch(girdiHazirla({ baslik: "B", ozet: "O", dil: "en" }, ""), /ÖN SINIF/);
});

// ---------------- hat entegrasyonu ----------------
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const YAZIM_YANITI = JSON.stringify({ uygun: true, kategori: "doga", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const KONULAR = ["Volunteers plant thousands of trees beside Lakeside river", "Students build solar lantern library for village school", "Rescued hedgehog colony returns healthy to meadow", "Retired teachers teach coding to neighborhood children",
  "Young swimmer breaks regional record with homemade goggles", "Bakery shares free bread with night shift nurses", "Scientists grow coral nursery along restored reef", "Choir of grandparents records album for local hospital", "Cyclists collect thousands of books for rural libraries", "Garden club turns empty lot into butterfly meadow"];
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, turBasinaEn: 20, gorselsizUst: 20, ...ek });
const mk = (n, ek = {}) => ({ baslik: KONULAR[n], ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/h/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-13T08:00:00Z", ...ek });
const fetchFn = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
function sahteBulut(onceki = new Map()) {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => onceki, isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet) => { k.yayinlar.push({ h, ozet }); return { durum: "eklendi" }; } };
}
/** Taklit model: sınıflandırma çağrısında (sistem = ON_SINIF_ISTEM) kararı `karar(baslik)` verir, yazım çağrısında YAZIM_YANITI döner. */
function taklitModel(karar) {
  const k = { sinif: 0, yazim: 0, yazilan: [] };
  return { k, yaz: async (sistem, girdi) => {
    if (sistem === ON_SINIF_ISTEM) {
      k.sinif++;
      return yanit(girdi.split("\n").map((s) => { const [i, , , , baslik] = s.split("|"); const d = karar(baslik); return { i: Number(i), uygun: d.uygun, puan: d.puan ?? 0, alan: "doga", neden: d.neden || "ok" }; }));
    }
    k.yazim++; k.yazilan.push(girdi.match(/BAŞLIK: (.*)/)[1]);
    return { metin: YAZIM_YANITI, engellendi: "" };
  } };
}
const tur = (model, adaylarListesi, ayarEk = {}, bulut = sahteBulut()) => turCalistir({ ayar: ayar(ayarEk), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: adaylarListesi, hatalar: [] } }).then((o) => ({ o, bulut }));

test("hat: ön sınıf eleneni YAZMA çağrısı harcamaz, elendi:on-sinif:<neden> işaretlenir, geçenler puana göre yazılır", async () => {
  const model = taklitModel((b) => /Bakery|Choir|Cyclists/.test(b) ? { uygun: false, neden: "reklam" } : /hedgehog/.test(b) ? { uygun: true, puan: 3 } : { uygun: true, puan: /Scientists/.test(b) ? 9 : 7 });
  const { o, bulut } = await tur(model, KONULAR.slice(0, 9).map((_, i) => mk(i)));
  assert.equal(model.k.sinif, 1);
  assert.equal(model.k.yazim, 5);                                                 // 9 aday - 3 uygun değil - 1 düşük puan = 5 yazım (sınıfsız 9 olurdu)
  assert.match(model.k.yazilan[0], /Scientists/);                                // en yüksek puan önce
  assert.equal(o.modelCagri, 1 + 5);                                             // sınıflandırma çağrısı bütçeye 1 sayılır
  assert.deepEqual(o.onSinif, { durum: "ok", sorulan: 9, gecen: 5, red: { reklam: 3, "dusuk-puan": 1 }, cagri: 1 });
  const elendi = bulut.k.isaretler.filter((x) => x.durum === "elendi").map((x) => x.neden).sort();
  assert.deepEqual(elendi, ["on-sinif:dusuk-puan", "on-sinif:reklam", "on-sinif:reklam", "on-sinif:reklam"]);
  assert.equal(o.haberYayin, 5);
  const satir = ozetSatiri(o);
  assert.match(satir, / onSinif=5\/9 onSinifRed=reklam:3,dusuk-puan:1 /);
  assert.match(satir, / cagriBasinaYayin=0\.83 /);                                // 5 yayın / 6 çağrı
  assert.ok(!satir.includes("Bakery"));                                           // başlık günlüğe girmez
});

test("hat: sınıflandırma çağrısı bozuksa 2 çağrı harcanır, sınıflandırmasız eski yolla yazım sürer (tur kırılmaz)", async () => {
  let sinif = 0, yazim = 0;
  const model = { yaz: async (sistem) => { if (sistem === ON_SINIF_ISTEM) { sinif++; return { metin: "bozuk", engellendi: "" }; } yazim++; return { metin: YAZIM_YANITI, engellendi: "" }; } };
  const { o } = await tur(model, KONULAR.slice(0, 5).map((_, i) => mk(i)));
  assert.equal(sinif, 2); assert.equal(yazim, 5);
  assert.equal(o.onSinif.durum, "yedek");
  assert.equal(o.modelCagri, 2 + 5);
  assert.equal(o.durus, "tamam");
  assert.match(ozetSatiri(o), / onSinif=yedek /);
});

test("hat: ON_SINIF_ADET=0 kapalı (çağrı yok); adet sınırı: yalnız ilk N aday sorulur, kuyruk eskisi gibi işlenir", async () => {
  const kapali = taklitModel(() => ({ uygun: true, puan: 8 }));
  const r0 = await tur(kapali, KONULAR.slice(0, 5).map((_, i) => mk(i)), { onSinifAdet: 0 });
  assert.equal(kapali.k.sinif, 0); assert.equal(kapali.k.yazim, 5); assert.equal(r0.o.onSinif.durum, "kapali");
  assert.doesNotMatch(ozetSatiri(r0.o), /onSinif=/);
  const gorulen = [];
  const m = { yaz: async (sistem, girdi) => { if (sistem === ON_SINIF_ISTEM) { gorulen.push(girdi.split("\n").length); return yanit(girdi.split("\n").map((s) => ({ i: Number(s.split("|")[0]), uygun: true, puan: 7, alan: "doga", neden: "ok" }))); } return { metin: YAZIM_YANITI, engellendi: "" }; } };
  const r1 = await tur(m, KONULAR.slice(0, 6).map((_, i) => mk(i)), { onSinifAdet: 4 });
  assert.deepEqual(gorulen, [4]);
  assert.equal(r1.o.onSinif.sorulan, 4);
  assert.equal(r1.o.haberYayin, 6);                                              // kuyruktaki 2 aday da yazılır
});

test("hat: saklı yüklü bekleyen sınıflandırmaya girmez ve modelsiz yayınlanır; sınıflandırma onun bütçesini yemez", async () => {
  const yuk = { id: "habsakli", tr: { baslik: "Saklı haber", ozet: TR }, en: { baslik: "Stored story", ozet: EN }, kategori: "doga", yer: "Dünya", kaynak: "goodnewsnetwork.org", link: "https://www.goodnewsnetwork.org/h/0", zaman: "2026-10-13T08:00:00Z", model: "m" };
  const hash0 = (await import("../lib/rss.mjs")).baglantiOzeti("https://www.goodnewsnetwork.org/h/0");
  const onceki = new Map([[hash0, { ozet: hash0, durum: "bekliyor_gorsel", deneme: 1, yuk }]]);
  const sorulan = [];
  const model = { yaz: async (sistem, girdi) => { if (sistem === ON_SINIF_ISTEM) { sorulan.push(girdi); return yanit(girdi.split("\n").map((s) => ({ i: Number(s.split("|")[0]), uygun: true, puan: 7, alan: "doga", neden: "ok" }))); } return { metin: YAZIM_YANITI, engellendi: "" }; } };
  const { o, bulut } = await tur(model, KONULAR.slice(0, 4).map((_, i) => mk(i)), {}, sahteBulut(onceki));
  assert.equal(sorulan.length, 1);
  assert.equal(sorulan[0].split("\n").length, 3);                                // 4 aday - 1 saklı yük
  assert.ok(!sorulan[0].includes(KONULAR[0]));
  assert.equal(o.bekleyenYayin, 1);
  assert.equal(bulut.k.yayinlar.length, 4);
});

test("hat: MODEL_CAGRI_UST sınıflandırma çağrısını da içerir", async () => {
  const model = taklitModel(() => ({ uygun: true, puan: 8 }));
  const { o } = await tur(model, KONULAR.slice(0, 8).map((_, i) => mk(i)), { modelCagriUst: 4 });
  assert.equal(model.k.sinif, 1);
  assert.equal(model.k.yazim, 3);                                                // 4 - 1 (sınıf) = 3 yazım
  assert.equal(o.modelCagri, 4);
  assert.equal(o.durus, "cagri-siniri");
});

test("hat: sınıflandırmada 429 = tur zarifçe biter (durus=kota), yazım çağrısı yapılmaz", async () => {
  let yazim = 0;
  const model = { yaz: async (sistem) => { if (sistem === ON_SINIF_ISTEM) throw new KotaDoldu("429"); yazim++; return { metin: YAZIM_YANITI, engellendi: "" }; } };
  const { o } = await tur(model, KONULAR.slice(0, 5).map((_, i) => mk(i)));
  assert.equal(o.durus, "kota"); assert.equal(yazim, 0); assert.equal(o.modelCagri, 1);
});
