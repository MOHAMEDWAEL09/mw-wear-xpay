const XPAY_URL = "https://api.xpay.app/checkout/sessions";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
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

    const lineItems = items.map((item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (
        !item.name ||
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
            name: `${item.name} — ${item.size || ""} — ${item.color || ""}`.replace(/\s+—\s+$/g, "")
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
