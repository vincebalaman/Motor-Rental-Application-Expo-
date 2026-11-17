# 🏍️ Motor Rental Application

A mobile application built with **React Native + Expo** for our **Mobile Programming** subject. The app allows users to browse, book, and manage motor rentals — with an admin panel for managing listings and bookings.


## Current storage and planned roles

Supabase has been selected for the shared backend. The schema and permissions are
prepared locally; the app continues using SQLite until the development project is
connected and tested. Follow the [Supabase setup guide](docs/supabase-setup.md).

See the [multi-user implementation plan](docs/multi-user-plan.md) for proposed
client/admin permissions, shared data, and the admin-approval booking flow.

Accounts, sessions, and the motor catalog are stored locally in SQLite. Motor additions,
edits, and deletions survive app restarts. The sample inventory is seeded once; deleting
all motors leaves an empty catalog. Deleted motor records are retained internally for
future booking references.

The planned multi-user design has clients who browse and book, and admins who manage
inventory. Roles and bookings are not implemented yet. SQLite currently stores data on
each device; sharing accounts, availability, and bookings across devices will require a
shared backend.

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
