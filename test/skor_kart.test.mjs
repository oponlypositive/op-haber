// Armasız skor kartı (lib/skor_kart.mjs): olumlu/olumsuz örnekler, ciktiDogrula entegrasyonu, hat entegrasyonu (görsel aranmaz, yük kart taşır, özet skorKart=N).
import { test } from "node:test";
import assert from "node:assert/strict";
import { skorKartiDogrula } from "../lib/skor_kart.mjs";
import { ciktiDogrula } from "../lib/dogrula.mjs";
import { yayinYuku } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { turCalistir, ozetSatiri } from "../hat.mjs";
import { ISTEM } from "../lib/yaz.mjs";

const dogru = (ham, kaynak, yazilan = kaynak, ek = {}) => { const n = []; const k = skorKartiDogrula(ham, kaynak, yazilan, { ...ek, notlar: n }); return { k, neden: n[0] || "" }; };
const H = (taraf1, skor1, taraf2, skor2, ek = {}) => ({ taraf1, skor1, taraf2, skor2, ...ek });

test("skor: basketbol 99-80, fiille kazanan (EN)", () => {
  const kay = "Fenerbahce Beko beat Real Madrid 99-80 on Thursday in the EuroLeague.";
  const { k } = dogru(H("Fenerbahce Beko", 99, "Real Madrid", 80, { organizasyon: "EuroLeague" }), kay);
  assert.deepEqual(k, { tur: "skor", taraf1: "Fenerbahce Beko", taraf2: "Real Madrid", skor1: 99, skor2: 80, organizasyon: "EuroLeague" });
});

test("skor: TERS skor reddedilir (takım-skor eşleşmesi yanlış)", () => {
  const kay = "Fenerbahce Beko beat Real Madrid 99-80 on Thursday in the EuroLeague.";
  const { k, neden } = dogru(H("Fenerbahce Beko", 80, "Real Madrid", 99), kay);
  assert.equal(k, null); assert.equal(neden, "ters skor");
});

test("skor: kaybeden özneli cümle ('lost to'): büyük sayı kazananın", () => {
  const kay = "Real Madrid lost to Fenerbahce 99-80 in Istanbul.";
  assert.ok(dogru(H("Real Madrid", 80, "Fenerbahce", 99), kay).k);
  assert.equal(dogru(H("Real Madrid", 99, "Fenerbahce", 80), kay).k, null);
});

test("skor: voleybol set skoru 3-1, set ayrıntısı parantezde (A ve fiil kalıpları)", () => {
  assert.ok(dogru(H("Vakifbank", 3, "Fenerbahce", 1), "Vakifbank 3-1 Fenerbahce in the league final.").k);
  const kay = "Fenerbahce beat Vakifbank 3-1 (25-22, 25-20, 20-25, 25-21) in the final.";
  assert.ok(dogru(H("Fenerbahce", 3, "Vakifbank", 1), kay).k);
  assert.equal(dogru(H("Fenerbahce", 1, "Vakifbank", 3), kay).k, null);
});

test("skor: Türkçe cümleler (özne, nesne ... fiil)", () => {
  assert.ok(dogru(H("Fenerbahçe", 85, "Real Madrid", 80), "Fenerbahçe, Real Madrid'i 85-80 yendi.").k);
  assert.ok(dogru(H("Real Madrid", 80, "Fenerbahçe", 85), "Real Madrid, Fenerbahçe'ye 80-85 yenildi.").k);
  assert.equal(dogru(H("Real Madrid", 85, "Fenerbahçe", 80), "Real Madrid, Fenerbahçe'ye 80-85 yenildi.").k, null);
  assert.equal(dogru(H("Fenerbahçe", 80, "Real Madrid", 85), "Fenerbahçe, Real Madrid'i 85-80 yendi.").k, null);
});

test("skor: tablo biçimi 'X - Y 99-80' ve 'X 112, Y 108'", () => {
  assert.ok(dogru(H("Fenerbahce", 99, "Real Madrid", 80), "Fenerbahce - Real Madrid 99-80").k);
  assert.equal(dogru(H("Fenerbahce", 80, "Real Madrid", 99), "Fenerbahce - Real Madrid 99-80").k, null);
  assert.ok(dogru(H("Lakers", 112, "Celtics", 108), "Lakers 112, Celtics 108.").k);
});

test("skor: beraberlik yön gerektirmez; kazanma fiili varsa çelişki", () => {
  assert.ok(dogru(H("Galatasaray", 2, "Besiktas", 2), "Galatasaray and Besiktas drew 2-2 in the derby on Sunday.").k);
  assert.equal(dogru(H("Galatasaray", 2, "Besiktas", 2), "Galatasaray beat Besiktas 2-2 in the derby.").k, null);
});

test("skor: uzatma notu serbest (maç sonu skoru), seri penaltı ve agrega kart üretmez", () => {
  assert.ok(dogru(H("Fenerbahce", 99, "Real Madrid", 95), "Fenerbahce beat Real Madrid 99-95 after extra time.").k);
  assert.equal(dogru(H("Real Madrid", 4, "Bayern", 3), "Real Madrid beat Bayern 4-3 on penalties.").k, null);
  assert.equal(dogru(H("Galatasaray", 5, "Besiktas", 4), "Galatasaray beat Besiktas 5-4 on penalties after a 1-1 draw.").k, null);
  assert.equal(dogru(H("Roma", 2, "Lazio", 0), "Roma beat Lazio 2-0, winning 3-1 on aggregate.").k, null);
});

test("skor: derleme (birden çok maç) reddedilir", () => {
  const kay = "Fenerbahce beat Real Madrid 99-80. Barcelona beat Olympiacos 90-85. Zalgiris beat Baskonia 88-70. Monaco beat Partizan 77-70. Virtus beat Valencia 81-79.";
  assert.equal(dogru(H("Fenerbahce", 99, "Real Madrid", 80), kay).neden, "derleme belirtisi (çok skor)");
  assert.equal(dogru(H("Fenerbahce", 99, "Real Madrid", 80), "Fenerbahce beat Real Madrid 99-80.", undefined, { kaynakBaslik: "EuroLeague results of the week" }).neden, "derleme belirtisi");
  assert.equal(dogru(H("Fenerbahce", 99, "Real Madrid", 80), "Fenerbahce beat Real Madrid 99-80.", undefined, { enBaslik: "Weekend roundup" }).neden, "derleme belirtisi");
});

test("skor: takım adı kaynakta ya da yazılan metinde yoksa kart yok", () => {
  const kay = "Fenerbahce beat Real Madrid 99-80.";
  assert.equal(dogru(H("Fenerbahce", 99, "Barcelona", 80), kay).neden, "ad kaynakta yok");
  assert.equal(dogru(H("Fenerbahce", 99, "Real Madrid", 80), kay, "Fenerbahce won a big game.").neden, "ad yazılan metinde yok");
});

test("skor: yön kanıtı yok (çıplak skor, 'won' tek başına, çerçeveleme tuzağı)", () => {
  assert.equal(dogru(H("Fenerbahce", 99, "Real Madrid", 80), "Fenerbahce and Real Madrid met on Thursday and the final score was 99-80.").neden, "yön kanıtı yok");
  assert.equal(dogru(H("Real Madrid", 99, "Fenerbahce", 80), "Real Madrid hosted Fenerbahce and won 99-80.").k, null);
  assert.equal(dogru(H("Real Madrid", 99, "Fenerbahce", 80), "Fenerbahce coach said Real Madrid beat them 99-80.").k, null);
});

test("skor: çelişkili kanıt (aynı iki takım, başka skor) ve başka skor çifti", () => {
  assert.equal(dogru(H("Fenerbahce", 98, "Real Madrid", 80), "Fenerbahce beat Real Madrid 99-80.").k, null);
  assert.equal(dogru(H("Fenerbahce", 99, "Real Madrid", 80), "Fenerbahce beat Real Madrid 99-80. Earlier, Fenerbahce and Real Madrid drew 70-70.").k, null);
});

test("skor: aralık, tür ve ad kuralları", () => {
  const kay = "Fenerbahce beat Real Madrid 99-80.";
  assert.equal(dogru(H("Fenerbahce", 300, "Real Madrid", 80), kay).neden, "skor aralık/tür");
  assert.equal(dogru(H("Fenerbahce", 99.5, "Real Madrid", 80), kay).neden, "skor aralık/tür");
  assert.equal(dogru(H("Fenerbahce", "99", "Real Madrid", 80), kay).neden, "skor aralık/tür");
  assert.equal(dogru(H("Fenerbahce", -1, "Real Madrid", 80), kay).neden, "skor aralık/tür");
  assert.equal(dogru(H("F", 99, "Real Madrid", 80), kay).neden, "ad geçersiz");
  assert.equal(dogru(H("Fenerbahce", 99, "Fenerbahce", 80), kay).neden, "adlar aynı/içiçe");
  assert.equal(dogru(H("Fenerbahce <b>", 99, "Real Madrid", 80), kay).neden, "ad geçersiz");
  assert.equal(dogru(H("A".repeat(41), 99, "Real Madrid", 80), kay).neden, "ad geçersiz");
  assert.equal(skorKartiDogrula(null, kay), null);
  assert.equal(skorKartiDogrula("99-80", kay), null);
});

test("skor: organizasyon/aşama kaynakta geçmiyorsa alan atılır, kart kalır", () => {
  const kay = "Fenerbahce beat Real Madrid 99-80 in the EuroLeague.";
  const { k } = dogru(H("Fenerbahce", 99, "Real Madrid", 80, { organizasyon: "EuroLeague", asama: "Final Four" }), kay);
  assert.equal(k.organizasyon, "EuroLeague"); assert.ok(!("asama" in k));
});

// ---- ciktiDogrula entegrasyonu
const KAY = "Istanbul hosted the EuroLeague game on Thursday evening. Fenerbahce Beko beat Real Madrid 99-80 in front of a full arena. The crowd stayed until the final whistle to cheer the players.";
const EN = "Fenerbahce Beko won the game against Real Madrid by 99-80 on Thursday night. The home crowd cheered as the team built a lead in the second quarter. Players and staff thanked the fans after the final whistle. It was a calm and happy evening for the whole arena.";
const TR = "Fenerbahce Beko, perşembe gecesi Real Madrid karşısında 99-80 kazandı. Tribünler, takımın ikinci periyotta farkı açmasını alkışladı. Oyuncular ve teknik ekip, son düdükten sonra taraftarlara teşekkür etti. Salon için sakin ve mutlu bir akşam oldu.";
const D = (ek = {}) => ({ uygun: true, kategori: "spor", yer: "İstanbul, Türkiye", en: { baslik: "Fenerbahce Beko beats Real Madrid", ozet: EN }, tr: { baslik: "Fenerbahce Beko, Real Madrid'i yendi", ozet: TR }, ...ek });

test("ciktiDogrula: spor + doğru skor -> haber.kart; bozuk skor haberi reddetmez", () => {
  const v = ciktiDogrula(D({ skor: H("Fenerbahce Beko", 99, "Real Madrid", 80, { organizasyon: "EuroLeague" }) }), KAY, "Fenerbahce Beko beat Real Madrid");
  assert.equal(v.ok, true, v.neden);
  assert.equal(v.haber.kart.skor1, 99); assert.equal(v.haber.kart.organizasyon, "EuroLeague");
  const ters = ciktiDogrula(D({ skor: H("Fenerbahce Beko", 80, "Real Madrid", 99) }), KAY, "x");
  assert.equal(ters.ok, true); assert.ok(!("kart" in ters.haber));
  const yok = ciktiDogrula(D(), KAY, "x");
  assert.equal(yok.ok, true); assert.ok(!("kart" in yok.haber));
});

test("ciktiDogrula: spor dışı kategoride skor yok sayılır", () => {
  const v = ciktiDogrula(D({ kategori: "iyilik", skor: H("Fenerbahce Beko", 99, "Real Madrid", 80) }), KAY, "x");
  assert.equal(v.ok, true); assert.ok(!("kart" in v.haber));
});

test("istem: skor yönergesi var, derleme/penaltı/tek kişilik spor için uyarıyor; yük kart taşır", () => {
  assert.match(ISTEM, /SKOR \(isteğe bağlı/); assert.match(ISTEM, /derleme/); assert.match(ISTEM, /seri penaltı/);
  const h = { id: "habc", tr: { baslik: "t", ozet: "o" }, en: { baslik: "e", ozet: "o" }, kategori: "spor", yer: "Dünya", kaynak: "k", link: "https://a.b/c", zaman: "2026-10-13T08:00:00Z", model: "m", kart: { tur: "skor", taraf1: "A", taraf2: "B", skor1: 1, skor2: 0 } };
  assert.deepEqual(yayinYuku(h, "ab".repeat(32), null).haber.kart, h.kart);
  assert.ok(!("kart" in yayinYuku({ ...h, kart: undefined }, "ab".repeat(32), null).haber));
});

// ---- hat entegrasyonu
const SIMDI = Date.parse("2026-10-13T12:00:00Z");
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ...ek });
function sahteBulut() {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => new Map(), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } };
}
const OZET_KAYNAK = "Fenerbahce Beko beat Real Madrid 99-80 in a EuroLeague game on Thursday in Istanbul. The crowd stayed until the final whistle to cheer the players. " + "The game was calm and friendly from the first minute to the last one. ".repeat(2);
const adayS = { baslik: "Fenerbahce Beko beat Real Madrid in EuroLeague game", ozet: OZET_KAYNAK, link: "https://www.goodnewsnetwork.org/h/spor1", kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-13T08:00:00Z" };

test("tur: skor kartlı haberde görsel ARANMAZ, kart yükte, görselsizYayin kapalı olsa da yayınlanır, özet skorKart=1", async () => {
  const bulut = sahteBulut(), url = [];
  const fetchFn = async (u) => { url.push(String(u)); return { ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) }; };
  const model = { yaz: async () => ({ metin: JSON.stringify(D({ skor: H("Fenerbahce Beko", 99, "Real Madrid", 80, { organizasyon: "EuroLeague" }), gorsel_arama: "basketball", gorsel_ozne: { ad: "Fenerbahce Beko", tur: "kurum" } })), engellendi: "", saglayici: "taklit" }) };
  const o = await turCalistir({ ayar: ayar({ gorselsizYayin: false }), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [adayS], hatalar: [] } });
  assert.equal(o.yayinlanan, 1, JSON.stringify({ ...o, ornekBaslik: 0 }) + JSON.stringify(bulut.k.isaretler));
  assert.equal(bulut.k.yayinlar[0].g, null);
  assert.equal(bulut.k.yayinlar[0].h.kart.skor1, 99);
  assert.equal(o.skorKart, 1); assert.equal(o.gorselsiz, 0); assert.equal(o.vlCagri, 0);
  assert.ok(!url.some((u) => /wikimedia|wikidata|pixabay|pexels|openverse/.test(u)), "görsel araması yapılmamalı: " + url.join(","));
  assert.match(ozetSatiri(o), / skorKart=tek:1,liste:0,puan:0/);
});

test("tur: skor kartı yoksa özet satırında skorKart görünmez", () => {
  assert.doesNotMatch(ozetSatiri({ aday: 0, yeniAday: 0, onElemeGecen: 0, modelCagri: 0, red: {}, elenen: 0, bekleyenGorsel: 0, bekleyenKaynak: 0, yayinlanan: 0, durus: "tamam", skorKart: 0 }), /skorKart/);
});
