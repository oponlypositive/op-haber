// GÖRSEL ZORUNLU kategoriler (sahip ana kuralı 2026-10-15): mutfak (tarif + içecek), oyun, sanat (haber + heykel), resim görselsiz yayınlanmaz.
// Haber: görsel bulunamazsa bekliyor_gorsel (yük saklı), 3 turda bulunamazsa elendi "gorsel-yok". Müfredat dersi: kalıcı atlanmaz, imleç ilerlemez, sıradaki ders denenir, 5 denemede kalıcı atlanır.
// Yerel kapı: yayinYuku bu kategorilerde görselsiz yük kurmaz. Sunucu ret nedenleri tanınır. Ağ yok: sahte fetch + sahte model + bellek içi bulut.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GORSEL_ZORUNLU_KATEGORILER, GorselZorunluHatasi, gorselVarMi, gorselZorunluMu, sunucuRedTuru } from "../lib/gorsel_zorunlu.mjs";
import { yayinYuku, bulutKur } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { baglantiOzeti } from "../lib/rss.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";
import { dersAnahtari, dersleriDuzle, gorselBekleAnahtari, gorselBekleDurumAnahtari, ilerlemeOku, imlecAnahtari, imlecDurumAnahtari, mufredatIsleriCalistir, mufredatUret } from "../lib/mufredat.mjs";

const SIMDI = Date.parse("2026-10-15T09:00:00Z");
const ZAMAN = "2026-10-13T08:00:00Z";
const BASLIK = "Meşk Sergisi 14-29 Ekim'de SEKA'da açılıyor";
const KAYNAK_TR = `${BASLIK}\nİzmit'teki SEKA Kâğıt Müzesi'nde Meşk Sergisi 14-29 Ekim tarihleri arasında sanatseverlerle buluşacak. Sergi kapsamında hat sanatı örnekleri sergilenecek. Giriş ücretsizdir. Sergi her gün gezilebilecek ve atölye çalışmaları yapılacak. Sanat tarihçileri ziyaretçilere eserleri tanıtacak.\nSergi alanı geniş bir salonda kurulacak.`;
const EN = "The Meshk Exhibition will open its doors at the SEKA Paper Museum in Izmit and will stay open until 29 October. It is the first time that the works of this calligraphy tradition are shown in the city in one place. Visitors can walk through the rooms, and the entry is free for all of them. Art historians will also introduce the works to the guests, and the museum has planned workshops for the public.";
const TR = "Meşk Sergisi, İzmit'teki SEKA Kâğıt Müzesi'nde 29 Ekim'e kadar sanatseverleri ağırlayacak. Hat geleneğinden seçilen eserler ilk kez bu şehirde bir arada görülecek. Ziyaretçiler salonları gezebilecek ve giriş herkes için ücretsiz olacak. Sanat tarihçileri eserleri konuklara tanıtacak ve müze halk için atölye çalışmaları hazırladı.";
const ADAY = (n = 1, ek = {}) => ({ baslik: BASLIK, ozet: KAYNAK_TR.split("\n")[1] + " " + "Sergi alanı geniş bir salonda kurulacak ve her yaştan ziyaretçi gelecek. ".repeat(2), link: `https://www.kocaelihaber.example/h/${n}`, kaynak: "kocaelihaber.example", dil: "tr", zaman: ZAMAN, alan: "mahalle", kaynakGuvenilir: true, ...ek });

// ================================================================ yerel kapı + tanıma
test("kategori kümesi: mutfak, oyun, sanat, resim + (2026-10-16) doga, tarih, astroloji; öbürleri serbest", () => {
  assert.deepEqual([...GORSEL_ZORUNLU_KATEGORILER].sort(), ["astroloji", "doga", "mutfak", "muzik", "oyun", "resim", "sanat", "tarih"]);
  for (const k of ["mutfak", "oyun", "sanat", "resim", "doga", "tarih", "astroloji"]) assert.equal(gorselZorunluMu(k), true, k);
  for (const k of ["iyilik", "spor", "bilim", "felsefe", "hayvanlar", "gokbilim", "huzur", "mahalle", "", undefined]) assert.equal(gorselZorunluMu(k), false, String(k));
  assert.equal(gorselVarMi(null), false); assert.equal(gorselVarMi({ gorsel: {}, b64: "" }), false); assert.equal(gorselVarMi({ gorsel: { sahibi: "x" }, b64: "AAAA", tur: "image/jpeg" }), true);
});
test("yayinYuku: görsel zorunlu kategoride görsel yoksa yük HİÇ kurulmaz; görselle kurulur; serbest kategori görselsiz kurulur", () => {
  const h = (kategori) => ({ id: "habc", tr: { baslik: "t", ozet: "o" }, en: { baslik: "e", ozet: "o" }, kategori, yer: "Dünya", kaynak: "k", link: "https://a.b/c", zaman: "2026-10-15T08:00:00Z", model: "m" });
  const g = { gorsel: { sahibi: "x", lisans: "CC0", lisans_url: "", kaynak_url: "", saglayici: "wikimedia" }, b64: "AAAA", tur: "image/jpeg" };
  for (const k of ["mutfak", "oyun", "sanat", "resim", "doga", "tarih", "astroloji"]) {
    assert.throws(() => yayinYuku(h(k), "ab".repeat(32), null), GorselZorunluHatasi, k);
    assert.throws(() => yayinYuku(h(k), "ab".repeat(32), { gorsel: g.gorsel, b64: "" }), GorselZorunluHatasi, k);
    assert.equal(yayinYuku(h(k), "ab".repeat(32), g).gorselB64, "AAAA");
  }
  assert.equal(yayinYuku(h("iyilik"), "ab".repeat(32), null).islem, "yayinla");
});
test("bulutKur.yayinla: görsel zorunlu kategoride görselsiz çağrı AĞA HİÇ ÇIKMAZ, sunucuyla aynı red nedeni döner", async () => {
  let istek = 0;
  const bulut = bulutKur({ fnUrl: "https://x.example/fn", anahtar: "a", fetchFn: async () => { istek++; return { ok: true, json: async () => ({ durum: "eklendi" }) }; }, bekleFn: async () => {} });
  const h = { id: "habc", tr: { baslik: "t", ozet: "o" }, en: { baslik: "e", ozet: "o" }, kategori: "oyun", yer: "Dünya", kaynak: "k", link: "https://a.b/c", zaman: "2026-10-15T08:00:00Z", model: "m" };
  const r = await bulut.yayinla(h, "ab".repeat(32), null);
  assert.equal(r.durum, "red"); assert.equal(sunucuRedTuru(r.neden), "gorsel-zorunlu"); assert.equal(istek, 0);
  const r2 = await bulut.yayinla({ ...h, kategori: "iyilik" }, "ab".repeat(32), null);
  assert.equal(r2.durum, "eklendi"); assert.equal(istek, 1);
});
test("sunucu ret nedenleri tanınır", () => {
  assert.equal(sunucuRedTuru("görsel zorunlu kategori: görselsiz yayınlanmaz"), "gorsel-zorunlu");
  assert.equal(sunucuRedTuru("yayin-red: gorsel zorunlu kategori"), "gorsel-zorunlu");
  assert.equal(sunucuRedTuru("kategori tanımsız"), "kategori-tanimsiz");
  assert.equal(sunucuRedTuru("Kategori Tanımsız"), "kategori-tanimsiz");
  assert.equal(sunucuRedTuru("lisans geçersiz"), ""); assert.equal(sunucuRedTuru(undefined), "");
});
test("ayar: yeni görsel zorunlu varsayılanları ve sınırları", () => {
  const a = ayarOku({}, []);
  assert.equal(a.gorselZorunluDenemeUst, 3); assert.equal(a.mufredatGorselDenemeUst, 5); assert.equal(a.mufredatGorselDersUst, 2); assert.equal(a.mufredatGorselGeriUst, 3);
  const b = ayarOku({ GORSEL_ZORUNLU_DENEME_UST: "5", MUFREDAT_GORSEL_DENEME_UST: "8" }, []);
  assert.equal(b.gorselZorunluDenemeUst, 5); assert.equal(b.mufredatGorselDenemeUst, 8);
});

// ================================================================ HABER: bekletme, 3 turda eleme, sunucu ret nedenleri
function hatBulut(kayitlar = new Map(), { yayinla } = {}) {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async (l) => new Map(l.filter((x) => kayitlar.has(x)).map((x) => [x, kayitlar.get(x)])), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; },
    yayinla: yayinla || (async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; }) };
}
const fetch404 = async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) });
const hatAyar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, onSinifAdet: 0, ...ek });
const hatTur = (bulut, model, adaylar, ek = {}) => turCalistir({ ayar: hatAyar(ek), kaynaklar: {}, bulut, model, fetchFn: fetch404, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar, hatalar: [] } });
const yanit = (kategori, alt) => JSON.stringify({ uygun: true, kategori, yer: "İzmit, Türkiye", alt_konu: alt, en: { baslik: "Meshk Exhibition opens in Izmit", ozet: EN }, tr: { baslik: "Meşk Sergisi İzmit'te sanatseverlerle buluşuyor", ozet: TR } });
const sayacliModel = (metin) => { const m = { yazim: 0, yaz: async (s, g, sec = {}) => { if (!sec.resim) m.yazim++; return { metin, engellendi: "", saglayici: "taklit" }; } }; return m; };

test("haber: sanat haberi görselsiz YAYINLANMAZ; bekliyor_gorsel (yük saklı) -> sonraki turda yalnız görsel aranır (yazım yok) -> 3. turda elendi gorsel-yok", async () => {
  const model = sayacliModel(yanit("sanat", "resim-sergi"));
  const a = ADAY(1, { alan: "sanat", zaman: "2026-10-15T07:00:00Z" }), hash = baglantiOzeti(a.link);
  // tur 1
  const b1 = hatBulut();
  const o1 = await hatTur(b1, model, [a]);
  assert.equal(b1.k.yayinlar.length, 0); assert.equal(o1.yayinlanan, 0); assert.equal(o1.gorselsiz, 0);
  const i1 = b1.k.isaretler.find((x) => x.ozet === hash);
  assert.equal(i1.durum, "bekliyor_gorsel"); assert.equal(i1.deneme, 1); assert.ok(i1.yuk?.tr?.baslik && i1.yuk?.en?.baslik && i1.yuk?.id, "yük saklı"); assert.equal(i1.yuk.kategori, "sanat");
  assert.deepEqual(o1.gorselZorunlu, { bekletilen: 1, atlanan: 0 }); assert.match(ozetSatiri(o1), / gorselZorunlu=bekletilen:1,atlanan:0/);
  assert.equal(model.yazim, 1);
  // tur 2: saklı yükle; yazım çağrısı YOK
  const b2 = hatBulut(new Map([[hash, { ozet: hash, durum: "bekliyor_gorsel", deneme: 1, yuk: i1.yuk }]]));
  const o2 = await hatTur(b2, model, [a]);
  assert.equal(model.yazim, 1, "yazım yeniden yapılmadı"); assert.equal(b2.k.yayinlar.length, 0);
  const i2 = b2.k.isaretler.find((x) => x.ozet === hash);
  assert.equal(i2.durum, "bekliyor_gorsel"); assert.equal(i2.deneme, 2); assert.deepEqual(o2.gorselZorunlu, { bekletilen: 1, atlanan: 0 });
  // tur 3: eşik (3) -> elendi gorsel-yok
  const b3 = hatBulut(new Map([[hash, { ozet: hash, durum: "bekliyor_gorsel", deneme: 2, yuk: i1.yuk }]]));
  const o3 = await hatTur(b3, model, [a]);
  const i3 = b3.k.isaretler.find((x) => x.ozet === hash);
  assert.equal(i3.durum, "elendi"); assert.equal(i3.neden, "gorsel-yok"); assert.equal(b3.k.yayinlar.length, 0);
  assert.deepEqual(o3.gorselZorunlu, { bekletilen: 0, atlanan: 1 }); assert.match(ozetSatiri(o3), / gorselZorunlu=bekletilen:0,atlanan:1/);
  // ayarlanabilir eşik: 5 -> 3. turda hâlâ bekler
  const b4 = hatBulut(new Map([[hash, { ozet: hash, durum: "bekliyor_gorsel", deneme: 2, yuk: i1.yuk }]]));
  await hatTur(b4, model, [a], { gorselZorunluDenemeUst: 5 });
  assert.equal(b4.k.isaretler.find((x) => x.ozet === hash).durum, "bekliyor_gorsel");
});
test("haber: görselsiz kuyruk kuralı (gorselsizUst) bu kategorilere UYGULANMAZ; serbest kategori görselsiz yayınlanmaya devam eder", async () => {
  const sanat = ADAY(1, { alan: "sanat", zaman: "2026-10-15T07:00:00Z" });
  const bS = hatBulut();
  const oS = await hatTur(bS, sayacliModel(yanit("sanat", "resim-sergi")), [sanat], { gorselsizYayin: true, gorselsizUst: 99 });
  assert.equal(bS.k.yayinlar.length, 0); assert.equal(oS.gorselZorunlu.bekletilen, 1);
  const mah = ADAY(2, { alan: "mahalle", zaman: "2026-10-15T07:00:00Z" });
  const bM = hatBulut();
  const oM = await hatTur(bM, sayacliModel(yanit("mahalle", "topluluk-projesi")), [mah], { gorselsizYayin: true, gorselsizUst: 3 });
  assert.equal(bM.k.yayinlar.length, 1); assert.equal(oM.gorselsiz, 1); assert.deepEqual(oM.gorselZorunlu, { bekletilen: 0, atlanan: 0 });
});
test("haber: sunucu 'görsel zorunlu kategori' reddi bekletme yoluna girer (elenmez); 'kategori tanımsız' hesabı atlatır, uyarı satıra düşer, başka kategoriye kaydırılmaz", async () => {
  const a = ADAY(3, { alan: "mahalle", zaman: "2026-10-15T07:00:00Z" }), hash = baglantiOzeti(a.link);
  const model = sayacliModel(yanit("mahalle", "topluluk-projesi"));
  const b1 = hatBulut(new Map(), { yayinla: async () => ({ durum: "red", neden: "görsel zorunlu kategori: görselsiz yayınlanmaz" }) });
  const o1 = await hatTur(b1, model, [a]);
  const i1 = b1.k.isaretler.find((x) => x.ozet === hash);
  assert.equal(i1.durum, "bekliyor_gorsel"); assert.equal(i1.deneme, 1); assert.ok(i1.yuk?.id); assert.deepEqual(o1.gorselZorunlu, { bekletilen: 1, atlanan: 0 });
  const b2 = hatBulut(new Map([[hash, { ozet: hash, durum: "bekliyor_gorsel", deneme: 2, yuk: i1.yuk }]]), { yayinla: async () => ({ durum: "red", neden: "görsel zorunlu kategori: görselsiz yayınlanmaz" }) });
  const o2 = await hatTur(b2, model, [a]);
  assert.equal(b2.k.isaretler.find((x) => x.ozet === hash).neden, "gorsel-yok"); assert.equal(o2.gorselZorunlu.atlanan, 1);
  const gonderilen = [];
  const b3 = hatBulut(new Map(), { yayinla: async (h) => { gonderilen.push(h.kategori); return { durum: "red", neden: "kategori tanımsız" }; } });
  const o3 = await hatTur(b3, model, [a]);
  assert.deepEqual(gonderilen, ["mahalle"], "kategori değiştirilmeden bir kez denendi");
  const i3 = b3.k.isaretler.find((x) => x.ozet === hash);
  assert.equal(i3.durum, "elendi"); assert.match(i3.neden, /kategori-tanimsiz/); assert.deepEqual(o3.kategoriUyari, ["mahalle"]); assert.match(ozetSatiri(o3), / kategoriUyari=mahalle/);
  assert.deepEqual(o3.gorselZorunlu, { bekletilen: 0, atlanan: 0 });
});

// ================================================================ MÜFREDAT: ders atlanmaz, imleç ilerlemez, 5 denemede kalıcı atlama
const jpeg = (w, h) => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03], 0); return u; };
const jsonYanit = (o) => ({ ok: true, status: 200, headers: new Headers(), json: async () => o });
const KAYNAK_OYUN = "Saklambaç, çocukların ve gençlerin sıkça oynadığı geleneksel bir oyundur. Bir oyuncu ebe olur ve gözlerini kapatarak sayı sayar. Diğer oyuncular bu sırada saklanır. Ebe daha sonra saklananları bulmaya çalışır. Bulunan oyuncu oyundan çıkar ve son bulunan oyuncu yeni ebe olur. Oyun herhangi bir araç gerektirmez ve bahçede ya da evde oynanabilir. ";
function sahteDunya({ olay = [] } = {}) {
  return async (url) => {
    const u = String(url); olay.push(u);
    if (/wikipedia\.org\/w\/api\.php/.test(u)) {
      const baslik = decodeURIComponent((u.match(/titles=([^&]+)/) || [])[1] || "").replace(/\+/g, " ");
      return jsonYanit({ query: { pages: [{ title: baslik, extract: KAYNAK_OYUN.repeat(3), fullurl: `https://tr.wikipedia.org/wiki/${encodeURIComponent(baslik)}` }] } });
    }
    if (u.includes("commons.wikimedia.org")) {
      const baslik = decodeURIComponent((u.match(/titles=([^&]+)/) || [])[1] || "").replace(/\+/g, " ");
      if (/YOK/.test(baslik)) return jsonYanit({ query: { pages: [{ title: baslik, missing: true }] } });
      return jsonYanit({ query: { pages: [{ title: baslik, imageinfo: [{ thumburl: "https://upload.wikimedia.org/ornek.jpg", thumbwidth: 1300, thumbheight: 900, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/" + baslik, extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: "Test Fotoğrafçı" } } }] }] } });
    }
    if (u.includes("upload.wikimedia.org")) { const b = jpeg(1300, 900); return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => b.buffer }; }
    return { ok: false, status: 404, headers: new Headers(), json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
}
// durumlu: hat_durum (durumOku/durumYaz) var; durumlu=false: yalnız haber_gorulen yolu
function mufBulut({ durumlu = true, yayinla = null } = {}) {
  const kayit = new Map(), durum = new Map(), yayin = [];
  const b = { kayit, durum, yayin,
    async bilinenler(ozetler) { const m = new Map(); for (const o of ozetler) if (kayit.has(o)) m.set(o, kayit.get(o)); return m; },
    async isaretle(liste) { for (const k of liste) kayit.set(k.ozet, { ozet: k.ozet, durum: k.durum, deneme: k.deneme || 0, yuk: k.yuk ?? null, neden: k.neden }); return { yazildi: liste.length }; },
    async yayinla(haber, ozet, gorsel) {
      if (yayinla) { const r = yayinla(haber, gorsel); if (r) return r; }
      if (kayit.get(ozet)?.durum === "yayinlandi") return { durum: "var" };
      yayin.push({ haber, ozet, gorsel }); kayit.set(ozet, { ozet, durum: "yayinlandi", yuk: null }); return { durum: "eklendi" };
    } };
  if (durumlu) { b.durumOku = async (an) => new Map(an.filter((a) => durum.has(a)).map((a) => [a, durum.get(a)])); b.durumYaz = async (an, d) => { durum.set(an, d); return true; }; }
  return b;
}
const SABIT = { tr: "Saklambaç, bir oyuncunun sayı saydığı, diğerlerinin saklandığı sade bir çocuk oyunudur. Bulunan oyuncu çıkar.", en: "Hide and seek is a simple children's game in which one player counts while the others hide. A found player leaves." };
const ders = (id, gorsel) => ({ id, baslik_tr: `Ders ${id}`, baslik_en: `Lesson ${id}`, tur: "bilgi", kaynak: { wiki_tr: "Saklambaç" }, sabit: SABIT, gorsel: { dosya: gorsel } });
function oyunMuf(idler, { yok = ["d0"], kategori = "oyun" } = {}) {
  const m = { hesap: "op_oyun", kategori, gunlukUst: 9, seriler: [{ yol: ["Oyunlar"], aciklama_tr: "Seri açıklaması burada.", aciklama_en: "Series description.", dersler: idler.map((id) => ders(id, yok.includes(id) ? "YOK.jpg" : "OK.jpg")) }] };
  return { ...m, dersler: dersleriDuzle(m) };
}
const YUVA = { neden: "", ozet: "" };
const gunNo = (g) => Date.UTC(2026, 9, 15 + g, 10, 0, 0);
const dene = (m, bulut, g, ek = {}) => mufredatUret({ m, dersler: m.dersler, bulut, model: null, fetchFn: sahteDunya(), simdi: gunNo(g), cagriHakki: 4, bekleFn: async () => {}, yuva: YUVA, ...ek });
const gorselAyar = { denemeUst: 5, dersUst: 2, geriUst: 3 };

test("müfredat: görseli olmayan ders KALICI ATLANMAZ, imleç ilerlemez; o tur sıradaki ders denenip yayınlanır; sonraki turda bekleyen ders yine ilk denenir", async () => {
  const m = oyunMuf(["d0", "d1", "d2", "d3", "d4", "d5"]);
  const b = mufBulut();
  const r1 = await dene(m, b, 0, { gorselAyar });
  assert.equal(r1.durum, "yayinlandi"); assert.equal(b.yayin.length, 1); assert.equal(b.yayin[0].haber.seri.sira, 2, "d1 yayınlandı");
  assert.ok(b.yayin[0].gorsel?.b64, "görselli yayınlandı");
  assert.deepEqual(r1.gorselZorunlu, { bekleyen: ["d0"], atlanan: [] });
  assert.equal(b.durum.get(imlecDurumAnahtari("op_oyun")), undefined, "imleç ilerlemedi");
  assert.equal(b.kayit.has(dersAnahtari("op_oyun", "d0")), false, "d0 kalıcı atlanmadı (anahtar yok)");
  assert.deepEqual(b.durum.get(gorselBekleDurumAnahtari("op_oyun")).d.d0.n, 1);
  assert.equal((await ilerlemeOku({ bulut: b, hesap: "op_oyun", dersler: m.dersler })).sira, 0, "sıradaki ders hâlâ d0");
  // tur 2: d0 yine denenir (n=2); d1 yayınlanmış -> atlanır; d2 yayınlanır
  const r2 = await dene(m, b, 1, { gorselAyar });
  assert.equal(r2.durum, "yayinlandi"); assert.equal(b.yayin.length, 2); assert.equal(b.yayin[1].haber.seri.sira, 3);
  assert.equal(b.durum.get(gorselBekleDurumAnahtari("op_oyun")).d.d0.n, 2); assert.equal(b.durum.get(imlecDurumAnahtari("op_oyun")), undefined);
  // tur 3: n=3, d3 yayınlanır (bekleyenin 3 ders ilerisi)
  const r3 = await dene(m, b, 2, { gorselAyar });
  assert.equal(r3.durum, "yayinlandi"); assert.equal(b.yayin[2].haber.seri.sira, 4); assert.equal(b.durum.get(gorselBekleDurumAnahtari("op_oyun")).d.d0.n, 3);
  // tur 4: n=4; d4 bekleyenin 4 ders ilerisi (> 3 geri sınırı) -> yayın YOK
  const r4 = await dene(m, b, 3, { gorselAyar });
  assert.equal(r4.durum, "yok"); assert.equal(r4.neden, "gorsel-yok"); assert.equal(b.yayin.length, 3); assert.equal(b.durum.get(gorselBekleDurumAnahtari("op_oyun")).d.d0.n, 4);
  // tur 5: 5. denemede d0 KALICI atlanır (elendi), sonra d4 yayınlanır ve imleç artık ilerler
  const r5 = await dene(m, b, 4, { gorselAyar });
  assert.deepEqual(r5.gorselZorunlu.atlanan, ["d0"]); assert.equal(b.kayit.get(dersAnahtari("op_oyun", "d0")).durum, "elendi"); assert.match(b.kayit.get(dersAnahtari("op_oyun", "d0")).neden, /^gorsel-yok:5/);
  assert.equal(r5.durum, "yayinlandi"); assert.equal(b.yayin.length, 4); assert.equal(b.yayin[3].haber.seri.sira, 5);
  assert.equal(b.durum.get(imlecDurumAnahtari("op_oyun")).n, 5); assert.equal(b.durum.get(gorselBekleDurumAnahtari("op_oyun")).d.d0, undefined, "bekleyen listesinden çıktı");
});
test("müfredat: hat_durum yoksa deneme sayacı haber_gorulen (bekliyor_gorsel + deneme) üzerinden tutulur", async () => {
  const m = oyunMuf(["d0", "d1", "d2"]);
  const b = mufBulut({ durumlu: false });
  await dene(m, b, 0, { gorselAyar });
  assert.equal(b.kayit.get(gorselBekleAnahtari("op_oyun", "d0")).deneme, 1); assert.equal(b.kayit.get(gorselBekleAnahtari("op_oyun", "d0")).durum, "bekliyor_gorsel");
  for (let n = 1; n <= 3; n++) assert.equal(b.kayit.has(imlecAnahtari("op_oyun", n)), false);
  await dene(m, b, 1, { gorselAyar });
  assert.equal(b.kayit.get(gorselBekleAnahtari("op_oyun", "d0")).deneme, 2);
  assert.equal(b.kayit.has(dersAnahtari("op_oyun", "d0")), false);
});
test("müfredat: tur başına görsel için en çok mufredatGorselDersUst (2) ders denenir; hepsinde görsel yoksa yayın yok, hiçbiri atlanmaz", async () => {
  const m = oyunMuf(["d0", "d1", "d2", "d3"], { yok: ["d0", "d1", "d2", "d3"] });
  const b = mufBulut();
  const r = await dene(m, b, 0, { gorselAyar });
  assert.equal(r.durum, "yok"); assert.equal(r.neden, "gorsel-yok"); assert.equal(b.yayin.length, 0);
  assert.deepEqual(r.gorselZorunlu.bekleyen, ["d0", "d1"]); assert.deepEqual(r.gorselZorunlu.atlanan, []);
  assert.deepEqual(Object.keys(b.durum.get(gorselBekleDurumAnahtari("op_oyun")).d), ["d0", "d1"]);
});
test("müfredat: serbest kategori (felsefe) davranışı DEĞİŞMEZ: görselsiz bilgi dersi yayınlanır, bekleme kaydı yok", async () => {
  const m = oyunMuf(["d0", "d1"], { kategori: "felsefe" });
  const b = mufBulut();
  const r = await dene(m, b, 0, { gorselAyar });
  assert.equal(r.durum, "yayinlandi"); assert.equal(b.yayin.length, 1); assert.deepEqual(r.gorselZorunlu, { bekleyen: [], atlanan: [] });
  assert.equal(b.yayin[0].haber.seri.sira, 1); assert.equal(b.durum.get(gorselBekleDurumAnahtari("op_oyun")), undefined);
});
test("müfredat: sunucu 'görsel zorunlu' reddi bekletme yoluna girer (kalıcı atlama yok); 'kategori tanımsız' dersi işaretlemez, hesap bu tur atlanır", async () => {
  const m = oyunMuf(["d0", "d1"], { yok: [] });
  const b1 = mufBulut({ yayinla: () => ({ durum: "red", neden: "görsel zorunlu kategori: görselsiz yayınlanmaz" }) });
  const r1 = await dene(m, b1, 0, { gorselAyar });
  assert.equal(r1.durum, "yok"); assert.deepEqual(r1.gorselZorunlu.bekleyen, ["d0", "d1"]);
  assert.equal(b1.kayit.has(dersAnahtari("op_oyun", "d0")), false); assert.equal(b1.durum.get(gorselBekleDurumAnahtari("op_oyun")).d.d1.n, 1);
  const b2 = mufBulut({ yayinla: () => ({ durum: "red", neden: "kategori tanımsız" }) });
  const r2 = await dene(m, b2, 0, { gorselAyar });
  assert.equal(r2.durum, "yok"); assert.equal(r2.neden, "kategori-tanimsiz"); assert.equal(r2.uyari, "kategori-tanimsiz");
  assert.equal(b2.kayit.has(dersAnahtari("op_oyun", "d0")), false, "ders elendi işaretlenmedi"); assert.equal(r2.ilerleme.sira, 0);
});
test("müfredat: tarif dersi görsel zorunluysa GÖRSEL ÖNCE aranır; görsel yoksa model yazım çağrısı hiç yapılmaz", async () => {
  const say = { n: 0 };
  const model = { yaz: async () => { say.n++; return { metin: "{}" }; } };
  const m = { hesap: "op_mutfak", kategori: "mutfak", gunlukUst: 3, seriler: [{ yol: ["Çorbalar"], dersler: [{ id: "t0", baslik_tr: "Mercimek çorbası", baslik_en: "Lentil soup", tur: "tarif", kaynak: { wiki_tr: "Saklambaç" }, gorsel: { dosya: "YOK.jpg" } }] }] };
  const mm = { ...m, dersler: dersleriDuzle(m) };
  const b = mufBulut();
  const r = await mufredatUret({ m: mm, dersler: mm.dersler, bulut: b, model, fetchFn: sahteDunya(), simdi: gunNo(0), cagriHakki: 4, bekleFn: async () => {}, yuva: YUVA, gorselAyar });
  assert.equal(r.durum, "yok"); assert.equal(r.neden, "gorsel-yok"); assert.equal(say.n, 0, "model çağrılmadı"); assert.deepEqual(r.gorselZorunlu.bekleyen, ["t0"]); assert.equal(b.yayin.length, 0);
});
test("mufredatIsleriCalistir: bekletilen/atlanan toplamı ve kategori uyarısı özet nesnesine, oradan özet satırına yansır", async () => {
  const m = oyunMuf(["d0", "d1", "d2"]);
  const b = mufBulut();
  const ayar = { ...ayarOku({}, []), mufredatTurUst: 3, mufredatCagriUst: 8, mufredatDenemeUst: 6, ogretmenPlan: false };
  const o = await mufredatIsleriCalistir({ ayar, bulut: b, model: null, fetchFn: sahteDunya(), simdi: gunNo(0), bekleFn: async () => {}, yukleme: { harita: new Map([[m.hesap, m]]), hatalar: [] } });
  assert.equal(o.yayin, 1); assert.deepEqual(o.gorselZorunlu, { bekletilen: 1, atlanan: 0 }); assert.deepEqual(o.kategoriUyari, []);
  const b2 = mufBulut({ yayinla: () => ({ durum: "red", neden: "kategori tanımsız" }) });
  const o2 = await mufredatIsleriCalistir({ ayar, bulut: b2, model: null, fetchFn: sahteDunya(), simdi: gunNo(0), bekleFn: async () => {}, yukleme: { harita: new Map([[m.hesap, { ...m }]]), hatalar: [] } });
  assert.deepEqual(o2.kategoriUyari, ["op_oyun"]); assert.ok(o2.notlar.some((n) => /UYARI op_oyun/.test(n)));
  const satir = ozetSatiri({ aday: 1, gorselZorunlu: { bekletilen: 2, atlanan: 1 }, gorselAtlananDersler: ["op_oyun/d0"], kategoriUyari: ["op_oyun", "op_oyun"] });
  assert.match(satir, / gorselZorunlu=bekletilen:2,atlanan:1 gorselAtlananDers=op_oyun\/d0 kategoriUyari=op_oyun/);
});

// ================================================================ 2026-10-17: DERS DÜZEYİNDE görsel zorunluluğu (duruş / pozisyon / egzersiz / teknik dersleri)
import { dersGorselZorunlu, dersPozAdi, HAREKET_HESAPLARI } from "../lib/gorsel_zorunlu.mjs";
test("dersGorselZorunlu: op_yoga/op_hareket/op_spor(fitness-kalistenik-pilates)/op_meditasyon duruş-egzersiz dersleri zorunlu; kavram/tarih/dal dersleri değil; açık işaret kazanır", async () => {
  const yukle = async (h) => (await import(`../lib/mufredat/${h}.mjs`)).default;
  const zor = async (h) => { const m = await yukle(h); return m.seriler.flatMap((s) => s.dersler.map((d) => ({ ...d, yol: s.yol }))).filter((d) => dersGorselZorunlu(m, d)).map((d) => d.id); };
  const yoga = await zor("op_yoga"), har = await zor("op_hareket"), spor = await zor("op_spor"), med = await zor("op_meditasyon");
  for (const id of ["dag-durusu", "agac-durusu", "cocuk-durusu", "kobra-durusu", "asagi-yonlu-kopek", "kalca-acma", "oturarak-burma"]) assert.ok(yoga.includes(id), `yoga ${id}`);
  for (const id of ["squat", "duvar-sinav", "plank-kolay", "durus", "kalca-esnetme", "tek-ayak"]) assert.ok(har.includes(id), `hareket ${id}`);
  for (const id of ["sinav", "barfiks", "squat", "plank", "mekik", "egzersiz", "govde-merkezi"]) assert.ok(spor.includes(id), `spor ${id}`);
  assert.ok(med.includes("rahat-oturus"), "meditasyon: beden duruşu dersi");
  for (const id of ["yoga-nedir", "solunum-temeli", "yoga-hazirlik"]) assert.ok(!yoga.includes(id), `yoga ${id} zorunlu olmamalı`);
  for (const id of ["futbol-nedir", "futbol-kurallari", "olimpiyat-komitesi", "joseph-pilates", "fitness-nedir", "spor-salonu", "satranc-acilis"]) assert.ok(!spor.includes(id), `spor ${id} zorunlu olmamalı`);
  assert.ok(!med.includes("meditasyon-nedir") && !med.includes("sefkat"), "meditasyonun zihinsel dersleri serbest");
  assert.deepEqual(HAREKET_HESAPLARI, ["op_yoga", "op_hareket", "op_spor", "op_meditasyon"]);
  // açık işaret: gorselZorunlu true/false anahtar sözcüğü ezer; görsel zorunlu kategori her zaman zorunlu
  assert.equal(dersGorselZorunlu({ hesap: "op_yoga", kategori: "huzur" }, { id: "yoga-nedir", baslik_tr: "Yoga Nedir?", gorselZorunlu: true }), true);
  assert.equal(dersGorselZorunlu({ hesap: "op_yoga", kategori: "huzur" }, { id: "dag-durusu", baslik_tr: "Dağ Duruşu", gorselZorunlu: false }), false);
  assert.equal(dersGorselZorunlu({ hesap: "op_oyun", kategori: "oyun" }, { id: "x", baslik_tr: "x" }), true);
  assert.equal(dersGorselZorunlu({ hesap: "op_gelisim", kategori: "gelisim" }, { id: "duruş", baslik_tr: "Duruş" }), false, "hareket hesabı olmayan hesapta anahtar sözcük zorunluluk getirmez");
  assert.equal(dersPozAdi({ hesap: "op_yoga", kategori: "huzur" }, { id: "agac-durusu", baslik_tr: "Ağaç Duruşu", baslik_en: "Tree Pose" }), "Tree Pose");
  assert.equal(dersPozAdi({ hesap: "op_yoga", kategori: "huzur" }, { id: "yoga-nedir", baslik_tr: "Yoga Nedir?", baslik_en: "What Is Yoga?" }), "");
});
test("müfredat: duruş/egzersiz dersi görsel bulunamazsa YAYINLANMAZ ve bekletilir (kategori görsel zorunlu olmasa da); kavram dersi görselsiz yayınlanır", async () => {
  const mk = (hesap, kategori, yol, idler) => {
    const m = { hesap, kategori, gunlukUst: 9, seriler: [{ yol, aciklama_tr: "Seri açıklaması burada.", aciklama_en: "Series description.", dersler: idler.map(([id, yok]) => ders(id, yok ? "YOK.jpg" : "OK.jpg")) }] };
    return { ...m, dersler: dersleriDuzle(m) };
  };
  // yoga: ağaç duruşu (görsel yok) bekler; yoga-nedir (görsel yok ama kavram dersi) görselsiz yayınlanır
  const m0 = mk("op_yoga", "huzur", ["Temel Duruşlar"], [["agac-durusu", true]]), m1 = mk("op_yoga", "huzur", ["Yogaya Başlangıç"], [["yoga-nedir", true]]);
  const mseri = { ...m0, seriler: [m0.seriler[0], m1.seriler[0]] }; const m = { ...mseri, dersler: dersleriDuzle(mseri) };
  const b = mufBulut();
  const r = await dene(m, b, 0, { gorselAyar });
  assert.equal(r.durum, "yayinlandi"); assert.equal(b.yayin.length, 1); assert.match(b.yayin[0].haber.tr.baslik, /yoga-nedir/, "yoga-nedir yayınlandı");
  assert.ok(!b.yayin[0].gorsel?.b64, "kavram dersi görselsiz"); assert.deepEqual(r.gorselZorunlu, { bekleyen: ["agac-durusu"], atlanan: [] });
  assert.equal(b.kayit.has(dersAnahtari("op_yoga", "agac-durusu")), false, "duruş dersi atlanmadı, bekliyor");
  // görsel bulunan duruş dersi görselle yayınlanır
  const m2 = mk("op_yoga", "huzur", ["Temel Duruşlar"], [["dag-durusu", false]]);
  const b2 = mufBulut();
  const r2 = await dene(m2, b2, 0, { gorselAyar });
  assert.equal(r2.durum, "yayinlandi"); assert.ok(b2.yayin[0].gorsel?.b64, "duruş dersi görselli");
  // spor: dal dersi (futbol) görselsiz serbest; kalistenik plank görselsiz bekler
  const ms = mk("op_spor", "spor", ["Spor Dalları", "Futbol"], [["futbol-nedir", true]]);
  const bs = mufBulut();
  assert.equal((await dene(ms, bs, 0, { gorselAyar })).durum, "yayinlandi"); assert.ok(!bs.yayin[0].gorsel?.b64);
  const mp = mk("op_spor", "spor", ["Spor Dalları", "Kalistenik"], [["plank", true]]);
  const bp = mufBulut();
  const rp = await dene(mp, bp, 0, { gorselAyar });
  assert.equal(rp.durum, "yok"); assert.equal(bp.yayin.length, 0); assert.deepEqual(rp.gorselZorunlu.bekleyen, ["plank"]);
});
