// Türkiye ağırlığı + Google News arama keşfi + saat dilimi (2026-10-13). Ağsız (sahte fetch + sahte model).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ajansMi, gnewsAdres, gnewsSecimi, kaynaklariTara, rssAyristir, siteListedeMi, zamanCoz, baglantiOzeti } from "../lib/rss.mjs";
import { batchGovdesi, batchYanitiAdres, gnewsBaslikSuzgeci, gnewsCoz, gnewsSayfaSuzgeci, sayfaImzasi } from "../lib/gnews.mjs";
import { kotaEngeli, yerliMi, yerliOnce, yerliRezervi } from "../lib/tr.mjs";
import { dogrulandiMi, onEleme } from "../lib/on_eleme.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { onPuan, turCalistir, ozetSatiri } from "../hat.mjs";

const burasi = dirname(fileURLToPath(import.meta.url));
const kaynaklar = JSON.parse(readFileSync(join(burasi, "..", "kaynaklar.json"), "utf8"));
const SIMDI = Date.parse("2026-10-13T12:00:00Z");

const GN_XML = `<?xml version="1.0"?><rss><channel>
<item><title>Milli yüzücü Avrupa rekorunu kırdı - Sabah</title><link>https://news.google.com/rss/articles/CBMiAAA111?oc=5</link><guid isPermaLink="false">CBMiAAA111</guid><pubDate>Tue, 13 Oct 2026 08:30:00 GMT</pubDate><description>&lt;a href="https://news.google.com/rss/articles/CBMiAAA111?oc=5"&gt;Milli yüzücü Avrupa rekorunu kırdı&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Sabah&lt;/font&gt;</description><source url="https://www.sabah.com.tr">Sabah</source></item>
<item><title>Milli sporcular altın madalya ile döndü - Anadolu Ajansı</title><link>https://news.google.com/rss/articles/CBMiBBB222?oc=5</link><guid isPermaLink="false">CBMiBBB222</guid><pubDate>Tue, 13 Oct 2026 08:00:00 GMT</pubDate><description>x</description><source url="https://www.aa.com.tr">Anadolu Ajansı</source></item>
<item><title>Sergi açıldı ve ziyaretçileri bekliyor - Haberler</title><link>https://news.google.com/rss/articles/CBMiCCC333?oc=5</link><guid isPermaLink="false">CBMiCCC333</guid><pubDate>Tue, 13 Oct 2026 07:00:00 GMT</pubDate><description>x</description><source url="https://www.haberler.com">Haberler</source></item>
<item><title>Üniversiteli gençler yeni robot geliştirdi - Küçük Gazete</title><link>https://news.google.com/rss/articles/CBMiDDD444?oc=5</link><guid isPermaLink="false">CBMiDDD444</guid><pubDate>Tue, 13 Oct 2026 06:00:00 GMT</pubDate><description>x</description><source url="https://www.kucukgazete.example">Küçük Gazete</source></item>
<item><title>Yayıncısız sonuç</title><link>https://news.google.com/rss/articles/CBMiEEE555</link><pubDate>Tue, 13 Oct 2026 06:00:00 GMT</pubDate></item>
</channel></rss>`;
const resp = (metin, ok = true, status = 200) => ({ ok, status, headers: new Headers({ "content-type": "text/xml" }), arrayBuffer: async () => new TextEncoder().encode(metin).buffer, text: async () => metin, json: async () => JSON.parse(metin) });

test("Google News: adres kurulumu, başlıktan yayıncı soneki atılır, asıl yayıncı <source> alanından gelir, özet YOK, kimlik çıkarılır", () => {
  const u = new URL(gnewsAdres("altın madalya kazandı"));
  assert.equal(u.hostname, "news.google.com"); assert.equal(u.searchParams.get("q"), "altın madalya kazandı when:1d"); assert.deepEqual([u.searchParams.get("hl"), u.searchParams.get("gl"), u.searchParams.get("ceid")], ["tr", "TR", "TR:tr"]);
  const l = rssAyristir(GN_XML, { kaynak: "gnews:x", dil: "tr", gnews: true, en: 10 });
  assert.equal(l.length, 4, "yayıncısı bilinmeyen sonuç alınmaz");
  const a = l.find((x) => x.gnewsId === "CBMiAAA111");
  assert.equal(a.baslik, "Milli yüzücü Avrupa rekorunu kırdı"); assert.equal(a.kaynak, "Sabah"); assert.equal(a.kaynakSite, "sabah.com.tr"); assert.equal(a.ozet, ""); assert.equal(a.gnews, true); assert.match(a.link, /news\.google\.com\/rss\/articles\//);
  assert.equal(a.zaman, "2026-10-13T08:30:00.000Z"); assert.equal(a.gorselUrl, "");
});

test("kaynaklariTara + gnews: AJANS (AA/DHA/İHA) ve toplayıcı (haberler.com) sonuçları atılır; güvenilir yayıncı listesi tek kaynakla geçer, diğeri ikinci kaynak bekler", async () => {
  assert.equal(ajansMi("aa.com.tr"), true); assert.equal(ajansMi("www.dha.com.tr"), true); assert.equal(ajansMi("iha.com.tr"), true); assert.equal(ajansMi("Anadolu Ajansı"), true); assert.equal(ajansMi("haberler.com"), true); assert.equal(ajansMi("sabah.com.tr"), false);
  assert.equal(siteListedeMi("spor.haberturk.com", ["haberturk.com"]), true); assert.equal(siteListedeMi("haberturk.com.evil.example", ["haberturk.com"]), false);
  const istekler = [];
  const f = async (url) => { istekler.push(String(url)); return resp(GN_XML); };
  const k = { rss: [], bing: [], gnews: [{ sorgu: "altın madalya kazandı", alan: "spor", en: 8 }, { sorgu: "sergi açıldı", alan: "sanat" }], gnews_guvenilir: ["sabah.com.tr"] };
  const { adaylar, hatalar } = await kaynaklariTara(k, { fetchFn: f, bekleMs: 0, gnewsGrup: 1 });
  assert.deepEqual(hatalar, []); assert.equal(istekler.length, 2); assert.ok(istekler.every((u) => u.startsWith("https://news.google.com/rss/search?")));
  const siteler = adaylar.map((a) => a.kaynakSite);
  assert.ok(!siteler.includes("aa.com.tr") && !siteler.includes("haberler.com"), siteler.join(","));
  const sabah = adaylar.find((a) => a.kaynakSite === "sabah.com.tr"), kucuk = adaylar.find((a) => a.kaynakSite === "kucukgazete.example");
  assert.equal(sabah.kaynakGuvenilir, true); assert.equal(kucuk.kaynakGuvenilir, false); assert.equal(sabah.alan, "spor"); assert.equal(sabah.dil, "tr"); assert.equal(sabah.tazelikSaat, 24);
  // güvenilir olmayan yayıncı: başka sitede benzer başlık olmadan geçmez
  assert.equal(dogrulandiMi(sabah, adaylar, []).ok, true);
  assert.equal(dogrulandiMi(kucuk, adaylar, []).ok, false);
  const ikinci = { baslik: "Üniversiteli gençler yeni robot geliştirdi", link: "https://www.ntv.com.tr/x", dil: "tr", kaynak: "NTV" };
  assert.equal(dogrulandiMi(kucuk, [...adaylar, ikinci], []).ok, true, "başka yayıncı aynı olayı anlatıyorsa ikinci kaynak");
  assert.equal(dogrulandiMi(kucuk, [...adaylar, { ...ikinci, kaynakSite: "kucukgazete.example", link: "https://news.google.com/rss/articles/x" }], []).ok, false, "aynı yayıncı ikinci kaynak sayılmaz");
});

test("gnews sorgu dilimleri: her tur 20 dakikalık dilimle bir parça; 3 ardışık tur tüm sorguları birer kez çeker", () => {
  const q = Array.from({ length: 10 }, (_, i) => ({ sorgu: "q" + i }));
  const tur = (n) => gnewsSecimi(q, { grup: 3, simdi: n * 20 * 60_000 }).map((x) => x.sorgu);
  const hepsi = [...tur(100), ...tur(101), ...tur(102)];
  assert.equal(new Set(hepsi).size, 10); assert.equal(hepsi.length, 10);
  assert.equal(gnewsSecimi(q, { grup: 1 }).length, 10);
});

test("saat dilimi: dilimsiz Türkiye saati UTC+3 sayılır, CNN Türk gibi yerel saati GMT yazan kaynak düzeltilir, açık dilimler aynen okunur", () => {
  assert.equal(zamanCoz("2026-10-13T10:00:00", { dil: "tr" }), "2026-10-13T07:00:00.000Z");
  assert.equal(zamanCoz("Tue, 13 Oct 2026 10:00:00", { dil: "tr" }), "2026-10-13T07:00:00.000Z");
  assert.equal(zamanCoz("2026-10-13T10:00:00+03:00", { dil: "tr" }), "2026-10-13T07:00:00.000Z");
  assert.equal(zamanCoz("Tue, 13 Oct 2026 10:00:00 +0300", { dil: "tr" }), "2026-10-13T07:00:00.000Z");
  assert.equal(zamanCoz("Tue, 13 Oct 2026 10:00:00 GMT", { dil: "tr" }), "2026-10-13T10:00:00.000Z");
  assert.equal(zamanCoz("Tue, 13 Oct 2026 22:46:32 GMT", { dil: "tr", yerel: true }), "2026-10-13T19:46:32.000Z");
  assert.equal(zamanCoz("2026-10-13T10:00:00Z", { dil: "tr", yerel: true }), "2026-10-13T07:00:00.000Z");
  assert.equal(zamanCoz("bozuk", { dil: "tr" }), null); assert.equal(zamanCoz("", { dil: "tr" }), null);
  const xml = `<rss><channel><item><title>Haber</title><link>https://a.example/1</link><pubDate>Tue, 13 Oct 2026 22:46:32 GMT</pubDate></item></channel></rss>`;
  assert.equal(rssAyristir(xml, { dil: "tr", yerel: true })[0].zaman, "2026-10-13T19:46:32.000Z");
  assert.equal(rssAyristir(xml, { dil: "tr" })[0].zaman, "2026-10-13T22:46:32.000Z");
  // tazelik: TR kaynağı 24 saat; dilimsiz yerel saat doğru yorumlanınca 25,5 saat önceki haber ELENİR, 5,5 saat önceki kalır
  const eski = { baslik: "Genç sporcu altın madalya kazandı", ozet: "Genç sporcu şampiyonada altın madalya kazanarak ülkesine döndü.", dil: "tr", zaman: zamanCoz("2026-10-12T09:30:00", { dil: "tr" }) };
  const taze = { ...eski, zaman: zamanCoz("2026-10-13T09:30:00", { dil: "tr" }) };
  assert.match(onEleme(eski, { simdi: Date.parse("2026-10-13T08:00:00Z"), tazelikSaat: 24 }).neden, /^eski/);
  assert.equal(onEleme(taze, { simdi: Date.parse("2026-10-13T08:00:00Z"), tazelikSaat: 24 }).ok, true);
});

test("Türkiye ağırlığı: yerli = TR kaynaklı ya da Türkiye konulu; yerliOnce ilk n öğenin en az yarısını yerli yapar; kota rezervi yabancıyı durdurur, yerliyi geçirir", () => {
  assert.equal(yerliMi({ dil: "tr", baslik: "x" }), true); assert.equal(yerliMi({ dil: "en", baslik: "Turkey wins gold in Istanbul" }), true); assert.equal(yerliMi({ dil: "en", baslik: "Swimmer sets record in Perth" }), false);
  assert.equal(yerliMi({ dil: "en", baslik: "A Milli Takım qualifies", ozet: "" }), true);
  const liste = [...Array.from({ length: 6 }, (_, i) => ({ dil: "en", baslik: "e" + i })), ...Array.from({ length: 3 }, (_, i) => ({ dil: "tr", baslik: "t" + i }))];
  const s = yerliOnce(liste, 0.5);
  assert.equal(s.length, 9);
  for (const n of [2, 4, 6]) assert.ok(s.slice(0, n).filter(yerliMi).length >= Math.min(3, Math.ceil(0.5 * n)), `ilk ${n}`);
  assert.deepEqual(s.filter((x) => x.dil === "tr").map((x) => x.baslik), ["t0", "t1", "t2"], "grup içi sıra korunur");
  assert.deepEqual(yerliOnce(liste, 0).map((x) => x.baslik), liste.map((x) => x.baslik));
  assert.deepEqual(yerliRezervi({ spor: 28, sanat: 20 }, 0.35), { spor: 10, sanat: 7 });
  const rezerv = yerliRezervi({ spor: 28 }, 0.35);
  assert.equal(kotaEngeli({ alan: "spor", dil: "en", baslik: "x" }, { spor: 10 }, rezerv), true);
  assert.equal(kotaEngeli({ alan: "spor", dil: "en", baslik: "x" }, { spor: 11 }, rezerv), false);
  assert.equal(kotaEngeli({ alan: "spor", dil: "tr", baslik: "x" }, { spor: 1 }, rezerv), false, "yerli aday rezervden yararlanır");
  assert.equal(kotaEngeli({ dil: "en", baslik: "x" }, { spor: 0 }, rezerv), false, "alansız aday kotadan etkilenmez");
  const a = ayarOku({}, []); assert.equal(a.trAgirlik, 0.5); assert.equal(a.trRezerv, 0.35); assert.equal(a.gnewsAcik, true); assert.equal(ayarOku({ TR_AGIRLIK: "0.8", GNEWS: "0" }, []).trAgirlik, 0.8); assert.equal(ayarOku({ GNEWS: "0" }, []).gnewsAcik, false);
  assert.ok(onPuan({ dil: "tr", baslik: "x", ozet: "", kaynakGuvenilir: true, zaman: new Date(SIMDI).toISOString() }, { simdi: SIMDI, trAgirlik: 0.5 }) > onPuan({ dil: "en", baslik: "x", ozet: "", kaynakGuvenilir: true, zaman: new Date(SIMDI).toISOString() }, { simdi: SIMDI, trAgirlik: 0.5 }));
});

test("Google yönlendirme çözümü: imza alma, batch gövdesi, yanıt ayrıştırma ve hata durumları (429, imza yok, Google adresi, yayıncı uyuşmuyor)", async () => {
  const BATCH = `)]}'\n\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.sabah.com.tr/spor/2026/10/13/haber-x\\",1,\\"https://amp.example/x\\"]",null,null,null,"generic"],["di",11],["af.httprm",10,"-44",11]]\n23\n[["e",4,null,null,325]]`;
  assert.equal(batchYanitiAdres(BATCH), "https://www.sabah.com.tr/spor/2026/10/13/haber-x");
  assert.equal(batchYanitiAdres("bozuk"), ""); assert.equal(batchYanitiAdres(`)]}'\n\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"javascript:alert(1)\\",1]"]]`), "");
  assert.deepEqual(sayfaImzasi('<c-wiz data-n-a-sg="AZ12_x" data-n-a-ts="1791921871" data-n-a-id="z">'), { sg: "AZ12_x", ts: "1791921871" }); assert.equal(sayfaImzasi("<html>"), null);
  const g = batchGovdesi("CBMiAAA111", { sg: "AZ12_x", ts: "1791921871" });
  assert.match(g, /^f\.req=/); assert.match(decodeURIComponent(g), /Fbv4je/); assert.match(decodeURIComponent(g), /CBMiAAA111/); assert.match(decodeURIComponent(g), /1791921871/);
  const sayfa = '<c-wiz data-n-a-sg="AZ12_x" data-n-a-ts="1791921871"></c-wiz>';
  const kur = (batch, sayfaDurum = 200) => async (url, ist) => (String(url).includes("batchexecute") ? resp(batch) : resp(sayfa, sayfaDurum === 200, sayfaDurum));
  const ok = await gnewsCoz("CBMiAAA111", { fetchFn: kur(BATCH), beklenenSite: "sabah.com.tr" });
  assert.deepEqual(ok, { durum: "ok", url: "https://www.sabah.com.tr/spor/2026/10/13/haber-x" });
  assert.equal((await gnewsCoz("CBMiAAA111", { fetchFn: kur(BATCH), beklenenSite: "hurriyet.com.tr" })).neden, "yayıncı uyuşmuyor");
  assert.equal((await gnewsCoz("CBMiAAA111", { fetchFn: kur(BATCH, 429) })).neden, "429");
  assert.equal((await gnewsCoz("CBMiAAA111", { fetchFn: async () => resp("<html></html>") })).neden, "imza yok");
  assert.equal((await gnewsCoz("CBMiAAA111", { fetchFn: kur("garip") })).neden, "adres yok");
  assert.equal((await gnewsCoz("CBMiAAA111", { fetchFn: kur(BATCH.replace("https://www.sabah.com.tr/spor/2026/10/13/haber-x", "https://news.google.com/x")) })).neden, "google adresi");
  assert.equal((await gnewsCoz("CBMiAAA111", { fetchFn: async () => { throw new Error("ağ koptu"); } })).durum, "hata");
  assert.equal(gnewsBaslikSuzgeci({ baslik: "Kısa" }), "kısa başlık"); assert.equal(gnewsBaslikSuzgeci({ baslik: "Son dakika: genç sporcu altın madalya kazandı" }), "canlı/son dakika"); assert.equal(gnewsBaslikSuzgeci({ baslik: "Genç sporcu altın madalya kazandı ve ülkesine döndü" }), "");
  assert.match(gnewsSayfaSuzgeci("Belediye başkanı seçim kampanyası hakkında konuştu ve milletvekilleri toplandı."), /^sayfa:/);
  assert.equal(gnewsSayfaSuzgeci("Genç sporcu şampiyonada altın madalya kazandı ve antrenörüne teşekkür etti."), "");
});

// ---------- tur entegrasyonu
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const yanit = () => JSON.stringify({ uygun: true, kategori: "iyilik", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const ayarKur = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ozelAcik: false, gorselsizUst: 10, ...ek });
function bulutKur(onceki = new Map()) {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async (liste) => new Map(liste.filter((o) => onceki.has(o)).map((o) => [o, onceki.get(o)])), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } };
}
const f404 = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), text: async () => "", json: async () => ({}) });
const tur = (a, bulut, model, adaylar, fetchFn = f404) => turCalistir({ ayar: a, kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar, hatalar: [] } });
const model = () => ({ yaz: async () => ({ metin: yanit(), engellendi: "", saglayici: "t" }) });
const KONULAR = ["Volunteers plant thousands of trees beside Lakeside river", "Students build solar lantern library for village school", "Rescued hedgehog colony returns healthy to meadow", "Retired teachers teach coding to neighborhood children", "Young swimmer breaks regional record with homemade goggles", "Bakery shares free bread with night shift nurses", "Scientists grow coral nursery along restored reef", "Choir of grandparents records album for local hospital"];
const TRK = ["Köy okulunda öğrenciler güneş enerjili fener kütüphanesi kurdu", "Emekli öğretmenler mahalle çocuklarına kodlama öğretiyor", "Genç yüzücü evde yaptığı gözlükle bölge rekoru kırdı", "Dede ve nine korosu yerel hastane için albüm kaydetti"];
const enAday = (n, ek = {}) => ({ baslik: `${KONULAR[n]} (${n})`, ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/h/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-13T11:00:00Z", kaynakGuvenilir: true, ...ek });
const trAday = (n, ek = {}) => ({ baslik: TRK[n], ozet: OZET_KAYNAK, link: `https://www.haberturk.com/h/${n}`, kaynak: "haberturk.com", dil: "tr", zaman: "2026-10-13T08:00:00Z", kaynakGuvenilir: true, ...ek });

test("Türkiye ağırlığı turda: yabancı kaynaklar daha yeni/puanlı olsa da yayınlananların en az yarısı yerli; kapalıyken (0) yabancılar öne geçer", async () => {
  const adaylar = () => [...Array.from({ length: 6 }, (_, i) => enAday(i)), ...Array.from({ length: 3 }, (_, i) => trAday(i))];
  const kapali = bulutKur(); const o0 = await tur(ayarKur({ trAgirlik: 0, turBasinaEn: 4 }), kapali, model(), adaylar());
  assert.equal(o0.haberYayin, 4); assert.equal(kapali.k.yayinlar.filter((x) => /haberturk/.test(x.h.link)).length, 0, "ağırlık kapalı: hepsi yabancı");
  const acik = bulutKur(); const o = await tur(ayarKur({ trAgirlik: 0.5, turBasinaEn: 4 }), acik, model(), adaylar());
  assert.equal(o.haberYayin, 4);
  const yerli = acik.k.yayinlar.filter((x) => /haberturk/.test(x.h.link)).length;
  assert.ok(yerli >= 2, `yerli ${yerli}/4`); assert.equal(o.yerli.yayin, yerli); assert.match(ozetSatiri(o), /yerli=\d\/4\(aday=3,onEleme=3\)/);
  // yerli aday kalmamışsa yabancılar tur boş kalmasın diye yayınlanır
  const yalniz = bulutKur(); const o2 = await tur(ayarKur({ trAgirlik: 0.5, turBasinaEn: 4 }), yalniz, model(), Array.from({ length: 6 }, (_, i) => enAday(i)));
  assert.equal(o2.haberYayin, 4);
});

test("alan kotası yerli rezervi: yabancı spor adayı kotanın %65'i dolunca durur, yerli spor adayı sürer", async () => {
  const bulut = { ...bulutKur(), kota: async () => new Map([["spor", { son24: 19, son7g: 19, sonZaman: "2026-10-13T10:00:00Z" }]]) };       // kota 28, kalan 9 <= rezerv 10
  const spor = (n, ek) => ({ ...enAday(n), alan: "spor", baslik: `Swimmer wins gold medal number ${n} at national championship final`, ...ek });
  const o = await tur(ayarKur({ trAgirlik: 0.5, turBasinaEn: 4 }), bulut, model(), [spor(0), spor(1), { ...trAday(0), alan: "spor", baslik: "Milli yüzücü şampiyonada altın madalya kazandı ve rekor kırdı" }]);
  assert.equal(bulut.k.yayinlar.length, 1); assert.match(bulut.k.yayinlar[0].h.link, /haberturk/);
  assert.equal(o.alanYayin.spor, 1);
});

const SAYFA_HTML = `<html><body><article><p>Komşular nehir kıyısına 5000 ağaç dikti ve yerel okullar çalışmaya sınıflarıyla katıldı, ağaçlar yürüyüş yoluna gölge verecek.</p><p>${OZET_KAYNAK.slice(0, 160)}</p><p>${OZET_KAYNAK.slice(0, 200)} Neighbors shared the work every weekend.</p><p>The park also offers a small library that is open to anyone in the neighborhood.</p></article></body></html>`;
const GBATCH = (url) => `)]}'\n\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"${url}\\",1]",null,null,null,"generic"],["di",11]]`;
const gAday = (ek = {}) => ({ baslik: "Komşular nehir kıyısına 5000 ağaç dikti ve okullar da katıldı", ozet: "", link: "https://news.google.com/rss/articles/CBMiTEST123?oc=5", kaynak: "Sabah", kaynakSite: "sabah.com.tr", gnews: true, gnewsId: "CBMiTEST123", dil: "tr", zaman: "2026-10-13T08:00:00Z", kaynakGuvenilir: true, ...ek });
function gFetch({ hedef = "https://www.sabah.com.tr/yasam/2026/10/13/komsular-agac-dikti", batch = null, robots = "", sayfaDurum = 200 } = {}) {
  const istek = [];
  const f = async (url, ist) => {
    const u = String(url); istek.push(u);
    if (u.includes("news.google.com/rss/articles")) return resp('<c-wiz data-n-a-sg="SIG" data-n-a-ts="1791921871"></c-wiz>');
    if (u.includes("batchexecute")) return batch === 429 ? resp("", false, 429) : resp(batch ?? GBATCH(hedef));
    if (u.endsWith("/robots.txt")) return robots ? resp(robots) : f404();
    if (u.startsWith("https://www.sabah.com.tr/")) return sayfaDurum === 200 ? { ...resp(SAYFA_HTML), headers: new Headers({ "content-type": "text/html" }) } : f404();
    return f404();
  };
  return { f, istek };
}

test("Google News adayı uçtan uca: asıl adrese çözülür, yayıncının sayfası okunur, kaynak = ASIL YAYINCI (Google değil), yayıncı adresi görüldü işaretlenir", async () => {
  const bulut = bulutKur(), g = gFetch();
  const o = await tur(ayarKur({ trAgirlik: 0.5 }), bulut, model(), [gAday()], g.f);
  assert.equal(o.haberYayin, 1, JSON.stringify({ el: o.elenen, g: o.gnews, red: o.red }));
  const { h } = bulut.k.yayinlar[0];
  assert.equal(h.link, "https://www.sabah.com.tr/yasam/2026/10/13/komsular-agac-dikti"); assert.equal(h.kaynak, "Sabah"); assert.ok(!/google/.test(h.link + h.kaynak));
  assert.deepEqual([o.gnews.cozulen, o.gnews.cozHata], [1, 0]); assert.equal(o.yerli.yayin, 1);
  assert.ok(bulut.k.isaretler.some((x) => x.ozet === baglantiOzeti("https://www.sabah.com.tr/yasam/2026/10/13/komsular-agac-dikti") && x.durum === "yayinlandi"), "asıl adres de görüldü");
  assert.ok(g.istek.some((u) => u.endsWith("/robots.txt")), "robots.txt denetlendi");
  assert.match(ozetSatiri(o), /gnews=aday:1,cozulen:1,cozHata:0,atlanan:0/);
});

test("Google News: çözülemeyen ya da robots engelli ya da sayfası eşleşmeyen aday YAYINLANMAZ (Google adresi asla kaynak olmaz); 429'da tur kalan çözümleri durdurur", async () => {
  // 1) batch yanıtı bozuk: aday bekleyene alınır (deneme+1), yayın yok
  const b1 = bulutKur(); const o1 = await tur(ayarKur(), b1, model(), [gAday()], gFetch({ batch: "garip" }).f);
  assert.equal(o1.haberYayin, 0); assert.equal(o1.gnews.cozHata, 1); assert.ok(b1.k.isaretler.some((x) => x.durum === "bekliyor_kaynak" && /gnews-coz/.test(x.neden)));
  // 2) üçüncü başarısızlıkta elenir
  const b2 = bulutKur(new Map([[baglantiOzeti("https://news.google.com/rss/articles/CBMiTEST123?oc=5"), { durum: "bekliyor_kaynak", deneme: 2 }]])); await tur(ayarKur(), b2, model(), [gAday()], gFetch({ batch: "garip" }).f);
  assert.ok(b2.k.isaretler.some((x) => x.durum === "elendi" && /gnews-coz/.test(x.neden)));
  // 3) robots.txt engeli
  const b3 = bulutKur(); const o3 = await tur(ayarKur(), b3, model(), [gAday()], gFetch({ robots: "User-agent: *\nDisallow: /" }).f);
  assert.equal(o3.haberYayin, 0); assert.ok(b3.k.isaretler.some((x) => x.durum === "elendi" && x.neden === "robots"));
  // 4) sayfa okunamadı: asıl sayfa metni olmadan Google sonucu yazılmaz
  const b4 = bulutKur(); const o4 = await tur(ayarKur(), b4, model(), [gAday()], gFetch({ sayfaDurum: 404 }).f);
  assert.equal(o4.haberYayin, 0);
  // 5) 429: ilk aday çözülemez, ikinci çözülmeye çalışılmaz (tur durur); işaretlenmez
  const b5 = bulutKur(); const g5 = gFetch({ batch: 429 });
  const o5 = await tur(ayarKur(), b5, model(), [gAday(), gAday({ gnewsId: "CBMiTEST999", link: "https://news.google.com/rss/articles/CBMiTEST999?oc=5", baslik: "Genç yüzücü evde yaptığı gözlükle bölge rekoru kırdı" })], g5.f);
  assert.equal(o5.haberYayin, 0); assert.equal(g5.istek.filter((u) => u.includes("batchexecute")).length, 1); assert.equal(b5.k.isaretler.filter((x) => /gnews/.test(x.neden || "")).length, 0);
  // 6) yayıncının kendi beslemesinden zaten işlenmiş haber ikinci kez alınmaz
  const hedef = "https://www.sabah.com.tr/yasam/2026/10/13/komsular-agac-dikti";
  const b6 = bulutKur(new Map([[baglantiOzeti(hedef), { durum: "yayinlandi" }]])); const o6 = await tur(ayarKur(), b6, model(), [gAday()], gFetch().f);
  assert.equal(o6.haberYayin, 0); assert.ok(b6.k.isaretler.some((x) => x.neden === "gnews:zaten-islendi"));
});

test("Google News sayfa içeriği konu denetimi: başlık masum ama sayfa siyaset/suç içeriyorsa elenir", async () => {
  const kotuSayfa = SAYFA_HTML.replace("Komşular nehir kıyısına 5000 ağaç dikti ve yerel okullar çalışmaya sınıflarıyla katıldı, ağaçlar yürüyüş yoluna gölge verecek.", "Komşular nehir kıyısına 5000 ağaç dikti; belediye başkanı seçim kampanyası için tutuklanan milletvekillerini eleştirdi ve polis soruşturma başlattı.");
  const f = async (url) => (String(url).startsWith("https://www.sabah.com.tr/") && !String(url).endsWith("robots.txt") ? { ...resp(kotuSayfa), headers: new Headers({ "content-type": "text/html" }) } : gFetch().f(url));
  const b = bulutKur(); const o = await tur(ayarKur(), b, model(), [gAday()], f);
  assert.equal(o.haberYayin, 0); assert.ok(b.k.isaretler.some((x) => /^elendi$/.test(x.durum) && /^gnews:sayfa:/.test(x.neden)), JSON.stringify(b.k.isaretler));
});

test("kaynaklar.json: Google News sorguları (40-72: 54 haber + en çok 12 etkinlik sorgusu, Türkçe, tekrarsız), güvenilir yayıncı listesi (ajans yok), yeni TR RSS kaynakları, eklenmeyenlerin gerekçeleri", () => {
  const q = kaynaklar.gnews;
  assert.ok(q.length >= 40 && q.length <= 72, `sorgu sayısı ${q.length}`);
  assert.equal(new Set(q.map((x) => x.sorgu)).size, q.length);
  for (const x of q) { assert.ok(/[a-zA-ZçğıöşüÇĞİÖŞÜ]{3}/.test(x.sorgu), x.sorgu); assert.ok(!x.alan || ["spor", "sanat", "bilim", "teknoloji"].includes(x.alan), x.sorgu); }
  for (const kalip of ["altın madalya kazandı", "dünya şampiyonu oldu", "rekor kırdı", "ödül aldı", "birinci oldu", "Türk bilim insanı", "yerli üretim geliştirildi", "açılışı yapıldı müze", "sergi açıldı", "festival başlıyor", "restorasyon tamamlandı", "yeniden doğaya salındı", "yavru dünyaya geldi", "gönüllüler", "bağış kampanyası tamamlandı", "burs", "TEKNOFEST", "kazı çalışmalarında bulundu", "UNESCO Türkiye", "konser", "kitap fuarı", "filenin sultanları", "12 dev adam"])
    assert.ok(q.some((x) => x.sorgu.includes(kalip)), kalip);
  assert.ok(q.some((x) => x.sorgu.startsWith("A Milli")) && q.some((x) => /milli sporcu/.test(x.sorgu)));
  assert.ok(kaynaklar.gnews_guvenilir.length >= 10 && !kaynaklar.gnews_guvenilir.some((s) => ajansMi(s)), "ajans güvenilir listede olamaz");
  const adlar = kaynaklar.rss.map((r) => r.ad);
  assert.equal(new Set(kaynaklar.rss.map((r) => r.url)).size, kaynaklar.rss.length, "url tekrarı yok");
  for (const yeni of ["webtekno.com", "shiftdelete.net", "donanimhaber.com", "arkeofili.com", "kultur.istanbul", "fotomac.com.tr", "ntvspor.net", "aspor.com.tr", "dogadernegi.org"]) assert.ok(adlar.includes(yeni), yeni);
  assert.ok(!kaynaklar.rss.some((r) => /evrimagaci|aa\.com\.tr|dha\.com\.tr|iha\.com\.tr/.test(r.url)), "evrimagaci (robots yasağı) ve ajanslar yok");
  assert.ok(kaynaklar.eklenmeyenler["evrimagaci.org"] && /robots/.test(kaynaklar.eklenmeyenler["evrimagaci.org"]));
  assert.ok(kaynaklar.rss.filter((r) => r.dil === "tr").length >= 28, "TR RSS kaynağı sayısı");
  assert.equal(kaynaklar.rss.find((r) => r.ad === "cnnturk.com (Spor)").tz_yerel, true);
  for (const r of kaynaklar.rss.filter((x) => x.dil === "tr" && /Spor|ntvspor|fotomac|aspor|webtekno|shiftdelete|donanimhaber/.test(x.ad))) assert.ok((r.tazelik_saat || 24) <= 36, r.ad);
});
