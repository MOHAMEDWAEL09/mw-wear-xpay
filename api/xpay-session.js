function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.XPAY_SECRET_KEY) {
    return json(res, 500, { error: "XPAY_SECRET_KEY is not configured" });
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
