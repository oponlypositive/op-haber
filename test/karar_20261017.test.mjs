// 2026-10-17 sahip kararları (görsel uygunluğu dışındaki kısım): aynı olay/aynı başlık denetimi, uzun şiir (kıta), kültür bilmecesi başlığı.
// (Görsel kapısı: test/altin_gorsel.test.mjs; duruş/egzersiz dersleri: test/gorsel_zorunlu.test.mjs.) Ağsız.
import { test } from "node:test";
import assert from "node:assert/strict";
import { adayImzasi, ayniOlayBul, ayniOlayMi, baslikBenzer, haberImzasi } from "../lib/ayni_olay.mjs";
import { alintiHaberi, alintiKimligi, alintiUret, alintiUygun, ceviriDogrula, siirBicimliMi, SIIR_DIZE_ALT, SIIR_DIZE_UST } from "../lib/alinti.mjs";
import { BILMECELER, bilmeceKonusu, SOHBET_BASLIK } from "../lib/sohbet_veri.mjs";
import { sohbetHaberi, sohbetUret } from "../lib/sohbet.mjs";

// ---------------------------------------------------------------- 9) tekrar: Gretchen Walsh (iki başlık, 22.75) ve UEFA sıralaması (aynı başlık)
const WALSH1 = { tr: { baslik: "Virginia Pro Am: Gretchen Walsh Dünya Rekoru Kırdı, Curzan Sırtüstü Kazandı", ozet: "Gretchen Walsh, Virginia Pro Am yarışında 50 metre serbestte 22.75 ile yeni dünya rekoru kırdı. Curzan sırtüstü yarışını kazandı." }, en: { baslik: "Virginia Pro Am: Gretchen Walsh Breaks World Record, Curzan Wins Backstroke", ozet: "Gretchen Walsh set a new world record of 22.75 in the 50 free at the Virginia Pro Am." } };
const WALSH2 = { tr: { baslik: "Gretchen Walsh 50 Metre Serbestte Yeni Dünya Rekoru Kırdı", ozet: "Amerikalı yüzücü Gretchen Walsh 50 metre serbestte 22.75 saniyeyle dünya rekorunu geliştirdi." }, en: { baslik: "Gretchen Walsh Sets New World Record in 50m Freestyle", ozet: "American swimmer Gretchen Walsh lowered the world record to 22.75 seconds in the 50m freestyle." } };
const UEFA1 = { tr: { baslik: "UEFA kulüpler sıralaması güncellendi", ozet: "Sıralamada ilk beşte değişiklik oldu." }, en: { baslik: "UEFA club rankings updated", ozet: "The top five changed." } };
const UEFA2 = { tr: { baslik: "UEFA kulüpler sıralaması güncellendi", ozet: "Türk takımlarının puanı arttı." }, en: { baslik: "UEFA club coefficient ranking updated", ozet: "Turkish clubs gained points." } };

test("aynı olay: Gretchen Walsh dünya rekoru iki başlıkla (yazılmış haber ve ham aday); ondalık sonuç (22.75) kişiyle birlikte aynı olay sayılır", () => {
  assert.equal(ayniOlayMi(haberImzasi(WALSH1), haberImzasi(WALSH2)).ayni, true);
  assert.equal(ayniOlayMi(haberImzasi(WALSH2), haberImzasi(WALSH1)).ayni, true);
  // ham aday (ek ad yok, yalnız kişi + sonuç): kişi+olgu
  const ham = adayImzasi({ baslik: "Gretchen Walsh smashes 50 free world record with 22.75 at Virginia Pro Am", ozet: "The Virginia swimmer lowered her own mark." });
  const s = ayniOlayMi(ham, haberImzasi(WALSH2), { ham: true });
  assert.equal(s.ayni, true); assert.equal(s.neden, "kisi+olgu");
  // sonuç sayısı olmasa da aynı kişi + aynı içerik kökleri
  const ham2 = adayImzasi({ baslik: "Gretchen Walsh smashes 50 free world record at Virginia Pro Am", ozet: "The Virginia swimmer lowered her own mark." });
  assert.equal(ayniOlayMi(ham2, haberImzasi(WALSH2), { ham: true }).ayni, true);
  assert.equal(ayniOlayBul(haberImzasi(WALSH2), [{ imza: haberImzasi(WALSH1) }]) !== null, true);
});
test("aynı olay: farklı kişi aynı süre ya da aynı kişi başka yarış AYNI sayılmaz", () => {
  const c1 = { tr: { baslik: "Katie Ledecky 800 metrede kazandı", ozet: "Katie Ledecky 8:04.12 ile kazandı." }, en: { baslik: "Katie Ledecky wins 800m", ozet: "Katie Ledecky won in 8:04.12." } };
  const c2 = { tr: { baslik: "Summer McIntosh 400 metrede kazandı", ozet: "Summer McIntosh 4:04.12 ile kazandı." }, en: { baslik: "Summer McIntosh wins 400m", ozet: "Summer McIntosh won in 4:04.12." } };
  assert.equal(ayniOlayMi(haberImzasi(c1), haberImzasi(c2)).ayni, false);
});
test("aynı başlık: 'UEFA kulüpler sıralaması güncellendi' ikinci kez ASLA (yazılmış haber, ham aday, 48 saat geçmişi); alakasız başlık etkilenmez", () => {
  const m = ayniOlayMi(haberImzasi(UEFA1), haberImzasi(UEFA2));
  assert.equal(m.ayni, true); assert.equal(m.neden, "baslik-ayni");
  assert.equal(ayniOlayMi(adayImzasi({ baslik: "UEFA kulüpler sıralaması güncellendi", ozet: "x" }), haberImzasi(UEFA1), { ham: true }).ayni, true);
  // geçmiş listesi (son 48 saat): sonYayinlar kayıtları { baslik, ozet } -> adayImzasi
  const gecmis = [{ imza: adayImzasi({ baslik: "UEFA kulüpler sıralaması güncellendi", ozet: "Sıralamada değişiklik oldu." }) }];
  assert.notEqual(ayniOlayBul(haberImzasi(UEFA2), gecmis), null);
  assert.equal(ayniOlayBul(haberImzasi({ tr: { baslik: "Mahalle bahçesinde ilk domates toplandı", ozet: "Komşular topladı." }, en: { baslik: "First tomatoes harvested in the neighborhood garden", ozet: "Neighbors harvested them." } }), gecmis), null);
  // büyük/küçük harf, noktalama, aksan ve sondaki boşluk farkı yok sayılır
  assert.equal(baslikBenzer(new Set(["uefa kulupler siralamasi guncellendi"]), new Set(["uefa kulupler siralamasi guncellendi"])), "baslik-ayni");
  assert.equal(ayniOlayMi(haberImzasi({ ...UEFA1, tr: { ...UEFA1.tr, baslik: "UEFA Kulüpler Sıralaması Güncellendi!" } }), haberImzasi(UEFA2)).ayni, true);
  // yüksek benzerlik (>= 0.85, en az 4 sözcük) aynı sayılır; bir sözcük farkı olan KISA başlıklar sayılmaz
  assert.equal(baslikBenzer(new Set(["uefa kulupler siralamasi bu hafta yeniden guncellendi"]), new Set(["uefa kulupler siralamasi bu hafta guncellendi"])), "baslik-ayni");
  assert.equal(baslikBenzer(new Set(["caz belgeseli"]), new Set(["caz belgeseli festivali"])), "", "kısa başlıklar tam eşitlik ister");
});

// ---------------------------------------------------------------- 7) şiir: kıta (4-12 dize), satır sonları korunur, TR dize dize
const KITA_EN = "I shot an arrow into the air,\nIt fell to earth, I knew not where;\nFor, so swiftly it flew, the sight\nCould not follow it in its flight.";
const KITA_TR = "Havaya bir ok attım,\nNereye düştüğünü bilmedim;\nÇünkü o kadar hızlı uçtu ki\nGöz onun uçuşunu izleyemedi.";
const LONGFELLOW = { ad: "Henry Wadsworth Longfellow", wq: "Henry Wadsworth Longfellow", olum: 1882, alanlar: ["siir"], dil: "en" };
const kita = (metin, ek = {}) => ({ metin, satirlar: metin.split("\n"), ozgun: "", kaynakSatiri: "The Arrow and the Song (1845)", tumKaynak: "The Arrow and the Song (1845)", yol: ["Quotes", "The Arrow and the Song (1845)"], eser: "The Arrow and the Song", yil: 1845, ...ek });
test("şiir: kıta sınırları 4-12 dize; kısa (2-3 dize) ve çok uzun (13+) ret; kamu malı (ölüm yılı) kuralı aynen", () => {
  assert.equal(SIIR_DIZE_ALT, 4); assert.equal(SIIR_DIZE_UST, 12);
  assert.equal(alintiUygun(kita(KITA_EN), "siir", LONGFELLOW).ok, true);
  assert.equal(alintiUygun(kita(KITA_EN.split("\n").slice(0, 2).join("\n")), "siir", LONGFELLOW).ok, false);
  assert.equal(alintiUygun(kita(KITA_EN), "siir", { ...LONGFELLOW, olum: 1960 }).ok, false, "yazar 1955'ten sonra öldüyse HİÇ");
  const on2 = Array.from({ length: 12 }, (_, i) => `The line number ${["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][i]} of a quiet spring song`).join("\n");
  assert.equal(alintiUygun(kita(on2), "siir", LONGFELLOW).ok, true, "12 dize kabul");
  assert.equal(alintiUygun(kita(on2 + "\nOne more line of the quiet spring song"), "siir", LONGFELLOW).ok, false, "13 dize ret");
  assert.equal(siirBicimliMi(kita(KITA_EN)), true);
  assert.equal(siirBicimliMi(kita("A single long sentence of plain prose that does not look like verse at all, however long it is.")), false);
});
test("şiir çevirisi dize dize: dize sayısı eşit olmalı; satır sonları korunur", () => {
  const ok = ceviriDogrula({ uygun: true, tr: KITA_TR }, KITA_EN, { siir: true });
  assert.equal(ok.ok, true, ok.neden); assert.equal(ok.tr.split("\n").length, 4);
  const eksik = ceviriDogrula({ uygun: true, tr: KITA_TR.split("\n").slice(0, 3).join("\n") }, KITA_EN, { siir: true });
  assert.equal(eksik.ok, false); assert.equal(eksik.neden, "dize/satır sayısı");
  const birlesik = ceviriDogrula({ uygun: true, tr: KITA_TR.split("\n").join(" ") }, KITA_EN, { siir: true });
  assert.equal(birlesik.ok, false);
});
test("şiir gönderisi biçimi: başlık 'Yazar · Eser (yıl)', gövdede kıta satır satır, Türkçe çeviri notu, özgün metin", () => {
  const c = kita(KITA_EN);
  const h = alintiHaberi({ yazar: LONGFELLOW, c, tr: KITA_TR, alan: "siir", hesap: "op_siir", kimlik: alintiKimligi(LONGFELLOW.ad, c.metin), simdi: Date.UTC(2026, 9, 17, 9, 0, 0) });
  assert.equal(h.tr.baslik, "Henry Wadsworth Longfellow · The Arrow and the Song (1845)");
  assert.ok(h.tr.ozet.startsWith("“Havaya bir ok attım,\nNereye düştüğünü bilmedim;\nÇünkü o kadar hızlı uçtu ki\nGöz onun uçuşunu izleyemedi.”"), h.tr.ozet.slice(0, 160));
  assert.ok(h.tr.ozet.includes(KITA_EN), "özgün kıta satır sonlarıyla gönderide");
  assert.match(h.tr.ozet, /Türkçe çeviri: OP/); assert.equal(h.kategori, "siir");
  assert.equal(h.tr.ozet.split("\n").map((x) => x.replace(/^“/, "")).filter((x) => /^(Havaya|Nereye|Çünkü|Göz)/.test(x)).length, 4);
});
// uçtan uca: Wikiquote'tan kıta seçilir, model dize dize çevirir, 4 dizelik gönderi yayınlanır (alintiUret, taklit ağ)
test("alintiUret (şiir): 4 dizelik kıta seçilir, çeviri dize dize doğrulanır, yayın yükü kıtayı satır sonlarıyla taşır", async () => {
  const wt = `{{Infobox}}\nHenry Wadsworth Longfellow (27 February 1807 – 24 March 1882)\n[[File:Longfellow.jpg|thumb]]\n== Quotes ==\n=== ''The Arrow and the Song'' (1845) ===\n* I shot an arrow into the air,<br>It fell to earth, I knew not where;<br>For, so swiftly it flew, the sight<br>Could not follow it in its flight.\n** The Arrow and the Song (1845)\n`;
  const sayfa = { wikitext: wt };
  const fetchFn = async (url) => {
    const u = String(url);
    const json = (g) => ({ ok: true, status: 200, headers: new Headers(), json: async () => g });
    if (/en\.wikiquote\.org/.test(u)) return json({ parse: { wikitext: wt, title: "Henry Wadsworth Longfellow" } });
    if (/commons\.wikimedia\.org/.test(u)) return json({ query: { pages: [{ title: "File:Longfellow.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/l.jpg", thumbwidth: 900, thumbheight: 1100, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Longfellow.jpg", extmetadata: { LicenseShortName: { value: "Public domain" }, Artist: { value: "Anon" } } }] }] } });
    if (/upload\.wikimedia\.org/.test(u)) { const b = new Uint8Array(2500); b.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 3, 0, 3], 0); return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => b.buffer }; }
    return { ok: false, status: 404, headers: new Headers(), json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const yayinlar = [];
  const bulut = { bilinenler: async () => new Map(), isaretle: async () => ({}), yayinla: async (h, ozet, g) => { yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } };
  const model = { yaz: async () => ({ metin: JSON.stringify({ uygun: true, red_nedeni: "", tr: KITA_TR }), engellendi: "" }) };
  const r = await alintiUret({ alan: "siir", bulut, model, fetchFn, rastgele: () => 0.1, simdi: Date.UTC(2026, 9, 17, 9), cagriHakki: 3, hesap: "op_siir", bekleFn: async () => {}, yazarlar: [LONGFELLOW], enFazlaYazar: 1 });
  assert.equal(r.durum, "yayinlandi", JSON.stringify(r));
  assert.equal(yayinlar.length, 1);
  assert.equal(yayinlar[0].h.tr.ozet.split("\n").map((x) => x.replace(/^“/, "")).filter((x) => /^(Havaya|Nereye|Çünkü|Göz)/.test(x)).length, 4);
  assert.match(yayinlar[0].h.tr.baslik, /^Henry Wadsworth Longfellow · The Arrow and the Song/);
});

// ---------------------------------------------------------------- OP Sohbet: kültür bilmecesi başlığı konu taşır
test("OP Sohbet: 'Kültür bilmecesi' başlığına konu eklenir (tekrar gibi görünmesin); diğer türlerin başlığı aynı", () => {
  assert.equal(bilmeceKonusu("'Mona Lisa' tablosu hangi müzede sergileniyor?").tr, "Ressamlar ve tablolar");
  assert.equal(bilmeceKonusu("'Inception' filminin yönetmeni kimdir?").tr, "Sinema ve yönetmenler");
  assert.equal(bilmeceKonusu("'Bohemian Rhapsody' hangi grubun şarkısıdır?").tr, "Şarkılar ve besteciler");
  assert.equal(bilmeceKonusu("'Küçük Prens' kitabının yazarı olan Fransız pilot-yazar kimdir?").tr, "Edebiyat ve yazarlar");
  assert.equal(bilmeceKonusu("Efes Antik Kenti hangi ilimizin sınırları içindedir?").tr, "Tarihî yerler");
  assert.equal(bilmeceKonusu("Liverpool'da kurulan efsanevi dörtlü hangi gruptur?").tr, "Şarkılar ve besteciler");
  assert.equal(bilmeceKonusu("herhangi bir şey").tr, "Genel kültür");
  assert.equal(SOHBET_BASLIK.bilmece.tr(), "Kültür bilmecesi"); assert.equal(SOHBET_BASLIK.gunun.tr(), "Günün sorusu");
  const h = sohbetHaberi({ tur: "bilmece", id: "s-bi-1", tr: "Kültür bilmecesi: soru?", en: "Quiz?", simdi: Date.UTC(2026, 9, 17), konu: { tr: "Ressamlar ve tablolar", en: "Painters and paintings" } });
  assert.equal(h.tr.baslik, "Kültür bilmecesi: Ressamlar ve tablolar"); assert.equal(h.en.baslik, "Culture quiz: Painters and paintings");
  assert.equal(sohbetHaberi({ tur: "bilmece", id: "s-bi-2", tr: "x?", en: "x?", simdi: 1 }).tr.baslik, "Kültür bilmecesi", "konu yoksa eski başlık");
  assert.equal(sohbetHaberi({ tur: "gunun", id: "s-gu-1", tr: "x?", en: "x?", simdi: 1, konu: { tr: "Ressamlar", en: "x" } }).tr.baslik, "Günün sorusu");
  const konular = new Set(BILMECELER.map(([q]) => bilmeceKonusu(q).tr));
  assert.ok(konular.size >= 5, [...konular].join(","));
});
test("sohbetUret (bilmece): yayınlanan gönderinin başlığı konu taşır ve gönderiler arasında değişir", async () => {
  const basliklar = new Set();
  for (const r of [0.05, 0.3, 0.55, 0.8, 0.95]) {
    const yayin = [];
    const bulut = { bilinenler: async () => new Map(), isaretle: async () => ({}), yayinla: async (h) => { yayin.push(h); return { durum: "eklendi" }; } };
    const s = await sohbetUret({ bulut, model: null, simdi: Date.UTC(2026, 9, 17, 10), rastgele: () => r, turSirasi: ["bilmece"], modelDokunus: false });
    assert.equal(s.durum, "yayinlandi");
    assert.match(yayin[0].tr.baslik, /^Kültür bilmecesi: .+/); assert.match(yayin[0].en.baslik, /^Culture quiz: .+/);
    basliklar.add(yayin[0].tr.baslik);
  }
  assert.ok(basliklar.size >= 2, [...basliklar].join(" | "));
});
