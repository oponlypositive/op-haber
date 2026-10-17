// Spor haberi görseli: BRANŞ uyumu + kişi haberinde yanlış kişi/takım fotoğrafı koruması (saf işlevler, ağ yok).
// Canlı hata 2026-10-16: "Kelechi Iheanacho Türkiye'de gol rekorunu kırdı" (futbol) haberine Bursaspor BASKETBOL takımından bir oyuncunun fotoğrafı kondu
// (Commons "Berkay_Candan_32_Bursaspor_MB_TBSL…"). Çok branşlı kulüplerde (Bursaspor, Fenerbahçe, Galatasaray, Beşiktaş...) takım adı tek başına branşı belirtmez;
// dosya adı/açıklaması/kategorisi başka bir branşı (basketbol, voleybol, hentbol; TBSL, BSL, EuroLeague, MB...) gösteriyorsa ve haber başka branştaysa görsel REDDEDİLİR.
// İkinci kural: haberin asıl öznesi KİŞİyse ve kişinin kendi fotoğrafı bulunamadıysa takım/oyuncu fotoğrafı KONMAZ (yanlış kişi riski); görselsiz yayın sürer (spor görsel zorunlu değildir).
import { altKonuTahmin } from "./alt_konu.mjs";

const katla = (t) => String(t || "").replace(/İ/g, "i").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[_\-./]+/g, " ");
const re = (liste) => new RegExp("(?<![a-z0-9])(?:" + liste.map((k) => k.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![a-z0-9])", "u");

/** Branş -> katlanmış (ASCII, küçük harf, _ - . boşluk) metinde aranan ayırt edici sözcükler ve kısaltmalar. */
export const BRANS_IPUCLARI = {
  futbol: re(["football", "soccer", "futbol", "super lig", "tff", "uefa", "fifa", "premier league", "la liga", "bundesliga", "serie a", "ligue 1", "champions league", "sampiyonlar ligi", "europa league", "konferans ligi", "conference league", "worldcup", "world cup", "afc", "caf"]),
  basketbol: re(["basketball", "basketbol", "tbsl", "bsl", "bgl", "tbl", "tbf", "euroleague", "euro league", "eurocup", "euro cup", "fiba", "nba", "wnba", "kbl", "bbl", "acb", "eurobasket", "pota", "basket"]),
  voleybol: re(["volleyball", "voleybol", "sultanlar ligi", "efeler ligi", "sultanlar", "efeler", "tvf", "cev", "vnl", "nations league volleyball"]),
  hentbol: re(["handball", "hentbol", "ehf", "thf"]),
  tenis: re(["tennis", "tenis", "atp", "wta", "wimbledon", "roland garros", "us open tennis", "davis cup", "billie jean king"]),
  "buz-hokeyi": re(["ice hockey", "buz hokeyi", "nhl", "khl"]),
  "su-topu": re(["water polo", "su topu"]),
  ragbi: re(["rugby", "ragbi"]),
  beyzbol: re(["baseball", "beyzbol", "mlb"]),
  atletizm: re(["athletics", "atletizm", "marathon", "sprint", "high jump", "pole vault", "long jump", "yuksek atlama", "sirik atlama", "uzun atlama", "marathon"]),
  yuzme: re(["swimming", "yuzme", "swimmer", "diving", "atlama kulesi"]),
  gures: re(["wrestling", "gures", "wrestler"]),
  okculuk: re(["archery", "archer", "okculuk", "okcu"]),     // 2026-10-17: stok etiket uyumu (güreş haberine okçuluk hedefi konmasın)
  boks: re(["boxing", "boxer", "boks", "boksor"]),
};
// Çelişki yalnız şu takım/lig branşları (ve tenis) için aranır; atletizm/yüzme/güreş ipuçları haberin branşını bulmaya yarar ama görseli reddettirmez.
const TAKIM_BRANSLARI = ["futbol", "basketbol", "voleybol", "hentbol", "buz-hokeyi", "su-topu", "ragbi", "beyzbol"];
const TUM = Object.keys(BRANS_IPUCLARI);

/** Metindeki branşlar (ipucu bulunanlar): Set. */
export function bransIpuclari(metin) {
  const m = katla(metin), s = new Set();
  for (const b of TUM) if (BRANS_IPUCLARI[b].test(m)) s.add(b);
  return s;
}

/** Haberin branşı: önce alt_konu (futbol/basketbol/voleybol/tenis/atletizm/yuzme/gures), yoksa metin tahmini. Spor değilse ya da belirlenemezse "". */
export function haberBransi(haber) {
  if (!haber || haber.kategori !== "spor") return "";
  const alt = String(haber.alt_konu || haber.altKonu || "");
  const harita = { futbol: "futbol", basketbol: "basketbol", voleybol: "voleybol", tenis: "tenis", atletizm: "atletizm", yuzme: "yuzme", gures: "gures" };
  if (harita[alt]) return harita[alt];
  const metin = `${haber.en?.baslik || ""} ${haber.en?.ozet || ""} ${haber.tr?.baslik || ""} ${haber.tr?.ozet || ""}`;
  const t = altKonuTahmin("spor", metin);
  if (harita[t]) return harita[t];
  const s = bransIpuclari(metin);
  return s.size === 1 ? [...s][0] : "";
}

/**
 * Aday görselin Commons metni (dosya adı + açıklama + kategoriler) haberin branşıyla ÇELİŞİYOR mu? Çelişen branş adını döner, yoksa "".
 * Kural: haber branşı B bilinen bir takım branşıysa ve aday metni başka bir takım branşı gösterip B'yi göstermiyorsa çelişir.
 * (B'yi de gösteriyorsa belirsizdir: geçer; görsel denetimi karar verir.) Spor dışı haberlerde her zaman "".
 */
export function bransCelisiyor(adayMetin, haber) {
  const b = haberBransi(haber);
  if (!b) return "";
  const s = bransIpuclari(adayMetin);
  if (!s.size || s.has(b)) return "";
  for (const x of s) if (x !== b && (TAKIM_BRANSLARI.includes(x) || x === "tenis")) return x;      // yalnız takım branşları (ve tenis) çelişki sayılır: "sprint" gibi genel sözcükler yanlış ret üretmesin
  return "";
}

/**
 * Spor haberinin asıl öznesi bir KİŞİ mi? gorselOzne.tur kisi ya da görsel planının İLK adayı kişi. (Kulüp/takım haberi değil: orada takım adayları serbest.)
 * Evet ise: kişinin kendi fotoğrafı yoksa takım/oyuncu fotoğrafı (kurum adayı, nötr spor fotoğrafı) KONMAZ.
 */
export function sporKisiHaberi(haber) {
  if (!haber || haber.kategori !== "spor") return false;
  const ilk = Array.isArray(haber.gorselAdaylari) ? haber.gorselAdaylari.find((x) => x?.ad_en && x?.tur) : null;
  if (ilk) return ilk.tur === "kisi";
  return haber.gorselOzne?.tur === "kisi";
}
