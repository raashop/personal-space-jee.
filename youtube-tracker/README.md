# Personal Space — JEE Lecture Tracker

A Brave/Chromium extension that watches supported YouTube lecture playback, maps recognizable chapter names to the JEE syllabus, and automatically sends records to your Personal Space planner. The usual workflow does **not** require exporting or importing JSON files.

## Install or update

1. Download the ZIP for the `personal-space-v6` branch and extract it.
2. Open `brave://extensions` in Brave and enable **Developer mode**.
3. If an older copy of this extension is already installed, remove that old unpacked extension first. Then choose **Load unpacked** and select the new `youtube-tracker` folder containing `manifest.json`.
4. Open a direct YouTube watch page (a URL containing `youtube.com/watch?v=`) and refresh the tab after loading the extension.

## Connect the planner once

1. Open your Personal Space planner page in Brave.
2. Click the extension icon. Under **Automatic planner sync**, paste the planner page URL from your address bar and click **Connect planner**.
3. Approve the browser's site permission prompt. This grants the extension access to the planner origin you selected; it is not permission to read your other websites.
4. Refresh the planner tab if it was already open when you connected.

After that, matched lecture records sync automatically while the planner is open. If the planner is closed while you watch, records stay in the extension and sync the next time you open the planner. There is no repeated export/import step. The popup's **Export backup** button remains optional.

## Test lecture detection

1. Open a title that clearly names a JEE chapter, such as **Electrostatics**, **Chemical Kinetics**, **Biomolecules**, or **Matrices and Determinants**.
2. Refresh the YouTube tab once, then play for 30–60 seconds.
3. Open the extension popup and read **Tracker status**. It should say the player was found and either that a chapter was recognized or that the title did not match. The recent lectures list should gain a record once playback time is recorded.
4. Keep the planner page open and visit **YouTube Lectures**. The new record should appear without exporting a file; the matching chapter changes from **Not Ready** to **In Progress**.

## What it does and does not do

- Automatically records playback time for recognized JEE-related videos on supported YouTube watch pages.
- Matches video title and channel text to known chapter names and aliases. It does not read transcripts or use AI to infer a chapter, so vague or unusually titled videos may still be missed.
- Syncs stored records into the planner automatically while the planner is open, and catches up the next time it opens.
- If the planner's own Supabase cloud sync is enabled, synced lecture records are included in the planner's cloud backup. Cloud/cross-device sync still depends on that website configuration and Supabase access rules.
- Tracks YouTube in this browser profile only. It cannot see lectures watched in the Android YouTube app, another browser, or another browser profile.
- Does not track Telegram Web lecture playback yet. The Telegram import page is a separate/manual workflow.

## Troubleshooting

- **No response from a YouTube tab:** check that the extension is enabled, open a direct `youtube.com/watch?v=...` URL, refresh the tab, and start playback.
- **Player found but title did not match:** check the exact title shown under Tracker status. The chapter alias list can be expanded for that naming pattern.
- **Matched lecture recorded but planner does not update:** open the planner page, open the extension popup, confirm the planner URL is connected, and refresh the planner tab once.
- **The planner uses a local `file://` URL:** open it via its hosted `https://` URL or a local development server such as `http://localhost`; browser extensions cannot reliably use this bridge with file URLs.

Never put a Supabase secret key or service-role key in the extension or a browser page. The bridge sends only the lecture records already stored by this extension to the planner page you explicitly connected.
