import {
  adminClient,
  json,
  provider,
  providerConfig,
  required,
} from "../_shared/runtime.ts";
import {
  settlement,
  verifySignature,
  webhookSession,
} from "../_shared/paymongo.ts";
Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (Number(request.headers.get("content-length") || 0) > 262144) {
    return json({ error: "Payload too large" }, 413);
  }
  try {
    const raw = await request.text();
    if (raw.length > 262144) return json({ error: "Payload too large" }, 413);
    const { live } = providerConfig();
    if (
      !await verifySignature(
        raw,
        request.headers.get("Paymongo-Signature") || "",
        required("PAYMONGO_WEBHOOK_SECRET"),
        live,
      )
    ) return json({ error: "Invalid signature" }, 401);
    const event = webhookSession(JSON.parse(raw));
    if (!event) return json({ received: true });
    if (event.livemode !== live) {
      return json({ error: "Wrong payment mode" }, 400);
    }
    // Re-read the session with the server key, not redirect parameters. This also
    // reconciles retries and catches a webhook with inconsistent amount/reference.
    if (!/^cs_[A-Za-z0-9_-]+$/.test(event.session.id)) {
      return json({ error: "Invalid session" }, 400);
    }
    const session = await provider(
      `/v1/checkout_sessions/${encodeURIComponent(event.session.id)}`,
    );
    const db = adminClient();
    const { error } = await db.rpc(
      "settle_booking_payment",
      settlement(session, live),
    );
    if (error) throw error;
    return json({ received: true });
  } catch {
    return json(
      { error: "Settlement could not be confirmed. Retry required." },
      500,
    );
  }
});
