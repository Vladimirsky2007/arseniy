# ARSENIY SKYSHOK 1.1

## What's new
- Fixed continuous canvas rendering, visible ground grid/map props and reconnect indicators.
- Room creation/join by code, max 4 players, host start, leave room.
- Server-side movement, zombies, waves, money, weapons and buildables.
- Mobile joystick + fire button, mouse/keyboard controls.
- Animated menu, button feedback, synthesized menu/game music and sound effects.
- Telegram bot `/start` and `/help` using `BOT_TOKEN`; `/start` sends a Web App button.
- Telegram chat menu button configured automatically when `WEBAPP_URL` is set.
- `/health` returns `OK`.

## Render Environment variables
Set these in Render -> Environment:
- `BOT_TOKEN` = token from @BotFather (keep secret)
- `WEBAPP_URL` = `https://YOUR-SERVICE.onrender.com` (your actual deployed HTTPS URL)

Deploy:
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

After deploy, open `/health` and expect `OK`. Then open Telegram bot and send `/start`.

## Telegram
Create a bot with @BotFather. Set `BOT_TOKEN` and `WEBAPP_URL` in Render. On startup the app enables long polling and configures the Telegram menu button. Bot `/start` sends an inline Web App launch button. The Render URL must be HTTPS.

## Local run
Node.js 18+: `npm install`, then `npm start`, open `http://localhost:3000`.

## Prototype limitations
Room and game state are held in server memory and reset on deploy/restart. The game is multiplayer prototype code, not production hardened. Add Telegram initData validation, persistence/database, anti-cheat, moderation and reconnect recovery before public release. Only one Render instance should run Telegram long polling for this bot.
