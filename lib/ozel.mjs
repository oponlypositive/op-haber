// Alıntı (felsefe, edebiyat, şiir, mitoloji), gökbilim, OP Resim (ünlü tablolar) ve OP Sohbet (topluluğa soru) işleri: haber turuyla AYNI koşuda, "sırası gelmişse" çalışır.
// Sıra, bulutun kota kaydına göre belirlenir (son paylaşım zamanı + günlük/haftalık adet); ayrı cron gerekmez.
import { alintiUret, siraGeldiMi, siraNedeni } from "./alinti.mjs";
import { gokbilimUret } from "./gokbilim.mjs";
import { ALINTI_HESAPLARI } from "./alinti_yazarlar.mjs";
import { resimUret } from "./resim.mjs";
import { sohbetUret } from "./sohbet.mjs";
import { gruplariKur, konuIsleriCalistir, konuSiraNedeni } from "./konu.mjs";

export const OZEL_ALANLAR = ["felsefe", "edebiyat", "siir", "mitoloji", "gokbilim", "resim", "sohbet"];

/** Sırası gelen alanlar (en uzun süredir paylaşılmayan önce). kotaDurum: Map(kategori -> {son24, son7g, sonZaman}). */
export function siradakiAlanlar({ plan, kotaDurum, simdi, saat, tumu = false }) {
  const adaylar = OZEL_ALANLAR.filter((a) => tumu || siraGeldiMi(plan[a], kotaDurum?.get?.(a), simdi, saat));
  const son = (a) => { const t = Date.parse(kotaDurum?.get?.(a)?.sonZaman || ""); return Number.isFinite(t) ? t : 0; };
  return adaylar.sort((x, y) => son(x) - son(y));
}
/** Aynı alanda birden çok hesap tanımlıysa güne göre döndürülür (varsayılan: alan başına tek hesap). */
export function hesapSec(alan, simdi) {
  const liste = ALINTI_HESAPLARI[alan] || [];
  return liste[Math.floor(simdi / 86400000) % Math.max(1, liste.length)];
}

/**
 * Özel işlerin tur özeti için kısa metin: "felsefe:yayin,siir:gorsel-yok,gokbilim:apod-hata/yedek-yok/ay-evre-yok,edebiyat+mitoloji:saat-disi".
 * Sırası gelmeyen alanlar nedenine göre gruplanır; hiçbir alan yoksa "-".
 */
export function ozelOzetMetni(o) {
  if (!o) return "";
  const parca = (o.calisan || []).map((c) => `${c.alan}:${c.durum === "yayinlandi" ? "yayin" : c.neden || c.durum}`);
  const grup = new Map();
  for (const a of o.atlanan || []) grup.set(a.neden, [...(grup.get(a.neden) || []), a.alan]);
  for (const [neden, alanlar] of grup) parca.push(`${alanlar.join("+")}:${neden}`);
  return parca.join(",") || "-";
}

/**
 * Alıntı (felsefe, edebiyat, şiir, mitoloji) + gökbilim işleri. Turun BAŞINDA, KENDİ model bütçesiyle (ayar.ozelCagriUst, haber bütçesinden ayrı) çalışır.
 * Sırası gelmeyen alanlar nedeniyle birlikte raporlanır (saat-disi, kota-dolu, aralik, kapali); sırası gelen alanlar denenir, yayınlanamayan alan (görsel yok vb.) sıradakileri tıkamaz.
 * -> {calisan:[{alan, durum, neden}], atlanan:[{alan, neden}], yayin, cagri, ornekler:[kayit], notlar:[...], kullanilan:[hash], kota?}
 * kuru: model/yayın yok, tüm alanlardan örnek.
 */
export async function ozelIsleriCalistir({ ayar, bulut, model, fetchFn = fetch, simdi = Date.now(), kotaDurum = new Map(), log = () => {}, bekleFn, rastgele = Math.random, sureAsildi = () => false, adaylar = [] }) {
  const ozet = { calisan: [], atlanan: [], yayin: 0, cagri: 0, ornekler: [], notlar: [], kullanilan: [] };
  const sira = [];
  // op_edebiyat ve op_klasikler AYNI kategoriyi (edebiyat) paylaşır: kota/aralık/sıra kategori düzeyinde ortak hesaplanır (konu.mjs gruplariKur)
  const edebiyatOrtak = ayar.konuAcik !== false && (ayar.konuKotalari?.op_klasikler ?? 0) > 0;
  const gruplar = edebiyatOrtak ? gruplariKur(ayar) : null;
  for (const a of OZEL_ALANLAR) {
    const neden = ayar.kuru ? "" : (a === "edebiyat" && edebiyatOrtak ? konuSiraNedeni("op_edebiyat", { ayar, kotaDurum, simdi, gruplar, gunlukUstUygula: false }) : siraNedeni(ayar.ozelPlan[a], kotaDurum?.get?.(a), simdi, ayar.ozelSaat));
    if (neden) ozet.atlanan.push({ alan: a, neden }); else sira.push(a);
  }
  const son = (a) => { const t = Date.parse(kotaDurum?.get?.(a)?.sonZaman || ""); return Number.isFinite(t) ? t : 0; };
  sira.sort((x, y) => son(x) - son(y));
  let denendi = 0;
  for (const alan of sira) {
    if (sureAsildi()) { ozet.notlar.push("süre doldu"); break; }
    if (!ayar.kuru && ozet.yayin >= ayar.ozelTurUst) break;
    if (!ayar.kuru && denendi >= (ayar.ozelDenemeUst || 5)) { ozet.notlar.push("deneme sınırı"); break; }
    const hakki = ayar.ozelCagriUst - ozet.cagri;
    denendi++;
    try {
      const s = alan === "gokbilim"
        ? await gokbilimUret({ bulut, model, fetchFn, simdi, kuru: ayar.kuru, nasaAnahtar: ayar.nasaAnahtar, cagriHakki: Math.max(0, hakki), bekleFn, log, adaylar, gorselsiz: ayar.gorselsizYayin })
        : alan === "resim"
        ? await resimUret({ bulut, model, fetchFn, rastgele, simdi, kuru: ayar.kuru, cagriHakki: Math.max(0, hakki), bekleFn: bekleFn || undefined, tekrarGun: ayar.resimTekrarGun ?? 180, kotaDurum })
        : alan === "sohbet"
        ? await sohbetUret({ bulut, model, fetchFn, rastgele, simdi, kuru: ayar.kuru, cagriHakki: Math.max(0, hakki), bekleFn: bekleFn || undefined, kotaDurum, modelDokunus: ayar.sohbetModelDokunus !== false })
        : await alintiUret({ alan, bulut, model, fetchFn, rastgele, simdi, kuru: ayar.kuru, cagriHakki: Math.max(0, hakki), hesap: hesapSec(alan, simdi), bekleFn: bekleFn || undefined, sonOkumaAcik: ayar.sonOkuma !== false, aciklamaAcik: ayar.felsefeAciklama !== false, davetAcik: ayar.konuDavet !== false });
      ozet.cagri += s.cagri || 0;
      ozet.calisan.push({ alan, durum: s.durum, neden: s.neden || "" });
      if (s.durum === "yayinlandi") ozet.yayin++;
      if (s.kayit) ozet.ornekler.push(s.kayit);
      if (s.kullanilan) ozet.kullanilan.push(...s.kullanilan);
      if (ayar.kuru) ozet.notlar.push(`${alan}: ${(s.notlar || []).join(" | ")}`);
    } catch (e) {
      if (e?.constructor?.name === "KotaDoldu") { ozet.notlar.push("model kotası doldu"); ozet.kota = true; ozet.calisan.push({ alan, durum: "kota", neden: "model-kota" }); break; }
      ozet.calisan.push({ alan, durum: "hata", neden: "hata" });
      ozet.notlar.push(`${alan}: ${String(e.message || e).slice(0, 60)}`);
    }
  }
  // ROZETLİ KONU HESAPLARI (op_mutfak, op_icecek, op_oyun, op_klasikler, op_ronesans, op_antik): KENDİ model bütçesi (ayar.konuCagriUst) ve tur sınırı (ayar.konuTurUst); özel işler bütçesinden bağımsız
  if (ayar.konuAcik !== false) {
    try {
      const k = await konuIsleriCalistir({ ayar, bulut, model, fetchFn, simdi, kotaDurum, log, bekleFn: bekleFn || undefined, rastgele });
      ozet.calisan.push(...k.calisan); ozet.atlanan.push(...k.atlanan); ozet.yayin += k.yayin; ozet.ornekler.push(...k.ornekler); ozet.notlar.push(...k.notlar);
      ozet.konuCagri = k.cagri; ozet.konuYayin = k.yayin;
      if (k.kota) ozet.kota = true;
    } catch (e) { ozet.notlar.push(`konu hesapları: ${String(e.message || e).slice(0, 60)}`); }
  }
  return ozet;
}
