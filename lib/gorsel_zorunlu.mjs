// SAHİP ANA KURALI (2026-10-15): "Görselsiz yemek tarifi, içecek tarifi, oyun veya sanat haberi olmayacak."
// Sunucu (functions/haber-yukle GORSEL_ZORUNLU) bu kategorilerde görselsiz yayını reddeder; hat aynı kuralı yerelde uygular (boşuna çağrı/tur süresi harcanmasın).
// Kategoriler: mutfak (içecek tarifleri de mutfak), oyun, sanat (haber + heykel), resim.
// GENİŞLEDİ 2026-10-16 (sahip: "Rönesans ve doğa da sadece görselli paylaşılabilir"): + doga, tarih (op_ronesans ve op_antik müfredatları tarih kategorisindedir) + astroloji (yeni hesap op_astroloji).
// GENİŞLEDİ 2026-10-16 (sahip: "music botu; kült şarkıların hikâyesi"): + muzik (op_muzik: sanatçı/enstrüman/mekân fotoğrafı; albüm kapağı ASLA).
export const GORSEL_ZORUNLU_KATEGORILER = ["mutfak", "oyun", "sanat", "resim", "doga", "tarih", "astroloji", "muzik"];
export const gorselZorunluMu = (kategori) => GORSEL_ZORUNLU_KATEGORILER.includes(String(kategori || ""));

// DERS DÜZEYİ ZORUNLULUK (2026-10-17, sahip: duruş/pozisyon/egzersiz/teknik anlatan dersler görselsiz yayınlanmaz): op_yoga, op_hareket, op_spor (fitness/kalistenik/pilates), op_meditasyon (beden duruşu).
// Ders verisinde `gorselZorunlu: true|false` açık işaret varsa o geçerlidir; yoksa bu hesaplarda ders başlığı/odağı/kimliği/serisi anahtar sözcükle taranır.
export const HAREKET_HESAPLARI = ["op_yoga", "op_hareket", "op_spor", "op_meditasyon"];
const POZ_ANAHTAR = /(?<![\p{L}])(duru[sş]\p{L}*|poz(?:isyon)?\p{L}*|asana\p{L}*|egzersiz\p{L}*|hareket tekni\p{L}*|squat|[çc][öo]melme\p{L}*|plank\p{L}*|[sş][ıi]nav\p{L}*|barfiks\p{L}*|mekik\p{L}*|esnet\p{L}*|e[ğg]il\p{L}*|uzan\p{L}*|burul\p{L}*|b[üu]k\p{L}*|otur[uü][sş]\p{L}*|kalistenik\p{L}*|ger(?:i)?lme\p{L}*|k[öo]pr[üu]|kobra|ba[sş]\s*a[sş]a[ğg][ıi]|dambıl|kettlebell)(?![\p{L}])/iu;
const POZ_SERI = /(temel duru[sş]lar|vücut a[ğg][ıi]rl[ıi][ğg][ıi]yla basit egzersizler|kalistenik|pilates|fitness)/iu;
const POZ_GUCLU_SERI = /(temel duru[sş]lar|esneme ve gev[sş]eme|masa ba[sş][ıi] yoga|esneme ve esneklik|^denge$|\bdenge\b|^duru[sş]$|\bduru[sş]\b|[ıi]s[ıi]nma ve so[ğg]uma|vücut a[ğg][ıi]rl[ıi][ğg][ıi]yla)/iu;
const TEKNIK_DEGIL = /(tarih|nedir\?|federasyon|olimpiyat|mimar|biyografi)/iu;
export function dersGorselZorunlu(m, d) {
  if (typeof d?.gorselZorunlu === "boolean") return d.gorselZorunlu;
  if (gorselZorunluMu(m?.kategori)) return true;
  if (!HAREKET_HESAPLARI.includes(String(m?.hesap || ""))) return false;
  const metin = `${d?.baslik_tr || ""} ${d?.odak_tr || ""} ${d?.id || ""}`;
  if (m.hesap === "op_spor" && !POZ_SERI.test((d?.yol || []).join(" "))) return false;      // futbol/basketbol... dalları bilgi dersidir; yalnız fitness/kalistenik/pilates
  if (m.hesap === "op_spor" && TEKNIK_DEGIL.test(d?.baslik_tr || "") && !POZ_ANAHTAR.test(d?.baslik_tr || "")) return false;
  if (m.hesap === "op_spor" && !TEKNIK_DEGIL.test(d?.baslik_tr || "") && !/joseph|spor-salonu/i.test(d?.id || "")) return true;     // fitness/kalistenik/pilates serilerinde tekniği anlatan dersler
  if ((m.hesap === "op_yoga" || m.hesap === "op_hareket") && POZ_GUCLU_SERI.test((d?.yol || []).join(" ")) && !TEKNIK_DEGIL.test(d?.baslik_tr || "")) return true;   // duruş/esneme/denge/ısınma/egzersiz serilerinin dersleri
  return POZ_ANAHTAR.test(metin);
}
/** Dersin görselinin göstermesi gereken duruş/egzersiz adı (VL sorusuna: "görsel bu duruşu/egzersizi gösteriyor mu"). Zorunlu poz dersi değilse "". */
export const dersPozAdi = (m, d) => (HAREKET_HESAPLARI.includes(String(m?.hesap || "")) && dersGorselZorunlu(m, d) ? String(d?.baslik_en || d?.baslik_tr || "") : "");

/** Yayın görseli gerçekten var mı? gorsel: {gorsel:{...}, b64, tur} (hat/müfredat paketi). */
export const gorselVarMi = (g) => !!(g && typeof g.b64 === "string" && g.b64.length > 0 && g.gorsel);

/** Sunucu red nedenini tanır. -> "gorsel-zorunlu" | "kategori-tanimsiz" | "" */
export function sunucuRedTuru(neden) {
  const t = String(neden || "");
  if (/g[öo]rsel zorunlu/iu.test(t)) return "gorsel-zorunlu";
  if (/kategori tan[ıi]ms[ıi]z/iu.test(t)) return "kategori-tanimsiz";
  return "";
}

/** Yerel kapı (yayinYuku): görsel zorunlu kategoride görsel yoksa yük HİÇ kurulmaz/gönderilmez. */
export class GorselZorunluHatasi extends Error {
  constructor() { super("görsel zorunlu kategori: görselsiz yayınlanmaz"); this.name = "GorselZorunluHatasi"; }
}
