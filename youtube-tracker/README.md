# Personal Space — JEE Lecture Tracker

**Current extension version: 1.3.5**

A Brave/Chromium extension that tracks recognized JEE lecture playback on YouTube and Telegram Web, maps video titles/captions to the JEE chapter table, and sends both sources to the Personal Space planner. Normal use does not require repeated export/import.

## Install for the first time

1. Download the ZIP for the `personal-space-v6` branch and extract it.
2. Open `brave://extensions` in Brave and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted `youtube-tracker` folder containing `manifest.json`.
4. Refresh any open YouTube and Telegram Web tabs.

## Update an existing installation without removing saved records

1. Download and extract the latest branch ZIP to a temporary folder.
2. Copy the *contents* of its `youtube-tracker` folder into the same folder your existing unpacked extension uses, replacing the old files.
3. Open `brave://extensions` and click **Reload** on Personal Space — Lecture Tracker.
4. Refresh YouTube and Telegram Web tabs.

Do not remove the existing extension just to update its files. Keeping the same unpacked extension entry helps preserve its local records and planner connection. Back up important records before changing extension folders.

## Connect the planner once

1. Open your Personal Space planner page in Brave.
2. Click the extension icon. Under **Automatic planner sync**, paste the planner page URL and click **Connect planner**.
3. Approve the browser permission prompt.
4. Refresh the planner tab if it was already open.

After that, YouTube and Telegram Web records sync automatically while the planner is open. Records remain in extension storage when the planner is closed and can sync the next time the connected planner page opens. The popup's backup export includes records from both platforms.

## YouTube tracking

1. Open a YouTube video page and refresh the tab after installing/updating the extension.
2. Play a clearly titled JEE lecture for 30–60 seconds.
3. Check the popup's **Tracker status** and confirm the matched chapter and watch time.
4. YouTube playback tracking reads video title/channel and media-time events. It does not modify the page styling or reload the page.

## Telegram Web tracking

1. Open `https://web.telegram.org/` in the same Brave profile where the extension is installed.
2. Open a channel post or media viewer containing a playable lecture video and press Play.
3. Let it play for 30–60 seconds. Open the extension popup and read **Telegram Web status**.
4. The tracker looks for a recognizable JEE chapter phrase plus a study cue such as Lecture, One Shot, Revision, Questions, Practice, PYQ, JEE or NEET. It recognizes chapter aliases such as **EM Waves** and **Maxwell Equations**.
5. Confirm the popup reports **Tracking Telegram playback** and that the combined lecture count/watch time increases.

If Telegram's interface does not expose readable nearby caption text, that post may remain unmatched; use the planner's manual fallback where available.

## Scope, privacy and limitations

- Tracking works only in YouTube and Telegram Web tabs in the same supported browser profile. It does not track the Telegram mobile app or Telegram Desktop.
- The extension uses visible titles/captions and browser media playback time. It does not use transcripts or AI to infer lecture content.
- Telegram Web's page structure may change, so some posts may not expose readable captions or stable message identifiers.
- It does not request Telegram credentials or session tokens, and it does not scan chats in a background service. Tracking runs on the Telegram Web page you open.
- Only videos matched to a known chapter and an educational cue are recorded. Caption-based matching is heuristic, not a guarantee; verify the title and chapter in the popup.
- Watch time is counted from advancing media time, not jumps caused by seeking. A matched chapter moves to **In Progress** in the planner after watch time is recorded; the extension does not mark it mastered.
- Records are stored locally in the browser unless your planner's own cloud sync is configured. The popup backup includes both YouTube and Telegram records.

Never put a Supabase secret key or service-role key in the extension or a browser page.
