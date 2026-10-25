# Personal Space — JEE Lecture Tracker

This is a local-first Brave extension prototype. It uses YouTube video titles and channel names to guess the JEE chapter, records playback time on this browser, and exports records for import into Personal Space. It does not use transcripts or sync directly to the website.

## Install or update in Brave

1. Download the ZIP for the `personal-space-v6` branch and extract it.
2. Open `brave://extensions` and enable **Developer mode**.
3. If the old extension is installed from an older extracted folder, export any records you need first. Then remove the old extension and choose **Load unpacked**.
4. Select the new `youtube-tracker` folder containing `manifest.json`.

## Quick troubleshooting test

1. Open a direct YouTube video page whose title clearly names a JEE chapter, for example a lecture on **Biomolecules**, **Electrostatics**, or **Chemical Kinetics**.
2. Refresh the YouTube tab once after installing/reloading the extension.
3. Play the lecture for 30–60 seconds. Keep it playing; paused time is not counted.
4. Click the extension icon. The **Tracker status** panel should say whether the player was found, the lecture title matched a chapter, or the title was not recognized. Click **Refresh list** if needed.
5. If a lecture is recorded, click **Export for Personal Space**. In Personal Space V6, open **YouTube Lectures** and import that JSON file.

If the popup says **No response from a YouTube tab yet**, ensure you are on a direct `youtube.com/watch?v=...` video page, then refresh the tab and reopen the popup. If it says the title did not match, send the exact YouTube title and the status message so the chapter keyword list can be improved.

## What currently works

- Detects likely JEE lectures by title/channel keyword matching; it does not read a transcript.
- Records watched time locally in the browser on supported YouTube watch pages.
- Exports a JSON file to import manually into the planner.
- Imported matched chapters can move from **Not Ready** to **In Progress**, but never directly to mastered.
- The website does **not** update automatically from the extension yet. Export and import are required.

## Telegram

Telegram support is not implemented as a live browser tracker yet. Current planner support is a manual import flow, where you choose a Telegram lecture post and confirm the subject/chapter. Telegram Web playback tracking needs a separate test and implementation.

Do not share your Telegram login code, password, session string, bot token, or API hash.
