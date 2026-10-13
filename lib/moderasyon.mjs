// OP çift filtre (tasarim/5-onlypositive.md OP1): (1) hassas konu yok (siyaset, din, etnik, savaş/şiddet/suç), (2) kaba dil yok.
// Ücretsiz ilk katman: kelime listesi. Yayında ikinci katman olarak ucuz model eklenecek.
// Eşleşme KELİME bazlı: "kelime" = tam kelime, "kok*" = bu kökle başlayan kelime, "a b*" = ardışık kelimeler.
// Kelimeler ASCII'ye katlanır (ş→s, ı→i...) ki Türkçe harfsiz yazım da yakalansın; "=" ile başlayan girişler
// Türkçe harfleri KORUYAN biçimde eşleşir (ör. "=ölüm*" -> "olumlu" kelimesine takılmasın).
// Bu dosya op/app/moderasyon.js dosyasının BİREBİR ESM kopyasıdır (Deno + Node ortak çekirdek). Kelime listesi/mesaj değişirse
// önce moderasyon.js değişir, sonra bu dosya yeniden üretilir; bulut/dogrulama/moderasyon_dogrula.mjs ikisini karşılaştırır.

const GORUNMEZ = /[­​-‏⁠﻿]/g;
function kelimeler(metin, katla) {
  let t = String(metin || "").normalize("NFC").replace(GORUNMEZ, "");
  t = t.replace(/İ/g, "i").replace(/I/g, katla ? "i" : "ı").toLowerCase();
  if (katla) t = t.normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
  const liste = t.split(katla ? /[^a-z0-9]+/ : /[^\p{L}\p{N}]+/u).filter(Boolean);
  // "s a v a ş" gibi harf harf yazılanları birleştir
  const sonuc = [];
  for (let i = 0; i < liste.length; i++) {
    if (liste[i].length === 1) {
      let j = i, k = "";
      while (j < liste.length && liste[j].length === 1) k += liste[j++];
      if (k.length >= 3) { sonuc.push(k); i = j - 1; continue; }
    }
    sonuc.push(liste[i]);
  }
  return sonuc;
}

const HASSAS = {
  siyaset: ["siyase*", "siyasi*", "milletvekil*", "cumhurbaskan*", "basbakan*", "bakan", "bakanlik*", "belediye baskan*", "belediyesi*", "belediyemiz*",
    "valilik*", "valilig*", "valisi", "kaymakam*", "mudurlug*", "bakanlig*", "genel mudur*", "kamu kurum*", "devlet kurum*", "devlet daire*", "devlet bahce*", "muhalefet*", "iktidar*", "secim kampanya*", "akp", "chp", "mhp", "hdp", "dem parti*", "siyasi parti*",
    "politika*", "politic*", "election*", "president*", "parliament*", "senator*", "democrat*", "republican*", "minister*", "government*", "mayor*", "municipalit*"],
  din: ["din", "dini", "dinin", "dine", "dinde", "dinden", "dinsel*", "dindar*", "allah*", "insallah", "masallah", "namaz*", "hayri", "hayrı", "mevlit*", "mevlüt*", "kurban*", "iftar*", "asure*", "aşure*", "kandil*", "cami", "camii", "camide", "camiye",
    "camiden", "camiler*", "cemevi*", "kilise*", "tapinag*", "tapinak*", "sinagog*", "peygamber*", "kuran", "kurani", "incil*", "tevrat*", "ateist*",
    "religio*", "church*", "mosque*", "god", "jesus"],
  etnik: ["etnik*", "irkci*", "irkcilik*", "=kürt*", "ermeni*", "yahudi*", "arap", "araplar*", "rum", "rumlar*", "cingene*", "racis*", "ethnic*"],
  savas: ["savas", "savasi", "savasta", "savastan", "savasa", "savasin", "savaslar*", "savasan*", "savasci*", "bombal*", "bomb", "bombs", "bombing*", "teror*", "terror*",
    "silah*", "katliam*", "saldiri*", "fuze*", "asker*", "isgal*", "mayin*", "multeci*", "=ölüm*", "olum", "olumu", "olume", "olumden", "olumun",
    "=öldür*", "cinayet*", "kan akti", "cezaevi*", "hapis*", "hapse*", "mahpus*", "hukumlu*", "tutuklu*", "tutuklan*", "suc", "suclu*",
    "prison*", "inmate*", "jail*", "convict*", "war", "wars", "warfare", "weapon*", "missile*", "kill", "kills", "killed", "killing*", "murder*",
    "army", "armies", "invasion*", "shooting*"],
  kaba: ["aptal*", "salak*", "gerizekal*", "geri zekal*", "mal", "ahmak*", "siktir*", "sik", "amk", "aq", "orospu*", "pic", "yavsak*", "serefsiz*",
    "kahrolsun*", "nefret ediyorum", "geber*", "lanet olsun", "idiot*", "stupid*", "hate you", "fuck*", "shit*", "bitch*", "loser*", "dumb"],
};
// "Savaş" yaygın bir isim: büyük harfle başlayan, cümle başı olmayan ya da yanında "abi/abla/bey/hanım/ile..." olan tek "Savaş" kelimesi isimdir
const ISIM_YANI = /^(abi|abim|abime|abimin|abla|bey|hanim|ile|ve|amca|dayi|hoca|hocam|kardesim|arkadasim|oglum|abisi|bey'?in)$/;

// girişleri derle: { ham: Türkçe harf korunur mu, parcalar: [{k, onek}] }
const KURALLAR = Object.entries(HASSAS).map(([tur, liste]) => [tur, liste.map(g => {
  const ham = g.startsWith("="), metin = ham ? g.slice(1) : g;
  return { g: metin, ham, parcalar: metin.split(" ").map(p => ({ k: p.replace(/\*$/, ""), onek: p.endsWith("*") })) };
})]);
const uyar = (kelime, p) => (p.onek ? kelime.startsWith(p.k) : kelime === p.k);
function eslesir(kelimeler_, kural) {
  const n = kural.parcalar.length;
  for (let i = 0; i + n <= kelimeler_.length; i++) {
    let ok = true;
    for (let j = 0; j < n && ok; j++) ok = uyar(kelimeler_[i + j], kural.parcalar[j]);
    if (ok && kural.g === "savas" && ISIM_YANI.test(kelimeler_[i + 1] || "")) ok = false;   // "Savaş abimin..." = isim
    if (ok) return true;
  }
  return false;
}

const MESAJ = {
  siyaset: "Bu biraz siyasete kayıyor ☁️ OP'de siyaset konuşmuyoruz; içindeki güzel anı anlatmaya ne dersin?",
  din: "OP'de inanç konularını herkesin kendine bırakıyoruz 🌿 Paylaşımını bu kısım olmadan dener misin?",
  etnik: "OP'de herkes sadece insan 🤗 Kimlik vurgusu olmadan paylaşmayı dener misin?",
  savas: "Bu konu biraz ağır geldi ☁️ OP'de sadece iyi haberler var; içindeki umut veren tarafı anlatır mısın?",
  kaba: "Bu cümle biraz bulutlu görünüyor 🌥️ Daha nazik bir dille tekrar yazar mısın?",
};

function denetle(metin) {
  const katli = kelimeler(metin, true), ham = kelimeler(metin, false);
  for (const [tur, kurallar] of KURALLAR) {
    for (const k of kurallar) if (eslesir(k.ham ? ham : katli, k)) return { ok: false, tur, mesaj: MESAJ[tur] };
  }
  return { ok: true };
}

export { denetle };
