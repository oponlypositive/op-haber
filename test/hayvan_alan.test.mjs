// "Hayvanlar" alanı (sezgi alanı): başlık/özet sezgisi, alan kotası, ön sınıflandırmada rezerv slot, olumsuz süzgeçte dar istisna. Ağ yok; model taklit.
// Arka plan: canlı simülasyon 2026-10-14: 1623 aday, hayvan başlıklı 13, ön sınıflandırmaya giren ilk 24'te 0 (hayvanlar alan değildi: kota ve rezerv yoktu).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALANLAR, alanKalan, alanOnEleme, hayvanMi, kotaAyristir } from "../lib/alanlar.mjs";
import { onEleme } from "../lib/on_eleme.mjs";
import { ON_SINIF_ISTEM, onSinifAsamasi, rezervliParti } from "../lib/on_sinif.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { onPuan, ozetSatiri, turCalistir } from "../hat.mjs";

test("hayvanMi: hayvan adı/işareti taşıyan haber evet; takım adı, hayvan geçmeyen, tek geçen belirsiz ad hayır", () => {
  const e = ["Rescued puppies find new homes after shelter appeal", "Sea turtle hatchlings released on the beach", "Wildlife sanctuary welcomes a newborn panda cub", "Yaralı bulunan baykuş iyileşti ve doğaya salındı", "Barınaktaki köpekler sahiplenildi", "Kedi yavruları kurtarıldı", "Zoo celebrates birth of baby giraffe"];
  for (const b of e) assert.equal(hayvanMi({ baslik: b, ozet: "" }), true, b);
  const h = ["Fenerbahçe beat Zalgiris 99-80", "Galatasaray Lions win the cup", "Philadelphia Eagles win again", "Students build solar lantern library", "Fox News anchor retires", "Photographer wins prize", "Tiger Woods returns to the course"];
  for (const b of h) assert.equal(hayvanMi({ baslik: b, ozet: "" }), false, b);
  assert.equal(hayvanMi({ baslik: "Photographer wins prize", ozet: "A photo of a bird in a meadow was praised." }), false);   // özette tek hayvan adı, başlıkta işaret yok
  assert.equal(hayvanMi({ baslik: "Meadow project", ozet: "Volunteers counted birds and a hedgehog family near the river." }), true);   // özette 2 farklı hayvan adı
});

test("hayvanlar alanı: tanımlı, sezgi alanı, varsayılan günlük kota 3, ALAN_KOTALARI ile değişir", () => {
  assert.equal(ALANLAR.hayvanlar.sezgi, true); assert.equal(ALANLAR.hayvanlar.kategori, "hayvanlar");
  const k = kotaAyristir("");
  assert.equal(k.hayvanlar, 3); assert.equal(kotaAyristir("hayvanlar:5").hayvanlar, 5);
  assert.equal(alanKalan(k, new Map([["hayvanlar", { son24: 2 }]])).hayvanlar, 1);
  assert.equal(ayarOku({}, []).alanKotalari.hayvanlar, 3);
});

test("olumsuz süzgeç GEVŞEMEDİ: ölüm, saldırı, istismar, av elenir; olumlu sonuçlu kurtarma/iyileşme geçer", () => {
  const ok = (b, o = "") => alanOnEleme({ alan: "hayvanlar", baslik: b, ozet: o });
  // geçmesi gerekenler: olumlu sonuçlu kurtarma haberlerinin "yaralı", "sel", "kaza" gibi yumuşak sözcükleri
  for (const [b, o] of [["Rescued kitten recovers after being found injured", "Volunteers nursed the kitten back to health."], ["Dog rescued from flood reunited with family", ""], ["Saved from the wildfire, koala joey is healing", ""],
    ["Yaralı bulunan baykuş iyileşti ve doğaya salındı", ""], ["Selden kurtarılan köpek ailesine kavuştu", ""], ["Sea turtle hatchlings released on beach", ""], ["Köpek yavruları kurtarıldı", ""]]) {
    assert.equal(ok(b, o).ok, true, `${b}: ${ok(b, o).neden}`);
  }
  // elenmesi gerekenler (aynen)
  for (const [b, o] of [["Elephant calf dies at zoo", ""], ["Rescued dog dies after surgery", ""], ["Dog attacks child, injured", ""], ["Rescued dogs recovering after abuse case", ""], ["Poachers arrested as rhino numbers rise", ""], ["Injured puppy found dead in river", ""],
    ["Hunters kill bear in forest", ""], ["Köpek saldırısında çocuk yaralandı", ""], ["Kedi kazada öldü", ""], ["Trophy hunting season opens for lions and elephants", ""], ["Kaçak avcılar fil öldürdü", ""]]) {
    assert.equal(ok(b, o).ok, false, b);
  }
  // yumuşak istisna YALNIZ hayvanlar alanı + olumlu sonuç: diğer alanlarda ve sonuçsuz haberde süzgeç aynı
  assert.equal(alanOnEleme({ alan: "spor", baslik: "Team won the cup after the flood", ozet: "" }).ok, false);
  assert.equal(ok("Puppy injured in crash").ok, false);
  // tam ön eleme zinciri (hassas/konu yasağı dahil): tipik kurtarma haberi geçer
  const simdi = Date.parse("2026-10-14T12:00:00Z"), zaman = "2026-10-14T06:00:00Z";
  assert.equal(onEleme({ alan: "hayvanlar", baslik: "Rescued kitten recovers after being found injured", ozet: "Volunteers nursed the kitten back to health.", zaman }, { simdi }).ok, true);
  assert.equal(onEleme({ alan: "hayvanlar", baslik: "Elephant calf dies at zoo", ozet: "", zaman }, { simdi }).ok, false);
});

test("rezervliParti: ilk adet'e girmeyen hayvan adayları kuyruktan çekilir, yer için partinin sonundaki hayvan-dışı adaylar kuyruğa döner", () => {
  const havuz = [...Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, alan: "bilim" })), { id: "h1", alan: "hayvanlar" }, { id: "d6" }, { id: "h2", alan: "hayvanlar" }, { id: "h3", alan: "hayvanlar" }];
  const { parti, kuyruk } = rezervliParti(havuz, 4, { hayvanlar: 2 });
  assert.deepEqual(parti.map((a) => a.id), ["d0", "d1", "h1", "h2"]);                                  // d3, d2 yer açtı
  assert.deepEqual(kuyruk.map((a) => a.id), ["d2", "d3", "d4", "d5", "d6", "h3"]);
  assert.equal(parti.length + kuyruk.length, havuz.length);
  // rezerv yok / zaten yeterli / hayvan adayı yok: hiçbir şey değişmez
  assert.deepEqual(rezervliParti(havuz, 4, {}).parti.map((a) => a.id), ["d0", "d1", "d2", "d3"]);
  assert.deepEqual(rezervliParti(havuz, 9, { hayvanlar: 2 }).parti.map((a) => a.id), havuz.slice(0, 9).map((a) => a.id));
  assert.deepEqual(rezervliParti(havuz.filter((a) => a.alan !== "hayvanlar"), 4, { hayvanlar: 2 }).parti.map((a) => a.id), ["d0", "d1", "d2", "d3"]);
  assert.equal(rezervliParti(havuz, 2, { hayvanlar: 5 }).parti.filter((a) => a.alan === "hayvanlar").length, 2);   // parti kadar (rezerv slot sayısı parti boyunu aşmaz)
});

test("onSinifAsamasi: rezerv=2 ile hayvan adayları ilk 24'e girer; rezervsiz girmez", async () => {
  const adaylar = Array.from({ length: 40 }, (_, i) => ({ baslik: `Baslik ${i + 1}`, ozet: "Kisa ozet. ".repeat(40), kaynak: "k", dil: "en", onPuan: 100 - i, alan: i >= 25 && i < 28 ? "hayvanlar" : undefined }));
  const sor = async (rezerv) => {
    let girdi = "";
    const model = { yaz: async (sistem, g) => { girdi = g; return { metin: JSON.stringify(g.split("\n").map((s) => ({ i: Number(s.split("|")[0]), uygun: true, puan: 7, alan: "doga", neden: "ok" }))), engellendi: "" }; } };
    const s = await onSinifAsamasi({ model, islenecek: adaylar, adet: 24, esik: 6, rezerv });
    return { hayvan: girdi.split("\n").filter((l) => l.split("|")[2] === "hayvanlar").length, sorulan: s.ozet.sorulan, sirali: s.sirali.length };
  };
  assert.deepEqual(await sor({}), { hayvan: 0, sorulan: 24, sirali: 40 });
  assert.deepEqual(await sor({ hayvanlar: 2 }), { hayvan: 2, sorulan: 24, sirali: 40 });
  assert.equal(ON_SINIF_ISTEM.includes("hayvanlar"), true);                                               // model alan listesinde hayvanlar zaten var
});

// ---------------- hat entegrasyonu ----------------
const SIMDI = Date.parse("2026-10-14T12:00:00Z");
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const YAZIM = JSON.stringify({ uygun: true, kategori: "doga", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const SOZ = ["Quonvale", "Brelmont", "Tazmire", "Holvane", "Pridwick", "Sornelle", "Ymberg", "Draskov", "Fennimar", "Kolvade", "Mirenth", "Ostrava", "Pelvane", "Ruskin", "Telmore", "Ulvedal", "Vastrel", "Wendrow", "Xanthe", "Yorvik", "Zelmar", "Arvidal", "Borrowdale", "Cindrel", "Dovrefjell", "Elmstead", "Falkirth", "Garnwick", "Hollinger", "Ingrebourne"];
const NESNE = ["library", "bridge", "bakery", "choir", "garden", "workshop", "orchard", "theatre", "school", "market", "clinic", "museum", "lantern", "harbor", "greenhouse", "pavilion", "railway", "fountain", "stadium", "observatory", "pottery", "cinema", "nursery", "mill", "tower", "studio", "terrace", "wharf", "cellar", "gallery"];
const genel = (i) => ({ alan: ["bilim", "sanat", "teknoloji"][i % 3], baslik: `${SOZ[i]} locals reopen the ${NESNE[i]}`, ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/g/${i}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-14T09:00:00Z" });
const HAYVANLAR = ["Rescued puppies find new homes after shelter appeal", "Sea turtle hatchlings released on the beach at dawn", "Wildlife sanctuary welcomes a newborn panda cub"];
const hayvan = (i) => ({ baslik: HAYVANLAR[i], ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/h/${i}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-14T01:00:00Z" });
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ozelAcik: false, turBasinaEn: 20, gorselsizUst: 20, ...ek });
const fetchFn = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
const bulutKur = (kota) => { const k = { yayin: [] }; return { k, kota: async () => kota || new Map(), bilinenler: async () => new Map(), isaretle: async () => ({}), yayinla: async (h) => { k.yayin.push(h); return { durum: "eklendi" }; } }; };
function modelKur() {
  const k = { sinifGirdi: "", yazilan: [] };
  return { k, yaz: async (sistem, girdi) => {
    if (sistem === ON_SINIF_ISTEM) { k.sinifGirdi = girdi; return { metin: JSON.stringify(girdi.split("\n").map((s) => ({ i: Number(s.split("|")[0]), uygun: true, puan: 7, alan: "doga", neden: "ok" }))), engellendi: "" }; }
    k.yazilan.push(/BAŞLIK: (.*)/.exec(girdi)?.[1] || ""); return { metin: YAZIM, engellendi: "" };
  } };
}
const calis = (bulut, model, adaylar, ayarEk = {}) => turCalistir({ ayar: ayar({ onSinifAdet: 24, ...ayarEk }), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar, hatalar: [] } });
const hayvanSatir = (girdi) => girdi.split("\n").filter((l) => l.split("|")[2] === "hayvanlar").length;

test("hat: hayvan haberleri etiketlenir; ön puanda geride kalsalar da ön sınıfta en az 2 slotları vardır (HAYVAN_REZERV)", async () => {
  const adaylar = [...Array.from({ length: 30 }, (_, i) => genel(i)), ...HAYVANLAR.map((_, i) => hayvan(i))];
  const m1 = modelKur();
  const o1 = await calis(bulutKur(), m1, adaylar);
  assert.equal(o1.hayvanAday, 3);
  assert.equal(o1.onSinif.sorulan, 24);
  assert.ok(hayvanSatir(m1.k.sinifGirdi) >= 2, `ön sınıfta hayvan satırı: ${hayvanSatir(m1.k.sinifGirdi)}`);
  assert.match(ozetSatiri(o1), / hayvanAday=3 /);
  const m0 = modelKur();
  const o0 = await calis(bulutKur(), m0, adaylar, { hayvanRezerv: 0 });                              // rezerv kapalı: hayvanlar ön puanda geride, ilk 24'e giremez (eski davranış)
  assert.equal(hayvanSatir(m0.k.sinifGirdi), 0);
  assert.equal(o0.hayvanAday, 3);
});

test("hat: hayvanlar günlük kotası (son 24 saat) dolunca hayvan adayı işlenmez; kota boşken yazılır ve kategori hayvanlar yayınlanır", async () => {
  const model = modelKur(), bulut = bulutKur();
  const a = Array.from({ length: 3 }, (_, i) => hayvan(i));
  await calis(bulut, model, a, { onSinifAdet: 0 });
  assert.ok(model.k.yazilan.length >= 1);                                                              // kota boş: model çağrıldı
  const model2 = modelKur(), bulut2 = bulutKur(new Map([["hayvanlar", { son24: 3, son7g: 3, sonZaman: "2026-10-14T10:00:00Z" }]]));
  const o2 = await calis(bulut2, model2, a, { onSinifAdet: 0 });
  assert.equal(model2.k.yazilan.length, 0); assert.equal(o2.yayinlanan, 0);                            // kota dolu: model çağrılmaz
});

test("onPuan: hayvan sezgisiyle etiketlenen güvenilir kaynak adayı iyi-haber siteleri puanını korur", () => {
  const taban = { kaynakGuvenilir: true, ozet: "x".repeat(300), zaman: "2026-10-14T11:00:00Z" };
  const p = (ek) => onPuan({ ...taban, ...ek }, { simdi: SIMDI });
  assert.equal(p({ alan: "hayvanlar", hayvanSezgi: true }), p({}));
  assert.ok(p({ alan: "spor" }) < p({}));
});
