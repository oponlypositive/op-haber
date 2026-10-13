// haber-yukle Edge Function istemcisi. Sözleşme (op/app/bulut/functions/haber-yukle/index.ts):
//   { islem: "bilinenler", ozetler: [sha256 hex...] }                       -> { kayitlar: [{ozet, durum, deneme, yuk}] }
//   { islem: "isaretle", kayitlar: [{ozet, durum, neden?, deneme?, yuk?}] } -> { yazildi }
//   { islem: "kota" }                                                      -> { kayitlar: [{kategori, son24, son7g, sonZaman}] }
//   { islem: "yayinla", ozet, haber: {...}, gorselB64?, gorselTur? }        -> { durum: "eklendi" | "var" | "red", neden? }
// Gizli anahtar yalnız `x-haber-anahtari` başlığında gider; günlüklere yazılmaz.
import { UA } from "./rss.mjs";

export const DURUMLAR = ["yayinlandi", "elendi", "bekliyor_gorsel", "bekliyor_kaynak"];

/** Yayın yükü (saf). h: hattın ürettiği haber; gorsel: {gorsel:{...}, b64, tur} | null. */
export function yayinYuku(h, ozet, gorsel) {
  const haber = {
    id: h.id, tr: h.tr, en: h.en, kategori: h.kategori, yer: h.yer, kaynak: h.kaynak, link: h.link, zaman: h.zaman,
    model: h.model || "", ...(h.editor ? { editor: h.editor } : {}),
    ...(h.alt_konu ? { alt_konu: h.alt_konu } : {}), ...(h.cinsiyet ? { cinsiyet: h.cinsiyet } : {}),   // sunucu (haber-yukle) bilinmeyen alanı yok sayar; sütun eklenene dek saklanmaz
    ...(gorsel ? { gorsel: gorsel.gorsel } : {}),
  };
  return { islem: "yayinla", ozet, haber, ...(gorsel ? { gorselB64: gorsel.b64, gorselTur: gorsel.tur } : {}) };
}

export function bulutKur({ fnUrl, anahtar, fetchFn = fetch, bekleFn = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  async function gonder(govde) {
    let son = "";
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetchFn(fnUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-haber-anahtari": anahtar, "User-Agent": UA }, body: JSON.stringify(govde), signal: AbortSignal.timeout(60000) });
        if (r.ok) return await r.json();
        son = `HTTP ${r.status}`;
        if (r.status < 500 && r.status !== 429) break;   // 4xx (401 dahil) tekrar denemekle düzelmez
      } catch (e) { son = `ağ: ${String(e.message || e).slice(0, 40)}`; }
      await bekleFn(1500 * 2 ** i);
    }
    throw new Error(`haber-yukle ${govde.islem}: ${son}`);
  }
  return {
    async bilinenler(ozetler) {
      const harita = new Map();
      for (let i = 0; i < ozetler.length; i += 200) {
        const j = await gonder({ islem: "bilinenler", ozetler: ozetler.slice(i, i + 200) });
        for (const k of j.kayitlar || []) harita.set(k.ozet, k);
      }
      return harita;
    },
    async isaretle(kayitlar) {   // sunucu istek başına en çok 100 kayıt kabul eder: parçala (2026-10-13: 100'ü aşınca HTTP 400 ile HİÇBİRİ yazılmıyordu)
      let yazildi = 0;
      for (let i = 0; i < kayitlar.length; i += 100) yazildi += (await gonder({ islem: "isaretle", kayitlar: kayitlar.slice(i, i + 100) })).yazildi | 0;
      return { yazildi };
    },
    yayinla: (h, ozet, gorsel) => gonder(yayinYuku(h, ozet, gorsel)),
    /** Kategori başına son 24 saat / 7 gün gönderi sayısı ve son gönderi zamanı -> Map(kategori -> {son24, son7g, sonZaman}) */
    async kota() {
      const j = await gonder({ islem: "kota" });
      return new Map((j.kayitlar || []).map((k) => [k.kategori, { son24: k.son24 | 0, son7g: k.son7g | 0, sonZaman: k.sonZaman || null }]));
    },
  };
}
