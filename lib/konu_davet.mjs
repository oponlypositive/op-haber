import { createHash } from "node:crypto";
// ---------- topluluğa davet (kod şablonu; model yok). Soru yalnız davettir; kişisel deneyim iddiası içermez.
export const DAVETLER = {
  op_mutfak: [["Sen bu yemeği evde nasıl yaparsın? Küçük inceliklerini yorumlarda paylaşabilirsin.", "How would you make this at home? Feel free to share your own little touches in the comments."], ["Sofranızda bu yemeğin yeri var mı? Hangi yanıyla servis edersiniz?", "Does this dish have a place at your table? What do you serve it with?"], ["Bu tarifi denerseniz sonucu paylaşın; yorumlarda buluşalım.", "If you try this recipe, share how it turned out in the comments."]],
  op_icecek: [["Bu içeceği nasıl hazırlarsın? Kendi karışımını yorumlarda paylaşabilirsin.", "How do you prepare this drink? Share your own mix in the comments."], ["Bugün en çok hangi serinletici içeceği seversin?", "Which refreshing drink do you enjoy most today?"], ["Sence bu içeceğin yanına hangi atıştırmalık yakışır?", "What snack would you pair with this drink?"]],
  op_oyun: [["Bu oyunu en son kimlerle oynadın? Yorumlarda paylaşırsan başkalarına da fikir olur.", "Who did you last play this with? Share in the comments to inspire others."], ["Sizin mahallede bu oyunun farklı bir kuralı var mıydı? Yorumlarda anlatın.", "Did this game have a different rule where you grew up? Tell us in the comments."], ["Bu hafta sonu evde bir oyun saati ayırmaya ne dersin?", "How about setting aside a game hour at home this weekend?"]],
  op_klasikler: [["Bu cümle sana neyi düşündürdü? Yorumlarda paylaşabilirsin.", "What did this line make you think of? Share in the comments."], ["Sevdiğin bir Türkçe cümle ya da dize var mı? Yorumlarda paylaşalım.", "Do you have a favourite Turkish line or verse? Share it in the comments."]],
  op_ronesans: [["Bu buluşun yerine bugün hangi aracı kullanıyoruz? Yorumlarda düşüncelerini paylaşabilirsin.", "Which tool do we use today in place of this invention? Share your thoughts in the comments."], ["Sen bir atölyede çalışsaydın hangi zanaatı öğrenmek isterdin?", "If you could learn a craft in a workshop, which one would you pick?"]],
  op_antik: [["Bugün gündelik hayatından hangi küçük alışkanlık bin yıl sonra da anlatılmaya değer? Yorumlarda paylaş.", "Which small daily habit of yours might still be worth telling about in a thousand years? Share it below."], ["Bu konuda en çok neyi merak ettin? Soruların bir sonraki gönderiye ilham olabilir.", "What are you most curious about here? Your questions can inspire the next post."], ["Sen olsan günlük işini bu araçlarla nasıl yapardın?", "How would you do your daily chores with tools like these?"]],
  op_felsefe: [["Bu cümle bugün senin gününde nerede karşılık buluyor? Yorumlarda paylaşabilirsin.", "Where does this line show up in your day today? Feel free to share in the comments."], ["Bugün küçük bir adımla uygulayabileceğin bir şey düşündün mü?", "Is there a small step you could try today?"]],
};
export function davetSec(hesap, id) {
  const l = DAVETLER[hesap]; if (!l?.length) return ["", ""];
  const n = Number.parseInt(createHash("sha256").update(String(id)).digest("hex").slice(0, 6), 16);
  return l[n % l.length];
}

