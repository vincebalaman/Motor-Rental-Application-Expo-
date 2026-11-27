# Educational online payment mockup

The app defaults to demo payment mode. No PayMongo account/API key, new SQL payment
migration or Edge Function deployment is required for this mockup. Existing shared
login and booking approval still use Supabase as before.

## Demonstration flow

1. Register/login as a client and request a future ride.
2. Approve that booking from an admin account.
3. As the client, open My Bookings → Booking details → Payment.
4. Tap **Pay online**, select GCash, Maya or Debit/credit card, then tap the amount
   button to simulate success. **Cancel checkout** records cancellation; expand
   **Presentation controls** to simulate a declined payment. No real phone
   number/card/PIN/OTP is collected. A brief no-real-money note remains visible.
5. Success displays a clearly labeled demo receipt, the simulated base amount and
   simulated balance. Failure/cancellation allow retry and do not cancel the booking.
6. Use **Reset practice checkout** to demonstrate the flow again.

Results are stored locally with AsyncStorage, scoped to the booking and client.
They remain after app reload on that device. Another phone does not receive the
mock receipt. An admin viewing the same booking on the same device can see the
saved educational result under booking reference & records. Demo actions never
modify booking status, real cash receipts, payment RPCs or the `payments` table.
No fake result is trusted as a real settlement. Booking approval and pickup-time
eligibility still apply, and real charges remain unchanged.

## Modes

Optional environment selection (restart Metro after changes):

```text
EXPO_PUBLIC_PAYMENT_MODE=demo
```

An unset mode also selects demo. To return to the separately implemented provider
integration, set `EXPO_PUBLIC_PAYMENT_MODE=provider` and follow `payments-setup.md`.
The provider's online button additionally requires
`EXPO_PUBLIC_ONLINE_PAYMENTS_ENABLED=true`. Neither flag authorizes a real payment;
server-side verification and credentials remain mandatory in provider mode.

An APK must be rebuilt to include this new code. Demo is the default for the next
build even when no payment-mode variable is supplied; the previously downloaded
APK will not acquire this mockup merely by restarting it. Before using the app for
real transactions, explicitly configure provider mode and complete its deployment,
merchant setup, refund policy and end-to-end acceptance tests.
