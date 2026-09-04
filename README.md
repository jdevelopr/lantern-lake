# Lantern Lake

A cozy co-op fishing game for a TV and up to two phones. The TV (or any laptop
browser) hosts the lake; each player steers their own boat from their phone. You share
one purse and one set of gear, so every catch and every upgrade builds the same little
fishing empire. Days roll into nights, seasons change what bites, and the town at the
end of the pier is where you sell the haul and buy better rods, line, bait, boats,
engines and storage.

There is also a single-player mode played on the host screen with keyboard and mouse.

## How to play

**Host (TV):** open the game, choose *New lake*. A room code and QR code appear. Players
scan the QR or type the code on their phone. When everyone taps *I'm ready*, press
*Set sail*.

**Phone controls**

- Joystick: steer the boat, walk in town, move the shop cursor
- Big button: cast (hold to charge, release to throw), hook when the bobber dips,
  hold to lift the catch zone while reeling, dock, enter a shop, select
- Pull: tap when the fish tugs and *Pull!* appears. Tapping at other times adds tension.
- Back: reel in an idle line, close a shop

**Reeling:** keep the fish inside your coloured zone. Holding lifts the zone, releasing
lets it sink. Inside the zone the green bar fills and tension eases; outside it the red
bar climbs. If tension maxes out the line snaps. Bigger fish tug: wait for *Pull!* and
tap once.

**Town:** dock at the pier, walk right. Fishmonger buys the whole hold. Tackle shop sells
rods, line and bait (bait comes in packs of ten, one per cast; worms are free forever).
Boatyard sells boats, engines and storage. Walk back to the pier to sail.

**Single player:** choose *Single player* on the host screen. WASD or arrows to move,
Space for the big button (hold for cast and reel), E or right mouse button to pull, Esc
to go back.

**Continuing:** the host browser saves the lake every few seconds. Saved lakes are listed
on the home screen; *Continue* reopens the room under the same code, so players can
rejoin with the same link and get their seat and hold back. A player whose phone drops
mid-game keeps their seat; reopening the link is enough.

## Run it locally

The game is plain HTML, CSS and JavaScript with no build step. It does need to be served
(opening `index.html` from disk will not work), so from this folder:

```
python3 -m http.server 8080
```

then open `http://localhost:8080`. Note that phones cannot join a `localhost` host: WebRTC
needs HTTPS for anything other than localhost, so a LAN address like
`http://192.168.1.20:8080` will fail. Deploy first (below) to play with real phones.

To test two players on one machine, use a normal window and a private window; two tabs
in the same profile share the same player identity.

## Deploy to AWS Amplify

1. Zip this folder (the one containing `index.html`).
2. In the AWS Amplify console choose **Create new app**, then **Deploy without Git**.
3. Drop the zip. Amplify gives you an HTTPS URL; open it on the TV and scan from there.

To redeploy, drop a new zip. If you connect a Git repository instead, `amplify.yml` in
this folder is already set up (there is nothing to build). Netlify, Vercel, Cloudflare
Pages and GitHub Pages work the same way with no configuration.

## Networking notes and next steps

- **Signalling:** the game uses the free public PeerJS broker to introduce phones to the
  host. It is fine for playing with friends but has no uptime guarantee and is not meant
  for production. For anything more serious, run your own PeerServer
  (`npm i -g peer`, or the Docker image) behind HTTPS and pass its address as
  `peerOptions` where `createHost` and `createClient` are called in `js/host/main.js`
  and `js/client/main.js`:

  ```js
  peerOptions: { host: 'peer.yourdomain.com', port: 443, secure: true, path: '/' }
  ```

- **Same network:** everything is peer to peer. On one Wi-Fi this works directly. Across
  different networks a TURN server is needed; that is a hosting decision, not a code
  change.
- **The host tab is the game.** Closing it ends the room. Saves persist in that browser,
  so reopen the game and press *Continue*.
- **Room size:** two phones plus the TV. Change `MAX_PLAYERS` in `js/shared/protocol.js`
  to allow more; the split-screen renderer divides the TV evenly between players who are
  in different places.

## Project layout

```
index.html            all screens
css/style.css         art direction and controller layout
js/main.js            host or phone, decided by ?room=
js/net.js             PeerJS transport (host-authoritative star)
js/shared/            constants, gear and fish catalogue, roster widget
js/game/              rules: world, fishing, reducer, per-phone projection
js/host/              TV: loop, renderer, audio, saves, keyboard for solo mode
js/client/            phone: joystick, controller UI
```
