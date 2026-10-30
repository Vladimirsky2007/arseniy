# ARSENIY SKYSHOK 1.0

Telegram Mini App / browser co-op zombie survival prototype.

## Included
- Original, ungenerated circular face portraits cropped from the supplied photo.
- Room creation and joining by six-character code (up to 4 players).
- Server-authoritative movement, zombie waves, health, kills and money.
- Pistol plus purchasable shotgun, rifle and meme blaster.
- Buildable barricades, turrets and mines.
- Synthesized funny arcade-style sound effects (no external copyrighted sound files).
- Mobile joystick/fire button and keyboard/mouse controls.
- `GET /health` returns plain-text `OK`; `GET /api/status` returns server stats.

## Run locally
Requires Node.js 18+.
```bash
npm install
npm start
```
Open http://localhost:3000

## Deploy on Render
1. Put this folder in a GitHub repository.
2. Render -> New -> Web Service -> connect repository.
3. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
4. Render supplies `PORT` automatically.
5. Check `https://YOUR-SERVICE.onrender.com/health` -> `OK`.

## UptimeRobot
Create an HTTP(s) monitor for `https://YOUR-SERVICE.onrender.com/health`.
Render free services can spin down after inactivity; a monitor ping is not a guaranteed or officially supported way to keep a free instance awake.

## Telegram setup
1. Create a bot with @BotFather.
2. Deploy this app to Render so it has an HTTPS URL.
3. In BotFather configure the bot's Menu Button / Main App URL to the Render URL.
4. Open the bot in Telegram and launch the Mini App.

## Important current limitations
This is a playable multiplayer prototype, not a production-hardened game. Room state lives in server memory and is lost on restart/deploy. No persistent accounts, database, anti-cheat, reconnection recovery, or verified Telegram `initData` login yet. Before a public launch, validate Telegram `initData` on the server, add rate limits/input validation and persistence, and test on real Telegram clients. A room creator is host; only host can start a room. There are no game-chat features yet.
