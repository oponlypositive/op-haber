import fs from "node:fs";
import { fileURLToPath } from "node:url";
const H=new URL("../lib/",import.meta.url).href;
const BURASI=fileURLToPath(new URL("./",import.meta.url));
const {denetle}=await import(H+"moderasyon.mjs");
const {konuYasak}=await import(H+"on_eleme.mjs");
const {lisansOk,yasakliMi}=await import(H+"gorsel.mjs");
const {TARIH_YASAK:TY,SAGLIK:SG,ALKOL:AL}=await import(H+"konu_yasak.mjs");
const m=[...JSON.parse(fs.readFileSync(BURASI+"dogrulandi.json","utf8")),...JSON.parse(fs.readFileSync(BURASI+"dogrulandi_oyun2.json","utf8"))];
const CIKAR=new Set(["Şalgam suyu","Gazoz","Aztekler","Tikal","Palenque","Pompeii","Efes","Tenochtitlan","Dante Alighieri","Giovanni Boccaccio","Hieronymus Bosch","Kristof Kolomb","Ferdinand Magellan","François Rabelais","Anatomi tiyatrosu","Kızılelma","Rembrandt","Michelangelo","Sandro Botticelli","Raffaello Sanzio","Medici Ailesi","Plimpton 322"]);
const RESIM_KOT=/map|diagram|logo|flag|coat[ _]of[ _]arms|icon|symbol|banner|poster|scheme|chart|statue of|temple|church|cathedral|mosque|tomb|grave|mummy|sarcophag|skull|skeleton|cemetery|burial|funeral|crucif|madonna|saint|nude|naked|sacrific|god |goddess|idol/i;
const alt={mutfak:"yemek",icecek:"icecek",oyun:"nostaljik-oyun",ronesans:"ronesans"};
const sonuc={mutfak:[],icecek:[],oyun:[],ronesans:[],antik:[]};
const sayac={};const atilan=[];
for(const x of m){
  if(x.durum!=="ok"){continue}
  if(CIKAR.has(x.ad)){atilan.push([x.ad,"elle çıkarıldı"]);continue}
  if((x.havuz==="ronesans"||x.havuz==="antik")&&(TY.test(x.ad)||TY.test(x.trAd||"")||TY.test(x.enAd||""))){atilan.push([x.ad,"tarih-yasak"]);continue}
  if((x.havuz==="mutfak"||x.havuz==="icecek")&&(SG.test(x.ad)||AL.test(x.ad))){atilan.push([x.ad,"saglik/alkol"]);continue}
  const d=denetle(x.ad);const k=konuYasak(x.ad);
  if(!d.ok||k.length){atilan.push([x.ad,"filtre:"+(d.tur||k[0].kural)]);continue}
  const key=x.havuz+"|"+x.ad.toLowerCase();
  if(sayac[key])continue;sayac[key]=1;
  let g="";
  const gi=x.gorsel;
  if(x.resim&&gi&&lisansOk(gi.lisans)&&["image/jpeg","image/png"].includes(gi.mime)&&gi.w>=600&&!yasakliMi(x.resim)&&!RESIM_KOT.test(x.resim)) g=x.resim.replace(/_/g," ");
  const a=x.havuz==="antik"?x.alt:alt[x.havuz];
  sonuc[x.havuz].push([x.ad,x.trAd||"",x.enAd||"",a,g,x.ad!==x.tr?1:0]);
}
const ozet={};for(const h in sonuc){ozet[h]={toplam:sonuc[h].length,resimli:sonuc[h].filter(i=>i[4]).length,varyant:sonuc[h].filter(i=>i[5]).length}}
const antikAlt={};for(const i of sonuc.antik)antikAlt[i[3]]=(antikAlt[i[3]]||0)+1;
console.log(JSON.stringify(ozet),JSON.stringify(antikAlt));console.log("atılan",JSON.stringify(atilan));
const satir=(h)=>`  ${h}: [\n`+sonuc[h].map(i=>"    "+JSON.stringify(i)).join(",\n")+"\n  ]";
const txt=`// OTOMATİK ÜRETİLDİ (2026-10-14, salt okuma doğrulama): konu hesaplarının içerik havuzları. Her öğe: [ad, TR Vikipedi maddesi, EN Vikipedi maddesi, alt_konu, Commons görsel dosyası, genel maddeye bağlı varyant (1/0)].
// Doğrulama (bu oturumda, Vikipedi + Commons API): madde VAR, anlam ayrımı sayfası DEĞİL, uzunluk eşiği (TR >= 2500 bayt ya da EN >= 4000 bayt); görsel: maddenin kapak görseli Commons'ta, lisans CC0/PD/CC BY/CC BY-SA, jpeg/png, >= 600 px,
// dosya adında harita/logo/bayrak/mezar/tapınak/heykel gibi uygunsuz anahtar yok. Madde ya da görsel sonradan değişirse çalışma anında YİNE denetlenir (başarısız öğe atlanır, işaretlenir).
// varyant=1: öğenin kendi Vikipedi maddesi yok, bağlı olduğu GENEL madde kaynak gösterilir (örn. "Çilekli limonata" -> "Limonata"): tarif/bilgi genel bilgiden yazılır, kaynak yalnız ilgili kavramı doğrular.
// Yeni öğe eklemek: aday listesini arac/konu_havuz_dogrula.mjs aracından (README "Rozetli konu hesapları") geçirin; elle eklenen doğrulanmamış öğe TESTTE kırmızı verir.
export const HAVUZ = {
${Object.keys(sonuc).map(satir).join(",\n")}
};
`;
fs.writeFileSync(fileURLToPath(new URL("../lib/konu_havuz.mjs",import.meta.url)),txt);
