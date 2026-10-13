// Türkiye ağırlığı (sahip 2026-10-13: "uygulama ilk etapta daha çok Türkiye'ye hitap edeceği için çok daha fazla yerli güncel haber"):
// bir aday TR kaynaklı (dil "tr") ya da Türkiye konuluysa "yerli" sayılır. Tur içinde yayınlanacak haberlerin en az `oran` kadarı yerli olsun;
// alan kotaları (spor 28 vb.) yabancı kaynaklarca doldurulup yerli haberi boğmasın diye kotanın bir kısmı yerli adaylara AYRILIR. Saf işlevler (ağ yok).

// Türkiye konusu: ülke adı + büyük şehirler + milli takım/federasyon/kurum kalıpları (TR kaynakta zaten "tr" sayılır; bu, İngilizce kaynaklardaki Türkiye haberleri içindir).
const TURKIYE = new RegExp("(?<![\\p{L}])(?:t[üu]rk(?:iye|ish|ey|)|turkiye|istanbul|ankara|[İi]zmir|izmir|antalya|bursa|adana|konya|gaziantep|trabzon|eski[şs]ehir|mersin|samsun|kocaeli|bodrum|[Çç]anakkale|cappadocia|kapadokya|anatolia|anadolu|bosphorus|galatasaray|fenerbah[çc]e|be[şs]ikta[şs]|tubitak|t[üu]bitak|teknofest|a milli|filenin sultanlar[ıi]|12 dev adam)(?![\\p{L}])", "iu");

/** Aday TR kaynaklı ya da Türkiye konulu mu? */
export function yerliMi(a) {
  if (a?.dil === "tr") return true;
  return TURKIYE.test(`${a?.baslik || ""} ${a?.ozet || ""}`);
}

/**
 * Sıra bozulmadan (her grubun kendi sırası korunur) yerli adayları öne alır: ilk n öğenin en az ceil(oran*n)'i yerli olur (yerli yetiyorsa).
 * liste: puana göre sıralı adaylar. oran 0 = dokunma.
 */
export function yerliOnce(liste, oran = 0.5) {
  if (!(oran > 0)) return [...liste];
  const yerli = liste.filter(yerliMi), diger = liste.filter((a) => !yerliMi(a));
  const sonuc = [];
  let y = 0, d = 0;
  while (y < yerli.length || d < diger.length) {
    const n = sonuc.length + 1;
    const yerliGerek = Math.ceil(oran * n);
    if (y < yerli.length && (y < yerliGerek || d >= diger.length)) sonuc.push(yerli[y++]);
    else if (d < diger.length) sonuc.push(diger[d++]);
    else sonuc.push(yerli[y++]);
  }
  return sonuc;
}

/** Alan başına yabancı adaylara kapalı kalacak "rezerv" (kotanın payı): {spor: 10, ...}. */
export function yerliRezervi(alanKotalari, pay = 0.35) {
  const r = {};
  for (const [alan, kota] of Object.entries(alanKotalari || {})) r[alan] = Math.round(kota * Math.max(0, Math.min(0.9, pay)));
  return r;
}

/** Kota çekişmesi: yabancı aday, alanın kalan hakkı rezervin altına inince geçemez (yerli geçer). kalanHak: {alan: kalan}. */
export function kotaEngeli(a, kalanHak, rezerv) {
  if (!a?.alan || yerliMi(a)) return false;
  const kalan = kalanHak?.[a.alan];
  return kalan !== undefined && kalan <= (rezerv?.[a.alan] || 0);
}
