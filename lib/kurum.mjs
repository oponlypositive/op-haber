// Kaynak TÜRÜ ön elemesi (modelsiz): kaynaklar.json `tur` alanı.
//   kurum  : BM kuruluşları, Kızılhaç, Nobel vb. Yalnız SOMUT OLUMLU SONUÇ haberleri geçer (tamamlandı, ulaştı, azaldı, kurtarıldı, açıldı, ödül, keşif, onay, başarı).
//            Çağrı/uyarı/kriz/çatışma/"endişe"/bağış kampanyası/siyasi açıklama ELENİR. Kurum akışı siyasete en açık akıştır: ret listesi geniş, olumlu işaret şartı vardır.
//   kisisel: kişisel gelişim / iyi oluş (araştırma temelli yazılar). "5 ipucu" listeleri, sağlık iddiası, ruh sağlığı sorunları ELENİR.
//   soylesi: söyleşi/portre; ek ön eleme yok (genel kurallar + özet/derleme sayfası elemesi on_eleme.haberOlmayan'da).
// Saf işlevler (ağ yok).
import { kelimeRe } from "./alanlar.mjs";

// OLUMLU SONUÇ işaretleri (kurum). Kök (*) eşleşmesi. "Çağrı" ya da "uyarı" sözcükleri burada yok.
export const KURUM_OLUMLU = kelimeRe([
  "complet*", "reach*", "reduc*", "eliminat*", "eradicat*", "certif*", "rescued", "rescues", "saved", "restor*", "revive*", "reopen*", "opens", "opened", "inaugurat*", "unveil*",
  "award*", "prize*", "laureate*", "discover*", "breakthrough*", "approv*", "milestone*", "success*", "achiev*", "record*",
  "protected area*", "planted", "vaccinated", "enrol*", "graduat*", "clean water", "free of", "malaria-free", "polio-free", "cured",
  "tamamlandı", "ulaştı", "azaldı", "kurtarıldı", "açıldı", "ödül*", "keşif*", "onay*", "başarı*", "rekor*", "iyileş*", "sertifika*",
]);
// KESİN RET (kurum): çağrı, uyarı, kriz, çatışma, kampanya, siyasi açıklama.
export const KURUM_RET = kelimeRe([
  "calls", "call for", "call on", "calling", "urge*", "appeal*", "warn*", "alert*", "concern*", "alarm*", "deplor*", "condemn*", "demand*", "must", "should", "need*", "plea", "pledg*", "donat*", "funding gap*", "shortfall*", "underfund*", "fund us", "support us", "give now", "your gift",
  "crisis", "crises", "emergency", "emergencies", "catastroph*", "disaster*", "earthquake*", "quake*", "flood*", "cyclone*", "hurricane*", "typhoon*", "famine*", "starv*", "hunger", "malnutrition", "outbreak*", "epidemic*", "pandemic*", "cholera", "ebola", "measles",
  "conflict*", "war", "wars", "warfare", "attack*", "violen*", "killed", "kill*", "death*", "dead", "died", "casualt*", "massacre*", "genocide*", "atrocit*", "torture*", "abuse*", "trafficking", "slavery", "armed", "weapon*", "nuclear", "terror*", "hostage*", "siege", "bombard*", "shelling", "ceasefire*", "truce", "peace talks",
  "sanction*", "security council", "general assembly", "peacekeep*", "resolution*", "secretary-general", "member states", "treaty", "negotiation*", "summit", "diplomat*", "envoy", "mandate*", "veto", "geneva convention", "human rights council", "rights violation*",
  "gaza", "palestin*", "israel*", "ukrain*", "russia*", "sudan*", "syria*", "yemen", "afghanistan", "myanmar", "haiti", "somalia", "congo", "tigray", "libya", "iraq", "iran*", "lebanon", "kashmir", "taliban", "hamas", "hezbollah", "rohingya",
  "refugee*", "displac*", "asylum", "migrant*", "stateless", "deport*", "border*", "detention",
  "climate crisis", "climate emergency", "extinction", "collapse", "threat*", "risk*", "decline*", "declining", "lagging", "falling short", "setback*", "failure*", "fail*", "worsen*", "devastat*", "suffer*", "vulnerab*", "poverty", "inequalit*", "discriminat*", "stigma",
  "aşırı", "çağrı*", "uyarı*", "endişe*", "kriz*", "savaş*", "çatışma*", "yardım kampanya*", "bağış kampanya*", "mülteci*", "göçmen*",
]);
// YUMUŞAK RET: insani bağlamı ağır sözcükler; yalnız en az İKİ farklı olumlu işaret varsa geçer.
export const KURUM_YUMUSAK = kelimeRe(["humanitarian*", "aid", "relief", "poverty", "refugee*", "children in need", "vulnerable", "recovery", "reconstruction"]);

const farkliEslesme = (rx, metin) => { const g = new Set(); for (const m of String(metin).matchAll(new RegExp(rx.source, "giu"))) g.add(m[0].toLowerCase().slice(0, 6)); return g; };

/** Kurum akışı ön elemesi. Başlık + özet küçük harfe çevrilmeden verilir. -> {ok, neden} */
export function kurumOnEleme(aday) {
  const metin = `${aday.baslik} ${aday.ozet || ""}`.replace(/İ/g, "i").toLowerCase();
  const r = KURUM_RET.exec(metin);
  if (r) return { ok: false, neden: `kurum:ret:${r[0].slice(0, 20)}` };
  const olumlu = farkliEslesme(KURUM_OLUMLU, metin);
  if (olumlu.size === 0) return { ok: false, neden: "kurum:olumlu-sonuc-yok" };
  const y = KURUM_YUMUSAK.exec(metin);
  if (y && olumlu.size < 2) return { ok: false, neden: `kurum:yumusak:${y[0].slice(0, 20)}` };
  return { ok: true, neden: "" };
}

// Kişisel gelişim / iyi oluş: sağlık iddiası, tedavi/diyet vaadi, ruh sağlığı sorunları, bağımlılık, felaket dili.
export const KISISEL_RET = kelimeRe([
  "cure*", "cures", "detox*", "superfood*", "miracle*", "boost your", "immune system", "lose weight", "weight loss", "diet*", "supplement*", "vitamin*", "anti-aging", "biohack*", "hack*", "remed*", "treat*", "therapy for", "diagnos*", "symptom*",
  "depress*", "suicid*", "self-harm", "anxiety disorder*", "bipolar", "schizophren*", "ptsd", "trauma*", "abuse*", "addict*", "overdose*", "eating disorder*", "burnout", "loneliness epidemic", "grief", "bereave*", "mourning", "cancer", "dementia", "alzheimer*",
  "tips", "tricks", "secrets of", "habits of", "morning routine*", "productivity hack*", "get rich", "manifest*", "astrolog*", "horoscope*",
  "hastalık*", "tedavi*", "depresyon*", "intihar*", "travma*", "bağımlılık*", "diyet*", "mucize*",
]);
/** Kişisel gelişim/iyi oluş ön elemesi. -> {ok, neden} */
export function kisiselOnEleme(aday) {
  const metin = `${aday.baslik} ${aday.ozet || ""}`.replace(/İ/g, "i").toLowerCase();
  const r = KISISEL_RET.exec(metin);
  return r ? { ok: false, neden: `kisisel:ret:${r[0].slice(0, 20)}` } : { ok: true, neden: "" };
}

/** Kaynak türüne göre ek ön eleme (on_eleme.onEleme çağırır). tur yoksa geçer. */
export function turOnEleme(aday) {
  if (aday.tur === "kurum") return kurumOnEleme(aday);
  if (aday.tur === "kisisel") return kisiselOnEleme(aday);
  return { ok: true, neden: "" };
}
