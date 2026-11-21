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
client-bookings migration below to enable the booking flow. Admin screens and rental safeguards use the later migrations described below.

## Remaining integration work

1. Complete the device authentication checklist above, including a second account.
2. Generate database TypeScript types from the live project as the schema grows.
3. Configure password recovery email delivery and app/web redirects. Test the full
   email-to-new-password flow on an actual iPhone before removing the recovery notice.
4. Complete the shared inventory device checklist above and verify hosted storage
   signing with an uploaded image. Local SQL policies have already been tested.
5. Apply the client booking migration below and complete the booking device checks.
6. Apply the handover migration and complete the admin pickup/return device checks below.
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
remain manual; payment is separate work.


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
Dashboard counts require the operations-dashboard migration below. Pickup/return tracking requires the handover migration below.


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

## Profile editing

Account → Edit Profile updates `profiles.full_name` and `profiles.phone`. Name is
required (2–120 characters); phone is optional and accepts 7–15 digits with an
optional leading plus. Spaces, parentheses, dots, and hyphens are removed before
saving; leading zeros are retained. A blank phone stores NULL. The form does not
verify phone ownership. Email and role are not part of the editable payload.

The service validates the current Auth identity, scopes the update to that user's
profile ID, and requires a returned row before displaying success. Existing column
grants and RLS prevent editing another profile, account identity, or role. A confirmed
save updates AuthContext immediately; older in-flight profile hydration cannot replace
that newly saved name/phone. Draft values remain available on failed/uncertain saves.
The app keeps password/session work out of the profile-editing flow.

No migration or native dependency is needed. Device checks: change name and phone,
verify Home's name, reopen the app to verify persistence, remove the optional phone,
try invalid values, cancel editing, and retry after a failed connection. On an admin
account/device, refresh booking details and verify that the client's updated name and
phone appear. Backend tests exercise own-profile writes and admin read visibility.


## Admin pickup and return tracking

Run `supabase/migrations/20261121000200_rental_handover.sql` once in the development
SQL Editor, after all existing migrations. Existing requests retain their status.
The migration adds In Use and Completed, actual pickup/return timestamps and admin
IDs, guarded handover RPC, reservation safeguards, and updated availability checks.
No new native dependency or environment variable is required.

Admin Bookings → Approved → Record Pickup → Confirm Pickup records actual handover.
Pickup is allowed only on/after pickup and before the exclusive return day in
Philippine time; it requires an approved request, a usable motor, and no other active
handover. Future pickups and already elapsed approved dates cannot be marked picked
up. Pending, rejected, cancelled, and completed requests cannot be handed over.

In Use → Record Return → Confirm Return records physical return and moves the rental
to Completed. Early and late returns are supported. Original rental dates, rate, and
total remain unchanged; the app does not calculate late fees, refunds, or payment.
Never mark a return until the motor is actually back. Both handover operations are
retry-safe and serialize on the motor row; only one rental per motor can be In Use.
Audit times are recorded after acquiring locks, using the server clock.

An unreturned motor stays In Use even after its scheduled dates expire. From its
exclusive return day it is labelled Overdue. An overdue motor blocks new requests,
approvals, and the full available calendar horizon until actual return is recorded.
A motor still In Use cannot be handed to the next client even if their nominal dates
are adjacent. Future bookings beyond an active rental's scheduled return may still
be requested/approved before it is overdue; their pickup still requires actual return.

Archiving or placing a motor under maintenance is rejected while it has an In Use
rental or an approved booking whose return date is still ahead. Editing listing text
or daily rates is allowed and does not alter saved booking prices.

Clients see actual handover times in booking details. In Use remains in Upcoming,
including overdue rentals, and takes priority on Home. Completed appears in History.
Approved dates that elapsed without handover remain Past · Approved, never Completed.
Existing cancelled/rejected/pending cancellation permissions do not change.

Device acceptance checks:

1. As admin, approve a request beginning today, confirm pickup, and verify In Use and
   actual pickup time in both admin and client views after refresh.
2. Confirm return and verify Completed, both timestamps, and unchanged total in History.
3. Try early pickup, return before pickup, client handover calls, repeated actions,
   and stale decisions from another device; unsupported transitions must fail safely.
4. Check an overdue rental: it remains In Use/visible on Home and blocks new handovers
   until returned. Past uncollected approved requests must remain uncompleted.
5. Try archiving/maintenance on a reserved motor. The app must explain the restriction.
6. Verify original calendar overlap checks and pending cancellation still work.

`npm test` covers service handover confirmation and client classification.
`npm run test:backend` also verifies admin-only transitions, timestamp/actor audit,
retry behavior, unchanged totals, overdue calendar/request/approval blocking,
archival restrictions, and simultaneous pickup/return retries in local PostgreSQL.
Hosted migration application and actual-device checks still require manual testing.

## Admin operations dashboard

Apply `supabase/migrations/20261121000300_admin_dashboard.sql` once after the handover
migration. Its admin-only `admin_booking_summary` RPC computes a single summary over
all bookings, including records beyond list pagination limits. It returns the server's
Philippine date and five counts. Guests and clients cannot execute it successfully.

- Pending: all requests still awaiting review, including elapsed requests to reject.
- Pickups today: Approved requests with pickup equal to the summary date, not pickups
  already recorded as In Use.
- Returns due today: In Use rentals with scheduled return equal to the summary date,
  excluding Completed rentals and approved requests that were never collected.
- Currently in use: all motors still with clients, including overdue rentals.
- Overdue: In Use rentals whose exclusive return date has been reached, including today.

Cards open matching server-filtered, paginated admin booking lists. The summary's date
is passed to the operations queue so its predicates match the counts. Switching chips
updates route parameters so subsequent dashboard navigation restores the requested
filter. If viewing an older summary date, the list shows that operations date explicitly.
Counts may change between opening Home and the list when another user acts.

Home refreshes on focus, foreground, and pull-to-refresh. It shows loading, retry,
last-loaded counts after a refresh failure, and an update time. Failed or absent
summaries are never presented as zero counts. These are refresh-based summaries,
not a realtime subscription. No new native dependency or environment variable is needed.

Check the dashboard with an empty dataset and with pending/approved/In Use records.
Open every card, change list filters, return Home, and open the same card again.
Record pickup/return on another device, refresh Home, and verify remaining-task counts
change. Verify the overdue/return-day boundary, failed load/retry, and client route access.
SQL tests cover admin permissions, zero values, more than 1000 pending rows, server date,
all five predicates, and a recorded return removing due/In Use/overdue task counts.

## Admin cancellation of approved bookings

Apply `supabase/migrations/20261121000400_admin_booking_cancellation.sql` once after
the existing migrations. It adds cancellation attribution and a guarded
`admin_cancel_approved_booking` RPC. Explore files and inventory UI are unaffected.

In Admin Bookings → Approved, choose Cancel Approved Booking, enter a client-visible
reason (5–500 normalized characters), and confirm. The operation records the admin ID,
server timestamp, source, and reason. It releases reserved dates, removes the request
from actionable dashboard counts, and preserves booking history, dates, and total.
No payment, refund, or fee is processed. This action cannot be undone in the app.

Only Approved bookings with no recorded pickup can be cancelled this way. Pending
requests still use rejection, and In Use must be returned rather than cancelled.
Completed, rejected, or client-cancelled records cannot be overwritten by this action.
Identical retries return the original admin cancellation without changing its audit;
a different reason on an already-cancelled record reports a conflict. The cancellation
and pickup RPCs lock the same motor/booking rows, so only one transition can win.

Clients can read the reason, cancellation source, and time on their own booking details.
Existing pending cancellation remains available and is recorded as Client, without
an invented admin reason. Historical cancellations with no attribution stay readable;
the migration does not backfill guessed actors or reasons. Direct client table writes
and reads of another client's records remain blocked by the existing grants and RLS.

Device checks: cancel an approved future booking and one beginning today, verify its
reason and timestamp as the client, confirm dates become available, and refresh admin
counts. Try blank/short reasons, retry a failed request, open the same booking on two
admin devices, and race pickup against cancellation. In Use and Completed must never
be cancellable. Check client pending cancellation still works. No-show handling and rejection reasons require the later migrations below.


## Client-visible rejection reasons

Apply `supabase/migrations/20261121000500_booking_rejection_reasons.sql` once after
the prior migrations. Admin Bookings → Pending → Reject now requires a 5–500 character
reason before confirmation. Whitespace is normalized. The admin is told explicitly
that the client can read it; avoid internal-only notes in this field.

`admin_reject_booking` requires an admin role, locks the same motor/booking rows as
approval, and accepts only pending requests. It records the admin ID, server time,
and reason, preserving original dates and total. Matching retries return the recorded
decision; different reasons cannot overwrite it. Clients cannot write these fields
or read another client's rejection. Approval still uses `review_motor_booking`; its
old rejection path now refuses to operate without a reason, so older app versions
must update before rejecting requests.

Clients see the reason and timestamp in booking details, while admins see it in the
Rejected queue. Existing rejected records remain valid and show an honest no-reason
message instead of fabricated audit data. Neither cancellation nor approved/in-use
rental transitions are broadened. Explore files remain unchanged.

Test short/blank/long reasons, successful rejection, client details after refresh,
retry after a lost connection, already-approved requests, different admin decisions,
and old rejected history. The server checks the status again before committing, so
stale screens cannot overwrite a completed decision. No-show handling requires the migration below.


## No-show handling

Apply `supabase/migrations/20261121000600_booking_no_shows.sql` once after the rejection
reasons migration. Existing statuses and history are preserved. No native dependency
or environment variable is added, and Explore redesign files are unchanged.

Admin Bookings → Approved offers Mark No-show only when the pickup date is strictly
before today in Philippine time and no pickup was recorded. Enter a client-visible
reason (5–500 normalized characters) and confirm the missed collection. The server
checks role, current status, actual pickup, and server date again under the same row
locks used for handover. Today/future pickups and pending/In Use/completed/cancelled/
rejected requests cannot be marked No-show. Marking a pickup or no-show concurrently
can produce only one valid transition.

The booking becomes No-show, with server timestamp, admin ID, and immutable reason.
Matching retries return the original record; a different reason cannot overwrite it.
The booking is not Completed and has no fabricated pickup or return. Reserved dates
are released by existing availability/conflict rules. The original rental dates, rate,
and total stay as historical reference; no fee, refund, or payment is calculated.

Admins have a No-show filter. Clients see No-show in History and can read the reason
and recorded date in their own booking details. No-show requests no longer appear as
the next approved ride on Home. Existing privacy and direct-write restrictions apply.

Device checks: use an approved request whose pickup was yesterday, verify Mark No-show,
enter a reason, confirm, and check client History/details and available calendar dates.
Try a pickup today/future, a rental already In Use, repeated taps/retries, another
client's detail URL, and simultaneous late pickup from another admin device. Existing
approved requests should remain unchanged until the admin explicitly records a no-show.


## Exact pickup times and completed-hour late charges

Apply `supabase/migrations/20261121000700_timed_rentals.sql` once, after 006.
Deploy the updated app with this migration: older versions cannot submit date-only
requests after it is applied. Existing bookings are retained as date-only records;
no exact time or hourly charge is invented for them.

New requests choose a pickup date, a time in Asia/Manila, and 1–90 rental days.
Each day is exactly 24 hours. The server derives the agreed return timestamp and
base price, snapshots the daily motor rate and universal ₱200/hour late rate, and
requires admin approval. The picker permits all clock times; business opening
hours have not been configured. A late pickup does not shift the agreed return.

`request_timed_motor_booking` accepts only the motor ID, pickup instant, number of
days, and expected daily rate. Actor, approval, price, late rate, and return time
are server controlled. Exact interval conflicts use exclusive return endpoints:
a booking ending at 9 AM does not block one beginning at 9 AM. Unreturned overdue
motors block subsequent approvals until physically returned. Pending requests
reserve nothing. `motor_booked_periods` exposes only merged blocked intervals,
without identities or references. Fully occupied calendar days are disabled;
partially available days remain selectable, with full rental overlap validation.

Admin pickup is allowed from the agreed pickup time until the scheduled return.
No-show requires explicit admin confirmation and a reason after the agreed pickup
instant; there is no automatic no-show or configured grace period. Legacy records
keep their earlier calendar-day eligibility. Existing cancellation and rejection
audits remain unchanged.

On admin-confirmed return, the server records its current time and calculates:
`late_hours = floor(max(actual_return - agreed_return, 0) / 1 hour)`.
`late_fee_centavos = late_hours * 20000` and
`final_total_centavos = total_centavos + late_fee_centavos`.
The existing `total_centavos` always remains the base rental. No daily cap applies:
all completed late hours use the agreed ₱200 rate. Under 1 hour adds ₱0;
6 hours 10 minutes adds ₱1,200. Early return leaves the base charge unchanged.
Matching return retries preserve the original actual time and charge. The admin
sees an estimate before confirmation; the saved server result is final. Recording
charges does not collect payment. Legacy bookings always have zero hourly fees.

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run test:backend`.
The PostgreSQL suite runs the old workflows first, applies 007 over existing
records, then verifies exact schedules, boundaries, roles, privacy, charges,
legacy returns, duplicate requests, and concurrent overlapping approvals.
Device checks: select a time and duration, review the computed return, submit and
approve; verify schedule in Home, My Bookings, details, and Admin Bookings. Record
pickup and return, then check the stored breakdown on both accounts. Test Android
and iPhone time selection, business date rollovers, adjacent bookings, expired
pickup approval, and a legacy booking. Use development fixtures to exercise late
returns without changing real client records.
