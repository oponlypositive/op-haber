// 2026-10-13 fotoğraflı haber oranı: Openverse/Pexels sağlayıcıları, lisans süzgeci, sıra, yedek terim, yer-özne yedeği, ret kodları. Ağsız (fetch taklit).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ayarOku } from "../lib/ayar.mjs";
import { aramaTerimi, ciktiDogrula } from "../lib/dogrula.mjs";
import { ISTEM } from "../lib/yaz.mjs";
import { openverseAra, openverseBelirtec, pexelsAra, lisansOk, sec, puan, arsivMi, fotoDegilMi, vlSorusu, vlDegerlendir, VL_BEKLENEN, VL_OZNE_BEKLENEN, gorselBul, gorselIndir } from "../lib/gorsel.mjs";
import { ozetSatiri } from "../hat.mjs";

const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const fImg = async () => ({ ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer });
const yanit = (o) => ({ metin: JSON.stringify(o) });
const vlOk = { ...VL_BEKLENEN, kisa_gerekce: "ok" }, vlOzneOk = { ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" };
const model = (cevap = vlOk) => ({ yaz: async () => yanit(cevap) });
const cand = (ek) => ({ baslik: "x.jpg", metin: "x", lisans: "CC BY-SA 4.0", w: 1280, h: 850, yil: 2019, yaratici: "Foto", url: "https://u/" + Math.random(), kaynak_url: "https://c/wiki", saglayici: "wikimedia", ...ek });
const ovSonuc = (ek = {}) => ({ id: "i1", title: "Coral Reef", foreign_landing_url: "https://www.flickr.com/photos/1/2", url: "https://live.staticflickr.com/8656/1_b.jpg", creator: "NOAA", license: "pdm", license_version: "1.0",
  license_url: "https://creativecommons.org/publicdomain/mark/1.0/", provider: "flickr", source: "flickr", category: "photograph", filetype: "jpg", tags: [{ name: "coral" }, { name: "reef" }], mature: false,
  height: 768, width: 1024, thumbnail: "https://api.openverse.org/v1/images/i1/thumb/", "unstable__sensitivity": [], ...ek });
const ovFetch = (sonuclar, { durum = 200, baslik = {} } = {}) => { const cagrilar = []; const f = async (url, o) => { cagrilar.push({ url: String(url), o }); return { ok: durum === 200, status: durum, headers: new Headers(baslik), json: async () => ({ results: sonuclar }) }; }; f.cagrilar = cagrilar; return f; };

// ---------- Openverse
test("openverseAra: lisans beyaz listesi + mature=false + fotoğraf; ND/NC, küçük, hassas, mature elenir; atıf alanları dolu", async () => {
  const f = ovFetch([ovSonuc(), ovSonuc({ id: "nd", license: "by-nd" }), ovSonuc({ id: "nc", license: "by-nc" }), ovSonuc({ id: "kucuk", width: 800 }), ovSonuc({ id: "hassas", "unstable__sensitivity": ["sensitive_text"] }),
    ovSonuc({ id: "m", mature: true }), ovSonuc({ id: "gif", filetype: "gif" }), ovSonuc({ id: "by", license: "by", license_version: "2.0", url: "https://x.example/o.jpg", thumbnail: "https://api.openverse.org/v1/images/by/thumb/", width: 4000, height: 3000 })]);
  const r = await openverseAra("coral reef", { fetchFn: f });
  assert.equal(f.cagrilar.length, 1);
  const u = new URL(f.cagrilar[0].url);
  assert.equal(u.origin + u.pathname, "https://api.openverse.org/v1/images/");
  assert.equal(u.searchParams.get("license"), "cc0,pdm,by,by-sa");           // ND ve NC yok
  assert.equal(u.searchParams.get("mature"), "false");
  assert.equal(u.searchParams.get("category"), "photograph");
  assert.deepEqual(r.map((x) => x.lisans), ["Public Domain", "CC BY 2.0"]);
  const [pd, by] = r;
  assert.equal(pd.saglayici, "openverse"); assert.equal(pd.yaratici, "NOAA"); assert.equal(pd.kaynak_url, "https://www.flickr.com/photos/1/2"); assert.match(pd.lisans_url, /creativecommons/);
  assert.equal(pd.url, "https://live.staticflickr.com/8656/1_b.jpg");        // Flickr _b: doğrudan; küçük sürüm yedek
  assert.equal(by.url, "https://api.openverse.org/v1/images/by/thumb/");     // diğerlerinde Openverse küçük sürümü (900 KB sınırı), özgün yedek
  assert.equal(by.yedekUrl, "https://x.example/o.jpg");
  assert.equal(by.ozgunW, 4000);
  for (const x of r) assert.equal(lisansOk(x.lisans), true);
});

test("openverseAra: bütçe tükenince ağa gidilmez; 429 ve günlük hak azalması turu durdurur", async () => {
  const butce = { kalan: 2, dur: false };
  const f = ovFetch([ovSonuc()], { baslik: { "x-ratelimit-available-anon_sustained": "150" } });
  await openverseAra("a", { fetchFn: f, butce }); await openverseAra("b", { fetchFn: f, butce });
  assert.equal((await openverseAra("c", { fetchFn: f, butce })).length, 0);
  assert.equal(f.cagrilar.length, 2);
  assert.equal(butce.kalanGunluk, 150);
  const b429 = { kalan: 6, dur: false };
  await assert.rejects(openverseAra("a", { fetchFn: ovFetch([], { durum: 429 }), butce: b429 }), /429/);
  assert.equal(b429.dur, true);
  const f2 = ovFetch([], { baslik: { "x-ratelimit-available-anon_sustained": "5" } }), b2 = { kalan: 6, dur: false };
  await openverseAra("a", { fetchFn: f2, butce: b2 });
  assert.equal(b2.dur, true, "günlük hak < 15: bu tur durur");
  await openverseAra("b", { fetchFn: f2, butce: b2 });
  assert.equal(f2.cagrilar.length, 1);
});

test("openverseBelirtec: kimlik yoksa istek yok; varsa client_credentials; hata = anonim devam", async () => {
  let n = 0;
  assert.equal(await openverseBelirtec("", "", { fetchFn: async () => { n++; } }), ""); assert.equal(n, 0);
  let govde = "";
  const t = await openverseBelirtec("id", "sir", { fetchFn: async (u, o) => { govde = o.body; return { ok: true, json: async () => ({ access_token: "TOKEN" }) }; } });
  assert.equal(t, "TOKEN"); assert.match(govde, /grant_type=client_credentials/);
  assert.equal(await openverseBelirtec("id", "sir", { fetchFn: async () => { throw new Error("ağ"); } }), "");
  // belirteç Authorization başlığına gider
  const f = ovFetch([]); await openverseAra("x", { fetchFn: f, belirtec: "TOKEN" });
  assert.equal(f.cagrilar[0].o.headers.Authorization, "Bearer TOKEN");
});

// ---------- Pexels
test("pexelsAra: anahtar yoksa sessizce [] (ağ yok); varsa Authorization başlığı + atıf alanları", async () => {
  let n = 0;
  assert.deepEqual(await pexelsAra("coral", "", { fetchFn: async () => { n++; } }), []); assert.equal(n, 0);
  let basl = null;
  const f = async (u, o) => { basl = o.headers; return { ok: true, status: 200, json: async () => ({ photos: [
    { width: 4000, height: 2600, url: "https://www.pexels.com/photo/1/", photographer: "Ada", alt: "Coral reef underwater", src: { large: "https://images.pexels.com/1.jpg?w=940" } },
    { width: 600, height: 400, url: "https://www.pexels.com/photo/2/", photographer: "Bob", alt: "tiny", src: { large: "https://images.pexels.com/2.jpg" } }] }) }; };
  const r = await pexelsAra("coral reef", "KEY", { fetchFn: f });
  assert.equal(basl.Authorization, "KEY");
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].saglayici, r[0].lisans, r[0].yaratici, r[0].kaynak_url], ["pexels", "Pexels License", "Ada", "https://www.pexels.com/photo/1/"]);
  assert.equal(lisansOk("Pexels License"), true);
});

// ---------- kural tabanlı sıralama
test("sec: başlık örtüşmesi, yatay oran, çözünürlük ve yeni tarih öne; çizim/vektör/harita/siyah-beyaz (etiket dahil) elenir", () => {
  const a = (baslik, ek = {}) => cand({ baslik, metin: baslik, ...ek, url: "https://u/" + baslik });
  const sirali = sec([
    a("Coral reef sunrise", { w: 1000, h: 1500, yil: 2008, ozgunW: 1000 }),             // dikey, eski
    a("Reef photo", { metin: "Reef photo coral", w: 2000, h: 1200, yil: 2022 }),         // başlıkta yalnız 1 terim
    a("Coral reef underwater", { w: 2400, h: 1400, yil: 2023 }),                         // başlıkta iki terim + büyük + yatay + yeni
    a("Coral reef vector illustration"), a("Coral reef map"), a("Coral reef", { metin: "Coral reef blackandwhite", yil: 2020 }),
  ], ["coral", "reef"], 5).map((x) => x.baslik);
  assert.deepEqual(sirali, ["Coral reef underwater", "Reef photo", "Coral reef sunrise"]);
  assert.equal(fotoDegilMi("Solar panels clipart"), true); assert.equal(fotoDegilMi("Solar panels on a roof"), false);
  assert.equal(arsivMi({ metin: "tree blackandwhite" }), true);
  assert.ok(puan(cand({ metin: "coral reef", baslik: "Coral reef", ozgunW: 4000, w: 600, h: 400 }), ["coral", "reef"]) > puan(cand({ metin: "coral reef", baslik: "x", w: 640, h: 400, yil: null }), ["coral", "reef"]));
});

// ---------- sağlayıcı sırası, yedek terim, yer-özne yedeği
const haber = (ek = {}) => ({ en: { baslik: "Reef nursery doubles coral growth", ozet: "Divers grew coral fragments on frames." }, tr: { baslik: "", ozet: "" }, yer: "Dünya", gorselAra: "coral reef", ...ek });

test("gorselBul sırası: özne Commons -> özne Openverse -> konu Commons -> konu Openverse -> Pixabay/Pexels; ilk uygun görselde durur", async () => {
  const sira = [];
  const araFn = async (q, tur) => { sira.push(tur); return []; };
  await gorselBul(haber({ gorselOzne: { ad: "Great Barrier Reef", tur: "yer" } }), { model: model(), araFn, fetchFn: fImg, bekleFn: async () => {} });
  const tekil = sira.filter((t, i) => t !== sira[i - 1]);
  assert.deepEqual(tekil, ["ozne", "ozne_ov", "gercek", "gercek_ov", "yedek"]);
  // Commons konu adayı bulunursa Openverse'e hiç gidilmez
  const sira2 = [];
  const r = await gorselBul(haber(), { model: model(), fetchFn: fImg, bekleFn: async () => {}, araFn: async (q, tur) => { sira2.push(tur); return tur === "gercek" ? [cand({ baslik: "Coral reef.jpg", metin: "Coral reef.jpg coral reef", url: "https://u/c" })] : []; } });
  assert.equal(r.sonuc.gorsel.saglayici, "wikimedia");
  assert.ok(!sira2.includes("gercek_ov") && !sira2.includes("yedek"));
});

test("gorselBul: Commons boşsa Openverse adayı seçilir (konu yolu) ve atıf alanları korunur; yer çelişkisi Openverse adayına da uygulanır", async () => {
  const ov = cand({ baslik: "Coral reef", metin: "Coral reef coral reef", saglayici: "openverse", lisans: "CC BY 2.0", lisans_url: "https://creativecommons.org/licenses/by/2.0/", yaratici: "Ada Foto", kaynak_url: "https://www.flickr.com/photos/9/9", ozgunW: 3000, url: "https://u/ov" });
  const celisen = cand({ baslik: "Coral reef lecture", metin: "Coral reef lecture hall Indiana University", saglayici: "openverse", url: "https://u/ov2" });
  const r = await gorselBul(haber(), { model: model(), fetchFn: fImg, bekleFn: async () => {}, araFn: async (q, tur) => (tur === "gercek_ov" ? [celisen, ov] : []) });
  assert.equal(r.sonuc.gorsel.saglayici, "openverse");
  assert.deepEqual([r.sonuc.gorsel.lisans, r.sonuc.gorsel.sahibi, r.sonuc.gorsel.kaynak_url, r.sonuc.gorsel.lisans_url], ["CC BY 2.0", "Ada Foto", "https://www.flickr.com/photos/9/9", "https://creativecommons.org/licenses/by/2.0/"]);
  assert.ok(r.notlar.some((n) => /gercek_ov: 2 aday, 1 uygun, 1 yer çelişkisi/.test(n)), r.notlar.join("|"));
});

test("yedek terim: gorsel_arama sonuç vermezse gorsel_arama2 aranır ve kendi terimleriyle puanlanır", async () => {
  const sorgular = [];
  const araFn = async (q, tur) => { sorgular.push(q); return tur === "gercek" && q === "telescope" ? [cand({ baslik: "Telescope dome.jpg", metin: "Telescope dome.jpg telescope", url: "https://u/t" })] : []; };
  const r = await gorselBul(haber({ gorselAra: "hydrogen cloud survey", gorselAra2: "telescope" }), { model: model(), araFn, fetchFn: fImg, bekleFn: async () => {} });
  assert.ok(sorgular.includes("hydrogen cloud survey") && sorgular.includes("telescope"), sorgular.join(","));
  assert.ok(sorgular.indexOf("hydrogen cloud survey") < sorgular.indexOf("telescope"), "asıl terim önce");
  assert.equal(r.sonuc.gorsel.saglayici, "wikimedia");
});

test("yer-özne yedeği: model özne vermedi ama haberde yer/kurum adı var -> o yerin fotoğrafı özne yolunda aranır (ozne:true)", async () => {
  const sorgular = [];
  const araFn = async (q, tur) => { sorgular.push([q, tur]); return tur === "ozne" ? [cand({ baslik: "Yellowstone National Park Grand Prismatic.jpg", metin: "Yellowstone National Park Grand Prismatic.jpg", url: "https://u/y" })] : []; };
  const h = haber({ en: { baslik: "Bison herd grows in Yellowstone", ozet: "The herd is thriving." }, gorselAra: "bison herd", yerKurum: "Yellowstone National Park" });
  const r = await gorselBul(h, { model: model(vlOzneOk), araFn, fetchFn: fImg, bekleFn: async () => {} });
  assert.deepEqual(sorgular[0], ['"Yellowstone National Park"', "ozne"]);
  assert.equal(r.sonuc.ozne, true);
  assert.ok(r.notlar[0].includes("yer-yedek"));
  // yer-özne reddedilirse model özne vermiş sayılmaz: nötr yola düşer, bina araması TEKRARLANMAZ
  const sorgu2 = [];
  await gorselBul(h, { model: model({ ...vlOzneOk, ozne_eslesiyor: false }), araFn: async (q, tur) => { sorgu2.push(q); return tur === "ozne" ? [cand({ baslik: "Yellowstone National Park.jpg", metin: "Yellowstone National Park.jpg", url: "https://u/y2" })] : []; }, fetchFn: fImg, bekleFn: async () => {} });
  assert.ok(!sorgu2.some((q) => /building/.test(q)));
});

test("özne: Commons bulamazsa Openverse özne adayı denenir; konu yoluna en az bir denetim hakkı kalır (vlUst)", async () => {
  const araFn = async (q, tur) => (tur === "ozne_ov" ? [cand({ baslik: "Monarch butterfly", metin: "Monarch butterfly", saglayici: "openverse", url: "https://u/m" })] : []);
  const r = await gorselBul(haber({ gorselAra: "butterfly", gorselOzne: { ad: "Monarch butterfly", tur: "tur" } }), { model: model(vlOzneOk), araFn, fetchFn: fImg, bekleFn: async () => {} });
  assert.equal(r.sonuc.gorsel.saglayici, "openverse"); assert.equal(r.sonuc.ozne, true);
  let vl = 0;
  const hep = { yaz: async () => { vl++; return yanit({ ...vlOzneOk, ozne_eslesiyor: false }); } };
  const ar = async (q, tur) => [1, 2, 3].map((i) => cand({ baslik: `Monarch butterfly ${i}`, metin: `Monarch butterfly ${i} butterfly`, url: `https://u/${tur}${i}` }));
  const ret = await gorselBul(haber({ gorselAra: "butterfly", gorselOzne: { ad: "Monarch butterfly", tur: "tur" } }), { model: hep, araFn: ar, fetchFn: fImg, bekleFn: async () => {}, vlUst: 4 });
  assert.equal(ret.sonuc, null);
  assert.ok(vl <= 4, `vl=${vl}`);
  assert.ok(Object.keys(ret.retKodlari).some((k) => k.startsWith("n.")), "konu yoluna denetim hakkı kaldı");
});

test("varsayılan arama: Pexels anahtarı varsa Authorization ile çağrılır, Pixabay anahtarsız atlanır; Openverse bütçesi turlar arası paylaşılır", async () => {
  const urller = [], basliklar = {};
  const f = async (url, o) => {
    const u = String(url); urller.push(u); basliklar[new URL(u).host] = o?.headers;
    if (u.includes("commons.wikimedia.org")) return { ok: true, status: 200, headers: new Headers(), json: async () => ({}) };
    if (u.includes("api.openverse.org/v1/images/?")) return { ok: true, status: 200, headers: new Headers(), json: async () => ({ results: [] }) };
    if (u.includes("api.pexels.com")) return { ok: true, status: 200, headers: new Headers(), json: async () => ({ photos: [{ width: 3000, height: 2000, url: "https://www.pexels.com/photo/7/", photographer: "Pia", alt: "Coral reef", src: { large: "https://images.pexels.com/7.jpg" } }] }) };
    if (u.includes("pixabay")) throw new Error("Pixabay çağrılmamalı");
    return fImg();
  };
  const butce = { openverse: { kalan: 3, dur: false } };
  const r = await gorselBul(haber(), { model: model(), fetchFn: f, bekleFn: async () => {}, pexelsAnahtar: "PEXELSKEY", butce });
  assert.equal(r.sonuc.gorsel.saglayici, "pexels");
  assert.equal(basliklar["api.pexels.com"].Authorization, "PEXELSKEY");
  assert.equal(urller.filter((u) => u.includes("api.openverse.org/v1/images/?")).length, 1, "tek terimli konuda tek Openverse isteği (aynı sorgu tekrarlanmaz)");
  assert.equal(butce.openverse.kalan, 2);
  // bütçe 0: Openverse'e hiç gidilmez
  urller.length = 0;
  await gorselBul(haber(), { model: model(), fetchFn: f, bekleFn: async () => {}, pexelsAnahtar: "K", butce: { openverse: { kalan: 0, dur: false } } });
  assert.equal(urller.filter((u) => u.includes("api.openverse.org/v1/images/?")).length, 0);
  // anahtarlar yoksa yedek aşama hiç çalışmaz
  urller.length = 0;
  const bos = await gorselBul(haber(), { model: model(), fetchFn: f, bekleFn: async () => {} });
  assert.equal(bos.sonuc, null);
  assert.ok(!urller.some((u) => u.includes("pexels")));
});

test("gorselIndir: birincil adres başarısızsa yedek adres denenir", async () => {
  const f = async (u) => (String(u).includes("birinci") ? { ok: false, status: 403 } : { ok: true, status: 200, arrayBuffer: async () => jpeg().buffer });
  const d = await gorselIndir({ url: "https://x/birinci.jpg", yedekUrl: "https://x/ikinci.jpg", w: 1000 }, { fetchFn: f });
  assert.equal(d.tur, "image/jpeg");
  await assert.rejects(gorselIndir({ url: "https://x/birinci.jpg", w: 1000 }, { fetchFn: f }), /403/);
});

// ---------- görsel denetimi: yumuşatılmış konu ölçütü + ret kodu kırılımı
test("görsel denetimi: konu ölçütü temsili/yanıltıcı olmayan görseli kabul eder; güvenlik alanları ve yer çelişkisi metni aynen durur", () => {
  const s = vlSorusu("Solar farm opens", "text", false, "Gobi Solar Park");
  assert.match(s, /plausibly illustrates the story/); assert.match(s, /would not mislead/);
  for (const alan of ["siyah_beyaz_ya_da_arsiv", "ciplak_ya_da_uygunsuz", "taninabilir_yuz_baskin", "kisi_grubu_poz", "yazi_logo_baskin", "hassas_simge", "dusuk_kalite", "cinsiyet_ya_da_yas_uyumsuz", "yer_ya_da_kurum_uyumsuz", "insan_ayirt_edilebilir"]) assert.match(s, new RegExp(`"${alan}"`));
  assert.match(s, /ANOTHER country/); assert.match(s, /identifiable university, school, lecture hall, stadium/);
  assert.equal(vlDegerlendir(JSON.stringify({ ...VL_BEKLENEN, konuya_uygun: false })).kod, "konu");
  assert.equal(vlDegerlendir(JSON.stringify({ ...VL_BEKLENEN, yer_ya_da_kurum_uyumsuz: true })).kod, "yer-kurum");
  assert.equal(vlDegerlendir(JSON.stringify({ ...VL_BEKLENEN, insan_ayirt_edilebilir: true })).kod, "insan");
  assert.equal(vlDegerlendir("bozuk").kod, "bozuk");
  assert.equal(vlDegerlendir(JSON.stringify({ ...VL_OZNE_BEKLENEN, ozne_eslesiyor: false }), { ozne: true }).kod, "ozne-yok");
});

test("ret kodları gorselBul sonucunda toplanır ve özet satırına vlRet/gorselKaynak olarak yazılır", async () => {
  const ar = async (q, tur) => (tur === "gercek" ? [cand({ baslik: "Coral reef.jpg", metin: "Coral reef.jpg coral reef", url: "https://u/k" })] : []);
  const r = await gorselBul(haber(), { model: model({ ...VL_BEKLENEN, konuya_uygun: false }), araFn: ar, fetchFn: fImg, bekleFn: async () => {} });
  assert.deepEqual(r.retKodlari, { "n.konu": 1 });
  const satir = ozetSatiri({ aday: 1, yeniAday: 1, onElemeGecen: 1, elenen: 0, bekleyenGorsel: 0, bekleyenKaynak: 0, yayinlanan: 2, kota: 0, sureSn: 3, durus: "tamam", modelCagri: 2, red: {}, redKodlari: {}, vlRet: { "n.konu": 3, "n.insan": 1 }, gorselKaynak: { openverse: 1, wikimedia: 1 } });
  assert.match(satir, / vlRet=n\.konu:3,n\.insan:1 gorselKaynak=openverse:1,wikimedia:1/);
});

// ---------- model çıktısı: yedek terim + istem
test("model çıktısı: gorsel_arama2 ayıklanır (aynıysa düşer); istem somut nesne, yedek terim, özne örnekleri ve yer yedeğini ister", () => {
  assert.equal(aramaTerimi("Coral  Reef!"), "coral reef"); assert.equal(aramaTerimi("people team"), ""); assert.equal(aramaTerimi("a b c d e f"), ""); assert.equal(aramaTerimi(5), "");
  for (const re of [/gorsel_arama2/, /SOMUT/, /Soyut kavram/, /radio telescope|solar panels/, /Betelgeuse|Voyager 1/, /Yellowstone National Park/, /James Webb/, /çocuk, mağdur/]) assert.match(ISTEM, re);
  const EN = "A group of neighbors in Lakeside spent three weekends planting 5000 trees beside the river. Local schools joined the effort and brought along their classes. The young trees will soon give shade to a footpath that many families use every day. The park also has a small tool library that is open to anyone. It is a simple example of what a community can do together when people share the work and the time.";
  const TR = "Lakeside'daki komşular, üç hafta sonu boyunca nehir kıyısına 5000 ağaç dikti. Yerel okullar da sınıflarıyla birlikte bu çalışmaya katıldı. Genç ağaçlar kısa süre sonra, birçok ailenin her gün kullandığı yürüyüş yoluna gölge verecek. Parkta ayrıca herkese açık küçük bir alet kütüphanesi bulunuyor. Bu, insanlar işi ve zamanı paylaştığında bir topluluğun birlikte neler başarabileceğinin sade bir örneği.";
  const kaynak = "Volunteers in Lakeside planted 5,000 trees along the river over three weekends. Neighbors and local schools shared the work and a small tool library now serves the park. 5000";
  const d = (ek) => ({ uygun: true, kategori: "doga", yer: "Lakeside, Dünya", en: { baslik: "Neighbors plant 5000 trees by the river", ozet: EN }, tr: { baslik: "Komşular nehir kıyısına 5000 ağaç dikti", ozet: TR }, ...ek });
  const v = ciktiDogrula(d({ gorsel_arama: "street trees", gorsel_arama2: "tree planting" }), kaynak, "Trees");
  assert.equal(v.ok, true, v.neden);
  assert.equal(v.haber.gorselAra, "street trees"); assert.equal(v.haber.gorselAra2, "tree planting");
  assert.equal("gorselAra2" in ciktiDogrula(d({ gorsel_arama: "trees", gorsel_arama2: "trees" }), kaynak, "Trees").haber, false);
});

test("ayar: PEXELS_API_KEY, OPENVERSE_TUR_UST (varsayılan 6, 0 kapalı), isteğe bağlı OpenVerse kimliği; anahtar yoksa boş", () => {
  const v = ayarOku({}, []);
  assert.equal(v.pexelsAnahtar, ""); assert.equal(v.openverseUst, 6); assert.equal(v.vlUst, 3);
  const k = ayarOku({ PEXELS_API_KEY: "p", OPENVERSE_TUR_UST: "0", OPENVERSE_CLIENT_ID: "i", OPENVERSE_CLIENT_SECRET: "s" }, []);
  assert.deepEqual([k.pexelsAnahtar, k.openverseUst, k.openverseKimlik, k.openverseSir], ["p", 0, "i", "s"]);
});
