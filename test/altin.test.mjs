// ALTIN ÖRNEK SETİ (regresyon): sahibin ve şefin canlıda yakaladığı hatalar KALICI test. Örnekler test/altin/ornekler.json (etiketli: grup a-h),
// ortak senaryo test/altin/ortak.json. Her örnek MEVCUT doğrulayıcılardan geçirilir ve beklenen kararla (ret + kod / geçer) karşılaştırılır.
// Yeni canlı hata bulununca: önce buraya örnek ekle (test kırmızı), sonra kuralı yaz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { haberYaz, redKodu } from "../lib/yaz.mjs";
import { onEleme } from "../lib/on_eleme.mjs";
import { yerCelisiyor } from "../lib/gorsel.mjs";
import { ceviriDogrula, secimSuzgeci } from "../lib/alinti.mjs";

const burasi = join(dirname(fileURLToPath(import.meta.url)), "altin");
const oku = (ad) => JSON.parse(readFileSync(join(burasi, ad), "utf8"));
const ORTAK = oku("ortak.json"), { ornekler } = oku("ornekler.json");
const SIMDI = Date.parse("2026-10-13T12:00:00Z");

const cumleler = (m) => m.split(/(?<=[.!?])\s+/);

/** ortak senaryo + örneğin ek/değişiklikleri -> {aday, model çıktısı} */
function senaryo(g) {
  const m = structuredClone(ORTAK.model);
  if (g.trBaslik) m.tr.baslik = g.trBaslik;
  const tam = cumleler(m.tr.ozet);
  m.tr.ozet = g.trOzet ?? ((g.trOzetKes ? tam.slice(0, g.trOzetKes) : tam).join(" ") + (g.trOzetEk ? " " + g.trOzetEk : ""));
  if (g.enOzetEk) m.en.ozet += " " + g.enOzetEk;
  return { aday: { baslik: ORTAK.kaynak.baslik, ozet: ORTAK.kaynak.ozet + (g.kaynakOzetEk || ""), dil: "en" }, model: m };
}

const KONTROLLER = {
  async haber_yaz(g) {
    const { aday, model } = senaryo(g);
    const taklit = { yaz: async () => ({ metin: JSON.stringify(model), engellendi: "" }) };      // her çağrıya (yeniden yazım, özel ad, başlık düzeltme) aynı hatalı çıktıyı verir
    const y = await haberYaz(taklit, aday, "");
    return y.durum === "ok" ? { karar: "gec", metin: y.haber.tr.baslik + " " + y.haber.tr.ozet } : { karar: "ret", kod: redKodu(y.neden), neden: y.neden };
  },
  async on_eleme(g) {
    const e = onEleme({ ...g, link: "https://example.org/x", kaynak: "example.org", dil: "en", zaman: "2026-10-13T08:00:00Z" }, { simdi: SIMDI, tazelikSaat: 48 });
    return e.ok ? { karar: "gec" } : { karar: "ret", neden: e.neden };
  },
  async gorsel_yer(g) {
    const c = yerCelisiyor({ metin: g.adayMetin }, g.haberMetni);
    return c ? { karar: "ret", neden: c } : { karar: "gec" };
  },
  async alinti_secim(g) {
    const r = secimSuzgeci(g.metin, g.alan);
    return r ? { karar: "ret", kod: r } : { karar: "gec" };
  },
  async alinti_ceviri(g) {
    const r = ceviriDogrula({ uygun: true, tr: g.tr }, g.orijinal);
    return r.ok ? { karar: "gec" } : { karar: "ret", neden: r.neden };
  },
};

test("altın set: yapı (her örnekte id, grup, kontrol, beklenen; kimlikler benzersiz; her grup en az bir ret ve karşı örnek)", () => {
  const idler = new Set();
  for (const o of ornekler) {
    assert.ok(o.id && o.grup && KONTROLLER[o.kontrol] && o.beklenen?.karar, `eksik alan: ${o.id}`);
    assert.ok(!idler.has(o.id), `yinelenen kimlik: ${o.id}`);
    idler.add(o.id);
  }
  for (const grup of ["a", "b", "c", "d", "e", "f", "g", "i"]) {
    const g = ornekler.filter((o) => o.grup === grup);
    assert.ok(g.some((o) => o.beklenen.karar === "ret"), `grup ${grup}: ret örneği yok`);
    assert.ok(g.some((o) => o.beklenen.karar === "gec"), `grup ${grup}: karşı örnek yok`);
  }
});

for (const o of ornekler) {
  test(`altın [${o.grup}] ${o.id}: ${o.beklenen.karar}${o.beklenen.kod ? " " + o.beklenen.kod : ""}${o.beklenen.neden ? " " + o.beklenen.neden : ""}`, async () => {
    const s = await KONTROLLER[o.kontrol](o.girdi);
    const b = o.beklenen;
    assert.equal(s.karar, b.karar, `${o.aciklama} -> karar ${s.karar} (${s.neden || s.kod || ""})`);
    if (b.karar === "ret") {
      if (b.kod) assert.equal(s.kod, b.kod, `ret kodu (neden: ${s.neden})`);
      if (b.neden) assert.equal(s.neden, b.neden);
      if (b.nedenIcerir) assert.ok(String(s.neden).includes(b.nedenIcerir), `neden "${s.neden}" ${b.nedenIcerir} içermiyor`);
    } else {
      for (const p of b.icerir || []) assert.ok(String(s.metin).includes(p), `çıktı "${p}" içermeli`);
      for (const p of b.icermez || []) assert.ok(!String(s.metin).includes(p), `çıktı "${p}" içermemeli`);
    }
  });
}
