// Hat entegrasyonu (ağsız): alan kotası, hazır kurum görseli, özel işlerin tura eklenmesi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ayarOku } from "../lib/ayar.mjs";
import { turCalistir } from "../hat.mjs";

const SIMDI = Date.parse("2026-10-13T12:00:00Z");
const EN = "Researchers at the observatory released a new image of a distant galaxy cluster this week. The picture combines many hours of exposure collected over several nights. " +
  "Astronomers say the cluster contains hundreds of galaxies bound together by gravity. The team plans further observations to measure the cluster mass more precisely. It is a good example of patient and careful work.";
const TR = "Gözlemevindeki araştırmacılar bu hafta uzak bir gökada kümesinin yeni görüntüsünü yayımladı. Görüntü, birkaç gece boyunca toplanan çok saatlik pozlamaları bir araya getiriyor. " +
  "Gökbilimciler kümenin kütle çekimiyle birbirine bağlı yüzlerce gökada içerdiğini söylüyor. Ekip kütleyi daha hassas ölçmek için yeni gözlemler planlıyor. Bu, sabırlı ve özenli çalışmanın güzel bir örneği.";
const YANIT = JSON.stringify({ uygun: true, kategori: "bilim", yer: "Dünya", en: { baslik: "A new image of a distant galaxy cluster", ozet: EN }, tr: { baslik: "Uzak bir gökada kümesinin yeni görüntüsü", ozet: TR } });
const KAYNAK = "Astronomers shared a fresh picture of a faraway cluster of galaxies. It stacks long exposures from many nights and the follow up work will refine the mass of the group considerably for later papers. ".repeat(2);
const ayar = (ek = {}) => ({ ...ayarOku({}, []), geminiAnahtar: "k", geminiBeklemeMs: 0, ozelAcik: false, ...ek });
const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const fetchFn = async (url) => String(url).startsWith("https://cdn.eso.org/")
  ? { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer }
  : { ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) };
const aday = (ek = {}) => ({ baslik: "Telescope finds new galaxy cluster", ozet: KAYNAK, link: "https://www.eso.org/public/news/eso2613/", kaynak: "eso.org", dil: "en", zaman: "2026-10-13T08:00:00Z", alan: "gokbilim", kaynakGuvenilir: true, ...ek });
function bulutKur(kota = new Map()) {
  const k = { yayin: [], isaret: [] };
  return { k, kota: async () => kota, bilinenler: async () => new Map(), isaretle: async (l) => { k.isaret.push(...l); return {}; }, yayinla: async (h, o, g) => { k.yayin.push({ h, g }); return { durum: "eklendi" }; } };
}
const calis = (bulut, a, model) => turCalistir({ ayar: a, kaynaklar: {}, bulut, model, fetchFn, bekleFn: async () => {}, simdi: () => SIMDI, log: () => {}, tarama: { adaylar: [a_ek], hatalar: [] } });
let a_ek;

test("alan kotası dolu: aday işaretlenmeden atlanır, model çağrılmaz", async () => {
  a_ek = aday();
  let cagri = 0;
  const bulut = bulutKur(new Map([["gokbilim", { son24: 5, son7g: 5, sonZaman: "2026-10-13T10:00:00Z" }]]));
  const o = await calis(bulut, ayar(), { yaz: async () => { cagri++; return { metin: YANIT }; } });
  assert.equal(cagri, 0); assert.equal(o.yayinlanan, 0); assert.equal(bulut.k.yayin.length, 0);
  assert.ok(!bulut.k.isaret.some((x) => /kota/.test(x.neden || "")));
});

test("alan kotası açık + hazır kurum görseli: görsel arama yapılmadan kurum görseli (CC BY 4.0) kullanılır, kategori gokbilim", async () => {
  a_ek = aday({ hazirGorsel: { url: "https://cdn.eso.org/images/screen/eso2613a.jpg", sahibi: "ESO", lisans: "CC BY 4.0", lisans_url: "https://creativecommons.org/licenses/by/4.0/" } });
  const bulut = bulutKur();
  let vl = 0;
  const model = { yaz: async (s, g, o) => { if (o?.resim) vl++; return { metin: YANIT }; } };
  const o = await calis(bulut, ayar(), model);
  assert.equal(o.yayinlanan, 1); assert.equal(vl, 0);
  const y = bulut.k.yayin[0];
  assert.equal(y.h.kategori, "gokbilim"); assert.equal(y.g.gorsel.lisans, "CC BY 4.0"); assert.equal(y.g.gorsel.sahibi, "ESO");
  assert.equal(y.g.gorsel.kaynak_url, "https://www.eso.org/public/news/eso2613/");
  assert.deepEqual(o.alanYayin, { gokbilim: 1 });
});

test("kota bilmeyen eski bulut sözleşmesi: kota uygulanmaz, özel işler çalışmaz", async () => {
  a_ek = aday();
  const bulut = bulutKur(); delete bulut.kota;
  const o = await calis(bulut, ayar({ ozelAcik: true }), { yaz: async () => ({ metin: YANIT }) });
  assert.equal(o.ozel, null);
});
