// OP Resim (2026-10-13): kamu malı tablo listesi, telif süzgeci (ressam ölümü <= 1955), tekrar penceresi, Vikipedi/Commons akışı, görsel ve metin denetimleri. Ağsız (sahte fetch + sahte model).
import { test } from "node:test";
import assert from "node:assert/strict";
import { TABLOLAR } from "../lib/resim_liste.mjs";
import { donemNo, haftalikUst, resimMetniDogrula, resimUret, tabloKimligi, tablolar, telifNedeni, vlResimDegerlendir, vlResimSorusu, RESIM_ISTEMI } from "../lib/resim.mjs";
import { denetle } from "../lib/moderasyon.mjs";

const SIMDI = Date.parse("2026-10-13T09:00:00Z");
const EN = "The Hay Wain is an oil painting by John Constable, finished in 1821. It shows a rural scene on the River Stour in Suffolk, with a horse-drawn wagon crossing the shallows near Flatford Mill. The painting is held at the National Gallery in London. Constable exhibited it at the Royal Academy in 1821 and it later drew wide attention in France. Art historians describe it as an important work of English landscape painting.";
const TR = "Saman Arabası, John Constable'ın 1821'de tamamladığı yağlı boya tablodur. Tablo, Suffolk'taki Stour Nehri kıyısında, Flatford Değirmeni yakınında sığ sudan geçen at arabalı bir kırsal sahneyi gösterir. Eser bugün Londra'daki Ulusal Galeri'de bulunur.";
const TR_OZET = "Saman Arabası, İngiliz ressam John Constable'ın 1821 yılında tamamladığı yağlı boya bir tablodur. Tuvalde Suffolk bölgesinde Stour Nehri'nin sığ kıyısı ve sudan geçmeye hazırlanan atlı bir araba görülür. Arka planda Flatford Değirmeni yakınlarındaki ağaçlar ve açık bir gökyüzü yer alır. Eser bugün Londra'daki National Gallery koleksiyonunda sergilenir. Sanat tarihçileri bu resmi İngiliz manzara resminin önemli örneklerinden biri olarak değerlendirir.";
const EN_OZET = "The Hay Wain is an oil painting that John Constable completed in 1821. The canvas shows a horse-drawn wagon crossing the shallow water of the River Stour in Suffolk. Trees near Flatford Mill and an open sky fill the background. Today the work belongs to the National Gallery collection in London. Art historians regard it as one of the key examples of English landscape painting.";
const VL_OK = JSON.stringify({ eser_eslesiyor: true, ciplak_ya_da_uygunsuz: false, dini_sahne_ya_da_simge: false, siddet_savas_ya_da_olum: false, siyasi_figur_ya_da_simge: false, yazi_logo_baskin: false, dusuk_kalite: false, kisa_gerekce: "x" });
const YAZIM_OK = JSON.stringify({ uygun: true, tr: { ozet: TR_OZET }, en: { ozet: EN_OZET } });
const LISTE = [["The Hay Wain", "en", "John Constable", 1837, 1821, "National Gallery, Londra", "manzara"]];
const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const yanit = (govde) => ({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => govde, arrayBuffer: async () => jpeg().buffer });

function sahteAg({ lisans = "Public domain", genislik = 6128, madde = true, resim = "The_Hay_Wain.jpg", trLink = true, extractEn = EN } = {}) {
  const cagrilar = [];
  const f = async (url) => {
    const u = String(url);
    cagrilar.push(u);
    if (u.includes("en.wikipedia.org")) return yanit(madde ? { query: { pages: [{ title: "The Hay Wain", extract: extractEn, pageimage: resim, original: { width: genislik }, langlinks: trLink ? [{ lang: "tr", title: "Saman Arabası" }] : [], fullurl: "https://en.wikipedia.org/wiki/The_Hay_Wain" }] } } : { query: { pages: [{ title: "The Hay Wain", missing: true }] } });
    if (u.includes("tr.wikipedia.org")) return yanit({ query: { pages: [{ title: "Saman Arabası", extract: TR, fullurl: "https://tr.wikipedia.org/wiki/Saman_Arabas%C4%B1" }] } });
    if (u.includes("commons.wikimedia.org")) return yanit({ query: { pages: [{ title: "File:" + resim, imageinfo: [{ url: "https://upload.wikimedia.org/x/The_Hay_Wain.jpg", thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/The_Hay_Wain.jpg/1280px-The_Hay_Wain.jpg", width: genislik, height: 4226, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/File:The_Hay_Wain.jpg",
      extmetadata: { LicenseShortName: { value: lisans }, LicenseUrl: { value: "https://creativecommons.org/publicdomain/mark/1.0/" } } }] }] } });
    if (u.includes("upload.wikimedia.org")) return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer };
    return { ok: false, status: 404, headers: new Headers(), json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  return { f, cagrilar };
}
function sahteBulut(onceki = new Map(), yayinSonucu = { durum: "eklendi" }) {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => onceki, isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return yayinSonucu; } };
}
function sahteModel({ vl = VL_OK, yazim = [YAZIM_OK] } = {}) {
  const m = { cagrilar: [], vl: 0, yazim: 0 };
  m.yaz = async (sistem, girdi) => { m.cagrilar.push(girdi); if (sistem === null) { m.vl++; return { metin: vl, engellendi: "" }; } const y = yazim[Math.min(m.yazim, yazim.length - 1)]; m.yazim++; return { metin: y, engellendi: "", saglayici: "gemini-test" }; };
  return m;
}
const kos = (ek = {}) => resimUret({ bulut: sahteBulut(), model: sahteModel(), fetchFn: sahteAg().f, simdi: SIMDI, rastgele: () => 0, bekleFn: async () => {}, liste: LISTE, cagriHakki: 2, ...ek });

test("liste: >=150 tablo, hepsi telifsiz (ressam ölümü <= 1955), benzersiz, geçerli tür; Osman Hamdi Bey ve Türk resmi var; yasak temalı eser yok", () => {
  const t = tablolar();
  assert.ok(t.length >= 150, `tablo sayısı ${t.length}`);
  assert.ok(t.every((x) => !telifNedeni(x)), "hepsi telifsiz");
  assert.equal(new Set(t.map((x) => `${x.dil}:${x.baslik}`)).size, t.length, "benzersiz");
  assert.ok(t.every((x) => ["manzara", "portre", "naturmort", "gunluk-yasam", "soyut", "hayvan"].includes(x.tur) && ["en", "tr"].includes(x.dil) && x.ressam && x.muze), "alanlar");
  assert.ok(t.some((x) => x.ressam === "Osman Hamdi Bey" && /Tortoise/.test(x.baslik)) && t.some((x) => x.ressam === "Halil Paşa"));
  const metin = t.map((x) => `${x.baslik} ${x.ressam}`).join(" ");
  assert.ok(!/Last Supper|Madonna|Guernica|Nude|Venus|Olympia|Napoleon|Crucifixion|Pietà|Birth of|Garden of Earthly/i.test(metin), "çıplaklık/dinî/savaş/siyasi eser yok");
  assert.equal(denetle(metin).ok, true);
  const bin = TABLOLAR.map((x) => x[3]);
  assert.ok(Math.max(...bin) <= 1955, "en geç ölen ressam 1955");
});

test("telif süzgeci: 1955 sonrası ölen ressam (ör. İbrahim Çallı 1960) elenir, bilinmeyen yıl elenir; hiçbir ağ isteği yapılmaz", async () => {
  const liste = [["Çallı Tablosu", "tr", "İbrahim Çallı", 1960, 1920, "İstanbul", "manzara"], ["Başka", "en", "Bilinmeyen", NaN, 1900, "?", "manzara"]];
  assert.match(telifNedeni(tablolar(liste)[0]), /1955 sonrası/); assert.match(telifNedeni(tablolar(liste)[1]), /bilinmiyor/);
  const ag = sahteAg();
  const s = await kos({ liste, fetchFn: ag.f });
  assert.equal(s.durum, "yok"); assert.equal(s.neden, "havuz-bos"); assert.equal(ag.cagrilar.length, 0);
});

test("kimlik: haber_id biçimine uyar, aynı pencerede aynı, farklı pencerede farklı; haftalık üst sınır havuz/tekrar günüyle hesaplanır", () => {
  const t = tablolar(LISTE)[0], d = donemNo(SIMDI, 180);
  const k = tabloKimligi(t, d);
  assert.match(k.id, /^[a-z0-9-]{1,80}$/); assert.equal(k.id, tabloKimligi(t, d).id); assert.notEqual(k.id, tabloKimligi(t, d + 1).id); assert.notEqual(k.ozet, tabloKimligi(t, d + 1).ozet);
  assert.equal(donemNo(SIMDI, 180), Math.floor(SIMDI / (180 * 86400000)));
  assert.equal(haftalikUst(157, 180), 7); assert.equal(haftalikUst(157, 45), 25); assert.equal(haftalikUst(10, 365), 1);
});

test("OP Resim yayın akışı: Vikipedi + Commons + görsel denetimi + model; başlık kodla kurulur, atıf ve kaynak bağlantısı doğru, lisans Public domain", async () => {
  const bulut = sahteBulut(), model = sahteModel(), ag = sahteAg();
  const s = await kos({ bulut, model, fetchFn: ag.f });
  assert.equal(s.durum, "yayinlandi", JSON.stringify(s.notlar));
  const { h, ozet, g } = bulut.k.yayinlar[0];
  assert.equal(h.kategori, "resim"); assert.equal(h.editor, "op_resim"); assert.equal(h.alt_konu, "manzara"); assert.equal(h.kaynak, "Vikipedi");
  assert.equal(h.tr.baslik, "Saman Arabası · John Constable"); assert.equal(h.en.baslik, "The Hay Wain · John Constable");
  assert.match(h.link, /^https:\/\/tr\.wikipedia\.org\//); assert.match(h.id, /^r-the-hay-wain-[0-9a-f]{6}-\d+$/);
  assert.match(h.tr.ozet, /Kaynak: Vikipedi · Görsel: John Constable, National Gallery, Londra · Wikimedia Commons \(kamu malı\)/); assert.match(h.en.ozet, /Source: Wikipedia/);
  assert.ok(h.tr.ozet.startsWith("Saman Arabası, İngiliz ressam"));
  assert.equal(g.gorsel.lisans, "Public domain"); assert.match(g.gorsel.sahibi, /John Constable, National Gallery/); assert.match(g.gorsel.kaynak_url, /commons\.wikimedia\.org\/wiki\/File:/); assert.equal(g.gorsel.saglayici, "wikimedia"); assert.ok(g.b64.length > 100);
  assert.equal(ozet, tabloKimligi(tablolar(LISTE)[0], donemNo(SIMDI, 180)).ozet);
  assert.equal(model.vl, 1); assert.equal(model.yazim, 1); assert.equal(s.cagri, 1, "yalnız yazım çağrısı bütçeden sayılır");
  assert.match(model.cagrilar[1], /KAYNAK METİN \(Türkçe Vikipedi\)/); assert.match(model.cagrilar[1], /KAYNAK METİN \(İngilizce Vikipedi\)/);
});

test("görsel denetimleri: lisans (CC BY-SA), düşük çözünürlük, görsel yok, madde yok -> yayın yok; Vikipedi maddesi bulunamazsa işaretlenir", async () => {
  for (const [ad, ek, beklenen] of [["CC BY-SA", { lisans: "CC BY-SA 4.0" }, /lisans/], ["düşük çözünürlük", { genislik: 900 }, /çözünürlük/], ["görsel yok", { resim: "" }, /görseli yok/], ["madde yok", { madde: false }, /madde alınamadı/]]) {
    const bulut = sahteBulut(), model = sahteModel();
    const s = await kos({ bulut, model, fetchFn: sahteAg(ek).f });
    assert.equal(s.durum, "yok", ad); assert.equal(bulut.k.yayinlar.length, 0, ad); assert.equal(model.cagrilar.length, 0, `${ad}: model çağrılmaz`);
    assert.ok(s.notlar.some((n) => beklenen.test(n)), `${ad}: ${s.notlar.join("|")}`);
  }
});

test("görsel model denetimi: çıplak/dinî/şiddet/yanlış eser -> yayın yok (yazım çağrısı harcanmaz)", async () => {
  for (const alan of ["ciplak_ya_da_uygunsuz", "dini_sahne_ya_da_simge", "siddet_savas_ya_da_olum", "siyasi_figur_ya_da_simge", "yazi_logo_baskin", "dusuk_kalite"]) {
    const vl = JSON.stringify({ ...JSON.parse(VL_OK), [alan]: true });
    const model = sahteModel({ vl }), bulut = sahteBulut();
    const s = await kos({ bulut, model });
    assert.equal(s.durum, "yok", alan); assert.equal(model.yazim, 0, alan); assert.equal(bulut.k.yayinlar.length, 0);
    assert.ok(bulut.k.isaretler.some((x) => x.durum === "elendi" && /^vl:/.test(x.neden)), alan);
  }
  const eser = sahteModel({ vl: JSON.stringify({ ...JSON.parse(VL_OK), eser_eslesiyor: false }) });
  assert.equal((await kos({ model: eser })).durum, "yok");
  assert.equal(vlResimDegerlendir("{bozuk").ok, false);
  assert.equal(vlResimDegerlendir(JSON.stringify({ eser_eslesiyor: true })).ok, false, "eksik alan = ret");
  assert.match(vlResimSorusu(tablolar(LISTE)[0], "The Hay Wain"), /eser_eslesiyor/);
});

test("metin doğrulaması: kaynakta olmayan rakam, 3 cümle, kaynaksız niyet yorumu, kopya, ünlem, abartı, ölüm/hastalık konusu reddedilir", () => {
  const kaynak = `${TR}\n\n${EN}`;
  const dene = (tr, en = EN_OZET) => resimMetniDogrula({ uygun: true, tr: { ozet: tr }, en: { ozet: en } }, kaynak);
  assert.equal(dene(TR_OZET).ok, true);
  assert.match(dene(TR_OZET.replace("1821", "1823")).neden, /rakam/);
  assert.match(dene("Saman Arabası bir tablodur. Tuvalde bir nehir görülür. Eser Londra'da sergilenir.").neden, /cümle sayısı/);
  assert.match(dene(TR_OZET.replace("Sanat tarihçileri bu resmi", "Ressam burada doğaya duyduğu özlemi anlatmak istedi ve bu resmi")).neden, /niyet|yorum/);
  assert.match(dene(TR_OZET, EN_OZET.replace("Art historians regard it", "Constable wanted to show his feelings; art historians regard it")).neden, /niyet|yorum|first/i);
  assert.match(dene(TR_OZET.replace("tamamladığı", "tamamladığı!")).neden, /ünlem/);
  assert.match(dene(TR_OZET.replace("önemli örneklerinden biri", "muhteşem örneklerinden biri")).neden, /abartılı/);
  assert.match(dene(TR_OZET.replace("açık bir gökyüzü", "çıplak figürler")).neden, /konu yasağı/);
  assert.match(dene(TR_OZET.replace("açık bir gökyüzü", "ressamın hastalığı")).neden, /konu yasağı/);
  assert.match(dene(TR, EN_OZET).neden, /cümle|kopya/);
  assert.equal(resimMetniDogrula({ uygun: false }, kaynak).kalici, true);
  assert.match(RESIM_ISTEMI, /yorumlanır/); assert.match(RESIM_ISTEMI, /4-6 cümle/); assert.match(RESIM_ISTEMI, /RAKAMLA/);
});

test("yazım reddi: iki geçersiz yanıttan sonra tablo elenir; çağrı hakkı 1 ise ikinci deneme yapılmaz", async () => {
  const kotu = JSON.stringify({ uygun: true, tr: { ozet: "Tek cümle." }, en: { ozet: "One sentence." } });
  const bulut = sahteBulut(), model = sahteModel({ yazim: [kotu, kotu] });
  const s = await kos({ bulut, model, cagriHakki: 2 });
  assert.equal(s.durum, "yok"); assert.equal(model.yazim, 2); assert.ok(bulut.k.isaretler.some((x) => /^yazim:/.test(x.neden)));
  const model2 = sahteModel({ yazim: [kotu] });
  const s2 = await kos({ model: model2, cagriHakki: 1 });
  assert.equal(s2.durum, "yok"); assert.equal(s2.neden, "cagri-yok"); assert.equal(model2.yazim, 1);
});

test("tekrar kuralı: aynı penceredeki / bir önceki penceredeki paylaşım atlanır; yayında zaten varsa (var) yeni yayın sayılmaz; haftalık sınır dolunca durur", async () => {
  const t = tablolar(LISTE)[0], d = donemNo(SIMDI, 180);
  for (const ozet of [tabloKimligi(t, d).ozet, tabloKimligi(t, d - 1).ozet]) {
    const ag = sahteAg();
    const s = await kos({ bulut: sahteBulut(new Map([[ozet, { durum: "yayinlandi" }]])), fetchFn: ag.f });
    assert.equal(s.durum, "yok"); assert.equal(s.neden, "gorulmus"); assert.equal(ag.cagrilar.length, 0, "ağa gidilmez");
  }
  const bulutVar = sahteBulut(new Map(), { durum: "var" });
  const sv = await kos({ bulut: bulutVar });
  assert.equal(sv.durum, "yok"); assert.equal(sv.neden, "gorulmus");
  assert.ok(bulutVar.k.isaretler.some((x) => x.durum === "yayinlandi"), "görülen kaydı yenilenir");
  const ag2 = sahteAg();
  const sinir = await resimUret({ bulut: sahteBulut(), model: sahteModel(), fetchFn: ag2.f, simdi: SIMDI, rastgele: () => 0, bekleFn: async () => {}, cagriHakki: 2, kotaDurum: new Map([["resim", { son24: 1, son7g: 7, sonZaman: null }]]) });
  assert.equal(sinir.durum, "yok"); assert.equal(sinir.neden, "tekrar-penceresi"); assert.equal(ag2.cagrilar.length, 0);
  const tekrarKisa = await resimUret({ bulut: sahteBulut(), model: sahteModel(), fetchFn: ag2.f, simdi: SIMDI, rastgele: () => 0, bekleFn: async () => {}, cagriHakki: 2, tekrarGun: 45, kotaDurum: new Map([["resim", { son24: 1, son7g: 7, sonZaman: null }]]) });
  assert.notEqual(tekrarKisa.neden, "tekrar-penceresi", "45 günde haftalık sınır 25: 7 yayın engel değil");
});

test("kuru: model, görsel indirme ve yayın yok; Vikipedi + Commons okunur, örnek kayıt döner", async () => {
  const bulut = { bilinenler: async () => { throw new Error("kuruda çağrılmaz"); }, isaretle: async () => { throw new Error("yok"); }, yayinla: async () => { throw new Error("yok"); } };
  const ag = sahteAg();
  const s = await resimUret({ bulut, model: null, fetchFn: ag.f, simdi: SIMDI, rastgele: () => 0, kuru: true, bekleFn: async () => {}, liste: LISTE });
  assert.equal(s.durum, "kuru"); assert.equal(s.kayit.baslikTr, "Saman Arabası · John Constable"); assert.equal(s.kayit.gorsel.lisans, "Public domain"); assert.ok(!ag.cagrilar.some((u) => u.includes("upload.wikimedia.org")));
});
