// Rozetli konu hesapları (op_mutfak, op_icecek, op_oyun, op_klasikler, op_ronesans, op_antik) + op_felsefe notu: havuz bütünlüğü, süzgeçler, telif, Vikikaynak doğrulaması,
// tarif sağduyusu, seçim/tekrar, denge/bütçe ve ağsız uçtan uca (sahte Vikipedi + Commons + model + bulut).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HAVUZ } from "../lib/konu_havuz.mjs";
import { KLASIKLER, KLASIK_GORSEL } from "../lib/konu_klasik_veri.mjs";
import { alintiSayfadaMi, alintiKatla, klasikHaberiIcerik, klasikSatirNedeni, sayfaYili, vikikaynakDuzMetin } from "../lib/konu_klasik.mjs";
import { ALKOL, KUMAR_PARA, SAGLIK, SIDDET, TARIH_YASAK } from "../lib/konu_yasak.mjs";
import {
  ANTIK_AGIRLIK, KONU_HESAPLARI, KONU_HESAP_ADLARI, baslikNedeni, bilgiDogrula, donemNo, gruplariKur, haftalikUst, havuzBoyu, kaynakHassasMi, konuIsleriCalistir, konuKimligi, konuKotaAyristir,
  konuSaatAraligi, konuSiraNedeni, konuUret, ogeler, oyunDogrula, tarifDogrula, tarifSayiNedeni, vlKonuDegerlendir,
} from "../lib/konu.mjs";
import { ACIKLAMA_ISTEMI, aciklamaDogrula } from "../lib/felsefe_not.mjs";
import { agirlikliSira, alintiHaberi, OZEL_PLAN } from "../lib/alinti.mjs";
import { YAZARLAR } from "../lib/alinti_yazarlar.mjs";
import { denetle } from "../lib/moderasyon.mjs";
import { konuYasak } from "../lib/on_eleme.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { EMOJI } from "../lib/dogrula.mjs";

const burasi = dirname(fileURLToPath(import.meta.url));
const ALT_SLUG = /^[a-z0-9-]{2,40}$/;
const ALT_ANTIK = ["misir", "cin", "mezoamerika", "sumer", "anadolu", "hint-vadisi", "yunan-roma"];

// ---------------------------------------------------------------- havuz bütünlüğü
test("havuzlar: en az boyutlar, benzersiz ad, kaynak alanı dolu, alt_konu slug, yasak kelime yok", () => {
  const asgari = { mutfak: 120, icecek: 80, oyun: 90, ronesans: 80, antik: 150 };
  for (const [anahtar, min] of Object.entries(asgari)) {
    const liste = HAVUZ[anahtar];
    assert.ok(liste.length >= min, `${anahtar}: ${liste.length} < ${min}`);
    const adlar = new Set();
    for (const [ad, tr, en, alt, gorsel, varyant] of liste) {
      assert.ok(typeof ad === "string" && ad.length >= 2, `ad: ${ad}`);
      assert.ok(!adlar.has(ad.toLowerCase()), `tekrar eden ad: ${ad}`); adlar.add(ad.toLowerCase());
      assert.ok(tr || en, `kaynak madde adı boş: ${ad}`);
      assert.match(alt, ALT_SLUG, `alt_konu: ${ad}`);
      assert.ok(gorsel === "" || /\.(jpe?g|png)$/i.test(gorsel), `görsel dosyası: ${ad}`);
      assert.ok(varyant === 0 || varyant === 1);
      assert.equal(denetle(ad).ok, true, `moderasyon: ${ad}`);
      assert.deepEqual(konuYasak(ad), [], `konu kapısı: ${ad}`);
      assert.doesNotMatch(ad, SAGLIK, `sağlık iddiası: ${ad}`);
      assert.doesNotMatch(ad, ALKOL, `alkol: ${ad}`);
    }
  }
  for (const [, , , alt] of HAVUZ.antik) assert.ok(ALT_ANTIK.includes(alt), alt);
  for (const [, , , alt] of HAVUZ.mutfak) assert.equal(alt, "yemek");
  for (const [, , , alt] of HAVUZ.icecek) assert.equal(alt, "icecek");
});

test("havuz: antik uygarlık dağılımı, Sümer ağırlığı belirgin; dini/ritüel/ölüm/savaş adlı öğe yok; görseller uygunsuz anahtar taşımaz", () => {
  const say = {}; for (const [, , , alt] of HAVUZ.antik) say[alt] = (say[alt] || 0) + 1;
  for (const a of ALT_ANTIK) assert.ok(say[a] >= 8, `${a}: ${say[a]}`);
  assert.ok(say.sumer >= 40 && say.sumer >= 2 * say["hint-vadisi"], `Sümer ağırlığı: ${JSON.stringify(say)}`);
  assert.ok(ANTIK_AGIRLIK.sumer >= 2 * Math.max(...ALT_ANTIK.filter((a) => a !== "sumer").map((a) => ANTIK_AGIRLIK[a])) - 0.5, "seçimde Sümer ağırlığı");
  for (const h of ["ronesans", "antik"]) for (const [ad, , , , g] of HAVUZ[h]) {
    assert.doesNotMatch(ad, TARIH_YASAK, `yasak konu adı: ${ad}`);
    assert.doesNotMatch(g, /tomb|temple|church|cathedral|mummy|grave|funeral|skull|nude|god |goddess|sacrific/i, `görsel adı: ${g}`);
  }
});

test("havuz: haftalık üst sınır havuzu tükenmeden yayar (tekrar penceresi)", () => {
  assert.equal(haftalikUst(120, 60), 14);
  for (const h of KONU_HESAP_ADLARI) assert.ok(havuzBoyu(h) > 0, h);
});

// ---------------------------------------------------------------- klasikler: telif + Vikikaynak doğrulaması
test("klasikler: >= 60 alıntı, hepsi telifsiz yazar, süzgeçten temiz, benzersiz; yalnız Vikikaynak sayfası adıyla", () => {
  assert.ok(KLASIKLER.length >= 60, String(KLASIKLER.length));
  const gor = new Set();
  for (const s of KLASIKLER) {
    assert.equal(klasikSatirNedeni(s), "", `${s.eser}: ${klasikSatirNedeni(s)}`);
    assert.ok(s.olum <= 1955, s.yazar);
    assert.ok(s.sayfa && s.eser && s.yazar && s.metin.length >= 55);
    assert.ok(!gor.has(s.metin), "tekrar"); gor.add(s.metin);
    assert.ok(["hikaye", "siir"].includes(s.tur));
  }
  assert.ok(new Set(KLASIKLER.map((s) => s.yazar)).size >= 2);
  assert.ok(KLASIK_GORSEL["Ahmet Haşim"]);
});

test("telif süzgeci: ölümü 1955 sonrası ya da bilinmeyen yazar alınmaz", () => {
  const s = { yazar: "X", olum: 1960, eser: "E", sayfa: "E", metin: "Bahçede çiçekler açmış ve çocuklar sevinçle oynuyordu bütün gün." };
  assert.match(klasikSatirNedeni(s), /telif/);
  assert.match(klasikSatirNedeni({ ...s, olum: undefined }), /telif/);
  assert.equal(klasikSatirNedeni({ ...s, olum: 1955 }), "");
  assert.match(klasikSatirNedeni({ ...s, olum: 1920, metin: "Ordu savaşa hazırlanırken askerler meydanda toplandı ve silahlarını aldı." }), /moderasyon|C3/);
});

const SAYFA = `{{eser başlığı
| başlık      = Deneme
| eser sahibi = Ömer Seyfettin
| notlar      = İlk yayım:''Genç Kalemler Mecmuası'', 1911, C.II
}}
Sabahleyin erkenden pencereyi açtı<ref>açtı: aralık bıraktı</ref> ve bahçedeki ağaçların ahenkli fısıltılarını
dinledi. Sonra kitaplarının dipsiz girdabına daldı.`;
test("Vikikaynak doğrulaması: alıntı sayfada AYNEN geçmeli (boşluk/satır sonu/dipnot farkı yok sayılır); tek harf farkı ret", () => {
  assert.equal(alintiSayfadaMi("Sabahleyin erkenden pencereyi açtı ve bahçedeki ağaçların ahenkli fısıltılarını dinledi.", SAYFA).ok, true);
  assert.equal(alintiSayfadaMi("Sabahleyin erkenden pencereyi açtı ve bahçedeki ağaçların ahenkli fısıltılarını dinledik.", SAYFA).ok, false);
  assert.match(alintiSayfadaMi("Sabahleyin erkenden pencereyi açtı ve bahçedeki ağaçların ahenkli fısıltılarını dinlemedi.", SAYFA).neden, /aynen/);
  assert.equal(alintiSayfadaMi("Sonra kitaplarının dipsiz girdabına daldı.", SAYFA).ok, true);
  assert.equal(alintiSayfadaMi("kısa", SAYFA).ok, false);
  assert.equal(alintiSayfadaMi("Sonra kitaplarının dipsiz girdabına daldı.", "{{Telif bilgisiz}}\n" + SAYFA).ok, false, "telif uyarılı sayfadan alıntı alınmaz");
  assert.equal(alintiSayfadaMi("Sonra kitaplarının dipsiz girdabına daldı.", "{{Kaynaksız}}\n" + SAYFA).ok, false);
  assert.equal(sayfaYili(SAYFA), 1911);
  assert.equal(sayfaYili("{{eser başlığı\n| notlar      =\n}}"), null, "yıl uydurulmaz");
  assert.ok(!vikikaynakDuzMetin(SAYFA).includes("aralık bıraktı"), "dipnot içeriği atılır");
  assert.equal(alintiKatla("a­b  c\n d’e"), "ab c d'e");
});

test("klasikHaberiIcerik: başlık ≤ 70, özgün Türkçe alıntı aynen, künye + Vikikaynak, kodla kurulur (uydurma yıl yok)", () => {
  const s = KLASIKLER[0];
  const ic = klasikHaberiIcerik(s, { yil: null, davetTr: "Davet.", davetEn: "Invite." });
  assert.ok(ic.tr.baslik.length <= 70);
  assert.ok(ic.tr.ozet.includes(`“${s.metin}”`) && ic.en.ozet.includes(s.metin));
  assert.match(ic.tr.ozet, /Vikikaynak/); assert.match(ic.en.ozet, /Wikisource/);
  assert.doesNotMatch(ic.tr.ozet, /İlk yayım yılı/);
  assert.match(klasikHaberiIcerik(s, { yil: 1911 }).tr.ozet, /1911/);
});

// ---------------------------------------------------------------- yasak ifade süzgeçleri
test("yasak kalıplar: sağlık iddiası, alkol, kumar/para, şiddet, din/ritüel/ölüm/savaş", () => {
  for (const m of ["Bağışıklığı güçlendirir", "vücudu detoks yapar", "zayıflamaya yardımcı olur", "iyi gelir", "şifa verir", "sağlıklı bir içecektir", "diyet için ideal", "kalorisi düşük", "boosts the immune system", "a healthy drink", "helps digestion"]) assert.match(m, SAGLIK, m);
  for (const m of ["500 gram un", "1 kilo domates", "mineral su", "ferahlatan limonata", "refreshing lemonade"]) assert.doesNotMatch(m, SAGLIK, `yanlış pozitif: ${m}`);
  for (const m of ["bir bardak şarap", "rakı ile servis edin", "bira mayası", "a splash of rum", "wine vinegar", "likör ekleyin"]) assert.match(m, ALKOL, m);
  for (const m of ["kazanan para alır", "bahis oynanır", "kumar", "ödül parası", "winner takes the prize money", "betting"]) assert.match(m, KUMAR_PARA, m);
  for (const m of ["rakibi döver", "kavga çıkar", "silahla", "punch your friend"]) assert.match(m, SIDDET, m);
  for (const m of ["tanrıya kurban", "tapınak", "cenaze töreni", "savaş arabası", "ritüel dansı", "ordu komutanı", "the temple priest", "burial rites", "a war of conquest"]) assert.match(m, TARIH_YASAK, m);
  for (const m of ["Kamış kalemle kil tablete yazılırdı.", "Sulama kanalları tarlalara su taşırdı.", "Nehir kıyısında büyük bir şehir kuruldu.", "Workshops produced lenses and clocks."]) assert.doesNotMatch(m, TARIH_YASAK, m);
  assert.equal(kaynakHassasMi("tanrı tapınak kurban ritüel savaş ordu ölüm cenaze mezar asker silah ".repeat(2)), true);
  assert.equal(kaynakHassasMi("Kil tabletler üzerine kamış kalemle yazı yazılırdı ve tahıl sayımı yapılırdı. ".repeat(10)), false);
});

// ---------------------------------------------------------------- tarif sağduyusu
const TARIF_IYI = {
  uygun: true, baslik_tr: "Mercimek çorbası", baslik_en: "Lentil soup",
  tr: { tanitim: "Kırmızı mercimekle yapılan, kıvamlı ve sıcak servis edilen sade bir ev çorbasıdır.", malzemeler: ["1 su bardağı kırmızı mercimek", "1 adet kuru soğan", "1 adet havuç", "1 yemek kaşığı tereyağı", "1 çay kaşığı tuz", "6 su bardağı sıcak su"],
    adimlar: ["Soğanı ve havucu doğrayıp tereyağında 5 dakika kavurun.", "Yıkanmış mercimeği ve sıcak suyu ekleyip kaynamaya bırakın.", "Kısık ateşte mercimekler iyice yumuşayana kadar 25 dakika pişirin.", "Çorbayı blenderdan geçirip tuzunu ayarlayın ve sıcak servis edin."] },
  en: { tanitim: "A smooth and warm everyday soup made with red lentils, onion and carrot.", malzemeler: ["1 cup red lentils", "1 onion", "1 carrot", "1 tablespoon butter", "1 teaspoon salt", "6 cups hot water"],
    adimlar: ["Chop the onion and carrot and sauté them in butter for 5 minutes.", "Add the rinsed lentils and the hot water and bring to a boil.", "Simmer on low heat for 25 minutes until the lentils are very soft.", "Blend the soup until smooth, adjust the salt and serve hot."] },
};
const kopya = (o) => JSON.parse(JSON.stringify(o));
test("tarif doğrulama: geçerli tarif kabul; 900 karakteri geçmez; başlık/gövde biçimi", () => {
  const v = tarifDogrula(TARIF_IYI, { ad: "Mercimek çorbası" });
  assert.equal(v.ok, true, v.neden);
  assert.ok(v.tr.metin.length <= 900 && v.en.metin.length <= 900);
  assert.match(v.tr.metin, /Malzemeler: .*\n\nYapılışı:\n1\. /s);
});
test("tarif doğrulama: sağlık iddiası, alkol, sayı sağduyusu, çiğ yumurta/et, malzeme-adım sayıları, birinci tekil kişi reddedilir", () => {
  const dene = (degis) => { const t = kopya(TARIF_IYI); degis(t); return tarifDogrula(t, { ad: "x" }); };
  assert.match(dene((t) => { t.tr.tanitim = "Bağışıklığı güçlendiren, sağlıklı ve besleyici bir çorbadır elbette."; }).neden, /sağlık/);
  assert.match(dene((t) => { t.tr.malzemeler[5] = "1 su bardağı şarap"; }).neden, /alkol/);
  assert.match(dene((t) => { t.tr.adimlar[2] = "Kısık ateşte 400 dakika pişirin ve mercimekleri iyice yumuşatın."; }).neden, /süre/);
  assert.match(dene((t) => { t.tr.adimlar[2] = "Fırını 500 derece ısıtın ve mercimekleri bu ısıda 25 dakika pişirin tamamen."; }).neden, /ısı/);
  assert.match(dene((t) => { t.tr.malzemeler.push(...Array(9).fill("1 adet ekstra malzeme")); t.en.malzemeler.push(...Array(9).fill("1 extra item")); }).neden, /malzeme sayısı/);
  assert.match(dene((t) => { t.tr.adimlar[0] = "Soğanı ve havucu doğrayıp tereyağında kavurun. ".repeat(5).trim(); }).neden, /adım/);
  assert.match(dene((t) => { t.tr.adimlar[0] = "Annem gibi soğanı ve havucu küçük küçük doğrayıp tereyağında 5 dakika kavurun."; }).neden, /birinci tekil/);
  assert.match(dene((t) => { t.tr.adimlar.pop(); }).neden, /adım sayısı/);
  assert.match(dene((t) => { t.en.adimlar.pop(); t.en.adimlar.push("x ".repeat(10).trim()); t.tr.malzemeler.pop(); }).neden, /./);
  assert.match(dene((t) => { t.tr.malzemeler.push("2 adet çiğ yumurta"); t.en.malzemeler.push("2 raw eggs"); }).neden, /çiğ|iyice|malzeme/);
  assert.equal(tarifDogrula({ uygun: false }, {}).ok, false);
  assert.match(dene((t) => { t.tr.tanitim = "Harika, enfes ve mükemmel bir çorba tarifi olarak herkesin sofrasına girer."; }).neden, /abartı/);
  assert.match(dene((t) => { t.tr.adimlar[0] = "Soğanı doğrayıp tereyağında kavurun ve afiyetle yiyin!"; }).neden, /ünlem/);
});
test("tarif sağduyusu: süre, ısı, gram/kg/litre, baharat; çiğ yumurta/et; Fahrenheit", () => {
  assert.equal(tarifSayiNedeni("25 dakika pişirin; 180 derece; 500 gram un; 2 kg patates; 1,5 litre su; 1 çay kaşığı tuz; 3 yumurta"), "");
  assert.match(tarifSayiNedeni("300 dakika pişirin"), /süre/);
  assert.match(tarifSayiNedeni("30 saat bekletin"), /süre/);
  assert.match(tarifSayiNedeni("3 saniye ... 500 saniye"), /süre/);
  assert.match(tarifSayiNedeni("400 derece fırında"), /ısı/);
  assert.match(tarifSayiNedeni("Bake at 350°F"), /Fahrenheit/);
  assert.match(tarifSayiNedeni("20 kg un"), /miktar/);
  assert.match(tarifSayiNedeni("9000 gram şeker"), /miktar/);
  assert.match(tarifSayiNedeni("12 yumurta"), /miktar/);
  assert.match(tarifSayiNedeni("5 yemek kaşığı tuz"), /baharat/);
  assert.match(tarifSayiNedeni("çiğ yumurta ekleyin"), /çiğ/);
  assert.match(tarifSayiNedeni("add raw egg"), /çiğ/);
  assert.equal(tarifSayiNedeni("20-25 dakika; 170-180 derece"), "");
});
test("tarif: çiğ riskli malzemeli tarifte 'iyice pişirin' notu şart (TR) / 'cook thoroughly' (EN)", () => {
  const t = kopya(TARIF_IYI);
  t.tr.malzemeler[1] = "250 gram tavuk göğsü"; t.en.malzemeler[1] = "250 g chicken breast";
  assert.match(tarifDogrula(t, {}).neden, /iyice pişirin/);
  t.tr.adimlar[2] = "Tavuk parçalarını iyice pişirin; kısık ateşte 25 dakika kaynatın.";
  assert.match(tarifDogrula(t, {}).neden, /iyice pişirin/, "EN notu da şart");
  t.en.adimlar[2] = "Cook the chicken thoroughly and simmer on low heat for 25 minutes.";
  assert.equal(tarifDogrula(t, {}).ok, true);
});

// ---------------------------------------------------------------- oyun
const OYUN_IYI = {
  uygun: true, baslik_tr: "Saklambaç", baslik_en: "Hide-and-seek",
  tr: { kisi: "3-8 kişi", gerekenler: "Bir bahçe ya da geniş bir oda", adimlar: ["Bir oyuncu ebe seçilir ve gözlerini kapatıp yüksek sesle ona kadar sayar.", "Diğer oyuncular sayı bitmeden saklanacak yerlerini bulur.", "Ebe 'saklandınız mı' diye seslenir ve saklananları aramaya çıkar.", "Bulunan oyuncu oyundan çıkar; en son bulunan sonraki turun ebesi olur."], ipucu: "Saklanma alanını önceden belirlemek oyunun herkes için güvenli kalmasına yardım eder." },
  en: { kisi: "3-8 players", gerekenler: "A garden or a large room", adimlar: ["One player is chosen as the seeker and counts to ten with closed eyes.", "The other players find a hiding place before the counting ends.", "The seeker calls out and goes looking for the hidden players.", "A found player leaves the round; the last one found becomes the next seeker."], ipucu: "Agreeing on the hiding area beforehand keeps the game safe and fair for everyone." },
};
test("oyun doğrulama: geçerli kabul; para/bahis/kumar, şiddet, adım sayısı, kişi sayısı, ipucu ret", () => {
  assert.equal(oyunDogrula(OYUN_IYI, {}).ok, true, oyunDogrula(OYUN_IYI, {}).neden);
  const dene = (f) => { const o = kopya(OYUN_IYI); f(o); return oyunDogrula(o, {}); };
  assert.match(dene((o) => { o.tr.adimlar[3] = "Kaybeden oyuncu kazanana para öder ve oyun yeniden başlar."; }).neden, /para|kumar/);
  assert.match(dene((o) => { o.tr.adimlar[3] = "Bulunan oyuncuya bahis oynanır ve tur yeniden başlar."; }).neden, /para|kumar/);
  assert.match(dene((o) => { o.tr.adimlar[3] = "Bulunan oyuncuyu yumruk ve tekme ile oyundan çıkarır."; }).neden, /şiddet/);
  assert.match(dene((o) => { o.tr.adimlar.pop(); o.en.adimlar.pop(); o.tr.adimlar.pop(); o.en.adimlar.pop(); }).neden, /adım sayısı/);
  assert.match(dene((o) => { o.tr.kisi = "bilinmiyor"; }).neden, /kişi/);
  assert.match(dene((o) => { o.tr.ipucu = "Kısa."; }).neden, /ipucu/);
  assert.match(dene((o) => { o.tr.gerekenler = "Çocukken biz annemle bu oyunu bahçede oynardık eskiden."; }).neden, /birinci tekil/);
  assert.equal(oyunDogrula({ uygun: false }, {}).ok, false);
});

// ---------------------------------------------------------------- bilgi (antik / Rönesans)
const KAYNAK_CIVI = `Çivi yazısı, Mezopotamya'da yaklaşık MÖ 3400 yıllarında Sümerler tarafından geliştirilen, bilinen en eski yazı sistemlerinden biridir. Yazı, ıslak kil tabletlerin üzerine kamış kalemin ucuyla bastırılan kama biçimli işaretlerden oluşurdu. Başlangıçta tahıl ve hayvan sayımı gibi ticari kayıtları tutmak için kullanıldı. Zamanla mektupların, ders alıştırmalarının ve matematik tablolarının yazılmasında da kullanılmaya başlandı. Yaklaşık 600 işaretten oluşan bu sistem, farklı diller için uyarlandı. Katipler edubba denen okullarda yıllarca eğitim alarak bu yazıyı öğrendi. Kil tabletler kurutulunca uzun yıllar boyunca saklanabiliyordu.`;
const BILGI_IYI = {
  uygun: true, baslik_tr: "Kamış kalemle kile yazılan ilk kayıtlar", baslik_en: "The first records pressed into clay",
  tr: { ozet: "Mezopotamya'da yaklaşık MÖ 3400 yıllarında ortaya çıkan çivi yazısı, gündelik hayatın kayıtlarını saklamak için doğdu. Işaretler, ıslak kil üzerine kamışın ucuyla bastırılarak oluşturuluyordu. İlk kayıtlar tahıl ve hayvan sayımı gibi ticari ayrıntıları içeriyordu. Sonraki yıllarda mektuplar ve matematik alıştırmaları da kil tabletlere geçti. Yazıyı öğrenmek isteyen katipler, edubba adlı okullarda uzun bir eğitimden geçerdi." },
  en: { ozet: "Cuneiform appeared in Mesopotamia around 3400 BC and began as a way to keep the records of everyday life. Signs were made by pressing the tip of a reed into wet clay. The earliest records covered trade details such as counting grain and animals. In later years letters and maths exercises were also written on clay tablets. Scribes who wanted to learn the script went through long training in schools called edubba." },
};
test("bilgi doğrulama: kaynakla uyumlu geçerli özet kabul; kaynakta olmayan rakam, din/ritüel/ölüm/savaş, kopya, başlık tuzağı ret", () => {
  const v = bilgiDogrula(BILGI_IYI, KAYNAK_CIVI, {});
  assert.equal(v.ok, true, v.neden);
  const dene = (f) => { const o = kopya(BILGI_IYI); f(o); return bilgiDogrula(o, KAYNAK_CIVI, {}); };
  assert.match(dene((o) => { o.tr.ozet = o.tr.ozet.replace("MÖ 3400", "MÖ 3000"); }).neden, /rakam/);
  assert.match(dene((o) => { o.tr.ozet += " Tabletler tanrıya kurban sunulan tapınaklarda da saklanırdı."; }).neden, /yasa|cümle/);
  assert.match(dene((o) => { o.tr.ozet = o.tr.ozet.replace("Işaretler", "Işaretler, savaşta ölenlerin kayıtları için"); }).neden, /yasağı/);
  assert.match(dene((o) => { o.tr.ozet = KAYNAK_CIVI.slice(0, 500); }).neden, /kopya|cümle/);
  assert.match(dene((o) => { o.baslik_tr = "İnanılmaz sır perdesi: çivi yazısı"; }).neden, /başlık/);
  assert.match(dene((o) => { o.baslik_tr = "Çivi yazısı hakkında bilinmesi gereken her şeyin uzun hikâyesi ve ayrıntısı"; }).neden, /başlık uzunluğu/);
  assert.match(dene((o) => { o.baslik_en = "Cuneiform!"; }).neden, /başlık/);
  assert.match(dene((o) => { o.tr.ozet = o.tr.ozet.split(". ").slice(0, 2).join(". ") + "."; }).neden, /cümle sayısı/);
  assert.match(dene((o) => { o.tr.ozet = "Ben bu yazıyı çok severim. " + o.tr.ozet; }).neden, /birinci tekil|cümle/);
  assert.equal(bilgiDogrula({ uygun: false }, KAYNAK_CIVI, {}).ok, false);
  assert.equal(baslikNedeni("Kamış kalemle kile yazılan ilk kayıtlar", KAYNAK_CIVI, "tr"), "");
  assert.match(baslikNedeni("Kısa", "", "tr"), /uzunluğu/);
});

// ---------------------------------------------------------------- görsel denetimi (model yanıtı)
test("görsel denetimi: yalnız konuya uygun + uygunsuz/dini/şiddet/siyasi/yazı/kalite hepsi false kabul", () => {
  const ok = { konuya_uygun: true, ciplak_ya_da_uygunsuz: false, dini_sahne_ya_da_simge: false, siddet_savas_ya_da_olum: false, siyasi_figur_ya_da_simge: false, yazi_logo_baskin: false, dusuk_kalite: false, kisa_gerekce: "x" };
  assert.equal(vlKonuDegerlendir(JSON.stringify(ok)).ok, true);
  for (const k of Object.keys(ok).filter((x) => x !== "kisa_gerekce")) assert.equal(vlKonuDegerlendir(JSON.stringify({ ...ok, [k]: !ok[k] })).ok, false, k);
  assert.equal(vlKonuDegerlendir("bozuk").ok, false);
  const eksik = { ...ok }; delete eksik.dusuk_kalite;
  assert.equal(vlKonuDegerlendir(JSON.stringify(eksik)).ok, false);
});

// ---------------------------------------------------------------- felsefe notu
test("felsefe notu: gündelik hayat notu; yazara söz atfı, tırnak, emir/mutlak, sağlık, alıntıdan tekrar ret", () => {
  const alinti = "Adopt the pace of nature: her secret is patience, and in the end we all find that out.";
  const iyi = { uygun: true, tr: "Gündelik hayatta bu, bir işin hemen sonuç vermemesine rağmen sakin devam etmek anlamına gelebilir.", en: "In everyday life this can mean calmly carrying on with a task even when it does not give results at once." };
  assert.equal(aciklamaDogrula(iyi, { alinti }).ok, true, aciklamaDogrula(iyi, { alinti }).neden);
  const dene = (tr) => aciklamaDogrula({ ...iyi, tr }, { alinti });
  assert.match(dene("Emerson der ki sabır, bir işin hemen sonuç vermemesine rağmen sürmesi gereken şeydir elbette.").neden, /atf/);
  assert.match(dene("Gündelik hayatta bu, \"sabır\" demek anlamına gelebilir ve işlerin yavaş ilerlemesi normaldir diyebiliriz.").neden, /tırnak/);
  assert.match(dene("Herkes mutlaka sabırlı olmalıdır ve işlerin yavaş ilerlemesini kabul etmelidir her zaman böyle.").neden, /emir|mutlak/);
  assert.match(dene("Sabır, bağışıklığı güçlendirir ve günlük işlerde sakin kalmaya yardımcı olur diyebiliriz bugün.").neden, /yasaklı|sağlık/);
  assert.match(dene("Ben bunu işte hep böyle yaptım ve sakin kalmak bana çok iyi geldi her seferinde böyle oldu.").neden, /birinci|yasaklı/);
  assert.match(dene("Adopt the pace of nature her secret is patience gibi bir şey anlatıyor bu satırlar bize günlük işlerde.").neden, /tekrar|tırnak|dil|abartı|./);
  assert.match(dene("Kısa not.").neden, /uzunluğu/);
  assert.equal(aciklamaDogrula({ uygun: false }, { alinti }).ok, false);
  assert.match(ACIKLAMA_ISTEMI, /OP bir ekiptir; gerçek bir kişi değil/);
});
test("alintiHaberi: felsefe notu 'OP'nin notu' olarak etiketlenir ve davet eklenir; notsuz çağrı eski biçimi korur", () => {
  const yazar = YAZARLAR.find((y) => y.ad === "Ralph Waldo Emerson");
  const c = { metin: "Adopt the pace of nature: her secret is patience.", eser: "Nature", yil: 1836, kaynakSatiri: "Nature (1836)" };
  const kimlik = { id: "a-1234567890abcdef", ozet: "x" };
  const not = alintiHaberi({ yazar, c, tr: "Doğanın temposunu benimse.", alan: "felsefe", hesap: "op_felsefe", kimlik, simdi: 0, aciklama: { tr: "Gündelik hayatta sakin kalmak anlamına gelebilir bu.", en: "It can mean staying calm in daily life." }, davet: ["Davet TR?", "Invite EN?"] });
  assert.match(not.tr.ozet, /Gündelik hayatta \(OP'nin notu\): Gündelik/); assert.match(not.en.ozet, /OP's note/); assert.match(not.tr.ozet, /Davet TR\?/);
  const eski = alintiHaberi({ yazar, c, tr: "Doğanın temposunu benimse.", alan: "felsefe", hesap: "op_felsefe", kimlik, simdi: 0 });
  assert.doesNotMatch(eski.tr.ozet, /OP'nin notu/);
});
test("felsefe havuzu: yaşam bilgeliği yazarları ağırlıklı (Emerson/Thoreau/James/Ruskin/Hazlitt), eski filozoflar seyrek; Mevlânâ/Yunus Emre yok", () => {
  const f = YAZARLAR.filter((y) => y.alanlar.includes("felsefe"));
  const ag = Object.fromEntries(f.map((y) => [y.ad, y.agirlik ?? 1]));
  for (const ad of ["Ralph Waldo Emerson", "Henry David Thoreau", "William James", "John Ruskin", "William Hazlitt"]) assert.ok(ag[ad] >= 2, ad);
  for (const ad of ["David Hume", "John Stuart Mill", "Plato"]) assert.ok(ag[ad] < 1, ad);
  assert.ok(!f.some((y) => /Mevl|Yunus|Rumi/i.test(y.ad)));
  // ağırlıklı sıralama: ilk sırada ağırlıklı yazarların payı yüksek
  let ilk = 0, n = 2000, s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < n; i++) { const y = agirlikliSira(f, rnd)[0]; if ((y.agirlik ?? 1) >= 2) ilk++; }
  assert.ok(ilk / n > 0.55, `ağırlıklı yazar payı ${ilk / n}`);
});

// ---------------------------------------------------------------- seçim / tekrar / kimlik
test("kimlik: aynı öğe + aynı pencere = aynı kimlik; pencere değişince yeni; haber_id biçimi", () => {
  const t = Date.parse("2026-10-14T10:00:00Z"), d = donemNo(t, 60);
  const a = konuKimligi("op_antik", "Çivi yazısı", d), b = konuKimligi("op_antik", "Çivi yazısı", d), c = konuKimligi("op_antik", "Çivi yazısı", d + 1), e = konuKimligi("op_mutfak", "Çivi yazısı", d);
  assert.equal(a.id, b.id); assert.notEqual(a.id, c.id); assert.notEqual(a.ozet, e.ozet);
  assert.match(a.id, /^[a-z0-9-]{1,80}$/); assert.match(konuKimligi("op_mutfak", "Karnıyarık ve İmam bayıldı: İç Anadolu'dan!", d).id, /^[a-z0-9-]{1,80}$/);
});

// ---------------------------------------------------------------- denge / sıra / bütçe
test("ayarlar: varsayılanlar (günlük üst 35, tur başına 4 çağrı, 2 gönderi) ve ortam değişkeniyle değişim", () => {
  const a = ayarOku({}, []);
  assert.equal(a.konuAcik, true); assert.equal(a.konuGunlukUst, 35); assert.equal(a.konuCagriUst, 4); assert.equal(a.konuTurUst, 2);
  assert.deepEqual(a.konuSaat, { bas: 4, son: 21 });
  assert.deepEqual(a.konuKotalari, { op_mutfak: 3, op_icecek: 2, op_oyun: 2, op_klasikler: 2, op_ronesans: 2, op_antik: 4 });
  const e = ayarOku({ KONU_GUNLUK_UST: "20", KONU_CAGRI_UST: "6", KONU_TUR_UST: "1", KONU_KOTALARI: "op_antik:6,op_oyun:0", KONU_SAAT: "5-20", KONU_HESAPLARI: "0" }, []);
  assert.equal(e.konuGunlukUst, 20); assert.equal(e.konuCagriUst, 6); assert.equal(e.konuTurUst, 1); assert.equal(e.konuKotalari.op_antik, 6); assert.equal(e.konuKotalari.op_oyun, 0); assert.deepEqual(e.konuSaat, { bas: 5, son: 20 }); assert.equal(e.konuAcik, false);
  assert.deepEqual(konuSaatAraligi("x"), { bas: 4, son: 21 });
  assert.equal(konuKotaAyristir("op_antik:99").op_antik, 4, "uç değer yok sayılır");
  assert.equal(OZEL_PLAN.felsefe.kota, 3);
  // günlük toplam hacim: mevcut özel işler + yeni konu hesapları ~30-35
  const yeni = Object.values(a.konuKotalari).reduce((t, x) => t + x, 0);
  const eski = ["felsefe", "edebiyat", "siir", "gokbilim", "resim", "sohbet"].reduce((t, k) => t + OZEL_PLAN[k].kota, 0);
  assert.ok(eski + yeni >= 30 && eski + yeni <= 36, `günlük toplam ${eski + yeni}`);
  assert.equal(EMOJI.mutfak, "🍲"); assert.equal(EMOJI.oyun, "🎲"); assert.equal(EMOJI.tarih, "🏺");
});
test("gruplar: ortak kategoriler serpiştirilmiş sıra, aynı hesap art arda gelmez; kategori paylaşan op_edebiyat gruba dahil", () => {
  const a = ayarOku({}, []), g = gruplariKur(a);
  assert.deepEqual([...g.keys()].sort(), ["edebiyat", "mutfak", "oyun", "tarih"]);
  for (const kat of ["mutfak", "edebiyat"]) { const s = g.get(kat).sira; for (let i = 1; i < s.length; i++) assert.notEqual(s[i], s[i - 1], `${kat}: art arda ${s[i]}`); }
  { const s = g.get("tarih").sira; let en = 1, k = 1; for (let i = 1; i < s.length; i++) { k = s[i] === s[i - 1] ? k + 1 : 1; en = Math.max(en, k); } assert.ok(en <= 2, "4:2 oranında en çok 2 art arda (aralık ≥ 2 saat ile ayrılır)"); }
  assert.equal(g.get("edebiyat").sira.filter((h) => h === "op_klasikler").length, 2);
  assert.equal(g.get("tarih").sira.filter((h) => h === "op_antik").length, 4);
  assert.equal(g.get("mutfak").toplam, 5);
  assert.ok(g.get("oyun").aralikSaat >= 6, "tek hesaplı kategoride art arda yayın yok");
});
test("konuSiraNedeni: saat dışı, günlük üst, kota dolu, aralık, sıra başka hesapta (+ takılırsa serbest), tekrar penceresi", () => {
  const a = ayarOku({}, []), gruplar = gruplariKur(a);
  const t0 = Date.parse("2026-10-14T10:00:00Z");
  const kd = (k, d) => new Map([[k, d]]);
  const n = (h, kota, simdi = t0) => konuSiraNedeni(h, { ayar: a, kotaDurum: kota, simdi, gruplar });
  assert.equal(n("op_antik", new Map()), "", "ilk gönderi (sıra op_antik)");
  assert.equal(n("op_ronesans", new Map()), "sira-diger-hesapta");
  assert.equal(n("op_antik", new Map(), Date.parse("2026-10-14T03:00:00Z")), "saat-disi");
  assert.equal(n("op_antik", new Map(), Date.parse("2026-10-14T21:30:00Z")), "saat-disi");
  assert.equal(n("op_antik", kd("tarih", { son24: 6, son7g: 6, sonZaman: "2026-10-14T01:00:00Z" })), "kota-dolu");
  assert.equal(n("op_antik", kd("tarih", { son24: 1, son7g: 3, sonZaman: "2026-10-14T09:00:00Z" })), "aralik");
  assert.equal(n("op_ronesans", kd("tarih", { son24: 1, son7g: 3, sonZaman: "2026-10-14T06:00:00Z" })), "", "sıra op_ronesans'ta");
  assert.equal(n("op_antik", kd("tarih", { son24: 1, son7g: 3, sonZaman: "2026-10-14T06:00:00Z" })), "sira-diger-hesapta");
  assert.equal(n("op_antik", kd("tarih", { son24: 1, son7g: 3, sonZaman: "2026-10-13T20:00:00Z" })), "", "ilgili hesap 2 aralıktır yayın yapamadıysa sıra serbest");
  assert.equal(n("op_antik", kd("tarih", { son24: 0, son7g: 99, sonZaman: null })), "tekrar-penceresi", "haftalık üst sınır");
  const toplam = new Map([["felsefe", { son24: 10 }], ["resim", { son24: 10 }], ["sohbet", { son24: 10 }], ["gokbilim", { son24: 5 }]]);
  assert.equal(n("op_antik", toplam), "gunluk-ust");
  assert.equal(konuSiraNedeni("op_edebiyat", { ayar: a, kotaDurum: toplam, simdi: t0, gruplar, gunlukUstUygula: false }), "", "mevcut hesaba günlük üst uygulanmaz");
  assert.equal(konuSiraNedeni("op_mutfak", { ayar: { ...a, konuKotalari: { ...a.konuKotalari, op_mutfak: 0 } }, kotaDurum: new Map(), simdi: t0 }), "kapali");
});

// ---------------------------------------------------------------- uçtan uca (ağsız)
const jpeg = (w, h) => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03], 0); return u; };
const json = (o) => ({ ok: true, status: 200, headers: new Headers(), json: async () => o });
const VL_TAMAM = JSON.stringify({ konuya_uygun: true, ciplak_ya_da_uygunsuz: false, dini_sahne_ya_da_simge: false, siddet_savas_ya_da_olum: false, siyasi_figur_ya_da_simge: false, yazi_logo_baskin: false, dusuk_kalite: false, kisa_gerekce: "ok" });
const KAYNAKLAR = {
  "Mercimek çorbası": "Mercimek çorbası, kırmızı mercimek ve soğanla yapılan, Türk mutfağında çok sevilen bir çorba türüdür. Genellikle havuç ve patates de eklenir. Çorba kaynatıldıktan sonra blenderdan geçirilerek pürüzsüz bir kıvam alır. Üzerine limon sıkılarak ve nane yağıyla servis edilir. Sıcak ya da ılık yenebilir. Pek çok evde ilk yemek olarak sofraya gelir. ".repeat(2),
  "Çivi yazısı": KAYNAK_CIVI + " " + KAYNAK_CIVI.slice(0, 300),
  "Saklambaç": "Saklambaç, çocukların ve gençlerin sıkça oynadığı geleneksel bir oyundur. Bir oyuncu ebe olur ve gözlerini kapatarak sayı sayar. Diğer oyuncular bu sırada saklanır. Ebe daha sonra saklananları bulmaya çalışır. Bulunan oyuncu oyundan çıkar ve son bulunan oyuncu yeni ebe olur. Oyun herhangi bir araç gerektirmez ve bahçede ya da evde oynanabilir. ".repeat(2),
};
function sahteAg({ olay = [], sayfa = SAYFA } = {}) {
  return async (url) => {
    const u = String(url); olay.push(u);
    if (/wikipedia\.org\/w\/api\.php/.test(u)) {
      const baslik = decodeURIComponent((u.match(/titles=([^&]+)/) || [])[1] || "").replace(/\+/g, " ");
      const ex = KAYNAKLAR[baslik];
      if (!ex) return json({ query: { pages: [{ title: baslik, missing: true }] } });
      return json({ query: { pages: [{ title: baslik, extract: ex, fullurl: `https://tr.wikipedia.org/wiki/${encodeURIComponent(baslik)}` }] } });
    }
    if (/wikisource\.org\/w\/api\.php/.test(u)) return json({ parse: { title: "Deneme", wikitext: sayfa } });
    if (u.includes("commons.wikimedia.org")) return json({ query: { pages: [{ title: "File:Ornek.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/ornek.jpg", thumbwidth: 900, thumbheight: 700, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Ornek.jpg", extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: "Test Fotoğrafçı" } } }] }] } });
    if (u.includes("upload.wikimedia.org")) { const b = jpeg(900, 700); return { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => b.buffer }; }
    return { ok: false, status: 404, headers: new Headers(), json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
}
function modelKur(yanitlar, sayac = { yazim: 0, vl: 0 }) {
  return { sayac, yaz: async (sistem, girdi, sec = {}) => {
    if (sec.resim) { sayac.vl++; return { metin: VL_TAMAM }; }
    sayac.yazim++;
    const anahtar = /tarif editörüsün/.test(sistem) ? "tarif" : /oyun hesabı/.test(sistem) ? "oyun" : "bilgi";
    return { metin: JSON.stringify(yanitlar[anahtar]), saglayici: "gemini-test" };
  } };
}
function bulutKur(gorulen = new Set()) {
  const yayin = [], isaret = [];
  return { yayin, isaret, bilinenler: async (l) => new Map(l.filter((x) => gorulen.has(x)).map((x) => [x, { durum: "yayinlandi" }])), isaretle: async (l) => { isaret.push(...l); return {}; }, yayinla: async (h, ozet, g) => { yayin.push({ h, ozet, g }); return { durum: "eklendi" }; } };
}
const SIMDI = Date.parse("2026-10-14T10:00:00Z");
const tekOge = (hesap, ad, tr, gorsel = "Ornek.jpg") => ({ havuz: { [({ op_mutfak: "mutfak", op_oyun: "oyun", op_antik: "antik", op_ronesans: "ronesans", op_icecek: "icecek" })[hesap]]: [[ad, tr, "", hesap === "op_antik" ? "sumer" : "x-alt", gorsel, 0]] } });

test("uçtan uca op_mutfak: Vikipedi kaynağı, model tarifi, kod doğrulaması, Commons görseli + model denetimi, yayın yükü", async () => {
  const bulut = bulutKur(), model = modelKur({ tarif: TARIF_IYI });
  const s = await konuUret({ hesap: "op_mutfak", bulut, model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, cagriHakki: 2, bekleFn: async () => {}, ...tekOge("op_mutfak", "Mercimek çorbası", "Mercimek çorbası") });
  assert.equal(s.durum, "yayinlandi", JSON.stringify(s));
  assert.equal(model.sayac.yazim, 1); assert.equal(model.sayac.vl, 1); assert.equal(s.cagri, 2);
  const { h, g } = bulut.yayin[0];
  assert.equal(h.kategori, "mutfak"); assert.equal(h.editor, "op_mutfak"); assert.equal(h.alt_konu, "x-alt"); assert.equal(h.kaynak, "Vikipedi");
  assert.match(h.link, /tr\.wikipedia\.org/); assert.match(h.tr.baslik, /tarifi$/); assert.match(h.en.baslik, /recipe$/);
  assert.match(h.tr.ozet, /Malzemeler:/); assert.match(h.tr.ozet, /Kaynak: Vikipedi/); assert.match(h.tr.ozet, /Sen bu yemeği|Sofranızda|Bu tarifi/); assert.ok(h.tr.ozet.length <= 2300);
  assert.match(h.id, /^k-[a-z0-9-]+-[0-9a-f]{6}-\d+$/);
  assert.equal(g.gorsel.lisans, "CC BY-SA 4.0"); assert.equal(g.gorsel.saglayici, "wikimedia"); assert.equal(g.tur, "image/jpeg");
});
test("uçtan uca: model görseli reddederse görselsiz yayınlanır; çağrı hakkı yoksa görsel denetimi atlanır (görselsiz), yazım yine yapılır", async () => {
  const bulut = bulutKur(), vlRet = { yaz: async (sistem, girdi, sec = {}) => sec.resim ? { metin: JSON.stringify({ konuya_uygun: false }) } : { metin: JSON.stringify(TARIF_IYI), saglayici: "t" } };
  const s = await konuUret({ hesap: "op_mutfak", bulut, model: vlRet, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, cagriHakki: 2, bekleFn: async () => {}, ...tekOge("op_mutfak", "Mercimek çorbası", "Mercimek çorbası") });
  assert.equal(s.durum, "yayinlandi"); assert.equal(bulut.yayin[0].g, null);
  const bulut2 = bulutKur(), model2 = modelKur({ tarif: TARIF_IYI });
  const s2 = await konuUret({ hesap: "op_mutfak", bulut: bulut2, model: model2, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, cagriHakki: 1, bekleFn: async () => {}, ...tekOge("op_mutfak", "Mercimek çorbası", "Mercimek çorbası") });
  assert.equal(s2.durum, "yayinlandi"); assert.equal(model2.sayac.vl, 0); assert.equal(bulut2.yayin[0].g, null); assert.ok(s2.cagri <= 1);
});
test("uçtan uca op_oyun ve op_antik; antik başlığı ≤ 70, kaynak bağlantısı, alt_konu öğeden", async () => {
  const b1 = bulutKur();
  const o = await konuUret({ hesap: "op_oyun", bulut: b1, model: modelKur({ oyun: OYUN_IYI }), fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, cagriHakki: 2, bekleFn: async () => {}, ...tekOge("op_oyun", "Saklambaç", "Saklambaç") });
  assert.equal(o.durum, "yayinlandi", JSON.stringify(o));
  assert.match(b1.yayin[0].h.tr.baslik, /Saklambaç nasıl oynanır\?/); assert.match(b1.yayin[0].h.tr.ozet, /Kaç kişi: 3-8 kişi/); assert.equal(b1.yayin[0].h.kategori, "oyun");
  const b2 = bulutKur();
  const a = await konuUret({ hesap: "op_antik", bulut: b2, model: modelKur({ bilgi: BILGI_IYI }), fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, cagriHakki: 2, bekleFn: async () => {}, ...tekOge("op_antik", "Çivi yazısı", "Çivi yazısı") });
  assert.equal(a.durum, "yayinlandi", JSON.stringify(a));
  const h = b2.yayin[0].h;
  assert.equal(h.kategori, "tarih"); assert.equal(h.alt_konu, "sumer"); assert.equal(h.editor, "op_antik"); assert.ok(h.tr.baslik.length <= 70 && h.en.baslik.length <= 70);
  assert.match(h.tr.ozet, /Kaynak: Vikipedi · /); assert.match(h.link, /wikipedia\.org/);
});
test("tekrar kuralı: aynı öğe aynı pencerede ve bir önceki pencerede yeniden üretilmez; yeni pencerede üretilir", async () => {
  const oge = tekOge("op_antik", "Çivi yazısı", "Çivi yazısı");
  const d = donemNo(SIMDI, 60);
  const mevcut = bulutKur(new Set([konuKimligi("op_antik", "Çivi yazısı", d).ozet]));
  const s = await konuUret({ hesap: "op_antik", bulut: mevcut, model: modelKur({ bilgi: BILGI_IYI }), fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {}, ...oge });
  assert.equal(s.durum, "yok"); assert.equal(s.neden, "gorulmus"); assert.equal(mevcut.yayin.length, 0);
  const onceki = bulutKur(new Set([konuKimligi("op_antik", "Çivi yazısı", d - 1).ozet]));
  assert.equal((await konuUret({ hesap: "op_antik", bulut: onceki, model: modelKur({ bilgi: BILGI_IYI }), fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {}, ...oge })).neden, "gorulmus");
  const yeni = bulutKur(new Set([konuKimligi("op_antik", "Çivi yazısı", d - 2).ozet]));
  assert.equal((await konuUret({ hesap: "op_antik", bulut: yeni, model: modelKur({ bilgi: BILGI_IYI }), fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, cagriHakki: 2, bekleFn: async () => {}, ...oge })).durum, "yayinlandi");
});
test("kaynak hassas (din/ritüel/ölüm/savaş ağırlıklı) madde atlanır ve işaretlenir; madde yoksa işaretlenir; model çağrılmaz", async () => {
  const hassas = "Tapınak, tanrı için kurban sunulan kutsal bir yapıdır ve ritüel törenleri burada yapılırdı. Savaş sonrası ordu ve askerler tanrıya şükretmek için buraya gelirdi. Ölüm ve cenaze törenlerinde de rahipler bu mekânı kullanırdı. ".repeat(6);
  KAYNAKLAR["Hassas konu"] = hassas;
  const bulut = bulutKur(), model = modelKur({ bilgi: BILGI_IYI });
  const s = await konuUret({ hesap: "op_antik", bulut, model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {}, ...tekOge("op_antik", "Hassas konu", "Hassas konu") });
  assert.equal(s.neden, "kaynak-hassas"); assert.equal(model.sayac.yazim, 0); assert.ok(bulut.isaret.some((i) => /hassas/.test(i.neden)));
  const s2 = await konuUret({ hesap: "op_antik", bulut: bulutKur(), model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {}, ...tekOge("op_antik", "Olmayan madde", "Olmayan madde") });
  assert.equal(s2.neden, "madde-yok");
});
test("model yanıtı doğrulamadan geçmezse en çok 2 deneme, sonra atlanır ve işaretlenir (sağlık iddiası yayına girmez)", async () => {
  const kotu = kopya(TARIF_IYI); kotu.tr.tanitim = "Bağışıklığı güçlendiren ve vücuttan toksinleri atan detoks çorbasıdır, mutlaka deneyin.";
  const bulut = bulutKur(), model = modelKur({ tarif: kotu });
  const s = await konuUret({ hesap: "op_mutfak", bulut, model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, cagriHakki: 4, bekleFn: async () => {}, ...tekOge("op_mutfak", "Mercimek çorbası", "Mercimek çorbası") });
  assert.equal(s.durum, "yok"); assert.equal(bulut.yayin.length, 0); assert.equal(model.sayac.yazim, 2);
  assert.ok(bulut.isaret.some((i) => /yazim:/.test(i.neden)));
});
test("uçtan uca op_klasikler: alıntı gerçek sayfada aynen doğrulanır, model ÇAĞRILMAZ; sayfada yoksa ret + işaret; telif dışı satır hiç seçilmez", async () => {
  const klasikler = [{ yazar: "Ömer Seyfettin", olum: 1920, eser: "Deneme", tur: "hikaye", sayfa: "Deneme", metin: "Sonra kitaplarının dipsiz girdabına daldı." }];
  const bulut = bulutKur(), model = { yaz: async () => { throw new Error("çağrılmamalı"); } };
  const s = await konuUret({ hesap: "op_klasikler", bulut, model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {}, klasikler });
  assert.equal(s.durum, "yayinlandi", JSON.stringify(s)); assert.equal(s.cagri, 0);
  const h = bulut.yayin[0].h;
  assert.equal(h.kategori, "edebiyat"); assert.equal(h.alt_konu, "turk-klasik"); assert.equal(h.editor, "op_klasikler"); assert.equal(h.kaynak, "Vikikaynak"); assert.match(h.link, /tr\.wikisource\.org/);
  assert.ok(h.tr.ozet.includes("“Sonra kitaplarının dipsiz girdabına daldı.”")); assert.match(h.tr.ozet, /İlk yayım yılı kaynağında 1911/);
  const bulut2 = bulutKur();
  const r = await konuUret({ hesap: "op_klasikler", bulut: bulut2, model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {}, klasikler: [{ ...klasikler[0], metin: "Sonra kitaplarının dipsiz girdabına daldık." }] });
  assert.equal(r.durum, "yok"); assert.equal(bulut2.yayin.length, 0); assert.ok(bulut2.isaret.some((i) => /aynen/.test(i.neden)));
  const telif = await konuUret({ hesap: "op_klasikler", bulut: bulutKur(), model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, bekleFn: async () => {}, klasikler: [{ ...klasikler[0], olum: 1975 }] });
  assert.equal(telif.durum, "yok"); assert.equal(telif.neden, "havuz-bos");
});
test("kuru mod: model ve yayın yok, kayıt döner", async () => {
  const bulut = bulutKur(), model = { yaz: async () => { throw new Error("çağrılmamalı"); } };
  const s = await konuUret({ hesap: "op_mutfak", bulut, model, fetchFn: sahteAg(), rastgele: () => 0, simdi: SIMDI, kuru: true, bekleFn: async () => {}, ...tekOge("op_mutfak", "Mercimek çorbası", "Mercimek çorbası") });
  assert.equal(s.durum, "kuru"); assert.equal(bulut.yayin.length, 0); assert.equal(s.kayit.ad, "Mercimek çorbası"); assert.match(s.kayit.link, /wikipedia/);
});

// ---------------------------------------------------------------- bütçe (tur sınırları)
test("konuIsleriCalistir: tur başına en çok konuTurUst yayın, konuCagriUst model bütçesi, kategori başına tek yayın; saat dışında hiçbiri", async () => {
  const sayac = { yazim: 0, vl: 0 };
  const model = modelKur({ tarif: TARIF_IYI, oyun: OYUN_IYI, bilgi: BILGI_IYI }, sayac);
  const bulut = bulutKur();
  // gerçek havuz yerine tek öğeli sahte havuz (konuUret havuz parametresini konuIsleriCalistir geçirmez): gerçek havuzla çalıştır, ağ sahte
  const fetchFn = async (url) => {
    const u = String(url);
    if (/wikipedia\.org\/w\/api\.php/.test(u)) { const baslik = decodeURIComponent((u.match(/titles=([^&]+)/) || [])[1] || "").replace(/\+/g, " "); return json({ query: { pages: [{ title: baslik, extract: (KAYNAKLAR["Mercimek çorbası"] + " " + KAYNAK_CIVI + KAYNAK_CIVI).slice(0, 4200), fullurl: "https://tr.wikipedia.org/wiki/x" }] } }); }
    return sahteAg()(url);
  };
  const ayar = { ...ayarOku({}, []), konuTurUst: 2, konuCagriUst: 4 };
  const o = await konuIsleriCalistir({ ayar, bulut, model, fetchFn, simdi: SIMDI, kotaDurum: new Map(), bekleFn: async () => {}, rastgele: () => 0.5 });
  assert.ok(o.yayin <= 2, `yayın ${o.yayin}`); assert.ok(o.cagri <= 4, `çağrı ${o.cagri}`); assert.ok(sayac.yazim + sayac.vl <= 4);
  const kategoriler = bulut.yayin.map((y) => y.h.kategori); assert.equal(new Set(kategoriler).size, kategoriler.length, "aynı kategoriden iki yayın yok");
  const gece = await konuIsleriCalistir({ ayar, bulut: bulutKur(), model, fetchFn, simdi: Date.parse("2026-10-14T22:00:00Z"), kotaDurum: new Map(), bekleFn: async () => {} });
  assert.equal(gece.yayin, 0); assert.equal(gece.calisan.length, 0); assert.ok(gece.atlanan.every((x) => x.neden === "saat-disi"));
  const kapali = await konuIsleriCalistir({ ayar: { ...ayar, konuKotalari: Object.fromEntries(KONU_HESAP_ADLARI.map((h) => [h, 0])) }, bulut: bulutKur(), model, fetchFn, simdi: SIMDI, kotaDurum: new Map(), bekleFn: async () => {} });
  assert.ok(kapali.atlanan.every((x) => x.neden === "kapali"));
  const butce0 = await konuIsleriCalistir({ ayar: { ...ayar, konuCagriUst: 0 }, bulut: bulutKur(), model, fetchFn, simdi: SIMDI, kotaDurum: new Map(), bekleFn: async () => {} });
  assert.equal(butce0.yayin, 0);
});
test("konuIsleriCalistir: günlük toplam üst sınırı ve kota dolu kategoriler yeni konu üretmez; ayar tablosu tam", async () => {
  const dolu = new Map(GUNLUK_KATEGORILER_TEST.map((k) => [k, { son24: 5, son7g: 20, sonZaman: "2026-10-14T05:00:00Z" }]));
  const o = await konuIsleriCalistir({ ayar: ayarOku({}, []), bulut: bulutKur(), model: { yaz: async () => { throw new Error("çağrılmamalı"); } }, fetchFn: sahteAg(), simdi: SIMDI, kotaDurum: dolu, bekleFn: async () => {} });
  assert.equal(o.calisan.length, 0); assert.ok(o.atlanan.every((x) => ["gunluk-ust", "kota-dolu"].includes(x.neden)), JSON.stringify(o.atlanan));
  assert.deepEqual(KONU_HESAP_ADLARI.sort(), ["op_antik", "op_icecek", "op_klasikler", "op_mutfak", "op_oyun", "op_ronesans"]);
  for (const h of KONU_HESAP_ADLARI) assert.ok(KONU_HESAPLARI[h].kategori && KONU_HESAPLARI[h].tur);
});
const GUNLUK_KATEGORILER_TEST = ["felsefe", "edebiyat", "siir", "mitoloji", "gokbilim", "resim", "sohbet", "mutfak", "oyun", "tarih"];

// ---------------------------------------------------------------- SQL / fonksiyon tutarlılığı
test("gecis-015: 6 hesap, 3 yeni kategori, ilgi_kaydet listesi; haber-yukle eşlemesi", (t) => {
  try { readFileSync(join(burasi, "..", "..", "gecis-015-konu-hesaplari.sql")); } catch { return t.skip("yayın kopyasında (op-haber deposu) üst klasör dosyaları yok"); }
  const sql = readFileSync(join(burasi, "..", "..", "gecis-015-konu-hesaplari.sql"), "utf8");
  for (const h of ["op_mutfak", "op_icecek", "op_oyun", "op_klasikler", "op_ronesans", "op_antik"]) assert.match(sql, new RegExp(`'${h}'`), h);
  for (const k of ["mutfak", "oyun", "tarih"]) assert.ok(sql.includes(`'${k}'`), k);
  assert.equal([...new Set(sql.match(/'00000000-0000-4000-8000-0000000000\d\d'/g))].length, 6, "6 sabit uuid");
  assert.match(sql, /Bilgiler Vikipedi/);
  const ts = readFileSync(join(burasi, "..", "..", "functions", "haber-yukle", "index.ts"), "utf8");
  for (const h of ["op_mutfak", "op_icecek", "op_oyun", "op_klasikler", "op_ronesans", "op_antik"]) assert.ok(ts.includes(h), h);
});
