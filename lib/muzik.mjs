// OP MÜZİK (op_muzik, kategori muzik; sahip 2026-10-16: "kült şarkıların hikâyelerini paylaşsın"). Saf işlevler + ufak ağ yardımcıları; model yok.
//   1) SÖZ ALINTISI KAPISI: ŞARKI SÖZLERİ TELİFLİDİR; müzik gönderisinde ve bot yanıtında tek bir dize bile yayınlanmaz. sozAlintiNedeni(): tırnak içi metin, satır satır / eğik çizgili dize,
//      nota işareti, "Sözler:" / "Lyrics:" başlığı, nakarat kalıbı (la la la), Türkçe metinde İngilizce dize, İngilizce metinde şarkı sözü gibi satır -> neden kodu ("" = temiz).
//   2) RESMÎ VİDEO: video kimliği Wikidata P1651'den gelir (arac/muzik_dogrula.mjs oEmbed ile doğrular; MODEL ÜRETMEZ). resmiVideoMu(): oEmbed yanıtı sanatçının resmî kanalı ya da VEVO / plak şirketi kanalı mı.
//   3) GÖRSEL: albüm kapağı / non-free / afiş ret (muzikGorselRet); sanatçı ve enstrüman adayları Wikidata KİMLİĞİYLE (qid) çözülür (kimlikliWdKur), ad araması belirsizliği yok.
import { katla } from "./gorsel_aday.mjs";
import { UA } from "./rss.mjs";

export const MUZIK_KATEGORI = "muzik";
export const SOZ_NOTU = { tr: "Şarkı sözleri telifli olduğu için paylaşılmaz.", en: "Lyrics are copyrighted and are not shared here." };
export const BOT_SOZ_NOTU = { tr: "Sözler telifli olduğu için burada paylaşılamıyor; resmî kaynağına bakabilirsin.", en: "Lyrics are copyrighted, so they cannot be shared here; please check the official source." };

// ---------------------------------------------------------------- 1) söz alıntısı kapısı
const kat = (t) => katla(t);
/** izinli adlar (şarkı adı, sanatçı...) katlanmış küme; "Ad (Sanatçı şarkısı)" gibi parantezli biçimler ve " · " ile birleşik başlıklar parçalanır. */
export function izinliKume(adlar) {
  const k = new Set();
  for (const a of adlar || []) {
    const s = String(a || "").trim();
    if (!s) continue;
    for (const p of [s, ...s.split(/\s+[·|]\s+/), s.replace(/\s*\([^)]*\)\s*/g, " ")]) { const f = kat(p); if (f.length >= 2) k.add(f); }
    for (const p of s.split(/\s+[·|]\s+/)) { const f = kat(p.replace(/\s*\([^)]*\)\s*/g, " ")); if (f.length >= 2) k.add(f); }
  }
  return k;
}
const TIRNAK_KALIPLARI = [
  /“([^”]{1,400})”/gu, /„([^“”]{1,400})[“”]/gu, /"([^"\n]{1,400})"/gu, /«([^»]{1,400})»/gu, /‹([^›]{1,400})›/gu, /‘([^’]{1,400})’/gu,
  /(?<![\p{L}\p{N}])'([^'\n]{2,400}?)'(?![\p{L}\p{N}])/gu,     // düz tek tırnak: açılış harf/rakamdan hemen sonra gelmez (Manço'nun, Guns N' Roses, o' Mine tırnak sayılmaz)
];
const TIRNAK_ARTIK = /["“”„«»‹›]|‘[^’]*’|(?<![\p{L}\p{N}])'[^'\n]{2,}'(?![\p{L}\p{N}])/u;
const BASLIK_RE = /(?<![\p{L}])(?:(?:song\s+)?lyrics?|(?:şarkı\s+)?sözler(?:i|in)?)\s*[:：]/iu;
const NOTA_RE = /[♪♫♬♩♭♯]/u;
const NAKARAT_RE = /(?<![\p{L}])([\p{L}]{2,6})(?:[\s,.\-–]+\1){2,}(?![\p{L}])/iu;
const EN_ISLEV = new Set("the a an and or but if of to in on at for with without from by about as into like over under you your yours i me my mine we us our he she it they them his her its their is am are was were be been do does did dont don't doesn't can cant won't will would should could just not no yes oh yeah baby love tonight gonna wanna gotta cause 'cause ain't all every one when where what who how why that this there here so too only still never always ever".split(" "));
const EN_LIRIK = new Set("i i'm i've i'll you your you're me my we our baby oh yeah love gonna wanna gotta ain't tonight cause 'cause never always forever nobody tell take".split(" "));

function pencere(tokenler, boyut, kume, esik) {
  for (let i = 0; i + boyut <= tokenler.length; i++) {
    let sayi = 0;
    for (let j = i; j < i + boyut; j++) if (kume.has(tokenler[j])) sayi++;
    if (sayi >= esik) return true;
  }
  return false;
}
/**
 * Müzik metninde şarkı sözü alıntısı belirtisi. -> "" (temiz) | neden kodu. izinli: şarkı/sanatçı adları (bu adlar tırnak içinde ya da düz yazılabilir). dil: "tr" | "en".
 * Metin VERİDİR; neden alanına metin konmaz.
 */
export function sozAlintiNedeni(metin, { dil = "tr", izinli = [] } = {}) {
  const ham = String(metin ?? "");
  const izin = izinliKume(izinli);
  // 1) tırnak içi metin: yalnız izinli ad (şarkı/sanatçı) tırnaklanabilir; kalan her tırnaklı parça ret
  let t = ham;
  for (const re of TIRNAK_KALIPLARI) t = t.replace(re, (tam, ic) => (izin.has(kat(ic)) ? " " : tam));
  if (TIRNAK_ARTIK.test(t)) return "tırnak içi metin";
  if (NOTA_RE.test(ham)) return "nota işareti";
  if (BASLIK_RE.test(ham)) return "söz başlığı";
  // 2) satır satır dize: ardışık 3+ kısa satır
  let seri = 0;
  for (const s of ham.split(/\r?\n/).map((x) => x.trim())) { if (s && s.length <= 70) { seri++; if (seri >= 3) return "satır satır dize"; } else seri = 0; }
  // 3) eğik çizgi / dikey çizgi ile ayrılmış dizeler (satır sonu yerine " / ")
  if (ham.split(/\s[\/|]\s/).filter((p) => p.trim().length >= 3).length >= 3 && /\s[\/|]\s.+\s[\/|]\s/s.test(ham)) return "eğik çizgili dize";
  if (NAKARAT_RE.test(ham)) return "nakarat kalıbı";
  // 4) dil ipuçları: izinli adlar çıkarıldıktan sonra Türkçe metinde İngilizce dize, İngilizce metinde şarkı sözü gibi yoğunluk
  let duz = ham;
  for (const a of [...izin].sort((x, y) => y.length - x.length)) {
    if (a.length < 3) continue;
    duz = duz.replace(new RegExp("(?<![\\p{L}\\p{N}])" + a.split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^\\p{L}\\p{N}]+") + "(?![\\p{L}\\p{N}])", "giu"), " ");
  }
  const tok = (duz.toLocaleLowerCase("en").match(/[\p{L}']+/gu) || []).map((x) => x.replace(/^'+|'+$/g, ""));
  if (dil === "tr") { if (pencere(tok.map((x) => (/^[a-z']+$/.test(x) ? x : "")), 6, EN_ISLEV, 4)) return "İngilizce dize"; }
  else if (pencere(tok, 6, EN_LIRIK, 5)) return "şarkı sözü gibi satır";
  return "";
}

/** Soru şarkı sözü / nakarat mı istiyor (bot)? Katlanmış (ASCII) metinde sözcük başı eşleşmesi. */
const SOZ_ISTEGI = /(?<![a-z])(?:sarki sozu\w*|sozler\w*|sozunu\w*|sozu(?![a-z])|nakarat\w*|dizeler\w*|lyric\w*|chorus|verses?(?![a-z])|words to|sing me)/u;
export const sozIstegiMi = (soru) => SOZ_ISTEGI.test(katla(soru));

// ---------------------------------------------------------------- 2) resmî video
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const videoUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const oembedUrl = (id) => `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl(id))}&format=json`;
// Plak şirketi / dağıtıcı resmî kanalları (kanal adı katlanmış biçimde TAM eşleşir ya da kök + "official/records/music" ekleriyle). "Topic" (otomatik) ve hayran kanalları KABUL EDİLMEZ.
export const RESMI_ETIKET = ["sony music", "sony music entertainment", "warner records", "warner music group", "warner music", "atlantic records", "universal music group", "umg", "emi", "emi music", "columbia records", "epic records", "rca records", "capitol records",
  "republic records", "interscope records", "island records", "geffen records", "def jam recordings", "parlophone", "virgin records", "motown", "motown records", "blue note records", "verve records", "impulse records", "decca records", "decca classics", "deutsche grammophon",
  "polydor records", "mercury records", "a&m records", "elektra records", "reprise records", "sire records", "arista records", "jive records", "rhino", "rhino records", "legacy recordings", "bmg", "bmg rights management", "ministry of sound", "domino recording co", "4ad", "rough trade",
  "stax records", "atco records", "philips", "fantasy records", "concord", "concord jazz", "naxos", "hyperion records", "pmc", "pmc muzik", "dmc", "doğan müzik şirketi", "seyhan müzik", "kalan müzik", "bmg turkey", "poll production", "avrupa müzik", "mavi müzik"].map(katla);
/**
 * oEmbed yanıtı (title, author_name) resmî video mu? sanatci: sanatçı adı. baslik: şarkı adı (video başlığında geçmeli). -> {ok, neden}
 *  - kanal adı "... - Topic" ise ret (otomatik ses kanalı), kanal adı sanatçı adının TÜM anlamlı kelimelerini taşıyorsa ya da "...VEVO" ise ya da plak şirketi listesindeyse kabul.
 *  - video başlığı şarkı adının ilk anlamlı kelimesini taşımalı (yanlış video kimliği koruması).
 */
export function resmiVideoMu(oembed, { sanatci = "", baslik = "" } = {}) {
  const kanal = String(oembed?.author_name || "").trim(), baslikV = String(oembed?.title || "");
  if (!kanal || !baslikV) return { ok: false, neden: "oembed boş" };
  const k = katla(kanal);
  if (/\btopic$/.test(k)) return { ok: false, neden: "topic kanalı (otomatik)" };
  const sanat = katla(sanatci).split(" ").filter((x) => x.length >= 2);
  const sanatKanal = sanat.length > 0 && sanat.every((s) => k.includes(s));
  const vevo = /vevo$/.test(k.replace(/\s+/g, ""));
  const etiket = RESMI_ETIKET.some((e) => k === e || k === e + " official" || k === e + " music" || k.startsWith(e + " "));
  if (!(sanatKanal || vevo || etiket)) return { ok: false, neden: "kanal resmî değil" };
  const sarki = katla(String(baslik).replace(/\s*\([^)]*\)\s*/g, " ")).split(" ").filter((x) => x.length >= 3 && !["the", "and", "for", "with"].includes(x));
  if (sarki.length && !katla(baslikV).includes(sarki[0])) return { ok: false, neden: "video başlığı şarkıyla uyuşmuyor" };
  return { ok: true, neden: "", kanal, tur: sanatKanal ? "sanatci" : vevo ? "vevo" : "etiket" };
}
/** Runtime doğrulama (ders hazırlarken): video kimliği oEmbed ile hâlâ geçerli ve resmî mi? -> {id, kanal} | null. Ağ hatası/404 = null (Vikipedi bağlantısı kalır). */
export async function videoDogrula(video, { fetchFn = fetch, sanatci = "", baslik = "" } = {}) {
  if (!video || !VIDEO_ID_RE.test(String(video.id || ""))) return null;
  try {
    const r = await fetchFn(oembedUrl(video.id), { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const v = resmiVideoMu(await r.json(), { sanatci, baslik });
    return v.ok ? { id: video.id, kanal: v.kanal } : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- 3) görsel
/** Albüm kapağı / kapak resmi / plak / afiş / non-free dosya adayı mı (sanatçı fotoğrafı yerine kapak asla). aday: commonsAday çıktısı. true = RET. */
export const KAPAK_RE = /(?<![a-z])(cover\s*art|album|albums|single\s+cover|cd\s+cover|lp\s+cover|record\s+cover|sleeve|soundtrack|vinyl|ep\s+cover|front\s+cover|back\s+cover|booklet|discography|cover|non-?free|fair\s+use|fairuse)(?![a-z])/i;
export function muzikGorselRet(aday) {
  const metin = `${aday?.baslik || ""} ${aday?.metin || ""} ${aday?.ustMetin || ""}`;
  if (KAPAK_RE.test(metin)) return true;
  const l = String(aday?.lisans || "").toLowerCase();
  if (/non-?free|fair\s*use|all rights|copyrighted/.test(l)) return true;
  const a = aday?.lisansAyrinti;
  return !!(a && a.nonFree);   // "Copyrighted" bayrağı CC BY / CC BY-SA dosyalarda da True olur: yalnız NonFree (Commons non-free şablonu) ret
}

/** Dersin görsel aday sırası: önce sanatçı (qid), sonra seri enstrüman/mekân yedekleri. Model adayı KULLANILMAZ. */
export function muzikAdaylari(d) {
  const sonuc = [];
  const s = d?.sanatci;
  if (s?.qid && s?.ad_en) sonuc.push({ tur: s.tur === "kurum" ? "kurum" : "kisi", ad_en: s.ad_en, ...(s.ad_tr ? { ad_tr: s.ad_tr } : {}), qid: s.qid });
  for (const e of d?.gorsel_ek || []) if (e?.qid && e?.ad_en) sonuc.push({ tur: "nesne", ad_en: e.ad_en, qid: e.qid });
  return sonuc;
}

const SINIF_BELIRSIZ = new Set(["Q4167410", "Q13406463", "Q4167836", "Q11266439", "Q15407973"]);
const degerler = (c) => (Array.isArray(c) ? c.filter((s) => s?.rank !== "deprecated" && s?.mainsnak?.snaktype === "value") : []);
const ilkDeger = (c) => { const l = degerler(c); const t = l.find((s) => s.rank === "preferred") || l[0]; return t?.mainsnak?.datavalue?.value; };
/**
 * wdFn kurucu: aday.qid varsa Wikidata varlığını KİMLİKLE getirir (ad araması yok, belirsizlik yok); etiket aday adıyla uyuşmalı, tür (insan / insan değil) uyumlu olmalı, anlam ayrımı olmamalı.
 * qid yoksa ya da yedek verilmişse yedek (wikidataBul) çağrılır. -> gorsel.mjs plan döngüsünün beklediği {durum, varlik|neden}
 */
export function kimlikliWdKur({ fetchFn = fetch, yedek = null } = {}) {
  return async function wdFn(aday, baglam) {
    if (!aday?.qid) return yedek ? yedek(aday, baglam) : { durum: "yok", neden: "qid yok" };
    try {
      const p = new URLSearchParams({ action: "wbgetentities", ids: aday.qid, props: "claims|labels|descriptions", languages: "en", format: "json" });
      const r = await fetchFn(`https://www.wikidata.org/w/api.php?${p}`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
      if (!r.ok) return { durum: "hata", neden: `HTTP ${r.status}` };
      const e = (await r.json())?.entities?.[aday.qid];
      if (!e || e.missing !== undefined) return { durum: "yok", neden: "qid yok" };
      const etiket = e.labels?.en?.value || "";
      if (katla(etiket) !== katla(aday.ad_en)) return { durum: "belirsiz", neden: "etiket qid ile uyuşmuyor" };
      const c = e.claims || {};
      const sinif = degerler(c.P31).map((s) => s.mainsnak.datavalue?.value?.id).filter(Boolean);
      if (sinif.some((s) => SINIF_BELIRSIZ.has(s))) return { durum: "tur", neden: "anlam ayrımı" };
      if ((aday.tur === "kisi") !== sinif.includes("Q5")) return { durum: "tur", neden: "tür uyumsuz (kişi/grup)" };
      const dosya = ilkDeger(c.P18);
      return { durum: "ok", varlik: { id: aday.qid, etiket, aciklama: e.descriptions?.en?.value || "", gorselAdi: typeof dosya === "string" ? dosya : "", logoAdi: "", spor: false } };
    } catch (err) { return { durum: "hata", neden: String(err?.message || err).slice(0, 40) }; }
  };
}
