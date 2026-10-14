// OP Hayvanlar (op_hayvanlar) + OP Sanat/Heykel (op_sanat): havuz bütünlüğü (zorunlu alanlar, lisans, yasak sözcük, Türkçe harf doğruluğu, telif), dürüstlük kuralı,
// seçim/tekrar/günlük kota ("yuva") davranışı ve sahte ağ ile uçtan uca yayın yükü. Ağ yok; model yok (görsel denetimi sahte).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { HAYVANLAR } from "../lib/hayvan_veri.mjs";
import { HEYKELLER } from "../lib/heykel_veri.mjs";
import { HAYVAN_ALT_KONULAR, HAYVAN_YASAK_EN, HAYVAN_YASAK_TR, hayvanAtfi, hayvanHavuzu, hayvanSatirNedeni, vlHayvanDegerlendir } from "../lib/hayvan.mjs";
import { ANONIM_EN_GEC_YIL, HEYKEL_ALT_KONU, heykelHavuzu, heykelIcerik, heykelSatirNedeni, heykelTelifNedeni, vlHeykelDegerlendir } from "../lib/heykel.mjs";
import { ABARTI, BIRINCI_TEKIL, SAGLIK, SIDDET, TARIH_YASAK } from "../lib/konu_yasak.mjs";
import { DAVETLER } from "../lib/konu_davet.mjs";
import { ALT_KONULAR, altKonuDogrula } from "../lib/alt_konu.mjs";
import { denetle } from "../lib/moderasyon.mjs";
import { konuYasak } from "../lib/on_eleme.mjs";
import { lisansOk } from "../lib/gorsel.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { KONU_HESAPLARI, KONU_HESAP_ADLARI, donemNo, gruplariKur, gunlukYuva, havuzBoyu, konuIsleriCalistir, konuKimligi, konuSiraNedeni, konuUret, yuvaOzeti } from "../lib/konu.mjs";
// Bu dosya yalnız ana depoda vardır (yayın deposunda yok): varsa sözleşme denetlenir, yoksa o denetim atlanır.
const ED = await import("../../functions/_shared/editorler.mjs").catch(() => null);
const { haberEditoru, KATEGORILER } = ED || {};

const ALAN_RE = /^[a-z0-9-]{2,40}$/;
const EN_ISLEV = /(?<![\p{L}])(?:the|and|of|is|in|a|its|it)(?![\p{L}])/i;
const ASCII_TR = /(?<![\p{L}])(?:icin|cok|buyuk|kucuk|oldugu|ozel|uzerinde|yasar|sekil|gunes|dunya|turu|baska|ayri|gozler|gunluk|gorunum)(?![\p{L}])/iu;
const SIMDI = Date.parse("2026-10-14T10:00:00Z");          // UTC 10:00: yuva 0 (04:00) açık, yuva 1 (12:30) kapalı

// ---------------------------------------------------------------- havuz bütünlüğü
test("hayvan havuzu: >= 60 öğe, benzersiz, zorunlu alanlar, lisans, jpeg, Vikipedi kaynağı, satır denetimi temiz", () => {
  assert.ok(HAYVANLAR.length >= 60, `havuz ${HAYVANLAR.length}`);
  const adlar = new Set(), gorseller = new Set(), maddeler = new Set();
  for (const h of HAYVANLAR) {
    assert.equal(hayvanSatirNedeni(h), "", `${h.ad}: ${hayvanSatirNedeni(h)}`);
    assert.ok(!adlar.has(h.ad.toLowerCase()), `tekrar eden ad: ${h.ad}`); adlar.add(h.ad.toLowerCase());
    assert.ok(!gorseller.has(h.gorsel), `aynı fotoğraf iki hayvanda: ${h.gorsel}`); gorseller.add(h.gorsel);
    assert.ok(!maddeler.has(h.madde), `aynı madde iki öğede: ${h.madde}`); maddeler.add(h.madde);
    assert.ok(lisansOk(h.lisans), `lisans ${h.lisans}: ${h.ad}`);
    assert.match(h.url, /^https:\/\/en\.wikipedia\.org\/wiki\//);
    assert.match(h.gorsel, /\.jpe?g$/i);
    assert.ok(HAYVAN_ALT_KONULAR.includes(h.alt) && ALAN_RE.test(h.alt), h.alt);
    assert.ok(h.w >= 900, `görsel genişliği ${h.w}: ${h.ad}`);
  }
  assert.ok(HAYVANLAR.some((h) => h.alt === "evcil") && HAYVANLAR.some((h) => h.alt === "yaban-hayati"));
  assert.equal(hayvanHavuzu().length, HAYVANLAR.length);
});

test("hayvan metinleri: yasak sözcük yok (sağlık, şiddet, av/ölüm/acı/esaret, abartı), kişisel deneyim yok, Türkçe harfler doğru, moderasyon temiz", () => {
  for (const h of HAYVANLAR) {
    for (const t of [h.tr, h.bas]) {
      assert.doesNotMatch(t, SAGLIK, `sağlık: ${h.ad}`); assert.doesNotMatch(t, SIDDET, `şiddet: ${h.ad}`); assert.doesNotMatch(t, BIRINCI_TEKIL, `birinci tekil: ${h.ad}`);
      assert.doesNotMatch(t, ABARTI, `abartı: ${h.ad}`); assert.doesNotMatch(t, HAYVAN_YASAK_TR, `hayvan yasağı TR: ${h.ad}`);
      assert.doesNotMatch(t, ASCII_TR, `Türkçe karakter eksik olabilir: ${h.ad}`);
      assert.doesNotMatch(t, / |ı̇|ý|þ|ð|Ý|Þ|Ð|�/, `bozuk karakter: ${h.ad}`);
    }
    for (const t of [h.en, h.basEn]) { assert.doesNotMatch(t, SAGLIK, `health: ${h.ad}`); assert.doesNotMatch(t, BIRINCI_TEKIL, `first person: ${h.ad}`); assert.doesNotMatch(t, HAYVAN_YASAK_EN, `animal ban: ${h.ad}`); }
    assert.match(h.tr, /[çğıöşüÇĞİÖŞÜ]/, `Türkçe harf: ${h.ad}`); assert.doesNotMatch(h.en, /[çğıöşüÇĞİÖŞÜ]/, `İngilizce metinde Türkçe harf: ${h.ad}`);
    assert.equal(denetle(`${h.bas} ${h.tr} ${h.basEn} ${h.en}`).ok, true, `moderasyon: ${h.ad}`);
    assert.deepEqual(konuYasak(`${h.bas} ${h.tr}`, `${h.basEn} ${h.en}`), [], `konu kapısı: ${h.ad}`);
  }
});

test("hayvan satır denetimi: yasak içerik reddedilir", () => {
  const ornek = HAYVANLAR[0];
  const dene = (yama) => hayvanSatirNedeni({ ...ornek, ...yama });
  assert.match(dene({ tr: "Bu hayvanın sütü bağışıklığı güçlendiren bir şifa kaynağıdır ve hastalıklara iyi gelir. Herkesin sofrasında bulunmalıdır." }), /sağlık/);
  assert.match(dene({ tr: "Bu hayvan her gün avlanır ve küçük hayvanları yer. Yırtıcı olarak bilinen bir türdür bu." }), /yasağı|yasak/);
  assert.match(dene({ tr: "Dün bahçemde bir tane gördüm, bence çok sevimliydi. İkinci cümle de burada." }), /birinci tekil/);
  assert.match(dene({ en: "I saw one yesterday and it was lovely. It is a nice animal indeed, honestly." }), /birinci tekil|cümle|uzunluk/);
  assert.match(dene({ tr: "Muhteşem bir hayvandır ve herkesin sevdiği bir türdür. Bu hayvan gerçekten sevimlidir." }), /abart/);
  assert.match(dene({ gorsel: "Ornek.png" }), /jpeg/);
  assert.match(dene({ alt: "kuslar" }), /alt konu/);
  assert.match(dene({ url: "https://example.com/x" }), /Vikipedi/);
  assert.match(dene({ tr: "Kısa." }), /cümle|uzunluk/);
  assert.match(dene({ tr: "Bu hayvan çok sevimlidir. Bir. İki. Üç. Dört. Beş. Altı. Yedi sekiz dokuz on yirmi." }), /cümle/);
  assert.match(dene({ en: "The sea otter is found at the zoo, where it sleeps in a cage. It is a nice animal indeed.", enAd: "Sea otter" }), /animal|yasak|esaret/i);
});

test("heykel havuzu: >= 40 eser, benzersiz, telif (sanatçı <= 1955 ya da anonim <= 1900), fotoğraf lisansı, dinî/ölüm/savaş/çıplaklık kalıbı yok", () => {
  assert.ok(HEYKELLER.length >= 40, `havuz ${HEYKELLER.length}`);
  const adlar = new Set(), gorseller = new Set(), maddeler = new Set();
  for (const h of HEYKELLER) {
    assert.equal(heykelSatirNedeni(h), "", `${h.ad}: ${heykelSatirNedeni(h)}`);
    assert.equal(heykelTelifNedeni(h), "", `${h.ad}: telif`);
    if (h.anonim) assert.ok(h.yilSayi <= ANONIM_EN_GEC_YIL, `anonim eser çok yeni: ${h.ad}`);
    else assert.ok(Number.isFinite(h.olum) && h.olum <= 1955, `sanatçı ölüm ${h.olum}: ${h.ad}`);
    assert.ok(!adlar.has(h.ad.toLowerCase()), `tekrar: ${h.ad}`); adlar.add(h.ad.toLowerCase());
    assert.ok(!gorseller.has(h.gorsel), `aynı fotoğraf: ${h.gorsel}`); gorseller.add(h.gorsel);
    assert.ok(!maddeler.has(h.madde), `aynı madde: ${h.madde}`); maddeler.add(h.madde);
    assert.ok(lisansOk(h.lisans), `fotoğraf lisansı ${h.lisans}: ${h.ad}`);
    assert.match(h.gorsel, /\.jpe?g$/i); assert.ok(h.w >= 900, `genişlik ${h.w}: ${h.ad}`);
    assert.match(h.url, /^https:\/\/en\.wikipedia\.org\/wiki\//);
    for (const t of [h.tr, h.en, h.ad, h.enAd]) assert.doesNotMatch(t, TARIH_YASAK, `din/ölüm/savaş kalıbı: ${h.ad}`);
    for (const t of [h.tr, h.en]) { assert.doesNotMatch(t, /nude|naked|çıplak|erotic|erotik/i, `çıplaklık: ${h.ad}`); assert.doesNotMatch(t, BIRINCI_TEKIL, `birinci tekil: ${h.ad}`); assert.doesNotMatch(t, SAGLIK, `sağlık: ${h.ad}`); }
    assert.match(h.tr, /[çğıöşüÇĞİÖŞÜ]/, `Türkçe harf: ${h.ad}`); assert.doesNotMatch(h.tr, ASCII_TR, `Türkçe karakter eksik olabilir: ${h.ad}`); assert.match(h.en, EN_ISLEV, `İngilizce işlev sözcüğü: ${h.ad}`);
    assert.equal(denetle(`${h.ad} ${h.tr} ${h.enAd} ${h.en}`).ok, true, `moderasyon: ${h.ad}`);
  }
  assert.equal(heykelHavuzu().length, HEYKELLER.length);
});

test("heykel telif kuralı: sanatçı 1955'ten sonra ölmüşse ya da anonim eser 1900'den yeniyse havuza girmez", () => {
  const ornek = HEYKELLER[0];
  assert.equal(heykelTelifNedeni({ ...ornek, anonim: false, olum: 1955 }), "");
  assert.match(heykelTelifNedeni({ ...ornek, anonim: false, olum: 1956 }), /telif/);
  assert.match(heykelTelifNedeni({ ...ornek, anonim: false, olum: null }), /telif/);
  assert.match(heykelTelifNedeni({ ...ornek, anonim: true, yilSayi: 1950 }), /telif/);
  assert.equal(heykelTelifNedeni({ ...ornek, anonim: true, yilSayi: -300 }), "");
  assert.match(heykelSatirNedeni({ ...ornek, anonim: false, olum: 1980 }), /telif/);
  assert.match(heykelSatirNedeni({ ...ornek, tr: "Bu eser, tapınakta kurban edilen hayvanlar için yapılmış bir heykeldir ve çok eskidir. Sonra büyük bir savaş çıkmış, heykel uzun süre saklanmıştır, sonra bulunmuştur." }), /din|ölüm|savaş/);
  assert.match(heykelSatirNedeni({ ...ornek, gorsel: "Ornek.gif" }), /jpeg/);
});

test("heykel içeriği: başlık eser + sanatçı, künye satırı, fotoğraf atfı; anonim eserde sanatçı 'bilinmiyor'", () => {
  const sanatli = HEYKELLER.find((h) => !h.anonim), anonim = HEYKELLER.find((h) => h.anonim);
  const g = { sahibi: "Test Fotoğrafçı", lisans: "CC BY-SA 4.0" };
  const a = heykelIcerik(sanatli, g), b = heykelIcerik(anonim, g);
  assert.ok(a.trBas.includes(sanatli.ad) && a.trBas.includes(sanatli.sanatci) && a.trBas.length <= 88);
  assert.match(a.trOzet, /Sanatçı: .* · Yapım: .* · Bulunduğu yer: /); assert.match(a.enOzet, /Artist: .* · Date: .* · Location: /);
  assert.match(a.kaynakTr, /Fotoğraf: Test Fotoğrafçı, CC BY-SA 4\.0 · Wikimedia Commons/); assert.match(a.kaynakEn, /Photo: Test Fotoğrafçı, CC BY-SA 4\.0/);
  assert.match(b.trOzet, /Sanatçı: bilinmiyor/); assert.ok(!b.trBas.includes("Bilinmeyen"));
  assert.equal(hayvanAtfi(HAYVANLAR[0], g).tr.includes("Fotoğraf: Test Fotoğrafçı, CC BY-SA 4.0"), true);
});

test("görsel denetimi yanıtları: hayvan (insan yüzü, av/zarar) ve heykel (belirgin çıplaklık, dinî nesne)", () => {
  const tamam = { konuya_uygun: true, insan_yuzu_baskin: false, zarar_av_ya_da_kafes: false, uygunsuz: false, yazi_logo_baskin: false, dusuk_kalite: false };
  assert.equal(vlHayvanDegerlendir(JSON.stringify(tamam)).ok, true);
  assert.equal(vlHayvanDegerlendir(JSON.stringify({ ...tamam, insan_yuzu_baskin: true })).ok, false);
  assert.equal(vlHayvanDegerlendir(JSON.stringify({ ...tamam, zarar_av_ya_da_kafes: true })).kod, "zarar");
  assert.equal(vlHayvanDegerlendir(JSON.stringify({ konuya_uygun: true })).ok, false);
  assert.equal(vlHayvanDegerlendir("bozuk").ok, false);
  const heykelTamam = { konuya_uygun: true, belirgin_ciplaklik: false, dini_ibadet_nesnesi: false, insan_yuzleri_baskin: false, yazi_logo_baskin: false, dusuk_kalite: false };
  assert.equal(vlHeykelDegerlendir(JSON.stringify(heykelTamam)).ok, true);
  assert.equal(vlHeykelDegerlendir(JSON.stringify({ ...heykelTamam, belirgin_ciplaklik: true })).ok, false);
  assert.equal(vlHeykelDegerlendir(JSON.stringify({ ...heykelTamam, dini_ibadet_nesnesi: true })).ok, false);
  assert.equal(vlHeykelDegerlendir(JSON.stringify({ ...heykelTamam, konuya_uygun: false })).ok, false);
});

// ---------------------------------------------------------------- hesap tablosu, ayar, alt konu, sunucu sözleşmesi
test("hesap tablosu: op_hayvanlar günde 2 / op_sanat günde 1, haberOrtak; ayar varsayılanları; kota ayrıştırma; havuz boyu", () => {
  assert.deepEqual([KONU_HESAPLARI.op_hayvanlar.kategori, KONU_HESAPLARI.op_hayvanlar.kota, KONU_HESAPLARI.op_hayvanlar.haberOrtak], ["hayvanlar", 2, true]);
  assert.deepEqual([KONU_HESAPLARI.op_sanat.kategori, KONU_HESAPLARI.op_sanat.kota, KONU_HESAPLARI.op_sanat.haberOrtak], ["sanat", 1, true]);
  const a = ayarOku({}, []);
  assert.equal(a.konuKotalari.op_hayvanlar, 2); assert.equal(a.konuKotalari.op_sanat, 1);
  assert.equal(a.hayvanTekrarGun, 14); assert.equal(a.heykelTekrarGun, 14);
  assert.equal(ayarOku({ KONU_KOTALARI: "op_hayvanlar:3,op_sanat:0", HAYVAN_TEKRAR_GUN: "21" }, []).konuKotalari.op_sanat, 0);
  assert.equal(ayarOku({ KONU_KOTALARI: "op_hayvanlar:3" }, []).konuKotalari.op_hayvanlar, 3);
  assert.equal(ayarOku({ HAYVAN_TEKRAR_GUN: "21" }, []).hayvanTekrarGun, 21);
  assert.equal(havuzBoyu("op_hayvanlar"), HAYVANLAR.length); assert.equal(havuzBoyu("op_sanat"), HEYKELLER.length);
  assert.ok(KONU_HESAP_ADLARI.includes("op_hayvanlar") && KONU_HESAP_ADLARI.includes("op_sanat"));
  const g = gruplariKur(ayarOku({}, []));
  assert.ok(g.has("hayvanlar") && g.has("sanat")); assert.equal(g.get("hayvanlar").toplam, 2); assert.equal(g.get("sanat").toplam, 1);
});

test("alt konu ve davet: sanat altında 'heykel'; hayvan alt konuları mevcut listede; davetler kişisel deneyim içermez", () => {
  assert.ok(ALT_KONULAR.sanat.includes(HEYKEL_ALT_KONU)); assert.equal(altKonuDogrula("sanat", "heykel"), "heykel");
  for (const a of HAYVAN_ALT_KONULAR) assert.ok(ALT_KONULAR.hayvanlar.includes(a), a);
  for (const hesap of ["op_hayvanlar", "op_sanat"]) {
    assert.ok(DAVETLER[hesap]?.length >= 2, hesap);
    for (const [tr, en] of DAVETLER[hesap]) { assert.doesNotMatch(tr, BIRINCI_TEKIL); assert.doesNotMatch(en, BIRINCI_TEKIL); assert.doesNotMatch(tr, /!/); assert.equal(denetle(`${tr} ${en}`).ok, true); }
  }
});

test("sunucu sözleşmesi (yalnız okuma): kategori hayvanlar -> op_hayvanlar, sanat -> op_sanat; alt_konu slug kuralına uyar", () => {
  if (!ED) return;   // yayın deposunda sunucu dosyası yok
  assert.ok(KATEGORILER.includes("hayvanlar") && KATEGORILER.includes("sanat"));
  assert.equal(haberEditoru({ kategori: "hayvanlar", yer: "Dünya", editor: "op_hayvanlar" }), "op_hayvanlar");
  assert.equal(haberEditoru({ kategori: "sanat", yer: "Dünya", editor: "op_sanat" }), "op_sanat");
  assert.match(HEYKEL_ALT_KONU, ALAN_RE);
});

// ---------------------------------------------------------------- günlük kota (yuva) ve sıra
test("günlük yuva: kota 2 -> yuva 0 04:00, yuva 1 12:30 UTC'de açılır; kullanılan yuva sayılır; kota dolunca 'kota-dolu'", async () => {
  const kayit = new Set();
  const bulut = { bilinenler: async (l) => new Map(l.filter((x) => kayit.has(x)).map((x) => [x, { durum: "yayinlandi" }])) };
  const gun = Math.floor(SIMDI / 86400_000);
  const saat = { bas: 4, son: 21 };
  const t = (s) => Date.parse(`2026-10-14T${s}:00Z`);
  assert.equal((await gunlukYuva({ hesap: "op_hayvanlar", kota: 2, saat, simdi: t("05:00"), bulut })).neden, "");
  kayit.add(yuvaOzeti("op_hayvanlar", gun, 0));
  const ikinciErken = await gunlukYuva({ hesap: "op_hayvanlar", kota: 2, saat, simdi: t("10:00"), bulut });
  assert.equal(ikinciErken.neden, "aralik"); assert.equal(ikinciErken.sira, 1);
  const ikinci = await gunlukYuva({ hesap: "op_hayvanlar", kota: 2, saat, simdi: t("12:40"), bulut });
  assert.equal(ikinci.neden, ""); assert.equal(ikinci.ozet, yuvaOzeti("op_hayvanlar", gun, 1));
  kayit.add(yuvaOzeti("op_hayvanlar", gun, 1));
  assert.equal((await gunlukYuva({ hesap: "op_hayvanlar", kota: 2, saat, simdi: t("15:00"), bulut })).neden, "kota-dolu");
  assert.equal((await gunlukYuva({ hesap: "op_hayvanlar", kota: 2, saat, simdi: t("15:00") + 86400_000, bulut })).neden, "");      // ertesi gün yeni yuvalar
  assert.equal((await gunlukYuva({ hesap: "op_sanat", kota: 1, saat, simdi: t("04:30"), bulut })).neden, "");
  assert.equal((await gunlukYuva({ hesap: "op_sanat", kota: 0, saat, simdi: t("10:00"), bulut })).neden, "kapali");
  assert.notEqual(yuvaOzeti("op_hayvanlar", gun, 0), yuvaOzeti("op_sanat", gun, 0));
  assert.match(yuvaOzeti("op_sanat", gun, 0), /^[0-9a-f]{64}$/);
});

test("konuSiraNedeni: haberOrtak hesaplar haberlerin kategori sayısından etkilenmez; saat penceresi ve kapalılık yine uygulanır", () => {
  const ayar = ayarOku({}, []);
  const doluKota = new Map([["hayvanlar", { son24: 9, son7g: 30, sonZaman: new Date(SIMDI - 600_000).toISOString() }], ["sanat", { son24: 20, son7g: 60, sonZaman: new Date(SIMDI - 600_000).toISOString() }]]);
  assert.equal(konuSiraNedeni("op_hayvanlar", { ayar, kotaDurum: doluKota, simdi: SIMDI }), "");
  assert.equal(konuSiraNedeni("op_sanat", { ayar, kotaDurum: doluKota, simdi: SIMDI }), "");
  assert.equal(konuSiraNedeni("op_sanat", { ayar, kotaDurum: doluKota, simdi: Date.parse("2026-10-14T22:00:00Z") }), "saat-disi");
  assert.equal(konuSiraNedeni("op_hayvanlar", { ayar: { ...ayar, konuKotalari: { ...ayar.konuKotalari, op_hayvanlar: 0 } }, kotaDurum: new Map(), simdi: SIMDI }), "kapali");
  // karşılaştırma: haberOrtak olmayan hesap kategori kotası doluysa engellenir
  assert.equal(konuSiraNedeni("op_mutfak", { ayar, kotaDurum: new Map([["mutfak", { son24: 9, son7g: 9, sonZaman: new Date(SIMDI - 7200_000).toISOString() }]]), simdi: SIMDI }), "kota-dolu");
});

// ---------------------------------------------------------------- sahte ağ ile uçtan uca
const jpeg = (w, h) => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03], 0); return u; };
const json = (o) => ({ ok: true, status: 200, headers: new Headers(), json: async () => o });
function sahteAg({ madde = {}, lisans = "CC BY-SA 4.0", olay = [] } = {}) {
  return async (url) => {
    const u = String(url); olay.push(u);
    if (/wikipedia\.org\/w\/api\.php/.test(u)) {
      const baslik = decodeURIComponent((u.match(/titles=([^&]+)/) || [])[1] || "").replace(/\+/g, " ");
      if (!(baslik in madde)) return json({ query: { pages: [{ title: baslik, missing: true }] } });
      return json({ query: { pages: [{ title: baslik, extract: madde[baslik], fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(baslik)}` }] } });
    }
    if (u.includes("commons.wikimedia.org")) return json({ query: { pages: [{ title: "File:Ornek.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/ornek.jpg", thumbwidth: 900, thumbheight: 700, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Ornek.jpg", extmetadata: { LicenseShortName: { value: lisans }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" }, Artist: { value: "Test Fotoğrafçı" } } }] }] } });
    if (u.includes("upload.wikimedia.org")) { const b = jpeg(900, 700); return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => b.buffer }; }
    return { ok: false, status: 404, headers: new Headers(), json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
}
/** Bulut taklidi: isaretle ile yazılan özetler bilinenler'de görünür (yuva ve tekrar kaydı gerçekten çalışsın). */
function bulutKur(gorulen = new Set()) {
  const yayin = [], isaret = [];
  return { yayin, isaret, gorulen, bilinenler: async (l) => new Map(l.filter((x) => gorulen.has(x)).map((x) => [x, { durum: "yayinlandi" }])),
    isaretle: async (l) => { isaret.push(...l); for (const k of l) gorulen.add(k.ozet); return {}; },
    yayinla: async (h, ozet, g) => { yayin.push({ h, ozet, g }); gorulen.add(ozet); return { durum: "eklendi" }; } };
}
const VL_HAYVAN_TAMAM = JSON.stringify({ konuya_uygun: true, insan_yuzu_baskin: false, zarar_av_ya_da_kafes: false, uygunsuz: false, yazi_logo_baskin: false, dusuk_kalite: false, kisa_gerekce: "ok" });
const VL_HEYKEL_TAMAM = JSON.stringify({ konuya_uygun: true, belirgin_ciplaklik: false, dini_ibadet_nesnesi: false, insan_yuzleri_baskin: false, yazi_logo_baskin: false, dusuk_kalite: false, kisa_gerekce: "ok" });
const modelKur = (yanit) => { const sayac = { vl: 0 }; return { sayac, yaz: async (sistem, girdi, sec = {}) => { if (!sec.resim) throw new Error("yazım çağrısı beklenmiyordu"); sayac.vl++; return { metin: yanit ?? (/insan_yuzu_baskin/.test(girdi) ? VL_HAYVAN_TAMAM : VL_HEYKEL_TAMAM) }; } }; };
const ornekHayvan = HAYVANLAR[0], ornekHeykel = HEYKELLER.find((h) => !h.anonim) || HEYKELLER[0];
const agMadde = (...ogeler) => Object.fromEntries(ogeler.map((o) => [o.madde, `${o.madde} hakkında yeterince uzun bir kaynak metni. `.repeat(8)]));
const ortak = { rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {} };

test("uçtan uca op_hayvanlar: model YAZMAZ, madde + Commons doğrulanır, görsel denetimi (1 çağrı), yayın yükü ve yuva kaydı", async () => {
  const bulut = bulutKur(), model = modelKur(VL_HAYVAN_TAMAM);
  const s = await konuUret({ hesap: "op_hayvanlar", bulut, model, fetchFn: sahteAg({ madde: agMadde(ornekHayvan) }), cagriHakki: 2, tekrarGun: 14, hayvanlar: [ornekHayvan], ...ortak });
  assert.equal(s.durum, "yayinlandi", JSON.stringify(s)); assert.equal(model.sayac.vl, 1); assert.equal(s.cagri, 1);
  const { h, g } = bulut.yayin[0];
  assert.equal(h.kategori, "hayvanlar"); assert.equal(h.editor, "op_hayvanlar"); assert.equal(h.alt_konu, ornekHayvan.alt); assert.equal(h.kaynak, "Vikipedi"); assert.match(h.link, /^https:\/\/en\.wikipedia\.org\/wiki\//);
  assert.equal(h.tr.baslik, ornekHayvan.bas); assert.equal(h.en.baslik, ornekHayvan.basEn); assert.ok(h.tr.ozet.startsWith(ornekHayvan.tr)); assert.ok(h.en.ozet.startsWith(ornekHayvan.en));
  assert.match(h.tr.ozet, /Fotoğraf: Test Fotoğrafçı, CC BY-SA 4\.0 · Wikimedia Commons/); assert.match(h.model, /^konu-kod\+sabit/); assert.ok(h.tr.ozet.length <= 2300);
  assert.match(h.id, /^k-[a-z0-9-]+-[0-9a-f]{6}-\d+$/);
  assert.equal(g.gorsel.lisans, "CC BY-SA 4.0"); assert.equal(g.gorsel.saglayici, "wikimedia"); assert.equal(g.tur, "image/jpeg");
  assert.ok(bulut.isaret.some((i) => i.neden === "gunluk-yuva" && i.ozet === yuvaOzeti("op_hayvanlar", Math.floor(SIMDI / 86400_000), 0)), "yuva işaretlenmedi");
  // kota 2: ikinci yuva saat 12:30'dan önce kapalıdır
  const ikinci = await konuUret({ hesap: "op_hayvanlar", bulut, model, fetchFn: sahteAg({ madde: agMadde(ornekHayvan) }), hayvanlar: [{ ...ornekHayvan, ad: "Başka", madde: ornekHayvan.madde }], ...ortak });
  assert.equal(ikinci.durum, "yok"); assert.equal(ikinci.neden, "aralik");
});

test("uçtan uca op_sanat (heykel): künye + atıf, alt_konu heykel, kategori sanat, model yalnız görsel denetimi", async () => {
  const bulut = bulutKur(), model = modelKur(VL_HEYKEL_TAMAM);
  const s = await konuUret({ hesap: "op_sanat", bulut, model, fetchFn: sahteAg({ madde: agMadde(ornekHeykel) }), cagriHakki: 1, tekrarGun: 14, heykeller: [ornekHeykel], ...ortak });
  assert.equal(s.durum, "yayinlandi", JSON.stringify(s));
  const { h, g } = bulut.yayin[0];
  assert.equal(h.kategori, "sanat"); assert.equal(h.editor, "op_sanat"); assert.equal(h.alt_konu, "heykel");
  assert.ok(h.tr.baslik.includes(ornekHeykel.ad)); assert.match(h.tr.ozet, /Sanatçı: /); assert.match(h.tr.ozet, /Fotoğraf: Test Fotoğrafçı, CC BY-SA 4\.0/); assert.match(h.en.ozet, /Source: Wikipedia/);
  assert.equal(g.gorsel.saglayici, "wikimedia");
  assert.ok(bulut.isaret.some((i) => i.neden === "gunluk-yuva"));
  assert.equal((await konuUret({ hesap: "op_sanat", bulut, model, fetchFn: sahteAg({ madde: agMadde(ornekHeykel) }), heykeller: [{ ...ornekHeykel, ad: "Bir Başka", madde: ornekHeykel.madde }], ...ortak })).neden, "kota-dolu");      // günde 1
});

test("çağrı hakkı yoksa görsel denetimi atlanır ve havuzda doğrulanmış fotoğraf kullanılır; görsel denetimi reddederse yayın yok ve işaret", async () => {
  const bulut = bulutKur(), model = { yaz: async () => { throw new Error("çağrılmamalı"); } };
  const s = await konuUret({ hesap: "op_hayvanlar", bulut, model, fetchFn: sahteAg({ madde: agMadde(ornekHayvan) }), cagriHakki: 0, hayvanlar: [ornekHayvan], ...ortak });
  assert.equal(s.durum, "yayinlandi"); assert.equal(s.cagri, 0);
  const bulut2 = bulutKur(), ret = modelKur(JSON.stringify({ ...JSON.parse(VL_HAYVAN_TAMAM), insan_yuzu_baskin: true }));
  const r = await konuUret({ hesap: "op_hayvanlar", bulut: bulut2, model: ret, fetchFn: sahteAg({ madde: agMadde(ornekHayvan) }), cagriHakki: 3, hayvanlar: [ornekHayvan], ...ortak });
  assert.equal(r.durum, "yok"); assert.equal(r.neden, "gorsel-ret"); assert.equal(bulut2.yayin.length, 0); assert.ok(bulut2.isaret.some((i) => /^vl:/.test(i.neden)));
});

test("fotoğraf zorunlu: Commons lisansı uygun değilse ya da kaynak maddesi yoksa hiçbir şey yayınlanmaz, öğe işaretlenir", async () => {
  const bulut = bulutKur();
  const nc = await konuUret({ hesap: "op_hayvanlar", bulut, model: null, fetchFn: sahteAg({ madde: agMadde(ornekHayvan), lisans: "CC BY-NC 4.0" }), hayvanlar: [ornekHayvan], ...ortak });
  assert.equal(nc.durum, "yok"); assert.equal(nc.neden, "gorsel-ret"); assert.equal(bulut.yayin.length, 0); assert.ok(bulut.isaret.some((i) => /lisans/.test(i.neden)));
  const bulut2 = bulutKur();
  const yok = await konuUret({ hesap: "op_sanat", bulut: bulut2, model: null, fetchFn: sahteAg({ madde: {} }), heykeller: [ornekHeykel], ...ortak });
  assert.equal(yok.durum, "yok"); assert.equal(yok.neden, "madde-yok"); assert.equal(bulut2.yayin.length, 0); assert.ok(bulut2.isaret.some((i) => /madde yok/.test(i.neden)));
});

test("tekrar koruması: aynı hayvan/eser aynı ve bir önceki tekrar penceresinde yinelenmez; yeni pencerede yinelenir", async () => {
  const d = donemNo(SIMDI, 14);
  const sinama = async (hesap, oge, anahtar, gorulenDonem) => {
    const bulut = bulutKur(new Set([konuKimligi(hesap, oge.ad, gorulenDonem).ozet]));
    const liste = hesap === "op_hayvanlar" ? { hayvanlar: [oge] } : { heykeller: [oge] };
    return konuUret({ hesap, bulut, model: null, fetchFn: sahteAg({ madde: agMadde(oge) }), tekrarGun: 14, cagriHakki: 0, ...liste, ...ortak });
  };
  for (const [hesap, oge] of [["op_hayvanlar", ornekHayvan], ["op_sanat", ornekHeykel]]) {
    const ayni = await sinama(hesap, oge, "ayni", d); assert.equal(ayni.durum, "yok"); assert.equal(ayni.neden, "gorulmus");
    const onceki = await sinama(hesap, oge, "onceki", d - 1); assert.equal(onceki.neden, "gorulmus");
    const yeni = await sinama(hesap, oge, "yeni", d - 2); assert.equal(yeni.durum, "yayinlandi", JSON.stringify(yeni));
  }
  // iki öğeli havuzda görülen atlanır, görülmeyen seçilir
  const diger = { ...ornekHayvan, ad: "Diğer Hayvan", madde: ornekHayvan.madde, gorsel: ornekHayvan.gorsel };
  const bulut = bulutKur(new Set([konuKimligi("op_hayvanlar", ornekHayvan.ad, d).ozet]));
  const s = await konuUret({ hesap: "op_hayvanlar", bulut, model: null, fetchFn: sahteAg({ madde: agMadde(ornekHayvan) }), tekrarGun: 14, cagriHakki: 0, hayvanlar: [ornekHayvan, diger], ...ortak });
  assert.equal(s.durum, "yayinlandi"); assert.equal(bulut.yayin[0].h.tr.baslik, ornekHayvan.bas);          // sahte havuzda iki öğenin metni aynı: görülen ad atlandı, "Diğer Hayvan" yayınlandı
  assert.equal(bulut.yayin[0].h.id, konuKimligi("op_hayvanlar", "Diğer Hayvan", d).id);
});

test("telifli eser (sanatçı 1955 sonrası) ve denetimden geçmeyen metin havuza hiç girmez: havuz boş", async () => {
  const telifli = { ...ornekHeykel, anonim: false, olum: 1975 };
  const s = await konuUret({ hesap: "op_sanat", bulut: bulutKur(), model: null, fetchFn: sahteAg({ madde: agMadde(telifli) }), heykeller: [telifli], ...ortak });
  assert.equal(s.durum, "yok"); assert.equal(s.neden, "havuz-bos");
  const kotu = { ...ornekHayvan, tr: "Bu hayvan her zaman avlanır. Yırtıcı bir türdür ve öldürür bu yüzden." };
  const k = await konuUret({ hesap: "op_hayvanlar", bulut: bulutKur(), model: null, fetchFn: sahteAg({ madde: agMadde(kotu) }), hayvanlar: [kotu], ...ortak });
  assert.equal(k.neden, "havuz-bos");
});

test("kuru mod: yayın ve model yok, seçilen kayıt döner", async () => {
  const bulut = bulutKur();
  const s = await konuUret({ hesap: "op_hayvanlar", bulut, model: { yaz: async () => { throw new Error("çağrılmamalı"); } }, fetchFn: sahteAg({ madde: agMadde(ornekHayvan) }), kuru: true, hayvanlar: [ornekHayvan], ...ortak });
  assert.equal(s.durum, "kuru"); assert.equal(bulut.yayin.length, 0); assert.equal(s.kayit.ad, ornekHayvan.ad); assert.equal(s.kayit.altKonu, ornekHayvan.alt); assert.match(s.kayit.gorselLisans, /CC/);
});

test("konuIsleriCalistir: yuvası dolu hayvan hesabı 'kota-dolu' ile atlanır (deneme hakkı harcamaz); sırası gelenler yayınlanır; tur başına kategori tek yayın", async () => {
  const gun = Math.floor(SIMDI / 86400_000);
  const hepsiKapali = Object.fromEntries(KONU_HESAP_ADLARI.map((h) => [h, 0]));
  const fetchFn = sahteAg({ madde: new Proxy({}, { has: () => true, get: (_, k) => `${String(k)} hakkında yeterince uzun bir kaynak metni. `.repeat(8) }) });
  // 1) iki yuva da dolu
  const dolu = bulutKur(new Set([yuvaOzeti("op_hayvanlar", gun, 0), yuvaOzeti("op_hayvanlar", gun, 1)]));
  const ayar = { ...ayarOku({}, []), konuKotalari: { ...hepsiKapali, op_hayvanlar: 2, op_sanat: 1 }, konuTurUst: 2 };
  const o = await konuIsleriCalistir({ ayar, bulut: dolu, model: modelKur(), fetchFn, simdi: SIMDI, kotaDurum: new Map(), bekleFn: async () => {}, rastgele: () => 0.3 });
  assert.ok(o.atlanan.some((x) => x.alan === "op_hayvanlar" && x.neden === "kota-dolu"), JSON.stringify(o.atlanan));
  // 2) sanat yuvası boş: heykel yayınlanır, hayvan atlanır
  const bulut = dolu; bulut.yayin.length = 0;
  assert.ok(o.calisan.every((c) => c.alan !== "op_hayvanlar"));
  assert.equal(o.calisan.filter((c) => c.alan === "op_sanat").length, 1);
  // 3) hepsi boş: iki hesap farklı kategori, ikisi de yayınlanır
  const taze = bulutKur();
  const o2 = await konuIsleriCalistir({ ayar, bulut: taze, model: modelKur(), fetchFn, simdi: SIMDI, kotaDurum: new Map(), bekleFn: async () => {}, rastgele: () => 0.3 });
  assert.ok(o2.yayin <= 2); assert.equal(new Set(taze.yayin.map((y) => y.h.kategori)).size, taze.yayin.length);
  for (const y of taze.yayin) assert.ok(["hayvanlar", "sanat"].includes(y.h.kategori));
  // kota saat dışı: hiçbiri
  const gece = await konuIsleriCalistir({ ayar, bulut: bulutKur(), model: null, fetchFn, simdi: Date.parse("2026-10-14T22:00:00Z"), kotaDurum: new Map(), bekleFn: async () => {} });
  assert.equal(gece.yayin, 0); assert.ok(gece.atlanan.every((x) => x.neden === "saat-disi" || x.neden === "kapali")); assert.ok(gece.atlanan.filter((x) => x.neden === "saat-disi").length >= 2);
});

test("haber kategorisi kotası dolu olsa bile (haberler hayvanlar/sanat sayısını artırmış) konu hesapları kendi yuvasıyla çalışır", async () => {
  const hepsiKapali = Object.fromEntries(KONU_HESAP_ADLARI.map((h) => [h, 0]));
  const ayar = { ...ayarOku({}, []), konuKotalari: { ...hepsiKapali, op_sanat: 1 } };
  const haberKotasi = new Map([["sanat", { son24: 25, son7g: 100, sonZaman: new Date(SIMDI - 60_000).toISOString() }]]);
  const fetchFn = sahteAg({ madde: new Proxy({}, { has: () => true, get: (_, k) => `${String(k)} hakkında yeterince uzun bir kaynak metni. `.repeat(8) }) });
  const bulut = bulutKur();
  const o = await konuIsleriCalistir({ ayar, bulut, model: null, fetchFn, simdi: SIMDI, kotaDurum: haberKotasi, bekleFn: async () => {}, rastgele: () => 0.3 });
  assert.equal(o.yayin, 1, JSON.stringify(o)); assert.equal(bulut.yayin[0].h.editor, "op_sanat");
});

test("yuva özeti sunucu sözleşmesine uyar (sha256 hex, 64 karakter) ve hesap/gün/sıra ile değişir", () => {
  const a = yuvaOzeti("op_hayvanlar", 20000, 0);
  assert.match(a, /^[0-9a-f]{16,64}$/);
  assert.equal(a, createHash("sha256").update("konuyuva|op_hayvanlar|20000|0").digest("hex"));
  assert.notEqual(a, yuvaOzeti("op_hayvanlar", 20001, 0)); assert.notEqual(a, yuvaOzeti("op_hayvanlar", 20000, 1));
});
