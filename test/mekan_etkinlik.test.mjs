// Mekân etkinlik toplayıcı (lib/mekan_etkinlik.mjs): JSON-LD/iCal/RSS ayrıştırma, robots.txt, hız sınırı, doğrulama, sözleşme yükü, günlük sınır, uç yokken tur. Ağ yok (sahte fetch).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { BILET_ALANLARI, MEKAN_UA, adayBaglantilar, detayBaglantilar, detaySirala, siteHaritasiAyristir, agKur, biletMi, feedEtkinlikler, icalEtkinlikler, jsonldEtkinlikler, mekanEtkinlikTuru, mekanKesfet, mekanOzetMetni, mekanOlayiDogrula, mekanTara, tarihCoz, topluYukler, turSinifla } from "../lib/mekan_etkinlik.mjs";
import { etkinlikYukuGecerli } from "../lib/etkinlik.mjs";
import { bulutKur } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { robotsIzin } from "../lib/sayfa.mjs";
import { ozetSatiri, turCalistir } from "../hat.mjs";

const SIMDI = Date.parse("2026-10-17T09:00:00Z");           // TR 12:00, gün 2026-10-17
const M = (ek = {}) => ({ id: "iz-sanat", no: 5, ad: "İş Sanat", il: "İstanbul", web: "https://issanat.com.tr/", kategori: "Konser / sahne sanatları", yontem: "jsonld", etkinlik_sayfasi: "https://issanat.com.tr/", sayfalar: ["https://issanat.com.tr/"], ...ek });
const LD = (olaylar) => `<html><head><script type="application/ld+json">${JSON.stringify(olaylar)}</script></head><body>x</body></html>`;
const OLAY = (ek = {}) => ({ "@type": "MusicEvent", name: "Caz Gecesi", startDate: "2026-10-24T20:30:00+03:00", endDate: "2026-10-24T22:30:00+03:00", url: "https://issanat.com.tr/etkinlik/caz-gecesi", location: { "@type": "Place", name: "İş Sanat", address: { "@type": "PostalAddress", addressLocality: "Beşiktaş", addressCountry: "TR" } }, ...ek });

/** Sahte site: yol -> {durum, tur, govde}. Çağrı günlüğü + sahte saat (bekleFn saati ilerletir). */
function ag(sayfalar = {}, { robots = "" } = {}) {
  const g = { istek: [], bekle: [], t: SIMDI };
  const fetchFn = async (url, opt) => {
    g.istek.push({ url: String(url), ua: opt?.headers?.["User-Agent"], t: g.t });
    const u = new URL(url);
    const anahtar = u.origin + u.pathname + u.search;
    if (u.pathname === "/robots.txt" && !(anahtar in sayfalar)) return { ok: !!robots, status: robots ? 200 : 404, url: String(url), headers: new Headers({ "content-type": "text/plain" }), arrayBuffer: async () => new TextEncoder().encode(robots).buffer };
    const s = sayfalar[anahtar] ?? sayfalar[u.origin + u.pathname];
    if (!s) return { ok: false, status: 404, url: String(url), headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) };
    if (s.hata) throw new Error(s.hata);
    return { ok: true, status: 200, url: s.url || String(url), headers: new Headers({ "content-type": s.tur || "text/html" }), arrayBuffer: async () => new TextEncoder().encode(s.govde).buffer };
  };
  const bekleFn = async (ms) => { g.bekle.push(ms); g.t += ms; };
  return { g, fetchFn, bekleFn, simdi: () => g.t };
}
const agNesne = (a) => agKur({ fetchFn: a.fetchFn, bekleFn: a.bekleFn, simdi: a.simdi });

test("JSON-LD: düz nesne, dizi, @graph, ItemList; Event alt tipleri; bozuk blok atlanır; açıklama/görsel/fiyat alanı çıktıya girmez", () => {
  const html = LD({ "@graph": [{ "@type": "WebSite", name: "x" }, OLAY({ description: "uzun açıklama", image: "a.jpg", offers: { price: "100" } })] }) +
    `<script type="application/ld+json">{bozuk</script>` + LD([{ "@type": "ItemList", itemListElement: [{ "@type": "ListItem", item: OLAY({ name: "Opera Gecesi", "@type": "TheaterEvent" }) }] }]) +
    LD({ "@type": ["Event", "ExhibitionEvent"], name: "Sergi", startDate: "2026-10-20" });
  const o = jsonldEtkinlikler(html);
  assert.equal(o.length, 3);
  assert.deepEqual(o.map((x) => x.ad), ["Caz Gecesi", "Opera Gecesi", "Sergi"]);
  assert.deepEqual(Object.keys(o[0]).sort(), ["ad", "baslangic", "bitis", "cevrimici", "iptal", "konumAd", "konumAdres", "tekrar", "tip", "ulke", "url"]);   // description/image/offers yok
  assert.equal(jsonldEtkinlikler("<html>etkinlik yok</html>").length, 0);
});

test("iCal: gün-bütünü DTEND dahil değil, UTC saate dönüşür, RRULE'lü atlanır, satır katlama", () => {
  const ics = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "SUMMARY:Atölye\\, Seramik", "DTSTART;VALUE=DATE:20261020", "DTEND;VALUE=DATE:20261023", "URL:https://x.org/e/1", "END:VEVENT",
    "BEGIN:VEVENT", "SUMMARY:Konser uzun", " devam", "DTSTART:20261024T170000Z", "END:VEVENT", "BEGIN:VEVENT", "SUMMARY:Haftalık", "DTSTART:20261001T100000Z", "RRULE:FREQ=WEEKLY", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const o = icalEtkinlikler(ics);
  assert.equal(o.length, 2);
  assert.equal(o[0].ad, "Atölye, Seramik"); assert.equal(o[0].bitis, "2026-10-22");
  assert.equal(o[1].ad, "Konser uzundevam");
  assert.deepEqual(tarihCoz(o[1].baslangic), { gun: "2026-10-24", saat: "20:00" });          // 17:00Z = 20:00 TR
});

test("RSS/Atom: yalnız açık olay-tarihi alanı olan öğeler; yayın tarihi (pubDate) olay tarihi sayılmaz", () => {
  const rss = `<rss><channel><item><title>Sergi A</title><link>https://x.org/a</link><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate></item>
    <item><title>Konser B</title><link>https://x.org/b</link><ev:startdate>2026-10-30T19:00:00</ev:startdate><ev:enddate>2026-10-30</ev:enddate></item></channel></rss>`;
  const o = feedEtkinlikler(rss);
  assert.equal(o.length, 1); assert.equal(o[0].ad, "Konser B"); assert.equal(o[0].url, "https://x.org/b"); assert.equal(o[0].baslangic, "2026-10-30T19:00:00");
  const atom = `<feed><entry><title>Tiyatro</title><link href="https://x.org/t"/><dtstart>20261101</dtstart></entry></feed>`;
  assert.equal(feedEtkinlikler(atom)[0].baslangic, "2026-11-01");
});

test("tarihCoz: ofset TR'ye çevrilir; geçersiz/biçimsiz null; gece yarısı saat vermez", () => {
  assert.deepEqual(tarihCoz("2026-10-24T22:30:00Z"), { gun: "2026-10-25", saat: "01:30" });
  assert.deepEqual(tarihCoz("2026-10-24T20:30:00+03:00"), { gun: "2026-10-24", saat: "20:30" });
  assert.deepEqual(tarihCoz("2026-10-24T00:00:00"), { gun: "2026-10-24", saat: "" });
  assert.equal(tarihCoz("2026-02-30"), null); assert.equal(tarihCoz("24 Ekim 2026"), null); assert.equal(tarihCoz(""), null);
});

test("doğrulama: geçerli olay -> sözleşme yükü (kaynak_id sha1-16, https url, tür, saat, mekan_url); açıklama/görsel/fiyat yok", () => {
  const { etkinlik: e, neden } = mekanOlayiDogrula(jsonldEtkinlikler(LD(OLAY()))[0], M(), "https://issanat.com.tr/", SIMDI);
  assert.equal(neden, "");
  assert.deepEqual(Object.keys(e).sort(), ["ad", "baslangic", "kaynak_id", "mekan", "mekan_url", "saat", "sehir", "tur", "url"]);   // açıklama/görsel/fiyat alanı yok
  assert.match(e.kaynak_id, /^[0-9a-f]{16}$/);
  assert.equal(e.baslangic, "2026-10-24"); assert.equal(e.saat, "20:30"); assert.equal(e.tur, "konser"); assert.equal(e.sehir, "İstanbul");
  assert.equal(e.mekan, "İş Sanat"); assert.equal(e.mekan_url, "https://issanat.com.tr/"); assert.equal(e.url, "https://issanat.com.tr/etkinlik/caz-gecesi");
  assert.ok(etkinlikYukuGecerli(e));
});

test("doğrulama: tarih penceresi (<=60 gün ileri, bitiş >= bugün), uzun süre, iptal, çevrimiçi, ad uzunluğu", () => {
  const d = (ek, m = M()) => mekanOlayiDogrula({ ad: "Etkinlik", baslangic: "2026-10-24", bitis: "", url: "", konumAd: "", konumAdres: "", ulke: "", tip: "", ...ek }, m, "https://issanat.com.tr/", SIMDI).neden;
  assert.equal(d({}), "");
  assert.equal(d({ baslangic: "2026-10-10", bitis: "2026-10-16" }), "gecmis");
  assert.equal(d({ baslangic: "2026-10-10", bitis: "2026-10-20" }), "");                     // sürüyor: bitiş >= bugün
  assert.equal(d({ baslangic: "2026-10-16" }), "gecmis");
  assert.equal(d({ baslangic: "2026-12-17" }), "cok-ileri");                                 // 17 Eki + 60 gün = 16 Ara
  assert.equal(d({ baslangic: "2026-12-16" }), "");
  assert.equal(d({ baslangic: "2026-12-18" }), "cok-ileri");
  assert.equal(d({ baslangic: "2026-10-20", bitis: "2027-03-01" }), "uzun");
  assert.equal(d({ iptal: true }), "iptal"); assert.equal(d({ cevrimici: true }), "cevrimici"); assert.equal(d({ ad: "Online Söyleşi" }), "cevrimici");
  assert.equal(d({ ad: "A" }), "ad"); assert.equal(d({ ad: "x".repeat(121) }), "ad"); assert.equal(d({ ad: "Konser 🎵" }), "ad");
  assert.equal(d({ baslangic: "bozuk" }), "tarih"); assert.equal(d({ baslangic: "2026-10-24", bitis: "2026-10-20" }), "tarih");
});

test("doğrulama: Türkiye dışı, başka il, din/siyaset konusu ret; çok şehirli mekânda il adresten; konum yalnız koordinat varsa", () => {
  const d = (ek, m = M()) => mekanOlayiDogrula({ ad: "Etkinlik", baslangic: "2026-10-24", bitis: "", url: "", konumAd: "", konumAdres: "", ulke: "", tip: "", ...ek }, m, "https://issanat.com.tr/", SIMDI);
  assert.equal(d({ ulke: "DE" }).neden, "ulke"); assert.equal(d({ ulke: "Türkiye" }).neden, "");
  assert.equal(d({ konumAdres: "Çankaya Ankara" }).neden, "sehir");                          // İstanbul mekânı, başka ilde gösteri
  assert.equal(d({ ad: "Seçim Mitingi Konseri" }).neden, "konu");
  const cok = M({ il: "" });
  assert.equal(d({}, cok).neden, "sehir");                                                   // il kanıtı yok -> uydurma yok
  assert.equal(d({ konumAdres: "Konak İzmir" }, cok).etkinlik.sehir, "İzmir");
  assert.equal(d({}).etkinlik.konum, undefined);
  const k = d({}, M({ koordinat: { enlem: 41.04321, boylam: 29.00123 } })).etkinlik.konum;
  assert.deepEqual(k, { enlem: 41.04321, boylam: 29.00123, kesin: true });
});

test("doğrulama: etkinlik adresi mekânın sitesinde değilse ya da bilet platformundaysa sayfa adresine düşer", () => {
  const d = (url) => mekanOlayiDogrula({ ad: "Etkinlik", baslangic: "2026-10-24", bitis: "", url, konumAd: "", konumAdres: "", ulke: "", tip: "" }, M(), "https://issanat.com.tr/program", SIMDI).etkinlik.url;
  assert.equal(d("https://www.biletix.com/etkinlik/1"), "https://issanat.com.tr/program");
  assert.equal(d("https://baska.example/x"), "https://issanat.com.tr/program");
  assert.equal(d("/etkinlik/9"), "https://issanat.com.tr/etkinlik/9");
  assert.equal(d("http://issanat.com.tr/e/2"), "https://issanat.com.tr/e/2");
  assert.ok(biletMi("https://www.passo.com.tr/x") && biletMi("https://biletino.com/y") && biletMi("https://bubilet.com.tr/") && !biletMi("https://issanat.com.tr/"));
  assert.ok(BILET_ALANLARI.test("www.biletix.com"));
});

test("tür sınıflama: önce ad, sonra şema tipi, sonra mekân kategorisi", () => {
  assert.equal(turSinifla("Bahar Festivali", "MusicEvent", ""), "festival");
  assert.equal(turSinifla("Resim Sergisi", "", "Konser"), "sergi");
  assert.equal(turSinifla("Hamlet", "TheaterEvent", ""), "tiyatro");
  assert.equal(turSinifla("Gece", "MusicEvent", ""), "konser");
  assert.equal(turSinifla("Seramik Atölyesi", "", ""), "atolye");
  assert.equal(turSinifla("Yazarla Söyleşi", "", ""), "soylesi");
  assert.equal(turSinifla("Gece", "", "Müze / sergi"), "sergi");
  assert.equal(turSinifla("Gece", "", ""), "diger");
});

test("robots.txt: Disallow edilen yol okunmaz; kendi User-Agent grubu * grubunu geçer; bilet platformu hiç istenmez", async () => {
  const robots = "User-agent: *\nDisallow: /program\nUser-agent: OnlyPositiveEtkinlik\nDisallow: /gizli\n";
  assert.equal(robotsIzin(robots, "/program", ["onlypositiveetkinlik"]), true);              // kendi grup: yalnız /gizli yasak
  assert.equal(robotsIzin(robots, "/gizli/x", ["onlypositiveetkinlik"]), false);
  assert.equal(robotsIzin("User-agent: *\nDisallow: /program\n", "/program/1", ["onlypositiveetkinlik"]), false);
  const a = ag({ "https://x.org/": { govde: "<html>ana</html>" }, "https://x.org/program": { govde: LD(OLAY()) } }, { robots: "User-agent: *\nDisallow: /program\n" });
  const n = agNesne(a);
  assert.equal((await n.getir("https://x.org/program")).yok, "robots");
  assert.equal(a.g.istek.filter((i) => i.url.endsWith("/program")).length, 0);              // sayfaya hiç gidilmedi
  assert.ok((await n.getir("https://x.org/")).metin.includes("ana"));
  assert.equal(a.g.istek.filter((i) => i.url.endsWith("/robots.txt")).length, 1);            // robots tur başına origin başına 1 kez
  assert.equal((await n.getir("https://www.biletix.com/")).yok, "bilet");
  assert.ok(!a.g.istek.some((i) => /biletix/.test(i.url)));
  assert.equal((await agNesne(ag({ "https://x.org/a": { url: "https://baska.example/a", govde: "x" } })).getir("https://x.org/a")).yok, "hata:baska-site");
});

test("hız sınırı: tüm istekler (robots dahil) arası >= 2 sn, özel User-Agent; Crawl-delay 10 sn üstü ise mekân atlanır", async () => {
  const a = ag({ "https://x.org/": { govde: "<html>a</html>" }, "https://x.org/b": { govde: "<html>b</html>" }, "https://y.org/": { govde: "<html>y</html>" } });
  const n = agNesne(a);
  await n.getir("https://x.org/"); await n.getir("https://x.org/b"); await n.getir("https://y.org/");
  const t = a.g.istek.map((i) => i.t);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] - t[i - 1] >= 2000, `aralık ${t[i] - t[i - 1]}`);
  assert.ok(a.g.istek.every((i) => i.ua === MEKAN_UA)); assert.equal(MEKAN_UA, "OnlyPositiveEtkinlik/1.0 (+https://onlypositive.org/destek)");
  assert.equal((await agNesne(ag({ "https://z.org/": { govde: "x" } }, { robots: "User-agent: *\nCrawl-delay: 30\n" })).getir("https://z.org/")).yok, "robots-gecikme");
  const c = ag({ "https://c.org/": { govde: "x" } }, { robots: "User-agent: *\nCrawl-delay: 5\n" }); await agNesne(c).getir("https://c.org/");
  assert.ok(c.g.bekle.some((ms) => ms >= 5000 - 1));                                           // sitenin istediği gecikme uygulanır
});

test("keşif: ana sayfada JSON-LD -> jsonld; yoksa iCal alternatif bağlantısı -> ical; yoksa etkinlik bağlantılı sayfa; hiçbiri -> yok; en çok 12 sayfa", async () => {
  const sayfalar = {
    "https://a.org/": { govde: LD(OLAY()) },
    "https://b.org/": { govde: `<html><head><link rel="alternate" type="text/calendar" href="/takvim.ics"></head><body><a href="/etkinlikler">Etkinlikler</a></body></html>` },
    "https://b.org/takvim.ics": { tur: "text/calendar", govde: "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Konser\r\nDTSTART:20261024T170000Z\r\nEND:VEVENT\r\nEND:VCALENDAR" },
    "https://c.org/": { govde: `<html><body><a href="/program">Program</a><a href="https://www.biletix.com/x">Bilet</a><a href="https://baska.example/etkinlik">dış</a></body></html>` },
    "https://c.org/program": { govde: LD([OLAY()]) },
    "https://d.org/": { govde: `<html><body><a href="/etkinlikler">e</a><a href="/takvim">t</a><a href="/events">v</a><a href="/program">p</a></body></html>` },
  };
  const a = ag(sayfalar), n = agNesne(a);
  const r1 = await mekanKesfet({ web: "https://a.org/" }, n); assert.equal(r1.yontem, "jsonld"); assert.equal(r1.etkinlik_sayfasi, "https://a.org/");
  const r2 = await mekanKesfet({ web: "https://b.org/" }, n); assert.equal(r2.yontem, "ical"); assert.equal(r2.etkinlik_sayfasi, "https://b.org/takvim.ics");
  const r3 = await mekanKesfet({ web: "https://c.org/" }, n); assert.equal(r3.yontem, "jsonld"); assert.equal(r3.etkinlik_sayfasi, "https://c.org/program");
  assert.ok(!a.g.istek.some((i) => /biletix|baska\.example/.test(i.url)));
  const onceki = a.g.istek.length;
  const r4 = await mekanKesfet({ web: "https://d.org/" }, n); assert.equal(r4.yontem, "yok"); assert.equal(r4.neden, "olay-yok");
  assert.ok(a.g.istek.slice(onceki).filter((i) => !i.url.endsWith("robots.txt")).length <= 12);   // mekân başına en çok 12 sayfa
  assert.equal((await mekanKesfet({ web: "https://e.org/" }, n)).neden, "hata:HTTP 404");
  const baglanti = adayBaglantilar(sayfalar["https://c.org/"].govde, "https://c.org/");
  assert.deepEqual(baglanti.sayfalar, ["https://c.org/program"]);
});

test("mekanTara: pencere dışı/bozuk olaylar elenir, ret nedenleri sayılır, tekrarlar tek", async () => {
  const html = LD([OLAY(), OLAY(), OLAY({ name: "Geçmiş", startDate: "2026-09-01", endDate: "2026-09-02" }), OLAY({ name: "Çok ileri", startDate: "2027-05-01", endDate: "" }), OLAY({ name: "Online Konser", eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode" })]);
  const a = ag({ "https://issanat.com.tr/": { govde: html } });
  const r = await mekanTara(M(), agNesne(a), SIMDI);
  assert.equal(r.etkinlikler.length, 1); assert.equal(r.ham, 5);
  assert.deepEqual(r.ret, { gecmis: 1, "cok-ileri": 1, cevrimici: 1 });
});

const bulutTaklit = ({ durum = new Map(), toplu = null, durumHata = false } = {}) => {
  const k = { durum, yuk: [] };
  return { k, bilinenler: async () => new Map(), isaretle: async () => ({ yazildi: 0 }), yayinla: async () => ({ durum: "eklendi" }), kota: async () => new Map(),
    durumOku: async (an) => { if (durumHata) throw new Error("HTTP 400"); return new Map(an.filter((a) => durum.has(a)).map((a) => [a, durum.get(a)])); },
    durumYaz: async (an, d) => { durum.set(an, d); return true; },
    ...(toplu === null ? {} : { etkinlikToplu: async (l) => { k.yuk.push(l); if (toplu instanceof Error) throw toplu; return { eklendi: l.length, guncellendi: 0, atlandi: 0 }; } }) };
};
const mekanListesi = (n) => Array.from({ length: n }, (_, i) => M({ id: `m${i}`, no: i + 1, ad: `Mekan ${i}`, web: `https://m${i}.org/`, etkinlik_sayfasi: `https://m${i}.org/`, sayfalar: [`https://m${i}.org/`] }));
const siteler = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`https://m${i}.org/`, { govde: LD(OLAY({ name: `Gösteri ${i}`, url: `https://m${i}.org/e`, location: undefined })) }]));

test("tur: tur başına en çok 15 mekân, mekân başına günde 1 tarama (kalıcı durum), dönüşümlü; sözleşme yükü gönderilir", async () => {
  const a = ag(siteler(40)), bulut = bulutTaklit({ toplu: true }), liste = mekanListesi(40);
  const tur = () => mekanEtkinlikTuru({ mekanlar: liste, bulut, fetchFn: a.fetchFn, bekleFn: a.bekleFn, simdi: a.simdi });
  const o1 = await tur();
  assert.equal(o1.taranan, 15); assert.equal(o1.bulunan, 15); assert.equal(o1.gonderilen, 15); assert.equal(o1.eklendi, 15); assert.deepEqual(o1.yontem, { jsonld: 15 });
  assert.equal(mekanOzetMetni(o1), "taranan:15,bulunan:15,gonderilen:15,yontem:jsonld:15");
  const y = bulut.k.yuk[0]; assert.equal(y.length, 15); assert.ok(y.every(etkinlikYukuGecerli)); assert.ok(y.every((e) => /^[0-9a-f]{16}$/.test(e.kaynak_id)));
  const o2 = await tur(); assert.equal(o2.taranan, 15);
  const o3 = await tur(); assert.equal(o3.taranan, 10);                                        // kalan 10: önceki turlarda taranmayanlar
  const o4 = await tur(); assert.equal(o4.taranan, 0); assert.equal(o4.durum, "hepsi-tarandi");   // aynı gün 2. tarama YOK
  const goruldu = new Set(a.g.istek.map((i) => i.url).filter((u) => u.endsWith(".org/")));
  assert.equal(goruldu.size, 40);
  assert.equal(a.g.istek.filter((i) => i.url === "https://m0.org/").length, 1);
  a.g.t += 24 * 3600_000;                                                                      // ertesi gün: yeniden
  assert.equal((await tur()).taranan, 15);
});

test("tur: süre tavanı aşılınca durur; durum okunamazsa hiç taramaz; uç yokken (eski sunucu 400) tur aksamaz", async () => {
  const a = ag(siteler(10));
  const o = await mekanEtkinlikTuru({ mekanlar: mekanListesi(10), bulut: bulutTaklit({ toplu: true }), fetchFn: a.fetchFn, bekleFn: a.bekleFn, simdi: a.simdi, sureSn: 5 });
  assert.equal(o.durum, "sure"); assert.ok(o.taranan >= 1 && o.taranan < 10);
  const b = ag(siteler(3));
  const yok = await mekanEtkinlikTuru({ mekanlar: mekanListesi(3), bulut: bulutTaklit({ durumHata: true, toplu: true }), fetchFn: b.fetchFn, bekleFn: b.bekleFn, simdi: b.simdi });
  assert.equal(yok.durum, "durum-yok"); assert.equal(b.g.istek.length, 0);
  const c = ag(siteler(3));
  const eski = await mekanEtkinlikTuru({ mekanlar: mekanListesi(3), bulut: bulutTaklit({ toplu: new Error("haber-yukle etkinlik_toplu: HTTP 400") }), fetchFn: c.fetchFn, bekleFn: c.bekleFn, simdi: c.simdi });
  assert.equal(eski.durum, "uc-yok"); assert.equal(eski.taranan, 3); assert.equal(eski.gonderilen, 0);
  const d = ag(siteler(3));
  const bulutsuz = await mekanEtkinlikTuru({ mekanlar: mekanListesi(3), bulut: bulutTaklit(), fetchFn: d.fetchFn, bekleFn: d.bekleFn, simdi: d.simdi });
  assert.equal(bulutsuz.taranan, 3); assert.equal(bulutsuz.gonderilen, 0);                      // etkinlikToplu yoksa gönderim yok
  assert.equal((await mekanEtkinlikTuru({ mekanlar: [M({ yontem: "yok" })], bulut: bulutTaklit(), fetchFn: d.fetchFn })).durum, "mekan-yok");
});

test("topluYukler: aynı kaynak_id tek kez, 100'lük parçalar; bulutKur.etkinlikToplu sözleşme gövdesini gönderir", async () => {
  const e = (i) => ({ kaynak_id: String(i).padStart(16, "0"), ad: "x" });
  const p = topluYukler([...Array.from({ length: 230 }, (_, i) => e(i)), e(0), e(1)]);
  assert.deepEqual(p.map((x) => x.etkinlikler.length), [100, 100, 30]); assert.ok(p.every((x) => x.islem === "etkinlik_toplu"));
  const gov = [];
  const fetchFn = async (url, opt) => { gov.push(JSON.parse(opt.body)); return { ok: true, status: 200, json: async () => ({ eklendi: 2, guncellendi: 1, atlandi: 0 }) }; };
  const b = bulutKur({ fnUrl: "https://x.example/functions/v1/haber-yukle", anahtar: "k".repeat(32), fetchFn, bekleFn: async () => {} });
  assert.deepEqual(await b.etkinlikToplu([e(1), e(2), e(3)]), { eklendi: 2, guncellendi: 1, atlandi: 0 });
  assert.equal(gov[0].islem, "etkinlik_toplu"); assert.equal(gov[0].etkinlikler.length, 3);
  const eski = bulutKur({ fnUrl: "https://x.example/functions/v1/haber-yukle", anahtar: "k".repeat(32), fetchFn: async () => ({ ok: false, status: 400, json: async () => ({}) }), bekleFn: async () => {} });
  await assert.rejects(() => eski.etkinlikToplu([e(1)]), /HTTP 400/);
});

test("hat entegrasyonu: tur mekân etkinliğini çalıştırır, özet satırında mekanEtkinlik görünür, hata turu bozmaz; MEKAN_ETKINLIK=0 kapatır", async () => {
  const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ozelAcik: false, onSinifAdet: 0, ...ek });
  const a = ag(siteler(4)), bulut = bulutTaklit({ toplu: true });
  const calis = (ek, mekanlar) => turCalistir({ ayar: ayar(ek), kaynaklar: {}, bulut, model: { yaz: async () => ({ metin: "", engellendi: "" }) }, fetchFn: a.fetchFn, bekleFn: a.bekleFn, simdi: a.simdi, log: () => {}, tarama: { adaylar: [], hatalar: [] }, mekanlar });
  const o = await calis({}, mekanListesi(4));
  assert.equal(o.mekanEtkinlik.taranan, 4); assert.equal(bulut.k.yuk.length, 1);
  assert.match(ozetSatiri(o), /mekanEtkinlik=taranan:4,bulunan:4,gonderilen:4,yontem:jsonld:4/);
  const kapali = await calis({ mekanEtkinlik: false }, mekanListesi(4)); assert.equal(kapali.mekanEtkinlik, undefined);
  assert.equal(ayarOku({ MEKAN_ETKINLIK: "0" }, []).mekanEtkinlik, false); assert.equal(ayarOku({}, []).mekanTurUst, 15);
  const bozuk = await calis({}, [{ id: "x", yontem: "jsonld", etkinlik_sayfasi: "https://x.org/", ad: null }]); assert.ok(bozuk);   // bozuk kayıt turu düşürmez
});

test("arac/mekanlar.json (keşif çıktısı) şeması: kimlik tekil, yöntem geçerli, bilet alanı yok, çalışan mekânın sayfası var", { skip: !existsSync(new URL("../arac/mekanlar.json", import.meta.url)) }, () => {
  const j = JSON.parse(readFileSync(new URL("../arac/mekanlar.json", import.meta.url), "utf8"));
  const ids = new Set();
  for (const m of j.mekanlar) {
    assert.ok(!ids.has(m.id)); ids.add(m.id);
    assert.ok(["jsonld", "ical", "rss", "yok"].includes(m.yontem));
    if (m.yontem !== "yok") { assert.ok(m.etkinlik_sayfasi.startsWith("https://") || m.etkinlik_sayfasi.startsWith("http://")); assert.ok(!biletMi(m.etkinlik_sayfasi)); }
    if (m.koordinat) assert.ok(m.koordinat.enlem > 35 && m.koordinat.enlem < 43);
  }
});

test("başka şube koruması: sayfa mekânın kendi host'unda değilse (yönlendirme/alt alan) şehir kanıtı şart; link izleme yalnız aynı host", () => {
  const m = M({ web: "https://www.zincir.com.tr/", il: "Ankara" });
  const d = (sayfa, adres = "") => mekanOlayiDogrula({ ad: "Stand-up", baslangic: "2026-10-24", bitis: "", url: "", konumAd: "", konumAdres: adres, ulke: "", tip: "" }, m, sayfa, SIMDI).neden;
  assert.equal(d("https://zincir.com.tr/e/1"), "");                                           // www/apex aynı host
  assert.equal(d("https://istanbul.zincir.com.tr/e/1"), "sehir");                              // başka alt alan, kanıt yok
  assert.equal(d("https://istanbul.zincir.com.tr/e/1", "Çankaya Ankara"), "");                 // kanıt var
  const b = adayBaglantilar(`<a href="https://sube.zincir.com.tr/etkinlikler">e</a><a href="/etkinlikler">e</a>`, "https://www.zincir.com.tr/");
  assert.deepEqual(b.sayfalar, ["https://www.zincir.com.tr/etkinlikler"]);
});

test("sergi: bitiş <= başlangıç+365 kabul (sunucu sözleşmesi), diğer türlerde 120; 365 üstü ret", () => {
  const d = (ek) => mekanOlayiDogrula({ ad: "Etkinlik", baslangic: "2026-10-20", bitis: "", url: "", konumAd: "", konumAdres: "", ulke: "", tip: "", ...ek }, M(), "https://issanat.com.tr/", SIMDI);
  const sergi = d({ ad: "Kalıcı Sergi", bitis: "2027-09-30" });
  assert.equal(sergi.neden, ""); assert.equal(sergi.etkinlik.tur, "sergi"); assert.equal(sergi.etkinlik.bitis, "2027-09-30");
  assert.equal(d({ ad: "Kalıcı Sergi", bitis: "2027-10-21" }).neden, "uzun");               // 366 gün
  assert.equal(d({ ad: "Caz Konseri", bitis: "2027-03-01" }).neden, "uzun");                // konser 120 gün
  assert.equal(d({ ad: "Caz Konseri", bitis: "2026-12-15" }).neden, "");                    // 56 gün
  assert.equal(d({ ad: "Sergi", tip: "ExhibitionEvent", bitis: "2027-01-10" }).neden, "");  // 82 gün
});

test("site haritası ayrıştırma + detay bağlantı süzme + sıralama (geçmiş tarihli adres elenir)", () => {
  const dizin = `<sitemapindex><sitemap><loc>https://x.org/sm-sayfa.xml</loc></sitemap><sitemap><loc>https://x.org/sm-etkinlik.xml</loc><lastmod>2026-10-01</lastmod></sitemap></sitemapindex>`;
  const r = siteHaritasiAyristir(dizin); assert.deepEqual(r.altlar.map((a) => a.loc), ["https://x.org/sm-sayfa.xml", "https://x.org/sm-etkinlik.xml"]); assert.equal(r.url.length, 0);
  const u = siteHaritasiAyristir(`<urlset><url><loc>https://x.org/etkinlik/a?x=1&amp;y=2</loc><lastmod>2026-09-01</lastmod></url><url><loc>https://x.org/etkinlik/b</loc><lastmod>2026-10-10</lastmod></url></urlset>`);
  assert.equal(u.url[0].loc, "https://x.org/etkinlik/a?x=1&y=2");
  const html = `<a href="/etkinlik/caz-gecesi">a</a><a href="/etkinlik/kategori/caz">k</a><a href="/etkinlik/">liste</a><a href="/etkinlikler?page=2">s</a><a href="https://baska.example/etkinlik/x">d</a><a href="https://biletix.com/etkinlik/1">b</a><a href="/sergi/resim.jpg">i</a><a href="/events/jazz-night">j</a>`;
  assert.deepEqual(detayBaglantilar(html, "https://x.org/program"), ["https://x.org/etkinlik/caz-gecesi", "https://x.org/events/jazz-night"]);
  const s = detaySirala([{ loc: "https://x.org/etkinlik/eski/2026-09-01", lastmod: "" }, { loc: "https://x.org/etkinlik/yeni/2026-10-25", lastmod: "" }, { loc: "https://x.org/etkinlik/a", lastmod: "2026-08-01" }, { loc: "https://x.org/etkinlik/b", lastmod: "2026-10-10" }, { loc: "https://x.org/etkinlik/bugun/2026-10-17", lastmod: "" }], "2026-10-17");
  assert.deepEqual(s, ["https://x.org/etkinlik/bugun/2026-10-17", "https://x.org/etkinlik/yeni/2026-10-25", "https://x.org/etkinlik/b", "https://x.org/etkinlik/a"]);
});

const detayCiftligi = (n) => {
  const s = { "https://d.org/": { govde: `<html><body><a href="/program">Program</a></body></html>` }, "https://d.org/program": { govde: "<html><body>JS ile dolar</body></html>" } };
  const kayit = [];
  for (let i = 0; i < n; i++) { const u = `https://d.org/etkinlik/gosteri-${i}`; s[u] = { govde: LD(OLAY({ name: `Gösteri ${i}`, url: u, location: undefined })) }; kayit.push(`<url><loc>${u}</loc><lastmod>2026-10-1${i % 10}</lastmod></url>`); }
  s["https://d.org/sitemap.xml"] = { tur: "application/xml", govde: `<urlset>${kayit.join("")}</urlset>` };
  return s;
};

test("detay keşfi: liste sayfası boşsa site haritasından detay sayfaları bulunur; JSON-LD detayda -> jsonld(detay); sayfa tavanı 12", async () => {
  const a = ag(detayCiftligi(20)), n = agNesne(a);
  const r = await mekanKesfet({ web: "https://d.org/" }, n, { simdi: SIMDI });
  assert.equal(r.yontem, "jsonld"); assert.equal(r.detay, true); assert.equal(r.detay_ornek.length, 2); assert.deepEqual(r.site_haritalari, ["https://d.org/sitemap.xml"]);
  assert.ok(r.sayfa <= 12 && r.sayfa >= 4, `sayfa ${r.sayfa}`);
  assert.ok(a.g.istek.filter((i) => !i.url.endsWith("/robots.txt")).length <= 12);
  // robots.txt'teki Sitemap satırı kullanılır
  const s2 = detayCiftligi(3); s2["https://d.org/harita-ozel.xml"] = s2["https://d.org/sitemap.xml"]; delete s2["https://d.org/sitemap.xml"];
  const b = ag(s2, { robots: "Sitemap: https://d.org/harita-ozel.xml\nSitemap: https://baska.example/x.xml\n" });
  assert.deepEqual((await agNesne(b).siteHaritalari("https://d.org")), ["https://d.org/harita-ozel.xml"]);
  assert.equal((await mekanKesfet({ web: "https://d.org/" }, agNesne(b), { simdi: SIMDI })).detay, true);
  // site haritası indeksi -> etkinlik alt haritası
  const s3 = detayCiftligi(3); const alt = s3["https://d.org/sitemap.xml"].govde;
  s3["https://d.org/sitemap.xml"] = { tur: "application/xml", govde: `<sitemapindex><sitemap><loc>https://d.org/sm-blog.xml</loc></sitemap><sitemap><loc>https://d.org/sm-etkinlik.xml</loc></sitemap></sitemapindex>` };
  s3["https://d.org/sm-etkinlik.xml"] = { tur: "application/xml", govde: alt };
  assert.equal((await mekanKesfet({ web: "https://d.org/" }, agNesne(ag(s3)), { simdi: SIMDI })).detay, true);
});

test("keşif: ana sayfadaki etkinlik bağlantıları site haritasından önce denenir; robots Disallow'lu detay okunmaz", async () => {
  const s = { "https://l.org/": { govde: `<html><body><a href="/etkinlik/a1">a</a><a href="/etkinlik/a2">b</a><a href="/etkinlik/a3">c</a><a href="/etkinlik/a4">d</a><a href="/etkinlik/a5">e</a><a href="/etkinlik/a6">f</a><a href="/etkinlik/gizli/x1">g</a></body></html>` } };
  for (const i of [1, 2, 3, 4, 5, 6]) s[`https://l.org/etkinlik/a${i}`] = { govde: LD(OLAY({ name: `Sergi ${i}`, url: `https://l.org/etkinlik/a${i}` })) };
  const a = ag(s, { robots: "User-agent: *\nDisallow: /etkinlik/gizli\n" });
  const r = await mekanKesfet({ web: "https://l.org/" }, agNesne(a), { simdi: SIMDI });
  assert.equal(r.yontem, "jsonld"); assert.ok(r.etkinlik_sayfasi.includes("/etkinlik/a"));   // etkinlik bağlantılı sayfalar aday liste olarak gezilir ve JSON-LD orada bulunur
  assert.ok(!a.g.istek.some((i) => /sitemap|gizli/.test(i.url)));                            // 6 liste bağlantısı yeterli: site haritası istenmedi
});

test("detay kipli mekan taraması: günde en çok 12 sayfa, tur istek tavanı, doğrulanmış etkinlikler toplanır", async () => {
  const sayfalar = detayCiftligi(30);
  const mekan = M({ id: "d", web: "https://d.org/", etkinlik_sayfasi: "https://d.org/", sayfalar: ["https://d.org/", "https://d.org/program"], detay: true, site_haritalari: ["https://d.org/sitemap.xml"] });
  const a = ag(sayfalar);
  const r = await mekanTara(mekan, agNesne(a), SIMDI);
  assert.ok(r.sayfa <= 12 && r.sayfa >= 10, `sayfa ${r.sayfa}`);
  assert.ok(r.etkinlikler.length >= 7 && r.etkinlikler.every(etkinlikYukuGecerli));
  assert.ok(a.g.istek.filter((i) => !i.url.endsWith("/robots.txt")).length <= 12);
  const b = ag(sayfalar), n = agNesne(b);
  await mekanTara(mekan, n, SIMDI, { dur: () => n.istekSayisi() >= 4 });
  assert.ok(b.g.istek.length <= 5);                                                           // tavan: durdu
  const c = ag(sayfalar), bulut = bulutTaklit({ toplu: true });
  const liste = [mekan, { ...mekan, id: "d2", no: 2 }, { ...mekan, id: "d3", no: 3 }];
  const o = await mekanEtkinlikTuru({ mekanlar: liste, bulut, fetchFn: c.fetchFn, bekleFn: c.bekleFn, simdi: c.simdi, istekUst: 20 });
  assert.equal(o.durum, "istek"); assert.ok(o.taranan >= 1 && o.taranan < 3); assert.ok(c.g.istek.length <= 20 + 2);
});

test("etkinlik_kaynaklari.json: kaynaklar mekân dosyasından ayrı; aktif kaynağın lisansı/koşul notu yazılı, bilet alanı yok", { skip: !existsSync(new URL("../arac/etkinlik_kaynaklari.json", import.meta.url)) }, () => {
  const j = JSON.parse(readFileSync(new URL("../arac/etkinlik_kaynaklari.json", import.meta.url), "utf8"));
  const ids = new Set();
  for (const k of j.kaynaklar) {
    assert.ok(k.id && k.ad && !ids.has(k.id)); ids.add(k.id);
    assert.ok(typeof k.kosul_notu === "string" && k.kosul_notu.length > 10, k.id);
    assert.ok(!biletMi(k.web || ""), k.id);
    if (k.aktif !== false) assert.ok(k.lisans && k.lisans_url, `${k.id}: aktif kaynakta lisans/koşul bağlantısı şart`);
    if (k.aktif === false) assert.ok(k.neden, `${k.id}: kapalı kaynakta neden`);
  }
});
