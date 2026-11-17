# Supabase development setup

The backend foundation is prepared. The app still uses its tested local SQLite
accounts and inventory. Supplying configuration does not switch authentication or
upload local data. Shared login, booking operations, and recovery screens will be
connected in the next integration step after the development project is ready.

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
- Client: lazy `getSupabaseClient()` validates public configuration and configures
  PKCE and persisted sessions. The current app does not import or activate it.

Bookings and availability locks are intentionally not in this migration. They require
transactional booking functions and date-conflict constraints in the next phase.
Archive/maintenance restrictions involving bookings will be added with that schema.

## Before switching the app

1. Confirm the project and migration are correct; verify a client and an admin using
   actual Auth sessions and REST/storage requests against the development project.
2. Generate database TypeScript types from the live project for the client adapter.
3. Replace local authentication behind AuthContext, with explicit cloud configuration
   errors, auth-state subscriptions, and AppState-based token refresh cleanup.
   The prepared client leaves automatic refresh off until that lifecycle is wired.
4. Test registration, verified email, login, logout, and restored/expired sessions on
   the iPhone. Preserve the working local database during this transition.
5. Configure email confirmation/recovery redirects and SMTP delivery. Test with the
   actual development build/app links; do not assume Expo Go links match release links.
6. Connect the shared catalog and admin route guards. Remove the local account flow
   only after the shared account flow passes device tests. Do not silently fall back
   to a local session when shared authentication fails.

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
