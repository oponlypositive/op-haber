// Hacim artırma turu (2026-10-13): kaynak sıralaması, özet seçimi, ön eleme, rakam/yazım kapıları, yeniden deneme, görsel sadeleştirme ve yer çelişkisi, alıntı süzgeçleri. Ağsız.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rssAyristir, ozetSec, zamanDuzelt } from "../lib/rss.mjs";
import { onEleme } from "../lib/on_eleme.mjs";
import { alanOnEleme, VARSAYILAN_ALAN_KOTALARI } from "../lib/alanlar.mjs";
import { ciktiDogrula, yaziylaYil, yazimHatasi } from "../lib/dogrula.mjs";
import { haberYaz, yenidenIstemEki, redKodu, ISTEM } from "../lib/yaz.mjs";
import { sayfaMetni } from "../lib/sayfa.mjs";
import { ozneAdlari, etkinlikAdiMi, takimAdiMi, yerCelisiyor, etkinlikHaberiMi, ozneSec, gorselBul } from "../lib/gorsel.mjs";
import { secimSuzgeci, alintiUygun, ceviriDogrula, temaPuani, CEVIRI_ISTEMI } from "../lib/alinti.mjs";
import { ayarOku } from "../lib/ayar.mjs";

const kaynaklar = JSON.parse(readFileSync(new URL("../kaynaklar.json", import.meta.url), "utf8"));

// ---------- RSS
test("rss: besleme en eskiyi başa koysa da en yeni `en` öğe alınır; özet için en uzun alan seçilir", () => {
  const oge = (b, t, ek = "") => `<item><title>${b}</title><link>https://x.example/${b}</link><pubDate>${t}</pubDate>${ek}</item>`;
  const xml = "<rss><channel>" + oge("eski", "Mon, 01 Jun 2026 10:00:00 GMT") + oge("orta", "Mon, 05 Oct 2026 10:00:00 GMT") + oge("yeni", "Mon, 12 Oct 2026 10:00:00 GMT") + "</channel></rss>";
  assert.deepEqual(rssAyristir(xml, { en: 2 }).map((a) => a.baslik), ["yeni", "orta"]);
  const kisa = "<description>Kısa özet.</description>";
  const uzun = "<content:encoded><![CDATA[<p>" + "Uzun ve ayrıntılı haber metni burada devam ediyor. ".repeat(10) + "</p>]]></content:encoded>";
  const [a] = rssAyristir(`<rss><item><title>T</title><link>https://x.example/t</link>${kisa}${uzun}</item></rss>`);
  assert.ok(a.ozet.length > 400 && a.ozet.length <= 1500, `uzun özet seçilmeli (${a.ozet.length})`);
  assert.equal(ozetSec("<description>Metin. The post Başlık appeared first on Site.</description>"), "Metin.");
});

test("rss: saat dilimi hatalı (birkaç saat gelecekte) tarih şimdiye çekilir, ötesi gelecekte kalır", () => {
  const simdi = Date.parse("2026-10-13T12:00:00Z");
  assert.equal(zamanDuzelt({ zaman: "2026-10-13T14:30:00Z" }, simdi).zaman, new Date(simdi).toISOString());
  assert.equal(zamanDuzelt({ zaman: "2026-10-14T12:00:00Z" }, simdi).zaman, "2026-10-14T12:00:00Z");
  assert.equal(onEleme({ baslik: "Takım kupayı kazandı", ozet: "Ayrıntılı özet", alan: "spor", zaman: zamanDuzelt({ zaman: "2026-10-13T14:30:00Z" }, simdi).zaman }, { simdi }).ok, true);
});

test("sayfa: <p> azsa meta açıklama ve JSON-LD articleBody yedek metin olur", () => {
  const html = `<html><head><meta property="og:description" content="Yayıncının kendi meta açıklaması burada yer alıyor ve yeterince uzun bir cümle."><script type="application/ld+json">{"articleBody":"Makalenin tam metni burada. ${"Devam eden cümle. ".repeat(10)}"}</script></head><body><p>kısa</p></body></html>`;
  const m = sayfaMetni(html);
  assert.match(m, /Yayıncının kendi meta/); assert.match(m, /Makalenin tam metni/);
});

// ---------- kaynaklar.json
test("kaynaklar.json: ölü beslemeler yok, yeni alan kaynakları var, tazelik ve ad kuralları", () => {
  const adlar = kaynaklar.rss.map((k) => k.ad);
  for (const olu of ["eso.org", "esahubble.org", "trthaber.com (Spor)", "trthaber.com (Kültür-Sanat)"]) assert.ok(!adlar.includes(olu), olu);
  const sayim = {}; for (const k of kaynaklar.rss) sayim[k.alan || "iyi"] = (sayim[k.alan || "iyi"] || 0) + 1;
  assert.ok(sayim.spor >= 4 && sayim.sanat >= 8 && sayim.bilim >= 6 && sayim.teknoloji >= 4 && sayim.iyi >= 6, JSON.stringify(sayim));
  assert.ok(kaynaklar.rss.filter((k) => k.dil === "tr").length >= 8);
  for (const k of kaynaklar.rss) { assert.match(k.url, /^https:\/\//); assert.ok(!k.tazelik_saat || (k.tazelik_saat >= 24 && k.tazelik_saat <= 720), k.ad); if (k.alan === "spor") assert.ok(!k.tazelik_saat || k.tazelik_saat <= 36, "spor taze kalmalı: " + k.ad); }
  assert.ok(VARSAYILAN_ALAN_KOTALARI.spor >= 20 && VARSAYILAN_ALAN_KOTALARI.sanat >= 12);
  assert.equal(ayarOku({}, []).ozelCagriUst, 6);   // 2026-10-13: OP Resim + OP Sohbet eklendi (4 -> 6)
});

// ---------- spor ön eleme
test("spor: olumlu sonuç geçer; yenilgi, transfer, sakatlık, hakem tartışması ret", () => {
  const k = (b) => alanOnEleme({ alan: "spor", baslik: b, ozet: "" });
  assert.equal(k("Milli takım rakibini 3-0 yenerek galip geldi").ok, true);
  assert.equal(k("Genç atlet altın madalya kazandı").ok, true);
  assert.equal(k("Voleybol takımı gruptan çıkmayı başardı, liderliği aldı").ok, true);
  for (const b of ["Galatasaray Bursaspor'a evinde kaybetti", "Takım Avrupa'dan elendi", "Yıldız oyuncuya transfer teklifi geldi", "Kaptan sakatlandı ve maçta yok", "Hakem kararı tartışma yarattı, takım şampiyon oldu"]) assert.equal(k(b).ok, false, b);
});

// ---------- rakam / yazım kapısı ve yeniden deneme
test("yazıyla yıl/sayı kalıbı ve bozuk kelime yakalanır; meşru kullanım geçer", () => {
  assert.match(yaziylaYil("Teleskop Bin dokuz yüz seksen yedi yılında kuruldu", "tr"), /bin dokuz yüz/i);
  assert.match(yaziylaYil("iki bin yirmi altı sezonu", "tr"), /iki bin yirmi/i);
  assert.equal(yaziylaYil("iki bin kişi katıldı", "tr"), "");
  assert.match(yaziylaYil("built in nineteen eighty-seven", "en"), /nineteen eighty/i);
  assert.match(yaziylaYil("in twenty twenty-six", "en"), /twenty twenty/i);
  assert.equal(yaziylaYil("twenty people came", "en"), "");
  assert.match(yazimHatasi("etkinliğe ev sahipliğind bulundu"), /ğind/);
  assert.match(yazimHatasi("proje yürütülüğünde yapıldı"), /yürütülüğ/);
  assert.match(yazimHatasi("iyi bir alıkanlık"), /alıkanlık/);
  assert.equal(yazimHatasi("etkinliğe ev sahipliğinde bulundu, yürütücülüğünde ve alışkanlık"), "");
});

const KAYNAK = "Volunteers in the town of Lakeside planted 5,000 trees along the river over three weekends in 1987 style. The group of neighbors worked with local schools. " +
  "The new trees will shade a footpath used by many families, and the park now has a small tool library for anyone who wants to join. ".repeat(2);
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const iyi = () => ({ uygun: true, kategori: "doga", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });
const aday = { baslik: "Volunteers plant trees", ozet: KAYNAK, dil: "en" };

test("ciktiDogrula: TR metinde yazıyla yıl ve bozuk kelime ret (kalıcı değil)", () => {
  const d = iyi(); d.tr.ozet = d.tr.ozet.replace("Yerel okullar", "Bin dokuz yüz seksen yedi yılından beri yerel okullar");
  const v = ciktiDogrula(d, KAYNAK); assert.equal(v.ok, false); assert.notEqual(v.kalici, true); assert.equal(redKodu(v.neden), "rakam");
  const e = iyi(); e.tr.ozet = e.tr.ozet.replace("Parkta ayrıca", "Parkın yürütülüğünde ayrıca");
  const w = ciktiDogrula(e, KAYNAK); assert.equal(w.ok, false); assert.equal(redKodu(w.neden), "yazim");
  assert.equal(ciktiDogrula(iyi(), KAYNAK).ok, true);
});

test("haberYaz: yazıyla yıl / yazım hatası / kopya sonrası nedene özel istemle bir kez yeniden yazdırılır ve çağrı sayılır", async () => {
  const kotu = iyi(); kotu.tr.ozet = kotu.tr.ozet.replace("Yerel okullar", "Bin dokuz yüz seksen yedi yılından beri yerel okullar");
  const girdiler = [];
  const model = { yaz: async (s, g) => { girdiler.push(g); return { metin: JSON.stringify(girdiler.length === 1 ? kotu : iyi()), saglayici: "t" }; } };
  const y = await haberYaz(model, aday, "", { cagriUst: 6 });
  assert.equal(y.durum, "ok"); assert.equal(y.cagri, 2);
  assert.match(girdiler[1], /RAKAMLA/);
  // kopya: kaynaktan 8 kelimelik dizi
  const kop = iyi(); kop.en.ozet = "Volunteers in the town of Lakeside planted 5,000 trees along the river over three weekends in 1987 style. " + EN;
  const g2 = []; const m2 = { yaz: async (s, g) => { g2.push(g); return { metin: JSON.stringify(g2.length === 1 ? kop : iyi()) }; } };
  const y2 = await haberYaz(m2, aday, "", { cagriUst: 6 });
  assert.equal(y2.durum, "ok"); assert.match(g2[1], /kendi cümlelerinle/);
  // dil: TR alanına İngilizce -> Türkçe özel harf uyarısı
  const dilKotu = iyi(); dilKotu.tr.ozet = EN;
  const g3 = []; const m3 = { yaz: async (s, g) => { g3.push(g); return { metin: JSON.stringify(g3.length === 1 ? dilKotu : iyi()) }; } };
  assert.equal((await haberYaz(m3, aday, "", { cagriUst: 6 })).durum, "ok"); assert.match(g3[1], /ç ğ ı ö ş ü/);
  assert.match(yenidenIstemEki("tr yazım hatası: yürütülüğünde"), /bozuk kelime/);
  assert.match(ISTEM, /RAKAMLA/); assert.match(ISTEM, /YAZIM DENETİMİ/);
});

test("haberYaz: kaynak yetersizliği RSS özeti + sayfa toplamına bakar (uzun özet tek başına yeter)", async () => {
  let cagri = 0;
  const model = { yaz: async () => { cagri++; return { metin: JSON.stringify(iyi()) }; } };
  assert.equal((await haberYaz(model, { baslik: "T", ozet: "x".repeat(120), dil: "en" }, "y".repeat(100))).neden, "kaynak metni yetersiz");
  assert.equal(cagri, 0);
  assert.equal((await haberYaz(model, { baslik: "Volunteers plant trees", ozet: KAYNAK, dil: "en" }, "")).durum, "ok");
});

// ---------- görsel: özne sadeleştirme, yer çelişkisi, etkinlik haberi
test("özne adı sadeleştirme: sponsor atılır, etkinlik adı kısaltılmaz, takım için logo elenir ve stadyum tercih edilir", () => {
  assert.deepEqual(ozneAdlari({ ad: "Galatasaray Madeş Mobilya", tur: "kurum" }).slice(0, 2), ["Galatasaray Madeş Mobilya", "Galatasaray"]);
  assert.deepEqual(ozneAdlari({ ad: "Türkiye Bilim İletişimi Zirvesi", tur: "kurum" }), ["Türkiye Bilim İletişimi Zirvesi"]);
  assert.equal(etkinlikAdiMi("Türkiye Bilim İletişimi Zirvesi"), true); assert.equal(etkinlikAdiMi("Galatasaray"), false);
  assert.equal(takimAdiMi({ ad: "Fenerbahçe Women's Basketball", tur: "kurum" }), true);
  const ad = { ad: "Galatasaray", tur: "kurum" };
  const adaylar = [
    { baslik: "Galatasaray logo.svg.png", metin: "Galatasaray logo", lisans: "CC BY-SA 4.0", w: 1000, h: 1000 },
    { baslik: "Galatasaray stadium.jpg", metin: "Galatasaray stadium match", lisans: "CC BY-SA 4.0", w: 1600, h: 900 },
  ];
  const s = ozneSec(adaylar, ad, 2);
  assert.equal(s.length, 1); assert.match(s[0].baslik, /stadium/);
});

test("özne araması: ilk ad 0 aday verince sponsorsuz ad denenir", async () => {
  const sorgular = [];
  const araFn = async (q, tur) => {
    if (tur !== "ozne") return [];
    sorgular.push(q);
    return q.replace(/"/g, "") === "Galatasaray" ? [{ baslik: "Galatasaray basketball team.jpg", metin: "Galatasaray basketball team", lisans: "CC BY 4.0", w: 1600, h: 900, url: "https://u/1.jpg", yaratici: "X", kaynak_url: "https://c/1", saglayici: "wikimedia" }] : [];
  };
  const fetchFn = async () => ({ ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new Uint8Array(0).buffer });
  const haber = { en: { baslik: "Galatasaray win", ozet: "The team won the game." }, tr: { baslik: "Galatasaray kazandı", ozet: "" }, yer: "İstanbul, Türkiye", gorselOzne: { ad: "Galatasaray Madeş Mobilya", tur: "kurum" } };
  const r = await gorselBul(haber, { model: { yaz: async () => ({ metin: "{}" }) }, fetchFn, bekleFn: async () => {}, araFn, vlUst: 2 });
  assert.ok(sorgular.some((q) => q === "Galatasaray" || q === '"Galatasaray"'), sorgular.join("|"));
  assert.ok(r.notlar.join(" ").includes("ad denendi"));
});

test("yer çelişkisi: başka kurum/şehir/ülke adı taşıyan nötr görsel elenir; yer adsız nesne görseli geçer; haberin kendi yeri geçer", () => {
  const haber = "Science communication summit held in Ankara Türkiye researchers discuss public engagement";
  assert.equal(yerCelisiyor({ metin: "IUPUI lecture hall university auditorium Indianapolis" }, haber) !== "", true);
  assert.equal(yerCelisiyor({ metin: "Lecture hall Middle East Technical University Ankara" }, haber) !== "", true, "başka üniversite (haberde yok)");
  assert.equal(yerCelisiyor({ metin: "Telescope lens close-up laboratory equipment" }, haber), "");
  assert.equal(yerCelisiyor({ metin: "Ankara skyline at dusk" }, haber), "");
  assert.equal(etkinlikHaberiMi({ en: { baslik: "Science Communication Summit opens in Ankara" }, tr: { baslik: "Bilim İletişimi Zirvesi başladı" } }), true);
  assert.equal(etkinlikHaberiMi({ en: { baslik: "Scientists find new frog species" }, tr: { baslik: "Yeni kurbağa türü bulundu" } }), false);
});

test("etkinlik haberi: özne görseli yoksa konu görseli aranmaz, görselsiz kalır (yanlış görsel yok)", async () => {
  const cagrilar = [];
  const araFn = async (q, tur) => { cagrilar.push(tur); return [{ baslik: "Auditorium.jpg", metin: "lecture hall auditorium summit audience", lisans: "CC BY 4.0", w: 1600, h: 900, url: "https://u/a.jpg", yaratici: "X", kaynak_url: "https://c/a", saglayici: "wikimedia" }]; };
  const haber = { en: { baslik: "Science Communication Summit opens", ozet: "Experts gathered for the summit." }, tr: { baslik: "Bilim İletişimi Zirvesi", ozet: "" }, yer: "Ankara, Türkiye", gorselAra: "lecture hall audience", gorselOzne: null };
  const r = await gorselBul(haber, { model: { yaz: async () => ({ metin: "{}" }) }, fetchFn: async () => { throw new Error("indirme yok"); }, bekleFn: async () => {}, araFn, vlUst: 4 });
  assert.equal(r.sonuc, null);
  assert.ok(!cagrilar.includes("gercek") || cagrilar.length <= 2, "konu araması yapılmadı: " + cagrilar.join(","));
});

// ---------- alıntı
test("alıntı seçimi: cinsiyet/sınıf genellemesi, deyim, alaycı, arkaik, bağlamsız ve uzun alıntı elenir; umutlu kısa alıntı geçer", () => {
  const ret = {
    "When women are counsellors, the lords of creation will find that they are wiser than they thought.": /genelleme|deyim/,
    "Men are generally more careful about their reputation than about their conduct each day.": /genelleme/,
    "A woman must always be careful about what she says to others in the evening.": /genelleme/,
    "The rich are always ready to forget the promises they make to the poor in public.": /genelleme/,
    "Thou shalt find that patience is the garden in which every good thing grows slowly.": /arkaik/,
    "It was, of course, a pretty piece of nonsense that nobody could take seriously at all.": /alayci/,
    "But that is exactly why the small things we do each morning matter so much to us all.": /baglamsiz/,
  };
  for (const [m, re] of Object.entries(ret)) assert.match(secimSuzgeci(m, "felsefe") || "ok", re, m);
  assert.equal(secimSuzgeci("Hope is the thing with feathers that perches in the soul and sings the tune without the words.", "felsefe"), "");
  assert.equal(secimSuzgeci("x".repeat(270), "edebiyat"), "uzun");
  assert.ok(temaPuani("Hope and patience make the garden grow with friendship.") > temaPuani("The committee adjourned until Tuesday."));
  const c = { metin: "When women are counsellors, the lords of creation will find that they are wiser than they thought.", kaynakSatiri: "Little Women (1868)", eser: "Little Women", satirlar: ["x"], tumKaynak: "Little Women (1868)", yol: [] };
  const u = alintiUygun(c, "edebiyat", { olum: 1888 });
  assert.equal(u.ok, false); assert.match(u.neden, /secim/);
});

test("çeviri: yasak TR kelime (tecavüz, ırz, öldür, kan, nefret...) kalıcı ret; istem 'doğal Türkçe, uygun=false' kuralını taşır; yazıyla yıl/bozuk kelime yeniden denenir", () => {
  const og = "Trespass not on his solitude, but let him walk alone in the quiet woods of the morning.";
  const r = ceviriDogrula({ uygun: true, tr: "Yalnızlığına tecavüz etmeyin, onu sabahın sessiz ormanında tek başına yürümeye bırakın." }, og);
  assert.equal(r.ok, false); assert.equal(r.kalici, true); assert.match(r.neden, /tr-kelime/);
  for (const k of ["ırzına geçme", "onu öldürme", "kanını dök", "nefret et", "lanet olsun"]) {
    const x = ceviriDogrula({ uygun: true, tr: `Sabahın sessiz ormanında ${k} ve yalnız yürümeye izin ver, bırak yürüsün onu.` }, og);
    assert.equal(x.ok, false, k);
  }
  const iyi2 = ceviriDogrula({ uygun: true, tr: "Yalnızlığına saygı göster ve onu sabahın sessiz ormanında tek başına yürümeye bırak." }, og);
  assert.equal(iyi2.ok, true, iyi2.neden);
  const bozuk = ceviriDogrula({ uygun: true, tr: "Yalnızlığına saygı göster ve onu yürütülüğünde sabahın sessiz ormanında yürümeye bırak." }, og);
  assert.equal(bozuk.ok, false); assert.notEqual(bozuk.kalici, true);
  assert.match(CEVIRI_ISTEMI, /kelime kelime çevirme/); assert.match(CEVIRI_ISTEMI, /uygun=false/); assert.match(CEVIRI_ISTEMI, /tecavüz/);
});
