# Password recovery setup and device test

Forgot Password now requests a Supabase reset email. The callback verifies a PKCE recovery code before displaying the new-password form. Recovery uses separate session storage so it cannot replace the normal signed-in account. Successful reset signs out the recovery account's refresh sessions and returns to login. Existing access tokens can remain valid until their normal expiration.

## Configure Supabase

1. Open Authentication → URL Configuration → Redirect URLs in the Supabase dashboard.
2. For Expo Go, take the exp://host:port URL printed by the current Expo terminal and append /--/auth/reset-password. Add that full URL to Redirect URLs. The app generates this same destination automatically; setup instructions are not shown in the user-facing form.
3. The current SDK adds an `sb_flow_id` query parameter for PKCE requests. Also allow the same callback followed by `?**` to match that query string. Keep the host and callback path specific. For example, for a native build add both `motorrentalexpo://auth/reset-password` and `motorrentalexpo://auth/reset-password?**`.
4. Leave the recovery email template using Supabase's `{{ .ConfirmationURL }}` link. A custom template pointing directly at the app without Supabase verification will not work.
5. Check Authentication email delivery settings. Configure custom SMTP for sending beyond Supabase's built-in test email restrictions. The publishable app key cannot configure these dashboard settings.

Expo Go generates a URL such as `exp://192.168.x.x:8081/--/auth/reset-password`. Use the actual host and port printed in the Expo terminal; the computer address may change. Add its query-string pattern too. Keep Metro running and the phone able to reach it. Use an installed development/release build with the configured `motorrentalexpo` scheme for a stable native callback. A web build needs its own HTTPS callback in the allowlist.

`EXPO_PUBLIC_RECOVERY_REDIRECT_URL` optionally overrides the generated URL. Use it only when the URL opens the same app/browser storage that requested the reset. Restart Metro after environment changes. Do not force the native scheme while using Expo Go.

## Test on iPhone

1. From Login → Forgot Password, request a link for an existing Supabase account.
2. Check inbox/spam. Open the newest email link on the same device and app installation that made the request. Web requests must return to the same browser and origin.
3. Confirm the new-password form appears. Mismatched passwords should fail; a matching password of at least eight characters with a letter and number should save.
4. Confirm the app returns to login, the old password fails, and the new password works. Close/reopen the app to check normal session restoration.
5. Reopen the used link and try an expired link: both should offer a new reset request. Opening the reset route without a link must never show an authorized form.

Requesting a link always gives a generic confirmation to avoid revealing whether an email is registered. Sending has a local 60-second cooldown and Supabase may impose additional limits. Codes are single use. Opening links on another device, reinstalling, or clearing app storage loses the PKCE verifier and requires another request. If the app is restarted after consuming a code but before saving, request a new link.

Automated tests cover request normalization, callback parsing, PKCE flow forwarding, duplicate exchange handling, rejection of ordinary sessions, identity checks, password validation, and sign-out. Actual email delivery, dashboard allowlist, and iPhone mail-to-app routing require the device test above. No SQL migration is required.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [password recovery](https://supabase.com/docs/guides/auth/passwords).

## Callback diagnostics in Expo Go

The reset route now checks both router parameters and the original incoming reset
URL from Expo Linking. Query/fragment callback fields can be recovered when a
router omits them. Unrelated launch paths, conflicting/duplicate values, error
callbacks and implicit token links remain rejected; a PKCE code must still be
exchanged and its stored recovery flow verified by Supabase before updating a
password. An existing signed-in session does not authorize recovery.

Development errors show only callback field names, never codes, tokens or the
complete link. “Callback fields: none” means the reset screen did not receive
verification details: check the email template uses `{{ .ConfirmationURL }}`, the
specific current return URL/query pattern is allowed, and the newest link returns
to the same app installation. An `access_token`/`refresh_token` callback is an old
implicit format; request a fresh PKCE link from the current app. A code with an
expired/verifier error requires a fresh request without clearing app storage.


## Stable return address versus Expo Go

The installed MotorRent app already registers `motorrentalexpo`. Its fixed callback
is `motorrentalexpo://auth/reset-password`; allow that URL and
`motorrentalexpo://auth/reset-password?**` in Supabase. This works across networks
on devices with the app installed. Request and open the recovery link in the same
installation; it does not open this project inside Expo Go.

Expo Go needs the current Metro server address plus `/--/auth/reset-password`.
There is no single project callback that reliably targets every changing Expo Go
host/port. Keep Metro reachable, update the specific allowlist entries when its
address changes, and leave EXPO_PUBLIC_RECOVERY_REDIRECT_URL unset for Expo Go.
The app already passes its generated return address to resetPasswordForEmail.
Do not replace this with localhost on a real phone.

A browser opening the Supabase verification URL first is expected. It must verify
the email link before redirecting into the app. Ending at localhost usually points
to the configured Site URL fallback, a non-matching callback allowlist, a stale
fixed override, or an email template using SiteURL instead of ConfirmationURL.
Check those dashboard settings, keep the reset email anchor as
`<a href="{{ .ConfirmationURL }}">Reset password</a>`, then request a new email.
Changing local code cannot update the hosted dashboard or previously sent emails.
For a public HTTPS address that opens an installed app, a separately configured
owned domain plus Android App Links / iOS Universal Links is needed; that setup is
not provided by Expo Go and has not been added to this project.
