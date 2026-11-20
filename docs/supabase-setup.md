# Supabase development setup

Shared authentication is now connected through Supabase. The hosted account/catalog
migration has been applied to the development project, and the public API recognizes
the tables. Unauthenticated access to the catalog is denied as expected. Shared login, logout, the Client role, and session restoration have been verified
on the iPhone. Shared inventory still needs the cross-device checklist below.

The motor catalog is now connected to Supabase. Clients browse the shared catalog;
backend-assigned admins create, edit, and archive listings. Existing SQLite data stays
on the device; there is no automatic seeding or upload into the shared database.
The app no longer opens the local database during normal startup.

## Shared inventory device checklist

1. Assign your intended Auth user the admin role with the trusted SQL below, then
   log out and back in. Account should display Administrator and Explore should show +.
2. The shared catalog is initially empty. Add a motor with name, type, description,
   PHP daily price (up to two decimal places), and an image reference.
3. Image references can be HTTPS URLs, or relative object paths such as
   `motors/photo.jpg` in the private `motor-images` bucket. Upload bucket images through
   Supabase Storage first; an in-app image picker/upload UI is a later enhancement.
   Private paths are converted to temporary signed URLs; the form retains the path,
   not an expiring signed URL. Missing images show a placeholder.
4. Sign in as a client on another device/browser. Open Explore or pull down to refresh;
   confirm the new motor appears and management controls are absent.
5. Edit the motor as admin, then refresh on the client. Delete with confirmation and
   refresh again; it should disappear from both catalogs. Backend rows are archived,
   preserving future history. Online access is required to confirm changes.
6. Test two admin edit forms open on the same motor. After one saves, the other's
   stale save must report a conflict rather than silently overwrite the first change.

Refresh failures keep the last loaded catalog and show a message. An initial load
failure has a retry screen. A background refresh does not discard an open form.
Images are re-signed when inventory reloads; active apps refresh them every 45 minutes.
This is refresh-based synchronization, not a realtime subscription.

## Device authentication checklist

1. Restart Metro with `npx expo start --clear` after configuring `.env.local`.
2. Register a NEW shared account using an email you can access. If the project requires
   confirmation, follow the email link, then return to the app and log in.
3. Confirm that Account displays your name, email, and Client role.
4. Close/reopen the app, then test logout, incorrect passwords, and another account.
5. To test management controls, assign the intended account's Auth UUID the admin role
   using the trusted SQL below, then log out and back in. New registrations never
   assign themselves admin. Account should now display Administrator.
6. If confirmation email does not arrive, inspect Supabase Auth delivery settings,
   spam folders, and project email limits. Do not disable confirmation solely to mask
   a delivery problem. Configure email delivery before testing with the whole team.

The SDK persists sessions, refreshes them while the app is active, and loads roles
from the protected backend table. Supabase work is deferred out of auth-change
callbacks to avoid locking the session lifecycle. Network requests have 15-second
abort limits; session operations have a 20-second deadline and retry/logout controls.
No client-side password hashing or local-password fallback is used.

## Create the project

1. Open [Supabase Dashboard](https://supabase.com/dashboard), sign in, and create a
   project in your organization. Choose an appropriate region near your users.
2. Keep the database password private. Review the plan and any billing requirements
   shown by the dashboard before creating the project.
3. When provisioning finishes, open the project's Connect/API settings and copy the
   Project URL and **publishable key** (`sb_publishable_...`). No service-role or
   secret key belongs in Expo configuration.
4. Copy `.env.example` to `.env.local` and fill in those two public values. The local
   environment file is ignored by Git. Restart Metro after changing configuration.

You can connect the Supabase integration in ChatGPT to select and inspect the project,
or run the following development steps yourself through the dashboard.

## Apply the development schema

Use a new development project. Inspect
`supabase/migrations/20261117000100_accounts_and_inventory.sql`, then run its entire
contents in Supabase SQL Editor. It creates profiles, client/admin roles, motor
inventory, policies, and a private motor-images bucket. It creates no demo accounts,
adds no admin automatically, and does not import the device database.

This migration is applied once. A second manual execution is expected to fail rather
than silently overwrite schema changes. Save subsequent changes as new migrations.
If using the Supabase CLI later, establish migration history before pushing schemas;
do not mix manual application and CLI history without reconciling them.

An auth trigger assigns every registered user the client role. User-supplied signup
metadata cannot assign admin. Users that already exist in Auth also receive profiles
and client roles when the migration runs. Keep this as a new development project to
avoid modifying an unrelated application's Auth users.

After you have created the intended admin account in Auth, assign its UUID through
the trusted SQL Editor:

```sql
update public.user_roles
set role = 'admin'
where user_id = 'REPLACE_WITH_THE_AUTH_USER_UUID'::uuid;
```

Confirm exactly one intended role row changed. The app itself has no permission to
perform this operation. Do not identify an admin by a hard-coded email or signup field.

## What is implemented

- Profiles: users read/update their own permitted fields; admins may read profiles.
- Roles: users read their own role; only trusted backend operators can write roles.
- Catalog: authenticated clients read unarchived motors. Admins create, edit, and
  archive motors. Application users cannot permanently delete them.
- Prices: positive integer centavos. One listing represents one rentable unit.
- Images: private `motor-images` bucket, JPEG/PNG/WebP up to 5 MiB. Admins manage
  uploads; clients may read only images linked to unarchived motors. Referenced
  images cannot be deleted through the application.
- Client: `getSupabaseClient()` validates public configuration and configures PKCE,
  persisted sessions, and request deadlines. AuthContext owns token refresh and cleanup.

The initial accounts/catalog migration does not include bookings. Apply the separate
client-bookings migration below to enable the booking flow. Admin screens and
archive/maintenance restrictions involving approved bookings follow separately.

## Remaining integration work

1. Complete the device authentication checklist above, including a second account.
2. Generate database TypeScript types from the live project as the schema grows.
3. Configure password recovery email delivery and app/web redirects. Test the full
   email-to-new-password flow on an actual iPhone before removing the recovery notice.
4. Complete the shared inventory device checklist above and verify hosted storage
   signing with an uploaded image. Local SQL policies have already been tested.
5. Apply the client booking migration below and complete the booking device checks.
6. Complete the admin booking device checks below; add pickup/return and archive/maintenance restrictions.
   Approval transitions already check date conflicts and have simultaneous-request tests.

Local accounts do not become cloud identities simply because the same email exists.
For the initial pilot, the proposed approach is new shared registration. Inventory
imports will be an explicit admin task, with UUID mapping, and will run once.

## Verification

- `npm test`: existing local inventory persistence tests.
- `npx tsc --noEmit` and `npm run lint`: application checks.
- `npm run test:backend`: isolated PostgreSQL schema/permission tests. Set
  `POSTGRES_BIN` to the directory containing `initdb`, `pg_ctl`, and `psql` if needed.
  The default is `/Library/PostgreSQL/18/bin` for the current development machine.

Backend tests start a temporary PostgreSQL instance using only a private Unix socket,
apply minimal stand-ins for Supabase's Auth/Storage interfaces, and execute the actual
migration under guest/client/admin roles. The server stops afterward; test logs stay
in the printed temporary directory. These checks verify SQL policies and triggers;
they do not verify hosted email delivery, Storage API limits, or a live Supabase login.

References: [React Native authentication](https://supabase.com/docs/guides/auth/quickstarts/react-native),
[row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[password recovery](https://supabase.com/docs/guides/auth/passwords).


## Enable client bookings

After the two existing migrations, run the entire file
`supabase/migrations/20261120000100_client_bookings.sql` in your development project's
SQL Editor. This creates the bookings table, policies, and guarded RPC functions.
Do not rerun the earlier migrations. No new environment variables are needed.
The publishable key cannot run this migration; apply it from the dashboard.

One motor listing is one rentable unit. Dates are Philippine calendar dates, selected
from the booking calendar and stored as YYYY-MM-DD. Return is exclusive: Nov 21 to Nov 23 costs two days. Pickup must be
between today and 365 days ahead; rental duration must be 1–90 days. These initial
limits are enforced by both the service and database and can be revised together.

Requests are Pending until reviewed. Multiple clients can submit overlapping pending
requests; only approved requests reserve inventory. Current maintenance or archived
motors reject new requests. The database checks current price against the displayed
rate, calculates total centavos, and snapshots the name/rate so later catalog edits
do not alter booking history. Identical active requests from one client return the
existing booking to make network retries safe. Cancelled/rejected requests may be
requested again. On an uncertain network response, check My Bookings before retrying.

Clients can read only their own bookings and cancel only their own pending requests.
Cancellation is confirmed inline and retry-safe. No app user can write the table
directly or choose a booking's owner, total, or status. Admins can read all bookings.
`review_motor_booking` provides the guarded transition used by the admin Bookings tab;
it serializes approvals per motor and rejects overlapping approved ranges. Adjacent
ranges are allowed. Admin clients cannot submit rental requests themselves.
The client UI does not collect payment or confirm a pending request as reserved.

Device checks after applying the migration:

1. As a client, open Explore → motor details → Request Booking.
2. Pick valid pickup/return dates. Review the day count and total; confirm the request. Verify Pending
   in My Bookings, close/reopen the app, and verify the request remains.
3. Try invalid dates, past pickup, and identical dates. They must fail. Submit the same
   active dates twice: there must be one active booking, not duplicate charges/requests.
4. Cancel a pending request and check Cancelled after refreshing/restarting.
5. Log in as a second client: the first client's bookings must not appear.
6. Verify request totals preserve the original rate after an admin edits that motor.
7. Check failed network actions and pull-to-refresh. The app must offer retry/check
   history rather than silently reporting success.

`npm test` covers booking date/money/request handling. `npm run test:backend` also
checks database permissions, price snapshots, cancellation, overlapping/adjacent
ranges, concurrent duplicate submissions, and simultaneous overlapping approvals in
an isolated PostgreSQL instance. Hosted migration application and the device checks
remain manual; pickup/return and payment are separate work.


## Admin booking management

No new migration is required if `20261120000100_client_bookings.sql` is already
applied. Log in with an admin account and open Bookings or Home → Manage Bookings.
Clients do not see this tab and direct navigation redirects them to Home. Database
RLS and the review RPC remain authoritative for access and decisions.

The list defaults to Pending and can filter Approved, Rejected, Cancelled, or All.
Rows show the client name/phone from protected profiles, account ID, motor snapshot,
dates, daily rate, total, and reference. Email is not read from Auth administrative
APIs and no service key is shipped. Missing phone information is clearly labelled.
Results load in pages of 50 with Load More; pulling down refreshes the first page.
Foreground/focus refreshes pick up changes from clients and other admins.

Approve and Reject require inline confirmation. Expired pickups cannot be approved;
rejection still works. Failed actions refresh the server state and do not announce
success. Changing a reviewed decision is not supported in this version. Client
cancellation and concurrent admin decisions are reconciled by the existing RPC.

Device checks:

1. Open a pending request as admin. Verify the client, dates, and snapshotted total.
2. Confirm approval; the request should appear in Approved and disappear from Pending.
3. Reject another pending request and verify it appears in Rejected.
4. Try two overlapping pending requests: approval of one must block approval of the
   other. Rejection of the competing request should still work.
5. From another admin/device, review or cancel a request while the first screen is
   open. The stale action must fail safely and refresh its status.
6. Log in as a client and verify the admin tab is absent; the client's own booking
   status should reflect the admin decision after refresh.
7. Check an empty queue, a failed load, a retry, and more than 50 requests if available.

The admin Home screen links to booking review, inventory, and account settings.
Dashboard counts and pickup/return tracking can be added in the next step.


## Calendar booking UI

After the client-bookings migration, apply
`supabase/migrations/20261121000100_booking_calendar.sql` once in the SQL Editor.
It adds `motor_blocked_dates`, an authenticated read-only RPC exposing only occupied
calendar dates for an active motor. Client identities, booking IDs, pricing, and
pending/rejected/cancelled requests are not exposed by this endpoint. The bounded
455-day horizon covers the 365-day pickup horizon plus a 90-day rental and fits
within the default API row limit. Existing bookings policies remain unchanged.

The booking screen now uses a month calendar: tap pickup, then return. The range is
highlighted and the day count/total update automatically. Past dates and occupied
pickup days are disabled. The return date is exclusive, so returning on the first
occupied day is allowed, while crossing that day is blocked. Clear Dates resets
the range; tapping a date after completing a range starts a new pickup selection.
The review step shows the motor photo, dates, daily rate, total, and approval notice
before sending a request. The displayed rate is held for review and compared with
both the latest local catalog and the server rate before submission.

Availability reloads on screen focus, foreground, explicit retry, and failed submit.
An unavailable calendar never implies that all dates are free: review/confirmation
are disabled until availability is loaded. The server still checks availability on
request and approval. This calendar does not reserve dates or collect payment.

Device checks on Android and iPhone:

- Navigate across months, select pickup and return, clear the range, and start again.
- Check a month boundary, same-day taps, and the 90-day/365-day limits.
- Confirm that dates occupied by an approved booking are unavailable. Pending requests
  must not block dates. Return on the next approved booking's pickup date is allowed.
- Review dates/rate/total, go back to edit, then submit; check the saved request in
  My Bookings. A failed network call must never display a false success.
- Change the motor rate or approve an overlapping request on a second device while
  reviewing; confirmation must fail safely, refresh, and offer another selection.
- Check screen-reader date labels, larger text, narrow screens, and loading/retry states.

No additional native dependency or rebuild is required for the calendar itself.
Automated tests cover month alignment/leap days, selection state, range conflicts,
boundaries, RPC errors, availability privacy, and SQL permissions.


## Client booking history and details

My Bookings now has Upcoming and History views. Pending requests are Upcoming when
pickup is today or later in Philippine time; approved requests remain Upcoming while
the exclusive return date is still ahead, including scheduled dates already underway.
Rejected/cancelled requests, elapsed pending pickups, and elapsed approved bookings
appear in History. Past labels preserve the real decision (for example Past · Approved)
and never assert that a motor was picked up, returned, or completed.

Open a card to view `/bookings/[bookingId]`: saved motor name, dates, duration,
snapshotted daily rate/total, status, reference, and timestamps. Photos come from the
current accessible motor catalog and have a fallback when the listing is archived.
The details read scopes both client identity and booking ID and remains protected by
bookings RLS. A failed read shows retry rather than claiming the booking is absent.

Cancellation has moved into the details screen. Only pending requests can be
cancelled, with confirmation; cancellation is disabled while the record is being
refreshed or could not be verified. The server-confirmed result updates both the
record and shared booking list. A concurrent approval or uncertain response refreshes
the details and reports the safe next step. Cancelled requests appear in History.

No new migration or native dependency is required. Test both views and details on
Android/iPhone, cancellation and its History placement, a stale request already
approved by an admin, direct detail links after restarting, missing/other-account IDs,
failed refresh/retry, and archived listings. Check the return-day boundary in
Philippine time and confirm Past is not shown as Completed.

## Client Home booking card

Home prioritizes the nearest approved booking with a return date still ahead in
Philippine time, including approved rental dates already underway. If none exists,
it shows the most recently created pending request whose pickup date has not passed.
Rejected, cancelled, elapsed pending, and past approved records do not become the
next ride. An account with neither eligible status sees Browse Motors.

The card uses the saved motor name/dates/total and links directly to booking details.
Pending copy explicitly says that the motor is not reserved. Home refreshes bookings
on focus and pull-to-refresh; BookingProvider also refreshes on foreground. Loading
and errors do not imply that the client has no bookings. Admin Home is unaffected.
No new migration is needed. Test approval priority, nearest approved dates, latest
eligible pending fallback, cancellation/approval on another device, no upcoming
requests, and the exclusive return-day boundary.
