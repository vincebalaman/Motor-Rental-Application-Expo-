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

Bookings and availability locks are intentionally not in this migration. They require
transactional booking functions and date-conflict constraints in the next phase.
Archive/maintenance restrictions involving bookings will be added with that schema.

## Remaining integration work

1. Complete the device authentication checklist above, including a second account.
2. Generate database TypeScript types from the live project as the schema grows.
3. Configure password recovery email delivery and app/web redirects. Test the full
   email-to-new-password flow on an actual iPhone before removing the recovery notice.
4. Complete the shared inventory device checklist above and verify hosted storage
   signing with an uploaded image. Local SQL policies have already been tested.
5. Add transactional booking requests, approvals, cancellations, pickup, and return,
   including date-conflict constraints and simultaneous-approval tests.

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
