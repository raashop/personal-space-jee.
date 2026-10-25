# Personal Space — YouTube & Telegram JEE lecture tracking

This repository has a local-first Brave extension for YouTube. Telegram support is planned as a user-triggered import flow rather than attempting to read your entire Telegram account or scrape channels.

## YouTube (Brave desktop)
1. Download the repository ZIP and extract it.
2. Open `brave://extensions`, enable Developer mode, and choose Load unpacked.
3. Select the `youtube-tracker` folder containing `manifest.json`.
4. Play a likely JEE lecture; open the extension popup and export its JSON file.
5. In Personal Space V6, open **YouTube Lectures** and import the JSON.

## Telegram (recommended first version)
Telegram Bot API bots do not have access to your personal account's entire chat history. They receive private messages sent to the bot and messages from channels where the bot is a member; group visibility depends on bot permissions/privacy mode. See the [official Bot FAQ](https://core.telegram.org/bots/faq).

A safe and simple option is **Share to Personal Space**:
1. In Telegram, open the JEE lecture post or video message.
2. Use Forward/Share or copy its message/video link.
3. On Personal Space's Telegram import page, paste the link and title (or upload a small JSON/CSV export that you intentionally created).
4. Confirm the matched JEE subject/chapter before it changes chapter status.

This will not silently read private Telegram chats. Do not share your Telegram login code, password, session string, bot token, or API hash.

## Why not automate full Telegram scanning?
Reading a Telegram user's private chats requires a user-account client/API session, not a regular Bot API token. This introduces substantial account access and credential risks. For a study tracker, explicit share/import is safer and adequate. A Telegram bot is useful if you deliberately forward selected lecture messages to that bot; it cannot inspect every message in other chats.

## Current implementation status
- YouTube: browser-local detection based on title/channel chapter keywords, actual playback-time accumulation, export JSON.
- Planner: YouTube Lectures dashboard and JSON import; matching chapters move only from **Not Ready** to **In Progress**.
- Telegram: documented safe workflow; native Telegram integration is not yet implemented.
- Automatic cloud sync: not configured by this repo itself. Static GitHub Pages cannot store or run private backend credentials safely.
