# 🏍️ Motor Rental Application

A mobile application built with **React Native + Expo** for our **Mobile Programming** subject. The app allows users to browse, book, and manage motor rentals — with an admin panel for managing listings and bookings.

---

**IMPORTANT** 

the main branch has been override to update the project to SDK 57, members need to sync their local repos after the force push

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
