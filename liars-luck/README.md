# Liar's Luck multiplayer

This is the two-player, room-code version of the game. The server owns each
round and both scoreboards. Answers stay hidden until both players have voted.
Rooms run in memory and expire after three hours, so restarting the server
closes any games in progress.

## Run locally

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in two browser tabs or devices on your network.
5. Create a room in one tab, then enter its six-character code in the other.

Do not open `public/index.html` directly as a `file://` page; multiplayer needs
the WebSocket server.

## Put it online

For Render, push the repository to GitHub and create a Blueprint from
`liars-luck/render.yaml`. The included `render.yaml` points Render at this
folder and configures the Node service and health check. Once it finishes
deploying, share its HTTPS URL with your friend.

Other Node.js hosts that support long-lived WebSocket connections can use
`npm install --omit=dev` as the install command and `npm start` as the start
command. The server binds to `0.0.0.0` and the port provided by the host. The
game automatically uses secure WebSockets on HTTPS; `/health` is the health
check endpoint.

This demo does not save accounts, scores, or rooms to a database. It has no
connection to Roblox accounts or Roblox servers.

## Install as an app and prepare Google Play

The deployed HTTPS website is an installable Progressive Web App. Visitors on
supported browsers can use the browser's **Install app** action; Android users
can install it from Chrome. Game rooms still need an internet connection.

For Google Play, package the deployed PWA as an Android Trusted Web Activity
(TWA). The Android application ID is `com.sanchayjasswal.liarsluck`. See
[play-store/README.md](play-store/README.md) for the exact Android build,
domain-verification and Play Console release checklist, and
[play-store/store-listing.md](play-store/store-listing.md) for a draft listing.

Until the public service is deployed, app installs, invites and online
multiplayer work only against the local server. Do not ship a Play Store app
that points at `localhost`.
