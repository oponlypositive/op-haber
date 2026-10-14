// Kural tabanlı Türkçe denetimi (ucuz, modelsiz): yazım çağrısının TR çıktısına ve alıntı çevirilerine uygulanır.
// `turkceOnar` güvenle düzeltilebilenleri düzeltir (virgülden önce boşluk, çift boşluk, virgülden sonra boşluk yok);
// `turkceDenetle` düzeltilemeyenleri bulur (cümle başı küçük harf, "ve,", kapanmamış tırnak/parantez, art arda aynı kelime, 45 kelimeden uzun cümle, İngilizce kalıntı).
// Bulgu varsa yazım çağrısı bir kez nedene özel istemle yeniden yaptırılır (yaz.mjs). Saf işlevler.

/** Güvenli onarım: " ," -> ",", çift boşluk -> tek, "kelime,kelime" -> "kelime, kelime" (sayılar hariç). */
export function turkceOnar(metin) {
  return String(metin ?? "")
    .replace(/[ \t]+([,;:])/g, "$1")
    .replace(/,(?=\p{L})/gu, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Cümle sonu sayılmayan kısaltmalar (sonrasında küçük harf gelebilir)
const KISALTMA = new Set(["dr", "prof", "doç", "yrd", "sn", "dk", "vs", "vb", "örn", "bkz", "no", "st", "mr", "mrs", "ms", "inc", "ltd", "co", "cm", "km", "kg", "etc", "ör", "age", "yy", "mö", "ms", "tel", "sk", "mah", "cad"]);
const INGILIZCE = new Set(["the", "and", "of", "with", "from", "that", "which", "their", "have", "has", "was", "were", "this", "for", "into", "about"]);
const kelimeSay = (c) => (c.match(/[\p{L}\p{N}]+/gu) || []).length;

// Canlıda görülen UYDURMA terim çevirileri (yerleşik Türkçe karşılığı olmayan terim kelime kelime çevrilmiş). Yeni örnek bulununca buraya eklenir (+ test/altin).
// Doğrusu: özgün terim tırnak içinde + kısa açıklama ("kuantum “magic” kaynağı (klasik bilgisayarla taklit edilemeyen bir kuantum özelliği)").
const UYDURMA_TERIM = [[/(?<![\p{L}])kuantum büyü\p{L}*/iu, "quantum magic"], [/(?<![\p{L}])kuantum sihir\p{L}*/iu, "quantum magic"]];

/** Tırnak içindeki parçaları boşaltır (özgün adlı eser/alıntı İngilizce kalabilir). */
const tirnakSiz = (m) => m.replace(/“[^”]*”/g, " ").replace(/"[^"]*"/g, " ");

/**
 * Düzeltilemeyen sorunları listeler. -> ["ve-virgul", "kucuk-harf-cumle-basi:sonra", "uzun-cumle:52", "ingilizce-kalinti:the", "tirnak-acik", "parantez-acik", "tekrar-kelime:yeni yeni"]
 * Boş dizi = temiz. Başlık için de çağrılabilir (cümle başı denetimi tek parçada işlemez).
 */
export function turkceDenetle(metin) {
  const m = String(metin ?? "");
  const sorun = [];
  if (/(?<![\p{L}])ve\s*,/iu.test(m)) sorun.push("ve-virgul");
  const parcalar = m.split(/(?<=[.?!…])\s+/).map((p) => p.trim()).filter(Boolean);
  for (let i = 1; i < parcalar.length; i++) {
    const ilk = parcalar[i][0];
    if (!/\p{Ll}/u.test(ilk)) continue;
    const onceki = parcalar[i - 1].replace(/[.?!…”"’)\s]+$/u, "");
    const son = (onceki.split(/\s+/).pop() || "").toLocaleLowerCase("tr").replace(/\./g, "");
    if (/\d$/.test(son) || KISALTMA.has(son) || (son.length <= 2 && /\./.test(parcalar[i - 1].split(/\s+/).pop() || ""))) continue;   // "15. yüzyıl", "Dr. ayşe", "A.Ş."
    sorun.push("kucuk-harf-cumle-basi:" + parcalar[i].split(/\s+/)[0].slice(0, 12));
    break;
  }
  for (const c of parcalar) { const n = kelimeSay(c); if (n > 45) { sorun.push("uzun-cumle:" + n); break; } }
  // Türkçe harfleri düşmüş (ASCII'leştirilmiş) cümle: 8+ kelimelik Türkçe cümlede ç/ğ/ı/ö/ş/ü/İ hiç yoksa neredeyse kesin bozuktur (canlı 2026-10-14: "Izmir kofte ... firinda bişen").
  for (const c of parcalar) { const yalin = tirnakSiz(c).replace(/^[^:\n]{1,20}:\s*/u, ""); if (kelimeSay(yalin) >= 8 && !/[çğıöşüÇĞİÖŞÜ]/u.test(yalin)) { sorun.push("ascii-cumle:" + yalin.split(/\s+/).slice(0, 3).join(" ")); break; } }
  if ((m.match(/“/g) || []).length !== (m.match(/”/g) || []).length || (m.match(/"/g) || []).length % 2 === 1) sorun.push("tirnak-acik");
  if ((m.match(/\(/g) || []).length !== (m.match(/\)/g) || []).length || (m.match(/\[/g) || []).length !== (m.match(/\]/g) || []).length) sorun.push("parantez-acik");
  const tekrar = /(?<![\p{L}\p{N}])(\p{L}{3,})\s+\1(?![\p{L}\p{N}])/iu.exec(m);
  if (tekrar) sorun.push("tekrar-kelime:" + tekrar[0].slice(0, 24));
  for (const [rx, ozgun] of UYDURMA_TERIM) { const u = rx.exec(m); if (u) { sorun.push("uydurma-terim:" + u[0] + " (" + ozgun + ")"); break; } }
  const ing = (tirnakSiz(m).match(/[a-z]+/g) || []).find((w) => INGILIZCE.has(w));
  if (ing) sorun.push("ingilizce-kalinti:" + ing);
  return sorun;
}

/** Sorun listesini ret nedeni metnine çevirir (yaz.mjs redKodu "noktalama" olarak sınıflar). */
export const turkceNeden = (sorunlar) => (sorunlar.some((x) => x.startsWith("uydurma-terim"))
  ? `tr uydurma terim çevirisi: ${sorunlar.find((x) => x.startsWith("uydurma-terim")).slice(14)}`
  : `tr noktalama/yazım kuralı: ${sorunlar.slice(0, 3).join(", ")}`);
