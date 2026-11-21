# Android APK builds

The `preview` EAS profile builds a signed, standalone APK for installation on Android
phones. Metro and Expo Go are not needed to run it. Internet access is needed for
Supabase account, booking, inventory, notification and photo features.

The Android application ID is `com.motorrent.app`, with display name `MotorRent`.
Keep this application ID and the same signing keystore for future updates.

The project is linked to `@timjoseph/Motor-Rental-Expo`. On another laptop, sign
in to an Expo account with access before starting the build:

```sh
npx --yes eas-cli@latest login
npm run build:apk
```

When prompted, allow EAS to generate an Android keystore. Keep the signing
credentials in that Expo project. The build uploads project source to Expo;
confirm that upload before starting it. No Google Play account is needed for installing this APK directly.
After a successful build, open the build's installation/download link on an Android
phone and install the APK. Android may ask permission to install apps from that
browser. An APK cannot be installed on an iPhone.

The build profile explicitly includes only the public Supabase URL and publishable
key, since `.env.local` is excluded from uploads. These values are embedded in the
client app by design; access is controlled by Supabase authentication and RLS.
Never add a service-role key, database password or other secret to this configuration.
The production profile builds an AAB for Google Play instead of a directly installable
APK. Both profiles currently target this app's existing Supabase project.

Apply all required SQL migrations before testing. Test login, session restoration,
client booking, admin approval, camera/gallery uploads, account picture and notifications
in the installed APK. For password recovery, add
`motorrentalexpo://auth/reset-password` to Supabase Authentication → URL Configuration
→ Redirect URLs. Expo Go `exp://...` links are for development only. Test with a newly
requested recovery email after installing; old emails retain their original redirects.

Checks before submitting a build:

```sh
npm test
npx tsc --noEmit
npx expo export --platform android
```

A successful JavaScript export verifies bundling, not native compilation. The APK is
available only after the EAS build completes successfully.
