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
    ...(h.seri ? { seri: h.seri } : {}), ...(h.seri_aciklama ? { seri_aciklama: h.seri_aciklama } : {}),   // müfredat serisi {yol:[...], sira}; seri ilk dersinde TR açıklama. Sunucu bilinmeyen alanı yok sayar (gönderi yine yayınlanır)
    ...(h.kart ? { kart: h.kart } : {}),   // armasız skor kartı {tur:"skor", taraf1, taraf2, skor1, skor2, organizasyon?, asama?}; sunucu doğrular, bozuksa yok sayar (gecis-018)
    ...(gorsel ? { gorsel: gorsel.gorsel } : {}),
  };
  return { islem: "yayinla", ozet, haber, ...(gorsel ? { gorselB64: gorsel.b64, gorselTur: gorsel.tur } : {}) };
}

/**
 * Son `saat` saatte yayınlanmış HABER gönderilerinin başlık/özeti (salt okuma, herkese açık `akis` RPC'si; bkz. public/bulut/op-api.js ve sema.sql akis()).
 * url/anahtar boşsa [] döner (kapalı). Hata: [] (tur aksamaz). Sayfalama: p_once ile en çok 4 sayfa x 120. -> [{kategori, baslik, ozet, zaman}]
 */
export async function sonYayinlar({ url, anahtar, saat = 48, simdi = Date.now(), fetchFn = fetch, sayfaUst = 4, log = () => {} }) {
  if (!url || !anahtar || !/^https:\/\//.test(url)) return [];
  const sinir = simdi - saat * 3600_000, sonuc = [];
  let once = null;
  try {
    for (let s = 0; s < sayfaUst; s++) {
      const r = await fetchFn(url, { method: "POST", headers: { apikey: anahtar, "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ p_sekme: "senin", p_kategori: "", p_dil: "tr", p_sinir: 120, p_once: once }), signal: AbortSignal.timeout(20000) });
      if (!r.ok) { log(`geçmiş okunamadı: HTTP ${r.status}`); break; }
      const j = await r.json();
      const ogeler = Array.isArray(j?.ogeler) ? j.ogeler : [];
      for (const o of ogeler) {
        const t = Date.parse(o?.zaman);
        if (!o?.haber || !Number.isFinite(t) || t < sinir) continue;
        const [baslik, ...kalan] = String(o.metin || "").split("\n\n");
        sonuc.push({ kategori: o.kategori || "", baslik: baslik.trim(), ozet: kalan.join(" ").trim(), zaman: o.zaman });
      }
      const enEski = ogeler.length ? Date.parse(ogeler[ogeler.length - 1]?.zaman) : NaN;
      // akis() sıralaması en yeni önce (anonim çağrıda ilgi bonusu yok); sayfa dolu değilse ya da en eski öğe pencere dışındaysa dur
      if (ogeler.length < 120 || !Number.isFinite(enEski) || enEski < sinir) break;
      once = ogeler[ogeler.length - 1].zaman;
    }
  } catch (e) { log(`geçmiş okunamadı: ${String(e.message || e).slice(0, 40)}`); }
  return sonuc;
}

export function bulutKur({ fnUrl, anahtar, fetchFn = fetch, bekleFn = (ms) => new Promise((r) => setTimeout(r, ms)), akis = null, log = () => {} }) {
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
    /** Son `saat` saatte yayınlanan haberler (aynı olay denetimi için). akis ayarı yoksa [] */
    sonYayinlar: ({ saat = 48, simdi = Date.now() } = {}) => sonYayinlar({ url: akis?.url, anahtar: akis?.anahtar, saat, simdi, fetchFn, log }),
    /** Kategori başına son 24 saat / 7 gün gönderi sayısı ve son gönderi zamanı -> Map(kategori -> {son24, son7g, sonZaman}) */
    async kota() {
      const j = await gonder({ islem: "kota" });
      return new Map((j.kayitlar || []).map((k) => [k.kategori, { son24: k.son24 | 0, son7g: k.son7g | 0, sonZaman: k.sonZaman || null }]));
    },
  };
}

/** bot-sorulari adresi: haber-yukle ile AYNI kökte (…/functions/v1/haber-yukle -> …/functions/v1/bot-sorulari). */
export function botUrl(fnUrl) {
  const u = new URL(String(fnUrl || ""));
  u.pathname = u.pathname.replace(/\/[^/]*\/?$/, "/bot-sorulari");
  u.search = ""; u.hash = "";
  return u.toString();
}

/**
 * bot-sorulari istemcisi (functions/bot-sorulari/index.ts sözleşmesi). Aynı `x-haber-anahtari` başlığı; anahtar ve soru/yanıt metni günlüğe yazılmaz.
 *   bekleyen(sinir)      -> [{id, bot, soran, soranDil, soruTuru, soru, ust, olusturma}]   (hata: Error)
 *   yanitla(soruId, metin) -> {durum:"yanitlandi"|"atlandi"|"filtre"|"islendi"|"yok"|"gecersiz", neden?, tur?}   (422 = "filtre": soru bekliyor kalır; ağ/5xx: Error)
 *   atla(soruId, neden)  -> {durum:"atlandi"|"islendi"|"yok"}
 */
export function botKur({ fnUrl, anahtar, fetchFn = fetch, bekleFn = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const adres = botUrl(fnUrl);
  async function gonder(govde) {
    let son = "";
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetchFn(adres, { method: "POST", headers: { "Content-Type": "application/json", "x-haber-anahtari": anahtar, "User-Agent": UA }, body: JSON.stringify(govde), signal: AbortSignal.timeout(20000) });
        if (r.status < 500 && r.status !== 429) return { status: r.status, json: await r.json().catch(() => null) };
        son = `HTTP ${r.status}`;
      } catch (e) { son = `ağ: ${String(e.message || e).slice(0, 40)}`; }
      if (i < 2) await bekleFn(1000 * 2 ** i);
    }
    throw new Error(`bot-sorulari ${govde.islem}: ${son}`);
  }
  const durumKodu = (s) => (s === 404 ? "yok" : s === 409 ? "islendi" : s === 400 ? "gecersiz" : null);
  return {
    async bekleyen(sinir = 10) {
      const { status, json } = await gonder({ islem: "bekleyen", sinir });
      if (status !== 200) throw new Error(`bot-sorulari bekleyen: HTTP ${status}`);
      return Array.isArray(json?.sorular) ? json.sorular : [];
    },
    async yanitla(soruId, metin) {
      const { status, json } = await gonder({ islem: "yanitla", soruId, metin });
      if (status === 200) return { durum: json?.durum === "atlandi" ? "atlandi" : "yanitlandi", ...(json?.neden ? { neden: String(json.neden).slice(0, 40) } : {}) };
      if (status === 422) return { durum: "filtre", tur: String(json.tur ?? "").slice(0, 20) };
      const d = durumKodu(status);
      if (d) return { durum: d };
      throw new Error(`bot-sorulari yanitla: HTTP ${status}`);
    },
    async atla(soruId, neden = "") {
      const { status } = await gonder({ islem: "atla", soruId, neden: String(neden).slice(0, 120) });
      if (status === 200) return { durum: "atlandi" };
      const d = durumKodu(status);
      if (d && d !== "gecersiz") return { durum: d };
      throw new Error(`bot-sorulari atla: HTTP ${status}`);
    },
  };
}
