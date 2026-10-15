// SAHİP ANA KURALI (2026-10-15): "Görselsiz yemek tarifi, içecek tarifi, oyun veya sanat haberi olmayacak."
// Sunucu (functions/haber-yukle GORSEL_ZORUNLU) bu kategorilerde görselsiz yayını reddeder; hat aynı kuralı yerelde uygular (boşuna çağrı/tur süresi harcanmasın).
// Kategoriler: mutfak (içecek tarifleri de mutfak), oyun, sanat (haber + heykel), resim.
export const GORSEL_ZORUNLU_KATEGORILER = ["mutfak", "oyun", "sanat", "resim"];
export const gorselZorunluMu = (kategori) => GORSEL_ZORUNLU_KATEGORILER.includes(String(kategori || ""));

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
