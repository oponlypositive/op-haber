// OP huzur/yaşam müfredatları (op_meditasyon, op_yoga, op_gelisim, op_saglikli, op_hareket): şema, benzersiz id, yol/ad uzunlukları,
// yasak terim taraması (konu_yasak + moderasyon + laik/dinî terimler + sağlık vaadi), sabit metin Türkçe denetimi, doğrulama kaydı. Ağ yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ABARTI, ALKOL, BIRINCI_TEKIL, KUMAR_PARA, SAGLIK, SIDDET, TARIH_YASAK, TIKLAMA_TUZAGI } from "../lib/konu_yasak.mjs";
import { denetle } from "../lib/moderasyon.mjs";
import { turkceDenetle } from "../lib/turkce_denetim.mjs";

const HESAPLAR = { op_meditasyon: ["huzur", 30], op_yoga: ["huzur", 30], op_gelisim: ["gelisim", 30], op_saglikli: ["yasam", 25], op_hareket: ["yasam", 25] };
const M = {};
for (const h of Object.keys(HESAPLAR)) M[h] = (await import(`../lib/mufredat/${h}.mjs`)).default;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Ek yasaklar: dinî/spiritüel terimler, tıbbi/vaat dili, para/kariyer pazarlaması (ek olarak konu_yasak kümeleri)
const SPIRITUEL = /(?<![\p{L}])(?:çakra\p{L}*|chakra\p{L}*|mantra\p{L}*|kundalini|enerji alan\p{L}*|energy field\p{L}*|ruhani\p{L}*|ruhsal\p{L}*|spiritüel\p{L}*|spiritual\p{L}*|ibadet\p{L}*|dua|duası|duaları|tanrı\p{L}*|tanri\p{L}*|nirvana|aydınlanma|karma|reiki|aura|prana|pranayama|kapalabhati|bhastrika)(?![\p{L}])/iu;
// VAAT: odak_tr yazara yönergedir ("kilo vaadi yok" gibi olumsuz yönergeler orada serbest); başlık, açıklama ve sabit metinde geçmemeli
const VAAT = /(?<![\p{L}])(?:hiperventilasyon|hyperventilat\p{L}*|nefes tut\p{L}*|breath[- ]?hold\p{L}*|zengin ol\p{L}*|get rich|kariyer\p{L}*|career\p{L}*|garanti\p{L}*|guarantee\p{L}*|bağışıklığı güçlendir\p{L}*|boost immun\p{L}*|detoks\p{L}*|detox\p{L}*|takviye\p{L}*|supplement\p{L}*|vitamin\p{L}*|diyet\p{L}*|diet\p{L}*|kilo\p{L}*|weight)(?![\p{L}])/iu;
const KURALLAR = { SAGLIK, ALKOL, KUMAR_PARA, SIDDET, TARIH_YASAK, ABARTI, TIKLAMA_TUZAGI, BIRINCI_TEKIL, SPIRITUEL, VAAT };

function metinler(m) {
  const l = [];
  for (const s of m.seriler) {
    l.push(["seri.ad", s.yol.join(" / ")], ["seri.aciklama_tr", s.aciklama_tr], ["seri.aciklama_en", s.aciklama_en]);
    for (const d of s.dersler) {
      l.push([`${d.id}.baslik_tr`, d.baslik_tr], [`${d.id}.baslik_en`, d.baslik_en], [`${d.id}.odak_tr`, d.odak_tr]);
      if (d.sabit) l.push([`${d.id}.sabit.tr`, d.sabit.tr], [`${d.id}.sabit.en`, d.sabit.en]);
    }
  }
  return l;
}

for (const [h, [kategori, enAz]] of Object.entries(HESAPLAR)) {
  const m = M[h];
  const dersler = m.seriler.flatMap((s) => s.dersler);
  test(`${h}: şema ve sayılar`, () => {
    assert.equal(m.hesap, h);
    assert.equal(m.kategori, kategori);
    assert.ok(Number.isInteger(m.gunlukUst) && m.gunlukUst >= 1 && m.gunlukUst <= 5, "gunlukUst");
    assert.ok(Array.isArray(m.seriler) && m.seriler.length >= 4, "en az 4 seri");
    assert.ok(dersler.length >= enAz, `ders sayısı ${dersler.length} < ${enAz}`);
    const ids = new Set();
    for (const s of m.seriler) {
      assert.ok(Array.isArray(s.yol) && s.yol.length >= 1 && s.yol.length <= 3, "yol uzunluğu 1-3");
      for (const a of s.yol) assert.ok(typeof a === "string" && a.length >= 2 && a.length <= 60, `seri adı: ${a}`);
      assert.ok(s.aciklama_tr?.length > 10 && s.aciklama_en?.length > 10, "seri açıklamaları");
      assert.ok(s.dersler.length >= 3, `seri en az 3 ders: ${s.yol[0]}`);
      for (const d of s.dersler) {
        assert.match(d.id, ID, `id biçimi: ${d.id}`);
        assert.ok(!ids.has(d.id), `tekrar eden id: ${d.id}`); ids.add(d.id);
        for (const k of ["baslik_tr", "baslik_en", "odak_tr"]) assert.ok(typeof d[k] === "string" && d[k].trim().length >= 3, `${d.id}.${k}`);
        assert.ok(d.baslik_tr.length <= 70 && d.baslik_en.length <= 70, `başlık uzun: ${d.id}`);
        assert.ok(d.odak_tr.length <= 500, `odak uzun: ${d.id}`);
        assert.ok(d.kaynak && (d.kaynak.wiki_en || d.kaynak.wiki_tr), `kaynak yok: ${d.id}`);
        for (const k of Object.keys(d.kaynak)) assert.ok(["wiki_en", "wiki_tr"].includes(k) && typeof d.kaynak[k] === "string" && d.kaynak[k].length > 1, `kaynak alanı ${d.id}.${k}`);
        assert.ok(d.gorsel === null || (typeof d.gorsel?.dosya === "string" && d.gorsel.dosya.length > 4), `gorsel biçimi: ${d.id}`);
        assert.ok(d.sabit === null || (typeof d.sabit?.tr === "string" && typeof d.sabit?.en === "string"), `sabit biçimi: ${d.id}`);
      }
    }
  });

  test(`${h}: yasak terim taraması`, () => {
    for (const [yer, metin] of metinler(m)) {
      for (const [ad, rx] of Object.entries(KURALLAR)) {
        if (ad === "VAAT" && yer.endsWith(".odak_tr")) continue;
        // odak_tr yazara yönergedir; BIRINCI_TEKIL ve ABARTI yine de taranır (yönerge dilinde de geçmemeli)
        assert.ok(!rx.test(metin), `${h} ${yer}: ${ad} -> "${metin.match(rx)?.[0]}"`);
      }
      const mod = denetle(metin);
      assert.ok(mod.ok, `${h} ${yer}: moderasyon ${mod.tur} -> ${metin.slice(0, 60)}`);
    }
  });

  test(`${h}: sabit metinlerde Türkçe denetimi`, () => {
    for (const d of dersler) if (d.sabit) {
      assert.deepEqual(turkceDenetle(d.sabit.tr), [], `${d.id} sabit.tr`);
      assert.ok(d.sabit.en.length > 5, `${d.id} sabit.en`);
    }
    for (const s of m.seriler) { assert.deepEqual(turkceDenetle(s.aciklama_tr), [], `seri ${s.yol[0]}`); for (const d of s.dersler) assert.deepEqual(turkceDenetle(d.baslik_tr), [], `${d.id} başlık`); }
  });
}

test("hesaplar arası: ders kimlikleri hesap içinde benzersiz, seri adları tekrar etmez", () => {
  for (const h of Object.keys(M)) {
    const adlar = M[h].seriler.map((s) => s.yol.join("/"));
    assert.equal(new Set(adlar).size, adlar.length, `${h} seri adı tekrar`);
  }
});

test("doğrulama kaydı: her kaynak başlığı Vikipedi'de doğrulanmış (ok)", () => {
  const yol = fileURLToPath(new URL("../arac/dogrulandi_mufredat_huzur.json", import.meta.url));
  assert.ok(existsSync(yol), "arac/dogrulandi_mufredat_huzur.json yok: node arac/mufredat_huzur_dogrula.mjs çalıştır");
  const kayit = JSON.parse(readFileSync(yol, "utf8"));
  for (const h of Object.keys(M)) for (const s of M[h].seriler) for (const d of s.dersler) {
    for (const [k, b] of Object.entries(d.kaynak)) {
      const dil = k === "wiki_en" ? "en" : "tr";
      assert.equal(kayit.basliklar[`${dil}:${b}`]?.durum, "ok", `${h}/${d.id}: ${dil}:${b} doğrulanmamış`);
    }
    if (d.gorsel) assert.equal(kayit.gorseller?.[d.gorsel.dosya]?.durum, "ok", `${h}/${d.id}: görsel doğrulanmamış`);
  }
});
