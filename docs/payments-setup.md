# Booking payments: provider test-mode rollout

For the account-free educational mockup, see [demo payments](demo-payments.md).
The current app defaults to demo and does not mount these provider screens.

Status: payment UI, database RPCs and Edge Functions are implemented locally.
No PayMongo account, credentials, hosted payment migration or deployed payment
functions have been configured by this change. No real transaction has been made.
Online payment UI stays disabled until explicitly activated after setup.

## Included behavior

- Clients can pay the full snapshotted base rental after approval, before the agreed
  pickup. Pending requests cannot pay. Cash on pickup remains the default alternative.
- PayMongo Hosted Checkout offers only the methods enabled on your merchant account.
  Start with QR Ph in test mode; add enabled methods after testing each one. Provider
  fees are not automatically passed on to the client.
- Admins can confirm a physically received cash **base rental** payment under
  Admin Bookings → Booking reference & records. It is an audited record, not money
  collection by the app. Late fees remain a separate outstanding balance.
- A payment has creating/pending/paid/failed/expired state independent of booking
  approval. The signed webhook plus provider-side session read verifies settlement.
  Browser success/cancel redirects never mark a payment paid or cancel the booking.
- All test payments are labeled TEST and do not reduce real money owed. Cash receipts
  are real-money records even while online checkout uses test keys: use development
  bookings for testing cash receipt controls.
- Cancelling/no-show after receiving real money displays refund review. This version
  does not issue automatic refunds, handle disputes or process later refunds from
  provider webhooks. Set an explicit cancellation/refund policy and implement refund
  reconciliation before enabling live payments. Never represent a refund as issued
  solely by changing booking status.

## 1. Create a PayMongo test account

Create the merchant/developer account in PayMongo and complete the access/identity
requirements shown by its dashboard. Obtain a test secret key (`sk_test_...`).
The provider determines available test methods and live activation requirements.
No paid account, live channel availability or fixed fees are assumed here.
Never paste secret keys into chat or put them in EXPO_PUBLIC variables/eas.json.

## 2. Apply the migration

After all existing migrations, run the complete contents of:

`supabase/migrations/20261127000100_booking_payments.sql`

It creates private payment rows, column-limited reads for owners/admins, and
service-only reservation/attach/settlement/expiration RPCs. Users cannot write
payments directly. The admin cash RPC verifies role on every call. Base amounts
come from the locked booking, not the phone. Test and live mode records are distinct.
The function service client uses the existing Supabase server-side service-role key;
this must never be copied into the app. The isolated SQL test bootstrap adds a local
service_role only to reproduce these permission boundaries in tests.

## 3. Deploy functions and configure secrets

Use the Supabase dashboard to deploy the functions and shared files, or use the CLI
from an account with access to the existing project:

```sh
npx supabase login
npx supabase link --project-ref adnwzweqzbdlunnpnlts
npx supabase functions deploy create-checkout
npx supabase functions deploy paymongo-webhook
npx supabase functions deploy payment-return
```

`supabase/config.toml` disables gateway JWT checking for these endpoints because:
create-checkout explicitly verifies a bearer user with Auth.getUser and checks the
booking owner; the webhook verifies PayMongo's signature; payment-return is public
and performs only a fixed deep-link redirect. Do not remove the explicit checks.

Set the following under Supabase → Edge Functions → Secrets (dashboard avoids
putting secret values into shell history). The SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY are supplied by the hosted runtime. They are not app envs.

```text
PAYMONGO_SECRET_KEY=sk_test_REPLACE_IN_DASHBOARD
PAYMENTS_LIVE_MODE=false
PAYMONGO_PAYMENT_METHODS=qrph
PAYMONGO_WEBHOOK_SECRET=REPLACE_WITH_ENDPOINT_SIGNING_SECRET
```

The webhook secret is a separate credential provided when you create the webhook,
not the API secret. `PAYMENTS_LIVE_MODE` defaults false; key prefixes must match.
Methods are a comma-separated list; only enable channels activated on the account.
Common API names include `qrph`, `gcash`, `paymaya`, `card`. Check the provider's
current account/API documentation before enabling additional methods.

## 4. Register the PayMongo webhook

In PayMongo test mode create an endpoint for:

`https://adnwzweqzbdlunnpnlts.supabase.co/functions/v1/paymongo-webhook`

Subscribe to `checkout_session.payment.paid`. Copy its endpoint signing secret
into the backend secret above. Configure separate credentials/endpoints for live
mode if a future deployment is activated; don't mix test/live secrets.

The handler verifies HMAC-SHA256 over timestamp + `.` + raw body with
Paymongo-Signature (`te` for test, `li` for live), rejects timestamps beyond five
minutes, then retrieves the session with the backend API key. It verifies successful
payment, reference, session, PHP amount and mode before the settlement RPC.
A database failure returns non-2xx for provider retry. Repeated successful deliveries
are safe because the same payment/session IDs settle once. Failed individual wallet
attempts do not mark the entire checkout failed; the customer can retry its checkout.

## 5. Enable the app UI only after configuration

Add to your local `.env.local`:

```text
EXPO_PUBLIC_PAYMENT_MODE=provider
EXPO_PUBLIC_ONLINE_PAYMENTS_ENABLED=true
```

Restart Metro. This enables the UI only; it is not a security boundary and cannot
switch the backend into live mode. For an APK, explicitly include this flag in the
intended EAS build profile only after backend test setup is complete, then rebuild.
The previously distributed APK does not contain these payment screens.

An approved booking's details show Pay base rental online. PayMongo opens in the
browser. On return or Refresh payment status, read the verified backend state.
The HTTPS payment-return function redirects to
`motorrentalexpo://bookings/<booking UUID>` in the installed app. Supabase's ordinary
function domain rewrites HTML to plain text, so the function intentionally sends a
302 rather than pretending to host an HTML success page. In Expo Go, switch back to
Expo Go manually and refresh; this fixed scheme targets the installed APK. A hosted
web checkout flow needs a separately configured web return page before rollout.

## Retry, cash switching and reconciliation

Reservation is serialized on the booking. Only the caller that creates a new local
attempt contacts the create-session API; repeated calls reuse the saved checkout.
Checkout session IDs/provider payment IDs are unique. The same verified event is
idempotent and test payments are never counted as real credit.

Use Close checkout · pay cash instead to expire an active provider session first.
The API must confirm expiration. If PayMongo refuses due to ongoing/paid processing,
the app leaves it locked and asks for refresh instead of enabling duplicate cash.
Browser cancel alone does not expire a session. The app cannot assume QR-code
expiry means checkout expiry. Real active checkout attempts block cash receipts.

If a create request times out or crashes after contacting PayMongo, the attempt stays
creating instead of silently generating a second payable checkout. An admin/operator
must reconcile an ambiguous attempt in PayMongo using its `reference_number` (the
payment row UUID): if it exists, attach its exact session ID and URL via the trusted
RPC; if confirmed absent, mark the attempt failed. Never mark an uncertain attempt
failed merely because the app timed out. New attempts then become possible.
A failed attach is likewise reconciled, not blindly recreated.

Payment can settle after a concurrent cancellation. Record the money and surface
refund review; never restore booking approval or silently discard the settlement.
Provider refunds/disputes currently require manual reconciliation; live rollout is
not complete without the agreed refund policy and corresponding tooling.

## Acceptance checks

```sh
npm test
npx tsc --noEmit
npx deno check supabase/functions/create-checkout/index.ts supabase/functions/paymongo-webhook/index.ts supabase/functions/payment-return/index.ts
npm run test:backend
```

Check pending denial, approved base price, duplicate taps/two-device creation,
wallet decline/retry, browser close, session expiration before choosing cash,
webhook replay/invalid signature/wrong amount/wrong mode, test-vs-real balances,
client privacy, admin cash confirmation/retries, late balance after return and
paid cancellation/refund-review display. Use only development bookings and provider
sandbox tools. Account activation and real provider end-to-end testing remain manual.

References:
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start
- https://docs.paymongo.com/docs/developer-tools-webhook-setup-management
- https://docs.paymongo.com/reference/get_checkout_sessions
- https://supabase.com/docs/guides/functions/limits
