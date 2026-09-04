// Entry: decide host vs joiner from the URL and load only that half of the app.
import { roomFromUrl } from './net.js';

const room = roomFromUrl();
if (room) (await import('./client/main.js')).start(room);
else (await import('./host/main.js')).start();
