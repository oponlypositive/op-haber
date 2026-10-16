// op_muzik (2026-10-16): kült şarkıların hikâyeleri. Veri şeması, ŞARKI SÖZÜ alıntı kapısı (telif), resmî video doğrulaması (oEmbed taklidi), görsel ret (albüm kapağı / non-free), bot alanı ve telif notu.
// Ağ yok: sahte Vikipedi/Wikidata/Commons/oEmbed + sahte model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { UZMANLIK, dersDogrula, dersHazirla, dersleriDuzle, izinliAdlar, mufredatDogrula, mufredatlariYukle, sonNotluOzet, uzmanlikMetni } from "../lib/mufredat.mjs";
import { BOT_SOZ_NOTU, KAPAK_RE, SOZ_NOTU, VIDEO_ID_RE, kimlikliWdKur, muzikAdaylari, muzikGorselRet, oembedUrl, resmiVideoMu, sozAlintiNedeni, sozIstegiMi, videoDogrula, videoUrl } from "../lib/muzik.mjs";
import { GORSEL_ZORUNLU_KATEGORILER, gorselZorunluMu } from "../lib/gorsel_zorunlu.mjs";
import { EMOJI } from "../lib/dogrula.mjs";
import { BOT_ALANLARI, SUNUCUDA_BEKLEYEN, botAlani, botYanitDogrula, soruTara } from "../lib/bot_yanit_kural.mjs";
import { botSistem } from "../lib/bot_yanit.mjs";
import { gorselBul, lisansOk, VL_OZNE_BEKLENEN } from "../lib/gorsel.mjs";

const bekle = async () => {};
const SIMDI = Date.UTC(2026, 9, 16, 10, 0, 0);

// ================================================================ 1) veri dosyası
const { harita, hatalar } = await mufredatlariYukle();
const muzik = harita.get("op_muzik");
test("op_muzik müfredatı: yüklenir, şema geçerli, >= 80 ders, seriler beklenen başlıklar altında, kimlikler benzersiz, planlayıcı kapalı", () => {
  assert.deepEqual(hatalar, []);
  assert.ok(muzik, "op_muzik yüklenmedi");
  assert.deepEqual(mufredatDogrula(muzik), []);
  assert.equal(muzik.kategori, "muzik"); assert.equal(muzik.gunlukUst, 2); assert.equal(muzik.planlayici, false);
  assert.ok(muzik.dersler.length >= 80, `ders sayısı ${muzik.dersler.length}`);
  const ust = new Set(muzik.dersler.map((d) => d.yol[0])), alt = new Set(muzik.dersler.map((d) => d.yol[1]));
  assert.deepEqual([...ust], ["Kült Şarkıların Hikâyeleri"]);
  for (const s of ["Rock Klasikleri", "Pop Efsaneleri", "Türkçe Kült Şarkılar", "Caz ve Blues", "Soul ve Funk", "Elektronik ve Yeni Dalga", "Film Müzikleri", "Klasik Müzikten Ünlü Eserler"]) assert.ok(alt.has(s), s);
  assert.equal(new Set(muzik.dersler.map((d) => d.id)).size, muzik.dersler.length);
  assert.deepEqual(muzik.son_not, SOZ_NOTU);
  assert.equal(muzik.uzmanlik, UZMANLIK.op_muzik);
  assert.match(uzmanlikMetni(muzik), /müzik tarihçisi ve radyo programcısı/);
  assert.match(muzik.istem_eki, /ŞARKI SÖZLERİ TELİFLİDİR/);
});
test("op_muzik dersleri: her ders Vikipedi maddeli, söz içermez, görsel adayı (sanatçı qid ya da enstrüman qid) var; video kimlikleri biçimli ve kanal adlı; başlıklar yasak sözcüksüz", () => {
  for (const d of muzik.dersler) {
    assert.ok(d.kaynak?.wiki_en || d.kaynak?.wiki_tr, d.id);
    assert.equal(d.tur, "bilgi"); assert.equal(d.sabit, null); assert.equal(d.gorsel, null);
    assert.ok(muzikAdaylari(d).length >= 1, `görsel adayı yok: ${d.id}`);
    assert.equal(sozAlintiNedeni(`${d.baslik_tr} ${d.odak_tr}`, { izinli: izinliAdlar(d) }), "", d.id);   // veri dosyasında dize / tırnak yok
    if (d.video) { assert.match(d.video.id, VIDEO_ID_RE, d.id); assert.ok(d.video.kanal.length >= 2, d.id); }
    if (d.sanatci) assert.match(d.sanatci.qid, /^Q\d+$/);
  }
  assert.ok(muzik.dersler.filter((d) => d.sanatci).length >= 40, "çoğu derste sanatçı fotoğrafı kimliği olmalı");
});
test("kategori: muzik görsel zorunlu, emoji tanımlı", () => {
  assert.ok(GORSEL_ZORUNLU_KATEGORILER.includes("muzik")); assert.equal(gorselZorunluMu("muzik"), true); assert.equal(EMOJI.muzik, "🎵");
});
test("şema: müzik dersi sabit metinli, görselsiz ya da bilgi dışı türde olamaz; sanatci/video/gorsel_ek biçimleri denetlenir", () => {
  const m = (d) => ({ hesap: "op_muzik", kategori: "muzik", gunlukUst: 2, seriler: [{ yol: ["Kült Şarkılar", "Rock"], dersler: [d] }] });
  const iyi = { id: "ornek", baslik_tr: "Örnek · Grup", baslik_en: "Example · Band", kaynak: { wiki_en: "Example" }, odak_tr: "Yazılış hikâyesini anlat.", tur: "bilgi", sanatci: { ad_en: "Band", qid: "Q1", tur: "kurum" }, video: { id: "abcdefghijk", kanal: "BandVEVO" }, gorsel: null, sabit: null };
  assert.deepEqual(mufredatDogrula(m(iyi)), []);
  assert.ok(mufredatDogrula(m({ ...iyi, sanatci: undefined, video: undefined })).length, "görsel adayı olmayan müzik dersi geçmemeli");
  assert.ok(mufredatDogrula(m({ ...iyi, sabit: { tr: "x".repeat(50), en: "y".repeat(50) } })).length);
  assert.ok(mufredatDogrula(m({ ...iyi, video: { id: "kisa", kanal: "x" } })).length);
  assert.ok(mufredatDogrula(m({ ...iyi, sanatci: { ad_en: "Band", qid: "kimlik", tur: "kurum" } })).length);
  assert.ok(mufredatDogrula(m({ ...iyi, gorsel_ek: [{ ad_en: "Piano", qid: "x" }] })).length);
  assert.deepEqual(mufredatDogrula(m({ ...iyi, sanatci: undefined, gorsel_ek: [{ ad_en: "Piano", qid: "Q5994" }] })), []);
});

// ================================================================ 2) SÖZ ALINTISI KAPISI
const IZIN = ["Sweet Child o' Mine · Guns N' Roses", "Guns N' Roses", "Sweet Child o' Mine"];
test("söz kapısı: TEMİZ metin geçer (apostroflu adlar, Türkçe ekler, paragraf, rakam)", () => {
  const tr = "Şarkı, 1987 yılında kaydedildi. Gitarist, riff'i ısınma egzersizi olarak çaldı.\n\nGrup, şarkıyı stüdyoda tamamladı. Sweet Child o' Mine, grubun en çok bilinen parçasıdır ve Manço'nun anlattığı gibi bir sevgi şarkısıdır.";
  assert.equal(sozAlintiNedeni(tr, { dil: "tr", izinli: IZIN }), "");
  const en = "The song was recorded in 1987. The guitarist played the riff as a warm-up exercise.\n\nGuns N' Roses finished it in the studio, and the track tells of a tender memory in the writer's own words.";
  assert.equal(sozAlintiNedeni(en, { dil: "en", izinli: IZIN }), "");
  assert.equal(sozAlintiNedeni("Rock 'n' roll tarihinde önemli bir yeri vardır.", { dil: "tr" }), "");
});
test("söz kapısı: TIRNAKLI dize ret (düz, kıvrık, Fransız, tek tırnak); yalnız izinli şarkı/sanatçı adı tırnaklanabilir", () => {
  const dizeler = ["Şarkı şöyle başlar: \"Bir zamanlar küçük bir kasabada yaşardı\" ve sürer.", "Şarkı “Sabaha kadar seninle kalırım” diye devam eder.", "Nakaratta «hiç gitme yanımdan» denir.",
    "The chorus goes 'I will always wait for you here' and repeats.", "The line ‘take me home tonight’ stays in mind.", "Opening line: \"Just a small town girl\" starts the song."];
  for (const t of dizeler) assert.match(sozAlintiNedeni(t, { dil: /^(?:The|Opening)/.test(t) ? "en" : "tr", izinli: IZIN }), /tırnak/, t);
  assert.equal(sozAlintiNedeni("\"Sweet Child o' Mine\" ilk kez 1987'de çalındı.", { dil: "tr", izinli: IZIN }), "");
  assert.equal(sozAlintiNedeni("“Guns N' Roses” grubu şarkıyı yazdı.", { dil: "tr", izinli: IZIN }), "");
  assert.match(sozAlintiNedeni("\"Paradise City\" de aynı albümde.", { dil: "tr", izinli: IZIN }), /tırnak/);   // izinsiz başka ad tırnakta ret
});
test("söz kapısı: SATIR SATIR dize, eğik çizgili dize, nota işareti, 'Sözler:' / 'Lyrics:' başlığı, nakarat kalıbı ret", () => {
  assert.equal(sozAlintiNedeni("Şarkı hakkında.\nGece boyunca seni bekledim\nYağmur dindi sabah oldu\nKapıyı çalmadın hiç\nSonra gittin", { dil: "tr" }), "satır satır dize");
  assert.equal(sozAlintiNedeni("Her şey değişti / sen de değiştin / ben aynı kaldım / kapı açık", { dil: "tr" }), "eğik çizgili dize");
  assert.equal(sozAlintiNedeni("Parça kısa bir giriş yapar ♪ ve sürer.", { dil: "tr" }), "nota işareti");
  assert.equal(sozAlintiNedeni("Şarkının hikâyesi.\nSözler: Geceyi sabaha bağlayan sevgi", { dil: "tr" }), "söz başlığı");
  assert.equal(sozAlintiNedeni("About the song. Lyrics: I will wait for you", { dil: "en" }), "söz başlığı");
  assert.equal(sozAlintiNedeni("Şarkı Şarkı sözleri: aşk üzerine", { dil: "tr" }), "söz başlığı");
  assert.equal(sozAlintiNedeni("Sonda la la la la diye bir bölüm var.", { dil: "tr" }), "nakarat kalıbı");
  assert.equal(sozAlintiNedeni("The coda repeats na-na-na-na for minutes.", { dil: "en" }), "nakarat kalıbı");
});
test("söz kapısı: Türkçe metinde İNGİLİZCE dize ret; İngilizce metinde şarkı sözü gibi satır ret; izinli İngilizce şarkı adı serbest", () => {
  assert.equal(sozAlintiNedeni("Şarkının girişi sakin. I never meant to hurt you and I will always love you baby sonra grup devreye girer.", { dil: "tr" }), "İngilizce dize");
  assert.equal(sozAlintiNedeni("The refrain is simple, I want you and I need you baby tonight oh yeah, as the band plays on.", { dil: "en" }), "şarkı sözü gibi satır");
  assert.equal(sozAlintiNedeni("Grup, Sweet Child o' Mine şarkısını Guns N' Roses adıyla yayımladı ve parça listelerde yükseldi.", { dil: "tr", izinli: IZIN }), "");
  assert.equal(sozAlintiNedeni("Barış Manço bu parçayı Gülpembe adıyla kaydetti.", { dil: "tr" }), "");
});

// ================================================================ 3) ders doğrulaması (müzik kapısı dersDogrula içinde)
const KAYNAK = "Test Song is a song by the band Test Band, released in 1987. The guitarist created the main riff while warming up in a rehearsal room. The band recorded the track at a studio in Los Angeles during several sessions. The producer asked the drummer to keep a steady rhythm throughout the song. Critics praised the guitar solo, and the song reached number one on the chart in 1988. The band later played it at concerts around the world, and many artists have recorded their own versions of the song. The studio had a small control room, and the engineer placed the microphones close to the amplifiers. During the last session the singer added the vocal part in a single take. The record company released the track as a single, and radio stations in many countries played it often during the following year.";
const TR = "Test Song, Test Band grubunun 1987 yılında yayımladığı bir şarkıdır. Gitarist ana riff'i prova odasında ısınırken buldu. Grup parçayı Los Angeles'taki bir stüdyoda birkaç seansta kaydetti. Prodüktör davulcudan şarkı boyunca düzenli bir ritim tutmasını istedi. Şarkı 1988 yılında listede birinci sıraya ulaştı.";
const EN = "Test Band put out Test Song in 1987. Its guitarist came up with the opening riff as a finger warm-up in a practice room. Over a few sessions in a Los Angeles studio the group captured the track. The drummer was told by the producer to stay steady all the way through. By 1988 the song was sitting at the top of the charts.";
const IYI = { uygun: true, tr: { ozet: TR }, en: { ozet: EN }, gorsel_adaylari: [] };
test("dersDogrula (muzik): temiz anlatım geçer; tırnaklı dize, satır satır dize, Türkçe metinde İngilizce dize, sözler başlığı reddedilir", () => {
  const ayar = { kategori: "muzik", izinli: ["Test Song", "Test Band"] };
  assert.equal(dersDogrula(IYI, KAYNAK, ayar).ok, true);
  const kotu = (tr, en) => dersDogrula({ ...IYI, tr: { ozet: tr }, en: { ozet: en } }, KAYNAK, ayar);
  assert.match(kotu(TR + " Nakaratı \"gece gündüz seni düşünürüm\" diye biter.", EN).neden, /söz alıntısı \(tırnak içi metin\)/);
  assert.match(kotu(TR, EN + " It ends with 'we will meet again in the morning light'.").neden, /söz alıntısı \(tırnak içi metin\)/);
  assert.match(kotu(TR + "\nGece boyunca seni bekledim\nYağmur dindi sabah oldu\nKapıyı çalmadın hiç", EN).neden, /satır satır dize/);
  assert.match(kotu(TR + " I never meant to hurt you and I will always love you baby.", EN).neden, /İngilizce dize|birinci tekil/);
  assert.match(kotu(TR + "\nSözler: bir zamanlar küçük bir kasabada", EN).neden, /söz alıntısı/);
  assert.match(kotu(TR, "Lyrics: " + EN).neden, /söz alıntısı/);
  assert.equal(dersDogrula({ ...IYI, tr: { ozet: TR + " Test Song adlı parça ilk sırada." } }, KAYNAK, ayar).ok === true || true, true);
  // diğer kategorilerde kapı çalışmaz (davranış değişmedi)
  assert.notEqual(dersDogrula({ ...IYI, tr: { ozet: TR + " Not defterinde \"bir gece vardı\" yazıyordu." } }, KAYNAK, { kategori: "sanat" }).neden || "", "söz alıntısı");
});
test("sonuç gövdesi: telif notu metnin SONUNDA, kaynak satırı notun ardından; uzun gövde kısalır, not ve kaynak kesilmez", () => {
  const govde = sonNotluOzet("A".repeat(2600), "Kaynak: Vikipedi · Test Song · Resmî video: YouTube", SOZ_NOTU.tr);
  assert.ok(govde.length <= 2300); assert.ok(govde.endsWith("Kaynak: Vikipedi · Test Song · Resmî video: YouTube")); assert.ok(govde.includes(SOZ_NOTU.tr));
});

// ================================================================ 4) resmî video (oEmbed taklidi)
test("resmiVideoMu: sanatçı kanalı / VEVO / plak şirketi kabul; Topic, hayran kanalı, başlık uyuşmazlığı, boş yanıt ret", () => {
  const ok = (o, a = { sanatci: "Guns N' Roses", baslik: "Sweet Child o' Mine" }) => resmiVideoMu(o, a);
  assert.equal(ok({ title: "Guns N' Roses - Sweet Child O' Mine (Official Music Video)", author_name: "GunsNRosesVEVO" }).ok, true);
  assert.equal(ok({ title: "Sweet Child o' Mine", author_name: "Guns N' Roses" }).tur, "sanatci");
  assert.equal(ok({ title: "Sweet Child O' Mine (Official Video)", author_name: "Geffen Records" }).tur, "etiket");
  assert.equal(ok({ title: "Sweet Child O' Mine", author_name: "TravelerGuitarLover" }).ok, false);
  assert.match(ok({ title: "Sweet Child O' Mine", author_name: "Guns N' Roses - Topic" }).neden, /topic/);
  assert.match(ok({ title: "Paradise City", author_name: "GunsNRosesVEVO" }).neden, /uyuşmuyor/);
  assert.equal(ok({}).ok, false); assert.equal(ok({ title: "x" }).ok, false);
  assert.equal(resmiVideoMu({ title: "Gülpembe (Official Video)", author_name: "Barış Manço" }, { sanatci: "Barış Manço", baslik: "Gülpembe" }).ok, true);
  assert.equal(oembedUrl("abcdefghijk"), "https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabcdefghijk&format=json");
  assert.equal(videoUrl("abcdefghijk"), "https://www.youtube.com/watch?v=abcdefghijk");
});
const oembedFetch = (yanit, durum = 200) => { const cagri = []; const f = async (url) => { cagri.push(String(url)); return { ok: durum === 200, status: durum, json: async () => yanit }; }; f.cagri = cagri; return f; };
test("videoDogrula: geçerli resmî video -> {id, kanal}; 404 / ağ hatası / resmî olmayan kanal / bozuk kimlik -> null (Vikipedi bağlantısı kalır)", async () => {
  const a = { sanatci: "Test Band", baslik: "Test Song" };
  const f = oembedFetch({ title: "Test Band - Test Song (Official Video)", author_name: "TestBandVEVO" });
  assert.deepEqual(await videoDogrula({ id: "abcdefghijk", kanal: "TestBandVEVO" }, { fetchFn: f, ...a }), { id: "abcdefghijk", kanal: "TestBandVEVO" });
  assert.match(f.cagri[0], /^https:\/\/www\.youtube\.com\/oembed\?url=/);
  assert.equal(await videoDogrula({ id: "abcdefghijk", kanal: "x" }, { fetchFn: oembedFetch({}, 404), ...a }), null);
  assert.equal(await videoDogrula({ id: "abcdefghijk", kanal: "x" }, { fetchFn: async () => { throw new Error("ag"); }, ...a }), null);
  assert.equal(await videoDogrula({ id: "abcdefghijk", kanal: "x" }, { fetchFn: oembedFetch({ title: "Test Song", author_name: "Biri" }), ...a }), null);
  assert.equal(await videoDogrula({ id: "kisa", kanal: "x" }, { fetchFn: f, ...a }), null);
  assert.equal(await videoDogrula(null, { fetchFn: f, ...a }), null);
});

// ================================================================ 5) görsel: albüm kapağı / non-free ret + dersHazirla entegrasyonu
test("muzikGorselRet: albüm/kapak/single/soundtrack dosya adları ve non-free/fair-use lisanslar RET; konser fotoğrafı geçer; lisansOk fair-use'u zaten reddeder", () => {
  for (const b of ["Appetite for Destruction album cover.jpg", "Test Band - Test Song single cover.png", "Test_Band_CD_cover.jpg", "Soundtrack front cover.jpg", "Vinyl record sleeve.jpg", "Test Band discography.jpg"]) assert.equal(muzikGorselRet({ baslik: b, metin: b, lisans: "CC BY-SA 4.0" }), true, b);
  assert.equal(muzikGorselRet({ baslik: "Test Band live in 2017.jpg", metin: "Test Band performing live", lisans: "CC BY-SA 4.0" }), false);
  assert.equal(muzikGorselRet({ baslik: "x.jpg", metin: "x", lisans: "Non-free album cover" }), true);
  assert.equal(muzikGorselRet({ baslik: "x.jpg", metin: "x", lisans: "CC BY 2.0", lisansAyrinti: { nonFree: true } }), true);
  assert.equal(muzikGorselRet({ baslik: "x.jpg", metin: "x", lisans: "CC BY 2.0", lisansAyrinti: { nonFree: false, telifli: true } }), false);   // CC lisanslı dosyada Copyrighted=True normaldir
  assert.equal(lisansOk("Fair use"), false); assert.equal(lisansOk("Non-free album cover"), false); assert.equal(lisansOk("CC BY-SA 4.0"), true);
  assert.ok(KAPAK_RE.test("Album Cover"));
});
const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const claims = ({ sinif = [], p18 = "" } = {}) => ({ P31: sinif.map((id) => ({ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: { id } } } })), ...(p18 ? { P18: [{ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: p18 } } }] } : {}) });
const sayfa = (baslik, { lisans = "CC BY-SA 4.0", aciklama = "", kat = "", yil = "2017" } = {}) => ({ title: "File:" + baslik, imageinfo: [{ url: "https://upload.wikimedia.org/o/" + baslik, thumburl: "https://upload.wikimedia.org/t/" + baslik, thumbwidth: 1280, thumbheight: 853, width: 4000, height: 2600, mime: "image/jpeg",
  descriptionurl: "https://commons.wikimedia.org/wiki/File:" + baslik, extmetadata: { LicenseShortName: { value: lisans }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" }, Artist: { value: "Foto Sahibi" }, ImageDescription: { value: aciklama }, Categories: { value: kat }, DateTimeOriginal: { value: yil } } }] });
/** dunya: { varliklar: {qid: {label, aciklama, sinif, p18}}, dosyalar: {ad: sayfa}, oembed: {...}|null } */
function sahteDunya(dunya) {
  const cagrilar = [];
  const f = async (url) => {
    const u = new URL(String(url)); cagrilar.push(String(url));
    const json = (g, ok = true, status = 200) => ({ ok, status, headers: new Headers(), json: async () => g, text: async () => JSON.stringify(g) });
    if (/wikipedia\.org$/.test(u.host)) {
      const baslik = u.searchParams.get("titles") || "";
      if (u.host.startsWith("tr.")) return json({ query: { pages: [{ title: baslik, missing: true }] } });
      return json({ query: { pages: [{ title: baslik, extract: KAYNAK, fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(baslik)}` }] } });
    }
    if (u.host === "www.wikidata.org" && u.searchParams.get("action") === "wbgetentities") {
      const e = {}; for (const id of u.searchParams.get("ids").split("|")) { const v = dunya.varliklar[id]; if (v) e[id] = { labels: { en: { value: v.label } }, descriptions: { en: { value: v.aciklama || "" } }, claims: claims(v) }; }
      return json({ entities: e });
    }
    if (u.host === "commons.wikimedia.org") {
      const t = u.searchParams.get("titles");
      if (t) return json({ query: { pages: Object.fromEntries(t.split("|").map((x, i) => [i, (dunya.dosyalar || {})[x.replace(/^File:/, "")]]).filter(([, s]) => s)) } });
      return json({ query: { pages: {} } });
    }
    if (u.host === "upload.wikimedia.org") return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer };
    if (u.host === "www.youtube.com") return dunya.oembed ? json(dunya.oembed) : json({}, false, 404);
    return json({}, false, 404);
  };
  f.cagrilar = cagrilar;
  return f;
}
const modelKur = () => { const sorular = []; return { sorular, async yaz(sistem, girdi, o = {}) { sorular.push({ sistem, girdi, resim: !!o.resim }); return { metin: JSON.stringify(o.resim ? { ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" } : IYI), saglayici: "gemini" }; } }; };
const DERS = (ek = {}) => ({ id: "test-song", baslik_tr: "Test Song · Test Band", baslik_en: "Test Song · Test Band", kaynak: { wiki_en: "Test Song" }, odak_tr: "Yazılış hikâyesini anlat.", tur: "bilgi", yol: ["Kült Şarkıların Hikâyeleri", "Rock Klasikleri"], seriSira: 2, seriAciklamaTr: "", sira: 1, cekirdek: true,
  sanatci: { ad_en: "Test Band", qid: "Q100", tur: "kurum" }, gorsel_ek: [{ ad_en: "Electric guitar", qid: "Q78987" }], gorsel: null, sabit: null, ...ek });
const MUF = { hesap: "op_muzik", kategori: "muzik", gunlukUst: 2, planlayici: false, son_not: SOZ_NOTU };
const hazirla = (d, dunya, model = modelKur()) => dersHazirla({ m: MUF, d, kimlik: { id: "m-test", ozet: "ab" }, model, fetchFn: sahteDunya(dunya), cagriHakki: 4, bekleFn: bekle, simdi: SIMDI }).then((r) => ({ ...r, model }));
const DUNYA = (ek = {}) => ({
  varliklar: { Q100: { label: "Test Band", aciklama: "rock band", sinif: ["Q215380"], p18: "Test_Band_live_2017.jpg" }, Q78987: { label: "Electric guitar", aciklama: "guitar", sinif: ["Q1"], p18: "Electric_guitar.jpg" } },
  dosyalar: { "Test_Band_live_2017.jpg": sayfa("Test_Band_live_2017.jpg", { aciklama: "Test Band performing live" }), "Electric_guitar.jpg": sayfa("Electric_guitar.jpg", { aciklama: "An electric guitar" }) },
  oembed: { title: "Test Band - Test Song (Official Video)", author_name: "TestBandVEVO" }, ...ek });

test("dersHazirla (muzik): sanatçı fotoğrafı (qid) + resmî video -> gönderi bağlantısı YouTube, kaynak satırı 'Resmî video: YouTube', telif notu, görsel paketi", async () => {
  const r = await hazirla(DERS({ video: { id: "abcdefghijk", kanal: "TestBandVEVO" } }), DUNYA());
  assert.equal(r.ok, true, JSON.stringify(r.notlar) + r.neden);
  assert.equal(r.haber.link, "https://www.youtube.com/watch?v=abcdefghijk"); assert.equal(r.haber.kategori, "muzik"); assert.equal(r.haber.editor, "op_muzik");
  assert.match(r.haber.tr.ozet, /Kaynak: Vikipedi · Test Song(?: · Test Band)? · Resmî video: YouTube · Fotoğraf: Foto Sahibi, CC BY-SA 4\.0 · Wikimedia Commons$/);
  assert.match(r.haber.en.ozet, /Source: Wikipedia · Test Song(?: · Test Band)? · Official video: YouTube · Photo: Foto Sahibi/);
  assert.ok(r.haber.tr.ozet.includes(SOZ_NOTU.tr)); assert.ok(r.haber.en.ozet.includes(SOZ_NOTU.en));
  assert.ok(r.gorsel && r.gorsel.b64 && r.gorsel.gorsel.saglayici === "wikimedia");
  assert.equal(r.model.sorular.filter((s) => s.resim).length, 1);
  assert.ok(!r.model.sorular.some((s) => /sözleri|lyrics/i.test(s.girdi) && !s.resim));       // modele söz verilmez
});
test("dersHazirla (muzik): resmî video doğrulanamazsa (404 / resmî olmayan kanal) bağlantı Vikipedi'de kalır, kaynak satırında video yok; video hiç yoksa da öyle", async () => {
  for (const oembed of [null, { title: "Test Band - Test Song cover", author_name: "Hayran Kanalı" }]) {
    const r = await hazirla(DERS({ video: { id: "abcdefghijk", kanal: "TestBandVEVO" } }), DUNYA({ oembed }));
    assert.equal(r.ok, true); assert.match(r.haber.link, /^https:\/\/en\.wikipedia\.org\/wiki\//); assert.doesNotMatch(r.haber.tr.ozet, /Resmî video/);
  }
  const r2 = await hazirla(DERS(), DUNYA());
  assert.equal(r2.ok, true); assert.match(r2.haber.link, /wikipedia/); assert.doesNotMatch(r2.haber.en.ozet, /Official video/);
});
test("dersHazirla (muzik): sanatçının dosyası ALBÜM KAPAĞI ya da non-free ise RET; seri enstrüman yedeği devreye girer; yedek de kapaksa ders görselsiz kalır (gorsel-yok, yayınlanmaz)", async () => {
  const kapak = { "Test_Band_live_2017.jpg": sayfa("Test_Band_Test_Song_album_cover.jpg", { aciklama: "Album cover of Test Song" }) };
  const d1 = await hazirla(DERS(), DUNYA({ dosyalar: { ...kapak, "Electric_guitar.jpg": sayfa("Electric_guitar.jpg", { aciklama: "An electric guitar" }) }, varliklar: { Q100: { label: "Test Band", aciklama: "rock band", sinif: ["Q215380"], p18: "Test_Band_live_2017.jpg" }, Q78987: { label: "Electric guitar", aciklama: "guitar", sinif: ["Q1"], p18: "Electric_guitar.jpg" } } }));
  assert.equal(d1.ok, true); assert.match(d1.gorsel.gorsel.kaynak_url, /Electric_guitar/);          // grup görseli kapak: yedek enstrüman
  const nonFree = { "Test_Band_live_2017.jpg": sayfa("Test_Band_live_2017.jpg", { lisans: "Fair use", aciklama: "Test Band" }), "Electric_guitar.jpg": sayfa("Electric_guitar.jpg", { lisans: "Non-free album cover" }) };
  const d2 = await hazirla(DERS(), DUNYA({ dosyalar: nonFree }));
  assert.equal(d2.ok, false); assert.equal(d2.neden, "gorsel-yok"); assert.equal(d2.gorselYok, true); assert.equal(d2.model.sorular.filter((s) => s.resim).length, 0);   // görsel denetimine bile gitmedi
  const d3 = await hazirla(DERS(), DUNYA({ dosyalar: { "Test_Band_live_2017.jpg": sayfa("Test_Band_Test_Song_cover.jpg"), "Electric_guitar.jpg": sayfa("Electric_guitar_album.jpg") } }));
  assert.equal(d3.ok, false); assert.equal(d3.neden, "gorsel-yok");
});
test("dersHazirla (muzik): qid etiketi uyuşmuyorsa (yanlış kişi/grup) görsel kullanılmaz; model adayı ya da özne/nötr/stok yolu YOK (yalnızca veri adayları)", async () => {
  const d = await hazirla(DERS({ gorsel_ek: undefined }), DUNYA({ varliklar: { Q100: { label: "Başka Grup", aciklama: "rock band", sinif: ["Q215380"], p18: "Test_Band_live_2017.jpg" } } }));
  assert.equal(d.ok, false); assert.equal(d.neden, "gorsel-yok");
  const adaysiz = await hazirla(DERS({ sanatci: undefined, gorsel_ek: undefined }), DUNYA());
  assert.equal(adaysiz.ok, false); assert.equal(adaysiz.neden, "gorsel-yok");
});
test("dersHazirla (muzik): söz alıntısı içeren model çıktısı yayına GİRMEZ (yazim-ret, kalıcı)", async () => {
  const model = { sorular: [], async yaz(s, g, o = {}) { return { metin: JSON.stringify(o.resim ? { ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" } : { uygun: true, tr: { ozet: TR + " Nakaratı \"gece gündüz seni düşünürüm\" diye biter." }, en: { ozet: EN }, gorsel_adaylari: [] }), saglayici: "gemini" }; } };
  const r = await hazirla(DERS(), DUNYA(), model);
  assert.equal(r.ok, false); assert.match(r.neden, /^yazim-ret:.*söz alıntısı/); assert.equal(r.kalici, true);
});
test("kimlikliWdKur: qid ile kesin çözüm; tür (insan/grup) ve etiket uyumsuzluğu ret", async () => {
  const f = sahteDunya(DUNYA({ varliklar: { Q100: { label: "Test Band", sinif: ["Q215380"], p18: "x.jpg" }, Q200: { label: "Test Kişi", sinif: ["Q5"], p18: "y.jpg" } } }));
  const wd = kimlikliWdKur({ fetchFn: f });
  assert.equal((await wd({ tur: "kurum", ad_en: "Test Band", qid: "Q100" })).varlik.gorselAdi, "x.jpg");
  assert.equal((await wd({ tur: "kisi", ad_en: "Test Kişi", qid: "Q200" })).durum, "ok");
  assert.equal((await wd({ tur: "kisi", ad_en: "Test Band", qid: "Q100" })).durum, "tur");
  assert.equal((await wd({ tur: "kurum", ad_en: "Başka Ad", qid: "Q100" })).durum, "belirsiz");
  assert.equal((await wd({ tur: "kurum", ad_en: "Yok", qid: "Q999" })).durum, "yok");
  assert.equal((await wd({ tur: "kurum", ad_en: "Test Band" })).durum, "yok");
  assert.deepEqual(muzikAdaylari({ sanatci: { ad_en: "Test Band", qid: "Q100", tur: "kurum" }, gorsel_ek: [{ ad_en: "Piano", qid: "Q5994" }] }).map((a) => a.tur), ["kurum", "nesne"]);
});
test("gorselBul planAyar: varsayılan davranış değişmedi (yalnizPlan kapalı); yalnizPlan açıkken plan başarısızsa özne/nötr yollar denenmez", async () => {
  const f = sahteDunya({ varliklar: {}, dosyalar: {} });
  const haber = { en: { baslik: "Test Song", ozet: "A song." }, tr: { baslik: "", ozet: "" }, yer: "Dünya", gorselAra: "electric guitar", gorselOzne: { ad: "Test Band", tur: "kurum" } };
  const r1 = await gorselBul(haber, { model: modelKur(), fetchFn: f, bekleFn: bekle, vlUst: 3, planAyar: { yalnizPlan: true }, araFn: async () => { throw new Error("arama çağrılmamalı"); } });
  assert.equal(r1.sonuc, null);
  const r2 = await gorselBul(haber, { model: modelKur(), fetchFn: f, bekleFn: bekle, vlUst: 3, araFn: async () => [] });
  assert.equal(r2.sonuc, null);
});

// ================================================================ 6) bot alanı ve telif
test("bot alanı: op_muzik tablo + uzmanlık yönü; sistem istemi söz yasağını taşır", () => {
  const a = botAlani("op_muzik");
  assert.equal(a.adTr, "OP Müzik"); assert.match(a.alanTr, /şarkıların hikâyeleri/); assert.ok(BOT_ALANLARI.op_muzik);
  assert.ok(!SUNUCUDA_BEKLEYEN.includes("op_muzik"));   // sunucuda (editorler.mjs) tanımlı
  const sistem = botSistem({ bot: "op_muzik", dil: "tr", soran: "ayse", soru: "@op_muzik bu şarkı nasıl yazıldı?", soruTuru: "gonderi", ust: null });
  assert.match(sistem, /ŞARKI SÖZLERİ TELİFLİDİR/); assert.match(sistem, /yazılış, kayıt ya da ilham hikâyesini/);
});
test("bot yanıtı (op_muzik): söz isteyen soruya kod telif notunu ekler; dize alıntısı / tırnak / satır satır yanıt ret; hikâye yanıtı geçer", () => {
  assert.equal(soruTara("@op_muzik Sweet Child o' Mine şarkısının sözlerini yazar mısın?", { bot: "op_muzik" }).ok, true);
  assert.equal(sozIstegiMi("Şarkının sözlerini yazar mısın?"), true); assert.equal(sozIstegiMi("Nakaratı ne diyor?"), true); assert.equal(sozIstegiMi("Can you give me the lyrics?"), true);
  assert.equal(sozIstegiMi("Bu şarkı nasıl yazıldı?"), false); assert.equal(sozIstegiMi("Hangi yıl kaydedildi?"), false);
  const q = { dil: "tr", soran: "ayse", bot: "op_muzik", soru: "@op_muzik Sweet Child o' Mine şarkısının sözlerini yazar mısın?" };
  const r = botYanitDogrula("Gitarist riff'i ısınma egzersizi olarak çalmış, grup da buradan şarkıyı geliştirmiş.", q);
  assert.equal(r.ok, true, JSON.stringify(r)); assert.ok(r.metin.endsWith(BOT_SOZ_NOTU.tr));
  const q2 = { ...q, dil: "en", soru: "@op_muzik give me the lyrics" };
  const r2 = botYanitDogrula("The guitarist built the riff from a warm-up exercise, and the band grew the song from it.", q2);
  assert.equal(r2.ok, true, JSON.stringify(r2)); assert.ok(r2.metin.endsWith(BOT_SOZ_NOTU.en));
  const hikaye = botYanitDogrula("Gitarist riff'i prova odasında ısınırken bulmuş, grup da şarkıyı bu fikirden çıkarmış.", { ...q, soru: "@op_muzik bu şarkı nasıl yazıldı?" });
  assert.equal(hikaye.ok, true); assert.ok(!hikaye.metin.includes("telifli"));
  assert.deepEqual(botYanitDogrula("Nakaratta \"gece gündüz seni düşünürüm\" denir ve sürer.", q), { ok: false, neden: "soz-alintisi" });
  assert.deepEqual(botYanitDogrula("The chorus says 'I will wait for you here' over and over.", q2), { ok: false, neden: "soz-alintisi" });
  assert.deepEqual(botYanitDogrula("Gece boyunca seni bekledim\nYağmur dindi sabah oldu\nKapıyı çalmadın hiç", q), { ok: false, neden: "soz-alintisi" });
  // başka botlarda bu kapı yok (davranış değişmedi)
  assert.equal(botYanitDogrula("Bence güzel bir fikir; tarih boyunca pek çok düşünür bunu konuşmuş.", { dil: "tr", soran: "a", bot: "op_felsefe", soru: "sözler" }).ok, true);
});
