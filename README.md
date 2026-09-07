# Lantern Lake

A cozy co-op fishing game for a TV and up to two phones. The TV (or any laptop
browser) hosts the lake; each player steers their own boat from their phone. You share
one purse and one set of gear, so every catch and every upgrade builds the same little
fishing empire. Days roll into nights, seasons change what bites, and the town at the
end of the pier is where you sell the haul and buy better rods, line, bait, boats,
engines and storage.

There is also a single-player mode played on the host screen with keyboard and mouse.

The look is clean pixel art drawn entirely in code (no image files) on a strict pixel
grid: the canvas is a virtual resolution chosen per screen so that an integer scale fills
it exactly (about 480 world pixels across on a 1080p TV, closer indoors), every drawing
call is snapped to whole pixels, and the light map paints its warm pools from lanterns,
windows and stoves in flat bands. Characters are 32 px tall, at the scale of the doors
they walk through, and carry no black outlines; the fish illustrations do. Text on the
canvas is a hand-drawn 5x7 bitmap font. The camera follows your boat or walker; two
boats share one view until they drift apart, then the screen splits.

**Weather** rolls in and out on its own: clear, overcast, rain, storm and snow, with odds
that depend on the season. It is part of the shared game state, so it is saved with the
lake and shown on the phones. It changes the fishing too: rain brings faster bites and
favours bass, trout, carp and salmon; storms shorten the hook window but tempt the big
deep-water fish and the giants of the sea; cloud cover lets night biters show up by day at
half odds; snow slows everything but suits burbot, pike, cod and herring.

**Three waters.** The lake's north-east bay narrows into the Ash River, a winding channel
of rapids, pools and undercut banks with its own eight species (chub, crayfish, grayling,
brown trout, freshwater drum, river eel, zander, salmon). The river pushes your boat
downstream, hard in the rapids, so you fight the current with the engine; a Skiff or
better is needed to sail in. At the river's end lies the Grey Sea: shoals along the cliffs,
a reef with a wreck, a lighthouse islet, and beyond that the deep blue, home to nine more
species (herring, mackerel, flounder, cod, sea bass, halibut, bluefin tuna, swordfish and
the blue shark). A slow swell drifts the boat and grows in a storm; only the Trawler can
take it. Sail into a river mouth or the sea gate and press the big button to cross; the
prompt tells you which boat you still need.

## How to play

**Host (TV):** open the game, choose *New lake*. A room code and QR code appear. Players
scan the QR or type the code on their phone. When everyone taps *I'm ready*, press
*Set sail*.

**Phone controls**

- Joystick: steer the boat, walk in town, move the shop cursor
- Big button: cast (hold to charge, release to throw), hook when the bobber dips,
  hold to lift the catch zone while reeling, dock, enter a shop, select
- Pull: tap when the fish tugs and *Pull!* appears. Tapping at other times adds tension.
- Back: reel in an idle line, close a shop, leave a room

**Reeling:** keep the fish inside your coloured zone. Holding lifts the zone, releasing
lets it sink. Inside the zone the green bar fills and tension eases; outside it the red
bar climbs. If tension maxes out the line snaps. Bigger fish tug: wait for *Pull!* and
tap once.

**Town:** dock at the pier, walk right. Fishmonger buys the whole hold. Tackle shop sells
rods, line and bait (bait comes in packs of ten, one per cast; worms are free forever).
Boatyard sells boats, engines and storage. Walk back to the pier to sail.

**Inside:** every door on the street opens. Press the big button at a shop door to step
through (a short fade, a bell) into a walkable room; walk to the counter and press it
again for the shop menu, or press Back or walk to the door to leave. The four houses
open too, and their residents will talk. The rooms are live: windows show the real sky
and weather (rain on the glass, snow on the sills, storm flashes), daylight falls in
shafts and lamps take over at dusk, stoves and hearths light when it is cold or dark,
clocks keep game time, and the shops show what you own. The tackle wall racks the rods
you have bought and tags the next one with its price, the bait pegs mark what is in your
tin, the boatyard hull on the trestles is your current boat, and the fishmonger lays
your last sale out on the ice. After ten at night the houses are asleep.

**Fish and the journal:** every catch (34 species across the three waters) shows a card with the species' illustration, weight
and price on the TV and on the catcher's phone. The tackle shop sells the *Fish journal*
(350 g), after which a Journal button on the phone (J in single player) opens it from
anywhere: one page per species with the artwork, your own count, best weight, worth and
first catch (season, day, water and weather), plus where it lives, which seasons, day or
night, which weather favours it, its size and price. Species you have not caught yet show
as a silhouette with a hint. Left and right, or the phone's arrows, turn the pages; Back
closes it.

**Single player:** choose *Single player* on the host screen. WASD or arrows to move,
Space for the big button (hold for cast and reel), E or right mouse button to pull, Esc
to go back, J for the journal.

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
css/style.css         art direction for the HTML screens and the phone controller
js/main.js            host or phone, decided by ?room=
js/net.js             PeerJS transport (host-authoritative star)
js/shared/            constants, gear and fish catalogue, fish illustrations, journal text, roster widget
js/game/              rules: world (lake shape, time), waters (river, sea, gates, currents), fishing, weather, reducer, projection
js/host/              TV: loop, audio, saves, keyboard for solo mode, and the renderer:
  gfx.js                bitmap font, light sprites, dither, palette maths, vignette
  lake.js               baked terrain per season, water, boats, fishing overlays, lake lights
  waters.js             the river and the sea: banks, rapids, swell, reef, lighthouse beam
  style.js              the three art styles (cosy storybook, moody harbour, snowbound north)
  town.js               sky and hills, wet road, window glow, walker, shop menu
  room.js               interiors: window weather, lamps and fires, keepers, talk
  figure.js             people and animals, assembled from the hand-drawn sheets in art/
  art/px.js             pixel maps: sprites drawn as text, one character per pixel
  art/people-*.js       character sheets per style: walk cycles, hats, hair, beards, kids, cats
  art/kit.js            roof slopes, gables, snow caps, icicles, tiled fills
  art/kit-*.js          town parts per style: walls, roofs, windows, doors, signs, props
  art/townbake.js       the town layout: quay, boatyard, shops, square, chapel, lane
  art/fixtures.js       interior furniture and props
  art/rooms.js          the seven rooms, per style
  weatherfx.js          rain, snow, fog wisps, cloud shadows
  render.js             panes, light pass, halos, particles, popups, HUD
js/client/            phone: joystick, controller UI

The art style is picked on the title screen (or with `?style=storybook|harbour|north`,
or `LL.style('harbour')` from the console) and remembered on that TV. Moody harbour is the default. Every sprite is a
text pixel map, so a window or a hat can be edited by hand in the art files.

For tuning there is a debug hook on the host: `LL.state`, `LL.renderer`, and
`LL.jump({ day, minute, weather, loc, room, water })` from the browser console jumps the lake to
any time, season, weather (`clear`, `overcast`, `rain`, `storm`, `snow`) or place (`loc`
is `lake`, `town` or `room`; `room` is `fishmonger`, `tackle`, `boatyard` or `house1` to
`house4`; `water` is `lake`, `river` or `ocean`).
```
