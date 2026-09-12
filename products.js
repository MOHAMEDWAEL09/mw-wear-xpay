/* ============================================================
   MW WEAR — Product catalog
   ============================================================
   المنتجات دلوقتي بتتحمل من Google Sheet (شيت جوجل) بدل ما تتكتب
   في الكود مباشرة. كده أي حد يشتري الموقع يقدر يضيف/يعدل/يمسح
   منتجات من غير ما يفتح أو يفهم في أي كود خالص.

   لو الـ SHEET_CSV_URL تحت فاضي، الموقع بيشتغل بمنتجات تجريبية
   افتراضية (DEFAULT_PRODUCTS) عشان العرض/الديمو يفضل شغال دايمًا.
   ============================================================ */

/* 👇 هنا بس تحط رابط الشيت بعد النشر (Publish to web) — الشرح في آخر الملف */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSnV8Wp800X1TpnZBU3ej1AqJ9Mt_WE4vtYcUUUbaOWRnZR3mix6QkEVlHZcCklcXsSj8ahAEHMXKfO/pub?gid=1805255167&single=true&output=csv";

/* منتجات تجريبية تظهر لو لسه معملتش شيت، أو لو حصل خطأ في التحميل */
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "تيشيرت أوفرسايز ",
    category: "تيشيرتات",
    price: 350,
    oldPrice: 420,
    icon: "fa-shirt",
    gradient: "linear-gradient(145deg, #eef2ff, #dbe4ff)",
    accent: "#3a6cf4",
    sizes: ["S", "M", "L", "XL"],
    colors: ["برجاندي", "أسود"],
    short: "قطن 100% بقصة أوفرسايز مريحة، أساسي لأي دولاب.",
    description:
      "تيشيرت أوفرسايز مصنوع من قطن 100% ثقيل الوزن (240 جرام) بيدي لمسة premium وقصة مريحة من غير ما تكون واسعة أوي. مناسب للبس اليومي أو مع جاكيت فوقه في الشتاء.",
    details: ["قماش قطن 100%", "طباعة لا تشطف ولا تبهت", "غسيل بارد فقط"]
  },
  {
    id: 2,
    name: "تيشيرت طباعة Street Line",
    category: "تيشيرتات",
    price: 380,
    icon: "fa-shirt",
    gradient: "linear-gradient(145deg, #101a30, #060910)",
    accent: "#4e9eff",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["أسود مع أحمر", "أسود مع رمادي"],
    short: "طباعة عريضة بخط Street وقصة regular fit.",
    description:
      "تيشيرت بقصة regular fit وطباعة كبيرة على الصدر بخامة بلاستيزول ماتت شطفة. القماش تقيل شوية عشان يحافظ على شكله بعد الغسيل.",
    details: ["قطن + بوليستر (90/10)", "طباعة بلاستيزول", "مقاسات توصف على الطبيعي"]
  },
  {
    id: 3,
    name: "هودي كلاسيك ",
    category: "هوديز",
    price: 650,
    oldPrice: 750,
    icon: "fa-user-ninja",
    gradient: "linear-gradient(145deg, #0a1120, #101a30)",
    accent: "#3a6cf4",
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["أزرق", "رمادي"],
    short: "هودي فليس تقيل بقلنسوة مبطنة وجيب كنغرو.",
    description:
      "هودي شتوي من الفليس التقيل (350 جرام) مبطن من جوه، بيدفي كويس وقصته مش واسعة أوي عشان تلبسه لوحده أو تحت جاكيت. الحبل قابل للضبط والجيب الكنغرو واسع.",
    details: ["فليس 350 جرام مبطن", "قلنسوة بحبل قابل للضبط", "جيب أمامي كنغرو"]
  },
  {
    id: 4,
    name: "هودي نص سوستة",
    category: "هوديز",
    price: 720,
    icon: "fa-user-ninja",
    gradient: "linear-gradient(145deg, #cbd5f1, #9fb0d9)",
    accent: "#2451d6",
    sizes: ["S", "M", "L", "XL"],
    colors: ["أخضر", "أسود"],
    short: "هودي بسحاب كامل سهل اللبس فوق أي حاجة.",
    description:
      "هودي بنصف سوستة بيخليه سهل تلبسه فوق تيشيرت أو قميص من غير ما تتلخبط. خامة قطن ممزوج بتدفي كويس ومناسبة للطقس المعتدل والبارد.",
    details: ["قطن ممزوج مريح", "سحاب معدني قوي"]
  },
  {
    id: 5,
    name: "جاكيت بامب ",
    category: "جاكيتات",
    price: 980,
    oldPrice: 1150,
    icon: "fa-vest",
    gradient: "linear-gradient(145deg, #0a1120, #1a2c55)",
    accent: "#4e9eff",
    sizes: ["M", "L", "XL"],
    colors: ["أخضر", "أسود"],
    short: "جاكيت بامب بخامة تقيلة ولاقة ريب.",
    description:
      "جاكيت بمبر بقصة عصرية ولاقة وأكمام ريب بتدي شكل رياضي أنيق. مبطن من جوه بشكل خفيف يخليه مناسب لبداية الشتاء أو المسا في الصيف.",
    details: ["بطانة داخلية خفيفة", "سحاب معدني", "جيبين أماميين + جيب صدر"]
  },
  {
    id: 6,
    name: "جاكيت جينز كلاسيك",
    category: "جاكيتات",
    price: 890,
    icon: "fa-vest",
    gradient: "linear-gradient(145deg, #7d94c9, #4e6aa8)",
    accent: "#3a6cf4",
    sizes: ["S", "M", "L", "XL"],
    colors: ["أسود"],
    short: "جاكيت دينم أساسي يلبس فوق أي حاجة.",
    description:
      "جاكيت دينم كلاسيك بقصة ثابتة مش هتخرج من الموضة، مناسب فوق تيشيرت أو هودي رفيع. أزرار معدنية وجيوب حقيقية عملية.",
    details: ["دينم متوسط السمك", "أزرار معدنية", "قصة unisex"]
  },
  {
    id: 7,
    name: "بنطلون كارجو ",
    category: "بناطيل",
    price: 620,
    icon: "fa-socks",
    gradient: "linear-gradient(145deg, #e9e2d3, #d8cdb4)",
    accent: "#2451d6",
    sizes: ["30", "32", "34", "36"],
    colors: ["بيج", "أسود"],
    short: "كارجو بجيوب جانبية وقصة straight مريحة.",
    description:
      "بنطلون كارجو بقصة straight مريحة وجيوب جانبية عملية تسع الموبايل والمحفظة، خامة قطن تقيل تتحمل الاستخدام اليومي وحزام قابل للضبط من الخصر.",
    details: ["قطن تقيل مقاوم للتجعد", "جيوب جانبية عملية", "خصر بأربطة ضبط"]
  },
  {
    id: 8,
    name: "بنطلون جينز سليم",
    category: "بناطيل",
    price: 580,
    oldPrice: 650,
    icon: "fa-socks",
    gradient: "linear-gradient(145deg, #34456e, #23304f)",
    accent: "#4e9eff",
    sizes: ["30", "32", "34", "36", "38"],
    colors: ["أزرق غامق", "أزرق فاتح"],
    short: "جينز سليم فيه نسبة استرتش للراحة.",
    description:
      "جينز بقصة سليم فيها نسبة إسترتش بسيطة بتدي راحة حركة أكتر من غير ما يفقد الشكل. مناسب للبس اليومي والمشاوير.",
    details: ["دينم + إسترتش خفيف", "قصة سليم فيت", " جيوب كلاسيك"]
  },
  {
    id: 9,
    name: "شنطة ظهر يومية",
    category: "إكسسوارات",
    price: 550,
    icon: "fa-bag-shopping",
    gradient: "linear-gradient(145deg, #101a30, #060910)",
    accent: "#3a6cf4",
    sizes: [" 19"],
    colors: ["مينت جرين", "كحلي"],
    short: "شنطة ظهر واسعة فيها جيب للابتوب.",
    description:
      "شنطة ظهر عملية للاستخدام اليومي أو الكلية/الشغل، فيها جيب مخصص للابتوب لحد 15 بوصة وجيوب داخلية منظمة، خامة مقاومة للماء بشكل خفيف.",
    details: ["جيب لابتوب مبطن", "خامة مقاومة للماء", "أحزمة كتف مبطنة"]
  },
  {
    id: 10,
    name: "شراب رياضي (3 أزواج)",
    category: "إكسسوارات",
    price: 150,
    icon: "fa-socks",
    gradient: "linear-gradient(145deg, #e7ecfb, #c9d4f5)",
    accent: "#2451d6",
    sizes: ["39-42", "43-46"],
    colors: ["أبيض", "أسود"],
    short: "طقم 3 شرابات قطن مريحة للاستخدام اليومي.",
    description:
      "طقم شراب من القطن الممزوج فيه نسبة قابلة للتمدد بتدي راحة طول اليوم، مناسب للرياضة أو الاستخدام العادي.",
    details: ["قطن ممزوج مريح", "طقم 3 أزواج", "مقاسين متاحين"]
  }
];

/* أشكال ألوان جاهزة — بدل ما الأدمن يكتب أكواد CSS، بيختار كلمة بسيطة
   في عمود "الشكل" بالشيت وهي هتترجم تلقائيًا للتدرج واللون المناسب */
const THEME_PRESETS = {
  "ازرق": { gradient: "linear-gradient(145deg, #eef2ff, #dbe4ff)", accent: "#3a6cf4" },
  "غامق": { gradient: "linear-gradient(145deg, #101a30, #060910)", accent: "#4e9eff" },
  "كحلي": { gradient: "linear-gradient(145deg, #0a1120, #1a2c55)", accent: "#4e9eff" },
  "بيج": { gradient: "linear-gradient(145deg, #e9e2d3, #d8cdb4)", accent: "#a8977a" },
  "رمادي": { gradient: "linear-gradient(145deg, #cbd5f1, #9fb0d9)", accent: "#667085" },
  "اسود": { gradient: "linear-gradient(145deg, #1f2a44, #101a30)", accent: "#3a6cf4" },
  "ذهبي": { gradient: "linear-gradient(145deg, #cea25c, #7a5a2c)", accent: "#cea25c" },
  "ابيض": { gradient: "linear-gradient(145deg, #e7ecfb, #c9d4f5)", accent: "#2451d6" }
};
const DEFAULT_THEME_KEY = "ازرق";

/* أنواع منتجات جاهزة — بدل ما الأدمن يكتب اسم أيقونة برمجي، بيكتب
   نوع المنتج بالعربي في عمود "النوع" وهو هيترجم تلقائيًا لأيقونة مناسبة */
const ICON_PRESETS = {
  "تيشيرت": "fa-shirt",
  "هودي": "fa-user-ninja",
  "جاكيت": "fa-vest",
  "بنطلون": "fa-socks",
  "شورت": "fa-socks",
  "كاب": "fa-hat-cowboy",
  "شنطة": "fa-bag-shopping",
  "شراب": "fa-socks",
  "فستان": "fa-person-dress",
  "قميص": "fa-shirt"
};
const DEFAULT_ICON = "fa-shirt";

/* لو رابط الصورة جاي من "رفع ملف" في جوجل فورم، بيكون رابط مشاركة درايف
   عادي مش صالح للعرض المباشر. الدالة دي بتحول أي شكل من روابط Drive
   لرابط صورة مباشر يشتغل جوه <img>. أي رابط عادي (زي imgbb) بيرجع
   زي ما هو من غير تغيير. */
function normalizeImageUrl(url) {
  if (!url) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
}

/* بتتحدث بعد تحميل المنتجات (من الشيت أو من الافتراضي) */
let PRODUCTS = [];
let CATEGORIES = [];

function formatPrice(n) {
  return n.toLocaleString("en-US") + " ج.م";
}

function getProductById(id) {
  return PRODUCTS.find(p => p.id === Number(id));
}

/* فولدر صور المنتج: images/products/{id}/ إلا لو محدد imagesFolder مخصص
   (ده بيتستخدم بس لو مفيش روابط صور جايه من الشيت) */
function galleryFolder(product) {
  return product.imagesFolder || `images/products/${product.id}`;
}

/* صورة الغلاف (اللي بتظهر في الكروت والقايمة والعربة):
   1) لو المنتج جاي من الشيت وفيه روابط صور → أول رابط
   2) لو محدد "image" بمسار مخصص في المنتج نفسه → يستخدمه
   3) وإلا → أول صورة في فولدر المنتج (images/products/{id}/1.jpg) */
function coverImage(product) {
  if (product.sheetImages && product.sheetImages.length) {
    return product.sheetImages[0];
  }
  return product.image || `${galleryFolder(product)}/1.jpg`;
}

/* اسم قديم لنفس الدالة عشان التوافق مع أي كود بيستخدمه */
function imageSrc(product) {
  return coverImage(product);
}

/* بيتأكد فعليًا إن الصورة موجودة قبل ما يعرضها (بيرجع الرابط أو null) */
function preloadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* بيرجع كل صور المنتج عشان نبني بيها معرض الصور (thumbnails):
   1) لو المنتج جاي من الشيت وفيه روابط صور → بيتأكد إنها شغالة ويرجعها
   2) وإلا → بيدور على 1.jpg, 2.jpg... لحد 6 جوه فولدر المنتج */
async function loadProductGallery(product) {
  if (product.sheetImages && product.sheetImages.length) {
    const checked = await Promise.all(product.sheetImages.map(preloadImage));
    const valid = checked.filter(Boolean);
    if (valid.length) return valid;
  }

  const folder = galleryFolder(product);
  const candidates = [1, 2, 3, 4, 5, 6].map(n => `${folder}/${n}.jpg`);
  const results = await Promise.all(candidates.map(preloadImage));
  const gallery = results.filter(Boolean);

  if (gallery.length === 0 && product.image) {
    const legacy = await preloadImage(product.image);
    if (legacy) gallery.push(legacy);
  }

  return gallery;
}

/* ---------- تحميل المنتجات من Google Sheet ---------- */

/* محلل CSV بسيط بيراعي الفواصل جوه علامات التنصيص (لو الوصف فيه فاصلة مثلاً) */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field); field = "";
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += char;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

/* ترتيب الأعمدة المتوقع في شيت المنتجات (بيتكتب أوتوماتيك من
   لوحة التحكم):
   0: id | 1: الاسم | 2: الفئة | 3: السعر | 4: السعر قبل الخصم
   5: النوع | 6: الشكل | 7: المقاسات | 8: الألوان
   9: وصف تفصيلي | 10: مواصفات | 11: روابط الصور
   (القيم المتعددة زي المقاسات والألوان والمواصفات وروابط الصور
   تتفصل بـ | )

   رقم المنتج (id) ثابت وبييجي من الشيت نفسه (عمود id)، مش بيتغير
   حتى لو حد ضاف أو مسح منتجات تانية بعد كده. */
function rowToProduct(cols) {
  const theme = THEME_PRESETS[(cols[6] || "").trim()] || THEME_PRESETS[DEFAULT_THEME_KEY];
  const splitList = v => (v || "").split("|").map(s => s.trim()).filter(Boolean);

  return {
    id: Number((cols[0] || "").trim()),
    name: (cols[1] || "").trim(),
    category: (cols[2] || "").trim(),
    price: Number((cols[3] || "").trim()) || 0,
    oldPrice: (cols[4] || "").trim() ? Number(cols[4]) : undefined,
    icon: ICON_PRESETS[(cols[5] || "").trim()] || DEFAULT_ICON,
    gradient: theme.gradient,
    accent: theme.accent,
    sizes: splitList(cols[7]),
    colors: splitList(cols[8]),
    description: (cols[9] || "").trim(),
    details: splitList(cols[10]),
    sheetImages: (cols[11] || "").split(/[|,]\s*/).map(s => s.trim()).filter(Boolean).map(normalizeImageUrl)
  };
}

/* بتحمل المنتجات: من الشيت لو الرابط متظبط، أو من القايمة الافتراضية */
async function loadProducts() {
  if (!SHEET_CSV_URL) {
    PRODUCTS = DEFAULT_PRODUCTS;
  } else {
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      const text = await res.text();
      const rows = parseCSV(text);
      const dataRows = rows.slice(1); // أول سطر عناوين الأعمدة
      const parsed = dataRows
        .map(rowToProduct)
        .filter(p => p.name && Number.isFinite(p.id));
      PRODUCTS = parsed.length ? parsed : DEFAULT_PRODUCTS;
    } catch (err) {
      console.error("تعذر تحميل المنتجات من الشيت، هيتم عرض منتجات تجريبية بدلها:", err);
      PRODUCTS = DEFAULT_PRODUCTS;
    }
  }
  CATEGORIES = [...new Set(PRODUCTS.map(p => p.category))];
  return PRODUCTS;
}
