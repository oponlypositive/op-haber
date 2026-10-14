// Armasız kart SÖZLEŞMESİ — üç gerçekleme AYNI sonucu vermeli: (1) functions/_shared/kart.mjs (haber-yukle, bulut), (2) op/app/server.js haberKarti (yerel eşdeğer), (3) hat çıktısı (skor_kart.mjs) bu iki doğrulamadan DEĞİŞMEDEN geçmeli.
// SQL tarafı (public.kart_gecerli, gecis-020) aynı kuralları uygular; Postgres bu ortamda yok: kuralların listesi aşağıdaki "olumsuz" tablosunda SQL'in de reddetmesi gerekenleri belgeler.
// Yayın deposunda (yalnız haber-hatti) ../functions ve ../../../server.js yoktur: bu testler `.catch(() => null)` ile atlanır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { denetle } from "../lib/moderasyon.mjs";
import { puanKartiDogrula, skorlarKartiDogrula } from "../lib/skor_kart.mjs";

const KART = await import("../../functions/_shared/kart.mjs").catch(() => null);
const SUNUCU = (() => { try { return createRequire(import.meta.url)("../../../server.js"); } catch { return null; } })();

const m = (a, s1, b, s2) => ({ taraf1: a, skor1: s1, taraf2: b, skor2: s2 });
const pr = (sira, takim, puan, ek = {}) => ({ sira, takim, puan, ...ek });
const OLUMLU = {
  "skor": { tur: "skor", taraf1: "Mahalle Takımı", taraf2: "Kuzey Okulu", skor1: 99, skor2: 80, organizasyon: "Mahalle Kupası", asama: "Final" },
  "skorlar (2)": { tur: "skorlar", maclar: [m("A Takımı", 2, "B Takımı", 1), m("C Takımı", 0, "D Takımı", 0)] },
  "skorlar (12, organizasyon+aşama)": { tur: "skorlar", organizasyon: "Yaz Ligi", asama: "3. hafta", maclar: Array.from({ length: 12 }, (_, i) => m(`Ev ${String.fromCharCode(65 + i)} Spor`, i, `Dış ${String.fromCharCode(65 + i)} Spor`, 1)) },
  "puan (tam sütunlu)": { tur: "puan", organizasyon: "Süper Lig", tarih_notu: "8. hafta", satirlar: [pr(1, "Galatasaray", 19, { oynanan: 8, averaj: 12 }), pr(2, "Fenerbahçe", 17, { oynanan: 8, averaj: 8 }), pr(3, "Trabzonspor", 16, { oynanan: 8, averaj: -5 })] },
  "puan (yalnız puan, kismi, eşit puan)": { tur: "puan", organizasyon: "Süper Lig", kismi: true, satirlar: [pr(1, "Galatasaray", 19), pr(2, "Fenerbahçe", 19), pr(3, "Trabzonspor", 16)] },
  "puan (20 satır)": { tur: "puan", organizasyon: "Süper Lig", satirlar: Array.from({ length: 20 }, (_, i) => pr(i + 1, `Takım ${String.fromCharCode(65 + i)}`, 60 - i * 2)) },
};
const kopya = (o) => JSON.parse(JSON.stringify(o));
const OLUMSUZ = {
  "bilinmeyen tür": { tur: "arma", taraf1: "A Takımı", taraf2: "B Takımı", skor1: 1, skor2: 0 },
  "skor aralık": { ...OLUMLU.skor, skor1: 251 }, "skor kesirli": { ...OLUMLU.skor, skor2: 1.5 }, "skor aynı ad": { ...OLUMLU.skor, taraf2: "mahalle takımı" },
  "skorlar 1 maç": { tur: "skorlar", maclar: [m("A Takımı", 2, "B Takımı", 1)] },
  "skorlar 13 maç": { tur: "skorlar", maclar: Array.from({ length: 13 }, (_, i) => m(`Ev ${String.fromCharCode(65 + i)} Spor`, 1, `Dış ${String.fromCharCode(65 + i)} Spor`, 0)) },
  "skorlar aynı eşleşme iki kez": { tur: "skorlar", maclar: [m("A Takımı", 2, "B Takımı", 1), m("B Takımı", 0, "A Takımı", 1)] },
  "skorlar bozuk maç": { tur: "skorlar", maclar: [m("A Takımı", 2, "B Takımı", 1), { taraf1: "C Takımı", taraf2: "D Takımı", skor1: "3", skor2: 0 }] },
  "skorlar maçlar dizi değil": { tur: "skorlar", maclar: "x" },
  "puan 2 satır": { tur: "puan", organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 19), pr(2, "Fenerbahçe", 17)] },
  "puan 21 satır": { tur: "puan", organizasyon: "Süper Lig", satirlar: Array.from({ length: 21 }, (_, i) => pr(i + 1, `Takım ${String.fromCharCode(65 + i)}`, 60 - i)) },
  "puan organizasyon yok": { tur: "puan", satirlar: OLUMLU["puan (yalnız puan, kismi, eşit puan)"].satirlar },
  "puan sıra atlıyor": { tur: "puan", organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 19), pr(3, "Fenerbahçe", 17), pr(4, "Trabzonspor", 16)] },
  "puan puan ARTIYOR": { tur: "puan", organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 17), pr(2, "Fenerbahçe", 19), pr(3, "Trabzonspor", 16)] },
  "puan takım tekrarı": { tur: "puan", organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 19), pr(2, "galatasaray", 17), pr(3, "Trabzonspor", 16)] },
  "puan oynanan yalnız bazı satırlarda": { tur: "puan", organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 19, { oynanan: 8 }), pr(2, "Fenerbahçe", 17), pr(3, "Trabzonspor", 16, { oynanan: 8 })] },
  "puan averaj bazı satırlarda": { tur: "puan", organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 19), pr(2, "Fenerbahçe", 17, { averaj: 2 }), pr(3, "Trabzonspor", 16)] },
  "puan puan aralık": { tur: "puan", organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 1000), pr(2, "Fenerbahçe", 17), pr(3, "Trabzonspor", 16)] },
  "yasak konulu ad": { tur: "skorlar", maclar: [m("Savaş Gençlik", 2, "Dostluk Spor", 1), m("C Takımı", 0, "D Takımı", 0)] },
  "dizi": [OLUMLU.skor], "boş": null,
};

test("sözleşme: kart.mjs olumlu örnekleri kabul eder, olumsuzları reddeder; temizlik (bilinmeyen alan atılır)", { skip: !KART && "yayın deposunda ../functions yok" }, () => {
  for (const [ad, k] of Object.entries(OLUMLU)) assert.deepEqual(KART.kartDogrula(kopya(k), denetle), kopya(k), ad);
  for (const [ad, k] of Object.entries(OLUMSUZ)) assert.equal(KART.kartDogrula(kopya(k), denetle), null, ad);
  const fazla = KART.kartDogrula({ ...OLUMLU.skor, arma: "x.png", logo: "y" }, denetle);
  assert.ok(fazla && !("arma" in fazla) && !("logo" in fazla), "arma/logo alanı sessizce atılır");
  assert.deepEqual(KART.kartDogrula({ ...OLUMLU["puan (tam sütunlu)"], satirlar: OLUMLU["puan (tam sütunlu)"].satirlar.map((r) => ({ ...r, renk: "#f00" })) }, denetle).satirlar[0], pr(1, "Galatasaray", 19, { oynanan: 8, averaj: 12 }));
  assert.ok(JSON.stringify(KART.kartDogrula(OLUMLU["puan (20 satır)"], denetle)).length < KART.KART_BAYT_UST.puan);
});
test("sözleşme: server.js haberKarti, kart.mjs ile BİREBİR aynı sonucu verir (olumlu + olumsuz tablo)", { skip: (!KART || !SUNUCU) && "kart.mjs/server.js yok" }, () => {
  assert.equal(typeof SUNUCU.haberKarti, "function");
  for (const [ad, k] of [...Object.entries(OLUMLU), ...Object.entries(OLUMSUZ)]) {
    const a = KART.kartDogrula(kopya(k), denetle), b = SUNUCU.haberKarti({ kart: kopya(k) });
    assert.deepEqual(b, a, ad);
  }
  assert.equal(SUNUCU.haberKarti({}), null); assert.equal(SUNUCU.haberKarti(null), null);
});
test("sözleşme: hat doğrulayıcılarının ürettiği kartlar sunucu doğrulamasından DEĞİŞMEDEN geçer", { skip: !KART && "yayın deposunda ../functions yok" }, () => {
  const tablo = "Süper Lig puan durumu:\n1. Galatasaray 8 6 1 1 20-8 +12 19\n2. Fenerbahçe 8 5 2 1 17-9 +8 17\n3. Trabzonspor 8 5 1 2 14-9 +5 16\n4. Beşiktaş 8 4 2 2 12-10 +2 14";
  const p = puanKartiDogrula({ organizasyon: "Süper Lig", satirlar: [pr(1, "Galatasaray", 19, { oynanan: 8, averaj: 12 }), pr(2, "Fenerbahçe", 17, { oynanan: 8, averaj: 8 }), pr(3, "Trabzonspor", 16, { oynanan: 8, averaj: 5 })] }, tablo);
  assert.ok(p); assert.deepEqual(KART.kartDogrula(kopya(p), denetle), p);
  const s = skorlarKartiDogrula({ organizasyon: "UEFA", maclar: [m("Galatasaray", 2, "Bayern Münih", 1), m("Real Madrid", 3, "Napoli", 0)] }, "UEFA haftası:\nGalatasaray 2-1 Bayern Münih\nReal Madrid 3-0 Napoli");
  assert.ok(s); assert.deepEqual(KART.kartDogrula(kopya(s), denetle), s);
  if (SUNUCU) { assert.deepEqual(SUNUCU.haberKarti({ kart: kopya(p) }), p); assert.deepEqual(SUNUCU.haberKarti({ kart: kopya(s) }), s); }
});
test("sözleşme: SQL işlev dosyaları — gecis-020 ve sema.sql aynı kart_gecerli gövdesini taşır, kısıt işleve bağlanmıştır, $$ dengelidir", async () => {
  const fs = await import("node:fs"), yol = (a) => new URL(`../../${a}`, import.meta.url);
  let g, s;
  try { g = fs.readFileSync(yol("gecis-020-hat-durum.sql"), "utf8"); s = fs.readFileSync(yol("sema.sql"), "utf8"); } catch { return; }   // yayın deposunda SQL yok
  const norm = (t) => t.replace(/\r\n/g, "\n");
  const govde = (t) => { const i = norm(t).indexOf("create or replace function public.kart_tam"); const j = norm(t).indexOf("revoke all on function public.kart_tam"); return norm(t).slice(i, j); };
  assert.ok(govde(g).length > 1500 && govde(g) === govde(s), "sema.sql ↔ gecis-020 işlev gövdeleri eşit");
  for (const t of [g, s]) { assert.equal((t.match(/\$\$/g) || []).length % 2, 0); assert.match(t, /constraint kart_kuralli check \(kart is null or coalesce\(haber and public\.kart_gecerli\(kart\), false\)\)/); }
  assert.match(g, /create table if not exists public\.hat_durum/); assert.match(g, /anahtar ~ '\^\[a-z0-9_:-\]\{3,80\}\$'/); assert.match(g, /octet_length\(deger::text\) <= 65536/);
  assert.match(g, /alter table public\.hat_durum enable row level security/); assert.doesNotMatch(g, /create policy/); assert.doesNotMatch(g, /haber_gorulen_temizle|delete from public\.hat_durum/, "temizlik YOK");
  assert.ok(s.indexOf("create or replace function public.kart_gecerli") < s.indexOf("create table if not exists public.posts"), "işlev posts tablosundan önce tanımlı");
});
