// Skor LİSTESİ (`skorlar`) ve PUAN TABLOSU (`puan`) kartları (lib/skor_kart.mjs, gecis-020). Sahip kuralı 2026-10-14: "Skor paylaşıyorsan mutlaka liste halinde paylaş,
// puan durumundan söz ediyorsan mutlaka puan durumunu alta koy." İLKE: yanlış liste/tablo, kartsızlıktan çok daha kötüdür -> emin değilsek kart yok.
// Olumlu + olumsuz örnekler (UEFA haftası derlemesi, Süper Lig puan durumu metni, eksik/çelişkili tablo, ters skor), ciktiDogrula önceliği, hat entegrasyonu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { skorlarKartiDogrula, puanKartiDogrula } from "../lib/skor_kart.mjs";
import { ciktiDogrula } from "../lib/dogrula.mjs";
import { yayinYuku } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { turCalistir, ozetSatiri } from "../hat.mjs";
import { ISTEM } from "../lib/yaz.mjs";

const M = (taraf1, skor1, taraf2, skor2) => ({ taraf1, skor1, taraf2, skor2 });
const sl = (ham, kaynak, ek = {}) => { const notlar = [], atilanlar = []; const k = skorlarKartiDogrula(ham, kaynak, "", { ...ek, notlar, atilanlar }); return { k, neden: notlar[0] || "", atilanlar }; };
const P = (sira, takim, puan, ek = {}) => ({ sira, takim, puan, ...ek });
const pu = (ham, kaynak, ek = {}) => { const notlar = [], atilanlar = []; const k = puanKartiDogrula(ham, kaynak, "", { ...ek, notlar, atilanlar }); return { k, neden: notlar[0] || "", atilanlar }; };

// ================================================================ SKORLAR
const UEFA = `UEFA Şampiyonlar Ligi lig aşamasının üçüncü haftası tamamlandı. Haftanın sonuçları:
Galatasaray 2-1 Bayern Münih
Real Madrid 3-0 Napoli
Barcelona - Arsenal 1-1
Inter, Liverpool'u 2-0 yendi.`;
const UEFA_MACLAR = [M("Galatasaray", 2, "Bayern Münih", 1), M("Real Madrid", 3, "Napoli", 0), M("Barcelona", 1, "Arsenal", 1), M("Inter", 2, "Liverpool", 0)];

test("skorlar: UEFA haftası derlemesi — her maç tek tek kanıtlanır, sıra korunur, organizasyon kaynakta geçtiği için kalır", () => {
  const { k, atilanlar } = sl({ organizasyon: "UEFA Şampiyonlar Ligi", asama: "Çeyrek final", maclar: UEFA_MACLAR }, UEFA);
  assert.deepEqual(atilanlar, []);
  assert.equal(k.tur, "skorlar"); assert.equal(k.organizasyon, "UEFA Şampiyonlar Ligi"); assert.ok(!("asama" in k), "kaynakta 'Çeyrek final' geçmiyor -> alan atılır"); assert.equal(sl({ asama: "Lig aşaması", maclar: UEFA_MACLAR }, UEFA).k.asama, "Lig aşaması", "kaynakta geçiyorsa kalır");
  assert.deepEqual(k.maclar, UEFA_MACLAR);
});
test("skorlar: ; ve • ile ayrılmış tek satırlık derleme (EN) ve fiil kalıpları", () => {
  const kay = "Round-up of the night: Lakers 112, Celtics 108; Heat beat Bulls 99-90; Knicks lost to Nets 95-101.";
  const { k, atilanlar } = sl({ maclar: [M("Lakers", 112, "Celtics", 108), M("Heat", 99, "Bulls", 90), M("Knicks", 95, "Nets", 101)] }, kay);
  assert.equal(k.maclar.length, 3, JSON.stringify(atilanlar));
  assert.equal(sl({ maclar: [M("Heat", 99, "Bulls", 90), M("Lakers", 112, "Celtics", 108)] }, "Heat beat Bulls 99-90 • Lakers 112, Celtics 108 • Final").k.maclar.length, 2);
});
test("skorlar: kanıtlanamayan maç LİSTEDEN ATILIR (kaynakta yok / skor yanlış), kalan >= 2 ise kart kalır", () => {
  const { k, atilanlar } = sl({ maclar: [...UEFA_MACLAR.slice(0, 3), M("Inter", 5, "Milan", 0), M("Real Madrid", 4, "Napoli", 0)] }, UEFA);
  assert.deepEqual(k.maclar, UEFA_MACLAR.slice(0, 3));
  assert.ok(atilanlar.some((a) => /Inter-Milan: ad kaynakta yok/.test(a)), atilanlar.join("|"));
  assert.ok(atilanlar.some((a) => /Real Madrid-Napoli/.test(a)), "kaynakta 3-0 yazıyor; 4-0 kanıtsız -> atıldı");
});
test("skorlar: TERS skor atılır; kalan 2'den azsa kart yok", () => {
  const kay = "Fenerbahce beat Real Madrid 99-80 on Thursday.\nBarcelona beat Olympiacos 85-70 on Friday.";
  const iyi = sl({ maclar: [M("Fenerbahce", 99, "Real Madrid", 80), M("Barcelona", 85, "Olympiacos", 70)] }, kay);
  assert.equal(iyi.k.maclar.length, 2);
  const ters = sl({ maclar: [M("Fenerbahce", 80, "Real Madrid", 99), M("Barcelona", 85, "Olympiacos", 70)] }, kay);
  assert.equal(ters.k, null); assert.match(ters.neden, /kanıtlanan maç 1 < 2/); assert.ok(ters.atilanlar.some((a) => /ters skor/.test(a)));
});
test("skorlar: aynı cümlede iki maç, seri penaltı, agrega ve kaynakta olmayan ad = kanıtsız (kart yok)", () => {
  assert.equal(sl({ maclar: [M("Lakers", 112, "Celtics", 108), M("Heat", 99, "Bulls", 90)] }, "Lakers 112, Celtics 108 and Heat beat Bulls 99-90 tonight.").k, null);
  assert.equal(sl({ maclar: [M("Real Madrid", 4, "Bayern", 3), M("Inter", 2, "Milan", 0)] }, "Real Madrid beat Bayern 4-3 on penalties.\nInter beat Milan 2-0.").k, null);
  assert.equal(sl({ maclar: [M("Ajax", 2, "PSV", 1), M("Inter", 2, "Milan", 0)] }, "Ajax won the aggregate 2-1 against PSV.\nInter beat Milan 2-0.").k, null);
});
test("skorlar: aynı eşleşme çelişkili iki kez -> ikisi de atılır; aynıysa tekilleştirilir", () => {
  const kay = "Inter beat Milan 2-0.\nMilan beat Inter 1-0.\nAjax beat PSV 3-1.\nRoma beat Lazio 1-0.";
  const { k, atilanlar } = sl({ maclar: [M("Inter", 2, "Milan", 0), M("Milan", 1, "Inter", 0), M("Ajax", 3, "PSV", 1), M("Roma", 1, "Lazio", 0)] }, kay);
  assert.deepEqual(k.maclar.map((m) => m.taraf1), ["Ajax", "Roma"]);
  assert.ok(atilanlar.some((a) => /çelişki|çelişkili/.test(a)), atilanlar.join("|"));
  const tek = sl({ maclar: [M("Ajax", 3, "PSV", 1), M("Ajax", 3, "PSV", 1), M("Roma", 1, "Lazio", 0)] }, kay);
  assert.equal(tek.k.maclar.length, 2);
});
test("skorlar: en çok 12 maç; 2'den az / nesne değil / eksik alan = kart yok", () => {
  const takimlar = "Atlas Boru Cesur Dalga Elma Fidan Gunes Hilal Irmak Jale Kumru Lale Melek Nehir Ova Pinar Rüzgar Sedir Tepe Umut Vadi Yildiz Zeytin Akasya".split(" ");
  const maclar = [], satirlar = [];
  for (let i = 0; i < 24; i += 2) { maclar.push(M(takimlar[i], i % 5 + 1, takimlar[i + 1], 0)); satirlar.push(`${takimlar[i]} ${i % 5 + 1}-0 ${takimlar[i + 1]}`); }
  assert.equal(maclar.length, 12);
  const on3 = [...maclar, M("Lotus", 1, "Mavi", 0)];   // 13. maç kaynakta da var
  const k = sl({ maclar: on3 }, satirlar.join("\n") + "\nLotus 1-0 Mavi").k;
  assert.equal(k.maclar.length, 12);
  assert.equal(sl({ maclar: [M("Atlas", 3, "Boru", 0)] }, "Atlas 3-0 Boru").k, null);
  assert.equal(sl({}, "x").k, null); assert.equal(sl({ maclar: "x" }, "x").k, null); assert.equal(sl({ maclar: [null, 5] }, "x").k, null);
});
test("skorlar: ikinci filtre — yasak konu içeren takım/organizasyon adı kartı düşürür", () => {
  const kay = "Mahalle Takimi beat Genc Spor 3-1.\nIl Takimi beat Yildiz 2-0.\nSavas Genclik beat Dostluk Spor 1-0.";
  assert.ok(sl({ maclar: [M("Mahalle Takimi", 3, "Genc Spor", 1), M("Il Takimi", 2, "Yildiz", 0)] }, kay).k);
  const k = sl({ maclar: [M("Mahalle Takimi", 3, "Genc Spor", 1), M("Il Takimi", 2, "Yildiz", 0), M("Savaş Gençlik", 1, "Dostluk Spor", 0)] }, kay.replace("Savas Genclik", "Savaş Gençlik"));
  assert.equal(k.k, null, "yasak konulu ad -> kart düşer (haber yine yayınlanır)"); assert.match(k.neden, /ikinci filtre/);
});

// ================================================================ PUAN
const TABLO = `Trendyol Süper Lig'de 8. hafta sona erdi. Puan durumu:
1. Galatasaray 8 6 1 1 20-8 +12 19
2. Fenerbahçe 8 5 2 1 17-9 +8 17
3. Trabzonspor 8 5 1 2 14-9 +5 16
4. Beşiktaş 8 4 2 2 12-10 +2 14
5. Başakşehir 8 3 3 2 11-9 +2 12`;
const SATIRLAR = [["Galatasaray", 19, 12], ["Fenerbahçe", 17, 8], ["Trabzonspor", 16, 5], ["Beşiktaş", 14, 2], ["Başakşehir", 12, 2]];
const HAM = (n = 5, ek = {}) => ({ organizasyon: "Süper Lig", tarih_notu: "8. hafta", satirlar: SATIRLAR.slice(0, n).map(([t, p, a], i) => P(i + 1, t, p, { oynanan: 8, averaj: a, ...ek })) });

test("puan: Süper Lig puan durumu metni — sıra+takım+puan (+oynanan, averaj) aynı satırda kanıtlanır; tam tablo 'kismi' değil", () => {
  const { k, atilanlar } = pu(HAM(), TABLO);
  assert.deepEqual(atilanlar, []);
  assert.equal(k.tur, "puan"); assert.equal(k.organizasyon, "Süper Lig"); assert.equal(k.tarih_notu, "8. hafta"); assert.ok(!("kismi" in k));
  assert.deepEqual(k.satirlar[0], { sira: 1, takim: "Galatasaray", oynanan: 8, puan: 19, averaj: 12 });
  assert.equal(k.satirlar.length, 5); assert.deepEqual(k.satirlar.map((r) => r.puan), [19, 17, 16, 14, 12]);
});
test("puan: tek satıra yayılmış (düz metin) tablo ve düz yazı 'N puanla' biçimi kanıtlanır; gerçek akışta satır sonu yoktur", () => {
  const duz = "Süper Lig puan durumu: 1 Galatasaray 19 2 Fenerbahçe 17 3 Trabzonspor 16 4 Beşiktaş 14 5 Başakşehir 12 6 Samsunspor 11";
  const k = pu({ organizasyon: "Süper Lig", satirlar: SATIRLAR.slice(0, 3).map(([t, p], i) => P(i + 1, t, p)) }, duz).k;
  assert.deepEqual(k.satirlar.map((r) => r.puan), [19, 17, 16]); assert.equal(k.kismi, true, "kaynakta 4. satır var -> 'ilk 3'");
  const yazi = "Süper Lig'de Galatasaray 1. sırada, 1. Galatasaray 19 puanla, 2. Fenerbahçe 17 puanla, 3. Trabzonspor 16 puanla izliyor.";
  assert.equal(pu({ organizasyon: "Süper Lig", satirlar: SATIRLAR.slice(0, 3).map(([t, p], i) => P(i + 1, t, p)) }, yazi).k.satirlar.length, 3);
  const ing = "Premier League table: 1 Arsenal 8 6 1 1 20 8 12 19 2 Liverpool 8 5 2 1 17 9 8 17 3 Chelsea 8 5 1 2 14 9 5 16";
  const e = pu({ organizasyon: "Premier League", satirlar: [P(1, "Arsenal", 19, { oynanan: 8, averaj: 12 }), P(2, "Liverpool", 17, { oynanan: 8, averaj: 8 }), P(3, "Chelsea", 16, { oynanan: 8, averaj: 5 })] }, ing).k;
  assert.equal(e.satirlar[2].averaj, 5, "işaretsiz averaj da kabul");
});
test("puan: tablonun yalnız ilk satırları kaynakta -> kanıtlanan ilk ardışık satırlar + kismi:true ('ilk N' notu)", () => {
  const kay = "Süper Lig puan durumu:\n1. Galatasaray 19\n2. Fenerbahçe 17\n3. Trabzonspor 16\nDiğer takımların durumu haberin devamında.";
  const { k, atilanlar } = pu(HAM(5, { oynanan: undefined, averaj: undefined }), kay);
  assert.equal(k.satirlar.length, 3); assert.equal(k.kismi, true);
  assert.ok(atilanlar.some((a) => /4\. Beşiktaş/.test(a)), atilanlar.join("|"));
  assert.ok(!("oynanan" in k.satirlar[0]) && !("averaj" in k.satirlar[0]));
});
test("puan: EKSİK tablo (3'ten az kanıtlı satır) -> kart yok", () => {
  assert.equal(pu(HAM(5), "Süper Lig puan durumu:\n1. Galatasaray 19\n2. Fenerbahçe 17").k, null);
  assert.equal(pu(HAM(5), "Galatasaray ligin zirvesinde. Süper Lig'de heyecan sürüyor.").k, null);
});
test("puan: ÇELİŞKİLİ tablo — kaynakta aynı sıra+takım için iki farklı puan -> o satırda kesilir (3'ten azsa kart yok)", () => {
  const cel = "Süper Lig puan durumu:\n1. Galatasaray 19\n1. Galatasaray 16\n2. Fenerbahçe 17\n3. Trabzonspor 16";
  const r = pu(HAM(3, { oynanan: undefined, averaj: undefined }), cel);
  assert.equal(r.k, null); assert.ok(r.atilanlar.some((a) => /çelişkili puanlar/.test(a)), r.atilanlar.join("|"));
});
test("puan: TERS/YANLIŞ sıra ve puan — model sırayı değiştirmiş, puanı yanlış yazmış ya da puanlar artıyor -> kart yok", () => {
  const ters = { organizasyon: "Süper Lig", satirlar: [P(1, "Fenerbahçe", 17), P(2, "Galatasaray", 19), P(3, "Trabzonspor", 16)] };
  assert.equal(pu(ters, TABLO).k, null, "puanlar sıraya göre artıyor");
  const degisik = { organizasyon: "Süper Lig", satirlar: [P(1, "Fenerbahçe", 17), P(2, "Galatasaray", 16), P(3, "Trabzonspor", 15)] };
  const r = pu(degisik, TABLO);
  assert.equal(r.k, null); assert.ok(r.atilanlar.some((a) => /1\. Fenerbahçe/.test(a)), r.atilanlar.join("|"));
  assert.equal(pu({ organizasyon: "Süper Lig", satirlar: [P(1, "Galatasaray", 20), P(2, "Fenerbahçe", 17), P(3, "Trabzonspor", 16)] }, TABLO).k, null, "ilk satır puanı yanlış");
  assert.match(pu({ organizasyon: "Süper Lig", satirlar: [P(1, "Galatasaray", 17), P(2, "Fenerbahçe", 19), P(3, "Trabzonspor", 16)] }, TABLO).neden, /artıyor/);
  assert.match(pu({ organizasyon: "Süper Lig", satirlar: [P(2, "Fenerbahçe", 17), P(3, "Trabzonspor", 16), P(4, "Beşiktaş", 14)] }, TABLO).neden, /ardışık/);
  assert.match(pu({ organizasyon: "Süper Lig", satirlar: [P(1, "Galatasaray", 19), P(2, "Galatasaray", 17), P(3, "Trabzonspor", 16)] }, TABLO).neden, /tekrar/);
});
test("puan: 'N maçta' / 'N gol' gibi puan olmayan tek sayı puan sayılmaz (belirsiz = kanıtsız)", () => {
  const kay = "Süper Lig: 1. Galatasaray 19 maçta 2. Fenerbahçe 17 golle 3. Trabzonspor 16 haftada liderlik yarışında.";
  assert.equal(pu({ organizasyon: "Süper Lig", satirlar: [P(1, "Galatasaray", 19), P(2, "Fenerbahçe", 17), P(3, "Trabzonspor", 16)] }, kay).k, null);
});
test("puan: oynanan/averaj kanıtlanamazsa yalnız o SÜTUN düşer (puan kalır); organizasyon kaynakta yoksa kart yok", () => {
  const ham = HAM(5); ham.satirlar[2].oynanan = 9; ham.satirlar[4].averaj = 7;
  const k = pu(ham, TABLO).k;
  assert.equal(k.satirlar.length, 5); assert.ok(k.satirlar.every((r) => !("oynanan" in r) && !("averaj" in r)), "iki sütun da düştü");
  assert.deepEqual(k.satirlar.map((r) => r.puan), [19, 17, 16, 14, 12]);
  const hamO = HAM(5, { averaj: undefined }); hamO.satirlar[1].oynanan = 7;
  const k2 = pu(hamO, TABLO).k; assert.ok(k2.satirlar.every((r) => !("oynanan" in r)));
  const yok = pu({ ...HAM(5), organizasyon: "Bundesliga" }, TABLO);
  assert.equal(yok.k, null); assert.match(yok.neden, /organizasyon/);
  assert.equal(pu({ ...HAM(5), tarih_notu: "20. hafta sonrası" }, TABLO).k.tarih_notu, undefined, "kaynakta olmayan tarih notu atılır, kart kalır");
});
test("puan: negatif averaj '-3' / '−3' ve 0; 3'ten az model satırı = kart yok; 20'den fazlası 20'ye kısılır", () => {
  const kay = "La Liga tablo:\n1. Real Madrid 9 7 1 1 18-5 +13 22\n2. Barcelona 9 6 1 2 15-9 +6 19\n3. Sevilla 9 2 3 4 9-12 −3 9\n4. Getafe 9 2 2 5 8-8 0 8\n5. Cadiz 9 1 2 6 6-12 -6 5";
  const ham = { organizasyon: "La Liga", satirlar: [P(1, "Real Madrid", 22, { averaj: 13 }), P(2, "Barcelona", 19, { averaj: 6 }), P(3, "Sevilla", 9, { averaj: -3 }), P(4, "Getafe", 8, { averaj: 0 }), P(5, "Cadiz", 5, { averaj: -6 })] };
  const k = pu(ham, kay).k;
  assert.deepEqual(k.satirlar.map((r) => r.averaj), [13, 6, -3, 0, -6]);
  const pozitifIsaret = JSON.parse(JSON.stringify(ham)); pozitifIsaret.satirlar[2].averaj = 3;
  assert.ok(!("averaj" in pu(pozitifIsaret, kay).k.satirlar[0]), "negatif averaj işaretsiz yazılamaz -> sütun düştü");
  assert.equal(pu({ organizasyon: "Süper Lig", satirlar: HAM(5).satirlar.slice(0, 2) }, TABLO).k, null);
  assert.equal(pu(null, TABLO).k, null); assert.equal(pu({ organizasyon: "Süper Lig" }, TABLO).k, null);
});

// ================================================================ entegrasyon: ciktiDogrula (öncelik puan > skorlar > skor), istem, yük, hat
const ISL = "Galatasaray 2-1 Bayern Münih\nReal Madrid 3-0 Napoli\nBarcelona - Arsenal 1-1";
const KAY_UEFA = "UEFA Şampiyonlar Ligi haftası bitti. Haftanın sonuçları:\n" + ISL;
const EN_OZET = "The Champions League matchday ended with three games across Europe. Fans filled the stadiums and the atmosphere stayed friendly and calm. Players thanked supporters after the final whistle. It was a happy evening for football lovers everywhere.";
const TR_OZET = "Avrupa kupalarında hafta üç maçla sona erdi. Tribünler doldu ve ortam dostane kaldı. Oyuncular son düdükten sonra taraftarlara teşekkür etti. Futbolseverler için mutlu bir akşam oldu.";
const D = (ek = {}) => ({ uygun: true, kategori: "spor", yer: "Avrupa", en: { baslik: "Champions League matchday ends with three games", ozet: EN_OZET }, tr: { baslik: "Avrupa kupalarında hafta üç maçla bitti", ozet: TR_OZET }, ...ek });
const SKORLAR = { organizasyon: "UEFA Şampiyonlar Ligi", maclar: [M("Galatasaray", 2, "Bayern Münih", 1), M("Real Madrid", 3, "Napoli", 0), M("Barcelona", 1, "Arsenal", 1)] };

test("ciktiDogrula: spor + derleme -> haber.kart skorlar; kanıtsız skorlar haberi reddetmez; spor dışında yok sayılır", () => {
  const v = ciktiDogrula(D({ skorlar: SKORLAR }), KAY_UEFA, "Haftanın sonuçları");
  assert.equal(v.ok, true, v.neden); assert.equal(v.haber.kart.tur, "skorlar"); assert.equal(v.haber.kart.maclar.length, 3);
  const bos = ciktiDogrula(D({ skorlar: { maclar: [M("Inter", 1, "Milan", 0), M("Roma", 2, "Lazio", 1)] } }), KAY_UEFA, "x");
  assert.equal(bos.ok, true); assert.ok(!("kart" in bos.haber));
  const dis = ciktiDogrula(D({ kategori: "iyilik", skorlar: SKORLAR }), KAY_UEFA, "x");
  assert.equal(dis.ok, true); assert.ok(!("kart" in dis.haber));
});
test("ciktiDogrula: tek kart önceliği — puan geçerliyse puan, değilse skorlar, değilse skor", () => {
  const kay = KAY_UEFA + "\nSüper Lig puan durumu:\n1. Galatasaray 19\n2. Fenerbahçe 17\n3. Trabzonspor 16";
  const puan = { organizasyon: "Süper Lig", satirlar: [P(1, "Galatasaray", 19), P(2, "Fenerbahçe", 17), P(3, "Trabzonspor", 16)] };
  assert.equal(ciktiDogrula(D({ skorlar: SKORLAR, puan }), kay, "x").haber.kart.tur, "puan");
  assert.equal(ciktiDogrula(D({ skorlar: SKORLAR, puan: { ...puan, satirlar: [P(1, "Galatasaray", 25), P(2, "Fenerbahçe", 17), P(3, "Trabzonspor", 16)] } }), kay, "x").haber.kart.tur, "skorlar");
  const tek = "Galatasaray beat Bayern Münih 2-1 on Tuesday night in Istanbul.";
  const adli = { en: { baslik: "Galatasaray beats Bayern Münih", ozet: EN_OZET + " Galatasaray and Bayern Münih shook hands." }, tr: { baslik: "Galatasaray, Bayern Münih'i yendi", ozet: TR_OZET + " Galatasaray ile Bayern Münih el sıkıştı." } };
  assert.equal(ciktiDogrula(D({ ...adli, skor: M("Galatasaray", 2, "Bayern Münih", 1), skorlar: { maclar: [M("Inter", 1, "Milan", 0)] } }), tek, "x").haber.kart.tur, "skor", "skorlar kanıtsızsa tek maç denenir");
});
test("istem: skorlar ve puan yönergeleri + JSON şablonu; yük kartı taşır (skorlar, puan)", () => {
  assert.match(ISTEM, /SKORLAR \(isteğe bağlı/); assert.match(ISTEM, /PUAN \(isteğe bağlı/); assert.match(ISTEM, /yanlış puan tablosu tablosuzluktan çok daha kötüdür/);
  assert.match(ISTEM, /"skorlar": \{\.\.\.\}/); assert.match(ISTEM, /"puan": \{\.\.\.\}/); assert.match(ISTEM, /SKOR \(isteğe bağlı/);
  const h = { id: "habc", tr: { baslik: "t", ozet: "o" }, en: { baslik: "e", ozet: "o" }, kategori: "spor", yer: "Dünya", kaynak: "k", link: "https://a.b/c", zaman: "2026-10-14T08:00:00Z", model: "m" };
  const kart = { tur: "skorlar", maclar: SKORLAR.maclar.slice(0, 2) };
  assert.deepEqual(yayinYuku({ ...h, kart }, "ab".repeat(32), null).haber.kart, kart);
});

const SIMDI = Date.parse("2026-10-14T12:00:00Z");
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, sonOkuma: false, ...ek });
function sahteBulut() {
  const k = { yayinlar: [], isaretler: [] };
  return { k, bilinenler: async () => new Map(), isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } };
}
const aday = (baslik, ozet, id) => ({ baslik, ozet, link: `https://www.goodnewsnetwork.org/h/${id}`, kaynak: "goodnewsnetwork.org", dil: "en", zaman: "2026-10-14T08:00:00Z" });
const UZUN = " The matchday was calm and friendly from the first minute to the last one. Supporters stayed in the stands until the final whistle to cheer the players.";
async function turla(modelCevap, adayNesne, ek = {}) {
  const bulut = sahteBulut(), url = [];
  const fetchFn = async (u) => { url.push(String(u)); return { ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}), text: async () => "" }; };
  const model = { yaz: async () => ({ metin: JSON.stringify(modelCevap), engellendi: "", saglayici: "test", model: "m" }) };
  const o = await turCalistir({ ayar: ayar({ gorselsizYayin: false, ...ek }), kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [adayNesne], hatalar: [] } });
  return { o, bulut, url };
}

test("tur: skorlar kartlı haberde görsel YİNE aranır (kart fotoğrafın altına gelir); görsel bulunamazsa kartın kendisi görsel sayılır -> görselsiz kuyruğa/ret'e girmez; özet skorKart=tek:0,liste:1,puan:0", async () => {
  const a = aday("Champions League matchday results", "Galatasaray 2-1 Bayern Münih\nReal Madrid 3-0 Napoli\nBarcelona - Arsenal 1-1\n" + UZUN.repeat(2), "liste1");
  const { o, bulut, url } = await turla(D({ skorlar: SKORLAR, gorsel_arama: "football stadium", gorsel_ozne: { ad: "Galatasaray", tur: "kurum" } }), a);
  assert.equal(o.yayinlanan, 1, JSON.stringify(bulut.k.isaretler));
  assert.equal(bulut.k.yayinlar[0].h.kart.tur, "skorlar"); assert.equal(bulut.k.yayinlar[0].h.kart.maclar.length, 3);
  assert.ok(url.some((u) => /wikimedia|wikidata|pixabay|pexels|openverse/.test(u)), "görsel araması yapılmalı: " + url.join(","));
  assert.equal(o.skorKart, 1); assert.deepEqual(o.skorKartTur, { tek: 0, liste: 1, puan: 0 }); assert.equal(o.gorselsiz, 0);
  assert.match(ozetSatiri(o), / skorKart=tek:0,liste:1,puan:0/);
});
test("tur: puan kartlı haber yayınlanır; özet skorKart=tek:0,liste:0,puan:1; tek maç kartı eski davranış (görsel aranmaz, tek:1)", async () => {
  const kayit = "Super Lig table after week 8:\n1. Galatasaray 8 6 1 1 20-8 +12 19\n2. Fenerbahce 8 5 2 1 17-9 +8 17\n3. Trabzonspor 8 5 1 2 14-9 +5 16\n";
  const puanHam = { organizasyon: "Super Lig", satirlar: [P(1, "Galatasaray", 19, { oynanan: 8, averaj: 12 }), P(2, "Fenerbahce", 17, { oynanan: 8, averaj: 8 }), P(3, "Trabzonspor", 16, { oynanan: 8, averaj: 5 })] };
  const { o, bulut } = await turla(D({ puan: puanHam, kategori: "spor" }), aday("Super Lig standings after week 8", kayit + UZUN.repeat(2), "puan1"));
  assert.equal(o.yayinlanan, 1, JSON.stringify(bulut.k.isaretler));
  assert.equal(bulut.k.yayinlar[0].h.kart.tur, "puan"); assert.equal(bulut.k.yayinlar[0].h.kart.satirlar.length, 3);
  assert.deepEqual(o.skorKartTur, { tek: 0, liste: 0, puan: 1 }); assert.match(ozetSatiri(o), / skorKart=tek:0,liste:0,puan:1/);
});
test("tur: kart yoksa özet satırında skorKart görünmez; yalnız toplam verilmişse (eski çağrı) tek:N,liste:0,puan:0 yazılır", () => {
  const o = { aday: 0, yeniAday: 0, onElemeGecen: 0, modelCagri: 0, red: {}, elenen: 0, bekleyenGorsel: 0, bekleyenKaynak: 0, yayinlanan: 0, durus: "tamam", skorKart: 0 };
  assert.doesNotMatch(ozetSatiri(o), /skorKart/);
  assert.match(ozetSatiri({ ...o, skorKart: 2 }), / skorKart=tek:2,liste:0,puan:0/);
});
