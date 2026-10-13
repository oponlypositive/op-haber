// Alıntı yazarları: yalnız TELİFSİZ (ölüm yılı <= 1955; ölüm yılı + 70 kuralı) yazar/şairler. Emin olunamayan yazar listeye ALINMAZ.
// olum: ölüm yılı (M.Ö. için negatif). alanlar: hangi hesaplarda kullanılabilir. dil: eserin özgün dili.
// cevirili: Wikiquote'taki İngilizce metin bir ÇEVİRİ ise true; bu durumda alıntı yalnız kaynak satırında telifsiz bir çevirmen
// adı (CEVIRMEN_BEYAZ) geçiyorsa kabul edilir (modern çeviriler: Fagles, Lattimore vb. KULLANILMAZ).
// wq: Wikiquote (İngilizce) sayfa adı. Sayfa yoksa yazar o turda atlanır.
export const YAZARLAR = [
  // felsefe
  { ad: "Ralph Waldo Emerson", wq: "Ralph Waldo Emerson", olum: 1882, alanlar: ["felsefe", "edebiyat"], dil: "en" },
  { ad: "Henry David Thoreau", wq: "Henry David Thoreau", olum: 1862, alanlar: ["felsefe", "edebiyat"], dil: "en" },
  { ad: "John Stuart Mill", wq: "John Stuart Mill", olum: 1873, alanlar: ["felsefe"], dil: "en" },
  { ad: "William James", wq: "William James", olum: 1910, alanlar: ["felsefe"], dil: "en" },
  { ad: "Francis Bacon", wq: "Francis Bacon", olum: 1626, alanlar: ["felsefe"], dil: "en" },
  { ad: "David Hume", wq: "David Hume", olum: 1776, alanlar: ["felsefe"], dil: "en" },
  { ad: "Benjamin Franklin", wq: "Benjamin Franklin", olum: 1790, alanlar: ["felsefe"], dil: "en" },
  { ad: "George Santayana", wq: "George Santayana", olum: 1952, alanlar: ["felsefe"], dil: "en" },
  { ad: "Alfred North Whitehead", wq: "Alfred North Whitehead", olum: 1947, alanlar: ["felsefe"], dil: "en" },
  { ad: "John Dewey", wq: "John Dewey", olum: 1952, alanlar: ["felsefe"], dil: "en" },
  { ad: "Marcus Aurelius", wq: "Marcus Aurelius", olum: 180, alanlar: ["felsefe"], dil: "la", cevirili: true },
  { ad: "Seneca", wq: "Seneca the Younger", olum: 65, alanlar: ["felsefe"], dil: "la", cevirili: true },
  { ad: "Epictetus", wq: "Epictetus", olum: 135, alanlar: ["felsefe"], dil: "grc", cevirili: true },
  { ad: "Michel de Montaigne", wq: "Michel de Montaigne", olum: 1592, alanlar: ["felsefe"], dil: "fr", cevirili: true },
  { ad: "Plato", wq: "Plato", olum: -347, alanlar: ["felsefe"], dil: "grc", cevirili: true },
  // edebiyat
  { ad: "Jane Austen", wq: "Jane Austen", olum: 1817, alanlar: ["edebiyat"], dil: "en" },
  { ad: "Charles Dickens", wq: "Charles Dickens", olum: 1870, alanlar: ["edebiyat"], dil: "en" },
  { ad: "Mark Twain", wq: "Mark Twain", olum: 1910, alanlar: ["edebiyat"], dil: "en" },
  { ad: "Oscar Wilde", wq: "Oscar Wilde", olum: 1900, alanlar: ["edebiyat"], dil: "en" },
  { ad: "Virginia Woolf", wq: "Virginia Woolf", olum: 1941, alanlar: ["edebiyat"], dil: "en" },
  { ad: "Louisa May Alcott", wq: "Louisa May Alcott", olum: 1888, alanlar: ["edebiyat"], dil: "en" },
  { ad: "Lewis Carroll", wq: "Lewis Carroll", olum: 1898, alanlar: ["edebiyat"], dil: "en" },
  { ad: "George Eliot", wq: "George Eliot", olum: 1880, alanlar: ["edebiyat"], dil: "en" },
  { ad: "William Shakespeare", wq: "William Shakespeare", olum: 1616, alanlar: ["edebiyat", "siir"], dil: "en" },
  { ad: "Robert Louis Stevenson", wq: "Robert Louis Stevenson", olum: 1894, alanlar: ["edebiyat", "siir"], dil: "en" },
  { ad: "Charlotte Brontë", wq: "Charlotte Brontë", olum: 1855, alanlar: ["edebiyat"], dil: "en" },
  { ad: "H. G. Wells", wq: "H. G. Wells", olum: 1946, alanlar: ["edebiyat"], dil: "en" },
  { ad: "Leo Tolstoy", wq: "Leo Tolstoy", olum: 1910, alanlar: ["edebiyat"], dil: "ru", cevirili: true },
  { ad: "Anton Chekhov", wq: "Anton Chekhov", olum: 1904, alanlar: ["edebiyat"], dil: "ru", cevirili: true },
  { ad: "Victor Hugo", wq: "Victor Hugo", olum: 1885, alanlar: ["edebiyat"], dil: "fr", cevirili: true },
  { ad: "Miguel de Cervantes", wq: "Miguel de Cervantes", olum: 1616, alanlar: ["edebiyat"], dil: "es", cevirili: true },
  { ad: "Hans Christian Andersen", wq: "Hans Christian Andersen", olum: 1875, alanlar: ["edebiyat"], dil: "da", cevirili: true },
  // şiir
  { ad: "Emily Dickinson", wq: "Emily Dickinson", olum: 1886, alanlar: ["siir"], dil: "en" },
  { ad: "Walt Whitman", wq: "Walt Whitman", olum: 1892, alanlar: ["siir"], dil: "en" },
  { ad: "William Blake", wq: "William Blake", olum: 1827, alanlar: ["siir"], dil: "en" },
  { ad: "William Wordsworth", wq: "William Wordsworth", olum: 1850, alanlar: ["siir"], dil: "en" },
  { ad: "John Keats", wq: "John Keats", olum: 1821, alanlar: ["siir"], dil: "en" },
  { ad: "Percy Bysshe Shelley", wq: "Percy Bysshe Shelley", olum: 1822, alanlar: ["siir"], dil: "en" },
  { ad: "Samuel Taylor Coleridge", wq: "Samuel Taylor Coleridge", olum: 1834, alanlar: ["siir"], dil: "en" },
  { ad: "Alfred, Lord Tennyson", wq: "Alfred, Lord Tennyson", olum: 1892, alanlar: ["siir"], dil: "en" },
  { ad: "Robert Browning", wq: "Robert Browning", olum: 1889, alanlar: ["siir"], dil: "en" },
  { ad: "Elizabeth Barrett Browning", wq: "Elizabeth Barrett Browning", olum: 1861, alanlar: ["siir"], dil: "en" },
  { ad: "Christina Rossetti", wq: "Christina Rossetti", olum: 1894, alanlar: ["siir"], dil: "en" },
  { ad: "Edgar Allan Poe", wq: "Edgar Allan Poe", olum: 1849, alanlar: ["siir", "edebiyat"], dil: "en" },
  { ad: "W. B. Yeats", wq: "William Butler Yeats", olum: 1939, alanlar: ["siir"], dil: "en" },
  { ad: "Henry Wadsworth Longfellow", wq: "Henry Wadsworth Longfellow", olum: 1882, alanlar: ["siir"], dil: "en" },
  { ad: "John Milton", wq: "John Milton", olum: 1674, alanlar: ["siir"], dil: "en" },
  // mitoloji (antik mitolojiler, edebî metin olarak; çeviri telifsiz çevirmenden olmalı)
  { ad: "Hesiod", wq: "Hesiod", olum: -700, alanlar: ["mitoloji"], dil: "grc", cevirili: true },
  { ad: "Homer", wq: "Homer", olum: -700, alanlar: ["mitoloji"], dil: "grc", cevirili: true },
  { ad: "Ovid", wq: "Ovid", olum: 17, alanlar: ["mitoloji"], dil: "la", cevirili: true },
  { ad: "Virgil", wq: "Virgil", olum: -19, alanlar: ["mitoloji"], dil: "la", cevirili: true },
  { ad: "Thomas Bulfinch", wq: "Thomas Bulfinch", olum: 1867, alanlar: ["mitoloji"], dil: "en" },
];

// Telifsiz çevirmenler (ölümü <= 1955). Kaynak satırında ya da bölüm başlığında bu adlardan biri geçmeyen çeviri alıntısı KABUL EDİLMEZ.
export const CEVIRMEN_BEYAZ = [
  "George Long", "Hugh G. Evelyn-White", "H. G. Evelyn-White", "Evelyn-White", "Samuel Butler", "Alexander Pope", "George Chapman", "William Cowper",
  "John Dryden", "Arthur Golding", "Henry Wadsworth Longfellow", "Benjamin Jowett", "Constance Garnett", "Aylmer Maude", "A. T. Murray",
  "Thomas Taylor", "Thomas Wentworth Higginson", "Charles Eliot Norton", "Edward FitzGerald", "Henry Cary", "John Florio", "Charles Cotton",
  "Thomas Shelton", "William Morris", "Benjamin Thorpe", "Thomas Bulfinch",
];

/** Hesap eşlemesi: alan -> editör hesapları (functions/_shared/editorler.mjs ALINTI_HESAPLARI ile aynı olmalı; test denetler). */
export const ALINTI_HESAPLARI = { felsefe: ["op_felsefe"], edebiyat: ["op_edebiyat"], siir: ["op_siir"], mitoloji: ["op_mitoloji"], gokbilim: ["op_gokbilim"] };

/** Telif kuralı: ölüm yılı + 70. Ölümü 1955 ve öncesi telifsizdir. Yıl bilinmiyorsa false (emin olunamayan atlanır). */
export const telifsizMi = (olumYili) => Number.isFinite(olumYili) && olumYili <= 1955;
