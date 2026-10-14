// OP Sohbet küratörlü fotoğraf (lib/sohbet_gorsel.mjs + lib/sohbet_gorsel_veri.mjs): liste şeması, hava uyumu, 14 gün tekrarsızlık, yayın yükü, yedek yol. Ağsız (Commons ve indirme taklit).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SOHBET_GORSELLERI, gorselAdaylari, gorselHazirla, gorselSec, havaEtiketi, kullanimAnahtari, kullanimKaydi, sehirAnahtari, temaBul, GORSEL_TEKRAR_GUN } from "../lib/sohbet_gorsel.mjs";
import { sohbetUret } from "../lib/sohbet.mjs";
import { SEHIRLER } from "../lib/sohbet_veri.mjs";
import { lisansOk } from "../lib/gorsel.mjs";
import { ayarOku } from "../lib/ayar.mjs";

const SIMDI = Date.parse("2026-10-13T09:00:00Z");
const GUN = 86400_000;
const SEHIR_ANAHTARLARI = SEHIRLER.map((s) => sehirAnahtari(s.ad));

// durumlu sahte bulut: isaretle -> bilinenler'e eklenir
const durumluBulut = () => {
  const gorulen = new Map(), k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async (liste) => new Map(liste.filter((o) => gorulen.has(o)).map((o) => [o, gorulen.get(o)])),
    isaretle: async (l) => { for (const x of l) { gorulen.set(x.ozet, { durum: x.durum }); k.isaretler.push(x); } return { yazildi: l.length }; },
    yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); gorulen.set(ozet, { durum: "yayinlandi" }); return { durum: "eklendi" }; } };
};
// 1280x720 sahte jpeg başlığı (gorselBilgi SOF0'dan boyutu okur)
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x02, 0xd0, 0x05, 0x00, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9]);
const sahteFetch = (kayit = []) => async (url) => {
  const u = String(url);
  if (u.includes("commons.wikimedia.org/w/api.php")) {
    const baslik = decodeURIComponent(new URL(u).searchParams.get("titles") || "").replace(/^File:/, "");
    kayit.push(baslik);
    return { ok: true, status: 200, json: async () => ({ query: { pages: [{ title: "File:" + baslik, imageinfo: [{ mime: "image/jpeg", width: 4000, height: 3000, thumburl: "https://upload.wikimedia.org/x/1280px-" + encodeURIComponent(baslik), thumbwidth: 1280, thumbheight: 720,
      descriptionurl: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(baslik), extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" }, Artist: { value: "<a href=\"x\">Örnek Fotoğrafçı</a>" } } }] }] } }) };
  }
  return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => JPEG.buffer.slice(0) };
};

test("liste: >= 60 fotoğraf, her şehir (İstanbul, Ankara, İzmir, Antalya, Bursa) >= 4, genel havuz var; şema ve lisans kuralları; tekrar yok", () => {
  assert.ok(SOHBET_GORSELLERI.length >= 60, `toplam ${SOHBET_GORSELLERI.length}`);
  for (const s of SEHIR_ANAHTARLARI) assert.ok(SOHBET_GORSELLERI.filter((g) => g.sehir === s).length >= 4, s);
  assert.ok(SOHBET_GORSELLERI.filter((g) => g.sehir === "genel").length >= 20);
  assert.ok(SOHBET_GORSELLERI.filter((g) => g.sehir === "istanbul").length >= 12, "İstanbul için çeşitli seçenek");
  assert.equal(new Set(SOHBET_GORSELLERI.map((g) => g.dosya)).size, SOHBET_GORSELLERI.length, "dosya tekrarı");
  for (const g of SOHBET_GORSELLERI) {
    assert.match(g.dosya, /\.jpe?g$/i); assert.ok([...SEHIR_ANAHTARLARI, "genel"].includes(g.sehir), g.dosya); assert.ok(["acik", "bulutlu", "notr"].includes(g.hava), g.dosya);
    assert.ok(lisansOk(g.lisans) && !/\b(nc|nd)\b/i.test(g.lisans), `${g.dosya}: lisans ${g.lisans}`); assert.ok(g.w >= 1200 && g.h > 0, `${g.dosya}: boyut`);
    assert.ok(g.sahibi && g.sahibi.length <= 80, `${g.dosya}: sahibi`); assert.match(g.kaynak_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/); assert.ok(g.lisans_url ? /^https?:\/\//.test(g.lisans_url) : /^(public domain|pd|cc0)/i.test(g.lisans), `${g.dosya}: lisans_url`);
    assert.doesNotMatch(g.dosya, /logo|map|flag|poster|portrait|mosque|camii|church|statue/i, g.dosya);
  }
  // her şehirde hem açık hem bulutlu/nötr seçenek (hava uyumu için)
  for (const s of SEHIR_ANAHTARLARI) { const h = new Set(SOHBET_GORSELLERI.filter((g) => g.sehir === s).map((g) => g.hava)); assert.ok(h.has("acik") && (h.has("bulutlu") || h.has("notr")), s); }
});
test("havaEtiketi + hava uyumu: yağmurlu/kapalı günde 'acik' fotoğraf ADAY OLMAZ; açık günde açık öne alınır; şehirsizde yalnız genel havuz", () => {
  assert.deepEqual([0, 1, 2, 3, 45, 61, 80].map(havaEtiketi), ["acik", "acik", "bulutlu", "bulutlu", "yagmurlu", "yagmurlu", "yagmurlu"]); assert.equal(havaEtiketi(undefined), "notr");
  const yagmur = gorselAdaylari({ sehir: "istanbul", hava: "yagmurlu", rastgele: () => 0.4 });
  assert.ok(yagmur.length >= 4); assert.ok(yagmur.every((g) => g.hava !== "acik"), "yağmurlu günde güneşli fotoğraf yok");
  assert.equal(yagmur[0].sehir, "istanbul"); assert.equal(yagmur[0].hava, "bulutlu", "bulutlu önce");
  const acik = gorselAdaylari({ sehir: "izmir", hava: "acik", rastgele: () => 0.4 });
  assert.equal(acik[0].hava, "acik"); assert.equal(acik[0].sehir, "izmir");
  const ilkGenel = acik.findIndex((g) => g.sehir === "genel"); assert.ok(ilkGenel > 0 && acik.slice(0, ilkGenel).every((g) => g.sehir === "izmir"), "şehir önce, genel sonra");
  const sehirsiz = gorselAdaylari({ sehir: "", hava: "notr", rastgele: () => 0.4 }); assert.ok(sehirsiz.every((g) => g.sehir === "genel"));
  assert.equal(temaBul("Evde hangi filmi izlersiniz?"), "ev"); assert.equal(temaBul("Sahilde yürümek ister misiniz?"), "deniz");
});
test("14 gün tekrarsızlık: aynı şehir/hava için art arda seçimler hep farklı fotoğraf; 14 gün sonra yeniden kullanılabilir", async () => {
  const bulut = durumluBulut(), secilen = [];
  for (let i = 0; i < 12; i++) {
    const k = await gorselSec({ bulut, sehir: "istanbul", hava: "acik", simdi: SIMDI + i * 3600_000, rastgele: () => 0.37 });
    assert.ok(k, `seçim ${i}`); assert.ok(!secilen.includes(k.dosya), `tekrar: ${k.dosya}`); secilen.push(k.dosya);
    await bulut.isaretle([kullanimKaydi(k, SIMDI + i * 3600_000)]);
  }
  assert.equal(secilen.length, 12);
  const tek = durumluBulut(); const ilk = await gorselSec({ bulut: tek, sehir: "ankara", hava: "acik", simdi: SIMDI, rastgele: () => 0.2 });
  await tek.isaretle([kullanimKaydi(ilk, SIMDI)]);
  for (let g = 1; g < GORSEL_TEKRAR_GUN; g++) { const x = await gorselSec({ bulut: tek, sehir: "ankara", hava: "acik", simdi: SIMDI + g * GUN, rastgele: () => 0.2 }); assert.notEqual(x?.dosya, ilk.dosya, `gün +${g}`); }
  assert.notEqual(kullanimAnahtari("a.jpg", 1), kullanimAnahtari("a.jpg", 2));
  assert.equal(kullanimAnahtari("a.jpg", 5), createHash("sha256").update("sohbetgorsel|a.jpg|5").digest("hex"));
  assert.deepEqual(Object.keys(kullanimKaydi(ilk, SIMDI)), ["ozet", "durum", "neden"]);
});
test("seçim: bulut.bilinenler hata verirse seçim yine yapılır; adaylar tükenirse null", async () => {
  const bozuk = { bilinenler: async () => { throw new Error("uç yok"); } };
  assert.ok(await gorselSec({ bulut: bozuk, sehir: "bursa", hava: "notr", simdi: SIMDI }));
  assert.equal(await gorselSec({ bulut: durumluBulut(), sehir: "istanbul", hava: "acik", simdi: SIMDI, liste: [] }), null);
  const hepsi = { bilinenler: async (l) => new Map(l.map((o) => [o, { durum: "yayinlandi" }])) };
  assert.equal(await gorselSec({ bulut: hepsi, sehir: "istanbul", hava: "acik", simdi: SIMDI }), null, "hepsi son 14 günde kullanılmış");
});
test("gorselHazirla: Commons canlı denetimi + indirme; yük haber görsel biçiminde {gorsel:{sahibi,lisans,lisans_url,kaynak_url,saglayici}, b64, tur}; lisans/boyut uygunsuzsa null", async () => {
  const g = SOHBET_GORSELLERI[0];
  const y = await gorselHazirla(g, { fetchFn: sahteFetch() });
  assert.deepEqual(Object.keys(y.gorsel).sort(), ["kaynak_url", "lisans", "lisans_url", "saglayici", "sahibi"]);
  assert.equal(y.gorsel.saglayici, "wikimedia"); assert.equal(y.gorsel.lisans, "CC BY-SA 4.0"); assert.equal(y.gorsel.sahibi, "Örnek Fotoğrafçı"); assert.equal(y.tur, "image/jpeg"); assert.ok(y.b64.length > 10);
  const nc = async () => ({ ok: true, status: 200, json: async () => ({ query: { pages: [{ imageinfo: [{ mime: "image/jpeg", width: 4000, height: 3000, thumburl: "https://x/1280px-a.jpg", extmetadata: { LicenseShortName: { value: "CC BY-NC 4.0" } } }] }] } }) });
  assert.equal(await gorselHazirla(g, { fetchFn: nc }), null);
  const kucuk = async () => ({ ok: true, status: 200, json: async () => ({ query: { pages: [{ imageinfo: [{ mime: "image/jpeg", width: 900, height: 600, thumburl: "https://x/900px-a.jpg", extmetadata: { LicenseShortName: { value: "CC0" } } }] }] } }) });
  assert.equal(await gorselHazirla(g, { fetchFn: kucuk }), null);
  const yok = async () => ({ ok: true, status: 200, json: async () => ({ query: { pages: [{ title: "File:x.jpg", missing: true }] } }) });
  assert.equal(await gorselHazirla(g, { fetchFn: yok }), null);
});
test("sohbetUret (küratörlü açık): şehirli hava gönderisi o şehrin fotoğrafını taşır; yağmurlu günde 'acik' foto seçilmez; açık günde açık; kullanım işaretlenir", async () => {
  const sehir = SEHIRLER[0];
  for (const [kod, derece, beklenen] of [[61, 18, (g) => g.hava !== "acik"], [0, 24, (g) => g.hava === "acik"]]) {
    const bulut = durumluBulut(), istenen = [];
    const s = await sohbetUret({ bulut, model: null, simdi: SIMDI, rastgele: () => 0.3, turSirasi: ["hava"], havaFn: async () => ({ kod, derece, ruzgar: 8, gunduz: true }), modelDokunus: false, kuratorluGorsel: true, fetchFn: sahteFetch(istenen) });
    assert.equal(s.durum, "yayinlandi", JSON.stringify(s.notlar));
    const { h, g } = bulut.k.yayinlar[0];
    assert.ok(g && g.b64 && g.gorsel.saglayici === "wikimedia", "fotoğraf eklenmeli");
    const kayit = SOHBET_GORSELLERI.find((x) => x.dosya === istenen[0]);
    assert.ok(kayit, "listeden seçildi"); assert.ok(beklenen(kayit), `hava ${kod}: ${kayit.hava}`);
    assert.equal(kayit.sehir, sehirAnahtari(h.yer.split(",")[0]), "şehre uygun");
    assert.equal(bulut.k.isaretler.length, 1); assert.equal(bulut.k.isaretler[0].neden, "sohbet-gorsel"); assert.equal(bulut.k.isaretler[0].ozet, kullanimAnahtari(kayit.dosya, Math.floor((SIMDI + 3 * 3600_000) / GUN)));
    assert.equal("seri" in h, false);
    assert.equal(s.kayit.gorsel.saglayici, "wikimedia");
  }
  void sehir;
});
test("sohbetUret (küratörlü açık): şehirsiz türler (günün sorusu, öneri, bilmece) genel doğa/gündelik fotoğraf alır", async () => {
  for (const tur of ["gunun", "oneri", "bilmece"]) {
    const bulut = durumluBulut(), istenen = [];
    const s = await sohbetUret({ bulut, model: null, simdi: SIMDI, rastgele: () => 0.3, turSirasi: [tur], modelDokunus: false, kuratorluGorsel: true, fetchFn: sahteFetch(istenen) });
    assert.equal(s.durum, "yayinlandi"); assert.ok(bulut.k.yayinlar[0].g?.b64, tur);
    assert.equal(SOHBET_GORSELLERI.find((x) => x.dosya === istenen[0]).sehir, "genel");
  }
});
test("sohbetUret yedek yol: Commons hatası ya da kuratorluGorsel kapalı -> görselsiz yayın (eski davranış); gönderi yine yayınlanır, işaret yazılmaz", async () => {
  const hata = async () => ({ ok: false, status: 500, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers() });
  const b1 = durumluBulut();
  const s1 = await sohbetUret({ bulut: b1, model: null, simdi: SIMDI, rastgele: () => 0.3, turSirasi: ["gunun"], modelDokunus: false, kuratorluGorsel: true, fetchFn: hata });
  assert.equal(s1.durum, "yayinlandi"); assert.equal(b1.k.yayinlar[0].g, null); assert.equal(b1.k.isaretler.length, 0); assert.ok(s1.notlar.some((n) => /küratörlü/.test(n)));
  const b2 = durumluBulut();
  const s2 = await sohbetUret({ bulut: b2, model: null, simdi: SIMDI, rastgele: () => 0.3, turSirasi: ["gunun"], modelDokunus: false, fetchFn: sahteFetch() });
  assert.equal(s2.durum, "yayinlandi"); assert.equal(b2.k.yayinlar[0].g, null, "varsayılan işlev çağrısı eski davranış"); assert.equal(b2.k.isaretler.length, 0);
});
test("ayar: SOHBET_GORSEL varsayılan açık, '0' ile kapanır", () => {
  assert.equal(ayarOku({}, []).sohbetGorsel, true);
  assert.equal(ayarOku({ SOHBET_GORSEL: "0" }, []).sohbetGorsel, false);
});
