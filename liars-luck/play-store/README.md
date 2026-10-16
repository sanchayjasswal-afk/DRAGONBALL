# Google Play release

## Release status

The app package is prepared as a Progressive Web App, and the Node.js
multiplayer server is deployable to Render. The Android package ID is
`com.sanchayjasswal.liarsluck`. This repository does **not** contain a signed
Android App Bundle or a Play Store release: those require a live HTTPS
deployment, Android build tools, a developer-owned signing key, and the
developer's verified Google Play Console account.

## Checklist

1. Deploy `liars-luck/render.yaml` from this repository as a Render Blueprint.
   Confirm `https://YOUR-SERVICE.onrender.com/health` is healthy and
   `/manifest.webmanifest` and `/privacy` load in a browser.
2. Install Node.js 20 or newer, Java 17 or newer, and Android Studio with its
   Android SDK on a trusted build computer.
3. From the `liars-luck` directory, generate the TWA project:

   ```powershell
   npx --yes @bubblewrap/cli init --manifest="https://YOUR-SERVICE.onrender.com/manifest.webmanifest" --directory=android
   ```

   Confirm package ID `com.sanchayjasswal.liarsluck`, app name **Liar's Luck**,
   and HTTPS origin for the deployed website when prompted. Create the
   upload-signing keystore on your own device; record its passwords in a
   private password manager and keep a secure backup. Never put the keystore,
   passwords, or Google credentials in this repository.
4. Create the app in Google Play Console and enable Play App Signing. Put the
   Play **app-signing certificate** SHA-256 fingerprint in the Render
   `PLAY_ASSET_LINKS_SHA256` environment variable. The server formats that
   value as Android's Digital Asset Links file. Wait for Render to restart,
   then check
   `https://YOUR-SERVICE.onrender.com/.well-known/assetlinks.json` and
   Google's Android App Links verification before building the release.
5. From the `liars-luck` directory, build the TWA:

   ```powershell
   npx --yes @bubblewrap/cli build --manifest=android
   ```

   Test the signed APK on a physical Android device. Upload
   `app-release-bundle.aab` from the `liars-luck` directory to a Play Console internal-testing track,
   test joining rooms across two internet-connected devices, and complete
   the console's listing, privacy, data safety, target audience, content
   rating, and testing declarations before requesting production release.

## Important

- `public/privacy.html` is the privacy-policy source. Review it and publish
  the public HTTPS `/privacy` URL in the Play listing before release.
- The provider-generated `onrender.com` address works as an app origin; a
  custom domain is optional. Do not generate the Android wrapper before
  settling on its final origin because a TWA is tied to that website.
- The server keeps rooms in process memory only. Deploy one server instance;
  restarting or scaling multiple independent instances interrupts or
  separates matches. This is a small demo, not a persistent account,
  ranked-matchmaking, or production-scale backend.
- A Play developer account, its identity checks, fees, testing and review are
  Google's responsibility. The developer must complete them; code changes
  cannot bypass the Play Console or publish to somebody else's account.
- Liar's Luck is an independent game, not a Roblox game and not affiliated
  with Roblox Corporation.
