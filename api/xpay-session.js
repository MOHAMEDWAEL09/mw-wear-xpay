function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20; // أعلى من الـ checkout لأنها بتتنادى تلقائي أثناء الانتظار على نتيجة الدفع
const ipHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return hits.length > RATE_LIMIT_MAX;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.XPAY_SECRET_KEY) {
    return json(res, 500, { error: "XPAY_SECRET_KEY is not configured" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return json(res, 429, { error: "طلبات كتير في وقت قصير، حاول تاني بعد شوية" });
  }

  const sessionId = String(req.query?.session_id || "").trim();

  if (!sessionId) {
    return json(res, 400, { error: "session_id is required" });
  }

  try {
    const response = await fetch(
      `https://api.xpay.app/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.XPAY_SECRET_KEY}`
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("XPay session error", response.status, data);

      return json(res, response.status >= 400 && response.status < 500 ? 400 : 502, {
        error: data.message || data.error || "تعذر قراءة جلسة الدفع"
      });
    }

    return json(res, 200, {
      id: data.id || sessionId,
      status: data.status || null,
      paymentStatus: data.paymentStatus || null,
      amountTotal: data.amountTotal ?? null,
      currency: data.currency || "EGP",
      metadata: data.metadata || {}
    });

  } catch (error) {
    console.error("Session error", error);

    return json(res, 500, {
      error: "حدث خطأ أثناء قراءة حالة الدفع"
    });
  }
};
