import {
  adminClient,
  cors,
  json,
  provider,
  providerConfig,
  required,
} from "../_shared/runtime.ts";
import { checkoutUrl, settlement } from "../_shared/paymongo.ts";
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const db = adminClient();
    const token = request.headers.get("Authorization")?.replace(
      /^Bearer\s+/i,
      "",
    );
    if (!token) return json({ error: "Sign in to continue." }, 401);
    const { data: identity, error: authError } = await db.auth.getUser(token);
    if (authError || !identity.user) {
      return json({ error: "Sign in to continue." }, 401);
    }
    const { bookingId, action = "create" } = await request.json();
    if (
      typeof bookingId !== "string" || !/^[0-9a-f-]{36}$/.test(bookingId) ||
      !["create", "cash", "refresh"].includes(action)
    ) return json({ error: "Invalid payment request." }, 400);
    const { live } = providerConfig();
    const { data: booking, error: bookingError } = await db.from("bookings")
      .select("id,client_id,status,motor_name").eq("id", bookingId).single();
    if (bookingError || booking.client_id !== identity.user.id) {
      return json({ error: "Booking unavailable." }, 403);
    }
    const { data: rows, error: readError } = await db.from("payments").select(
      "*",
    ).eq("booking_id", bookingId).eq("livemode", live).in("status", [
      "creating",
      "pending",
      "paid",
    ]).limit(1);
    if (readError) throw readError;
    let payment = rows?.[0];
    if (action !== "create") {
      if (payment?.status === "creating" && !payment.checkout_session_id) {
        return json({
          error:
            "Checkout creation is still being checked. Please contact the shop if this persists.",
        }, 409);
      }
      if (payment?.checkout_session_id && payment.status !== "paid") {
        let session = await provider(
          `/v1/checkout_sessions/${
            encodeURIComponent(payment.checkout_session_id)
          }`,
        );
        if (
          session.attributes.payments?.some((
            p: { attributes: { status: string } },
          ) => p.attributes.status === "paid")
        ) {
          const { error } = await db.rpc(
            "settle_booking_payment",
            settlement(session, live),
          );
          if (error) throw error;
        } else if (
          action === "cash" && session.attributes.status !== "expired"
        ) {
          // Expire refuses ongoing/paid payments; never unlock cash after an error.
          session = await provider(
            `/v1/checkout_sessions/${
              encodeURIComponent(payment.checkout_session_id)
            }/expire`,
            "POST",
          );
          if (session.attributes.status !== "expired") {
            throw new Error("expiration_not_confirmed");
          }
          const { error } = await db.rpc("close_booking_payment", {
            p_payment_id: payment.id,
            p_status: "expired",
          });
          if (error) throw error;
        } else if (session.attributes.status === "expired") {
          const { error } = await db.rpc("close_booking_payment", {
            p_payment_id: payment.id,
            p_status: "expired",
          });
          if (error) throw error;
        }
      }
      return json({ ok: true });
    }
    const { data: reservation, error: reserveError } = await db.rpc(
      "reserve_booking_checkout",
      {
        p_booking_id: bookingId,
        p_client_id: identity.user.id,
        p_livemode: live,
      },
    );
    if (reserveError) {
      return json({
        error: reserveError.message === "payment_already_paid"
          ? "The base rental is already paid."
          : "Only an approved booking before pickup can be paid online.",
      }, 409);
    }
    payment = reservation.payment;
    if (!reservation.created) {
      if (payment.status === "paid") return json({ ok: true, paid: true });
      if (payment.checkout_url) {
        return json({
          checkoutUrl: checkoutUrl(payment.checkout_url),
          testMode: !live,
        });
      }
      return json({
        error:
          "A checkout request is already being checked. Please wait or contact the shop.",
      }, 409);
    }
    const returnBase = `${
      required("SUPABASE_URL")
    }/functions/v1/payment-return`;
    const methods = (Deno.env.get("PAYMONGO_PAYMENT_METHODS") || "qrph").split(
      ",",
    ).map((v) => v.trim()).filter((v) =>
      ["card", "gcash", "paymaya", "qrph", "grab_pay", "shopeepay"].includes(v)
    );
    if (!methods.length) throw new Error("payment_methods_not_configured");
    let session;
    try {
      session = await provider("/v2/checkout_sessions", "POST", {
        data: {
          attributes: {
            line_items: [{
              name: `MotorRent base rental · ${booking.motor_name}`,
              amount: payment.amount_centavos,
              currency: "PHP",
              quantity: 1,
            }],
            payment_method_types: methods,
            reference_number: payment.id,
            success_url: `${returnBase}?booking=${bookingId}`,
            cancel_url: `${returnBase}?booking=${bookingId}`,
            send_email_receipt: false,
            pass_on_fees: false,
          },
        },
      });
    } catch (cause) {
      const status = (cause as { status?: number })?.status;
      if (
        status && status >= 400 && status < 500 && status !== 408 &&
        status !== 429
      ) {
        const { error } = await db.rpc("close_booking_payment", {
          p_payment_id: payment.id,
          p_status: "failed",
        });
        if (error) throw error;
      }
      throw cause;
    }
    const url = checkoutUrl(session.attributes.checkout_url);
    if (session.attributes.livemode !== live) {
      throw new Error("payment_mode_mismatch");
    }
    const { error: attachError } = await db.rpc("attach_booking_checkout", {
      p_payment_id: payment.id,
      p_session_id: session.id,
      p_url: url,
    });
    if (attachError) throw attachError;
    return json({ checkoutUrl: url, testMode: !live });
  } catch {
    // Do not expose provider payloads, billing data or secret-bearing errors.
    return json({
      error:
        "Online checkout is unavailable or could not be confirmed. Refresh payment status before trying again.",
    }, 503);
  }
});
