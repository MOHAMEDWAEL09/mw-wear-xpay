const crypto = require("crypto");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  return JSON.stringify(req.body || {});
}

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const receivedSignature = signaturePart.slice(3);

  if (!timestamp || !receivedSignature) return false;

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) return false;

  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - timestampNumber) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.XPAY_WEBHOOK_SECRET) {
    return json(res, 500, {
      error: "XPAY_WEBHOOK_SECRET is not configured"
    });
  }

  const rawBody = getRawBody(req);
  const signature = req.headers["xpay-signature"];

  const valid = verifySignature(
    rawBody,
    signature,
    process.env.XPAY_WEBHOOK_SECRET
  );

  if (!valid) {
    return json(res, 400, {
      error: "Invalid webhook signature"
    });
  }

  try {
    const event = JSON.parse(rawBody);

    const eventType = event.type;
    const session = event.data?.object || event.data || {};

    if (
      eventType === "checkout.session.completed" ||
      eventType === "checkout.session.async_payment_succeeded"
    ) {
      if (session.paymentStatus === "paid") {
        console.log("XPay PAID ORDER", {
          sessionId: session.id,
          amount: session.amountTotal,
          currency: session.currency,
          metadata: session.metadata || {}
        });
      }
    }

    return json(res, 200, {
      received: true
    });

  } catch (error) {
    console.error("Webhook error", error);

    return json(res, 400, {
      error: "Invalid webhook payload"
    });
  }
};
