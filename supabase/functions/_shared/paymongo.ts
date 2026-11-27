// Pure provider validation helpers; no app keys or Supabase dependencies.
export type Checkout = {
  id: string;
  attributes: {
    reference_number?: string;
    livemode?: boolean;
    status?: string;
    checkout_url?: string;
    payments?: {
      id: string;
      attributes: {
        status: string;
        amount: number;
        currency: string;
        livemode?: boolean;
      };
    }[];
  };
};
export function checkoutUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_checkout_url");
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.hostname !== "checkout.paymongo.com" ||
    url.port || url.username || url.password
  ) throw new Error("invalid_checkout_url");
  return value;
}
export function settlement(session: Checkout, expectedMode: boolean) {
  if (
    !/^cs_[A-Za-z0-9_-]+$/.test(session.id) ||
    typeof session.attributes.reference_number !== "string" ||
    !/^[0-9a-f-]{36}$/.test(session.attributes.reference_number)
  ) throw new Error("invalid_checkout_reference");
  if (
    session.attributes.livemode !== undefined &&
    session.attributes.livemode !== expectedMode
  ) throw new Error("wrong_payment_mode");
  const paid = (session.attributes.payments ?? []).filter((p) =>
    p.attributes.status === "paid"
  );
  if (paid.length !== 1) throw new Error("payment_not_settled");
  const payment = paid[0];
  if (
    !/^pay_[A-Za-z0-9_-]+$/.test(payment.id) ||
    !Number.isSafeInteger(payment.attributes.amount) ||
    payment.attributes.amount <= 0 || payment.attributes.currency !== "PHP" ||
    (payment.attributes.livemode !== undefined &&
      payment.attributes.livemode !== expectedMode)
  ) throw new Error("invalid_payment");
  return {
    p_payment_id: session.attributes.reference_number,
    p_session_id: session.id,
    p_provider_payment_id: payment.id,
    p_amount: payment.attributes.amount,
    p_currency: "PHP",
    p_livemode: expectedMode,
  };
}
export function webhookSession(
  body: unknown,
): { session: Checkout; livemode: boolean } | null {
  const envelope = body as {
    data?: {
      type?: string;
      attributes?: { type?: string; livemode?: boolean; data?: Checkout };
      livemode?: boolean;
      data?: Checkout;
    };
  };
  const event = envelope?.data;
  // Support both current developer-tools and legacy data.attributes envelopes.
  const details = event?.attributes ?? event;
  if (details?.type !== "checkout_session.payment.paid") return null;
  if (typeof details.livemode !== "boolean" || !details.data) {
    throw new Error("invalid_event");
  }
  return { session: details.data, livemode: details.livemode };
}
export async function verifySignature(
  raw: string,
  header: string,
  secret: string,
  livemode: boolean,
  now = Date.now(),
): Promise<boolean> {
  const values = new Map<string, string>();
  for (const item of header.split(",")) {
    const at = item.indexOf("=");
    if (at < 1) return false;
    const key = item.slice(0, at).trim();
    if (values.has(key)) return false;
    values.set(key, item.slice(at + 1).trim());
  }
  const timestamp = values.get("t") ?? "";
  const signature = values.get(livemode ? "li" : "te") ?? "";
  if (
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(
    signature.match(/../g)!,
    (part) => parseInt(part, 16),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(`${timestamp}.${raw}`),
  );
}
