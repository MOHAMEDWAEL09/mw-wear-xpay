const XPAY_URL = "https://api.xpay.app/checkout/sessions";

/* نفس رابط شيت المنتجات المستخدم في products.js — بيتحمل هنا كمان
   عشان نتأكد من السعر الحقيقي بدل ما نصدق السعر الجاي من المتصفح
   (لو حد لعب في الطلب من الـ DevTools وبعت سعر أقل) */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSnV8Wp800X1TpnZBU3ej1AqJ9Mt_WE4vtYcUUUbaOWRnZR3mix6QkEVlHZcCklcXsSj8ahAEHMXKfO/pub?gid=1805255167&single=true&output=csv";

// أقصى عدد سطور مسموح بيه في الطلب الواحد (حماية من طلب مفتعل فيه آلاف المنتجات)
const MAX_ITEMS_PER_ORDER = 30;

// مدة صلاحية الكاش الخاص بأسعار الشيت (تقلل عدد المرات اللي بنكلم فيها Google في نفس الدقايق)
const SHEET_CACHE_TTL_MS = 3 * 60 * 1000;

// كاش بسيط في الذاكرة (بيفضل موجود طول ما نفس الـ serverless instance شغالة)
let sheetCache = { data: null, fetchedAt: 0 };

// عداد بسيط لكل IP لتقليل تأثير أي محاولة إغراق بالطلبات من نفس المصدر
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8;
const ipHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear(); // أمان إضافي ضد تضخم الذاكرة نفسها
  return hits.length > RATE_LIMIT_MAX;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

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

/* بيرجع Map من id للسعر والاسم الحقيقيين من الشيت، مع كاش لمدة SHEET_CACHE_TTL_MS.
   لو الشيت فشل يترد ومعندناش كاش قديم نرجع عليه، بنرجع null — والـ handler
   وقتها بيرفض الطلب بدل ما يصدق سعر جاي من المتصفح. */
async function fetchRealProducts() {
  const now = Date.now();
  if (sheetCache.data && now - sheetCache.fetchedAt < SHEET_CACHE_TTL_MS) {
    return sheetCache.data;
  }

  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text).slice(1);
    const map = new Map();
    rows.forEach(cols => {
      const id = Number((cols[0] || "").trim());
      const name = (cols[1] || "").trim();
      const price = Number((cols[3] || "").trim());
      if (Number.isFinite(id) && name && Number.isFinite(price) && price > 0) {
        map.set(id, { name, price });
      }
    });
    if (!map.size) throw new Error("empty product sheet");
    sheetCache = { data: map, fetchedAt: now };
    return map;
  } catch (e) {
    console.error("Could not verify prices against sheet", e);
    // لو عندنا نسخة قديمة في الكاش (حتى لو منتهية)، أفضل من رفض كل الطلبات
    return sheetCache.data || null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!process.env.XPAY_SECRET_KEY) {
    return json(res, 500, { error: "XPAY_SECRET_KEY is not configured" });
  }
  if (!process.env.SITE_URL) {
    // من غيرها هنضطر نصدق Host header اللي جاي في الطلب، وده ممكن يتزوّر
    // ويوجّه العميل بعد الدفع لرابط تاني — لازم يتحدد ثابت من الإعدادات
    return json(res, 500, { error: "SITE_URL is not configured" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return json(res, 429, { error: "طلبات كتير في وقت قصير، حاول تاني بعد شوية" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customer.name || !customer.phone || !customer.address || !items.length) {
      return json(res, 400, { error: "بيانات العميل أو المنتجات ناقصة" });
    }

    if (items.length > MAX_ITEMS_PER_ORDER) {
      return json(res, 400, { error: "عدد المنتجات في الطلب أكبر من المسموح" });
    }

    const realProducts = await fetchRealProducts();

    if (!realProducts) {
      // مش قادرين نتأكد من الأسعار الحقيقية دلوقتي — أرفض بدل ما أصدق سعر المتصفح
      return json(res, 503, { error: "الخدمة مشغولة حاليًا، من فضلك حاول تاني بعد لحظات" });
    }

    const lineItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const real = realProducts.get(Number(item.id));
      if (!real) throw new Error("منتج غير موجود في الكتالوج");
      const price = real.price;
      const name = real.name;

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        throw new Error("بيانات منتج غير صحيحة");
      }

      return {
        priceData: {
          currency: "EGP",
          unitAmount: Math.round(price * 100),
          productData: {
            name: `${name} — ${item.size || ""} — ${item.color || ""}`.replace(/\s+—\s+$/g, "")
          }
        },
        quantity
      };
    });

    const origin = process.env.SITE_URL.replace(/\/$/, "");

    const payload = {
      uiMode: "hosted",

      afterCompletion: {
        type: "redirect",
        redirect: {
          url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`
        }
      },

      cancelUrl: `${origin}/fail.html`,

      lineItems,

      metadata: {
        customerName: String(customer.name).slice(0, 200),
        customerPhone: String(customer.phone).slice(0, 50),
        customerAddress: String(customer.address).slice(0, 500),
        customerNotes: String(customer.notes || "").slice(0, 500)
      }
    };

    const response = await fetch(XPAY_URL, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${process.env.XPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `mw-${Date.now()}-${Math.random().toString(36).slice(2)}`
      },

      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.url) {
      console.error("XPay checkout error", response.status, data);

      return json(res, 502, {
        error: data.message || data.error || "XPay رفض إنشاء جلسة الدفع"
      });
    }

    return json(res, 200, {
      url: data.url,
      sessionId: data.id || null
    });

  } catch (error) {
    console.error("Checkout error", error);

    return json(res, 400, {
      error: error.message || "تعذر تجهيز الدفع"
    });
  }
};
