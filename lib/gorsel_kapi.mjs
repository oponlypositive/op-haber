// GÖRSEL UYGUNLUK KAPISI (2026-10-17, sahip: "Haber ve fotoğraflar arası uygunsuzluklar çok fazla"). Saf işlevler, ağ yok.
// Her aday görsel (plan / özne / nötr / stok yolu) gorsel.mjs içinde bu kapıdan geçer; dönen kod "" ise geçer, doluysa RET nedenidir:
//   ozel-kisi:*      selfie / özçekim / "me, my" metni (yalnız özne olan NESNE/eser/yer için muaf: Perseverance_selfie), tanınan olmayan kişi adı, haberde geçmeyen kişi adı
//   kurum-binasi     bilim/sağlık/teknoloji haberinde araştırmayı yapan kurumun binası/kampüsü (haber kurumun kendisi hakkında değilse: açılış, ödül, bina, kampüs)
//   spor-*           başka maçın/rakip takımın/rakip oyuncunun fotoğrafı, başka tarih, spor KİŞİ haberinde kişi dışı görsel, yabancı kurum etkinliği (hava kuvvetleri, okul...)
//   olumsuz:*        çürük, kırık, ölü, kafatası, iskelet, çöp, kan... çağrışımlı görsel (haberin kendisi bunu anlatmıyorsa); canlı hayvan haberine müze örneği
//   stok-*           stok fotoğrafın etiketleri haberin dalı/konusuyla örtüşmüyor (güreşe "target/archery")
// Kurum odaklılık, soyut sorgu sözcükleri ve ders düzeyinde görsel zorunluluğu için de yardımcılar burada.
import { bransIpuclari, haberBransi, sporKisiHaberi } from "./gorsel_spor.mjs";

const duz = (t) => String(t ?? "").replace(/İ/g, "i").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/ß/g, "ss");
const kamel = (t) => String(t ?? "").replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, "$1 $2");     // AngellHall -> Angell Hall
/** Katlanmış sözcük listesi (harf/rakam dışı ayraç). */
export const sozcukler = (t) => duz(t).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
const dizi = (t) => " " + sozcukler(t).join(" ") + " ";
const DURAK = new Set(["the", "of", "de", "da", "di", "del", "der", "van", "von", "and", "for", "la", "le", "el", "al", "a", "an", "in", "on", "at"]);
/** Ad (anlamlı tüm sözcükleri) katlanmış metinde tam sözcük olarak geçiyor mu? */
export function adGecer(metin, ad) {
  const kel = sozcukler(ad).filter((k) => k.length >= 2 && !DURAK.has(k));
  if (!kel.length) return false;
  const m = dizi(metin);
  return kel.every((k) => m.includes(" " + k + " "));
}
const baslikDosya = (a) => String(a.baslik || "").replace(/\.(jpe?g|png|webp|gif|tiff?)$/i, "");
const haberMetni = (h) => `${h?.en?.baslik || ""} ${h?.en?.ozet || ""} ${h?.tr?.baslik || ""} ${h?.tr?.ozet || ""} ${h?.yer || ""} ${h?.yerKurum || ""} ${h?.gorselAra || ""}`;
const haberBasliklari = (h) => `${h?.en?.baslik || ""} ${h?.tr?.baslik || ""}`;

// ---------------------------------------------------------------- 1) ÖZEL KİŞİ
const SELFIE = /(?:^| )(selfies?|self portrait|selfportrait|me|my|mine|ozcekim\w*|kendi cekimim)(?= |$)/;
const KISI_OLMAYAN_TUR = new Set(["nesne", "eser", "yer", "mekan", "konum", "tur", "kurum"]);
// Dosya adında kişi adı gibi görünen ikili (iki ardışık Baş Harfli sözcük) için DIŞLANAN sözcükler: yer, kurum, ay/gün, uyruk, ortak adlar
const ADSIZ = new Set(("university college school institute academy museum hospital stadium stadyum arena park lake river mount mountain island bridge tower castle church cathedral temple library airport station square street road avenue city town village national international royal saint san santa los las new old north south east west central great little upper lower main building campus hall center centre dome oval quad gate front view panorama aerial night day morning evening summer winter spring autumn fall " +
  "january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday ocak subat mart nisan mayis haziran temmuz agustos eylul ekim kasim aralik " +
  "spanish english french german italian turkish chinese japanese russian american european african asian indian korean greek dutch swedish norwegian danish finnish polish brazilian mexican canadian australian british irish scottish welsh swiss austrian " +
  "class room lab laboratory team club league cup final match game women men girls boys world olympic olympics championship championships tournament grand prix open air force navy army medical health care science research technology space telescope observatory satellite rocket solar energy " +
  "turkey turkiye ankara istanbul izmir bursa antalya konya trabzon samsun rize aydin corum usa america california texas york indiana boston chicago washington seattle angeles francisco canada toronto vancouver montreal mexico brazil argentina chile peru colombia england london scotland wales ireland dublin france paris germany berlin munich italy rome milan spain madrid barcelona portugal lisbon netherlands amsterdam belgium brussels switzerland zurich geneva austria vienna sweden stockholm norway oslo denmark copenhagen finland helsinki poland warsaw czech prague hungary budapest greece athens romania bulgaria ukraine russia moscow china beijing shanghai hong kong japan tokyo osaka korea seoul india delhi mumbai pakistan thailand bangkok vietnam indonesia singapore malaysia philippines australia sydney melbourne zealand egypt cairo morocco nigeria kenya ethiopia africa cape town israel iran iraq saudi dubai qatar azerbaijan baku georgia " +
  "king queen prince princess lord lady sir saint harbour harbor port beach coast bay sea ocean valley forest garden square market street plaza center photo image picture view detail panoramic sunset sunrise cloud clouds sky blue green red black white golden silver grey gray " +
  "reef barrier forest desert canyon falls glacier volcano cave valley hill hills peak summit cliff cliffs dune dunes savanna jungle rainforest wetland lagoon atoll archipelago strait gulf peninsula plateau steppe tundra meadow pond stream creek spring sunflower orchid rose tulip lotus " +
  "tree trees flower flowers leaf leaves apple apples fruit fruits animal bird birds fish cat dog horse cow bee bees butterfly water waterfall field fields farm road path trail track court pitch gym pool swimming running walking cycling bicycle yoga pilates stretch stretching exercise workout training session lesson study student students teacher children child family people crowd team squad fans").split(" "));
const AD_BICIMI = /^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’]{2,}$/;
/** Dosya adı/başlığında kişi adı gibi görünen ikililer (katlanmış "ad soyad"). Sezgisel: iki ardışık Baş Harfli sözcük, ikisi de yer/kurum/ortak ad listesinde değil. */
export function kisiAdiBenzerleri(baslik) {
  const t = String(baslik || "").replace(/\.(jpe?g|png|webp|gif|tiff?)$/i, "").replace(/[_\-–,.()\[\]/:;]+/g, " ").replace(/\s+/g, " ").trim().split(" ");
  const sonuc = [];
  for (let i = 0; i + 1 < t.length; i++) {
    const a = t[i], b = t[i + 1];
    if (!AD_BICIMI.test(a) || !AD_BICIMI.test(b) || ADSIZ.has(duz(a)) || ADSIZ.has(duz(b))) continue;
    sonuc.push(`${duz(a)} ${duz(b)}`);
  }
  return sonuc;
}
/**
 * Özel kişi / tanınmayan kişi kapısı. ctx: { yol: "plan"|"ozne"|"notr"|"stok", ozne: {ad, tur}|null, p18: bool }.
 * - selfie/özçekim/me/my sözcüğü: ret (özne bir NESNE/eser/yer/kurum ise ve adı dosyada geçiyorsa muaf: Perseverance_selfie).
 * - özne KİŞİ ve dosya Wikidata P18 değilse: kişinin tam adı dosya başlığında/açıklamasında geçmeli.
 * - kişi yoluyla (özne kişi) ya da nötr/stok yoluyla gelen dosya başlığında haberde GEÇMEYEN bir kişi adı varsa ret.
 */
export function ozelKisiRet(aday, haber, ctx = {}) {
  const baslik = baslikDosya(aday), ust = aday.ustMetin ?? aday.metin ?? "";
  const m = SELFIE.exec(dizi(`${baslik} ${ust}`));
  const o = ctx.ozne;
  if (m && !(o && KISI_OLMAYAN_TUR.has(o.tur) && o.ad && adGecer(`${baslik} ${ust}`, o.ad))) return `ozel-kisi:${m[1]}`;
  if (ctx.p18) return "";
  const kisiYolu = (ctx.yol === "plan" || ctx.yol === "ozne") && o?.tur === "kisi";
  if (kisiYolu && o.ad && !adGecer(`${baslik} ${ust}`, o.ad)) return "ozel-kisi:ad-yok";
  if (kisiYolu || ctx.yol === "notr" || ctx.yol === "stok") {
    const hm = dizi(haberMetni(haber) + " " + (o?.ad || ""));
    for (const ad of kisiAdiBenzerleri(baslik)) if (!hm.includes(" " + ad.split(" ").join(" ") + " ")) return `ozel-kisi:baska-ad:${ad}`;
  }
  return "";
}

// ---------------------------------------------------------------- 2) KURUM BİNASI
const BINA = /(?:^| )(universit\w*|college|campus|kampus\w*|institute|enstitu\w*|faculty|fakulte\w*|hospital|hastane\w*|school|okul\w*|hall|building|bina\w*|dome|oval|quad|medical center|health center|healthcare|headquarters)(?= |$)/;
const KURUM_YASAK_KATEGORI = new Set(["bilim", "saglik", "teknoloji"]);
const KURUM_SOZ = /(universit\w*|institute|enstit\w*|college|hospital|hastane\w*|laborator\w*|observator\w*|academy|akademi\w*|\bschool\b|okul\w*|foundation|vakf\w*|\bmuseum\b|m[üu]ze\w*|center|centre|merkez\w*|\bNASA\b|\bCERN\b|\bMIT\b)/i;
const KURUM_OLAY = /(opens?|opened|opening|unveil\w*|inaugurat\w*|new (?:campus|building|centre|center|wing|lab)|award\w*|prize|anniversar\w*|founded|celebrat\w*|launch\w*|a[cç][iı]l[ıi][sş]\w*|a[cç][iı]ld[ıi]\w*|[öo]d[üu]l\w*|bina\w*|kamp[üu]s\w*|temel\w*|y[ıi]ld[öo]n[üu]m\w*|kurulu[sş]\w*)/i;
/** Haber kurumun KENDİSİ hakkında mı: başlığın ilk sözcüklerinde kurum adı + başlıkta kurumla ilgili olay (açılış, ödül, bina, kampüs, yıldönümü). Araştırmayı yapan kurum ("X Üniversitesi araştırmacıları") bunu sağlamaz. */
export function kurumOdakliMi(haber, ad = "") {
  const basliklar = [haber?.en?.baslik, haber?.tr?.baslik].filter(Boolean);
  for (const b of basliklar) {
    const ilk = String(b).split(/\s+/).slice(0, 5).join(" ");
    const adVar = ad ? adGecer(ilk, ad) || adGecer(b, ad) && ilk.length > 0 : KURUM_SOZ.test(ilk);
    if (adVar && KURUM_OLAY.test(b) && !/researchers?|scientists?|study|studies|ara[sş]t[ıi]rmac\w*|bilim insan\w*/i.test(ilk)) return true;
  }
  return false;
}
/** Kurum (üniversite/enstitü/şirket...) plan adayı yalnız haber kurum odaklıysa ya da bir spor takımı/kulübüyse aday olur. */
const TAKIM = /(?<![\p{L}])(fc|sc|sk|bk|fk|cf|team|club|women'?s|men'?s|basketball|volleyball|football|handball|spor|kul[üu]b\p{L}*|tak[ıi]m\p{L}*|basketbol|voleybol|futbol|united|city|athletic)(?![\p{L}])/iu;
export function kurumAdayiOk(aday, haber) {
  if (aday?.tur !== "kurum") return true;
  if (haber?.kategori === "spor" || TAKIM.test(String(aday.ad_en || "")) || /\p{L}spor(?!\p{L})/iu.test(String(aday.ad_en || ""))) return true;     // spor takımı/kulübü (Bursaspor...) serbest
  return kurumOdakliMi(haber, aday.ad_en) || kurumOdakliMi(haber, aday.ad_tr || "");
}
export function kurumBinasiRet(aday, haber, ctx = {}) {
  if (!KURUM_YASAK_KATEGORI.has(String(haber?.kategori || ""))) return "";
  const t = " " + sozcukler(kamel(`${baslikDosya(aday)} ${aday.ustMetin ?? aday.metin ?? ""}`)).join(" ") + " ";
  const m = BINA.exec(t);
  if (!m) return "";
  if (kurumOdakliMi(haber, ctx.ozne?.tur === "kurum" ? ctx.ozne.ad : "")) return "";
  return `kurum-binasi:${m[1]}`;
}
/** Haber bilim/sağlık/teknoloji kategorisinde ve kurum odaklı değil mi (VL'ye "kurum binası" sorusu eklenir). */
export const kurumBinasiYasakMi = (haber) => KURUM_YASAK_KATEGORI.has(String(haber?.kategori || "")) && !kurumOdakliMi(haber);

// ---------------------------------------------------------------- 3) SPOR: başka maç / rakip / tarih
const TAKIM_SUFFIX = /(spor|\bfc\b|\bsk\b|\bfk\b|\bbk\b|\bcf\b|united|\bcity\b|rovers|athletic|\breal\b|kul[üu]b|\bclub\b|\bsv\b|\btsg\b|\bvfl\b|\bfsv\b)/i;
const TAKIM_GENEL = new Set("fc sk fk bk cf ac afc sc tsg vfl fsv sv as ss ssc stadium stadyum arena match game mac final league cup kupa super lig season sezon women men vs v x the of de la kadin erkek takim team spor play playoff".split(" "));
const MAC_ISARETI = /(?:^| )(match|game|vs|versus|final|semifinal|mac|stadium|stadyum|season|sezon|derby|derbi|league|lig|cup|kupa)(?= |$)/;
const YABANCI_ETKINLIK = /(?:^| )(air force|usaf|navy|army|military|marines?|police|high school|college|university|ncaa|varsity|intramural|cadets?|academy|reserve)(?= |$)/;
const AYLAR = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11, ocak: 0, subat: 1, mart: 2, nisan: 3, mayis: 4, haziran: 5, temmuz: 6, agustos: 7, eylul: 8, ekim: 9, kasim: 10, aralik: 11 };
/** Metindeki TAM tarihler (ms): 2025-10-14, 20251014, 14 October 2025, October 14, 2025. */
export function tarihler(metin) {
  const t = duz(metin), s = [];
  for (const m of t.matchAll(/(?<!\d)(20\d\d)[-_. ]?(0[1-9]|1[0-2])[-_. ]?(0[1-9]|[12]\d|3[01])(?!\d)/g)) s.push(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  for (const m of t.matchAll(/(?<!\d)(\d{1,2})[ _.-]+([a-z]+)[ _.,-]+(20\d\d)(?!\d)/g)) if (AYLAR[m[2]] !== undefined) s.push(Date.UTC(+m[3], AYLAR[m[2]], +m[1]));
  for (const m of t.matchAll(/([a-z]+)[ _.-]+(\d{1,2})[ _.,-]+(20\d\d)(?!\d)/g)) if (AYLAR[m[1]] !== undefined) s.push(Date.UTC(+m[3], AYLAR[m[1]], +m[2]));
  return s;
}
const imzaSozcuk = (t) => String(t || "").split(/[^\p{L}\p{N}']+/u).filter((x) => x.length >= 2 && (x.length >= 3 || x === x.toUpperCase())).map((x) => duz(x.split(/['’]/)[0])).filter((x) => x && !/^\d+$/.test(x) && !TAKIM_GENEL.has(x));
/** Dosya başlığındaki iki takım/oyuncu çifti: "A vs B", "A v B", "A 6-0 B", "A-B" (takım benzeri). -> [sol, sağ] | null */
export function dosyaCifti(baslik) {
  let s = String(baslik || "").replace(/\.(jpe?g|png|webp|gif|tiff?)$/i, "").replace(/_/g, " ").replace(/\(\d+\)/g, " ").replace(/\s+/g, " ").trim();
  let m = s.match(/^(.*\S)\s+(?:vs?\.?|versus)\s+(\S.*)$/i);
  if (m) return [m[1], m[2]];
  m = s.match(/^(.*?[^\d\s])\s*\d{1,3}\s*[-–:]\s*\d{1,3}\s*([^\d\s].*)$/);
  if (m && /\p{L}{2}/u.test(m[1]) && /\p{L}{2}/u.test(m[2])) return [m[1], m[2]];
  const parcalar = s.split(/\s*[-–—]\s*/).filter(Boolean);
  if (parcalar.length === 2 && /\p{L}{3}/u.test(parcalar[0]) && /\p{L}{3}/u.test(parcalar[1]) && (TAKIM_SUFFIX.test(parcalar[0]) || TAKIM_SUFFIX.test(parcalar[1]))) return [parcalar[0], parcalar[1].replace(/\s+\d.*$/, "")];
  return null;
}
function tarafUygun(taraf, hSet, hDizi) {
  const sig = imzaSozcuk(taraf);
  if (!sig.length) return true;                                 // yalnız genel sözcük: karar verilemez, geç
  return sig.some((k) => hSet.has(k) || (k.length >= 5 && [...hSet].some((h) => h.length >= 5 && (h.startsWith(k) || k.startsWith(h)))) || hDizi.includes(" " + k + " "));
}
/** Haber başlıklarındaki Baş Harfli sözcükler (özne takım dışı = rakip adayı); kesmeden sonrası atılır ("KuPS'u" -> kups). */
function rakipAdaylari(haber, ozneAd) {
  const ozne = new Set(sozcukler(ozneAd));
  const set = new Set();
  for (const w of haberBasliklari(haber).split(/[^\p{L}\p{N}']+/u)) {
    const g = w.split(/['’]/)[0];
    if (g.length < 3 || !/^[A-ZÇĞİÖŞÜ]/.test(g)) continue;
    const k = duz(g);
    if (ozne.has(k) || TAKIM_GENEL.has(k) || RAKIP_DURAK.has(k)) continue;
    set.add(k);
  }
  return set;
}
const RAKIP_DURAK = new Set("beat beats defeat defeats win wins won victory champions champion league cup turkish super europa uefa fifa euroleague nba grand slam trophy title first final semi record breaks break historic season haftasinda gol mac".split(" "));
/**
 * Spor haberi kapısı. ctx: {yol, ozne, p18, simdi, haberTarihi}. Spor değilse "".
 */
export function sporRet(aday, haber, ctx = {}) {
  if (haber?.kategori !== "spor") return "";
  const baslik = baslikDosya(aday), ust = aday.ustMetin ?? aday.metin ?? "", tam = `${baslik} ${ust}`;
  const hm = dizi(haberMetni(haber));
  const kisiHaberi = sporKisiHaberi(haber);
  const o = ctx.ozne;
  if (kisiHaberi) {                                                 // kişi haberinde yalnız o kişinin kendi fotoğrafı
    if (ctx.yol === "notr" || ctx.yol === "stok") return "spor-kisi:notr";
    if (o && o.tur !== "kisi") return "spor-kisi:kisi-degil";
  }
  const yb = YABANCI_ETKINLIK.exec(dizi(tam));
  if (yb && !hm.includes(" " + yb[1] + " ")) return `spor-yabanci-etkinlik:${yb[1]}`;
  if (ctx.p18 && o?.tur === "kisi") return "";                        // Wikidata'nın kendi kişi görseli: maç/tarih sezgileri uygulanmaz
  const cift = dosyaCifti(baslik);
  const hSet = new Set(sozcukler(haberMetni(haber)));
  if (cift) {
    for (const taraf of cift) if (!tarafUygun(taraf, hSet, hm)) return `spor-baska-mac:${imzaSozcuk(taraf).slice(0, 2).join("+") || taraf.slice(0, 12)}`;
  }
  const macMi = !!cift || MAC_ISARETI.test(dizi(tam));
  if (macMi) {
    const yilHaber = new Date(ctx.haberTarihi ?? ctx.simdi ?? Date.now()).getUTCFullYear();
    for (const m of duz(tam).matchAll(/(?<!\d)(19\d\d|20\d\d)(?!\d)/g)) if (+m[1] < yilHaber - 1) return `spor-eski-tarih:${m[1]}`;
    const ht = ctx.haberTarihi ?? ctx.simdi ?? Date.now();
    for (const t of tarihler(baslik + " " + ust)) if (Math.abs(t - ht) > 4 * 86400_000) return "spor-baska-tarih";
  }
  if (o?.tur === "kurum" && !ctx.p18) {                             // takım haberinde rakip takımın/oyuncunun fotoğrafı: dosyada rakip adı var, kendi takım adı yok
    const kendi = sozcukler(o.ad).filter((k) => !TAKIM_GENEL.has(k) && k.length >= 3);
    const rakip = [...rakipAdaylari(haber, o.ad)];
    const t = dizi(tam);
    if (kendi.length && !kendi.some((k) => t.includes(" " + k + " ")) && rakip.some((k) => k.length >= 3 && t.includes(" " + k + " "))) return "spor-rakip-takim";
  }
  return "";
}

// ---------------------------------------------------------------- 4) OLUMSUZ ÇAĞRIŞIM + canlı hayvana müze örneği
const OLUMSUZ = /(?:^| )(rotten|rot|rotting|decay\w*|dead|death|dying|skull\w*|skeleton\w*|bones?|carcass\w*|corpse\w*|cadaver|garbage|trash|rubbish|waste|dump|litter|landfill|broken|cracked|ruins?|ruined|blood\w*|wound\w*|injur\w*|sick|diseased|dirty|polluted|pollution|smog|wilted|withered|moldy|mouldy|curuk|olu|olum|kafatasi|iskelet|cop|kan|kanli|kirik|les)(?= |$)/;
const MUZE_ORNEK = /(?:^| )(museum|specimens?|taxidermy|mounted|preserved|exhibit|diorama|natural history|collection|mount)(?= |$)/;
export function olumsuzRet(aday, haber) {
  const t = dizi(`${baslikDosya(aday)} ${aday.metin ?? ""} ${aday.ustMetin ?? ""}`), hm = dizi(haberMetni(haber));
  const m = OLUMSUZ.exec(t);
  if (m && !hm.includes(" " + m[1] + " ")) return `olumsuz:${m[1]}`;
  if (["hayvanlar", "doga"].includes(String(haber?.kategori || ""))) {
    const x = MUZE_ORNEK.exec(t);
    if (x && !hm.includes(" " + x[1] + " ")) return `olumsuz:muze-ornegi:${x[1]}`;
  }
  return "";
}

// ---------------------------------------------------------------- 5) STOK: soyut sorgu yasağı + etiket uyumu
/** Soyut/çağrışımsal sözcükler: stok sorgusu bunlardan ÜRETİLMEZ (okçuluk hedefi "victory + match + tournament" sorgusundan geldi). */
export const SOYUT_KELIME = new Set(("victory win wins winner winning won tournament success successful succeed match matches game games champion champions championship achievement achieve goal goals competition compete record records team teamwork celebration celebrate happiness happy joy strength strong power powerful energy future innovation innovative idea ideas concept growth progress better best top great big new first major important discovery breakthrough solution challenge challenges effort support help helping together community people person world global international national event events story report news research study science scientists scientific result results success hope inspiration motivation leadership").split(" "));
/** Terim listesinden soyutları atar (somut nesne/dal adları kalır). */
export const somutTerimler = (terimler) => (terimler || []).filter((k) => k && !SOYUT_KELIME.has(String(k).toLowerCase()));
/** Dala göre somut stok sorgusu (model somut terim vermediyse). */
export const BRANS_SORGU = { gures: "wrestling", yuzme: "swimming pool", atletizm: "running track", tenis: "tennis court", futbol: "football pitch", basketbol: "basketball court", voleybol: "volleyball net" };
const STOK_CELISKI = /(?:^| )(target|targets|bullseye|dartboard|archery|archer|arrow|arrows|bow)(?= |$)/;
export function stokUyumRet(aday, haber) {
  const t = dizi(`${baslikDosya(aday)} ${aday.metin ?? ""}`);
  const b = haberBransi(haber);
  if (b) {
    const s = bransIpuclari(t);
    if (!s.has(b)) return "stok-brans-yok";
    for (const x of s) if (x !== b) return `stok-brans:${x}`;
    if (b !== "okculuk" && STOK_CELISKI.test(t)) return "stok-brans:hedef-okculuk";
  }
  return "";
}

// ---------------------------------------------------------------- birleşik kapı
/**
 * Aday görsel kapısı. -> "" (geç) | ret kodu. ctx: {yol: plan|ozne|notr|stok, ozne:{ad,tur}|null, p18:bool, simdi, haberTarihi}.
 * haber: {en,tr,kategori,alt_konu,gorselOzne,gorselAdaylari,yer,yerKurum,zaman}.
 */
export function gorselKapi(aday, haber, ctx = {}) {
  const c = { haberTarihi: Number.isFinite(Date.parse(haber?.zaman)) ? Date.parse(haber.zaman) : undefined, ...ctx };
  return ozelKisiRet(aday, haber, c) || kurumBinasiRet(aday, haber, c) || sporRet(aday, haber, c) || olumsuzRet(aday, haber) || (c.yol === "stok" ? stokUyumRet(aday, haber) : "");
}
/** Listeyi kapıdan geçirir; retKodlari'na `k.<kod>` olarak sayar. -> kalan adaylar */
export function kapidanGecir(liste, haber, ctxFn, retKodlari = null) {
  return liste.filter((a) => {
    const k = gorselKapi(a, haber, typeof ctxFn === "function" ? ctxFn(a) : ctxFn);
    if (k && retKodlari) { const anahtar = `k.${k.split(":")[0]}`; retKodlari[anahtar] = (retKodlari[anahtar] || 0) + 1; }
    return !k;
  });
}
/** Yedek "yer" özneleri (haberdeki şehir/kurum adından görsel) yasak mı: bilim/sağlık/teknoloji (kampüs/bina çıkar) ve spor KİŞİ haberi (şehir/liman fotoğrafı). */
export const yedekYerYasakMi = (haber) => KURUM_YASAK_KATEGORI.has(String(haber?.kategori || "")) || sporKisiHaberi(haber);
