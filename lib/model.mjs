// Model istemcileri: Gemini generateContent REST (birincil) ve Cloudflare Workers AI REST (isteğe bağlı yedek).
// Anahtarlar başlıkta gider (adrese yazılmaz). Hata ve kota durumları ayrı sınıflarla bildirilir; sessizce yutulmaz.
export class KotaDoldu extends Error {}
export class ModelHatasi extends Error {}

const dur = (ms) => new Promise((r) => setTimeout(r, ms));
const GEMINI_ADRES = "https://generativelanguage.googleapis.com/v1beta/models";

/** Bozuk JSON'a dayanıklı ayrıştırma: çit işaretlerini ve dış metni atar, ilk { ... son } aralığını dener. */
export function jsonAyikla(metin) {
  let t = String(metin ?? "").replace(/```(?:json)?/gi, "").trim();
  const bas = t.indexOf("{"), son = t.lastIndexOf("}");
  if (bas < 0 || son <= bas) return null;
  t = t.slice(bas, son + 1);
  try { return JSON.parse(t); } catch {
    try { return JSON.parse(t.replace(/,\s*([}\]])/g, "$1")); } catch { return null; }   // sondaki virgül
  }
}

/** 429/5xx'te üstel bekleme; süre dolunca 429 -> KotaDoldu. */
async function yenidenDeneyerek(istek, { fetchFn, bekleFn, bekleme = [2000, 6000] } = {}) {
  let son = 0;
  for (let i = 0; i <= bekleme.length; i++) {
    let r;
    try { r = await istek(); } catch (e) {
      if (i < bekleme.length) { await bekleFn(bekleme[i]); continue; }
      throw new ModelHatasi(`ağ: ${String(e.message || e).slice(0, 60)}`);
    }
    son = r.status;
    if (r.ok) return r;
    if ((r.status === 429 || r.status >= 500) && i < bekleme.length) { await bekleFn(bekleme[i]); continue; }
    break;
  }
  if (son === 429) throw new KotaDoldu("429 kota/hız sınırı");
  throw new ModelHatasi(`HTTP ${son}`);
}

/**
 * Gemini: tek çağrı. resim (isteğe bağlı) = {b64, tur}. JSON çıktı için responseMimeType kullanılır;
 * şema kodda ayrıca doğrulanır (responseSchema bilerek gönderilmez: model sürümleri arasında şema desteği değişebilir).
 * -> {metin, engellendi}
 */
export async function geminiCagir({ anahtar, model, sistem, girdi, resim, sicaklik = 0.4, azamiToken = 3000, fetchFn = fetch, bekleFn = dur, bekleme }) {
  if (!anahtar) throw new ModelHatasi("GEMINI_API_KEY yok");
  const parcalar = [{ text: girdi }];
  if (resim) parcalar.push({ inlineData: { mimeType: resim.tur, data: resim.b64 } });
  const govde = {
    ...(sistem ? { systemInstruction: { parts: [{ text: sistem }] } } : {}),
    contents: [{ role: "user", parts: parcalar }],
    generationConfig: { responseMimeType: "application/json", temperature: sicaklik, maxOutputTokens: azamiToken },
  };
  const r = await yenidenDeneyerek(() => fetchFn(`${GEMINI_ADRES}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": anahtar }, body: JSON.stringify(govde), signal: AbortSignal.timeout(60000),
  }), { fetchFn, bekleFn, bekleme });
  const j = await r.json().catch(() => null);
  if (j?.promptFeedback?.blockReason) return { metin: "", engellendi: String(j.promptFeedback.blockReason) };
  const c = j?.candidates?.[0];
  const metin = (c?.content?.parts || []).map((p) => p.text || "").join("");
  if (!metin) return { metin: "", engellendi: c?.finishReason || "bos" };
  return { metin, engellendi: "" };
}

/** Cloudflare Workers AI REST (yedek; yalnız metin). model: örn. @cf/meta/llama-3.1-8b-instruct — kimlik YEDEK_MODEL ortam değişkeninden. */
export async function cloudflareCagir({ hesap, belirtec, model, sistem, girdi, azamiToken = 3000, fetchFn = fetch, bekleFn = dur, bekleme }) {
  if (!hesap || !belirtec || !model) throw new ModelHatasi("yedek model ayarlı değil");
  const r = await yenidenDeneyerek(() => fetchFn(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(hesap)}/ai/run/${model}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${belirtec}` },
    body: JSON.stringify({ messages: [{ role: "system", content: sistem || "" }, { role: "user", content: girdi }], max_tokens: azamiToken }),
    signal: AbortSignal.timeout(90000),
  }), { fetchFn, bekleFn, bekleme });
  const j = await r.json().catch(() => null);
  const metin = j?.result?.response;
  if (typeof metin !== "string" || !metin) throw new ModelHatasi("yedek model boş yanıt");
  return { metin, engellendi: "" };
}

/** Birincil Gemini, kota/hata olursa tanımlıysa yedek. KotaDoldu yedek de yoksa yukarı atılır. */
export function modelKur(ayar, { fetchFn = fetch, bekleFn = dur, bekleme } = {}) {
  const yedekVar = !!(ayar.yedekModel && ayar.cfHesap && ayar.cfBelirtec);
  return {
    yedekVar,
    async yaz(sistem, girdi, secenek = {}) {
      try {
        return { ...(await geminiCagir({ anahtar: ayar.geminiAnahtar, model: ayar.geminiModel, sistem, girdi, fetchFn, bekleFn, bekleme, ...secenek })), saglayici: ayar.geminiModel };
      } catch (e) {
        if (!yedekVar || secenek.resim) throw e;
        const y = await cloudflareCagir({ hesap: ayar.cfHesap, belirtec: ayar.cfBelirtec, model: ayar.yedekModel, sistem, girdi, fetchFn, bekleFn, bekleme });
        return { ...y, saglayici: ayar.yedekModel };
      }
    },
  };
}
