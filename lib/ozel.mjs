// Alıntı (felsefe, edebiyat, şiir, mitoloji) ve gökbilim işleri: haber turuyla AYNI koşuda, "sırası gelmişse" çalışır.
// Sıra, bulutun kota kaydına göre belirlenir (son paylaşım zamanı + günlük/haftalık adet); ayrı cron gerekmez.
import { alintiUret, siraGeldiMi } from "./alinti.mjs";
import { gokbilimUret } from "./gokbilim.mjs";
import { ALINTI_HESAPLARI } from "./alinti_yazarlar.mjs";

export const OZEL_ALANLAR = ["felsefe", "edebiyat", "siir", "mitoloji", "gokbilim"];

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

/** -> {calisan:[{alan, durum}], yayin, cagri, ornekler:[kayit], notlar:[...]} ; kuru: model/yayın yok, tüm alanlardan örnek. */
export async function ozelIsleriCalistir({ ayar, bulut, model, fetchFn = fetch, simdi = Date.now(), kotaDurum = new Map(), log = () => {}, bekleFn, rastgele = Math.random, sureAsildi = () => false }) {
  const ozet = { calisan: [], yayin: 0, cagri: 0, ornekler: [], notlar: [] };
  const alanlar = siradakiAlanlar({ plan: ayar.ozelPlan, kotaDurum, simdi, saat: ayar.ozelSaat, tumu: ayar.kuru }).slice(0, ayar.kuru ? OZEL_ALANLAR.length : ayar.ozelTurUst);
  for (const alan of alanlar) {
    if (sureAsildi()) { ozet.notlar.push("süre doldu"); break; }
    const hakki = ayar.ozelCagriUst - ozet.cagri;
    if (!ayar.kuru && hakki <= 0) { ozet.notlar.push("model çağrı bütçesi doldu"); break; }
    try {
      const s = alan === "gokbilim"
        ? await gokbilimUret({ bulut, model, fetchFn, simdi, kuru: ayar.kuru, nasaAnahtar: ayar.nasaAnahtar, cagriHakki: hakki, bekleFn, log })
        : await alintiUret({ alan, bulut, model, fetchFn, rastgele, simdi, kuru: ayar.kuru, cagriHakki: hakki, hesap: hesapSec(alan, simdi), bekleFn: bekleFn || undefined });
      ozet.cagri += s.cagri || 0;
      ozet.calisan.push({ alan, durum: s.durum });
      if (s.durum === "yayinlandi") ozet.yayin++;
      if (s.kayit) ozet.ornekler.push(s.kayit);
      if (ayar.kuru) ozet.notlar.push(`${alan}: ${(s.notlar || []).join(" | ")}`);
    } catch (e) {
      if (e?.constructor?.name === "KotaDoldu") { ozet.notlar.push("model kotası doldu"); ozet.kota = true; break; }
      ozet.calisan.push({ alan, durum: "hata" });
      ozet.notlar.push(`${alan}: ${String(e.message || e).slice(0, 60)}`);
    }
  }
  return ozet;
}
