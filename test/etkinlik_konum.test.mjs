// Etkinlik mekân koordinatı (lib/etkinlik_konum.mjs): Wikidata -> Photon, il doğrulaması, Türkiye kutusu, önbellek, istek sınırı, yük sözleşmesi. Ağ yok (sahte fetch).
import { test } from "node:test";
import assert from "node:assert/strict";
import { IL_MERKEZ, KONUM_UA, etkinlikKonumlari, ilIcinde, konumAnahtari, konumOzetMetni, mekanAdiEsit, mesafeKm } from "../lib/etkinlik_konum.mjs";
import { SEHIRLER, etkinlikYukuGecerli, konumGecerli } from "../lib/etkinlik.mjs";
import { yayinYuku } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { ozetSatiri } from "../hat.mjs";

const SIMDI = Date.parse("2026-10-15T09:00:00Z");
const E = (ek = {}) => ({ ad: "Meşk Sergisi", sehir: "Kocaeli", mekan: "SEKA Kâğıt Müzesi", baslangic: "2026-10-14", bitis: "2026-10-29", tur: "sergi", ...ek });
const SEKA = [40.75934, 29.94085];

/** Sahte fetch: url'ye göre yanıt; çağrı günlüğü tutar. */
function sahteAg({ wdAra = [], wdVarlik = {}, photon = [], durum = {} } = {}) {
  const g = [];
  const fetchFn = async (url, opt) => {
    g.push({ url: String(url), ua: opt?.headers?.["User-Agent"] });
    const u = new URL(url);
    const ok = (j) => ({ ok: true, status: 200, json: async () => j });
    if (durum[u.hostname]) return { ok: false, status: durum[u.hostname], json: async () => ({}) };
    if (u.hostname === "www.wikidata.org") return u.searchParams.get("action") === "wbsearchentities" ? ok({ search: wdAra }) : ok({ entities: wdVarlik });
    if (u.hostname === "photon.komoot.io") return ok({ features: photon });
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetchFn, g };
}
const P625 = (lat, lon) => ({ P625: [{ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: { latitude: lat, longitude: lon } } } }] });
const WD_SEKA = (lat = SEKA[0], lon = SEKA[1]) => ({ wdAra: [{ id: "Q1", label: "SEKA Kağıt Müzesi", match: { type: "label", text: "SEKA Kağıt Müzesi" } }], wdVarlik: { Q1: { claims: P625(lat, lon) } } });
const FEAT = (ad, lat, lon, cc = "TR") => ({ geometry: { coordinates: [lon, lat] }, properties: { name: ad, countrycode: cc } });
const bulutKur = () => { const durum = new Map(); return { durum, durumOku: async (an) => new Map(an.filter((a) => durum.has(a)).map((a) => [a, durum.get(a)])), durumYaz: async (an, d) => { durum.set(an, d); return true; } }; };
const calis = (ag, etkinlikler, ek = {}) => etkinlikKonumlari({ etkinlikler, fetchFn: ag.fetchFn, bekleFn: async () => {}, simdi: SIMDI, ...ek });

test("il merkezleri SEHIRLER ile bire bir, hepsi Türkiye kutusunda; mesafe/ilIcinde/ad eşitliği", () => {
  assert.equal(Object.keys(IL_MERKEZ).length, 81);
  for (const s of SEHIRLER) assert.ok(IL_MERKEZ[s], s);
  for (const s of Object.keys(IL_MERKEZ)) assert.ok(ilIcinde(...IL_MERKEZ[s], s), s);
  assert.ok(ilIcinde(...SEKA, "Kocaeli")); assert.ok(!ilIcinde(...SEKA, "Ankara")); assert.ok(!ilIcinde(48.85, 2.35, "İstanbul"));
  assert.ok(mesafeKm([41, 29], [41, 29]) < 0.001); assert.ok(Math.abs(mesafeKm([0, 0], [0, 1]) - 111.2) < 1);
  assert.ok(mekanAdiEsit("SEKA Kâğıt Müzesi", "seka kagit muzesi")); assert.ok(!mekanAdiEsit("SEKA Müzesi", "SEKA Kâğıt Müzesi")); assert.ok(!mekanAdiEsit("", ""));
  assert.match(konumAnahtari("SEKA Kâğıt Müzesi", "Kocaeli"), /^[a-z0-9_:-]{3,80}$/);
  assert.match(konumAnahtari("Çok uzun bir mekan adı ".repeat(10), "İstanbul"), /^[a-z0-9_:-]{3,80}$/);
  assert.notEqual(konumAnahtari("Salon", "Ankara"), konumAnahtari("Salon", "İzmir"));
});

test("Wikidata yolu: tam ad eşleşmesi + P625 + il içi -> kesin konum (5 ondalık); Photon'a gidilmez; UA doğru", async () => {
  const ag = sahteAg(WD_SEKA(40.759341234, 29.940851234));
  const e = E(); const s = await calis(ag, [e]);
  assert.deepEqual(e.konum, { enlem: 40.75934, boylam: 29.94085, kesin: true });
  assert.deepEqual(s, { kesin: 1, yok: 0, onbellek: 0, istek: 2 });
  assert.ok(ag.g.every((c) => c.url.includes("wikidata.org") && c.ua === KONUM_UA)); assert.match(KONUM_UA, /onlypositive\.org\/destek/);
  assert.ok(konumGecerli(e.konum)); assert.ok(etkinlikYukuGecerli(e));
  assert.equal(konumOzetMetni(s), "kesin:1,yok:0,onbellek:0");
});

test("Wikidata yok -> Photon yolu: ad eşleşir + il içi + TR -> kesin; bbox ve limit istekte", async () => {
  const ag = sahteAg({ photon: [FEAT("Başka Yer", 40.76, 29.94), FEAT("SEKA Kağıt Müzesi", SEKA[0], SEKA[1])] });
  const e = E(); const s = await calis(ag, [e]);
  assert.deepEqual(e.konum, { enlem: 40.75934, boylam: 29.94085, kesin: true }); assert.equal(s.kesin, 1);
  const p = ag.g.find((c) => c.url.includes("photon.komoot.io")); assert.match(p.url, /limit=3/); assert.match(p.url, /bbox=25\.6,35\.8,44\.9,42\.2/); assert.equal(p.ua, KONUM_UA);
});

test("yanlış il reddi: koordinat etkinliğin iline uzak (Wikidata ve Photon) -> konum YOK, yalnız yok sayılır", async () => {
  const wd = sahteAg(WD_SEKA(39.93, 32.86));                     // Ankara merkezi, etkinlik Kocaeli
  const e1 = E(); const s1 = await calis(wd, [e1]);
  assert.ok(!("konum" in e1)); assert.equal(s1.kesin, 0); assert.equal(s1.yok, 1);
  const ph = sahteAg({ photon: [FEAT("SEKA Kağıt Müzesi", 38.42, 27.14)] });   // İzmir
  const e2 = E(); await calis(ph, [e2]); assert.ok(!("konum" in e2));
  const iki = sahteAg({ photon: [FEAT("SEKA Kağıt Müzesi", SEKA[0], SEKA[1]), FEAT("SEKA Kağıt Müzesi", 40.90, 29.40)] });   // aynı ad iki yer, çelişkili
  const e3 = E({ sehir: "Kocaeli" }); await calis(iki, [e3]); assert.ok(!("konum" in e3));
});

test("Türkiye dışı reddi: ülke kodu TR değil ya da kutu dışı koordinat -> konum yok; ad yakın ama eşit değilse red", async () => {
  const dis = sahteAg({ photon: [FEAT("SEKA Kağıt Müzesi", SEKA[0], SEKA[1], "DE")] });
  const e1 = E(); await calis(dis, [e1]); assert.ok(!("konum" in e1));
  const kutu = sahteAg(WD_SEKA(48.85, 2.35));                    // Paris
  const e2 = E(); await calis(kutu, [e2]); assert.ok(!("konum" in e2));
  const yarim = sahteAg({ photon: [FEAT("SEKA Müzesi", SEKA[0], SEKA[1])] });
  const e3 = E(); await calis(yarim, [e3]); assert.ok(!("konum" in e3));
  assert.ok(!konumGecerli({ enlem: 48.85, boylam: 2.35, kesin: true })); assert.ok(!konumGecerli({ enlem: 40.123456, boylam: 29.1, kesin: true })); assert.ok(!konumGecerli({ enlem: 40.1, boylam: 29.1 })); assert.ok(!konumGecerli({ enlem: "40.1", boylam: 29.1, kesin: true }));
  assert.ok(konumGecerli({ enlem: 40.1, boylam: 29.1, kesin: false }));
});

test("mekan yok / kısa / il tanımsız -> istek yok, yok sayılır", async () => {
  const ag = sahteAg(WD_SEKA());
  const a = E({ mekan: undefined }), b = E({ mekan: "ab" }), c = E({ sehir: "Atlantis" });
  const s = await calis(ag, [a, b, c]);
  assert.equal(ag.g.length, 0); assert.deepEqual(s, { kesin: 0, yok: 3, onbellek: 0, istek: 0 });
});

test("önbellek: bulunan kalıcı, aynı mekân tekrar sorulmaz; bulunamayan 7 gün olumsuz önbellek; aynı turda aynı mekân tek arama", async () => {
  const bulut = bulutKur(), ag = sahteAg(WD_SEKA());
  const e1 = E(), e2 = E({ ad: "Başka Sergi" });
  const s1 = await calis(ag, [e1, e2], { bulut });
  assert.equal(s1.kesin, 2); assert.equal(ag.g.length, 2);          // iki etkinlik, tek mekân: 2 istek (arama + varlık)
  const k = konumAnahtari("SEKA Kâğıt Müzesi", "Kocaeli");
  assert.deepEqual(bulut.durum.get(k).enlem, 40.75934); assert.equal(bulut.durum.get(k).kaynak, "wikidata");
  const ag2 = sahteAg(); const e3 = E();
  const s2 = await calis(ag2, [e3], { bulut });
  assert.equal(ag2.g.length, 0); assert.deepEqual(e3.konum, { enlem: 40.75934, boylam: 29.94085, kesin: true }); assert.deepEqual(s2, { kesin: 1, yok: 0, onbellek: 1, istek: 0 });
});
test("önbellek: bulunamayan mekân 7 gün sorulmaz, 8. günde yeniden sorulur; sağlayıcı hatası olumsuz önbelleğe YAZILMAZ", async () => {
  const k = konumAnahtari("SEKA Kâğıt Müzesi", "Kocaeli");
  const b = bulutKur(), ag = sahteAg();
  const e1 = E(); const s1 = await calis(ag, [e1], { bulut: b });
  assert.equal(s1.yok, 1); assert.equal(b.durum.get(k).yok, 1); assert.equal(ag.g.length, 2);      // wikidata arama (boş) + photon (boş)
  const ag2 = sahteAg(); const e2 = E(); const s2 = await calis(ag2, [e2], { bulut: b, simdi: SIMDI + 6 * 86400_000 });
  assert.equal(ag2.g.length, 0); assert.equal(s2.onbellek, 1); assert.equal(s2.yok, 1);
  const ag3 = sahteAg(); await calis(ag3, [E()], { bulut: b, simdi: SIMDI + 8 * 86400_000 }); assert.equal(ag3.g.length, 2);
  const b2 = bulutKur(), hata = sahteAg({ durum: { "www.wikidata.org": 500, "photon.komoot.io": 500 } });
  const e3 = E(); await calis(hata, [e3], { bulut: b2 }); assert.ok(!("konum" in e3)); assert.equal(b2.durum.size, 0);
  const b3 = bulutKur(), sinir = sahteAg({ durum: { "www.wikidata.org": 429 } });
  const e4 = E(), e5 = E({ mekan: "Başka Mekan" }); const s4 = await calis(sinir, [e4, e5], { bulut: b3 });
  assert.equal(sinir.g.length, 1); assert.equal(s4.yok, 2); assert.equal(b3.durum.size, 0);          // 429: tur için durur, önbelleğe yazılmaz
});

test("istek sınırı: tur başına en çok 6 istek, istekler arası >=1,1 sn beklenir; kalan mekânlar yok sayılır ve önbelleğe yazılmaz", async () => {
  const bulut = bulutKur(), bekle = [];
  const ag = sahteAg(WD_SEKA());
  const liste = Array.from({ length: 5 }, (_, i) => E({ mekan: `SEKA Kağıt Müzesi ${i}` }));
  liste[0].mekan = "SEKA Kâğıt Müzesi";                          // yalnız bu eşleşir (diğerleri arama sonucuyla uyuşmaz -> Photon'a da gider)
  const s = await calis(ag, liste, { bulut, bekleFn: async (ms) => { bekle.push(ms); } });
  assert.equal(ag.g.length, 6); assert.equal(s.istek, 6);
  assert.ok(bekle.length === 5 && bekle.every((ms) => ms >= 1100));
  assert.equal(s.kesin, 1); assert.equal(s.yok, 4);
  assert.ok(liste.slice(1).every((e) => !e.konum));
  const yazilan = [...bulut.durum.keys()]; assert.ok(yazilan.length <= 3);                           // bütçe bitince yarım kalan mekân kaydedilmedi
  const ust = sahteAg(WD_SEKA()); const e = E(); await calis(ust, [e], { ust: 1 }); assert.equal(ust.g.length, 1); assert.ok(!e.konum);
  assert.equal(ayarOku({}, []).etkinlikKonum, true); assert.equal(ayarOku({}, []).etkinlikKonumUst, 6); assert.equal(ayarOku({ ETKINLIK_KONUM: "0" }, []).etkinlikKonum, false); assert.equal(ayarOku({ ETKINLIK_KONUM_UST: "99" }, []).etkinlikKonumUst, 6);
});

test("yayinYuku: geçerli konum yükte gider, bozuk konum yalnız konumu düşürür (etkinlik yayınlanır); etkinlikYukuGecerli konumu doğrular", () => {
  const h = (konum) => ({ id: "x", tr: { baslik: "B", ozet: "Özet." }, en: { baslik: "T", ozet: "Sum." }, kategori: "sanat", yer: "Kocaeli", kaynak: "k", link: "https://a.b/c", zaman: "2026-10-15T08:00:00Z", model: "m",
    etkinlik: E(konum === undefined ? {} : { konum }) });
  const iyi = yayinYuku(h({ enlem: 40.75934, boylam: 29.94085, kesin: true }), "oz", { gorsel: { url: "https://x/y.jpg" }, b64: "AA==", tur: "image/jpeg" });
  assert.deepEqual(iyi.haber.etkinlik.konum, { enlem: 40.75934, boylam: 29.94085, kesin: true });
  const bozuk = yayinYuku(h({ enlem: 48.85, boylam: 2.35, kesin: true }), "oz", { gorsel: { url: "https://x/y.jpg" }, b64: "AA==", tur: "image/jpeg" });
  assert.ok(bozuk.haber.etkinlik && !("konum" in bozuk.haber.etkinlik)); assert.equal(bozuk.haber.etkinlik.ad, "Meşk Sergisi");
  const yok = yayinYuku(h(), "oz", { gorsel: { url: "https://x/y.jpg" }, b64: "AA==", tur: "image/jpeg" }); assert.ok(!("konum" in yok.haber.etkinlik));
  assert.ok(!etkinlikYukuGecerli(E({ konum: { enlem: 1, boylam: 1, kesin: true } })));
});

test("özet satırı: etkinlikKonum=kesin:N,yok:N,onbellek:N yalnız hesaplandıysa görünür", () => {
  const taban = { aday: 0, etkinlik: 1 };
  assert.doesNotMatch(ozetSatiri(taban), /etkinlikKonum/);
  assert.match(ozetSatiri({ ...taban, etkinlikKonum: { kesin: 1, yok: 2, onbellek: 3 } }), / etkinlikKonum=kesin:1,yok:2,onbellek:3/);
});
