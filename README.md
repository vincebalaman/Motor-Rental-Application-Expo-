# 🏍️ Motor Rental Application

A mobile application built with **React Native + Expo** for our **Mobile Programming** subject. The app allows users to browse, book, and manage motor rentals — with an admin panel for managing listings and bookings.


## Current storage and planned roles

Shared registration, login, sessions, profiles, and roles now use Supabase. Local
accounts are preserved on the device but cannot sign in to the shared backend; create
a new shared account and confirm its email. See the [Supabase setup guide](docs/supabase-setup.md).

The motor catalog now reads and writes Supabase. Backend-assigned admins create,
edit, and archive shared listings; clients browse them. Explore refreshes on return,
app foreground, and pull-to-refresh. The app no longer initializes SQLite at startup;
existing local data remains on the device and is not imported automatically.

The shared catalog starts empty. Assign an admin account using the setup guide, then
add the first listing or use the admin-only import preview on the original phone.
The import requires the second SQL migration described in the setup guide and preserves
local motor records. If the import screen reports that the Android build does not
include `expo-sqlite`, run `npx expo run:android` or create and install a new EAS
development build so the native module is included.
Bookings and email password recovery are the next phases.

See the [multi-user implementation plan](docs/multi-user-plan.md) for the agreed
client/admin permissions, shared data, and admin-approval booking flow.

Run `npm test` with Node.js 22.18+ to check inventory persistence, seed rollback, and
validation against SQLite. These tests exercise the database queries through a Node
SQLite adapter; Expo device behavior still requires manual testing.

---

**IMPORTANT** 

The project currently targets Expo SDK 58 (see `package.json`). The repository instructions require reading the SDK 57 reference before editing; also consult the SDK 58 reference for APIs used by the installed dependencies.

Members syncing after the main branch force push can follow the steps below.

1. Fetch the updated remote state:

```bash
git fetch origin
```

2. Switch to the main branch:

```bash
git checkout main
```

3. Hard reset local main to match remote main:

```bash
git reset --hard origin/main
```

4. Verify

```bash
git status
```

---

## 👨‍💻 Team Members

| Name | GitHub | Role |
|------|--------|------|
| Vince Jaliel Balaman | [@vincebalaman](https://github.com/vincebalaman) | Developer |
| Micheal Tim Joseph Enriquez | [@michealtimjoseph](https://github.com/michealtimjoseph) | Developer |
| Ella Stephanie Culaste | [@culasteellastephanie18-coder](https://github.com/culasteellastephanie18-coder) | Developer |
| Patrick Louise Casiño | [@userpat19](https://github.com/userpat19) | Developer |

---

## 📱 Features

### 🔐 Authentication & User Management
- User Registration (Create Account)
- User Login / Logout
- User Profile Page (name, photo, contact info)
- Change Password

### 🏍️ Motor Listings
- Browse all available motors (name, photo, type, price per day)
- Motor detail page (specs, availability, rental shop info)
- Search motors by name or type
- Filter by price range and availability

### 📅 Booking System
- Select rental dates with a date picker (start & end date)
- Booking confirmation screen with price summary
- View booking history (Active, Completed, Cancelled)
- Cancel a booking

### 💳 Payment
- Price breakdown and total before confirming
- Mock payment / "Pay on Pickup" option

### ⭐ Reviews & Ratings
- Rate and review a motor after rental
- View average rating and reviews per motor

### 🔔 Notifications
- In-app alerts for booking confirmation
- Rental reminder notifications

### 🛠️ Admin Panel
- Add, edit, and delete motor listings
- View and manage all bookings
- Dashboard overview (total rentals, available units, revenue)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo |

Password reset email setup and the iPhone test checklist are documented in [docs/password-recovery.md](docs/password-recovery.md).
