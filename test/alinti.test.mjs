// Alıntı hesapları (Wikiquote ayrıştırma, telif, süzgeçler, sıklık/tekrar, çeviri doğrulama), gökbilim (APOD, ay evreleri), yük sözleşmesi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { wikitextAyristir, alintiUygun, alintiKimligi, siraGeldiMi, planAyristir, saatAraligi, ceviriDogrula, alintiUret, olumYiliSayfadan, wikiCoz, alintiHaberi, OZEL_PLAN } from "../lib/alinti.mjs";
import { YAZARLAR, telifsizMi, ALINTI_HESAPLARI as HAT_HESAPLARI } from "../lib/alinti_yazarlar.mjs";
import { apodDogrula, fazlariAyristir, yaklasanFaz, fazHaberi } from "../lib/gokbilim.mjs";
import { ozelIsleriCalistir, siradakiAlanlar } from "../lib/ozel.mjs";
import { yayinYuku } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
// Bu dosya yalnız ana depoda vardır (yayın deposunda yok): varsa tutarlılık denetlenir, yoksa o test atlanır.
const ED = await import("../../functions/_shared/editorler.mjs").catch(() => null);
const { EDITORLER, ALINTI_HESAPLARI, haberEditoru, KATEGORILER, KATEGORI_EDITOR } = ED || {};

const WT = `[[File:Ralph Waldo Emerson by Josiah Johnson Hawes 1857.jpg|thumb|right|portre]]
'''Ralph Waldo Emerson''' ([[25 May]] [[1803]] – [[27 April]] [[1882]]) was an American philosopher.

== Quotes ==
=== ''Nature'' (1836) ===
* Adopt the pace of nature: her secret is patience, and in the end we all find that out.
** ''Nature'' (1836), chapter 1
* A quote with no source line is not allowed here because nothing tells us where it was written down.
* Nothing great was ever achieved without enthusiasm, and it is a good thing to remember that in the long run.
** ''Essays'' (1841)

=== Attributed ===
* Do not go where the path may lead, go instead where there is no path and leave a trail behind you.
** Often said to be Emerson's but not found in his writing.

=== Disputed ===
* The only way to have a friend is to be one, as the old saying goes and as many people repeat today.
** Disputed (1841)

== Misattributed ==
* Success is a journey and not a destination, so enjoy the ride while it lasts and keep on going.
** ''Misattributed'' (1900)

== Quotes about Emerson ==
* He was a great man whom everyone admired very much for his wisdom and his calm voice.
** Someone (1900)
`;

test("Wikiquote ayrıştırma: kaynaklı alıntı kabul; Attributed/Disputed/Misattributed/about ve kaynaksız ret", () => {
  const a = wikitextAyristir(WT);
  const metinler = a.alintilar.map((x) => x.metin);
  assert.ok(metinler.some((m) => m.startsWith("Adopt the pace of nature")));
  assert.ok(!metinler.some((m) => /Do not go where the path/.test(m)), "Attributed atlanmalı");
  assert.ok(!metinler.some((m) => /only way to have a friend/.test(m)), "Disputed atlanmalı");
  assert.ok(!metinler.some((m) => /Success is a journey/.test(m)), "Misattributed atlanmalı");
  assert.ok(!metinler.some((m) => /He was a great man/.test(m)), "Quotes about atlanmalı");
  const yazar = YAZARLAR.find((y) => y.ad === "Ralph Waldo Emerson");
  const sonuc = Object.fromEntries(a.alintilar.map((c) => [c.metin.slice(0, 12), alintiUygun(c, "felsefe", yazar)]));
  assert.equal(sonuc["Adopt the pa"].ok, true);
  assert.equal(sonuc["Nothing grea"].ok, true);
  assert.equal(sonuc["A quote with"].ok, false);                  // kaynak/eser yok
  assert.equal(a.alintilar[0].eser, "Nature"); assert.equal(a.alintilar[0].yil, 1836);
  assert.equal(a.olumYili, 1882);
  assert.deepEqual(a.gorselDosyalari, ["Ralph Waldo Emerson by Josiah Johnson Hawes 1857.jpg"]);
});

test("viki temizliği ve ölüm yılı çıkarımı", () => {
  assert.equal(wikiCoz("'''Bold''' and [[link|text]] and [[plain]]<br />next {{w|x|y}}<!-- gizli -->"), "Bold and text and plain\nnext");
  assert.equal(olumYiliSayfadan("'''X''' ([[1 May]] [[1803]] – [[2 June]] [[1882]]) was"), 1882);
});

test("telif kuralı: ölüm yılı + 70 (<= 1955); yazar listesi tutarlı", () => {
  assert.equal(telifsizMi(1955), true); assert.equal(telifsizMi(1956), false); assert.equal(telifsizMi(undefined), false); assert.equal(telifsizMi(NaN), false);
  for (const y of YAZARLAR) { assert.ok(telifsizMi(y.olum), `${y.ad}: ölüm ${y.olum}`); assert.ok(y.wq && y.alanlar.length, y.ad); }
  const c = wikitextAyristir(WT).alintilar[0];
  assert.equal(alintiUygun(c, "felsefe", { olum: 1960 }).ok, false);
  assert.match(alintiUygun(c, "felsefe", { olum: 1960 }).neden, /telif/);
  assert.equal(alintiUygun(c, "felsefe", { olum: undefined }).ok, false);
});

const mk = (metin, kaynak, ek = {}) => ({ metin, satirlar: metin.split("\n"), ozgun: "", kaynakSatiri: kaynak, tumKaynak: kaynak, yol: ["Quotes", "Work (1800)"], eser: "Work", yil: 1800, ...ek });
test("alıntı süzgeçleri: din, siyaset, savaş, ölüm ret; ton umutlu; çeviri telifi", () => {
  const y = { olum: 1882, cevirili: false };
  const iyi = "Adopt the pace of nature and be patient, for the best things in life take their own time to grow.";
  assert.equal(alintiUygun(mk(iyi, "Work (1800)"), "felsefe", y).ok, true);
  const ret = [
    "God has made the world and every man should love him with all his heart and all his strength every day.",
    "The government should let the people vote and the parties should stop quarrelling about every small thing.",
    "In every war the soldiers suffer more than anyone knows, and the world forgets them very quickly indeed.",
    "Death comes for all of us in the end and there is no escape from it, so we should not hope for much.",
    "There is no race more clever than the people of this small and quiet country, as everyone should know.",
  ];
  for (const m of ret) assert.equal(alintiUygun(mk(m, "Work (1800)"), "felsefe", y).ok, false, m);
  // kısaltılmış / çok kısa / İngilizce olmayan
  assert.equal(alintiUygun(mk("Short [...] text that is cut in the middle of a sentence for no reason at all today.", "W (1800)"), "felsefe", y).ok, false);
  assert.equal(alintiUygun(mk("Too short.", "W (1800)"), "felsefe", y).ok, false);
  assert.equal(alintiUygun(mk("Dies ist ein langer deutscher Satz, der hier eigentlich nicht stehen sollte, weil er nicht englisch ist.", "W (1800)"), "felsefe", y).ok, false);
  // çeviri: modern çevirmen ret, telifsiz çevirmen kabul, çevirmensiz çeviri ret
  const cev = { olum: 180, cevirili: true };
  assert.equal(alintiUygun(mk(iyi, "I, 3 (tr. Robert Fagles)"), "felsefe", cev).ok, false);
  assert.equal(alintiUygun(mk(iyi, "I, 3"), "felsefe", cev).ok, false);
  const kabul = alintiUygun(mk(iyi, "I, 3 (tr. George Long)"), "felsefe", cev);
  assert.equal(kabul.ok, true); assert.equal(kabul.cevirmen, "George Long");
  assert.equal(alintiUygun(mk(iyi, "Variant: tr. George Long", { tumKaynak: "" }), "felsefe", cev).ok, false, "Variant satırındaki çevirmen sayılmaz");
  // şiir: 2-6 dize
  const siir = "A little madness in the spring\nIs wholesome even for the king";
  assert.equal(alintiUygun(mk(siir, "Poem (1861)"), "siir", { olum: 1886 }).ok, true);
  assert.equal(alintiUygun(mk("One single line of a poem that is far too short for a poem quote in our rules", "P (1861)"), "siir", { olum: 1886 }).ok, false);
  assert.equal(alintiUygun(mk(Array(8).fill("A short line of a poem about spring").join("\n"), "P (1861)"), "siir", { olum: 1886 }).ok, false);
});

test("antik eser: `*` satırı özgün dil, ilk `**` satırı İngilizce çeviri; telifsiz çevirmen şart", () => {
  const wt = `== Quotes ==\n=== ''Works and Days'' (c. 700 BC) ===\n* Μηδὲ θεοῖσιν ἶσ' ἔθελε φρονέειν, ἀθάνατοι δὲ θεοί.\n** Think not to match yourself against gods, for men that walk the earth cannot hold their own.\n** Lines 368–369 (tr. H. G. Evelyn-White, 1914)\n* Μηδὲ θεοῖσιν ἶσ' ἔθελε φρονέειν, ἀθάνατοι δὲ θεοί ἄλλοι.\n** Think not to match yourself against others, for men that walk the earth cannot hold their own.\n** Lines 1–2 (tr. R. Lattimore)\n`;
  const [a, b] = wikitextAyristir(wt).alintilar;
  assert.match(a.ozgun, /^Μηδὲ/); assert.match(a.metin, /^Think not/);
  const y = { olum: -700, cevirili: true };
  assert.equal(alintiUygun(a, "mitoloji", y).ok, true);
  assert.equal(alintiUygun(b, "mitoloji", y).ok, false);
});

test("sıklık planı: sıra, kota, aralık, saat penceresi; tekrar kimliği", () => {
  const t = Date.parse("2026-10-13T12:00:00Z"), saat = saatAraligi("5-21");
  const plan = OZEL_PLAN.felsefe;   // günde 3 (2026-10-14), en az 5 saat ara
  assert.equal(siraGeldiMi(plan, undefined, t, saat), true);
  assert.equal(siraGeldiMi(plan, { son24: 3, son7g: 5, sonZaman: "2026-10-12T20:00:00Z" }, t, saat), false);           // kota dolu
  assert.equal(siraGeldiMi(plan, { son24: 1, son7g: 3, sonZaman: "2026-10-13T08:00:00Z" }, t, saat), false);           // 4 saat önce: erken
  assert.equal(siraGeldiMi(plan, { son24: 1, son7g: 3, sonZaman: "2026-10-13T02:00:00Z" }, t, saat), true);            // 10 saat önce
  assert.equal(siraGeldiMi(plan, undefined, Date.parse("2026-10-13T23:00:00Z"), saat), false);                         // saat penceresi dışı
  const mit = OZEL_PLAN.mitoloji;   // haftada 3
  assert.equal(siraGeldiMi(mit, { son24: 0, son7g: 3 }, t, saat), false);
  assert.equal(siraGeldiMi(mit, { son24: 0, son7g: 2, sonZaman: "2026-10-10T12:00:00Z" }, t, saat), true);
  assert.equal(planAyristir("siir:1,mitoloji:2").siir.kota, 1);
  assert.equal(planAyristir("siir:1").felsefe.kota, 3);
  const k1 = alintiKimligi("A", "Hello, World!"), k2 = alintiKimligi("A", "hello   world"), k3 = alintiKimligi("B", "hello world");
  assert.equal(k1.ozet, k2.ozet); assert.notEqual(k1.ozet, k3.ozet); assert.match(k1.id, /^a-[0-9a-f]{16}$/);
  const d = new Map([["felsefe", { sonZaman: "2026-10-13T01:00:00Z", son24: 0, son7g: 0 }], ["siir", { sonZaman: "2026-10-12T01:00:00Z", son24: 0, son7g: 0 }]]);
  const sira = siradakiAlanlar({ plan: OZEL_PLAN, kotaDurum: d, simdi: t, saat });
  assert.ok(sira.indexOf("siir") < sira.indexOf("felsefe"), "en uzun süredir paylaşmayan önce");
});

test("çeviri doğrulama: yalnız çeviri, rakam/dize/biçim kontrolü", () => {
  const og = "Adopt the pace of nature and be patient, for the best things take time.";
  assert.equal(ceviriDogrula({ uygun: true, tr: "Doğanın temposunu benimse ve sabırlı ol, çünkü en güzel şeyler zaman alır." }, og).ok, true);
  assert.equal(ceviriDogrula({ uygun: false }, og).ok, false);
  assert.equal(ceviriDogrula({ uygun: true, tr: "Doğanın temposunu benimse https://x.com ve sabırlı ol." }, og).ok, false);
  assert.equal(ceviriDogrula({ uygun: true, tr: "Doğanın temposunu benimse ve sabırlı ol, çünkü 1999 yılında da öyleydi." }, og).ok, false);
  assert.equal(ceviriDogrula({ uygun: true, tr: "Adopt the pace of nature and be patient, for the best." }, og).ok, false);   // çevrilmemiş
  assert.equal(ceviriDogrula({ uygun: true, tr: "Bahar\nCoşkusu" }, "Spring joy lines\nSecond line here", { siir: true }).ok, false);   // Türkçe sezgisi / dize
});

test("alintiHaberi: başlık yazar+eser, özgün metin ve 'Türkçe çeviri: OP' notu, kaynak bağlantısı", () => {
  const yazar = YAZARLAR.find((y) => y.ad === "Hesiod");
  const h = alintiHaberi({ yazar, c: { metin: "Think not to match yourself against gods.", ozgun: "Μηδὲ θεοῖσιν", eser: "Works and Days", yil: null, kaynakSatiri: "x" }, tr: "Tanrılarla boy ölçüşmeyi düşünme.", alan: "mitoloji", hesap: "op_mitoloji", kimlik: alintiKimligi("Hesiod", "x"), simdi: 0, cevirmen: "Hugh G. Evelyn-White" });
  assert.match(h.tr.baslik, /^Hesiod · Works and Days/);
  assert.match(h.tr.ozet, /Türkçe çeviri: OP/); assert.match(h.tr.ozet, /Antik Yunanca özgün metin/); assert.match(h.tr.ozet, /Hugh G\. Evelyn-White/);
  assert.match(h.en.ozet, /Turkish translation: OP/);
  assert.equal(h.kategori, "mitoloji"); assert.equal(h.link, "https://en.wikiquote.org/wiki/Hesiod"); assert.equal(h.editor, "op_mitoloji");
});

// ---- uçtan uca (ağsız): sahte Wikiquote + Commons + görsel + model + bulut
function jpeg(w, h) {
  const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03], 0); return u;
}
const sahteFetch = (olay = []) => async (url, init) => {
  const u = String(url); olay.push(u);
  const json = (o) => ({ ok: true, status: 200, headers: new Headers(), json: async () => o });
  if (u.includes("wikiquote.org")) return json({ parse: { title: "Ralph Waldo Emerson", wikitext: WT } });
  if (u.includes("commons.wikimedia.org")) return json({ query: { pages: [{ title: "File:Ralph Waldo Emerson by Josiah Johnson Hawes 1857.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/x.jpg", thumbwidth: 900, thumbheight: 1100, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/File:E.jpg", extmetadata: { LicenseShortName: { value: "Public domain" }, Artist: { value: "Josiah Johnson Hawes" } } }] }] } });
  if (u.includes("upload.wikimedia.org")) { const b = jpeg(900, 1100); return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => b.buffer }; }
  return { ok: false, status: 404, headers: new Headers(), json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
};
const emerson = YAZARLAR.filter((y) => y.ad === "Ralph Waldo Emerson");
const TRYANIT = JSON.stringify({ uygun: true, tr: "Doğanın temposunu benimse: sırrı sabırdır ve sonunda hepimiz bunu anlarız." });

test("alintiUret: uçtan uca — çeviri modelden, alıntı koddan, görsel lisanslı; yayın yükü doğru", async () => {
  const yayin = [], isaret = [];
  const bulut = { bilinenler: async () => new Map(), isaretle: async (l) => { isaret.push(...l); return {}; }, yayinla: async (h, ozet, g) => { yayin.push({ h, ozet, g }); return { durum: "eklendi" }; } };
  const model = { yaz: async () => ({ metin: TRYANIT, saglayici: "t" }) };
  const s = await alintiUret({ alan: "felsefe", bulut, model, fetchFn: sahteFetch(), rastgele: () => 0, simdi: Date.parse("2026-10-13T12:00:00Z"), hesap: "op_felsefe", yazarlar: emerson, bekleFn: async () => {} });
  assert.equal(s.durum, "yayinlandi");
  assert.equal(yayin.length, 1);
  const { h, g, ozet } = yayin[0];
  assert.match(ozet, /^[0-9a-f]{64}$/);
  assert.equal(h.kategori, "felsefe"); assert.equal(h.editor, "op_felsefe"); assert.match(h.tr.ozet, /Türkçe çeviri: OP/);
  assert.ok(WT.includes(h.en.ozet.split("”")[0].slice(1)), "özgün metin kaynak alıntıdan birebir");
  assert.equal(g.gorsel.lisans, "Public domain"); assert.equal(g.gorsel.sahibi, "Josiah Johnson Hawes"); assert.equal(g.tur, "image/jpeg");
  const yuk = yayinYuku(h, ozet, g);
  assert.equal(yuk.haber.editor, "op_felsefe"); assert.equal(yuk.gorselTur, "image/jpeg");
});

test("alintiUret: görsel yoksa paylaşılmaz; görülmüş alıntı tekrar edilmez; kuru modda model/yayın yok", async () => {
  const bulut = (gorulen) => ({ bilinenler: async (l) => new Map(l.filter((x) => gorulen(x)).map((x) => [x, { durum: "yayinlandi" }])), isaretle: async () => ({}), yayinla: async () => { throw new Error("yayın olmamalı"); } });
  const gorselsiz = async (url) => (String(url).includes("commons") ? { ok: true, status: 200, headers: new Headers(), json: async () => ({ query: { pages: [] } }) } : sahteFetch()(url));
  const a = await alintiUret({ alan: "felsefe", bulut: bulut(() => false), model: { yaz: async () => ({ metin: TRYANIT }) }, fetchFn: gorselsiz, rastgele: () => 0, yazarlar: emerson, bekleFn: async () => {} });
  assert.equal(a.durum, "yok"); assert.ok(a.notlar.some((n) => /görsel yok/.test(n)));
  const b = await alintiUret({ alan: "felsefe", bulut: bulut(() => true), model: { yaz: async () => { throw new Error("çağrılmamalı"); } }, fetchFn: sahteFetch(), rastgele: () => 0, yazarlar: emerson, bekleFn: async () => {} });
  assert.equal(b.durum, "yok"); assert.ok(b.notlar.some((n) => /görülmüş/.test(n)));
  const k = await alintiUret({ alan: "felsefe", bulut: bulut(() => false), model: null, kuru: true, fetchFn: sahteFetch(), rastgele: () => 0, yazarlar: emerson, bekleFn: async () => {} });
  assert.equal(k.durum, "kuru"); assert.equal(k.cagri, 0); assert.equal(k.kayit.gorsel.lisans, "Public domain");
});

test("alintiUret: ölüm yılı çelişen yazar atlanır", async () => {
  const bulut = { bilinenler: async () => new Map(), isaretle: async () => ({}), yayinla: async () => ({ durum: "eklendi" }) };
  const yanlis = [{ ...emerson[0], olum: 1950 }];     // sayfa 1882 diyor
  const s = await alintiUret({ alan: "felsefe", bulut, model: { yaz: async () => ({ metin: TRYANIT }) }, fetchFn: sahteFetch(), rastgele: () => 0, yazarlar: yanlis, bekleFn: async () => {} });
  assert.equal(s.durum, "yok"); assert.ok(s.notlar.some((n) => /çelişkisi/.test(n)));
});

// ---- gökbilim
test("APOD: copyright dolu, yer tutucu yanıt, görüntü dışı ve başka kurum görseli elenir", () => {
  const aciklama = "A bright comet crosses the sky above a quiet mountain observatory while stars wheel overhead. ".repeat(3);
  const iyi = { date: "2026-10-12", media_type: "image", title: "Comet over the mountain", explanation: aciklama + " Tomorrow's picture: stairway", url: "https://apod.nasa.gov/apod/image/2610/comet.jpg" };
  assert.equal(apodDogrula(iyi).ok, true);
  assert.ok(!/Tomorrow/.test(apodDogrula(iyi).kayit.aciklama));
  assert.equal(apodDogrula({ ...iyi, copyright: "Jane Doe" }).ok, false);
  assert.equal(apodDogrula({ ...iyi, copyright: "" }).ok, true);
  assert.equal(apodDogrula({ ...iyi, media_type: "video" }).ok, false);
  assert.equal(apodDogrula({ ...iyi, title: "NASA Science", url: "https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png" }).ok, false);   // 2026-10-13'te ölçülen yer tutucu
  assert.equal(apodDogrula({ ...iyi, explanation: aciklama + " Image taken by ESO." }).ok, false);
  assert.equal(apodDogrula(null).ok, false);
});

const USNO = { phasedata: [
  { day: 18, month: 10, phase: "First Quarter", time: "16:12", year: 2026 }, { day: 26, month: 10, phase: "Full Moon", time: "04:12", year: 2026 },
  { day: 1, month: 11, phase: "Last Quarter", time: "20:28", year: 2026 }, { day: 9, month: 11, phase: "New Moon", time: "07:02", year: 2026 }, { day: 5, month: 1, phase: "Bozuk", time: "x", year: 2027 } ] };
test("ay evreleri: USNO verisi ayrıştırılır, yalnız bugün/yarın paylaşılır, metin şablonla ve Türkiye saatiyle", () => {
  const f = fazlariAyristir(USNO);
  assert.equal(f.length, 4);
  assert.equal(yaklasanFaz(f, Date.parse("2026-10-13T12:00:00Z")), null);
  assert.equal(yaklasanFaz(f, Date.parse("2026-10-25T10:00:00Z")).faz, "Full Moon");     // evreden 1 gün önce
  assert.equal(yaklasanFaz(f, Date.parse("2026-10-26T10:00:00Z")).faz, "Full Moon");     // evre günü
  const h = fazHaberi(f[1], f.slice(2), Date.parse("2026-10-25T10:00:00Z"));
  assert.match(h.tr.baslik, /^Dolunay · 26 Ekim 2026/); assert.match(h.tr.ozet, /07:12/); assert.match(h.en.ozet, /04:12 UTC/);
  assert.match(h.tr.ozet, /Sonraki evreler: Son dördün: 1 Kasım/);
  assert.equal(h.kategori, "gokbilim"); assert.equal(h.model, "sablon"); assert.match(h.id, /^g-ay-20261026-full-moon$/);
  assert.doesNotMatch(JSON.stringify(h), /burç|astrolog|horoscope/i);
});

// ---- sözleşmeler
test("editör hesapları: 31 hesap, alan->hesap eşlemesi hat ile işlev aynı, kategori kümeleri tutarlı", { skip: !ED && "editorler.mjs bu depoda yok" }, () => {
  assert.equal(EDITORLER.length, 32);   // op_psikoloji eklendi (2026-10-15); op_astroloji eklendi (2026-10-16; op_teknoloji sunucuda kapalı olarak durur)
  for (const [alan, liste] of Object.entries(ALINTI_HESAPLARI)) {
    // işlev tarafı konu hesaplarını da (op_klasikler, op_icecek...) taşır; hattın alıntı hesapları onun alt kümesi ve ilk hesap aynı olmalı
    if (HAT_HESAPLARI[alan]) { assert.equal(HAT_HESAPLARI[alan][0], liste[0], alan); for (const h of HAT_HESAPLARI[alan]) assert.ok(liste.includes(h), h); }
    assert.ok(KATEGORILER.includes(alan));
    for (const hesap of liste) assert.ok(EDITORLER.some((e) => e[0] === hesap), hesap);
    assert.equal(KATEGORI_EDITOR[alan], liste[0]);
  }
  assert.equal(haberEditoru({ kategori: "felsefe", yer: "İstanbul" }), "op_felsefe");          // yer ne olursa olsun
  assert.equal(haberEditoru({ kategori: "gokbilim", yer: "Dünya", editor: "op_felsefe" }), "op_gokbilim");   // başka kategorinin hesabı kabul edilmez
  assert.equal(haberEditoru({ kategori: "doga", yer: "İstanbul, Türkiye" }), "op_istanbul");    // eski davranış korunur
  for (const k of ["felsefe", "edebiyat", "siir", "mitoloji", "gokbilim"]) assert.ok(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "sema.sql"), "utf8").includes(`'${k}'`), `sema.sql kısıt: ${k}`);
});

test("özel işler: sırası gelen alan çalışır, bütçe ve tur sınırı korunur", async () => {
  const sayac = { cagri: 0 };
  const bulut = { bilinenler: async () => new Map(), isaretle: async () => ({}), yayinla: async () => ({ durum: "eklendi" }) };
  const model = { yaz: async () => { sayac.cagri++; return { metin: TRYANIT }; } };
  const ayar = { ...ayarOku({}, []), ozelTurUst: 1, ozelDenemeUst: 1, ozelCagriUst: 4, konuAcik: false };   // konu hesapları ayrı test edilir (konu.test.mjs); ozelDenemeUst: tur başına en çok denenen alan
  const simdi = Date.parse("2026-10-13T12:00:00Z");
  // felsefe'nin sırası gelmiş (hiç paylaşım yok); ama tur başına yalnız 1 iş
  const fetchFn = sahteFetch();
  const o = await ozelIsleriCalistir({ ayar, bulut, model, fetchFn, simdi, kotaDurum: new Map(), rastgele: () => 0, bekleFn: async () => {} });
  assert.equal(o.calisan.length, 1);
  // kota dolu -> hiçbir iş
  const dolu = new Map(Object.entries(OZEL_PLAN).map(([k, v]) => [k, { son24: 9, son7g: 9, sonZaman: "2026-10-13T11:00:00Z" }]));
  const o2 = await ozelIsleriCalistir({ ayar, bulut, model, fetchFn, simdi, kotaDurum: dolu, bekleFn: async () => {} });
  assert.equal(o2.calisan.length, 0);
});

test("portre dosyası: yazarın adını taşımayan illüstrasyon ve yasaklı görsel elenir", async () => {
  const { portreDosyasiMi } = await import("../lib/alinti.mjs");
  assert.equal(portreDosyasiMi("Ralph Waldo Emerson by Josiah Johnson Hawes 1857.jpg", "Ralph Waldo Emerson"), true);
  assert.equal(portreDosyasiMi("CassandraAusten-JaneAusten(c.1810)_hires.jpg", "Jane Austen"), true);
  assert.equal(portreDosyasiMi("LuMaxArt Golden Family With World Religions.jpg", "Alfred North Whitehead"), false);   // gerçek ölçümde görülen hata: ilk görsel portre değildi
  assert.equal(portreDosyasiMi("EmilyDickinsonGrave-color.jpg", "Emily Dickinson"), false);   // canlı kuru turda görüldü: mezar fotoğrafı
  assert.equal(portreDosyasiMi("Emerson flag poster.jpg", "Ralph Waldo Emerson"), false);
});
