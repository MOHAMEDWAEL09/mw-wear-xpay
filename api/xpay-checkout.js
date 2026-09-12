const XPAY_URL = "https://api.xpay.app/checkout/sessions";

/* نفس رابط شيت المنتجات المستخدم في products.js — بيتحمل هنا كمان
   عشان نتأكد من السعر الحقيقي بدل ما نصدق السعر الجاي من المتصفح
   (لو حد لعب في الطلب من الـ DevTools وبعت سعر أقل) */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSnV8Wp800X1TpnZBU3ej1AqJ9Mt_WE4vtYcUUUbaOWRnZR3mix6QkEVlHZcCklcXsSj8ahAEHMXKfO/pub?gid=1805255167&single=true&output=csv";

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

/* بيرجع Map من id للسعر والاسم الحقيقيين من الشيت.
   لو الشيت مش متاح دلوقتي، بيرجع null عشان نعرف إننا مش قادرين
   نتأكد ونتصرف بحذر بدل ما نمنع البيع بالكامل. */
async function fetchRealProducts() {
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) return null;
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
    return map.size ? map : null;
  } catch (e) {
    console.error("Could not verify prices against sheet", e);
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!process.env.XPAY_SECRET_KEY) {
    return json(res, 500, { error: "XPAY_SECRET_KEY is not configured" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customer.name || !customer.phone || !customer.address || !items.length) {
      return json(res, 400, { error: "بيانات العميل أو المنتجات ناقصة" });
    }

    const realProducts = await fetchRealProducts();

    const lineItems = items.map((item) => {
      const quantity = Number(item.quantity);
      let price = Number(item.price);
      let name = item.name;

      // لو قدرنا نقرأ الشيت، نصدق سعر واسم المنتج منه بس — مش من المتصفح
      if (realProducts) {
        const real = realProducts.get(Number(item.id));
        if (!real) throw new Error("منتج غير موجود في الكتالوج");
        price = real.price;
        name = real.name;
      }

      if (
        !name ||
        !Number.isFinite(price) ||
        price <= 0 ||
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

    const origin = process.env.SITE_URL
      ? process.env.SITE_URL.replace(/\/$/, "")
      : `https://${req.headers.host}`;

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
