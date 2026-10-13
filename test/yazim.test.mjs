import { test } from "node:test";
import assert from "node:assert/strict";
import { ciktiDogrula, cumleSay, dilUygun, rakamlar } from "../lib/dogrula.mjs";
import { KotaDoldu, geminiCagir, jsonAyikla, modelKur } from "../lib/model.mjs";
import { haberYaz } from "../lib/yaz.mjs";
import { lisansOk, sec, vlDegerlendir, gorselBilgi, yasakliMi } from "../lib/gorsel.mjs";

const KAYNAK = "Volunteers in the town of Lakeside planted 5,000 trees along the river over three weekends. The group of neighbors worked with local schools. " +
  "The new trees will shade a footpath used by many families, and the park now has a small tool library for anyone who wants to join. ".repeat(2);
const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. " +
  "The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. " +
  "It is a simple example of what a community can do together when people share the work and the time.";
const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. " +
  "Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. " +
  "Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
const iyi = () => ({ uygun: true, kategori: "doga", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR } });

test("çıktı doğrulama: geçerli çıktı kabul", () => {
  const v = ciktiDogrula(iyi(), KAYNAK, "Volunteers plant trees");
  assert.equal(v.ok, true, v.neden);
  assert.equal(v.haber.kategori, "doga");
});

test("rakam koruması: kaynakta olmayan rakam ret", () => {
  const d = iyi(); d.tr.ozet = d.tr.ozet.replace("5000", "7500");
  assert.match(ciktiDogrula(d, KAYNAK).neden, /rakam/);
  assert.deepEqual([...rakamlar("5,000 trees and 3.5 m in 2026")].sort(), ["2026", "35", "5000"]);
});

test("cümle sayısı, bağlantı, markdown, ünlem, emoji, dil", () => {
  const d1 = iyi(); d1.en.ozet = "Only one sentence here about trees.";
  assert.match(ciktiDogrula(d1, KAYNAK).neden, /cümle/);
  const d2 = iyi(); d2.en.ozet += " See https://ornek.com for more.";
  assert.match(ciktiDogrula(d2, KAYNAK).neden, /bağlantı/);
  const d3 = iyi(); d3.tr.ozet += " Harika!";
  assert.match(ciktiDogrula(d3, KAYNAK).neden, /ünlem/);
  const d4 = iyi(); d4.tr.ozet = EN;      // TR alanına İngilizce
  assert.match(ciktiDogrula(d4, KAYNAK).neden, /dil/);
  assert.equal(cumleSay("Bir. İki cümle burada var. Üç cümle de burada."), 3);
  assert.equal(dilUygun(TR, "tr"), true);
  assert.equal(dilUygun(TR, "en"), false);
});

test("kaynaktan kopya ve uygun=false", () => {
  const d = iyi(); d.en.ozet = KAYNAK.slice(0, 200) + ". " + EN;
  assert.match(ciktiDogrula(d, KAYNAK).neden, /kopya|cümle|rakam/);
  const u = { uygun: false, red_nedeni: "suç" };
  assert.equal(ciktiDogrula(u, KAYNAK).ok, false);
});

test("ikinci filtre / C3 kapısı: hassas çıktı ret", () => {
  const d = iyi(); d.en.ozet = d.en.ozet.replace("neighbors", "soldiers").replace("A group of", "A group of soldiers and");
  assert.equal(ciktiDogrula(d, KAYNAK, "x").ok, false);
});

test("jsonAyikla: çit, dış metin, sondaki virgül, bozuk", () => {
  assert.deepEqual(jsonAyikla('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(jsonAyikla('Tamam: {"a":[1,2,],} bitti'), { a: [1, 2] });
  assert.equal(jsonAyikla("{bozuk"), null);
  assert.equal(jsonAyikla(""), null);
});

const yanitla = (govde, status = 200) => ({ ok: status < 300, status, json: async () => govde });
const gemYanit = (metin) => yanitla({ candidates: [{ content: { parts: [{ text: metin }] }, finishReason: "STOP" }] });

test("Gemini: istek biçimi + yanıt ayrıştırma", async () => {
  let gelen;
  const fetchFn = async (url, init) => { gelen = { url, init }; return gemYanit('{"uygun":true}'); };
  const r = await geminiCagir({ anahtar: "k", model: "m-1", sistem: "S", girdi: "G", fetchFn, bekleFn: async () => {} });
  assert.equal(r.metin, '{"uygun":true}');
  assert.match(gelen.url, /models\/m-1:generateContent$/);
  assert.equal(gelen.init.headers["x-goog-api-key"], "k");
  assert.doesNotMatch(gelen.url, /key=/);
  const g = JSON.parse(gelen.init.body);
  assert.equal(g.generationConfig.responseMimeType, "application/json");
  assert.equal(g.systemInstruction.parts[0].text, "S");
});

test("Gemini: 429 üstel bekleme sonra KotaDoldu; 5xx sonra başarı", async () => {
  const bekler = [];
  await assert.rejects(geminiCagir({ anahtar: "k", model: "m", girdi: "g", fetchFn: async () => yanitla({}, 429), bekleFn: async (ms) => bekler.push(ms) }), KotaDoldu);
  assert.deepEqual(bekler, [2000, 6000]);
  let n = 0;
  const r = await geminiCagir({ anahtar: "k", model: "m", girdi: "g", fetchFn: async () => (++n < 2 ? yanitla({}, 503) : gemYanit("{}")), bekleFn: async () => {} });
  assert.equal(r.metin, "{}");
});

test("Gemini: güvenlik engeli boş metin + engellendi", async () => {
  const r = await geminiCagir({ anahtar: "k", model: "m", girdi: "g", fetchFn: async () => yanitla({ promptFeedback: { blockReason: "SAFETY" } }), bekleFn: async () => {} });
  assert.equal(r.engellendi, "SAFETY");
});

test("haberYaz: bozuk JSON'dan sonra düzgün yanıt; kalıcı ret tekrar denemez", async () => {
  const yanitlar = ["bozuk {", JSON.stringify(iyi())];
  let n = 0;
  const model = { yaz: async () => ({ metin: yanitlar[n++], engellendi: "", saglayici: "taklit" }) };
  const r = await haberYaz(model, { baslik: "Volunteers plant trees", ozet: "", dil: "en" }, KAYNAK);
  assert.equal(r.durum, "ok");
  assert.equal(n, 2);
  let m = 0;
  const ret = { yaz: async () => { m++; return { metin: '{"uygun":false}', engellendi: "" }; } };
  assert.equal((await haberYaz(ret, { baslik: "x", ozet: "", dil: "en" }, KAYNAK)).durum, "ret");
  assert.equal(m, 1);
  assert.equal((await haberYaz(ret, { baslik: "x", ozet: "kısa", dil: "en" }, "")).neden, "kaynak metni yetersiz");
});

test("modelKur: Gemini kotası dolunca yedek yoksa KotaDoldu, varsa yedek", async () => {
  const f429 = async () => yanitla({}, 429);
  await assert.rejects(modelKur({ geminiAnahtar: "k", geminiModel: "m" }, { fetchFn: f429, bekleFn: async () => {} }).yaz("s", "g"), KotaDoldu);
  const f = async (url) => (/cloudflare/.test(url) ? yanitla({ result: { response: "{}" } }) : yanitla({}, 429));
  const r = await modelKur({ geminiAnahtar: "k", geminiModel: "m", yedekModel: "@cf/x", cfHesap: "h", cfBelirtec: "t" }, { fetchFn: f, bekleFn: async () => {} }).yaz("s", "g");
  assert.equal(r.saglayici, "@cf/x");
});

test("lisans beyaz listesi", () => {
  for (const l of ["CC0 1.0", "CC BY 4.0", "CC BY-SA 3.0", "Public domain", "Pixabay Content License"]) assert.equal(lisansOk(l), true, l);
  for (const l of ["CC BY-NC 4.0", "CC BY-ND 2.0", "CC BY-NC-SA 4.0", "All rights reserved", "", "Pexels License"]) assert.equal(lisansOk(l), false, l);
});

test("görsel eleme: lisans, yasak kelime, konu uyumu", () => {
  const a = (metin, lisans = "CC BY 4.0", w = 1280) => ({ metin, lisans, w, h: 800, yaratici: "X", url: metin });
  const secilen = sec([a("Volunteers planting trees in park"), a("Trees in park", "CC BY-NC 4.0"), a("Trees park protest crowd"), a("Cars on road")], ["trees", "park"], 5);
  assert.deepEqual(secilen.map((x) => x.url), ["Volunteers planting trees in park"]);
  assert.equal(yasakliMi("a warm award"), false);
  assert.equal(yasakliMi("war memorial"), true);
});

test("görsel kontrol yanıtı ve başlık okuma", () => {
  assert.equal(vlDegerlendir("bozuk").ok, false);
  assert.equal(vlDegerlendir('{"konuya_uygun":true}').ok, false);
  const png = new Uint8Array(33); png.set([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 5, 0, 0, 0, 3, 0x20]);
  assert.deepEqual(gorselBilgi(png), { tur: "image/png", w: 1280, h: 800 });
  assert.equal(gorselBilgi(new Uint8Array([1, 2, 3, 4, 5])), null);
});
