import { test } from "node:test";
import assert from "node:assert/strict";
import { baglantiOzeti, rssAyristir } from "../lib/rss.mjs";
import { dogrulandiMi, gorulenSinifi, konuYasak, onEleme, tekrarlariEle } from "../lib/on_eleme.mjs";
import { robotsIzin, sayfaEslesiyor, sayfaMetni } from "../lib/sayfa.mjs";

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Volunteers plant 5,000 trees &amp; revive a park]]></title><link>https://www.goodnewsnetwork.org/a/?utm_source=x</link>
<description><![CDATA[<p>Neighbors <b>planted</b> trees.</p>]]></description><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>Ikinci</title><link>not-a-url</link></item>
</channel></rss>`;
const BING = `<rss xmlns:News="x"><channel><item><title>Gönüllüler fidan dikti</title>
<link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fornek.com%2fhaber%2f1&amp;c=1</link>
<description>Özet</description><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate><News:Source>Ornek Gazete</News:Source></item></channel></rss>`;

test("RSS ayrıştırma: CDATA, varlıklar, geçersiz bağlantı atılır", () => {
  const r = rssAyristir(RSS, { kaynak: "gnn" });
  assert.equal(r.length, 1);
  assert.equal(r[0].baslik, "Volunteers plant 5,000 trees & revive a park");
  assert.equal(r[0].ozet, "Neighbors planted trees.");
  assert.equal(r[0].zaman, "2026-10-12T10:00:00.000Z");
});

test("Bing RSS: asıl adres ve kaynak adı çıkarılır", () => {
  const [a] = rssAyristir(BING, { bing: true, dil: "tr" });
  assert.equal(a.link, "https://ornek.com/haber/1");
  assert.equal(a.kaynak, "Ornek Gazete");
});

test("bağlantı özeti: izleme parametreleri ve www önemsiz", () => {
  assert.equal(baglantiOzeti("https://www.ornek.com/a/?utm_source=x"), baglantiOzeti("https://ornek.com/a"));
  assert.notEqual(baglantiOzeti("https://ornek.com/a"), baglantiOzeti("https://ornek.com/b"));
});

test("ön eleme: hassas konular ret, iyi haber kabul", () => {
  const simdi = Date.parse("2026-10-13T12:00:00Z"), zaman = "2026-10-13T06:00:00Z";
  const ret = [
    "Mayor opens new community garden for neighbors", "Ministry of Health announces new clinic", "Belediye başkanı park açtı",
    "Earthquake survivors rebuild their school together", "Soldiers help villagers plant trees", "Church choir raises money for shelter",
    "Polis çocuğa bisiklet hediye etti", "Pandemic-era volunteers reunite", "Savaş sonrası çocuklar yeniden okula başladı",
  ];
  for (const b of ret) assert.equal(onEleme({ baslik: b, ozet: "", zaman }, { simdi }).ok, false, b);
  const kabul = ["Volunteers plant 5,000 trees and revive a city park", "Gönüllüler sokak hayvanları için barınak yaptı", "Students win national robotics award with a recycling robot"];
  for (const b of kabul) assert.equal(onEleme({ baslik: b, ozet: "", zaman }, { simdi }).ok, true, b);
});

test("C3b: Türkçe harfli kelime sınırları çalışır (çığ, sel, deprem)", () => {
  assert.ok(konuYasak("Köyde çığ düştü").length > 0);
  assert.ok(konuYasak("Deprem bölgesinde okul açıldı").length > 0);
  assert.equal(konuYasak("Selma plants a tree").length, 0);   // 'sel' tam kelime değil
});

test("tazelik: 48 saatten eski, tarihsiz ve gelecek tarihli ret", () => {
  const simdi = Date.parse("2026-10-13T12:00:00Z");
  const a = (zaman) => onEleme({ baslik: "Kids build a library", ozet: "", zaman }, { simdi, tazelikSaat: 48 });
  assert.equal(a("2026-10-12T12:00:00Z").ok, true);
  assert.equal(a("2026-10-10T12:00:00Z").ok, false);
  assert.equal(a(null).ok, false);
  assert.equal(a("2026-10-20T12:00:00Z").ok, false);
});

test("görülen mantığı", () => {
  assert.equal(gorulenSinifi(undefined), "yeni");
  assert.equal(gorulenSinifi({ durum: "yayinlandi" }), "atla");
  assert.equal(gorulenSinifi({ durum: "elendi" }), "atla");
  assert.equal(gorulenSinifi({ durum: "bekliyor_gorsel" }), "bekleyen");
  assert.equal(gorulenSinifi({ durum: "bekliyor_kaynak" }), "bekleyen");
});

test("doğrulama: güvenilir tek kaynak yeter; diğeri ikinci bağımsız kaynak ister", () => {
  const g = ["goodnewsnetwork.org"];
  const a = { baslik: "Volunteers plant thousands of trees reviving city park", link: "https://www.goodnewsnetwork.org/x" };
  const b = { baslik: "Student robotics team wins national award", link: "https://ornek1.com/y" };
  const b2 = { baslik: "Robotics team students win national award", link: "https://ornek2.com/z" };
  const b3 = { baslik: "Student robotics team wins national award today", link: "https://ornek1.com/q" };   // aynı site: bağımsız değil
  assert.equal(dogrulandiMi(a, [a, b], g).ok, true);
  assert.equal(dogrulandiMi(b, [a, b], g).ok, false);
  assert.equal(dogrulandiMi(b, [a, b, b3], g).ok, false);
  assert.equal(dogrulandiMi(b, [a, b, b2], g).ok, true);
});

test("tekrarlar elenir", () => {
  const l = tekrarlariEle([{ baslik: "Students win national robotics award" }, { baslik: "Robotics award national students win" }, { baslik: "Tree planting revives park" }]);
  assert.equal(l.length, 2);
});

test("robots.txt ve sayfa metni", () => {
  const r = "User-agent: *\nDisallow: /private\nAllow: /private/acik\n";
  assert.equal(robotsIzin(r, "/haber/1"), true);
  assert.equal(robotsIzin(r, "/private/x"), false);
  assert.equal(robotsIzin(r, "/private/acik/y"), true);
  assert.equal(robotsIzin("User-agent: OnlyPositiveBot\nDisallow: /\n", "/a"), false);
  assert.equal(robotsIzin("", "/a"), true);
  const html = "<nav><p>menu menu menu menu menu menu menu menu menu menu menu</p></nav><p>" + "Gerçek haber paragrafı burada ".repeat(4) + "</p><p>Subscribe to our newsletter today and get everything free forever</p>";
  assert.match(sayfaMetni(html), /^Gerçek haber/);
  assert.doesNotMatch(sayfaMetni(html), /menu|Subscribe/);
  assert.equal(sayfaEslesiyor("Volunteers planted trees in the park city", "Volunteers plant trees park"), true);
  assert.equal(sayfaEslesiyor("Completely unrelated text about cars", "Volunteers plant trees park"), false);
});
