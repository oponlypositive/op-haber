// hat_durum istemcisi (lib/bulut.mjs durumOku / durumYaz; gecis-020): istek biçimi, yanıt ayrıştırma, hata/eski işlev davranışı. Ağ yok (sahte fetch).
// Müfredat tarafı (imleç + plan, geriye uyum): test/mufredat.test.mjs sonundaki "hat_durum:" testleri.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bulutKur, DURUM_ANAHTAR_RE } from "../lib/bulut.mjs";

const URL_FN = "https://x.supabase.co/functions/v1/haber-yukle";
function kur(yanitla) {
  const istekler = [];
  const fetchFn = async (url, init) => {
    const govde = JSON.parse(init.body);
    istekler.push({ url, govde, anahtar: init.headers["x-haber-anahtari"] });
    const r = yanitla(govde, istekler.length);
    return { ok: r.status === undefined || r.status < 400, status: r.status ?? 200, json: async () => r.json ?? {} };
  };
  return { istekler, bulut: bulutKur({ fnUrl: URL_FN, anahtar: "GIZLI", fetchFn, bekleFn: async () => {} }) };
}

test("durumOku: islem + anahtarlar gider, yanıt Map olur, kayıtsız anahtar haritada yok, gizli anahtar başlıkta", async () => {
  const { bulut, istekler } = kur(() => ({ json: { durum: { "mufredat:op_felsefe:imlec": { n: 4 } } } }));
  const h = await bulut.durumOku(["mufredat:op_felsefe:imlec", "mufredat:op_felsefe:plan", "mufredat:op_felsefe:imlec"]);
  assert.ok(h instanceof Map); assert.deepEqual([...h], [["mufredat:op_felsefe:imlec", { n: 4 }]]);
  assert.equal(istekler.length, 1); assert.equal(istekler[0].url, URL_FN); assert.equal(istekler[0].anahtar, "GIZLI");
  assert.deepEqual(istekler[0].govde, { islem: "durum_oku", anahtarlar: ["mufredat:op_felsefe:imlec", "mufredat:op_felsefe:plan"] }, "tekilleştirilir");
});
test("durumOku: 50'den fazla anahtar 50'lik parçalara bölünür", async () => {
  const { bulut, istekler } = kur((g) => ({ json: { durum: Object.fromEntries(g.anahtarlar.map((a) => [a, { n: 1 }])) } }));
  const liste = Array.from({ length: 120 }, (_, i) => `mufredat:h${i}:imlec`);
  const h = await bulut.durumOku(liste);
  assert.equal(h.size, 120); assert.deepEqual(istekler.map((i) => i.govde.anahtarlar.length), [50, 50, 20]);
});
test("durumYaz: islem + anahtar + deger gider, true döner", async () => {
  const { bulut, istekler } = kur(() => ({ json: { yazildi: 1 } }));
  assert.equal(await bulut.durumYaz("mufredat:op_felsefe:imlec", { n: 5, z: "2026-10-14T00:00:00Z" }), true);
  assert.deepEqual(istekler[0].govde, { islem: "durum_yaz", anahtar: "mufredat:op_felsefe:imlec", deger: { n: 5, z: "2026-10-14T00:00:00Z" } });
});
test("anahtar biçimi: sunucu ile aynı kural; geçersiz anahtar ağa çıkmaz", async () => {
  for (const iyi of ["abc", "mufredat:op_felsefe:imlec", "a_b-c:1", "x".repeat(80)]) assert.match(iyi, DURUM_ANAHTAR_RE);
  for (const kotu of ["ab", "Mufredat:x", "a b c", "çay", "x".repeat(81), "a/b/c", ""]) assert.doesNotMatch(kotu, DURUM_ANAHTAR_RE);
  const { bulut, istekler } = kur(() => ({ json: {} }));
  await assert.rejects(bulut.durumOku(["Büyük"]), /geçersiz/); await assert.rejects(bulut.durumYaz("ab", { n: 1 }), /geçersiz/);
  assert.equal(istekler.length, 0);
});
test("eski işlev (HTTP 400): durumOku hata verir ve bu koşuda uç yok sayılır — sonraki çağrılar ağa çıkmadan hata verir; durumYaz da", async () => {
  const { bulut, istekler } = kur(() => ({ status: 400 }));
  await assert.rejects(bulut.durumOku(["mufredat:a:imlec"]), /HTTP 400/);
  assert.equal(istekler.length, 1, "4xx tekrar denenmez");
  await assert.rejects(bulut.durumOku(["mufredat:b:imlec"]), /ucu yok/); await assert.rejects(bulut.durumYaz("mufredat:b:imlec", { n: 1 }), /ucu yok/);
  assert.equal(istekler.length, 1);
});
test("durumYaz 4xx (ör. değer çok büyük) ucu 'yok' saymaz; 500 tekrar denenir; ağ hatası Error", async () => {
  let n = 0;
  const { bulut } = kur((g) => { n++; return g.islem === "durum_yaz" && n === 1 ? { status: 400 } : { json: { durum: {} } }; });
  await assert.rejects(bulut.durumYaz("mufredat:a:plan", { v: 1 }), /HTTP 400/);
  assert.ok((await bulut.durumOku(["mufredat:a:plan"])) instanceof Map, "okuma hâlâ çalışır");
  let say = 0;
  const { bulut: b2 } = kur((g) => { say++; return say < 3 ? { status: 500 } : { json: { yazildi: 1 } }; });
  assert.equal(await b2.durumYaz("mufredat:a:plan", { v: 1 }), true); assert.equal(say, 3);
  const b3 = bulutKur({ fnUrl: URL_FN, anahtar: "G", fetchFn: async () => { throw new Error("ağ yok"); }, bekleFn: async () => {} });
  await assert.rejects(b3.durumOku(["mufredat:a:plan"]), /ağ/);
});
test("beklenmeyen yanıt biçimi (eski işlev 200 döndürürse): durumOku Error — çağıran haber_gorulen'e düşer", async () => {
  const { bulut } = kur(() => ({ json: { kayitlar: [] } }));
  await assert.rejects(bulut.durumOku(["mufredat:a:imlec"]), /yanıtı geçersiz/);
});
