// 2026-10-13 canlı deneme sonrası: özne görseli, görselsiz yayın, bekleyenlerin görselsiz çıkışı, özel işlerin ayrı bütçesi/özeti, ret kodları, ön sıralama. Ağsız.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ayarOku } from "../lib/ayar.mjs";
import { baglantiOzeti } from "../lib/rss.mjs";
import { jsonAyikla } from "../lib/model.mjs";
import { ciktiDogrula, ozneAyikla } from "../lib/dogrula.mjs";
import { haberYaz, redKodu } from "../lib/yaz.mjs";
import { ozneAdiGeciyor, ozneSec, vlDegerlendir, VL_OZNE_BEKLENEN, gorselBul } from "../lib/gorsel.mjs";
import { siraNedeni } from "../lib/alinti.mjs";
import { ozelIsleriCalistir, ozelOzetMetni } from "../lib/ozel.mjs";
import { gokbilimUret } from "../lib/gokbilim.mjs";
import { turCalistir, ozetSatiri, onPuan, redSinifi } from "../hat.mjs";

const SIMDI = Date.parse("2026-10-13T12:00:00Z");
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const OZET_KAYNAK = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. " + "Neighbors and local schools shared the work and a small tool library now serves the park. ".repeat(3);
const yanit = (ek = {}) => JSON.stringify({ uygun: true, kategori: "doga", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR }, ...ek });
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, ozelAcik: false, ...ek });
const KONULAR = ["Volunteers plant thousands of trees beside Lakeside river", "Students build solar lantern library for village school", "Rescued hedgehog colony returns healthy to meadow", "Retired teachers teach coding to neighborhood children", "Young swimmer breaks regional record with homemade goggles", "Bakery shares free bread with night shift nurses", "Scientists grow coral nursery along restored reef", "Choir of grandparents records album for local hospital", "Cyclists collect thousands of books for rural libraries", "Garden club turns empty lot into butterfly meadow"];
const aday = (n, ek = {}) => ({ baslik: `${KONULAR[n % KONULAR.length]} (${n})`, ozet: OZET_KAYNAK, link: `https://www.goodnewsnetwork.org/h/${n}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-13T08:00:00Z", kaynakGuvenilir: true, ...ek });
const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const f404 = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
function sahteBulut(onceki = new Map()) {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => onceki, isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } };
}
const tur = (a, bulut, model, tarama, fetchFn = f404) => turCalistir({ ayar: a, kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: tarama, hatalar: [] } });

// ---------- özne görseli
test("ozneAdiGeciyor: tüm kelimeler, aksan/büyük-küçük harf duyarsız; yanlış kişi ya da eksik ad geçmez", () => {
  assert.equal(ozneAdiGeciyor("File:Lionel Messi 2018.jpg Category:Argentina national football team", "Lionel Messi"), true);
  assert.equal(ozneAdiGeciyor("Messi celebrating", "Lionel Messi"), false);                  // yalnız soyadı: ikinci kişiyle karışabilir
  assert.equal(ozneAdiGeciyor("Cristiano Ronaldo and Lionel Scaloni", "Lionel Messi"), false);
  assert.equal(ozneAdiGeciyor("Fenerbahce players", "Fenerbahçe"), true);                    // aksan katlanır
  assert.equal(ozneAdiGeciyor("Hubble Space Telescope in orbit", "James Webb Space Telescope"), false);
  assert.equal(ozneAdiGeciyor("Arctic fox (Vulpes lagopus) in snow", "Arctic fox"), true);
  assert.equal(ozneAdiGeciyor("Lionel's Messi", "Lionel Messi"), true);
});

const cand = (ek) => ({ baslik: "x.jpg", metin: "x", lisans: "CC BY-SA 4.0", w: 1280, h: 850, yil: 2019, yaratici: "Foto", url: "https://u/" + Math.random(), kaynak_url: "https://c/wiki", saglayici: "wikimedia", ...ek });
test("ozneSec: lisans, ad eşleşmesi, boyut, yasak kelime, arşiv elemesi; başlıkta ad geçen önce", () => {
  const ozne = { ad: "Simone Biles", tur: "kisi" };
  const iyi = cand({ baslik: "Simone Biles 2019.jpg", metin: "Simone Biles 2019.jpg Simone Biles gymnast", url: "https://u/iyi" });
  const aciklamada = cand({ baslik: "IMG_221.jpg", metin: "IMG_221.jpg portrait of Simone Biles at an event", url: "https://u/acik", yil: 2021 });
  const nc = cand({ baslik: "Simone Biles NC.jpg", metin: "Simone Biles", lisans: "CC BY-NC 4.0", url: "https://u/nc" });
  const baskasi = cand({ baslik: "Gymnast 2019.jpg", metin: "Gymnast Jordan Chiles", url: "https://u/baska" });
  const kucuk = cand({ baslik: "Simone Biles small.jpg", metin: "Simone Biles", w: 300, url: "https://u/kucuk" });
  const arsiv = cand({ baslik: "Simone Biles old.jpg", metin: "Simone Biles", yil: 1978, url: "https://u/arsiv" });
  const poster = cand({ baslik: "Simone Biles poster.jpg", metin: "Simone Biles poster", url: "https://u/poster" });
  const secilen = ozneSec([aciklamada, nc, baskasi, kucuk, arsiv, poster, iyi], ozne, 3).map((x) => x.url);
  assert.deepEqual(secilen, ["https://u/iyi", "https://u/acik"]);
  // eser/yer için eski çekim yılı kod düzeyinde engel değil (siyah-beyazlığı model denetler)
  const tablo = cand({ baslik: "The Starry Night.jpg", metin: "The Starry Night Vincent van Gogh 1889", yil: 1889, url: "https://u/tablo" });
  assert.equal(ozneSec([tablo], { ad: "The Starry Night", tur: "eser" }, 1).length, 1);
  assert.equal(ozneSec([tablo], { ad: "The Starry Night", tur: "kisi" }, 1).length, 0);
});

test("özne görsel kontrolü kabul tablosu: ozne_eslesiyor true + diğer altısı false; insan/yer alanları engel değil", () => {
  const tamam = { ...VL_OZNE_BEKLENEN, kisa_gerekce: "portre" };
  assert.equal(vlDegerlendir(JSON.stringify(tamam), { ozne: true }).ok, true);
  // nötr yoldaki alanlar özne yolunda aranmaz / engel olmaz
  assert.equal(vlDegerlendir(JSON.stringify({ ...tamam, taninabilir_yuz_baskin: true, kisi_grubu_poz: true, insan_ayirt_edilebilir: true, yer_ya_da_kurum_uyumsuz: true }), { ozne: true }).ok, true);
  for (const k of Object.keys(VL_OZNE_BEKLENEN)) {
    const ters = { ...tamam, [k]: !VL_OZNE_BEKLENEN[k] };
    assert.equal(vlDegerlendir(JSON.stringify(ters), { ozne: true }).ok, false, k);
  }
  assert.match(vlDegerlendir(JSON.stringify({ ...tamam, ozne_eslesiyor: false }), { ozne: true }).neden, /özne/);
  const eksik = { ...tamam }; delete eksik.ozne_eslesiyor;
  assert.equal(vlDegerlendir(JSON.stringify(eksik), { ozne: true }).ok, false);
  // nötr yol aynen katı: aynı yanıt orada ret (konuya_uygun yok)
  assert.equal(vlDegerlendir(JSON.stringify(tamam)).ok, false);
});

test("gorsel_ozne: model çıktısından ayıklanır, geçersiz olan düşer", () => {
  assert.deepEqual(ozneAyikla({ ad: " Simone  Biles ", tur: "KISI" }), { ad: "Simone Biles", tur: "kisi" });
  assert.equal(ozneAyikla({ ad: "x", tur: "kisi" }), null);
  assert.equal(ozneAyikla({ ad: "Simone Biles", tur: "robot" }), null);
  assert.equal(ozneAyikla({ ad: "志", tur: "kisi" }), null);
  assert.equal(ozneAyikla({}), null);
  const d = JSON.parse(yanit({ gorsel_ozne: { ad: "Lakeside Park", tur: "yer" } }));
  const v = ciktiDogrula(d, OZET_KAYNAK + " 5000", "Neighbors plant trees");
  assert.equal(v.ok, true, v.neden);
  assert.deepEqual(v.haber.gorselOzne, { ad: "Lakeside Park", tur: "yer" });
  const v2 = ciktiDogrula(JSON.parse(yanit({ gorsel_ozne: {} })), OZET_KAYNAK + " 5000", "x");
  assert.equal("gorselOzne" in v2.haber, false);
});

const vlYanit = (o) => ({ metin: JSON.stringify(o) });
const haberOzne = { en: { baslik: "Gymnast Simone Biles wins another gold", ozet: "She won on the floor." }, gorselAra: "gymnastics floor mat", gorselOzne: { ad: "Simone Biles", tur: "kisi" } };
const fImg = async () => ({ ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer });

test("gorselBul: özne adayı model onaylarsa özne görseli (ozne:true), nötr aramaya hiç gidilmez", async () => {
  const sorgular = [], vlSorulari = [];
  const araFn = async (q, tur) => { sorgular.push([q, tur]); return tur === "ozne" ? [cand({ baslik: "Simone Biles 2019.jpg", metin: "Simone Biles 2019.jpg", url: "https://u/biles" })] : []; };
  const model = { yaz: async (s, g, o) => { vlSorulari.push(g); return vlYanit({ ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" }); } };
  const r = await gorselBul(haberOzne, { model, araFn, fetchFn: fImg, bekleFn: async () => {} });
  assert.equal(r.sonuc.ozne, true);
  assert.equal(r.sonuc.gorsel.lisans, "CC BY-SA 4.0");
  assert.deepEqual(sorgular, [['"Simone Biles"', "ozne"]]);                    // tam ifade ilk sorgu, bulununca ikinci sorgu yok
  assert.equal(vlSorulari.length, 1);
  assert.match(vlSorulari[0], /ozne_eslesiyor/);
});

test("gorselBul: özne reddedilirse nötr yola düşer; toplam görsel denetimi vlUst'u aşmaz; özne yoksa eski davranış", async () => {
  let vl = 0;
  const hep = (cevap) => ({ yaz: async () => { vl++; return vlYanit(cevap); } });
  const adaylar = [1, 2, 3].map((i) => cand({ baslik: `Simone Biles ${i}.jpg`, metin: `Simone Biles ${i}.jpg gymnastics floor mat`, url: `https://u/${i}` }));
  const araFn = async (q, tur) => adaylar;
  // özne denetimi hep ret (başkası çıkıyor), nötr denetim de hep ret -> görsel yok, toplam çağrı vlUst=3
  const ret = await gorselBul(haberOzne, { model: hep({ ...VL_OZNE_BEKLENEN, ozne_eslesiyor: false }), araFn, fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.equal(ret.sonuc, null);
  assert.ok(vl <= 3, `vl=${vl}`);
  assert.ok(ret.notlar.some((n) => /^ozne vl ret/.test(n)));
  assert.ok(ret.notlar.some((n) => /^gercek:/.test(n)), "nötr yola düştü");
  // özne yok: yalnız nötr aramalar
  const tumTurler = [];
  await gorselBul({ ...haberOzne, gorselOzne: undefined }, { model: hep({}), araFn: async (q, t) => { tumTurler.push(t); return []; }, bekleFn: async () => {} });
  assert.ok(!tumTurler.includes("ozne"));
});

test("gorselBul: özne yolunda yanlış ad taşıyan dosya model çağrısına bile girmez", async () => {
  let vl = 0;
  const araFn = async (q, tur) => (tur === "ozne" ? [cand({ baslik: "Jordan Chiles.jpg", metin: "Jordan Chiles gymnast", url: "https://u/j" })] : []);
  const r = await gorselBul(haberOzne, { model: { yaz: async () => { vl++; return vlYanit({}); } }, araFn, fetchFn: fImg, bekleFn: async () => {} });
  assert.equal(r.sonuc, null);
  assert.equal(vl, 0);
});

// ---------- görselsiz yayın + bekleyenler
test("tur: uygun görsel yoksa haber BEKLEMEZ, görselsiz yayınlanır (yükte gorsel yok), özet satırı sayar", async () => {
  const bulut = sahteBulut(), model = { yaz: async () => ({ metin: yanit(), engellendi: "", saglayici: "t" }) };
  const o = await tur(ayar(), bulut, model, [aday(1)]);
  assert.equal(o.yayinlanan, 1); assert.equal(o.bekleyenGorsel, 0); assert.equal(o.gorselsiz, 1);
  assert.equal(bulut.k.yayinlar[0].g, null);
  const { yayinYuku } = await import("../lib/bulut.mjs");
  const yuk = yayinYuku(bulut.k.yayinlar[0].h, "ab".repeat(32), null);
  assert.ok(!("gorsel" in yuk.haber)); assert.ok(!("gorselB64" in yuk));
  assert.match(ozetSatiri(o), /gorselsiz=1 ozneGorsel=0 bekleyenYayin=0 vl=\d+/);
});

test("tur: özne görseli bulunursa haber o görselle yayınlanır (gorselsiz değil)", async () => {
  const bulut = sahteBulut();
  const model = { yaz: async (s, g, o) => (o?.resim ? vlYanit({ ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" }) : { metin: yanit({ gorsel_ozne: { ad: "Lakeside Riverside Park", tur: "yer" } }), engellendi: "", saglayici: "t" }) };
  const f = async (url) => {
    const u = String(url);
    if (u.includes("commons.wikimedia.org")) return { ok: true, status: 200, headers: new Headers(), json: async () => ({ query: { pages: { 1: { title: "File:Lakeside Riverside Park 2020.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/p.jpg", thumbwidth: 1280, thumbheight: 800, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/File:LRP.jpg", extmetadata: { LicenseShortName: { value: "CC BY 4.0" }, Artist: { value: "Ayşe" }, DateTimeOriginal: { value: "2020-05-04" } } }] } } } }) };
    if (u.includes("upload.wikimedia.org")) return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer };
    return f404();
  };
  const o = await tur(ayar(), bulut, model, [aday(2)], f);
  assert.equal(o.yayinlanan, 1); assert.equal(o.ozneGorsel, 1); assert.equal(o.gorselsiz, 0);
  assert.equal(bulut.k.yayinlar[0].g.gorsel.saglayici, "wikimedia");
  assert.equal(bulut.k.yayinlar[0].g.gorsel.sahibi, "Ayşe");
});

test("tur: bekliyor_gorsel kayıtları saklı yükle, model ve görsel araması OLMADAN görselsiz yayınlanır; öncelik alır", async () => {
  const a1 = aday(3), a2 = aday(4);
  const yukHaber = { id: "hbekleyen000001", tr: { baslik: "Başlık", ozet: TR }, en: { baslik: "Title", ozet: EN }, kategori: "doga", yer: "Dünya", kaynak: "goodnewsnetwork.org", link: a1.link, zaman: a1.zaman, model: "t", emoji: "🌳" };
  const onceki = new Map([[baglantiOzeti(a1.link), { ozet: baglantiOzeti(a1.link), durum: "bekliyor_gorsel", deneme: 1, yuk: yukHaber }]]);
  const bulut = sahteBulut(onceki);
  let modelCagri = 0, istek = 0;
  const model = { yaz: async () => { modelCagri++; return { metin: yanit(), engellendi: "", saglayici: "t" }; } };
  const o = await tur(ayar({ turBasinaEn: 1 }), bulut, model, [a2, a1], async () => { istek++; return f404(); });
  assert.equal(o.yayinlanan, 1); assert.equal(o.bekleyenYayin, 1); assert.equal(o.gorselsiz, 1);
  assert.equal(bulut.k.yayinlar[0].h.id, "hbekleyen000001");        // bekleyen önce işlendi (a2 daha yeni olsa da)
  assert.equal(bulut.k.yayinlar[0].g, null);
  assert.equal(modelCagri, 0);
  assert.equal(istek, 0, "kaynak sayfası/görsel araması yok");
  assert.equal(bulut.k.isaretler.at(-1).durum, "yayinlandi");
});

// ---------- tur verimi / ret kodları
test("haberYaz: gerçek çağrı sayısı döner; boş yanıt yeniden denenir; güvenlik engeli kalıcı; kaynak yetersizse 0 çağrı", async () => {
  const kaynak = { baslik: "Garden club turns lot into meadow", ozet: OZET_KAYNAK + " 5000", dil: "en" };
  let n = 0;
  const bos = { yaz: async () => (n++ === 0 ? { metin: "", engellendi: "bos" } : { metin: yanit(), engellendi: "", saglayici: "t" }) };
  const y = await haberYaz(bos, kaynak, "");
  assert.equal(y.durum, "ok"); assert.equal(y.cagri, 2);
  const g = await haberYaz({ yaz: async () => ({ metin: "", engellendi: "SAFETY" }) }, kaynak, "");
  assert.equal(g.durum, "ret"); assert.equal(g.kalici, true); assert.equal(g.cagri, 1); assert.equal(redKodu(g.neden), "filtre");
  const k = await haberYaz({ yaz: async () => { throw new Error("çağrılmamalı"); } }, { baslik: "x", ozet: "kısa", dil: "en" }, "");
  assert.equal(k.neden, "kaynak metni yetersiz"); assert.equal(k.cagri, 0);
  const iki = await haberYaz({ yaz: async () => ({ metin: "{bozuk", engellendi: "" }) }, kaynak, "");
  assert.equal(iki.cagri, 2); assert.equal(redKodu(iki.neden), "json-bozuk");
});

test("jsonAyikla: dize içi çıplak satır sonu ve sondaki virgül onarılır", () => {
  assert.deepEqual(jsonAyikla('```json\n{"a":"x\ny","b":[1,2,],}\n```'), { a: "x\ny", b: [1, 2] });
  assert.equal(jsonAyikla("{bozuk"), null);
});

test("ret kodları ayrıntılı; sınıf özeti eskisi gibi; özet satırında diğer kırılımı", () => {
  const tablo = { "doğrulama: tr cümle sayısı 2": "cumle-sayisi", "çevrilmiş özel ad şüphesi": "ozel-ad", "tr baslik karakter bozuk": "baslik", "doğrulama: json değil": "json-bozuk",
    "doğrulama: bos-yanit:bos": "bos-yanit", "kaynaktan kopya": "kopya", "kaynak metni yetersiz": "kaynak-yetersiz", "doğrulama: en çok uzun": "uzun", "model: uygun değil": "uygun-degil", "model engelledi:SAFETY": "filtre", "kategori geçersiz": "kategori" };
  for (const [neden, kod] of Object.entries(tablo)) assert.equal(redKodu(neden), kod, neden);
  assert.equal(redSinifi("çevrilmiş özel ad şüphesi"), "diger");
  assert.equal(redSinifi("doğrulama: tr kaynakta olmayan rakam"), "rakam");
  const o = { aday: 1, yeniAday: 1, onElemeGecen: 1, modelCagri: 3, elenen: 3, bekleyenGorsel: 0, bekleyenKaynak: 0, yayinlanan: 0, kota: 0, sureSn: 5, durus: "tamam",
    red: { uygunDegil: 0, rakam: 0, dil: 0, filtre: 0, diger: 3 }, redKodlari: { "ozel-ad": 2, "cumle-sayisi": 1, "uygun-degil": 0 } };
  assert.match(ozetSatiri(o), /diger=3\).* digerKirilim=ozel-ad:2,cumle-sayisi:1$/);
});

test("ön sıralama: saklı yük > iyi-haber sitesi > alan kaynağı > Bing; kısa özet cezalı; tazelik artırır", () => {
  const op = { simdi: SIMDI, tazelikSaat: 24 };
  const taze = "2026-10-13T11:00:00Z", eski = "2026-10-12T14:00:00Z", uzun = "x".repeat(300);
  const bekleyen = onPuan({ kayit: { durum: "bekliyor_gorsel", yuk: { id: "h" } }, zaman: eski, ozet: uzun }, op);
  const iyi = onPuan({ kaynakGuvenilir: true, zaman: taze, ozet: uzun }, op);
  const alan = onPuan({ kaynakGuvenilir: true, alan: "spor", zaman: taze, ozet: uzun }, op);
  const bing = onPuan({ kaynakGuvenilir: false, zaman: taze, ozet: uzun }, op);
  assert.ok(bekleyen > iyi && iyi > alan && alan > bing);
  assert.ok(onPuan({ kaynakGuvenilir: true, zaman: taze, ozet: "kısa" }, op) < iyi);
  assert.ok(onPuan({ kaynakGuvenilir: true, zaman: eski, ozet: uzun }, op) < iyi);
  assert.ok(onPuan({ kaynakGuvenilir: true, alan: "gokbilim", zaman: taze, ozet: uzun, hazirGorsel: { url: "https://x" } }, op) > alan);
});

test("tur: model çağrı tavanı GERÇEK çağrıyı sayar (çağrısız retler harcamaz); tipik turda 4 yayın çıkar", async () => {
  const adaylar = Array.from({ length: 8 }, (_, i) => aday(i));
  // ilk ikisi özetsiz-kısa: "kaynak metni yetersiz" çağrı harcamaz
  adaylar[0] = aday(0, { ozet: "kısa" }); adaylar[1] = aday(1, { ozet: "kısa" });
  const bulut = sahteBulut();
  let cagri = 0;
  const model = { yaz: async () => { cagri++; return { metin: yanit(), engellendi: "", saglayici: "t" }; } };
  const o = await tur(ayar({ modelCagriUst: 6 }), bulut, model, adaylar);
  assert.equal(o.yayinlanan, 4); assert.equal(o.durus, "tur-siniri");
  assert.equal(o.modelCagri, cagri);
  assert.ok(o.modelCagri <= 6);
});

// ---------- özel işler
test("siraNedeni: kapalı / saat dışı / kota dolu / aralık / sırası geldi", () => {
  const plan = { pencere: "gun", kota: 2, aralikSaat: 8 }, t = Date.parse("2026-10-13T12:00:00Z"), pen = { bas: 5, son: 21 };
  assert.equal(siraNedeni(undefined, null, t, pen), "kapali");
  assert.equal(siraNedeni({ ...plan, kota: 0 }, null, t, pen), "kapali");
  assert.equal(siraNedeni(plan, null, Date.parse("2026-10-13T22:30:00Z"), pen), "saat-disi");       // Türkiye 01:30
  assert.equal(siraNedeni(plan, { son24: 2 }, t, pen), "kota-dolu");
  assert.equal(siraNedeni(plan, { son24: 1, sonZaman: "2026-10-13T09:00:00Z" }, t, pen), "aralik");
  assert.equal(siraNedeni(plan, { son24: 1, sonZaman: "2026-10-13T02:00:00Z" }, t, pen), "");
});

test("tur özeti: sırası gelmeyen özel alanların nedeni açık yazılır (eskiden 'ozel=-')", async () => {
  const bulut = { ...sahteBulut(), kota: async () => new Map() };
  const gece = Date.parse("2026-10-13T22:30:00Z");
  const o = await turCalistir({ ayar: ayar({ ozelAcik: true }), kaynaklar: {}, bulut, model: { yaz: async () => { throw new Error("yok"); } }, fetchFn: f404, bekleFn: async () => {}, simdi: () => gece, log: () => {}, tarama: { adaylar: [], hatalar: [] } });
  const s = ozetSatiri(o);
  assert.match(s, / ozel=felsefe\+edebiyat\+siir\+mitoloji\+gokbilim:saat-disi/);
  assert.doesNotMatch(s, /ozel=-/);
  const dolu = { ...sahteBulut(), kota: async () => new Map(["felsefe", "edebiyat", "siir"].map((k) => [k, { son24: 5, son7g: 5, sonZaman: "2026-10-13T07:00:00Z" }])) };
  const o2 = await turCalistir({ ayar: ayar({ ozelAcik: true, ozelCagriUst: 0 }), kaynaklar: {}, bulut: dolu, model: { yaz: async () => { throw new Error("yok"); } }, fetchFn: f404, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [], hatalar: [] } });
  assert.match(ozetSatiri(o2), /felsefe\+edebiyat\+siir:kota-dolu/);
  assert.equal(ozelOzetMetni({ calisan: [{ alan: "felsefe", durum: "yayinlandi" }, { alan: "siir", durum: "yok", neden: "gorsel-yok" }, { alan: "gokbilim", durum: "yok", neden: "apod-hata/yedek-yok/ay-evre-yok" }], atlanan: [{ alan: "edebiyat", neden: "aralik" }] }),
    "felsefe:yayin,siir:gorsel-yok,gokbilim:apod-hata/yedek-yok/ay-evre-yok,edebiyat:aralik");
  assert.equal(ozelOzetMetni({ calisan: [], atlanan: [] }), "-");
});

const ESO = (ek = {}) => ({ baslik: "A glowing nebula seen by the VLT telescope", ozet: "Astronomers shared a fresh picture of a glowing nebula taken with the Very Large Telescope. It stacks long exposures from many nights and the follow up work will refine the structure of the cloud considerably for later papers. " + "More images follow as the team processes the remaining data from the observing run and prepares the next release for the public.", link: "https://www.eso.org/public/images/potw2641a/", kaynak: "eso.org (Haftanın Fotoğrafı)", dil: "en",
  zaman: "2026-10-12T08:00:00Z", alan: "gokbilim", kaynakGuvenilir: true, tazelikSaat: 240, hazirGorsel: { url: "https://cdn.eso.org/images/screen/potw2641a.jpg", sahibi: "ESO", lisans: "CC BY 4.0", lisans_url: "https://creativecommons.org/licenses/by/4.0/" }, hash: "ab".repeat(32), ...ek });
const GOKYANIT = JSON.stringify({ uygun: true, kategori: "bilim", yer: "Dünya", en: { baslik: "A glowing nebula seen by the VLT", ozet: "A new image of a glowing nebula was released by the team that runs the Very Large Telescope in Chile. The picture blends long exposures from many nights of careful observing. Researchers expect later studies to describe how that cloud is built. The picture shows delicate filaments of gas that glow in many colors. It is a good example of patient and careful work at the observatory." },
  tr: { baslik: "VLT ile görülen parlak bir bulutsu", ozet: "Gökbilimciler, Çok Büyük Teleskop ile çekilmiş parlak bir bulutsunun yeni görüntüsünü paylaştı. Görüntü, birçok geceye yayılan uzun pozlamaları üst üste bindiriyor. Bilim insanları, sonraki çalışmaların bulutun yapısını daha iyi açıklayacağını söylüyor. Fotoğraf, birçok renkte parlayan ince gaz iplikçiklerini gösteriyor. Bu, gözlemevindeki sabırlı ve özenli çalışmanın güzel bir örneği." } });

test("gökbilim: APOD DEMO_KEY ile 500 verirse kurumun hazır lisanslı görseli (ESO Haftanın Fotoğrafı) ile gönderi çıkar; neden kodları yazılır", async () => {
  const bulut = sahteBulut();
  const f = async (url) => {
    const u = String(url);
    if (u.includes("api.nasa.gov")) return { ok: false, status: 500, headers: new Headers(), json: async () => ({}) };
    if (u.startsWith("https://cdn.eso.org/")) return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer };
    return f404();
  };
  let cagri = 0;
  const model = { yaz: async () => { cagri++; return { metin: GOKYANIT, engellendi: "", saglayici: "t" }; } };
  const s = await gokbilimUret({ bulut, model, fetchFn: f, simdi: SIMDI, cagriHakki: 2, bekleFn: async () => {}, adaylar: [ESO({ kaynak: "eso.org", link: "https://www.eso.org/public/news/eso2641/", hash: "cd".repeat(32), zaman: "2026-10-12T20:00:00Z" }), ESO()] });
  assert.equal(s.durum, "yayinlandi");
  assert.equal(cagri, 1); assert.equal(s.cagri, 1);
  assert.deepEqual(s.kullanilan, ["ab".repeat(32)]);                                 // Haftanın Fotoğrafı, daha yeni haber olsa da önce
  assert.equal(bulut.k.yayinlar[0].g.gorsel.lisans, "CC BY 4.0");
  assert.equal(bulut.k.yayinlar[0].g.gorsel.sahibi, "ESO");
  assert.equal(bulut.k.yayinlar[0].h.kategori, "gokbilim");
  assert.equal(bulut.k.yayinlar[0].ozet, "ab".repeat(32));                           // olağan haber döngüsüyle aynı özet: ikinci kez yazılmaz
  // hiçbir aday yoksa neden zinciri açık
  const yok = await gokbilimUret({ bulut: sahteBulut(), model, fetchFn: async (u) => (String(u).includes("api.nasa.gov") ? { ok: false, status: 500, headers: new Headers() } : f404()), simdi: SIMDI, bekleFn: async () => {}, adaylar: [] });
  assert.equal(yok.durum, "yok"); assert.match(yok.neden, /^apod-hata\/yedek-yok\/ay-hata$/);
});

test("tur: özel işte yayınlanan yedek gökbilim haberi haber döngüsünde ikinci kez yazılmaz; özel işler haberden ÖNCE ve ayrı bütçeyle", async () => {
  const sira = [];
  const bulut = { ...sahteBulut(), kota: async () => new Map(["felsefe", "edebiyat", "siir", "mitoloji"].map((k) => [k, { son24: 9, son7g: 9, sonZaman: "2026-10-13T11:00:00Z" }])) };
  bulut.yayinla = async (h, ozet, g) => { sira.push(h.kategori); bulut.k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; };
  const f = async (url) => {
    const u = String(url);
    if (u.includes("api.nasa.gov")) return { ok: false, status: 500, headers: new Headers() };
    if (u.startsWith("https://cdn.eso.org/")) return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer };
    return f404();
  };
  let cagri = 0;
  const model = { yaz: async (s, g) => { cagri++; return { metin: /BAŞLIK: A glowing/.test(g) ? GOKYANIT : yanit(), engellendi: "", saglayici: "t" }; } };
  const o = await tur(ayar({ ozelAcik: true, ozelCagriUst: 1, modelCagriUst: 14 }), bulut, model, [ESO({ zaman: "2026-10-13T09:00:00Z" }), aday(30)], f);
  assert.equal(sira[0], "gokbilim");                                               // özel iş turun başında
  assert.equal(bulut.k.yayinlar.filter((x) => x.ozet === baglantiOzeti(ESO().link)).length, 1);   // aynı haber ikinci kez yok
  assert.equal(bulut.k.yayinlar.length, 2);                                        // gökbilim + iyi haber
  assert.equal(o.modelCagri, 1);                                                   // haber bütçesi yalnız haberin çağrısı; özel iş ayrı (cagri 1 + 1)
  assert.equal(cagri, 2);
  assert.match(ozetSatiri(o), /ozel=gokbilim:yayin,felsefe\+edebiyat\+siir\+mitoloji:kota-dolu/);
});

test("özel işler: görseli çıkmayan alan sıradakileri tıkamaz; çağrı bütçesi ozelCagriUst'ı aşmaz", async () => {
  let cagri = 0;
  const bulut = { bilinenler: async () => new Map(), isaretle: async () => ({}), yayinla: async () => ({ durum: "eklendi" }) };
  const model = { yaz: async () => { cagri++; return { metin: JSON.stringify({ uygun: true, tr: "Çeviri: sabır her şeyin anahtarıdır ve herkes bunu bilir." }) }; } };
  const o = await ozelIsleriCalistir({ ayar: { ...ayarOku({}, []), ozelTurUst: 1, ozelDenemeUst: 5, ozelCagriUst: 2 }, bulut, model, fetchFn: f404, simdi: SIMDI, kotaDurum: new Map(), bekleFn: async () => {}, rastgele: () => 0 });
  assert.equal(o.calisan.length, 5, "hepsi denendi, hiçbiri yayınlanamadı (sayfa yok) ama sıra tıkanmadı");
  assert.ok(o.calisan.every((c) => c.neden), "her alanın nedeni var");
  assert.ok(cagri <= 2);
});

test("alıntı tonu: dinî ifade (Redeemer, God) mitoloji dışında elenir (canlı kuru turda sızan örnek)", async () => {
  const { alintiUygun } = await import("../lib/alinti.mjs");
  const c = (metin) => ({ metin, satirlar: [metin], kaynakSatiri: "Book (1895)", eser: "Book", tumKaynak: "Book (1895)", yol: ["Quotes", "Book"] });
  const yz = { olum: 1910, cevirili: false };
  assert.equal(alintiUygun(c("We have nothing to do but to receive, resting absolutely upon the merit, power, and love of our Redeemer."), "felsefe", yz).ok, false);
  const tanri = "The love of the gods is the beginning of every journey that we make in this life.";
  assert.equal(alintiUygun(c(tanri), "felsefe", yz).ok, false);
  assert.equal(alintiUygun(c(tanri), "mitoloji", yz).ok, true);
  assert.equal(alintiUygun(c("Patience is the quiet strength that carries every careful worker through a long season of effort."), "felsefe", yz).ok, true);
});
